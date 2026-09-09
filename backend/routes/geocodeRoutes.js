const express =
    require("express");

const {
    getGeocode
} =
    require(
        "../controllers/geocodeController"
    );


const router =
    express.Router();


router.get(
    "/",
    getGeocode
);


module.exports =
    router;