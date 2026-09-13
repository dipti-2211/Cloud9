const mongoose =
    require("mongoose");


// ==============================
// VEHICLE SCHEMA
// ==============================

const vehicleSchema =
    new mongoose.Schema({

        vehicleNumber: {

            type: String,

            required: true,

            unique: true,

            trim: true

        },

        vehicleType: {

            type: String,

            required: true,

            enum: [
                "TRUCK",
                "VAN",
                "AMBULANCE"
            ]

        },

        cargoType: {

            type: String,

            required: true

        },

        priority: {

            type: String,

            enum: [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ],

            default:
                "MEDIUM"

        },

        status: {

            type: String,

            enum: [
                "IDLE",
                "IN_TRANSIT",
                "DELAYED",
                "DELIVERED"
            ],

            default:
                "IDLE"

        },

        currentLocation: {

            type: {

                type: String,

                enum: [
                    "Point"
                ],

                default:
                    "Point"

            },

            coordinates: {

                type: [
                    Number
                ],

                required: true

            }

        },

        destination: {

            type: String,

            required: true

        },

        source: {

            type: String,

            default: ''

        },

        // Waypoints stored as [lat, lon] pairs (business-logic order).
        // When saving to currentLocation.coordinates we swap to [lon, lat] (GeoJSON order).
        routeWaypoints: {

            type: [[Number]],

            default: []

        },

        // Progress along routeWaypoints: 0.0 = start, 1.0 = destination.
        routeProgress: {

            type: Number,

            min: 0,

            max: 1,

            default: 0

        }

    }, {

        timestamps: true

    });


vehicleSchema.index({

    currentLocation:
        "2dsphere"

});


module.exports =
    mongoose.model(
        "Vehicle",
        vehicleSchema
    );