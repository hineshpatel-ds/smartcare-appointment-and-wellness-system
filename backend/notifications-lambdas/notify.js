const { sns, sqs, pubsub, config, hasGoogleRuntimeCredentials } = require('../lib/store');

async function publishNotification(subject, message, payload = {}) {
  if (!config.snsTopicArn) return { skipped: true };
  try {
    await sns
      .publish({
        TopicArn: config.snsTopicArn,
        Subject: subject,
        Message: JSON.stringify({ message, ...payload })
      })
      .promise();
    return { sent: true };
  } catch (error) {
    console.warn(`SNS notification skipped: ${error.message}`);
    return { skipped: true, error: error.message };
  }
}

async function enqueueAppointmentNotification(type, appointment) {
  const payload = { type, appointment };

  if (config.snsTopicArn) {
    try {
      await sns
        .publish({
          TopicArn: config.snsTopicArn,
          Subject: `SAWS ${type.replace(/_/g, ' ').toLowerCase()}`,
          Message: JSON.stringify(payload),
          MessageAttributes: {
            notificationType: { DataType: 'String', StringValue: type }
          }
        })
        .promise();
      return { published: true };
    } catch (error) {
      console.warn(`SNS appointment notification skipped: ${error.message}`);
    }
  }

  if (!config.sqsQueueUrl) return { skipped: true };
  try {
    await sqs
      .sendMessage({
        QueueUrl: config.sqsQueueUrl,
        MessageBody: JSON.stringify(payload)
      })
      .promise();
    return { queued: true };
  } catch (error) {
    console.warn(`SQS notification skipped: ${error.message}`);
    return { skipped: true, error: error.message };
  }
}

async function publishSupportConcern(concern) {
  try {
    if (!pubsub || !hasGoogleRuntimeCredentials) return { skipped: true };
    await pubsub.topic(config.pubsubTopic).publishMessage({ json: concern });
    return { published: true };
  } catch (error) {
    console.warn(`Pub/Sub publish skipped: ${error.message}`);
    return { skipped: true, error: error.message };
  }
}

module.exports = { publishNotification, enqueueAppointmentNotification, publishSupportConcern };
