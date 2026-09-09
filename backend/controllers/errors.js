exports.pageNotFound =
    (req, res) => {

        res.status(404).json({

            success: false,

            message:
                "Page not found"

        });

    };


exports.handleError =
    (error, req, res, next) => {

        console.error(
            "Server Error:",
            error
        );


        res.status(
            error.status || 500
        ).json({

            success: false,

            message:
                error.message ||
                "Internal server error"

        });

    };