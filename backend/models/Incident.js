const mongoose =
    require("mongoose");


const incidentSchema =
    new mongoose.Schema({

        type: {

            type: String,

            enum: [
                "LANDSLIDE",
                "FLOOD",
                "ROAD_DAMAGE",
                "BRIDGE_DAMAGE",
                "ACCIDENT",
                "BLOCKAGE",
                "OTHER"
            ],

            required: true

        },

        severity: {

            type: String,

            enum: [
                "LOW",
                "MEDIUM",
                "HIGH",
                "CRITICAL"
            ],

            required: true

        },

        description: {

            type: String,

            required: true

        },

        location: {

            type: {

                type: String,

                enum: [
                    "Point"
                ],

                required: true

            },

            coordinates: {

                type: [
                    Number
                ],

                required: true

            }

        },

        roadId: {

            type: mongoose.Schema.Types.ObjectId,

            ref:
                "Road"

        },

        photoUrl: {

            type: String

        },

        reportedBy: {

            type: String

        },

        verified: {

            type: Boolean,

            default: false

        },

        status: {

            type: String,

            enum: [
                "ACTIVE",
                "RESOLVED"
            ],

            default:
                "ACTIVE"

        }

    }, {

        timestamps: true

    });


incidentSchema.index({

    location:
        "2dsphere"

});


module.exports =
    mongoose.model(
        "Incident",
        incidentSchema
    );