import React, { useCallback, useEffect, useState } from 'react';
import { Check, Plus, Send, X } from 'lucide-react';
import { useApi } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Field } from '../../components/Field';
import { StatusPill } from '../../components/StatusPill';

const emptyService = {
  name: '',
  category: 'Wellness',
  specialist: '',
  price: 50,
  durationMinutes: 30,
  availability: '',
  description: ''
};

export function CoordinatorDashboard() {
  const { request } = useApi();
  const { user, authedQuery } = useAuth();
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [serviceDraft, setServiceDraft] = useState(emptyService);

  const refresh = useCallback(async () => {
    const [pendingData, patientsData, doctorsData, appointmentsData, messagesData] = await Promise.all([
      request(`/doctors/pending?${authedQuery}`),
      request(`/users?targetRole=patient&${authedQuery}`),
      request(`/users?targetRole=doctor&${authedQuery}`),
      request(`/appointments?${authedQuery}`),
      request(`/messages?${authedQuery}`)
    ]);
    setPendingDoctors(pendingData);
    setPatients(patientsData);
    setDoctors(doctorsData);
    setAppointments(appointmentsData);
    setMessages(messagesData);
  }, [request, authedQuery]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function decideDoctor(doctorId, status) {
    await request(`/doctors/${doctorId}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ status, userId: user.userId, role: user.role })
    });
    refresh();
  }

  async function decideAppointment(appointmentId, status) {
    await request(`/appointments/${appointmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, userId: user.userId, role: user.role })
    });
    refresh();
  }

  async function saveService(event) {
    event.preventDefault();
    await request('/services', { method: 'POST', body: JSON.stringify({ ...serviceDraft, userId: user.userId, role: user.role }) });
    setServiceDraft(emptyService);
    refresh();
  }

  async function sendReply(messageId) {
    const body = replyDrafts[messageId];
    if (!body) return;
    await request(`/messages/${messageId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body, userId: user.userId, role: user.role })
    });
    setReplyDrafts((current) => ({ ...current, [messageId]: '' }));
    refresh();
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Coordinator Workspace</h2>
          <p>Approve doctor registrations, manage services, oversee appointments, and respond to patient support.</p>
        </div>
      </div>
      <div className="workspace">
        <div className="panel">
          <h3>Pending Doctor Approvals</h3>
          <div className="table scroll-area">
            {pendingDoctors.map((doctor) => (
              <div className="row" key={doctor.userId}>
                <span>{doctor.displayName}</span>
                <span>{doctor.email}</span>
                <span>{doctor.licenseNumber}</span>
                <StatusPill value={doctor.status} />
                <span className="actions">
                  <button title="Approve" onClick={() => decideDoctor(doctor.userId, 'ACTIVE')} type="button">
                    <Check size={15} />
                  </button>
                  <button title="Reject" onClick={() => decideDoctor(doctor.userId, 'REJECTED')} type="button">
                    <X size={15} />
                  </button>
                </span>
              </div>
            ))}
            {!pendingDoctors.length && <p className="empty">No doctor registrations awaiting approval.</p>}
          </div>
        </div>

        <form className="panel" onSubmit={saveService}>
          <h3>Add or Update Service</h3>
          <div className="form-grid">
            <Field label="Name">
              <input value={serviceDraft.name} onChange={(e) => setServiceDraft({ ...serviceDraft, name: e.target.value })} required />
            </Field>
            <Field label="Category">
              <input value={serviceDraft.category} onChange={(e) => setServiceDraft({ ...serviceDraft, category: e.target.value })} />
            </Field>
            <Field label="Clinician title">
              <input value={serviceDraft.specialist} onChange={(e) => setServiceDraft({ ...serviceDraft, specialist: e.target.value })} />
            </Field>
            <Field label="Price">
              <input type="number" min="0" value={serviceDraft.price} onChange={(e) => setServiceDraft({ ...serviceDraft, price: e.target.value })} />
            </Field>
            <Field label="Availability">
              <input value={serviceDraft.availability} onChange={(e) => setServiceDraft({ ...serviceDraft, availability: e.target.value })} />
            </Field>
            <Field label="Description">
              <input value={serviceDraft.description} onChange={(e) => setServiceDraft({ ...serviceDraft, description: e.target.value })} />
            </Field>
          </div>
          <button className="primary" type="submit">
            <Plus size={16} /> Save service
          </button>
        </form>

        <div className="panel">
          <h3>Registered Patients ({patients.length})</h3>
          <div className="table scroll-area small-scroll">
            {patients.map((patient) => (
              <div className="row" key={patient.userId}>
                <span>{patient.displayName}</span>
                <span>{patient.email}</span>
              </div>
            ))}
            {!patients.length && <p className="empty">No patients registered yet.</p>}
          </div>
        </div>

        <div className="panel">
          <h3>Registered Doctors ({doctors.length})</h3>
          <div className="table scroll-area small-scroll">
            {doctors.map((doctor) => (
              <div className="row" key={doctor.userId}>
                <span>{doctor.displayName}</span>
                <span>{doctor.email}</span>
                <StatusPill value={doctor.status} />
              </div>
            ))}
            {!doctors.length && <p className="empty">No doctors registered yet.</p>}
          </div>
        </div>

        <div className="panel wide">
          <h3>All Appointments</h3>
          <div className="table scroll-area">
            {appointments.map((item) => (
              <div className="row" key={item.appointmentId}>
                <span>
                  {item.service} &middot; {item.doctorName}
                </span>
                <span>{item.patientName}</span>
                <span>
                  {item.date} {item.time}
                </span>
                <StatusPill value={item.status} />
                {item.status === 'PENDING_APPROVAL' && (
                  <span className="actions">
                    <button title="Approve" onClick={() => decideAppointment(item.appointmentId, 'CONFIRMED')} type="button">
                      <Check size={15} />
                    </button>
                    <button title="Reject" onClick={() => decideAppointment(item.appointmentId, 'REJECTED')} type="button">
                      <X size={15} />
                    </button>
                  </span>
                )}
              </div>
            ))}
            {!appointments.length && <p className="empty">No appointments yet.</p>}
          </div>
        </div>

        <div className="panel wide">
          <h3>Support Messages</h3>
          <div className="message-list scroll-area">
            {messages.map((message) => (
              <div key={message.messageId}>
                <strong>{message.subject}</strong>
                <span>
                  {message.status} &middot; {message.userId}
                </span>
                {(message.replies || []).map((reply, index) => (
                  <p className="reply" key={index}>
                    <b>{reply.from}:</b> {reply.body}
                  </p>
                ))}
                <div className="reply-form">
                  <input
                    placeholder="Write a reply"
                    value={replyDrafts[message.messageId] || ''}
                    onChange={(e) => setReplyDrafts({ ...replyDrafts, [message.messageId]: e.target.value })}
                  />
                  <button type="button" onClick={() => sendReply(message.messageId)}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            ))}
            {!messages.length && <p className="empty">No support messages yet.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

