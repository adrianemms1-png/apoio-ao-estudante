// Sessoes de login, persistidas na tabela "sessions" do SQLite (versao 1.1+).
// Antes ficavam so em memoria (Map) e todo reinicio do servidor derrubava os
// logins ativos. O cookie guarda apenas um identificador aleatorio de 192 bits;
// nenhum dado do usuario vai para o navegador.
const crypto = require("crypto");
const store = require("./store");

const SESSION_COOKIE = "apoio_estudante_sid";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

// Renovar o prazo a cada requisicao geraria uma escrita no banco por clique;
// so renovamos quando ja passou este intervalo desde a ultima renovacao.
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

function createSession(userId) {
  const id = crypto.randomBytes(24).toString("hex");
  store.sessions.purgeExpired(Date.now());
  store.sessions.create(id, userId, Date.now() + SESSION_TTL_MS);
  return id;
}

function getSession(sessionId) {
  if (!sessionId) return null;
  const session = store.sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    store.sessions.destroy(sessionId);
    return null;
  }
  // Sessao "deslizante": cada requisicao autenticada renova o prazo. Antes o
  // prazo era fixo desde o login - quem trabalhasse mais de 12h seguidas era
  // deslogado no meio do uso, mesmo estando ativo o tempo todo.
  const newExpiry = Date.now() + SESSION_TTL_MS;
  if (newExpiry - session.expiresAt > TOUCH_INTERVAL_MS) {
    store.sessions.touch(sessionId, newExpiry);
    session.expiresAt = newExpiry;
  }
  return session;
}

function destroySession(sessionId) {
  store.sessions.destroy(sessionId);
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
