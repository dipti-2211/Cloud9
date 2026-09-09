const mongoose =
    require("mongoose");


// ==============================
// USER SCHEMA
// ==============================

const userSchema =
    new mongoose.Schema({

        userId: {

            type: String,

            required: true,

            unique: true,

            trim: true

        },

        passwordHash: {

            type: String,

            required: true

        },

        role: {

            type: String,

            enum: [
                "ADMIN",
                "FIELD_OFFICER",
                "VEHICLE_OPERATOR"
            ],

            required: true

        },

        accountStatus: {

            type: String,

            enum: [
                "PENDING",
                "APPROVED",
                "REJECTED",
                "INACTIVE"
            ],

            default:
                "PENDING"

        },

        firstName: {

            type: String,

            required: true

        },

        lastName: {

            type: String,

            required: true

        },

        email: {

            type: String,

            required: true

        },

        mobileNumber: {

            type: String

        },

        employeeId: {

            type: String

        },

        department: {

            type: String

        },

        designation: {

            type: String

        },

        office: {

            type: String

        },

        state: {

            type: String

        },

        district: {

            type: String

        },

        postingLocation: {

            type: String

        },

        licenseNumber: {

            type: String

        },

        vehicleRegNumber: {

            type: String

        },

        vehicleType: {

            type: String

        },

        assignedRoute: {

            type: String

        },

        approvedBy: {

            type: mongoose.Schema.Types.ObjectId,

            ref:
                "User"

        },

        approvedAt: {

            type: Date

        }

    }, {

        timestamps: true

    });


module.exports =
    mongoose.model(
        "User",
        userSchema
    );