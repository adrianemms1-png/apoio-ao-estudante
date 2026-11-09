// Camada de persistencia local em SQLite (modulo nativo node:sqlite).
//
// Historico: a versao 1.0 guardava tudo em um unico arquivo data/db.json,
// regravado inteiro a cada alteracao. Isso foi escolhido porque o ambiente de
// desenvolvimento nao tinha acesso ao npm para instalar um driver de banco.
// Os testes de desempenho e de integridade (pasta bench/ e Capitulo 5 do TCC)
// mostraram os limites dessa escolha: o custo de cada gravacao cresce com o
// tamanho da base inteira e, com mais de um processo gravando ao mesmo tempo,
// registros se perdem. A partir da versao 1.1 a persistencia usa o SQLite que
// ja vem embutido no Node.js (>= 22.13), entao o projeto continua SEM
// dependencias externas e sem "npm install".
//
// Desenho:
// - cada colecao vira uma tabela com chave (id), o registro em JSON (data) e
//   colunas geradas e indexadas para as chaves estrangeiras mais consultadas
//   (ex.: feedbacks.student_id), o que deixa as buscas por aluno indexadas;
// - os "mapas" (observacoes, configuracao da IA) ficam na tabela kv;
// - toda escrita e uma transacao no banco (atomica e duravel, modo WAL);
// - as leituras continuam sendo servidas por um cache em memoria, carregado
//   uma vez na inicializacao, para manter a mesma interface sincrona usada
//   pelas rotas (getAll/getById/insert/update/remove/...).
//
// Se existir um data/db.json da versao anterior e ainda nao existir o banco,
// os dados sao importados automaticamente na primeira execucao e o arquivo
// antigo e renomeado para data/db.json.migrado (nada e apagado).
const fs = require("fs");
const config = require("./config");
const { makeId } = require("./util/id");

let DatabaseSync;
try {
  ({ DatabaseSync } = require("node:sqlite"));
} catch (error) {
  console.error(
    `\n[ERRO] Esta versao do Node.js (${process.version}) nao tem o modulo node:sqlite.\n` +
      "Instale o Node.js LTS mais recente (22.13 ou superior) em https://nodejs.org e tente de novo.\n"
  );
  process.exit(1);
}

const COLLECTIONS = [
  "users",
  "teachers",
  "classes",
  "students",
  "bnccGoals",
  "needs",
  "feedbacks",
  "assignments",
  "auditLog"
];
const MAPS = ["needObservations", "studentObservations", "aiSettings"];

// Colunas derivadas do JSON e indexadas, por colecao: [nomeColuna, caminhoJson]
const INDEXED = {
  users: [["email", "$.email"], ["teacher_id", "$.teacherId"]],
  students: [["class_id", "$.classId"], ["need_id", "$.needId"]],
  bnccGoals: [["code", "$.code"], ["level", "$.level"]],
  feedbacks: [["student_id", "$.studentId"], ["assignment_id", "$.assignmentId"]],
  assignments: [["student_id", "$.studentId"], ["class_id", "$.classId"]],
  auditLog: [["at", "$.at"]]
};

const tableName = (collection) => `c_${collection.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase())}`;

let db = null;
let cache = null;
const stmts = {};

function open() {
  if (db) return db;
  config.ensureDataDir();
  const isNew = !fs.existsSync(config.DB_PATH);
  db = new DatabaseSync(config.DB_PATH);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  createSchema();
  if (isNew && fs.existsSync(config.LEGACY_JSON_PATH)) {
    migrateFromJson();
  }
  return db;
}

function createSchema() {
  let sql = "";
  for (const collection of COLLECTIONS) {
    const table = tableName(collection);
    const generated = (INDEXED[collection] || [])
      .map(([column, jsonPath]) => `,
  ${column} TEXT GENERATED ALWAYS AS (json_extract(data, '${jsonPath}')) VIRTUAL`)
      .join("");
    sql += `CREATE TABLE IF NOT EXISTS ${table} (
  rid  INTEGER PRIMARY KEY,
  id   TEXT UNIQUE,
  data TEXT NOT NULL CHECK (json_valid(data))${generated}
);\n`;
    for (const [column] of INDEXED[collection] || []) {
      sql += `CREATE INDEX IF NOT EXISTS idx_${table}_${column} ON ${table}(${column});\n`;
    }
  }
  sql += `CREATE TABLE IF NOT EXISTS kv (
  map   TEXT NOT NULL,
  key   TEXT NOT NULL,
  value TEXT NOT NULL CHECK (json_valid(value)),
  PRIMARY KEY (map, key)
);
  CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', '1');`;
  db.exec(sql);
}

function stmt(sql) {
  if (!stmts[sql]) stmts[sql] = db.prepare(sql);
  return stmts[sql];
}

function transaction(fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function writeRow(collection, record) {
  stmt(`INSERT INTO ${tableName(collection)} (id, data) VALUES (?, ?)`).run(record.id ?? null, JSON.stringify(record));
}

function migrateFromJson() {
  const raw = fs.readFileSync(config.LEGACY_JSON_PATH, "utf8");
  const legacy = JSON.parse(raw);
  transaction(() => {
    for (const collection of COLLECTIONS) {
      for (const record of legacy[collection] || []) writeRow(collection, record);
    }
    for (const map of MAPS) {
      for (const [key, value] of Object.entries(legacy[map] || {})) {
        stmt("INSERT OR REPLACE INTO kv (map, key, value) VALUES (?, ?, ?)").run(map, key, JSON.stringify(value));
      }
    }
  });
  const backup = `${config.LEGACY_JSON_PATH}.migrado`;
  fs.renameSync(config.LEGACY_JSON_PATH, backup);
  console.log(`Dados da versao anterior importados de data/db.json para o SQLite (copia mantida em ${backup}).`);
}

function emptyDb() {
  const empty = {};
  for (const collection of COLLECTIONS) empty[collection] = [];
  for (const map of MAPS) empty[map] = {};
  return empty;
}

function load() {
  if (cache) return cache;
  open();
  cache = emptyDb();
  for (const collection of COLLECTIONS) {
    cache[collection] = stmt(`SELECT data FROM ${tableName(collection)} ORDER BY rid`)
      .all()
      .map((row) => JSON.parse(row.data));
  }
  for (const row of stmt("SELECT map, key, value FROM kv").all()) {
    if (cache[row.map]) cache[row.map][row.key] = JSON.parse(row.value);
  }
  return cache;
}

// Mantida por compatibilidade: rotas que alteram um mapa diretamente (ex.:
// apagar a observacao de um aluno removido) chamam persist() em seguida.
// Aqui ela sincroniza os mapas com o banco em uma unica transacao.
function persist() {
  const data = load();
  transaction(() => {
    for (const map of MAPS) {
      stmt("DELETE FROM kv WHERE map = ?").run(map);
      for (const [key, value] of Object.entries(data[map] || {})) {
        stmt("INSERT INTO kv (map, key, value) VALUES (?, ?, ?)").run(map, key, JSON.stringify(value));
      }
    }
  });
}

function getAll(collection) {
  return load()[collection];
}

function getById(collection, id) {
  return load()[collection].find((item) => item.id === id) || null;
}

function insert(collection, record) {
  const data = load();
  const withId = { id: record.id || makeId(collection.slice(0, 3)), ...record };
  transaction(() => writeRow(collection, withId));
  data[collection].push(withId);
  return withId;
}

function update(collection, id, patch) {
  const data = load();
  const index = data[collection].findIndex((item) => item.id === id);
  if (index === -1) return null;
  const updated = { ...data[collection][index], ...patch, id };
  transaction(() => stmt(`UPDATE ${tableName(collection)} SET data = ? WHERE id = ?`).run(JSON.stringify(updated), id));
  data[collection][index] = updated;
  return updated;
}

function remove(collection, id) {
  const data = load();
  const before = data[collection].length;
  transaction(() => stmt(`DELETE FROM ${tableName(collection)} WHERE id = ?`).run(id));
  data[collection] = data[collection].filter((item) => item.id !== id);
  return data[collection].length < before;
}

function replaceCollection(collection, records) {
  const data = load();
  transaction(() => {
    stmt(`DELETE FROM ${tableName(collection)}`).run();
    for (const record of records) writeRow(collection, record);
  });
  data[collection] = records;
}

function getMap(mapName) {
  return load()[mapName];
}

function setMapValue(mapName, key, value) {
  const data = load();
  transaction(() =>
    stmt("INSERT INTO kv (map, key, value) VALUES (?, ?, ?) ON CONFLICT(map, key) DO UPDATE SET value = excluded.value").run(
      mapName,
      key,
      JSON.stringify(value)
    )
  );
  data[mapName][key] = value;
  return data[mapName];
}

function isEmpty() {
  return load().users.length === 0;
}

// Apaga todos os dados (usado por "npm run reset-db").
function reset() {
  open();
  transaction(() => {
    for (const collection of COLLECTIONS) stmt(`DELETE FROM ${tableName(collection)}`).run();
    stmt("DELETE FROM kv").run();
    stmt("DELETE FROM sessions").run();
  });
  cache = null;
  load();
}

// --- Sessoes de login (antes ficavam so em memoria e caiam a cada reinicio) ---
const sessions = {
  create(id, userId, expiresAt) {
    open();
    stmt("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(id, userId, expiresAt);
  },
  get(id) {
    open();
    return stmt("SELECT id, user_id AS userId, expires_at AS expiresAt FROM sessions WHERE id = ?").get(id) || null;
  },
  touch(id, expiresAt) {
    open();
    stmt("UPDATE sessions SET expires_at = ? WHERE id = ?").run(expiresAt, id);
  },
  destroy(id) {
    open();
    stmt("DELETE FROM sessions WHERE id = ?").run(id);
  },
  purgeExpired(now) {
    open();
    stmt("DELETE FROM sessions WHERE expires_at < ?").run(now);
  }
};

function close() {
  if (db) db.close();
  db = null;
  cache = null;
  for (const key of Object.keys(stmts)) delete stmts[key];
}

module.exports = {
  load,
  persist,
  getAll,
  getById,
  insert,
  update,
  remove,
  replaceCollection,
  getMap,
  setMapValue,
  isEmpty,
  reset,
  close,
  sessions,
  COLLECTIONS,
  MAPS
};
