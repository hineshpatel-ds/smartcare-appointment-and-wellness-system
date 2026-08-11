const assert = require('assert');
const os = require('os');
const path = require('path');

process.env.FORCE_LOCAL_STORE = 'true';
process.env.ENABLE_DB_MIRRORING = 'false';
process.env.LOCAL_DATA_DIR = path.join(os.tmpdir(), `saws-analytics-test-${process.pid}`);

const store = require('../lib/store');
const { analyzeSentiment, submitFeedback, feedbackSummary, analyticsSummary } = require('../analytics/feedback');

function resetMemory() {
  for (const map of Object.values(store.memory)) map.map.clear();
}

async function run() {
  resetMemory();
  store.memory.users.set('patient-a', { userId: 'patient-a', role: 'patient' });
  store.memory.users.set('patient-b', { userId: 'patient-b', role: 'patient' });
  store.memory.users.set('doctor-a', { userId: 'doctor-a', role: 'doctor', status: 'ACTIVE' });
  store.memory.users.set('doctor-pending', { userId: 'doctor-pending', role: 'doctor', status: 'PENDING_APPROVAL' });
  store.memory.appointments.set('apt-a', { appointmentId: 'apt-a', userId: 'patient-a', doctorId: 'doctor-a', service: 'General', date: '2026-09-01', status: 'PENDING_APPROVAL' });
  store.memory.appointments.set('apt-b', { appointmentId: 'apt-b', userId: 'patient-b', doctorId: 'doctor-a', service: 'Wellness', date: '2026-09-02', status: 'CONFIRMED' });
  store.memory.loginStats.set('login-a', { loginId: 'login-a' });

  const positive = await analyzeSentiment('Great helpful and smooth visit');
  const negative = await analyzeSentiment('Slow confusing problem');
  assert.ok(positive.score > negative.score);

  await assert.rejects(() => submitFeedback({ userId: 'patient-a', service: 'General', rating: 5 }), /required/);
  const feedback = await submitFeedback({ userId: 'patient-a', service: 'General', rating: 5, comment: 'Great helpful service' });
  assert.ok(feedback.feedbackId.startsWith('fb-'));
  assert.equal(feedback.rating, 5);

  const summary = await feedbackSummary();
  assert.equal(summary.totalReviews, 1);
  assert.equal(summary.averageRating, 5);
  assert.equal(summary.perService.General.count, 1);

  await assert.rejects(() => analyticsSummary({}), /Authentication required/);
  const patientSummary = await analyticsSummary({ userId: 'patient-a', role: 'patient' });
  assert.equal(patientSummary.scope, 'patient');
  assert.equal(patientSummary.appointmentCount, 1);
  assert.equal(patientSummary.feedback.length, 1);

  const doctorSummary = await analyticsSummary({ userId: 'doctor-a', role: 'doctor' });
  assert.equal(doctorSummary.appointmentCount, 2);
  assert.equal(doctorSummary.feedback.length, 0);

  const coordinatorSummary = await analyticsSummary({ userId: 'coord', role: 'coordinator' });
  assert.equal(coordinatorSummary.totalPatients, 2);
  assert.equal(coordinatorSummary.totalDoctors, 1);
  assert.equal(coordinatorSummary.pendingDoctorApprovals, 1);
  assert.equal(coordinatorSummary.loginCount, 1);
}

run().then(() => console.log('analytics tests passed')).catch((error) => {
  console.error(error);
  process.exit(1);
});