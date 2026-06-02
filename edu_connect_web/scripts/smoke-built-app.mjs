import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.WEB_PREVIEW_PORT || '4181');
const url = `http://127.0.0.1:${port}/`;
const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
const webRoot = fileURLToPath(new URL('..', import.meta.url));

const child = spawn(
  process.execPath,
  [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(port)],
  {
    cwd: webRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
);

let stdout = '';
let stderr = '';
child.stdout.on('data', (chunk) => {
  stdout += chunk.toString();
});
child.stderr.on('data', (chunk) => {
  stderr += chunk.toString();
});

async function fetchAppShell() {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      const body = await response.text();
      if (response.ok && body.includes('<div id="root">')) {
        return body;
      }
      lastError = new Error(`Unexpected response ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw lastError || new Error('Preview server did not respond');
}

try {
  const body = await fetchAppShell();
  assert.match(body, /\/assets\/index-[^"]+\.js/);
  assert.match(body, /\/assets\/index-[^"]+\.css/);
  console.log('built web app preview smoke passed');
} catch (error) {
  console.error('built web app preview smoke failed');
  console.error(`stdout:\n${stdout}`);
  console.error(`stderr:\n${stderr}`);
  console.error(error);
  process.exitCode = 1;
} finally {
  child.kill();
}
