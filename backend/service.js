const crypto = require('crypto');
const AWS = require('aws-sdk');

let Firestore = null;
let PubSub = null;
try {
  Firestore = require('@google-cloud/firestore').Firestore;
  PubSub = require('@google-cloud/pubsub').PubSub;
} catch (error) {
  Firestore = null;
  PubSub = null;
}

let languageClient = null;
const hasGoogleRuntimeCredentials =
  Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CREDENTIALS || process.env.K_SERVICE);

if (hasGoogleRuntimeCredentials) {
  try {
    const language = require('@google-cloud/language');
    languageClient = new language.LanguageServiceClient();
  } catch (error) {
    languageClient = null;
  }
}

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
  enableMirror: process.env.ENABLE_DB_MIRRORING !== 'false'
};

AWS.config.update({ region: config.awsRegion });

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const sqs = new AWS.SQS();
const sns = new AWS.SNS();
const firestore = Firestore ? new Firestore() : null;
const pubsub = PubSub ? new PubSub() : null;

const memory = {
  users: new Map(),
  appointments: new Map(),
  feedback: new Map(),
  messages: new Map(),
  services: new Map(),
  loginStats: []
};

const defaultServices = [
  {
    serviceId: 'consultation-general',
    name: 'General Healthcare Consultation',
    category: 'Healthcare',
    specialist: 'Family Physician',
    price: 65,
    durationMinutes: 30,
    availability: 'Mon-Fri, 09:00-17:00',
    description: 'Routine consultation, symptoms review, and follow-up planning.'
  },
  {
    serviceId: 'wellness-nutrition',
    name: 'Nutrition Wellness Session',
    category: 'Wellness',
    specialist: 'Nutrition Coach',
    price: 45,
    durationMinutes: 45,
    availability: 'Tue/Thu, 10:00-16:00',
    description: 'Personalized wellness goals, meal planning, and progress review.'
  },
  {
    serviceId: 'mental-wellness',
    name: 'Mental Wellness Check-in',
    category: 'Wellness',
    specialist: 'Wellness Counsellor',
    price: 55,
    durationMinutes: 30,
    availability: 'Mon/Wed/Fri, 12:00-18:00',
    description: 'Confidential support, stress screening, and resource navigation.'
  }
];

for (const service of defaultServices) {
  memory.services.set(service.serviceId, service);
}

function nowIso() {
  return new Date().toISOString();
}

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,OPTIONS'
    },
    body: JSON.stringify(payload)
  };
}

function parseBody(event) {
  if (!event || !event.body) return {};
  return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function caesarCipher(text, shift) {
  const normalizedShift = Number(shift) % 26;
  return String(text)
    .split('')
    .map((char) => {
      if (!/[a-z]/i.test(char)) return char;
      const base = char >= 'A' && char <= 'Z' ? 65 : 97;
      return String.fromCharCode(((char.charCodeAt(0) - base + normalizedShift + 26) % 26) + base);
    })
    .join('');
}

function normalizeAnswer(value) {
  return String(value || '').trim().toLowerCase();
}

function isUpcomingAppointmentSlot(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return false;
  const selected = new Date(`${date}T${time || '00:00'}:00`);
  if (Number.isNaN(selected.getTime())) return false;
  return selected.getTime() > Date.now();
}

function requireSignedInContext({ userId, role } = {}) {
  if (!userId || !['patient', 'coordinator'].includes(role)) {
    throw new Error('Authentication required');
  }
}

function requireCoordinatorContext({ userId, role } = {}) {
  if (!userId || role !== 'coordinator') {
    throw new Error('Coordinator access required');
  }
}

async function safeDynamo(operation, fallback) {
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
  if (!config.sqsQueueUrl) return { skipped: true };
  try {
    await sqs
      .sendMessage({
        QueueUrl: config.sqsQueueUrl,
        MessageBody: JSON.stringify({ type, appointment })
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

async function registerUser(input) {
  const required = ['userId', 'email', 'password', 'role', 'securityQuestion', 'securityAnswer', 'healthcareCode'];
  for (const field of required) {
    if (!input[field]) throw new Error(`${field} is required`);
  }

  const role = input.role === 'coordinator' ? 'coordinator' : 'patient';
  const shift = Number(input.cipherShift || 3);
  const user = {
    userId: input.userId,
    email: input.email,
    phone: input.phone || '',
    role,
    securityQuestion: input.securityQuestion,
    securityAnswer: normalizeAnswer(input.securityAnswer),
    healthcareCodeHint: `Apply Caesar shift ${shift} to your healthcare code clue.`,
    healthcareCodeEncrypted: caesarCipher(input.healthcareCode, shift),
    cipherShift: shift,
    passwordHash: hashPassword(input.password),
    createdAt: nowIso(),
    lastLoginAt: null
  };

  if (config.userPoolClientId) {
    try {
      await cognito
        .signUp({
          ClientId: config.userPoolClientId,
          Username: input.userId,
          Password: input.password,
          UserAttributes: [
            { Name: 'email', Value: input.email },
            { Name: 'custom:role', Value: role }
          ]
        })
        .promise();
    } catch (error) {
      if (error.code !== 'UsernameExistsException') throw error;
    }
  }

  await putItem(config.usersTable, 'userId', user, memory.users);
  await mirrorToFirestore('users', user.userId, user);
  await publishNotification('SAWS registration successful', `Registration completed for ${user.userId}`, {
    eventType: 'REGISTRATION_SUCCESS',
    userId: user.userId
  });

  return {
    userId: user.userId,
    email: user.email,
    role: user.role,
    securityQuestion: user.securityQuestion,
    healthcareCodeHint: user.healthcareCodeHint,
    confirmationRequired: Boolean(config.userPoolClientId)
  };
}

async function confirmRegistration({ userId, confirmationCode }) {
  if (!userId || !confirmationCode) throw new Error('userId and confirmationCode are required');
  if (!config.userPoolClientId) return { confirmed: true };
  await cognito
    .confirmSignUp({
      ClientId: config.userPoolClientId,
      Username: userId,
      ConfirmationCode: confirmationCode
    })
    .promise();
  return { confirmed: true };
}

async function startLogin({ userId, password }) {
  if (!userId || !password) throw new Error('userId and password are required');
  const user = await getItem(config.usersTable, { userId }, memory.users);
  if (!user) throw new Error('Invalid user ID or password');

  if (config.userPoolClientId) {
    await cognito
      .initiateAuth({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: config.userPoolClientId,
        AuthParameters: {
          USERNAME: userId,
          PASSWORD: password
        }
      })
      .promise();
  } else if (user.passwordHash !== hashPassword(password)) {
    throw new Error('Invalid user ID or password');
  }

  const stat = { loginId: createId('login'), userId, role: user.role, createdAt: nowIso() };
  memory.loginStats.push(stat);
  await putItem(config.loginStatsTable, 'loginId', stat, new Map(memory.loginStats.map((item) => [item.loginId, item])));
  await publishNotification('SAWS login successful', `Successful sign-in for ${userId}`, {
    eventType: 'LOGIN_SUCCESS',
    userId
  });

  return {
    nextStage: 'security-question',
    securityQuestion: user.securityQuestion,
    sessionId: createId('session')
  };
}

async function verifySecurityQuestion({ userId, answer }) {
  if (!userId || !answer) throw new Error('userId and answer are required');
  const user = await getItem(config.usersTable, { userId }, memory.users);
  if (!user || user.securityAnswer !== normalizeAnswer(answer)) throw new Error('Invalid security answer');
  return {
    nextStage: 'caesar-cipher',
    healthcareCodeHint: user.healthcareCodeHint,
    encryptedCode: user.healthcareCodeEncrypted,
    cipherShift: user.cipherShift
  };
}

async function verifyCipher({ userId, healthcareCode }) {
  if (!userId || !healthcareCode) throw new Error('userId and healthcareCode are required');
  const user = await getItem(config.usersTable, { userId }, memory.users);
  if (!user) throw new Error('Invalid user');
  const expected = caesarCipher(healthcareCode, user.cipherShift);
  if (expected !== user.healthcareCodeEncrypted) throw new Error('Invalid healthcare code');

  const updated = { ...user, lastLoginAt: nowIso() };
  await putItem(config.usersTable, 'userId', updated, memory.users);
  await mirrorToFirestore('users', updated.userId, updated);

  return {
    token: Buffer.from(JSON.stringify({ userId: user.userId, role: user.role, issuedAt: nowIso() })).toString('base64'),
    user: {
      userId: user.userId,
      email: user.email,
      role: user.role
    }
  };
}

async function listServices() {
  const items = await scanItems(config.servicesTable, memory.services);
  return items.length ? items : defaultServices;
}

async function upsertService(service) {
  requireCoordinatorContext(service);
  const serviceId = service.serviceId || createId('svc');
  const item = {
    serviceId,
    name: service.name,
    category: service.category || 'Wellness',
    specialist: service.specialist || 'Coordinator',
    price: Number(service.price || 0),
    durationMinutes: Number(service.durationMinutes || 30),
    availability: service.availability || 'By appointment',
    description: service.description || '',
    updatedAt: nowIso()
  };
  if (!item.name) throw new Error('service name is required');
  await putItem(config.servicesTable, 'serviceId', item, memory.services);
  await mirrorToFirestore('services', serviceId, item);
  return item;
}

async function bookAppointment(input) {
  const required = ['userId', 'date', 'time', 'service'];
  for (const field of required) {
    if (!input[field]) throw new Error(`${field} is required`);
  }
  if (!isUpcomingAppointmentSlot(input.date, input.time)) {
    throw new Error('Appointment date and time must be upcoming');
  }
  const appointment = {
    appointmentId: createId('apt'),
    userId: input.userId,
    service: input.service,
    doctor: input.doctor || input.specialist || 'Assigned coordinator',
    date: input.date,
    time: input.time,
    notes: input.notes || '',
    status: 'PENDING',
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  await putItem(config.appointmentsTable, 'appointmentId', appointment, memory.appointments);
  await mirrorToFirestore('appointments', appointment.appointmentId, appointment);
  await enqueueAppointmentNotification('APPOINTMENT_REQUEST', appointment);
  return appointment;
}

async function listAppointments({ userId, role }) {
  requireSignedInContext({ userId, role });
  const items = await scanItems(config.appointmentsTable, memory.appointments);
  if (role === 'coordinator') return items;
  return items.filter((item) => item.userId === userId);
}

async function updateAppointment(appointmentId, changes) {
  requireCoordinatorContext(changes);
  const current = await getItem(config.appointmentsTable, { appointmentId }, memory.appointments);
  if (!current) throw new Error('Appointment not found');
  const updated = {
    ...current,
    ...changes,
    appointmentId,
    updatedAt: nowIso()
  };
  await putItem(config.appointmentsTable, 'appointmentId', updated, memory.appointments);
  await mirrorToFirestore('appointments', appointmentId, updated);
  if (['CONFIRMED', 'REJECTED', 'CANCELLED'].includes(updated.status)) {
    await enqueueAppointmentNotification(`APPOINTMENT_${updated.status}`, updated);
  }
  return updated;
}

async function submitConcern(input) {
  if (!input.message) throw new Error('message is required');
  const concern = {
    messageId: createId('msg'),
    userId: input.userId || 'guest',
    message: input.message,
    subject: input.subject || 'Support concern',
    assignedTo: input.assignedTo || null,
    status: 'OPEN',
    replies: [],
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
  await publishSupportConcern(concern);
  await putItem(config.messagesTable, 'messageId', concern, memory.messages);
  await mirrorToFirestore('support-messages', concern.messageId, concern);
  return concern;
}

async function assignConcernFromPubSub(data) {
  const coordinators = ['coord-1', 'coord-2', 'coord-3'];
  const assignedTo = data.assignedTo || coordinators[Math.floor(Math.random() * coordinators.length)];
  const concern = {
    ...data,
    messageId: data.messageId || createId('msg'),
    assignedTo,
    status: data.status || 'OPEN',
    updatedAt: nowIso()
  };
  await putItem(config.messagesTable, 'messageId', concern, memory.messages);
  await mirrorToFirestore('support-messages', concern.messageId, concern);
  return concern;
}

async function listMessages({ userId, role }) {
  requireSignedInContext({ userId, role });
  const items = await scanItems(config.messagesTable, memory.messages);
  if (role === 'coordinator') return items;
  return items.filter((item) => item.userId === userId || item.userId === 'guest');
}

async function replyToMessage(messageId, input) {
  requireCoordinatorContext(input);
  const current = await getItem(config.messagesTable, { messageId }, memory.messages);
  if (!current) throw new Error('Message not found');
  const reply = {
    from: input.from || 'coordinator',
    body: input.body,
    createdAt: nowIso()
  };
  if (!reply.body) throw new Error('reply body is required');
  const updated = {
    ...current,
    replies: [...(current.replies || []), reply],
    status: input.status || 'IN_PROGRESS',
    updatedAt: nowIso()
  };
  await putItem(config.messagesTable, 'messageId', updated, memory.messages);
  await mirrorToFirestore('support-messages', messageId, updated);
  return updated;
}

function heuristicSentiment(text) {
  const positive = ['good', 'great', 'excellent', 'helpful', 'quick', 'happy', 'smooth', 'clear'];
  const negative = ['bad', 'slow', 'late', 'poor', 'confusing', 'unhappy', 'issue', 'problem'];
  const value = String(text || '').toLowerCase();
  const score = positive.reduce((total, word) => total + (value.includes(word) ? 0.2 : 0), 0)
    - negative.reduce((total, word) => total + (value.includes(word) ? 0.25 : 0), 0);
  return {
    score: Math.max(-1, Math.min(1, Number(score.toFixed(2)))),
    magnitude: Math.min(1, Math.abs(score) + 0.15)
  };
}

async function analyzeSentiment(text) {
  if (languageClient) {
    try {
      const [result] = await languageClient.analyzeSentiment({
        document: { content: text, type: 'PLAIN_TEXT' }
      });
      return result.documentSentiment;
    } catch (error) {
      console.warn(`Natural Language API fallback: ${error.message}`);
    }
  }
  return heuristicSentiment(text);
}

async function submitFeedback(input) {
  if (!input.userId || !input.service || !input.rating || !input.comment) {
    throw new Error('userId, service, rating, and comment are required');
  }
  const sentiment = await analyzeSentiment(input.comment);
  const feedback = {
    feedbackId: createId('fb'),
    userId: input.userId,
    service: input.service,
    rating: Number(input.rating),
    comment: input.comment,
    sentimentScore: Number(sentiment.score || 0),
    sentimentMagnitude: Number(sentiment.magnitude || 0),
    createdAt: nowIso()
  };
  await putItem(config.feedbackTable, 'feedbackId', feedback, memory.feedback);
  await mirrorToFirestore('feedback', feedback.feedbackId, feedback);
  return feedback;
}

async function analyticsSummary({ userId, role } = {}) {
  requireSignedInContext({ userId, role });
  const [users, appointments, feedback, services] = await Promise.all([
    scanItems(config.usersTable, memory.users),
    scanItems(config.appointmentsTable, memory.appointments),
    scanItems(config.feedbackTable, memory.feedback),
    listServices()
  ]);

  const visibleAppointments = role === 'patient'
    ? appointments.filter((item) => item.userId === userId)
    : appointments;
  const visibleFeedback = role === 'patient'
    ? feedback.filter((item) => item.userId === userId)
    : feedback;

  const appointmentTrends = visibleAppointments.reduce((acc, item) => {
    acc[item.date] = (acc[item.date] || 0) + 1;
    return acc;
  }, {});
  const servicePopularity = visibleAppointments.reduce((acc, item) => {
    acc[item.service] = (acc[item.service] || 0) + 1;
    return acc;
  }, {});

  return {
    scope: role === 'patient' ? 'patient' : 'coordinator',
    totalPatients: role === 'coordinator' ? users.filter((user) => user.role === 'patient').length : undefined,
    totalCoordinators: role === 'coordinator' ? users.filter((user) => user.role === 'coordinator').length : undefined,
    loginCount: role === 'coordinator' ? memory.loginStats.length : undefined,
    appointmentCount: visibleAppointments.length,
    pendingAppointments: visibleAppointments.filter((item) => item.status === 'PENDING').length,
    services,
    appointmentTrends,
    servicePopularity,
    feedback: visibleFeedback
  };
}
async function chatbotReply(input) {
  const message = String(input.message || '').toLowerCase();
  if (!message) throw new Error('message is required');

  const codeMatch = message.match(/apt-[a-z0-9-]+/i);
  if (codeMatch || message.includes('appointment')) {
    const appointmentId = input.appointmentId || (codeMatch && codeMatch[0]);
    if (!appointmentId) {
      return { reply: 'Please provide your appointment reference code, for example apt-123.' };
    }
    const appointment = await getItem(config.appointmentsTable, { appointmentId }, memory.appointments);
    if (!appointment) return { reply: "I could not find that appointment reference code." };
    return {
      reply: `Appointment ${appointment.appointmentId}: ${appointment.service} on ${appointment.date} at ${appointment.time}. Status: ${appointment.status}.`
    };
  }

  if (message.includes('package') || message.includes('price') || message.includes('service')) {
    const services = await listServices();
    return {
      reply: services.map((service) => `${service.name} costs $${service.price}`).join(' | ')
    };
  }

  if (message.includes('concern') || message.includes('support') || message.includes('help')) {
    const concern = await submitConcern({
      userId: input.userId || 'guest',
      subject: 'Chatbot concern',
      message: input.message
    });
    return {
      reply: `I forwarded your concern to a wellness coordinator. Reference: ${concern.messageId}.`
    };
  }

  if (message.includes('where') || message.includes('navigate') || message.includes('dashboard')) {
    return {
      reply: 'Use Services to review care options, Dashboard to book and track appointments, Messages for support, and Analytics to view feedback trends.'
    };
  }

  return {
    reply: 'I can help with navigation, appointment lookup, wellness package pricing, FAQs, and support concerns.'
  };
}

module.exports = {
  config,
  jsonResponse,
  parseBody,
  caesarCipher,
  registerUser,
  confirmRegistration,
  startLogin,
  verifySecurityQuestion,
  verifyCipher,
  listServices,
  upsertService,
  bookAppointment,
  listAppointments,
  updateAppointment,
  submitConcern,
  assignConcernFromPubSub,
  listMessages,
  replyToMessage,
  submitFeedback,
  analyzeSentiment,
  analyticsSummary,
  chatbotReply,
  publishNotification,
  mirrorToDynamo
};
