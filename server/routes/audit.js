const store = require("../store");
const { sendJson } = require("../router");
const { requireAuth, requireRole } = require("../middleware/auth");

function register(router) {
  // So a coordenacao ve o historico de alteracoes (envolve nomes de
  // professoras e alunos, entao segue a mesma regra de acesso administrativo).
  router.get("/api/audit", requireAuth, requireRole("admin"), (req, res) => {
    const entries = store
      .getAll("auditLog")
      .slice(-100)
      .reverse();
    sendJson(res, 200, { entries });
  });
}

module.exports = { register };
