const Alert =
    require("../models/Alert");


const getAlerts =
    async (
        req,
        res
    ) => {

        try {

            const alerts =
                await Alert.find()

                .sort({
                    createdAt: -1
                })

                .limit(50)

                .lean();


        res.status(200).json({
                success: true,
                alerts,
                total: alerts.length,
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

    getAlerts

};