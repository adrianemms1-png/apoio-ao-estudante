const store = require("../store");
const { sendJson, HttpError } = require("../router");
const { requireAuth, requireRole } = require("../middleware/auth");
const { logAction } = require("../util/audit");

function register(router) {
  router.get("/api/classes", requireAuth, (req, res) => {
    sendJson(res, 200, { classes: store.getAll("classes") });
  });

  router.post("/api/classes", requireAuth, requireRole("admin"), (req, res) => {
    const { name, level } = req.body || {};
    if (!name || !level) throw new HttpError(400, "Informe nome e nível da turma.");
    if (!["Pré I", "Jardim"].includes(level)) {
      throw new HttpError(400, 'O nível da turma deve ser "Pré I" ou "Jardim".');
    }
    const created = store.insert("classes", { name: String(name).trim(), level });
    logAction(req.user, "criar", "turma", created.id, created.name);
    sendJson(res, 201, { class: created });
  });

  router.put("/api/classes/:id", requireAuth, requireRole("admin"), (req, res) => {
    const existing = store.getById("classes", req.params.id);
    if (!existing) throw new HttpError(404, "Turma não encontrada.");
    const { name, level } = req.body || {};
    if (level && !["Pré I", "Jardim"].includes(level)) {
      throw new HttpError(400, 'O nível da turma deve ser "Pré I" ou "Jardim".');
    }
    const updated = store.update("classes", req.params.id, {
      name: name !== undefined ? String(name).trim() : existing.name,
      level: level || existing.level
    });
    logAction(req.user, "editar", "turma", updated.id, updated.name);
    sendJson(res, 200, { class: updated });
  });

  router.delete("/api/classes/:id", requireAuth, requireRole("admin"), (req, res) => {
    const existing = store.getById("classes", req.params.id);
    if (!existing) throw new HttpError(404, "Turma não encontrada.");
    const hasStudents = store.getAll("students").some((student) => student.classId === req.params.id);
    const hasTeachers = store.getAll("teachers").some((teacher) => (teacher.classIds || []).includes(req.params.id));
    if (hasStudents || hasTeachers) {
      throw new HttpError(409, "Não é possível excluir: existem alunos ou professoras vinculados a esta turma.");
    }
    store.remove("classes", req.params.id);
    logAction(req.user, "excluir", "turma", req.params.id, existing.name);
    sendJson(res, 200, { ok: true });
  });
}

module.exports = { register };
