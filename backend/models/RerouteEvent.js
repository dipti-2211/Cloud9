"use strict";
/**
 * models/RerouteEvent.js
 *
 * Audit log: every time a vehicle is rerouted because a road segment
 * became high-risk, we store the original and new route here.
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

const rerouteEventSchema = new Schema(
    {
        vehicle_id: { type: String, required: true },

        triggering_road_segment_id: {
            type: Schema.Types.ObjectId,
            ref:  "RoadSegment",
        },

        // Lists of RoadSegment ObjectIds
        original_route: { type: [Schema.Types.ObjectId], default: [] },
        new_route:      { type: [Schema.Types.ObjectId], default: [] },

        created_at: { type: Date, default: Date.now },
    },
    { timestamps: false }
);

rerouteEventSchema.index({ vehicle_id: 1, created_at: -1 });

rerouteEventSchema.set("toJSON", {
    virtuals: true,
    transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
    },
});

module.exports = mongoose.model("RerouteEvent", rerouteEventSchema);
