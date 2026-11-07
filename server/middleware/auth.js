const { HttpError } = require("../router");

// req.user e preenchido em server/index.js (a partir do cookie de sessao)
// antes do roteador ser chamado, entao essas funcoes so precisam checar o
// que ja foi resolvido.
function requireAuth(req, res, next) {
  if (!req.user) {
    throw new HttpError(401, "É necessário estar autenticado.");
  }
  next();
}

function requireRole(role) {
  return function roleMiddleware(req, res, next) {
    if (!req.user) {
      throw new HttpError(401, "É necessário estar autenticado.");
    }
    if (req.user.role !== role) {
      throw new HttpError(403, "Você não tem permissão para acessar este recurso.");
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
