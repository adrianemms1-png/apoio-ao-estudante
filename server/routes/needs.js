const store = require("../store");
const { sendJson, HttpError } = require("../router");
const { requireAuth, requireRole } = require("../middleware/auth");
const { makeId } = require("../util/id");
const { logAction } = require("../util/audit");
const { isAiConfigured, generateNeedInsightsWithAI, getProviderLabel } = require("../aiPrompt");

function register(router) {
  router.get("/api/needs", requireAuth, (req, res) => {
    const needObservations = store.getMap("needObservations");
    const needs = store.getAll("needs").map((need) => ({
      ...need,
      observation: needObservations[need.id] || ""
    }));
    sendJson(res, 200, { needs });
  });

  // Curar a base de deficiências é responsabilidade da coordenação (antes
  // qualquer papel autenticado podia criar um registro novo, o que não batia
  // com o modelo pretendido: professora observa/comenta, coordenação cadastra).
  router.post("/api/needs", requireAuth, requireRole("admin"), (req, res) => {
    const { name, observation } = req.body || {};
    if (!name || !String(name).trim()) throw new HttpError(400, "Informe o nome da deficiência ou necessidade.");
    const need = store.insert("needs", {
      id: makeId("need"),
      name: String(name).trim(),
      source: "Criado pela coordenação",
      summary: "Rascunho pendente de revisão - ainda sem estratégias, recursos ou barreiras detalhados.",
      barriers: [],
      strategies: [],
      resources: [],
      activityMatches: [],
      custom: true,
      draft: true
    });
    if (observation && String(observation).trim()) {
      store.setMapValue("needObservations", need.id, String(observation).trim());
    }
    logAction(req.user, "criar", "deficiência", need.id, need.name);
    sendJson(res, 201, { need });
  });

  router.put("/api/needs/:id/observation", requireAuth, (req, res) => {
    const existing = store.getById("needs", req.params.id);
    if (!existing) throw new HttpError(404, "Registro não encontrado na base de necessidades.");
    const text = String((req.body || {}).text || "").trim();
    store.setMapValue("needObservations", req.params.id, text);
    sendJson(res, 200, { ok: true, observation: text });
  });

  // Botao "Consultar IA": preenche resumo/barreiras/estrategias/recursos a
  // partir so do nome da deficiencia (e da observacao da professora, se
  // houver), usando o provedor configurado em AI_PROVIDER (server/aiPrompt.js).
  // Restrito a coordenacao porque escreve por cima do registro na base -
  // igual as demais edicoes de deficiencia.
  router.post("/api/needs/:id/consult-ai", requireAuth, requireRole("admin"), async (req, res) => {
    const existing = store.getById("needs", req.params.id);
    if (!existing) throw new HttpError(404, "Registro não encontrado na base de necessidades.");
    if (!isAiConfigured()) {
      throw new HttpError(
        400,
        "Nenhuma IA configurada neste sistema. Vá em Coordenação > IA e escolha Ollama ou OpenAI."
      );
    }
    const observation = store.getMap("needObservations")[req.params.id] || "";
    let insights;
    try {
      insights = await generateNeedInsightsWithAI({ needName: existing.name, observation });
    } catch (error) {
      throw new HttpError(502, error.message || "Falha ao consultar a IA.");
    }

    const updated = store.update("needs", req.params.id, {
      summary: String(insights.resumo || existing.summary || "").trim(),
      barriers: Array.isArray(insights.barreiras) ? insights.barreiras.map(String) : existing.barriers,
      strategies: Array.isArray(insights.estrategias) ? insights.estrategias.map(String) : existing.strategies,
      resources: Array.isArray(insights.recursos) ? insights.recursos.map(String) : existing.resources,
      activityMatches: Array.isArray(insights.atividades_favoraveis)
        ? insights.atividades_favoraveis.map(String)
        : existing.activityMatches,
      source: `Sugestão gerada por IA (${getProviderLabel() || "provedor configurado"})`,
      draft: false
    });
    logAction(req.user, "consultar-ia", "deficiência", req.params.id, existing.name);
    sendJson(res, 200, { need: { ...updated, observation } });
  });

  router.delete("/api/needs/:id", requireAuth, requireRole("admin"), (req, res) => {
    const existing = store.getById("needs", req.params.id);
    if (!existing) throw new HttpError(404, "Registro não encontrado na base de necessidades.");
    if (!existing.custom) {
      throw new HttpError(409, "Apenas registros criados manualmente podem ser removidos.");
    }
    const inUse = store.getAll("students").some((student) => student.needId === req.params.id);
    if (inUse) {
      throw new HttpError(409, "Existem alunos vinculados a esta deficiência - reatribua-os antes de remover.");
    }
    store.remove("needs", req.params.id);
    const observations = store.getMap("needObservations");
    delete observations[req.params.id];
    store.persist();
    logAction(req.user, "excluir", "deficiência", req.params.id, existing.name);
    sendJson(res, 200, { ok: true });
  });
}

module.exports = { register };
