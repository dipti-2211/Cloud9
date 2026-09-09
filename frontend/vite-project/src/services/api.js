import { vehicles, incidents, roads, deliveries, dashboardKPIs } from '../data/mockData';

const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Backend base URL — the Express server acts as an intermediary
// ---------------------------------------------------------------------------
const BACKEND_URL = 'http://localhost:1710';

// ---------------------------------------------------------------------------
// Mock API functions (unchanged — mock data still used for vehicles, incidents, etc.)
// ---------------------------------------------------------------------------
export const api = {
  getDashboardData: async () => {
    await delay();
    return dashboardKPIs;
  },

  getVehicles: async () => {
    await delay();
    return vehicles;
  },

  getIncidents: async () => {
    await delay();
    return incidents;
  },
  
  createIncident: async (incidentData) => {
    await delay(1200); 
    return { success: true, message: "Incident logged successfully." };
  },

  getRoads: async () => {
    await delay();
    return roads;
  },

  getDeliveries: async () => {
    await delay();
    return deliveries;
  },

  // Real alerts — fetches from MongoDB via Express backend
  getAlerts: async () => {
    const response = await fetch(`${BACKEND_URL}/api/alerts`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
};

// ---------------------------------------------------------------------------
// Real landslide risk API — hits the Express backend → Python risk-engine
// ---------------------------------------------------------------------------

/**
 * getLandslideRisk(lat, lon)
 *
 * Calls GET /api/landslide?lat=..&lon=.. on the Express backend, which proxies
 * to the Python risk-engine service.
 *
 * Returns the full prediction JSON:
 * { latitude, longitude, elevation, slope, aspect, dist_to_road, rainfall,
 *   prediction, risk_percentage, risk_category }
 *
 * @throws {Error} with a human-readable message on network or API errors.
 */
export const getLandslideRisk = async (lat, lon) => {
  const url = `${BACKEND_URL}/api/landslide?lat=${lat}&lon=${lon}`;

  const response = await fetch(url);

  if (!response.ok) {
    // Attempt to extract message from JSON error body (errorMiddleware format)
    const err = await response.json().catch(() => null);
    const message = err?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json();
};

// ---------------------------------------------------------------------------
// Batch route risk — hits POST /api/route-risk
// ---------------------------------------------------------------------------

/**
 * getRouteRisk(points)
 *
 * Points: [{ lat, lon }, ...]
 * Returns { results: [...] } where each entry mirrors /predict or is null (out-of-bounds).
 */
export const getRouteRisk = async (points) => {
  const response = await fetch(`${BACKEND_URL}/api/route-risk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    const message = err?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json();
};

// ---------------------------------------------------------------------------
// Geocoding — proxied through Express so User-Agent header can be set
// ---------------------------------------------------------------------------

/**
 * geocodePlace(q)
 *
 * Converts a place name string to { lat, lon, display_name } via Nominatim.
 * Proxy lives at GET /api/geocode?q=<query>
 */
export const geocodePlace = async (q) => {
  const response = await fetch(`${BACKEND_URL}/api/geocode?q=${encodeURIComponent(q)}`);

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    const message = err?.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }

  return response.json();
};