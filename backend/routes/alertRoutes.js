const express = require("express");
const {
    getAlerts,
    acknowledgeAlert,
    acknowledgeAllAlerts,
} = require("../controllers/alertController");

const router = express.Router();

router.get("/", getAlerts);
router.post("/acknowledge-all", acknowledgeAllAlerts);
router.patch("/:id/acknowledge", acknowledgeAlert);
router.post("/:id/acknowledge", acknowledgeAlert);

module.exports = router;