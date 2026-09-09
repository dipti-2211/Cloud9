const express =
    require("express");

const incidentController =
    require(
        "../controllers/incidentController"
    );


const router =
    express.Router();


router.get(
    "/",
    incidentController.getAllIncidents
);

router.get(
    "/:id",
    incidentController.getIncidentById
);

router.post(
    "/",
    incidentController.createIncident
);

router.put(
    "/:id",
    incidentController.updateIncident
);

router.delete(
    "/:id",
    incidentController.deleteIncident
);


module.exports =
    router;