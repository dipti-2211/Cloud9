import { useState, useEffect, useCallback } from 'react';
import { roadsAPI } from '../services/api';
import { Badge } from '../components/common/Badge';
import { RefreshCw } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

export const Roads = () => {
  const [roads,   setRoads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const { socket } = useSocket();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try   { setRoads(await roadsAPI.getAll()); }
    catch (e) { setError(e.message); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const s = socket.current;
    if (!s) return;

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

    s.on('road_segment_updated', handleSegmentUpdate);
    s.on('incident_created', handleIncidentCreated);

    return () => {
      s.off('road_segment_updated', handleSegmentUpdate);
      s.off('incident_created', handleIncidentCreated);
    };
  }, [socket, load]);

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
        Live road status and risk scores updated in real time. Road blockages and incidents trigger automated alerts and rerouting.
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
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Road ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Risk Score</th>
                  <th>Incidents</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {roads.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--slate)', padding:'24px' }}>
                    No roads found.
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};