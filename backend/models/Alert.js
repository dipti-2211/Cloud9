const mongoose =
    require("mongoose");


// ==============================
// ALERT SCHEMA
// ==============================

const alertSchema =
    new mongoose.Schema({

        latitude: {

            type: Number,

            required: true

        },

        longitude: {

            type: Number,

            required: true

        },

        riskCategory: {

            type: String,

            required: true,

            enum: [
                "High",
                "Very High"
            ]

        },

        riskPercentage: {

            type: Number,

            required: true

        },

        message: {

            type: String,

            required: true

        },

        source: {

            type: String,

            required: true,

            enum: [
                "map-click",
                "route-check"
            ]

        }

    }, {

        timestamps:
            true

    });


module.exports =
    mongoose.model(
        "Alert",
        alertSchema
    );