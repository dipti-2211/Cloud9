const Vehicle =
    require("../models/Vehicle");


// ==============================
// CREATE
// ==============================

const createVehicle =
    async (
        req,
        res
    ) => {

        try {

            const vehicle =
                await Vehicle.create(
                    req.body
                );


            res.status(201).json({

                success: true,

                data:
                    vehicle

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
// GET ALL
// ==============================

const getVehicles =
    async (
        req,
        res
    ) => {

        try {

            const vehicles =
                await Vehicle.find();


            res.status(200).json({

                success: true,

                count:
                    vehicles.length,

                data:
                    vehicles

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

const updateVehicle =
    async (
        req,
        res
    ) => {

        try {

            const vehicle =
                await Vehicle.findByIdAndUpdate(

                    req.params.id,

                    req.body,

                    {

                        new: true,

                        runValidators:
                            true

                    }

                );


            if (!vehicle) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Vehicle not found"

                });

            }


            res.status(200).json({

                success: true,

                data:
                    vehicle

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

const deleteVehicle =
    async (
        req,
        res
    ) => {

        try {

            const vehicle =
                await Vehicle.findByIdAndDelete(

                    req.params.id

                );


            if (!vehicle) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Vehicle not found"

                });

            }


            res.status(200).json({

                success: true,

                message:
                    "Vehicle deleted successfully"

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

    createVehicle,

    getVehicles,

    updateVehicle,

    deleteVehicle

};