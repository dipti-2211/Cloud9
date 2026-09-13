"use strict";
/**
 * models/RoadIncident.js
 *
 * Full §1 incident shape per spec.
 * A separate model name keeps it distinct from the legacy Incident schema
 * (which is still used by the old controller for fleet-ops flow).
 *
 * IMPORTANT – location.coordinates is [longitude, latitude] (GeoJSON order).
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const roadIncidentSchema = new Schema(
    {
        road_segment_id: {
            type: Schema.Types.ObjectId,
            ref:  "RoadSegment",
            required: true,
        },

        // Exact reported position — [longitude, latitude]
        location: {
            type:        { type: String, enum: ["Point"], default: "Point" },
            coordinates: { type: [Number], required: true },  // [lon, lat]
        },

        // Convenience fields (copied from coordinates for quick reads)
        latitude:  { type: Number },
        longitude: { type: Number },

        // Photo stored on disk; this field holds the served URL, e.g. /uploads/...
        photo_url: { type: String },

        reported_risk_level: { type: String, enum: ["low", "medium", "high", "critical"], default: "high" },

        incident_type: {
            type: String,
            default: "landslide",
        },

        // Road block status dropdown: none | partial | full
        road_block: {
            type: String,
            enum: ["none", "partial", "full", "low", "medium", "high", "clear", "blocked"],
            default: "none",
        },

        // Traffic condition: clear | slow | jammed | blocked
        traffic_condition: {
            type: String,
            enum: ["clear", "slow", "jammed", "blocked", "normal", "heavy", "standstill"],
            default: "clear",
        },

        // Weather and Terrain inputs
        current_temp: { type: Number, default: 24 }, // °C
        slope:        { type: Number, default: 20 }, // degrees
        slope_deg:    { type: Number, default: 20 }, // degrees (alias)
        rainfall_mm:  { type: Number, default: 80 }, // mm/7d

        field_officer_name: { type: String },
        vehicle_id:         { type: String },

        description: { type: String },

        created_at: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

roadIncidentSchema.index({ location: "2dsphere" });
roadIncidentSchema.index({ road_segment_id: 1, created_at: -1 });

roadIncidentSchema.set("toJSON", {
    virtuals: true,
    transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});

module.exports = mongoose.model("RoadIncident", roadIncidentSchema);
