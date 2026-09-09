/**
 * Login.jsx — pixel-perfect React port of the reference HTML design.
 * Split-screen: blue-gradient brand panel left, white login card right.
 * Pure UI — no backend. Status messages shown inline (no toast dependency).
 */
import { useState } from 'react';
import toast from 'react-hot-toast';

export const Login = () => {
  const [role,     setRole]     = useState('officer');
  const [showPw,   setShowPw]   = useState(false);
  const [statusMsg,setStatusMsg]= useState('');

  const idLabel       = role === 'officer' ? 'Officer ID' : 'Vehicle Operator ID';
  const idPlaceholder = role === 'officer' ? 'e.g. OFC-1042' : 'e.g. VOP-2317';

  const fakeLogin  = (e) => { e.preventDefault(); setStatusMsg('UI only — no backend connected yet.'); };
  const comingSoon = ()  => setStatusMsg('Coming soon.');
  const hideStatus = ()  => setStatusMsg('');

  return (
    <>
      {/* ── Scoped styles: light theme, only applies inside .sih-login ── */}
      <style>{`
        .sih-login {
          display: flex;
          min-height: 100vh;
          font-family: -apple-system, "Segoe UI", Inter, Roboto, Helvetica, Arial, sans-serif;
          color: #14263B;
          background: #fff;
        }

        /* ── Left brand panel ── */
        .sih-brand {
          flex: 1.05;
          position: relative;
          background: linear-gradient(160deg, #1E6FA8 0%, #2C8FD1 55%, #4FA8D8 100%);
          color: #fff;
          padding: 56px 64px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
        }
        .sih-brand svg.contours {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          opacity: 0.35;
          pointer-events: none;
        }
        .sih-brand-top  { position: relative; z-index: 2; }
        .sih-brand-mark {
          display: flex; align-items: center; gap: 10px;
          font-weight: 600; font-size: 15px; letter-spacing: 0.02em;
        }
        .sih-brand-mark .dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.25);
        }
        .sih-brand-copy { position: relative; z-index: 2; max-width: 420px; }
        .sih-brand-copy h1 {
          font-size: 34px; line-height: 1.25; font-weight: 600;
          margin: 0 0 14px; letter-spacing: -0.01em;
        }
        .sih-brand-copy p {
          font-size: 15.5px; line-height: 1.6;
          color: rgba(255,255,255,0.88); margin: 0;
        }
        .sih-brand-bottom {
          position: relative; z-index: 2;
          display: flex; gap: 28px;
          font-size: 13px; color: rgba(255,255,255,0.75);
        }
        .sih-brand-bottom .stat b {
          display: block; font-size: 20px; color: #fff;
          font-weight: 600; margin-bottom: 2px;
        }

        /* ── Right login panel ── */
        .sih-panel {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          padding: 40px 32px;
          background: #fff;
        }
        .sih-card { width: 100%; max-width: 380px; }
        .sih-card h2 {
          font-size: 24px; font-weight: 600; margin: 0 0 4px; color: #14263B;
        }
        .sih-card .sub {
          font-size: 14px; color: #5C7288; margin: 0 0 26px;
        }

        /* Tabs */
        .sih-tabs {
          display: flex;
          background: #EAF4FC;
          border-radius: 10px; padding: 4px;
          margin-bottom: 22px;
        }
        .sih-tab {
          flex: 1; border: none; background: transparent;
          padding: 10px 0; font-size: 14px; font-weight: 600;
          color: #5C7288; border-radius: 7px; cursor: pointer;
          transition: background .15s, color .15s, box-shadow .15s;
        }
        .sih-tab.active {
          background: #fff; color: #1E6FA8;
          box-shadow: 0 1px 3px rgba(20,38,59,0.12);
        }

        /* Gov notice */
        .sih-notice {
          font-size: 12.5px; color: #5C7288;
          background: #EAF4FC; border: 1px solid #D6EAF9;
          border-radius: 8px; padding: 9px 12px;
          margin-bottom: 22px; line-height: 1.5;
        }

        /* Status banner */
        .sih-status {
          text-align: center; font-size: 12.5px; color: #1E6FA8;
          background: #EAF4FC; border-radius: 8px;
          padding: 8px; margin-bottom: 16px;
        }

        /* Fields */
        .sih-field { margin-bottom: 18px; }
        .sih-field label {
          display: block; font-size: 13px; font-weight: 600;
          color: #14263B; margin-bottom: 7px;
        }
        .sih-input-wrap { position: relative; }
        .sih-field input {
          width: 100%; padding: 11px 14px; font-size: 14.5px;
          border: 1.5px solid #E4ECF3; border-radius: 9px;
          color: #14263B; outline: none;
          transition: border-color .15s, box-shadow .15s;
          background: #fff; box-sizing: border-box;
        }
        .sih-field input::placeholder { color: #94A6B8; }
        .sih-field input:focus {
          border-color: #2C8FD1;
          box-shadow: 0 0 0 3px rgba(44,143,209,0.15);
        }
        .sih-pw-input { padding-right: 42px !important; }
        .sih-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          cursor: pointer; color: #94A6B8; display: flex;
          background: none; border: none; padding: 2px;
          line-height: 1;
        }
        .sih-eye:hover { color: #5C7288; }

        /* Buttons */
        .sih-btn-primary {
          width: 100%; padding: 12px 0;
          background: #2C8FD1; color: #fff; border: none;
          border-radius: 9px; font-size: 15px; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background .15s, transform .1s;
          margin-bottom: 0;
        }
        .sih-btn-primary:hover  { background: #1E6FA8; }
        .sih-btn-primary:active { transform: scale(0.99); }

        /* Divider */
        .sih-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 22px 0; color: #94A6B8; font-size: 12.5px;
        }
        .sih-divider::before, .sih-divider::after {
          content: ""; flex: 1; height: 1px; background: #E4ECF3;
        }

        /* Alt row */
        .sih-alt-row { display: flex; gap: 10px; margin-bottom: 20px; }
        .sih-btn-alt {
          flex: 1; padding: 10px 0; background: #fff;
          border: 1.5px solid #E4ECF3; border-radius: 9px;
          font-size: 13.5px; font-weight: 600; color: #14263B;
          cursor: pointer;
          transition: border-color .15s, color .15s;
        }
        .sih-btn-alt:hover { border-color: #2C8FD1; color: #1E6FA8; }

        /* Forgot / footer */
        .sih-forgot {
          display: block; text-align: center; font-size: 13.5px;
          color: #1E6FA8; text-decoration: none; font-weight: 600;
          margin-bottom: 30px; background: none; border: none; cursor: pointer;
          width: 100%;
        }
        .sih-forgot:hover { text-decoration: underline; }
        .sih-footer {
          font-size: 12px; color: #94A6B8; text-align: center;
        }

        /* Responsive */
        @media (max-width: 860px) {
          .sih-login   { flex-direction: column; }
          .sih-brand   { padding: 36px 28px; min-height: 220px; }
          .sih-brand-copy h1 { font-size: 24px; }
          .sih-brand-bottom  { display: none; }
          .sih-panel   { padding: 32px 24px; }
        }
      `}</style>

      <div className="sih-login">

        {/* ── Left brand panel ── */}
        <div className="sih-brand">
          {/* Terrain contour lines (SVG, same as reference) */}
          <svg className="contours" viewBox="0 0 500 700" preserveAspectRatio="none">
            <path d="M-20,560 C80,500 140,610 220,560 C300,510 340,600 420,560 C480,530 520,570 560,540" stroke="#fff" strokeWidth="1.2" fill="none"/>
            <path d="M-20,600 C90,540 150,650 230,600 C310,550 350,640 430,600 C490,570 520,610 560,580" stroke="#fff" strokeWidth="1.2" fill="none"/>
            <path d="M-20,640 C100,580 160,690 240,640 C320,590 360,680 440,640 C500,610 520,650 560,620" stroke="#fff" strokeWidth="1" fill="none"/>
            <path d="M-40,300 C60,250 120,340 200,300 C280,260 320,330 400,300 C460,275 500,305 540,285" stroke="#fff" strokeWidth="1" fill="none"/>
            <path d="M-40,340 C70,290 130,380 210,340 C290,300 330,370 410,340 C470,315 500,345 540,325" stroke="#fff" strokeWidth="1" fill="none"/>
            <path d="M-40,380 C80,330 140,420 220,380 C300,340 340,410 420,380 C480,355 505,385 540,365" stroke="#fff" strokeWidth="0.8" fill="none"/>
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
            {[
              { value: '142', label: 'vehicles tracked' },
              { value: '6',   label: 'districts covered' },
              { value: '24/7',label: 'risk monitoring'  },
            ].map(({ value, label }) => (
              <div className="stat" key={label}>
                <b>{value}</b>{label}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right login panel ── */}
        <div className="sih-panel">
          <div className="sih-card">
            <h2>Login.</h2>
            <p className="sub">Access your government-issued account.</p>

            {/* Role tabs */}
            <div className="sih-tabs" role="tablist">
              {[
                { id: 'officer',   label: 'Field Officer'      },
                { id: 'driver',    label: 'Vehicle Operator'   },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={role === id}
                  className={`sih-tab${role === id ? ' active' : ''}`}
                  onClick={() => { setRole(id); hideStatus(); }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Gov notice */}
            <div className="sih-notice">
              Government-issued credentials only. No self-registration — accounts are created by the administrator.
            </div>

            {/* Status message */}
            {statusMsg && (
              <div className="sih-status">{statusMsg}</div>
            )}

            <form onSubmit={fakeLogin}>
              {/* ID field */}
              <div className="sih-field">
                <label htmlFor="sih-id">{idLabel}</label>
                <div className="sih-input-wrap">
                  <input id="sih-id" type="text" placeholder={idPlaceholder} autoComplete="username" />
                </div>
              </div>

              {/* Password field */}
              <div className="sih-field" style={{ marginBottom: 24 }}>
                <label htmlFor="sih-pw">Password</label>
                <div className="sih-input-wrap">
                  <input
                    id="sih-pw"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="sih-pw-input"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="sih-eye"
                    onClick={() => setShowPw(v => !v)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? (
                      /* EyeOff */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      /* Eye */
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Login CTA */}
              <button type="submit" className="sih-btn-primary">
                Login
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7"/>
                </svg>
              </button>
            </form>

            {/* Divider */}
            <div className="sih-divider">Or</div>

            {/* Alternate login */}
            <div className="sih-alt-row">
              {['Login with OTP', 'Login with PIN'].map(label => (
                <button key={label} className="sih-btn-alt" onClick={comingSoon}>{label}</button>
              ))}
            </div>

            {/* Forgot password */}
            <button className="sih-forgot" onClick={comingSoon}>Forgot password?</button>

            {/* Footer */}
            <div className="sih-footer">SIH26002 · Landslide-Safe Logistics Platform</div>
          </div>
        </div>

      </div>
    </>
  );
};
