// Camada de persistencia local. Guarda tudo em data/db.json.
//
// Por que um arquivo JSON e nao um banco "de verdade" (SQLite/Postgres)?
// Este projeto foi montado num ambiente sandbox sem acesso a internet para
// baixar pacotes do npm (nem mesmo o driver de SQLite). Para nao deixar o
// produto dependente de "npm install" (e do usuario ter que resolver
// eventuais problemas de rede/compilacao nativa so para rodar localmente),
// a base de dados foi implementada com Node puro. Todas as escritas usam
// fs.*Sync dentro do mesmo tick, o que evita condicoes de corrida (o Node e
// single-threaded: uma chamada sincrona bloqueia o event loop ate terminar,
// entao duas requisicoes nunca conseguem intercalar leitura+escrita aqui).
//
// Quando o projeto crescer (mais de uma escola, varios processos, acesso
// simultaneo pesado), o caminho natural e trocar este arquivo por um driver
// de banco real (ex: better-sqlite3 ou Postgres) mantendo a mesma interface
// (getAll/getById/insert/update/remove) - o resto da aplicacao nao precisa
// mudar. Veja o README para o passo a passo dessa migracao.
const fs = require("fs");
const config = require("./config");
const { makeId } = require("./util/id");

function emptyDb() {
  return {
    users: [],
    teachers: [],
    classes: [],
    students: [],
    bnccGoals: [],
    needs: [],
    needObservations: {},
    studentObservations: {},
    feedbacks: [],
    assignments: [],
    auditLog: [],
    aiSettings: {}
  };
}

let cache = null;

function load() {
  if (cache) return cache;
  config.ensureDataDir();
  if (!fs.existsSync(config.DB_PATH)) {
    cache = emptyDb();
    persist();
    return cache;
  }
  const raw = fs.readFileSync(config.DB_PATH, "utf8");
  try {
    cache = { ...emptyDb(), ...JSON.parse(raw) };
  } catch (error) {
    throw new Error(
      `Nao foi possivel ler data/db.json (${error.message}). Se o arquivo estiver corrompido, apague-o e rode "npm run seed" novamente.`
    );
  }
  return cache;
}

function persist() {
  config.ensureDataDir();
  const tmpPath = `${config.DB_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(cache, null, 2), "utf8");
  fs.renameSync(tmpPath, config.DB_PATH);
}

function getAll(collection) {
  return load()[collection];
}

function getById(collection, id) {
  return load()[collection].find((item) => item.id === id) || null;
}

function insert(collection, record) {
  const db = load();
  const withId = { id: record.id || makeId(collection.slice(0, 3)), ...record };
  db[collection].push(withId);
  persist();
  return withId;
}

function update(collection, id, patch) {
  const db = load();
  const index = db[collection].findIndex((item) => item.id === id);
  if (index === -1) return null;
  db[collection][index] = { ...db[collection][index], ...patch, id };
  persist();
  return db[collection][index];
}

function remove(collection, id) {
  const db = load();
  const before = db[collection].length;
  db[collection] = db[collection].filter((item) => item.id !== id);
  persist();
  return db[collection].length < before;
}

function replaceCollection(collection, records) {
  const db = load();
  db[collection] = records;
  persist();
}

function getMap(mapName) {
  return load()[mapName];
}

function setMapValue(mapName, key, value) {
  const db = load();
  db[mapName][key] = value;
  persist();
  return db[mapName];
}

function isEmpty() {
  const db = load();
  return db.users.length === 0;
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
  isEmpty
};
