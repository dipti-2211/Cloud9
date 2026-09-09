/**
 * RoutePanel.jsx
 *
 * Floating panel overlaid on the dashboard map that allows users to:
 *  1. Type a destination → geocoded via Express → Nominatim proxy (bounded to India)
 *  2. Show the resolved place name BEFORE fetching routes (Fix #2)
 *  3. Find routes from user's location (or map center) to that destination via OSRM
 *  4. Score each route for landslide risk via POST /api/route-risk
 *  5. Handle routes where most/all points are outside DEM coverage (Fix #3)
 *  6. Select a route → draws it on the map + shows turn-by-turn steps
 *
 * Routes are sorted lowest-risk first; top route labelled "Recommended".
 *
 * Note: OSRM public demo server (router.project-osrm.org) is rate-limited
 * and not for production — fine for demo/judging purposes.
 */

import { useState, useRef } from 'react';
import { Navigation, Search, X, ChevronDown, ChevronUp, Loader, MapPin } from 'lucide-react';
import { geocodePlace, getRouteRisk } from '../../services/api';

// ---------------------------------------------------------------------------
// Sample N evenly-spaced points from an array of [lat,lon]
// ---------------------------------------------------------------------------
const samplePoints = (coords, n = 20) => {
  if (coords.length <= n) return coords;
  const step = (coords.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => coords[Math.round(i * step)]);
};

// ---------------------------------------------------------------------------
// Decode a Google-encoded polyline (what OSRM returns) into [[lat,lon],...]
// ---------------------------------------------------------------------------
const decodePolyline = (encoded) => {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
};

// ---------------------------------------------------------------------------
// Risk badge colour from category
// ---------------------------------------------------------------------------
const RISK_COLOR = {
  'Very Low':  'var(--success)',
  'Low':       'var(--success)',
  'Moderate':  'var(--warning)',
  'High':      'var(--danger)',
  'Very High': 'var(--danger)',
};

const riskBadgeStyle = (cat) => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '10px',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: RISK_COLOR[cat] ?? 'var(--text-secondary)',
  background: `${RISK_COLOR[cat] ?? '#888'}22`,
  border: `1px solid ${RISK_COLOR[cat] ?? '#888'}`,
});

// ---------------------------------------------------------------------------
// Fix #3 — Score a route's risk results
// Returns { pct, worst, score, outsideCoverage }
// If >50% of sampled points are null (outside DEM), label the route accordingly.
// ---------------------------------------------------------------------------
const COVERAGE_THRESHOLD = 0.5; // if more than 50% null → outside coverage

const scoreRoute = (results) => {
  const total = results.length;
  const valid = results.filter(Boolean);
  const nullCount = total - valid.length;

  // Fix #3: majority of points outside coverage → don't compute a misleading percentage
  if (total > 0 && nullCount / total > COVERAGE_THRESHOLD) {
    return { pct: null, worst: 'Outside Coverage', score: 999, outsideCoverage: true };
  }

  if (valid.length === 0) {
    return { pct: null, worst: 'Unknown', score: 500, outsideCoverage: false };
  }

  const highCount = valid.filter(r => r.risk_category === 'High' || r.risk_category === 'Very High').length;
  const pct = Math.round((highCount / valid.length) * 100);
  const worstProb = Math.max(...valid.map(r => r.risk_percentage));
  const worstResult = valid.find(r => r.risk_percentage === worstProb);
  return { pct, worst: worstResult?.risk_category ?? 'Unknown', score: worstProb + pct, outsideCoverage: false };
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const RoutePanel = ({ userCoords, onRouteSelect }) => {
  const [destination, setDestination] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  // Fix #2: store resolved geocode result for user confirmation
  const [resolvedPlace, setResolvedPlace] = useState(null);
  const [routes, setRoutes]           = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [steps, setSteps]             = useState([]);
  const [stepsOpen, setStepsOpen]     = useState(false);
  const [open, setOpen]               = useState(false);

  // Step 1: geocode only — show resolved place for confirmation
  const handleGeocode = async () => {
    if (!destination.trim()) return;
    setLoading(true);
    setError(null);
    setResolvedPlace(null);
    setRoutes([]);
    setSelectedIdx(null);
    setSteps([]);
    onRouteSelect(null);

    try {
      const dest = await geocodePlace(destination);
      setResolvedPlace(dest);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: user confirmed the resolved place — now fetch & score routes
  const handleFindRoutes = async () => {
    if (!resolvedPlace) return;
    setLoading(true);
    setError(null);
    setRoutes([]);
    setSelectedIdx(null);
    setSteps([]);
    onRouteSelect(null);

    try {
      const dest = resolvedPlace;
      const origin = userCoords
        ? [userCoords.lat, userCoords.lon]
        : [25.3, 93.0]; // map default center

      // Fix #4: use alternatives=3 for maximum alternatives from OSRM
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origin[1]},${origin[0]};${dest.lon},${dest.lat}?alternatives=3&steps=true&geometries=polyline&overview=full`;
      const osrmRes = await fetch(osrmUrl);
      if (!osrmRes.ok) throw new Error('OSRM routing service failed — try again');
      const osrmData = await osrmRes.json();

      if (!osrmData.routes || osrmData.routes.length === 0) {
        throw new Error('No drivable routes found between these locations');
      }

      // Fix #4: explicitly iterate ALL returned routes (not just routes[0])
      const scored = await Promise.all(
        osrmData.routes.map(async (route, routeIndex) => {
          const coords = decodePolyline(route.geometry);
          const sampled = samplePoints(coords, 20);
          const points = sampled.map(([lat, lon]) => ({ lat, lon }));
          let riskResults = [];

          try {
            const batchRes = await getRouteRisk(points);
            riskResults = batchRes.results ?? [];
          } catch {
            // Risk scoring failed — route still shown, unknown risk
          }

          const { pct, worst, score, outsideCoverage } = scoreRoute(riskResults);
          const distKm = (route.distance / 1000).toFixed(1);
          const mins = Math.round(route.duration / 60);
          const routeSteps = route.legs?.[0]?.steps?.map(s => s.maneuver?.instruction || s.name) ?? [];

          return { coords, distKm, mins, highRiskPct: pct, worstCategory: worst, score, outsideCoverage, steps: routeSteps };
        })
      );

      // Sort lowest-risk first; outside-coverage routes go last
      scored.sort((a, b) => a.score - b.score);
      setRoutes(scored);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (idx) => {
    setSelectedIdx(idx);
    setSteps(routes[idx].steps);
    setStepsOpen(true);
    onRouteSelect(routes[idx].coords);
  };

  if (!open) {
    return (
      <button className="route-panel-toggle" onClick={() => setOpen(true)} title="Route Planner">
        <Navigation size={18} />
        <span>Route Planner</span>
      </button>
    );
  }

  return (
    <div className="route-panel glass-panel">
      {/* Header */}
      <div className="route-panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem' }}>
          <Navigation size={16} color="var(--accent)" />
          Route Planner
        </div>
        <button className="route-panel-close" onClick={() => { setOpen(false); onRouteSelect(null); }}>
          <X size={16} />
        </button>
      </div>

      {/* Origin note */}
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0 12px 6px' }}>
        {userCoords
          ? `From: Your location (${userCoords.lat.toFixed(4)}, ${userCoords.lon.toFixed(4)})`
          : 'From: Map center (grant location for accurate routing)'}
      </div>

      {/* Search */}
      <div className="route-search-row">
        <input
          className="form-control"
          placeholder="Enter destination in NE India…"
          value={destination}
          onChange={(e) => { setDestination(e.target.value); setResolvedPlace(null); setRoutes([]); }}
          onKeyDown={(e) => e.key === 'Enter' && !resolvedPlace && handleGeocode()}
          style={{ fontSize: '0.85rem', padding: '8px 10px' }}
        />
        <button
          className="btn btn-primary"
          onClick={resolvedPlace ? handleFindRoutes : handleGeocode}
          disabled={loading || !destination.trim()}
          style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
        >
          {loading ? <Loader size={14} className="spin" /> : <Search size={14} />}
          {loading ? 'Finding…' : resolvedPlace ? 'Route →' : 'Find'}
        </button>
      </div>

      {/* Fix #2 — Resolved place confirmation before routing */}
      {resolvedPlace && routes.length === 0 && !error && !loading && (
        <div style={{
          margin: '0 12px 8px', padding: '8px 10px', borderRadius: '6px',
          background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
          fontSize: '0.78rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <MapPin size={13} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: '2px' }}>Found:</div>
              <div style={{ color: 'var(--text-primary)', lineHeight: '1.3' }}>{resolvedPlace.display_name}</div>
              <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                Not right?{' '}
                <button
                  onClick={() => { setResolvedPlace(null); setDestination(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}
                >
                  Try again
                </button>
                {' '}· Press "Route →" to continue
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--danger)' }}>
          ⚠ {error}
        </div>
      )}

      {/* Route cards — Fix #3: show outsideCoverage label when appropriate */}
      {routes.length > 0 && (
        <div className="route-cards">
          {routes.map((route, idx) => {
            const isRecommended = idx === 0 && !route.outsideCoverage;
            const isSelected = idx === selectedIdx;
            return (
              <div
                key={idx}
                className={`route-card ${isRecommended ? 'recommended' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div>
                    {isRecommended && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--success)', background: 'var(--success-bg)', padding: '1px 6px', borderRadius: '8px', marginRight: '6px' }}>
                        ★ RECOMMENDED
                      </span>
                    )}
                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Route {idx + 1}</span>
                  </div>
                  {route.outsideCoverage ? (
                    <span style={{ ...riskBadgeStyle('Moderate'), color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}>
                      Outside coverage
                    </span>
                  ) : (
                    <span style={riskBadgeStyle(route.worstCategory)}>{route.worstCategory} risk</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                  <span>🛣 {route.distKm} km</span>
                  <span>⏱ {route.mins} min</span>
                  {!route.outsideCoverage && route.highRiskPct != null && (
                    <span style={{ color: route.highRiskPct > 30 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      ⚠ {route.highRiskPct}% high-risk segments
                    </span>
                  )}
                  {route.outsideCoverage && (
                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      Route leaves model coverage area
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Turn-by-turn steps */}
      {steps.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px' }}>
          <button
            onClick={() => setStepsOpen(!stepsOpen)}
            style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}
          >
            <span>Turn-by-turn directions ({steps.filter(Boolean).length} steps)</span>
            {stepsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {stepsOpen && (
            <div style={{ maxHeight: '180px', overflowY: 'auto', padding: '0 12px 10px' }}>
              {steps.filter(Boolean).map((step, i) => (
                <div key={i} style={{ fontSize: '0.78rem', padding: '4px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <span style={{ color: 'var(--text-secondary)', marginRight: '8px' }}>{i + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
