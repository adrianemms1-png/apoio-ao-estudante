// Popula o banco SQLite (data/apoio.db) na primeira execucao (ou quando
// chamado com --force). Rodado automaticamente pelo server/index.js se o banco
// estiver vazio, e tambem pode ser chamado manualmente: `npm run seed` ou
// `npm run reset-db`.
const store = require("../store");
const bnccGoals = require("./bnccGoals");
const needsBase = require("./needsBase");
const demo = require("./demo");

function run({ force = false } = {}) {
  store.load(); // abre (ou cria) o banco; importa data/db.json antigo, se houver
  if (!store.isEmpty() && !force) {
    console.log("O banco data/apoio.db já tem dados - nada foi alterado. Use --force para recriar do zero.");
    return;
  }
  if (force) store.reset();

  store.replaceCollection("classes", demo.classes);
  store.replaceCollection("teachers", demo.teachers);
  store.replaceCollection("students", demo.students);
  store.replaceCollection("bnccGoals", bnccGoals);
  store.replaceCollection("needs", needsBase);
  store.replaceCollection("users", demo.buildUsers());

  console.log("Banco criado com sucesso em data/apoio.db");
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
