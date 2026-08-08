const assert = require('assert');

process.env.ENABLE_DB_MIRRORING = 'false';
process.env.FORCE_LOCAL_STORE = 'true';
process.env.LOCAL_DATA_DIR = require('path').join(__dirname, '.smoke-test-data');
process.env.COORDINATOR_USER_ID = `coordinator-${Date.now()}`;
process.env.COORDINATOR_EMAIL = 'coordinator@example.com';
process.env.COORDINATOR_PASSWORD = 'Passw0rd!Coord';
process.env.COORDINATOR_SECURITY_QUESTION = 'What is your clinic code?';
process.env.COORDINATOR_SECURITY_ANSWER = 'bridge';
process.env.COORDINATOR_HEALTHCARE_CODE = 'care';

const fs = require('fs');
fs.rmSync(process.env.LOCAL_DATA_DIR, { recursive: true, force: true });

const {
  registerUser,
  startLogin,
  verifySecurityQuestion,
  verifyCipher,
  ensureCoordinatorSeed,
  listServices,
  listDoctors,
  listPendingDoctors,
  decideDoctorApproval,
  bookAppointment,
  listAppointments,
  updateAppointment,
  chatbotReply,
  submitConcern,
  submitFeedback,
  feedbackSummary,
  analyticsSummary
} = require('./service');

function tomorrowSlot() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return { date: date.toISOString().slice(0, 10), time: '09:30' };
}

async function run() {
  const coordinator = await ensureCoordinatorSeed();
  assert.ok(coordinator, 'coordinator seed should be created from env vars');

  const services = await listServices();
  assert.ok(services.length >= 1);

  // Coordinator cannot be self-registered.
  await assert.rejects(() => registerUser({
    userId: 'sneaky-coordinator',
    email: 'sneaky@example.com',
    password: 'Passw0rd!Test',
    role: 'coordinator',
    securityQuestion: 'q',
    securityAnswer: 'a',
    healthcareCode: 'code'
  }));

  // Register a doctor - starts PENDING_APPROVAL and cannot log in yet.
  const doctorId = `doctor-${Date.now()}`;
  const doctorPassword = 'Passw0rd!Doc';
  await registerUser({
    userId: doctorId,
    email: `${doctorId}@example.com`,
    password: doctorPassword,
    role: 'doctor',
    securityQuestion: 'What is your clinic code?',
    securityAnswer: 'bridge',
    healthcareCode: 'care',
    serviceIds: [services[0].serviceId],
    licenseNumber: 'LIC-001'
  });
  await assert.rejects(() => startLogin({ userId: doctorId, password: doctorPassword }));

  const pending = await listPendingDoctors({ userId: coordinator.userId, role: 'coordinator' });
  assert.ok(pending.some((doctor) => doctor.userId === doctorId));

  await decideDoctorApproval(doctorId, { status: 'ACTIVE', userId: coordinator.userId, role: 'coordinator' });
  const activeDoctors = await listDoctors();
  assert.ok(activeDoctors.some((doctor) => doctor.userId === doctorId));

  // Doctor can now log in through the same 3-stage flow.
  const doctorStage1 = await startLogin({ userId: doctorId, password: doctorPassword });
  assert.equal(doctorStage1.nextStage, 'security-question');
  await verifySecurityQuestion({ userId: doctorId, answer: 'bridge' });
  await verifyCipher({ userId: doctorId, healthcareCode: 'care' });

  // Register + log in a patient.
  const patientId = `patient-${Date.now()}`;
  const patientPassword = 'Passw0rd!Test';
  await registerUser({
    userId: patientId,
    email: `${patientId}@example.com`,
    password: patientPassword,
    role: 'patient',
    securityQuestion: 'What is your clinic code?',
    securityAnswer: 'bridge',
    healthcareCode: 'care'
  });
  await startLogin({ userId: patientId, password: patientPassword });
  await verifySecurityQuestion({ userId: patientId, answer: 'bridge' });
  await verifyCipher({ userId: patientId, healthcareCode: 'care' });

  // Patient books by service+date+time; a doctor offering that service is auto-assigned.
  const slot = tomorrowSlot();
  const appointment = await bookAppointment({
    userId: patientId,
    serviceId: services[0].serviceId,
    date: slot.date,
    time: slot.time
  });
  assert.ok(appointment.appointmentId.startsWith('apt-'));
  assert.equal(appointment.doctorId, doctorId);
  assert.equal(appointment.status, 'PENDING_APPROVAL');

  const patientAppointments = await listAppointments({ userId: patientId, role: 'patient' });
  assert.equal(patientAppointments.length, 1);
  const doctorAppointments = await listAppointments({ userId: doctorId, role: 'doctor' });
  assert.equal(doctorAppointments.length, 1);

  // Only the assigned doctor or a coordinator can approve/reject.
  await assert.rejects(() => updateAppointment(appointment.appointmentId, { status: 'CONFIRMED', userId: patientId, role: 'patient' }));
  const confirmed = await updateAppointment(appointment.appointmentId, { status: 'CONFIRMED', userId: doctorId, role: 'doctor' });
  assert.equal(confirmed.status, 'CONFIRMED');

  const bot = await chatbotReply({ userId: patientId, role: 'patient', message: `check appointment ${appointment.appointmentId}` });
  assert.ok(bot.reply.includes(appointment.appointmentId));

  const myAppointmentsReply = await chatbotReply({ userId: patientId, role: 'patient', message: 'what are my appointments' });
  assert.ok(myAppointmentsReply.reply.includes(appointment.appointmentId));

  const concern = await submitConcern({
    userId: patientId,
    subject: 'Need help',
    message: 'I need support with my appointment'
  });
  assert.ok(concern.messageId.startsWith('msg-'));

  const feedback = await submitFeedback({
    userId: patientId,
    service: services[0].name,
    rating: 5,
    comment: 'The coordinator was helpful and the booking was smooth.'
  });
  assert.ok(feedback.feedbackId.startsWith('fb-'));

  // Feedback/sentiment summary is public - no auth context passed.
  const publicSummary = await feedbackSummary();
  assert.ok(publicSummary.totalReviews >= 1);

  const summary = await analyticsSummary({ userId: coordinator.userId, role: 'coordinator' });
  assert.ok(summary.appointmentCount >= 1);
  assert.ok(summary.feedback.length >= 1);

  fs.rmSync(process.env.LOCAL_DATA_DIR, { recursive: true, force: true });
  console.log('SAWS smoke test passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
