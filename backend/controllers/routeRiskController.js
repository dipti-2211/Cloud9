const Alert =
    require("../models/Alert");


// ==============================
// ROUTE RISK
// ==============================

const getRouteRisk =
    async (
        req,
        res
    ) => {

        try {

            const {
                points
            } =
                req.body;


            if (
                !Array.isArray(points) ||
                points.length === 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "points must be a non-empty array"

                });

            }


            const validPoints =
                points.every(
                    (point) =>

                        point &&
                        Number.isFinite(
                            Number(point.lat)
                        ) &&
                        Number.isFinite(
                            Number(point.lon)
                        )
                );


            if (!validPoints) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Every point must contain valid lat and lon values"

                });

            }


            const riskEngineUrl =
                process.env.RISK_ENGINE_URL ||
                "http://localhost:8000";


            const response =
                await fetch(

                    `${riskEngineUrl}/predict-batch`,

                    {

                        method:
                            "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                points

                            })

                    }

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
            // SAVE HIGH-RISK ALERTS
            // =========================

            const highRiskPoints =
                (
                    data.results ||
                    []
                )

                .filter(
                    (result) =>

                        result &&

                        (
                            result.risk_category ===
                            "High" ||

                            result.risk_category ===
                            "Very High"
                        )
                );


            if (
                highRiskPoints.length > 0
            ) {

                const alertDocs =
                    highRiskPoints.map(
                        (result) => ({

                            latitude:
                                result.latitude,

                            longitude:
                                result.longitude,

                            riskCategory:
                                result.risk_category,

                            riskPercentage:
                                result.risk_percentage,

                            message:
                                `${result.risk_category} risk (${result.risk_percentage.toFixed(1)}%) on route at (${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)})`,

                            source:
                                "route-check"

                        })
                    );


                Alert.insertMany(
                    alertDocs
                )

                .catch(
                    (error) => {

                        console.error(
                            "Alert save failed:",
                            error
                        );

                    }
                );

            }


            res.status(200).json(
                data
            );

        } catch (error) {

            console.error(
                "Route risk error:",
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

    getRouteRisk

};