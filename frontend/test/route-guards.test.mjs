import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'src', 'App.jsx'), 'utf8');
const guard = readFileSync(join(process.cwd(), 'src', 'components', 'RequireAuth.jsx'), 'utf8');
const dashboard = readFileSync(join(process.cwd(), 'src', 'modules', 'dashboard', 'Dashboard.jsx'), 'utf8');

assert.match(guard, /if \(!user\) return <Navigate to="\/auth" replace \/>/, 'RequireAuth should redirect anonymous users to auth');
assert.match(app, /path="\/dashboard"[\s\S]*<RequireAuth>[\s\S]*<Dashboard \/>[\s\S]*<\/RequireAuth>/, 'Dashboard route should require authentication');
assert.match(app, /path="\/analytics"[\s\S]*<RequireAuth>[\s\S]*<AnalyticsPage \/>[\s\S]*<\/RequireAuth>/, 'Analytics route should require authentication');
assert.match(dashboard, /user\.role === 'doctor'[\s\S]*<DoctorDashboard \/>/, 'Doctor users should see doctor dashboard');
assert.match(dashboard, /user\.role === 'coordinator'[\s\S]*<CoordinatorDashboard \/>/, 'Coordinator users should see coordinator dashboard');
assert.match(dashboard, /return <PatientDashboard \/>/, 'Patients should fall back to patient dashboard');

console.log('frontend route guard tests passed');