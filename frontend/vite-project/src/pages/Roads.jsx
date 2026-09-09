import { roads } from '../data/mockData';
import { Badge } from '../components/common/Badge';

// Fix #8: Label clearly as illustrative fleet-ops data (not ML model output)
const DataSourceNote = () => (
  <div style={{
    padding: '10px 14px', marginBottom: '16px', borderRadius: '6px', fontSize: '0.8rem',
    background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.25)',
    color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px',
  }}>
    <span style={{ color: 'var(--info)', fontWeight: 700 }}>ℹ Fleet Ops Module</span>
    Road status and risk scores here are illustrative fleet-logistics scenario data,
    not output from the landslide ML model. Real landslide risk predictions are shown
    on the Dashboard map and Alerts page.
  </div>
);

export const Roads = () => {
  return (
    <div>
      <h2 style={{ marginBottom: '16px' }}>Road Accessibility Overview</h2>
      <DataSourceNote />
      <div className="card">
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
              {roads.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.id}</td>
                  <td>{r.name}</td>
                  <td><Badge>{r.status}</Badge></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '100px', height: '6px', background: 'var(--surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${r.riskScore}%`, height: '100%', background: r.riskScore > 75 ? 'var(--danger)' : r.riskScore > 40 ? 'var(--warning)' : 'var(--success)' }}></div>
                      </div>
                      <span style={{ fontSize: '0.8rem' }}>{r.riskScore}</span>
                    </div>
                  </td>
                  <td>{r.incidents > 0 ? <Badge type="danger">{r.incidents} Active</Badge> : '-'}</td>
                  <td>{r.lastUpdated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};