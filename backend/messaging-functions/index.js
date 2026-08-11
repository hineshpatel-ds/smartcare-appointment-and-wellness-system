const { assignConcernFromPubSub } = require('./messages');

exports.processMessage = async (event, context) => {
  const message = event.data ? Buffer.from(event.data, 'base64').toString() : null;

  if (message) {
    const data = JSON.parse(message);
    console.log('Received message:', data);
    const assigned = await assignConcernFromPubSub(data);
    console.log(`Stored message with ID: ${assigned.messageId} assigned to ${assigned.assignedTo}`);
  }
};
