// Trilha de auditoria simples: registra quem fez o que, e quando, em acoes
// administrativas (cadastro/edicao/exclusao de turma, professora e aluno,
// redefinicao de senha, criacao/remocao de deficiencia). Antes nada disso
// ficava registrado - com mais de uma pessoa usando o sistema, nao dava para
// saber quem alterou o que depois.
const store = require("../store");
const { makeId } = require("./id");

function logAction(user, action, entity, entityId, details) {
  try {
    store.insert("auditLog", {
      id: makeId("log"),
      at: new Date().toISOString(),
      actorId: user ? user.id : null,
      actorName: user ? user.name : "Sistema",
      actorRole: user ? user.role : null,
      action,
      entity,
      entityId: entityId || null,
      details: details || ""
    });
  } catch (error) {
    // Auditoria nunca deve derrubar a requisicao principal.
    console.error("Falha ao registrar auditoria:", error.message);
  }
}

module.exports = { logAction };
