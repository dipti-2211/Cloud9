/**
 * seedDemoAlerts.js
 * -----------------
 * One-time script to seed the Alert collection with the 3 high-risk demo
 * locations from demoLocations.json.
 *
 * Source value "historical-record" distinguishes these from live events
 * ("map-click", "route-check") so future dashboards can filter them.
 *
 * Usage:
 *   node scripts/seedDemoAlerts.js
 *
 * Run once before the first demo.  Running again will add duplicates unless
 * you clear the collection first:
 *   node scripts/seedDemoAlerts.js --clear
 */

require("dotenv").config();

const path    = require("path");
const fs      = require("fs");
const mongoose = require("mongoose");

// demoLocations.json lives in frontend/vite-project/src/data/
const DATA_PATH = path.resolve(
  __dirname,
  "../../frontend/vite-project/src/data/demoLocations.json"
);

if (!fs.existsSync(DATA_PATH)) {
  console.error(`demoLocations.json not found at: ${DATA_PATH}`);
  console.error("Run risk-engine/scripts/generate_demo_locations.py first.");
  process.exit(1);
}

const demoLocations = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const riskyLocations = demoLocations.filter((loc) => loc.type === "risky");

// ── Mongoose model (inline — avoids circular import) ─────────────────────────
const AlertSchema = new mongoose.Schema({
  latitude:       { type: Number, required: true },
  longitude:      { type: Number, required: true },
  riskCategory:   { type: String, required: true },
  riskPercentage: { type: Number, required: true },
  message:        { type: String, required: true },
  source:         { type: String, default: "map-click" },
  createdAt:      { type: Date,   default: Date.now },
});

// ── connect & seed ────────────────────────────────────────────────────────────
const MONGO_URI =
  process.env.MONGO_URL ||
  process.env.DB_URL ||
  "mongodb://127.0.0.1:27017/ner_logistics";

console.log(`Connecting to MongoDB: ${MONGO_URI.replace(/\/\/[^@]+@/, "//***@")}`);

const seed = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("Connected.\n");

  // Reuse the Alert model if already registered (avoid OverwriteModelError)
  const Alert = mongoose.models.Alert || mongoose.model("Alert", AlertSchema);

  const clearFlag = process.argv.includes("--clear");
  if (clearFlag) {
    const removed = await Alert.deleteMany({ source: "historical-record" });
    console.log(`Cleared ${removed.deletedCount} historical-record alerts.\n`);
  }

  // Check for existing historical seeds to avoid duplicates
  const existing = await Alert.countDocuments({ source: "historical-record" });
  if (existing > 0 && !clearFlag) {
    console.warn(`⚠  Found ${existing} existing historical-record alert(s). Skipping seed.`);
    console.warn("   Run with --clear to replace them: node scripts/seedDemoAlerts.js --clear");
    await mongoose.disconnect();
    process.exit(0);
  }

  const docs = riskyLocations.map((loc) => ({
    latitude:       loc.lat,
    longitude:      loc.lon,
    riskCategory:   loc.riskCategory,
    riskPercentage: loc.riskPercentage,
    message:        `Historical landslide record: ${loc.riskCategory} risk (${loc.riskPercentage.toFixed(1)}%) at ${loc.name}`,
    source:         "historical-record",
    createdAt:      new Date(),
  }));

  const inserted = await Alert.insertMany(docs);
  console.log(`✓ Seeded ${inserted.length} historical-record alert(s):\n`);
  inserted.forEach((a) => {
    console.log(`  • [${a.riskCategory}] ${a.message}`);
  });

  console.log("\nDone. The Alerts page will now show these on first load.");
  await mongoose.disconnect();
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
