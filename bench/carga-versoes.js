'use strict';
// Teste de carga da API REAL do Apoio ao Estudante, comparando a versao 1.0
// (persistencia em db.json) com a versao 1.1 (SQLite), com o mesmo volume de dados.
//
// Uso:
//   node bench/carga-versoes.js <pasta-da-versao-1.0> [cenario]
//   cenario: P (1 escola), M (20 escolas) ou G (100 escolas). Padrao: M.
// A pasta da versao 1.0 e uma copia do projeto anterior a migracao (tag v1.0 do
// repositorio: git worktree add ../v1.0 v1.0). A versao 1.1 e a pasta atual.
//
// Para cada versao: gera a base, sobe o servidor, faz login como professora e
// dispara requisicoes concorrentes em duas rotas:
//   - GET  /api/activities (Atendimento Rapido pelo motor de regras: leitura)
//   - POST /api/feedbacks  (registro de feedback: escrita)
// Mede vazao, erros e latencia p50/p95/p99. Sem dependencias externas.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { gerarBase } = require('./gerar-base');

const SENHA = require('node:crypto').randomBytes(6).toString('hex'); // senha das contas da base gerada
const V10 = process.argv[2];
const CENARIO = (process.argv[3] || 'M').toUpperCase();
const V11 = path.join(__dirname, '..');
if (!V10 || !fs.existsSync(path.join(V10, 'server', 'index.js'))) {
  console.error('Informe a pasta da versao 1.0. Ex.: node bench/carga-versoes.js ../v1.0 M');
  process.exit(1);
}
const RODADAS = [
  { rota: 'GET /api/activities', metodo: 'GET', url: '/api/activities?studentId=joao&goalCode=EI03EF01&theme=Animais', concorrencia: 10, total: 500 },
  { rota: 'GET /api/activities', metodo: 'GET', url: '/api/activities?studentId=joao&goalCode=EI03EF01&theme=Animais', concorrencia: 50, total: 1000 },
  { rota: 'POST /api/feedbacks', metodo: 'POST', url: '/api/feedbacks', concorrencia: 10, total: 500 },
  { rota: 'POST /api/feedbacks', metodo: 'POST', url: '/api/feedbacks', concorrencia: 50, total: 1000 },
];
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))]; };

function prepararPasta(versao, origem) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `apoio-${versao}-`));
  fs.cpSync(path.join(origem, 'server'), path.join(dir, 'server'), { recursive: true });
  fs.cpSync(path.join(origem, 'public'), path.join(dir, 'public'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'data'));
  fs.writeFileSync(path.join(dir, 'data', 'db.json'), JSON.stringify(gerarBase(CENARIO, SENHA), null, 2));
  return dir;
}

function subir(dir, porta) {
  return new Promise((resolve, reject) => {
    const env = { ...process.env, PORT: String(porta), NODE_NO_WARNINGS: '1', AI_PROVIDER: '', DATA_DIR: path.join(dir, 'data') };
    const p = spawn(process.execPath, [path.join(dir, 'server', 'index.js')], { env, cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => { out += d; if (out.includes('rodando localmente')) resolve(p); });
    p.stderr.on('data', d => { out += d; });
    p.on('exit', c => reject(new Error(out)));
  });
}

async function carga(base, cookie, r) {
  const lat = []; let erros = 0, enviados = 0;
  const t0 = performance.now();
  async function trabalhador() {
    while (enviados < r.total) {
      const i = enviados++;
      const body = r.metodo === 'POST'
        ? JSON.stringify({ studentId: 'joao', theme: 'Carga', activityTitle: `Atividade de carga ${i}`, result: 'Funcionou bem' })
        : undefined;
      const t = performance.now();
      try {
        const res = await fetch(base + r.url, { method: r.metodo, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body });
        await res.arrayBuffer();
        if (!res.ok) erros++;
      } catch { erros++; }
      lat.push(performance.now() - t);
    }
  }
  await Promise.all(Array.from({ length: r.concorrencia }, trabalhador));
  const dur = (performance.now() - t0) / 1000;
  return { rota: r.rota, usuarios: r.concorrencia, requisicoes: r.total, erros,
    vazao: +(r.total / dur).toFixed(1), p50: +pct(lat, 50).toFixed(1), p95: +pct(lat, 95).toFixed(1), p99: +pct(lat, 99).toFixed(1) };
}

(async () => {
  const saida = { cenario: CENARIO, ambiente: `${os.cpus()[0].model.trim()} | ${os.cpus().length} núcleos | ${(os.totalmem() / 2 ** 30).toFixed(1)} GB | Node ${process.version} | ${os.platform()}`, resultados: [] };
  console.log(saida.ambiente, '| cenário', CENARIO);
  let porta = 3700;
  for (const [versao, origem] of [['1.0 (JSON)', V10], ['1.1 (SQLite)', V11]]) {
    const dir = prepararPasta(versao.split(' ')[0], origem);
    const srv = await subir(dir, ++porta);
    const base = `http://127.0.0.1:${porta}`;
    const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'professora@escola.com', password: SENHA }) });
    const cookie = login.headers.get('set-cookie').split(';')[0];
    for (const r of RODADAS) {
      const res = { versao, ...(await carga(base, cookie, r)) };
      saida.resultados.push(res);
      console.log(JSON.stringify(res));
    }
    srv.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(__dirname, 'resultados'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'resultados', `carga-${CENARIO}.local.json`), JSON.stringify(saida, null, 2));
})();
