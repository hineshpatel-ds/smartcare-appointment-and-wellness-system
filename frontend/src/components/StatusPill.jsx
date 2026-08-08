import React from 'react';

export function StatusPill({ value }) {
  const status = String(value || 'PENDING_APPROVAL').toLowerCase();
  return <span className={`pill ${status}`}>{value}</span>;
}
