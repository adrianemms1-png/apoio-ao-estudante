const http = require("http");
const fs = require("fs");
const config = require("./config");
const store = require("./store");
const { Router, sendJson, readJsonBody, parseUrl } = require("./router");
const { parseCookies, getSession, SESSION_COOKIE } = require("./session");
const { serveStatic } = require("./staticServer");

// Garante que o banco existe antes de subir o servidor (primeira execucao).
if (!fs.existsSync(config.DB_PATH)) {
  require("./seedData/seed").run({ force: false });
}

const router = new Router();
require("./routes/auth").register(router);
require("./routes/classes").register(router);
require("./routes/teachers").register(router);
require("./routes/students").register(router);
require("./routes/bncc").register(router);
require("./routes/needs").register(router);
require("./routes/activities").register(router);
require("./routes/assignments").register(router);
require("./routes/feedbacks").register(router);
require("./routes/tags").register(router);
require("./routes/audit").register(router);
require("./routes/ai").register(router);

const server = http.createServer(async (req, res) => {
  const { pathname, query } = parseUrl(req);
  req.query = query;
  req.cookies = parseCookies(req);
  res.json = (statusCode, body) => sendJson(res, statusCode, body);

  // Resolve usuario autenticado (se houver) a partir do cookie de sessao.
  req.user = null;
  const sessionId = req.cookies[SESSION_COOKIE];
  const session = getSession(sessionId);
  if (session) {
    const user = store.getById("users", session.userId);
    if (user) req.user = user;
  }

  try {
    if (pathname.startsWith("/api/")) {
      if (["POST", "PUT", "DELETE"].includes(req.method)) {
        req.body = await readJsonBody(req);
      } else {
        req.body = {};
      }
      const handled = await router.handle(req, res, pathname);
      if (!handled) {
        sendJson(res, 404, { error: "Rota de API não encontrada." });
      }
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      serveStatic(req, res, pathname);
      return;
    }

    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Método não permitido.");
  } catch (error) {
    console.error("Erro não tratado:", error);
    if (!res.writableEnded) {
      sendJson(res, 500, { error: "Erro interno no servidor." });
    }
  }
});

server.listen(config.PORT, config.HOST, () => {
  console.log("");
  console.log("  Apoio ao Estudante rodando localmente");
  console.log(`  -> http://${config.HOST}:${config.PORT}`);
  console.log("");
  // As credenciais de demonstração só são impressas uma vez, pelo próprio
  // script de seed (server/seedData/seed.js), no momento em que o banco é
  // criado - antes isso era impresso aqui, toda vez que o servidor iniciava,
  // mesmo depois de a coordenação já ter trocado as senhas de verdade.
  console.log("  Pressione Ctrl+C para encerrar o servidor.");
});
