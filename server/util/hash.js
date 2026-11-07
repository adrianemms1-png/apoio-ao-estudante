// Hash de senhas usando scrypt (nativo do modulo "crypto" do Node - sem dependencias externas).
const crypto = require("crypto");

const KEY_LENGTH = 64;

function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plainPassword, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

function verifyPassword(plainPassword, storedHash) {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hashHex] = storedHash.split(":");
  const derived = crypto.scryptSync(plainPassword, salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(hashHex, "hex");
  if (storedBuffer.length !== derived.length) return false;
  return crypto.timingSafeEqual(storedBuffer, derived);
}

module.exports = { hashPassword, verifyPassword };
