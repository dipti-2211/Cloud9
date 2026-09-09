const Delivery =
    require("../models/Delivery");


// ==============================
// GET ALL
// ==============================

const getAllDeliveries =
    async (
        req,
        res
    ) => {

        try {

            const deliveries =
                await Delivery.find()

                .populate(
                    "vehicleId"
                )

                .sort({
                    createdAt: -1
                });


            res.status(200).json({

                success: true,

                data:
                    deliveries

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ==============================
// GET BY ID
// ==============================

const getDeliveryById =
    async (
        req,
        res
    ) => {

        try {

            const delivery =
                await Delivery.findById(
                    req.params.id
                )

                .populate(
                    "vehicleId"
                );


            if (!delivery) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Delivery not found"

                });

            }


            res.status(200).json({

                success: true,

                data:
                    delivery

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ==============================
// CREATE
// ==============================

const createDelivery =
    async (
        req,
        res
    ) => {

        try {

            const delivery =
                await Delivery.create(
                    req.body
                );


            res.status(201).json({

                success: true,

                message:
                    "Delivery created successfully",

                data:
                    delivery

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ==============================
// UPDATE
// ==============================

const updateDelivery =
    async (
        req,
        res
    ) => {

        try {

            const delivery =
                await Delivery.findByIdAndUpdate(

                    req.params.id,

                    req.body,

                    {

                        new: true,

                        runValidators:
                            true

                    }

                );


            if (!delivery) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Delivery not found"

                });

            }


            res.status(200).json({

                success: true,

                message:
                    "Delivery updated successfully",

                data:
                    delivery

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


// ==============================
// DELETE
// ==============================

const deleteDelivery =
    async (
        req,
        res
    ) => {

        try {

            const delivery =
                await Delivery.findByIdAndDelete(

                    req.params.id

                );


            if (!delivery) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Delivery not found"

                });

            }


            res.status(200).json({

                success: true,

                message:
                    "Delivery deleted successfully"

            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    };


module.exports = {

    getAllDeliveries,

    getDeliveryById,

    createDelivery,

    updateDelivery,

    deleteDelivery

};