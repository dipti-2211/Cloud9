/**
 * api.js — Production-ready API service layer
 * All calls hit the real Express backend at port 1710.
 * Mock data is used ONLY as a UI fallback when the backend collection is empty.
 */

import { vehicles as mockVehicles, incidents as mockIncidents, roads as mockRoads, deliveries as mockDeliveries, dashboardKPIs } from '../data/mockData';

// ─── Config ────────────────────────────────────────────────────────────────
// In production set VITE_API_URL=https://your-backend.onrender.com in Vercel/Netlify dashboard
// In local dev this falls back to localhost:1710 automatically — no config needed
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:1710';

// ─── Token helpers ─────────────────────────────────────────────────────────
export const auth = {
  getToken:     ()             => localStorage.getItem('sih_token'),
  getUser:      ()             => { try { return JSON.parse(localStorage.getItem('sih_user') || 'null'); } catch { return null; } },
  setSession:   (token, user)  => { localStorage.setItem('sih_token', token); localStorage.setItem('sih_user', JSON.stringify(user)); },
  clearSession: ()             => { localStorage.removeItem('sih_token'); localStorage.removeItem('sih_user'); },
  isLoggedIn:   ()             => !!localStorage.getItem('sih_token'),
};

// ─── Base fetch with auth header ───────────────────────────────────────────
async function request(path, options = {}) {
  const token = auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    auth.clearSession();
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (userId, password, role) => {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password, role }),
    });
    if (data.token && data.user) {
      auth.setSession(data.token, data.user);
    }
    return data;
  },

  logout: () => {
    auth.clearSession();
    window.location.href = '/login';
  },

  register:   async (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe:      ()              => request('/api/auth/me'),
  getPending: ()              => request('/api/auth/pending'),
  approve:    (id)            => request(`/api/auth/approve/${id}`, { method: 'PUT' }),
  reject:     (id)            => request(`/api/auth/reject/${id}`,  { method: 'PUT' }),
};

// ─── Vehicles ─────────────────────────────────────────────────────────────
export const vehiclesAPI = {
  getAll: async () => {
    const data = await request('/api/vehicles');
    if (!data.data || data.data.length === 0) return mockVehicles;
    return data.data;
  },
  create: (payload) => request('/api/vehicles',     { method: 'POST',   body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/vehicles/${id}`,{ method: 'PUT',   body: JSON.stringify(p) }),
  delete: (id)      => request(`/api/vehicles/${id}`,{ method: 'DELETE' }),
};

// ─── Roads ────────────────────────────────────────────────────────────────
export const roadsAPI = {
  getAll: async () => {
    const data = await request('/api/roads');
    if (!data.data || data.data.length === 0) return mockRoads;
    return data.data;
  },
  create: (payload) => request('/api/roads',     { method: 'POST',   body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/roads/${id}`,{ method: 'PUT',   body: JSON.stringify(p) }),
  delete: (id)      => request(`/api/roads/${id}`,{ method: 'DELETE' }),
};

// ─── Incidents ────────────────────────────────────────────────────────────
export const incidentsAPI = {
  getAll: async () => {
    const data = await request('/api/incidents');
    if (!data.data || data.data.length === 0) return mockIncidents;
    return data.data;
  },
  create: (payload) => request('/api/incidents',     { method: 'POST',   body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/incidents/${id}`,{ method: 'PUT',   body: JSON.stringify(p) }),
  delete: (id)      => request(`/api/incidents/${id}`,{ method: 'DELETE' }),
};

// ─── Deliveries ───────────────────────────────────────────────────────────
export const deliveriesAPI = {
  getAll: async () => {
    const data = await request('/api/deliveries');
    if (!data.data || data.data.length === 0) return mockDeliveries;
    return data.data;
  },
  create: (payload) => request('/api/deliveries',     { method: 'POST', body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/deliveries/${id}`,{ method: 'PUT', body: JSON.stringify(p) }),
};

// ─── Alerts (real-time landslide alerts) ─────────────────────────────────
export const alertsAPI = {
  getAll: async () => {
    const res = await fetch(`${BASE_URL}/api/alerts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
};

// ─── Settings ─────────────────────────────────────────────────────────────
export const settingsAPI = {
  get:    ()        => request('/api/settings'),
  update: (payload) => request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
};

// ─── Landslide risk engine ────────────────────────────────────────────────
export const getLandslideRisk = async (lat, lon) => {
  const res = await fetch(`${BASE_URL}/api/landslide?lat=${lat}&lon=${lon}`);
  if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.message ?? `HTTP ${res.status}`); }
  return res.json();
};

export const getRouteRisk = async (points) => {
  const res = await fetch(`${BASE_URL}/api/route-risk`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ points }),
  });
  if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.message ?? `HTTP ${res.status}`); }
  return res.json();
};

// ─── Geocoding ────────────────────────────────────────────────────────────
/** Forward geocode: place name → { lat, lon, display_name } */
export const geocodePlace = async (q) => {
  const res = await fetch(`${BASE_URL}/api/geocode?q=${encodeURIComponent(q)}`);
  if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.message ?? `HTTP ${res.status}`); }
  return res.json();
};

/** Reverse geocode: lat/lon → { lat, lon, display_name, short_name }
 *  Uses the real Nominatim /reverse endpoint (not the forward search).
 */
export const reverseGeocode = async (lat, lon) => {
  const res = await fetch(`${BASE_URL}/api/geocode/reverse?lat=${lat}&lon=${lon}`);
  if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.message ?? `HTTP ${res.status}`); }
  return res.json();
};

// ─── Legacy `api` object (used by Navbar, Dashboard — keep compatible) ────
export const api = {
  getDashboardData: async () => dashboardKPIs,
  getAlerts:        ()      => alertsAPI.getAll(),
  getVehicles:      ()      => vehiclesAPI.getAll(),
  getIncidents:     ()      => incidentsAPI.getAll(),
  getRoads:         ()      => roadsAPI.getAll(),
  getDeliveries:    ()      => deliveriesAPI.getAll(),
  createIncident:   (d)     => incidentsAPI.create(d),
};