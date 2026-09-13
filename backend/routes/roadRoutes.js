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
    "/removed",
    roadController.getRemovedRoads
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

router.patch(
    "/:id/restore",
    roadController.restoreRoad
);

router.post(
    "/:id/restore",
    roadController.restoreRoad
);

router.delete(
    "/:id",
    roadController.deleteRoad
);


module.exports =
    router;