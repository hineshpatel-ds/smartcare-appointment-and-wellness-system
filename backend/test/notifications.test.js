const assert = require('assert');
const os = require('os');
const path = require('path');

process.env.FORCE_LOCAL_STORE = 'true';
process.env.ENABLE_DB_MIRRORING = 'false';
process.env.LOCAL_DATA_DIR = path.join(os.tmpdir(), `saws-notifications-test-${process.pid}`);
process.env.SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:saws-notifications';
process.env.SQS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/saws-appointment-requests';

const store = require('../lib/store');
const calls = [];
store.sns.createTopic = (params) => ({ promise: async () => { calls.push(['createTopic', params]); return { TopicArn: `arn:topic:${params.Name}` }; } });
store.sns.listSubscriptionsByTopic = (params) => ({ promise: async () => { calls.push(['listSubscriptionsByTopic', params]); return { Subscriptions: [] }; } });
store.sns.subscribe = (params) => ({ promise: async () => { calls.push(['subscribe', params]); return { SubscriptionArn: 'sub-1' }; } });
store.sns.publish = (params) => ({ promise: async () => { calls.push(['snsPublish', params]); return { MessageId: 'sns-1' }; } });
store.sqs.sendMessage = (params) => ({ promise: async () => { calls.push(['sqsSend', params]); return { MessageId: 'sqs-1' }; } });

const { sendEmail, sendAppointmentRequestEmails, sendAppointmentDecisionEmails, sendAppointmentReminderEmails } = require('../notifications-lambdas/email');
const { publishNotification, enqueueAppointmentNotification } = require('../notifications-lambdas/notify');

async function run() {
  assert.deepEqual(await sendEmail('', 'Subject', 'Body'), { skipped: true, reason: 'Missing recipient' });

  const sent = await sendEmail('Patient.One@example.com', 'A very useful subject', '<p>Hello &amp; welcome</p>', 'patient-one');
  assert.equal(sent.sent, true);
  assert.equal(sent.transport, 'sns');
  assert.ok(calls.some(([name, params]) => name === 'createTopic' && params.Name.includes('patient-one-email')));
  assert.ok(calls.some(([name, params]) => name === 'subscribe' && params.Protocol === 'email'));
  assert.ok(calls.some(([name, params]) => name === 'snsPublish' && params.Message === 'Hello & welcome'));

  await publishNotification('Subject', 'Message', { id: 'abc' });
  const sharedPublish = calls.find(([name, params]) => name === 'snsPublish' && params.TopicArn === process.env.SNS_TOPIC_ARN);
  assert.ok(sharedPublish);
  assert.ok(sharedPublish[1].Message.includes('abc'));

  const appointment = {
    appointmentId: 'apt-notify',
    patientId: 'patient-one',
    patientEmail: 'patient@example.com',
    patientName: 'Patient One',
    doctorId: 'doctor-one',
    doctorEmail: 'doctor@example.com',
    doctorName: 'Doctor One',
    service: 'General',
    date: '2026-09-04',
    time: '13:00',
    status: 'PENDING_APPROVAL'
  };
  const queuedViaSns = await enqueueAppointmentNotification('APPOINTMENT_REQUEST', appointment);
  assert.equal(queuedViaSns.published, true);
  assert.ok(calls.some(([name, params]) => name === 'snsPublish' && params.MessageAttributes?.notificationType?.StringValue === 'APPOINTMENT_REQUEST'));

  const originalPublish = store.sns.publish;
  store.sns.publish = () => ({ promise: async () => { throw new Error('sns unavailable'); } });
  const queuedViaSqs = await enqueueAppointmentNotification('APPOINTMENT_CONFIRMED', appointment);
  assert.equal(queuedViaSqs.queued, true);
  assert.ok(calls.some(([name, params]) => name === 'sqsSend' && params.MessageBody.includes('APPOINTMENT_CONFIRMED')));
  store.sns.publish = originalPublish;

  const beforeAppointmentEmailCount = calls.filter(([name]) => name === 'snsPublish').length;
  await sendAppointmentRequestEmails(appointment);
  await sendAppointmentDecisionEmails('APPOINTMENT_CONFIRMED', { ...appointment, status: 'CONFIRMED' });
  await sendAppointmentReminderEmails(appointment);
  const afterAppointmentEmailCount = calls.filter(([name]) => name === 'snsPublish').length;
  assert.equal(afterAppointmentEmailCount - beforeAppointmentEmailCount, 6);
}

run().then(() => console.log('notification tests passed')).catch((error) => {
  console.error(error);
  process.exit(1);
});