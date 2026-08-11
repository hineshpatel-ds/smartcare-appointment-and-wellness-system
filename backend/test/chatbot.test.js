const assert = require('assert');
const os = require('os');
const path = require('path');

process.env.FORCE_LOCAL_STORE = 'true';
process.env.ENABLE_DB_MIRRORING = 'false';
process.env.LOCAL_DATA_DIR = path.join(os.tmpdir(), `saws-chatbot-test-${process.pid}`);

const store = require('../lib/store');
const { defaultServices } = require('../appointment-lambdas/services');
const { chatbotReply } = require('../chatbot-functions/chatbot');

function resetMemory() {
  for (const map of Object.values(store.memory)) map.map.clear();
  for (const service of defaultServices) store.memory.services.set(service.serviceId, service);
}

async function run() {
  resetMemory();
  store.memory.appointments.set('apt-chat-1', {
    appointmentId: 'apt-chat-1',
    userId: 'patient-chat',
    doctorId: 'doctor-chat',
    service: 'General Healthcare Consultation',
    date: '2026-09-03',
    time: '11:00',
    doctorName: 'Dr Chat',
    status: 'CONFIRMED'
  });

  await assert.rejects(() => chatbotReply({ message: '' }), /message is required/);
  const lookup = await chatbotReply({ message: 'show apt-chat-1' });
  assert.ok(lookup.reply.includes('apt-chat-1'));
  assert.ok(lookup.reply.includes('CONFIRMED'));

  const mine = await chatbotReply({ message: 'my appointment reference code', userId: 'patient-chat', role: 'patient' });
  assert.ok(mine.reply.includes('apt-chat-1'));

  const serviceReply = await chatbotReply({ message: 'service price package' });
  assert.ok(serviceReply.reply.includes('costs $'));

  const concernReply = await chatbotReply({ message: 'I need support help', userId: 'patient-chat' });
  assert.ok(concernReply.reply.includes('Reference: msg-'));

  const navigation = await chatbotReply({ message: 'where is dashboard' });
  assert.ok(navigation.reply.includes('Dashboard'));

  const fallback = await chatbotReply({ message: 'hello' });
  assert.ok(fallback.reply.includes('navigation'));
}

run().then(() => console.log('chatbot tests passed')).catch((error) => {
  console.error(error);
  process.exit(1);
});