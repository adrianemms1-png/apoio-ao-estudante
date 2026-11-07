// Motor de recomendacao de atividades. E a mesma heuristica por regras do
// protótipo original (nao e IA - ver server/aiPrompt.js para o ponto de
// integracao futuro com uma IA de verdade), agora rodando no servidor para
// que a logica e os dados sensiveis do aluno nunca precisem ser expostos
// inteiros ao navegador.
const activityTemplates = require("../seedData/activityTemplates");

// Usado só quando não há nenhuma correspondência (nem por needId, nem por
// nome) - antes disso não existia, e a função caía silenciosamente em
// needs[0] ("TEA nível 1"), fazendo qualquer deficiência não reconhecida
// (ex.: Síndrome de Down, Deficiência auditiva, Deficiência física/motora)
// receber recomendações pensadas para TEA nível 1 sem nenhum aviso.
const GENERIC_NEED = {
  id: "generico",
  name: "Perfil não mapeado",
  source: "Gerado automaticamente",
  summary: "Não foi encontrada uma correspondência exata na base de deficiências para este aluno. As sugestões abaixo são genéricas - vale revisar o cadastro do aluno ou completar a base de deficiências.",
  barriers: [],
  strategies: ["observação individual", "adaptação conforme o perfil observado da criança"],
  resources: [],
  activityMatches: [],
  custom: false
};

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos para comparar com folga
    .trim();
}

/**
 * Encontra o registro da base de necessidades para um aluno.
 * Preferência: student.needId (referência direta, definida no cadastro) -
 * assim a ligação não depende de o texto da deficiência bater com nada.
 * Sem needId (cadastros antigos, de antes dessa mudança), cai para
 * comparação por nome, mas agora contra TODAS as necessidades cadastradas
 * (incluindo as criadas pela própria escola), não só 5 nomes fixos.
 */
function getNeedForDisability(student, needs) {
  if (typeof student === "string") {
    // Retrocompatibilidade: chamadas antigas passavam so a string da
    // deficiencia. Continua funcionando, so sem a preferencia por needId.
    student = { disability: student, needId: null };
  }
  const list = needs || [];

  if (student.needId) {
    const byId = list.find((need) => need.id === student.needId);
    if (byId) return byId;
  }

  const normalizedDisability = normalize(student.disability);
  if (normalizedDisability) {
    const byName = list.find((need) => {
      const name = normalize(need.name);
      return name && (name === normalizedDisability || normalizedDisability.includes(name) || name.includes(normalizedDisability));
    });
    if (byName) return byName;
  }

  return GENERIC_NEED;
}

// O sistema "aprende" com o feedback: uma atividade que ja foi marcada como
// "Nao funcionou" para ESTE aluno especifico para de ser sugerida junto com
// as demais. Ela so volta a aparecer como ultimo recurso, com um aviso, se
// nao houver atividades novas o bastante para completar as 3 sugestoes
// (ex: o aluno ja tentou e nao gostou de quase tudo no catalogo). O que
// "funcionou bem" ou "parcialmente" continua podendo ser sugerido de novo
// normalmente - so o que deu errado e evitado.
function chooseTemplates(student, previousFeedbacks, need) {
  const failedTitles = previousFeedbacks
    .filter((item) => item.result === "Não funcionou")
    .map((item) => item.activityTitle.toLowerCase());

  function failedBefore(template) {
    return failedTitles.some((title) => title.includes(template.title.toLowerCase()));
  }

  const scored = activityTemplates.map((template, index) => {
    const strengthScore = template.goodFor.filter((tag) => student.strengths.includes(tag)).length * 3;
    const baseScore = template.goodFor.some((tag) => need.activityMatches.join(" ").includes(tag.split(" ")[0])) ? 2 : 0;
    const cautionPenalty = template.avoidWhen.filter((risk) => student.cautions.includes(risk)).length * 4;
    return {
      template,
      previouslyFailed: failedBefore(template),
      score: strengthScore + baseScore - cautionPenalty + (activityTemplates.length - index) / 10
    };
  });

  const fresh = scored.filter((item) => !item.previouslyFailed).sort((a, b) => b.score - a.score);
  const failed = scored.filter((item) => item.previouslyFailed).sort((a, b) => b.score - a.score);

  const chosen = fresh.slice(0, 3);
  if (chosen.length < 3) {
    // Nao ha atividades novas suficientes - preenche com as que ja
    // falharam antes, das melhores pontuadas pra piores, sinalizando cada
    // uma para a interface avisar a professora.
    chosen.push(...failed.slice(0, 3 - chosen.length));
  }

  return chosen.map((item) => ({ ...item.template, previouslyFailed: item.previouslyFailed }));
}

function estimateTime(type, level) {
  if (type.includes("Movimento")) return level === "Jardim" ? "8 min" : "12 min";
  if (type.includes("Digital")) return "6 min";
  if (type.includes("Construção")) return level === "Jardim" ? "15 min" : "20 min";
  return level === "Jardim" ? "10 min" : "15 min";
}

/**
 * @param {object} params
 * @param {object} params.student
 * @param {object} params.goal - objetivo BNCC selecionado
 * @param {object} params.classInfo - turma do aluno (para o nivel: Pre I / Jardim)
 * @param {string} params.theme
 * @param {object[]} params.previousFeedbacks - feedbacks anteriores do aluno
 * @param {object} params.need - registro da base de necessidades
 * @param {string} [params.studentObservation]
 * @param {string} [params.needObservation]
 */
function buildActivities({ student, goal, classInfo, theme, previousFeedbacks, need, studentObservation, needObservation }) {
  const safeTheme = (theme || "").trim() || "Tema livre";
  const selectedTemplates = chooseTemplates(student, previousFeedbacks, need);

  return selectedTemplates.map((template, index) => ({
    id: `${student.id}-${Date.now()}-${index}`,
    ...template,
    theme: safeTheme,
    studentId: student.id,
    goalCode: goal.code,
    title: `${template.title}: ${safeTheme}`,
    objective: `${goal.code} - ${goal.text}`,
    adaptation: `${template.support} Considerar ${student.disability.toLowerCase()}, com apoio de ${(need.strategies || [])
      .slice(0, 2)
      .join(" e ") || "estratégias individualizadas"}. ${needObservation ? `Percepção sobre a deficiência: ${needObservation}` : ""} ${
      studentObservation ? `Observação do aluno: ${studentObservation}` : student.strengths[0] ? `Histórico favorável: ${student.strengths[0]} costuma funcionar bem.` : ""
    }`
      .replace(/\s+/g, " ")
      .trim(),
    time: estimateTime(template.type, classInfo.level),
    supportLevel: template.avoidWhen.some((risk) => student.cautions.includes(risk)) ? "Apoio próximo" : "Apoio moderado",
    previouslyFailed: Boolean(template.previouslyFailed),
    previouslyFailedNote: template.previouslyFailed
      ? "Essa atividade já foi registrada como \"Não funcionou\" com este aluno antes. Está aparecendo porque não há alternativas novas suficientes no momento."
      : null,
    generatedBy: "regras"
  }));
}

const VALID_TONES = ["green", "violet", "rose", "teal", "gold"];
const VALID_RESOURCE_CLASSES = ["manipulative", "story", "movement", "sequence", "digital", "visual"];

// Encaixa o array cru devolvido pela IA (server/aiPrompt.js) no mesmo
// formato que o front-end ja espera do motor por regras: completa id,
// vinculo com o aluno/objetivo e sanitiza os dois campos que viram classe
// CSS (tone/resourceClass), caso o modelo devolva algo fora do combinado.
function normalizeAiActivities(aiActivities, { student, goal, theme }) {
  const safeTheme = (theme || "").trim() || "Tema livre";
  return aiActivities.map((item, index) => ({
    id: `${student.id}-ai-${Date.now()}-${index}`,
    type: String(item.type || "Atividade adaptada"),
    tone: VALID_TONES.includes(item.tone) ? item.tone : VALID_TONES[index % VALID_TONES.length],
    resourceClass: VALID_RESOURCE_CLASSES.includes(item.resourceClass) ? item.resourceClass : "manipulative",
    title: String(item.title || `Atividade ${index + 1}: ${safeTheme}`),
    resource: String(item.resource || ""),
    method: String(item.method || ""),
    adaptation: String(item.adaptation || ""),
    time: String(item.time || "10 min"),
    supportLevel: item.supportLevel === "Apoio próximo" ? "Apoio próximo" : "Apoio moderado",
    theme: safeTheme,
    studentId: student.id,
    goalCode: goal.code,
    objective: `${goal.code} - ${goal.text}`,
    previouslyFailed: false,
    previouslyFailedNote: null,
    generatedBy: "ia"
  }));
}

module.exports = {
  GENERIC_NEED,
  getNeedForDisability,
  chooseTemplates,
  estimateTime,
  buildActivities,
  normalizeAiActivities
};
