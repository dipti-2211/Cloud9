#!/usr/bin/env python3
"""
generate_demo_locations.py
--------------------------
Picks 3 high-risk + 3 low-risk demo locations from the real landslide_points.csv,
scores them with the trained model, reverse-geocodes them via Nominatim, and writes
the result to frontend/src/data/demoLocations.json.

Usage (from repo root or from risk-engine/scripts/):
    cd /path/to/cloud9/SIH26002/risk-engine
    .venv/bin/python3 scripts/generate_demo_locations.py
"""

import sys, time, math, json
from pathlib import Path

# ── dependency check ─────────────────────────────────────────────────────────
try:
    import pandas as pd
    import joblib
    import requests
    from pyproj import Transformer
    from shapely import wkt as shapely_wkt
except ImportError as e:
    sys.exit(f"Missing dependency: {e}. Run: pip install pandas joblib pyproj shapely requests")

# ── paths ─────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).resolve().parent
REPO_ROOT    = SCRIPT_DIR.parents[3]           # cloud9/
DATASETS_DIR = REPO_ROOT / "datasets"
MODEL_PATH   = DATASETS_DIR / "landslide_model.pkl"
CSV_PATH     = DATASETS_DIR / "landslide_points.csv"
OUT_JSON     = (
    SCRIPT_DIR.parents[1]                      # SIH26002/
    / "frontend" / "vite-project" / "src" / "data" / "demoLocations.json"
)

for p in (MODEL_PATH, CSV_PATH):
    if not p.exists():
        sys.exit(f"Required file not found: {p}")

# ── load model ────────────────────────────────────────────────────────────────
print("Loading model …")
model = joblib.load(MODEL_PATH)
FEATURE_COLS = ["elevation", "slope", "aspect", "dist_to_road", "rainfall"]

# ── load CSV ─────────────────────────────────────────────────────────────────
print("Loading CSV …")
df = pd.read_csv(CSV_PATH)
print(f"  {len(df)} rows loaded")

# ── parse WKT geometry → UTM (x, y) ──────────────────────────────────────────
def parse_wkt_point(wkt_str: str):
    """Return (x, y) from 'POINT (x y)' WKT string."""
    try:
        pt = shapely_wkt.loads(wkt_str)
        return pt.x, pt.y
    except Exception:
        # fallback: manual parse
        inner = wkt_str.strip().removeprefix("POINT").strip(" ()")
        parts = inner.split()
        return float(parts[0]), float(parts[1])

coords_xy = df["geometry"].apply(parse_wkt_point)
df["utm_x"] = [c[0] for c in coords_xy]
df["utm_y"] = [c[1] for c in coords_xy]

# ── convert UTM 46N → WGS-84 lat/lon ─────────────────────────────────────────
print("Projecting UTM → WGS-84 …")
transformer = Transformer.from_crs("EPSG:32646", "EPSG:4326", always_xy=True)
lons, lats = transformer.transform(df["utm_x"].values, df["utm_y"].values)
df["lat"] = lats
df["lon"] = lons

# ── score every row with the trained model ────────────────────────────────────
print("Running model inference on all rows …")
X = df[FEATURE_COLS].copy()
proba = model.predict_proba(X)[:, 1]    # probability of landslide
df["risk_pct"] = (proba * 100).round(2)

def risk_category(p: float) -> str:
    if p < 20: return "Very Low"
    if p < 40: return "Low"
    if p < 60: return "Moderate"
    if p < 80: return "High"
    return "Very High"

df["risk_category"] = df["risk_pct"].apply(risk_category)

# ── haversine distance (metres) ───────────────────────────────────────────────
def haversine_m(lat1, lon1, lat2, lon2) -> float:
    R = 6_371_000
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dLon/2)**2
    return R * 2 * math.asin(math.sqrt(a))

# ── pick N points with spacing ≥ min_dist_m from each other ──────────────────
def pick_spaced(df_sorted: pd.DataFrame, n: int, min_dist_m: float = 2000) -> list:
    selected = []
    for _, row in df_sorted.iterrows():
        if len(selected) >= n:
            break
        too_close = any(
            haversine_m(row["lat"], row["lon"], s["lat"], s["lon"]) < min_dist_m
            for s in selected
        )
        if not too_close:
            selected.append(row.to_dict())
    return selected

print("Selecting demo locations …")
df_sorted_high = df.sort_values("risk_pct", ascending=False).reset_index(drop=True)
df_sorted_low  = df.sort_values("risk_pct", ascending=True).reset_index(drop=True)

risky_rows = pick_spaced(df_sorted_high, 3, min_dist_m=2000)
safe_rows  = pick_spaced(df_sorted_low,  3, min_dist_m=2000)

# ── reverse-geocode via Nominatim ─────────────────────────────────────────────
NOMINATIM_HEADERS = {
    # Nominatim requires a descriptive User-Agent and blocks generic Python UAs.
    # Using a browser-style UA avoids 403 responses.
    "User-Agent": (
        "Mozilla/5.0 (compatible; SIH26002-demo-picker/1.0; "
        "educational project; +https://github.com/SIH26002)"
    ),
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.openstreetmap.org/",
}

def reverse_geocode(lat: float, lon: float) -> str:
    """Return a human-readable place name, falling back to district-level text."""
    url = (
        f"https://nominatim.openstreetmap.org/reverse"
        f"?lat={lat}&lon={lon}&format=json&zoom=14&accept-language=en"
    )
    try:
        resp = requests.get(url, headers=NOMINATIM_HEADERS, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        addr = data.get("address", {})

        # Build a human-readable string from the most specific available fields
        parts = []
        for key in ("hamlet", "village", "suburb", "town", "city", "county", "district", "state_district"):
            if addr.get(key):
                parts.append(addr[key])
                if len(parts) >= 2:
                    break

        if not parts:
            # Fall back to display_name prefix
            display = data.get("display_name", "")
            parts = [display.split(",")[0].strip()] if display else []

        if not parts or parts[0].lower() in ("assam", "india", "northeast india"):
            return "Dima Hasao district (unnamed location)"

        # Append district if not already included
        district = addr.get("county") or addr.get("state_district") or addr.get("district") or ""
        if district and district not in parts:
            parts.append(district)

        return "Near " + ", ".join(parts)
    except Exception as exc:
        print(f"  ⚠ reverse-geocode failed for ({lat:.4f}, {lon:.4f}): {exc}")
        return "Dima Hasao district (unnamed location)"

print("Reverse-geocoding (6 calls with 1 s delay each) …")
results = []
for row in risky_rows + safe_rows:
    loc_type = "risky" if row in risky_rows else "safe"
    print(f"  [{loc_type}] ({row['lat']:.5f}, {row['lon']:.5f}) risk={row['risk_pct']:.1f}% …", end=" ", flush=True)
    name = reverse_geocode(row["lat"], row["lon"])
    print(name)
    results.append({
        "name":          name,
        "lat":           round(row["lat"], 6),
        "lon":           round(row["lon"], 6),
        "riskCategory":  row["risk_category"],
        "riskPercentage": row["risk_pct"],
        "type":          loc_type,
        "features": {
            "elevation":   round(row["elevation"], 1),
            "slope":       round(row["slope"], 2),
            "aspect":      round(row["aspect"], 1),
            "dist_to_road":round(row["dist_to_road"], 1),
            "rainfall":    round(row["rainfall"], 4),
        }
    })
    time.sleep(1.1)  # respect Nominatim 1 req/s limit

# ── write JSON ────────────────────────────────────────────────────────────────
OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
with open(OUT_JSON, "w") as f:
    json.dump(results, f, indent=2)
print(f"\nWritten → {OUT_JSON}")

# ── summary table ─────────────────────────────────────────────────────────────
print("\n" + "="*70)
print(f"{'Type':<8}  {'Risk %':>6}  {'Category':<12}  {'Name'}")
print("-"*70)
for r in results:
    print(f"{r['type']:<8}  {r['riskPercentage']:>6.1f}%  {r['riskCategory']:<12}  {r['name']}")
print("="*70)
print("\nSanity-check the lat/lon against Google Maps before committing. ✓")
