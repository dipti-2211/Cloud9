const Alert = require("../models/Alert");
const jwt = require("jsonwebtoken");

const getAlerts = async (req, res) => {
    try {
        const filter = {};
        if (req.query.acknowledged === "false") {
            filter.acknowledged = false;
        } else if (req.query.acknowledged === "true") {
            filter.acknowledged = true;
        }

        const alerts = await Alert.find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        res.status(200).json({
            success: true,
            alerts,
            total: alerts.length,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

const acknowledgeAlert = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        let userId = "User";
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded?.userId || decoded?.id || userId;
            } catch {}
        }

        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date() },
            { new: true }
        );

        if (!alert) {
            return res.status(404).json({ success: false, message: "Alert not found" });
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("alert_acknowledged", { id: alert._id?.toString(), acknowledgedAt: alert.acknowledgedAt });
            io.to("dashboard").emit("alert_acknowledged", { id: alert._id?.toString(), acknowledgedAt: alert.acknowledgedAt });
        }

        res.status(200).json({ success: true, alert });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const acknowledgeAllAlerts = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        let userId = "User";
        if (authHeader && authHeader.startsWith("Bearer ")) {
            try {
                const token = authHeader.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userId = decoded?.userId || decoded?.id || userId;
            } catch {}
        }

        const now = new Date();
        const filter = { acknowledged: false };
        if (req.body?.ids && Array.isArray(req.body.ids) && req.body.ids.length > 0) {
            filter._id = { $in: req.body.ids };
        }

        const result = await Alert.updateMany(
            filter,
            { acknowledged: true, acknowledgedBy: userId, acknowledgedAt: now }
        );

        const io = req.app.get("io");
        if (io) {
            io.emit("alerts_acknowledged_bulk", { count: result.modifiedCount, acknowledgedAt: now });
            io.to("dashboard").emit("alerts_acknowledged_bulk", { count: result.modifiedCount, acknowledgedAt: now });
        }

        res.status(200).json({ success: true, count: result.modifiedCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAlerts,
    acknowledgeAlert,
    acknowledgeAllAlerts,
};