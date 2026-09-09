/**
 * DigitalIdCard.jsx — Reusable personnel ID card
 * Shown after registration form submission as confirmation.
 * Props:
 *   person  — the registered person object
 *   role    — "officer" | "operator"
 *   onEdit  — () => void  — re-opens the form pre-filled
 *   onDelete — () => void — triggers pending-deletion flow
 */
import { useState } from 'react';
import { Edit2, Trash2, User, Shield, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_PILL = {
  Active:           { bg: 'var(--success-bg)', color: 'var(--success)',  border: 'var(--success)' },
  Inactive:         { bg: 'var(--warning-bg)', color: 'var(--warning)',  border: 'var(--warning)' },
  Pending:          { bg: 'var(--sky-tint)',   color: 'var(--sky-dark)', border: 'var(--sky-tint-2)' },
  'Pending Deletion': { bg: '#FEF3C7',         color: '#92400E',         border: '#F59E0B' },
};

export const DigitalIdCard = ({ person, role, onEdit, onDeleteConfirm }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const pill = STATUS_PILL[person.accountStatus] ?? STATUS_PILL.Pending;
  const isOfficer = role === 'officer';
  const initials = `${person.firstName?.[0] ?? ''}${person.lastName?.[0] ?? ''}`.toUpperCase();

  const handleDeleteRequest = () => {
    setShowDeleteDialog(false);
    onDeleteConfirm?.();
    toast('Deletion request submitted for approval.', {
      icon: '⏳',
      style: { background: 'var(--white)', color: 'var(--ink)', border: '1px solid var(--line)' },
    });
  };

  return (
    <>
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--line)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(20,38,59,0.10)',
        maxWidth: 440,
        width: '100%',
      }}>
        {/* Header stripe */}
        <div style={{
          background: 'linear-gradient(135deg, var(--sky-dark) 0%, var(--sky) 100%)',
          padding: '20px 24px 32px',
          position: 'relative',
        }}>
          {/* Role badge */}
          <div style={{
            position: 'absolute', top: 14, right: 14,
            background: 'rgba(255,255,255,0.2)',
            color: '#fff', borderRadius: 20, padding: '3px 10px',
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {isOfficer ? <Shield size={11} /> : <Truck size={11} />}
            {isOfficer ? 'Field Officer' : 'Vehicle Operator'}
          </div>

          {/* Watermark text */}
          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 12 }}>
            GOVERNMENT OF INDIA · SIH26002
          </div>

          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            {person.photoUrl ? (
              <img src={person.photoUrl} alt="Profile"
                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.8)' }} />
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', fontWeight: 700, color: '#fff',
              }}>
                {initials || <User size={28} />}
              </div>
            )}
            <div style={{ color: '#fff', marginBottom: 4 }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                {person.firstName} {person.lastName}
              </div>
              <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>
                {isOfficer ? person.designation : person.vehicleType}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px' }}>
          {/* System ID + status row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--slate)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>System User ID</div>
              <div style={{ fontWeight: 700, color: 'var(--ink)', fontSize: '0.95rem', fontFamily: 'monospace' }}>{person.userId}</div>
            </div>
            <div style={{ ...pill, borderRadius: 20, padding: '4px 12px', fontSize: '0.72rem', fontWeight: 700, border: `1px solid ${pill.border}` }}>
              {person.accountStatus}
            </div>
          </div>

          {/* Role-specific details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px', marginBottom: 20 }}>
            {isOfficer ? (<>
              <Field label="Employee ID"  value={person.employeeId} />
              <Field label="Department"   value={person.department} />
              <Field label="Office"       value={person.office} />
              <Field label="District"     value={person.district} />
            </>) : (<>
              <Field label="License No."  value={person.licenseNumber} />
              <Field label="Vehicle Type" value={person.vehicleType} />
              <Field label="Reg. Number"  value={person.vehicleRegNumber} />
              <Field label="Route/Depot"  value={person.assignedRoute || '—'} />
            </>)}
          </div>

          {/* Contact */}
          <div style={{ background: 'var(--sky-tint)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: '0.8rem', color: 'var(--slate)' }}>
            📧 {person.officialEmail} &nbsp;·&nbsp; 📞 {person.mobileNumber}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onEdit} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              background: 'var(--sky-tint)', color: 'var(--sky-dark)', border: '1px solid var(--sky-tint-2)',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--sky-tint-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--sky-tint)'}
            >
              <Edit2 size={14} /> Edit
            </button>
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={person.accountStatus === 'Pending Deletion'}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px', borderRadius: 8, cursor: person.accountStatus === 'Pending Deletion' ? 'not-allowed' : 'pointer',
                fontWeight: 600, fontSize: '0.85rem',
                background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)',
                opacity: person.accountStatus === 'Pending Deletion' ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(20,38,59,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--white)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '28px 32px', maxWidth: 380, width: '90%',
            boxShadow: '0 8px 40px rgba(20,38,59,0.18)',
          }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
              Request Deletion?
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--slate)', marginBottom: 20, lineHeight: 1.6 }}>
              This requires government approval. The record will be marked as <strong>"Pending Deletion"</strong> — it won't be removed until an administrator approves the request.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setShowDeleteDialog(false)} style={{
                flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                background: 'var(--sky-tint)', color: 'var(--ink)', border: '1px solid var(--line)', fontWeight: 600,
              }}>Cancel</button>
              <button onClick={handleDeleteRequest} style={{
                flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                background: '#F59E0B', color: '#fff', border: 'none', fontWeight: 700,
              }}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Small helper for the details grid
const Field = ({ label, value }) => (
  <div>
    <div style={{ fontSize: '0.62rem', color: 'var(--slate-soft)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: '0.82rem', color: 'var(--ink)', fontWeight: 500 }}>{value || '—'}</div>
  </div>
);
