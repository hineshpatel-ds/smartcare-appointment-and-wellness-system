import React, { useEffect, useState } from 'react';
import { Activity, Calendar, LogIn, ShieldCheck } from 'lucide-react';
import { useApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Stat } from '../../components/Stat';

const TITLES = {
  patient: 'My Activity',
  doctor: 'My Activity',
  coordinator: 'Platform Analytics'
};

export function AnalyticsPage() {
  const { request } = useApi();
  const { user, authedQuery } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    request(`/analytics/summary?${authedQuery}`)
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, [request, authedQuery]);

  const trends = Object.entries(summary?.appointmentTrends || {});
  const popularity = Object.entries(summary?.servicePopularity || {});
  const maxPopularity = Math.max(1, ...popularity.map(([, value]) => value));

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>{TITLES[user.role]}</h2>
          <p>
            {user.role === 'coordinator'
              ? 'Platform-wide usage, patient engagement, and feedback trends.'
              : 'Your appointment and feedback activity.'}
          </p>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="stats">
        {user.role === 'coordinator' && <Stat label="Registered patients" value={summary?.totalPatients || 0} icon={ShieldCheck} />}
        {user.role === 'coordinator' && <Stat label="Active doctors" value={summary?.totalDoctors || 0} icon={ShieldCheck} />}
        {user.role === 'coordinator' && <Stat label="Doctors pending approval" value={summary?.pendingDoctorApprovals || 0} icon={ShieldCheck} />}
        {user.role === 'coordinator' && <Stat label="Login events" value={summary?.loginCount || 0} icon={LogIn} />}
        <Stat label="Appointments" value={summary?.appointmentCount || 0} icon={Calendar} />
        <Stat label="Pending requests" value={summary?.pendingAppointments || 0} icon={Activity} />
      </div>
      <div className="analytics-grid">
        <div className="panel">
          <h3>Service Popularity</h3>
          <div className="scroll-area analytics-scroll">
            {popularity.map(([name, value]) => (
              <div className="bar-row" key={name}>
                <span>{name}</span>
                <div>
                  <i style={{ width: `${(value / maxPopularity) * 100}%` }} />
                </div>
                <b>{value}</b>
              </div>
            ))}
            {!popularity.length && <p className="empty">No appointment data yet.</p>}
          </div>
        </div>
        <div className="panel">
          <h3>Appointment Trends</h3>
          <div className="scroll-area analytics-scroll">
            {trends.map(([date, value]) => (
              <p className="trend" key={date}>
                {date}
                <strong>{value}</strong>
              </p>
            ))}
            {!trends.length && <p className="empty">No trends yet.</p>}
          </div>
        </div>
        {(summary?.feedback || []).length > 0 && (
          <div className="panel wide">
            <h3>Feedback Sentiment</h3>
            <div className="table scroll-area analytics-scroll">
              {summary.feedback.map((item) => (
                <div className="row" key={item.feedbackId}>
                  <span>{item.service}</span>
                  <span>Rating {item.rating}/5</span>
                  <span>Sentiment {Number(item.sentimentScore).toFixed(2)}</span>
                  <span>{item.comment}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

