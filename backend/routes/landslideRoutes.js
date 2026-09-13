const express =
    require("express");

const {
    getRisk
} =
    require(
        "../controllers/landslideController"
    );


const router =
    express.Router();


// GET /api/landslide/risk?lat=&lon=
router.get(
    "/risk",
    getRisk
);


module.exports =
    router;