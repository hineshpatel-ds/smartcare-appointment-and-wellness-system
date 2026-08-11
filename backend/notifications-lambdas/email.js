const { sns, config } = require('../lib/store');

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '  ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function safeTopicPart(value) {
  const cleaned = String(value || 'recipient')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return (cleaned || 'recipient').slice(0, 160);
}

function recipientKey(to, recipientId) {
  return recipientId || to;
}

async function getRecipientTopicArn(to, recipientId) {
  const topicName = `${safeTopicPart(config.projectName)}-${safeTopicPart(recipientKey(to, recipientId))}-email`;
  const result = await sns.createTopic({ Name: topicName }).promise();
  return result.TopicArn;
}

async function hasEmailSubscription(topicArn, to) {
  let token;
  const target = String(to).toLowerCase();
  do {
    const result = await sns.listSubscriptionsByTopic({ TopicArn: topicArn, NextToken: token }).promise();
    if ((result.Subscriptions || []).some((subscription) => {
      return subscription.Protocol === 'email' && String(subscription.Endpoint || '').toLowerCase() === target;
    })) {
      return true;
    }
    token = result.NextToken;
  } while (token);
  return false;
}

async function ensureEmailSubscription(topicArn, to) {
  if (await hasEmailSubscription(topicArn, to)) return;
  await sns.subscribe({ TopicArn: topicArn, Protocol: 'email', Endpoint: to, ReturnSubscriptionArn: true }).promise();
}

function appointmentDetailsText(appointment) {
  const rows = [
    ['Reference', appointment.appointmentId],
    ['Service', appointment.service],
    ['Doctor', appointment.doctorName],
    ['Patient', appointment.patientName],
    ['Date', appointment.date],
    ['Time', appointment.time],
    ['Status', appointment.status],
    ['Notes', appointment.notes || 'None']
  ];
  return rows.map(([label, value]) => `${label}: ${value || 'N/A'}`).join('\n');
}

async function sendEmail(to, subject, message, recipientId) {
  if (!to) {
    console.warn(`No recipient address, skipping SNS email notification "${subject}"`);
    return { skipped: true, reason: 'Missing recipient' };
  }

  try {
    const topicArn = await getRecipientTopicArn(to, recipientId);
    await ensureEmailSubscription(topicArn, to);
    await sns
      .publish({
        TopicArn: topicArn,
        Subject: String(subject || 'SAWS notification').slice(0, 100),
        Message: stripHtml(message)
      })
      .promise();
    return { sent: true, transport: 'sns', topicArn };
  } catch (error) {
    console.warn(`SNS email notification skipped for ${to}: ${error.message}`);
    return { skipped: true, error: error.message };
  }
}

async function sendAppointmentRequestEmails(appointment) {
  const details = appointmentDetailsText(appointment);
  await Promise.all([
    sendEmail(
      appointment.patientEmail,
      'SAWS: Appointment request received',
      `Hi ${appointment.patientName}, your appointment request has been received and is pending approval.\n\n${details}`,
      appointment.patientId
    ),
    sendEmail(
      appointment.doctorEmail,
      'SAWS: New appointment pending approval',
      `Hi ${appointment.doctorName || 'Doctor'}, a new appointment request needs your review.\n\n${details}`,
      appointment.doctorId
    )
  ]);
}

async function sendAppointmentDecisionEmails(type, appointment) {
  const statusCopy = {
    APPOINTMENT_CONFIRMED: 'confirmed',
    APPOINTMENT_REJECTED: 'rejected',
    APPOINTMENT_CANCELLED: 'cancelled'
  }[type] || String(appointment.status || '').toLowerCase();
  const subject = `SAWS: Appointment ${statusCopy}`;
  const details = appointmentDetailsText(appointment);

  await Promise.all([
    sendEmail(
      appointment.patientEmail,
      subject,
      `Hi ${appointment.patientName}, your appointment has been ${statusCopy}.\n\n${details}`,
      appointment.patientId
    ),
    sendEmail(
      appointment.doctorEmail,
      subject,
      `Hi ${appointment.doctorName || 'Doctor'}, this appointment has been ${statusCopy}.\n\n${details}`,
      appointment.doctorId
    )
  ]);
}

async function sendAppointmentReminderEmails(appointment) {
  const details = appointmentDetailsText(appointment);
  const subject = 'SAWS: Appointment reminder';
  await Promise.all([
    sendEmail(
      appointment.patientEmail,
      subject,
      `Hi ${appointment.patientName}, this is a reminder for your upcoming appointment.\n\n${details}`,
      appointment.patientId
    ),
    sendEmail(
      appointment.doctorEmail,
      subject,
      `Hi ${appointment.doctorName || 'Doctor'}, this is a reminder for your upcoming appointment.\n\n${details}`,
      appointment.doctorId
    )
  ]);
}

module.exports = {
  sendEmail,
  sendAppointmentRequestEmails,
  sendAppointmentDecisionEmails,
  sendAppointmentReminderEmails
};
