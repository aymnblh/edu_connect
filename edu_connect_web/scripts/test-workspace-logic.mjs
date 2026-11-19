import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/lib/workspace.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const localStore = new Map();
const sessionStore = new Map();
const makeStorage = (map) => ({
  getItem: (k) => (map.has(k) ? map.get(k) : null),
  setItem: (k, v) => map.set(k, String(v)),
  removeItem: (k) => map.delete(k),
});

const sandbox = {
  exports: {},
  module: { exports: {} },
  atob: globalThis.atob,
  localStorage: makeStorage(localStore),
  sessionStorage: makeStorage(sessionStore),
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(compiled, sandbox);

const {
  clearWorkspaceStorage,
  getInitialActiveRole,
  normalizeWorkspaceRoles,
  readWorkspaceSessionItem,
  routeForRole,
  storeWorkspaceSessionItem,
  workspaceRolesFromSession,
} = sandbox.module.exports;

function jwtWithPayload(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `header.${encoded}.signature`;
}

assert.equal(JSON.stringify(normalizeWorkspaceRoles(['parent', 'teacher', 'parent', 'unknown'])), JSON.stringify(['teacher', 'parent']));
assert.equal(getInitialActiveRole(['teacher', 'parent'], null), null);
assert.equal(getInitialActiveRole(['teacher', 'parent'], 'parent'), 'parent');
assert.equal(getInitialActiveRole(['teacher'], null), 'teacher');
assert.equal(routeForRole('teacher'), '/teacher/dashboard');
assert.equal(routeForRole('parent'), '/parent/dashboard');

const token = jwtWithPayload({ user_roles: ['parent', 'teacher'] });
assert.equal(JSON.stringify(workspaceRolesFromSession({ role: 'parent' }, token)), JSON.stringify(['teacher', 'parent']));
assert.equal(JSON.stringify(workspaceRolesFromSession({ roles: ['principal', 'parent'] }, null)), JSON.stringify(['principal', 'parent']));

// Security: tokens and user PII must never be persisted into localStorage.
localStore.set('wasel_driver_offline_events', '[{"trip_id":"t1"}]');
storeWorkspaceSessionItem('access_token', 'jwt-secret-token', true);
storeWorkspaceSessionItem('user', '{"id":"u1"}', true);
assert.equal(localStore.has('access_token'), false);
assert.equal(localStore.has('user'), false);
assert.equal(readWorkspaceSessionItem('access_token'), 'jwt-secret-token');
clearWorkspaceStorage();
assert.equal(readWorkspaceSessionItem('access_token'), null);
assert.equal(localStore.has('wasel_driver_offline_events'), false);

console.log('workspace role logic passed');
