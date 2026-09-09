const express =
    require("express");

const {

    createVehicle,

    getVehicles,

    updateVehicle,

    deleteVehicle

} =
    require(
        "../controllers/vehicleController"
    );


const router =
    express.Router();


router.post(
    "/",
    createVehicle
);

router.get(
    "/",
    getVehicles
);

router.put(
    "/:id",
    updateVehicle
);

router.delete(
    "/:id",
    deleteVehicle
);


module.exports =
    router;