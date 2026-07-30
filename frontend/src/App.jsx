import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  Calendar,
  Check,
  LogIn,
  Plus,
  Send,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  X
} from 'lucide-react';

const runtimeConfig = window.__SAWS_CONFIG__ || {};
const defaultApiBase = runtimeConfig.API_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function useApi() {
  const [apiBase] = useState(localStorage.getItem('sawsApiBase') || defaultApiBase);

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || payload.message || 'Request failed');
    return payload;
  }, [apiBase]);

  return { request };
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatusPill({ value }) {
  const status = String(value || 'PENDING').toLowerCase();
  return <span className={`pill ${status}`}>{value}</span>;
}

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="stat">
      <Icon size={18} />
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Services({ services, user, onSaveService }) {
  const [draft, setDraft] = useState({
    name: '',
    category: 'Wellness',
    specialist: '',
    price: 50,
    durationMinutes: 30,
    availability: '',
    description: ''
  });

  async function save(event) {
    event.preventDefault();
    await onSaveService(draft);
    setDraft({ ...draft, name: '', description: '' });
  }

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2>Healthcare and Wellness Services</h2>
          <p>Review available clinicians, wellness sessions, consultation times, packages, and service charges.</p>
        </div>
      </div>

      <div className="service-grid">
        {services.map((service) => (
          <article className="card service-card" key={service.serviceId || service.name}>
            <div className="card-top">
              <Stethoscope size={22} />
              <StatusPill value={service.category || 'Service'} />
            </div>
            <h3>{service.name}</h3>
            <p>{service.description}</p>
            <dl className="details">
              <div><dt>Clinician</dt><dd>{service.specialist}</dd></div>
              <div><dt>Timing</dt><dd>{service.availability}</dd></div>
              <div><dt>Duration</dt><dd>{service.durationMinutes} min</dd></div>
              <div><dt>Charge</dt><dd>${service.price}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      {user?.role === 'coordinator' && (
        <form className="panel compact" onSubmit={save}>
          <h3>Add or Update Service</h3>
          <div className="form-grid">
            <Field label="Name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></Field>
            <Field label="Category"><input value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} /></Field>
            <Field label="Clinician"><input value={draft.specialist} onChange={(e) => setDraft({ ...draft, specialist: e.target.value })} /></Field>
            <Field label="Price"><input type="number" min="0" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} /></Field>
            <Field label="Availability"><input value={draft.availability} onChange={(e) => setDraft({ ...draft, availability: e.target.value })} /></Field>
            <Field label="Description"><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          </div>
          <button className="primary" type="submit"><Plus size={16} /> Save service</button>
        </form>
      )}
    </section>
  );
}

function AuthPanel({ request, onLogin }) {
  const [mode, setMode] = useState('login');
  const [stage, setStage] = useState('password');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [login, setLogin] = useState({ userId: '', password: '', answer: '', healthcareCode: '' });
  const [challenge, setChallenge] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [register, setRegister] = useState({
    userId: '',
    email: '',
    phone: '',
    password: '',
    role: 'patient',
    securityQuestion: 'What city were you born in?',
    securityAnswer: '',
    healthcareCode: '',
    cipherShift: 3
  });

  async function submitRegister(event) {
    event.preventDefault();
    setError('');
    try {
      const result = await request('/auth/register', { method: 'POST', body: JSON.stringify(register) });
      setLogin({ ...login, userId: register.userId, password: register.password });
      if (result.confirmationRequired) {
        setPendingConfirmation(result.userId);
        setMessage('Enter the confirmation code sent to your email.');
      } else {
        setMessage('Registration complete. You can sign in now.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitConfirmation(event) {
    event.preventDefault();
    setError('');
    try {
      await request('/auth/register/confirm', {
        method: 'POST',
        body: JSON.stringify({ userId: pendingConfirmation, confirmationCode })
      });
      setPendingConfirmation(null);
      setConfirmationCode('');
      setMessage('Account confirmed. You can sign in now.');
      setMode('login');
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitLogin(event) {
    event.preventDefault();
    setError('');
    try {
      if (stage === 'password') {
        const result = await request('/auth/login/start', { method: 'POST', body: JSON.stringify(login) });
        setChallenge(result);
        setStage('question');
        setMessage('Password accepted. Answer your security question.');
        return;
      }
      if (stage === 'question') {
        const result = await request('/auth/login/security-question', {
          method: 'POST',
          body: JSON.stringify({ userId: login.userId, answer: login.answer })
        });
        setChallenge(result);
        setStage('cipher');
        setMessage('Security answer accepted. Complete the healthcare code challenge.');
        return;
      }
      const result = await request('/auth/login/cipher', {
        method: 'POST',
        body: JSON.stringify({ userId: login.userId, healthcareCode: login.healthcareCode })
      });
      onLogin({ ...result.user, token: result.token });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="section two-col auth-section">
      <div>
        <h2>Secure Patient Access</h2>
        <p>Sign in with your password, answer your security question, and complete the healthcare code challenge.</p>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button"><LogIn size={16} /> Sign in</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button"><UserPlus size={16} /> Register</button>
        </div>
      </div>

      {pendingConfirmation ? (
        <form className="panel" onSubmit={submitConfirmation}>
          <h3>Confirm Registration</h3>
          <Field label="Confirmation Code"><input value={confirmationCode} onChange={(e) => setConfirmationCode(e.target.value)} required /></Field>
          <button className="primary" type="submit"><ShieldCheck size={16} /> Confirm account</button>
          {message && <p className="notice">{message}</p>}
          {error && <p className="error slim">{error}</p>}
        </form>
      ) : mode === 'register' ? (
        <form className="panel" onSubmit={submitRegister}>
          <h3>Create Account</h3>
          <div className="form-grid">
            <Field label="User ID"><input value={register.userId} onChange={(e) => setRegister({ ...register, userId: e.target.value })} required /></Field>
            <Field label="Email"><input type="email" value={register.email} onChange={(e) => setRegister({ ...register, email: e.target.value })} required /></Field>
            <Field label="Phone"><input value={register.phone} onChange={(e) => setRegister({ ...register, phone: e.target.value })} /></Field>
            <Field label="Role"><select value={register.role} onChange={(e) => setRegister({ ...register, role: e.target.value })}><option value="patient">Registered Patient</option><option value="coordinator">Wellness Coordinator</option></select></Field>
            <Field label="Password"><input type="password" value={register.password} onChange={(e) => setRegister({ ...register, password: e.target.value })} required /></Field>
            <Field label="Security Question"><input value={register.securityQuestion} onChange={(e) => setRegister({ ...register, securityQuestion: e.target.value })} required /></Field>
            <Field label="Security Answer"><input value={register.securityAnswer} onChange={(e) => setRegister({ ...register, securityAnswer: e.target.value })} required /></Field>
            <Field label="Healthcare Code"><input value={register.healthcareCode} onChange={(e) => setRegister({ ...register, healthcareCode: e.target.value })} required /></Field>
          </div>
          <button className="primary" type="submit"><ShieldCheck size={16} /> Create account</button>
          {message && <p className="notice">{message}</p>}
          {error && <p className="error slim">{error}</p>}
        </form>
      ) : (
        <form className="panel" onSubmit={submitLogin}>
          <h3>Stage {stage === 'password' ? '1' : stage === 'question' ? '2' : '3'} Login</h3>
          {stage === 'password' && <div className="form-grid"><Field label="User ID"><input value={login.userId} onChange={(e) => setLogin({ ...login, userId: e.target.value })} required /></Field><Field label="Password"><input type="password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} required /></Field></div>}
          {stage === 'question' && <Field label={challenge?.securityQuestion || 'Security question'}><input value={login.answer} onChange={(e) => setLogin({ ...login, answer: e.target.value })} required /></Field>}
          {stage === 'cipher' && <><p className="challenge">Encrypted clue: <strong>{challenge?.encryptedCode}</strong>. Shift: {challenge?.cipherShift}</p><Field label="Original healthcare code"><input value={login.healthcareCode} onChange={(e) => setLogin({ ...login, healthcareCode: e.target.value })} required /></Field></>}
          <button className="primary" type="submit"><Check size={16} /> Continue</button>
          {message && <p className="notice">{message}</p>}
          {error && <p className="error slim">{error}</p>}
        </form>
      )}
    </section>
  );
}

function Dashboard({ user, services, appointments, messages, request, refresh }) {
  const [appointment, setAppointment] = useState({ service: '', date: '', time: '', notes: '' });
  const [support, setSupport] = useState({ subject: '', message: '' });
  const [feedback, setFeedback] = useState({ service: '', rating: 5, comment: '' });
  const [formError, setFormError] = useState('');

  async function book(event) {
    event.preventDefault();
    setFormError('');
    const selected = new Date(`${appointment.date}T${appointment.time}:00`);
    if (!appointment.date || !appointment.time || Number.isNaN(selected.getTime()) || selected.getTime() <= Date.now()) {
      setFormError('Choose an upcoming date and time.');
      return;
    }
    await request('/appointments', { method: 'POST', body: JSON.stringify({ ...appointment, userId: user.userId }) });
    setAppointment({ service: '', date: '', time: '', notes: '' });
    refresh();
  }

  async function setStatus(appointmentId, status) {
    await request(`/appointments/${appointmentId}`, { method: 'PATCH', body: JSON.stringify({ status, userId: user.userId, role: user.role }) });
    refresh();
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
      <div className="section-head"><div><h2>{user.role === 'coordinator' ? 'Coordinator Workspace' : 'Patient Dashboard'}</h2><p>{user.role === 'coordinator' ? 'Review requests, manage service updates, and respond to patient support.' : 'Book care, review your appointment status, send support concerns, and submit feedback.'}</p></div></div>
      <div className="workspace">
        {user.role !== 'coordinator' && (
          <form className="panel" onSubmit={book}>
            <h3>Book Appointment</h3>
            {formError && <p className="error slim">{formError}</p>}
            <Field label="Service"><select value={appointment.service} onChange={(e) => setAppointment({ ...appointment, service: e.target.value })} required><option value="">Select a service</option>{services.map((service) => <option key={service.serviceId || service.name} value={service.name}>{service.name}</option>)}</select></Field>
            <div className="form-grid"><Field label="Date"><input type="date" min={todayDate()} value={appointment.date} onChange={(e) => setAppointment({ ...appointment, date: e.target.value })} required /></Field><Field label="Time"><input type="time" value={appointment.time} onChange={(e) => setAppointment({ ...appointment, time: e.target.value })} required /></Field></div>
            <Field label="Notes"><textarea value={appointment.notes} onChange={(e) => setAppointment({ ...appointment, notes: e.target.value })} /></Field>
            <button className="primary" type="submit"><Calendar size={16} /> Request appointment</button>
          </form>
        )}

        <div className="panel">
          <h3>{user.role === 'coordinator' ? 'Appointment Requests' : 'Appointment History'}</h3>
          <div className="table scroll-area">
            {appointments.map((item) => <div className="row" key={item.appointmentId}><span>{item.appointmentId}</span><span>{item.service}</span><span>{item.date} {item.time}</span><StatusPill value={item.status} />{user.role === 'coordinator' && <span className="actions"><button title="Approve" onClick={() => setStatus(item.appointmentId, 'CONFIRMED')} type="button"><Check size={15} /></button><button title="Reject" onClick={() => setStatus(item.appointmentId, 'REJECTED')} type="button"><X size={15} /></button></span>}</div>)}
            {!appointments.length && <p className="empty">No appointments yet.</p>}
          </div>
        </div>

        <form className="panel" onSubmit={sendConcern}>
          <h3>Support Messages</h3>
          <Field label="Subject"><input value={support.subject} onChange={(e) => setSupport({ ...support, subject: e.target.value })} required /></Field>
          <Field label="Concern"><textarea value={support.message} onChange={(e) => setSupport({ ...support, message: e.target.value })} required /></Field>
          <button className="primary" type="submit"><Send size={16} /> Send concern</button>
          <div className="message-list scroll-area small-scroll">{messages.map((message) => <div key={message.messageId}><strong>{message.subject}</strong><span>{message.status} {message.assignedTo ? `- ${message.assignedTo}` : ''}</span></div>)}</div>
        </form>

        {user.role !== 'coordinator' && <form className="panel" onSubmit={sendFeedback}><h3>Service Feedback</h3><Field label="Service"><input value={feedback.service} onChange={(e) => setFeedback({ ...feedback, service: e.target.value })} required /></Field><Field label="Rating"><input type="number" min="1" max="5" value={feedback.rating} onChange={(e) => setFeedback({ ...feedback, rating: e.target.value })} required /></Field><Field label="Comment"><textarea value={feedback.comment} onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} required /></Field><button className="primary" type="submit"><Activity size={16} /> Submit feedback</button></form>}
      </div>
    </section>
  );
}

function AccessNotice({ onLogin }) {
  return <section className="section access-panel"><ShieldCheck size={28} /><h2>Sign in to view analytics</h2><p>Patient activity is private. Coordinators can access platform analytics after secure login.</p><button className="primary" onClick={onLogin} type="button"><LogIn size={16} /> Sign in</button></section>;
}

function Analytics({ summary, user }) {
  const trends = Object.entries(summary?.appointmentTrends || {});
  const popularity = Object.entries(summary?.servicePopularity || {});
  const maxPopularity = Math.max(1, ...popularity.map(([, value]) => value));

  return (
    <section className="section">
      <div className="section-head"><div><h2>{user.role === 'coordinator' ? 'Platform Analytics' : 'My Activity'}</h2><p>{user.role === 'coordinator' ? 'Coordinator view of platform usage and patient engagement.' : 'Your appointment and feedback activity.'}</p></div></div>
      <div className="stats">{user.role === 'coordinator' && <Stat label="Registered patients" value={summary?.totalPatients || 0} icon={ShieldCheck} />}{user.role === 'coordinator' && <Stat label="Login events" value={summary?.loginCount || 0} icon={LogIn} />}<Stat label="Appointments" value={summary?.appointmentCount || 0} icon={Calendar} /><Stat label="Pending requests" value={summary?.pendingAppointments || 0} icon={Activity} /></div>
      <div className="analytics-grid">
        <div className="panel"><h3>Service Popularity</h3><div className="scroll-area analytics-scroll">{popularity.map(([name, value]) => <div className="bar-row" key={name}><span>{name}</span><div><i style={{ width: `${(value / maxPopularity) * 100}%` }} /></div><b>{value}</b></div>)}{!popularity.length && <p className="empty">No appointment data yet.</p>}</div></div>
        <div className="panel"><h3>Appointment Trends</h3><div className="scroll-area analytics-scroll">{trends.map(([date, value]) => <p className="trend" key={date}>{date}<strong>{value}</strong></p>)}{!trends.length && <p className="empty">No trends yet.</p>}</div></div>
        <div className="panel wide"><h3>Feedback Sentiment</h3><div className="table scroll-area analytics-scroll">{(summary?.feedback || []).map((item) => <div className="row" key={item.feedbackId}><span>{item.service}</span><span>Rating {item.rating}/5</span><span>Sentiment {Number(item.sentimentScore).toFixed(2)}</span><span>{item.comment}</span></div>)}{!(summary?.feedback || []).length && <p className="empty">No feedback yet.</p>}</div></div>
      </div>
    </section>
  );
}

function Chatbot({ request, user }) {
  const [open, setOpen] = useState(true);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([{ from: 'bot', body: 'Ask about appointments, packages, support, or navigation.' }]);

  async function send(event) {
    event.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    setMessages((items) => [...items, { from: 'you', body: text }]);
    try {
      const result = await request('/chatbot', { method: 'POST', body: JSON.stringify({ message: text, userId: user?.userId }) });
      setMessages((items) => [...items, { from: 'bot', body: result.reply }]);
    } catch (error) {
      setMessages((items) => [...items, { from: 'bot', body: error.message }]);
    }
  }

  if (!open) return <button className="chat-toggle" onClick={() => setOpen(true)}><Bot size={18} /> Chat</button>;

  return <aside className="chatbot"><header><Bot size={18} /> Virtual Assistant <button onClick={() => setOpen(false)} type="button"><X size={14} /></button></header><div className="chat-log">{messages.map((message, index) => <p key={index} className={message.from}>{message.body}</p>)}</div><form onSubmit={send}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a question" /><button type="submit"><Send size={16} /></button></form></aside>;
}

function App() {
  const { request } = useApi();
  const [view, setView] = useState('services');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('sawsUser') || 'null'));
  const [services, setServices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const authedQuery = useMemo(() => user ? `userId=${encodeURIComponent(user.userId)}&role=${user.role}` : '', [user]);

  const refresh = useCallback(async () => {
    setError('');
    try {
      const servicesData = await request('/services');
      setServices(servicesData);
      if (user) {
        const [summaryData, appointmentsData, messagesData] = await Promise.all([request(`/analytics/summary?${authedQuery}`), request(`/appointments?${authedQuery}`), request(`/messages?${authedQuery}`)]);
        setSummary(summaryData);
        setAppointments(appointmentsData);
        setMessages(messagesData);
      } else {
        setSummary(null);
        setAppointments([]);
        setMessages([]);
      }
    } catch (err) {
      setError(err.message);
    }
  }, [request, user, authedQuery]);

  useEffect(() => { refresh(); }, [refresh]);

  function login(nextUser) {
    localStorage.setItem('sawsUser', JSON.stringify(nextUser));
    setUser(nextUser);
    setView('dashboard');
  }

  function logout() {
    localStorage.removeItem('sawsUser');
    setUser(null);
    setView('services');
  }

  async function saveService(service) {
    await request('/services', { method: 'POST', body: JSON.stringify({ ...service, userId: user?.userId, role: user?.role }) });
    refresh();
  }

  return (
    <>
      <nav className="nav"><button className="brand" onClick={() => setView('services')}><Stethoscope size={24} /> SAWS</button><div className="nav-actions"><button className={view === 'services' ? 'active' : ''} onClick={() => setView('services')}>Services</button>{user && <button className={view === 'analytics' ? 'active' : ''} onClick={() => setView('analytics')}><BarChart3 size={16} /> Analytics</button>}{user && <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}><Calendar size={16} /> Dashboard</button>}{!user ? <button className="primary small" onClick={() => setView('auth')}><LogIn size={16} /> Login</button> : <button onClick={logout}>Logout {user.userId}</button>}</div></nav>
      <main><section className="hero"><div><p className="eyebrow">Healthcare appointments and wellness support</p><h1>SmartCare Appointment and Wellness System</h1><p>Find care options, book upcoming consultations, track appointment status, and get help from the virtual assistant.</p></div></section>{error && <p className="error">{error}</p>}{view === 'services' && <Services services={services} user={user} onSaveService={saveService} />}{view === 'auth' && <AuthPanel request={request} onLogin={login} />}{view === 'dashboard' && user && <Dashboard user={user} services={services} appointments={appointments} messages={messages} request={request} refresh={refresh} />}{view === 'analytics' && user && <Analytics summary={summary} user={user} />}{view === 'analytics' && !user && <AccessNotice onLogin={() => setView('auth')} />}</main>
      <Chatbot request={request} user={user} />
    </>
  );
}

export default App;
