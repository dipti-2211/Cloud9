import React from 'react';

export const Skeleton = ({ width = '100%', height = '20px', className = '' }) => {
  return (
    <div 
      className={`skeleton ${className}`} 
      style={{ width, height, marginBottom: '8px' }}
    />
  );
};