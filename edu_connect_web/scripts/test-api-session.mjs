import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8');

assert.match(source, /api\.interceptors\.response\.use/);
assert.match(source, /\/auth\/refresh/);
assert.match(source, /\/auth\/logout/);
assert.match(source, /_skipAuthRefresh/);
assert.match(source, /_retry/);
assert.match(source, /storeSessionTokens/);
assert.match(source, /logoutSession/);

console.log('web API session refresh/logout logic present');
