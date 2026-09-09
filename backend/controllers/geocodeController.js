// ─── Forward geocode (place name → lat/lon) ───────────────────────────────
const getGeocode = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || typeof q !== "string" || q.trim() === "") {
            return res.status(400).json({
                success: false,
                message: "Query parameter 'q' is required"
            });
        }

        const nominatimUrl =
            "https://nominatim.openstreetmap.org/search" +
            `?q=${encodeURIComponent(q.trim())}` +
            "&format=json" +
            "&limit=5" +
            "&countrycodes=in" +
            "&viewbox=89.5,29.5,97.5,20.5" +
            "&bounded=0";

        const response = await fetch(nominatimUrl, {
            headers: {
                "User-Agent": "SIH26002-landslide-app/1.0",
                "Accept-Language": "en"
            }
        });

        if (!response.ok) {
            return res.status(502).json({
                success: false,
                message: `Nominatim returned ${response.status}`
            });
        }

        const results = await response.json();

        if (!results || results.length === 0) {
            return res.status(404).json({
                success: false,
                message: `No results found for "${q}"`
            });
        }

        const first = results[0];
        res.status(200).json({
            lat: parseFloat(first.lat),
            lon: parseFloat(first.lon),
            display_name: first.display_name
        });

    } catch (error) {
        res.status(502).json({
            success: false,
            message: `Geocoding request failed: ${error.message}`
        });
    }
};


// ─── Reverse geocode (lat/lon → place name) ──────────────────────────────
const getReverseGeocode = async (req, res) => {
    try {
        const { lat, lon } = req.query;

        const latNum = parseFloat(lat);
        const lonNum = parseFloat(lon);

        if (isNaN(latNum) || isNaN(lonNum)) {
            return res.status(400).json({
                success: false,
                message: "Query parameters 'lat' and 'lon' are required and must be numbers"
            });
        }

        const nominatimUrl =
            "https://nominatim.openstreetmap.org/reverse" +
            `?lat=${latNum}` +
            `&lon=${lonNum}` +
            "&format=json" +
            "&zoom=14" +          // district-level detail
            "&addressdetails=1";

        const response = await fetch(nominatimUrl, {
            headers: {
                "User-Agent": "SIH26002-landslide-app/1.0",
                "Accept-Language": "en"
            }
        });

        if (!response.ok) {
            return res.status(502).json({
                success: false,
                message: `Nominatim reverse returned ${response.status}`
            });
        }

        const result = await response.json();

        // Nominatim returns { error: "..." } when coordinates are outside coverage
        if (result.error) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.status(200).json({
            lat: latNum,
            lon: lonNum,
            display_name: result.display_name,
            // Provide a shorter, human-friendly label from address parts
            short_name: [
                result.address?.suburb,
                result.address?.city_district,
                result.address?.city || result.address?.town || result.address?.village,
                result.address?.state_district,
                result.address?.state,
            ].filter(Boolean).join(", ") || result.display_name
        });

    } catch (error) {
        res.status(502).json({
            success: false,
            message: `Reverse geocoding request failed: ${error.message}`
        });
    }
};


module.exports = {
    getGeocode,
    getReverseGeocode,
};