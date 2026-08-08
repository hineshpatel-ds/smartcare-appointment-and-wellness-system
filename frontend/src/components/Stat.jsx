import React from 'react';

export function Stat({ label, value, icon: Icon }) {
  return (
    <div className="stat">
      <Icon size={18} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
