const AWS = require('aws-sdk');
const sns = new AWS.SNS({ region: 'us-east-1' });
const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);

    if (body.type && body.type.startsWith('APPOINTMENT_')) {
      const appointment = body.appointment;
      const status = body.type === 'APPOINTMENT_REQUEST' ? 'CONFIRMED' : body.type.replace('APPOINTMENT_', '');
      const message = `Your appointment for ${appointment.service} on ${appointment.date} at ${appointment.time} is ${status}.`;

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

      const snsParams = {
        TopicArn: process.env.SNS_TOPIC_ARN,
        Message: message,
        Subject: `Appointment ${status}`
      };

      if (process.env.SNS_TOPIC_ARN) {
        await sns.publish(snsParams).promise();
        console.log(`Sent notification for appointment ${appointment.appointmentId}`);
      } else {
        console.warn('SNS_TOPIC_ARN not defined, skipping notification');
      }
    }
  }
};
