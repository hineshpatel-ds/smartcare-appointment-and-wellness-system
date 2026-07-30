const AWS = require('aws-sdk');

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION || 'us-east-1' });
const projectName = process.env.PROJECT_NAME || 'saws';

const keyByCollection = {
  users: 'userId',
  appointments: 'appointmentId',
  services: 'serviceId',
  feedback: 'feedbackId',
  'support-messages': 'messageId'
};

function firestoreValueToJson(value) {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return Number(value.integerValue);
  if (value.doubleValue !== undefined) return Number(value.doubleValue);
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.timestampValue !== undefined) return value.timestampValue;
  if (value.arrayValue !== undefined) return (value.arrayValue.values || []).map(firestoreValueToJson);
  if (value.mapValue !== undefined) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nestedValue]) => [key, firestoreValueToJson(nestedValue)])
    );
  }
  return null;
}

exports.syncToDynamo = async (event, context) => {
  const resourceParts = String(context.resource || '').split('/');
  const collectionName = resourceParts[5];
  const docId = resourceParts[6];
  const keyName = keyByCollection[collectionName] || 'id';
  const tableName = `${projectName}-${collectionName}`;

  if (!collectionName || !docId) {
    console.warn(`Unable to parse Firestore resource: ${context.resource}`);
    return;
  }

  if (event.value && event.value.name) {
    const fields = event.value.fields || {};
    const item = Object.fromEntries(
      Object.entries(fields).map(([key, value]) => [key, firestoreValueToJson(value)])
    );

    if (item._source === 'dynamodb') {
      console.log('Skipping record originating from DynamoDB to prevent a mirror loop.');
      return;
    }

    item._source = 'firestore';
    item[keyName] = docId;

    await dynamoDb.put({ TableName: tableName, Item: item }).promise();
    console.log(`Synced ${docId} to DynamoDB table ${tableName}`);
    return;
  }

  await dynamoDb.delete({ TableName: tableName, Key: { [keyName]: docId } }).promise();
  console.log(`Deleted ${docId} from DynamoDB table ${tableName}`);
};
