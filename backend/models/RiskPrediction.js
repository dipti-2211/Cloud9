"use strict";
/**
 * models/RiskPrediction.js
 *
 * Stores every prediction returned by the risk engine, frozen at call time.
 * Lets you compare model versions over the same set of incidents.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const riskPredictionSchema = new Schema(
    {
        road_segment_id: { type: Schema.Types.ObjectId, ref: "RoadSegment", required: true },
        incident_id:     { type: Schema.Types.ObjectId, ref: "RoadIncident" },   // nullable

        predicted_risk_level: { type: String, enum: ["low", "medium", "high"] },
        predicted_risk_score: { type: Number, min: 0, max: 1 },

        model_version: { type: String, default: "tabular-v1.0" },

        // Frozen copy of the inputs used at inference time
        inputs_snapshot: { type: Schema.Types.Mixed },

        created_at: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

riskPredictionSchema.index({ road_segment_id: 1, created_at: -1 });

riskPredictionSchema.set("toJSON", {
    virtuals: true,
    transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});

module.exports = mongoose.model("RiskPrediction", riskPredictionSchema);
