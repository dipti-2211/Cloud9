import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Navigation, ShieldAlert, Truck, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Badge } from '../common/Badge';
import { NER_ROAD_SEGMENTS } from '../map/RiskPolyline';

// Start (origin) marker — emerald teardrop
const startIcon = L.divIcon({
  className: '',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  html: `<div style="
    width: 32px; height: 42px; position: relative;
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

// Destination (end) marker — blue teardrop
const endIcon = L.divIcon({
  className: '',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  html: `<div style="
    width: 32px; height: 42px; position: relative;
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

// Blue Dot vehicle icon with radar ring
const blueDotTruckIcon = (label = '') => L.divIcon({
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  html: `<div style="
    position: relative;
    width: 36px; height: 36px;
    display: flex; align-items: center; justify-content: center;
  ">
    <div style="
      position: absolute;
      width: 34px; height: 34px;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.35);
      animation: pulse-danger 1.8s infinite;
    "></div>
    <div style="
      width: 22px; height: 22px;
      border-radius: 50%;
      background: #2563eb;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 11px;
    ">🚚</div>
    ${label ? `<div style="
      position: absolute; bottom: -16px; white-space: nowrap;
      background: #1e293b; color: #fff; font-size: 10px; font-weight: 700;
      padding: 1px 6px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    ">${label}</div>` : ''}
  </div>`,
});

// Risk styles for NER road corridors
const RISK_STYLE = {
  high:   { color: '#ef4444', weight: 5, opacity: 0.85 },
  medium: { color: '#f59e0b', weight: 4, opacity: 0.8 },
  low:    { color: '#22c55e', weight: 3, opacity: 0.65 },
};

// MapController to fit bounds or center
const MapController = ({ center, bounds }) => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else if (center) {
      map.setView(center, 9);
    }
  }, [center, bounds, map]);
  return null;
};

export const VehicleMapModal = ({ vehicle, onClose }) => {
  if (!vehicle) return null;

  const vId = vehicle.id || vehicle.vehicleId || vehicle.vehicleNumber || 'TRUCK';
  const vPos = Array.isArray(vehicle.position) ? vehicle.position : [26.1445, 91.7362];
  const isRerouted = vehicle.status === 'REROUTED' || Boolean(vehicle.reroutedRoute);

  const originalRoute = vehicle.originalRoute || [];
  const reroutedRoute = vehicle.reroutedRoute || [];
  const standardRoute = vehicle.routeWaypoints || vehicle.route || [];

  // Determine origin & destination points
  let startPoint = null;
  let endPoint = null;

  if (reroutedRoute.length > 1) {
    startPoint = reroutedRoute[0];
    endPoint = reroutedRoute[reroutedRoute.length - 1];
  } else if (originalRoute.length > 1) {
    startPoint = originalRoute[0];
    endPoint = originalRoute[originalRoute.length - 1];
  } else if (standardRoute.length > 1) {
    startPoint = standardRoute[0];
    endPoint = standardRoute[standardRoute.length - 1];
  }

  // Calculate bounding box for all relevant coordinates
  const allCoords = [
    vPos,
    ...(originalRoute || []),
    ...(reroutedRoute || []),
    ...(standardRoute || []),
  ].filter(c => Array.isArray(c) && c.length === 2 && !isNaN(c[0]) && !isNaN(c[1]));

  const bounds = allCoords.length > 1 ? L.latLngBounds(allCoords) : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        width: '94vw', height: '90vh', maxWidth: 1400,
        background: 'var(--surface, #ffffff)', borderRadius: 14,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid var(--line, #e2e8f0)',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--surface-header, #f8fafc)',
          borderBottom: '1px solid var(--line, #e2e8f0)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: '#2563eb', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
            }}>
              <Truck size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--ink, #0f172a)' }}>
                  {vId}
                </span>
                <span style={{
                  padding: '2px 8px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 700,
                  background: isRerouted ? '#fef3c7' : '#dcfce7',
                  color: isRerouted ? '#b45309' : '#15803d',
                  border: `1px solid ${isRerouted ? '#f59e0b' : '#22c55e'}`,
                }}>
                  {vehicle.status || 'IN TRANSIT'}
                </span>
                <Badge>{vehicle.priority || 'NORMAL'}</Badge>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', marginTop: 2 }}>
                {vehicle.cargo || vehicle.cargoType || 'Cargo'} · Driver: <strong>{vehicle.driver || 'Assigned Driver'}</strong> · Speed: {vehicle.speed ?? 40} km/h
              </div>
            </div>
          </div>

          {/* Quick Route Summary */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#f1f5f9', padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem',
            }}>
              <span style={{ color: '#059669', fontWeight: 700 }}>{vehicle.source || 'Origin'}</span>
              <ArrowRight size={14} color="#64748b" />
              <span style={{ color: '#2563eb', fontWeight: 700 }}>{vehicle.destination || 'Destination'}</span>
              <span style={{ color: '#64748b', marginLeft: 8, borderLeft: '1px solid #cbd5e1', paddingLeft: 8 }}>
                ETA: <strong>{vehicle.eta || 'Calculating…'}</strong>
              </span>
            </div>

            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '50%',
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#475569', transition: 'all 0.15s',
              }}
              title="Close Map"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Detour Alert Banner if Rerouted */}
        {isRerouted && (
          <div style={{
            background: 'linear-gradient(90deg, #fef2f2, #fffbeb)',
            borderBottom: '1px solid #fecaca',
            padding: '10px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={18} color="#dc2626" />
              <div>
                <strong style={{ color: '#dc2626', fontSize: '0.85rem' }}>
                  Critical Road Obstruction Detected:
                </strong>{' '}
                <span style={{ color: '#7f1d1d', fontSize: '0.85rem' }}>
                  {vehicle.criticalRoad || 'High landslide risk zone on original route.'}
                </span>
                <div style={{ color: '#047857', fontSize: '0.8rem', marginTop: 2, fontWeight: 600 }}>
                  ✓ Safe Detour Applied: {vehicle.rerouteReason || 'Vehicle dynamically rerouted via safe corridor.'}
                </div>
              </div>
            </div>
            <div style={{
              background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: 6,
              fontSize: '0.78rem', fontWeight: 700, border: '1px solid #f87171',
            }}>
              +{vehicle.delayMinutes || 45}m Detour Delay
            </div>
          </div>
        )}

        {/* Map Body with Floating Legend */}
        <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
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

            <MapController center={vPos} bounds={bounds} />

            {/* 1. All NER Road Segments with Live Risk */}
            {NER_ROAD_SEGMENTS.map(seg => {
              const style = RISK_STYLE[seg.risk_level] || RISK_STYLE.medium;
              return (
                <Polyline
                  key={seg.id}
                  positions={seg.path}
                  pathOptions={style}
                >
                  <Tooltip sticky>
                    <strong>{seg.road_name}</strong> ({seg.risk_level.toUpperCase()})<br />
                    {seg.from_node} ➜ {seg.to_node} ({seg.length_km} km)<br />
                    {seg.reason}
                  </Tooltip>
                </Polyline>
              );
            })}

            {/* 2. Original Route (RED if rerouted) */}
            {originalRoute.length > 1 && (
              <Polyline
                positions={originalRoute}
                pathOptions={{
                  color: '#ef4444',
                  weight: 5,
                  opacity: 0.85,
                  dashArray: '8, 8',
                }}
              >
                <Tooltip sticky>
                  <strong style={{ color: '#dc2626' }}>⛔ Blocked / Critical Section (Original Route)</strong>
                  <br />{vehicle.criticalRoad || 'High hazard road section bypassed'}
                </Tooltip>
              </Polyline>
            )}

            {/* 3. Rerouted Route (GREEN safe corridor) */}
            {reroutedRoute.length > 1 && (
              <Polyline
                positions={reroutedRoute}
                pathOptions={{
                  color: '#10b981',
                  weight: 6,
                  opacity: 0.95,
                }}
              >
                <Tooltip sticky>
                  <strong style={{ color: '#059669' }}>🟢 Active Rerouted Safe Detour</strong>
                  <br />{vehicle.rerouteReason || 'Safe alternative corridor'}
                </Tooltip>
              </Polyline>
            )}

            {/* 4. Normal Vehicle Route (if not a rerouted demo) */}
            {!isRerouted && standardRoute.length > 1 && (
              <Polyline
                positions={standardRoute}
                pathOptions={{
                  color: '#2563eb',
                  weight: 5,
                  opacity: 0.85,
                  dashArray: '4, 6',
                }}
              />
            )}

            {/* 5. Origin Marker */}
            {startPoint && (
              <Marker position={startPoint} icon={startIcon}>
                <Popup>
                  <strong>🟢 Origin / Start Point</strong><br />
                  {vehicle.source || 'Dispatch Center'}
                </Popup>
              </Marker>
            )}

            {/* 6. Destination Marker */}
            {endPoint && (
              <Marker position={endPoint} icon={endIcon}>
                <Popup>
                  <strong>🔵 Destination</strong><br />
                  {vehicle.destination || 'Delivery Station'}
                </Popup>
              </Marker>
            )}

            {/* 7. Current Vehicle Live Marker (Blue Dot) */}
            <Marker position={vPos} icon={blueDotTruckIcon(vId)}>
              <Popup>
                <div style={{ padding: '4px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>{vId}</div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 2 }}>
                    <strong>Driver:</strong> {vehicle.driver || 'Assigned'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    <strong>Cargo:</strong> {vehicle.cargo || vehicle.cargoType}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    <strong>Speed:</strong> {vehicle.speed ?? 40} km/h
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    <strong>Status:</strong> {vehicle.status}
                  </div>
                  {isRerouted && (
                    <div style={{
                      marginTop: 6, padding: '4px 6px', background: '#fee2e2',
                      borderRadius: 4, color: '#b91c1c', fontSize: '0.74rem', fontWeight: 600,
                    }}>
                      ⚠️ Detour: {vehicle.rerouteReason}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Floating Map Legend Card */}
          <div style={{
            position: 'absolute', bottom: 18, left: 18, zIndex: 1000,
            background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(6px)',
            borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(0,0,0,0.1)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontSize: '0.78rem',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 2 }}>Map Legend</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }}></span>
              <span>Vehicle Live Position (Blue Dot)</span>
            </div>
            {isRerouted && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 22, height: 4, background: '#ef4444', display: 'inline-block', borderRadius: 2 }}></span>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>Original Blocked Path (Critical Road)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 22, height: 4, background: '#10b981', display: 'inline-block', borderRadius: 2 }}></span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>Safe Detour Corridor (Rerouted)</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 4, background: '#ef4444', opacity: 0.6, display: 'inline-block', borderRadius: 2 }}></span>
              <span>NER High Risk Road Segments</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 22, height: 4, background: '#22c55e', opacity: 0.6, display: 'inline-block', borderRadius: 2 }}></span>
              <span>NER Clear / Low Risk Corridors</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
