import { Bell, User, Activity, LogOut, AlertTriangle, BellRing, X, MapPin, Route, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { api, auth, authAPI } from '../../services/api';

// ── Notification dropdown ─────────────────────────────────────────────────
const NotificationPanel = ({ onClose }) => {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAlerts()
      .then(data => { setAlerts(data.slice(0, 8)); setLoading(false); })
      .catch(() => { setAlerts([]); setLoading(false); });
  }, []);

  const RISK_COLOR = {
    'Very High': 'var(--danger)',   'High':     'var(--danger)',
    'Moderate':  'var(--warning)',  'Low':      'var(--success)',
    'Very Low':  'var(--success)',
  };

  return (
    <div style={{
      position:'absolute', top:'calc(100% + 10px)', right:0,
      width:340, maxHeight:440,
      background:'var(--white)', border:'1px solid var(--line)',
      borderRadius:12, boxShadow:'0 8px 32px rgba(20,38,59,.14)',
      zIndex:9999, display:'flex', flexDirection:'column', overflow:'hidden',
      animation:'popoverFadeIn .15s ease',
    }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 16px', borderBottom:'1px solid var(--line)', background:'var(--sky-tint)',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <Bell size={15} color="var(--sky-dark)" />
          <span style={{ fontWeight:700, fontSize:'0.88rem', color:'var(--ink)' }}>Risk Alerts</span>
          {alerts.length > 0 && (
            <span style={{ fontSize:'0.68rem', fontWeight:700, background:'var(--danger)', color:'#fff', borderRadius:10, padding:'1px 7px' }}>
              {alerts.length}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--slate)', display:'flex' }}>
          <X size={15} />
        </button>
      </div>

      <div style={{ overflowY:'auto', flex:1 }}>
        {loading ? (
          <div style={{ padding:'24px', textAlign:'center', color:'var(--slate)', fontSize:'0.85rem' }}>Loading…</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding:'28px 16px', textAlign:'center', color:'var(--slate)' }}>
            <BellRing size={28} style={{ marginBottom:8, opacity:.4 }} />
            <div style={{ fontSize:'0.85rem', fontWeight:600, marginBottom:4 }}>No alerts yet</div>
            <div style={{ fontSize:'0.78rem' }}>Click the map or run a route to generate risk alerts.</div>
          </div>
        ) : (
          alerts.map((a, i) => {
            const color = RISK_COLOR[a.riskCategory] ?? 'var(--slate)';
            const time  = new Date(a.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
            const SrcIcon = a.source === 'map-click' ? MapPin : Route;
            return (
              <div key={a._id ?? i} style={{
                display:'flex', gap:12, padding:'11px 16px',
                borderBottom:'1px solid var(--line)', borderLeft:`3px solid ${color}`,
                background: i === 0 ? 'var(--sky-tint)' : 'var(--white)', transition:'background .12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--sky-tint)'}
                onMouseLeave={e => e.currentTarget.style.background = i === 0 ? 'var(--sky-tint)' : 'var(--white)'}
              >
                <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, background:`${color}1a`,
                  display:'flex', alignItems:'center', justifyContent:'center', color }}>
                  <AlertTriangle size={14} />
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
                    <span style={{ fontSize:'0.72rem', fontWeight:700, color, textTransform:'uppercase' }}>
                      {a.riskCategory} Risk
                    </span>
                    <span style={{ fontSize:'0.68rem', color:'var(--slate-soft)', flexShrink:0 }}>{time}</span>
                  </div>
                  <div style={{ fontSize:'0.8rem', color:'var(--ink)', lineHeight:1.4,
                    overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                    {a.message}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3, fontSize:'0.7rem', color:'var(--slate)' }}>
                    <SrcIcon size={10} />
                    {a.source === 'map-click' ? 'Map click' : 'Route check'} · {a.latitude?.toFixed(4)}, {a.longitude?.toFixed(4)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Link to="/alerts" onClick={onClose} style={{
        display:'block', textAlign:'center', padding:'10px',
        fontSize:'0.8rem', fontWeight:700, color:'var(--sky-dark)',
        borderTop:'1px solid var(--line)', textDecoration:'none', background:'var(--white)', transition:'background .12s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--sky-tint)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--white)'}
      >
        View all alerts →
      </Link>
    </div>
  );
};

// ── Navbar ────────────────────────────────────────────────────────────────
export const Navbar = () => {
  const navigate = useNavigate();
  const [bellOpen,    setBellOpen]    = useState(false);
  const [alertCount,  setAlertCount]  = useState(0);
  const [userMenuOpen,setUserMenuOpen]= useState(false);
  const bellRef = useRef(null);
  const userRef = useRef(null);

  const user = auth.getUser();
  const isAdmin = user?.role === 'ADMIN';
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const roleLabel = { ADMIN:'Admin', FIELD_OFFICER:'Field Officer', VEHICLE_OPERATOR:'Vehicle Operator' }[user?.role] ?? user?.role ?? 'User';

  // Poll alert count every 30 s
  useEffect(() => {
    const load = () => api.getAlerts().then(d => setAlertCount(d.length)).catch(() => {});
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    authAPI.logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="top-navbar">
      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
        <h2 style={{ fontSize:'1rem', fontWeight:700, color:'var(--ink)' }}>Command Center</h2>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:'20px' }}>
        {/* SYSTEM OPERATIONAL */}
        <div style={{ display:'flex', alignItems:'center', gap:'6px', color:'var(--success)', fontSize:'0.78rem', fontWeight:700 }}>
          <Activity size={13} />
          <span className="hide-sm">SYSTEM OPERATIONAL</span>
        </div>

        {/* Bell notification */}
        <div ref={bellRef} style={{ position:'relative' }}>
          <button onClick={() => setBellOpen(o => !o)} title="Notifications"
            style={{
              background: bellOpen ? 'var(--sky-tint)' : 'none',
              border: bellOpen ? '1px solid var(--sky-tint-2)' : '1px solid transparent',
              borderRadius:8, cursor:'pointer', padding:'5px 6px',
              display:'flex', alignItems:'center', transition:'background .15s,border-color .15s', position:'relative',
            }}
            onMouseEnter={e => { if (!bellOpen) e.currentTarget.style.background='var(--sky-tint)'; }}
            onMouseLeave={e => { if (!bellOpen) e.currentTarget.style.background='none'; }}
          >
            <Bell size={18} color={bellOpen ? 'var(--sky-dark)' : 'var(--slate)'} />
            {alertCount > 0 && (
              <span style={{
                position:'absolute', top:2, right:2,
                minWidth: alertCount > 9 ? 16 : 14, height: alertCount > 9 ? 16 : 14,
                background:'var(--danger)', color:'#fff',
                borderRadius:10, fontSize:'0.58rem', fontWeight:800,
                display:'flex', alignItems:'center', justifyContent:'center',
                border:'1.5px solid var(--white)', lineHeight:1,
              }}>
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </button>
          {bellOpen && <NotificationPanel onClose={() => setBellOpen(false)} />}
        </div>

        {/* User avatar + dropdown */}
        <div ref={userRef} style={{ position:'relative' }}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            style={{
              display:'flex', alignItems:'center', gap:'7px', cursor:'pointer',
              background: userMenuOpen ? 'var(--sky-tint)' : 'none',
              border: '1px solid transparent', borderRadius:8, padding:'4px 8px',
              transition:'background .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='var(--sky-tint)'}
            onMouseLeave={e => { if (!userMenuOpen) e.currentTarget.style.background='none'; }}
          >
            <div style={{
              width:28, height:28, borderRadius:'50%',
              backgroundColor: isAdmin ? 'rgba(124,58,237,.12)' : 'var(--sky-tint-2)',
              display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid var(--sky-tint-2)',
            }}>
              {isAdmin ? <Shield size={14} color="#7C3AED" /> : <User size={14} color="var(--sky-dark)" />}
            </div>
            <div className="hide-sm" style={{ textAlign:'left' }}>
              <div style={{ fontSize:'0.82rem', color:'var(--ink)', fontWeight:600, lineHeight:1.2 }}>{displayName}</div>
              <div style={{ fontSize:'0.68rem', color:'var(--slate)', lineHeight:1 }}>{roleLabel}</div>
            </div>
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div style={{
              position:'absolute', top:'calc(100% + 8px)', right:0,
              width:200, background:'var(--white)',
              border:'1px solid var(--line)', borderRadius:10,
              boxShadow:'0 8px 24px rgba(20,38,59,.12)', zIndex:9999, overflow:'hidden',
            }}>
              <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--line)' }}>
                <div style={{ fontSize:'0.85rem', fontWeight:700, color:'var(--ink)' }}>{displayName}</div>
                <div style={{ fontSize:'0.75rem', color:'var(--slate)', marginTop:2 }}>{user?.userId}</div>
                <div style={{ fontSize:'0.7rem', color: isAdmin ? '#7C3AED' : 'var(--sky-dark)',
                  fontWeight:600, marginTop:4, textTransform:'uppercase', letterSpacing:'.04em' }}>
                  {roleLabel}
                </div>
              </div>
              <Link to="/account" onClick={() => setUserMenuOpen(false)} style={{
                display:'flex', alignItems:'center', gap:8, padding:'10px 14px',
                color:'var(--ink)', textDecoration:'none', fontSize:'0.85rem',
                transition:'background .12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background='var(--surface-elevated)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <User size={14} /> Account Details
              </Link>
              <button onClick={handleLogout} style={{
                display:'flex', alignItems:'center', gap:8,
                width:'100%', padding:'10px 14px', background:'none', border:'none',
                color:'var(--danger)', fontSize:'0.85rem', fontWeight:600, cursor:'pointer',
                borderTop:'1px solid var(--line)', transition:'background .12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background='var(--danger-bg)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};