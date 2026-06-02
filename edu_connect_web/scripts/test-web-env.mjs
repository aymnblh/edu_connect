import assert from 'node:assert/strict';

import { validateWebEnv } from './check-web-env.mjs';

assert.deepEqual(validateWebEnv({}, { mode: 'production' }), [
  'VITE_API_BASE_URL is required for production web builds.',
]);

assert.deepEqual(
  validateWebEnv({ VITE_API_BASE_URL: 'http://localhost:8000' }, { mode: 'production' }),
  [
    'VITE_API_BASE_URL must use HTTPS for production builds.',
    'VITE_API_BASE_URL must not be localhost or a placeholder value.',
  ],
);

assert.deepEqual(
  validateWebEnv({ VITE_API_BASE_URL: 'https://example.com' }, { mode: 'production' }),
  ['VITE_API_BASE_URL must not be localhost or a placeholder value.'],
);

assert.deepEqual(
  validateWebEnv({ VITE_API_BASE_URL: 'https://api.educonnect.dz' }, { mode: 'production' }),
  [],
);

console.log('web env validation logic passed');
