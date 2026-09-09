const express =
    require("express");

const {
    getRouteRisk
} =
    require(
        "../controllers/routeRiskController"
    );


const router =
    express.Router();


router.post(
    "/",
    getRouteRisk
);


module.exports =
    router;