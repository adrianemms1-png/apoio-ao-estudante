const { sendJson } = require("../router");
const { requireAuth } = require("../middleware/auth");
const { STRENGTH_TAGS, CAUTION_TAGS } = require("../seedData/tags");

function register(router) {
  // Vocabulario fixo para os campos "pontos fortes" e "cuidados" do cadastro
  // de aluno - ver server/seedData/tags.js para o porque desses valores serem
  // fechados (e nao texto livre).
  router.get("/api/tags", requireAuth, (req, res) => {
    sendJson(res, 200, { strengthTags: STRENGTH_TAGS, cautionTags: CAUTION_TAGS });
  });
}

module.exports = { register };
