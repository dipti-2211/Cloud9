import { useState, useEffect } from 'react';
import { roadsAPI } from '../services/api';
import { Badge } from '../components/common/Badge';
import { RefreshCw } from 'lucide-react';

export const Roads = () => {
  const [roads,   setRoads]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try   { setRoads(await roadsAPI.getAll()); }
    catch (e) { setError(e.message); }
    finally   { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <h2 style={{ margin:0 }}>Road Accessibility Overview</h2>
        <button className="btn btn-secondary" onClick={load}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', fontSize:'0.82rem' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Data source note */}
      <div style={{ padding:'10px 14px', marginBottom:16, borderRadius:6, fontSize:'0.8rem',
        background:'rgba(14,165,233,.08)', border:'1px solid rgba(14,165,233,.25)',
        color:'var(--text-secondary)', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color:'var(--info)', fontWeight:700 }}>ℹ Fleet Ops Module</span>
        Road status and risk scores are fleet-logistics data. Real landslide risk predictions are shown on the Alerts page.
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
                ) : roads.map(r => (
                  <tr key={r._id ?? r.id}>
                    <td style={{ fontWeight:600 }}>{r.id ?? r.roadId ?? '—'}</td>
                    <td>{r.name}</td>
                    <td><Badge>{r.status}</Badge></td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:100, height:6, background:'var(--surface-elevated)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{
                            width:`${r.riskScore ?? 0}%`, height:'100%',
                            background: (r.riskScore ?? 0) > 75 ? 'var(--danger)' : (r.riskScore ?? 0) > 40 ? 'var(--warning)' : 'var(--success)',
                          }} />
                        </div>
                        <span style={{ fontSize:'0.8rem' }}>{r.riskScore ?? '—'}</span>
                      </div>
                    </td>
                    <td>{r.incidents > 0 ? <Badge type="danger">{r.incidents} Active</Badge> : '—'}</td>
                    <td style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>{r.lastUpdated ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};