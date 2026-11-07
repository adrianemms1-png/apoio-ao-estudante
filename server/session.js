// Sessoes de login simples, guardadas em memoria (Map). Isso significa que
// reiniciar o servidor derruba os logins ativos (a pessoa so precisa entrar
// de novo) - troca aceitavel para nao depender de um pacote externo de
// sessao/armazenamento. Se no futuro isso incomodar, e facil persistir esse
// Map em data/db.json do mesmo jeito que as outras colecoes.
const crypto = require("crypto");

const SESSION_COOKIE = "apoio_estudante_sid";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

const sessions = new Map();

function createSession(userId) {
  const id = crypto.randomBytes(24).toString("hex");
  sessions.set(id, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  return id;
}

function getSession(sessionId) {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  // Sessao "deslizante": cada requisicao autenticada renova o prazo. Antes o
  // prazo era fixo desde o login - quem trabalhasse mais de 12h seguidas era
  // deslogado no meio do uso, mesmo estando ativo o tempo todo.
  session.expiresAt = Date.now() + SESSION_TTL_MS;
  return session;
}

function destroySession(sessionId) {
  sessions.delete(sessionId);
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((pair) => {
    const [key, ...rest] = pair.trim().split("=");
    if (!key) return;
    cookies[key] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

function setSessionCookie(res, sessionId) {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`
  );
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

module.exports = {
  SESSION_COOKIE,
  createSession,
  getSession,
  destroySession,
  parseCookies,
  setSessionCookie,
  clearSessionCookie
};
