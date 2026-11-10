// Popula o banco SQLite (data/apoio.db) na primeira execucao (ou quando
// chamado com --force). Rodado automaticamente pelo server/index.js se o banco
// estiver vazio, e tambem pode ser chamado manualmente: `npm run seed` ou
// `npm run reset-db`.
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const store = require("../store");
const { DATA_DIR } = require("../config");
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
  // Senha inicial: SENHA_INICIAL (arquivo .env) ou uma senha aleatoria
  // gerada agora. Ela e mostrada no terminal e guardada em
  // data/senha-inicial.txt (fora do Git) para nao se perder.
  const senha = process.env.SENHA_INICIAL || crypto.randomBytes(6).toString("base64url");
  store.replaceCollection("users", demo.buildUsers(senha));
  const arquivoSenha = path.join(DATA_DIR, "senha-inicial.txt");
  fs.writeFileSync(arquivoSenha,
    `Contas de acesso iniciais do Apoio ao Estudante\r\n` +
    `Professora:  professora@escola.com   senha: ${senha}\r\n` +
    `Coordenacao: coordenacao@escola.com  senha: ${senha}\r\n` +
    `Troque as senhas na tela Coordenacao > Professoras > Redefinir senha e depois apague este arquivo.\r\n`,
    { mode: 0o600 });

  console.log("Banco criado com sucesso em data/apoio.db");
  console.log("Contas de acesso iniciais:");
  console.log(`  Professora  -> professora@escola.com   / ${senha}`);
  console.log(`  Coordenação -> coordenacao@escola.com  / ${senha}`);
  console.log(`(senha também guardada em ${arquivoSenha})`);
  console.log("Troque essas senhas assim que possível pela tela de Coordenação.");
}

if (require.main === module) {
  const force = process.argv.includes("--force");
  run({ force });
}

module.exports = { run };
