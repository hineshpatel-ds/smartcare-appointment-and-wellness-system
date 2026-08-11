const AWS = require('aws-sdk');
const { sendAppointmentRequestEmails, sendAppointmentDecisionEmails } = require('./email');

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION || 'us-east-1' });

const STATUS_BY_TYPE = {
  APPOINTMENT_REQUEST: 'PENDING_APPROVAL',
  APPOINTMENT_CONFIRMED: 'CONFIRMED',
  APPOINTMENT_REJECTED: 'REJECTED',
  APPOINTMENT_CANCELLED: 'CANCELLED'
};

function parseNotificationBody(recordBody) {
  const parsed = JSON.parse(recordBody);
  if (parsed.Type === 'Notification' && parsed.Message) return JSON.parse(parsed.Message);
  return parsed;
}

async function notifyForAppointment(type, appointment) {
  if (type === 'APPOINTMENT_REQUEST') return sendAppointmentRequestEmails(appointment);
  return sendAppointmentDecisionEmails(type, appointment);
}

exports.handler = async (event) => {
  for (const record of event.Records || []) {
    const body = parseNotificationBody(record.body);
    if (!body.type || !body.type.startsWith('APPOINTMENT_')) continue;

    const appointment = body.appointment || {};
    const status = STATUS_BY_TYPE[body.type];

    if (process.env.APPOINTMENTS_TABLE && appointment.appointmentId && status) {
      await dynamoDb
        .update({
          TableName: process.env.APPOINTMENTS_TABLE,
          Key: { appointmentId: appointment.appointmentId },
          UpdateExpression: 'set #status = :status, updatedAt = :updatedAt',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: { ':status': status, ':updatedAt': new Date().toISOString() }
        })
        .promise();
    }

    await notifyForAppointment(body.type, { ...appointment, status });
    console.log(`Processed ${body.type} notification for appointment ${appointment.appointmentId}`);
  }
};
