import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Field } from '../components/Field';

const emptyRegister = {
  userId: '',
  email: '',
  phone: '',
  password: '',
  role: 'patient',
  securityQuestion: 'What city were you born in?',
  securityAnswer: '',
  healthcareCode: '',
  cipherShift: 3,
  serviceIds: [],
  licenseNumber: '',
  bio: ''
};

export function AuthPage() {
  const { request } = useApi();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login');
  const [stage, setStage] = useState('password');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [services, setServices] = useState([]);
  const [loginForm, setLoginForm] = useState({ userId: '', password: '', answer: '', healthcareCode: '' });
  const [challenge, setChallenge] = useState(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [register, setRegister] = useState(emptyRegister);

  useEffect(() => {
    request('/services')
      .then(setServices)
      .catch(() => setServices([]));
  }, [request]);

  function toggleServiceId(serviceId) {
    setRegister((current) => ({
      ...current,
      serviceIds: current.serviceIds.includes(serviceId)
        ? current.serviceIds.filter((id) => id !== serviceId)
        : [...current.serviceIds, serviceId]
    }));
  }

  async function submitRegister(event) {
    event.preventDefault();
    setError('');
    try {
      const result = await request('/auth/register', { method: 'POST', body: JSON.stringify(register) });
      setLoginForm({ ...loginForm, userId: register.userId, password: register.password });
      if (result.confirmationRequired) {
        setPendingConfirmation(result.userId);
        setMessage('Enter the confirmation code sent to your email.');
      } else if (register.role === 'doctor') {
        setMessage('Registration received. A wellness coordinator will review and approve your account before you can sign in.');
        setMode('login');
      } else {
        setMessage('Registration complete. You can sign in now.');
        setMode('login');
      }
      setRegister(emptyRegister);
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
        const result = await request('/auth/login/start', { method: 'POST', body: JSON.stringify(loginForm) });
        setChallenge(result);
        setStage('question');
        setMessage('Password accepted. Answer your security question.');
        return;
      }
      if (stage === 'question') {
        const result = await request('/auth/login/security-question', {
          method: 'POST',
          body: JSON.stringify({ userId: loginForm.userId, answer: loginForm.answer })
        });
        setChallenge(result);
        setStage('cipher');
        setMessage('Security answer accepted. Complete the healthcare code challenge.');
        return;
      }
      const result = await request('/auth/login/cipher', {
        method: 'POST',
        body: JSON.stringify({ userId: loginForm.userId, healthcareCode: loginForm.healthcareCode })
      });
      login({ ...result.user, token: result.token });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="section two-col auth-section">
      <div>
        <h2>Secure Access</h2>
        <p>
          Sign in with your password, answer your security question, and complete the healthcare code challenge.
          Patients, doctors, and wellness coordinators all use the same 3-stage process.
        </p>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            <LogIn size={16} /> Sign in
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            <UserPlus size={16} /> Register
          </button>
        </div>
      </div>

      {pendingConfirmation ? (
        <form className="panel" onSubmit={submitConfirmation}>
          <h3>Confirm Registration</h3>
          <Field label="Confirmation Code">
            <input value={confirmationCode} onChange={(e) => setConfirmationCode(e.target.value)} required />
          </Field>
          <button className="primary" type="submit">
            <ShieldCheck size={16} /> Confirm account
          </button>
          {message && <p className="notice">{message}</p>}
          {error && <p className="error slim">{error}</p>}
        </form>
      ) : mode === 'register' ? (
        <form className="panel" onSubmit={submitRegister}>
          <h3>Create Account</h3>
          <div className="auth-tabs compact">
            <button
              type="button"
              className={register.role === 'patient' ? 'active' : ''}
              onClick={() => setRegister({ ...emptyRegister, role: 'patient' })}
            >
              Patient
            </button>
            <button
              type="button"
              className={register.role === 'doctor' ? 'active' : ''}
              onClick={() => setRegister({ ...emptyRegister, role: 'doctor' })}
            >
              Doctor / Specialist
            </button>
          </div>
          <div className="form-grid">
            <Field label="User ID">
              <input value={register.userId} onChange={(e) => setRegister({ ...register, userId: e.target.value })} required />
            </Field>
            <Field label="Email">
              <input type="email" value={register.email} onChange={(e) => setRegister({ ...register, email: e.target.value })} required />
            </Field>
            <Field label="Phone">
              <input value={register.phone} onChange={(e) => setRegister({ ...register, phone: e.target.value })} />
            </Field>
            <Field label="Password">
              <input type="password" value={register.password} onChange={(e) => setRegister({ ...register, password: e.target.value })} required />
            </Field>
            <Field label="Security Question">
              <input
                value={register.securityQuestion}
                onChange={(e) => setRegister({ ...register, securityQuestion: e.target.value })}
                required
              />
            </Field>
            <Field label="Security Answer">
              <input
                value={register.securityAnswer}
                onChange={(e) => setRegister({ ...register, securityAnswer: e.target.value })}
                required
              />
            </Field>
            <Field label="Healthcare Code">
              <input
                value={register.healthcareCode}
                onChange={(e) => setRegister({ ...register, healthcareCode: e.target.value })}
                required
              />
            </Field>
          </div>

          {register.role === 'doctor' && (
            <>
              <Field label="License / credential number">
                <input
                  value={register.licenseNumber}
                  onChange={(e) => setRegister({ ...register, licenseNumber: e.target.value })}
                  required
                />
              </Field>
              <Field label="Short bio">
                <textarea value={register.bio} onChange={(e) => setRegister({ ...register, bio: e.target.value })} />
              </Field>
              <Field label="Which services do you offer?">
                <div className="chip-row selectable">
                  {services.map((service) => (
                    <button
                      type="button"
                      key={service.serviceId}
                      className={`chip ${register.serviceIds.includes(service.serviceId) ? 'selected' : ''}`}
                      onClick={() => toggleServiceId(service.serviceId)}
                    >
                      {service.name}
                    </button>
                  ))}
                </div>
              </Field>
              <p className="notice slim">Your account will be reviewed by a wellness coordinator before you can sign in.</p>
            </>
          )}

          <button className="primary" type="submit">
            <ShieldCheck size={16} /> Create account
          </button>
          {message && <p className="notice">{message}</p>}
          {error && <p className="error slim">{error}</p>}
        </form>
      ) : (
        <form className="panel" onSubmit={submitLogin}>
          <h3>Stage {stage === 'password' ? '1' : stage === 'question' ? '2' : '3'} Login</h3>
          {stage === 'password' && (
            <div className="form-grid">
              <Field label="User ID">
                <input value={loginForm.userId} onChange={(e) => setLoginForm({ ...loginForm, userId: e.target.value })} required />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                />
              </Field>
            </div>
          )}
          {stage === 'question' && (
            <Field label={challenge?.securityQuestion || 'Security question'}>
              <input value={loginForm.answer} onChange={(e) => setLoginForm({ ...loginForm, answer: e.target.value })} required />
            </Field>
          )}
          {stage === 'cipher' && (
            <>
              <p className="challenge">
                Caesar cipher clue: <strong>{challenge?.encryptedCode}</strong>
                <br />
                Decode it with the shift you registered with, then enter your original healthcare code below.
              </p>
              <Field label="Healthcare code">
                <input
                  value={loginForm.healthcareCode}
                  onChange={(e) => setLoginForm({ ...loginForm, healthcareCode: e.target.value })}
                  required
                />
              </Field>
            </>
          )}
          <button className="primary" type="submit">
            <Check size={16} /> Continue
          </button>
          {message && <p className="notice">{message}</p>}
          {error && <p className="error slim">{error}</p>}
        </form>
      )}
    </section>
  );
}
