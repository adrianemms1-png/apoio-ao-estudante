const store = require("../store");
const { sendJson } = require("../router");
const { requireAuth } = require("../middleware/auth");

function register(router) {
  router.get("/api/bncc-goals", requireAuth, (req, res) => {
    const { level } = req.query;
    let goals = store.getAll("bnccGoals");
    if (level) goals = goals.filter((goal) => goal.level === level);
    sendJson(res, 200, { goals });
  });
}

module.exports = { register };
