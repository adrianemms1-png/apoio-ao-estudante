'use strict';
// Benchmark de persistência: arquivo JSON (regravação integral) x SQLite (node:sqlite)
// Uso: node bench/persistencia-json-vs-sqlite.js   (Node.js >= 22.13; sem dependências externas)
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { performance } = require('node:perf_hooks');

const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-'));
const CENARIOS = [
  { nome: 'P (1 escola)', escolas: 1, alunos: 200, feedbacks: 2000 },
  { nome: 'M (20 escolas)', escolas: 20, alunos: 4000, feedbacks: 40000 },
  { nome: 'G (100 escolas)', escolas: 100, alunos: 20000, feedbacks: 200000 },
];
const REPETICOES = 100;
const BARREIRAS = ['comunicacao', 'atencao', 'interacao', 'motricidade', 'rotina', 'sensorial', 'participacao'];

function pct(arr, p) { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; }
function gerar(c) {
  const turmas = [], alunos = [], feedbacks = [];
  for (let t = 0; t < c.escolas * 10; t++) turmas.push({ id: 't' + t, nome: 'Turma ' + t, etapa: t % 2 ? 'Pré I' : 'Jardim', escola: 'e' + (t % c.escolas) });
  for (let a = 0; a < c.alunos; a++) alunos.push({
    id: 'a' + a, turmaId: 't' + (a % turmas.length), apelido: 'Aluno ' + a,
    perfil: { barreiras: [BARREIRAS[a % 7], BARREIRAS[(a + 3) % 7]], pontosFortes: 'Gosta de música e de histórias com imagens', cuidados: 'Evitar ruídos intensos; antecipar transições' },
    dadosPessoais: { nascimento: '2021-03-0' + (a % 9 + 1), responsavel: 'Responsável ' + a, telefone: '(49) 90000-0000' },
  });
  for (let f = 0; f < c.feedbacks; f++) feedbacks.push({ id: 'f' + f, alunoId: 'a' + (f % c.alunos), atividade: 'Atividade sensorial com caixa de texturas número ' + f, resultado: f % 4 ? 'funcionou' : 'nao_funcionou', data: '2026-10-' + String(f % 28 + 1).padStart(2, '0') });
  return { turmas, alunos, feedbacks, configuracoes: { aiProvider: 'ollama' } };
}

function benchJSON(dados) {
  const arq = path.join(OUT, 'db.json');
  fs.writeFileSync(arq, JSON.stringify(dados, null, 2));
  const tam = fs.statSync(arq).size;
  // carga inicial
  const cargas = [];
  let db;
  for (let i = 0; i < 10; i++) { const t0 = performance.now(); db = JSON.parse(fs.readFileSync(arq, 'utf8')); cargas.push(performance.now() - t0); }
  // consulta: feedbacks de um aluno (filtro em memória)
  const cons = [];
  for (let i = 0; i < REPETICOES; i++) { const id = 'a' + (i * 7 % dados.alunos.length); const t0 = performance.now(); db.feedbacks.filter(f => f.alunoId === id); cons.push(performance.now() - t0); }
  // gravação: inserir 1 feedback = regravar o arquivo inteiro
  const grav = [];
  for (let i = 0; i < REPETICOES; i++) {
    const t0 = performance.now();
    db.feedbacks.push({ id: 'n' + i, alunoId: 'a1', atividade: 'Nova', resultado: 'funcionou', data: '2026-11-09' });
    const tmp = arq + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 2)); fs.renameSync(tmp, arq);
    grav.push(performance.now() - t0);
  }
  return { tam, carga: pct(cargas, 50), consP50: pct(cons, 50), consP95: pct(cons, 95), gravP50: pct(grav, 50), gravP95: pct(grav, 95) };
}

function benchSQLite(dados) {
  const arq = path.join(OUT, 'db.sqlite');
  for (const ext of ['', '-wal', '-shm']) fs.rmSync(arq + ext, { force: true });
  const db = new DatabaseSync(arq);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;
    CREATE TABLE turma(id TEXT PRIMARY KEY, nome TEXT NOT NULL, etapa TEXT NOT NULL, escola TEXT NOT NULL);
    CREATE TABLE aluno(id TEXT PRIMARY KEY, turma_id TEXT NOT NULL REFERENCES turma(id), apelido TEXT NOT NULL);
    CREATE TABLE perfil_pedagogico(aluno_id TEXT PRIMARY KEY REFERENCES aluno(id), barreiras TEXT NOT NULL, pontos_fortes TEXT, cuidados TEXT);
    CREATE TABLE dados_pessoais(aluno_id TEXT PRIMARY KEY REFERENCES aluno(id), nascimento TEXT, responsavel TEXT, telefone TEXT);
    CREATE TABLE feedback(id TEXT PRIMARY KEY, aluno_id TEXT NOT NULL REFERENCES aluno(id), atividade TEXT NOT NULL, resultado TEXT NOT NULL CHECK(resultado IN ('funcionou','nao_funcionou')), data TEXT NOT NULL);
    CREATE INDEX idx_feedback_aluno ON feedback(aluno_id);`);
  const insT = db.prepare('INSERT INTO turma VALUES (?,?,?,?)');
  const insA = db.prepare('INSERT INTO aluno VALUES (?,?,?)');
  const insP = db.prepare('INSERT INTO perfil_pedagogico VALUES (?,?,?,?)');
  const insD = db.prepare('INSERT INTO dados_pessoais VALUES (?,?,?,?)');
  const insF = db.prepare('INSERT INTO feedback VALUES (?,?,?,?,?)');
  db.exec('BEGIN');
  for (const t of dados.turmas) insT.run(t.id, t.nome, t.etapa, t.escola);
  for (const a of dados.alunos) { insA.run(a.id, a.turmaId, a.apelido); insP.run(a.id, JSON.stringify(a.perfil.barreiras), a.perfil.pontosFortes, a.perfil.cuidados); insD.run(a.id, a.dadosPessoais.nascimento, a.dadosPessoais.responsavel, a.dadosPessoais.telefone); }
  for (const f of dados.feedbacks) insF.run(f.id, f.alunoId, f.atividade, f.resultado, f.data);
  db.exec('COMMIT');
  db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  db.close();
  const tam = fs.statSync(arq).size;
  const cargas = []; let con;
  for (let i = 0; i < 10; i++) { const t0 = performance.now(); con = new DatabaseSync(arq); con.prepare('SELECT 1 FROM aluno LIMIT 1').get(); cargas.push(performance.now() - t0); if (i < 9) con.close(); }
  const q = con.prepare('SELECT * FROM feedback WHERE aluno_id = ?');
  const cons = [];
  for (let i = 0; i < REPETICOES; i++) { const id = 'a' + (i * 7 % dados.alunos.length); const t0 = performance.now(); q.all(id); cons.push(performance.now() - t0); }
  const ins = con.prepare('INSERT INTO feedback VALUES (?,?,?,?,?)');
  const grav = [];
  for (let i = 0; i < REPETICOES; i++) { const t0 = performance.now(); ins.run('n' + i, 'a1', 'Nova', 'funcionou', '2026-11-09'); grav.push(performance.now() - t0); }
  con.close();
  return { tam, carga: pct(cargas, 50), consP50: pct(cons, 50), consP95: pct(cons, 95), gravP50: pct(grav, 50), gravP95: pct(grav, 95) };
}

const f = n => n < 1 ? n.toFixed(3) : n < 10 ? n.toFixed(2) : n.toFixed(1);
const resultados = [];
console.log(`Ambiente: ${os.cpus()[0].model} | ${os.cpus().length} núcleos | ${(os.totalmem() / 2 ** 30).toFixed(1)} GB RAM | Node ${process.version} | ${os.platform()}`);
for (const c of CENARIOS) {
  const dados = gerar(c);
  const j = benchJSON(dados), s = benchSQLite(dados);
  resultados.push({ cenario: c.nome, json: j, sqlite: s });
  console.log(`\n${c.nome}: ${c.alunos} alunos, ${c.feedbacks} feedbacks`);
  for (const [nome, r] of [['JSON  ', j], ['SQLite', s]])
    console.log(`  ${nome} tamanho=${(r.tam / 2 ** 20).toFixed(2)} MB | carga=${f(r.carga)} ms | consulta p50=${f(r.consP50)} p95=${f(r.consP95)} ms | gravação p50=${f(r.gravP50)} p95=${f(r.gravP95)} ms`);
}
fs.writeFileSync('resultado-persistencia.json', JSON.stringify(resultados, null, 2));
fs.rmSync(OUT, { recursive: true, force: true });
