import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'src', 'modules', 'dashboard', 'PatientDashboard.jsx'), 'utf8');

assert.match(source, /import \{ useApi, todayDate \}/, 'Patient dashboard should import todayDate helper');
assert.match(source, /type="date"[\s\S]*min=\{todayDate\(\)\}/, 'Appointment date input should prevent selecting past dates in the UI');
assert.match(source, /selected\.getTime\(\) <= Date\.now\(\)/, 'Appointment submit handler should reject past date/time selections');
assert.match(source, /Choose a service and an upcoming date and time\./, 'Past appointment validation should show a clear error');
assert.match(source, /request\('\/appointments'/, 'Appointment form should POST to appointments API');
assert.match(source, /Appointment History[\s\S]*scroll-area/, 'Appointment history should use a scrollable area');

console.log('frontend appointment UI tests passed');