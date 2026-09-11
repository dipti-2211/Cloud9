/**
 * seedDemoVehicles.js — Seed 5 IN_TRANSIT vehicles across NER corridors
 * Each is set to routeProgress 0.4 (stationary mid-route for demo).
 *
 * Run: npm --prefix backend run seed:demo-vehicles
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config();

const dns = require("dns");
try { dns.setServers(["8.8.8.8", "8.8.4.4"]); } catch {}

const mongoose = require("mongoose");
const Vehicle  = require("../models/Vehicle");

// Helper: interpolate a position at fraction t along [lat,lon] waypoints
function interpolate(waypoints, t) {
  if (!waypoints.length) return waypoints[0];
  const idx = Math.min(Math.floor(t * (waypoints.length - 1)), waypoints.length - 2);
  const frac = (t * (waypoints.length - 1)) - idx;
  const a = waypoints[idx], b = waypoints[idx + 1];
  return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
}

const DEMO_VEHICLES = [
  {
    vehicleNumber: "AS-01-T-0001",
    vehicleType:   "TRUCK",
    cargoType:     "Vaccines (Refrigerated)",
    priority:      "CRITICAL",
    status:        "IN_TRANSIT",
    source:        "Guwahati Hub",
    destination:   "Shillong Medical Station",
    routeWaypoints: [
      [26.1445, 91.7362],  // Guwahati
      [26.0500, 91.8000],
      [25.9000, 91.8500],
      [25.7500, 91.9000],
      [25.5788, 91.8933],  // Shillong
    ],
    routeProgress: 0.4,
  },
  {
    vehicleNumber: "AS-02-V-0104",
    vehicleType:   "VAN",
    cargoType:     "Medical Kits",
    priority:      "CRITICAL",
    status:        "IN_TRANSIT",
    source:        "Silchar Depot",
    destination:   "Imphal Hospital",
    routeWaypoints: [
      [24.8170, 92.7979],  // Silchar
      [24.8500, 93.1000],
      [24.8200, 93.4500],
      [24.8170, 93.9368],  // Imphal
    ],
    routeProgress: 0.4,
  },
  {
    vehicleNumber: "NL-03-T-0077",
    vehicleType:   "TRUCK",
    cargoType:     "Relief Supplies",
    priority:      "HIGH",
    status:        "IN_TRANSIT",
    source:        "Dimapur Logistics Center",
    destination:   "Kohima District HQ",
    routeWaypoints: [
      [25.9074, 93.7274],  // Dimapur
      [25.8500, 93.8000],
      [25.7500, 93.9000],
      [25.6747, 94.1077],  // Kohima
    ],
    routeProgress: 0.4,
  },
  {
    vehicleNumber: "AR-04-T-0212",
    vehicleType:   "TRUCK",
    cargoType:     "Food Rations",
    priority:      "HIGH",
    status:        "IN_TRANSIT",
    source:        "Tezpur Supply Base",
    destination:   "Itanagar Civil Hospital",
    routeWaypoints: [
      [26.6338, 92.8000],  // Tezpur
      [26.8000, 93.2000],
      [27.0000, 93.6000],
      [27.1024, 93.6168],  // Itanagar
    ],
    routeProgress: 0.4,
  },
  {
    vehicleNumber: "MZ-05-V-0039",
    vehicleType:   "VAN",
    cargoType:     "Medicines",
    priority:      "MEDIUM",
    status:        "IN_TRANSIT",
    source:        "Dibrugarh Medical Store",
    destination:   "Aizawl Civil Hospital",
    routeWaypoints: [
      [27.4728, 94.9120],  // Dibrugarh
      [26.5000, 94.5000],
      [25.0000, 93.5000],
      [23.7271, 92.7176],  // Aizawl
    ],
    routeProgress: 0.4,
  },
];

const seed = async () => {
  try {
    const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ner_logistics";
    await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 8000, socketTimeoutMS: 30000 });
    console.log("\nConnected to MongoDB");

    for (const v of DEMO_VEHICLES) {
      // Compute current position at routeProgress 0.4
      const pos = interpolate(v.routeWaypoints, v.routeProgress);
      const currentLocation = { type: "Point", coordinates: [pos[1], pos[0]] }; // [lon, lat]

      const existing = await Vehicle.findOne({ vehicleNumber: v.vehicleNumber });
      if (existing) {
        await Vehicle.updateOne({ vehicleNumber: v.vehicleNumber }, {
          source:          v.source,
          destination:     v.destination,
          routeWaypoints:  v.routeWaypoints,
          routeProgress:   v.routeProgress,
          currentLocation,
          status:          "IN_TRANSIT",
        });
        console.log(`  ↺ Updated ${v.vehicleNumber} — ${v.source} → ${v.destination}`);
        continue;
      }
      await Vehicle.create({ ...v, currentLocation });
      console.log(`  ✓ Created ${v.vehicleNumber} — ${v.source} → ${v.destination}`);
    }

    console.log("\nSeeding complete.\n");
    process.exit(0);
  } catch (err) {
    console.error("Seed error:", err.message);
    process.exit(1);
  }
};

seed();
