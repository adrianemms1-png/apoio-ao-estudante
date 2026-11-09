// CT10 - migracao automatica do data/db.json (versao 1.0) para o SQLite.
"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

test("CT10 - db.json da versao 1.0 e importado para o SQLite sem perda", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "apoio-mig-"));
  const legado = {
    users: [{ id: "u1", email: "a@b.c", passwordHash: "x", role: "admin", name: "Coord" }],
    classes: [{ id: "c1", name: "Jardim A", level: "Jardim" }],
    students: [{ id: "s1", shortName: "Ana", classId: "c1" }],
    bnccGoals: [{ code: "EI03EF01", level: "Jardim", text: "Objetivo" }],
    feedbacks: Array.from({ length: 50 }, (_, i) => ({ id: `f${i}`, studentId: "s1", result: "Funcionou bem" })),
    studentObservations: { s1: "observação com acentuação" },
    aiSettings: { provider: "ollama" }
  };
  fs.writeFileSync(path.join(dir, "db.json"), JSON.stringify(legado));
  const script = `
    const store = require(${JSON.stringify(path.join(__dirname, "../server/store.js"))});
    const d = store.load();
    console.log(JSON.stringify({ users: d.users.length, feedbacks: d.feedbacks.length, goals: d.bnccGoals.length,
      obs: d.studentObservations.s1, provider: d.aiSettings.provider }));`;
  const out = execFileSync(process.execPath, ["-e", script], { env: { ...process.env, DATA_DIR: dir, NODE_NO_WARNINGS: "1" } }).toString();
  const r = JSON.parse(out.trim().split("\n").pop());
  assert.deepEqual(r, { users: 1, feedbacks: 50, goals: 1, obs: "observação com acentuação", provider: "ollama" });
  assert.ok(fs.existsSync(path.join(dir, "apoio.db")));
  assert.ok(fs.existsSync(path.join(dir, "db.json.migrado")), "o arquivo antigo deve ser preservado como .migrado");
  assert.ok(!fs.existsSync(path.join(dir, "db.json")));
  fs.rmSync(dir, { recursive: true, force: true });
});
