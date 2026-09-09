/**
 * Login.jsx — Production-ready login page
 * Three tabs: Field Officer | Vehicle Operator | Admin
 * Calls real backend at POST /api/auth/login, stores JWT, redirects to dashboard.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const TABS = [
  { id: 'officer', label: 'Field Officer',     idLabel: 'Officer ID',          placeholder: 'e.g. OFC-1042',  role: 'officer' },
  { id: 'driver',  label: 'Vehicle Operator',  idLabel: 'Vehicle Operator ID', placeholder: 'e.g. VOP-2317',  role: 'driver'  },
  { id: 'admin',   label: 'Admin',             idLabel: 'Admin ID',            placeholder: 'e.g. admin',     role: 'admin'   },
];

export const Login = () => {
  const navigate = useNavigate();
  const [tab,      setTab]      = useState('officer');
  const [userId,   setUserId]   = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const currentTab = TABS.find(t => t.id === tab);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!userId.trim()) { setError('Please enter your ' + currentTab.idLabel + '.'); return; }
    if (!password)       { setError('Please enter your password.'); return; }

    setLoading(true);
    try {
      await authAPI.login(userId.trim(), password, currentTab.role);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (id) => { setTab(id); setError(''); setUserId(''); setPassword(''); };

  return (
    <>
      <style>{`
        .sih-login {
          display: flex; min-height: 100vh;
          font-family: -apple-system,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif;
          color: #14263B !important; background: #fff !important;
        }
        /* ── Left brand panel ── */
        .sih-brand {
          flex: 1.05; position: relative;
          background: linear-gradient(160deg,#1E6FA8 0%,#2C8FD1 55%,#4FA8D8 100%) !important;
          color: #fff !important; padding: 56px 64px;
          display: flex; flex-direction: column; justify-content: space-between;
          overflow: hidden;
        }
        .sih-brand svg.contours { position:absolute;inset:0;width:100%;height:100%;opacity:.35;pointer-events:none; }
        .sih-brand-top  { position:relative;z-index:2; }
        .sih-brand-mark { display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px;letter-spacing:.02em;color:#fff !important; }
        .sih-brand-mark .dot { width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:0 0 0 4px rgba(255,255,255,.25); }
        .sih-brand-copy { position:relative;z-index:2;max-width:420px; }
        .sih-brand-copy h1 { font-size:34px;line-height:1.25;font-weight:600;margin:0 0 14px;letter-spacing:-.01em;color:#fff !important; }
        .sih-brand-copy p  { font-size:15.5px;line-height:1.6;color:rgba(255,255,255,.88) !important;margin:0; }
        .sih-brand-bottom  { position:relative;z-index:2;display:flex;gap:28px;font-size:13px;color:rgba(255,255,255,.75) !important; }
        .sih-brand-bottom .stat b { display:block;font-size:20px;color:#fff !important;font-weight:600;margin-bottom:2px; }
        /* ── Right login panel — always white ── */
        .sih-panel { flex:1;display:flex;align-items:center;justify-content:center;padding:40px 32px;background:#ffffff !important; }
        .sih-card  { width:100%;max-width:400px;background:#ffffff !important; }
        .sih-card h2 { font-size:24px;font-weight:600;margin:0 0 4px;color:#14263B !important; }
        .sih-card .sub { font-size:14px;color:#5C7288 !important;margin:0 0 26px; }
        /* Tabs — all use identical blue active style, NO purple */
        .sih-tabs { display:flex;background:#EAF4FC !important;border-radius:10px;padding:4px;margin-bottom:22px; }
        .sih-tab  { flex:1;border:none;background:transparent !important;padding:10px 0;font-size:13px;font-weight:600;
                    color:#5C7288 !important;border-radius:7px;cursor:pointer;transition:background .15s,color .15s,box-shadow .15s; }
        .sih-tab.active { background:#fff !important;color:#1E6FA8 !important;box-shadow:0 1px 3px rgba(20,38,59,.12); }
        /* Gov / Admin notice — same light blue style for all tabs */
        .sih-notice { font-size:12.5px;color:#5C7288 !important;background:#EAF4FC !important;border:1px solid #D6EAF9 !important;
                      border-radius:8px;padding:9px 12px;margin-bottom:22px;line-height:1.5; }
        /* Error banner */
        .sih-error { text-align:center;font-size:13px;color:#B91C1C !important;background:#FEF2F2 !important;
                     border:1px solid #FECACA !important;border-radius:8px;padding:9px;margin-bottom:16px; }
        /* Fields */
        .sih-field { margin-bottom:18px; }
        .sih-field label { display:block;font-size:13px;font-weight:600;color:#14263B !important;margin-bottom:7px; }
        .sih-input-wrap { position:relative; }
        .sih-field input { width:100%;padding:11px 14px;font-size:14.5px;border:1.5px solid #E4ECF3 !important;
                           border-radius:9px;color:#14263B !important;outline:none;
                           transition:border-color .15s,box-shadow .15s;background:#ffffff !important;box-sizing:border-box; }
        .sih-field input::placeholder { color:#94A6B8 !important; }
        .sih-field input:focus { border-color:#2C8FD1 !important;box-shadow:0 0 0 3px rgba(44,143,209,.15) !important; }
        .sih-pw-input { padding-right:42px !important; }
        .sih-eye { position:absolute;right:12px;top:50%;transform:translateY(-50%);
                   cursor:pointer;color:#94A6B8;display:flex;background:none !important;border:none;padding:2px;line-height:1; }
        .sih-eye:hover { color:#5C7288; }
        /* Primary button — always blue, no purple */
        .sih-btn-primary { width:100%;padding:12px 0;background:#2C8FD1 !important;color:#fff !important;border:none;
                           border-radius:9px;font-size:15px;font-weight:600;cursor:pointer;
                           display:flex;align-items:center;justify-content:center;gap:8px;
                           transition:background .15s,transform .1s;margin-bottom:0; }
        .sih-btn-primary:hover:not(:disabled)  { background:#1E6FA8 !important; }
        .sih-btn-primary:active:not(:disabled) { transform:scale(0.99); }
        .sih-btn-primary:disabled { opacity:.65;cursor:not-allowed; }
        /* Divider */
        .sih-divider { display:flex;align-items:center;gap:12px;margin:22px 0;color:#94A6B8;font-size:12.5px; }
        .sih-divider::before,.sih-divider::after { content:"";flex:1;height:1px;background:#E4ECF3; }
        /* Alt row */
        .sih-alt-row { display:flex;gap:10px;margin-bottom:20px; }
        .sih-btn-alt { flex:1;padding:10px 0;background:#ffffff !important;border:1.5px solid #E4ECF3 !important;border-radius:9px;
                       font-size:13.5px;font-weight:600;color:#14263B !important;cursor:pointer;transition:border-color .15s,color .15s; }
        .sih-btn-alt:hover { border-color:#2C8FD1 !important;color:#1E6FA8 !important; }
        /* Forgot / footer */
        .sih-forgot { display:block;text-align:center;font-size:13.5px;color:#1E6FA8 !important;text-decoration:none;
                      font-weight:600;margin-bottom:30px;background:none !important;border:none;cursor:pointer;width:100%; }
        .sih-forgot:hover { text-decoration:underline; }
        .sih-footer { font-size:12px;color:#94A6B8 !important;text-align:center; }
        /* Spinner */
        @keyframes spin { to { transform: rotate(360deg); } }
        .sih-spinner { width:16px;height:16px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;
                       border-radius:50%;animation:spin .6s linear infinite; }
        /* Responsive */
        @media (max-width:860px) {
          .sih-login { flex-direction:column; }
          .sih-brand { padding:36px 28px;min-height:220px; }
          .sih-brand-copy h1 { font-size:24px; }
          .sih-brand-bottom { display:none; }
          .sih-panel { padding:32px 24px; }
        }
      `}</style>

      <div className="sih-login">

        {/* ── Left brand panel ── */}
        <div className="sih-brand">
          <svg className="contours" viewBox="0 0 500 700" preserveAspectRatio="none">
            <path d="M-20,560 C80,500 140,610 220,560 C300,510 340,600 420,560 C480,530 520,570 560,540" stroke="#fff" strokeWidth="1.2" fill="none"/>
            <path d="M-20,600 C90,540 150,650 230,600 C310,550 350,640 430,600 C490,570 520,610 560,580" stroke="#fff" strokeWidth="1.2" fill="none"/>
            <path d="M-20,640 C100,580 160,690 240,640 C320,590 360,680 440,640 C500,610 520,650 560,620" stroke="#fff" strokeWidth="1" fill="none"/>
            <path d="M-40,300 C60,250 120,340 200,300 C280,260 320,330 400,300 C460,275 500,305 540,285" stroke="#fff" strokeWidth="1" fill="none"/>
            <path d="M-40,340 C70,290 130,380 210,340 C290,300 330,370 410,340 C470,315 500,345 540,325" stroke="#fff" strokeWidth="1" fill="none"/>
            <path d="M-40,380 C80,330 140,420 220,380 C300,340 340,410 420,380 C480,355 505,385 540,365" stroke="#fff" strokeWidth=".8" fill="none"/>
          </svg>

          <div className="sih-brand-top">
            <div className="sih-brand-mark">
              <span className="dot" />
              SIH26002 &nbsp;·&nbsp; Command Center
            </div>
          </div>

          <div className="sih-brand-copy">
            <h1>Landslide-aware routing for North-East India</h1>
            <p>Real-time risk detection, live fleet tracking, and safer alternate routes for vehicles moving through high-risk terrain.</p>
          </div>

          <div className="sih-brand-bottom">
            {[{ value:'142', label:'vehicles tracked' }, { value:'6', label:'districts covered' }, { value:'24/7', label:'risk monitoring' }]
              .map(({ value, label }) => (
                <div className="stat" key={label}><b>{value}</b>{label}</div>
              ))}
          </div>
        </div>

        {/* ── Right login panel — ALL inline styles to beat OS dark mode ── */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px', background: '#ffffff', backgroundColor: '#ffffff',
        }}>
          <div style={{ width: '100%', maxWidth: 400, background: '#ffffff', backgroundColor: '#ffffff' }}>
            <h2 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 4px', color: '#14263B' }}>Sign in</h2>
            <p style={{ fontSize: 14, color: '#5C7288', margin: '0 0 26px' }}>Access your government-issued account.</p>

            {/* Role tabs */}
            <div role="tablist" style={{
              display: 'flex', background: '#EAF4FC', borderRadius: 10,
              padding: 4, marginBottom: 22,
            }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => switchTab(t.id)}
                  style={{
                    flex: 1, border: 'none', padding: '10px 0',
                    fontSize: 13, fontWeight: 600, borderRadius: 7, cursor: 'pointer',
                    transition: 'background .15s, color .15s',
                    background: tab === t.id ? '#ffffff' : 'transparent',
                    backgroundColor: tab === t.id ? '#ffffff' : 'transparent',
                    color: tab === t.id ? '#1E6FA8' : '#5C7288',
                    boxShadow: tab === t.id ? '0 1px 3px rgba(20,38,59,.12)' : 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Gov / Admin notice */}
            <div style={{
              fontSize: 12.5, color: '#5C7288', background: '#EAF4FC', backgroundColor: '#EAF4FC',
              border: '1px solid #D6EAF9', borderRadius: 8, padding: '9px 12px',
              marginBottom: 22, lineHeight: 1.5,
            }}>
              {tab === 'admin'
                ? 'Administrator access only. Contact the system owner if you have lost your credentials.'
                : 'Government-issued credentials only. No self-registration — accounts are created by the administrator.'}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                textAlign: 'center', fontSize: 13, color: '#B91C1C',
                background: '#FEF2F2', backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA', borderRadius: 8,
                padding: 9, marginBottom: 16,
              }}>{error}</div>
            )}

            <form onSubmit={handleLogin} noValidate>
              {/* ID field */}
              <div style={{ marginBottom: 18 }}>
                <label htmlFor="sih-id" style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#14263B', marginBottom: 7,
                }}>{currentTab.idLabel}</label>
                <input
                  id="sih-id"
                  type="text"
                  placeholder={currentTab.placeholder}
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  style={{
                    width: '100%', padding: '11px 14px', fontSize: 14.5,
                    border: '1.5px solid #E4ECF3', borderRadius: 9,
                    color: '#14263B', background: '#ffffff', backgroundColor: '#ffffff',
                    outline: 'none', boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.target.style.borderColor = '#2C8FD1'; e.target.style.boxShadow = '0 0 0 3px rgba(44,143,209,.15)'; }}
                  onBlur={e  => { e.target.style.borderColor = '#E4ECF3'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Password field */}
              <div style={{ marginBottom: 24 }}>
                <label htmlFor="sih-pw" style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#14263B', marginBottom: 7,
                }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="sih-pw"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{
                      width: '100%', padding: '11px 42px 11px 14px', fontSize: 14.5,
                      border: '1.5px solid #E4ECF3', borderRadius: 9,
                      color: '#14263B', background: '#ffffff', backgroundColor: '#ffffff',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.target.style.borderColor = '#2C8FD1'; e.target.style.boxShadow = '0 0 0 3px rgba(44,143,209,.15)'; }}
                    onBlur={e  => { e.target.style.borderColor = '#E4ECF3'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      cursor: 'pointer', color: '#94A6B8', display: 'flex',
                      background: 'none', backgroundColor: 'transparent', border: 'none', padding: 2,
                    }}>
                    {showPw ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Login button — always blue */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '12px 0',
                  background: '#2C8FD1', backgroundColor: '#2C8FD1',
                  color: '#ffffff', border: 'none', borderRadius: 9,
                  fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: loading ? 0.65 : 1, transition: 'background .15s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#1E6FA8'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#2C8FD1'; }}
              >
                {loading ? (
                  <><div className="sih-spinner" /> Signing in…</>
                ) : (
                  <>
                    Login
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>

            {tab !== 'admin' && (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  margin: '22px 0', color: '#94A6B8', fontSize: 12.5,
                }}>
                  <span style={{ flex: 1, height: 1, background: '#E4ECF3' }} />
                  Or
                  <span style={{ flex: 1, height: 1, background: '#E4ECF3' }} />
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  {['Login with OTP', 'Login with PIN'].map(label => (
                    <button key={label} type="button"
                      onClick={() => setError('Coming soon — OTP / PIN login is under development.')}
                      style={{
                        flex: 1, padding: '10px 0',
                        background: '#ffffff', backgroundColor: '#ffffff',
                        border: '1.5px solid #E4ECF3', borderRadius: 9,
                        fontSize: 13.5, fontWeight: 600, color: '#14263B', cursor: 'pointer',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#2C8FD1'; e.currentTarget.style.color='#1E6FA8'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#E4ECF3'; e.currentTarget.style.color='#14263B'; }}
                    >{label}</button>
                  ))}
                </div>
              </>
            )}

            <button type="button"
              onClick={() => setError('Contact your system administrator to reset your password.')}
              style={{
                display: 'block', width: '100%', textAlign: 'center',
                fontSize: 13.5, color: '#1E6FA8', fontWeight: 600,
                marginBottom: 30, background: 'none', backgroundColor: 'transparent',
                border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.textDecoration='underline'; }}
              onMouseLeave={e => { e.currentTarget.style.textDecoration='none'; }}
            >Forgot password?</button>

            <div style={{ fontSize: 12, color: '#94A6B8', textAlign: 'center' }}>
              SIH26002 · Landslide-Safe Logistics Platform
            </div>
          </div>
        </div>

      </div>
    </>
  );
};
