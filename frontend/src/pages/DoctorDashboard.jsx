import React, { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusPill } from '../components/StatusPill';
import { ScheduleEditor } from '../components/ScheduleEditor';

export function DoctorDashboard() {
  const { request } = useApi();
  const { user, authedQuery } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [schedule, setSchedule] = useState([]);

  const refresh = useCallback(async () => {
    const [appointmentsData, doctorsData] = await Promise.all([request(`/appointments?${authedQuery}`), request('/doctors')]);
    setAppointments(appointmentsData);
    const self = doctorsData.find((doctor) => doctor.userId === user.userId);
    setSchedule(self?.schedule || []);
  }, [request, authedQuery, user.userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function decide(appointmentId, status) {
    await request(`/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, userId: user.userId, role: user.role })
    });
    refresh();
  }

  async function saveSchedule(nextSchedule) {
    await request(`/doctors/${user.userId}/schedule`, {
      method: 'PUT',
      body: JSON.stringify({ schedule: nextSchedule, userId: user.userId, role: user.role })
    });
    refresh();
  }

  const pending = appointments.filter((item) => item.status === 'PENDING_APPROVAL');
  const now = Date.now();
  const upcoming = appointments.filter(
    (item) => item.status === 'CONFIRMED' && new Date(`${item.date}T${item.time}:00`).getTime() > now
  );
  const past = appointments.filter((item) => !pending.includes(item) && !upcoming.includes(item));

  function AppointmentRow({ item, actionable }) {
    return (
      <div className="row" key={item.appointmentId}>
        <span>{item.appointmentId}</span>
        <span>
          {item.service} &middot; {item.patientName}
        </span>
        <span>
          {item.date} {item.time}
        </span>
        <StatusPill value={item.status} />
        {actionable && (
          <span className="actions">
            <button title="Approve" onClick={() => decide(item.appointmentId, 'CONFIRMED')} type="button">
              <Check size={15} />
            </button>
            <button title="Reject" onClick={() => decide(item.appointmentId, 'REJECTED')} type="button">
              <X size={15} />
            </button>
          </span>
        )}
      </div>
    );
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Doctor Dashboard</h2>
          <p>Review pending appointment requests, track your upcoming and past consultations, and manage your availability.</p>
        </div>
      </div>
      <div className="workspace">
        <div className="panel">
          <h3>Pending Approval</h3>
          <div className="table scroll-area">
            {pending.map((item) => (
              <AppointmentRow item={item} actionable key={item.appointmentId} />
            ))}
            {!pending.length && <p className="empty">No pending requests.</p>}
          </div>
        </div>

        <div className="panel">
          <h3>Upcoming</h3>
          <div className="table scroll-area">
            {upcoming.map((item) => (
              <AppointmentRow item={item} key={item.appointmentId} />
            ))}
            {!upcoming.length && <p className="empty">No upcoming appointments.</p>}
          </div>
        </div>

        <div className="panel">
          <h3>Past</h3>
          <div className="table scroll-area">
            {past.map((item) => (
              <AppointmentRow item={item} key={item.appointmentId} />
            ))}
            {!past.length && <p className="empty">No past appointments.</p>}
          </div>
        </div>

        <div className="panel">
          <h3>Weekly Availability</h3>
          <ScheduleEditor schedule={schedule} onSave={saveSchedule} />
        </div>
      </div>
    </section>
  );
}
