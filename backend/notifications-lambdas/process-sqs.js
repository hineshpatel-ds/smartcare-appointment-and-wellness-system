const AWS = require('aws-sdk');
const { sendEmail } = require('../lib/email');

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION || 'us-east-1' });

const STATUS_BY_TYPE = {
  APPOINTMENT_REQUEST: 'PENDING_APPROVAL',
  APPOINTMENT_CONFIRMED: 'CONFIRMED',
  APPOINTMENT_REJECTED: 'REJECTED',
  APPOINTMENT_CANCELLED: 'CANCELLED'
};

async function notifyForAppointment(type, appointment) {
  const { service, date, time, doctorName, patientName, patientEmail, doctorEmail } = appointment;

  if (type === 'APPOINTMENT_REQUEST') {
    await sendEmail(
      doctorEmail,
      'SAWS: New appointment pending your approval',
      `<p>Hi ${doctorName || 'Doctor'}, a new appointment request needs your review.</p>
       <p><b>Service:</b> ${service}<br/><b>Patient:</b> ${patientName}<br/><b>Date:</b> ${date} at ${time}</p>
       <p>Please sign in to your SmartCare dashboard to approve or reject it.</p>`
    );
    return;
  }

  if (type === 'APPOINTMENT_CONFIRMED') {
    const body = `<p>Your appointment is confirmed.</p>
       <p><b>Service:</b> ${service}<br/><b>Doctor:</b> ${doctorName}<br/><b>Patient:</b> ${patientName}<br/><b>Date:</b> ${date} at ${time}</p>`;
    await Promise.all([
      sendEmail(patientEmail, 'SAWS: Appointment confirmed', body),
      sendEmail(doctorEmail, 'SAWS: Appointment confirmed', body)
    ]);
    return;
  }

  if (type === 'APPOINTMENT_REJECTED') {
    await sendEmail(
      patientEmail,
      'SAWS: Appointment could not be approved',
      `<p>Sorry, your appointment request for <b>${service}</b> on ${date} at ${time} could not be approved due to unavailability. Please book another appointment.</p>`
    );
    return;
  }

  if (type === 'APPOINTMENT_CANCELLED') {
    const body = `<p>The appointment for <b>${service}</b> on ${date} at ${time} has been cancelled.</p>`;
    await Promise.all([sendEmail(patientEmail, 'SAWS: Appointment cancelled', body), sendEmail(doctorEmail, 'SAWS: Appointment cancelled', body)]);
  }
}

exports.handler = async (event) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    if (!body.type || !body.type.startsWith('APPOINTMENT_')) continue;

    const appointment = body.appointment;
    const status = STATUS_BY_TYPE[body.type];

    if (process.env.APPOINTMENTS_TABLE && appointment.appointmentId && body.type === 'APPOINTMENT_REQUEST') {
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

    await notifyForAppointment(body.type, appointment);
    console.log(`Processed ${body.type} notification for appointment ${appointment.appointmentId}`);
  }
};
