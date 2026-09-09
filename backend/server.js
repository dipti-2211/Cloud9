require("dotenv").config();

const dns = require("dns");

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

const express      = require("express");
const mongoose     = require("mongoose");
const cors         = require("cors");
const cookieParser = require("cookie-parser");
const helmet       = require("helmet");


// ==============================
// ROUTES
// ==============================

const authRoutes      = require("./routes/authRoutes");
const roadRoutes      = require("./routes/roadRoutes");
const vehicleRoutes   = require("./routes/vehicleRoutes");
const deliveryRoutes  = require("./routes/deliveryRoutes");
const incidentRoutes  = require("./routes/incidentRoutes");
const alertRoutes     = require("./routes/alertRoutes");
const settingRoutes   = require("./routes/settingRoutes");
const landslideRoutes = require("./routes/landslideRoutes");
const routeRiskRoutes = require("./routes/routeRiskRoutes");
const geocodeRoutes   = require("./routes/geocodeRoutes");
const errorsController = require("./controllers/errors");


// ==============================
// APP
// ==============================

const app = express();


// ==============================
// SECURITY
// ==============================

app.use(helmet());


// ==============================
// CORS
// ==============================

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174"
].filter(Boolean);

app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (curl, Postman, server-to-server)
            if (!origin) return callback(null, true);
            // Localhost dev
            if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
            // Exact match against whitelist
            if (allowedOrigins.includes(origin)) return callback(null, true);
            // Production hosting platforms — Vercel, Render, Railway, Netlify
            if (
                /\.vercel\.app$/.test(origin) ||
                /\.onrender\.com$/.test(origin) ||
                /\.railway\.app$/.test(origin) ||
                /\.netlify\.app$/.test(origin)
            ) return callback(null, true);
            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true
    })
);


// ==============================
// REQUEST MIDDLEWARE
// ==============================

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// ==============================
// ROOT
// ==============================

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "SIH26002 Logistics Intelligence Backend is running"
    });
});


// ==============================
// HEALTH CHECK
// ==============================

app.get("/health", (req, res) => {
    res.status(200).json({ success: true, message: "Backend is healthy" });
});


// ==============================
// ROUTES
// ==============================

app.use("/api/auth",       authRoutes);
app.use("/api/roads",      roadRoutes);
app.use("/api/vehicles",   vehicleRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/incidents",  incidentRoutes);
app.use("/api/alerts",     alertRoutes);
app.use("/api/settings",   settingRoutes);
app.use("/api/landslide",  landslideRoutes);
app.use("/api/route-risk", routeRiskRoutes);
app.use("/api/geocode",    geocodeRoutes);


// ==============================
// 404
// ==============================

app.use(errorsController.pageNotFound);


// ==============================
// ERROR HANDLER
// ==============================

app.use(errorsController.handleError);


// ==============================
// DATABASE + SERVER
// ==============================

const PORT      = process.env.PORT      || 1710;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ner_logistics";

const connectAndStart = async () => {
    const isAtlas = MONGO_URL.includes("mongodb+srv") || MONGO_URL.includes("mongodb.net");

    try {
        await mongoose.connect(MONGO_URL, {
            serverSelectionTimeoutMS: isAtlas ? 10000 : 5000,
        });
        console.log("Connected to MongoDB:", isAtlas ? "Atlas (cloud)" : MONGO_URL);
    } catch (err) {
        // Only try embedded fallback for local URLs — never for Atlas
        if (!isAtlas && (MONGO_URL.includes("127.0.0.1") || MONGO_URL.includes("localhost"))) {
            console.log("Local MongoDB not detected on port 27017. Starting embedded MongoDB with persistence...");
            try {
                const fs   = require("fs");
                const path = require("path");
                const { MongoMemoryServer } = require("mongodb-memory-server");
                const dbPath = path.resolve(__dirname, ".mongodb_data");
                fs.mkdirSync(dbPath, { recursive: true });
                const mongod = await MongoMemoryServer.create({
                    instance: { port: 27017, dbPath, storageEngine: "wiredTiger" }
                });
                console.log("Embedded MongoDB started on", mongod.getUri());
                await mongoose.connect(MONGO_URL);
                console.log("Connected to embedded MongoDB");
            } catch (innerErr) {
                console.error("Failed to start embedded MongoDB:", innerErr);
                process.exit(1);
            }
        } else {
            console.error("Error connecting to MongoDB:", err.message);
            process.exit(1);
        }
    }

    // ── Auto-seed: create default accounts on fresh DB ─────────────────────
    // Runs on every fresh clone / cleared database.  Safe to leave in production:
    // if any User document exists at all, the block is skipped instantly.
    try {
        const User   = require("./models/User");
        const bcrypt = require("bcryptjs");

        const userCount = await User.countDocuments();
        if (userCount === 0) {
            console.log("📦 Fresh database detected — auto-seeding default accounts…");

            await User.create({
                userId:        process.env.ADMIN_USER_ID || "admin",
                passwordHash:  await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10),
                role:          "ADMIN",
                accountStatus: "APPROVED",
                firstName:     "System",
                lastName:      "Administrator",
                email:         process.env.ADMIN_EMAIL || "admin@example.com",
                mobileNumber:  ""
            });
            console.log("  ✓ Admin created       — ID: admin    / Password: admin123");

            await User.create({
                userId:          "OFC-1042",
                passwordHash:    await bcrypt.hash("demo1234", 10),
                role:            "FIELD_OFFICER",
                accountStatus:   "APPROVED",
                firstName:       "Rajesh",
                lastName:        "Kumar",
                email:           "rajesh.kumar@ner-logistics.gov.in",
                mobileNumber:    "+91-9876543210",
                employeeId:      "FO-NER-1042",
                department:      "Road Safety & Logistics",
                designation:     "Senior Field Officer",
                office:          "Dima Hasao District Headquarters",
                state:           "Assam",
                district:        "Dima Hasao",
                postingLocation: "Haflong Command Post"
            });
            console.log("  ✓ Field Officer       — ID: OFC-1042 / Password: demo1234");

            await User.create({
                userId:           "VOP-2317",
                passwordHash:     await bcrypt.hash("demo1234", 10),
                role:             "VEHICLE_OPERATOR",
                accountStatus:    "APPROVED",
                firstName:        "Priya",
                lastName:         "Devi",
                email:            "priya.devi@ner-logistics.gov.in",
                mobileNumber:     "+91-9988776655",
                employeeId:       "VO-NER-2317",
                department:       "Fleet Operations",
                designation:      "Vehicle Operator — Grade II",
                licenseNumber:    "AS-02-2021-0048723",
                vehicleRegNumber: "AS-02-T-0056",
                vehicleType:      "Refrigerated Truck",
                assignedRoute:    "Guwahati Hub → Shillong Medical Station",
                state:            "Assam",
                district:         "Kamrup",
                postingLocation:  "Guwahati Central Depot"
            });
            console.log("  ✓ Vehicle Operator    — ID: VOP-2317 / Password: demo1234");
            console.log("✅ Auto-seed complete.");
        }
    } catch (seedErr) {
        console.warn("⚠  Auto-seed skipped:", seedErr.message);
    }

    // ── Vehicle movement simulation ─────────────────────────────────────────
    // Coordinate-order contract (read before modifying!):
    //   routeWaypoints  stored as [[lat, lon], ...]  — business / Leaflet order
    //   interpolated position computed in [lat, lon] then swapped to [lon, lat] for GeoJSON Point
    //   Frontend reads currentLocation.coordinates as [lon, lat], re-swaps to [lat, lon] for Leaflet
    //
    // Pacing: +0.01 per 5 s tick → 100 ticks = 500 s ≈ 8 min full traversal.
    // Within 30 s a vehicle moves ~3% of its route — clearly visible on the map.
    // At 0 the route loops (wraps back to 0) for continuous demo movement.
    const Vehicle = require("./models/Vehicle");

    setInterval(async () => {
        try {
            const movingVehicles = await Vehicle.find({
                status: "IN_TRANSIT",
                $expr: { $gt: [{ $size: { $ifNull: ["$routeWaypoints", []] } }, 1] }
            }).lean();

            for (const v of movingVehicles) {
                const waypoints = v.routeWaypoints; // [[lat, lon], ...]
                if (!waypoints || waypoints.length < 2) continue;

                let progress = (v.routeProgress || 0) + 0.01;
                if (progress >= 1.0) progress = 0.0; // loop for continuous demo

                // Find the two surrounding waypoints and interpolate
                const totalSegments = waypoints.length - 1;
                const segIdx  = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
                const segFrac = (progress * totalSegments) - segIdx;

                // waypoints[i] = [lat, lon]
                const [lat1, lon1] = waypoints[segIdx];
                const [lat2, lon2] = waypoints[segIdx + 1];

                const interpLat = lat1 + (lat2 - lat1) * segFrac;
                const interpLon = lon1 + (lon2 - lon1) * segFrac;

                // GeoJSON Point MUST be [longitude, latitude].
                // For NER: lon ≈ 90–97, lat ≈ 22–28.
                // If you see a vehicle in the ocean, coordinates are transposed here.
                await Vehicle.updateOne(
                    { _id: v._id },
                    {
                        routeProgress: progress,
                        "currentLocation.type": "Point",
                        "currentLocation.coordinates": [interpLon, interpLat]  // [lon, lat] GeoJSON
                    }
                );
            }
        } catch (tickErr) {
            console.warn("Vehicle tick error:", tickErr.message);
        }
    }, 5000);

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

connectAndStart();