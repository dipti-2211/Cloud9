const mongoose =
    require("mongoose");


const deliverySchema =
    new mongoose.Schema({

        deliveryId: {

            type: String,

            required: true,

            unique: true

        },

        vehicleId: {

            type: mongoose.Schema.Types.ObjectId,

            ref:
                "Vehicle",

            required: true

        },

        origin: {

            type: String,

            required: true

        },

        destination: {

            type: String,

            required: true

        },

        cargoType: {

            type: String,

            required: true

        },

        quantity: {

            type: Number,

            min: 0

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
                "PENDING",
                "IN_TRANSIT",
                "DELAYED",
                "DELIVERED",
                "CANCELLED"
            ],

            default:
                "PENDING"

        },

        plannedDeparture: {
            type: Date
        },

        estimatedArrival: {
            type: Date
        },

        actualArrival: {
            type: Date
        }

    }, {

        timestamps: true

    });


module.exports =
    mongoose.model(
        "Delivery",
        deliverySchema
    );