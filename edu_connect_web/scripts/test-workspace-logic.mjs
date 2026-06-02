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

const sandbox = {
  exports: {},
  module: { exports: {} },
  atob: globalThis.atob,
  localStorage: {
    removeItem() {},
  },
};
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(compiled, sandbox);

const {
  getInitialActiveRole,
  normalizeWorkspaceRoles,
  routeForRole,
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

console.log('workspace role logic passed');
