/**
 * seedDemoVehicles.js — Seed 2 IN_TRANSIT vehicles with routeWaypoints
 * so the vehicle movement simulation has something to animate.
 *
 * Run: npm --prefix backend run seed:demo-vehicles
 */
require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
const Vehicle  = require("../models/Vehicle");

const DEMO_VEHICLES = [
  {
    vehicleNumber: "AS-01-T-0001",
    vehicleType:   "TRUCK",
    cargoType:     "Vaccines (Refrigerated)",
    priority:      "CRITICAL",
    status:        "IN_TRANSIT",
    destination:   "Shillong Medical Station",
    // Waypoints: [lat, lon] — Guwahati → Shillong
    routeWaypoints: [
      [26.1445, 91.7362],
      [26.0500, 91.8000],
      [25.9000, 91.8500],
      [25.7500, 91.9000],
      [25.5788, 91.8933],
    ],
    routeProgress: 0.0,
    currentLocation: {
      type: "Point",
      coordinates: [91.7362, 26.1445],   // [lon, lat] GeoJSON
    },
  },
  {
    vehicleNumber: "AS-02-V-0104",
    vehicleType:   "VAN",
    cargoType:     "Medical Kits",
    priority:      "CRITICAL",
    status:        "IN_TRANSIT",
    destination:   "Imphal Hospital",
    // Waypoints: [lat, lon] — Silchar → Imphal
    routeWaypoints: [
      [24.8170, 92.7979],
      [24.8500, 93.1000],
      [24.8200, 93.4500],
      [24.8170, 93.9368],
    ],
    routeProgress: 0.0,
    currentLocation: {
      type: "Point",
      coordinates: [92.7979, 24.8170],  // [lon, lat] GeoJSON
    },
  },
];

const seed = async () => {
  try {
    const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ner_logistics";
    await mongoose.connect(MONGO_URL);
    console.log("\nConnected to MongoDB:", MONGO_URL);

    for (const v of DEMO_VEHICLES) {
      const existing = await Vehicle.findOne({ vehicleNumber: v.vehicleNumber });
      if (existing) {
        // Update waypoints in case the schema changed
        await Vehicle.updateOne({ vehicleNumber: v.vehicleNumber }, {
          routeWaypoints:    v.routeWaypoints,
          routeProgress:     0.0,
          currentLocation:   v.currentLocation,
          status:            "IN_TRANSIT",
        });
        console.log(`  ↺ Updated ${v.vehicleNumber} waypoints`);
        continue;
      }
      await Vehicle.create(v);
      console.log(`  ✓ Created ${v.vehicleNumber} — ${v.cargoType}`);
    }

    console.log("\n✅ Demo vehicles seeded.\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seed();
