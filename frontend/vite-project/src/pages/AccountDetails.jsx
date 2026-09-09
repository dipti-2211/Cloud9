/**
 * AccountDetails.jsx
 * Shows logged-in user info, change-password form, and remove-account flow.
 * No backend wiring — local state + toasts only.
 */
import { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { User, Lock, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const MOCK_USER = { userId: 'ADMIN-001', role: 'Admin', email: 'admin@sih26002.gov.in', accountStatus: 'Active' };

const SectionHeading = ({ children }) => (
  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--sky-dark)', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 14, paddingBottom: 6, borderBottom: '2px solid var(--sky-tint-2)' }}>
    {children}
  </div>
);

export const AccountDetails = () => {
  const [pw, setPw]       = useState({ current: '', next: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwError, setPwError] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [accountStatus, setAccountStatus] = useState(MOCK_USER.accountStatus);

  const toggle = (field) => setShowPw(s => ({ ...s, [field]: !s[field] }));

  const handleChangePw = (e) => {
    e.preventDefault();
    setPwError('');
    if (!pw.current) { setPwError('Enter your current password.'); return; }
    if (pw.next.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (pw.next !== pw.confirm) { setPwError('Passwords do not match.'); return; }
    toast.success('Password changed successfully.');
    setPw({ current: '', next: '', confirm: '' });
  };

  const handleRemoveAccount = () => {
    setDeleteDialog(false);
    setAccountStatus('Pending Deletion');
    toast('Account removal request submitted for approval.', {
      icon: '⏳',
      style: { background: 'var(--white)', color: 'var(--ink)', border: '1px solid var(--line)' },
    });
  };

  const EyeBtn = ({ field }) => (
    <button type="button" onClick={() => toggle(field)}
      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', display: 'flex' }}>
      {showPw[field] ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );

  return (
    <div>
      <PageHeader title="Account Details" description="Manage your account information and security settings." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 640 }}>

        {/* ── Account Info ── */}
        <div className="card">
          <SectionHeading>Account Information</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
            {[
              { label: 'System User ID', value: MOCK_USER.userId, mono: true },
              { label: 'Role',           value: MOCK_USER.role },
              { label: 'Email',          value: MOCK_USER.email },
              { label: 'Account Status', value: accountStatus,
                pill: accountStatus === 'Active'
                  ? { bg: 'var(--success-bg)', color: 'var(--success)', border: 'var(--success)' }
                  : { bg: '#FEF3C7', color: '#92400E', border: '#F59E0B' } },
            ].map(({ label, value, mono, pill }) => (
              <div key={label}>
                <div style={{ fontSize: '0.65rem', color: 'var(--slate-soft)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                {pill
                  ? <span style={{ ...pill, border: `1px solid ${pill.border}`, borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 700 }}>{value}</span>
                  : <div style={{ fontSize: '0.9rem', color: 'var(--ink)', fontWeight: 600, fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
                }
              </div>
            ))}
          </div>
        </div>

        {/* ── Change Password ── */}
        <div className="card">
          <SectionHeading>Change Password</SectionHeading>
          <form onSubmit={handleChangePw} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { field: 'current', label: 'Current Password',    placeholder: 'Enter current password' },
              { field: 'next',    label: 'New Password',         placeholder: 'At least 8 characters' },
              { field: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
            ].map(({ field, label, placeholder }) => (
              <div key={field}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPw[field] ? 'text' : 'password'} value={pw[field]}
                    onChange={e => setPw(p => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder} className="form-control"
                    style={{ paddingRight: 36, fontSize: '0.88rem', borderColor: pwError && field !== 'current' ? 'var(--danger)' : undefined }} />
                  <EyeBtn field={field} />
                </div>
              </div>
            ))}

            {pwError && (
              <div style={{ fontSize: '0.82rem', color: 'var(--danger)', background: 'var(--danger-bg)',
                border: '1px solid var(--danger)', borderRadius: 6, padding: '7px 12px' }}>
                {pwError}
              </div>
            )}

            <button type="submit" className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', padding: '9px 20px' }}>
              <Lock size={14} /> Save New Password
            </button>
          </form>
        </div>

        {/* ── Remove Account ── */}
        <div className="card" style={{ borderColor: accountStatus === 'Pending Deletion' ? '#F59E0B' : 'var(--line)' }}>
          <SectionHeading>Remove Account</SectionHeading>
          <p style={{ fontSize: '0.88rem', color: 'var(--slate)', marginBottom: 16, lineHeight: 1.6 }}>
            Account removal requires government approval. Submitting a request will mark your account as{' '}
            <strong>"Pending Deletion"</strong> — it won't be removed until an administrator approves.
          </p>
          {accountStatus === 'Pending Deletion' ? (
            <div style={{ fontSize: '0.85rem', color: '#92400E', background: '#FEF3C7',
              border: '1px solid #F59E0B', borderRadius: 8, padding: '10px 14px', fontWeight: 600 }}>
              ⏳ Deletion request submitted — awaiting approval.
            </div>
          ) : (
            <button
              onClick={() => setDeleteDialog(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
                background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)',
                borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              <Trash2 size={14} /> Request Account Removal
            </button>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {deleteDialog && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(20,38,59,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 14,
            padding: '28px 32px', maxWidth: 380, width: '90%', boxShadow: '0 8px 40px rgba(20,38,59,0.18)' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>Remove Account?</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--slate)', marginBottom: 20, lineHeight: 1.6 }}>
              This requires government approval. Your account will be marked{' '}
              <strong>"Pending Deletion"</strong> and reviewed by an administrator before any action is taken.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDeleteDialog(false)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleRemoveAccount}
                style={{ flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                  background: '#F59E0B', color: '#fff', border: 'none', fontWeight: 700 }}>
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
