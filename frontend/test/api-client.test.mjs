import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'src', 'api', 'client.js'), 'utf8');

assert.match(source, /export function todayDate\(\)/, 'API client should export todayDate for appointment date constraints');
assert.match(source, /toISOString\(\)\.slice\(0, 10\)/, 'todayDate should use YYYY-MM-DD format for date inputs');
assert.match(source, /window\.__SAWS_CONFIG__/, 'API client should support runtime Cloud Run configuration');
assert.match(source, /VITE_API_BASE_URL/, 'API client should support Vite API base override');
assert.match(source, /localStorage\.getItem\('sawsApiBase'\)/, 'API client should support local API base override');
assert.match(source, /'Content-Type': 'application\/json'/, 'API requests should send JSON headers by default');
assert.match(source, /if \(!response\.ok\) throw new Error/, 'API client should throw for non-2xx responses');

console.log('frontend API client tests passed');