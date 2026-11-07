const store = require("../store");
const { sendJson, HttpError } = require("../router");
const { requireAuth } = require("../middleware/auth");
const { makeId } = require("../util/id");

const VALID_RESULTS = ["Funcionou bem", "Funcionou parcialmente", "Não funcionou"];

function register(router) {
  router.get("/api/feedbacks", requireAuth, (req, res) => {
    const { studentId, teacherId } = req.query;
    let feedbacks = store.getAll("feedbacks");
    if (studentId) feedbacks = feedbacks.filter((item) => item.studentId === studentId);
    if (teacherId) feedbacks = feedbacks.filter((item) => item.teacherId === teacherId);
    sendJson(res, 200, { feedbacks });
  });

  router.post("/api/feedbacks", requireAuth, (req, res) => {
    const { studentId, theme, activityTitle, result, notes } = req.body || {};
    if (!studentId || !activityTitle || !result) {
      throw new HttpError(400, "Informe aluno, atividade e resultado do feedback.");
    }
    if (!VALID_RESULTS.includes(result)) {
      throw new HttpError(400, "Resultado de feedback inválido.");
    }
    if (!store.getById("students", studentId)) throw new HttpError(404, "Aluno não encontrado.");

    const teacherId = req.user.role === "teacher" ? req.user.teacherId : req.body.teacherId || null;
    const teacher = teacherId ? store.getById("teachers", teacherId) : null;

    const feedback = store.insert("feedbacks", {
      id: makeId("fb"),
      studentId,
      teacherId,
      teacherName: teacher ? teacher.name : req.user.name,
      theme: theme || "Tema livre",
      activityTitle,
      result,
      notes: (notes || "").trim(),
      date: new Date().toLocaleDateString("pt-BR")
    });

    sendJson(res, 201, { feedback });
  });
}

module.exports = { register };
