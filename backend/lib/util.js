const crypto = require('crypto');

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
  if (!userId || !['patient', 'doctor', 'coordinator'].includes(role)) {
    throw new Error('Authentication required');
  }
}

function requireCoordinatorContext({ userId, role } = {}) {
  if (!userId || role !== 'coordinator') {
    throw new Error('Coordinator access required');
  }
}

module.exports = {
  nowIso,
  jsonResponse,
  parseBody,
  createId,
  hashPassword,
  caesarCipher,
  normalizeAnswer,
  isUpcomingAppointmentSlot,
  requireSignedInContext,
  requireCoordinatorContext
};
