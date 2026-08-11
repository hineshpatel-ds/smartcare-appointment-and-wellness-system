import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { PatientDashboard } from './PatientDashboard';
import { DoctorDashboard } from './DoctorDashboard';
import { CoordinatorDashboard } from './CoordinatorDashboard';

export function Dashboard() {
  const { user } = useAuth();
  if (user.role === 'doctor') return <DoctorDashboard />;
  if (user.role === 'coordinator') return <CoordinatorDashboard />;
  return <PatientDashboard />;
}

