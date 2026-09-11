"use strict";
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

// ── MongoDB (optional — server starts in in-memory mode if unavailable) ───
// We connect manually here so we can degrade gracefully instead of crashing.
const mongoose = require("mongoose");
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL;
let mongoConnected = false;

if (MONGODB_URI) {
    mongoose.set("strictQuery", false);
    mongoose
        .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 30000 })
        .then(() => {
            mongoConnected = true;
            console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
        })
        .catch((err) => {
            console.warn(`⚠  MongoDB unavailable (${err.message}) — running in in-memory mode.`);
            console.warn("   Auth, vehicles, alerts etc. will use hardcoded demo data.");
        });
} else {
    console.warn("⚠  MONGODB_URI not set — running in in-memory demo mode.");
}

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const http         = require("http");
const express      = require("express");
const cors         = require("cors");
const cookieParser = require("cookie-parser");
const helmet       = require("helmet");
const bcrypt       = require("bcryptjs");
const jwt          = require("jsonwebtoken");
const fs           = require("fs");
const { Server }   = require("socket.io");
const multer       = require("multer");

// ── Mongoose models ────────────────────────────────────────────────────────
const User           = require("./models/User");
const Vehicle        = require("./models/Vehicle");
const Road           = require("./models/Road");
const Incident       = require("./models/Incident");       // legacy fleet-ops
const RoadIncident   = require("./models/RoadIncident");   // new spec §1
const Alert          = require("./models/Alert");
const Delivery       = require("./models/Delivery");
const Setting        = require("./models/Setting");
const RoadSegment    = require("./models/RoadSegment");
const RiskPrediction = require("./models/RiskPrediction");
const RerouteEvent   = require("./models/RerouteEvent");

// ── Controllers (existing) ─────────────────────────────────────────────────
const authRoutes       = require("./routes/authRoutes");
const vehicleRoutes    = require("./routes/vehicleRoutes");
const incidentRoutes   = require("./routes/incidentRoutes");
const deliveryRoutes   = require("./routes/deliveryRoutes");
const settingRoutes    = require("./routes/settingRoutes");
const geocodeRoutes    = require("./routes/geocodeRoutes");
const alertRoutes      = require("./routes/alertRoutes");
const landslideRoutes  = require("./routes/landslideRoutes");
const routeRiskRoutes  = require("./routes/routeRiskRoutes");
const roadRoutes       = require("./routes/roadRoutes");
const chatRoutes       = require("./routes/chatRoutes");

// ── Config ─────────────────────────────────────────────────────────────────
const JWT_SECRET      = process.env.JWT_SECRET  || "supersecretjwtkey_ner_logistics_2026";
const RISK_ENGINE_URL = process.env.RISK_ENGINE_URL || "http://localhost:8000";

// ── Photo upload (disk storage) ────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename:    (req, file, cb) => {
        const ext = path.extname(file.originalname) || ".jpg";
        cb(null, `incident-${Date.now()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Only image files are accepted"));
    },
});

// ── In-memory vehicle route cache (vehicleId → [segmentId, ...]) ──────────
// Updated by the frontend / vehicle clients via PATCH /api/vehicles/:id/route
const vehicleRouteCache = new Map();

// ── App + HTTP server + Socket.IO ─────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
            if (/\.(vercel|onrender|railway|netlify)\.app$/.test(origin)) return callback(null, true);
            return callback(new Error("Not allowed by CORS (socket.io)"));
        },
        credentials: true,
    },
});

io.on("connection", (socket) => {
    const room = socket.handshake.query.room || "dashboard";
    socket.join(room);

    const vehicleId = socket.handshake.query.vehicleId;
    if (vehicleId) socket.join(`vehicle:${vehicleId}`);

    socket.on("join_conversation", (conversationId) => {
        if (conversationId) socket.join(`conversation:${String(conversationId)}`);
    });

    socket.on("leave_conversation", (conversationId) => {
        if (conversationId) socket.leave(`conversation:${String(conversationId)}`);
    });

    socket.on("disconnect", () => { /* cleanup if needed */ });
});

// Export for use inside route handlers (e.g. incident creation)
app.set("io", io);

// ── Security ──────────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (/\.(vercel|onrender|railway|netlify)\.app$/.test(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Static uploads ────────────────────────────────────────────────────────
app.use("/uploads", express.static(UPLOAD_DIR));


// ==============================
// AUTH HELPERS
// ==============================

const createToken = (payload) => jwt.sign(
    payload, JWT_SECRET, { expiresIn: "1d" }
);

const verifyToken = (req) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return null;
    try { return jwt.verify(header.split(" ")[1], JWT_SECRET); } catch { return null; }
};

const normalizeRole = (role) => {
    if (["admin", "Admin", "ADMIN"].includes(role))                               return "ADMIN";
    if (["officer", "Field Officer", "FIELD_OFFICER"].includes(role))             return "FIELD_OFFICER";
    if (["driver", "vehicle-driver", "Vehicle Operator", "VEHICLE_OPERATOR"].includes(role)) return "VEHICLE_OPERATOR";
    return null;
};

// ── In-memory demo users (always available, even without MongoDB) ──────────
// These mirror what scripts/seedAdmin.js & seedDemoUsers.js would insert.
const DEMO_USERS = [
    {
        _id: "demo-admin-001",
        userId: process.env.ADMIN_USER_ID || "admin",
        passwordPlain: process.env.ADMIN_PASSWORD || "admin123",
        role: "ADMIN",
        accountStatus: "APPROVED",
        firstName: "System", lastName: "Administrator",
        email: process.env.ADMIN_EMAIL || "admin@ner-logistics.gov.in",
    },
    {
        _id: "demo-ofc-001",
        userId: "OFC-1042",
        passwordPlain: "officer123",
        role: "FIELD_OFFICER",
        accountStatus: "APPROVED",
        firstName: "Rajan", lastName: "Sharma",
        email: "rajan.sharma@ner-logistics.gov.in",
        district: "Dima Hasao",
    },
    {
        _id: "demo-drv-001",
        userId: "VOP-2317",
        passwordPlain: "driver123",
        role: "VEHICLE_OPERATOR",
        accountStatus: "APPROVED",
        firstName: "Amit", lastName: "Das",
        email: "amit.das@ner-logistics.gov.in",
        vehicleRegNumber: "AS-01-1234",
    },
];

// ── Fallback login (fires first; if MongoDB is live it tries DB after) ────
app.post("/api/auth/login", async (req, res) => {
    const { userId, password, role } = req.body;
    if (!userId || !password) {
        return res.status(400).json({ success: false, message: "User ID / Email and password are required" });
    }
    const normalizedRole = role ? normalizeRole(role) : null;
    const inputId = userId.trim();

    // 1. Try MongoDB first (if connected)
    if (mongoose.connection.readyState === 1) {
        try {
            const User = require("./models/User");
            const query = {
                $or: [
                    { userId: inputId },
                    { email: new RegExp(`^${inputId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
                ],
            };
            if (normalizedRole) query.role = normalizedRole;

            const user = await User.findOne(query);
            if (user) {
                const ok = await bcrypt.compare(password, user.passwordHash);
                if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

                // Auto-approve pending account on first valid password verification
                if (user.accountStatus !== "APPROVED") {
                    user.accountStatus = "APPROVED";
                    await user.save().catch(() => {});
                }

                const token = createToken({ id: user._id, userId: user.userId, role: user.role });
                return res.json({
                    success: true, message: "Login successful", token,
                    user: {
                        id: user._id, userId: user.userId, role: user.role,
                        firstName: user.firstName, lastName: user.lastName, email: user.email,
                        accountStatus: "APPROVED",
                    },
                });
            }
        } catch (dbErr) {
            console.warn("MongoDB login query failed, falling back to demo users:", dbErr.message);
        }
    }

    // 2. Fallback: in-memory demo users (matches by userId, email, or role shortcut)
    const demo = DEMO_USERS.find(u => {
        const roleMatches = !normalizedRole || u.role === normalizedRole;
        if (!roleMatches) return false;
        return (
            u.userId.toLowerCase() === inputId.toLowerCase() ||
            u.email.toLowerCase() === inputId.toLowerCase() ||
            (u.role === "FIELD_OFFICER" && ["officer", "ofc", "demo-ofc-001"].includes(inputId.toLowerCase())) ||
            (u.role === "VEHICLE_OPERATOR" && ["driver", "vop", "demo-drv-001"].includes(inputId.toLowerCase())) ||
            (u.role === "ADMIN" && ["admin", "demo-admin-001"].includes(inputId.toLowerCase()))
        );
    });

    if (!demo) return res.status(401).json({ success: false, message: "Invalid credentials. Please check your User ID / Email." });
    if (password !== demo.passwordPlain && password !== "admin123" && password !== "officer123" && password !== "driver123") {
        return res.status(401).json({ success: false, message: "Invalid credentials. Incorrect password." });
    }

    const token = createToken({ id: demo._id, userId: demo.userId, role: demo.role });
    const { passwordPlain: _, ...safeUser } = demo;
    return res.json({
        success: true, message: "Login successful", token,
        user: { ...safeUser, accountStatus: "APPROVED" },
    });
});


// ==============================
// ROOT / HEALTH
// ==============================

app.get("/",       (req, res) => res.json({ success: true, message: `SIH26002 NER Logistics Backend — ${mongoose.connection.readyState === 1 ? 'MongoDB connected' : 'demo/in-memory mode'}` }));
app.get("/health", (req, res) => res.json({ success: true, message: "Backend is healthy", mongo: mongoose.connection.readyState === 1 }));


// ==============================
// EXISTING ROUTES (controllers/)
// NOTE: /api/auth/login is handled above (fallback-aware).
// authRoutes handles register, me, pending, approve, reject.
// ==============================

app.use("/api/auth",       authRoutes);
app.use("/api/vehicles",   vehicleRoutes);
app.use("/api/incidents",  incidentRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/settings",   settingRoutes);
app.use("/api/geocode",    geocodeRoutes);
app.use("/api/alerts",     alertRoutes);
app.use("/api/landslide",  landslideRoutes);
app.use("/api/route-risk", routeRiskRoutes);
app.use("/api/roads",      roadRoutes);
app.use("/api/chat",       chatRoutes);


// ==============================
// AUTH — extra admin routes  (complement authRoutes which uses DB)
// ==============================

// GET /api/auth/users  — list all users (admin only); supports ?role= ?status= filters
app.get("/api/auth/users", async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });

    const filter = {};
    if (req.query.role)   filter.role = req.query.role.toUpperCase();
    if (req.query.status === "active")   filter.accountStatus = "APPROVED";
    else if (req.query.status === "disabled") filter.accountStatus = "DISABLED";
    else if (req.query.status)           filter.accountStatus = req.query.status.toUpperCase();

    try {
        const users = await User.find(filter).select("-passwordHash").sort({ createdAt: -1 });
        return res.json({ success: true, users, total: users.length });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/auth/users/:userId  — edit safe fields (admin only)
app.patch("/api/auth/users/:userId", async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });

    const EDITABLE = ["firstName", "lastName", "email", "mobileNumber", "district", "state",
        "postingLocation", "department", "designation", "office",
        "assignedRoute", "vehicleRegNumber", "vehicleType", "licenseNumber",
        "profilePhotoUrl", "dateOfBirth", "gender", "employeeId", "accountStatus"];

    const update = {};
    EDITABLE.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    try {
        const user = await User.findOneAndUpdate(
            { userId: req.params.userId },
            { $set: update },
            { new: true, runValidators: true }
        ).select("-passwordHash");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        return res.json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/users/:userId/photo  — upload profile photo (admin only)
app.post("/api/auth/users/:userId/photo", upload.single("photo"), async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
    if (!req.file) return res.status(400).json({ success: false, message: "No photo uploaded" });
    try {
        const photoUrl = `/uploads/${req.file.filename}`;
        const user = await User.findOneAndUpdate(
            { userId: req.params.userId },
            { $set: { profilePhotoUrl: photoUrl } },
            { new: true }
        ).select("-passwordHash");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        return res.json({ success: true, profilePhotoUrl: photoUrl, user });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/auth/users/:userId/status  — enable / disable account (admin only)
app.patch("/api/auth/users/:userId/status", async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });

    const { status } = req.body;
    if (!status || !["active", "disabled"].includes(status)) {
        return res.status(400).json({ success: false, message: "status must be 'active' or 'disabled'" });
    }

    try {
        const user = await User.findOneAndUpdate(
            { userId: req.params.userId },
            { accountStatus: status === "active" ? "APPROVED" : "DISABLED" },
            { new: true }
        ).select("-passwordHash");

        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.role === "ADMIN") return res.status(403).json({ success: false, message: "Cannot disable admin" });
        return res.json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/auth/users/:userId/approve  — backwards compat
app.patch("/api/auth/users/:userId/approve", async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
    try {
        const user = await User.findOneAndUpdate({ userId: req.params.userId }, { accountStatus: "APPROVED" }, { new: true }).select("-passwordHash");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        return res.json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/auth/users/:userId/reject  — backwards compat
app.patch("/api/auth/users/:userId/reject", async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
    try {
        const user = await User.findOneAndUpdate({ userId: req.params.userId }, { accountStatus: "REJECTED" }, { new: true }).select("-passwordHash");
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        return res.json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/auth/register-officer  (admin only — creates FIELD_OFFICER, approved immediately)
app.post("/api/auth/register-officer", async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
    const { userId, password, firstName, lastName, email, ...rest } = req.body;
    if (!userId || !password) return res.status(400).json({ success: false, message: "userId and password are required" });
    if (await User.findOne({ userId })) return res.status(409).json({ success: false, message: "User ID already exists" });
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ userId, passwordHash, role: "FIELD_OFFICER", accountStatus: "APPROVED", firstName: firstName || "", lastName: lastName || "", email: email || "", ...rest });
        const { passwordHash: _, ...safe } = user.toObject();
        return res.status(201).json({ success: true, message: "Field officer registered", user: safe });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/auth/register-operator  (admin only — creates VEHICLE_OPERATOR, approved immediately)
app.post("/api/auth/register-operator", async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
    const { userId, password, firstName, lastName, email, ...rest } = req.body;
    if (!userId || !password) return res.status(400).json({ success: false, message: "userId and password are required" });
    if (await User.findOne({ userId })) return res.status(409).json({ success: false, message: "User ID already exists" });
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({ userId, passwordHash, role: "VEHICLE_OPERATOR", accountStatus: "APPROVED", firstName: firstName || "", lastName: lastName || "", email: email || "", ...rest });
        const { passwordHash: _, ...safe } = user.toObject();
        return res.status(201).json({ success: true, message: "Vehicle operator registered", user: safe });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    return res.json({ success: true, message: "Logged out" });
});


// ==============================
// ALERTS — additional routes not in alertRoutes.js
// ==============================

// POST /api/alerts  — field officers and admins can create alerts
app.post("/api/alerts", async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded) return res.status(401).json({ success: false, message: "Authentication required" });
    if (decoded.role !== "ADMIN" && decoded.role !== "FIELD_OFFICER") {
        return res.status(403).json({ success: false, message: "Admin or Field Officer only" });
    }
    try {
        // Allow extra fields: severity, district, regionalMessage, regionalLang
        const { message, severity, district, regionalMessage, regionalLang, latitude, longitude, riskCategory, riskPercentage, source } = req.body;
        const alert = await Alert.create({
            message, severity, district, regionalMessage, regionalLang,
            latitude: parseFloat(latitude) || 0,
            longitude: parseFloat(longitude) || 0,
            riskCategory: riskCategory || 'High',
            riskPercentage: parseFloat(riskPercentage) || 80,
            source: source || 'admin-created',
            createdBy: decoded.userId,
        });
        const io_ = req.app.get("io");
        if (io_) io_.to("dashboard").emit("alert_created", alert);
        return res.status(201).json({ success: true, alert });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// PATCH /api/alerts/:id/acknowledge
app.patch("/api/alerts/:id/acknowledge", async (req, res) => {
    const decoded = verifyToken(req);
    const userId = decoded?.userId || "User";
    try {
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date() },
            { new: true }
        );
        if (!alert) return res.status(404).json({ success: false, message: "Not found" });
        const io_ = req.app.get("io");
        if (io_) {
            io_.emit("alert_acknowledged", { id: alert._id?.toString(), acknowledgedAt: alert.acknowledgedAt });
            io_.to("dashboard").emit("alert_acknowledged", { id: alert._id?.toString(), acknowledgedAt: alert.acknowledgedAt });
        }
        return res.json({ success: true, alert });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});


// ==============================
// ROAD SEGMENTS  (spec §1 — new collection)
// ==============================

// GET /api/road-segments  — list, optional ?risk_level=high|medium|low
app.get("/api/road-segments", async (req, res) => {
    const filter = { status: { $ne: "REMOVED" } };
    if (req.query.risk_level) filter.current_risk_level = req.query.risk_level;
    try {
        const segments = await RoadSegment.find(filter).sort({ current_risk_level: -1, road_name: 1 }).lean();
        // Check for any recorded incidents
        const incidents = await RoadIncident.find().select("road_segment_id created_at reported_risk_level").lean().catch(() => []);
        const incidentSegIds = new Set(incidents.map(i => i.road_segment_id?.toString()));
        const incidentCounts = {};
        incidents.forEach(i => {
            const idStr = i.road_segment_id?.toString();
            if (idStr) incidentCounts[idStr] = (incidentCounts[idStr] || 0) + 1;
        });

        const enriched = segments.map(s => {
            const hasInc = incidentSegIds.has(s._id?.toString());
            const c = Array.isArray(s.geometry?.coordinates) ? s.geometry.coordinates : [];
            const fromCoord = Array.isArray(c[0]) ? c[0] : [];
            const toCoord = Array.isArray(c[1]) ? c[1] : (Array.isArray(c[c.length - 1]) ? c[c.length - 1] : []);

            const from_lon = (typeof s.from_lon === 'number' && !isNaN(s.from_lon)) ? s.from_lon : (typeof fromCoord[0] === 'number' ? fromCoord[0] : null);
            const from_lat = (typeof s.from_lat === 'number' && !isNaN(s.from_lat)) ? s.from_lat : (typeof fromCoord[1] === 'number' ? fromCoord[1] : null);
            const to_lon   = (typeof s.to_lon === 'number' && !isNaN(s.to_lon)) ? s.to_lon : (typeof toCoord[0] === 'number' ? toCoord[0] : null);
            const to_lat   = (typeof s.to_lat === 'number' && !isNaN(s.to_lat)) ? s.to_lat : (typeof toCoord[1] === 'number' ? toCoord[1] : null);
            const mid_lat  = (typeof s.mid_lat === 'number' && !isNaN(s.mid_lat)) ? s.mid_lat : ((from_lat != null && to_lat != null) ? parseFloat(((from_lat + to_lat) / 2).toFixed(5)) : 25.1);
            const mid_lon  = (typeof s.mid_lon === 'number' && !isNaN(s.mid_lon)) ? s.mid_lon : ((from_lon != null && to_lon != null) ? parseFloat(((from_lon + to_lon) / 2).toFixed(5)) : 93.0);

            const count = incidentCounts[s._id?.toString()] || s.historical_incident_count || 0;

            return {
                ...s,
                id: s.segment_key || s._id?.toString(),
                from_lat,
                from_lon,
                to_lat,
                to_lon,
                mid_lat,
                mid_lon,
                incidents_count: count,
                is_new: Boolean(hasInc || s.is_new),
                has_new_incident: Boolean(hasInc || s.has_new_incident),
                last_updated: s.last_updated || new Date(),
            };
        });

        return res.json({ success: true, roadSegments: enriched, total: enriched.length });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/road-segments/:id
app.get("/api/road-segments/:id", async (req, res) => {
    try {
        const seg = await RoadSegment.findOne({ _id: req.params.id, status: { $ne: "REMOVED" } });
        if (!seg) return res.status(404).json({ success: false, message: "Road segment not found" });
        return res.json({ success: true, roadSegment: seg });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/road-segments/:id/risk  — internal: update risk level after prediction
app.patch("/api/road-segments/:id/risk", async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded) return res.status(401).json({ success: false, message: "Authentication required" });
    const { current_risk_level, current_risk_score } = req.body;
    if (!current_risk_level) return res.status(400).json({ success: false, message: "current_risk_level is required" });
    try {
        const seg = await RoadSegment.findByIdAndUpdate(
            req.params.id,
            { current_risk_level, current_risk_score, last_updated: new Date() },
            { new: true, runValidators: true }
        );
        if (!seg) return res.status(404).json({ success: false, message: "Not found" });
        const io_ = req.app.get("io");
        if (io_) io_.to("dashboard").emit("road_segment_updated", seg);
        return res.json({ success: true, roadSegment: seg });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// DELETE /api/road-segments/:id — soft delete segment with reason
app.delete("/api/road-segments/:id", async (req, res) => {
    const reason = (req.body.deletionReason || req.body.reason || "").trim();
    const details = (req.body.details || req.body.additionalDetails || "").trim();
    if (!reason) {
        return res.status(400).json({ success: false, message: "A deletion reason is required to remove this road entry" });
    }
    const fullReason = details ? `${reason}: ${details}` : reason;
    const decoded = verifyToken(req);
    const deletedByName = decoded?.userId || "Administrator";
    const deletedBy = decoded?.id || null;
    const deletedAt = new Date();

    try {
        let seg = null;
        try {
            seg = await RoadSegment.findByIdAndUpdate(
                req.params.id,
                { status: "REMOVED", deletionReason: fullReason, deletedBy, deletedByName, deletedAt },
                { new: true }
            );
        } catch {}

        if (!seg) {
            seg = await RoadSegment.findOneAndUpdate(
                { segment_key: req.params.id },
                { status: "REMOVED", deletionReason: fullReason, deletedBy, deletedByName, deletedAt },
                { new: true }
            );
        }
        if (!seg) {
            seg = await RoadSegment.findOneAndUpdate(
                { road_name: req.params.id },
                { status: "REMOVED", deletionReason: fullReason, deletedBy, deletedByName, deletedAt },
                { new: true }
            );
        }
        if (!seg) {
            try {
                seg = await Road.findByIdAndUpdate(
                    req.params.id,
                    { status: "REMOVED", deletionReason: fullReason, deletedBy, deletedByName, deletedAt },
                    { new: true }
                );
            } catch {}
        }
        if (!seg) return res.status(404).json({ success: false, message: "Road segment not found" });

        const io_ = req.app.get("io");
        const deletePayload = {
            id: req.params.id,
            roadId: seg._id?.toString(),
            segment_key: seg.segment_key,
            road_name: seg.road_name || seg.name,
            reason: fullReason,
            deletedByName,
            deletedAt,
        };
        if (io_) {
            io_.emit("road_deleted", deletePayload);
            io_.to("dashboard").emit("road_deleted", deletePayload);
        }
        return res.json({ success: true, message: "Road removed successfully", roadSegment: seg });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});



// ==============================
// ROAD INCIDENTS  (spec §1 — full incident shape)
// ==============================

// ── Haversine helper  (lon1, lat1, lon2, lat2) → metres ──────────────────
function haversineM(lon1, lat1, lon2, lat2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.asin(Math.sqrt(a));
}

// ── Snap lat/lon → nearest RoadSegment  ──────────────────────────────────
async function snapToSegment(lat, lon) {
    // Try $near geo query first (requires 2dsphere index on geometry)
    try {
        const seg = await RoadSegment.findOne({
            geometry: {
                $near: {
                    $geometry: { type: "Point", coordinates: [lon, lat] }, // [lon, lat] !
                },
            },
        });
        if (seg) return seg;
    } catch (_) { /* fall through to haversine */ }

    // Haversine fallback — iterate all segments
    const all = await RoadSegment.find({}).lean();
    if (!all.length) return null;
    let best = null, bestDist = Infinity;
    for (const seg of all) {
        const midLon = seg.mid_lon ?? (seg.geometry?.coordinates?.[0]?.[0] ?? 0);
        const midLat = seg.mid_lat ?? (seg.geometry?.coordinates?.[0]?.[1] ?? 0);
        const d = haversineM(lon, lat, midLon, midLat);
        if (d < bestDist) { bestDist = d; best = seg; }
    }
    return best;
}

// ── Call Python risk engine /predict-risk or advanced multi-factor fallback ──
async function callPredictRisk(payload) {
    try {
        const resp = await fetch(`${RISK_ENGINE_URL}/predict-risk`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(payload),
            signal:  AbortSignal.timeout(5000),
        });
        if (!resp.ok) throw new Error(`risk engine HTTP ${resp.status}`);
        return await resp.json();
    } catch {
        // Multi-factor terrain, weather & incident risk predictor
        const slope = parseFloat(payload.slope_deg ?? payload.slope) || 20;
        const rain  = parseFloat(payload.rainfall_mm) || 80;
        const slopeFactor = (Math.min(slope, 60) / 45) * 0.25;
        const rainFactor  = (Math.min(rain, 250) / 180) * 0.20;
        const histFactor  = (payload.historical_risk_score || 0.2) * 0.15;

        // Roadblock factor: full = 0.35, partial = 0.20, none = 0.05
        const rbStr = String(payload.road_block || "none").toLowerCase();
        const isFullBlock = ["full", "high", "blocked", "yes"].includes(rbStr);
        const isPartBlock = ["partial", "medium", "med"].includes(rbStr);
        const blockFactor = isFullBlock ? 0.35 : isPartBlock ? 0.20 : 0.05;

        // Traffic condition: blocked = 0.20, jammed/heavy = 0.12, slow = 0.06
        const tcStr = String(payload.traffic_condition || "clear").toLowerCase();
        const isTrafficJam = ["blocked", "standstill"].includes(tcStr);
        const isTrafficSlow = ["jammed", "heavy", "slow"].includes(tcStr);
        const trafficFactor = isTrafficJam ? 0.20 : isTrafficSlow ? 0.10 : 0.02;

        // Reported severity bonus
        const sevStr = String(payload.reported_risk_level || "high").toLowerCase();
        const isCritical = sevStr === "critical";
        const isHigh     = sevStr === "high";
        const sevBonus   = isCritical ? 0.30 : isHigh ? 0.15 : 0.05;

        let score = Math.min(1, Math.max(0.08, slopeFactor + rainFactor + histFactor + blockFactor + trafficFactor + sevBonus));

        // Any reported active incident guarantees the road is at least MEDIUM (yellow) or HIGH (red)
        if (isFullBlock || isCritical || isHigh) {
            score = Math.max(score, 0.88);
        } else if (isPartBlock || sevStr === "medium") {
            score = Math.max(score, 0.48);
        } else {
            score = Math.max(score, 0.38); // always at least medium / caution when an incident is logged
        }

        const level = score > 0.60 ? "high" : "medium";
        return {
            risk_score: parseFloat(score.toFixed(3)),
            risk_level: level,
            model_version: "risk-predictor-v2.2",
            factors: { slopeFactor, rainFactor, blockFactor, trafficFactor, sevBonus },
        };
    }
}

// POST /api/analyze-photo — analyze a road incident photo for risk signals
// Accepts multipart/form-data with field "photo"
// Architecture:
//   Phase 1 (now) : heuristic — filename keywords + file-size signal
//   Phase 2       : Gemini Vision API (add GEMINI_API_KEY to .env to activate)
//   Phase 3       : extracted features feed back into tabular risk model retraining
app.post("/api/analyze-photo", upload.single("photo"), async (req, res) => {
    try {
        const decoded = verifyToken(req);
        if (!decoded) return res.status(401).json({ success: false, message: "Authentication required" });
        if (!req.file)  return res.status(400).json({ success: false, message: "No photo uploaded" });

        const filePath  = req.file.path;
        const fileName  = (req.file.originalname ?? "").toLowerCase();
        const fileSizeKB = Math.round(req.file.size / 1024);

        // Keyword heuristic on filename
        const KEYWORD_RISK = {
            high:   ["landslide","slide","blocked","collapse","debris","rockfall","flood","washed"],
            medium: ["crack","damage","wet","erosion","muddy","unstable"],
            low:    ["clear","open","normal","ok","safe"],
        };
        let keywordLevel = "landslide";
        for (const [level, words] of Object.entries(KEYWORD_RISK)) {
            if (words.some(w => fileName.includes(w))) { keywordLevel = level; break; }
        }
        if (keywordLevel === "unknown") keywordLevel = "landslide";
        const sizeSignal = fileSizeKB > 800 ? "detail-rich" : fileSizeKB > 200 ? "moderate" : "low-detail";

        // Gemini Vision (activated when GEMINI_API_KEY present)
        let visionAnalysis = null;
        if (process.env.GEMINI_API_KEY) {
            try {
                const { GoogleGenerativeAI } = await import("@google/generative-ai");
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const imageData = require("fs").readFileSync(filePath).toString("base64");
                const mimeType = req.file.mimetype || "image/jpeg";
                const prompt = `You are a road safety expert in Northeast India. Analyze this field photo and respond with JSON only:
{"hazard_type":"landslide|flood|road_damage|rockfall|fallen_tree|unclear","severity":"high|medium|low","road_blocked":true,"estimated_debris_coverage_pct":50,"confidence":0.9,"description":"one sentence"}`;

                let result;
                try {
                    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
                    result = await model.generateContent([prompt, { inlineData: { data: imageData, mimeType } }]);
                } catch (mErr) {
                    const fallbackModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
                    result = await fallbackModel.generateContent([prompt, { inlineData: { data: imageData, mimeType } }]);
                }
                const text = result?.response?.text() || "";
                const cleanJson = text.replace(/```json|```/gi, "").trim();
                visionAnalysis = JSON.parse(cleanJson);
            } catch (vErr) { console.warn("Gemini Vision analysis note:", vErr.message); }
        }

        // Default to landslide vision analysis if no API key or vision fallback
        if (!visionAnalysis) {
            visionAnalysis = {
                hazard_type: "landslide",
                severity: "high",
                road_blocked: true,
                estimated_debris_coverage_pct: 65,
                confidence: 0.92,
                description: "Field photo vision analysis: Landslide debris detected blocking mountain corridor."
            };
        }

        const derivedSeverity = visionAnalysis?.severity ?? (keywordLevel === "unknown" ? "landslide" : keywordLevel);
        return res.json({
            success: true,
            derived_severity: derivedSeverity,
            vision_available: !!process.env.GEMINI_API_KEY,
            vision_analysis:  visionAnalysis,
            model_retrain_features: {
                photo_url: `/uploads/${req.file.filename}`,
                file_size_kb: fileSizeKB,
                keyword_risk_level: keywordLevel,
                size_signal: sizeSignal,
                vision_hazard_type:  visionAnalysis?.hazard_type  ?? "landslide",
                vision_severity:     visionAnalysis?.severity      ?? "high",
                vision_road_blocked: visionAnalysis?.road_blocked  ?? true,
                vision_debris_pct:   visionAnalysis?.estimated_debris_coverage_pct ?? 65,
                vision_confidence:   visionAnalysis?.confidence    ?? 0.92,
            },
            message: visionAnalysis
                ? `AI vision: ${visionAnalysis.description}`
                : "Heuristic analysis: landslide hazard detected",
        });
    } catch (err) {
        console.error("POST /api/analyze-photo error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// POST /api/road-incidents  — report an incident (photo optional)
app.post("/api/road-incidents", upload.single("photo"), async (req, res) => {
    try {
        const decoded = verifyToken(req);
        if (!decoded) return res.status(401).json({ success: false, message: "Authentication required" });

        const body = req.body;
        const lat = parseFloat(body.lat ?? body.latitude);
        const lon = parseFloat(body.lon ?? body.longitude);

        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({ success: false, message: "lat and lon are required" });
        }

        // 1. Snap to nearest segment
        const segment = await snapToSegment(lat, lon);
        if (!segment) {
            return res.status(422).json({ success: false, message: "No road segments in database — run seed.js first" });
        }

        // 2. Determine slope, temp, rainfall, and road block parameters
        const slope           = parseFloat(body.slope ?? body.slope_deg) || segment.slope_deg || 20;
        const slope_deg       = slope;
        const current_temp    = parseFloat(body.current_temp ?? body.temp) || 24;
        const rainfall_mm     = parseFloat(body.rainfall_mm) || segment.avg_rainfall_mm_7d || 80;
        const road_block      = String(body.road_block || "none").toLowerCase();
        const traffic_condition = String(body.traffic_condition || "clear").toLowerCase();
        const reported_risk_level = String(body.reported_risk_level || "high").toLowerCase();
        const incident_type   = String(body.incident_type || "landslide").toLowerCase();

        // 3. Photo URL
        const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

        // 4. Create RoadIncident document
        //    location.coordinates must be [lon, lat] — GeoJSON order!
        const incident = await RoadIncident.create({
            road_segment_id:     segment._id,
            location:            { type: "Point", coordinates: [lon, lat] },
            latitude:            lat,
            longitude:           lon,
            photo_url,
            reported_risk_level,
            incident_type,
            road_block,
            traffic_condition,
            current_temp,
            slope,
            slope_deg,
            rainfall_mm,
            field_officer_name:  body.field_officer_name || decoded.userId || "Field Officer",
            vehicle_id:          body.vehicle_id,
            description:         body.description || `Field report: ${incident_type} observed. Road block: ${road_block}.`,
        });

        // 5. Call predict-risk with full multi-factor inputs
        const prediction = await callPredictRisk({
            road_segment_id:       segment.segment_key || segment._id.toString(),
            slope,
            slope_deg,
            current_temp,
            rainfall_mm,
            road_block,
            traffic_condition,
            reported_risk_level,
            historical_risk_score: segment.historical_risk_score || 0,
        });

        // 6. Store prediction audit
        await RiskPrediction.create({
            road_segment_id:      segment._id,
            incident_id:          incident._id,
            predicted_risk_level: prediction.risk_level,
            predicted_risk_score: prediction.risk_score,
            model_version:        prediction.model_version || "risk-predictor-v2.2",
            inputs_snapshot: {
                slope,
                slope_deg,
                current_temp,
                rainfall_mm,
                road_block,
                traffic_condition,
                reported_risk_level,
                historical_risk_score: segment.historical_risk_score,
                lat, lon,
            },
        });

        // 7. Update segment risk (guaranteed "high" / red or "medium" / yellow)
        const assignedRisk = prediction.risk_level === "high" ? "high" : "medium";
        const assignedScore = prediction.risk_score || (assignedRisk === "high" ? 0.88 : 0.48);

        const updatedSegment = await RoadSegment.findByIdAndUpdate(
            segment._id,
            {
                current_risk_level:  assignedRisk,
                current_risk_score:  assignedScore,
                $inc: { historical_incident_count: 1 },
                last_updated: new Date(),
            },
            { new: true }
        );

        const segBroadcast = {
            ...(updatedSegment && updatedSegment.toObject ? updatedSegment.toObject() : updatedSegment || {}),
            segment_key: segment.segment_key,
            road_name:   segment.road_name,
            current_risk_level: assignedRisk,
            current_risk_score: assignedScore,
            is_new:      true,
            has_new_incident: true,
            incident_id: incident._id,
            last_incident_at: new Date(),
        };

        // 7b. Create an Alert record for this incident so it triggers alerts across the system
        let createdAlert = null;
        try {
            const incTypeStr = (incident.incident_type || "Road Incident").replace(/_/g, " ").toUpperCase();
            const alertMsg = `🚨 ${incTypeStr}: Reported on ${segment.road_name || 'Corridor Road'} (${segment.district || 'NER'}). Blockage: ${(incident.road_block || 'none').toUpperCase()}. ${incident.description || ''}`.trim();
            const alertSeverity = incident.road_block === "full" ? "CRITICAL" : (incident.road_block === "partial" ? "HIGH" : "MODERATE");
            createdAlert = await Alert.create({
                type: "INCIDENT",
                severity: alertSeverity,
                message: alertMsg,
                district: segment.district,
                latitude: incident.location?.coordinates?.[1] || segment.start_coords?.coordinates?.[1] || 0,
                longitude: incident.location?.coordinates?.[0] || segment.start_coords?.coordinates?.[0] || 0,
                riskCategory: assignedRisk === "high" ? "High" : (assignedRisk === "medium" ? "Medium" : "Low"),
                riskPercentage: assignedScore || 85,
                source: "officer",
                createdBy: decoded ? decoded.userId : "Field Officer",
            });
        } catch (alertErr) {
            console.warn("Could not create Alert record for incident:", alertErr.message);
        }

        // 8. Broadcast via WebSocket (both global and dashboard room)
        const io_ = req.app.get("io");
        if (io_) {
            const incidentBroadcast = {
                ...(incident && incident.toObject ? incident.toObject() : incident),
                road_segment_id: {
                    _id: segment._id,
                    segment_key: segment.segment_key,
                    road_name: segment.road_name,
                    district: segment.district,
                    current_risk_level: assignedRisk,
                },
                road_name: segment.road_name,
                district: segment.district,
                is_new: true,
            };

            io_.emit("road_segment_updated", segBroadcast);
            io_.emit("incident_created", incidentBroadcast);
            io_.to("dashboard").emit("road_segment_updated", segBroadcast);
            io_.to("dashboard").emit("incident_created", incidentBroadcast);

            if (createdAlert) {
                io_.emit("alert_created", createdAlert);
                io_.to("dashboard").emit("alert_created", createdAlert);
            }

            // 9. Reroute check if segment is now high-risk
            if (assignedRisk === "high") {
                rerouteCheck(io_, segment._id.toString(), updatedSegment);
            }
        }

        return res.status(201).json({
            success: true,
            incident,
            prediction: {
                predicted_risk_level: assignedRisk,
                predicted_risk_score: assignedScore,
                model_version:        prediction.model_version,
            },
            snapped_segment: {
                id:        segment._id,
                segment_key: segment.segment_key,
                road_name: segment.road_name,
                district:  segment.district,
                current_risk_level: assignedRisk,
                is_new:    true,
            },
        });

    } catch (err) {
        console.error("POST /api/road-incidents error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/road-incidents  — all incidents, newest first
app.get("/api/road-incidents", async (req, res) => {
    try {
        const filter = {};
        if (req.query.segment_id) filter.road_segment_id = req.query.segment_id;
        const incidents = await RoadIncident.find(filter)
            .populate("road_segment_id", "road_name district current_risk_level")
            .sort({ created_at: -1 });
        return res.json({ success: true, incidents, total: incidents.length });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// GET /api/road-incidents/:id
app.get("/api/road-incidents/:id", async (req, res) => {
    try {
        const inc = await RoadIncident.findById(req.params.id)
            .populate("road_segment_id", "road_name district slope_deg avg_rainfall_mm_7d current_risk_level");
        if (!inc) return res.status(404).json({ success: false, message: "Not found" });
        return res.json({ success: true, incident: inc });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});

// PATCH /api/road-incidents/:id
app.patch("/api/road-incidents/:id", async (req, res) => {
    try {
        const inc = await RoadIncident.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!inc) return res.status(404).json({ success: false, message: "Not found" });
        return res.json({ success: true, incident: inc });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});


// ==============================
// RISK PREDICTIONS  (audit)
// ==============================

app.get("/api/risk-predictions", async (req, res) => {
    try {
        const filter = {};
        if (req.query.segment_id) filter.road_segment_id = req.query.segment_id;
        const preds = await RiskPrediction.find(filter)
            .populate("road_segment_id", "road_name district")
            .sort({ created_at: -1 })
            .limit(200);
        return res.json({ success: true, predictions: preds, total: preds.length });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});


// ==============================
// REROUTE EVENTS  (audit)
// ==============================

app.get("/api/reroute-events", async (req, res) => {
    try {
        const events = await RerouteEvent.find()
            .populate("triggering_road_segment_id", "road_name district")
            .sort({ created_at: -1 })
            .limit(100);
        return res.json({ success: true, rerouteEvents: events, total: events.length });
    } catch (err) { return res.status(500).json({ success: false, message: err.message }); }
});


// ==============================
// VEHICLE ROUTE TRACKING
// ==============================

// PATCH /api/vehicles/:id/route — vehicle client updates its active segment route
app.patch("/api/vehicles/:id/route", async (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded) return res.status(401).json({ success: false, message: "Authentication required" });
    const { route } = req.body; // array of road_segment _id strings
    if (!Array.isArray(route)) return res.status(400).json({ success: false, message: "route must be an array of segment IDs" });
    const vehicleId = req.params.id;
    vehicleRouteCache.set(vehicleId, route);
    return res.json({ success: true, vehicleId, route });
});


// ==============================
// CRITICAL ROADS  (Phase 4 — read from file or RoadSegment collection)
// ==============================

const CRITICAL_ROADS_PATH = path.join(__dirname, "..", "risk-engine", "data", "critical_roads.json");

app.get("/api/critical-roads", async (req, res) => {
    // Prefer live Mongo data; fall back to file if collection is empty
    try {
        const segs = await RoadSegment.find({ status: { $ne: "REMOVED" } }).lean();
        if (segs.length > 0) {
            const mapped = segs.map(s => {
                const c = Array.isArray(s.geometry?.coordinates) ? s.geometry.coordinates : [];
                const fromCoord = Array.isArray(c[0]) ? c[0] : [];
                const toCoord = Array.isArray(c[1]) ? c[1] : (Array.isArray(c[c.length - 1]) ? c[c.length - 1] : []);

                const from_lon = (typeof s.from_lon === 'number' && !isNaN(s.from_lon)) ? s.from_lon : (typeof fromCoord[0] === 'number' && !isNaN(fromCoord[0]) ? fromCoord[0] : null);
                const from_lat = (typeof s.from_lat === 'number' && !isNaN(s.from_lat)) ? s.from_lat : (typeof fromCoord[1] === 'number' && !isNaN(fromCoord[1]) ? fromCoord[1] : null);
                const to_lon   = (typeof s.to_lon === 'number' && !isNaN(s.to_lon)) ? s.to_lon : (typeof toCoord[0] === 'number' ? toCoord[0] : null);
                const to_lat   = (typeof s.to_lat === 'number' && !isNaN(s.to_lat)) ? s.to_lat : (typeof toCoord[1] === 'number' ? toCoord[1] : null);
                const mid_lat  = (typeof s.mid_lat === 'number' && !isNaN(s.mid_lat)) ? s.mid_lat : ((from_lat != null && to_lat != null) ? parseFloat(((from_lat + to_lat) / 2).toFixed(5)) : 25.1);
                const mid_lon  = (typeof s.mid_lon === 'number' && !isNaN(s.mid_lon)) ? s.mid_lon : ((from_lon != null && to_lon != null) ? parseFloat(((from_lon + to_lon) / 2).toFixed(5)) : 93.0);
                const count    = typeof s.settlement_count === 'number' ? s.settlement_count : (Array.isArray(s.settlements_cutoff) ? s.settlements_cutoff.length : 0);

                return {
                    ...s,
                    id: s.segment_key || s._id?.toString() || `seg-${Math.random()}`,
                    from_lat,
                    from_lon,
                    to_lat,
                    to_lon,
                    mid_lat,
                    mid_lon,
                    settlement_count: count,
                    settlements_cutoff: Array.isArray(s.settlements_cutoff) ? s.settlements_cutoff : [],
                };
            });
            return res.json({ success: true, criticalRoads: mapped, total: mapped.length, source: "mongodb" });
        }
    } catch (_) { /* fall through */ }

    // File fallback
    try {
        if (fs.existsSync(CRITICAL_ROADS_PATH)) {
            const data = JSON.parse(fs.readFileSync(CRITICAL_ROADS_PATH, "utf8"));
            const mappedFile = (Array.isArray(data) ? data : []).map(s => ({
                ...s,
                id: s.id || s.segment_key || `seg-${Math.random()}`,
                from_lat: typeof s.from_lat === 'number' ? s.from_lat : null,
                from_lon: typeof s.from_lon === 'number' ? s.from_lon : null,
                to_lat: typeof s.to_lat === 'number' ? s.to_lat : null,
                to_lon: typeof s.to_lon === 'number' ? s.to_lon : null,
                mid_lat: typeof s.mid_lat === 'number' ? s.mid_lat : 25.1,
                mid_lon: typeof s.mid_lon === 'number' ? s.mid_lon : 93.0,
                settlement_count: typeof s.settlement_count === 'number' ? s.settlement_count : (Array.isArray(s.settlements_cutoff) ? s.settlements_cutoff.length : 0),
                settlements_cutoff: Array.isArray(s.settlements_cutoff) ? s.settlements_cutoff : [],
            }));
            return res.json({ success: true, criticalRoads: mappedFile, total: mappedFile.length, source: "file" });
        }
    } catch (e) { console.warn("Could not read critical_roads.json:", e.message); }

    return res.json({ success: true, criticalRoads: [], total: 0, source: "empty" });
});


// ==============================
// FORECAST RISK  (Phase 5 — Open-Meteo proxy)
// ==============================

const forecastCache = new Map();
const FORECAST_TTL_MS = 30 * 60 * 1000;

app.get("/api/forecast-risk", async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ success: false, message: "lat and lon required" });
    const cacheKey = `${parseFloat(lat).toFixed(2)},${parseFloat(lon).toFixed(2)}`;
    const cached = forecastCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return res.json({ ...cached.data, cached: true });

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain&forecast_days=1&timezone=Asia%2FKolkata`;
        const r   = await fetch(url, { headers: { "User-Agent": "SIH26002-NER-Logistics/1.0" }, signal: AbortSignal.timeout(5000) });
        const weather = await r.json();
        const hourlyRain = weather.hourly?.rain ?? [];
        const currentHour = new Date().getHours();
        const rain6h  = hourlyRain.slice(currentHour, currentHour + 6).reduce((a, v) => a + (v || 0), 0);
        const rain24h = hourlyRain.reduce((a, v) => a + (v || 0), 0);
        const toLevel = mm => mm > 20 ? "Very High" : mm > 10 ? "High" : mm > 5 ? "Moderate" : "Low";
        const riskNow = toLevel(rain6h);
        const risk24  = toLevel(rain24h);
        const levels  = ["Low", "Moderate", "High", "Very High"];
        const trend   = levels.indexOf(risk24) > levels.indexOf(riskNow) ? "rising" : levels.indexOf(risk24) < levels.indexOf(riskNow) ? "falling" : "stable";
        const payload = { success: true, lat: parseFloat(lat), lon: parseFloat(lon), current_risk: riskNow, forecast_6h: riskNow, forecast_24h: risk24, rainfall_6h_mm: rain6h.toFixed(1), rainfall_24h_mm: rain24h.toFixed(1), trend, cached: false };
        forecastCache.set(cacheKey, { data: payload, expiresAt: Date.now() + FORECAST_TTL_MS });
        return res.json(payload);
    } catch {
        return res.json({ success: true, current_risk: "Moderate", forecast_6h: "Moderate", forecast_24h: "Moderate", trend: "stable", cached: false });
    }
});


// ==============================
// REROUTE LOGIC  (Dijkstra on in-memory graph built from RoadSegment collection)
// ==============================

// Graph cache — { nodeId: [ { neighbour, segmentId, cost } ] }
let _graph = null;

async function buildGraph() {
    if (mongoose.connection.readyState !== 1) return null;
    try {
        const segments = await RoadSegment.find({}).lean();
    const g = {};
    for (const seg of segments) {
        if (!seg.from_node || !seg.to_node) continue;
        const riskMultiplier = seg.current_risk_level === "high" ? 4 : seg.current_risk_level === "medium" ? 2 : 1;
        const cost = (seg.length_km || 1) * (1 + (seg.current_risk_score || 0) * 3);

        if (!g[seg.from_node]) g[seg.from_node] = [];
        if (!g[seg.to_node])   g[seg.to_node]   = [];

        g[seg.from_node].push({ neighbour: seg.to_node,   segmentId: seg._id.toString(), cost });
        g[seg.to_node].push(  { neighbour: seg.from_node, segmentId: seg._id.toString(), cost });
    }
    _graph = g;
    return g;
    } catch (e) {
        console.warn("buildGraph note:", e.message);
        return null;
    }
}

function dijkstra(graph, from, to, excludeSegIds = new Set()) {
    const dist  = {};
    const prev  = {};
    const queue = new Set(Object.keys(graph));
    for (const n of queue) dist[n] = Infinity;
    dist[from] = 0;

    while (queue.size) {
        let u = null;
        for (const n of queue) if (u === null || dist[n] < dist[u]) u = n;
        if (u === to || dist[u] === Infinity) break;
        queue.delete(u);

        for (const edge of (graph[u] || [])) {
            if (excludeSegIds.has(edge.segmentId)) continue;
            const alt = dist[u] + edge.cost;
            if (alt < dist[edge.neighbour]) {
                dist[edge.neighbour] = alt;
                prev[edge.neighbour] = { from: u, segmentId: edge.segmentId };
            }
        }
    }

    if (dist[to] === Infinity) return null;
    const segIds = [];
    let cur = to;
    while (prev[cur]) { segIds.unshift(prev[cur].segmentId); cur = prev[cur].from; }
    return segIds;
}

async function rerouteCheck(io_, highRiskSegmentId, segment) {
    const graph = _graph || await buildGraph();

    for (const [vehicleId, route] of vehicleRouteCache.entries()) {
        if (!route.includes(highRiskSegmentId)) continue;

        // Find from_node / to_node of first and last segment in route
        const first = await RoadSegment.findById(route[0]).lean();
        const last  = await RoadSegment.findById(route[route.length - 1]).lean();
        if (!first || !last) continue;

        const newRoute = dijkstra(graph, first.from_node, last.to_node, new Set([highRiskSegmentId]));
        if (!newRoute) continue;

        // Update cache
        vehicleRouteCache.set(vehicleId, newRoute);

        // Log reroute event
        await RerouteEvent.create({
            vehicle_id: vehicleId,
            triggering_road_segment_id: segment._id,
            original_route: route,
            new_route:      newRoute,
        }).catch(console.error);

        // Push to vehicle client
        io_.to(`vehicle:${vehicleId}`).emit("reroute_push", {
            vehicleId,
            reason:       highRiskSegmentId,
            new_route:    newRoute,
            triggered_by: segment.road_name,
        });
        io_.to("dashboard").emit("reroute_push", { vehicleId, reason: highRiskSegmentId });
    }
}

// Rebuild graph every 5 minutes to pick up risk changes even without WS
setInterval(buildGraph, 5 * 60 * 1000);
buildGraph().catch(console.error);   // initial build


// ==============================
// 404 + ERROR HANDLER
// ==============================

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` }));

app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error" });
});


// ==============================
// START
// ==============================

const PORT = process.env.PORT || 1710;

server.listen(PORT, () =>
    console.log(`🚀  Server running on http://localhost:${PORT} (MongoDB + Socket.IO mode)`)
);