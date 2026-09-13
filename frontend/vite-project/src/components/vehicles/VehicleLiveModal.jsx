/**
 * VehicleLiveModal.jsx
 *
 * Full-screen modal overlay showing a vehicle's live position on a map
 * + a detail panel: status, speed, driver, cargo, source, destination, ETA,
 * and the risk level of the road segment NEAREST TO THIS VEHICLE'S ROUTE.
 *
 * Fix: getRelatedRoad() now uses Haversine proximity filtering against
 * the vehicle's routeWaypoints (or route array), not a global sort-by-worst.
 */
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Navigation, Thermometer, ShieldAlert, Truck, Clock, MapPin, AlertTriangle, RefreshCw } from 'lucide-react';
import { Badge } from '../common/Badge';
import { roads } from '../../data/mockData';

// Reuse the same vehicle marker style as MapPanel
const vehicleIcon = L.divIcon({ className: 'vehicle-marker', iconSize: [16, 16], iconAnchor: [8, 8] });

// Representative [lat, lon] coords for each mock road segment (midpoint approximation)
const ROAD_COORDS = {
  'NH-06': [25.9000, 91.8500],   // Guwahati–Shillong corridor
  'NH-10': [27.0594, 88.4695],   // Siliguri–Gangtok
  'SH-37': [27.3000, 94.6000],   // Dibrugarh bypass
  'NH-2':  [25.5000, 93.8000],   // Kohima–Imphal
  'SH-5':  [25.1450, 93.0100],   // Dima Hasao Corridor
};

// Start marker (origin) — clean emerald teardrop
const startIcon = L.divIcon({
  className: '',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  html: `<div style="
    width: 32px; height: 42px;
    position: relative;
    filter: drop-shadow(0 3px 6px rgba(16,185,129,0.55));
  ">
    <svg viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#10b981"/>
      <path d="M18 2C9.16 2 2 9.16 2 18c0 12.5 16 28 16 28S34 30.5 34 18C34 9.16 26.84 2 18 2z" fill="#059669"/>
      <circle cx="18" cy="18" r="7" fill="white" fill-opacity="0.95"/>
      <circle cx="18" cy="18" r="3.5" fill="#059669"/>
    </svg>
  </div>`,
});

// Destination marker — clean blue teardrop (no letter)
const endIcon = L.divIcon({
  className: '',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  html: `<div style="
    width: 32px; height: 42px;
    position: relative;
    filter: drop-shadow(0 3px 6px rgba(59,130,246,0.6));
  ">
    <svg viewBox="0 0 36 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%">
      <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 30 18 30s18-16.5 18-30C36 8.06 27.94 0 18 0z" fill="#3b82f6"/>
      <path d="M18 2C9.16 2 2 9.16 2 18c0 12.5 16 28 16 28S34 30.5 34 18C34 9.16 26.84 2 18 2z" fill="#2563eb"/>
      <circle cx="18" cy="18" r="7" fill="white" fill-opacity="0.95"/>
      <circle cx="18" cy="18" r="3.5" fill="#2563eb"/>
    </svg>
  </div>`,
});

// Hazard risk marker
const riskHazardIcon = L.divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  html: `<div style="
    width: 32px; height: 32px; border-radius: 50%;
    background: rgba(239, 68, 68, 0.25);
    border: 2.5px solid #ef4444;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 16px rgba(239, 68, 68, 0.8);
    font-size: 15px;
  ">⚠️</div>`,
});

// Extra demo risky routes
const DEMO_RISKY_ROUTES = [
  { id: 'NH-2', name: 'Kohima – Imphal', status: 'BLOCKED', riskScore: 95, reason: 'Landslide debris across all lanes at km 114.' },
  { id: 'NH-10', name: 'Siliguri – Gangtok', status: 'HIGH RISK', riskScore: 78, reason: 'Steep escarpment landslide vulnerability.' },
  { id: 'SH-5', name: 'Haflong Pass Corridor', status: 'BLOCKED', riskScore: 92, reason: 'Heavy mudflow blocking arterial road.' },
  { id: 'SH-37', name: 'Dibrugarh Bypass', status: 'CAUTION', riskScore: 45, reason: 'Flash-flood runoff eroding shoulder.' },
];

// Haversine distance in km between two [lat,lon] points
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

/**
 * Returns the most relevant road for THIS vehicle — one that actually lies
 * near its route waypoints, not just the globally worst road in the system.
 *
 * Algorithm:
 *  1. Get route waypoints from vehicle.route or vehicle.routeWaypoints.
 *  2. For each mock road with known coords, compute the minimum Haversine
 *     distance to any waypoint.
 *  3. Keep roads within THRESHOLD_KM (200km — NER corridors are long).
 *  4. Among those, pick the highest-risk (BLOCKED > HIGH RISK > CAUTION > OPEN).
 *  5. If nothing is within threshold, fall back to global worst (never blank).
 */
const THRESHOLD_KM = 200;
const PRIORITY = { BLOCKED: 3, 'HIGH RISK': 2, CAUTION: 1, OPEN: 0 };

const getRelatedRoad = (vehicle) => {
  const waypoints = vehicle.route ?? vehicle.routeWaypoints ?? [];

  const scored = roads
    .map(road => {
      const coords = ROAD_COORDS[road.id];
      if (!coords || !waypoints.length) return { road, minDist: Infinity };
      const minDist = Math.min(
        ...waypoints.map(([wLat, wLon]) => haversine(coords[0], coords[1], wLat, wLon))
      );
      return { road, minDist };
    })
    .filter(({ minDist }) => minDist <= THRESHOLD_KM);

  if (!scored.length) {
    // Fallback: global worst (never return null)
    return [...roads].sort((a, b) => (PRIORITY[b.status] ?? 0) - (PRIORITY[a.status] ?? 0))[0];
  }

  return scored.sort((a, b) =>
    (PRIORITY[b.road.status] ?? 0) - (PRIORITY[a.road.status] ?? 0)
  )[0].road;
};

const ROAD_BADGE_COLOR = {
  BLOCKED:     'var(--danger)',
  'HIGH RISK': 'var(--danger)',
  CAUTION:     'var(--warning)',
  OPEN:        'var(--success)',
};

const DetailRow = ({ label, value, highlight }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{label}</span>
    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: highlight ?? 'var(--text-primary)' }}>{value}</span>
  </div>
);

// Map controller to smoothly fly to focused hazard or fit full corridor bounds
const MapController = ({ focusTarget, routeWaypoints }) => {
  const map = useMap();
  useEffect(() => {
    if (focusTarget) {
      map.flyTo(focusTarget, 12, { animate: true, duration: 0.8 });
    } else if (routeWaypoints && routeWaypoints.length > 1) {
      try {
        const bounds = L.latLngBounds(routeWaypoints);
        map.fitBounds(bounds, { padding: [40, 40] });
      } catch {}
    }
  }, [map, focusTarget, routeWaypoints]);
  return null;
};

export const VehicleLiveModal = ({ vehicle, onClose }) => {
  const backdropRef = useRef(null);
  const [focusedTarget, setFocusedTarget] = useState(null);
  const [focusedLabel, setFocusedLabel]   = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!vehicle) return null;

  const relatedRoad = getRelatedRoad(vehicle);
  const statusColor = vehicle.status === 'IN TRANSIT' ? 'var(--success)'
    : vehicle.status === 'DELAYED' ? 'var(--warning)' : 'var(--danger)';

  // Safe field fallbacks
  const vId = vehicle.id || vehicle.vehicleNumber || vehicle.registrationNumber || 'Vehicle';
  const vType = vehicle.type || vehicle.vehicleType || 'Truck';
  const vCargo = vehicle.cargo || vehicle.cargoType || 'Supplies';
  const routeWaypoints = vehicle.route || vehicle.routeWaypoints || [];
  const rawCoords = vehicle.position || (vehicle.currentLocation?.coordinates ? [vehicle.currentLocation.coordinates[1], vehicle.currentLocation.coordinates[0]] : null);
  const vPos = rawCoords || (routeWaypoints.length ? routeWaypoints[0] : [26.1445, 91.7362]);

  const startPoint = routeWaypoints.length > 0 ? routeWaypoints[0] : null;
  const endPoint   = routeWaypoints.length > 1 ? routeWaypoints[routeWaypoints.length - 1] : null;

  // Detect reroute from delayReason / delayLabel
  const isRerouted = !!(vehicle.delayReason?.toLowerCase().includes('reroute') ||
    vehicle.delayReason?.toLowerCase().includes('detour') ||
    vehicle.delayLabel?.toLowerCase().includes('detour'));
  const rerouteText = vehicle.delayReason || vehicle.delayLabel || '';

  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(2, 6, 23, 0.80)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        animation: 'popoverFadeIn 0.18s ease',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        width: '100%',
        maxWidth: 860,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-elevated)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={18} color="var(--accent)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{vId}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{vType} · {vCargo}</div>
            </div>
            <Badge>{vehicle.priority}</Badge>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: '50%', display: 'flex', alignItems: 'center' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body — map left, details right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', flex: 1, minHeight: 0, overflow: 'hidden' }}>

          {/* Map */}
          <div style={{ position: 'relative', minHeight: 360 }}>
            <MapContainer
              center={vPos}
              zoom={9}
              zoomControl={true}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              <MapController focusTarget={focusedTarget} routeWaypoints={routeWaypoints} />

              {/* Vehicle route polyline */}
              {routeWaypoints.length > 1 && (
                <Polyline positions={routeWaypoints} color="var(--accent)" weight={4} opacity={0.75} dashArray="6 8" />
              )}

              {/* Start (Origin) marker */}
              {startPoint && (
                <Marker position={startPoint} icon={startIcon}>
                  <Popup>
                    <div style={{ padding: '4px 6px' }}>
                      <div style={{ fontWeight: 800, color: '#059669', fontSize: '0.82rem' }}>🟢 Start / Origin</div>
                      <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 600, marginTop: 2 }}>
                        {vehicle.source || 'Dispatch Location'}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Destination (End) marker */}
              {endPoint && (
                <Marker position={endPoint} icon={endIcon}>
                  <Popup>
                    <div style={{ padding: '4px 6px' }}>
                      <div style={{ fontWeight: 800, color: '#2563eb', fontSize: '0.82rem' }}>🔵 End Destination</div>
                      <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 600, marginTop: 2 }}>
                        {vehicle.destination || 'Delivery Station'}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Current vehicle position */}
              <Marker position={vPos} icon={vehicleIcon}>
                <Popup>
                  <div style={{ padding: '4px' }}>
                    <div style={{ fontWeight: 700 }}>{vId}</div>
                    <div style={{ fontSize: '0.78rem', color: '#555', marginTop: 2 }}>
                      {vehicle.status} · {vCargo}
                    </div>
                    {vehicle.speed !== undefined && (
                      <div style={{ fontSize: '0.75rem', marginTop: 3 }}>🏎 {vehicle.speed} km/h</div>
                    )}
                  </div>
                </Popup>
              </Marker>

              {/* Focused Risk Hazard Marker on Map */}
              {focusedTarget && (
                <Marker position={focusedTarget} icon={riskHazardIcon}>
                  <Popup autoPan={false}>
                    <div style={{ padding: '4px 6px' }}>
                      <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.85rem' }}>⚠️ High Risk Section</div>
                      <div style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 700, marginTop: 2 }}>
                        {focusedLabel}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 3 }}>
                        Identified hazard on corridor network
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>

            {/* Reset map focus button overlay */}
            {focusedTarget && (
              <button
                type="button"
                onClick={() => { setFocusedTarget(null); setFocusedLabel(''); }}
                style={{
                  position: 'absolute', top: 12, left: 52, zIndex: 1000,
                  padding: '6px 12px', borderRadius: 6,
                  background: '#0f172a', color: '#fff', border: 'none',
                  fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <RefreshCw size={12} /> Reset to Full Route
              </button>
            )}

            {/* Speed HUD overlay */}
            {vehicle.speed !== undefined && (
              <div style={{
                position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
                background: 'rgba(15,23,42,0.88)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <Navigation size={14} color="var(--accent)" />
                <span style={{ fontWeight: 700, fontSize: '1rem' }}>{vehicle.speed} km/h</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>current speed</span>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div style={{ overflowY: 'auto', padding: '18px 16px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Reroute banner — shown when vehicle is on a detour */}
            {isRerouted && (
              <div style={{
                padding: '9px 12px', borderRadius: 8,
                background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.4)',
                display: 'flex', alignItems: 'flex-start', gap: 7,
              }}>
                <AlertTriangle size={14} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ fontSize: '0.75rem', color: 'var(--warning)', lineHeight: 1.45 }}>
                  <strong>Rerouted</strong> — {rerouteText}
                </div>
              </div>
            )}

            {/* Status badge */}
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: `${statusColor}15`, border: `1px solid ${statusColor}40`, textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 3 }}>Current Status</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: statusColor }}>{vehicle.status}</div>
            </div>

            {/* Vehicle details */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Manifest</div>
              <DetailRow label="Driver"      value={vehicle.driver ?? 'N/A'} />
              <DetailRow label="Cargo"       value={vehicle.cargo} />
              {vehicle.source && <DetailRow label="Source" value={vehicle.source} />}
              <DetailRow label="Destination" value={vehicle.destination} />
              <DetailRow label="ETA"         value={vehicle.eta} highlight={vehicle.status === 'DELAYED' ? 'var(--warning)' : undefined} />
              {vehicle.speed !== undefined && (
                <DetailRow label="Speed" value={`${vehicle.speed} km/h`} highlight={vehicle.speed === 0 ? 'var(--warning)' : undefined} />
              )}
            </div>

            {/* Nearest route road risk */}
            {relatedRoad && (
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                  Route Segment Risk
                </div>
                <div style={{ padding: '10px 12px', borderRadius: '7px', background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>{relatedRoad.id}</span>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 8,
                      color: ROAD_BADGE_COLOR[relatedRoad.status] ?? 'var(--text-secondary)',
                      background: `${ROAD_BADGE_COLOR[relatedRoad.status] ?? '#888'}20`,
                      border: `1px solid ${ROAD_BADGE_COLOR[relatedRoad.status] ?? '#888'}`,
                    }}>
                      {relatedRoad.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>{relatedRoad.name}</div>
                  {relatedRoad.reason && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                      ⚠ {relatedRoad.reason}
                    </div>
                  )}
                  {/* Risk score bar */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${relatedRoad.riskScore}%`, background: ROAD_BADGE_COLOR[relatedRoad.status] ?? 'var(--accent)', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 3 }}>Risk score: {relatedRoad.riskScore}/100</div>
                  </div>

                  {/* Button to View on Map */}
                  <button
                    type="button"
                    onClick={() => {
                      const coords = ROAD_COORDS[relatedRoad.id];
                      if (coords) {
                        setFocusedTarget(coords);
                        setFocusedLabel(`${relatedRoad.id}: ${relatedRoad.name} (${relatedRoad.status})`);
                      }
                    }}
                    style={{
                      marginTop: 10,
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                      color: '#fff',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      boxShadow: '0 2px 8px rgba(14,165,233,0.35)',
                    }}
                  >
                    <MapPin size={13} /> View Risk on Map
                  </button>
                </div>
              </div>
            )}

            {/* Demo risky routes intelligence */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Risky Corridors
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {DEMO_RISKY_ROUTES.map(r => (
                  <div key={r.id} style={{
                    padding: '8px 10px',
                    borderRadius: 7,
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 6 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink)' }}>{r.id} · {r.name}</div>
                      <div style={{ fontSize: '0.68rem', color: ROAD_BADGE_COLOR[r.status] || 'var(--danger)', fontWeight: 600 }}>{r.status} ({r.riskScore}%)</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const coords = ROAD_COORDS[r.id];
                        if (coords) {
                          setFocusedTarget(coords);
                          setFocusedLabel(`${r.id}: ${r.name} (${r.status})`);
                        }
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: 5,
                        background: 'var(--sky-tint, #f0f9ff)',
                        border: '1px solid var(--sky, #0ea5e9)',
                        color: 'var(--sky-dark, #0284c7)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View on Map
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sensor panel */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Live Sensors</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { icon: <Thermometer size={14} color="var(--info)" />, label: 'Cargo Temp', value: '-4.2 °C' },
                  { icon: <ShieldAlert size={14} color="var(--warning)" />, label: 'Door Seal', value: 'Intact' },
                  { icon: <Clock size={14} color="var(--text-secondary)" />, label: 'Last Ping', value: '12s ago' },
                  { icon: <MapPin size={14} color="var(--accent)" />, label: 'GPS Acc.', value: '±3 m' },
                ].map(({ icon, label, value }) => (
                  <div key={label} style={{ padding: '8px 10px', background: 'var(--surface-elevated)', borderRadius: 7, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      {icon}
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{label}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
