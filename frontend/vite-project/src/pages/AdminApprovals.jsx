/**
 * AdminApprovals.jsx — Connected to real backend endpoints:
 *   GET  /api/auth/pending
 *   PUT  /api/auth/approve/:id
 *   PUT  /api/auth/reject/:id
 *
 * Only accessible to ADMIN role (enforced by sidebar + route).
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, RefreshCw, ShieldCheck, UserCheck, UserX, Clock } from 'lucide-react';
import { authAPI, auth } from '../services/api';
import { PageHeader } from '../components/common/PageHeader';

const ROLE_LABEL = { FIELD_OFFICER:'Field Officer', VEHICLE_OPERATOR:'Vehicle Operator' };

const EmptyState = () => (
  <div style={{ textAlign:'center', padding:'48px 24px', color:'var(--slate)' }}>
    <UserCheck size={40} style={{ opacity:.3, marginBottom:16 }} />
    <div style={{ fontWeight:700, fontSize:'1rem', marginBottom:6 }}>No pending approvals</div>
    <div style={{ fontSize:'0.88rem' }}>All registration requests have been reviewed.</div>
  </div>
);

export const AdminApprovals = () => {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [acting,   setActing]   = useState({}); // { [id]: 'approve' | 'reject' }

  const user = auth.getUser();
  const isAdmin = user?.role === 'ADMIN';

  const load = async () => {
    setLoading(true); setError('');
    try {
      const res = await authAPI.getPending();
      setUsers(res.data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id, name) => {
    setActing(a => ({ ...a, [id]: 'approve' }));
    try {
      await authAPI.approve(id);
      setUsers(u => u.filter(x => x._id !== id));
      toast.success(`✅ ${name} approved successfully.`);
    } catch (e) {
      toast.error(e.message || 'Approval failed.');
    } finally {
      setActing(a => { const n = { ...a }; delete n[id]; return n; });
    }
  };

  const handleReject = async (id, name) => {
    setActing(a => ({ ...a, [id]: 'reject' }));
    try {
      await authAPI.reject(id);
      setUsers(u => u.filter(x => x._id !== id));
      toast(`❌ ${name}'s request rejected.`, { icon: '⚠️' });
    } catch (e) {
      toast.error(e.message || 'Rejection failed.');
    } finally {
      setActing(a => { const n = { ...a }; delete n[id]; return n; });
    }
  };

  if (!isAdmin) {
    return (
      <div style={{ textAlign:'center', padding:64, color:'var(--slate)' }}>
        <ShieldCheck size={40} style={{ opacity:.3, marginBottom:16 }} />
        <div style={{ fontWeight:700 }}>Administrator access required.</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Admin — Pending Approvals"
        description="Review and approve or reject registration requests from Field Officers and Vehicle Operators."
        action={
          <button className="btn btn-secondary" onClick={load}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', fontSize:'0.82rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {error && (
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8,
          background:'var(--danger-bg)', border:'1px solid var(--danger)', color:'var(--danger)', fontSize:'0.85rem' }}>
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:48, color:'var(--slate)' }}>Loading requests…</div>
      ) : users.length === 0 ? (
        <div className="card"><EmptyState /></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {users.map(u => {
            const name    = `${u.firstName} ${u.lastName}`;
            const roleTag = ROLE_LABEL[u.role] ?? u.role;
            const isActing = acting[u._id];

            return (
              <div key={u._id} className="card" style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                flexWrap:'wrap', gap:16, padding:'18px 24px',
              }}>
                {/* Left: user info */}
                <div style={{ flex:1, minWidth:220 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ width:38, height:38, borderRadius:'50%',
                      background:'var(--sky-tint-2)', display:'flex', alignItems:'center',
                      justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:'1rem', fontWeight:700, color:'var(--sky-dark)' }}>
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </span>
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:'0.95rem', color:'var(--ink)' }}>{name}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--slate)', marginTop:1 }}>
                        {u.userId} · {roleTag}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 20px', fontSize:'0.8rem', color:'var(--text-secondary)' }}>
                    {u.email        && <div>📧 {u.email}</div>}
                    {u.mobileNumber && <div>📞 {u.mobileNumber}</div>}
                    {u.department   && <div>🏢 {u.department}</div>}
                    {u.designation  && <div>💼 {u.designation}</div>}
                    {u.employeeId   && <div>🪪 {u.employeeId}</div>}
                    {u.postingLocation && <div>📍 {u.postingLocation}</div>}
                    {u.licenseNumber   && <div>🚗 License: {u.licenseNumber}</div>}
                    {u.vehicleType     && <div>🚛 Vehicle: {u.vehicleType}</div>}
                  </div>

                  <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:6,
                    fontSize:'0.72rem', color:'var(--slate)' }}>
                    <Clock size={11} />
                    Submitted {new Date(u.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>

                {/* Right: actions */}
                <div style={{ display:'flex', gap:10, flexShrink:0 }}>
                  <button
                    onClick={() => handleApprove(u._id, name)}
                    disabled={!!isActing}
                    style={{
                      display:'flex', alignItems:'center', gap:6,
                      padding:'9px 18px', borderRadius:8, cursor: isActing ? 'not-allowed' : 'pointer',
                      background: isActing === 'approve' ? 'var(--success)' : 'var(--success-bg)',
                      color: 'var(--success)', border:'1px solid var(--success)',
                      fontWeight:700, fontSize:'0.85rem', opacity: isActing && isActing !== 'approve' ? .5 : 1,
                      transition:'background .15s, color .15s',
                    }}
                    onMouseEnter={e => { if (!isActing) { e.currentTarget.style.background='var(--success)'; e.currentTarget.style.color='#fff'; } }}
                    onMouseLeave={e => { if (!isActing) { e.currentTarget.style.background='var(--success-bg)'; e.currentTarget.style.color='var(--success)'; } }}
                  >
                    {isActing === 'approve' ? <RefreshCw size={14} style={{ animation:'spin .6s linear infinite' }} /> : <CheckCircle size={15} />}
                    Approve
                  </button>

                  <button
                    onClick={() => handleReject(u._id, name)}
                    disabled={!!isActing}
                    style={{
                      display:'flex', alignItems:'center', gap:6,
                      padding:'9px 18px', borderRadius:8, cursor: isActing ? 'not-allowed' : 'pointer',
                      background: isActing === 'reject' ? 'var(--danger)' : 'var(--danger-bg)',
                      color: 'var(--danger)', border:'1px solid var(--danger)',
                      fontWeight:700, fontSize:'0.85rem', opacity: isActing && isActing !== 'reject' ? .5 : 1,
                      transition:'background .15s, color .15s',
                    }}
                    onMouseEnter={e => { if (!isActing) { e.currentTarget.style.background='var(--danger)'; e.currentTarget.style.color='#fff'; } }}
                    onMouseLeave={e => { if (!isActing) { e.currentTarget.style.background='var(--danger-bg)'; e.currentTarget.style.color='var(--danger)'; } }}
                  >
                    {isActing === 'reject' ? <RefreshCw size={14} style={{ animation:'spin .6s linear infinite' }} /> : <XCircle size={15} />}
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};