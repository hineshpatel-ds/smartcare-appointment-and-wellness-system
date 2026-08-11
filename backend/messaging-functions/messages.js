const { config, memory, scanItems, getItem, putItem, mirrorToFirestore } = require('../lib/store');
const { createId, nowIso, requireSignedInContext, requireCoordinatorContext } = require('../lib/util');
const { publishSupportConcern } = require('../notifications-lambdas/notify');

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

module.exports = { submitConcern, assignConcernFromPubSub, listMessages, replyToMessage };

