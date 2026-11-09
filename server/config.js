// Configuracao da aplicacao. Nao depende de nenhum pacote externo (dotenv "na mao"):
// se existir um arquivo .env na raiz do projeto, ele e lido e as chaves viram
// variaveis de ambiente (sem sobrescrever o que ja estiver definido no shell).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT_DIR = path.join(__dirname, "..");
const ENV_PATH = path.join(ROOT_DIR, ".env");

function loadDotEnv() {
  if (!fs.existsSync(ENV_PATH)) return;
  const raw = fs.readFileSync(ENV_PATH, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eq = trimmed.indexOf("=");
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

loadDotEnv();

// DATA_DIR pode ser trocado por variavel de ambiente (usado pelos testes automatizados).
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(ROOT_DIR, "data");
const DB_PATH = path.join(DATA_DIR, "apoio.db"); // banco SQLite (versao 1.1+)
const LEGACY_JSON_PATH = path.join(DATA_DIR, "db.json"); // formato da versao 1.0, importado automaticamente
const SECRET_PATH = path.join(DATA_DIR, ".session-secret");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getOrCreateSessionSecret() {
  ensureDataDir();
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  if (fs.existsSync(SECRET_PATH)) {
    return fs.readFileSync(SECRET_PATH, "utf8").trim();
  }
  const secret = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(SECRET_PATH, secret, { mode: 0o600 });
  return secret;
}

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  DB_PATH,
  LEGACY_JSON_PATH,
  PORT: Number(process.env.PORT) || 3000,
  HOST: process.env.HOST || "127.0.0.1",
  SESSION_SECRET: getOrCreateSessionSecret(),
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  // Qual provedor de IA usar no botao "Consultar IA" (base de deficiencias):
  // "ollama" (roda local, sem chave - precisa do Ollama instalado e aberto
  // nesta maquina) ou "openai" (precisa de OPENAI_API_KEY). Vazio = IA
  // desligada, botao mostra aviso explicando como ativar.
  AI_PROVIDER: (process.env.AI_PROVIDER || "").trim().toLowerCase(),
  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5:7b",
  ensureDataDir
};
