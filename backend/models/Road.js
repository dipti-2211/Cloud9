const mongoose =
    require("mongoose");


// ==============================
// ROAD SCHEMA
// ==============================

const roadSchema =
    new mongoose.Schema({

        osmId: {
            type: String
        },

        name: {
            type: String
        },

        highway: {
            type: String
        },

        ref: {
            type: String
        },

        roadType: {
            type: String
        },

        surface: {
            type: String
        },

        lengthKm: {
            type: Number,

            min: 0
        },

        lanes: {
            type: Number,

            min: 1
        },

        oneway: {
            type: Boolean,

            default: false
        },

        bridge: {
            type: Boolean,

            default: false
        },

        tunnel: {
            type: Boolean,

            default: false
        },

        accessibilityScore: {
            type: Number,

            min: 0,

            max: 100
        },

        status: {
            type: String,

            enum: [
                "OPEN",
                "RESTRICTED",
                "BLOCKED"
            ],

            default: "OPEN"
        },

        geometry: {

            type: {

                type: String,

                enum: [
                    "LineString"
                ]
            },

            coordinates: {

                type: [
                    [
                        Number
                    ]
                ]

            }

        }

    }, {

        timestamps: true

    });


// ==============================
// GEO INDEX
// ==============================

roadSchema.index({

    geometry:
        "2dsphere"

});


module.exports =
    mongoose.model(
        "Road",
        roadSchema
    );