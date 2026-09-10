import { useState, useEffect } from 'react';
import { vehiclesAPI } from '../services/api';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import { VehicleLiveModal } from '../components/vehicles/VehicleLiveModal';
import { ShieldAlert, RefreshCw, Clock } from 'lucide-react';

export const Vehicles = () => {
  const [vehicles,    setVehicles]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [liveVehicle, setLiveVehicle] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try   { setVehicles(await vehiclesAPI.getAll()); }
    catch (e) { setError(e.message); }
    finally   { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="Vehicle Fleet Monitoring"
        description="Real-time tracking of logistics assets across North-East India."
        action={
          <button className="btn btn-secondary" onClick={load}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', fontSize:'0.82rem' }}>
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      {error && (
        <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:8, background:'var(--danger-bg)',
          border:'1px solid var(--danger)', color:'var(--danger)', fontSize:'0.85rem' }}>
          ⚠ {error}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div style={{ textAlign:'center', padding:'32px', color:'var(--slate)' }}>Loading vehicles…</div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vehicle ID</th>
                  <th>Cargo / Type</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Destination</th>
                  <th>ETA</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--slate)', padding:'24px' }}>
                    No vehicles found.
                  </td></tr>
                ) : vehicles.map(v => (
                  <tr key={v._id ?? v.id} className={v.priority === 'CRITICAL' ? 'row-critical' : ''}>
                    <td style={{ fontWeight:600 }}>
                      {v.id ?? v.vehicleId ?? v.registrationNumber}
                      {v.priority === 'CRITICAL' && (
                        <ShieldAlert size={14} color="var(--danger)" style={{ marginLeft:8, verticalAlign:'middle' }} />
                      )}
                    </td>
                    <td>
                      <div>{v.cargo ?? v.type ?? '—'}</div>
                      {v.type && v.cargo && <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{v.type}</div>}
                    </td>
                    <td><Badge>{v.priority ?? '—'}</Badge></td>
                    <td>
                      {v.status === 'DELAYED' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#b45309',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          whiteSpace: 'nowrap',
                        }}>
                          <Clock size={11} />
                          {v.id === 'VAN-104' ? 'DELAYED (+45m Detour)' : `DELAYED (+${v.delayMinutes || 45}m Detour)`}
                        </span>
                      ) : (
                        <Badge>{v.status ?? '—'}</Badge>
                      )}
                    </td>
                    <td>
                      <div>{v.destination ?? '—'}</div>
                      {v.delayReason && (
                        <div style={{ fontSize: '0.7rem', color: '#b45309', marginTop: 2 }}>
                          ⚠ {v.delayReason}
                        </div>
                      )}
                    </td>
                    <td style={{
                      color: v.priority === 'CRITICAL' ? 'var(--danger)' : 'inherit',
                      fontWeight: v.priority === 'CRITICAL' ? 600 : 400,
                    }}>
                      {v.id === 'VAN-104' ? '4h 10m (+45m Detour Delay)' : (v.eta ?? '—')}
                    </td>
                    <td>
                      <button className="btn btn-secondary"
                        style={{ padding:'6px 12px', fontSize:'0.8rem' }}
                        onClick={() => setLiveVehicle(v)}>
                        View Live
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {liveVehicle && (
        <VehicleLiveModal vehicle={liveVehicle} onClose={() => setLiveVehicle(null)} />
      )}
    </div>
  );
};