import React from 'react';

export const PageHeader = ({ title, description, actionButton }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>{title}</h2>
      {description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{description}</p>}
    </div>
    {actionButton && <div>{actionButton}</div>}
  </div>
);