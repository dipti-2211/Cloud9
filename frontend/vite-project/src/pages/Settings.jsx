import React from 'react';
import { PageHeader } from '../components/common/PageHeader';

export const Settings = () => {
  return (
    <div>
      <PageHeader title="System Settings" description="Configure SIH26002 platform preferences." />
      
      <div className="dashboard-grid">
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>System Preferences</h3>
          <div className="form-group">
            <label className="form-label">Default Region</label>
            <select className="form-control">
              <option>North Eastern Region (All)</option>
              <option>Assam</option>
              <option>Meghalaya</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Refresh Interval (Data Pull)</label>
            <select className="form-control">
              <option>Auto-refresh every 30 seconds (current)</option>
              <option>Every 1 minute</option>
              <option>Every 5 minutes</option>
            </select>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '10px' }}>Save System Preferences</button>
        </div>

        <div className="card" style={{ gridColumn: 'span 6' }}>
          <h3 style={{ marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>Notification Routing</h3>
          <div className="form-group">
            <label className="form-label">Critical Alert Forwarding</label>
            <input type="email" className="form-control" defaultValue="admin-ops@sih26002.gov.in" />
          </div>
          <div className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '20px', opacity: 0.5 }}>
            <input type="checkbox" id="sms" disabled style={{ width: '18px', height: '18px' }} />
            <label htmlFor="sms" style={{ color: 'var(--text-secondary)' }}>
              Enable SMS alerts for field officers
              <span style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '1px 7px', background: 'var(--surface-elevated)', border: '1px solid var(--border)', borderRadius: '10px' }}>Coming soon</span>
            </label>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '20px' }}>Update Notifications</button>
        </div>
      </div>
    </div>
  );
};