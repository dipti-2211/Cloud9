const mongoose =
    require("mongoose");


const settingSchema =
    new mongoose.Schema({

        language: {

            type: String,

            default:
                "English"

        },

        notificationsEnabled: {

            type: Boolean,

            default: true

        },

        emailAlerts: {

            type: Boolean,

            default: true

        },

        smsAlerts: {

            type: Boolean,

            default: false

        },

        highRiskAlerts: {

            type: Boolean,

            default: true

        }

    }, {

        timestamps: true

    });


module.exports =
    mongoose.model(
        "Setting",
        settingSchema
    );