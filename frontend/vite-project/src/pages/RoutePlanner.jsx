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
  MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation, Search, Loader, MapPin, ChevronDown, ChevronUp,
  ArrowRight, Play, Square, SkipForward, SkipBack, Crosshair, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { geocodePlace, getRouteRisk, BASE_URL } from '../services/api';
import toast from 'react-hot-toast';
import { useUserLocation } from '../hooks/useUserLocation';
import { useSocket } from '../hooks/useSocket';
import { PageHeader } from '../components/common/PageHeader';
import rawDemoLocations from '../data/demoLocations.json';
import { RiskPolyline, getRouteCrossedSegments, NER_ROAD_SEGMENTS } from '../components/map/RiskPolyline';
import { NavAlertModal } from '../components/map/NavAlertModal';

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
// Leaflet marker icons & helpers
// ---------------------------------------------------------------------------
const userIcon = L.divIcon({ className: 'user-location-marker', iconSize: [22, 22], iconAnchor: [11, 11] });

// Google Maps-style START marker — clean green teardrop, no label
const startIcon = L.divIcon({
  className: '',
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  html: `<div style="
    width: 36px; height: 48px;
    position: relative;
    filter: drop-shadow(0 4px 8px rgba(16,185,129,0.55));
  ">
    <svg viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#10b981"/>
      <path d="M18 2C9.16 2 2 9.16 2 18c0 12.5 16 28 16 28S34 30.5 34 18C34 9.16 26.84 2 18 2z" fill="#059669"/>
      <circle cx="18" cy="18" r="8" fill="white" fill-opacity="0.95"/>
      <circle cx="18" cy="18" r="4" fill="#059669"/>
    </svg>
  </div>`,
});

// Google Maps-style DESTINATION marker — blue teardrop, white dot center (no label)
const endIcon = L.divIcon({
  className: '',
  iconSize: [36, 48],
  iconAnchor: [18, 48],
  html: `<div style="
    width: 36px; height: 48px;
    position: relative;
    filter: drop-shadow(0 4px 8px rgba(59,130,246,0.6));
    animation: bounce-pin 0.6s ease 0.3s both;
  ">
    <svg viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#3b82f6"/>
      <path d="M18 2C9.16 2 2 9.16 2 18c0 12.5 16 28 16 28S34 30.5 34 18C34 9.16 26.84 2 18 2z" fill="#2563eb"/>
      <circle cx="18" cy="18" r="8" fill="white" fill-opacity="0.95"/>
      <circle cx="18" cy="18" r="4" fill="#2563eb"/>
    </svg>
  </div>`,
});


// Google Maps-style navigation vehicle — pulsing blue dot with directional cone
// Uses CSS class so Leaflet marker stays lightweight and animation is CSS-driven
const createVehicleIcon = (bearing = 0) => L.divIcon({
  className: 'nav-vehicle-wrapper',
  iconSize: [56, 56],
  iconAnchor: [28, 28],
  html: `
    <div class="nav-vehicle-ripple"></div>
    <div class="nav-vehicle-dot" style="transform:rotate(${bearing}deg)">
      <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:44px;height:44px;display:block">
        <circle cx="22" cy="22" r="21" fill="#1a73e8" fill-opacity="0.18"/>
        <circle cx="22" cy="22" r="14" fill="#1a73e8"/>
        <circle cx="22" cy="22" r="11" fill="#4285f4"/>
        <!-- Direction arrow -->
        <polygon points="22,6 30,30 22,24 14,30" fill="white" opacity="0.95"/>
      </svg>
    </div>
  `,
});


// Helper: find the index of the closest route point to a lat/lon
const findClosestRouteIdx = (routeCoords, lat, lon) => {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < routeCoords.length; i++) {
    const d = haversineM(lat, lon, routeCoords[i][0], routeCoords[i][1]);
    if (d < minDist) { minDist = d; minIdx = i; }
  }
  return minIdx;
};

// Helper: compute bearing (degrees) from point A to point B
const computeBearing = (lat1, lon1, lat2, lon2) => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180)
           - Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
};

// Hazard hotspot marker icon
const createHazardPin = (riskLevel, isCrossed = false, isNew = false) => {
  const isHigh = riskLevel === 'high' || riskLevel === 'critical';
  const isMed  = riskLevel === 'medium' || riskLevel === 'moderate';
  const color  = isHigh ? '#dc2626' : isMed ? '#f59e0b' : '#22c55e';
  const symbol = isNew ? '🚨' : isHigh ? '⚠' : isMed ? '▲' : '✓';
  const size   = isCrossed ? 32 : isNew ? 28 : 24;
  const anchor = Math.round(size / 2);

  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [anchor, anchor],
    html: `<div style="
      width: ${size}px; height: ${size}px;
      border-radius: 50%;
      background: ${color};
      color: #ffffff;
      display: flex; align-items: center; justify-content: center;
      font-size: ${isCrossed ? '14px' : isNew ? '13px' : '11px'}; font-weight: 900;
      box-shadow: 0 0 14px ${isHigh || isNew ? 'rgba(220,38,38,0.9)' : 'rgba(245,158,11,0.7)'};
      border: ${isCrossed ? '3px solid #ffffff' : isNew ? '2.5px solid #fef08a' : '2px solid #ffffff'};
      cursor: pointer;
      ${isHigh || isCrossed || isNew ? 'animation: pulse-danger 1.8s infinite;' : ''}
    ">${symbol}</div>`,
  });
};

// Segment midpoint road name badge with prominent (NEW) marker
const createSegBadge = (seg, isCrossed = false, isNew = false) => {
  const isHigh = seg.risk_level === 'high';
  const isMed  = seg.risk_level === 'medium';
  const bg = isHigh ? '#dc2626' : isMed ? '#d97706' : '#16a34a';
  const prefix = isHigh ? '🔴 ' : isMed ? '🟡 ' : '🟢 ';
  const newTag = isNew
    ? `<span style="
        background: #ffffff;
        color: ${isHigh ? '#dc2626' : '#b45309'};
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 9.5px;
        font-weight: 900;
        margin-left: 5px;
        letter-spacing: 0.5px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.35);
        display: inline-flex;
        align-items: center;
      ">(NEW)</span>`
    : '';

  return L.divIcon({
    className: '',
    iconSize: [1, 1],
    iconAnchor: [0, 0],
    html: `<div style="
      background: ${bg};
      color: #fff;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 10.5px;
      font-weight: 700;
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      border: ${isCrossed ? '2.5px solid #fff' : isNew ? '2px solid #fef08a' : '1px solid rgba(255,255,255,0.7)'};
      pointer-events: none;
      display: inline-flex;
      align-items: center;
      gap: 3px;
      ${isNew ? 'animation: pulse-danger 1.8s infinite;' : ''}
    ">${prefix}${seg.road_name}${newTag}${isCrossed ? ' [ON ROUTE]' : ''}</div>`,
  });
};

// Live incident pin icon
const incidentPin = L.divIcon({
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  html: `<div style="
    width: 26px; height: 26px;
    border-radius: 50%;
    background: #991b1b;
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
    box-shadow: 0 0 12px rgba(153,27,27,0.8);
    border: 2px solid #ffffff;
    animation: pulse-danger 1.5s infinite;
    cursor: pointer;
  ">🚨</div>`,
});

/** Flies the map to focus target when requested */
const MapFocusController = ({ focusTarget }) => {
  const map = useMap();
  useEffect(() => {
    if (focusTarget?.lat != null && focusTarget?.lon != null) {
      map.flyTo([focusTarget.lat, focusTarget.lon], focusTarget.zoom || 14, {
        animate: true,
        duration: 1.0,
      });
    }
  }, [focusTarget, map]);
  return null;
};

// ---------------------------------------------------------------------------
// Inner map components (must live inside <MapContainer>)
// ---------------------------------------------------------------------------

/** Centers the map on user's location once on first fix, and on demand via followUser.
 *  During navigation, pans to vehiclePos (route-snapped position) so the vehicle arrow
 *  stays centred on screen — exactly like Google Maps navigation behaviour.
 *  Also reacts to vehiclePos changes directly so simulation mode works without real GPS.
 */
const RecenterOnLocation = ({ coords, followUser, navMode, vehiclePos }) => {
  const map = useMap();
  const didCenter = useRef(false);

  // First GPS fix — fly to user at a nice street zoom
  useEffect(() => {
    if (!coords || didCenter.current) return;
    map.flyTo([coords.lat, coords.lon], 14, { animate: true, duration: 1.2 });
    didCenter.current = true;
  }, [coords, map]);

  // Navigation follow: re-pan every time the vehicle position changes
  // This fires on both real GPS ticks AND simulation interval ticks
  useEffect(() => {
    if (!navMode || !followUser) return;
    const pos = vehiclePos ?? (coords ? { lat: coords.lat, lon: coords.lon } : null);
    if (!pos) return;
    map.panTo([pos.lat, pos.lon], { animate: true, duration: 0.3, easeLinearity: 0.5 });
  }, [vehiclePos, navMode, followUser, map]);

  // On navigation START — flyTo the vehicle with a close zoom
  const prevNavMode = useRef(false);
  useEffect(() => {
    if (navMode && !prevNavMode.current) {
      const pos = vehiclePos ?? (coords ? { lat: coords.lat, lon: coords.lon } : null);
      if (pos) map.flyTo([pos.lat, pos.lon], 15, { animate: true, duration: 1.0 });
    }
    prevNavMode.current = navMode;
  }, [navMode, vehiclePos, coords, map]);

  return null;
};


/** Calls map.invalidateSize() on window resize — fixes blank map on mobile after orientation change */
const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    const onResize = () => { map.invalidateSize(); };
    window.addEventListener('resize', onResize);
    // Also call once on mount in case the container was hidden/resized before init
    setTimeout(() => map.invalidateSize(), 200);
    return () => window.removeEventListener('resize', onResize);
  }, [map]);
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
  const { socket } = useSocket();

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

  // Pre-trip Navigation Alert Modal state (EN / HI / BN)
  const [showNavAlert,  setShowNavAlert ] = useState(false);
  const [navAlertLang,  setNavAlertLang ] = useState('en');

  // Vehicle position along route (Google Maps-style moving marker)
  const [vehicleRouteIdx, setVehicleRouteIdx] = useState(0);  // index into navRoute
  const [vehicleBearing,  setVehicleBearing ] = useState(0);  // direction in degrees
  const [routeProgress,   setRouteProgress  ] = useState(0);  // 0–1 fraction completed

  // Panel collapse state (right sidebar)
  const [panelOpen, setPanelOpen] = useState(true);

  // Simulation ref — advances vehicle when real GPS is unavailable
  const simIntervalRef = useRef(null);
  const simIdxRef = useRef(0);

  // Phase 3: risk segment overlay + off-route rerouting
  const [riskSegments,  setRiskSegments ] = useState([]);   // [{lat,lon,category}] high-risk points
  const offRouteCount = useRef(0);                          // consecutive off-route GPS ticks

  // Live NER segments (updated via socket when incidents are reported)
  const [liveSegments, setLiveSegments] = useState(NER_ROAD_SEGMENTS);
  // Route-crossing warning banner
  const [routeRiskWarning, setRouteRiskWarning] = useState(null); // { segmentId, road_name }
  // Map programmatic fly-to / zoom focus & active selection
  const [mapFocus, setMapFocus] = useState(null);
  const [selectedSegmentId, setSelectedSegmentId] = useState(null);
  // Field-reported incidents from MongoDB
  const [liveIncidents, setLiveIncidents] = useState([]);

  // Fetch field-reported incidents from MongoDB
  useEffect(() => {
    let active = true;
    const fetchIncidents = async () => {
      try {
        const token = localStorage.getItem('sih_token') || localStorage.getItem('token') || sessionStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${BASE_URL}/api/road-incidents`, { headers });
        const data = await res.json();
        const list = data?.incidents || data?.data || (Array.isArray(data) ? data : []);
        if (active && Array.isArray(list)) {
          setLiveIncidents(list.map(inc => ({
            id: inc._id || inc.id,
            lat: inc.location?.coordinates?.[1] ?? inc.latitude,
            lon: inc.location?.coordinates?.[0] ?? inc.longitude,
            type: inc.incident_type || 'Hazard',
            severity: inc.reported_risk_level || 'high',
            road: inc.road_segment_id?.road_name,
            district: inc.road_segment_id?.district,
            desc: inc.description,
            photo: inc.photo_url,
          })).filter(i => i.lat != null && i.lon != null));
        }
      } catch { /* silent */ }
    };

    // Fetch live road segments with updated risk & (NEW) flags from MongoDB
    const fetchLiveSegments = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/road-segments`);
        const data = await res.json();
        const segs = data?.roadSegments || [];
        if (active && Array.isArray(segs) && segs.length > 0) {
          setLiveSegments(prev => prev.map(p => {
            const live = segs.find(s => s.segment_key === p.id || s.road_name === p.road_name);
            if (!live) return p;
            return {
              ...p,
              risk_level: live.current_risk_level || p.risk_level,
              is_new: live.is_new || live.has_new_incident || false,
              has_new_incident: live.has_new_incident || live.is_new || false,
            };
          }));
        }
      } catch { /* silent */ }
    };

    fetchIncidents();
    fetchLiveSegments();
    return () => { active = false; };
  }, []);

  // ── Socket.IO listeners ────────────────────────────────────────────────────
  useEffect(() => {
    // road_segment_updated → refresh live risk on map (turn RED/YELLOW) + mark (NEW) + warn if it crosses current route
    const onSegUpdated = (seg) => {
      const isHigh = seg.current_risk_level === 'high';
      const riskColorText = isHigh ? 'RED (HIGH RISK)' : 'YELLOW (CAUTION)';
      const roadName = seg.road_name || 'Road';

      setLiveSegments(prev => prev.map(s => {
        const matches = s.id === (seg.segment_key ?? seg._id ?? seg.id) || s.road_name === seg.road_name;
        if (!matches) return s;
        return {
          ...s,
          risk_level: seg.current_risk_level || (isHigh ? 'high' : 'medium'),
          is_new: true,
          has_new_incident: true,
        };
      }));

      toast(`🚨 Road ${roadName} updated to ${riskColorText} — (NEW) incident logged!`, { icon: isHigh ? '🔴' : '🟡', duration: 7000 });

      // Check if the updated segment is on the current planned route
      if (navRoute && (seg.current_risk_level === 'high' || isHigh)) {
        const crossed = getRouteCrossedSegments(navRoute, [{
          ...NER_ROAD_SEGMENTS.find(s => s.id === (seg.segment_key ?? seg.id) || s.road_name === seg.road_name) ?? {},
          risk_level: 'high',
        }]);
        if (crossed.length > 0) {
          setRouteRiskWarning({ road_name: seg.road_name || crossed[0]?.road_name });
          toast('⚠ A road on your route just became HIGH RISK — rerouting…', { icon: '🚨', duration: 6000 });
          setTimeout(() => handleFindRoutes(), 500);
        }
      }
    };

    // reroute_push → auto re-route for this vehicle/user
    const onReroute = (payload) => {
      toast(`🔁 Reroute: ${payload.reason ?? 'New hazard on your route'}`, { duration: 7000 });
      if (fromPlace && toPlace) setTimeout(() => handleFindRoutes(), 600);
    };

    const onIncidentCreated = (inc) => {
      const lat = inc.latitude ?? inc.location?.coordinates?.[1];
      const lon = inc.longitude ?? inc.location?.coordinates?.[0];
      if (lat == null || lon == null) return;
      const roadName = inc.road_segment_id?.road_name;
      const isHigh = inc.reported_risk_level === 'high' || inc.reported_risk_level === 'critical';

      setLiveIncidents(prev => [
        {
          id: inc._id || Date.now(),
          lat, lon,
          type: inc.incident_type || 'Hazard',
          severity: inc.reported_risk_level || 'high',
          road: roadName,
          district: inc.road_segment_id?.district,
          desc: inc.description,
          photo: inc.photo_url,
          is_new: true,
        },
        ...prev.slice(0, 24),
      ]);

      // Ensure the associated road turns RED or YELLOW and gains (NEW) marker
      if (roadName) {
        setLiveSegments(prev => prev.map(s => {
          if (s.road_name === roadName || s.id === roadName) {
            return {
              ...s,
              risk_level: isHigh ? 'high' : 'medium',
              is_new: true,
              has_new_incident: true,
            };
          }
          return s;
        }));
      }

      toast(`🚨 Incident reported on ${roadName || 'road'} — marked (NEW) on map!`, { duration: 6000 });
    };

    socket.on('road_segment_updated', onSegUpdated);
    socket.on('reroute_push',         onReroute);
    socket.on('incident_created',     onIncidentCreated);
    return () => {
      socket.off('road_segment_updated', onSegUpdated);
      socket.off('reroute_push',         onReroute);
      socket.off('incident_created',     onIncidentCreated);
    };
  }, [socket, navRoute, fromPlace, toPlace]);

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

  // ---- Navigation: off-route rerouting (manual stepping replaces automatic progression) ----
  useEffect(() => {
    if (!navigating || !coords || !navSteps.length) return;

    // Off-route detection: if user is >80m from every point on navRoute, count up
    if (navRoute) {
      const minDist = Math.min(
        ...navRoute.map(([rlat, rlon]) => haversineM(coords.lat, coords.lon, rlat, rlon))
      );
      if (minDist > 80) {
        offRouteCount.current += 1;
        if (offRouteCount.current >= 3) {
          // Trigger reroute from current position
          offRouteCount.current = 0;
          toast('↩ Rerouting…', { icon: '🗺' });
          setFromPlace({ lat: coords.lat, lon: coords.lon, display_name: `Your location (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})` });
          setTimeout(() => handleFindRoutes(), 100);
        }
      } else {
        offRouteCount.current = 0;
      }
    }
  }, [coords, navigating, navSteps, navRoute]);

  // ---- Manual navigation stepping (strictly controlled by explicit user action) ----
  const goToStep = useCallback((targetStep) => {
    if (!navRoute?.length) return;
    const totalSteps = navSteps.length || 1;
    const clamped = Math.max(0, Math.min(targetStep, totalSteps - 1));
    setCurrentStep(clamped);

    // Determine target route index
    let routeIdx = 0;
    const step = navSteps[clamped];
    if (step?.location?.lat != null && step?.location?.lon != null) {
      routeIdx = findClosestRouteIdx(navRoute, step.location.lat, step.location.lon);
    } else if (totalSteps > 1) {
      routeIdx = Math.round((clamped / (totalSteps - 1)) * (navRoute.length - 1));
    }

    setVehicleRouteIdx(routeIdx);

    // Compute heading towards next points
    const lookAhead = Math.min(routeIdx + 3, navRoute.length - 1);
    if (lookAhead > routeIdx) {
      setVehicleBearing(computeBearing(
        navRoute[routeIdx][0], navRoute[routeIdx][1],
        navRoute[lookAhead][0], navRoute[lookAhead][1]
      ));
    }

    setRouteProgress(totalSteps > 1 ? clamped / (totalSteps - 1) : 0);

    // Synchronize map focus to current vehicle step position
    if (navRoute[routeIdx]) {
      setMapFocus({ lat: navRoute[routeIdx][0], lon: navRoute[routeIdx][1], zoom: 15, t: Date.now() });
    }
  }, [navRoute, navSteps]);

  const handleNextStep = () => {
    if (currentStep < navSteps.length - 1) {
      goToStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };


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
          const routeCoords = decodePolyline(route.geometry);
          let riskResults = [];
          try {
            const r = await getRouteRisk(
              samplePoints(routeCoords, 20).map(([lat, lon]) => ({ lat, lon }))
            );
            riskResults = r.results ?? r.segments ?? [];
          } catch { /* scoring failed — route still shown */ }

          const { pct, worst, score, outsideCoverage } = scoreRoute(riskResults);
          const steps = parseSteps(route);

          // Build risk-segment overlay: high-risk sample points mapped back to route coords
          const highRiskPoints = riskResults
            .filter(r => r && (r.risk_category === 'High' || r.risk_category === 'Very High'))
            .map(r => ({
              lat: r.lat ?? null, lon: r.lon ?? null,
              category: r.risk_category,
              pct: r.risk_percentage,
            }))
            .filter(r => r.lat != null && r.lon != null);

          return {
            coords: routeCoords,
            steps,
            distKm: (route.distance / 1000).toFixed(1),
            mins: Math.round(route.duration / 60),
            highRiskPct: pct,
            worstCategory: worst,
            score,
            outsideCoverage,
            highRiskPoints,
          };
        })
      );

      scored.sort((a, b) => a.score - b.score);
      setRoutes(scored);
      setSelectedIdx(0);
      setNavRoute(scored[0].coords);
      setNavSteps(scored[0].steps);
      setRiskSegments(scored[0].highRiskPoints ?? []);

    } catch (e) { setError(e.message); }
    finally { setRouteLoading(false); }
  };

  // ---- Start / Stop navigation ----
  const startNavigation = () => {
    if (selectedIdx == null) return;
    setShowNavAlert(true);
  };

  const confirmNavigation = () => {
    setShowNavAlert(false);
    if (selectedIdx == null || !routes[selectedIdx]) return;
    const steps = routes[selectedIdx].steps || [];
    const rCoords = routes[selectedIdx].coords || [];
    setNavSteps(steps);
    setNavRoute(rCoords);
    setCurrentStep(0);
    setVehicleRouteIdx(0);
    if (rCoords.length > 1) {
      setVehicleBearing(computeBearing(rCoords[0][0], rCoords[0][1], rCoords[1][0], rCoords[1][1]));
    } else {
      setVehicleBearing(0);
    }
    setRouteProgress(0);
    setFollowUser(true);
    setNavigating(true);
    if (rCoords[0]) {
      setMapFocus({ lat: rCoords[0][0], lon: rCoords[0][1], zoom: 15, t: Date.now() });
    }
  };

  const stopNavigation = () => {
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    setNavigating(false);
    setCurrentStep(0);
    setVehicleRouteIdx(0);
    setRouteProgress(0);
    setFollowUser(false);
  };

  const selectRoute = (idx) => {
    setSelectedIdx(idx);
    setNavRoute(routes[idx].coords);
    setNavSteps(routes[idx].steps);
    setRiskSegments(routes[idx].highRiskPoints ?? []);
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

  // Compute which NER segments the current route crosses — used by the risk breakdown panel
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const crossedSegments = navRoute ? getRouteCrossedSegments(navRoute, liveSegments) : [];
  const highSegments    = crossedSegments.filter(s => s.risk_level === 'high');
  const medSegments     = crossedSegments.filter(s => s.risk_level === 'medium');
  const saferAlt        = routes.length > 1 && selectedIdx !== 0 ? routes[0] : null;


  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', minHeight: 520 }}>
      <PageHeader
        title="Route Planner"
        description="Live GPS tracking · Landslide-aware routing · Turn-by-turn navigation"
      />

      <div className={`route-planner-grid${panelOpen ? '' : ' panel-collapsed'}`}>

        {/* ================================================================
            LEFT — Map
        ================================================================ */}
        <div className="card map-card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
          {/* Panel toggle button — sits on right edge of map */}
          <button
            onClick={() => setPanelOpen(o => !o)}
            title={panelOpen ? 'Collapse panel' : 'Expand panel'}
            style={{
              position: 'absolute', top: '50%', right: 0, transform: 'translateY(-50%)',
              zIndex: 1100, width: 22, height: 52,
              background: 'var(--white)', border: '1px solid var(--line)',
              borderRight: 'none', borderRadius: '8px 0 0 8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.08)',
              color: 'var(--sky)', fontSize: '0.75rem', fontWeight: 700,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--sky-tint)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--white)'}
          >
            {panelOpen ? '›' : '‹'}
          </button>
          <MapContainer center={mapCenter} zoom={coords ? 13 : 9} zoomControl={false}
            style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
              attribution="&copy; Stadia Maps &copy; OpenStreetMap contributors"
            />

            {/* Mobile: recalculate map size after resize/orientation change */}
            <MapResizer />

            {/* Recenter / follow logic — passes vehiclePos so map centers on the moving arrow, not raw GPS */}
            <RecenterOnLocation
              coords={coords}
              followUser={followUser}
              navMode={navigating}
              vehiclePos={
                navigating && navRoute && navRoute[vehicleRouteIdx]
                  ? { lat: navRoute[vehicleRouteIdx][0], lon: navRoute[vehicleRouteIdx][1] }
                  : undefined
              }
            />

            {/* Fit to route after search (non-navigation) */}
            {!navigating && navRoute && <FitToBounds coords={navRoute} />}

            {/* Map programmatic fly-to focus */}
            <MapFocusController focusTarget={mapFocus} />

            {/* ── Critical NER Road Segments Layer (High risk in Red, Caution in Amber, Clear in Green) ── */}
            {liveSegments.map((seg) => {
              const isCrossed = crossedSegments.some(cs => cs.id === seg.id);
              const isSelected = selectedSegmentId === seg.id;
              const isNew = Boolean(
                seg.is_new ||
                seg.has_new_incident ||
                liveIncidents.some(i => i.road && (i.road.toLowerCase() === seg.road_name.toLowerCase() || i.road.toLowerCase() === seg.id?.toLowerCase()))
              );
              // Active incidents guarantee RED (high) or YELLOW (medium)
              const effectiveRisk = isNew && seg.risk_level === 'low' ? 'medium' : seg.risk_level;
              const isHigh = effectiveRisk === 'high';
              const isMed  = effectiveRisk === 'medium';
              const color  = isHigh ? '#dc2626' : isMed ? '#f59e0b' : '#22c55e';
              const weight = isSelected ? 9 : isCrossed ? (isHigh ? 8 : 6.5) : isNew ? 7.5 : (isHigh ? 6 : isMed ? 5 : 3.5);
              const opacity = isSelected ? 1 : isCrossed ? 0.95 : isNew ? 0.95 : (isHigh ? 0.85 : isMed ? 0.75 : 0.45);
              const midIdx = Math.floor(seg.path.length / 2);
              const midPt  = seg.path[midIdx] ?? seg.path[0];

              return (
                <span key={seg.id}>
                  {/* Road Polyline */}
                  <Polyline
                    positions={seg.path}
                    pathOptions={{
                      color,
                      weight,
                      opacity,
                      lineCap: 'round',
                      lineJoin: 'round',
                      dashArray: !isCrossed && !isHigh && !isMed && !isNew ? '4 6' : null,
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedSegmentId(seg.id);
                        setMapFocus({ lat: midPt[0], lon: midPt[1], zoom: 14, id: seg.id, t: Date.now() });
                      },
                    }}
                  >
                    <Popup minWidth={240}>
                      <div style={{ padding: '6px 2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                          <strong style={{ fontSize: '0.95rem' }}>{seg.road_name}</strong>
                          {isNew && (
                            <span style={{
                              background: isHigh ? '#fee2e2' : '#fef3c7',
                              color: isHigh ? '#dc2626' : '#b45309',
                              border: `1.5px solid ${isHigh ? '#fca5a5' : '#fde68a'}`,
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: '0.72rem',
                              fontWeight: 900,
                            }}>
                              (NEW)
                            </span>
                          )}
                          <span style={{
                            marginLeft: 'auto', fontSize: '0.7rem', fontWeight: 800,
                            padding: '2px 6px', borderRadius: 4,
                            background: isHigh ? '#fef2f2' : isMed ? '#fffbeb' : '#f0fdf4',
                            color, border: `1px solid ${color}`,
                          }}>
                            {isHigh ? '🔴 HIGH RISK' : isMed ? '🟡 CAUTION' : '🟢 CLEAR'}
                          </span>
                        </div>
                        {isNew && (
                          <div style={{
                            padding: '4px 8px', background: isHigh ? '#fee2e2' : '#fef3c7',
                            border: `1.5px solid ${isHigh ? '#f87171' : '#facc15'}`,
                            borderRadius: 6, fontSize: '0.74rem', fontWeight: 800,
                            color: isHigh ? '#b91c1c' : '#b45309', marginBottom: 6,
                          }}>
                            🚨 (NEW) INCIDENT REPORTED ON THIS ROAD
                          </div>
                        )}
                        {isCrossed && (
                          <div style={{
                            padding: '5px 8px', background: '#fef2f2', border: '1.5px solid #ef4444',
                            borderRadius: 6, fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', marginBottom: 8,
                          }}>
                            ⚠ THIS ROAD IS ON YOUR ACTIVE ROUTE!
                          </div>
                        )}
                        <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: 6 }}>
                          <strong>{seg.from_node}</strong> → <strong>{seg.to_node}</strong> ({seg.length_km} km)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: '0.74rem', marginBottom: 6 }}>
                          <span>📍 District: <strong>{seg.district}</strong></span>
                          <span>🏔 Slope: <strong>{seg.slope_deg}°</strong></span>
                          <span>🌧 Rainfall: <strong>{seg.rainfall_mm} mm</strong></span>
                          <span>🛣 On Route: <strong>{isCrossed ? 'YES' : 'No'}</strong></span>
                        </div>
                        {seg.reason && (
                          <div style={{
                            fontSize: '0.72rem', color: isHigh ? '#b91c1c' : '#854d0e',
                            background: isHigh ? '#fee2e2' : '#fef3c7',
                            borderLeft: `3px solid ${color}`,
                            padding: '4px 8px', borderRadius: '0 4px 4px 0',
                          }}>
                            ⚠ {seg.reason}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Polyline>

                  {/* Road Name Label at midpoint with (NEW) badge */}
                  {(isCrossed || isHigh || isMed || isNew) && (
                    <Marker
                      position={midPt}
                      icon={createSegBadge({ ...seg, risk_level: effectiveRisk }, isCrossed, isNew)}
                      interactive={false}
                      zIndexOffset={isNew ? 650 : isCrossed ? 400 : -100}
                    />
                  )}

                  {/* Hazard Marker at midpoint for High & Caution road segments or (NEW) incidents */}
                  {(isHigh || isMed || isNew) && (
                    <Marker
                      position={midPt}
                      icon={createHazardPin(effectiveRisk, isCrossed, isNew)}
                      zIndexOffset={isCrossed ? 800 : isNew ? 750 : 500}
                    >
                      <Popup minWidth={240}>
                        <div style={{ padding: '6px 2px' }}>
                          {isNew && (
                            <div style={{
                              background: isHigh ? '#fee2e2' : '#fef3c7',
                              color: isHigh ? '#b91c1c' : '#b45309',
                              border: `1.5px solid ${isHigh ? '#f87171' : '#facc15'}`,
                              padding: '4px 8px', borderRadius: 6, fontSize: '0.74rem',
                              fontWeight: 800, marginBottom: 6,
                            }}>
                              🚨 (NEW) INCIDENT REPORTED ON THIS ROAD
                            </div>
                          )}
                          <div style={{ fontWeight: 800, color, fontSize: '0.88rem', marginBottom: 4 }}>
                            {isHigh ? '🚨 HIGH RISK LANDSLIDE HOTSPOT' : '🟡 CAUTION: TERRAIN INSTABILITY'}
                          </div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{seg.road_name} ({seg.from_node} → {seg.to_node})</span>
                            {isNew && (
                              <span style={{
                                background: isHigh ? '#dc2626' : '#d97706',
                                color: '#fff', padding: '1px 6px', borderRadius: 4,
                                fontSize: '0.7rem', fontWeight: 900
                              }}>(NEW)</span>
                            )}
                          </div>
                          {isCrossed && (
                            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.75rem', marginBottom: 6, padding: '4px 6px', background: '#fee2e2', borderRadius: 4 }}>
                              ⚠ ALERT: Your planned route crosses this hazard zone!
                            </div>
                          )}
                          <div style={{ fontSize: '0.74rem', color: '#666', lineHeight: 1.4 }}>
                            {seg.reason || 'Monsoon slope instability and potential rockfall zone.'}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </span>
              );
            })}

            {/* ── Live Field-Reported Incidents (from MongoDB / Socket.IO) ── */}
            {liveIncidents.map(inc => (
              <Marker key={`inc-${inc.id}`} position={[inc.lat, inc.lon]} icon={incidentPin} zIndexOffset={900}>
                <Popup minWidth={230}>
                  <div style={{ padding: '6px 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: '1rem' }}>🚨</span>
                      <strong style={{ fontSize: '0.88rem', color: '#b91c1c' }}>{inc.type} Reported</strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#333', marginBottom: 4 }}>
                      <strong>Severity:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 700, color: '#ef4444' }}>{inc.severity}</span>
                    </div>
                    {inc.road && (
                      <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: 4 }}>
                        📍 Road: <strong>{inc.road}</strong> {inc.district && `(${inc.district})`}
                      </div>
                    )}
                    {inc.desc && (
                      <div style={{ fontSize: '0.73rem', color: '#444', marginBottom: 6, fontStyle: 'italic' }}>
                        "{inc.desc}"
                      </div>
                    )}
                    {inc.photo && (
                      <img src={`${BASE_URL}${inc.photo}`} alt="Incident" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, marginTop: 4 }} />
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* ── Route polylines: traveled (gray) + remaining (risk-colored) ── */}
            {navRoute && navigating && vehicleRouteIdx > 0 && (
              /* Traveled portion — desaturated gray to show progress */
              <Polyline
                positions={navRoute.slice(0, vehicleRouteIdx + 1)}
                pathOptions={{
                  color: '#9ca3af',
                  weight: 6,
                  opacity: 0.65,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}
            {navRoute && (
              /* Remaining portion (or full route if not navigating) */
              <RiskPolyline
                routeCoords={
                  navigating && vehicleRouteIdx > 0
                    ? navRoute.slice(vehicleRouteIdx)
                    : navRoute
                }
                segments={liveSegments}
              />
            )}

            {/* ── Safe detour — green dashed, shown when a safer alternative exists ── */}
            {routes.length > 1 && selectedIdx !== 0 && routes[0]?.coords && (
              <RiskPolyline
                routeCoords={routes[0].coords}
                segments={liveSegments}
                safeDetour
              />
            )}
            {routes.length > 1 && selectedIdx === 0 && routes[1]?.coords && (
              /* Show the original (riskier) route faded when safest is selected */
              <Polyline
                positions={routes[1].coords}
                pathOptions={{ color: '#94a3b8', weight: 3, opacity: 0.4, dashArray: '4 6' }}
              />
            )}

            {/* ── Vehicle marker: moves along route during navigation (replaces static blue dot) ── */}
            {navigating && navRoute && navRoute[vehicleRouteIdx] && (
              <Marker
                position={navRoute[vehicleRouteIdx]}
                icon={createVehicleIcon(vehicleBearing)}
                zIndexOffset={1200}
              >
                <Popup>
                  <div style={{ padding: '6px' }}>
                    <div style={{ fontWeight: 700, marginBottom: 3 }}>🚗 Vehicle Position</div>
                    <div style={{ fontSize: '0.78rem', color: '#555' }}>
                      {navRoute[vehicleRouteIdx][0].toFixed(5)}, {navRoute[vehicleRouteIdx][1].toFixed(5)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#2563eb', marginTop: 4, fontWeight: 600 }}>
                      {Math.round(routeProgress * 100)}% of route completed
                    </div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* "You are here" — live blue dot (shown when NOT navigating) */}
            {coords && !navigating && (
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

            {/* ── START marker (Google Maps A-pin, green) ── */}
            {fromPlace && (
              <Marker position={[fromPlace.lat, fromPlace.lon]} icon={startIcon} zIndexOffset={1100}>
                <Popup>
                  <div style={{ padding: '4px 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: '#10b981', flexShrink: 0, display: 'block',
                      }} />
                      <strong style={{ color: '#059669', fontSize: '0.88rem' }}>Start</strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#374151' }}>{fromPlace.display_name}</div>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* ── END marker (blue destination pin, no label) ── */}
            {toPlace && (
              <Marker position={[toPlace.lat, toPlace.lon]} icon={endIcon} zIndexOffset={1100}>
                <Popup>
                  <div style={{ padding: '4px 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: '#2563eb', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '1rem', flexShrink: 0,
                      }}>📍</span>
                      <strong style={{ color: '#2563eb', fontSize: '0.88rem' }}>Destination</strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#374151' }}>{toPlace.display_name}</div>
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

              {/* Progress bar */}
              <div style={{ margin: '10px 0 4px', background: 'var(--line)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round(routeProgress * 100)}%`,
                  background: 'linear-gradient(90deg, #10b981, #2563eb)',
                  borderRadius: 4,
                  transition: 'width 0.6s ease',
                  minWidth: routeProgress > 0 ? 8 : 0,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--slate)', marginBottom: 4 }}>
                <span>🟢 Start</span>
                <span style={{ fontWeight: 600, color: 'var(--sky)' }}>{Math.round(routeProgress * 100)}% completed</span>
                <span>🔴 Destination</span>
              </div>

              {/* HUD controls */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={handlePrevStep}
                    disabled={currentStep <= 0}
                    style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', opacity: currentStep <= 0 ? 0.5 : 1, cursor: currentStep <= 0 ? 'not-allowed' : 'pointer' }}
                    title="Previous Step"
                  >
                    <SkipBack size={12} /> Prev Step
                  </button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink)' }}>
                    Step {currentStep + 1} of {Math.max(navSteps.length, 1)}
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={handleNextStep}
                    disabled={currentStep >= navSteps.length - 1}
                    style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', opacity: currentStep >= navSteps.length - 1 ? 0.5 : 1, cursor: currentStep >= navSteps.length - 1 ? 'not-allowed' : 'pointer' }}
                    title="Next Step"
                  >
                    <SkipForward size={12} /> Next Step
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
            </div>
          )}

          {/* Map legend (collapsed during navigation) */}
          {!navigating && (
            <div className="map-legend" style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 999, background: 'rgba(255,255,255,0.96)', fontSize: '0.76rem', borderRadius: 8, padding: '8px 12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Map & Route Legend</div>
              {[
                { color: '#ef4444', label: 'High Risk Road (⚠ Hazard Pin)', line: true },
                { color: '#f59e0b', label: 'Caution Road (▲ Instability)',   line: true },
                { color: '#22c55e', label: 'Clear Route / Segment',          line: true },
                { color: '#94a3b8', label: 'Alternate Route',                line: true, dash: true },
                { color: '#9ca3af', label: 'Traveled Route (navigation)',     line: true },
                { icon: '🟢', label: 'Start Point' },
                { icon: '🔵', label: 'Destination' },
                { icon: '🚗', label: 'Vehicle (live position)' },
                { icon: '🚨', label: 'Reported Incident (Field Officer)' },
              ].map(({ color, label, line, dash, icon }) => (
                <div key={label} style={{ display: 'flex', gap: '7px', alignItems: 'center', marginBottom: 4 }}>
                  {line ? (
                    <span style={{
                      width: 22, height: 4, background: color, borderRadius: 2,
                      opacity: dash ? 0.5 : 1,
                      borderTop: dash ? `3px dashed ${color}` : 'none',
                      background: dash ? 'transparent' : color,
                    }} />
                  ) : (
                    <span style={{ fontSize: '10px' }}>{icon}</span>
                  )}
                  <span style={{ color: '#374151' }}>{label}</span>
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
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto',
          minWidth: 0, transition: 'opacity 0.25s ease',
        }}>

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

          {/* ──── Route Risk Breakdown ──── */}
          {navRoute && crossedSegments.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'visible' }}>

              {/* ── Header ── */}
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid var(--line)',
                background: highSegments.length > 0 ? '#fef2f2' : medSegments.length > 0 ? '#fffbeb' : '#f0fdf4',
                borderRadius: '10px 10px 0 0',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertTriangle size={15} color={highSegments.length > 0 ? '#ef4444' : medSegments.length > 0 ? '#f59e0b' : '#22c55e'} />
                <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>Route Risk Breakdown</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--slate)' }}>
                  {crossedSegments.length} segment{crossedSegments.length !== 1 ? 's' : ''} on route
                </span>
              </div>

              {/* ── Alert banner ── */}
              {highSegments.length > 0 && (
                <div style={{
                  margin: '10px 14px 0', padding: '9px 12px',
                  background: '#fef2f2', border: '1.5px solid #ef4444',
                  borderRadius: 8, fontSize: '0.8rem', lineHeight: 1.6,
                }}>
                  <span style={{ fontWeight: 700, color: '#ef4444' }}>
                    ⚠ {highSegments.length} HIGH-RISK road{highSegments.length > 1 ? 's' : ''} on your route:
                  </span>
                  <span style={{ color: '#555' }}>
                    {' '}{highSegments.map(s => s.road_name).join(', ')}.
                    {saferAlt ? ' Safer detour shown as dashed green on map.' : ' Consider alternate routing.'}
                  </span>
                </div>
              )}
              {highSegments.length === 0 && medSegments.length > 0 && (
                <div style={{
                  margin: '10px 14px 0', padding: '8px 12px',
                  background: '#fffbeb', border: '1.5px solid #f59e0b',
                  borderRadius: 8, fontSize: '0.79rem', lineHeight: 1.5,
                }}>
                  <span style={{ fontWeight: 700, color: '#a16207' }}>
                    🟡 {medSegments.length} CAUTION segment{medSegments.length > 1 ? 's' : ''} — drive carefully.
                  </span>
                </div>
              )}

              {/* ── Live reroute warning ── */}
              {routeRiskWarning && (
                <div style={{
                  margin: '8px 14px 0', padding: '7px 12px',
                  background: '#fff7ed', border: '1.5px solid #f97316',
                  borderRadius: 8, fontSize: '0.77rem',
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  <span style={{ fontSize: '1.1rem' }}>🚨</span>
                  <span><strong>{routeRiskWarning.road_name}</strong> just became high-risk — recalculating…</span>
                  <button onClick={() => setRouteRiskWarning(null)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#999' }}>✕</button>
                </div>
              )}

              {/* ── Per-segment table ── */}
              <div style={{ padding: '10px 14px 14px' }}>
                {/* Table header */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: '2px 10px', fontSize: '0.7rem', color: 'var(--slate)',
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em',
                  paddingBottom: 6, borderBottom: '2px solid var(--line)', marginBottom: 4,
                }}>
                  <span>Road / Segment</span>
                  <span style={{ textAlign: 'center' }}>Risk</span>
                  <span>km</span>
                </div>

                {crossedSegments.map(seg => {
                  const isNew = Boolean(
                    seg.is_new ||
                    seg.has_new_incident ||
                    liveIncidents.some(i => i.road && (i.road.toLowerCase() === seg.road_name.toLowerCase() || i.road.toLowerCase() === seg.id?.toLowerCase()))
                  );
                  const effectiveRisk = isNew && seg.risk_level === 'low' ? 'medium' : seg.risk_level;
                  const isHigh = effectiveRisk === 'high';
                  const isMed  = effectiveRisk === 'medium';
                  const color  = isHigh ? '#dc2626' : isMed ? '#f59e0b' : '#22c55e';
                  const bgCol  = isHigh ? '#fef2f2' : isMed ? '#fffbeb' : '#f0fdf4';
                  const emoji  = isHigh ? '🔴' : isMed ? '🟡' : '🟢';
                  const badge  = isHigh ? 'HIGH' : isMed ? 'CAUTION' : 'CLEAR';
                  const midIdx = Math.floor(seg.path.length / 2);
                  const midPt  = seg.path[midIdx] ?? seg.path[0];
                  const isSelected = selectedSegmentId === seg.id;

                  const focusThisSegment = () => {
                    setSelectedSegmentId(seg.id);
                    setMapFocus({ lat: midPt[0], lon: midPt[1], zoom: 14, id: seg.id, t: Date.now() });
                  };

                  return (
                    <div
                      key={seg.id}
                      onClick={focusThisSegment}
                      style={{
                        display: 'grid', gridTemplateColumns: '1fr auto auto',
                        gap: '2px 10px', padding: '10px 8px',
                        borderBottom: '1px solid var(--line)',
                        alignItems: 'start',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                        borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
                        transition: 'background 0.2s',
                      }}
                      title="Click to view and zoom this road on map"
                    >
                      {/* Road info */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--ink)' }}>
                            {seg.road_name}
                          </span>
                          {isNew && (
                            <span style={{
                              background: isHigh ? '#fee2e2' : '#fef3c7',
                              color: isHigh ? '#dc2626' : '#b45309',
                              border: `1.5px solid ${isHigh ? '#fca5a5' : '#fde68a'}`,
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              animation: 'pulse-danger 2s infinite',
                            }}>
                              (NEW)
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); focusThisSegment(); }}
                            style={{
                              padding: '2px 6px',
                              fontSize: '0.67rem',
                              fontWeight: 600,
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                              borderRadius: 4,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                            title="Focus this danger zone on map"
                          >
                            📍 View on Map
                          </button>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--slate)', marginTop: 2 }}>
                          {seg.from_node} → {seg.to_node}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--slate)', marginTop: 1 }}>
                          📍 {seg.district} · 🏔 {seg.slope_deg}° · 🌧 {seg.rainfall_mm} mm
                        </div>
                        {seg.reason && (
                          <div style={{
                            fontSize: '0.68rem', color, marginTop: 4,
                            paddingLeft: 6, borderLeft: `2px solid ${color}`,
                          }}>
                            ⚠ {seg.reason}
                          </div>
                        )}
                      </div>

                      {/* Risk badge */}
                      <div style={{
                        padding: '3px 8px',
                        background: bgCol, color, border: `1.5px solid ${color}`,
                        borderRadius: 6, fontWeight: 800, fontSize: '0.68rem',
                        whiteSpace: 'nowrap', textAlign: 'center',
                        alignSelf: 'start',
                      }}>
                        {emoji} {badge}
                      </div>

                      {/* Distance */}
                      <div style={{ fontWeight: 600, fontSize: '0.78rem', color: 'var(--slate)', alignSelf: 'start' }}>
                        {seg.length_km} km
                      </div>
                    </div>
                  );
                })}

                {/* Detour note */}
                {saferAlt && (
                  <div style={{
                    marginTop: 10, padding: '7px 10px',
                    background: '#f0fdf4', border: '1px solid #86efac',
                    borderRadius: 7, display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '0.75rem', color: '#15803d', fontWeight: 600,
                  }}>
                    <ShieldCheck size={13} />
                    Safer route ({saferAlt.distKm} km) shown as green dashes on map
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ No-route placeholder ─ */}
          {navRoute && crossedSegments.length === 0 && (
            <div className="card" style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--slate)', fontSize: '0.8rem' }}>
              <ShieldCheck size={18} color="#22c55e" style={{ marginBottom: 4 }} />
              <div style={{ fontWeight: 600, color: '#15803d' }}>Route looks clear</div>
              <div style={{ marginTop: 2 }}>No high-risk NER segments detected on this path.</div>
            </div>
          )}

          {/* ---- Turn-by-turn step list (collapsible, shown outside of HUD) ---- */}
          {navSteps.length > 0 && (
            <StepList steps={navSteps} currentStep={currentStep} onSelectStep={navigating ? goToStep : undefined} />
          )}

          {/* Coverage note */}
          <div style={{ padding: '10px 12px', borderRadius: 8, fontSize: '0.73rem', color: 'var(--slate)', background: 'var(--sky-tint)', border: '1px solid var(--sky-tint-2)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--ink)' }}>Coverage:</strong> Landslide risk only applies inside the
            Dima Hasao DEM (lat 24.97–25.83, lon 92.52–93.47). Routes outside this area still route but
            show "Outside coverage." Routing via OSRM public demo server.
          </div>
        </div>
      </div>

      {/* ── Pre-Trip Navigation Safety Alert Modal (EN / HI / BN) ── */}
      {showNavAlert && selectedIdx != null && routes[selectedIdx] && (
        <NavAlertModal
          route={routes[selectedIdx]}
          crossedSegments={crossedSegments}
          highSegments={highSegments}
          medSegments={medSegments}
          fromName={fromPlace?.display_name?.split(',')[0] || 'Current Location'}
          toName={toPlace?.display_name?.split(',')[0] || 'Destination'}
          saferAlt={saferAlt}
          lang={navAlertLang}
          onLangChange={(l) => setNavAlertLang(l)}
          onProceed={confirmNavigation}
          onCancel={() => setShowNavAlert(false)}
          onSwitchSafer={() => {
            selectRoute(0);
          }}
        />
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Collapsible step list
// ---------------------------------------------------------------------------
const StepList = ({ steps, currentStep, onSelectStep }) => {
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
              onClick={() => onSelectStep && onSelectStep(i)}
              style={{
                display: 'flex', gap: '10px', alignItems: 'flex-start',
                padding: '7px 0', borderBottom: '1px solid var(--line)',
                fontSize: '0.8rem', lineHeight: 1.4,
                color: i === currentStep ? 'var(--ink)' : 'var(--slate)',
                fontWeight: i === currentStep ? 600 : 400,
                background: i === currentStep ? 'var(--sky-tint)' : 'none',
                borderRadius: i === currentStep ? 5 : 0,
                paddingLeft: i === currentStep ? 6 : 0,
                cursor: onSelectStep ? 'pointer' : 'default',
              }}
              title={onSelectStep ? `Jump to Step ${i + 1}` : undefined}
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
