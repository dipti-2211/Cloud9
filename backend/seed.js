"use strict";
/**
 * seed.js — populate MongoDB with demo road segments.
 *
 * Run once (or safely re-run — it is idempotent):
 *   node seed.js
 *
 * It reads the existing critical_roads.json and inserts each segment as a
 * RoadSegment document, then manually overrides risk levels on three of them
 * so the map immediately shows all three colours.
 */

require("dotenv").config();

const path     = require("path");
const fs       = require("fs");
const mongoose = require("mongoose");
const RoadSegment = require("./models/RoadSegment");

const CRITICAL_ROADS_PATH = path.join(
    __dirname, "..", "risk-engine", "data", "critical_roads.json"
);

// ── Synthetic segment attributes (slope / rainfall / historical risk) ──────
// These numbers are representative of NER hill roads; adjust after field data.
const SEGMENT_ATTRIBUTES = {
    "Haflong--Dima Hasao HQ":       { slope_deg: 32, avg_rainfall_mm_7d: 112, historical_risk_score: 0.78, current_risk_level: "high",   current_risk_score: 0.78 },
    "Silchar--Chhota Kapurchhara":  { slope_deg: 24, avg_rainfall_mm_7d: 88,  historical_risk_score: 0.61, current_risk_level: "high",   current_risk_score: 0.67 },
    "Dima Hasao HQ--Retzol":        { slope_deg: 18, avg_rainfall_mm_7d: 74,  historical_risk_score: 0.45, current_risk_level: "medium", current_risk_score: 0.45 },
    "Guwahati--Dimapur":            { slope_deg:  8, avg_rainfall_mm_7d: 52,  historical_risk_score: 0.18, current_risk_level: "low",    current_risk_score: 0.18 },
    "Silchar--Aizawl":              { slope_deg: 22, avg_rainfall_mm_7d: 95,  historical_risk_score: 0.52, current_risk_level: "medium", current_risk_score: 0.52 },
    "Lumding--Bokajan":             { slope_deg: 14, avg_rainfall_mm_7d: 60,  historical_risk_score: 0.28, current_risk_level: "low",    current_risk_score: 0.28 },
    "Jiribam--Imphal":              { slope_deg: 26, avg_rainfall_mm_7d: 105, historical_risk_score: 0.70, current_risk_level: "high",   current_risk_score: 0.70 },
    "Imphal--Moreh":                { slope_deg: 12, avg_rainfall_mm_7d: 48,  historical_risk_score: 0.20, current_risk_level: "low",    current_risk_score: 0.20 },
    "Bokajan--Diphu":               { slope_deg: 16, avg_rainfall_mm_7d: 65,  historical_risk_score: 0.35, current_risk_level: "medium", current_risk_score: 0.35 },
};

// ── Main ────────────────────────────────────────────────────────────────────

async function seed() {

    // 1. Connect
    const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
    if (!uri) {
        console.error("❌  MONGODB_URI not set in .env");
        process.exit(1);
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("✅  Connected to MongoDB");

    // 2. Load critical_roads.json
    if (!fs.existsSync(CRITICAL_ROADS_PATH)) {
        console.error("❌  critical_roads.json not found at:", CRITICAL_ROADS_PATH);
        process.exit(1);
    }
    const raw = JSON.parse(fs.readFileSync(CRITICAL_ROADS_PATH, "utf8"));

    // 3. Idempotency check — skip if demo segments already exist
    const existingCount = await RoadSegment.countDocuments({ is_demo: true });
    if (existingCount > 0) {
        console.log(`ℹ  ${existingCount} demo road segments already exist — skipping insert.`);
        console.log("   Delete them first (db.roadsegments.deleteMany({is_demo:true})) to re-seed.");
        await mongoose.disconnect();
        return;
    }

    // 4. Build documents
    const docs = raw.map((seg) => {
        const attrs = SEGMENT_ATTRIBUTES[seg.id] || {
            slope_deg: 15,
            avg_rainfall_mm_7d: 60,
            historical_risk_score: 0.25,
            current_risk_level: "low",
            current_risk_score: 0.25,
        };

        // GeoJSON coordinates: [longitude, latitude]
        const fromCoord = [seg.from_lon, seg.from_lat];
        const toCoord   = [seg.to_lon,   seg.to_lat];

        return {
            segment_key:  seg.id,
            road_name:    seg.road_name,
            from_node:    seg.from_node,
            to_node:      seg.to_node,
            length_km:    seg.length_km,
            mid_lat:      seg.mid_lat,
            mid_lon:      seg.mid_lon,
            district:     seg.district,
            settlements_cutoff: seg.settlements_cutoff || [],
            settlement_count:   seg.settlement_count   || 0,

            // GeoJSON LineString [lon, lat]
            geometry: {
                type: "LineString",
                coordinates: [fromCoord, toCoord],
            },

            ...attrs,

            historical_incident_count: 0,
            last_updated: new Date(),
            is_demo: true,
        };
    });

    // 5. Insert
    const inserted = await RoadSegment.insertMany(docs, { ordered: false });
    console.log(`✅  Inserted ${inserted.length} demo road segments.`);

    // 6. Print summary by risk level
    const counts = inserted.reduce((acc, d) => {
        acc[d.current_risk_level] = (acc[d.current_risk_level] || 0) + 1;
        return acc;
    }, {});
    console.log("   Risk level breakdown:", counts);

    await mongoose.disconnect();
    console.log("✅  Done — MongoDB disconnected.");
}

seed().catch((err) => {
    console.error("❌  Seed failed:", err.message);
    process.exit(1);
});
