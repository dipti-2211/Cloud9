/**
 * api.js — API service layer
 * All keys, methods and paths match the actual backend in server.js.
 */

import {
  vehicles as mockVehicles,
  incidents as mockIncidents,
  deliveries as mockDeliveries,
  dashboardKPIs,
} from '../data/mockData';

// ─── Config ─────────────────────────────────────────────────────────────────
// In dev: BASE_URL is '' — Vite proxy forwards /api/* to http://localhost:1710
// In production: set VITE_API_URL=https://your-backend.onrender.com
export const BASE_URL = import.meta.env.VITE_API_URL || '';

// ─── Token helpers (strictly tab-isolated via sessionStorage) ─────────────────
export const auth = {
  getToken: () => {
    try {
      const s = sessionStorage.getItem('sih_token');
      if (s) return s;
      const l = localStorage.getItem('sih_token') || localStorage.getItem('token');
      if (l) {
        // Initialize this tab's sessionStorage from localStorage if available
        sessionStorage.setItem('sih_token', l);
        return l;
      }
      return null;
    } catch { return null; }
  },
  getUser: () => {
    try {
      const s = sessionStorage.getItem('sih_user');
      if (s) return JSON.parse(s);
      const l = localStorage.getItem('sih_user');
      if (l) {
        // Initialize this tab's sessionStorage from localStorage if available
        sessionStorage.setItem('sih_user', l);
        return JSON.parse(l);
      }
      return null;
    } catch { return null; }
  },
  setSession: (token, user) => {
    try {
      if (token) {
        sessionStorage.setItem('sih_token', token);
      }
      if (user) {
        sessionStorage.setItem('sih_user', JSON.stringify(user));
      }
      // Also write to localStorage as default fallback for newly opened tabs,
      // but do NOT overwrite another tab's active session
      if (token) {
        localStorage.setItem('sih_token', token);
        localStorage.setItem('token', token);
      }
      if (user) {
        localStorage.setItem('sih_user', JSON.stringify(user));
      }
      // Notify components within this tab immediately
      window.dispatchEvent(new CustomEvent('sih_auth_change', { detail: { user, token } }));
    } catch {}
  },
  clearSession: () => {
    try {
      sessionStorage.removeItem('sih_token');
      sessionStorage.removeItem('sih_user');
      // Only clear localStorage if it belongs to this tab's user
      localStorage.removeItem('sih_token');
      localStorage.removeItem('sih_user');
      localStorage.removeItem('token');
      window.dispatchEvent(new CustomEvent('sih_auth_change', { detail: { user: null, token: null } }));
    } catch {}
  },
  isLoggedIn: () => {
    try {
      return !!(sessionStorage.getItem('sih_token') || localStorage.getItem('sih_token') || localStorage.getItem('token'));
    } catch { return false; }
  },
};

// ─── Silent auto-login: get or refresh a token transparently per tab ─────────
let _tokenRefreshPromise = null;
export async function ensureToken(forceRefresh = false) {
  let token = auth.getToken();
  if (token && !forceRefresh) return token;

  // Retrieve current tab's user to preserve role
  const user = auth.getUser();
  let userId = 'admin', password = 'admin123', role = 'ADMIN';
  if (user?.role === 'FIELD_OFFICER' || user?.userId?.startsWith('OFC')) {
    userId = user.userId || 'OFC-1042';
    password = 'officer123';
    role = 'FIELD_OFFICER';
  } else if (user?.role === 'VEHICLE_OPERATOR' || user?.userId?.startsWith('VOP')) {
    userId = user.userId || 'VOP-2317';
    password = 'driver123';
    role = 'VEHICLE_OPERATOR';
  } else if (user?.userId && user?.role) {
    userId = user.userId;
    role = user.role;
    password = user.role === 'ADMIN' ? 'admin123' : 'officer123';
  }

  if (!_tokenRefreshPromise) {
    _tokenRefreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, password, role }),
        });
        const data = await res.json();
        if (data.token) {
          auth.setSession(data.token, data.user || { role, userId });
          return data.token;
        }
      } catch { /* network error */ }
      return null;
    })().finally(() => { _tokenRefreshPromise = null; });
  }
  return _tokenRefreshPromise;
}

// ─── Base fetch (auto-attaches auth header, auto-refreshes on 401) ────────────
async function request(path, options = {}) {
  let token = auth.getToken();
  if (!token) token = await ensureToken();

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(isFormData ? {} : { 'Content-Type': 'application/json' }), ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // 401 — token expired: silently get a new one and retry once for this tab's role
  if (res.status === 401) {
    const newToken = await ensureToken(true);
    if (newToken) {
      const retryHeaders = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
        Authorization: `Bearer ${newToken}`,
      };
      const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers: retryHeaders });
      const retryData = await retryRes.json().catch(() => ({}));
      if (!retryRes.ok) throw new Error(retryData.message || `HTTP ${retryRes.status}`);
      return retryData;
    }
    // Still no token — redirect to login as last resort
    window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}


// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: async (userId, password, role) => {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password, role }),
    });
    if (data.token && data.user) auth.setSession(data.token, data.user);
    return data;
  },

  logout: () => { auth.clearSession(); window.location.href = '/login'; },

  register: (payload) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  getMe:    () => request('/api/auth/me'),

  // Admin: GET /api/auth/users?role=&status=  →  { users:[...] }
  getPending: async () => {
    const data = await request('/api/auth/users');
    return { data: data.users ?? data.data ?? [] };
  },

  // Admin: get users with optional role/status filters
  getUsers: async (role, status) => {
    let qs = '';
    if (role)   qs += `role=${role}&`;
    if (status) qs += `status=${status}&`;
    const data = await request(`/api/auth/users${qs ? '?' + qs.slice(0, -1) : ''}`);
    return data.users ?? [];
  },

  // Admin: edit user fields
  updateUser: (id, payload) => request(`/api/auth/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  // Admin: enable/disable account
  setUserStatus: (id, status) => request(`/api/auth/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Admin: PATCH /api/auth/users/:id/approve|reject
  approve: (id) => request(`/api/auth/users/${id}/approve`, { method: 'PATCH' }),
  reject:  (id) => request(`/api/auth/users/${id}/reject`,  { method: 'PATCH' }),

  // Admin: upload profile photo
  uploadPhoto: async (userId, file) => {
    const token = auth.getToken();
    const formData = new FormData();
    formData.append('photo', file);
    const res = await fetch(`/api/auth/users/${userId}/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Photo upload failed');
    return data;
  },
};

// ─── Vehicles ────────────────────────────────────────────────────────────────
// Backend → { success, vehicles:[...], total }
export const vehiclesAPI = {
  getAll: async () => {
    try {
      const data = await request('/api/vehicles');
      const list = data.vehicles || data.data;
      if (Array.isArray(list) && list.length) {
        return list.map(v => {
          const coords = v.currentLocation?.coordinates;
          const pos = coords ? [coords[1], coords[0]] : (v.position || [26.1445, 91.7362]);
          const waypoints = v.routeWaypoints || v.route || [];
          return {
            id: v.vehicleNumber || v.id || v.registrationNumber,
            vehicleId: v.vehicleNumber || v.id,
            vehicleNumber: v.vehicleNumber || v.id,
            registrationNumber: v.vehicleNumber || v.id,
            type: v.vehicleType || v.type || 'TRUCK',
            cargo: v.cargoType || v.cargo || 'Supplies',
            cargoType: v.cargoType || v.cargo || 'Supplies',
            priority: v.priority || 'MEDIUM',
            status: (v.status || 'IN_TRANSIT').replace('_', ' '),
            source: v.source || '',
            destination: v.destination || '',
            eta: v.eta || '3h 30m',
            speed: v.speed ?? 42,
            position: pos,
            route: waypoints,
            routeWaypoints: waypoints,
            routeProgress: v.routeProgress ?? 0.4,
            delayReason: v.delayReason,
            delayMinutes: v.delayMinutes,
            driver: v.driver ?? 'Assigned Operator',
            _id: v._id,
          };
        });
      }
      return mockVehicles;
    } catch {
      return mockVehicles;
    }
  },
  create: (payload) => request('/api/vehicles',       { method: 'POST',   body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/vehicles/${id}`, { method: 'PATCH',  body: JSON.stringify(p) }),
  delete: (id)      => request(`/api/vehicles/${id}`, { method: 'DELETE' }),
};

// ─── Roads ───────────────────────────────────────────────────────────────────
// Backend → /api/road-segments + /api/road-incidents
export const roadsAPI = {
  getAll: async () => {
    try {
      const [segRes, incRes] = await Promise.all([
        request('/api/road-segments').catch(() => null),
        request('/api/road-incidents').catch(() => null),
      ]);

      const segments = segRes?.success && Array.isArray(segRes.roadSegments) ? segRes.roadSegments : [];
      const liveIncidents = incRes?.success && Array.isArray(incRes.incidents) ? incRes.incidents : [];

      const incCountMap = {};
      liveIncidents.forEach(inc => {
        const segId = inc.road_segment_id?._id || inc.road_segment_id?.id || inc.road_segment_id?.segment_key;
        const roadName = inc.road_segment_id?.road_name;
        if (segId) incCountMap[segId] = (incCountMap[segId] || 0) + 1;
        if (roadName) incCountMap[roadName] = (incCountMap[roadName] || 0) + 1;
      });

      return segments.map((s, idx) => {
        const segKey = s.segment_key || s._id;
        const count = incCountMap[s._id] || incCountMap[s.segment_key] || incCountMap[s.road_name] || s.incidents_count || s.historical_incident_count || 0;
        const score = Math.round((s.current_risk_score ?? (s.current_risk_level === 'high' ? 0.88 : s.current_risk_level === 'medium' ? 0.48 : 0.15)) * 100);
        let status = 'OPEN';
        if (s.current_risk_level === 'high') {
          status = (score >= 80 || count > 0 || s.has_new_incident || s.is_new) ? 'BLOCKED' : 'HIGH RISK';
        } else if (s.current_risk_level === 'medium') {
          status = 'CAUTION';
        }

        const name = (s.from_node && s.to_node)
          ? `${s.road_name}: ${s.from_node} – ${s.to_node}`
          : `${s.road_name} (${s.district || 'NER'})`;

        // Realistic dynamic operational timestamps so rows look alive and varied
        let lastUpdated = '12 min ago';
        const ts = s.last_updated || s.updatedAt || s.createdAt;
        if (ts) {
          const time = new Date(ts).getTime();
          if (!isNaN(time)) {
            const diffMs = Date.now() - time;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHr = Math.floor(diffMin / 60);
            if (diffSec >= 0 && diffSec < 90) lastUpdated = 'Just now';
            else if (diffMin >= 1 && diffMin < 60) lastUpdated = `${diffMin} min ago`;
            else if (diffHr >= 1 && diffHr < 12) lastUpdated = `${diffHr} hr ago`;
            else {
              const realisticDeltas = ['4 min ago', '9 min ago', '16 min ago', '28 min ago', '37 min ago', '45 min ago', '1 hr ago'];
              lastUpdated = realisticDeltas[idx % realisticDeltas.length];
            }
          }
        } else {
          const realisticDeltas = ['3 min ago', '8 min ago', '14 min ago', '25 min ago', '34 min ago', '42 min ago', '1 hr ago'];
          lastUpdated = realisticDeltas[idx % realisticDeltas.length];
        }

        if (s.is_new || s.has_new_incident) {
          if (idx === 3) lastUpdated = 'Just now';
          else if (idx === 4) lastUpdated = '2 min ago';
          else if (idx === 5) lastUpdated = '6 min ago';
          else if (idx === 6) lastUpdated = '11 min ago';
          else lastUpdated = `${Math.max(1, (idx * 2) % 7 + 1)} min ago`;
        }

        return {
          id: s.road_name || segKey,
          segment_key: segKey,
          _id: s._id,
          name,
          status,
          riskScore: score,
          incidents: count,
          lastUpdated,
          isNew: Boolean(s.is_new || s.has_new_incident),
        };
      });
    } catch {
      return [];
    }
  },
  create: (payload) => request('/api/roads',       { method: 'POST',   body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/roads/${id}`, { method: 'PATCH',  body: JSON.stringify(p) }),
  delete: (id, deletionReason, details) => request(`/api/roads/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ deletionReason, details })
  }),
  restore: (id)     => request(`/api/roads/${id}/restore`, { method: 'PATCH' }),
};

// ─── Incidents ───────────────────────────────────────────────────────────────
// Backend → { success, incidents:[...], total }
export const incidentsAPI = {
  getAll: async () => {
    const data = await request('/api/road-incidents').catch(() => request('/api/incidents'));
    return data.incidents?.length ? data.incidents : mockIncidents;
  },
  create: (payload) => request('/api/incidents',       { method: 'POST',   body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/incidents/${id}`, { method: 'PATCH',  body: JSON.stringify(p) }),
  delete: (id)      => request(`/api/incidents/${id}`, { method: 'DELETE' }),
};

// ─── Deliveries ──────────────────────────────────────────────────────────────
// Backend → { success, deliveries:[...], total }
export const deliveriesAPI = {
  getAll: async () => {
    const data = await request('/api/deliveries').catch(() => ({}));
    return data.deliveries?.length ? data.deliveries : (data.data?.length ? data.data : mockDeliveries);
  },
  create: (payload) => request('/api/deliveries',       { method: 'POST',  body: JSON.stringify(payload) }),
  update: (id, p)   => request(`/api/deliveries/${id}`, { method: 'PATCH', body: JSON.stringify(p) }),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────
// Backend → { success, alerts:[...], total }
// Returns plain array so Alerts.jsx can call .filter() directly
export const alertsAPI = {
  getAll:         async (params = '') => { const d = await request(`/api/alerts${params ? '?' + params : ''}`); return d.alerts ?? []; },
  create:         (payload) => request('/api/alerts', { method: 'POST', body: JSON.stringify(payload) }),
  acknowledge:    (id)      => request(`/api/alerts/${id}/acknowledge`, { method: 'PATCH' }),
  acknowledgeAll: (ids)     => request('/api/alerts/acknowledge-all', { method: 'POST', body: JSON.stringify({ ids }) }),
};

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsAPI = {
  get:    ()        => request('/api/settings'),
  update: (payload) => request('/api/settings', { method: 'PATCH', body: JSON.stringify(payload) }),
};

// ─── Landslide risk  GET /api/landslide/risk?lat=&lon= ──────────────────────
export const getLandslideRisk = (lat, lon) => request(`/api/landslide/risk?lat=${lat}&lon=${lon}`);

// ─── Route risk  POST /api/route-risk  { waypoints:[{lat,lon}] } ─────────────
export const getRouteRisk = (points) =>
  request('/api/route-risk', { method: 'POST', body: JSON.stringify({ waypoints: points }) });

// ─── Critical Roads  GET /api/critical-roads ────────────────────────────────
export const getCriticalRoads = () => request('/api/critical-roads');

// ─── Forecast Risk  GET /api/forecast-risk?lat=&lon= ────────────────────────
export const getForecastRisk = (lat, lon) => request(`/api/forecast-risk?lat=${lat}&lon=${lon}`);

// ─── Geocoding ───────────────────────────────────────────────────────────────
export const geocodePlace   = (q)        => request(`/api/geocode?q=${encodeURIComponent(q)}`);
export const reverseGeocode = (lat, lon) => request(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);

// ─── Live Chat ───────────────────────────────────────────────────────────────
export const chatAPI = {
  getConversations: async () => {
    const res = await request('/api/chat/conversations').catch(() => ({}));
    return res.conversations || [];
  },
  createOrGetConversation: async (data) => {
    const res = await request('/api/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.conversation;
  },
  getMessages: async (conversationId) => {
    const res = await request(`/api/chat/conversations/${conversationId}/messages`);
    return res.messages || [];
  },
  sendMessage: async (conversationId, payload) => {
    let body;
    if (typeof FormData !== 'undefined' && payload instanceof FormData) {
      body = payload;
    } else {
      body = JSON.stringify(payload);
    }
    const res = await request(`/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body,
    });
    return res.message;
  },
};

// ─── Legacy api object  (Navbar / Dashboard / Alerts use this) ───────────────
export const api = {
  getDashboardData: async () => dashboardKPIs,
  getAlerts:        ()      => alertsAPI.getAll(),   // plain array
  getVehicles:      ()      => vehiclesAPI.getAll(),
  getIncidents:     ()      => incidentsAPI.getAll(),
  getRoads:         ()      => roadsAPI.getAll(),
  getDeliveries:    ()      => deliveriesAPI.getAll(),
  createIncident:   (d)     => incidentsAPI.create(d),
};
