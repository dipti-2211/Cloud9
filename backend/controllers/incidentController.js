const Incident =
    require("../models/Incident");


// ==============================
// GET ALL
// ==============================

const getAllIncidents =
    async (
        req,
        res
    ) => {

        try {

            const incidents =
                await Incident.find()

                .populate(
                    "roadId"
                )

                .sort({
                    createdAt: -1
                });


            res.status(200).json({

                success: true,

                data:
                    incidents

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

const getIncidentById =
    async (
        req,
        res
    ) => {

        try {

            const incident =
                await Incident.findById(
                    req.params.id
                )

                .populate(
                    "roadId"
                );


            if (!incident) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Incident not found"

                });

            }


            res.status(200).json({

                success: true,

                data:
                    incident

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

const createIncident =
    async (
        req,
        res
    ) => {

        try {

            const incident =
                await Incident.create(
                    req.body
                );


            res.status(201).json({

                success: true,

                message:
                    "Incident created successfully",

                data:
                    incident

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

const updateIncident =
    async (
        req,
        res
    ) => {

        try {

            const incident =
                await Incident.findByIdAndUpdate(

                    req.params.id,

                    req.body,

                    {

                        new: true,

                        runValidators:
                            true

                    }

                );


            if (!incident) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Incident not found"

                });

            }


            res.status(200).json({

                success: true,

                data:
                    incident

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

const deleteIncident =
    async (
        req,
        res
    ) => {

        try {

            const incident =
                await Incident.findByIdAndDelete(

                    req.params.id

                );


            if (!incident) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Incident not found"

                });

            }


            res.status(200).json({

                success: true,

                message:
                    "Incident deleted successfully"

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

    getAllIncidents,

    getIncidentById,

    createIncident,

    updateIncident,

    deleteIncident

};