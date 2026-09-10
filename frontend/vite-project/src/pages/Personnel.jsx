/**
 * Personnel.jsx — /personnel
 * Admin-only. Lists all field officers and vehicle operators.
 * Supports: view, inline edit (name/contact/region), enable/disable (soft toggle).
 * No pending/approve flow — accounts created by admin are always APPROVED immediately.
 */
import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Users, UserCheck, UserX, Edit2, RefreshCw, Search, ChevronDown, X, Save,
} from 'lucide-react';
import { authAPI } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';

// ─── helpers ────────────────────────────────────────────────────────────────

const ROLE_TABS = [
  { key: 'FIELD_OFFICER',    label: 'Field Officers'      },
  { key: 'VEHICLE_OPERATOR', label: 'Vehicle Operators'   },
];

const statusBadge = (s) => {
  const map = {
    APPROVED: { label: 'Active',    bg: 'var(--success-bg, #dcfce7)', color: 'var(--success, #16a34a)' },
    DISABLED: { label: 'Disabled',  bg: '#fee2e2',                    color: '#dc2626'                  },
    REJECTED: { label: 'Rejected',  bg: '#fef3c7',                    color: '#b45309'                  },
  };
  const b = map[s] ?? { label: s, bg: '#f1f5f9', color: '#64748b' };
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
      background: b.bg, color: b.color, whiteSpace: 'nowrap',
    }}>
      {b.label}
    </span>
  );
};

const fmtDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── Edit modal ─────────────────────────────────────────────────────────────

const OFFICER_FIELDS = [
  { key: 'firstName',      label: 'First Name'      },
  { key: 'lastName',       label: 'Last Name'        },
  { key: 'email',          label: 'Email'            },
  { key: 'mobileNumber',   label: 'Mobile'           },
  { key: 'district',       label: 'District'         },
  { key: 'state',          label: 'State'            },
  { key: 'postingLocation',label: 'Posting Location' },
  { key: 'department',     label: 'Department'       },
  { key: 'designation',    label: 'Designation'      },
];

const OPERATOR_FIELDS = [
  { key: 'firstName',      label: 'First Name'        },
  { key: 'lastName',       label: 'Last Name'          },
  { key: 'email',          label: 'Email'              },
  { key: 'mobileNumber',   label: 'Mobile'             },
  { key: 'district',       label: 'District'           },
  { key: 'state',          label: 'State'              },
  { key: 'postingLocation',label: 'Posting Location'   },
  { key: 'licenseNumber',  label: 'License Number'     },
  { key: 'vehicleRegNumber',label: 'Vehicle Reg.'      },
  { key: 'assignedRoute',  label: 'Assigned Route'     },
];

const EditModal = ({ user, onSave, onClose, saving }) => {
  const fields = user.role === 'FIELD_OFFICER' ? OFFICER_FIELDS : OPERATOR_FIELDS;
  const [form, setForm] = useState(() => {
    const init = {};
    fields.forEach(f => { init[f.key] = user[f.key] ?? ''; });
    return init;
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--white, #fff)', borderRadius: 14, padding: '28px 28px 24px',
        width: 480, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--ink, #0f172a)' }}>
              Edit {user.role === 'FIELD_OFFICER' ? 'Field Officer' : 'Vehicle Operator'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate, #64748b)', marginTop: 2 }}>
              {user.userId} — password unchanged
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
          {fields.map(f => (
            <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {f.label}
              </span>
              <input
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                style={{
                  padding: '8px 10px', borderRadius: 8, fontSize: '0.88rem',
                  border: '1px solid var(--line, #e2e8f0)', outline: 'none',
                  color: 'var(--ink)', background: 'var(--white)',
                }}
              />
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ padding: '8px 18px' }}>
            Cancel
          </button>
          <button
            onClick={() => onSave(user.userId, form)}
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Confirm dialog ──────────────────────────────────────────────────────────

const ConfirmDialog = ({ message, onConfirm, onCancel, confirmLabel = 'Confirm', confirmStyle = {} }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 1001,
    background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  }} onClick={onCancel}>
    <div style={{
      background: 'var(--white)', borderRadius: 14, padding: '28px',
      width: 360, boxShadow: '0 20px 60px rgba(0,0,0,0.22)',
    }} onClick={e => e.stopPropagation()}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)', marginBottom: 8 }}>Confirm Action</div>
      <div style={{ fontSize: '0.88rem', color: 'var(--slate)', marginBottom: 20 }}>{message}</div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} className="btn btn-secondary" style={{ padding: '8px 18px' }}>Cancel</button>
        <button onClick={onConfirm} className="btn btn-primary" style={{ padding: '8px 18px', ...confirmStyle }}>{confirmLabel}</button>
      </div>
    </div>
  </div>
);

// ─── Personnel row ───────────────────────────────────────────────────────────

const PersonnelRow = ({ user, onEdit, onToggleStatus, acting }) => {
  const isDisabled = user.accountStatus === 'DISABLED';
  return (
    <tr style={{ borderBottom: '1px solid var(--line, #e2e8f0)', opacity: isDisabled ? 0.65 : 1 }}>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>
          {user.firstName} {user.lastName}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--slate)' }}>{user.userId}</div>
      </td>
      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--slate)' }}>
        {user.email || '—'}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--slate)' }}>
        {user.district || user.postingLocation || '—'}
      </td>
      <td style={{ padding: '12px 16px' }}>
        {statusBadge(user.accountStatus)}
      </td>
      <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--slate)' }}>
        {fmtDate(user.createdAt)}
      </td>
      <td style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => onEdit(user)}
            className="btn btn-secondary"
            style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Edit2 size={12} /> Edit
          </button>
          <button
            onClick={() => onToggleStatus(user)}
            disabled={acting === user.userId}
            className="btn btn-secondary"
            style={{
              padding: '5px 12px', fontSize: '0.78rem',
              display: 'flex', alignItems: 'center', gap: 4,
              color: isDisabled ? 'var(--success, #16a34a)' : '#dc2626',
              borderColor: isDisabled ? 'var(--success)' : '#dc2626',
            }}
          >
            {isDisabled ? <><UserCheck size={12} /> Enable</> : <><UserX size={12} /> Disable</>}
          </button>
        </div>
      </td>
    </tr>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────

export const Personnel = () => {
  const [activeTab, setActiveTab]       = useState('FIELD_OFFICER');
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [search, setSearch]             = useState('');
  const [editTarget, setEditTarget]     = useState(null);   // user being edited
  const [confirmTarget, setConfirmTarget] = useState(null); // { user, action }
  const [saving, setSaving]             = useState(false);
  const [acting, setActing]             = useState(null);   // userId being toggled

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const all = await authAPI.getUsers();
      setUsers(all.filter(u => u.role === 'FIELD_OFFICER' || u.role === 'VEHICLE_OPERATOR'));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter by tab + search
  const visible = users
    .filter(u => u.role === activeTab)
    .filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.userId?.toLowerCase().includes(q) ||
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.district?.toLowerCase().includes(q)
      );
    });

  // Edit save
  const handleSave = async (userId, payload) => {
    setSaving(true);
    try {
      const res = await authAPI.updateUser(userId, payload);
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, ...res.user } : u));
      setEditTarget(null);
      toast.success('Changes saved.');
    } catch (e) {
      toast.error(e.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  // Disable/Enable confirm → execute
  const handleToggleStatus = (user) => {
    const action = user.accountStatus === 'DISABLED' ? 'enable' : 'disable';
    setConfirmTarget({ user, action });
  };

  const executeToggle = async () => {
    const { user, action } = confirmTarget;
    setConfirmTarget(null);
    setActing(user.userId);
    const newStatus = action === 'enable' ? 'active' : 'disabled';
    try {
      const res = await authAPI.setUserStatus(user.userId, newStatus);
      setUsers(prev => prev.map(u => u.userId === user.userId ? { ...u, ...res.user } : u));
      toast.success(`${user.firstName || user.userId} ${action}d.`);
    } catch (e) {
      toast.error(e.message || 'Status update failed.');
    } finally {
      setActing(null);
    }
  };

  const tabCount = (role) => users.filter(u => u.role === role).length;

  return (
    <div>
      <PageHeader
        title="Personnel"
        description="Manage field officers and vehicle operators — edit details or enable/disable accounts"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {ROLE_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 20px', borderRadius: 8, fontWeight: 700, fontSize: '0.88rem',
              border: '1.5px solid',
              borderColor: activeTab === tab.key ? 'var(--sky, #2563eb)' : 'var(--line, #e2e8f0)',
              background: activeTab === tab.key ? 'var(--sky-bg, #eff6ff)' : 'var(--white)',
              color: activeTab === tab.key ? 'var(--sky, #2563eb)' : 'var(--slate)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <Users size={15} />
            {tab.label}
            <span style={{
              fontSize: '0.7rem', background: activeTab === tab.key ? 'var(--sky)' : 'var(--line)',
              color: activeTab === tab.key ? '#fff' : 'var(--slate)',
              borderRadius: 20, padding: '1px 7px', fontWeight: 700,
            }}>
              {tabCount(tab.key)}
            </span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-secondary" onClick={load} disabled={loading}
          style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem' }}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        background: 'var(--white)', border: '1px solid var(--line)', borderRadius: 8,
        padding: '8px 14px',
      }}>
        <Search size={15} style={{ color: 'var(--slate)', flexShrink: 0 }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, email, district…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: '0.88rem', color: 'var(--ink)', background: 'transparent' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {error && (
          <div style={{ padding: 16, color: 'var(--danger, #dc2626)', fontSize: '0.88rem' }}>⚠ {error}</div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--slate)', fontSize: '0.9rem' }}>
            <RefreshCw size={22} className="spin" style={{ marginBottom: 10 }} />
            <div>Loading personnel…</div>
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--slate)' }}>
            <Users size={36} style={{ opacity: 0.25, marginBottom: 12 }} />
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {search ? 'No results for your search' : `No ${activeTab === 'FIELD_OFFICER' ? 'field officers' : 'vehicle operators'} registered yet`}
            </div>
            <div style={{ fontSize: '0.85rem' }}>
              {!search && 'Use Register Officer / Register Operator to add staff.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface, #f8fafc)', borderBottom: '1px solid var(--line)' }}>
                  {['Name / ID', 'Email', 'Location', 'Status', 'Registered', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: '0.72rem', fontWeight: 800, color: 'var(--slate)',
                      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map(u => (
                  <PersonnelRow
                    key={u.userId}
                    user={u}
                    acting={acting}
                    onEdit={setEditTarget}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary footer */}
      {!loading && visible.length > 0 && (
        <div style={{ marginTop: 10, fontSize: '0.78rem', color: 'var(--slate)', textAlign: 'right' }}>
          Showing {visible.length} of {users.filter(u => u.role === activeTab).length} {activeTab === 'FIELD_OFFICER' ? 'officers' : 'operators'}
          {' '}·{' '}
          {users.filter(u => u.role === activeTab && u.accountStatus === 'DISABLED').length} disabled
        </div>
      )}

      {/* Modals */}
      {editTarget && (
        <EditModal user={editTarget} onSave={handleSave} onClose={() => setEditTarget(null)} saving={saving} />
      )}
      {confirmTarget && (
        <ConfirmDialog
          message={`Are you sure you want to ${confirmTarget.action} ${confirmTarget.user.firstName || confirmTarget.user.userId}'s account?`}
          confirmLabel={confirmTarget.action === 'enable' ? 'Enable Account' : 'Disable Account'}
          confirmStyle={confirmTarget.action === 'disable' ? { background: '#dc2626', borderColor: '#dc2626' } : {}}
          onConfirm={executeToggle}
          onCancel={() => setConfirmTarget(null)}
        />
      )}
    </div>
  );
};
