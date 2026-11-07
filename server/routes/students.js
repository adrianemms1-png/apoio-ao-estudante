// Este arquivo concentra o controle de acesso a dados sensiveis do aluno:
// diferente do protótipo original (onde a separacao professora/coordenacao
// era so uma classe CSS escondendo campos no navegador), aqui os campos
// privados simplesmente NUNCA sao colocados no JSON de resposta quando quem
// pede e uma professora. Abrir o DevTools do navegador nao muda isso.
const store = require("../store");
const { sendJson, HttpError } = require("../router");
const { requireAuth, requireRole } = require("../middleware/auth");
const { makeId } = require("../util/id");
const { getNeedForDisability } = require("../engine/activityEngine");
const { logAction } = require("../util/audit");

const PRIVATE_FIELDS = ["fullName", "birthDate", "guardian", "phone", "documentsNote"];
const MIN_AGE = 0;
const MAX_AGE = 6; // publico do produto e Pre I / Jardim (~3 a 5 anos)

function serializeStudent(student, role) {
  const base = {
    id: student.id,
    shortName: student.shortName,
    age: student.age,
    classId: student.classId,
    disability: student.disability,
    needId: student.needId || null,
    profile: student.profile,
    strengths: student.strengths || [],
    cautions: student.cautions || [],
    // observacao pedagogica e contagem de feedbacks nao sao dados privados
    // (nao identificam a familia/documentos do aluno), entao vao para as
    // duas visoes - isso evita uma segunda chamada so para contar feedbacks.
    observation: store.getMap("studentObservations")[student.id] || "",
    feedbackCount: store.getAll("feedbacks").filter((item) => item.studentId === student.id).length
  };
  if (role === "admin") {
    PRIVATE_FIELDS.forEach((field) => {
      base[field] = student[field] || "";
    });
  }
  return base;
}

// Uma professora so pode ver/gerenciar alunos das turmas dela. A coordenacao
// (admin) ve tudo. Antes essa checagem so existia no front-end (que filtrava
// a turma/aluno do Atendimento Rapido) - a lista de "Alunos" e as rotas de
// detalhe nao aplicavam nada disso no servidor.
function teacherOwnsStudent(user, student) {
  if (user.role === "admin") return true;
  const teacher = store.getById("teachers", user.teacherId);
  if (!teacher) return false;
  return (teacher.classIds || []).includes(student.classId);
}

function visibleStudents(user) {
  const students = store.getAll("students");
  if (user.role === "admin") return students;
  const teacher = store.getById("teachers", user.teacherId);
  const classIds = teacher ? teacher.classIds || [] : [];
  return students.filter((student) => classIds.includes(student.classId));
}

function requireStudentPayload(body, { partial } = { partial: false }) {
  const errors = [];
  const fields = {};

  function need(key, transform = (v) => v) {
    if (body[key] === undefined) {
      if (!partial) errors.push(key);
      return;
    }
    fields[key] = transform(body[key]);
  }

  function optional(key, transform = (v) => v, fallback = "") {
    if (body[key] === undefined) {
      if (!partial) fields[key] = fallback;
      return;
    }
    fields[key] = transform(body[key]);
  }

  need("fullName", (v) => String(v).trim());
  need("shortName", (v) => String(v).trim());
  need("age", (v) => {
    const age = Number(v);
    if (!Number.isFinite(age) || age < MIN_AGE || age > MAX_AGE) {
      throw new HttpError(400, `Idade inválida: informe um número entre ${MIN_AGE} e ${MAX_AGE}.`);
    }
    return age;
  });
  need("classId", (v) => String(v));
  need("disability", (v) => String(v).trim());
  // needId é a referência de verdade usada pelo motor de recomendação -
  // exigida no cadastro (não só um texto livre de "deficiência") para que a
  // ligação aluno -> base de necessidades nunca dependa de nomes baterem.
  need("needId", (v) => {
    const id = String(v || "").trim();
    if (!id) throw new HttpError(400, "Selecione a deficiência/necessidade do aluno.");
    return id;
  });
  need("profile", (v) => String(v).trim());
  need("strengths", (v) => (Array.isArray(v) ? v.map(String) : String(v).split(",").map((s) => s.trim()).filter(Boolean)));
  need("cautions", (v) => (Array.isArray(v) ? v.map(String) : String(v).split(",").map((s) => s.trim()).filter(Boolean)));
  need("birthDate", (v) => String(v).trim());
  need("guardian", (v) => String(v).trim());
  need("phone", (v) => String(v).trim());
  // "Documentos/observacoes administrativas" e o unico campo pessoal que
  // pode legitimamente nao existir (nem toda crianca tem laudo ou observacao
  // administrativa) - por isso e opcional, diferente dos demais.
  optional("documentsNote", (v) => String(v).trim(), "");

  if (errors.length) {
    throw new HttpError(400, `Campos obrigatórios ausentes: ${errors.join(", ")}.`);
  }
  return fields;
}

function register(router) {
  router.get("/api/students", requireAuth, (req, res) => {
    const students = visibleStudents(req.user).map((student) => serializeStudent(student, req.user.role));
    sendJson(res, 200, { students });
  });

  router.get("/api/students/:id", requireAuth, (req, res) => {
    const student = store.getById("students", req.params.id);
    if (!student) throw new HttpError(404, "Aluno não encontrado.");
    if (!teacherOwnsStudent(req.user, student)) {
      throw new HttpError(403, "Este aluno não está em nenhuma das suas turmas.");
    }
    sendJson(res, 200, { student: serializeStudent(student, req.user.role) });
  });

  // Resumo pedagogico usado pelo "Atendimento rápido": perfil + necessidade +
  // observacao da professora + ultimos feedbacks. Nunca inclui dados privados,
  // mesmo para coordenacao, porque essa tela e sempre a visao pedagogica.
  router.get("/api/students/:id/summary", requireAuth, (req, res) => {
    const student = store.getById("students", req.params.id);
    if (!student) throw new HttpError(404, "Aluno não encontrado.");
    if (!teacherOwnsStudent(req.user, student)) {
      throw new HttpError(403, "Este aluno não está em nenhuma das suas turmas.");
    }
    const classInfo = store.getById("classes", student.classId);
    const need = getNeedForDisability(student, store.getAll("needs"));
    const observation = store.getMap("studentObservations")[student.id] || "";
    const history = store
      .getAll("feedbacks")
      .filter((item) => item.studentId === student.id)
      .slice(-2)
      .reverse();

    sendJson(res, 200, {
      student: serializeStudent(student, "teacher"),
      classInfo,
      need,
      observation,
      history
    });
  });

  router.post("/api/students", requireAuth, requireRole("admin"), (req, res) => {
    const fields = requireStudentPayload(req.body || {});
    if (!store.getById("classes", fields.classId)) throw new HttpError(400, "Turma inválida.");
    if (fields.needId && !store.getById("needs", fields.needId)) throw new HttpError(400, "Deficiência/necessidade inválida.");
    const created = store.insert("students", { id: makeId("stu"), ...fields });
    logAction(req.user, "criar", "aluno", created.id, created.shortName);
    sendJson(res, 201, { student: serializeStudent(created, "admin") });
  });

  router.put("/api/students/:id", requireAuth, requireRole("admin"), (req, res) => {
    const existing = store.getById("students", req.params.id);
    if (!existing) throw new HttpError(404, "Aluno não encontrado.");
    const fields = requireStudentPayload(req.body || {}, { partial: true });
    if (fields.classId && !store.getById("classes", fields.classId)) {
      throw new HttpError(400, "Turma inválida.");
    }
    if (fields.needId && !store.getById("needs", fields.needId)) {
      throw new HttpError(400, "Deficiência/necessidade inválida.");
    }
    const updated = store.update("students", req.params.id, fields);
    logAction(req.user, "editar", "aluno", updated.id, updated.shortName);
    sendJson(res, 200, { student: serializeStudent(updated, "admin") });
  });

  router.delete("/api/students/:id", requireAuth, requireRole("admin"), (req, res) => {
    const existing = store.getById("students", req.params.id);
    if (!existing) throw new HttpError(404, "Aluno não encontrado.");
    store.remove("students", req.params.id);
    store.replaceCollection(
      "feedbacks",
      store.getAll("feedbacks").filter((item) => item.studentId !== req.params.id)
    );
    store.replaceCollection(
      "assignments",
      store.getAll("assignments").filter((item) => item.studentId !== req.params.id)
    );
    const observations = store.getMap("studentObservations");
    delete observations[req.params.id];
    store.persist();
    logAction(req.user, "excluir", "aluno", req.params.id, existing.shortName);
    sendJson(res, 200, { ok: true });
  });

  router.post("/api/students/:id/observation", requireAuth, (req, res) => {
    const existing = store.getById("students", req.params.id);
    if (!existing) throw new HttpError(404, "Aluno não encontrado.");
    if (!teacherOwnsStudent(req.user, existing)) {
      throw new HttpError(403, "Este aluno não está em nenhuma das suas turmas.");
    }
    const text = String((req.body || {}).text || "").trim();
    store.setMapValue("studentObservations", req.params.id, text);
    sendJson(res, 200, { ok: true, observation: text });
  });
}

module.exports = { register, serializeStudent, teacherOwnsStudent };
