const assert = require('assert');

process.env.ENABLE_DB_MIRRORING = 'false';

const {
  registerUser,
  startLogin,
  verifySecurityQuestion,
  verifyCipher,
  listServices,
  bookAppointment,
  listAppointments,
  submitConcern,
  chatbotReply,
  submitFeedback,
  analyticsSummary
} = require('./service');

async function run() {
  const userId = `patient-${Date.now()}`;
  const password = 'Passw0rd!Test';

  const registered = await registerUser({
    userId,
    email: `${userId}@example.com`,
    password,
    role: 'patient',
    securityQuestion: 'What is your clinic code?',
    securityAnswer: 'bridge',
    healthcareCode: 'care',
    cipherShift: 3
  });
  assert.equal(registered.userId, userId);

  const firstStage = await startLogin({ userId, password });
  assert.equal(firstStage.nextStage, 'security-question');

  const secondStage = await verifySecurityQuestion({ userId, answer: 'bridge' });
  assert.equal(secondStage.nextStage, 'caesar-cipher');

  const thirdStage = await verifyCipher({ userId, healthcareCode: 'care' });
  assert.equal(thirdStage.user.userId, userId);

  const services = await listServices();
  assert.ok(services.length >= 1);

  const appointment = await bookAppointment({
    userId,
    service: services[0].name,
    date: '2026-08-01',
    time: '09:30'
  });
  assert.ok(appointment.appointmentId.startsWith('apt-'));

  const appointments = await listAppointments({ userId, role: 'patient' });
  assert.equal(appointments.length, 1);

  const bot = await chatbotReply({
    userId,
    message: `check appointment ${appointment.appointmentId}`
  });
  assert.ok(bot.reply.includes(appointment.appointmentId));

  const concern = await submitConcern({
    userId,
    subject: 'Need help',
    message: 'I need support with my appointment'
  });
  assert.ok(concern.messageId.startsWith('msg-'));

  const feedback = await submitFeedback({
    userId,
    service: services[0].name,
    rating: 5,
    comment: 'The coordinator was helpful and the booking was smooth.'
  });
  assert.ok(feedback.feedbackId.startsWith('fb-'));

  const summary = await analyticsSummary();
  assert.ok(summary.appointmentCount >= 1);
  assert.ok(summary.feedback.length >= 1);

  console.log('SAWS smoke test passed');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
