const assert = require('assert');
const os = require('os');
const path = require('path');

process.env.FORCE_LOCAL_STORE = 'true';
process.env.ENABLE_DB_MIRRORING = 'false';
process.env.LOCAL_DATA_DIR = path.join(os.tmpdir(), `saws-messaging-test-${process.pid}`);

const store = require('../lib/store');
const { submitConcern, assignConcernFromPubSub, listMessages, replyToMessage } = require('../messaging-functions/messages');

function resetMemory() {
  for (const map of Object.values(store.memory)) map.map.clear();
}

async function run() {
  resetMemory();
  await assert.rejects(() => submitConcern({ userId: 'patient-msg' }), /message is required/);
  const concern = await submitConcern({ userId: 'patient-msg', subject: 'Billing', message: 'Need help' });
  assert.ok(concern.messageId.startsWith('msg-'));
  assert.equal(concern.status, 'OPEN');
  assert.equal(concern.replies.length, 0);

  const assigned = await assignConcernFromPubSub({ messageId: 'msg-assigned', userId: 'guest', message: 'Queued concern', assignedTo: 'coord-1' });
  assert.equal(assigned.assignedTo, 'coord-1');
  assert.equal(store.memory.messages.get('msg-assigned').status, 'OPEN');

  const patientMessages = await listMessages({ userId: 'patient-msg', role: 'patient' });
  assert.equal(patientMessages.length, 2);
  const coordinatorMessages = await listMessages({ userId: 'coord', role: 'coordinator' });
  assert.equal(coordinatorMessages.length, 2);
  await assert.rejects(() => listMessages({}), /Authentication required/);

  await assert.rejects(() => replyToMessage(concern.messageId, { userId: 'patient-msg', role: 'patient', body: 'No' }), /Coordinator access required/);
  await assert.rejects(() => replyToMessage(concern.messageId, { userId: 'coord', role: 'coordinator' }), /reply body is required/);
  const replied = await replyToMessage(concern.messageId, { userId: 'coord', role: 'coordinator', from: 'coord', body: 'We will help' });
  assert.equal(replied.status, 'IN_PROGRESS');
  assert.equal(replied.replies.length, 1);
}

run().then(() => console.log('messaging tests passed')).catch((error) => {
  console.error(error);
  process.exit(1);
});