import { useState, useEffect } from 'react';
import { vehiclesAPI } from '../services/api';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import { VehicleLiveModal } from '../components/vehicles/VehicleLiveModal';
import { ShieldAlert, RefreshCw } from 'lucide-react';

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
                    <td><Badge>{v.status ?? '—'}</Badge></td>
                    <td>{v.destination ?? '—'}</td>
                    <td style={{
                      color: v.priority === 'CRITICAL' ? 'var(--danger)' : 'inherit',
                      fontWeight: v.priority === 'CRITICAL' ? 600 : 400,
                    }}>
                      {v.eta ?? '—'}
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