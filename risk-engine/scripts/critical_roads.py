"""
critical_roads.py — Offline precompute: critical road segment analysis

Finds bridge edges (whose removal disconnects the road network) and
quantifies how many settlements each bridge isolates.

Run from risk-engine/ directory:
    python scripts/critical_roads.py

Outputs:
    data/critical_roads.json   — list of critical segments with settlement impact

Requirements:
    pip install networkx shapely pandas
"""

import json
import math
import csv
from pathlib import Path

try:
    import networkx as nx
except ImportError:
    raise SystemExit("networkx not installed. Run: pip install networkx")

try:
    from shapely.geometry import LineString, Point
    HAS_SHAPELY = True
except ImportError:
    HAS_SHAPELY = False
    print("⚠ shapely not installed — using simplified distance. Run: pip install shapely")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
DATA_DIR   = Path(__file__).parent.parent / "data"
OUTPUT     = DATA_DIR / "critical_roads.json"
POINTS_CSV = DATA_DIR / "landslide_points.csv"

# ---------------------------------------------------------------------------
# NER Synthetic Road Network
# A realistic approximation of key NER highway segments.
# Each edge: (node_a, node_b, road_name, length_km, [lat, lon] of midpoint)
# Nodes are named key junction locations.
# ---------------------------------------------------------------------------
NER_NODES = {
    "Guwahati":       (26.1445, 91.7362),
    "Shillong":       (25.5744, 91.8933),
    "Silchar":        (24.8220, 92.7978),
    "Haflong":        (25.1651, 93.0173),
    "Maibong":        (25.3000, 92.6000),
    "Lumding":        (25.7500, 93.1700),
    "Jiribam":        (24.8000, 93.1200),
    "Imphal":         (24.8170, 93.9368),
    "Moreh":          (24.2200, 94.2700),
    "Dimapur":        (25.9057, 93.7270),
    "Kohima":         (25.6751, 94.1086),
    "Agartala":       (23.8315, 91.2868),
    "Aizawl":         (23.7271, 92.7176),
    "Karimganj":      (24.8694, 92.3557),
    "Hailakandi":     (24.6826, 92.5642),
    "Lakhipur":       (24.7900, 92.9000),
    "Dima Hasao HQ":  (25.1100, 92.9988),
    "Retzol":         (25.1101, 92.9988),
    "Chhota Kapurchhara": (24.9500, 92.8500),
    "Bokajan":        (26.0100, 93.5900),
    "Diphu":          (25.8412, 93.4352),
    "Lanka":          (26.0700, 92.7900),
    "Hojai":          (26.0000, 92.8500),
    "Jatinga":        (25.0050, 92.9000),
    "Mahur":          (24.9400, 93.1100),
}

NER_EDGES = [
    # NH-37 / NH-6 corridor
    ("Guwahati", "Lumding",   "NH-37", 180),
    ("Lumding",  "Silchar",   "NH-6",  90),
    ("Silchar",  "Karimganj", "NH-6",  45),
    # NH-40 / NH-306 Shillong–Silchar (high risk)
    ("Shillong", "Maibong",   "NH-40", 110),
    ("Maibong",  "Haflong",   "NH-40", 50),
    ("Haflong",  "Jatinga",   "NH-40", 20),
    ("Jatinga",  "Mahur",     "NH-40", 30),
    ("Mahur",    "Lakhipur",  "NH-40", 40),
    ("Lakhipur", "Silchar",   "NH-40", 35),
    # SH-5 (single-road into Haflong basin)
    ("Haflong",  "Dima Hasao HQ", "SH-5", 15),
    ("Dima Hasao HQ", "Retzol", "SH-5-spur", 5),
    # NH-2 Imphal corridor
    ("Jiribam",  "Imphal",    "NH-37(old)", 250),
    ("Imphal",   "Moreh",     "NH-102",     110),
    # Dimapur–Kohima (key NH-29)
    ("Dimapur",  "Kohima",    "NH-29",  74),
    ("Guwahati", "Dimapur",   "NH-27",  280),
    # Assam Valley spurs
    ("Guwahati", "Shillong",  "NH-40",  98),
    ("Guwahati", "Lanka",     "NH-15",  80),
    ("Lanka",    "Lumding",   "NH-15",  40),
    ("Lumding",  "Bokajan",   "SH",     60),
    ("Bokajan",  "Diphu",     "NH-36",  20),
    ("Hojai",    "Lumding",   "SH",     30),
    ("Guwahati", "Hojai",     "NH-27",  90),
    # East Manipur / Nagaland
    ("Kohima",   "Imphal",    "NH-39",  75),
    ("Dimapur",  "Imphal",    "NH-39",  215),
    # Mizoram
    ("Silchar",  "Aizawl",    "NH-54",  190),
    # Tripura
    ("Agartala", "Silchar",   "NH-8",   175),
    ("Agartala", "Karimganj", "NH-44",  100),
    # Hailakandi spurs (critical isolation)
    ("Hailakandi","Silchar",  "NH-306", 50),
    ("Hailakandi","Karimganj","SH",     40),
    # Isolated spur into Chhota Kapurchhara (single road)
    ("Silchar", "Chhota Kapurchhara", "Forest Road", 40),
]

# Settlements derived from landslide_points.csv and known village locations
EXTRA_SETTLEMENTS = [
    ("Retzol Village",          25.1101, 92.9988, "Retzol"),
    ("Chhota Kapurchhara Town", 24.9500, 92.8500, "Chhota Kapurchhara"),
    ("Jatinga Village",         25.0050, 92.9000, "Jatinga"),
    ("Mahur Town",              24.9400, 93.1100, "Mahur"),
    ("Haflong Civil Lines",     25.1651, 93.0173, "Haflong"),
    ("Dima Hasao HQ Area",      25.1100, 92.9988, "Dima Hasao HQ"),
]


def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def load_settlements_from_csv():
    """Load named points from landslide_points.csv as proxy settlements."""
    settlements = []
    if not POINTS_CSV.exists():
        print(f"⚠ {POINTS_CSV} not found — using hardcoded settlements only")
        return settlements
    with open(POINTS_CSV, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            try:
                lat = float(row.get('lat') or row.get('latitude') or row.get('Lat') or 0)
                lon = float(row.get('lon') or row.get('longitude') or row.get('Lon') or 0)
                name = row.get('name') or row.get('Name') or row.get('location') or f"Settlement-{i+1}"
                if lat and lon:
                    settlements.append((name, lat, lon))
            except (ValueError, KeyError):
                continue
    print(f"✓ Loaded {len(settlements)} settlements from {POINTS_CSV.name}")
    return settlements


def snap_to_nearest_node(lat, lon, nodes):
    """Return the node name nearest to (lat, lon)."""
    best, best_d = None, float('inf')
    for name, (nlat, nlon) in nodes.items():
        d = haversine_km(lat, lon, nlat, nlon)
        if d < best_d:
            best, best_d = name, d
    return best


def build_graph():
    G = nx.Graph()
    for name, (lat, lon) in NER_NODES.items():
        G.add_node(name, lat=lat, lon=lon)
    for a, b, road, length in NER_EDGES:
        G.add_edge(a, b, road=road, length_km=length)
    return G


def main():
    print("─── Cloud9 Critical Roads Precompute ───")
    G = build_graph()
    print(f"✓ Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    # Load settlements
    csv_settlements = load_settlements_from_csv()
    all_settlements = []
    for name, lat, lon in csv_settlements:
        node = snap_to_nearest_node(lat, lon, dict(G.nodes(data=False)))
        all_settlements.append({"name": name, "lat": lat, "lon": lon, "nearest_node": node})
    for name, lat, lon, node in EXTRA_SETTLEMENTS:
        all_settlements.append({"name": name, "lat": lat, "lon": lon, "nearest_node": node})
    print(f"✓ Total settlements: {len(all_settlements)}")

    # Find bridge edges
    bridges = list(nx.bridges(G))
    print(f"✓ Found {len(bridges)} bridge edges (critical segments)")

    results = []
    for (u, v) in bridges:
        # Simulate removal
        G_temp = G.copy()
        G_temp.remove_edge(u, v)
        components = list(nx.connected_components(G_temp))

        # Main component = largest one
        main_comp = max(components, key=len)

        # Settlements cut off = in any smaller component
        cut_off = []
        for s in all_settlements:
            node = s["nearest_node"]
            if node not in main_comp:
                cut_off.append(s["name"])

        edge_data = G.edges[u, v]
        road_name = edge_data.get("road", "Unknown Road")
        length_km = edge_data.get("length_km", 0)
        lat_u, lon_u = NER_NODES.get(u, (0, 0))
        lat_v, lon_v = NER_NODES.get(v, (0, 0))
        mid_lat = (lat_u + lat_v) / 2
        mid_lon = (lon_u + lon_v) / 2

        results.append({
            "id": f"{u}--{v}",
            "road_name": road_name,
            "from_node": u,
            "to_node": v,
            "length_km": length_km,
            "mid_lat": round(mid_lat, 5),
            "mid_lon": round(mid_lon, 5),
            "from_lat": lat_u,
            "from_lon": lon_u,
            "to_lat": lat_v,
            "to_lon": lon_v,
            "settlements_cutoff": cut_off,
            "settlement_count": len(cut_off),
            "district": _guess_district(mid_lat, mid_lon),
        })

    # Sort by settlement count descending
    results.sort(key=lambda x: x["settlement_count"], reverse=True)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"✓ Written {len(results)} critical segments to {OUTPUT}")
    if results:
        top = results[0]
        print(f"  Top: {top['road_name']} ({top['from_node']} → {top['to_node']}) — {top['settlement_count']} settlements")


def _guess_district(lat, lon):
    """Very rough district label based on coordinates."""
    if 24.8 < lat < 25.5 and 92.5 < lon < 93.3:
        return "Dima Hasao"
    if 24.5 < lat < 25.0 and 92.3 < lon < 93.0:
        return "Cachar"
    if 24.5 < lat < 25.1 and 92.0 < lon < 92.5:
        return "Hailakandi"
    if 26.0 < lat < 26.3 and 91.5 < lon < 92.0:
        return "Kamrup"
    if 24.5 < lat < 25.0 and 93.5 < lon < 94.5:
        return "Imphal West"
    if 25.5 < lat < 26.0 and 93.5 < lon < 94.0:
        return "Dimapur"
    return "North East Region"


if __name__ == "__main__":
    main()
