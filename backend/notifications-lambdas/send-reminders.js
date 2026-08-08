const AWS = require('aws-sdk');
const { sendEmail } = require('../lib/email');

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION || 'us-east-1' });
const REMINDER_WINDOW_MINUTES = Number(process.env.REMINDER_WINDOW_MINUTES || 30);

exports.handler = async () => {
  const table = process.env.APPOINTMENTS_TABLE;
  if (!table) {
    console.warn('APPOINTMENTS_TABLE not set, skipping reminder sweep');
    return;
  }

  const { Items = [] } = await dynamoDb.scan({ TableName: table }).promise();
  const now = Date.now();
  const windowMs = REMINDER_WINDOW_MINUTES * 60 * 1000;

  const due = Items.filter((appointment) => {
    if (appointment.status !== 'CONFIRMED' || appointment.reminderSentAt) return false;
    const startsAt = new Date(`${appointment.date}T${appointment.time}:00`).getTime();
    if (Number.isNaN(startsAt)) return false;
    return startsAt > now && startsAt - now <= windowMs;
  });

  for (const appointment of due) {
    await sendEmail(
      appointment.patientEmail,
      'SAWS: Appointment reminder',
      `<p>This is a reminder that your <b>${appointment.service}</b> appointment with ${appointment.doctorName || 'your specialist'} is coming up on ${appointment.date} at ${appointment.time}.</p>`
    );
    await dynamoDb
      .update({
        TableName: table,
        Key: { appointmentId: appointment.appointmentId },
        UpdateExpression: 'set reminderSentAt = :now',
        ExpressionAttributeValues: { ':now': new Date().toISOString() }
      })
      .promise();
    console.log(`Sent reminder for appointment ${appointment.appointmentId}`);
  }

  return { remindersSent: due.length };
};
