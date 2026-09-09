const bcrypt =
    require("bcryptjs");

const jwt =
    require("jsonwebtoken");

const User =
    require("../models/User");


// ==============================
// CREATE TOKEN
// ==============================

const createToken =
    (user) => {

        return jwt.sign(

            {

                id:
                    user._id,

                userId:
                    user.userId,

                role:
                    user.role

            },

            process.env.JWT_SECRET,

            {

                expiresIn:
                    "1d"

            }

        );

    };


// ==============================
// GET TOKEN FROM REQUEST
// ==============================

const getTokenFromRequest =
    (req) => {

        const authHeader =
            req.headers.authorization;


        if (
            !authHeader ||
            !authHeader.startsWith(
                "Bearer "
            )
        ) {

            return null;

        }


        return authHeader
            .split(" ")[1];

    };


// ==============================
// VERIFY TOKEN
// ==============================

const verifyUserToken =
    (req) => {

        const token =
            getTokenFromRequest(
                req
            );


        if (!token) {

            return null;

        }


        try {

            return jwt.verify(

                token,

                process.env.JWT_SECRET

            );

        } catch (error) {

            return null;

        }

    };


// ==============================
// CHECK ADMIN
// ==============================

const verifyAdmin =
    (req) => {

        const decoded =
            verifyUserToken(
                req
            );


        if (
            !decoded ||
            decoded.role !== "ADMIN"
        ) {

            return null;

        }


        return decoded;

    };


// ==============================
// LOGIN
// ==============================

const login =
    async (
        req,
        res
    ) => {

        try {

            const {

                userId,

                password,

                role

            } =
                req.body;


            if (
                !userId ||
                !password ||
                !role
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "userId, password and role are required"

                });

            }


            // =========================
            // NORMALIZE ROLE
            // =========================

            let normalizedRole;


            if (
                role === "admin" ||
                role === "Admin" ||
                role === "ADMIN"
            ) {

                normalizedRole =
                    "ADMIN";

            }

            else if (
                role === "officer" ||
                role === "Field Officer" ||
                role === "FIELD_OFFICER"
            ) {

                normalizedRole =
                    "FIELD_OFFICER";

            }

            else if (
                role === "driver" ||
                role === "vehicle-driver" ||
                role === "Vehicle Operator" ||
                role === "VEHICLE_OPERATOR"
            ) {

                normalizedRole =
                    "VEHICLE_OPERATOR";

            }

            else {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user role"

                });

            }


            // =========================
            // FIND USER
            // =========================

            const user =
                await User.findOne({

                    userId:
                        userId.trim(),

                    role:
                        normalizedRole

                });


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid credentials"

                });

            }


            // =========================
            // CHECK PASSWORD
            // =========================

            const passwordValid =
                await bcrypt.compare(

                    password,

                    user.passwordHash

                );


            if (!passwordValid) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Invalid credentials"

                });

            }


            // =========================
            // CHECK ACCOUNT STATUS
            // =========================

            if (
                user.accountStatus !==
                "APPROVED"
            ) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Your account is awaiting administrator approval"

                });

            }


            // =========================
            // CREATE TOKEN
            // =========================

            const token =
                createToken(
                    user
                );


            res.status(200).json({

                success: true,

                message:
                    "Login successful",

                token,

                user: {

                    id:
                        user._id,

                    userId:
                        user.userId,

                    role:
                        user.role,

                    firstName:
                        user.firstName,

                    lastName:
                        user.lastName,

                    email:
                        user.email,

                    accountStatus:
                        user.accountStatus

                }

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ==============================
// REGISTER FIELD OFFICER / DRIVER
// ==============================

const register =
    async (
        req,
        res
    ) => {

        try {

            const data =
                req.body;


            if (
                !data.userId ||
                !data.tempPassword ||
                !data.firstName ||
                !data.lastName ||
                !data.officialEmail ||
                !data.role
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Required registration fields are missing"

                });

            }


            // =========================
            // NORMALIZE ROLE
            // =========================

            let normalizedRole;


            if (
                data.role ===
                "Field Officer"
            ) {

                normalizedRole =
                    "FIELD_OFFICER";

            }

            else if (
                data.role ===
                "Vehicle Operator"
            ) {

                normalizedRole =
                    "VEHICLE_OPERATOR";

            }

            else {

                return res.status(400).json({

                    success: false,

                    message:
                        "Only Field Officer and Vehicle Operator registration is allowed"

                });

            }


            // =========================
            // CHECK USER ID
            // =========================

            const existingUser =
                await User.findOne({

                    userId:
                        data.userId.trim()

                });


            if (existingUser) {

                return res.status(409).json({

                    success: false,

                    message:
                        "User ID already exists"

                });

            }


            // =========================
            // HASH PASSWORD
            // =========================

            const passwordHash =
                await bcrypt.hash(

                    data.tempPassword,

                    10

                );


            // =========================
            // CREATE USER
            // =========================

            const user =
                await User.create({

                    userId:
                        data.userId.trim(),

                    passwordHash,

                    role:
                        normalizedRole,

                    accountStatus:
                        "PENDING",

                    firstName:
                        data.firstName,

                    lastName:
                        data.lastName,

                    email:
                        data.officialEmail,

                    mobileNumber:
                        data.mobileNumber,

                    employeeId:
                        data.employeeId,

                    department:
                        data.department,

                    designation:
                        data.designation,

                    office:
                        data.office,

                    state:
                        data.state,

                    district:
                        data.district,

                    postingLocation:
                        data.postingLocation,

                    licenseNumber:
                        data.licenseNumber,

                    vehicleRegNumber:
                        data.vehicleRegNumber,

                    vehicleType:
                        data.vehicleType,

                    assignedRoute:
                        data.assignedRoute

                });


            res.status(201).json({

                success: true,

                message:
                    "Registration submitted. Administrator approval is required before login.",

                data: {

                    id:
                        user._id,

                    userId:
                        user.userId,

                    role:
                        user.role,

                    accountStatus:
                        user.accountStatus

                }

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ==============================
// GET CURRENT USER
// ==============================

const getMe =
    async (
        req,
        res
    ) => {

        try {

            const decoded =
                verifyUserToken(
                    req
                );


            if (!decoded) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Authentication required"

                });

            }


            const user =
                await User.findById(
                    decoded.id
                )

                .select(
                    "-passwordHash"
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }


            res.status(200).json({

                success: true,

                data:
                    user

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ==============================
// GET PENDING USERS
// ==============================

const getPendingUsers =
    async (
        req,
        res
    ) => {

        try {

            const admin =
                verifyAdmin(
                    req
                );


            if (!admin) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Administrator access required"

                });

            }


            const users =
                await User.find({

                    accountStatus:
                        "PENDING",

                    role: {

                        $in: [

                            "FIELD_OFFICER",

                            "VEHICLE_OPERATOR"

                        ]

                    }

                })

                .select(
                    "-passwordHash"
                )

                .sort({

                    createdAt:
                        -1

                });


            res.status(200).json({

                success: true,

                data:
                    users

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ==============================
// APPROVE USER
// ==============================

const approveUser =
    async (
        req,
        res
    ) => {

        try {

            const admin =
                verifyAdmin(
                    req
                );


            if (!admin) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Administrator access required"

                });

            }


            const user =
                await User.findByIdAndUpdate(

                    req.params.id,

                    {

                        accountStatus:
                            "APPROVED",

                        approvedBy:
                            admin.id,

                        approvedAt:
                            new Date()

                    },

                    {

                        new: true,

                        runValidators:
                            true

                    }

                )

                .select(
                    "-passwordHash"
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }


            res.status(200).json({

                success: true,

                message:
                    "User approved successfully",

                data:
                    user

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ==============================
// REJECT USER
// ==============================

const rejectUser =
    async (
        req,
        res
    ) => {

        try {

            const admin =
                verifyAdmin(
                    req
                );


            if (!admin) {

                return res.status(403).json({

                    success: false,

                    message:
                        "Administrator access required"

                });

            }


            const user =
                await User.findByIdAndUpdate(

                    req.params.id,

                    {

                        accountStatus:
                            "REJECTED"

                    },

                    {

                        new: true,

                        runValidators:
                            true

                    }

                )

                .select(
                    "-passwordHash"
                );


            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }


            res.status(200).json({

                success: true,

                message:
                    "User rejected",

                data:
                    user

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


module.exports = {

    login,

    register,

    getMe,

    getPendingUsers,

    approveUser,

    rejectUser

};