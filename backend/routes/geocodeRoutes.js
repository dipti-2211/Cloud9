const express = require("express");

const {
    getGeocode,
    getReverseGeocode,
} = require("../controllers/geocodeController");


const router = express.Router();


// Forward geocode: GET /api/geocode?q=place+name
router.get("/", getGeocode);

// Reverse geocode: GET /api/geocode/reverse?lat=25.1&lon=93.2
router.get("/reverse", getReverseGeocode);


module.exports = router;