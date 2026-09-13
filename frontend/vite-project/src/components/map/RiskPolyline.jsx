/**
 * RiskPolyline.jsx
 *
 * Draws a route as multiple colored polyline chunks based on which NER road
 * segments the route passes through.
 *
 * Color mapping:
 *   high   → #ef4444 (red)
 *   medium → #f59e0b (amber)
 *   low    → #22c55e (green)
 *   none   → #3b82f6 (blue — no segment data)
 *
 * The route is split into chunks of CHUNK_SIZE points. Each chunk is tested
 * against every NER segment: if any point in the chunk is within SNAP_M metres
 * of any waypoint on that segment, the chunk inherits that segment's risk.
 */

import { Polyline, Popup } from 'react-leaflet';
import { useMemo } from 'react';

// ── NER road segments (same as MapPanel — single source of truth) ──────────
export const NER_ROAD_SEGMENTS = [
  {
    id: 'Haflong--Dima Hasao HQ',
    road_name: 'SH-5',
    from_node: 'Haflong', to_node: 'Dima Hasao HQ',
    path: [[25.1651, 93.0173], [25.145, 93.010], [25.128, 93.004], [25.11, 92.9988]],
    risk_level: 'high', length_km: 15, district: 'Dima Hasao',
    slope_deg: 32, rainfall_mm: 112,
    reason: 'Steep escarpment, recurring landslide zone, unstable regolith',
  },
  {
    id: 'Silchar--Chhota Kapurchhara',
    road_name: 'Forest Road',
    from_node: 'Silchar', to_node: 'Chhota Kapurchhara',
    path: [[24.822, 92.7978], [24.868, 92.810], [24.905, 92.825], [24.95, 92.85]],
    risk_level: 'high', length_km: 40, district: 'Dima Hasao',
    slope_deg: 24, rainfall_mm: 88,
    reason: 'Forest road — active erosion and seasonal flooding',
  },
  {
    id: 'Jiribam--Imphal',
    road_name: 'NH-37(old)',
    from_node: 'Jiribam', to_node: 'Imphal',
    path: [[24.8, 93.12], [24.802, 93.28], [24.808, 93.52], [24.812, 93.73], [24.817, 93.9368]],
    risk_level: 'high', length_km: 250, district: 'Imphal West',
    slope_deg: 26, rainfall_mm: 105,
    reason: 'Hill passes — frequent rockfalls, active slide inventory',
  },
  {
    id: 'Dima Hasao HQ--Retzol',
    road_name: 'SH-5 Spur',
    from_node: 'Dima Hasao HQ', to_node: 'Retzol',
    path: [[25.11, 92.9988], [25.1101, 92.9988]],
    risk_level: 'medium', length_km: 5, district: 'Dima Hasao',
    slope_deg: 18, rainfall_mm: 74,
    reason: 'Remote spur — limited access, monsoon impact',
  },
  {
    id: 'Silchar--Aizawl',
    road_name: 'NH-54',
    from_node: 'Silchar', to_node: 'Aizawl',
    path: [[24.822, 92.7978], [24.58, 92.775], [24.32, 92.750], [24.12, 92.735], [23.7271, 92.7176]],
    risk_level: 'medium', length_km: 190, district: 'North East Region',
    slope_deg: 22, rainfall_mm: 95,
    reason: 'Mizoram hills — moderate risk in monsoon season',
  },
  {
    id: 'Bokajan--Diphu',
    road_name: 'NH-36',
    from_node: 'Bokajan', to_node: 'Diphu',
    path: [[26.01, 93.59], [25.93, 93.52], [25.8412, 93.4352]],
    risk_level: 'medium', length_km: 20, district: 'Dimapur',
    slope_deg: 16, rainfall_mm: 65,
    reason: 'Hilly terrain — occasional slope instability',
  },
  {
    id: 'Guwahati--Dimapur',
    road_name: 'NH-27',
    from_node: 'Guwahati', to_node: 'Dimapur',
    path: [[26.1445, 91.7362], [26.12, 92.0], [26.07, 92.3], [26.04, 92.6], [25.95, 93.1], [25.9057, 93.727]],
    risk_level: 'low', length_km: 280, district: 'Assam Corridor',
    slope_deg: 8, rainfall_mm: 52, reason: null,
  },
  {
    id: 'Lumding--Bokajan',
    road_name: 'SH (Lumding–Bokajan)',
    from_node: 'Lumding', to_node: 'Bokajan',
    path: [[25.75, 93.17], [25.82, 93.28], [25.90, 93.42], [26.01, 93.59]],
    risk_level: 'low', length_km: 60, district: 'North East Region',
    slope_deg: 14, rainfall_mm: 60, reason: null,
  },
  {
    id: 'Imphal--Moreh',
    road_name: 'NH-102',
    from_node: 'Imphal', to_node: 'Moreh',
    path: [[24.817, 93.9368], [24.68, 94.05], [24.50, 94.14], [24.22, 94.27]],
    risk_level: 'low', length_km: 110, district: 'Imphal West',
    slope_deg: 12, rainfall_mm: 48, reason: null,
  },
];

// ── Haversine in metres ─────────────────────────────────────────────────────
function haverM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Minimum distance from a point to the nearest waypoint OR interpolated edge on a segment's path
function distToSegment(lat, lon, seg) {
  let best = Infinity;
  const pts = seg.path;
  for (let i = 0; i < pts.length; i++) {
    // Distance to waypoint
    best = Math.min(best, haverM(lat, lon, pts[i][0], pts[i][1]));
    // Distance to the midpoint of each edge (better coverage for long segments)
    if (i < pts.length - 1) {
      const midLat = (pts[i][0] + pts[i + 1][0]) / 2;
      const midLon = (pts[i][1] + pts[i + 1][1]) / 2;
      best = Math.min(best, haverM(lat, lon, midLat, midLon));
    }
  }
  return best;
}

// ── Config ──────────────────────────────────────────────────────────────────
const CHUNK_SIZE = 8;       // route points per color chunk
const SNAP_M     = 8000;    // metres — 8 km snap radius for NER highway segments

// Risk → style
const RISK_STYLE = {
  high:   { color: '#ef4444', weight: 7, opacity: 0.95, label: '🔴 HIGH RISK' },
  medium: { color: '#f59e0b', weight: 6, opacity: 0.90, label: '🟡 CAUTION'   },
  low:    { color: '#22c55e', weight: 5, opacity: 0.82, label: '🟢 CLEAR'      },
  none:   { color: '#22c55e', weight: 5, opacity: 0.70, label: '🟢 CLEAR'      }, // unscored = green (safe default)
};

// ── Exported helper: which segments does a route cross? ────────────────────
export function getRouteCrossedSegments(routeCoords, segments = NER_ROAD_SEGMENTS) {
  const crossed = [];
  for (const seg of segments) {
    const hit = routeCoords.some(([lat, lon]) => distToSegment(lat, lon, seg) < SNAP_M);
    if (hit) crossed.push(seg);
  }
  return crossed;
}

// ── Main component ──────────────────────────────────────────────────────────
/**
 * @param {Array}  routeCoords  [[lat,lon], ...]  — full OSRM decoded route
 * @param {Array}  segments     override NER_ROAD_SEGMENTS (for live risk updates)
 * @param {boolean} safeDetour  true = draw as dashed green (the "safe" alternative)
 */
export const RiskPolyline = ({ routeCoords, segments = NER_ROAD_SEGMENTS, safeDetour = false }) => {

  const chunks = useMemo(() => {
    if (!routeCoords?.length) return [];

    // If this is a safe-detour overlay, just render solid green
    if (safeDetour) {
      return [{ coords: routeCoords, risk: 'low', seg: null }];
    }

    const result = [];
    let i = 0;
    while (i < routeCoords.length) {
      const slice = routeCoords.slice(i, i + CHUNK_SIZE + 1); // +1 for overlap

      // Test ALL points in the chunk (not just midpoint) — picks the highest-risk segment found
      let bestSeg  = null;
      let bestDist = Infinity;
      let worstRisk = 'none';
      const RISK_RANK = { high: 3, medium: 2, low: 1, none: 0 };

      for (const [lat, lon] of slice) {
        for (const seg of segments) {
          const d = distToSegment(lat, lon, seg);
          if (d < SNAP_M) {
            // Prefer segments with higher risk, then closer distance
            if ((RISK_RANK[seg.risk_level] ?? 0) > (RISK_RANK[worstRisk] ?? 0) ||
                ((RISK_RANK[seg.risk_level] ?? 0) === (RISK_RANK[worstRisk] ?? 0) && d < bestDist)) {
              bestSeg  = seg;
              bestDist = d;
              worstRisk = seg.risk_level ?? 'low';
            }
          }
        }
      }

      result.push({ coords: slice, risk: worstRisk, seg: bestSeg });
      i += CHUNK_SIZE;
    }
    return result;
  }, [routeCoords, segments, safeDetour]);

  if (!chunks.length) return null;

  return (
    <>
      {chunks.map((chunk, idx) => {
        const style = RISK_STYLE[chunk.risk] ?? RISK_STYLE.none;
        const dashArray = safeDetour ? '8 6' : null;

        return (
          <Polyline
            key={idx}
            positions={chunk.coords}
            pathOptions={{
              color:     style.color,
              weight:    safeDetour ? 5 : style.weight,
              opacity:   safeDetour ? 0.85 : style.opacity,
              dashArray,
              lineCap:   'round',
              lineJoin:  'round',
            }}
            eventHandlers={{
              mouseover: (e) => e.target.setStyle({ weight: (safeDetour ? 5 : style.weight) + 3, opacity: 1 }),
              mouseout:  (e) => e.target.setStyle({ weight: safeDetour ? 5 : style.weight, opacity: safeDetour ? 0.85 : style.opacity }),
            }}
          >
            {chunk.seg && (
              <Popup minWidth={220}>
                <div style={{ padding: '6px 2px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6,
                    color: style.color }}>
                    {style.label}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 4 }}>
                    {chunk.seg.road_name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: 6 }}>
                    {chunk.seg.from_node} → {chunk.seg.to_node}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 10px', fontSize: '0.75rem', marginBottom: 6 }}>
                    <span>📏 {chunk.seg.length_km} km</span>
                    <span>🏔 Slope {chunk.seg.slope_deg}°</span>
                    <span>🌧 {chunk.seg.rainfall_mm} mm/7d</span>
                    <span>📍 {chunk.seg.district}</span>
                  </div>
                  {chunk.seg.reason && (
                    <div style={{
                      fontSize: '0.72rem', color: '#666',
                      background: `${style.color}15`,
                      borderLeft: `3px solid ${style.color}`,
                      padding: '4px 8px', borderRadius: '0 4px 4px 0',
                    }}>
                      ⚠ {chunk.seg.reason}
                    </div>
                  )}
                  {safeDetour && (
                    <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
                      ✓ Safer detour — avoiding high-risk segments
                    </div>
                  )}
                </div>
              </Popup>
            )}
          </Polyline>
        );
      })}
    </>
  );
};
