import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import toast from 'react-hot-toast';
import { vehicles as initialVehicles, incidents } from '../../data/mockData';
import { Badge } from '../common/Badge';
import { getLandslideRisk, vehiclesAPI } from '../../services/api';
import demoLocations from '../../data/demoLocations.json';

// ---------------------------------------------------------------------------
// Existing marker icons (unchanged)
// ---------------------------------------------------------------------------
const vehicleIcon  = L.divIcon({ className: 'vehicle-marker',  iconSize: [14, 14], iconAnchor: [7, 7] });
const incidentIcon = L.divIcon({ className: 'incident-marker', iconSize: [16, 16], iconAnchor: [8, 8] });

const userLocationIcon = L.divIcon({ className: 'user-location-marker', iconSize: [20, 20], iconAnchor: [10, 10] });

const demoPinHigh = L.divIcon({ className: 'demo-pin demo-pin-high', iconSize: [22, 22], iconAnchor: [11, 22] });
const demoPinLow  = L.divIcon({ className: 'demo-pin demo-pin-low',  iconSize: [22, 22], iconAnchor: [11, 22] });

// ---------------------------------------------------------------------------
// Risk marker icons — colour reflects risk category
// ---------------------------------------------------------------------------
const getRiskIcon = (category, isLoading = false) => {
  if (isLoading) {
    return L.divIcon({ className: 'risk-marker risk-marker-loading', iconSize: [18, 18], iconAnchor: [9, 9] });
  }
  const cls =
    category === 'Very Low' || category === 'Low'
      ? 'risk-marker-low'
      : category === 'Moderate'
      ? 'risk-marker-moderate'
      : 'risk-marker-high';
  return L.divIcon({ className: `risk-marker ${cls}`, iconSize: [18, 18], iconAnchor: [9, 9] });
};

const CATEGORY_COLOUR = {
  'Very Low': 'var(--success)',
  'Low':      'var(--success)',
  'Moderate': 'var(--warning)',
  'High':     'var(--danger)',
  'Very High':'var(--danger)',
};

// ---------------------------------------------------------------------------
// Inner component — must live inside <MapContainer>
// ---------------------------------------------------------------------------
const ClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => onMapClick(e.latlng),
  });
  return null;
};

const RecenterOnUser = ({ coords }) => {
  const map = useMap();
  const lat = coords?.lat;
  const lon = coords?.lon;
  useEffect(() => {
    if (lat != null && lon != null) {
      map.flyTo([lat, lon], 14, { animate: true, duration: 1.2 });
    }
  }, [lat, lon, map]);
  return null;
};

// ---------------------------------------------------------------------------
// Derive a [lat, lon] Leaflet position from a vehicle record.
//
// Coordinate-order contract (must match server.js tick):
//   DB: currentLocation.coordinates = [lon, lat]  (GeoJSON)
//   Leaflet: needs [lat, lon]                      (reverse of GeoJSON)
//   mockData: position = [lat, lon]                (already Leaflet order)
// ---------------------------------------------------------------------------
function vehicleLeafletPos(v) {
  // Backend vehicle: has currentLocation.coordinates = [lon, lat]
  if (v.currentLocation?.coordinates?.length === 2) {
    const [lon, lat] = v.currentLocation.coordinates;
    // Sanity: lat should be 22-28 for NER, lon 89-97
    if (lat >= 20 && lat <= 30 && lon >= 88 && lon <= 98) {
      return [lat, lon];
    }
  }
  // Mock vehicle (fallback): position = [lat, lon]
  if (v.position?.length === 2) return v.position;
  return null;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const MapPanel = ({ userCoords = null, activeRoute = null }) => {
  // Start from mock data; replace with live backend data when available
  const [liveVehicles, setLiveVehicles] = useState(initialVehicles);

  const [riskMarkers,   setRiskMarkers]   = useState([]);
  const [pendingMarker, setPendingMarker] = useState(null);

  // Poll backend for live vehicle positions every 5 s.
  // Falls back to mock data (already in state) if the call fails.
  useEffect(() => {
    let cancelled = false;

    const fetchVehicles = async () => {
      try {
        const data = await vehiclesAPI.getAll();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setLiveVehicles(data);
        }
      } catch {
        // Keep current state (mock or last successful fetch)
      }
    };

    fetchVehicles();
    const id = setInterval(fetchVehicles, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Handle a map click — fetch landslide risk at that point
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
      center={[25.3, 93.0]}
      zoom={9}
      zoomControl={false}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
        attribution="&copy; Stadia Maps &copy; OpenStreetMap contributors"
      />

      <RecenterOnUser coords={userCoords} />
      <ClickHandler onMapClick={handleMapClick} />

      {/* Vehicle route polylines */}
      {liveVehicles.filter(v => v.route || v.routeWaypoints).map(v => {
        // routeWaypoints from DB = [[lat,lon],...] — already Leaflet order
        const pts = v.routeWaypoints?.length > 1 ? v.routeWaypoints : v.route;
        if (!pts || pts.length < 2) return null;
        return (
          <Polyline
            key={`route-${v.id || v._id}`}
            positions={pts}
            color="var(--accent)"
            weight={3}
            opacity={0.6}
            dashArray="5, 10"
          />
        );
      })}

      {/* Active route from RoutePanel — orange, solid, thicker */}
      {activeRoute && activeRoute.length > 1 && (
        <Polyline
          positions={activeRoute}
          color="#f97316"
          weight={5}
          opacity={0.85}
        />
      )}

      {/* Live Vehicles — marker at interpolated position */}
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
                <div style={{
                  marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)',
                  fontStyle: 'italic', lineHeight: 1.4,
                }}>
                  📍 Simulated GPS — live hardware integration ready for real fleet hardware
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Incidents */}
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

      {/* "You are here" marker */}
      {userCoords && (
        <Marker position={[userCoords.lat, userCoords.lon]} icon={userLocationIcon}>
          <Popup>
            <div style={{ padding: '4px', fontWeight: 600 }}>📍 Your Location</div>
          </Popup>
        </Marker>
      )}

      {/* Permanent demo location markers — colour-coded by risk type */}
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
              <div style={{ marginTop: 6, fontSize: '0.7rem', color: '#888', fontStyle: 'italic' }}>
                Source: historical landslide survey data
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Pending (loading) risk marker */}
      {pendingMarker && (
        <Marker
          key={`pending-${pendingMarker.id}`}
          position={[pendingMarker.lat, pendingMarker.lon]}
          icon={getRiskIcon(null, true)}
        >
          <Popup>
            <div style={{ padding: '4px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Analysing risk…
            </div>
          </Popup>
        </Marker>
      )}

      {/* Resolved risk prediction markers */}
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
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: colour }}>
                    {marker.risk_category}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {marker.prediction === 1 ? '⚠ High risk' : '✓ Low risk'}
                  </span>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    Risk Score
                  </div>
                  <div style={{ height: '6px', background: 'var(--surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${marker.risk_percentage}%`,
                      background: colour,
                      borderRadius: '3px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginTop: '4px', color: colour }}>
                    {marker.risk_percentage.toFixed(1)}%
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem' }}>
                  <div>
                    <div style={{ color: 'var(--text-secondary)' }}>Elevation</div>
                    <div style={{ fontWeight: 600 }}>{marker.elevation.toFixed(0)} m</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)' }}>Slope</div>
                    <div style={{ fontWeight: 600 }}>{marker.slope.toFixed(1)}°</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)' }}>Rainfall</div>
                    <div style={{ fontWeight: 600 }}>
                      {marker.rainfall > 0 ? `${marker.rainfall.toFixed(1)} mm` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-secondary)' }}>Road Dist.</div>
                    <div style={{ fontWeight: 600 }}>
                      {marker.dist_to_road >= 1000
                        ? `${(marker.dist_to_road / 1000).toFixed(1)} km`
                        : `${marker.dist_to_road.toFixed(0)} m`}
                    </div>
                  </div>
                </div>

                {/* Rainfall source provenance badge */}
                {marker.rainfall_source && (
                  <div style={{
                    marginTop: '8px', fontSize: '0.68rem', color: 'var(--text-secondary)',
                    background: 'var(--surface-elevated)', borderRadius: 4, padding: '3px 7px',
                    display: 'inline-block',
                  }}>
                    🌧 {marker.rainfall_source === 'live' ? 'Live rainfall (Open-Meteo)' : 'Historical average'}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRiskMarkers(prev => prev.filter(m => m.id !== marker.id));
                  }}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '5px',
                    background: 'var(--surface-elevated)',
                    color: 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
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