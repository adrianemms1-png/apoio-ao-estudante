// Popula data/db.json na primeira execucao (ou quando chamado com --force).
// Rodado automaticamente pelo server/index.js se o banco ainda nao existir,
// e tambem pode ser chamado manualmente: `npm run seed` ou `npm run reset-db`.
const fs = require("fs");
const config = require("../config");
const store = require("../store");
const bnccGoals = require("./bnccGoals");
const needsBase = require("./needsBase");
const demo = require("./demo");

function run({ force = false } = {}) {
  const alreadyExists = fs.existsSync(config.DB_PATH);
  if (alreadyExists && !force) {
    console.log("data/db.json já existe - nada foi alterado. Use --force para recriar do zero.");
    return;
  }

  if (alreadyExists && force) {
    fs.unlinkSync(config.DB_PATH);
  }

  store.load(); // cria o arquivo vazio
  store.replaceCollection("classes", demo.classes);
  store.replaceCollection("teachers", demo.teachers);
  store.replaceCollection("students", demo.students);
  store.replaceCollection("bnccGoals", bnccGoals);
  store.replaceCollection("needs", needsBase);
  store.replaceCollection("users", demo.buildUsers());

  console.log("Banco criado com sucesso em data/db.json");
  console.log("Contas de acesso iniciais:");
  console.log("  Professora  -> professora@escola.com   / 123456");
  console.log("  Coordenação -> coordenacao@escola.com  / 123456");
  console.log("Troque essas senhas assim que possível pela tela de Coordenação.");
}

if (require.main === module) {
  const force = process.argv.includes("--force");
  run({ force });
}

module.exports = { run };
