const Road = require("../models/Road");
const RoadSegment = require("../models/RoadSegment");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Helper to get authenticated user info
const getAuthUser = async (req) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id) {
            const user = await User.findById(decoded.id).select("firstName lastName userId role");
            return user;
        }
        return decoded;
    } catch {
        return null;
    }
};

// =========================
// GET ALL ROADS
// =========================
const getAllRoads = async (req, res) => {
    try {
        const roads = await Road.find({ status: { $ne: "REMOVED" } });

        res.status(200).json({
            success: true,
            data: roads
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =========================
// GET ROAD BY ID
// =========================
const getRoadById = async (req, res) => {
    try {
        const road = await Road.findOne({ _id: req.params.id, status: { $ne: "REMOVED" } });

        if (!road) {
            return res.status(404).json({
                success: false,
                message: "Road not found"
            });
        }

        res.status(200).json({
            success: true,
            data: road
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =========================
// CREATE ROAD
// =========================
const createRoad = async (req, res) => {
    try {
        const road = new Road(req.body);
        const savedRoad = await road.save();

        res.status(201).json({
            success: true,
            message: "Road created successfully",
            data: savedRoad
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =========================
// UPDATE ROAD
// =========================
const updateRoad = async (req, res) => {
    try {
        const road = await Road.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!road) {
            return res.status(404).json({
                success: false,
                message: "Road not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Road updated successfully",
            data: road
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =========================
// DELETE ROAD (SOFT DELETE WITH REASON)
// =========================
const deleteRoad = async (req, res) => {
    try {
        const reason = (req.body.deletionReason || req.body.reason || "").trim();
        const details = (req.body.details || req.body.additionalDetails || "").trim();

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "A deletion reason is required to remove this road entry"
            });
        }

        const fullReason = details ? `${reason}: ${details}` : reason;
        const user = await getAuthUser(req);
        const deletedByName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userId : "Administrator";
        const deletedBy = user?._id || null;
        const deletedAt = new Date();

        const updatePayload = {
            status: "REMOVED",
            deletionReason: fullReason,
            deletedBy,
            deletedByName,
            deletedAt,
        };

        let target = null;
        let targetType = "Road";

        // 1. Try finding in Road model
        try {
            target = await Road.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
        } catch {
            target = null;
        }

        // 2. Try finding in RoadSegment model by ObjectId or segment_key or road_name
        if (!target) {
            try {
                target = await RoadSegment.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
                if (target) targetType = "RoadSegment";
            } catch {
                target = null;
            }
        }

        if (!target) {
            target = await RoadSegment.findOneAndUpdate(
                { segment_key: req.params.id },
                updatePayload,
                { new: true }
            );
            if (target) targetType = "RoadSegment";
        }

        if (!target) {
            target = await RoadSegment.findOneAndUpdate(
                { road_name: req.params.id },
                updatePayload,
                { new: true }
            );
            if (target) targetType = "RoadSegment";
        }

        if (!target) {
            return res.status(404).json({
                success: false,
                message: "Road entry not found"
            });
        }

        // Emit realtime socket event to all connected dashboards
        const io = req.app.get("io");
        const deletePayload = {
            id: req.params.id,
            roadId: target._id?.toString(),
            segment_key: target.segment_key,
            road_name: target.road_name || target.name,
            reason: fullReason,
            deletedByName,
            deletedAt,
            targetType,
        };

        if (io) {
            io.emit("road_deleted", deletePayload);
            io.to("dashboard").emit("road_deleted", deletePayload);
        }

        res.status(200).json({
            success: true,
            message: "Road removed successfully",
            data: target
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =========================
// RESTORE ROAD (ADMIN)
// =========================
const restoreRoad = async (req, res) => {
    try {
        const restorePayload = {
            status: "OPEN",
            deletionReason: null,
            deletedBy: null,
            deletedByName: null,
            deletedAt: null,
        };

        let target = await Road.findByIdAndUpdate(req.params.id, restorePayload, { new: true });
        if (!target) {
            target = await RoadSegment.findByIdAndUpdate(req.params.id, restorePayload, { new: true })
                  || await RoadSegment.findOneAndUpdate({ segment_key: req.params.id }, restorePayload, { new: true });
        }

        if (!target) {
            return res.status(404).json({ success: false, message: "Road not found" });
        }

        const io = req.app.get("io");
        if (io) {
            io.emit("road_segment_updated", target);
            io.to("dashboard").emit("road_segment_updated", target);
        }

        res.status(200).json({
            success: true,
            message: "Road restored successfully",
            data: target
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// =========================
// GET REMOVED ROADS (AUDIT / ADMIN)
// =========================
const getRemovedRoads = async (req, res) => {
    try {
        const [roads, segments] = await Promise.all([
            Road.find({ status: "REMOVED" }).lean(),
            RoadSegment.find({ status: "REMOVED" }).lean(),
        ]);

        res.status(200).json({
            success: true,
            roads,
            segments,
            total: roads.length + segments.length
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getAllRoads,
    getRoadById,
    createRoad,
    updateRoad,
    deleteRoad,
    restoreRoad,
    getRemovedRoads
};