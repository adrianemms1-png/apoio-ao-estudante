'use strict';
// Teste de integridade sob escrita concorrente: 4 processos inserem 250 feedbacks cada.
// JSON (ler-modificar-regravar) x SQLite (transações com busy_timeout). Uso: node bench/integridade-concorrencia.js
const { fork } = require('node:child_process');
const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
const PROCS = 4, POR_PROC = 250;
if (process.argv[2] === 'filho') {
  const [modo, arq, idp] = process.argv.slice(3);
  if (modo === 'json') {
    let leiturasInvalidas = 0;
    for (let i = 0; i < POR_PROC; i++) {
      let db;
      for (let t = 0; ; t++) { try { db = JSON.parse(fs.readFileSync(arq, 'utf8')); break; } catch { leiturasInvalidas++; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 2); if (t > 500) { db = { feedbacks: [] }; break; } } } // arquivo lido no meio de uma gravação
      db.feedbacks.push({ id: `p${idp}-${i}` });
      fs.writeFileSync(arq, JSON.stringify(db));
    }
    fs.appendFileSync(arq + '.invalidas', leiturasInvalidas + '\n');
  } else {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(arq); db.exec('PRAGMA busy_timeout=5000');
    const ins = db.prepare('INSERT INTO feedback(id) VALUES (?)');
    for (let i = 0; i < POR_PROC; i++) ins.run(`p${idp}-${i}`);
    db.close();
  }
  process.exit(0);
}
async function rodar(modo) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'conc-'));
  const arq = path.join(dir, modo === 'json' ? 'db.json' : 'db.sqlite');
  if (modo === 'json') fs.writeFileSync(arq, JSON.stringify({ feedbacks: [] }));
  else { const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(arq); d.exec('PRAGMA journal_mode=WAL; CREATE TABLE feedback(id TEXT PRIMARY KEY)'); d.close(); }
  await Promise.all(Array.from({ length: PROCS }, (_, k) => new Promise(r => fork(__filename, ['filho', modo, arq, String(k)], { env: { ...process.env, NODE_NO_WARNINGS: '1' } }).on('exit', r))));
  let total, corrompido = false, leiturasInvalidas = 0;
  if (modo === 'json') { try { total = JSON.parse(fs.readFileSync(arq, 'utf8')).feedbacks.length; } catch { corrompido = true; total = 0; }
    leiturasInvalidas = fs.readFileSync(arq + '.invalidas', 'utf8').trim().split('\n').reduce((a, b) => a + Number(b), 0); }
  else { const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(arq); total = d.prepare('SELECT count(*) n FROM feedback').get().n; d.close(); }
  fs.rmSync(dir, { recursive: true, force: true });
  return { modo, esperado: PROCS * POR_PROC, gravado: total, perdidos: PROCS * POR_PROC - total, leiturasInvalidas, corrompido };
}
(async () => { const r = []; for (let k = 0; k < 3; k++) { r.push(await rodar('json')); r.push(await rodar('sqlite')); } console.table(r); fs.writeFileSync('resultado-concorrencia.json', JSON.stringify(r, null, 2)); })();
