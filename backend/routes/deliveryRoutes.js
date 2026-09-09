const express =
    require("express");

const deliveryController =
    require(
        "../controllers/deliveryController"
    );


const router =
    express.Router();


router.get(
    "/",
    deliveryController.getAllDeliveries
);

router.get(
    "/:id",
    deliveryController.getDeliveryById
);

router.post(
    "/",
    deliveryController.createDelivery
);

router.put(
    "/:id",
    deliveryController.updateDelivery
);

router.delete(
    "/:id",
    deliveryController.deleteDelivery
);


module.exports =
    router;