// Testes funcionais automatizados (caixa-preta, via API HTTP).
// Cada teste corresponde a um caso de teste do Quadro 15 do TCC (CT01 a CT10).
// Executar com:  npm test      (Node.js >= 22.13, sem dependencias)
//
// O servidor real e iniciado em um processo separado, com uma pasta de dados
// temporaria (DATA_DIR) e os dados de demonstracao. Um "Ollama falso" (servidor
// HTTP local) e usado para inspecionar exatamente o que o sistema envia a IA.
"use strict";
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "apoio-test-"));
const PORT = 3900 + Math.floor(Math.random() * 90);
const BASE = `http://127.0.0.1:${PORT}`;
let server;

// ---------- utilitarios ----------
function startServer() {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, DATA_DIR, PORT: String(PORT), NODE_NO_WARNINGS: "1", AI_PROVIDER: "" };
    server = spawn(process.execPath, [path.join(ROOT, "server/index.js")], { env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    server.stdout.on("data", (d) => {
      out += d;
      if (out.includes("rodando localmente")) resolve();
    });
    server.stderr.on("data", (d) => (out += d));
    server.on("exit", (code) => reject(new Error(`servidor saiu (${code}): ${out}`)));
  });
}
function stopServer() {
  return new Promise((resolve) => {
    if (!server || server.exitCode !== null) return resolve();
    server.removeAllListeners("exit");
    server.on("exit", resolve);
    server.kill();
  });
}
async function api(method, url, { body, cookie } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const setCookie = res.headers.get("set-cookie");
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json, cookie: setCookie ? setCookie.split(";")[0] : null };
}
async function login(email) {
  const r = await api("POST", "/api/auth/login", { body: { email, password: "123456" } });
  assert.equal(r.status, 200);
  return r.cookie;
}

before(startServer);
after(async () => {
  await stopServer();
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

// ---------- casos de teste ----------
test("CT01 - login com senha correta e incorreta", async () => {
  const ok = await api("POST", "/api/auth/login", { body: { email: "professora@escola.com", password: "123456" } });
  assert.equal(ok.status, 200);
  assert.ok(ok.cookie.startsWith("apoio_estudante_sid="));
  assert.equal(ok.json.user.passwordHash, undefined, "o hash da senha nao pode sair do servidor");

  const bad = await api("POST", "/api/auth/login", { body: { email: "professora@escola.com", password: "errada" } });
  assert.equal(bad.status, 401);
  assert.match(bad.json.error, /Usuário ou senha inválidos/, "mensagem nao revela qual campo errou");
});

test("CT02 - professora nao recebe dados pessoais nem acessa rotas da coordenacao", async () => {
  const prof = await login("professora@escola.com");
  const aluno = await api("GET", "/api/students/joao", { cookie: prof });
  assert.equal(aluno.status, 200);
  const s = aluno.json.student || aluno.json;
  for (const campo of ["fullName", "birthDate", "guardian", "phone", "documentsNote"]) {
    assert.equal(s[campo], undefined, `campo pessoal "${campo}" vazou para a professora`);
  }
  const criar = await api("POST", "/api/students", { cookie: prof, body: { shortName: "X" } });
  assert.equal(criar.status, 403);
  const auditoria = await api("GET", "/api/audit", { cookie: prof });
  assert.equal(auditoria.status, 403);
});

test("CT03 - coordenacao cria, edita e remove aluno", async () => {
  const adm = await login("coordenacao@escola.com");
  const novo = {
    fullName: "Aluno Teste da Silva", shortName: "Aluno T.", age: 5, classId: "jardim-a",
    disability: "Baixa visão", needId: "baixa-visao", profile: "Perfil de teste",
    strengths: ["objetos reais"], cautions: [], birthDate: "01/01/2021",
    guardian: "Responsável", phone: "(00) 0000-0000", documentsNote: ""
  };
  const c = await api("POST", "/api/students", { cookie: adm, body: novo });
  assert.equal(c.status, 201, JSON.stringify(c.json));
  const id = (c.json.student || c.json).id;
  const u = await api("PUT", `/api/students/${id}`, { cookie: adm, body: { ...novo, shortName: "Aluno T2" } });
  assert.equal(u.status, 200, JSON.stringify(u.json));
  assert.equal((u.json.student || u.json).shortName, "Aluno T2");
  const d = await api("DELETE", `/api/students/${id}`, { cookie: adm });
  assert.equal(d.status, 200);
  const g = await api("GET", `/api/students/${id}`, { cookie: adm });
  assert.equal(g.status, 404);
});

test("CT04/CT05 - Atendimento Rapido sem IA gera 3 atividades pelo motor de regras", async () => {
  const prof = await login("professora@escola.com");
  const r = await api("GET", "/api/activities?studentId=joao&goalCode=EI03EF01&theme=Animais", { cookie: prof });
  assert.equal(r.status, 200);
  assert.equal(r.json.source, "regras");
  assert.equal(r.json.activities.length, 3);
  for (const a of r.json.activities) {
    for (const campo of ["title", "resource", "method", "adaptation", "time", "supportLevel"]) {
      assert.ok(a[campo], `atividade sem o campo ${campo}`);
    }
  }
});

test("CT06 - o que e enviado a IA nao contem dados pessoais; falha da IA cai no motor de regras", async () => {
  // "Ollama falso": registra o corpo recebido e devolve um conteudo que nao e JSON
  const recebidos = [];
  const fake = http.createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      recebidos.push(b);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: { content: "isto nao e json" } }));
    });
  });
  await new Promise((r) => fake.listen(0, "127.0.0.1", r));
  const fakeUrl = `http://127.0.0.1:${fake.address().port}`;
  try {
    const adm = await login("coordenacao@escola.com");
    const cfg = await api("PUT", "/api/ai/settings", { cookie: adm, body: { provider: "ollama", ollamaBaseUrl: fakeUrl, ollamaModel: "modelo-teste" } });
    assert.equal(cfg.status, 200, JSON.stringify(cfg.json));
    const prof = await login("professora@escola.com");
    const r = await api("GET", "/api/activities?studentId=joao&goalCode=EI03EF01&theme=Animais", { cookie: prof });
    assert.equal(r.status, 200);
    assert.equal(r.json.source, "regras-fallback", "com a IA falhando, o motor de regras deve assumir");
    assert.equal(r.json.activities.length, 3);
    assert.ok(recebidos.length >= 1, "a IA deveria ter sido consultada");
    const tudo = recebidos.join("\n");
    for (const pessoal of ["João Miguel Alves", "14/05/2022", "Responsável cadastrado", "(00) 00000-0000", "Laudo e ficha"]) {
      assert.ok(!tudo.includes(pessoal), `dado pessoal enviado a IA: ${pessoal}`);
    }
  } finally {
    fake.close();
    const adm = await login("coordenacao@escola.com");
    await api("PUT", "/api/ai/settings", { cookie: adm, body: { provider: "" } });
  }
});

test("CT07 - atividade marcada como 'Não funcionou' deixa de ser sugerida", async () => {
  const prof = await login("professora@escola.com");
  const url = "/api/activities?studentId=mateus&goalCode=EI03EF01&theme=Cores";
  const antes = await api("GET", url, { cookie: prof });
  const alvo = antes.json.activities[0];
  const fb = await api("POST", "/api/feedbacks", {
    cookie: prof,
    body: { studentId: "mateus", theme: "Cores", activityTitle: alvo.title, result: "Não funcionou" }
  });
  assert.equal(fb.status, 201, JSON.stringify(fb.json));
  const depois = await api("GET", url, { cookie: prof });
  const titulos = depois.json.activities.map((a) => a.title);
  assert.ok(!titulos.includes(alvo.title), "a atividade que falhou voltou a ser sugerida");
});

test("CT08 - chave da OpenAI salva nao e devolvida pela API", async () => {
  const adm = await login("coordenacao@escola.com");
  const put = await api("PUT", "/api/ai/settings", { cookie: adm, body: { provider: "openai", openaiApiKey: "sk-teste-123" } });
  assert.equal(put.status, 200);
  const get = await api("GET", "/api/ai/settings", { cookie: adm });
  assert.equal(get.json.openaiKeySet, true);
  assert.ok(!JSON.stringify(get.json).includes("sk-teste-123"), "a chave vazou na resposta");
  await api("PUT", "/api/ai/settings", { cookie: adm, body: { provider: "openai", clearOpenaiKey: true } });
  await api("PUT", "/api/ai/settings", { cookie: adm, body: { provider: "" } });
});

test("CT09 - dados e sessao sobrevivem ao reinicio do servidor (SQLite)", async () => {
  const adm = await login("coordenacao@escola.com");
  const t = await api("POST", "/api/classes", { cookie: adm, body: { name: "Turma Persistente", level: "Jardim" } });
  assert.equal(t.status, 201, JSON.stringify(t.json));
  await stopServer();
  await startServer();
  const lista = await api("GET", "/api/classes", { cookie: adm });
  assert.equal(lista.status, 200, "a sessao deveria continuar valida apos o reinicio");
  assert.ok(lista.json.classes.some((c) => c.name === "Turma Persistente"));
});
