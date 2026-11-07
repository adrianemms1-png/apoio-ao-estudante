const store = require("../store");
const { sendJson, HttpError } = require("../router");
const { requireAuth, requireRole } = require("../middleware/auth");
const { hashPassword } = require("../util/hash");
const { makeId } = require("../util/id");
const { logAction } = require("../util/audit");

function register(router) {
  // Qualquer pessoa autenticada pode ver a lista (o seletor de professora do
  // atendimento rápido precisa disso); dados de login (senha) nunca saem
  // daqui. O e-mail de acesso só é anexado para a coordenação (que é quem
  // pode editá-lo) - para professora seria dado administrativo de outra
  // pessoa, sem necessidade pedagógica de aparecer.
  router.get("/api/teachers", requireAuth, (req, res) => {
    const teachers = store.getAll("teachers").map((teacher) => {
      if (req.user.role !== "admin") return teacher;
      const user = store.getAll("users").find((item) => item.teacherId === teacher.id);
      return { ...teacher, email: user ? user.email : "" };
    });
    sendJson(res, 200, { teachers });
  });

  router.post("/api/teachers", requireAuth, requireRole("admin"), (req, res) => {
    const { name, classIds, email, password } = req.body || {};
    if (!name || !email || !password) {
      throw new HttpError(400, "Informe nome, e-mail e senha da professora.");
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const emailInUse = store.getAll("users").some((user) => user.email.toLowerCase() === normalizedEmail);
    if (emailInUse) throw new HttpError(409, "Já existe uma conta com este e-mail.");

    const teacher = store.insert("teachers", {
      id: makeId("tch"),
      name: String(name).trim(),
      classIds: Array.isArray(classIds) ? classIds : []
    });

    store.insert("users", {
      id: makeId("usr"),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      role: "teacher",
      name: teacher.name,
      teacherId: teacher.id
    });

    logAction(req.user, "criar", "professora", teacher.id, teacher.name);
    sendJson(res, 201, { teacher });
  });

  router.put("/api/teachers/:id", requireAuth, requireRole("admin"), (req, res) => {
    const existing = store.getById("teachers", req.params.id);
    if (!existing) throw new HttpError(404, "Professora não encontrada.");
    const { name, classIds, email } = req.body || {};
    const updated = store.update("teachers", req.params.id, {
      name: name !== undefined ? String(name).trim() : existing.name,
      classIds: Array.isArray(classIds) ? classIds : existing.classIds
    });

    const user = store.getAll("users").find((item) => item.teacherId === req.params.id);
    if (user) {
      const patch = {};
      if (name) patch.name = updated.name;
      if (email !== undefined) {
        const normalizedEmail = String(email).trim().toLowerCase();
        if (!normalizedEmail) throw new HttpError(400, "O e-mail não pode ficar vazio.");
        if (normalizedEmail !== user.email.toLowerCase()) {
          const emailInUse = store.getAll("users").some((item) => item.id !== user.id && item.email.toLowerCase() === normalizedEmail);
          if (emailInUse) throw new HttpError(409, "Já existe uma conta com este e-mail.");
          patch.email = normalizedEmail;
        }
      }
      if (Object.keys(patch).length) store.update("users", user.id, patch);
    }

    // Antes, excluir/alterar turmas de uma professora nunca avisava se isso
    // deixava alguma turma sem nenhuma professora vinculada. Continua sendo
    // permitido (pode ser uma situação temporária e legítima), mas agora o
    // front-end recebe esse aviso para mostrar à coordenação.
    const orphanClasses = store
      .getAll("classes")
      .filter((klass) => klass.id && !store.getAll("teachers").some((t) => (t.classIds || []).includes(klass.id)))
      .map((klass) => klass.name);

    logAction(req.user, "editar", "professora", updated.id, updated.name);
    sendJson(res, 200, { teacher: updated, orphanClasses });
  });

  router.put("/api/teachers/:id/password", requireAuth, requireRole("admin"), (req, res) => {
    const { password } = req.body || {};
    if (!password || String(password).length < 4) {
      throw new HttpError(400, "Informe uma senha com pelo menos 4 caracteres.");
    }
    const user = store.getAll("users").find((item) => item.teacherId === req.params.id);
    if (!user) throw new HttpError(404, "Login desta professora não encontrado.");
    store.update("users", user.id, { passwordHash: hashPassword(password) });
    logAction(req.user, "redefinir senha", "professora", req.params.id, null);
    sendJson(res, 200, { ok: true });
  });

  router.delete("/api/teachers/:id", requireAuth, requireRole("admin"), (req, res) => {
    const existing = store.getById("teachers", req.params.id);
    if (!existing) throw new HttpError(404, "Professora não encontrada.");
    const user = store.getAll("users").find((item) => item.teacherId === req.params.id);
    if (user) store.remove("users", user.id);
    store.remove("teachers", req.params.id);

    const remainingTeachers = store.getAll("teachers");
    const orphanClasses = (existing.classIds || [])
      .filter((classId) => !remainingTeachers.some((t) => (t.classIds || []).includes(classId)))
      .map((classId) => store.getById("classes", classId)?.name)
      .filter(Boolean);

    logAction(req.user, "excluir", "professora", req.params.id, existing.name);
    sendJson(res, 200, { ok: true, orphanClasses });
  });
}

module.exports = { register };
