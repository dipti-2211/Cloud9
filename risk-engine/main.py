"""
main.py — Landslide Risk Engine

FastAPI service that loads all geospatial rasters + ML model ONCE at startup
and exposes GET /predict?lat=&lon= for instant risk inference.

Start with:
    uvicorn main:app --reload --port 8000
"""

from pathlib import Path
from typing import List
import time
import math

import joblib
import numpy as np
import pandas as pd
import rasterio
import xarray as xr
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

DATA_DIR = Path(__file__).parent / "data"

_REQUIRED_FILES = [
    "DEM.tif",
    "slope.tif",
    "aspect.tif",
    "dist_to_road.tif",
    "landslide_model.pkl",
]

_RAINFALL_FILES = [
    "RF25_indselect_rfp25.nc",
    "RF25_ind2024_rfp25.nc",   # fallback name variant
]

# ---------------------------------------------------------------------------
# Module-level resources — loaded once when the process starts
# ---------------------------------------------------------------------------

for _f in _REQUIRED_FILES:
    _path = DATA_DIR / _f
    if not _path.exists():
        _derived = {"slope.tif", "aspect.tif", "dist_to_road.tif"}
        if _f in _derived:
            raise RuntimeError(
                f"Derived raster not found: {_path}\n"
                "Run the precompute script first:\n"
                "  pip install -r requirements-dev.txt\n"
                "  python scripts/precompute_layers.py"
            )
        raise RuntimeError(
            f"Required file not found: {_path}\n"
            "Ensure data/ contains DEM.tif and landslide_model.pkl."
        )

# Rasterio file handles — kept open for fast .sample() calls
_dem_src    = rasterio.open(DATA_DIR / "DEM.tif")
_slope_src  = rasterio.open(DATA_DIR / "slope.tif")
_aspect_src = rasterio.open(DATA_DIR / "aspect.tif")
_dist_src   = rasterio.open(DATA_DIR / "dist_to_road.tif")


# Rainfall — mean over time dimension computed once, stored as DataArray
# The .nc file may be a placeholder (0 bytes) until the user places the real file.
_rain_da = None
_nc_path = next(
    (DATA_DIR / f for f in _RAINFALL_FILES if (DATA_DIR / f).exists() and (DATA_DIR / f).stat().st_size > 0),
    None,
)
if _nc_path is not None:
    try:
        _rain_ds = xr.open_dataset(_nc_path)
        # Average across the time dimension once — makes per-request lookup O(1)
        _rain_da = _rain_ds["RAINFALL"].mean("time")
        print(f"✓ Rainfall dataset loaded and time-averaged ({_nc_path.name})")
    except Exception as _nc_err:
        print(f"⚠ WARNING: Could not load rainfall dataset: {_nc_err}")
        print("  Rainfall values will be reported as 0.0 until a valid .nc file is placed in data/")
else:
    print("⚠ WARNING: No valid rainfall NetCDF found in data/.")
    print("  Expected one of:", _RAINFALL_FILES)
    print("  Rainfall values will default to 0.0. Place the real file in data/ and restart.")

# ML model
_model = joblib.load(DATA_DIR / "landslide_model.pkl")

print("✓ DEM, slope, aspect, dist_to_road rasters loaded")
print("✓ ML model loaded")


# ---------------------------------------------------------------------------
# Live-rainfall cache
# ---------------------------------------------------------------------------
# Keyed by (lat rounded to 0.05 deg, lon rounded to 0.05 deg).
# TTL: 15 minutes — short enough to pick up rainfall events, long enough to avoid
# hammering the API on batch predict-batch calls (Route Planner samples ~20 pts/route).
#
# Effect: for a typical route-risk check with 20 points, most points will share the
# same ~0.05° bucket → 1-4 live API calls total instead of 20.

_RAIN_CACHE: dict = {}          # key → (rainfall_mm, timestamp, source)
_RAIN_CACHE_TTL  = 15 * 60     # seconds
_CACHE_GRID_DEG  = 0.05        # degrees — bucket size for cache key


def _cache_key(lat: float, lon: float) -> tuple:
    """Round to nearest 0.05° grid cell for cache lookup."""
    return (round(lat / _CACHE_GRID_DEG) * _CACHE_GRID_DEG,
            round(lon / _CACHE_GRID_DEG) * _CACHE_GRID_DEG)


def _fetch_live_rainfall(lat: float, lon: float) -> tuple[float, str]:
    """
    Fetch recent 24-hour accumulated precipitation from Open-Meteo (free, no API key).

    Returns (rainfall_mm, source) where source is "live" or "historical_average".
    Falls back to the static NetCDF value (or 0.0) on any failure.
    """
    key = _cache_key(lat, lon)
    now = time.time()

    # ── Cache hit ─────────────────────────────────────────────────────────
    if key in _RAIN_CACHE:
        cached_val, cached_ts, cached_src = _RAIN_CACHE[key]
        if now - cached_ts < _RAIN_CACHE_TTL:
            return cached_val, cached_src

    # ── Cache miss: try live Open-Meteo ───────────────────────────────────
    static_fallback = _sample_rainfall_static(lat, lon)

    try:
        import urllib.request
        import json

        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&hourly=precipitation"
            f"&past_days=1&forecast_days=0"
            f"&timezone=Asia%2FKolkata"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "SIH26002-risk-engine/1.0"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read())

        # Sum the last 24 h of hourly precipitation values
        precip_list = data.get("hourly", {}).get("precipitation", [])
        # Open-Meteo returns 48 values (24h past + 24h forecast) when past_days=1, forecast_days=0;
        # take the last 24 as the most recent completed hours.
        recent = precip_list[-24:] if len(precip_list) >= 24 else precip_list
        rainfall_mm = sum(v for v in recent if v is not None and not math.isnan(v))

        _RAIN_CACHE[key] = (rainfall_mm, now, "live")
        return rainfall_mm, "live"

    except Exception as exc:
        # Network failure, timeout, or malformed response — use static fallback silently.
        # Cache the fallback value too so we don't retry every request during an outage.
        print(f"⚠ Live weather unavailable ({exc!r}) — using historical average")
        _RAIN_CACHE[key] = (static_fallback, now, "historical_average")
        return static_fallback, "historical_average"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Nodata sentinel returned by rasterio when coordinates land on a no-data pixel.
_DEM_NODATA = _dem_src.nodata  # typically -32768.0


def _sample(src: rasterio.DatasetReader, lat: float, lon: float) -> float:
    """Sample a single float value from a rasterio dataset at (lat, lon)."""
    val = list(src.sample([(lon, lat)]))[0][0]
    return float(val)


def _sample_rainfall_static(lat: float, lon: float) -> float:
    """Nearest-neighbour lookup from the pre-averaged rainfall DataArray.
    Returns 0.0 if no rainfall dataset is loaded (placeholder .nc file)."""
    if _rain_da is None:
        return 0.0
    val = _rain_da.sel(LATITUDE=lat, LONGITUDE=lon, method="nearest")
    return float(val.values)


def _is_nodata(val: float) -> bool:
    """True if val is the raster's nodata sentinel or NaN — i.e. outside actual data coverage."""
    if math.isnan(val):
        return True
    if _DEM_NODATA is not None and val == _DEM_NODATA:
        return True
    return val <= -9999


# Canonical outside-coverage response shape — HTTP 200, not 500.
_OUTSIDE_COVERAGE = {
    "error": "outside_coverage",
    "message": (
        "This location is outside the model's data coverage area (North-Eastern India, "
        "lat 24.97–25.83, lon 92.52–93.47). The landslide risk model was trained on the "
        "Dima Hasao district DEM and cannot make predictions outside it."
    ),
}


def _get_risk_category(probability: float) -> str:
    """Return a human-readable risk category from a [0,1] probability score."""
    if probability < 0.20:
        return "Very Low"
    elif probability < 0.40:
        return "Low"
    elif probability < 0.60:
        return "Moderate"
    elif probability < 0.80:
        return "High"
    else:
        return "Very High"


def _extract_all_features(lat: float, lon: float) -> dict:
    """
    Replicate extract_all_features() from the notebook using in-memory rasters.
    Returns a dict with: elevation, slope, aspect, dist_to_road, rainfall, rainfall_source.
    Raises ValueError with outside_coverage key if the DEM pixel is nodata.
    """
    elevation = _sample(_dem_src, lat, lon)

    if _is_nodata(elevation):
        raise ValueError("outside_coverage")

    slope        = _sample(_slope_src,  lat, lon)
    aspect       = _sample(_aspect_src, lat, lon)
    dist_to_road = _sample(_dist_src,   lat, lon)

    # Try live Open-Meteo first; fall back to static NetCDF average
    rainfall, rainfall_source = _fetch_live_rainfall(lat, lon)

    return {
        "elevation":      elevation,
        "slope":          slope,
        "aspect":         aspect,
        "dist_to_road":   dist_to_road,
        "rainfall":       rainfall,
        "rainfall_source": rainfall_source,
    }


def _predict_landslide_risk(lat: float, lon: float) -> dict:
    """
    Full pipeline: extract features → model inference → risk category.
    Returns _OUTSIDE_COVERAGE sentinel dict if the point has nodata elevation.
    """
    try:
        features = _extract_all_features(lat, lon)
    except ValueError as exc:
        if str(exc) == "outside_coverage":
            return {**_OUTSIDE_COVERAGE, "latitude": lat, "longitude": lon}
        raise

    X = pd.DataFrame(
        [[
            features["elevation"],
            features["slope"],
            features["aspect"],
            features["dist_to_road"],
            features["rainfall"],
        ]],
        columns=["elevation", "slope", "aspect", "dist_to_road", "rainfall"],
    )

    prediction  = int(_model.predict(X)[0])
    probability = float(_model.predict_proba(X)[0, 1])

    return {
        "latitude":        lat,
        "longitude":       lon,
        "elevation":       round(features["elevation"], 2),
        "slope":           round(features["slope"], 4),
        "aspect":          round(features["aspect"], 4),
        "dist_to_road":    round(features["dist_to_road"], 2),
        "rainfall":        round(features["rainfall"], 4),
        "rainfall_source": features["rainfall_source"],   # "live" | "historical_average"
        "prediction":      prediction,
        "risk_percentage": round(probability * 100, 2),
        "risk_category":   _get_risk_category(probability),
    }


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Landslide Risk Engine",
    description="Predict landslide risk probability at any lat/lon within the DEM coverage area.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1707",
        "http://localhost:1710",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:1710",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """Liveness check — returns 200 if the service is up and models are loaded."""
    return {"status": "ok"}


@app.get("/predict")
def predict(
    lat: float = Query(..., description="Latitude in decimal degrees (WGS-84)"),
    lon: float = Query(..., description="Longitude in decimal degrees (WGS-84)"),
):
    """
    Predict landslide risk probability at the given coordinates.

    Returns elevation, slope, aspect, distance-to-road, rainfall (live or historical average),
    alongside the model's binary prediction (0/1), risk percentage, risk category,
    and rainfall_source ("live" | "historical_average") so the UI can indicate data provenance.

    If the coordinates are outside the DEM's coverage area, returns HTTP 200 with
    {"error": "outside_coverage", ...} — not a 5xx error.
    """
    dem_bounds = _dem_src.bounds
    if not (dem_bounds.left <= lon <= dem_bounds.right and
            dem_bounds.bottom <= lat <= dem_bounds.top):
        return {**_OUTSIDE_COVERAGE, "latitude": lat, "longitude": lon}

    try:
        result = _predict_landslide_risk(lat, lon)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return result


# ---------------------------------------------------------------------------
# Batch endpoint
# ---------------------------------------------------------------------------

class _Point(BaseModel):
    lat: float
    lon: float

class _BatchRequest(BaseModel):
    points: List[_Point]


@app.post("/predict-batch")
def predict_batch(body: _BatchRequest):
    """
    Predict landslide risk for multiple lat/lon points in a single request.

    Rainfall results are cached per ~0.05° grid cell with a 15-min TTL, so
    a Route Planner check with 20 sampled points makes at most a handful of
    live API calls instead of one per point.

    Request body: {"points": [{"lat": .., "lon": ..}, ...]}
    Response: {"results": [{...same fields as /predict...} | null, ...]}
    """
    dem_bounds = _dem_src.bounds
    results = []

    for pt in body.points:
        if not (dem_bounds.left <= pt.lon <= dem_bounds.right and
                dem_bounds.bottom <= pt.lat <= dem_bounds.top):
            results.append(None)
            continue
        try:
            result = _predict_landslide_risk(pt.lat, pt.lon)
            if isinstance(result, dict) and result.get("error") == "outside_coverage":
                results.append(None)
            else:
                results.append(result)
        except Exception as exc:
            print(f"⚠ predict-batch error at ({pt.lat}, {pt.lon}): {exc}")
            results.append(None)

    return {"results": results}
