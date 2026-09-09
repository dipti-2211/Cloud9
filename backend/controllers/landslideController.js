const Alert =
    require("../models/Alert");


// ==============================
// SINGLE LOCATION RISK
// ==============================

const getRisk =
    async (
        req,
        res
    ) => {

        try {

            const {
                lat,
                lon
            } =
                req.query;


            if (
                lat === undefined ||
                lon === undefined
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "lat and lon are required"

                });

            }


            const latitude =
                Number(lat);

            const longitude =
                Number(lon);


            if (
                !Number.isFinite(latitude) ||
                !Number.isFinite(longitude)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "lat and lon must be valid numbers"

                });

            }


            const riskEngineUrl =
                process.env.RISK_ENGINE_URL ||
                "http://localhost:8000";


            const targetUrl =
                `${riskEngineUrl}/predict?lat=${latitude}&lon=${longitude}`;


            const response =
                await fetch(
                    targetUrl
                );


            const data =
                await response.json();


            if (!response.ok) {

                return res.status(
                    response.status
                ).json({

                    success: false,

                    message:
                        data.detail ||
                        "Risk engine error"

                });

            }


            // =========================
            // SAVE HIGH-RISK ALERT
            // =========================

            if (

                !data.error &&

                (
                    data.risk_category ===
                    "High" ||

                    data.risk_category ===
                    "Very High"
                )

            ) {

                Alert.create({

                    latitude:
                        data.latitude,

                    longitude:
                        data.longitude,

                    riskCategory:
                        data.risk_category,

                    riskPercentage:
                        data.risk_percentage,

                    message:
                        `${data.risk_category} landslide risk (${data.risk_percentage.toFixed(1)}%) detected at (${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)})`,

                    source:
                        "map-click"

                })

                .catch(
                    (error) => {

                        console.error(
                            "Alert save failed:",
                            error
                        );

                    }
                );

            }


            return res.status(200).json(
                data
            );

        } catch (error) {

            console.error(
                "Risk engine error:",
                error
            );


            res.status(503).json({

                success: false,

                message:
                    `Could not reach risk engine: ${error.message}`

            });

        }

    };


module.exports = {

    getRisk

};