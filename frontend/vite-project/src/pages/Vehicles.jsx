import { useState, useEffect } from 'react';
import { vehiclesAPI } from '../services/api';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import { VehicleLiveModal } from '../components/vehicles/VehicleLiveModal';
import { VehicleMapModal } from '../components/vehicles/VehicleMapModal';
import { DEMO_REROUTE_TRUCKS } from '../data/mockData';
import { ShieldAlert, RefreshCw, Clock, MapPin } from 'lucide-react';

export const Vehicles = () => {
  const [vehicles,    setVehicles]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [liveVehicle, setLiveVehicle] = useState(null);
  const [mapVehicle,  setMapVehicle]  = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await vehiclesAPI.getAll();
      const existingIds = new Set((data || []).map(v => v.id || v.vehicleNumber || v.registrationNumber));
      const demoToAdd = DEMO_REROUTE_TRUCKS.filter(d => !existingIds.has(d.id));
      setVehicles([...(data || []), ...demoToAdd]);
    }
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
                  <th style={{ minWidth: 190 }}>Actions</th>
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
                      {v.status === 'REROUTED' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(239, 68, 68, 0.12)',
                          color: '#dc2626',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          fontWeight: 700,
                          fontSize: '0.74rem',
                          whiteSpace: 'nowrap',
                        }}>
                          <ShieldAlert size={11} />
                          REROUTED (+{v.delayMinutes || 45}m)
                        </span>
                      ) : v.status === 'DELAYED' ? (
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
                      {v.criticalRoad && (
                        <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 2 }}>
                          ⛔ {v.criticalRoad}
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
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          className="btn btn-primary"
                          style={{
                            padding: '5px 10px',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                            color: '#fff',
                            whiteSpace: 'nowrap',
                          }}
                          onClick={() => setMapVehicle(v)}
                          title="View on Map"
                        >
                          <MapPin size={13} /> View on Map
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '5px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                          onClick={() => setLiveVehicle(v)}
                          title="View Live Details"
                        >
                          View Live
                        </button>
                      </div>
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

      {mapVehicle && (
        <VehicleMapModal vehicle={mapVehicle} onClose={() => setMapVehicle(null)} />
      )}
    </div>
  );
};