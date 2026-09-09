/**
 * Alerts.jsx — Premium Bento Grid
 * Sky-blue / white theme. Risk colour used ONLY for accent badge + % text.
 * 4 distinct card layouts alternating across the grid.
 */
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';
import { useUserLocation } from '../hooks/useUserLocation';
import {
  AlertTriangle, BellRing, MapPin, Loader, X,
  Route, History, FileText, Activity, TrendingUp,
  ArrowRight, Clock, Wifi,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
};

// Risk accent — ONLY for badge + big number (cards stay white/sky)
const accent = (cat) => ({
  'Very High': { text: '#b91c1c', pill: '#fee2e2', pillBorder: '#fca5a5', bar: '#ef4444' },
  'High':      { text: '#c2410c', pill: '#ffedd5', pillBorder: '#fdba74', bar: '#f97316' },
  'Moderate':  { text: '#a16207', pill: '#fef9c3', pillBorder: '#fde047', bar: '#eab308' },
  'Low':       { text: '#15803d', pill: '#dcfce7', pillBorder: '#86efac', bar: '#22c55e' },
  'Very Low':  { text: '#166534', pill: '#dcfce7', pillBorder: '#86efac', bar: '#4ade80' },
}[cat] ?? { text: '#a16207', pill: '#fef9c3', pillBorder: '#fde047', bar: '#eab308' });

const srcInfo = (s) => ({
  'map-click':          { label: 'Map Click',    Icon: MapPin    },
  'route-check':        { label: 'Route Check',  Icon: Route     },
  'historical-record':  { label: 'Historical',   Icon: History   },
}[s] ?? { label: 'Filed Report', Icon: FileText });

const fmtTime = (iso) => new Date(iso).toLocaleString([], {
  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
});

// ─────────────────────────────────────────────
// Risk Pill
// ─────────────────────────────────────────────
const Pill = ({ cat }) => {
  const ac = accent(cat);
  return (
    <span style={{
      fontSize: '0.62rem', fontWeight: 800,
      padding: '3px 9px', borderRadius: 20,
      background: ac.pill, color: ac.text, border: `1px solid ${ac.pillBorder}`,
      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
    }}>{cat} Risk</span>
  );
};

// ─────────────────────────────────────────────
// Detail Modal
// ─────────────────────────────────────────────
const DetailModal = ({ alert, onClose }) => {
  if (!alert) return null;
  const ac = accent(alert.riskCategory);
  const { Icon: SrcIcon, label: srcLabel } = srcInfo(alert.source);
  const isML = ['map-click', 'route-check', 'historical-record'].includes(alert.source);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(20,38,59,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, animation: 'popoverFadeIn 0.2s ease',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--white)', borderRadius: 18,
        boxShadow: '0 32px 80px rgba(20,38,59,0.28)',
        maxWidth: 500, width: '100%', overflow: 'hidden',
      }} onClick={e => e.stopPropagation()}>

        {/* Blue gradient header */}
        <div style={{
          background: 'linear-gradient(135deg, var(--sky-dark) 0%, var(--sky) 100%)',
          padding: '22px 24px', color: '#fff', position: 'relative',
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
            width: 28, height: 28, cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}><X size={13} /></button>

          <div style={{ marginBottom: 8 }}>
            <Pill cat={alert.riskCategory} />
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, marginBottom: 4 }}>
            {alert.riskPercentage?.toFixed(1)}<span style={{ fontSize: '1.2rem' }}>%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', opacity: 0.85 }}>
            <SrcIcon size={12} /><span>{srcLabel}</span>
            <span>·</span><Clock size={11} /><span>{fmtTime(alert.createdAt)}</span>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          <p style={{ fontSize: '0.88rem', color: 'var(--ink)', lineHeight: 1.65, marginBottom: 18 }}>
            {alert.message}
          </p>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Risk %',    value: `${alert.riskPercentage?.toFixed(1)}%`, color: ac.text },
              { label: 'Latitude',  value: alert.latitude?.toFixed(5) },
              { label: 'Longitude', value: alert.longitude?.toFixed(5) },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: 'var(--sky-tint)', borderRadius: 10,
                padding: '10px 12px', border: '1px solid var(--sky-tint-2)',
              }}>
                <div style={{ fontSize: '0.58rem', color: 'var(--slate-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: color ?? 'var(--ink)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Incident-only: photo + casualties */}
          {!isML && (
            <>
              {alert.photoUrl && (
                <img src={alert.photoUrl} alt="Scene" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, marginBottom: 12, border: '1px solid var(--line)' }} />
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[{ label: 'Deaths', value: alert.deaths ?? '—' }, { label: 'Injuries', value: alert.injuries ?? '—' }].map(({ label, value }) => (
                  <div key={label} style={{ background: 'var(--sky-tint)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--sky-tint-2)' }}>
                    <div style={{ fontSize: '0.58rem', color: 'var(--slate-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--ink)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </>
          )}

          <button onClick={onClose} style={{
            width: '100%', padding: '11px',
            background: 'linear-gradient(135deg, var(--sky-dark) 0%, var(--sky) 100%)',
            color: '#fff', border: 'none', borderRadius: 10,
            fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Card A — Hero stat card
// Large %, animated bar, white bg with sky accent stripe at top
// ─────────────────────────────────────────────
const CardA = ({ alert, coords, isExample, onView }) => {
  const ac = accent(alert.riskCategory);
  const { Icon: SrcIcon, label } = srcInfo(alert.source);
  const isNear = coords && haversine(coords.lat, coords.lon, alert.latitude, alert.longitude) < 10;

  return (
    <div className="bc bc-a" onClick={() => onView(alert)}>
      {/* Sky top stripe */}
      <div style={{
        height: 4, marginBottom: 16,
        background: 'linear-gradient(90deg, var(--sky-dark), var(--sky))',
        marginLeft: -18, marginRight: -18, marginTop: -18, borderRadius: '13px 13px 0 0',
      }} />

      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Pill cat={alert.riskCategory} />
        <div style={{ fontSize: '0.64rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <SrcIcon size={10} />{label}
        </div>
      </div>

      {/* Giant % */}
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: '3.8rem', fontWeight: 900, color: ac.text, lineHeight: 1 }}>
          {alert.riskPercentage?.toFixed(0)}
        </span>
        <span style={{ fontSize: '1.3rem', fontWeight: 700, color: ac.text }}>%</span>
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--slate)', marginBottom: 16 }}>Landslide risk probability</div>

      {/* Animated bar */}
      <div style={{ height: 6, background: 'var(--sky-tint)', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min(alert.riskPercentage, 100)}%`, height: '100%',
          background: `linear-gradient(90deg, var(--sky), ${ac.bar})`,
          borderRadius: 4, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
        }} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div style={{ fontSize: '0.64rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 3 }}>
          <MapPin size={9} />{alert.latitude?.toFixed(3)}, {alert.longitude?.toFixed(3)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {isNear && <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', background: 'var(--sky-dark)', color: '#fff', borderRadius: 12 }}>📍 Near You</span>}
          {isExample && <span style={{ fontSize: '0.56rem', fontWeight: 700, padding: '1px 5px', background: 'var(--sky-tint)', color: 'var(--slate)', border: '1px solid var(--sky-tint-2)', borderRadius: 12 }}>DEMO</span>}
          <span style={{ fontSize: '0.6rem', color: 'var(--slate-soft)' }}>{fmtTime(alert.createdAt)}</span>
        </div>
      </div>
      <div className="bc-cta">View full details <ArrowRight size={11} /></div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Card B — Message spotlight card
// Large readable message, % and badge floating
// ─────────────────────────────────────────────
const CardB = ({ alert, coords, isExample, onView }) => {
  const ac = accent(alert.riskCategory);
  const { Icon: SrcIcon, label } = srcInfo(alert.source);
  const isNear = coords && haversine(coords.lat, coords.lon, alert.latitude, alert.longitude) < 10;

  return (
    <div className="bc bc-b" onClick={() => onView(alert)}>
      {/* Header: % + source */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <SrcIcon size={10} />{label}
          </div>
          <Pill cat={alert.riskCategory} />
        </div>
        {/* % circle */}
        <div style={{
          width: 58, height: 58, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--sky-tint) 0%, var(--sky-tint-2) 100%)',
          border: `2px solid ${ac.pillBorder}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, color: ac.text, lineHeight: 1 }}>
            {alert.riskPercentage?.toFixed(0)}
          </span>
          <span style={{ fontSize: '0.55rem', color: ac.text, fontWeight: 700 }}>%</span>
        </div>
      </div>

      {/* Message — prominent, sky-blue text */}
      <p style={{
        fontSize: '0.88rem', lineHeight: 1.6,
        color: 'var(--sky-dark)', fontWeight: 500,
        margin: '0 0 14px',
        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {alert.message}
      </p>

      {/* Bottom */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div style={{ fontSize: '0.63rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 3 }}>
          <MapPin size={9} />{alert.latitude?.toFixed(3)}, {alert.longitude?.toFixed(3)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {isNear && <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '2px 6px', background: 'var(--sky-dark)', color: '#fff', borderRadius: 12 }}>Near You</span>}
          {isExample && <span style={{ fontSize: '0.56rem', fontWeight: 700, padding: '1px 5px', background: 'var(--sky-tint)', color: 'var(--slate)', border: '1px solid var(--sky-tint-2)', borderRadius: 12 }}>DEMO</span>}
          <span style={{ fontSize: '0.6rem', color: 'var(--slate-soft)' }}>{fmtTime(alert.createdAt)}</span>
        </div>
      </div>
      <div className="bc-cta">View full details <ArrowRight size={11} /></div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Card C — Wide split card (spans 2 cols)
// Left: sky-blue panel with % | Right: message + coords
// ─────────────────────────────────────────────
const CardC = ({ alert, coords, isExample, onView, className = '' }) => {
  const ac = accent(alert.riskCategory);
  const { Icon: SrcIcon, label } = srcInfo(alert.source);
  const isNear = coords && haversine(coords.lat, coords.lon, alert.latitude, alert.longitude) < 10;

  return (
    <div className={`bc bc-c ${className}`} onClick={() => onView(alert)}>
      <div style={{ display: 'flex', gap: 0, height: '100%', borderRadius: 13, overflow: 'hidden' }}>
        {/* Left sky-blue panel */}
        <div style={{
          flex: '0 0 130px',
          background: 'linear-gradient(160deg, var(--sky-dark) 0%, var(--sky) 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '20px 12px', color: '#fff',
        }}>
          <div style={{ fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75, marginBottom: 6 }}>
            Landslide Risk
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, marginBottom: 2 }}>
            {alert.riskPercentage?.toFixed(0)}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.85 }}>%</div>
          <div style={{ marginTop: 10 }}>
            <span style={{
              fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px',
              background: 'rgba(255,255,255,0.2)', color: '#fff',
              borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{alert.riskCategory}</span>
          </div>
        </div>

        {/* Right white panel */}
        <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: '0.64rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <SrcIcon size={10} />{label}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {isNear && <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 6px', background: 'var(--sky-dark)', color: '#fff', borderRadius: 12 }}>📍 Near You</span>}
                {isExample && <span style={{ fontSize: '0.56rem', fontWeight: 700, padding: '1px 5px', background: 'var(--sky-tint)', color: 'var(--slate)', border: '1px solid var(--sky-tint-2)', borderRadius: 12 }}>DEMO</span>}
              </div>
            </div>
            {/* Message in sky-blue */}
            <p style={{
              fontSize: '0.83rem', lineHeight: 1.55, color: 'var(--sky-dark)', fontWeight: 500,
              margin: 0, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {alert.message}
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <div style={{ fontSize: '0.63rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={9} />{alert.latitude?.toFixed(3)}, {alert.longitude?.toFixed(3)}
            </div>
            <span style={{ fontSize: '0.6rem', color: 'var(--slate-soft)' }}>{fmtTime(alert.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="bc-cta" style={{ borderRadius: '0 0 13px 13px' }}>View full details <ArrowRight size={11} /></div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Card D — Compact activity card
// Short, wide, icon + info row
// ─────────────────────────────────────────────
const CardD = ({ alert, coords, isExample, onView }) => {
  const ac = accent(alert.riskCategory);
  const { Icon: SrcIcon, label } = srcInfo(alert.source);
  const isNear = coords && haversine(coords.lat, coords.lon, alert.latitude, alert.longitude) < 10;

  return (
    <div className="bc bc-d" onClick={() => onView(alert)}>
      {/* Row 1: icon circle + category + % */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--sky-tint) 0%, var(--sky-tint-2) 100%)',
          border: '2px solid var(--sky-tint-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Activity size={17} color="var(--sky-dark)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Pill cat={alert.riskCategory} />
            <div style={{ fontSize: '0.62rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <SrcIcon size={9} />{label}
            </div>
          </div>
          {/* Message in sky-blue */}
          <p style={{ fontSize: '0.76rem', color: 'var(--sky-dark)', fontWeight: 500, margin: 0, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {alert.message}
          </p>
        </div>
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: ac.text, lineHeight: 1 }}>
            {alert.riskPercentage?.toFixed(0)}
          </div>
          <div style={{ fontSize: '0.65rem', color: ac.text, fontWeight: 700 }}>%</div>
        </div>
      </div>

      {/* Row 2: coords + near + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '0.63rem', color: 'var(--slate)', display: 'flex', alignItems: 'center', gap: 3 }}>
          <MapPin size={9} />{alert.latitude?.toFixed(3)}, {alert.longitude?.toFixed(3)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {isNear && <span style={{ fontSize: '0.58rem', fontWeight: 700, padding: '1px 5px', background: 'var(--sky-dark)', color: '#fff', borderRadius: 12 }}>📍 Near</span>}
          {isExample && <span style={{ fontSize: '0.56rem', fontWeight: 700, padding: '1px 5px', background: 'var(--sky-tint)', color: 'var(--slate)', border: '1px solid var(--sky-tint-2)', borderRadius: 12 }}>DEMO</span>}
          <span style={{ fontSize: '0.6rem', color: 'var(--slate-soft)' }}>{fmtTime(alert.createdAt)}</span>
        </div>
      </div>
      <div className="bc-cta">View full details <ArrowRight size={11} /></div>
    </div>
  );
};

// ─────────────────────────────────────────────
// Bento layout pattern: A B C(wide) D D | repeat
// ─────────────────────────────────────────────
const PATTERNS = [
  { Component: CardA, wide: false },
  { Component: CardB, wide: false },
  { Component: CardC, wide: true  },  // spans 2 cols
  { Component: CardD, wide: false },
  { Component: CardD, wide: false },
];

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export const Alerts = () => {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [selected, setSelected] = useState(null);
  const seenIds = useRef(new Set());
  const { coords } = useUserLocation();

  const fetchAlerts = async (isInitial = false) => {
    try {
      const data = await api.getAlerts();
      if (!isInitial) {
        data.filter(a => !seenIds.current.has(a._id)).forEach(a => {
          const near = coords && haversine(coords.lat, coords.lon, a.latitude, a.longitude) < 10;
          if (near) {
            toast.error(`⚠ Near You! ${a.riskCategory} risk (${a.riskPercentage.toFixed(1)}%)`, {
              duration: 6000,
              style: { background: 'var(--danger-bg)', border: '2px solid var(--danger)', color: 'var(--ink)' },
            });
          } else {
            toast(`🔔 ${a.riskCategory} landslide risk detected`, { icon: '⚠', duration: 4000 });
          }
        });
      }
      data.forEach(a => seenIds.current.add(a._id));
      setAlerts(data); setError(null);
    } catch {
      if (isInitial) setError('Could not load alerts — is the backend running?');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts(true);
    const id = setInterval(() => fetchAlerts(false), 30000);
    return () => clearInterval(id);
  }, [coords]);

  if (loading) return (
    <div>
      <PageHeader title="Landslide Risk Alerts" description="Real-time alerts from map clicks and route checks." />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '32px 0', color: 'var(--slate)' }}>
        <Loader size={20} className="spin" /> Loading alerts…
      </div>
    </div>
  );

  const EXAMPLES = [
    { _id:'ex1', riskCategory:'Very High', source:'map-click',         riskPercentage:91.2, message:'Very High landslide risk (91.2%) at (25.1401, 92.8812). Terrain slope 42°, elevation 847m, 180m from nearest motorable road. Debris-flow risk elevated.',  latitude:25.1401, longitude:92.8812, createdAt:new Date(Date.now()-4*60000).toISOString() },
    { _id:'ex2', riskCategory:'High',      source:'route-check',       riskPercentage:78.4, message:'High risk (78.4%) near Maibong, Dima Hasao. Active debris-flow corridor crossing this route — heavy vehicles should avoid during rainfall.',                     latitude:25.3021, longitude:93.1247, createdAt:new Date(Date.now()-22*60000).toISOString() },
    { _id:'ex3', riskCategory:'Moderate',  source:'historical-record', riskPercentage:52.1, message:'Moderate risk (52.1%) at (25.2201, 93.0450) based on 10-year historical landslide frequency for this grid cell. Heightened vigilance advised during monsoon.', latitude:25.2201, longitude:93.0450, createdAt:new Date(Date.now()-3*3600000).toISOString() },
    { _id:'ex4', riskCategory:'Very High', source:'map-click',         riskPercentage:96.0, message:'Very High risk (96.0%) at (25.1101, 92.9988). Model confidence 0.96. Road completely unsafe — no vehicles should traverse this segment.',                       latitude:25.1101, longitude:92.9988, createdAt:new Date(Date.now()-60*60000).toISOString() },
    { _id:'ex5', riskCategory:'Low',       source:'route-check',       riskPercentage:18.3, message:'Low risk (18.3%) near Haflong. Terrain is stable; no significant landslide incidents recorded in the past 5 years at this grid point.',                          latitude:25.0812, longitude:93.0154, createdAt:new Date(Date.now()-2*3600000).toISOString() },
  ];

  const list      = alerts.length > 0 ? alerts : EXAMPLES;
  const isExample = alerts.length === 0;

  return (
    <>
      <style>{`
        /* ── Bento grid ── */
        .bento-alerts {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 960px) { .bento-alerts { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 560px) { .bento-alerts { grid-template-columns: 1fr; } }

        /* ── Base card ── */
        .bc {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 18px;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          transition: box-shadow 0.22s, transform 0.2s, border-color 0.2s;
          box-shadow: 0 1px 4px rgba(20,38,59,0.06), 0 0 0 0 rgba(44,143,209,0);
          display: flex;
          flex-direction: column;
        }
        .bc:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 36px rgba(44,143,209,0.18), 0 2px 8px rgba(20,38,59,0.08);
          border-color: var(--sky-tint-2);
        }

        /* Heights */
        .bc-a { min-height: 230px; }
        .bc-b { min-height: 230px; }
        .bc-c { min-height: 150px; padding: 0; }
        .bc-d { min-height: 130px; }

        /* Wide (C) spans 2 cols */
        .bc-c.bento-wide { grid-column: span 2; }
        @media (max-width: 960px) { .bc-c.bento-wide { grid-column: span 1; } }

        /* ── Hover CTA ── */
        .bc-cta {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(to top, var(--sky-tint) 55%, transparent 100%);
          padding: 14px 18px 10px;
          font-size: 0.72rem; font-weight: 700; color: var(--sky-dark);
          display: flex; align-items: center; justify-content: flex-end; gap: 4px;
          opacity: 0;
          transform: translateY(6px);
          transition: opacity 0.2s, transform 0.2s;
          pointer-events: none;
        }
        .bc:hover .bc-cta { opacity: 1; transform: translateY(0); }
      `}</style>

      <div>
        <PageHeader
          title="Landslide Risk Alerts"
          description="Real-time risk alerts from map clicks, route checks and field reports. Click any card for full details."
        />

        {error && (
          <div style={{ padding: '12px 16px', marginBottom: 16, background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 8, color: 'var(--danger)', fontSize: '0.88rem' }}>
            {error}
          </div>
        )}

        {isExample && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '9px 14px', background: 'var(--sky-tint)', border: '1px solid var(--sky-tint-2)', borderRadius: 8, fontSize: '0.79rem', color: 'var(--slate)' }}>
            <Wifi size={13} color="var(--sky)" />
            No real alerts yet — demo cards shown. They disappear once real risk events arrive.
          </div>
        )}

        <div className="bento-alerts">
          {list.map((a, i) => {
            const pat = PATTERNS[i % PATTERNS.length];
            const { Component, wide } = pat;
            return (
              <Component
                key={a._id}
                alert={a}
                coords={coords}
                isExample={isExample}
                onView={setSelected}
                className={wide ? 'bento-wide' : ''}
              />
            );
          })}
        </div>
      </div>

      <DetailModal alert={selected} onClose={() => setSelected(null)} />
    </>
  );
};