import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'src', 'modules', 'auth', 'AuthPage.jsx'), 'utf8');

assert.match(source, /Stage \{stage === 'password' \? '1' : stage === 'question' \? '2' : '3'\} Login/, 'Login UI should present three sequential stages');
assert.match(source, /\/auth\/login\/start/, 'Stage 1 should call password login endpoint');
assert.match(source, /\/auth\/login\/security-question/, 'Stage 2 should call security-question endpoint');
assert.match(source, /\/auth\/login\/cipher/, 'Stage 3 should call healthcare code endpoint');
assert.match(source, /challenge\?\.cipherClue/, 'Cipher stage should show the generated clue');
assert.doesNotMatch(source, /challenge\?\.encryptedCode/, 'Cipher stage must not display the raw encrypted healthcare code');
assert.match(source, /type="password"\s+value=\{loginForm\.healthcareCode\}/, 'Healthcare code login input should be masked');
assert.match(source, /type="password"\s+value=\{register\.healthcareCode\}/, 'Healthcare code registration input should be masked');
assert.match(source, /reviewed by a wellness coordinator/, 'Doctor registration should communicate coordinator approval requirement');

console.log('frontend auth UI tests passed');