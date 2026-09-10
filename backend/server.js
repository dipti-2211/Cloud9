require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express      = require("express");
const cors         = require("cors");
const cookieParser = require("cookie-parser");
const helmet       = require("helmet");
const bcrypt       = require("bcryptjs");
const jwt          = require("jsonwebtoken");

// ==============================
// IN-MEMORY USER STORE (No MongoDB needed for prototype)
// ==============================

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_ner_logistics_2026";

// Pre-hashed passwords computed at startup
let USERS = [];

const seedUsers = async () => {
    USERS = [
        {
            _id: "000000000000000000000001",
            userId: "admin",
            passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10),
            role: "ADMIN",
            accountStatus: "APPROVED",
            firstName: "System",
            lastName: "Administrator",
            email: process.env.ADMIN_EMAIL || "admin@example.com",
            mobileNumber: ""
        },
        {
            _id: "000000000000000000000002",
            userId: "OFC-1042",
            passwordHash: await bcrypt.hash("demo1234", 10),
            role: "FIELD_OFFICER",
            accountStatus: "APPROVED",
            firstName: "Rajesh",
            lastName: "Kumar",
            email: "rajesh.kumar@ner-logistics.gov.in",
            mobileNumber: "+91-9876543210",
            employeeId: "FO-NER-1042",
            department: "Road Safety & Logistics",
            designation: "Senior Field Officer",
            office: "Dima Hasao District Headquarters",
            state: "Assam",
            district: "Dima Hasao",
            postingLocation: "Haflong Command Post"
        },
        {
            _id: "000000000000000000000003",
            userId: "VOP-2317",
            passwordHash: await bcrypt.hash("demo1234", 10),
            role: "VEHICLE_OPERATOR",
            accountStatus: "APPROVED",
            firstName: "Priya",
            lastName: "Devi",
            email: "priya.devi@ner-logistics.gov.in",
            mobileNumber: "+91-9988776655",
            employeeId: "VO-NER-2317",
            licenseNumber: "AS-02-2021-0048723",
            vehicleRegNumber: "AS-02-T-0056",
            vehicleType: "Refrigerated Truck",
            assignedRoute: "Guwahati Hub → Shillong Medical Station",
            state: "Assam",
            district: "Kamrup",
            postingLocation: "Guwahati Central Depot"
        }
    ];
    console.log("✅ In-memory users seeded: admin, OFC-1042, VOP-2317");
};

// ==============================
// MOCK DATA
// ==============================

const mockVehicles = [
    { _id: "v1", vehicleId: "AS-01-T-0001", registrationNumber: "AS-01-T-0001", vehicleType: "Heavy Truck", driverName: "Aman Sharma", status: "IN_TRANSIT", currentLocation: { coordinates: [91.7362, 26.1445] }, district: "Kamrup", cargo: "Medical Supplies", lastUpdated: new Date() },
    { _id: "v2", vehicleId: "AS-02-V-0104", registrationNumber: "AS-02-V-0104", vehicleType: "Van", driverName: "Priya Devi", status: "IN_TRANSIT", currentLocation: { coordinates: [91.8933, 25.5744] }, district: "Kamrup Metropolitan", cargo: "Food Grain", lastUpdated: new Date() },
    { _id: "v3", vehicleId: "AS-03-B-0022", registrationNumber: "AS-03-B-0022", vehicleType: "Bus", driverName: "Ravi Das", status: "IDLE", currentLocation: { coordinates: [92.7376, 24.8333] }, district: "Cachar", cargo: "Passengers", lastUpdated: new Date() },
    { _id: "v4", vehicleId: "MN-01-T-0077", registrationNumber: "MN-01-T-0077", vehicleType: "Heavy Truck", driverName: "Leila Thoudam", status: "DELAYED", currentLocation: { coordinates: [93.9368, 24.8170] }, district: "Imphal West", cargo: "Construction Material", lastUpdated: new Date() }
];

const mockRoads = [
    { _id: "r1", roadId: "NH-37", name: "NH-37 Guwahati-Shillong", status: "OPEN", district: "Kamrup", riskLevel: "LOW", description: "National Highway connecting Guwahati to Shillong" },
    { _id: "r2", roadId: "NH-40", name: "NH-40 Shillong-Silchar", status: "PARTIALLY_BLOCKED", district: "Dima Hasao", riskLevel: "HIGH", description: "Landslide reported at km 142" },
    { _id: "r3", roadId: "SH-5", name: "SH-5 Haflong Road", status: "BLOCKED", district: "Dima Hasao", riskLevel: "CRITICAL", description: "Road washed out due to heavy rainfall" },
    { _id: "r4", roadId: "NH-2", name: "NH-2 Imphal-Jiribam", status: "OPEN", district: "Imphal West", riskLevel: "MODERATE", description: "Operational with caution" }
];

const mockAlerts = [
    { _id: "a1", type: "LANDSLIDE", severity: "CRITICAL", message: "Very High landslide risk (94.5%) detected at Near Retzol, Haflong", location: { lat: 25.1101, lon: 92.9988 }, district: "Dima Hasao", timestamp: new Date(Date.now() - 2*60*1000), acknowledged: false },
    { _id: "a2", type: "LANDSLIDE", severity: "HIGH", message: "Historical landslide record: Very High risk (100%) at Near Chhota Kapurchhara", location: { lat: 24.95, lon: 92.85 }, district: "Cachar", timestamp: new Date(Date.now() - 74*60*1000), acknowledged: false },
    { _id: "a3", type: "FLOOD", severity: "MODERATE", message: "Flood risk elevated near Barak River basin", location: { lat: 24.8, lon: 92.7 }, district: "Cachar", timestamp: new Date(Date.now() - 3*60*60*1000), acknowledged: true },
    { _id: "a4", type: "ROAD_BLOCK", severity: "HIGH", message: "Road blocked on NH-40 km 142 due to landslide debris", location: { lat: 25.3, lon: 92.6 }, district: "Dima Hasao", timestamp: new Date(Date.now() - 60*60*1000), acknowledged: false }
];

const mockIncidents = [
    { _id: "i1", incidentId: "INC-001", type: "LANDSLIDE", severity: "HIGH", description: "Landslide blocking NH-40 near Maibong", location: { lat: 25.3, lon: 92.6 }, district: "Dima Hasao", status: "ACTIVE", reportedAt: new Date(Date.now() - 2*60*60*1000) },
    { _id: "i2", incidentId: "INC-002", type: "VEHICLE_BREAKDOWN", severity: "MODERATE", description: "Heavy truck breakdown on SH-5", location: { lat: 25.1, lon: 93.0 }, district: "Dima Hasao", status: "ACTIVE", reportedAt: new Date(Date.now() - 45*60*1000) },
    { _id: "i3", incidentId: "INC-003", type: "FLOOD", severity: "LOW", description: "Minor flooding on approach road to Silchar", location: { lat: 24.8, lon: 92.8 }, district: "Cachar", status: "RESOLVED", reportedAt: new Date(Date.now() - 5*60*60*1000) }
];

const mockDeliveries = [
    { _id: "d1", deliveryId: "DEL-001", vehicleId: "AS-01-T-0001", cargo: "Medical Supplies", origin: "Guwahati Central Depot", destination: "Shillong Medical Station", status: "IN_TRANSIT", eta: new Date(Date.now() + 3*60*60*1000) },
    { _id: "d2", deliveryId: "DEL-002", vehicleId: "AS-02-V-0104", cargo: "Food Grain", origin: "Silchar Depot", destination: "Haflong Distribution Centre", status: "DELAYED", eta: new Date(Date.now() + 6*60*60*1000) },
    { _id: "d3", deliveryId: "DEL-003", vehicleId: "MN-01-T-0077", cargo: "Construction Material", origin: "Imphal Depot", destination: "Moreh Border Post", status: "COMPLETED", eta: new Date(Date.now() - 1*60*60*1000) }
];

// ==============================
// APP
// ==============================

const app = express();

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (/\.vercel\.app$/.test(origin) || /\.onrender\.com$/.test(origin) ||
            /\.railway\.app$/.test(origin) || /\.netlify\.app$/.test(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true
}));

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// ==============================
// AUTH HELPERS
// ==============================

const createToken = (user) => jwt.sign(
    { id: user._id, userId: user.userId, role: user.role },
    JWT_SECRET,
    { expiresIn: "1d" }
);

const verifyToken = (req) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) return null;
    try { return jwt.verify(header.split(" ")[1], JWT_SECRET); } catch { return null; }
};

const normalizeRole = (role) => {
    if (["admin", "Admin", "ADMIN"].includes(role)) return "ADMIN";
    if (["officer", "Field Officer", "FIELD_OFFICER"].includes(role)) return "FIELD_OFFICER";
    if (["driver", "vehicle-driver", "Vehicle Operator", "VEHICLE_OPERATOR"].includes(role)) return "VEHICLE_OPERATOR";
    return null;
};


// ==============================
// ROOT / HEALTH
// ==============================

app.get("/", (req, res) => res.json({ success: true, message: "SIH26002 Logistics Intelligence Backend is running" }));
app.get("/health", (req, res) => res.json({ success: true, message: "Backend is healthy" }));


// ==============================
// AUTH ROUTES
// ==============================

// POST /api/auth/login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { userId, password, role } = req.body;
        if (!userId || !password || !role) {
            return res.status(400).json({ success: false, message: "userId, password and role are required" });
        }

        const normalizedRole = normalizeRole(role);
        if (!normalizedRole) return res.status(400).json({ success: false, message: "Invalid user role" });

        const user = USERS.find(u => u.userId === userId.trim() && u.role === normalizedRole);
        if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });
        if (user.accountStatus !== "APPROVED") return res.status(403).json({ success: false, message: "Account not approved" });

        const match = await bcrypt.compare(password, user.passwordHash);
        if (!match) return res.status(401).json({ success: false, message: "Invalid credentials" });

        const token = createToken(user);
        const { passwordHash, ...safeUser } = user;

        res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", maxAge: 86400000 });
        return res.json({ success: true, message: "Login successful", token, user: { id: user._id, userId: user.userId, role: user.role, firstName: user.firstName, lastName: user.lastName, email: user.email, accountStatus: user.accountStatus } });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// GET /api/auth/me
app.get("/api/auth/me", (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded) return res.status(401).json({ success: false, message: "Unauthorized" });
    const user = USERS.find(u => u._id === decoded.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    const { passwordHash, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    return res.json({ success: true, message: "Logged out" });
});

// POST /api/auth/register (Admin creates new users — stored in memory for session)
app.post("/api/auth/register", async (req, res) => {
    try {
        const decoded = verifyToken(req);
        if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });

        const { userId, password, role, firstName, lastName, email, ...rest } = req.body;
        if (!userId || !password || !role) return res.status(400).json({ success: false, message: "userId, password, role are required" });

        const normalizedRole = normalizeRole(role);
        if (!normalizedRole) return res.status(400).json({ success: false, message: "Invalid role" });
        if (USERS.find(u => u.userId === userId)) return res.status(409).json({ success: false, message: "User ID already exists" });

        const newUser = {
            _id: Date.now().toString(),
            userId,
            passwordHash: await bcrypt.hash(password, 10),
            role: normalizedRole,
            accountStatus: "APPROVED",
            firstName: firstName || "",
            lastName: lastName || "",
            email: email || "",
            ...rest
        };
        USERS.push(newUser);
        const { passwordHash, ...safeUser } = newUser;
        return res.status(201).json({ success: true, message: "User registered", user: safeUser });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// POST /api/auth/register-officer (alias — admin only, delegates to register)
app.post("/api/auth/register-officer", async (req, res) => {
    req.body.role = req.body.role || "Field Officer";
    // Re-use the same handler logic
    try {
        const decoded = verifyToken(req);
        if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
        const { userId, password, role, firstName, lastName, email, ...rest } = req.body;
        if (!userId || !password) return res.status(400).json({ success: false, message: "userId and password are required" });
        if (USERS.find(u => u.userId === userId)) return res.status(409).json({ success: false, message: "User ID already exists" });
        const newUser = {
            _id: Date.now().toString(), userId,
            passwordHash: await bcrypt.hash(password, 10),
            role: "FIELD_OFFICER", accountStatus: "APPROVED",
            firstName: firstName || "", lastName: lastName || "", email: email || "", ...rest
        };
        USERS.push(newUser);
        const { passwordHash, ...safeUser } = newUser;
        return res.status(201).json({ success: true, message: "Field officer registered", user: safeUser });
    } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
});

// POST /api/auth/register-operator (alias — admin only, delegates to register)
app.post("/api/auth/register-operator", async (req, res) => {
    try {
        const decoded = verifyToken(req);
        if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
        const { userId, password, role, firstName, lastName, email, ...rest } = req.body;
        if (!userId || !password) return res.status(400).json({ success: false, message: "userId and password are required" });
        if (USERS.find(u => u.userId === userId)) return res.status(409).json({ success: false, message: "User ID already exists" });
        const newUser = {
            _id: Date.now().toString(), userId,
            passwordHash: await bcrypt.hash(password, 10),
            role: "VEHICLE_OPERATOR", accountStatus: "APPROVED",
            firstName: firstName || "", lastName: lastName || "", email: email || "", ...rest
        };
        USERS.push(newUser);
        const { passwordHash, ...safeUser } = newUser;
        return res.status(201).json({ success: true, message: "Vehicle operator registered", user: safeUser });
    } catch (err) { return res.status(500).json({ success: false, message: "Server error" }); }
});


// GET /api/auth/users (Admin — list all users)
app.get("/api/auth/users", (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
    const safe = USERS.map(({ passwordHash, ...u }) => u);
    return res.json({ success: true, users: safe, total: safe.length });
});

// GET /api/auth/pending — alias for backwards compat
app.get("/api/auth/pending", (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
    const safe = USERS.map(({ passwordHash, ...u }) => u);
    return res.json({ success: true, users: safe, data: safe, total: safe.length });
});

// PATCH /api/auth/users/:userId/approve
app.patch("/api/auth/users/:userId/approve", (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
    const user = USERS.find(u => u.userId === req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.accountStatus = "APPROVED";
    const { passwordHash, ...safe } = user;
    return res.json({ success: true, user: safe });
});

// PATCH /api/auth/users/:userId/reject
app.patch("/api/auth/users/:userId/reject", (req, res) => {
    const decoded = verifyToken(req);
    if (!decoded || decoded.role !== "ADMIN") return res.status(403).json({ success: false, message: "Admin only" });
    const user = USERS.find(u => u.userId === req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    user.accountStatus = "REJECTED";
    const { passwordHash, ...safe } = user;
    return res.json({ success: true, user: safe });
});


// ==============================
// VEHICLES
// ==============================

app.get("/api/vehicles", (req, res) => res.json({ success: true, vehicles: mockVehicles, total: mockVehicles.length }));
app.get("/api/vehicles/:id", (req, res) => {
    const v = mockVehicles.find(v => v._id === req.params.id || v.vehicleId === req.params.id);
    if (!v) return res.status(404).json({ success: false, message: "Vehicle not found" });
    return res.json({ success: true, vehicle: v });
});
app.post("/api/vehicles", (req, res) => {
    const v = { _id: Date.now().toString(), ...req.body, lastUpdated: new Date() };
    mockVehicles.push(v);
    return res.status(201).json({ success: true, vehicle: v });
});
app.patch("/api/vehicles/:id", (req, res) => {
    const idx = mockVehicles.findIndex(v => v._id === req.params.id || v.vehicleId === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Not found" });
    mockVehicles[idx] = { ...mockVehicles[idx], ...req.body, lastUpdated: new Date() };
    return res.json({ success: true, vehicle: mockVehicles[idx] });
});


// ==============================
// ROADS
// ==============================

app.get("/api/roads", (req, res) => res.json({ success: true, roads: mockRoads, total: mockRoads.length }));
app.get("/api/roads/:id", (req, res) => {
    const r = mockRoads.find(r => r._id === req.params.id || r.roadId === req.params.id);
    if (!r) return res.status(404).json({ success: false, message: "Road not found" });
    return res.json({ success: true, road: r });
});
app.post("/api/roads", (req, res) => {
    const r = { _id: Date.now().toString(), ...req.body };
    mockRoads.push(r);
    return res.status(201).json({ success: true, road: r });
});
app.patch("/api/roads/:id", (req, res) => {
    const idx = mockRoads.findIndex(r => r._id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Not found" });
    mockRoads[idx] = { ...mockRoads[idx], ...req.body };
    return res.json({ success: true, road: mockRoads[idx] });
});


// ==============================
// ALERTS
// ==============================

app.get("/api/alerts", (req, res) => res.json({ success: true, alerts: mockAlerts, total: mockAlerts.length }));
app.post("/api/alerts", (req, res) => {
    const a = { _id: Date.now().toString(), ...req.body, timestamp: new Date(), acknowledged: false };
    mockAlerts.unshift(a);
    return res.status(201).json({ success: true, alert: a });
});
app.patch("/api/alerts/:id/acknowledge", (req, res) => {
    const a = mockAlerts.find(a => a._id === req.params.id);
    if (!a) return res.status(404).json({ success: false, message: "Not found" });
    a.acknowledged = true;
    return res.json({ success: true, alert: a });
});


// ==============================
// INCIDENTS
// ==============================

app.get("/api/incidents", (req, res) => res.json({ success: true, incidents: mockIncidents, total: mockIncidents.length }));
app.post("/api/incidents", (req, res) => {
    const i = { _id: Date.now().toString(), ...req.body, status: "ACTIVE", reportedAt: new Date() };
    mockIncidents.unshift(i);
    return res.status(201).json({ success: true, incident: i });
});
app.patch("/api/incidents/:id", (req, res) => {
    const idx = mockIncidents.findIndex(i => i._id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Not found" });
    mockIncidents[idx] = { ...mockIncidents[idx], ...req.body };
    return res.json({ success: true, incident: mockIncidents[idx] });
});


// ==============================
// DELIVERIES
// ==============================

app.get("/api/deliveries", (req, res) => res.json({ success: true, deliveries: mockDeliveries, total: mockDeliveries.length }));
app.post("/api/deliveries", (req, res) => {
    const d = { _id: Date.now().toString(), ...req.body, status: "PENDING" };
    mockDeliveries.push(d);
    return res.status(201).json({ success: true, delivery: d });
});
app.patch("/api/deliveries/:id", (req, res) => {
    const idx = mockDeliveries.findIndex(d => d._id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: "Not found" });
    mockDeliveries[idx] = { ...mockDeliveries[idx], ...req.body };
    return res.json({ success: true, delivery: mockDeliveries[idx] });
});


// ==============================
// SETTINGS
// ==============================

let settings = { alertThreshold: "HIGH", notificationsEnabled: true, autoRefreshInterval: 30 };
app.get("/api/settings", (req, res) => res.json({ success: true, settings }));
app.patch("/api/settings", (req, res) => { settings = { ...settings, ...req.body }; return res.json({ success: true, settings }); });


// ==============================
// LANDSLIDE / ROUTE RISK (Proxy to risk engine or return mock)
// ==============================

app.get("/api/landslide/risk", async (req, res) => {
    // Try forwarding to risk engine, fall back to mock
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ success: false, message: "lat and lon required" });
    try {
        const http = require("http");
        const riskUrl = `http://localhost:8000/predict?lat=${lat}&lon=${lon}`;
        http.get(riskUrl, (r) => {
            let data = "";
            r.on("data", c => data += c);
            r.on("end", () => {
                try { return res.json(JSON.parse(data)); } catch { return res.json({ risk_score: 0.45, risk_level: "MODERATE" }); }
            });
        }).on("error", () => res.json({ risk_score: Math.random() * 0.6 + 0.2, risk_level: "MODERATE", lat: parseFloat(lat), lon: parseFloat(lon) }));
    } catch {
        return res.json({ risk_score: 0.45, risk_level: "MODERATE", lat: parseFloat(lat), lon: parseFloat(lon) });
    }
});

app.post("/api/route-risk", (req, res) => {
    const { waypoints } = req.body;
    return res.json({
        success: true,
        overallRisk: "MODERATE",
        riskScore: 0.42,
        segments: (waypoints || []).map((wp, i) => ({ index: i, risk: "LOW", score: Math.random() * 0.4 })),
        recommendation: "Route is passable with caution. Monitor NH-40 for landslide updates."
    });
});


// ==============================
// GEOCODE (Forward + Reverse via Nominatim)
// ==============================

app.get("/api/geocode", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, message: "q is required" });
    try {
        const https = require("https");
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=in`;
        https.get(url, { headers: { "User-Agent": "SIH26002-NER-Logistics/1.0" } }, (r) => {
            let data = "";
            r.on("data", c => data += c);
            r.on("end", () => {
                try { return res.json(JSON.parse(data)); } catch { return res.json([]); }
            });
        }).on("error", () => res.json([]));
    } catch { return res.json([]); }
});

app.get("/api/geocode/reverse", async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ success: false, message: "lat and lon required" });
    try {
        const https = require("https");
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
        https.get(url, { headers: { "User-Agent": "SIH26002-NER-Logistics/1.0" } }, (r) => {
            let data = "";
            r.on("data", c => data += c);
            r.on("end", () => {
                try { return res.json(JSON.parse(data)); } catch { return res.json({}); }
            });
        }).on("error", () => res.json({}));
    } catch { return res.json({}); }
});



// ==============================
// CRITICAL ROADS (Phase 4)
// ==============================

const path    = require("path");
const fs      = require("fs");
const CRITICAL_ROADS_PATH = path.join(__dirname, "..", "risk-engine", "data", "critical_roads.json");

const CRITICAL_ROADS_MOCK = [
    { id: "Haflong--Dima Hasao HQ", road_name: "SH-5", from_node: "Haflong", to_node: "Dima Hasao HQ", length_km: 15, mid_lat: 25.138, mid_lon: 93.008, from_lat: 25.165, from_lon: 93.017, to_lat: 25.110, to_lon: 92.999, settlements_cutoff: ["Retzol Village", "Dima Hasao HQ Area"], settlement_count: 2, district: "Dima Hasao" },
    { id: "Silchar--Chhota Kapurchhara", road_name: "Forest Road", from_node: "Silchar", to_node: "Chhota Kapurchhara", length_km: 40, mid_lat: 24.886, mid_lon: 92.824, from_lat: 24.822, from_lon: 92.798, to_lat: 24.950, to_lon: 92.850, settlements_cutoff: ["Chhota Kapurchhara Town"], settlement_count: 1, district: "Cachar" },
    { id: "Haflong--Jatinga", road_name: "NH-40", from_node: "Haflong", to_node: "Jatinga", length_km: 20, mid_lat: 25.085, mid_lon: 92.959, from_lat: 25.165, from_lon: 93.017, to_lat: 25.005, to_lon: 92.900, settlements_cutoff: ["Jatinga Village"], settlement_count: 1, district: "Dima Hasao" },
];

app.get("/api/critical-roads", (req, res) => {
    try {
        if (fs.existsSync(CRITICAL_ROADS_PATH)) {
            const data = JSON.parse(fs.readFileSync(CRITICAL_ROADS_PATH, "utf8"));
            return res.json({ success: true, criticalRoads: data, total: data.length, source: "precomputed" });
        }
    } catch (e) {
        console.warn("Could not read critical_roads.json:", e.message);
    }
    return res.json({ success: true, criticalRoads: CRITICAL_ROADS_MOCK, total: CRITICAL_ROADS_MOCK.length, source: "mock" });
});


// ==============================
// FORECAST RISK (Phase 5 — Open-Meteo)
// ==============================

const forecastCache = new Map();
const FORECAST_TTL_MS = 30 * 60 * 1000;

app.get("/api/forecast-risk", async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ success: false, message: "lat and lon required" });
    const cacheKey = `${parseFloat(lat).toFixed(2)},${parseFloat(lon).toFixed(2)}`;
    const cached = forecastCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return res.json({ ...cached.data, cached: true });
    }
    try {
        const https = require("https");
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=rain&forecast_days=1&timezone=Asia%2FKolkata`;
        https.get(url, { headers: { "User-Agent": "SIH26002-NER-Logistics/1.0" } }, (r) => {
            let raw = "";
            r.on("data", c => raw += c);
            r.on("end", () => {
                try {
                    const weather = JSON.parse(raw);
                    const hourlyRain = weather.hourly?.rain ?? [];
                    const currentHour = new Date().getHours();
                    const rain6h  = hourlyRain.slice(currentHour, currentHour + 6).reduce((a, v) => a + (v || 0), 0);
                    const rain24h = hourlyRain.reduce((a, v) => a + (v || 0), 0);
                    const toLevel = mm => mm > 20 ? "Very High" : mm > 10 ? "High" : mm > 5 ? "Moderate" : "Low";
                    const riskNow = toLevel(rain6h); const risk24 = toLevel(rain24h);
                    const levels = ["Low","Moderate","High","Very High"];
                    const trend = levels.indexOf(risk24) > levels.indexOf(riskNow) ? "rising" : levels.indexOf(risk24) < levels.indexOf(riskNow) ? "falling" : "stable";
                    const payload = { success: true, lat: parseFloat(lat), lon: parseFloat(lon), current_risk: riskNow, forecast_6h: riskNow, forecast_24h: risk24, rainfall_6h_mm: rain6h.toFixed(1), rainfall_24h_mm: rain24h.toFixed(1), trend, cached: false };
                    forecastCache.set(cacheKey, { data: payload, expiresAt: Date.now() + FORECAST_TTL_MS });
                    return res.json(payload);
                } catch { return res.json({ success: true, current_risk: "Moderate", forecast_6h: "Moderate", forecast_24h: "Moderate", trend: "stable", cached: false }); }
            });
        }).on("error", () => res.json({ success: true, current_risk: "Moderate", forecast_6h: "Moderate", forecast_24h: "Moderate", trend: "stable", cached: false }));
    } catch { return res.json({ success: true, current_risk: "Moderate", forecast_6h: "Moderate", forecast_24h: "Moderate", trend: "stable", cached: false }); }
});


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

const start = async () => {
    await seedUsers();
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT} (No-DB prototype mode)`));
};

start();