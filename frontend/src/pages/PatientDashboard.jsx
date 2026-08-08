import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Calendar, Send } from 'lucide-react';
import { useApi, todayDate } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Field } from '../components/Field';
import { StatusPill } from '../components/StatusPill';

export function PatientDashboard() {
  const { request } = useApi();
  const { user, authedQuery } = useAuth();
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [appointment, setAppointment] = useState({ serviceId: '', date: '', time: '', notes: '' });
  const [support, setSupport] = useState({ subject: '', message: '' });
  const [feedback, setFeedback] = useState({ service: '', rating: 5, comment: '' });
  const [formError, setFormError] = useState('');

  const refresh = useCallback(async () => {
    const [servicesData, appointmentsData, messagesData] = await Promise.all([
      request('/services'),
      request(`/appointments?${authedQuery}`),
      request(`/messages?${authedQuery}`)
    ]);
    setServices(servicesData);
    setAppointments(appointmentsData);
    setMessages(messagesData);
  }, [request, authedQuery]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function book(event) {
    event.preventDefault();
    setFormError('');
    const selected = new Date(`${appointment.date}T${appointment.time}:00`);
    if (!appointment.serviceId || !appointment.date || !appointment.time || Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now()) {
      setFormError('Choose a service and an upcoming date and time.');
      return;
    }
    try {
      await request('/appointments', { method: 'POST', body: JSON.stringify({ ...appointment, userId: user.userId }) });
      setAppointment({ serviceId: '', date: '', time: '', notes: '' });
      refresh();
    } catch (err) {
      setFormError(err.message);
    }
  }

  async function sendConcern(event) {
    event.preventDefault();
    await request('/messages/support', { method: 'POST', body: JSON.stringify({ ...support, userId: user.userId }) });
    setSupport({ subject: '', message: '' });
    refresh();
  }

  async function sendFeedback(event) {
    event.preventDefault();
    await request('/feedback', { method: 'POST', body: JSON.stringify({ ...feedback, userId: user.userId }) });
    setFeedback({ service: '', rating: 5, comment: '' });
    refresh();
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Patient Dashboard</h2>
          <p>Book care, review your appointment status, send support concerns, and submit feedback.</p>
        </div>
      </div>
      <div className="workspace">
        <form className="panel" onSubmit={book}>
          <h3>Book Appointment</h3>
          {formError && <p className="error slim">{formError}</p>}
          <Field label="Service">
            <select value={appointment.serviceId} onChange={(e) => setAppointment({ ...appointment, serviceId: e.target.value })} required>
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.serviceId} value={service.serviceId}>
                  {service.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="form-grid">
            <Field label="Date">
              <input
                type="date"
                min={todayDate()}
                value={appointment.date}
                onChange={(e) => setAppointment({ ...appointment, date: e.target.value })}
                required
              />
            </Field>
            <Field label="Time">
              <input type="time" value={appointment.time} onChange={(e) => setAppointment({ ...appointment, time: e.target.value })} required />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={appointment.notes} onChange={(e) => setAppointment({ ...appointment, notes: e.target.value })} />
          </Field>
          <p className="empty">A registered doctor offering this service will be assigned automatically and must approve the request.</p>
          <button className="primary" type="submit">
            <Calendar size={16} /> Request appointment
          </button>
        </form>

        <div className="panel">
          <h3>Appointment History</h3>
          <div className="table scroll-area">
            {appointments.map((item) => (
              <div className="row" key={item.appointmentId}>
                <span>{item.appointmentId}</span>
                <span>
                  {item.service} &middot; {item.doctorName || 'Unassigned'}
                </span>
                <span>
                  {item.date} {item.time}
                </span>
                <StatusPill value={item.status} />
              </div>
            ))}
            {!appointments.length && <p className="empty">No appointments yet.</p>}
          </div>
        </div>

        <form className="panel" onSubmit={sendConcern}>
          <h3>Support Messages</h3>
          <Field label="Subject">
            <input value={support.subject} onChange={(e) => setSupport({ ...support, subject: e.target.value })} required />
          </Field>
          <Field label="Concern">
            <textarea value={support.message} onChange={(e) => setSupport({ ...support, message: e.target.value })} required />
          </Field>
          <button className="primary" type="submit">
            <Send size={16} /> Send concern
          </button>
          <div className="message-list scroll-area small-scroll">
            {messages.map((message) => (
              <div key={message.messageId}>
                <strong>{message.subject}</strong>
                <span>{message.status}</span>
                {(message.replies || []).map((reply, index) => (
                  <p className="reply" key={index}>
                    <b>{reply.from}:</b> {reply.body}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </form>

        <form className="panel" onSubmit={sendFeedback}>
          <h3>Service Feedback</h3>
          <Field label="Service">
            <select value={feedback.service} onChange={(e) => setFeedback({ ...feedback, service: e.target.value })} required>
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.serviceId} value={service.name}>
                  {service.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Rating">
            <input
              type="number"
              min="1"
              max="5"
              value={feedback.rating}
              onChange={(e) => setFeedback({ ...feedback, rating: e.target.value })}
              required
            />
          </Field>
          <Field label="Comment">
            <textarea value={feedback.comment} onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} required />
          </Field>
          <button className="primary" type="submit">
            <Activity size={16} /> Submit feedback
          </button>
        </form>
      </div>
    </section>
  );
}
