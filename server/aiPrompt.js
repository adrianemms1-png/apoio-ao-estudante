// Ponto unico de integracao com IA generativa. Usos:
//  1) generateActivitiesWithAI - gera as 3 atividades do Atendimento Rapido
//     a partir do perfil do aluno, tema e objetivo BNCC. E o caminho
//     principal quando ha IA configurada (server/routes/activities.js);
//     se a IA falhar ou nao estiver configurada, a rota cai para o motor
//     por regras (server/engine/activityEngine.js) como reserva, para a
//     tela nunca travar em sala de aula.
//  2) generateNeedInsightsWithAI - usado pelo botao "Consultar IA" na Base
//     de deficiencias, para sugerir barreiras/estrategias/recursos de uma
//     deficiencia a partir so do nome dela (e de uma observacao, se houver).
//  3) generateAdaptationWithAI - pensado para adaptar um objetivo BNCC
//     isolado (desenho original do prototipo), mantido mas nao chamado por
//     nenhuma rota hoje.
//
// Dois provedores suportados: "ollama" (roda local via "ollama serve", sem
// precisar de chave nem internet - so precisa do Ollama aberto nesta
// maquina e um modelo baixado, ex: "ollama pull llama3.2") ou "openai"
// (usa a API da OpenAI, precisa de uma chave).
//
// A configuracao pode vir de dois lugares, nessa ordem de prioridade:
//  1) Base de dados (aiSettings), editada pela coordenacao na tela
//     "Coordenacao > IA" (server/routes/ai.js) - permite trocar de
//     provedor, URL/modelo do Ollama, ou colar a chave da OpenAI sem
//     precisar mexer em arquivo nenhum nem reiniciar o servidor.
//  2) Arquivo .env (AI_PROVIDER, OLLAMA_BASE_URL, OLLAMA_MODEL,
//     OPENAI_API_KEY) - usado so quando a base de dados nao tem nada
//     configurado ainda (instalacao nova, ou "Nenhuma" escolhido na tela).
// Sem nenhum dos dois configurado, isAiConfigured() retorna false e a
// interface mostra um aviso explicando como ativar - nada quebra.
//
// A chave da OpenAI, quando salva pela tela, fica gravada em texto simples
// em data/db.json (igual ao restante dos dados desta instalacao local) -
// nunca e devolvida pela API depois de salva (so um "openaiKeySet: true"),
// e nunca sai desta maquina a nao ser nas chamadas para api.openai.com.
//
// Nao ha nenhuma dependencia externa aqui: as chamadas usam o "fetch"
// global que ja vem com o Node (>=18).
const config = require("./config");
const store = require("./store");

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

// Quanto tempo esperar por UMA resposta do Ollama antes de desistir dessa
// chamada específica. Modelos maiores (ex: qwen2.5:7b) rodando localmente
// em CPU podem legitimamente levar mais de 1-2 minutos, especialmente na
// primeira chamada depois de um tempo sem uso (o Ollama descarrega o
// modelo da memória por ociosidade, e a próxima chamada precisa recarregar
// os GBs do modelo do disco antes de começar a gerar). 3 minutos dá folga
// pra isso sem deixar a professora esperando indefinidamente numa máquina
// realmente travada.
const OLLAMA_TIMEOUT_MS = 180000;

// Quanto tempo o Ollama deve manter o modelo carregado na memória depois
// desta chamada, mesmo sem uso. O padrão do próprio Ollama é de só alguns
// minutos - curto demais para o uso real esperado aqui (professora consulta
// alguns alunos, com pausas de vários minutos entre um e outro ao longo do
// dia). "30m" evita boa parte dos recarregamentos do zero (a causa mais
// comum de timeout) sem manter memória ocupada a noite toda.
const OLLAMA_KEEP_ALIVE = "30m";

function getEffectiveSettings() {
  const stored = store.getMap("aiSettings") || {};
  return {
    provider: stored.provider || config.AI_PROVIDER || "",
    ollamaBaseUrl: stored.ollamaBaseUrl || config.OLLAMA_BASE_URL,
    ollamaModel: stored.ollamaModel || config.OLLAMA_MODEL,
    openaiApiKey: stored.openaiApiKey || config.OPENAI_API_KEY || "",
    openaiModel: stored.openaiModel || DEFAULT_OPENAI_MODEL
  };
}

// System prompt definido no PDF "PROTOTIPO.pdf" fornecido pelo usuario,
// mantido literalmente para nao perder o desenho original da integracao.
const SYSTEM_PROMPT = `Você é uma inteligência artificial especialista em Educação Inclusiva e Pedagogia com foco na Educação Infantil (faixa etária de 3 a 5 anos), com domínio completo da Base Nacional Comum Curricular (BNCC).

Sua função é receber um código ou objetivo de aprendizagem da BNCC (especificamente do Pré I e Jardim) e gerar adaptações pedagógicas direcionadas para educadores e estagiários trabalharem com crianças com necessidades educacionais especiais (NEE).

REGRAS DE RESPOSTA:
1. Retorne Apenas um objeto JSON válido, sem texto explicativo antes ou depois, sem formatação de bloco de código (não use \`\`\`json ... \`\`\`).
2. O JSON deve conter estritamente a seguinte estrutura de campos:
{
  "codigo_bncc": "String (ex: EI03CG01)",
  "campo_de_experiencia": "String (ex: Corpo, gestos e movimentos)",
  "objetivo_original": "String (Descrição do objetivo original da BNCC)",
  "faixa_etaria": "String (ex: 3 a 5 anos / Pré I ou Jardim)",
  "necessidade_especial": "String (Tipo de necessidade informada ou adaptada)",
  "objetivo_adaptado": "String (Adaptação clara do objetivo para o perfil da criança)",
  "estrategias_pedagogicas": ["String com atividade/estratégia 1", "String com atividade/estratégia 2", "String com atividade/estratégia 3"],
  "recursos_acessiveis": ["String com recurso 1 (ex: materiais táteis, CAA, apoio visual)", "String com recurso 2"],
  "dica_para_estagiario": "String (Orientação prática de mediação e observação para a equipe de apoio em sala)"
}
Certifique-se de que a linguagem seja clara, empática, acionável e focada no desenvolvimento integral e autonomia da criança.`;

// Prompt usado pelo botao "Consultar IA" da Base de deficiencias. Diferente
// do SYSTEM_PROMPT acima (que parte de um objetivo BNCC), este parte so do
// nome da deficiencia/necessidade - e o caso de uso real do botao hoje.
const NEED_SYSTEM_PROMPT = `Você é uma especialista em Educação Infantil Inclusiva, com experiência prática em salas de Pré I e Jardim (crianças de 3 a 5 anos) e conhecimento sobre diferentes deficiências e necessidades educacionais especiais.

Você vai receber o nome de uma deficiência ou necessidade educacional e, às vezes, uma observação de uma professora sobre uma criança real com esse perfil. Gere orientações pedagógicas práticas para professoras de educação infantil (não use jargão clínico ou de diagnóstico).

REGRAS DE RESPOSTA:
1. Retorne apenas um objeto JSON válido, sem texto antes ou depois, sem bloco de código.
2. O JSON deve conter estritamente esta estrutura:
{
  "resumo": "String curta (1 a 2 frases) resumindo o perfil e as principais necessidades pedagógicas",
  "barreiras": ["barreira 1", "barreira 2", "barreira 3"],
  "estrategias": ["estratégia 1", "estratégia 2", "estratégia 3", "estratégia 4"],
  "recursos": ["recurso 1", "recurso 2", "recurso 3"],
  "atividades_favoraveis": ["tipo de atividade 1", "tipo de atividade 2", "tipo de atividade 3"]
}
Use linguagem direta e acionável, pensada para o dia a dia da sala de aula.`;

// Prompt usado para gerar as 3 atividades do Atendimento Rapido. Recebe o
// perfil do aluno (sem nenhum dado pessoal - nome completo, data de
// nascimento, responsavel, telefone e documentos nunca chegam aqui), o
// tema do dia e o objetivo BNCC, e devolve 3 atividades diferentes entre si.
const ACTIVITY_SYSTEM_PROMPT = `Você é uma especialista em Educação Infantil Inclusiva, com experiência prática em salas de Pré I e Jardim (crianças de 3 a 5 anos) e domínio da BNCC.

Você vai receber o perfil pedagógico de um aluno (necessidade educacional, pontos fortes, cuidados a evitar), um tema do dia e um objetivo de aprendizagem da BNCC. Gere exatamente 3 propostas de atividades DIFERENTES entre si (tipos diferentes), adaptadas para esse aluno específico, ligadas ao tema e ao objetivo.

REGRAS DE RESPOSTA:
1. Retorne apenas um array JSON válido com exatamente 3 objetos, sem texto antes ou depois, sem bloco de código.
2. Cada objeto deve ter estritamente esta estrutura:
{
  "type": "String curta (categoria da atividade, ex: Investigação sensorial, Movimento orientado, Linguagem e narrativa, Pareamento e classificação, Construção criativa, Recurso digital mediado, Registro visual)",
  "tone": "Uma destas palavras exatas, sem mais nada: green, violet, rose, teal ou gold",
  "resourceClass": "Uma destas palavras exatas, sem mais nada: manipulative, story, movement, sequence, digital ou visual",
  "title": "Nome curto e específico da atividade, já incorporando o tema do dia",
  "resource": "Materiais ou recursos necessários, em poucas palavras",
  "method": "Como aplicar a atividade, em 1 a 2 frases práticas e diretas",
  "adaptation": "Adaptação específica para este aluno considerando a necessidade educacional e os pontos fortes/cuidados informados, em 1 a 2 frases",
  "time": "Duração estimada (ex: 10 min)",
  "supportLevel": "Apoio próximo ou Apoio moderado"
}
3. As 3 atividades devem ter "type" diferente entre si.
4. Priorize formatos ligados aos pontos fortes do aluno e evite qualquer coisa relacionada aos cuidados informados.
5. Nunca repita, nem gere algo muito parecido com, as atividades listadas como já tentadas sem sucesso para este aluno.
6. Não use jargão clínico ou de diagnóstico - linguagem prática, para o dia a dia da sala de aula.`;

// Usado só como último recurso, quando o modelo não consegue devolver o
// array com as 3 atividades de uma vez (comum em modelos pequenos rodando
// local no Ollama - eles seguem bem uma instrução "gere 1 objeto", mas
// erram ao tentar gerar uma lista inteira). Pede exatamente a mesma coisa,
// só que uma atividade de cada vez.
const SINGLE_ACTIVITY_SYSTEM_PROMPT = `Você é uma especialista em Educação Infantil Inclusiva, com experiência prática em salas de Pré I e Jardim (crianças de 3 a 5 anos) e domínio da BNCC.

Você vai receber o perfil pedagógico de um aluno (necessidade educacional, pontos fortes, cuidados a evitar), um tema do dia e um objetivo de aprendizagem da BNCC. Gere UMA proposta de atividade adaptada para esse aluno específico, ligada ao tema e ao objetivo.

REGRAS DE RESPOSTA:
1. Retorne apenas UM objeto JSON válido (não um array, não uma lista - um único objeto), sem texto antes ou depois, sem bloco de código.
2. O objeto deve ter estritamente esta estrutura:
{
  "type": "String curta (categoria da atividade, ex: Investigação sensorial, Movimento orientado, Linguagem e narrativa, Pareamento e classificação, Construção criativa, Recurso digital mediado, Registro visual)",
  "tone": "Uma destas palavras exatas, sem mais nada: green, violet, rose, teal ou gold",
  "resourceClass": "Uma destas palavras exatas, sem mais nada: manipulative, story, movement, sequence, digital ou visual",
  "title": "Nome curto e específico da atividade, já incorporando o tema do dia",
  "resource": "Materiais ou recursos necessários, em poucas palavras",
  "method": "Como aplicar a atividade, em 1 a 2 frases práticas e diretas",
  "adaptation": "Adaptação específica para este aluno considerando a necessidade educacional e os pontos fortes/cuidados informados, em 1 a 2 frases",
  "time": "Duração estimada (ex: 10 min)",
  "supportLevel": "Apoio próximo ou Apoio moderado"
}
3. Se for informado que já existem atividades de certos tipos para este mesmo atendimento, gere um tipo diferente deles.
4. Priorize formatos ligados aos pontos fortes do aluno e evite qualquer coisa relacionada aos cuidados informados.
5. Nunca repita, nem gere algo muito parecido com, as atividades listadas como já tentadas sem sucesso para este aluno.
6. Não use jargão clínico ou de diagnóstico - linguagem prática, para o dia a dia da sala de aula.`;

function getActiveProvider() {
  const settings = getEffectiveSettings();
  if (settings.provider === "ollama") return "ollama";
  if (settings.provider === "openai" && settings.openaiApiKey) return "openai";
  return null;
}

function getProviderLabel() {
  const provider = getActiveProvider();
  const settings = getEffectiveSettings();
  if (provider === "ollama") return `Ollama local (${settings.ollamaModel})`;
  if (provider === "openai") return `OpenAI (${settings.openaiModel})`;
  return null;
}

function isAiConfigured() {
  return getActiveProvider() !== null;
}

async function callOllama(systemPrompt, userPrompt) {
  const settings = getEffectiveSettings();
  const url = `${settings.ollamaBaseUrl.replace(/\/$/, "")}/api/chat`;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.ollamaModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false,
        format: "json",
        keep_alive: OLLAMA_KEEP_ALIVE
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS)
    });
  } catch (error) {
    // "Timeout"/"aborted" e "nao foi possivel conectar" sao causas bem
    // diferentes na pratica (uma e o Ollama demorando demais pra responder,
    // a outra e o Ollama nem estar aberto), mas antes caiam na mesma
    // mensagem generica de "verifique se esta aberto" - o que confundia o
    // diagnostico quando o problema real era so demora.
    const isTimeout = error.name === "TimeoutError" || error.name === "AbortError" || /timeout|aborted/i.test(error.message);
    if (isTimeout) {
      throw new Error(
        `O Ollama demorou mais de ${Math.round(OLLAMA_TIMEOUT_MS / 1000)}s para responder e a tentativa foi cancelada. Isso costuma acontecer quando o modelo "${settings.ollamaModel}" precisa ser recarregado na memória (acontece depois de um tempo sem uso) ou quando a máquina está sobrecarregada no momento. Geralmente funciona ao tentar de novo - se continuar acontecendo sempre, considere um modelo menor.`
      );
    }
    throw new Error(
      `Não foi possível conectar ao Ollama em ${settings.ollamaBaseUrl}. Verifique se o Ollama está aberto nesta máquina (comando "ollama serve") e se o modelo "${settings.ollamaModel}" foi baixado (comando "ollama pull ${settings.ollamaModel}"). Detalhe técnico: ${error.message}`
    );
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`O Ollama respondeu com erro (${response.status}): ${body}`);
  }
  const data = await response.json();
  const content = (data.message && data.message.content) || "";
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      "O Ollama respondeu, mas o conteúdo não é um JSON válido. Modelos menores às vezes não seguem bem a instrução de formato - vale tentar de novo ou usar um modelo maior."
    );
  }
}

async function callOpenAI(systemPrompt, userPrompt) {
  const settings = getEffectiveSettings();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.openaiApiKey}`
    },
    body: JSON.stringify({
      model: settings.openaiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Falha ao chamar a API da OpenAI (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || "";
  try {
    return JSON.parse(rawContent);
  } catch (error) {
    throw new Error("A IA retornou um conteúdo que não é um JSON válido.");
  }
}

async function callActiveProvider(systemPrompt, userPrompt) {
  const provider = getActiveProvider();
  if (provider === "ollama") return callOllama(systemPrompt, userPrompt);
  if (provider === "openai") return callOpenAI(systemPrompt, userPrompt);
  throw new Error(
    "Nenhum provedor de IA configurado. Vá em Coordenação > IA e escolha Ollama ou OpenAI."
  );
}

/**
 * Gera as 3 atividades do Atendimento Rápido. Nenhum dado pessoal do aluno
 * (nome completo, data de nascimento, responsável, telefone, documentos)
 * entra em `input` - só perfil pedagógico, tema e objetivo BNCC.
 * @param {object} input
 * @param {string} input.needName
 * @param {string[]} input.barriers
 * @param {string[]} input.strategies
 * @param {string[]} input.resources
 * @param {string[]} input.strengths
 * @param {string[]} input.cautions
 * @param {string} input.theme
 * @param {string} input.bnccCode
 * @param {string} input.goalText
 * @param {string} input.classLevel
 * @param {string[]} [input.failedTitles] - atividades já marcadas "Não funcionou" para este aluno
 * @param {string} [input.studentObservation]
 * @param {string} [input.needObservation]
 * @returns {Promise<object[]>} array com 3 atividades no formato descrito em ACTIVITY_SYSTEM_PROMPT
 */
// Alguns modelos - principalmente modelos pequenos rodando local no Ollama
// (ex: llama3.2 de 3B) - mesmo instruidos a devolver "um array JSON com 3
// objetos", às vezes embrulham a resposta num objeto (ex: {"atividades":
// [...]}), embrulham em mais de um nível (ex: {"resposta": {"itens": [...]}})
// ou devolvem um objeto único (a IA "esqueceu" de gerar as outras 2). Esta
// função procura, em até 3 níveis de profundidade, o primeiro array cujo
// primeiro item seja um objeto (ou seja, que pareça uma lista de atividades)
// antes de desistir.
function findActivitiesArray(value, depth = 0) {
  if (depth > 3 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value.length && typeof value[0] === "object" ? value : null;
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      const found = findActivitiesArray(value[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Usado só dentro de attemptSingle (pede 1 atividade por vez - ver mais
// abaixo). Mesmo instruído a "devolver só um objeto, sem embrulhar", um
// modelo mais capaz (ex: qwen2.5:7b, em uso real) às vezes embrulha a
// atividade única numa chave descritiva mesmo assim (ex: {"atividade":
// {...}} ou {"activity": {...}}) - um padrão de embrulho que
// findActivitiesArray não cobre, porque ali dentro não há nenhum array,
// só um objeto aninhado. Busca, em até 3 níveis, o primeiro objeto (dentro
// de um array ou de um objeto) que pareça uma atividade (tem "title" ou
// "type").
function findActivityObject(value, depth = 0) {
  if (depth > 3 || value === null || value === undefined || typeof value !== "object") return null;
  if (!Array.isArray(value) && (value.title || value.type)) return value;
  const entries = Array.isArray(value) ? value : Object.values(value);
  for (const item of entries) {
    const found = findActivityObject(item, depth + 1);
    if (found) return found;
  }
  return null;
}

async function generateActivitiesWithAI(input) {
  const lines = [
    `Necessidade educacional: ${input.needName}.`,
    input.barriers?.length ? `Barreiras típicas: ${input.barriers.join(", ")}.` : "",
    input.strategies?.length ? `Estratégias recomendadas para essa necessidade: ${input.strategies.join(", ")}.` : "",
    input.resources?.length ? `Recursos recomendados: ${input.resources.join(", ")}.` : "",
    input.strengths?.length ? `Pontos fortes deste aluno: ${input.strengths.join(", ")}.` : "",
    input.cautions?.length ? `Cuidados a evitar com este aluno: ${input.cautions.join(", ")}.` : "",
    input.needObservation ? `Percepção da equipe sobre esta necessidade: ${input.needObservation}.` : "",
    input.studentObservation ? `Observação pedagógica sobre este aluno: ${input.studentObservation}.` : "",
    `Turma/faixa: ${input.classLevel}.`,
    `Tema do dia: ${input.theme}.`,
    `Objetivo BNCC (${input.bnccCode}): ${input.goalText}.`,
    input.failedTitles?.length
      ? `Atividades já tentadas sem sucesso com este aluno (não repita nem gere parecido): ${input.failedTitles.join(", ")}.`
      : ""
  ].filter(Boolean);
  const basePrompt = lines.join("\n");

  const attempt = async (userPrompt) => {
    let raw = null;
    let callError = null;
    try {
      raw = await callActiveProvider(ACTIVITY_SYSTEM_PROMPT, userPrompt);
    } catch (error) {
      // Não propaga na hora - mesmo essa primeira tentativa falhando (ex:
      // por timeout), ainda vale tentar o modo "uma de cada vez" logo a
      // seguir: cada chamada dele pede uma resposta bem menor, então tem
      // mais chance de terminar a tempo mesmo quando pedir as 3 de uma vez
      // não termina. Antes, um erro aqui (conexão/timeout) pulava direto
      // pro motor de regras sem nem tentar o modo mais leve.
      callError = error;
    }
    let arr = raw ? findActivitiesArray(raw) : null;
    // Às vezes o modelo esquece de gerar as outras 2 e devolve só 1
    // atividade solta - direto, ou embrulhada numa chave descritiva (ex:
    // {"atividade": {...}}, visto em uso real com um modelo mais capaz).
    // Trata como array de 1 item só para o diagnóstico ficar correto
    // ("recebeu 1" em vez de "0") - ainda cai no fallback, já que 1 não é
    // suficiente.
    if (!arr && raw) {
      const single = findActivityObject(raw);
      if (single) arr = [single];
    }
    return { raw, arr, callError };
  };

  const { raw, arr, callError: firstCallError } = await attempt(basePrompt);
  if (arr && arr.length >= 3) return arr.slice(0, 3);

  // Última tentativa antes de desistir e cair para o motor de regras: em vez
  // de pedir as 3 atividades de uma vez (um array), pede uma atividade por
  // vez. Na prática, modelos pequenos rodando local (ex: llama3.2 de 3B)
  // seguem bem uma instrução "gere 1 objeto", mas erram feio ao tentar gerar
  // uma lista inteira - foi exatamente esse padrão que apareceu em uso real
  // (a IA sempre devolvia 1 atividade solta, nunca as 3). Custa até 3
  // chamadas extras (mais tempo), só quando a tentativa acima já falhou.
  const collected = [];
  for (let i = 0; i < 3; i++) {
    const single = await attemptSingle(basePrompt, collected.map((item) => item.type));
    if (!single) break;
    collected.push(single);
  }

  if (collected.length >= 3) return collected.slice(0, 3);

  const bestCount = Math.max(arr ? arr.length : 0, collected.length);
  // Se nenhuma atividade foi obtida em nenhuma tentativa (nem a inicial, nem
  // as de fallback) e a causa da primeira falha foi erro de conexão/timeout
  // (não formato de resposta inesperado), repassa essa mensagem específica -
  // ela já explica o que aconteceu e o que fazer. O erro genérico de
  // "formato inesperado" abaixo só faz sentido quando a IA de fato
  // respondeu alguma coisa.
  if (bestCount === 0 && firstCallError) {
    throw firstCallError;
  }
  const preview = raw ? JSON.stringify(raw).slice(0, 220) : "(nenhuma resposta - todas as tentativas falharam por erro de conexão)";
  throw new Error(
    `A IA não retornou exatamente 3 atividades no formato esperado (recebeu ${bestCount}). Resposta da IA (trecho): ${preview}`
  );
}

// Pede UMA atividade por vez (ver SINGLE_ACTIVITY_SYSTEM_PROMPT) - usado só
// como último recurso dentro de generateActivitiesWithAI. Devolve `null` em
// vez de lançar erro para o chamador poder simplesmente parar o laço e cair
// no fallback do motor de regras.
async function attemptSingle(basePrompt, usedTypes) {
  const suffix = usedTypes.length
    ? `\n\nJá foram geradas atividades destes tipos para este mesmo atendimento: ${usedTypes.join(", ")}. Gere agora só MAIS UMA atividade, de um tipo diferente desses.`
    : `\n\nGere agora só UMA atividade (as outras serão pedidas em seguida, uma de cada vez).`;
  let raw;
  try {
    raw = await callActiveProvider(SINGLE_ACTIVITY_SYSTEM_PROMPT, basePrompt + suffix);
  } catch (error) {
    return null;
  }
  return findActivityObject(raw);
}

/**
 * @param {object} input
 * @param {string} input.needName - nome da deficiência/necessidade (ex: "Baixa visão")
 * @param {string} [input.observation] - observação de uma professora, se houver
 * @returns {Promise<object>} objeto no formato descrito em NEED_SYSTEM_PROMPT
 */
async function generateNeedInsightsWithAI({ needName, observation }) {
  const userPrompt = observation
    ? `Deficiência/necessidade: "${needName}". Observação registrada por uma professora sobre uma criança com esse perfil: "${observation}".`
    : `Deficiência/necessidade: "${needName}". Nenhuma observação adicional registrada ainda.`;
  return callActiveProvider(NEED_SYSTEM_PROMPT, userPrompt);
}

/**
 * @param {object} input
 * @param {string} input.bnccCode
 * @param {string} input.goalText
 * @param {string} input.ageRange
 * @param {string} input.specialNeed
 * @returns {Promise<object>} objeto no formato descrito no SYSTEM_PROMPT
 */
async function generateAdaptationWithAI(input) {
  const userPrompt = `Crie a adaptação para o código (${input.bnccCode}) - "${input.goalText}" - para uma criança na faixa "${input.ageRange}" com "${input.specialNeed}".`;
  return callActiveProvider(SYSTEM_PROMPT, userPrompt);
}

module.exports = {
  SYSTEM_PROMPT,
  NEED_SYSTEM_PROMPT,
  ACTIVITY_SYSTEM_PROMPT,
  DEFAULT_OPENAI_MODEL,
  getEffectiveSettings,
  getActiveProvider,
  getProviderLabel,
  isAiConfigured,
  generateAdaptationWithAI,
  generateNeedInsightsWithAI,
  generateActivitiesWithAI
};
