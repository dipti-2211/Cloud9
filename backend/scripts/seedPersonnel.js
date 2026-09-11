/**
 * seedPersonnel.js
 * Seeds 3 Field Officers and 6 Vehicle Operators with 100% complete profile data,
 * generates portrait photo files in backend/uploads/, and ensures admin has proper name.
 */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Generate stylized SVG portrait
function createAvatarSvg(name, role, badgeColor, bgGradient1, bgGradient2, hairColor = "#1e293b", skinColor = "#e2a77a") {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradient1}"/>
      <stop offset="100%" stop-color="${bgGradient2}"/>
    </linearGradient>
    <linearGradient id="uniform" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${badgeColor}"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Background Circle -->
  <rect width="200" height="200" rx="100" fill="url(#bg)"/>

  <!-- Bust / Shoulders Uniform -->
  <path d="M 35 200 C 35 145, 60 135, 100 135 C 140 135, 165 145, 165 200 Z" fill="url(#uniform)" filter="url(#shadow)"/>
  
  <!-- Collar & Neck -->
  <polygon points="100,145 80,132 120,132" fill="#ffffff" opacity="0.9"/>
  <polygon points="100,158 90,132 110,132" fill="${badgeColor}"/>
  <rect x="90" y="112" width="20" height="24" rx="4" fill="${skinColor}"/>

  <!-- Head -->
  <ellipse cx="100" cy="85" rx="34" ry="40" fill="${skinColor}" filter="url(#shadow)"/>

  <!-- Hair -->
  <path d="M 66 80 C 66 50, 80 40, 100 40 C 120 40, 134 50, 134 80 C 130 65, 120 54, 100 54 C 80 54, 70 65, 66 80 Z" fill="${hairColor}"/>

  <!-- Ears -->
  <circle cx="66" cy="85" r="7" fill="${skinColor}"/>
  <circle cx="134" cy="85" r="7" fill="${skinColor}"/>

  <!-- Eyes & Eyebrows -->
  <ellipse cx="87" cy="82" rx="3.5" ry="4" fill="#0f172a"/>
  <ellipse cx="113" cy="82" rx="3.5" ry="4" fill="#0f172a"/>
  <circle cx="88" cy="80.5" r="1" fill="#ffffff"/>
  <circle cx="114" cy="80.5" r="1" fill="#ffffff"/>
  <path d="M 80 74 Q 87 71 94 74" stroke="${hairColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M 106 74 Q 113 71 120 74" stroke="${hairColor}" stroke-width="2.5" fill="none" stroke-linecap="round"/>

  <!-- Nose & Smile -->
  <path d="M 100 83 L 98 92 L 102 92" stroke="#b47854" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M 92 101 Q 100 108 108 101" stroke="#8b4513" stroke-width="2.2" fill="none" stroke-linecap="round"/>

  <!-- Badge / ID Label Bar -->
  <rect x="45" y="172" width="110" height="20" rx="10" fill="#0f172a" opacity="0.85"/>
  <text x="100" y="186" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="800" fill="#38bdf8" letter-spacing="0.5">${initials} · ${role}</text>
</svg>`;
}

const OFFICERS = [
  {
    userId: "OFC-1042",
    passwordPlain: "officer123",
    role: "FIELD_OFFICER",
    accountStatus: "APPROVED",
    firstName: "Masoom",
    lastName: "Singh",
    email: "masoom.singh@ner-logistics.gov.in",
    mobileNumber: "9876543210",
    dateOfBirth: new Date("1988-04-12"),
    gender: "Male",
    employeeId: "EMP-OFC-1042",
    department: "Disaster Management Cell",
    designation: "Senior Field Geologist",
    office: "District HQ, Haflong",
    district: "Dima Hasao",
    state: "Assam",
    postingLocation: "Haflong Sector 4",
    photoFilename: "officer_masoom_singh.svg",
    badgeColor: "#0284c7",
    bgGradient1: "#0369a1",
    bgGradient2: "#075985",
  },
  {
    userId: "OFC-2088",
    passwordPlain: "officer123",
    role: "FIELD_OFFICER",
    accountStatus: "APPROVED",
    firstName: "Ananya",
    lastName: "Barman",
    email: "ananya.barman@ner-logistics.gov.in",
    mobileNumber: "9854012345",
    dateOfBirth: new Date("1991-09-24"),
    gender: "Female",
    employeeId: "EMP-OFC-2088",
    department: "PWD Road Safety Division",
    designation: "Regional Hazard Inspector",
    office: "Shillong Civil Center",
    district: "East Khasi Hills",
    state: "Meghalaya",
    postingLocation: "Shillong Bypass Post",
    photoFilename: "officer_ananya_barman.svg",
    badgeColor: "#10b981",
    bgGradient1: "#047857",
    bgGradient2: "#065f46",
    skinColor: "#f3c299",
  },
  {
    userId: "OFC-3115",
    passwordPlain: "officer123",
    role: "FIELD_OFFICER",
    accountStatus: "APPROVED",
    firstName: "Tenzing",
    lastName: "Norbu",
    email: "tenzing.norbu@ner-logistics.gov.in",
    mobileNumber: "9774098765",
    dateOfBirth: new Date("1985-11-15"),
    gender: "Male",
    employeeId: "EMP-OFC-3115",
    department: "Border Roads Organization (BRO)",
    designation: "Field Operations Commander",
    office: "Itanagar Sector HQ",
    district: "Papum Pare",
    state: "Arunachal Pradesh",
    postingLocation: "Banderdewa Checkpoint",
    photoFilename: "officer_tenzing_norbu.svg",
    badgeColor: "#8b5cf6",
    bgGradient1: "#6d28d9",
    bgGradient2: "#4c1d95",
  },
];

const OPERATORS = [
  {
    userId: "VOP-2317",
    passwordPlain: "driver123",
    role: "VEHICLE_OPERATOR",
    accountStatus: "APPROVED",
    firstName: "Rajesh",
    lastName: "Kumar",
    email: "rajesh.kumar@ner-logistics.gov.in",
    mobileNumber: "9435011223",
    dateOfBirth: new Date("1984-06-18"),
    gender: "Male",
    licenseNumber: "AS-01-2012-004491",
    vehicleRegNumber: "AS-01-T-0001",
    vehicleType: "TRUCK",
    assignedRoute: "Guwahati Hub → Shillong Medical Station",
    district: "Kamrup Metropolitan",
    state: "Assam",
    postingLocation: "Guwahati Logistics Depot",
    photoFilename: "operator_rajesh_kumar.svg",
    badgeColor: "#f59e0b",
    bgGradient1: "#b45309",
    bgGradient2: "#78350f",
  },
  {
    userId: "VOP-4402",
    passwordPlain: "driver123",
    role: "VEHICLE_OPERATOR",
    accountStatus: "APPROVED",
    firstName: "Biren",
    lastName: "Das",
    email: "biren.das@ner-logistics.gov.in",
    mobileNumber: "9435099887",
    dateOfBirth: new Date("1989-02-28"),
    gender: "Male",
    licenseNumber: "AS-11-2015-008921",
    vehicleRegNumber: "AS-02-V-0104",
    vehicleType: "VAN",
    assignedRoute: "Silchar Depot → Imphal Hospital",
    district: "Cachar",
    state: "Assam",
    postingLocation: "Silchar Supply Base",
    photoFilename: "operator_biren_das.svg",
    badgeColor: "#0ea5e9",
    bgGradient1: "#0284c7",
    bgGradient2: "#0369a1",
  },
  {
    userId: "VOP-5519",
    passwordPlain: "driver123",
    role: "VEHICLE_OPERATOR",
    accountStatus: "APPROVED",
    firstName: "Lalrinsanga",
    lastName: "Ralte",
    email: "l.ralte@ner-logistics.gov.in",
    mobileNumber: "9862033445",
    dateOfBirth: new Date("1993-08-14"),
    gender: "Male",
    licenseNumber: "MZ-01-2017-003312",
    vehicleRegNumber: "MZ-05-V-0039",
    vehicleType: "VAN",
    assignedRoute: "Dibrugarh Medical Store → Aizawl Civil Hospital",
    district: "Aizawl",
    state: "Mizoram",
    postingLocation: "Aizawl Central Hub",
    photoFilename: "operator_lalrinsanga_ralte.svg",
    badgeColor: "#ec4899",
    bgGradient1: "#be185d",
    bgGradient2: "#831843",
  },
  {
    userId: "VOP-6124",
    passwordPlain: "driver123",
    role: "VEHICLE_OPERATOR",
    accountStatus: "APPROVED",
    firstName: "Temjen",
    lastName: "Ao",
    email: "temjen.ao@ner-logistics.gov.in",
    mobileNumber: "9436055667",
    dateOfBirth: new Date("1987-12-03"),
    gender: "Male",
    licenseNumber: "NL-03-2014-007781",
    vehicleRegNumber: "NL-03-T-0077",
    vehicleType: "TRUCK",
    assignedRoute: "Dimapur Logistics Center → Kohima District HQ",
    district: "Dimapur",
    state: "Nagaland",
    postingLocation: "Dimapur Railhead Base",
    photoFilename: "operator_temjen_ao.svg",
    badgeColor: "#14b8a6",
    bgGradient1: "#0f766e",
    bgGradient2: "#134e4a",
  },
  {
    userId: "VOP-7281",
    passwordPlain: "driver123",
    role: "VEHICLE_OPERATOR",
    accountStatus: "APPROVED",
    firstName: "Nabam",
    lastName: "Tsering",
    email: "nabam.tsering@ner-logistics.gov.in",
    mobileNumber: "9436088991",
    dateOfBirth: new Date("1990-05-22"),
    gender: "Male",
    licenseNumber: "AR-04-2016-002144",
    vehicleRegNumber: "AR-04-T-0212",
    vehicleType: "TRUCK",
    assignedRoute: "Tezpur Supply Base → Itanagar Civil Hospital",
    district: "Papum Pare",
    state: "Arunachal Pradesh",
    postingLocation: "Tezpur Corridor Gate",
    photoFilename: "operator_nabam_tsering.svg",
    badgeColor: "#6366f1",
    bgGradient1: "#4338ca",
    bgGradient2: "#312e81",
  },
  {
    userId: "VOP-8833",
    passwordPlain: "driver123",
    role: "VEHICLE_OPERATOR",
    accountStatus: "APPROVED",
    firstName: "Debojit",
    lastName: "Roy",
    email: "debojit.roy@ner-logistics.gov.in",
    mobileNumber: "9435077112",
    dateOfBirth: new Date("1992-10-10"),
    gender: "Male",
    licenseNumber: "AS-01-2018-009943",
    vehicleRegNumber: "AS-01-A-9901",
    vehicleType: "AMBULANCE",
    assignedRoute: "Silchar Hospital → Haflong Sector 4",
    district: "Cachar",
    state: "Assam",
    postingLocation: "Silchar Emergency Unit",
    photoFilename: "operator_debojit_roy.svg",
    badgeColor: "#ef4444",
    bgGradient1: "#b91c1c",
    bgGradient2: "#7f1d1d",
  },
];

async function seed() {
  const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL || "mongodb://127.0.0.1:27017/ner_logistics";
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URL, { serverSelectionTimeoutMS: 8000 });
  console.log("MongoDB connected.");

  // 1. Update admin account with proper name
  const adminSalt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", adminSalt);
  await User.updateOne(
    { userId: "admin" },
    {
      $set: {
        firstName: "System",
        lastName: "Administrator",
        email: process.env.ADMIN_EMAIL || "admin@ner-logistics.gov.in",
        accountStatus: "APPROVED",
        passwordHash: adminHash,
      },
    },
    { upsert: true }
  );
  console.log("✓ Admin account updated (System Administrator)");

  // 2. Seed Officers
  for (const u of OFFICERS) {
    const svg = createAvatarSvg(
      `${u.firstName} ${u.lastName}`,
      "OFFICER",
      u.badgeColor,
      u.bgGradient1,
      u.bgGradient2,
      "#1e293b",
      u.skinColor || "#e2a77a"
    );
    const photoPath = path.join(UPLOAD_DIR, u.photoFilename);
    fs.writeFileSync(photoPath, svg, "utf8");
    console.log(`  Saved photo: ${u.photoFilename}`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(u.passwordPlain, salt);

    const doc = {
      userId: u.userId,
      passwordHash,
      role: u.role,
      accountStatus: u.accountStatus,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      mobileNumber: u.mobileNumber,
      dateOfBirth: u.dateOfBirth,
      gender: u.gender,
      employeeId: u.employeeId,
      department: u.department,
      designation: u.designation,
      office: u.office,
      district: u.district,
      state: u.state,
      postingLocation: u.postingLocation,
      profilePhotoUrl: `/uploads/${u.photoFilename}`,
    };

    await User.updateOne({ userId: u.userId }, { $set: doc }, { upsert: true });
    console.log(`✓ Seeded Officer: ${u.firstName} ${u.lastName} (${u.userId})`);
  }

  // 3. Seed Operators
  for (const u of OPERATORS) {
    const svg = createAvatarSvg(
      `${u.firstName} ${u.lastName}`,
      u.vehicleType,
      u.badgeColor,
      u.bgGradient1,
      u.bgGradient2,
      "#0f172a",
      u.skinColor || "#df9b6d"
    );
    const photoPath = path.join(UPLOAD_DIR, u.photoFilename);
    fs.writeFileSync(photoPath, svg, "utf8");
    console.log(`  Saved photo: ${u.photoFilename}`);

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(u.passwordPlain, salt);

    const doc = {
      userId: u.userId,
      passwordHash,
      role: u.role,
      accountStatus: u.accountStatus,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      mobileNumber: u.mobileNumber,
      dateOfBirth: u.dateOfBirth,
      gender: u.gender,
      licenseNumber: u.licenseNumber,
      vehicleRegNumber: u.vehicleRegNumber,
      vehicleType: u.vehicleType,
      assignedRoute: u.assignedRoute,
      district: u.district,
      state: u.state,
      postingLocation: u.postingLocation,
      profilePhotoUrl: `/uploads/${u.photoFilename}`,
    };

    await User.updateOne({ userId: u.userId }, { $set: doc }, { upsert: true });
    console.log(`✓ Seeded Operator: ${u.firstName} ${u.lastName} (${u.userId})`);
  }

  console.log("\nAll 3 Officers and 6 Vehicle Operators successfully seeded with saved photos!\n");
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
