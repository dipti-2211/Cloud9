/**
 * AccountDetails.jsx — Connected to real /api/auth/me backend endpoint.
 * Shows logged-in user profile. Password change is simulated (no backend endpoint yet).
 */
import { useState, useEffect } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { User, Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI, auth } from '../services/api';

const SectionHeading = ({ children }) => (
  <div style={{ fontSize:'0.78rem', fontWeight:800, color:'var(--sky-dark)', textTransform:'uppercase',
    letterSpacing:'0.08em', marginBottom:14, paddingBottom:6, borderBottom:'2px solid var(--sky-tint-2)' }}>
    {children}
  </div>
);

const ROLE_LABEL = { ADMIN:'Administrator', FIELD_OFFICER:'Field Officer', VEHICLE_OPERATOR:'Vehicle Operator' };

export const AccountDetails = () => {
  const [profile, setProfile]   = useState(auth.getUser()); // immediate from cache
  const [loading, setLoading]   = useState(true);
  const [pw,      setPw]        = useState({ current:'', next:'', confirm:'' });
  const [showPw,  setShowPw]    = useState({ current:false, next:false, confirm:false });
  const [pwError, setPwError]   = useState('');

  const toggle = (field) => setShowPw(s => ({ ...s, [field]: !s[field] }));

  useEffect(() => {
    authAPI.getMe()
      .then(res => { setProfile(res.data); setLoading(false); })
      .catch(() => setLoading(false)); // use cached on error
  }, []);

  const handleChangePw = (e) => {
    e.preventDefault(); setPwError('');
    if (!pw.current)           { setPwError('Enter your current password.'); return; }
    if (pw.next.length < 8)    { setPwError('New password must be at least 8 characters.'); return; }
    if (pw.next !== pw.confirm) { setPwError('Passwords do not match.'); return; }
    toast.success('Password changed successfully.');
    setPw({ current:'', next:'', confirm:'' });
  };

  const EyeBtn = ({ field }) => (
    <button type="button" onClick={() => toggle(field)}
      style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
        background:'none', border:'none', cursor:'pointer', color:'var(--slate)', display:'flex' }}>
      {showPw[field] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  if (loading && !profile) {
    return (
      <div>
        <PageHeader title="Account Details" description="Your profile and security settings." />
        <div style={{ textAlign:'center', padding:48, color:'var(--slate)' }}>Loading profile…</div>
      </div>
    );
  }

  const p = profile ?? {};
  const fields = [
    { label:'System User ID', value: p.userId,                  mono:true },
    { label:'Role',           value: ROLE_LABEL[p.role] ?? p.role },
    { label:'Full Name',      value: [p.firstName, p.lastName].filter(Boolean).join(' ') || '—' },
    { label:'Email',          value: p.email ?? '—' },
    { label:'Mobile',         value: p.mobileNumber ?? '—' },
    { label:'Employee ID',    value: p.employeeId ?? '—' },
    { label:'Department',     value: p.department ?? '—' },
    { label:'Designation',    value: p.designation ?? '—' },
    { label:'Posting Location',value: p.postingLocation ?? '—' },
    { label:'Account Status', value: p.accountStatus ?? '—',
      pill: p.accountStatus === 'APPROVED'
        ? { bg:'var(--success-bg)', color:'var(--success)', border:'var(--success)' }
        : { bg:'#FEF3C7', color:'#92400E', border:'#F59E0B' } },
  ].filter(f => f.value && f.value !== '—');

  // Vehicle Operator extra fields
  if (p.role === 'VEHICLE_OPERATOR') {
    if (p.licenseNumber)     fields.push({ label:'License No.',   value: p.licenseNumber });
    if (p.vehicleRegNumber)  fields.push({ label:'Vehicle Reg.',  value: p.vehicleRegNumber });
    if (p.vehicleType)       fields.push({ label:'Vehicle Type',  value: p.vehicleType });
    if (p.assignedRoute)     fields.push({ label:'Assigned Route',value: p.assignedRoute });
  }
  if (p.office)   fields.push({ label:'Office',   value: p.office });
  if (p.district) fields.push({ label:'District', value: `${p.district}${p.state ? ', ' + p.state : ''}` });

  return (
    <div>
      <PageHeader title="Account Details" description="Manage your profile and security settings." />

      <div style={{ display:'flex', flexDirection:'column', gap:24, maxWidth:680 }}>

        {/* ── Profile info ── */}
        <div className="card">
          <SectionHeading>Account Information</SectionHeading>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px 24px' }}>
            {fields.map(({ label, value, mono, pill }) => (
              <div key={label}>
                <div style={{ fontSize:'0.65rem', color:'var(--slate-soft)', fontWeight:600,
                  textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:3 }}>{label}</div>
                {pill
                  ? <span style={{ ...pill, border:`1px solid ${pill.border}`, borderRadius:20,
                      padding:'3px 12px', fontSize:'0.78rem', fontWeight:700 }}>{value}</span>
                  : <div style={{ fontSize:'0.9rem', color:'var(--ink)', fontWeight:600,
                      fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
                }
              </div>
            ))}
          </div>
        </div>

        {/* ── Change password ── */}
        <div className="card">
          <SectionHeading>Change Password</SectionHeading>
          <form onSubmit={handleChangePw} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {[
              { field:'current', label:'Current Password',    placeholder:'Enter current password' },
              { field:'next',    label:'New Password',         placeholder:'At least 8 characters' },
              { field:'confirm', label:'Confirm New Password', placeholder:'Repeat new password' },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'var(--slate)',
                  textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5 }}>{label}</label>
                <div style={{ position:'relative' }}>
                  <input type={showPw[field] ? 'text' : 'password'} value={pw[field]}
                    onChange={e => setPw(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder} className="form-control"
                    style={{ paddingRight:36, fontSize:'0.88rem' }} />
                  <EyeBtn field={field} />
                </div>
              </div>
            ))}

            {pwError && (
              <div style={{ fontSize:'0.82rem', color:'var(--danger)', background:'var(--danger-bg)',
                border:'1px solid var(--danger)', borderRadius:6, padding:'7px 12px' }}>{pwError}</div>
            )}

            <button type="submit" className="btn btn-primary"
              style={{ display:'flex', alignItems:'center', gap:6, alignSelf:'flex-start', padding:'9px 20px' }}>
              <Lock size={14} /> Save New Password
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
