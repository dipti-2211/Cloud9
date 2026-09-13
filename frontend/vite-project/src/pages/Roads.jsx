import { useState, useEffect, useCallback } from 'react';
import { roadsAPI, auth } from '../services/api';
import { Badge } from '../components/common/Badge';
import { RefreshCw, Trash2, AlertTriangle, X } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

export const Roads = () => {
  const [roads,           setRoads]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [deleteModalRoad, setDeleteModalRoad] = useState(null);
  const [deleteReason,    setDeleteReason]    = useState('Road reconstructed');
  const [deleteDetails,   setDeleteDetails]   = useState('');
  const [deleting,        setDeleting]        = useState(false);

  const { socket } = useSocket();
  const user = auth.getUser();
  const isAdmin = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try   { setRoads(await roadsAPI.getAll()); }
    catch (e) { setError(e.message); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const s = socket?.current || socket;
    if (!s || typeof s.on !== 'function') return;

    const handleSegmentUpdate = (seg) => {
      const segKey = seg.segment_key || seg._id;
      const roadName = seg.road_name;
      setRoads(prev => {
        const idx = prev.findIndex(r => r.segment_key === segKey || r.id === segKey || r._id === seg._id || r.id === roadName);
        const score = Math.round((seg.current_risk_score ?? (seg.current_risk_level === 'high' ? 0.88 : 0.48)) * 100);
        const status = (seg.current_risk_level === 'high') ? 'BLOCKED' : (seg.current_risk_level === 'medium' ? 'CAUTION' : 'OPEN');
        const updatedItem = {
          id: roadName || segKey,
          segment_key: segKey,
          _id: seg._id,
          name: (seg.from_node && seg.to_node) ? `${roadName}: ${seg.from_node} – ${seg.to_node}` : (roadName || 'Road Segment'),
          status,
          riskScore: score,
          incidents: 1,
          lastUpdated: 'Just now',
          isNew: true,
        };

        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], ...updatedItem, incidents: Math.max(1, (next[idx].incidents || 0) + 1) };
          return next;
        } else {
          return [updatedItem, ...prev];
        }
      });
      load();
    };

    const handleIncidentCreated = (inc) => {
      const roadName = inc?.road_segment_id?.road_name || inc?.road_name;
      const segId = inc?.road_segment_id?._id || inc?.road_segment_id?.segment_key;
      if (roadName || segId) {
        setRoads(prev => prev.map(r => {
          if (r.id === roadName || r.segment_key === segId || r._id === segId || (r.name && roadName && r.name.includes(roadName))) {
            return {
              ...r,
              status: (inc.reported_risk_level === 'high' || inc.road_block === 'high') ? 'BLOCKED' : r.status,
              incidents: (r.incidents || 0) + 1,
              lastUpdated: 'Just now',
              isNew: true,
            };
          }
          return r;
        }));
      }
      load();
    };

    const handleRoadDeleted = (payload) => {
      const delId = payload?.id || payload?.roadId || payload?.segment_key;
      const delName = payload?.road_name;
      setRoads(prev => prev.filter(r =>
        r._id !== delId &&
        r.segment_key !== delId &&
        r.id !== delId &&
        r.id !== delName &&
        r._id !== payload?.roadId &&
        r.segment_key !== payload?.segment_key
      ));
    };

    s.on('road_segment_updated', handleSegmentUpdate);
    s.on('incident_created', handleIncidentCreated);
    s.on('road_deleted', handleRoadDeleted);

    return () => {
      s.off('road_segment_updated', handleSegmentUpdate);
      s.off('incident_created', handleIncidentCreated);
      s.off('road_deleted', handleRoadDeleted);
    };
  }, [socket, load]);

  const handleDeleteConfirm = async () => {
    if (!deleteModalRoad) return;
    const targetId = deleteModalRoad._id || deleteModalRoad.segment_key || deleteModalRoad.id;
    if (!targetId) return;

    setDeleting(true);
    try {
      await roadsAPI.delete(targetId, deleteReason, deleteDetails);
      // Optimistic removal from state
      setRoads(prev => prev.filter(r =>
        r._id !== targetId &&
        r.segment_key !== targetId &&
        r.id !== targetId &&
        r.id !== deleteModalRoad.id
      ));
      toast.success(`"${deleteModalRoad.name || targetId}" removed from risk list`);
      setDeleteModalRoad(null);
      setDeleteDetails('');
      setDeleteReason('Road reconstructed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove road');
    } finally {
      setDeleting(false);
    }
  };

  const isDeleteDisabled = !deleteReason || (deleteReason === 'Other' && !deleteDetails.trim());

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h2 style={{ margin:0 }}>Road Accessibility Overview</h2>
        <button className="btn btn-secondary" onClick={load} disabled={loading}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', fontSize:'0.82rem' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Data source note */}
      <div style={{ padding:'10px 14px', marginBottom:16, borderRadius:6, fontSize:'0.8rem',
        background:'rgba(14,165,233,.08)', border:'1px solid rgba(14,165,233,.25)',
        color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color:'var(--info)', fontWeight:700 }}>ℹ Fleet Ops Module</span>
        Live road status and risk scores updated in real time from backend database. Road blockages and incidents trigger automated alerts and rerouting.
      </div>

      {error && (
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8,
          background:'var(--danger-bg)', border:'1px solid var(--danger)', color:'var(--danger)', fontSize:'0.85rem' }}>
          ⚠ {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ textAlign:'center', padding:'32px', color:'var(--slate)' }}>Loading roads…</div>
        ) : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Road ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Risk Score</th>
                  <th>Incidents</th>
                  <th>Last Updated</th>
                  {isAdmin && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {roads.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign:'center', color:'var(--slate)', padding:'24px' }}>
                    No active roads found.
                  </td></tr>
                ) : roads.map(r => {
                  const statusType = (r.status === 'BLOCKED' || r.status === 'HIGH RISK')
                    ? 'danger'
                    : r.status === 'CAUTION'
                    ? 'warning'
                    : 'success';

                  return (
                    <tr key={r._id ?? r.segment_key ?? r.id} style={r.isNew ? { background: 'rgba(239, 68, 68, 0.04)' } : undefined}>
                      <td style={{ fontWeight:600 }}>
                        {r.id ?? r.roadId ?? '—'}
                        {r.isNew && (
                          <span style={{
                            marginLeft: 6,
                            fontSize: '0.62rem',
                            fontWeight: 800,
                            color: '#ef4444',
                            background: 'rgba(239,68,68,0.14)',
                            padding: '1px 5px',
                            borderRadius: 4,
                            border: '1px solid rgba(239,68,68,0.35)',
                            letterSpacing: '0.04em',
                          }}>
                            NEW
                          </span>
                        )}
                      </td>
                      <td>{r.name}</td>
                      <td><Badge type={statusType}>{r.status}</Badge></td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:100, height:6, background:'var(--surface-elevated)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{
                              width:`${r.riskScore ?? 0}%`, height:'100%',
                              background: (r.riskScore ?? 0) > 75 ? 'var(--danger)' : (r.riskScore ?? 0) > 40 ? 'var(--warning)' : 'var(--success)',
                            }} />
                          </div>
                          <span style={{ fontSize:'0.8rem', fontWeight: 600 }}>{r.riskScore ?? '—'}</span>
                        </div>
                      </td>
                      <td>{r.incidents > 0 ? <Badge type="danger">{r.incidents} Active</Badge> : '—'}</td>
                      <td style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>{r.lastUpdated ?? '—'}</td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModalRoad(r);
                              setDeleteReason('Road reconstructed');
                              setDeleteDetails('');
                            }}
                            className="btn btn-secondary"
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              color: '#dc2626',
                              borderColor: 'rgba(239,68,68,0.3)',
                              background: 'rgba(239,68,68,0.05)',
                            }}
                            title="Remove / Delete road entry"
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete / Remove Road Confirmation Modal */}
      {deleteModalRoad && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }} onClick={() => !deleting && setDeleteModalRoad(null)}>
          <div style={{
            background: 'var(--white)',
            borderRadius: 14,
            width: '100%',
            maxWidth: 500,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--line)',
            animation: 'popoverFadeIn 0.2s ease',
          }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', borderBottom: '1px solid var(--line)',
              background: 'rgba(239, 68, 68, 0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#dc2626',
                }}>
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--ink)' }}>
                    Remove Road from Risk List
                  </h3>
                  <div style={{ fontSize: '0.74rem', color: 'var(--slate)', marginTop: 2 }}>
                    {deleteModalRoad.name || deleteModalRoad.id}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalRoad(null)}
                disabled={deleting}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate)', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '20px' }}>
              <p style={{ margin: '0 0 16px', fontSize: '0.84rem', color: 'var(--slate)', lineHeight: 1.5 }}>
                Removing this road segment will remove it from active risk monitoring and dispatch re-routing calculations. An auditable log of this removal is stored.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{
                  display: 'block', fontSize: '0.75rem', fontWeight: 700,
                  color: 'var(--ink)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  Reason for Removal *
                </label>
                <select
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--line)', background: 'var(--white)',
                    fontSize: '0.86rem', color: 'var(--ink)', outline: 'none',
                  }}
                >
                  <option value="Road reconstructed">Road reconstructed / cleared</option>
                  <option value="Duplicate entry">Duplicate entry</option>
                  <option value="Incorrect data">Incorrect data / false alarm</option>
                  <option value="Segment decommissioned">Segment decommissioned</option>
                  <option value="Temporary closure ended">Temporary closure ended</option>
                  <option value="Other">Other reason (specify below)</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block', fontSize: '0.75rem', fontWeight: 700,
                  color: 'var(--ink)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
                }}>
                  Additional Details {deleteReason === 'Other' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={deleteDetails}
                  onChange={e => setDeleteDetails(e.target.value)}
                  placeholder={deleteReason === 'Other' ? "Please explain why this road is being removed..." : "e.g. Cleared by BRO Team on NH-2 Sector 4; dual carriage opened"}
                  style={{
                    width: '100%', padding: '9px 12px', borderRadius: 8,
                    border: '1px solid var(--line)', background: 'var(--white)',
                    fontSize: '0.84rem', color: 'var(--ink)', outline: 'none',
                    resize: 'vertical', fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Warning box */}
              <div style={{
                padding: '10px 12px', borderRadius: 8, fontSize: '0.78rem',
                background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>ℹ</span>
                <span>The road status will be set to <strong>REMOVED</strong> and immediately removed from all operator screens.</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              padding: '14px 20px', borderTop: '1px solid var(--line)', background: 'var(--surface-elevated)',
            }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteModalRoad(null)}
                disabled={deleting}
                style={{ padding: '8px 16px', fontSize: '0.84rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleteDisabled || deleting}
                style={{
                  padding: '8px 18px', fontSize: '0.84rem', fontWeight: 700,
                  borderRadius: 7, border: 'none', cursor: isDeleteDisabled || deleting ? 'not-allowed' : 'pointer',
                  background: isDeleteDisabled || deleting ? '#f87171' : '#dc2626',
                  color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'background 0.15s ease',
                }}
              >
                {deleting ? 'Removing…' : 'Confirm & Remove Road'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};