// Status e configuracao do provedor de IA (server/aiPrompt.js).
//
// GET /api/ai/status - usado por qualquer usuario logado para saber se a IA
//   esta configurada (mostra aviso na interface quando nao esta).
// GET /api/ai/settings e PUT /api/ai/settings - tela "Coordenacao > IA",
//   restrita a admin. Permite trocar de provedor (Ollama ou OpenAI) e seus
//   parametros direto pela interface, sem mexer em arquivo .env nem
//   reiniciar o servidor - as configuracoes ficam salvas em data/db.json
//   (colecao aiSettings) e tem prioridade sobre o .env (ver aiPrompt.js).
// GET /api/ai/ollama-models - consulta o proprio Ollama (endpoint nativo
//   "/api/tags" dele, nao tem nada a ver com o "/api/tags" deste sistema)
//   para listar os modelos ja baixados nesta maquina, e preencher a lista
//   de sugestoes do campo "Modelo" na tela acima. Se o Ollama nao estiver
//   aberto ou o endereco estiver errado, devolve uma lista vazia com uma
//   mensagem de erro amigavel em vez de quebrar a tela.
//
// A chave da OpenAI NUNCA e devolvida pela API depois de salva - GET
// devolve so "openaiKeySet: true/false". Para trocar a chave, a
// coordenacao cola uma nova; para limpar a chave salva, marca a opcao
// "esquecer chave salva" no formulario (campo clearOpenaiKey).
const store = require("../store");
const { sendJson, HttpError } = require("../router");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAction } = require("../util/audit");
const {
  isAiConfigured,
  getActiveProvider,
  getProviderLabel,
  getEffectiveSettings,
  DEFAULT_OPENAI_MODEL
} = require("../aiPrompt");
const config = require("../config");

const VALID_PROVIDERS = ["", "ollama", "openai"];

function register(router) {
  router.get("/api/ai/status", requireAuth, (req, res) => {
    sendJson(res, 200, {
      configured: isAiConfigured(),
      provider: getActiveProvider(),
      label: getProviderLabel()
    });
  });

  router.get("/api/ai/settings", requireAuth, requireRole("admin"), (req, res) => {
    const stored = store.getMap("aiSettings") || {};
    const effective = getEffectiveSettings();
    sendJson(res, 200, {
      provider: stored.provider || "",
      ollamaBaseUrl: stored.ollamaBaseUrl || config.OLLAMA_BASE_URL,
      ollamaModel: stored.ollamaModel || config.OLLAMA_MODEL,
      openaiModel: stored.openaiModel || DEFAULT_OPENAI_MODEL,
      openaiKeySet: Boolean(stored.openaiApiKey || config.OPENAI_API_KEY),
      // O que esta ativo de fato agora (considerando .env como reserva),
      // para a tela mostrar "usando Ollama via .env" quando a base ainda
      // nao tem nada salvo mas o .env ja configura algo.
      effectiveProvider: getActiveProvider(),
      effectiveLabel: getProviderLabel(),
      configured: isAiConfigured(),
      envConfigured: {
        provider: config.AI_PROVIDER || "",
        hasOpenaiKey: Boolean(config.OPENAI_API_KEY)
      }
    });
  });

  router.get("/api/ai/ollama-models", requireAuth, requireRole("admin"), async (req, res) => {
    const stored = store.getMap("aiSettings") || {};
    const baseUrl = String(req.query.baseUrl || stored.ollamaBaseUrl || config.OLLAMA_BASE_URL || "").trim();
    if (!baseUrl) {
      sendJson(res, 200, { models: [], error: "Informe o endereço do Ollama antes de atualizar a lista." });
      return;
    }
    try {
      const url = `${baseUrl.replace(/\/$/, "")}/api/tags`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      let response;
      try {
        response = await fetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const models = Array.isArray(data.models)
        ? data.models.map((item) => item && item.name).filter(Boolean)
        : [];
      sendJson(res, 200, { models });
    } catch (error) {
      sendJson(res, 200, {
        models: [],
        error: `Não foi possível consultar os modelos em ${baseUrl}. Verifique se o Ollama está aberto nesta máquina. Detalhe: ${error.message}`
      });
    }
  });

  router.put("/api/ai/settings", requireAuth, requireRole("admin"), (req, res) => {
    const body = req.body || {};
    const provider = String(body.provider || "").trim().toLowerCase();
    if (!VALID_PROVIDERS.includes(provider)) {
      throw new HttpError(400, 'Provedor invalido. Use "ollama", "openai" ou deixe em branco para usar o .env.');
    }

    const current = store.getMap("aiSettings") || {};

    if (provider === "ollama") {
      const ollamaBaseUrl = String(body.ollamaBaseUrl || "").trim() || config.OLLAMA_BASE_URL;
      const ollamaModel = String(body.ollamaModel || "").trim() || config.OLLAMA_MODEL;
      if (!ollamaBaseUrl) throw new HttpError(400, "Informe a URL do Ollama (ex: http://127.0.0.1:11434).");
      if (!ollamaModel) throw new HttpError(400, "Informe o nome do modelo do Ollama (ex: llama3.2).");
      store.setMapValue("aiSettings", "ollamaBaseUrl", ollamaBaseUrl);
      store.setMapValue("aiSettings", "ollamaModel", ollamaModel);
    }

    if (provider === "openai") {
      const openaiModel = String(body.openaiModel || "").trim() || DEFAULT_OPENAI_MODEL;
      store.setMapValue("aiSettings", "openaiModel", openaiModel);
      const submittedKey = String(body.openaiApiKey || "").trim();
      if (body.clearOpenaiKey) {
        store.setMapValue("aiSettings", "openaiApiKey", "");
      } else if (submittedKey) {
        store.setMapValue("aiSettings", "openaiApiKey", submittedKey);
      } else if (!current.openaiApiKey && !config.OPENAI_API_KEY) {
        throw new HttpError(400, "Cole a chave da API da OpenAI (obtida em platform.openai.com).");
      }
      // Se o campo veio em branco mas ja existe uma chave salva (na base ou
      // no .env), mantem a chave atual - nao apaga por causa de um campo de
      // senha que a interface nunca preenche de volta.
    }

    store.setMapValue("aiSettings", "provider", provider);

    logAction(req.user, "editar", "configuracao-ia", "aiSettings", `Provedor definido para: ${provider || "(nenhum, usando .env)"}`);

    sendJson(res, 200, {
      ok: true,
      configured: isAiConfigured(),
      effectiveProvider: getActiveProvider(),
      effectiveLabel: getProviderLabel()
    });
  });
}

module.exports = { register };
