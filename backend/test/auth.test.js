const assert = require('assert');
const os = require('os');
const path = require('path');

process.env.FORCE_LOCAL_STORE = 'true';
process.env.ENABLE_DB_MIRRORING = 'false';
process.env.LOCAL_DATA_DIR = path.join(os.tmpdir(), `saws-auth-test-${process.pid}`);
process.env.COGNITO_CLIENT_ID = '';
process.env.COGNITO_USER_POOL_ID = '';

const store = require('../lib/store');
const { caesarCipher, hashPassword } = require('../lib/util');
store.sns.createTopic = () => ({ promise: async () => ({ TopicArn: 'arn:aws:sns:test:auth-email' }) });
store.sns.listSubscriptionsByTopic = () => ({ promise: async () => ({ Subscriptions: [] }) });
store.sns.subscribe = () => ({ promise: async () => ({ SubscriptionArn: 'sub-auth' }) });
store.sns.publish = () => ({ promise: async () => ({ MessageId: 'msg-auth' }) });

const {
  sanitizeUser,
  startLogin,
  verifySecurityQuestion,
  verifyCipher,
  listUsersByRole,
  listPendingDoctors
} = require('../auth-lambdas/users');

function resetMemory() {
  for (const map of Object.values(store.memory)) map.map.clear();
}

async function run() {
  resetMemory();
  const patient = {
    userId: 'patient-auth',
    displayName: 'Patient Auth',
    email: 'patient@example.com',
    role: 'patient',
    status: 'ACTIVE',
    securityQuestion: 'Favourite color?',
    securityAnswer: 'blue',
    healthcareCodeEncrypted: caesarCipher('CARE7', 4),
    cipherShift: 4,
    passwordHash: hashPassword('Pass123!')
  };
  const doctor = { ...patient, userId: 'doctor-auth', email: 'doctor@example.com', role: 'doctor', status: 'PENDING_APPROVAL' };
  store.memory.users.set(patient.userId, patient);
  store.memory.users.set(doctor.userId, doctor);

  const safe = sanitizeUser(patient);
  assert.equal(safe.userId, patient.userId);
  assert.equal(safe.passwordHash, undefined);
  assert.equal(safe.securityAnswer, undefined);
  assert.equal(safe.healthcareCodeEncrypted, undefined);
  assert.equal(safe.cipherShift, undefined);

  const login = await startLogin({ userId: patient.userId, password: 'Pass123!' });
  assert.equal(login.nextStage, 'security-question');
  assert.equal(login.securityQuestion, patient.securityQuestion);
  assert.ok(login.sessionId.startsWith('session-'));
  assert.equal(store.memory.loginStats.size, 1);

  await assert.rejects(() => startLogin({ userId: patient.userId, password: 'wrong' }), /Invalid user ID or password/);
  const challenge = await verifySecurityQuestion({ userId: patient.userId, answer: '  BLUE ' });
  assert.equal(challenge.nextStage, 'caesar-cipher');
  assert.ok(challenge.cipherClue.includes('Caesar-shifted clue'));
  assert.ok(!challenge.cipherClue.includes(patient.healthcareCodeEncrypted));

  await assert.rejects(() => verifyCipher({ userId: patient.userId, healthcareCode: 'WRONG' }), /Invalid healthcare code/);
  const final = await verifyCipher({ userId: patient.userId, healthcareCode: 'CARE7' });
  assert.ok(final.token);
  assert.equal(final.user.userId, patient.userId);
  assert.ok(store.memory.users.get(patient.userId).lastLoginAt);

  const pending = await listPendingDoctors({ userId: 'coord', role: 'coordinator' });
  assert.equal(pending.length, 1);
  const patients = await listUsersByRole('patient', { userId: 'coord', role: 'coordinator' });
  assert.equal(patients.length, 1);
  await assert.rejects(() => listUsersByRole('patient', { userId: patient.userId, role: 'patient' }), /Coordinator access required/);
}

run().then(() => console.log('auth tests passed')).catch((error) => {
  console.error(error);
  process.exit(1);
});