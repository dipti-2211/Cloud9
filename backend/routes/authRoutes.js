const express =
    require("express");


const {

    login,

    register,

    getMe,

    getPendingUsers,

    approveUser,

    rejectUser

} =
    require(
        "../controllers/authController"
    );


const router =
    express.Router();


// ==============================
// LOGIN
// ==============================

router.post(
    "/login",
    login
);


// ==============================
// REGISTRATION
// ==============================

router.post(
    "/register",
    register
);


// ==============================
// CURRENT USER
// ==============================

router.get(
    "/me",
    getMe
);


// ==============================
// ADMIN APPROVAL
// ==============================

router.get(
    "/pending",
    getPendingUsers
);


router.put(
    "/approve/:id",
    approveUser
);


router.put(
    "/reject/:id",
    rejectUser
);


module.exports =
    router;