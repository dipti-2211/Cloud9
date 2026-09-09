require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const User     = require("../models/User");

// ── Demo accounts to seed ──────────────────────────────────────────────────
const DEMO_USERS = [
  {
    userId:       "OFC-1042",
    password:     "demo1234",
    role:         "FIELD_OFFICER",
    accountStatus:"APPROVED",
    firstName:    "Rajesh",
    lastName:     "Kumar",
    email:        "rajesh.kumar@ner-logistics.gov.in",
    mobileNumber: "+91-9876543210",
    employeeId:   "FO-NER-1042",
    department:   "Road Safety & Logistics",
    designation:  "Senior Field Officer",
    office:       "Dima Hasao District Headquarters",
    state:        "Assam",
    district:     "Dima Hasao",
    postingLocation: "Haflong Command Post",
  },
  {
    userId:       "VOP-2317",
    password:     "demo1234",
    role:         "VEHICLE_OPERATOR",
    accountStatus:"APPROVED",
    firstName:    "Priya",
    lastName:     "Devi",
    email:        "priya.devi@ner-logistics.gov.in",
    mobileNumber: "+91-9988776655",
    employeeId:   "VO-NER-2317",
    department:   "Fleet Operations",
    designation:  "Vehicle Operator — Grade II",
    licenseNumber:"AS-02-2021-0048723",
    vehicleRegNumber: "AS-02-T-0056",
    vehicleType:  "Refrigerated Truck",
    assignedRoute:"Guwahati Hub → Shillong Medical Station",
    state:        "Assam",
    district:     "Kamrup",
    postingLocation: "Guwahati Central Depot",
  },
];

const seed = async () => {
  try {
    const MONGO_URL =
      process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ner_logistics";

    await mongoose.connect(MONGO_URL);
    console.log("\nConnected to MongoDB:", MONGO_URL);

    for (const demo of DEMO_USERS) {
      const existing = await User.findOne({ userId: demo.userId });
      if (existing) {
        console.log(`⚠  ${demo.userId} already exists — skipping.`);
        continue;
      }

      const { password, ...rest } = demo;
      const passwordHash = await bcrypt.hash(password, 10);

      await User.create({ ...rest, passwordHash });

      console.log(`\n✓ Created ${demo.role}:`);
      console.log(`  User ID  : ${demo.userId}`);
      console.log(`  Password : ${password}`);
      console.log(`  Name     : ${demo.firstName} ${demo.lastName}`);
      console.log(`  Status   : ${demo.accountStatus}`);
    }

    console.log("\n✅ Demo accounts seeded successfully.\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seed();
