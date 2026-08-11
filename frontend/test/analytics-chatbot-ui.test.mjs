import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const analytics = readFileSync(join(process.cwd(), 'src', 'modules', 'analytics', 'AnalyticsPage.jsx'), 'utf8');
const chatbot = readFileSync(join(process.cwd(), 'src', 'components', 'Chatbot.jsx'), 'utf8');

assert.match(analytics, /request\(`\/analytics\/summary\?\$\{authedQuery\}`\)/, 'Analytics requests should include authenticated query context');
assert.match(analytics, /user\.role === 'coordinator'/, 'Analytics UI should expose coordinator-only platform metrics conditionally');
assert.match(analytics, /scroll-area analytics-scroll/, 'Analytics lists should be scrollable');
assert.match(analytics, /TITLES = \{[\s\S]*patient: 'My Activity'[\s\S]*coordinator: 'Platform Analytics'/, 'Analytics title should be role-aware');

assert.match(chatbot, /user\?\.userId/, 'Chatbot should pass signed-in userId when available');
assert.match(chatbot, /user\?\.role/, 'Chatbot should pass signed-in role when available');
assert.match(chatbot, /if \(!input\.trim\(\)\) return/, 'Chatbot should ignore empty messages');
assert.match(chatbot, /Ask about doctors, appointments, packages, support, or navigation\./, 'Chatbot should initialize with supported task prompt');

console.log('frontend analytics and chatbot UI tests passed');