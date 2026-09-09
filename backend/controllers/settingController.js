const Setting =
    require("../models/Setting");


// ==============================
// GET SETTINGS
// ==============================

const getSettings =
    async (
        req,
        res
    ) => {

        try {

            let settings =
                await Setting.findOne();


            if (!settings) {

                settings =
                    await Setting.create({});

            }


            res.status(200).json({

                success: true,

                data:
                    settings

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
// UPDATE SETTINGS
// ==============================

const updateSettings =
    async (
        req,
        res
    ) => {

        try {

            const settings =
                await Setting.findOneAndUpdate(

                    {},

                    req.body,

                    {

                        new: true,

                        upsert: true,

                        runValidators:
                            true

                    }

                );


            res.status(200).json({

                success: true,

                message:
                    "Settings updated successfully",

                data:
                    settings

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

    getSettings,

    updateSettings

};