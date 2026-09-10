"use strict";
/**
 * models/RoadSegment.js
 *
 * One document per named road segment (from critical_roads.json + seed).
 * The `geometry` field stores a GeoJSON LineString [[lon,lat],[lon,lat]]
 * so MongoDB's 2dsphere index can do nearest-neighbor snapping.
 *
 * IMPORTANT – GeoJSON always uses [longitude, latitude] order.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const roadSegmentSchema = new Schema(
    {
        // Human-readable segment id imported from critical_roads.json
        segment_key: { type: String, unique: true, sparse: true },

        road_name: { type: String, required: true },

        from_node: { type: String },
        to_node:   { type: String },

        // GeoJSON LineString — coordinates are [lon, lat] pairs
        geometry: {
            type:        { type: String, enum: ["LineString"], default: "LineString" },
            coordinates: { type: [[Number]], default: [] },   // [[lon,lat], [lon,lat], ...]
        },

        length_km: { type: Number, default: 0 },

        // Midpoint stored for quick display / haversine fallback
        mid_lat: { type: Number },
        mid_lon: { type: Number },

        district: { type: String },

        // Settlements that lose access if this segment is blocked
        settlements_cutoff: { type: [String], default: [] },
        settlement_count:   { type: Number,   default: 0  },

        // ─── Risk attributes ──────────────────────────────────────────────────
        slope_deg:              { type: Number, default: 0 },
        avg_rainfall_mm_7d:     { type: Number, default: 0 },
        historical_incident_count: { type: Number, default: 0 },
        historical_risk_score:  { type: Number, default: 0, min: 0, max: 1 },

        current_risk_level:  { type: String, enum: ["low", "medium", "high"], default: "low" },
        current_risk_score:  { type: Number, default: 0, min: 0, max: 1 },
        last_updated:        { type: Date,   default: Date.now },

        is_demo: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// 2dsphere index enables $near geo queries for lat/lon → segment snapping
roadSegmentSchema.index({ geometry: "2dsphere" });
roadSegmentSchema.index({ current_risk_level: 1 });

// Normalise _id → id in JSON responses
roadSegmentSchema.set("toJSON", {
    virtuals: true,
    transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});

module.exports = mongoose.model("RoadSegment", roadSegmentSchema);
