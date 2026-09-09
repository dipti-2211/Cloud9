import React from 'react';
import { deliveries } from '../data/mockData';
import { Badge } from '../components/common/Badge';
import { PageHeader } from '../components/common/PageHeader';

export const Deliveries = () => {
  return (
    <div>
      <PageHeader 
        title="Logistics Delivery Monitoring" 
        description="Track active shipments, schedules, and route completion."
      />
      
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Delivery ID</th>
                <th>Vehicle & Cargo</th>
                <th>Route</th>
                <th>Priority</th>
                <th>Progress</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(del => (
                <tr key={del.id}>
                  <td style={{ fontWeight: 600 }}>{del.id}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{del.vehicle}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{del.cargo}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{del.source} &rarr; {del.destination}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ETA: {del.eta}</div>
                  </td>
                  <td><Badge>{del.priority}</Badge></td>
                  <td style={{ width: '200px' }}>
                    <div style={{ fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{del.progress}%</span>
                    </div>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ 
                        width: `${del.progress}%`, 
                        backgroundColor: del.progress === 100 ? 'var(--success)' : del.status === 'DELAYED' ? 'var(--warning)' : 'var(--accent)'
                      }}></div>
                    </div>
                  </td>
                  <td><Badge>{del.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};