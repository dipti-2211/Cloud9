import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { dashboardKPIs, vehicles, roads, incidents } from '../data/mockData';
import { api } from '../services/api';
import { Badge } from '../components/common/Badge';
import { MapPanel } from '../components/map/MapPanel';
import { useUserLocation } from '../hooks/useUserLocation';
import { Truck, Clock, AlertTriangle, Activity, Bell, MapPin, RefreshCw, Navigation, CloudRain, Wind, Droplets, Thermometer, Eye } from 'lucide-react';
import demoLocations from '../data/demoLocations.json';
import { KpiPopover } from '../components/dashboard/KpiPopover';

const iconMap = {
  truck: Truck, clock: Clock, 'alert-triangle': AlertTriangle, activity: Activity, bell: Bell
};

// ---------------------------------------------------------------------------
// WMO weather code → label
// ---------------------------------------------------------------------------
const WMO_LABEL = {
  0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',
  45:'Foggy',48:'Rime fog',
  51:'Light drizzle',53:'Drizzle',55:'Heavy drizzle',
  61:'Light rain',63:'Rain',65:'Heavy rain',
  71:'Light snow',73:'Snow',75:'Heavy snow',
  80:'Light showers',81:'Showers',82:'Heavy showers',
  95:'Thunderstorm',96:'Thunderstorm w/ hail',99:'Heavy thunderstorm',
};

// ---------------------------------------------------------------------------
// WeatherWidget — live card with hover dropdown
// ---------------------------------------------------------------------------
const WeatherWidget = ({ coords }) => {
  const [wx, setWx]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen]       = useState(false);
  const ref                   = useRef(null);

  const lat = coords?.lat ?? 26.1445;
  const lon = coords?.lon ?? 91.7362;

  useEffect(() => {
    setLoading(true);
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,weathercode,windspeed_10m,uv_index,apparent_temperature` +
      `&hourly=precipitation_probability` +
      `&forecast_days=1` +
      `&timezone=Asia%2FKolkata`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        const c = data.current;
        const rainProb = Math.max(...(data.hourly?.precipitation_probability?.slice(0, 6) ?? [0]));
        setWx({
          temp:       Math.round(c.temperature_2m),
          feelsLike:  Math.round(c.apparent_temperature),
          humidity:   c.relative_humidity_2m,
          rainfall:   c.precipitation,
          rainChance: rainProb,
          wind:       Math.round(c.windspeed_10m),
          uv:         c.uv_index,
          label:      WMO_LABEL[c.weathercode] ?? 'Unknown',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lat, lon]);

  // Close on outside click
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const uvColor   = !wx ? '#888' : wx.uv <= 2 ? '#22c55e' : wx.uv <= 5 ? '#f59e0b' : wx.uv <= 7 ? '#f97316' : '#ef4444';
  const rainColor = !wx ? '#888' : wx.rainChance < 30 ? '#22c55e' : wx.rainChance < 60 ? '#f59e0b' : '#3b82f6';

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Collapsed card — click to toggle */}
      <div
        className="card"
        onClick={() => wx && setOpen(o => !o)}
        style={{
          cursor: wx ? 'pointer' : 'default',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          userSelect: 'none',
          borderBottom: open ? '1.5px solid #D6EAF9' : undefined,
          borderBottomLeftRadius: open ? 0 : undefined,
          borderBottomRightRadius: open ? 0 : undefined,
        }}
      >
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg,#1E6FA8,#2C8FD1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Thermometer size={20} color="#fff" />
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: '1.45rem', fontWeight: 700, color: '#14263B', lineHeight: 1 }}>
              {loading ? '—' : wx ? `${wx.temp}°C` : '—'}
            </span>
            {wx && (
              <span style={{ fontSize: '0.75rem', color: '#5C7288' }}>Feels {wx.feelsLike}°C</span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#5C7288', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {loading ? 'Loading weather…' : wx ? wx.label : 'Unavailable'}
          </div>
        </div>

        {/* Rain badge + chevron */}
        {wx && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#EAF4FC', borderRadius: 6, padding: '3px 8px' }}>
              <CloudRain size={12} color={rainColor} />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: rainColor }}>{wx.rainChance}%</span>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A6B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        )}
      </div>

      {/* Expanded detail panel */}
      {open && wx && (
        <div style={{
          background: '#fff',
          border: '1.5px solid #D6EAF9',
          borderTop: 'none',
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          padding: '12px 16px 14px',
          animation: 'fadeInDown .15s ease',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px 0' }}>
            {[
              { icon: <Droplets size={13} color="#2C8FD1" />, label: 'Humidity',    value: `${wx.humidity}%`,    color: '#14263B' },
              { icon: <Wind     size={13} color="#64748b" />, label: 'Wind',        value: `${wx.wind} km/h`,    color: '#14263B' },
              { icon: <Eye      size={13} color={uvColor}  />, label: 'UV Index',  value: `${wx.uv}`,            color: uvColor   },
              { icon: <CloudRain size={13} color={rainColor} />, label: 'Rain Chance', value: `${wx.rainChance}%`, color: rainColor },
              { icon: <Droplets size={13} color="#3b82f6"  />, label: 'Rainfall',  value: `${wx.rainfall} mm`,  color: '#14263B' },
              { icon: <Thermometer size={13} color="#f97316" />, label: 'Feels Like', value: `${wx.feelsLike}°C`, color: '#14263B' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                {icon}
                <div style={{ fontSize: '0.62rem', color: '#94A6B8', textAlign: 'center' }}>{label}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
          {wx.rainChance > 50 && (
            <div style={{ marginTop: 10, padding: '5px 10px', background: '#FEF2F2', borderRadius: 6,
              fontSize: '0.72rem', color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
              <CloudRain size={11} /> Rain likely today
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Risk category → CSS token
// ---------------------------------------------------------------------------
const RISK_COLOR = {
  'Very Low': 'var(--success)',
  'Low':      'var(--success)',
  'Moderate': 'var(--warning)',
  'High':     'var(--danger)',
  'Very High':'var(--danger)',
};

// ---------------------------------------------------------------------------
// Real demo locations — selected by the model from landslide_points.csv
// (generated by risk-engine/scripts/generate_demo_locations.py)
// ---------------------------------------------------------------------------
const DEMO_LOCATIONS = demoLocations.map(loc => ({
  label: `${loc.name} (${loc.riskCategory})`,
  lat: loc.lat,
  lon: loc.lon,
  riskCategory: loc.riskCategory,
  type: loc.type,
}));

// Show at most 2 buttons (1 risky + 1 safe) to keep the banner compact
const BANNER_DEMOS = [
  DEMO_LOCATIONS.find(d => d.type === 'risky'),
  DEMO_LOCATIONS.find(d => d.type === 'safe'),
].filter(Boolean);

// ---------------------------------------------------------------------------
// Location banner — appears above KPIs
// ---------------------------------------------------------------------------
const LocationBanner = ({ status, risk, requestLocation, setManualCoords }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (status === 'idle' || status === 'unsupported') {
    // Still show demo buttons even when idle
    return (
      <div className="location-banner location-banner-denied" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <MapPin size={14} />
        <span style={{ flex: 1 }}>Try a demo location inside the model's coverage area:</span>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {BANNER_DEMOS.map(loc => (
            <button
              key={loc.label}
              className="btn btn-secondary"
              onClick={() => setManualCoords(loc.lat, loc.lon)}
              style={{ padding: '3px 10px', fontSize: '0.75rem' }}
            >
              📍 {loc.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'requesting') {
    return (
      <div className="location-banner location-banner-loading">
        <MapPin size={14} />
        <span>Detecting your location and checking risk…</span>
        <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4 }} />
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="location-banner location-banner-denied" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <MapPin size={14} />
        <span>Location access denied.</span>
        <button className="btn btn-secondary" onClick={requestLocation} style={{ padding: '3px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <RefreshCw size={12} /> Retry
        </button>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Or try a demo location:</span>
        {BANNER_DEMOS.map(loc => (
          <button
            key={loc.label}
            className="btn btn-secondary"
            onClick={() => setManualCoords(loc.lat, loc.lon)}
            style={{ padding: '3px 10px', fontSize: '0.75rem' }}
          >
            📍 {loc.label}
          </button>
        ))}
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', marginLeft: 'auto' }}>✕</button>
      </div>
    );
  }

  // Fix #1 — outside_coverage gets its own clear message (never stuck on "Checking…")
  if (status === 'granted_no_coverage') {
    return (
      <div className="location-banner location-banner-denied" style={{ flexWrap: 'wrap', gap: '8px' }}>
        <MapPin size={14} />
        <span>
          <strong>Your location is outside the model's coverage area</strong> (North-Eastern India,
          ~Dima Hasao district). The risk engine cannot predict there.
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Try a demo instead:</span>
        {BANNER_DEMOS.map(loc => (
          <button
            key={loc.label}
            className="btn btn-secondary"
            onClick={() => setManualCoords(loc.lat, loc.lon)}
            style={{ padding: '3px 10px', fontSize: '0.75rem' }}
          >
            📍 {loc.label}
          </button>
        ))}
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', marginLeft: 'auto' }}>✕</button>
      </div>
    );
  }

  if (status === 'risk_error') {
    return (
      <div className="location-banner location-banner-denied">
        <MapPin size={14} />
        <span>Location found, but risk check failed — is the risk-engine running?</span>
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', marginLeft: 'auto' }}>✕</button>
      </div>
    );
  }

  if (status === 'granted') {
    const cat = risk?.risk_category ?? 'Checking…';
    const pct = risk?.risk_percentage;
    const color = RISK_COLOR[cat] ?? 'var(--text-secondary)';
    return (
      <div className="location-banner location-banner-granted" style={{ borderColor: color, flexWrap: 'wrap', gap: '8px' }}>
        <MapPin size={14} color={color} />
        <span>Your current location: </span>
        <span style={{ fontWeight: 700, color }}>{cat}</span>
        {pct != null && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({pct.toFixed(1)}%)</span>}
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Or try:{' '}
          {BANNER_DEMOS.map(loc => (
            <button
              key={loc.label}
              onClick={() => setManualCoords(loc.lat, loc.lon)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', padding: '0 4px' }}
            >
              {loc.label.split('(')[0].trim()}
            </button>
          ))}
        </span>
        <button onClick={() => setDismissed(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px' }}>✕</button>
      </div>
    );
  }

  return null;
};

// ---------------------------------------------------------------------------
// Dashboard page
// ---------------------------------------------------------------------------
export const Dashboard = () => {
  const { coords, risk, status, requestLocation, setManualCoords } = useUserLocation();
  const [liveAlerts, setLiveAlerts] = useState([]);

  // Trigger location request on mount
  useEffect(() => { requestLocation(); }, []);

  // Fix #5 — Load live alerts (30s polling) to drive the side panel + KPI count
  useEffect(() => {
    api.getAlerts().then(setLiveAlerts).catch(() => {});
    const id = setInterval(() => {
      api.getAlerts().then(setLiveAlerts).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Fix #5 — Build KPI strip with real alert count substituted in
  const kpiList = dashboardKPIs.map(kpi => {
    if (kpi.icon === 'bell') {
      return { ...kpi, value: String(liveAlerts.length), label: 'Risk Alerts (Real-time)' };
    }
    return kpi;
  });

  const sideAlerts = liveAlerts.length > 0
    ? liveAlerts.slice(0, 4).map(a => ({
        id: a._id,
        level: a.riskCategory === 'Very High' ? 'CRITICAL' : 'WARNING',
        message: a.message,
        time: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }))
    : [];

  // Pass coords to map whenever we have them — GPS is valid even if risk engine is down
  const mapCoords = coords;

  // ── Popover item builders ────────────────────────────────────────────────
  const SEVERITY_BADGE_COLOR = { CRITICAL: 'var(--danger)', WARNING: 'var(--warning)', INFO: 'var(--success)' };
  const ROAD_BADGE_COLOR     = { BLOCKED: 'var(--danger)', 'HIGH RISK': 'var(--danger)', CAUTION: 'var(--warning)', OPEN: 'var(--success)' };
  const STATUS_COLOR         = { 'IN TRANSIT': 'var(--success)', DELAYED: 'var(--warning)', 'RE-ROUTING': 'var(--danger)' };

  const kpiPopovers = {
    'Active Vehicles': {
      href: '/vehicles',
      items: vehicles.map(v => ({
        primary: v.id,
        secondary: `${v.cargo} → ${v.destination}`,
        badge: v.status,
        badgeColor: STATUS_COLOR[v.status],
      })),
    },
    'Vehicles Delayed': {
      href: '/vehicles',
      items: vehicles.filter(v => v.status === 'DELAYED' || v.status === 'RE-ROUTING').map(v => ({
        primary: v.id,
        secondary: `→ ${v.destination}  ·  ETA ${v.eta}`,
        badge: v.status,
        badgeColor: 'var(--warning)',
      })),
    },
    'Blocked Roads': {
      href: '/roads',
      items: roads.filter(r => r.status !== 'OPEN').map(r => ({
        primary: `${r.id} — ${r.name}`,
        secondary: r.reason ?? `Risk score ${r.riskScore}/100`,
        badge: r.status,
        badgeColor: ROAD_BADGE_COLOR[r.status],
      })),
    },
    'Active Incidents': {
      href: '/incidents',
      items: [...incidents]
        .sort((a, b) => ({ CRITICAL: 0, WARNING: 1, INFO: 2 }[a.severity] ?? 9) - ({ CRITICAL: 0, WARNING: 1, INFO: 2 }[b.severity] ?? 9))
        .filter(i => i.status === 'ACTIVE' || i.status === 'MONITORING')
        .map(i => ({
          primary: `${i.type} — ${i.location}`,
          secondary: `Reported ${i.time}`,
          badge: i.severity,
          badgeColor: SEVERITY_BADGE_COLOR[i.severity],
        })),
    },
  };

  return (
    <div className="dashboard-grid" style={{ alignItems: 'start' }}>
      {/* Location banner */}
      <div style={{ gridColumn: 'span 12' }}>
        <LocationBanner
          status={status}
          risk={risk}
          requestLocation={requestLocation}
          setManualCoords={setManualCoords}
        />
      </div>

      {/* KPIs — with hover popovers on the 4 relevant cards */}
      <div className="kpi-row">
        {kpiList.map((kpi, idx) => {
          const Icon = iconMap[kpi.icon];
          const popoverConfig = kpiPopovers[kpi.label];
          const card = (
            <div className="card kpi-card">
              <div className={`kpi-icon ${kpi.status}`}>
                <Icon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{kpi.value}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{kpi.label}</div>
              </div>
            </div>
          );
          return (
            <KpiPopover
              key={idx}
              items={popoverConfig?.items ?? []}
              viewAllHref={popoverConfig?.href}
              disabled={!popoverConfig}
            >
              {card}
            </KpiPopover>
          );
        })}
      </div>

      {/* Main Map Area */}
      <div className="card map-section" style={{ position: 'relative', padding: 0, overflow: 'hidden' }}>
        <MapPanel userCoords={mapCoords} />

        {/* "Plan a Route" CTA — top-right corner of the map */}
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 1000 }}>
          <Link
            to="/route-planner"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px',
              background: 'var(--white)',
              border: '1.5px solid var(--sky)',
              borderRadius: '8px',
              color: 'var(--sky-dark)',
              fontWeight: 700, fontSize: '0.85rem',
              textDecoration: 'none',
              boxShadow: '0 2px 10px rgba(44,143,209,0.2)',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--sky-tint)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; }}
          >
            <Navigation size={15} color="var(--sky)" />
            Plan a Route →
          </Link>
        </div>

        {/* Map legend */}
        <div className="map-legend" style={{ zIndex: 1000, position: 'absolute', bottom: '16px', left: '16px', background: 'var(--surface-elevated)', border: 'none' }}>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>Live Trackers</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--accent)', border: '2px solid #fff' }}></span> Active Vehicle
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--danger)', border: '2px solid #fff' }}></span> Critical Incident
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#3b82f6', border: '2px solid #fff', boxShadow: '0 0 6px #3b82f6' }}></span> Your Location
          </div>
        </div>
      </div>

      {/* Side Panels */}
      <div className="side-panel">
        {/* Weather Widget — above Risk Alerts */}
        <WeatherWidget coords={coords} />

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              {liveAlerts.length > 0 ? `Live Risk Alerts (${liveAlerts.length})` : 'Risk Alerts'}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sideAlerts.length > 0 ? sideAlerts.map(alert => (
              <div key={alert.id} style={{
                padding: '10px 12px',
                borderLeft: `3px solid ${alert.level === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)'}`,
                background: 'var(--white)',
                border: '1px solid var(--line)',
                borderLeft: `3px solid ${alert.level === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)'}`,
                borderRadius: '6px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: alert.level === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)' }}>{alert.level}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--slate)' }}>{alert.time}</span>
                </div>
                <div style={{ fontSize: '0.82rem', lineHeight: '1.4', color: 'var(--ink)' }}>{alert.message}</div>
              </div>
            )) : (
              <div style={{ color: 'var(--slate)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
                No alerts yet. Click the map in coverage area to check risk.
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ flex: 1 }}>
          <div className="card-header">
            <div className="card-title">Active Vehicles Summary</div>
          </div>
          <div className="table-container">
            <table>
              <tbody>
                {vehicles.slice(0, 3).map(v => (
                  <tr key={v.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{v.id}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{v.cargo}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Badge>{v.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};