const Road =
    require("../models/Road");


// =========================
// GET ALL ROADS
// =========================

const getAllRoads =
    async (
        req,
        res
    ) => {

        try {

            const roads =
                await Road.find();

            res.status(200).json({

                success: true,

                data:
                    roads
            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message
            });
        }
    };


// =========================
// GET ROAD BY ID
// =========================

const getRoadById =
    async (
        req,
        res
    ) => {

        try {

            const road =
                await Road.findById(
                    req.params.id
                );

            if (!road) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Road not found"
                });
            }

            res.status(200).json({

                success: true,

                data:
                    road
            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message
            });
        }
    };


// =========================
// CREATE ROAD
// =========================

const createRoad =
    async (
        req,
        res
    ) => {

        try {

            const road =
                new Road(
                    req.body
                );

            const savedRoad =
                await road.save();

            res.status(201).json({

                success: true,

                message:
                    "Road created successfully",

                data:
                    savedRoad
            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message
            });
        }
    };


// =========================
// UPDATE ROAD
// =========================

const updateRoad =
    async (
        req,
        res
    ) => {

        try {

            const road =
                await Road.findByIdAndUpdate(

                    req.params.id,

                    req.body,

                    {
                        new: true,

                        runValidators: true
                    }
                );

            if (!road) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Road not found"
                });
            }

            res.status(200).json({

                success: true,

                message:
                    "Road updated successfully",

                data:
                    road
            });

        } catch (error) {

            res.status(500).json({

                success: false,

                message:
                    error.message
            });
        }
    };


// =========================
// DELETE ROAD
// =========================

const deleteRoad =
    async (
        req,
        res
    ) => {

        try {

            const road =
                await Road.findByIdAndDelete(
                    req.params.id
                );

            if (!road) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Road not found"
                });
            }

            res.status(200).json({

                success: true,

                message:
                    "Road deleted successfully"
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

    getAllRoads,

    getRoadById,

    createRoad,

    updateRoad,

    deleteRoad

};