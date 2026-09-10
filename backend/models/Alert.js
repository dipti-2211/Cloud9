const mongoose = require("mongoose");


// ==============================
// ALERT SCHEMA
// ==============================

const alertSchema = new mongoose.Schema({

    // Legacy fields (from old landslide risk alerting via map-click / route-check)
    latitude:       { type: Number },
    longitude:      { type: Number },
    riskCategory:   { type: String, enum: ["High", "Very High"] },
    riskPercentage: { type: Number },
    source:         { type: String, enum: ["map-click", "route-check", "officer", "system"], default: "system" },

    // Full alert shape expected by the frontend dashboard Alerts panel
    type:     { type: String, default: "ALERT" },
    severity: { type: String, enum: ["LOW", "MODERATE", "HIGH", "CRITICAL"], default: "HIGH" },
    message:  { type: String, required: true, default: "Alert" },

    location: {
        lat: { type: Number },
        lon: { type: Number },
    },

    district: { type: String },

    acknowledged:   { type: Boolean, default: false },
    acknowledgedBy: { type: String },
    acknowledgedAt: { type: Date },

    createdBy: { type: String },

}, {
    timestamps: true,
});


module.exports = mongoose.model("Alert", alertSchema);