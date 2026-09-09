"""
precompute_layers.py — One-time offline script.

Run ONCE before starting the API server:

    pip install -r requirements-dev.txt
    python scripts/precompute_layers.py

Produces three rasters in data/:
  • slope.tif         – slope in degrees (EPSG:4326, same grid as DEM)
  • aspect.tif        – aspect in degrees (EPSG:4326, same grid as DEM)
  • dist_to_road.tif  – distance to nearest driving road in metres (EPSG:4326)

These rasters are loaded once at startup by main.py and kept in memory;
pyrosm / geopandas / scipy are NOT needed at request time.
"""

from pathlib import Path
import sys

import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import calculate_default_transform, reproject, Resampling
from rasterio.features import rasterize

DATA_DIR = Path(__file__).parent.parent / "data"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def save_raster(path: Path, array: np.ndarray, meta: dict) -> None:
    m = meta.copy()
    m.update(dtype="float32", count=1)
    with rasterio.open(path, "w", **m) as dst:
        dst.write(array.astype("float32"), 1)
    print(f"  Saved {path.name}  shape={array.shape}  "
          f"min={np.nanmin(array):.2f}  max={np.nanmax(array):.2f}")


# ---------------------------------------------------------------------------
# Step A — Slope & Aspect from DEM.tif
# ---------------------------------------------------------------------------

def compute_slope_aspect() -> None:
    print("\n[A] Computing slope and aspect from DEM.tif ...")

    dem_path = DATA_DIR / "DEM.tif"
    if not dem_path.exists():
        sys.exit(f"ERROR: {dem_path} not found. Copy DEM.tif into data/ first.")

    with rasterio.open(dem_path) as src:
        dem = src.read(1).astype(float)
        transform = src.transform
        meta = src.meta.copy()
        nodata = src.nodata
        bounds = src.bounds

    # Mask nodata values
    if nodata is not None:
        dem[dem == nodata] = np.nan

    # Pixel size in degrees
    px_lon_deg = transform.a       # positive, degrees per pixel in x (east)
    px_lat_deg = -transform.e      # positive, degrees per pixel in y (north)

    # Convert degrees → metres using equirectangular approximation
    mean_lat_rad = np.radians((bounds.bottom + bounds.top) / 2.0)
    m_per_deg_lat = 111_320.0
    m_per_deg_lon = 111_320.0 * np.cos(mean_lat_rad)

    px_height_m = px_lat_deg * m_per_deg_lat   # metres per pixel (N-S)
    px_width_m  = px_lon_deg * m_per_deg_lon   # metres per pixel (E-W)

    # np.gradient: (row gradient, col gradient) = (N-S, E-W)
    dzdy, dzdx = np.gradient(dem, px_height_m, px_width_m)

    # Slope in degrees — same formula as the notebook
    slope_deg = np.degrees(np.arctan(np.sqrt(dzdx**2 + dzdy**2)))

    # Aspect in degrees (0 = North, clockwise) — same formula as the notebook
    aspect_deg = (90.0 - np.degrees(np.arctan2(dzdy, -dzdx))) % 360.0

    save_raster(DATA_DIR / "slope.tif",  slope_deg,  meta)
    save_raster(DATA_DIR / "aspect.tif", aspect_deg, meta)
    print("  [A] Done.\n")


# ---------------------------------------------------------------------------
# Step B — dist_to_road.tif from OSM .pbf
# ---------------------------------------------------------------------------

def compute_dist_to_road() -> None:
    print("[B] Computing dist_to_road.tif from OSM extract ...")

    # Lazy imports — NOT needed by the live API
    import geopandas as gpd
    from shapely.geometry import box, mapping
    from scipy.ndimage import distance_transform_edt
    from pyrosm import OSM

    pbf_path = DATA_DIR / "north-eastern-zone-260904.osm.pbf"
    if not pbf_path.exists():
        sys.exit(f"ERROR: {pbf_path} not found. Copy the .pbf file into data/ first.")

    dem_path = DATA_DIR / "DEM.tif"
    with rasterio.open(dem_path) as src:
        dem_width    = src.width
        dem_height   = src.height
        dem_bounds   = src.bounds
        dem_crs      = src.crs
        dem_transform = src.transform
        dem_meta     = src.meta.copy()

    # ---- Extract driving road network ----
    print("  Loading OSM driving network (may take a minute for large .pbf files) ...")
    osm = OSM(str(pbf_path))
    roads = osm.get_network(network_type="driving")
    roads = roads[roads.geometry.notnull()].copy()
    print(f"  Road segments loaded: {len(roads)}")

    # ---- Work in UTM 46N for metre-accurate distances ----
    UTM_CRS = "EPSG:32646"
    roads_utm = roads.to_crs(UTM_CRS)

    # Clip roads to DEM extent (plus a 5 km buffer to capture nearby roads)
    dem_box_wgs84 = gpd.GeoDataFrame(geometry=[box(*dem_bounds)], crs=dem_crs)
    dem_box_utm   = dem_box_wgs84.to_crs(UTM_CRS)
    # Add 5 km buffer so edge pixels get accurate distances
    dem_box_buffered = dem_box_utm.buffer(5000).unary_union
    roads_utm = roads_utm[roads_utm.geometry.intersects(dem_box_buffered)].copy()
    print(f"  Road segments within DEM extent: {len(roads_utm)}")

    # ---- Build UTM raster grid matching the DEM dimensions ----
    utm_transform, utm_width, utm_height = calculate_default_transform(
        dem_crs, UTM_CRS, dem_width, dem_height, *dem_bounds
    )
    px_size_m = abs(utm_transform.a)   # metres per pixel (square pixels assumed)

    # ---- Rasterise road centrelines onto the UTM grid ----
    road_geoms = [
        (mapping(geom), 1)
        for geom in roads_utm.geometry
        if geom is not None and not geom.is_empty
    ]

    if not road_geoms:
        sys.exit("ERROR: No valid road geometries found within DEM extent.")

    road_mask = rasterize(
        road_geoms,
        out_shape=(utm_height, utm_width),
        transform=utm_transform,
        fill=0,
        dtype="uint8",
    )
    print(f"  Road pixels burned: {road_mask.sum()}")

    # ---- Distance transform in pixel units → convert to metres ----
    # distance_transform_edt treats 0 as background (roads), 1 as foreground
    # We want distance FROM each pixel TO the nearest road pixel (value=1).
    dist_px  = distance_transform_edt(road_mask == 0)   # 0 = road pixel
    dist_m   = dist_px * px_size_m

    # ---- Save a temporary UTM raster ----
    tmp_path = DATA_DIR / "_dist_to_road_utm.tif"
    utm_meta = dem_meta.copy()
    utm_meta.update({
        "crs":       UTM_CRS,
        "transform": utm_transform,
        "width":     utm_width,
        "height":    utm_height,
        "dtype":     "float32",
        "count":     1,
        "nodata":    -9999.0,
    })
    with rasterio.open(tmp_path, "w", **utm_meta) as dst:
        dst.write(dist_m.astype("float32"), 1)

    # ---- Reproject back to WGS-84 (same grid as DEM) ----
    out_meta = dem_meta.copy()
    out_meta.update(dtype="float32", count=1, nodata=-9999.0)

    with rasterio.open(tmp_path) as utm_src, \
         rasterio.open(DATA_DIR / "dist_to_road.tif", "w", **out_meta) as dst:
        reproject(
            source=rasterio.band(utm_src, 1),
            destination=rasterio.band(dst, 1),
            src_transform=utm_src.transform,
            src_crs=utm_src.crs,
            dst_transform=dem_transform,
            dst_crs=dem_crs,
            resampling=Resampling.bilinear,
        )

    tmp_path.unlink()
    print(f"  dist_to_road.tif written to {DATA_DIR / 'dist_to_road.tif'}")
    print("  [B] Done.\n")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("precompute_layers.py — generating derived rasters")
    print("=" * 60)
    compute_slope_aspect()
    compute_dist_to_road()
    print("All layers computed successfully.")
    print("You can now start the API:  uvicorn main:app --reload --port 8000")
