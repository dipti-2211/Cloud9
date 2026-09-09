import { useState, useEffect } from 'react';
import { deliveriesAPI } from '../services/api';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import { RefreshCw } from 'lucide-react';

export const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try   { setDeliveries(await deliveriesAPI.getAll()); }
    catch (e) { setError(e.message); }
    finally   { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="Logistics Delivery Monitoring"
        description="Track active shipments, schedules, and route completion."
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

      <div className="card">
        {loading ? (
          <div style={{ textAlign:'center', padding:'32px', color:'var(--slate)' }}>Loading deliveries…</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Delivery ID</th>
                  <th>Vehicle &amp; Cargo</th>
                  <th>Route</th>
                  <th>Priority</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign:'center', color:'var(--slate)', padding:'24px' }}>
                    No deliveries found.
                  </td></tr>
                ) : deliveries.map(del => (
                  <tr key={del._id ?? del.id}>
                    <td style={{ fontWeight:600 }}>{del.id ?? del._id}</td>
                    <td>
                      <div style={{ fontWeight:500 }}>{del.vehicle}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{del.cargo}</div>
                    </td>
                    <td>
                      <div style={{ fontSize:'0.85rem' }}>{del.source ?? '—'} → {del.destination ?? '—'}</div>
                      <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>ETA: {del.eta ?? '—'}</div>
                    </td>
                    <td><Badge>{del.priority ?? '—'}</Badge></td>
                    <td style={{ width:200 }}>
                      <div style={{ fontSize:'0.8rem', display:'flex', justifyContent:'space-between' }}>
                        <span>{del.progress ?? 0}%</span>
                      </div>
                      <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{
                          width:`${del.progress ?? 0}%`,
                          backgroundColor: del.progress === 100 ? 'var(--success)' : del.status === 'DELAYED' ? 'var(--warning)' : 'var(--accent)',
                        }} />
                      </div>
                    </td>
                    <td><Badge>{del.status ?? '—'}</Badge></td>
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