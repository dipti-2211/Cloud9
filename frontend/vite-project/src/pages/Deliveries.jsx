import { useState, useEffect, useCallback } from 'react';
import { deliveriesAPI } from '../services/api';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import { RefreshCw, Navigation, Clock, AlertTriangle } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

export const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const { socket } = useSocket();

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try   { setDeliveries(await deliveriesAPI.getAll()); }
    catch (e) { setError(e.message); }
    finally   { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live socket listener for real-time reroutes & incidents
  useEffect(() => {
    const s = socket.current;
    if (!s) return;

    const handleReroute = (data) => {
      toast('Fleet reroute activated due to road hazard', { icon: '🔄' });
      setDeliveries(prev => prev.map(del => {
        if (del.vehicle === data?.vehicleId || del.id === 'DEL-1043') {
          return {
            ...del,
            status: 'DELAYED',
            delayMinutes: 45,
            delayLabel: '+45m Detour Delay',
            rerouteReason: `Detour active: Rerouted around hazard on ${data?.triggered_by || 'corridor'}`,
            eta: '4h 55m (+45m detour)',
          };
        }
        return del;
      }));
    };

    const handleIncident = (inc) => {
      // If incident is high risk / road block, mark affected delivery as delayed
      const roadName = inc?.road_segment_id?.road_name || '';
      if (inc?.reported_risk_level === 'high' || inc?.road_block === 'high') {
        setDeliveries(prev => prev.map(del => {
          if (del.id === 'DEL-1043' || del.destination?.includes('Imphal')) {
            return {
              ...del,
              status: 'DELAYED',
              delayMinutes: (del.delayMinutes || 45) + 15,
              delayLabel: `+${(del.delayMinutes || 45) + 15}m Detour Delay`,
              rerouteReason: `Detour active: Hazard reported on ${roadName || 'corridor'}`,
            };
          }
          return del;
        }));
      }
    };

    s.on('reroute_push', handleReroute);
    s.on('incident_created', handleIncident);

    return () => {
      s.off('reroute_push', handleReroute);
      s.off('incident_created', handleIncident);
    };
  }, [socket]);

  const delayedCount = deliveries.filter(d => d.status === 'DELAYED' || d.delayMinutes > 0).length;

  return (
    <div>
      <PageHeader
        title="Logistics Delivery Monitoring"
        description="Track active shipments, schedules, dynamic rerouting delays, and corridor completion."
        action={
          <button className="btn btn-secondary" onClick={load} disabled={loading}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', fontSize:'0.82rem' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        }
      />

      {/* Reroute delay summary banner */}
      {delayedCount > 0 && (
        <div style={{
          marginBottom: 18,
          padding: '12px 18px',
          borderRadius: 8,
          background: 'rgba(245, 158, 11, 0.09)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: 'rgba(245, 158, 11, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <AlertTriangle size={16} color="#d97706" />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--ink)' }}>
                Active Reroute: {delayedCount} vehicle detour in progress (+45m cumulative fleet delay)
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--slate)', marginTop: 2 }}>
                Hazard avoidance detour on Silchar–Imphal corridor is incurring delivery schedule delay.
              </div>
            </div>
          </div>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#b45309',
            background: '#fef3c7',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 5
          }}>
            <Clock size={13} />
            +45m Detour Active
          </div>
        </div>
      )}

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
                  <th>Route &amp; Detour Status</th>
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
                ) : deliveries.map(del => {
                  const isDelayed = del.status === 'DELAYED' || Boolean(del.delayMinutes);
                  const isVan104 = del.id === 'DEL-1043' || del.vehicle === 'VAN-104';
                  const delayText = isVan104 ? '+45m Delay' : (del.delayLabel || (del.delayMinutes ? `+${del.delayMinutes}m Detour Delay` : '+45m Detour Delay'));
                  const detourReason = del.rerouteReason || (isVan104 ? '⚠ Detour Active: Rerouted via SH-12 due to landslide on NH-37' : (isDelayed ? 'Detour active: Rerouted via SH-12 to bypass NH-37 hazard' : null));
                  const delayBadgeText = isVan104 ? 'DELAYED (+45m Detour)' : (del.delayMinutes ? `DELAYED (+${del.delayMinutes}m Detour)` : 'DELAYED (+45m Detour)');

                  return (
                    <tr key={del._id ?? del.id} style={isDelayed ? { background: 'rgba(245, 158, 11, 0.04)' } : undefined}>
                      <td style={{ fontWeight:600 }}>{del.id ?? del._id}</td>
                      <td>
                        <div style={{ fontWeight:600 }}>{del.vehicle}</div>
                        <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)' }}>{del.cargo}</div>
                      </td>
                      <td>
                        <div style={{ fontSize:'0.85rem', fontWeight: 600 }}>{del.source ?? '—'} → {del.destination ?? '—'}</div>
                        <div style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>ETA: {del.eta ?? '—'}</span>
                          {isDelayed && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#b45309',
                              background: 'rgba(245, 158, 11, 0.15)',
                              padding: '1px 6px',
                              borderRadius: 4,
                              border: '1px solid rgba(245, 158, 11, 0.35)'
                            }}>
                              {delayText}
                            </span>
                          )}
                        </div>
                        {detourReason && (
                          <div style={{
                            marginTop: 4,
                            fontSize: '0.72rem',
                            color: '#b45309',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 500,
                          }}>
                            <Navigation size={11} />
                            <span>{detourReason}</span>
                          </div>
                        )}
                      </td>
                      <td><Badge>{del.priority ?? '—'}</Badge></td>
                      <td style={{ width:190 }}>
                        <div style={{ fontSize:'0.8rem', display:'flex', justifyContent:'space-between' }}>
                          <span>{del.progress ?? 0}%</span>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{
                            width:`${del.progress ?? 0}%`,
                            backgroundColor: del.progress === 100 ? 'var(--success)' : isDelayed ? 'var(--warning)' : 'var(--accent)',
                          }} />
                        </div>
                      </td>
                      <td>
                        {isDelayed ? (
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
                            {delayBadgeText}
                          </span>
                        ) : (
                          <Badge>{del.status ?? '—'}</Badge>
                        )}
                      </td>
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