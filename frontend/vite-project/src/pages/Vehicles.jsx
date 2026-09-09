import { vehicles } from '../data/mockData';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';
import { VehicleLiveModal } from '../components/vehicles/VehicleLiveModal';
import { ShieldAlert } from 'lucide-react';
import { useState } from 'react';

export const Vehicles = () => {
  const [liveVehicle, setLiveVehicle] = useState(null);

  return (
    <div>
      <PageHeader title="Vehicle Fleet Monitoring" description="Real-time tracking of logistics assets." />

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vehicle ID</th>
                <th>Cargo</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Destination</th>
                <th>ETA</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className={v.priority === 'CRITICAL' ? 'row-critical' : ''}>
                  <td style={{ fontWeight: 600 }}>
                    {v.id}
                    {v.priority === 'CRITICAL' && (
                      <ShieldAlert size={14} color="var(--danger)" style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
                    )}
                  </td>
                  <td>{v.cargo}</td>
                  <td><Badge>{v.priority}</Badge></td>
                  <td><Badge>{v.status}</Badge></td>
                  <td>{v.destination}</td>
                  <td style={{ color: v.priority === 'CRITICAL' ? 'var(--danger)' : 'inherit', fontWeight: v.priority === 'CRITICAL' ? 600 : 400 }}>
                    {v.eta}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      onClick={() => setLiveVehicle(v)}
                    >
                      View Live
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Full-screen vehicle live modal */}
      {liveVehicle && (
        <VehicleLiveModal vehicle={liveVehicle} onClose={() => setLiveVehicle(null)} />
      )}
    </div>
  );
};