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


router.get(
    "/",
    getRisk
);


module.exports =
    router;