const AWS = require('aws-sdk');
const { PersistentMap } = require('./persistent-map');

let Firestore = null;
let PubSub = null;
try {
  Firestore = require('@google-cloud/firestore').Firestore;
  PubSub = require('@google-cloud/pubsub').PubSub;
} catch (error) {
  Firestore = null;
  PubSub = null;
}

const hasGoogleRuntimeCredentials =
  Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CREDENTIALS || process.env.K_SERVICE);

const config = {
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  projectName: process.env.PROJECT_NAME || 'saws',
  usersTable: process.env.USERS_TABLE || `${process.env.PROJECT_NAME || 'saws'}-users`,
  appointmentsTable: process.env.APPOINTMENTS_TABLE || `${process.env.PROJECT_NAME || 'saws'}-appointments`,
  feedbackTable: process.env.FEEDBACK_TABLE || `${process.env.PROJECT_NAME || 'saws'}-feedback`,
  messagesTable: process.env.MESSAGES_TABLE || `${process.env.PROJECT_NAME || 'saws'}-support-messages`,
  servicesTable: process.env.SERVICES_TABLE || `${process.env.PROJECT_NAME || 'saws'}-services`,
  loginStatsTable: process.env.LOGIN_STATS_TABLE || `${process.env.PROJECT_NAME || 'saws'}-login-stats`,
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  userPoolClientId: process.env.COGNITO_CLIENT_ID,
  sqsQueueUrl: process.env.SQS_QUEUE_URL,
  snsTopicArn: process.env.SNS_TOPIC_ARN,
  pubsubTopic: process.env.PUBSUB_TOPIC || `${process.env.PROJECT_NAME || 'saws'}-support-concerns`,
  enableMirror: process.env.ENABLE_DB_MIRRORING !== 'false',
  sesSenderEmail: process.env.SES_SENDER_EMAIL
};

AWS.config.update({
  region: config.awsRegion,
  maxRetries: 1,
  httpOptions: { timeout: 4000, connectTimeout: 4000 }
});

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const sqs = new AWS.SQS();
const sns = new AWS.SNS();
const ses = new AWS.SES();
const firestore = Firestore ? new Firestore() : null;
const pubsub = PubSub ? new PubSub() : null;

const memory = {
  users: new PersistentMap('users.json'),
  appointments: new PersistentMap('appointments.json'),
  feedback: new PersistentMap('feedback.json'),
  messages: new PersistentMap('messages.json'),
  services: new PersistentMap('services.json'),
  loginStats: new PersistentMap('login-stats.json')
};

// Lets local development skip DynamoDB entirely instead of waiting out a
// real network round-trip on every call -- useful when the machine has
// stale/expired AWS credentials lying around (env vars, ~/.aws/credentials)
// that the SDK will otherwise try and fail against every single time.
const forceLocalStore = process.env.FORCE_LOCAL_STORE === 'true';

async function safeDynamo(operation, fallback) {
  if (forceLocalStore) return fallback();
  try {
    return await operation();
  } catch (error) {
    if (process.env.FAIL_ON_CLOUD_ERROR === 'true') throw error;
    console.warn(`DynamoDB fallback: ${error.message}`);
    return fallback();
  }
}

async function putItem(tableName, keyName, item, map) {
  await safeDynamo(
    () => dynamoDb.put({ TableName: tableName, Item: item }).promise(),
    () => {
      map.set(item[keyName], item);
      return item;
    }
  );
  map.set(item[keyName], item);
  return item;
}

async function getItem(tableName, key, map) {
  return safeDynamo(
    async () => {
      const result = await dynamoDb.get({ TableName: tableName, Key: key }).promise();
      return result.Item || map.get(Object.values(key)[0]) || null;
    },
    () => map.get(Object.values(key)[0]) || null
  );
}

async function scanItems(tableName, map) {
  return safeDynamo(
    async () => {
      const result = await dynamoDb.scan({ TableName: tableName }).promise();
      return result.Items && result.Items.length ? result.Items : Array.from(map.values());
    },
    () => Array.from(map.values())
  );
}

async function mirrorToFirestore(collection, docId, data) {
  if (!config.enableMirror) return;
  if (!firestore) return;
  try {
    await firestore.collection(collection).doc(docId).set({ ...data, _source: 'dynamodb' }, { merge: true });
  } catch (error) {
    console.warn(`Firestore mirror skipped for ${collection}/${docId}: ${error.message}`);
  }
}

async function mirrorToDynamo(collection, keyName, data) {
  if (!config.enableMirror) return;
  const tableMap = {
    users: [config.usersTable, memory.users],
    appointments: [config.appointmentsTable, memory.appointments],
    feedback: [config.feedbackTable, memory.feedback],
    'support-messages': [config.messagesTable, memory.messages],
    services: [config.servicesTable, memory.services]
  };
  const target = tableMap[collection];
  if (!target) return;
  await putItem(target[0], keyName, { ...data, _source: 'firestore' }, target[1]);
}

module.exports = {
  config,
  dynamoDb,
  cognito,
  sqs,
  sns,
  ses,
  firestore,
  pubsub,
  hasGoogleRuntimeCredentials,
  memory,
  safeDynamo,
  putItem,
  getItem,
  scanItems,
  mirrorToFirestore,
  mirrorToDynamo
};
