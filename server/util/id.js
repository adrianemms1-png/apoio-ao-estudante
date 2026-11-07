const crypto = require("crypto");

function makeId(prefix) {
  const random = crypto.randomBytes(4).toString("hex");
  return prefix ? `${prefix}-${Date.now().toString(36)}${random}` : `${Date.now().toString(36)}${random}`;
}

module.exports = { makeId };
