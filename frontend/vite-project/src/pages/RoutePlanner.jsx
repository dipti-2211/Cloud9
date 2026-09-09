/**
 * RoutePlanner.jsx  —  /route-planner
 *
 * Google Maps-style route planner:
 *  • Live blue dot that moves with the device (watchPosition)
 *  • Map auto-centers on GPS fix and stays on user during navigation
 *  • From / To fields — both geocoded; From auto-fills from GPS
 *  • OSRM alternatives + landslide batch risk scoring
 *  • Navigation HUD: current turn instruction, next-turn preview, step advancement
 *  • "Find Routes" auto-geocodes any pending To text before routing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation, Search, Loader, MapPin, ChevronDown, ChevronUp,
  ArrowRight, Play, Square, SkipForward, Crosshair
} from 'lucide-react';
import { geocodePlace, getRouteRisk } from '../services/api';
import { useUserLocation } from '../hooks/useUserLocation';
import { PageHeader } from '../components/common/PageHeader';
import rawDemoLocations from '../data/demoLocations.json';

// ---------------------------------------------------------------------------
// Real demo locations from the trained model — sourced from landslide_points.csv
// ---------------------------------------------------------------------------
const DEMO_LOCATIONS = rawDemoLocations.map(loc => ({
  label: loc.name,
  lat: loc.lat,
  lon: loc.lon,
  riskCategory: loc.riskCategory,
  riskPercentage: loc.riskPercentage,
  type: loc.type,
}));

// ---------------------------------------------------------------------------
// Haversine distance in metres
// ---------------------------------------------------------------------------
const haversineM = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

const formatDist = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
const formatTime = (s) => s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} hr`;

// ---------------------------------------------------------------------------
// Decode Google-encoded polyline → [[lat,lon],…]
// ---------------------------------------------------------------------------
const decodePolyline = (encoded) => {
  const pts = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let shift = 0, result = 0, b;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
};

// Sample N evenly-spaced points
const samplePoints = (coords, n = 20) => {
  if (coords.length <= n) return coords;
  const step = (coords.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => coords[Math.round(i * step)]);
};

// ---------------------------------------------------------------------------
// Build human-readable step instruction from OSRM maneuver fields
// ---------------------------------------------------------------------------
const TURN_ICONS = {
  depart: '▶', arrive: '🏁',
  'turn-left': '←', 'turn-right': '→',
  'turn-sharp left': '↩', 'turn-sharp right': '↪',
  'turn-slight left': '↖', 'turn-slight right': '↗',
  continue: '↑', merge: '⤵',
  'fork-left': '↖', 'fork-right': '↗',
  roundabout: '🔄', rotary: '🔄',
};

const getTurnIcon = (type, modifier) => {
  const key = modifier ? `${type}-${modifier}` : type;
  return TURN_ICONS[key] ?? TURN_ICONS[type] ?? '↑';
};

const buildInstruction = (step) => {
  if (step.maneuver?.instruction) return step.maneuver.instruction;
  const type = step.maneuver?.type ?? '';
  const mod  = step.maneuver?.modifier ?? '';
  const name = step.name ? ` onto ${step.name}` : '';
  if (type === 'depart')   return `Head ${mod || 'straight'}${name}`;
  if (type === 'arrive')   return 'You have arrived at your destination';
  if (type === 'turn') {
    const dir = mod || 'straight';
    return `Turn ${dir}${name}`;
  }
  if (type === 'continue') return `Continue${name}`;
  if (type === 'merge')    return `Merge${name}`;
  if (type === 'fork')     return `Keep ${mod || 'straight'} at fork${name}`;
  if (type === 'roundabout' || type === 'rotary') return `Enter roundabout`;
  return step.name ? `Continue on ${step.name}` : 'Continue';
};

const parseSteps = (osrmRoute) =>
  (osrmRoute.legs?.[0]?.steps ?? []).map(s => ({
    instruction: buildInstruction(s),
    icon: getTurnIcon(s.maneuver?.type ?? '', s.maneuver?.modifier ?? ''),
    distanceM: s.distance ?? 0,
    durationS: s.duration ?? 0,
    name: s.name ?? '',
    // [lat, lon] or null
    location: s.maneuver?.location
      ? { lat: s.maneuver.location[1], lon: s.maneuver.location[0] }
      : null,
    type: s.maneuver?.type ?? '',
    modifier: s.maneuver?.modifier ?? '',
  }));

// ---------------------------------------------------------------------------
// Risk scoring helpers
// ---------------------------------------------------------------------------
const RISK_COLOR = {
  'Very Low': 'var(--success)', 'Low': 'var(--success)',
  'Moderate': 'var(--warning)',
  'High': 'var(--danger)', 'Very High': 'var(--danger)',
};

const riskBadgeStyle = (cat) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: '10px',
  fontSize: '0.72rem', fontWeight: 700,
  color: RISK_COLOR[cat] ?? 'var(--text-secondary)',
  background: `${RISK_COLOR[cat] ?? '#888'}22`,
  border: `1px solid ${RISK_COLOR[cat] ?? '#888'}`,
});

const COVERAGE_THRESHOLD = 0.5;

const scoreRoute = (results) => {
  const total = results.length;
  const valid = results.filter(Boolean);
  if (total > 0 && (total - valid.length) / total > COVERAGE_THRESHOLD)
    return { pct: null, worst: 'Outside Coverage', score: 999, outsideCoverage: true };
  if (!valid.length)
    return { pct: null, worst: 'Unknown', score: 500, outsideCoverage: false };
  const highCount = valid.filter(r => r.risk_category === 'High' || r.risk_category === 'Very High').length;
  const pct = Math.round((highCount / valid.length) * 100);
  const worstProb = Math.max(...valid.map(r => r.risk_percentage));
  const worst = valid.find(r => r.risk_percentage === worstProb)?.risk_category ?? 'Unknown';
  return { pct, worst, score: worstProb + pct, outsideCoverage: false };
};

// ---------------------------------------------------------------------------
// Leaflet marker icons
// ---------------------------------------------------------------------------
const userIcon = L.divIcon({ className: 'user-location-marker', iconSize: [22, 22], iconAnchor: [11, 11] });
const fromIcon = L.divIcon({ className: 'risk-marker risk-marker-low',  iconSize: [14, 14], iconAnchor: [7, 7] });
const toIcon   = L.divIcon({ className: 'risk-marker risk-marker-high', iconSize: [14, 14], iconAnchor: [7, 7] });

// ---------------------------------------------------------------------------
// Inner map components (must live inside <MapContainer>)
// ---------------------------------------------------------------------------

/** Centers the map on user's location once on first fix, and on demand via followUser */
const RecenterOnLocation = ({ coords, followUser, navMode }) => {
  const map = useMap();
  const didCenter = useRef(false);

  useEffect(() => {
    if (!coords) return;
    if (!didCenter.current) {
      // First GPS fix → fly to user, zoom in
      map.flyTo([coords.lat, coords.lon], 13, { animate: true, duration: 1.2 });
      didCenter.current = true;
    } else if (navMode && followUser) {
      // Navigation mode → smooth pan on every update
      map.panTo([coords.lat, coords.lon], { animate: true, duration: 0.4 });
    }
  }, [coords, followUser, navMode, map]);

  return null;
};

/** Fits the map to a route's bounds when a route is selected (non-navigation) */
const FitToBounds = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (!coords?.length) return;
    const bounds = L.latLngBounds(coords.map(([lat, lon]) => [lat, lon]));
    map.fitBounds(bounds, { padding: [50, 50], animate: true, duration: 0.8 });
  }, [coords, map]);
  return null;
};

// ---------------------------------------------------------------------------
// Location field sub-component
// ---------------------------------------------------------------------------
const LocationField = ({ label, resolved, onClear, onSearch, searching, demoButtons }) => {
  const [val, setVal] = useState('');

  const doSearch = () => {
    if (val.trim()) onSearch(val.trim());
  };

  // Expose the raw text value upward for auto-geocode on "Find Routes"
  useEffect(() => {
    if (onSearch._setRaw) onSearch._setRaw(val);
  }, [val]);

  return (
    <div style={{ marginBottom: '10px' }}>
      <label style={{
        display: 'block', fontSize: '0.7rem', fontWeight: 700,
        color: 'var(--text-secondary)', marginBottom: '4px',
        textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>{label}</label>

      {resolved ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
          background: 'var(--sky-tint)', border: '1px solid var(--sky-tint-2)',
          borderRadius: '7px', fontSize: '0.82rem',
        }}>
          <MapPin size={13} color="var(--sky)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, lineHeight: 1.3, color: 'var(--ink)' }}>
            {resolved.display_name}
          </span>
          <button
            onClick={onClear}
            style={{ background: 'none', border: 'none', color: 'var(--slate)', cursor: 'pointer', fontSize: '1.1rem', padding: '0 2px', lineHeight: 1 }}
          >✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            className="form-control"
            placeholder={label === 'FROM' ? 'e.g. Haflong, Assam' : 'e.g. Silchar, Assam'}
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            style={{ fontSize: '0.85rem', padding: '8px 10px' }}
          />
          <button
            className="btn btn-secondary"
            onClick={doSearch}
            disabled={searching || !val.trim()}
            style={{ padding: '8px 10px', flexShrink: 0 }}
          >
            {searching ? <Loader size={13} className="spin" /> : <Search size={13} />}
          </button>
        </div>
      )}

      {/* Demo quick-fill buttons (From field only) — grouped by risk type */}
      {!resolved && demoButtons && (
        <div style={{ marginTop: '6px' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--slate)', marginBottom: '4px' }}>
            Try a real location from the model's training data:
          </div>
          {[
            { heading: 'High-risk sites', dot: 'var(--danger)', items: DEMO_LOCATIONS.filter(d => d.type === 'risky') },
            { heading: 'Low-risk sites',  dot: 'var(--success)', items: DEMO_LOCATIONS.filter(d => d.type === 'safe') },
          ].map(({ heading, dot, items }) => (
            <div key={heading} style={{ marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.65rem', color: 'var(--slate)', fontWeight: 600, marginBottom: '3px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                {heading}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {items.map(loc => (
                  <button key={loc.label}
                    onClick={() => demoButtons(loc)}
                    style={{
                      padding: '3px 9px', fontSize: '0.7rem',
                      background: 'var(--white)', border: '1px solid var(--line)',
                      borderRadius: 6, cursor: 'pointer', color: 'var(--ink)',
                      fontWeight: 500, transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--sky)'; e.currentTarget.style.background = 'var(--sky-tint)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.background = 'var(--white)'; }}
                  >
                    {loc.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export const RoutePlanner = () => {
  const { coords, status, requestLocation, setManualCoords } = useUserLocation();

  // Resolved geocode objects: { lat, lon, display_name }
  const [fromPlace, setFromPlace] = useState(null);
  const [toPlace,   setToPlace  ] = useState(null);

  // Raw text for the To field — kept in a ref so "Find Routes" can auto-geocode it
  const toRawRef = useRef('');

  // Loading / error
  const [fromLoading,  setFromLoading ] = useState(false);
  const [toLoading,    setToLoading   ] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [error, setError] = useState(null);

  // Route results
  const [routes,      setRoutes     ] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(null);

  // Navigation state
  const [navigating,    setNavigating   ] = useState(false);
  const [followUser,    setFollowUser   ] = useState(true);
  const [currentStep,   setCurrentStep  ] = useState(0);
  const [navSteps,      setNavSteps     ] = useState([]);   // parsed step objects
  const [navRoute,      setNavRoute     ] = useState(null); // [lat,lon][] of selected route

  // ---- Start GPS on mount ----
  useEffect(() => { requestLocation(); }, []);

  // ---- Auto-fill From with GPS once ----
  useEffect(() => {
    if (coords && !fromPlace) {
      setFromPlace({
        lat: coords.lat, lon: coords.lon,
        display_name: `Your location (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})`,
      });
    }
  }, [coords]);

  // ---- Update From display_name as GPS updates (while not yet geocoded) ----
  useEffect(() => {
    if (coords && fromPlace?.display_name?.startsWith('Your location')) {
      setFromPlace(prev => prev ? {
        ...prev,
        lat: coords.lat, lon: coords.lon,
        display_name: `Your location (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})`,
      } : null);
    }
  }, [coords]);

  // ---- Navigation: step advancement ----
  useEffect(() => {
    if (!navigating || !coords || !navSteps.length) return;
    const ADVANCE_M = 60; // advance step when within 60m of its maneuver point
    let next = currentStep;
    while (next < navSteps.length - 1) {
      const loc = navSteps[next].location;
      if (!loc) { next++; continue; }
      const dist = haversineM(coords.lat, coords.lon, loc.lat, loc.lon);
      if (dist < ADVANCE_M) next++;
      else break;
    }
    if (next !== currentStep) setCurrentStep(next);
  }, [coords, navigating, navSteps, currentStep]);

  // ---------------------------------------------------------------------------
  // Geocode handlers
  // ---------------------------------------------------------------------------
  const handleFromSearch = async (q) => {
    setFromLoading(true); setError(null); setRoutes([]); setSelectedIdx(null);
    try { setFromPlace(await geocodePlace(q)); }
    catch (e) { setError(`"From" not found: ${e.message}`); }
    finally { setFromLoading(false); }
  };

  const handleToSearch = async (q) => {
    setToLoading(true); setError(null); setRoutes([]); setSelectedIdx(null);
    try { setToPlace(await geocodePlace(q)); }
    catch (e) { setError(`"To" not found: ${e.message}`); }
    finally { setToLoading(false); }
  };

  // To field exposes its raw text via a ref callback
  const toSearchWithRef = useCallback((q) => handleToSearch(q), []);
  toSearchWithRef._setRaw = (v) => { toRawRef.current = v; };

  const handleDemoFrom = (loc) => {
    setFromPlace({ lat: loc.lat, lon: loc.lon, display_name: loc.label });
    setManualCoords(loc.lat, loc.lon);
    setRoutes([]); setSelectedIdx(null);
  };

  // Set a demo location as the destination without geocoding
  const handleDemoTo = (loc) => {
    setToPlace({ lat: loc.lat, lon: loc.lon, display_name: loc.label });
    toRawRef.current = '';
    setRoutes([]); setSelectedIdx(null); setNavRoute(null);
  };

  // ---------------------------------------------------------------------------
  // Find Routes — auto-geocodes To if raw text is pending
  // ---------------------------------------------------------------------------
  const handleFindRoutes = async () => {
    setError(null);
    let fp = fromPlace;
    let tp = toPlace;

    // Auto-geocode pending To text
    if (!tp && toRawRef.current.trim()) {
      setToLoading(true);
      try {
        tp = await geocodePlace(toRawRef.current.trim());
        setToPlace(tp);
      } catch (e) {
        setError(`Could not find destination: ${e.message}`);
        setToLoading(false);
        return;
      }
      setToLoading(false);
    }

    if (!fp || !tp) { setError('Please set both a start and destination.'); return; }

    setRouteLoading(true);
    setRoutes([]); setSelectedIdx(null); setNavRoute(null); setNavSteps([]);
    setNavigating(false);

    try {
      const osrmUrl =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${fp.lon},${fp.lat};${tp.lon},${tp.lat}` +
        `?alternatives=3&steps=true&geometries=polyline&overview=full`;

      const res = await fetch(osrmUrl);
      if (!res.ok) throw new Error('OSRM routing failed — try again shortly');
      const data = await res.json();
      if (!data.routes?.length) throw new Error('No route found between these locations');

      const scored = await Promise.all(
        data.routes.map(async (route) => {
          const coords = decodePolyline(route.geometry);
          let riskResults = [];
          try {
            const r = await getRouteRisk(
              samplePoints(coords, 20).map(([lat, lon]) => ({ lat, lon }))
            );
            riskResults = r.results ?? [];
          } catch { /* scoring failed — route still shown */ }

          const { pct, worst, score, outsideCoverage } = scoreRoute(riskResults);
          const steps = parseSteps(route);
          return {
            coords,
            steps,
            distKm: (route.distance / 1000).toFixed(1),
            mins: Math.round(route.duration / 60),
            highRiskPct: pct,
            worstCategory: worst,
            score,
            outsideCoverage,
          };
        })
      );

      scored.sort((a, b) => a.score - b.score);
      setRoutes(scored);
      setSelectedIdx(0);
      setNavRoute(scored[0].coords);
      setNavSteps(scored[0].steps);

    } catch (e) { setError(e.message); }
    finally { setRouteLoading(false); }
  };

  // ---- Start / Stop navigation ----
  const startNavigation = () => {
    if (selectedIdx == null) return;
    setNavSteps(routes[selectedIdx].steps);
    setNavRoute(routes[selectedIdx].coords);
    setCurrentStep(0);
    setFollowUser(true);
    setNavigating(true);
  };

  const stopNavigation = () => {
    setNavigating(false);
    setCurrentStep(0);
    setFollowUser(false);
  };

  const selectRoute = (idx) => {
    setSelectedIdx(idx);
    setNavRoute(routes[idx].coords);
    setNavSteps(routes[idx].steps);
    setCurrentStep(0);
    if (navigating) { setCurrentStep(0); setFollowUser(true); }
  };

  // ---------------------------------------------------------------------------
  // Derived display values
  // ---------------------------------------------------------------------------
  const mapCenter = coords
    ? [coords.lat, coords.lon]
    : fromPlace ? [fromPlace.lat, fromPlace.lon]
    : [25.3, 93.0];

  const currentNavStep = navSteps[currentStep];
  const nextNavStep    = navSteps[currentStep + 1];

  // Remaining distance / time for current step and onward
  const remainingDist = navSteps.slice(currentStep).reduce((a, s) => a + s.distanceM, 0);
  const remainingTime = navSteps.slice(currentStep).reduce((a, s) => a + s.durationS, 0);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', minHeight: 520 }}>
      <PageHeader
        title="Route Planner"
        description="Live GPS tracking · Landslide-aware routing · Turn-by-turn navigation"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 370px', gap: '16px', flex: 1, minHeight: 0 }}>

        {/* ================================================================
            LEFT — Map
        ================================================================ */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          <MapContainer center={mapCenter} zoom={coords ? 13 : 9} zoomControl={false}
            style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              attribution="&copy; Stadia Maps &copy; OpenStreetMap contributors"
            />

            {/* Recenter / follow logic */}
            <RecenterOnLocation coords={coords} followUser={followUser} navMode={navigating} />

            {/* Fit to route after search (non-navigation) */}
            {!navigating && navRoute && <FitToBounds coords={navRoute} />}

            {/* Planned route polyline */}
            {navRoute && (
              <Polyline positions={navRoute} color="#f97316" weight={5} opacity={0.85} />
            )}

            {/* "You are here" — live blue dot */}
            {coords && (
              <Marker position={[coords.lat, coords.lon]} icon={userIcon} zIndexOffset={1000}>
                <Popup>
                  <div style={{ padding: '6px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 3 }}>📍 Your Location</div>
                    <div style={{ fontSize: '0.78rem', color: '#555' }}>
                      {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                    </div>
                    {coords.accuracy && (
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>
                        Accuracy: ±{Math.round(coords.accuracy)} m
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* From marker */}
            {fromPlace && !fromPlace.display_name.startsWith('Your location') && (
              <Marker position={[fromPlace.lat, fromPlace.lon]} icon={fromIcon}>
                <Popup>
                  <div style={{ padding: '4px' }}>
                    <div style={{ fontWeight: 600, color: '#10b981', marginBottom: 2 }}>From</div>
                    <div style={{ fontSize: '0.78rem' }}>{fromPlace.display_name}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* To marker */}
            {toPlace && (
              <Marker position={[toPlace.lat, toPlace.lon]} icon={toIcon}>
                <Popup>
                  <div style={{ padding: '4px' }}>
                    <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: 2 }}>To</div>
                    <div style={{ fontSize: '0.78rem' }}>{toPlace.display_name}</div>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* ---- Navigation HUD overlay ---- */}
          {navigating && currentNavStep && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
              background: 'var(--white)',
              borderBottom: '2px solid var(--sky)',
              padding: '14px 16px 12px',
              boxShadow: '0 4px 16px rgba(44,143,209,0.14)',
            }}>
              {/* Current step */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--accent)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.4rem', boxShadow: '0 0 0 4px rgba(59,130,246,0.2)',
                }}>
                  {currentNavStep.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.2, color: 'var(--ink)' }}>
                    {currentNavStep.instruction}
                  </div>
                  {currentNavStep.distanceM > 0 && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--sky)', marginTop: 2 }}>
                      in {formatDist(currentNavStep.distanceM)}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>Remaining</div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--ink)' }}>{formatDist(remainingDist)}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--slate)' }}>{formatTime(remainingTime)}</div>
                </div>
              </div>

              {/* Next step preview */}
              {nextNavStep && (
                <div style={{
                  marginTop: '8px', padding: '6px 10px',
                  background: 'var(--sky-tint)', borderRadius: '6px',
                  display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem',
                  color: 'var(--slate)',
                }}>
                  <span style={{ fontSize: '1rem' }}>{nextNavStep.icon}</span>
                  <span>Then: {nextNavStep.instruction}</span>
                  {nextNavStep.distanceM > 0 && (
                    <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
                      {formatDist(nextNavStep.distanceM)}
                    </span>
                  )}
                </div>
              )}

              {/* HUD controls */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentStep(s => Math.min(s + 1, navSteps.length - 1))}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <SkipForward size={12} /> Next step
                </button>
                <button
                  onClick={() => setFollowUser(f => !f)}
                  className={followUser ? 'btn btn-primary' : 'btn btn-secondary'}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Crosshair size={12} /> {followUser ? 'Following' : 'Follow me'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={stopNavigation}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--danger)' }}
                >
                  <Square size={12} /> End
                </button>
              </div>
            </div>
          )}

          {/* Map legend (collapsed during navigation) */}
          {!navigating && (
            <div className="map-legend" style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 999, background: 'var(--surface-elevated)', fontSize: '0.76rem' }}>
              {[
                { color: '#3b82f6', label: 'You', glow: true },
                { color: 'var(--success)', label: 'From' },
                { color: 'var(--danger)',  label: 'To' },
                { color: '#f97316', label: 'Route', line: true },
              ].map(({ color, label, glow, line }) => (
                <div key={label} style={{ display: 'flex', gap: '7px', alignItems: 'center', marginBottom: 3 }}>
                  {line
                    ? <span style={{ width: 14, height: 3, background: color, borderRadius: 2 }} />
                    : <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, border: '2px solid #fff', boxShadow: glow ? `0 0 6px ${color}` : 'none' }} />
                  }
                  {label}
                </div>
              ))}
            </div>
          )}

          {/* "Re-center on me" button when not following */}
          {!followUser && coords && (
            <button
              onClick={() => setFollowUser(true)}
              style={{
                position: 'absolute', bottom: 60, right: 12, zIndex: 1000,
                background: 'var(--white)',
                border: '1.5px solid var(--sky)',
                borderRadius: '50%',
                width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--sky)',
                boxShadow: '0 2px 8px rgba(44,143,209,0.2)',
              }}
              title="Re-center on my location"
            >
              <Crosshair size={18} />
            </button>
          )}
        </div>

        {/* ================================================================
            RIGHT — Form + Results
        ================================================================ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>

          {/* ---- Input Card ---- */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', fontWeight: 700, fontSize: '0.95rem' }}>
              <Navigation size={17} color="var(--accent)" /> Plan Your Route
            </div>

            {/* GPS status note */}
            {(status === 'requesting') && (
              <div style={{ fontSize: '0.75rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                <Loader size={11} className="spin" /> Detecting your location…
              </div>
            )}
            {(status === 'denied' || status === 'unsupported') && (
              <div style={{ fontSize: '0.75rem', padding: '7px 10px', background: 'var(--sky-tint)', border: '1px solid var(--sky-tint-2)', borderRadius: '7px', marginBottom: '8px', color: 'var(--slate)' }}>
                📍 GPS unavailable — use demo buttons or type a starting point
              </div>
            )}

            <LocationField
              label="FROM"
              resolved={fromPlace}
              onClear={() => { setFromPlace(null); setRoutes([]); setSelectedIdx(null); setNavRoute(null); }}
              onSearch={handleFromSearch}
              searching={fromLoading}
              demoButtons={handleDemoFrom}
            />

            <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)', margin: '2px 0 6px' }}>
              <ArrowRight size={15} />
            </div>

            <LocationField
              label="TO"
              resolved={toPlace}
              onClear={() => { setToPlace(null); setRoutes([]); setSelectedIdx(null); setNavRoute(null); toRawRef.current = ''; }}
              onSearch={toSearchWithRef}
              searching={toLoading}
              demoButtons={handleDemoTo}
            />

            {error && (
              <div style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: 6, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 5 }}>
                ⚠ {error}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleFindRoutes}
              disabled={!fromPlace || routeLoading || toLoading}
              style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {routeLoading ? <Loader size={15} className="spin" /> : <Search size={15} />}
              {routeLoading ? 'Scoring routes…' : 'Find Routes'}
            </button>
          </div>

          {/* ---- Route cards ---- */}
          {routes.length > 0 && (
            <div className="card">
              {/* Safest route banner — always shown at the top */}
              {routes[0] && !routes[0].outsideCoverage && (
                <div style={{
                  background: 'var(--success-bg)',
                  border: '1.5px solid var(--success)',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, box-shadow 0.15s',
                  outline: selectedIdx === 0 ? `2px solid var(--success)` : 'none',
                }}
                onClick={() => selectRoute(0)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🛡</span>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--success)' }}>SAFEST ROUTE</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700,
                      color: 'var(--success)', background: 'var(--success-bg)',
                      padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--success)' }}>
                      {routes[0].worstCategory} risk
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', fontSize: '0.82rem', color: 'var(--slate)', flexWrap: 'wrap' }}>
                    <span>🛣 {routes[0].distKm} km</span>
                    <span>⏱ {routes[0].mins} min</span>
                    {routes[0].highRiskPct != null && (
                      <span style={{ color: routes[0].highRiskPct > 30 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                        ⚠ {routes[0].highRiskPct}% high-risk points
                      </span>
                    )}
                  </div>
                  {routes.length > 1 && (
                    <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'var(--slate)', fontStyle: 'italic' }}>
                      Scored lowest landslide risk among {routes.length} alternatives
                    </div>
                  )}
                </div>
              )}

              {/* All alternatives (collapsed-style rows for idx > 0) */}
              {routes.length > 1 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '6px', marginTop: '4px' }}>All routes</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {routes.map((route, idx) => {
                  const isSel = idx === selectedIdx;
                  return (
                    <div
                      key={idx}
                      className={`route-card ${isSel ? 'selected' : ''}`}
                      onClick={() => selectRoute(idx)}
                      style={{
                        cursor: 'pointer',
                        opacity: idx === 0 ? 0.75 : 1,  // safest shown above, de-emphasise duplicate
                        padding: '8px 12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {idx === 0 && <span style={{ fontSize: '0.7rem' }}>🛡</span>}
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                            {idx === 0 ? 'Safest' : `Route ${idx + 1}`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {route.distKm} km · {route.mins} min
                          </span>
                          {route.outsideCoverage
                            ? <span style={{ ...riskBadgeStyle('Moderate'), color: 'var(--text-secondary)', borderColor: 'var(--border)', background: 'var(--surface-elevated)', fontSize: '0.68rem' }}>No coverage</span>
                            : <span style={{ ...riskBadgeStyle(route.worstCategory), fontSize: '0.68rem' }}>{route.worstCategory}</span>
                          }
                        </div>
                      </div>
                      {!route.outsideCoverage && route.highRiskPct != null && (
                        <div style={{ marginTop: 4, fontSize: '0.72rem', color: route.highRiskPct > 30 ? 'var(--danger)' : 'var(--text-secondary)' }}>
                          ⚠ {route.highRiskPct}% of sampled points are high-risk
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Start Navigation button */}
              {selectedIdx != null && (
                <button
                  className="btn btn-primary"
                  onClick={startNavigation}
                  disabled={navigating}
                  style={{ width: '100%', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'linear-gradient(135deg,#10b981,#059669)' }}
                >
                  <Play size={15} />
                  {navigating ? 'Navigation active…' : 'Start Navigation'}
                </button>
              )}
            </div>
          )}

          {/* ---- Turn-by-turn step list (collapsible, shown outside of HUD) ---- */}
          {navSteps.length > 0 && (
            <StepList steps={navSteps} currentStep={currentStep} />
          )}

          {/* Coverage note */}
          <div style={{ padding: '10px 12px', borderRadius: 8, fontSize: '0.73rem', color: 'var(--slate)', background: 'var(--sky-tint)', border: '1px solid var(--sky-tint-2)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--ink)' }}>Coverage:</strong> Landslide risk only applies inside the
            Dima Hasao DEM (lat 24.97–25.83, lon 92.52–93.47). Routes outside this area still route but
            show "Outside coverage." Routing via OSRM public demo server.
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Collapsible step list
// ---------------------------------------------------------------------------
const StepList = ({ steps, currentStep }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="card" style={{ padding: 0 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}
      >
        <span>Turn-by-turn ({steps.filter(s => s.instruction).length} steps)</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ maxHeight: 260, overflowY: 'auto', padding: '0 14px 12px' }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                padding: '7px 0', borderBottom: '1px solid var(--line)',
                fontSize: '0.8rem', lineHeight: 1.4,
                color: i === currentStep ? 'var(--ink)' : 'var(--slate)',
                fontWeight: i === currentStep ? 600 : 400,
                background: i === currentStep ? 'var(--sky-tint)' : 'none',
                borderRadius: i === currentStep ? 5 : 0,
                paddingLeft: i === currentStep ? 6 : 0,
              }}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0, width: 20, textAlign: 'center' }}>{step.icon}</span>
              <span style={{ flex: 1 }}>{step.instruction}</span>
              {step.distanceM > 0 && (
                <span style={{ flexShrink: 0, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                  {formatDist(step.distanceM)}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
