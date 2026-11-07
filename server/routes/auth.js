const store = require("../store");
const { verifyPassword } = require("../util/hash");
const { createSession, destroySession, setSessionCookie, clearSessionCookie, SESSION_COOKIE } = require("../session");
const { sendJson, HttpError } = require("../router");
const { requireAuth } = require("../middleware/auth");
const { logAction } = require("../util/audit");

// Freio simples contra tentativas repetidas de senha (nao existia nenhum
// limite antes). Guardado em memoria - reinicia com o servidor, o que e
// aceitavel para uso local; nao e uma defesa de nivel producao para a web.
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60 * 1000;
const attempts = new Map(); // email normalizado -> { count, lockedUntil }

function checkThrottle(email) {
  const entry = attempts.get(email);
  if (!entry) return;
  if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
    const seconds = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    throw new HttpError(429, `Muitas tentativas incorretas. Aguarde ${seconds}s antes de tentar de novo.`);
  }
}

function registerFailure(email) {
  const entry = attempts.get(email) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_MS;
    entry.count = 0;
  }
  attempts.set(email, entry);
}

function registerSuccess(email) {
  attempts.delete(email);
}

function publicUser(user) {
  return { id: user.id, email: user.email, role: user.role, name: user.name, teacherId: user.teacherId };
}

function register(router) {
  router.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      throw new HttpError(400, "Informe usuário e senha.");
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    checkThrottle(normalizedEmail);

    const user = store.getAll("users").find((item) => item.email.toLowerCase() === normalizedEmail);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      registerFailure(normalizedEmail);
      throw new HttpError(401, "Usuário ou senha inválidos.");
    }
    registerSuccess(normalizedEmail);
    const sessionId = createSession(user.id);
    setSessionCookie(res, sessionId);
    logAction(user, "login", "sessão", user.id, null);
    sendJson(res, 200, { user: publicUser(user) });
  });

  router.post("/api/auth/logout", (req, res) => {
    const cookies = req.cookies || {};
    if (cookies[SESSION_COOKIE]) destroySession(cookies[SESSION_COOKIE]);
    if (req.user) logAction(req.user, "logout", "sessão", req.user.id, null);
    clearSessionCookie(res);
    sendJson(res, 200, { ok: true });
  });

  router.get("/api/auth/me", requireAuth, (req, res) => {
    sendJson(res, 200, { user: publicUser(req.user) });
  });
}

module.exports = { register, publicUser };
