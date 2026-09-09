require("dotenv").config();

const dns =
    require("dns");

dns.setServers([
    "8.8.8.8",
    "8.8.4.4"
]);

const express =
    require("express");

const mongoose =
    require("mongoose");

const cors =
    require("cors");

const cookieParser =
    require("cookie-parser");

const helmet =
    require("helmet");


// ==============================
// ROUTES
// ==============================

const authRoutes =
    require("./routes/authRoutes");

const roadRoutes =
    require("./routes/roadRoutes");

const vehicleRoutes =
    require("./routes/vehicleRoutes");

const deliveryRoutes =
    require("./routes/deliveryRoutes");

const incidentRoutes =
    require("./routes/incidentRoutes");

const alertRoutes =
    require("./routes/alertRoutes");

const settingRoutes =
    require("./routes/settingRoutes");

const landslideRoutes =
    require("./routes/landslideRoutes");

const routeRiskRoutes =
    require("./routes/routeRiskRoutes");

const geocodeRoutes =
    require("./routes/geocodeRoutes");

const errorsController =
    require("./controllers/errors");


// ==============================
// APP
// ==============================

const app =
    express();


// ==============================
// SECURITY
// ==============================

app.use(
    helmet()
);


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

        origin: function (
            origin,
            callback
        ) {

            if (
                !origin ||
                allowedOrigins.includes(origin) ||
                /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
            ) {

                return callback(
                    null,
                    true
                );

            }


            return callback(
                new Error(
                    "Not allowed by CORS"
                )
            );

        },

        credentials:
            true

    })
);


// ==============================
// REQUEST MIDDLEWARE
// ==============================

app.use(
    express.json({
        limit: "2mb"
    })
);

app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    cookieParser()
);


// ==============================
// ROOT
// ==============================

app.get(
    "/",
    (req, res) => {

        res.status(200).json({

            success:
                true,

            message:
                "SIH26002 Logistics Intelligence Backend is running"

        });

    }
);


// ==============================
// HEALTH CHECK
// ==============================

app.get(
    "/health",
    (req, res) => {

        res.status(200).json({

            success:
                true,

            message:
                "Backend is healthy"

        });

    }
);


// ==============================
// ROUTES
// ==============================

app.use(
    "/api/auth",
    authRoutes
);

app.use(
    "/api/roads",
    roadRoutes
);

app.use(
    "/api/vehicles",
    vehicleRoutes
);

app.use(
    "/api/deliveries",
    deliveryRoutes
);

app.use(
    "/api/incidents",
    incidentRoutes
);

app.use(
    "/api/alerts",
    alertRoutes
);

app.use(
    "/api/settings",
    settingRoutes
);

app.use(
    "/api/landslide",
    landslideRoutes
);

app.use(
    "/api/route-risk",
    routeRiskRoutes
);

app.use(
    "/api/geocode",
    geocodeRoutes
);


// ==============================
// 404
// ==============================

app.use(
    errorsController.pageNotFound
);


// ==============================
// ERROR HANDLER
// ==============================

app.use(
    errorsController.handleError
);


// ==============================
// DATABASE + SERVER
// ==============================

const PORT =
    process.env.PORT ||
    1710;

const MONGO_URL =
    process.env.MONGO_URL ||
    "mongodb://127.0.0.1:27017/ner_logistics";

const connectAndStart = async () => {
    try {
        await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 2000 });
        console.log("Connected to MongoDB at", MONGO_URL);
    } catch (err) {
        if (MONGO_URL.includes("127.0.0.1") || MONGO_URL.includes("localhost")) {
            console.log("Local MongoDB not detected on port 27017. Starting embedded MongoDB with persistence...");
            try {
                const fs = require("fs");
                const path = require("path");
                const { MongoMemoryServer } = require("mongodb-memory-server");
                const dbPath = path.resolve(__dirname, ".mongodb_data");
                fs.mkdirSync(dbPath, { recursive: true });
                const mongod = await MongoMemoryServer.create({
                    instance: {
                        port: 27017,
                        dbPath,
                        storageEngine: "wiredTiger"
                    }
                });
                console.log("Embedded MongoDB started on", mongod.getUri());
                await mongoose.connect(MONGO_URL);
                console.log("Connected to embedded MongoDB");
            } catch (innerErr) {
                console.error("Failed to start embedded MongoDB:", innerErr);
                process.exit(1);
            }
        } else {
            console.error("Error while connecting to MongoDB:", err);
            process.exit(1);
        }
    }

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
};

connectAndStart();