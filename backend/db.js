"use strict";
/**
 * db.js — MongoDB connection via Mongoose
 *
 * Usage:  require('./db')   (side-effectful — connects once)
 *
 * Exits the process on connection failure so the server never starts
 * silently with a broken database.
 */

const mongoose = require("mongoose");

// Accept both MONGODB_URI (new standard) and the legacy MONGO_URL used by
// the existing seed scripts in backend/scripts/
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!MONGODB_URI) {
    console.error("❌  MONGODB_URI is not set in .env — cannot start server.");
    process.exit(1);
}

mongoose.set("strictQuery", false);

mongoose
    .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000, // fail fast — 10 s
        socketTimeoutMS:          45000,
    })
    .then(() => {
        console.log(`✅  MongoDB connected: ${mongoose.connection.host}`);
    })
    .catch((err) => {
        console.error("❌  MongoDB connection failed:", err.message);
        process.exit(1);
    });

mongoose.connection.on("disconnected", () =>
    console.warn("⚠  MongoDB disconnected — reconnecting…")
);

module.exports = mongoose.connection;
