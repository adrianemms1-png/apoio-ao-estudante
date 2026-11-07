// "Atividade selecionada": antes, clicar em "Selecionar" so pintava a borda
// do cartao (nada era salvo, nada acontecia). Agora selecionar uma atividade
// cria um registro de verdade (esta rota), que fica "em andamento" ate a
// professora registrar o resultado (o que gera o feedback, como antes) ou
// cancelar a selecao.
const store = require("../store");
const { sendJson, HttpError } = require("../router");
const { requireAuth } = require("../middleware/auth");
const { makeId } = require("../util/id");
const { teacherOwnsStudent } = require("./students");

const VALID_RESULTS = ["Funcionou bem", "Funcionou parcialmente", "Não funcionou"];

function register(router) {
  // Lista as atribuicoes de um aluno (por padrao, so a que estiver em
  // andamento - e o que a tela de Atendimento Rapido precisa para saber se
  // deve mostrar a grade de sugestoes ou o painel "atividade em andamento").
  router.get("/api/assignments", requireAuth, (req, res) => {
    const { studentId, status } = req.query;
    if (!studentId) throw new HttpError(400, "Informe studentId.");
    const student = store.getById("students", studentId);
    if (!student) throw new HttpError(404, "Aluno não encontrado.");
    if (!teacherOwnsStudent(req.user, student)) {
      throw new HttpError(403, "Este aluno não está em nenhuma das suas turmas.");
    }
    let assignments = store.getAll("assignments").filter((item) => item.studentId === studentId);
    if (status) assignments = assignments.filter((item) => item.status === status);
    assignments = assignments.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    sendJson(res, 200, { assignments });
  });

  // Cria a atribuicao a partir de uma das 3 atividades geradas (o corpo e a
  // propria atividade retornada por GET /api/activities - guardamos um
  // retrato dela para o registro nao mudar se o motor de recomendacao mudar
  // depois).
  router.post("/api/assignments", requireAuth, (req, res) => {
    const { studentId, activity } = req.body || {};
    if (!studentId || !activity || !activity.title) {
      throw new HttpError(400, "Informe studentId e a atividade selecionada.");
    }
    const student = store.getById("students", studentId);
    if (!student) throw new HttpError(404, "Aluno não encontrado.");
    if (!teacherOwnsStudent(req.user, student)) {
      throw new HttpError(403, "Este aluno não está em nenhuma das suas turmas.");
    }

    const alreadyOpen = store
      .getAll("assignments")
      .some((item) => item.studentId === studentId && item.status === "selecionada");
    if (alreadyOpen) {
      throw new HttpError(409, "Já existe uma atividade em andamento para este aluno. Registre o resultado ou cancele antes de selecionar outra.");
    }

    const created = store.insert("assignments", {
      id: makeId("asg"),
      studentId,
      classId: student.classId,
      teacherId: req.user.role === "teacher" ? req.user.teacherId : null,
      teacherName: req.user.name,
      theme: activity.theme || "Tema livre",
      goalCode: activity.goalCode || null,
      activity,
      status: "selecionada",
      notes: "",
      createdAt: new Date().toISOString(),
      resolvedAt: null
    });

    sendJson(res, 201, { assignment: created });
  });

  // Registra o resultado (mesmos 3 valores usados no feedback) e, junto,
  // cria o feedback correspondente - assim o historico que ja existia
  // (ultimos registros no resumo do aluno) continua funcionando exatamente
  // como antes, só que agora nasce de um fluxo com estado real.
  router.put("/api/assignments/:id/resolve", requireAuth, (req, res) => {
    const assignment = store.getById("assignments", req.params.id);
    if (!assignment) throw new HttpError(404, "Atividade selecionada não encontrada.");
    const student = store.getById("students", assignment.studentId);
    if (!student || !teacherOwnsStudent(req.user, student)) {
      throw new HttpError(403, "Este aluno não está em nenhuma das suas turmas.");
    }
    if (assignment.status !== "selecionada") {
      throw new HttpError(409, "Esta atividade já foi encerrada.");
    }
    const { result, notes } = req.body || {};
    if (!VALID_RESULTS.includes(result)) {
      throw new HttpError(400, "Resultado inválido.");
    }

    const teacherId = req.user.role === "teacher" ? req.user.teacherId : req.body.teacherId || null;
    const teacher = teacherId ? store.getById("teachers", teacherId) : null;

    const feedback = store.insert("feedbacks", {
      id: makeId("fb"),
      studentId: assignment.studentId,
      assignmentId: assignment.id,
      teacherId,
      teacherName: teacher ? teacher.name : req.user.name,
      theme: assignment.theme,
      activityTitle: assignment.activity.title,
      result,
      notes: (notes || "").trim(),
      date: new Date().toLocaleDateString("pt-BR")
    });

    const statusMap = {
      "Funcionou bem": "concluida",
      "Funcionou parcialmente": "parcial",
      "Não funcionou": "nao_funcionou"
    };
    const updated = store.update("assignments", assignment.id, {
      status: statusMap[result],
      notes: (notes || "").trim(),
      resolvedAt: new Date().toISOString(),
      feedbackId: feedback.id
    });

    sendJson(res, 200, { assignment: updated, feedback });
  });

  // Cancela a selecao sem registrar feedback (ex: escolheu a atividade
  // errada, ou vai trocar de tema antes de aplicar).
  router.delete("/api/assignments/:id", requireAuth, (req, res) => {
    const assignment = store.getById("assignments", req.params.id);
    if (!assignment) throw new HttpError(404, "Atividade selecionada não encontrada.");
    const student = store.getById("students", assignment.studentId);
    if (!student || !teacherOwnsStudent(req.user, student)) {
      throw new HttpError(403, "Este aluno não está em nenhuma das suas turmas.");
    }
    if (assignment.status !== "selecionada") {
      throw new HttpError(409, "Esta atividade já foi encerrada.");
    }
    store.remove("assignments", assignment.id);
    sendJson(res, 200, { ok: true });
  });
}

module.exports = { register };
