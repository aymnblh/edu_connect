import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scanBuiltArtifacts } from './check-built-secrets.mjs';

const root = await mkdtemp(join(tmpdir(), 'educonnect-secret-scan-'));

try {
  await writeFile(
    join(root, 'safe.js'),
    `
const apiBaseUrl = "https://api.educonnect.example";
localStorage.getItem("access_token");
headers.Authorization = "Bearer " + token;
throw new Error("VITE_API_BASE_URL is required for production builds.");
`,
    'utf8',
  );
  assert.deepEqual(await scanBuiltArtifacts(root), []);

  await writeFile(
    join(root, 'leak.js'),
    `
const DATABASE_URL = "postgresql://user:password@example.com/db";
const leaked = "-----BEGIN PRIVATE KEY-----";
const jwt = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123456789xyz";
`,
    'utf8',
  );

  const findings = await scanBuiltArtifacts(root);
  assert(findings.some((finding) => finding.includes('backend-only environment name')));
  assert(findings.some((finding) => finding.includes('private key material')));
  assert(findings.some((finding) => finding.includes('JWT-looking literal')));
  console.log('secret scanner logic passed');
} finally {
  await rm(root, { recursive: true, force: true });
}
