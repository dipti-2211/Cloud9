import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { vehicles as initialVehicles, incidents } from '../../data/mockData';
import { Badge } from '../common/Badge';
import { getLandslideRisk, vehiclesAPI } from '../../services/api';
import demoLocations from '../../data/demoLocations.json';
import { useSocket } from '../../hooks/useSocket';
import { NER_ROAD_SEGMENTS } from './RiskPolyline';

// ---------------------------------------------------------------------------
// NER_ROAD_SEGMENTS imported from RiskPolyline.jsx (single source of truth)


// Risk → Leaflet polyline color + badge
const RISK_STYLE = {
  high:   { color: '#ef4444', weight: 6, opacity: 0.92, dashArray: null },
  medium: { color: '#f59e0b', weight: 5, opacity: 0.88, dashArray: null },
  low:    { color: '#22c55e', weight: 4, opacity: 0.75, dashArray: null },
};

const RISK_LABEL = { high: '🔴 HIGH RISK', medium: '🟡 CAUTION', low: '🟢 CLEAR' };
const RISK_TEXT  = { high: '#ef4444',      medium: '#b45309',   low: '#15803d' };

// ---------------------------------------------------------------------------
// Marker icons (unchanged from original)
// ---------------------------------------------------------------------------
const vehicleIcon  = L.divIcon({ className: 'vehicle-marker',  iconSize: [14, 14], iconAnchor: [7, 7] });
const incidentIcon = L.divIcon({ className: 'incident-marker', iconSize: [16, 16], iconAnchor: [8, 8] });
const userLocationIcon = L.divIcon({ className: 'user-location-marker', iconSize: [20, 20], iconAnchor: [10, 10] });
const demoPinHigh = L.divIcon({ className: 'demo-pin demo-pin-high', iconSize: [22, 22], iconAnchor: [11, 22] });
const demoPinLow  = L.divIcon({ className: 'demo-pin demo-pin-low',  iconSize: [22, 22], iconAnchor: [11, 22] });

// Segment midpoint label icon with prominent (NEW) tag
const segLabelIcon = (seg, isNew = false) => {
  const isHigh = seg.risk_level === 'high';
  const isMed  = seg.risk_level === 'medium';
  const bg     = isHigh ? '#dc2626' : isMed ? '#d97706' : '#16a34a';
  const prefix = isHigh ? '🔴 ' : isMed ? '🟡 ' : '🟢 ';
  const newBadge = isNew
    ? `<span style="
        background:#ffffff;
        color:${isHigh ? '#dc2626' : '#b45309'};
        padding:1px 5px;
        border-radius:4px;
        font-size:9px;
        font-weight:900;
        margin-left:4px;
        box-shadow:0 1px 3px rgba(0,0,0,0.35);
        letter-spacing:0.5px;
        display:inline-flex;
        align-items:center;
      ">(NEW)</span>`
    : '';

  return L.divIcon({
    className: '',
    iconSize: [1, 1],
    iconAnchor: [0, 0],
    html: `<div style="
      background:${bg};
      color:#fff;
      padding:2px 7px;
      border-radius:10px;
      font-size:10px;
      font-weight:700;
      white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      border:${isNew ? '2px solid #fef08a' : '1px solid rgba(255,255,255,0.7)'};
      pointer-events:none;
      display:inline-flex;
      align-items:center;
      gap:3px;
      ${isNew ? 'animation: pulse-danger 1.8s infinite;' : ''}
    ">${prefix}${seg.road_name}${newBadge}</div>`,
  });
};

// Risk click-marker icons
const getRiskIcon = (category, isLoading = false) => {
  if (isLoading) return L.divIcon({ className: 'risk-marker risk-marker-loading', iconSize: [18, 18], iconAnchor: [9, 9] });
  const cls = category === 'Very Low' || category === 'Low' ? 'risk-marker-low'
            : category === 'Moderate' ? 'risk-marker-moderate'
            : 'risk-marker-high';
  return L.divIcon({ className: `risk-marker ${cls}`, iconSize: [18, 18], iconAnchor: [9, 9] });
};

const CATEGORY_COLOUR = {
  'Very Low': 'var(--success)', 'Low': 'var(--success)',
  'Moderate': 'var(--warning)', 'High': 'var(--danger)', 'Very High': 'var(--danger)',
};

// ---------------------------------------------------------------------------
// Inner helpers — must live inside <MapContainer>
// ---------------------------------------------------------------------------
const ClickHandler = ({ onMapClick }) => {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
};

const RecenterOnUser = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    if (coords?.lat != null && coords?.lon != null) {
      map.flyTo([coords.lat, coords.lon], 14, { animate: true, duration: 1.2 });
    }
  }, [coords?.lat, coords?.lon, map]);
  return null;
};

// Derive Leaflet [lat, lon] from a vehicle record
function vehicleLeafletPos(v) {
  if (v.currentLocation?.coordinates?.length === 2) {
    const [lon, lat] = v.currentLocation.coordinates;
    if (lat >= 20 && lat <= 30 && lon >= 88 && lon <= 98) return [lat, lon];
  }
  if (v.position?.length === 2) return v.position;
  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const MapPanel = ({ userCoords = null, activeRoute = null }) => {
  const { socket } = useSocket();
  const [liveVehicles, setLiveVehicles] = useState(initialVehicles);
  const [roadSegments, setRoadSegments] = useState(NER_ROAD_SEGMENTS);  // updated live via socket
  const [liveIncidents, setLiveIncidents] = useState([]);               // field-reported incidents
  const [riskMarkers,   setRiskMarkers]   = useState([]);
  const [pendingMarker, setPendingMarker] = useState(null);

  // ── Socket: live road segment + incident updates ─────────────────────────────
  useEffect(() => {
    const onSegUpdated = (seg) => {
      setRoadSegments(prev => prev.map(s => {
        const matches = s.id === (seg.segment_key ?? seg.id ?? seg._id) || s.road_name === seg.road_name;
        if (!matches) return s;
        return {
          ...s,
          risk_level: seg.current_risk_level,
          is_new: true,
          has_new_incident: true,
        };
      }));
    };

    const onIncidentCreated = (inc) => {
      const lat = inc.latitude  ?? inc.location?.coordinates?.[1];
      const lon = inc.longitude ?? inc.location?.coordinates?.[0];
      if (lat == null || lon == null) return;
      const roadName = inc.road_segment_id?.road_name;
      const isHigh = inc.reported_risk_level === 'high' || inc.reported_risk_level === 'critical';

      setLiveIncidents(prev => [
        { id: inc._id, lat, lon, type: inc.incident_type, severity: inc.reported_risk_level,
          road: roadName, district: inc.road_segment_id?.district,
          officer: inc.field_officer_name, desc: inc.description, photo: inc.photo_url, is_new: true },
        ...prev.slice(0, 19), // keep latest 20
      ]);

      if (roadName) {
        setRoadSegments(prev => prev.map(s => {
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

      toast(`🔴 Incident reported on ${roadName ?? 'road'}: ${inc.incident_type} (NEW)`, { duration: 6000 });
    };

    socket.on('road_segment_updated', onSegUpdated);
    socket.on('incident_created',     onIncidentCreated);
    return () => {
      socket.off('road_segment_updated', onSegUpdated);
      socket.off('incident_created',     onIncidentCreated);
    };
  }, [socket]);

  // Poll backend for live vehicle positions every 5 s
  useEffect(() => {
    let cancelled = false;
    const fetchVehicles = async () => {
      try {
        const data = await vehiclesAPI.getAll();
        if (!cancelled && Array.isArray(data) && data.length > 0) setLiveVehicles(data);
      } catch { /* keep current state */ }
    };
    fetchVehicles();
    const id = setInterval(fetchVehicles, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Poll backend for live road segments every 30 s (with is_new flag)
  useEffect(() => {
    let cancelled = false;
    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:1710';
    const fetchSegments = async () => {
      try {
        const r = await fetch(`${BASE}/api/road-segments`);
        if (!r.ok) return;
        const d = await r.json();
        const segs = d.roadSegments ?? d.criticalRoads ?? [];
        if (!cancelled && segs.length > 0) {
          // Merge live risk data & is_new flag into static path data
          setRoadSegments(prev => prev.map(p => {
            const live = segs.find(s => s.segment_key === p.id || s.road_name === p.road_name);
            if (!live) return p;
            return {
              ...p,
              risk_level: live.current_risk_level ?? p.risk_level,
              is_new: live.is_new || live.has_new_incident || false,
              has_new_incident: live.has_new_incident || live.is_new || false,
            };
          }));
        }
      } catch { /* offline — keep static data */ }
    };
    fetchSegments();
    const id = setInterval(fetchSegments, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Map click → landslide risk lookup
  const handleMapClick = async ({ lat, lng }) => {
    const id = Date.now();
    setPendingMarker({ id, lat, lon: lng });
    try {
      const result = await getLandslideRisk(lat, lng);
      setPendingMarker(null);
      setRiskMarkers(prev => [...prev, { id, ...result }]);
    } catch (err) {
      setPendingMarker(null);
      toast.error(`Risk lookup failed: ${err.message}`);
    }
  };

  return (
    <MapContainer
      center={[25.165, 93.017]}  // Dima Hasao / Haflong — the highest-risk NER hub
      zoom={9}                    // zoomed in to show Haflong road network clearly
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      {/* Dark-friendly Stadia smooth tiles */}
      <TileLayer
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
        attribution="&copy; Stadia Maps &copy; OpenStreetMap contributors"
        maxZoom={19}
      />

      <RecenterOnUser coords={userCoords} />
      <ClickHandler onMapClick={handleMapClick} />

      {/* ── NER Critical Road Segments — colored by risk level ── */}
      {roadSegments.map((seg) => {
        const isNew = Boolean(
          seg.is_new ||
          seg.has_new_incident ||
          liveIncidents.some(i => i.road && (i.road.toLowerCase() === seg.road_name.toLowerCase() || i.road.toLowerCase() === seg.id?.toLowerCase()))
        );
        const effectiveRisk = isNew && seg.risk_level === 'low' ? 'medium' : seg.risk_level;
        const isHigh = effectiveRisk === 'high';
        const isMed  = effectiveRisk === 'medium';
        const style  = isHigh
          ? { color: '#dc2626', weight: isNew ? 7.5 : 6, opacity: 0.9 }
          : isMed
          ? { color: '#f59e0b', weight: isNew ? 6.5 : 5, opacity: 0.85 }
          : (RISK_STYLE[effectiveRisk] ?? RISK_STYLE.low);
        const midIdx = Math.floor(seg.path.length / 2);
        const midPt  = seg.path[midIdx] ?? seg.path[0];

        return (
          <span key={seg.id}>
            {/* The road polyline itself */}
            <Polyline
              positions={seg.path}
              pathOptions={{ ...style, lineCap: 'round', lineJoin: 'round' }}
              eventHandlers={{
                mouseover: (e) => e.target.setStyle({ weight: style.weight + 3, opacity: 1 }),
                mouseout:  (e) => e.target.setStyle({ weight: style.weight, opacity: style.opacity }),
              }}
            >
              <Popup minWidth={240}>
                <div style={{ padding: '8px 4px' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: style.color, flexShrink: 0,
                    }} />
                    <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{seg.road_name}</span>
                      {isNew && (
                        <span style={{
                          background: isHigh ? '#fee2e2' : '#fef3c7',
                          color: isHigh ? '#dc2626' : '#b45309',
                          border: `1.5px solid ${isHigh ? '#fca5a5' : '#fde68a'}`,
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: '0.72rem',
                          fontWeight: 900
                        }}>(NEW)</span>
                      )}
                    </div>
                  </div>

                  {isNew && (
                    <div style={{
                      padding: '4px 8px', background: isHigh ? '#fee2e2' : '#fef3c7',
                      border: `1.5px solid ${isHigh ? '#f87171' : '#facc15'}`,
                      borderRadius: 6, fontSize: '0.74rem', fontWeight: 800,
                      color: isHigh ? '#b91c1c' : '#b45309', marginBottom: 8,
                    }}>
                      🚨 (NEW) INCIDENT REPORTED ON THIS ROAD
                    </div>
                  )}

                  {/* Risk badge */}
                  <div style={{
                    display: 'inline-block',
                    background: style.color + '22',
                    color: isHigh ? '#dc2626' : isMed ? '#b45309' : RISK_TEXT[effectiveRisk],
                    border: `1px solid ${style.color}`,
                    borderRadius: 6, padding: '2px 10px',
                    fontSize: '0.78rem', fontWeight: 700,
                    marginBottom: 10,
                  }}>
                    {isHigh ? '🔴 High Risk' : isMed ? '🟡 Caution' : RISK_LABEL[effectiveRisk]}
                  </div>

                  {/* Route info */}
                  <div style={{ fontSize: '0.82rem', color: '#555', marginBottom: 8 }}>
                    <strong>{seg.from_node}</strong> → <strong>{seg.to_node}</strong>
                  </div>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px',
                    fontSize: '0.78rem', marginBottom: 8,
                  }}>
                    <div><span style={{ color: '#888' }}>Length</span><br /><strong>{seg.length_km} km</strong></div>
                    <div><span style={{ color: '#888' }}>District</span><br /><strong>{seg.district}</strong></div>
                    <div><span style={{ color: '#888' }}>Slope</span><br /><strong>{seg.slope_deg}°</strong></div>
                    <div><span style={{ color: '#888' }}>Rainfall 7d</span><br /><strong>{seg.rainfall_mm} mm</strong></div>
                  </div>

                  {/* Risk reason */}
                  {seg.reason && (
                    <div style={{
                      fontSize: '0.73rem', color: '#666',
                      background: '#fef2f2', borderLeft: `3px solid ${style.color}`,
                      padding: '4px 8px', borderRadius: '0 4px 4px 0',
                    }}>
                      ⚠ {seg.reason}
                    </div>
                  )}
                </div>
              </Popup>
            </Polyline>

            {/* Road name label at midpoint with (NEW) badge */}
            <Marker
              position={midPt}
              icon={segLabelIcon({ ...seg, risk_level: effectiveRisk }, isNew)}
              zIndexOffset={isNew ? 600 : -100}
              interactive={false}
            />
          </span>
        );
      })}

      {/* ── Vehicle route polylines ── */}
      {liveVehicles.filter(v => v.route || v.routeWaypoints).map(v => {
        const pts = v.routeWaypoints?.length > 1 ? v.routeWaypoints : v.route;
        if (!pts || pts.length < 2) return null;
        return (
          <Polyline
            key={`route-${v.id || v._id}`}
            positions={pts}
            pathOptions={{ color: 'var(--accent)', weight: 3, opacity: 0.6, dashArray: '5, 10' }}
          />
        );
      })}

      {/* ── Active route from RoutePanel ── */}
      {activeRoute && activeRoute.length > 1 && (
        <Polyline
          positions={activeRoute}
          pathOptions={{ color: '#f97316', weight: 5, opacity: 0.85 }}
        />
      )}

      {/* ── Live vehicle markers ── */}
      {liveVehicles.map((v) => {
        const pos = vehicleLeafletPos(v);
        if (!pos) return null;
        return (
          <Marker key={v.id || v._id} position={pos} icon={vehicleIcon}>
            <Popup>
              <div style={{ padding: '4px' }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>{v.id || v.vehicleNumber}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  {v.cargo || v.cargoType}
                </div>
                <Badge type={v.status === 'IN TRANSIT' || v.status === 'IN_TRANSIT' ? 'success' : 'warning'}>
                  {v.status}
                </Badge>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* ── Mock incident markers ── */}
      {incidents.map((inc) => (
        <Marker key={inc.id} position={inc.position} icon={incidentIcon}>
          <Popup>
            <div style={{ padding: '4px' }}>
              <div style={{ fontWeight: 600, color: 'var(--danger)', fontSize: '1rem' }}>{inc.type}</div>
              <Badge type="danger">{inc.severity}</Badge>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* ── LIVE field-reported incidents (from Socket.IO / MongoDB) ── */}
      {liveIncidents.map((inc) => (
        <CircleMarker
          key={`live-inc-${inc.id}`}
          center={[inc.lat, inc.lon]}
          radius={12}
          pathOptions={{
            color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.85, weight: 3,
          }}
          zIndexOffset={800}
        >
          <Popup minWidth={230}>
            <div style={{ padding: '6px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: '1.1rem' }}>🔴</span>
                <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem' }}>
                  Live Incident Report
                </span>
              </div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{inc.type?.replace(/_/g, ' ')}</div>
              {inc.road && (
                <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: 4 }}>
                  📍 {inc.road}{inc.district ? ` · ${inc.district}` : ''}
                </div>
              )}
              {inc.desc && (
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: 6 }}>{inc.desc}</div>
              )}
              {inc.photo && (
                <img
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:1710'}${inc.photo}`}
                  alt="Incident photo"
                  style={{ width: '100%', borderRadius: 6, marginBottom: 6, maxHeight: 120, objectFit: 'cover' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <div style={{ fontSize: '0.7rem', color: '#888' }}>
                🧑‍✈ Reported by: {inc.officer ?? 'Field Officer'}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}


      {/* ── "You are here" marker ── */}
      {userCoords && (
        <Marker position={[userCoords.lat, userCoords.lon]} icon={userLocationIcon}>
          <Popup>
            <div style={{ padding: '4px', fontWeight: 600 }}>📍 Your Location</div>
          </Popup>
        </Marker>
      )}

      {/* ── Permanent demo location pins ── */}
      {demoLocations.map((loc) => (
        <Marker
          key={`demo-${loc.lat}-${loc.lon}`}
          position={[loc.lat, loc.lon]}
          icon={loc.type === 'risky' ? demoPinHigh : demoPinLow}
          zIndexOffset={500}
        >
          <Popup minWidth={200}>
            <div style={{ padding: '8px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4,
                color: loc.type === 'risky' ? '#ef4444' : '#10b981' }}>
                {loc.type === 'risky' ? '🔴' : '🟢'} {loc.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: '0.8rem', color: '#555' }}>{loc.riskCategory} risk</span>
                <span style={{ fontWeight: 700, color: loc.type === 'risky' ? '#ef4444' : '#10b981' }}>
                  {loc.riskPercentage.toFixed(1)}%
                </span>
              </div>
              <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', width: `${loc.riskPercentage}%`,
                  background: loc.type === 'risky' ? '#ef4444' : '#10b981', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                <span>Elevation: <strong>{loc.features.elevation} m</strong></span>
                <span>Slope: <strong>{loc.features.slope}°</strong></span>
                <span>Dist road: <strong>{loc.features.dist_to_road < 1000 ? `${loc.features.dist_to_road} m` : `${(loc.features.dist_to_road/1000).toFixed(1)} km`}</strong></span>
                <span>Rainfall: <strong>{loc.features.rainfall.toFixed(1)} mm</strong></span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* ── Pending risk marker (loading) ── */}
      {pendingMarker && (
        <Marker position={[pendingMarker.lat, pendingMarker.lon]} icon={getRiskIcon(null, true)}>
          <Popup>
            <div style={{ padding: '4px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Analysing risk…
            </div>
          </Popup>
        </Marker>
      )}

      {/* ── Click-to-check risk prediction markers ── */}
      {riskMarkers.map((marker) => {
        const colour = CATEGORY_COLOUR[marker.risk_category] ?? 'var(--accent)';
        return (
          <Marker
            key={`risk-${marker.id}`}
            position={[marker.latitude, marker.longitude]}
            icon={getRiskIcon(marker.risk_category)}
          >
            <Popup minWidth={210}>
              <div style={{ padding: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: colour }}>{marker.risk_category}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {marker.prediction === 1 ? '⚠ High risk' : '✓ Low risk'}
                  </span>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Risk Score</div>
                  <div style={{ height: '6px', background: 'var(--surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${marker.risk_percentage}%`, background: colour, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '4px', color: colour }}>
                    {marker.risk_percentage.toFixed(1)}%
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  <div><div style={{ color: 'var(--text-secondary)' }}>Elevation</div><div style={{ fontWeight: 600 }}>{marker.elevation.toFixed(0)} m</div></div>
                  <div><div style={{ color: 'var(--text-secondary)' }}>Slope</div><div style={{ fontWeight: 600 }}>{marker.slope.toFixed(1)}°</div></div>
                  <div><div style={{ color: 'var(--text-secondary)' }}>Rainfall</div><div style={{ fontWeight: 600 }}>{marker.rainfall > 0 ? `${marker.rainfall.toFixed(1)} mm` : 'N/A'}</div></div>
                  <div><div style={{ color: 'var(--text-secondary)' }}>Road Dist.</div><div style={{ fontWeight: 600 }}>{marker.dist_to_road >= 1000 ? `${(marker.dist_to_road/1000).toFixed(1)} km` : `${marker.dist_to_road.toFixed(0)} m`}</div></div>
                </div>
                {marker.rainfall_source && (
                  <div style={{ marginTop: '8px', fontSize: '0.68rem', color: 'var(--text-secondary)', background: 'var(--surface-elevated)', borderRadius: 4, padding: '3px 7px', display: 'inline-block' }}>
                    🌧 {marker.rainfall_source === 'live' ? 'Live rainfall (Open-Meteo)' : 'Historical average'}
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); setRiskMarkers(prev => prev.filter(m => m.id !== marker.id)); }}
                  style={{ marginTop: '10px', width: '100%', padding: '5px', background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: 'none', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  Remove marker
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
};