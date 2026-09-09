const express =
    require("express");

const roadController =
    require(
        "../controllers/roadController"
    );


const router =
    express.Router();


router.get(
    "/",
    roadController.getAllRoads
);

router.get(
    "/:id",
    roadController.getRoadById
);

router.post(
    "/",
    roadController.createRoad
);

router.put(
    "/:id",
    roadController.updateRoad
);

router.delete(
    "/:id",
    roadController.deleteRoad
);


module.exports =
    router;