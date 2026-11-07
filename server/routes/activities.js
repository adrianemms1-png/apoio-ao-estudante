const store = require("../store");
const { sendJson, HttpError } = require("../router");
const { requireAuth } = require("../middleware/auth");
const { getNeedForDisability, buildActivities, normalizeAiActivities } = require("../engine/activityEngine");
const { isAiConfigured, generateActivitiesWithAI, getProviderLabel } = require("../aiPrompt");
const { teacherOwnsStudent } = require("./students");

function register(router) {
  router.get("/api/activities", requireAuth, async (req, res) => {
    const { studentId, goalCode, theme } = req.query;
    if (!studentId || !goalCode) {
      throw new HttpError(400, "Informe studentId e goalCode.");
    }
    const student = store.getById("students", studentId);
    if (!student) throw new HttpError(404, "Aluno não encontrado.");
    if (!teacherOwnsStudent(req.user, student)) {
      throw new HttpError(403, "Este aluno não está em nenhuma das suas turmas.");
    }
    const classInfo = store.getById("classes", student.classId);
    if (!classInfo) throw new HttpError(400, "Turma do aluno não encontrada.");

    const bnccGoals = store.getAll("bnccGoals");
    const goal =
      bnccGoals.find((item) => item.code === goalCode) ||
      bnccGoals.find((item) => item.level === classInfo.level);
    if (!goal) throw new HttpError(400, "Nenhum objetivo BNCC disponível para esta turma.");

    const needs = store.getAll("needs");
    const need = getNeedForDisability(student, needs);
    const previousFeedbacks = store.getAll("feedbacks").filter((item) => item.studentId === student.id);
    const studentObservation = store.getMap("studentObservations")[student.id] || "";
    const needObservation = store.getMap("needObservations")[need.id] || "";

    // A IA (quando configurada - ver server/aiPrompt.js) e o caminho
    // principal para gerar as 3 atividades: mais rica e especifica que o
    // catalogo fixo. Se a IA nao estiver configurada, ou a chamada falhar
    // (Ollama fechado, resposta invalida, etc.), cai para o motor por
    // regras (server/engine/activityEngine.js) na hora, para o Atendimento
    // Rapido nunca travar em sala de aula por causa da IA.
    let activities;
    let source = "regras";
    let fallbackReason = null;

    if (isAiConfigured()) {
      try {
        const failedTitles = previousFeedbacks
          .filter((item) => item.result === "Não funcionou")
          .map((item) => item.activityTitle);
        const aiResult = await generateActivitiesWithAI({
          needName: need.name,
          barriers: need.barriers,
          strategies: need.strategies,
          resources: need.resources,
          strengths: student.strengths,
          cautions: student.cautions,
          theme,
          bnccCode: goal.code,
          goalText: goal.text,
          classLevel: classInfo.level,
          failedTitles,
          studentObservation,
          needObservation
        });
        activities = normalizeAiActivities(aiResult, { student, goal, theme });
        source = "ia";
      } catch (error) {
        fallbackReason = error.message;
        activities = buildActivities({ student, goal, classInfo, theme, previousFeedbacks, need, studentObservation, needObservation });
        source = "regras-fallback";
      }
    } else {
      activities = buildActivities({ student, goal, classInfo, theme, previousFeedbacks, need, studentObservation, needObservation });
    }

    sendJson(res, 200, { activities, goal, source, fallbackReason, aiLabel: getProviderLabel() });
  });
}

module.exports = { register };
