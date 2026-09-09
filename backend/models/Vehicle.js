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