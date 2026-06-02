import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REQUIRED_ENV = ['VITE_API_BASE_URL'];
const DEFAULT_MODE = 'production';

function parseEnvValue(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

async function readEnvFile(path) {
  if (!existsSync(path)) {
    return {};
  }
  const env = {};
  const content = await readFile(path, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) {
      env[match[1]] = parseEnvValue(match[2]);
    }
  }
  return env;
}

async function loadViteEnv(mode) {
  const files = ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`];
  const merged = {};
  for (const file of files) {
    Object.assign(merged, await readEnvFile(file));
  }
  return { ...merged, ...process.env };
}

function looksLikePlaceholder(value) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes('replace_with') ||
    normalized.includes('your_') ||
    normalized.includes('todo') ||
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1') ||
    normalized.includes('0.0.0.0') ||
    normalized.includes('[::1]') ||
    normalized.includes('example.com') ||
    normalized.includes('example.org') ||
    normalized.includes('example.net')
  );
}

export function validateWebEnv(env, { mode = DEFAULT_MODE } = {}) {
  const failures = [];
  for (const key of REQUIRED_ENV) {
    if (!env[key]?.trim()) {
      failures.push(`${key} is required for production web builds.`);
    }
  }

  const apiBaseURL = env.VITE_API_BASE_URL?.trim();
  if (apiBaseURL) {
    let parsed;
    try {
      parsed = new URL(apiBaseURL);
    } catch {
      failures.push('VITE_API_BASE_URL must be an absolute URL.');
    }

    if (parsed) {
      if (mode === 'production' && parsed.protocol !== 'https:') {
        failures.push('VITE_API_BASE_URL must use HTTPS for production builds.');
      }
      if (looksLikePlaceholder(apiBaseURL)) {
        failures.push('VITE_API_BASE_URL must not be localhost or a placeholder value.');
      }
    }
  }

  return failures;
}

export async function validateCurrentWebEnv({ mode = DEFAULT_MODE } = {}) {
  return validateWebEnv(await loadViteEnv(mode), { mode });
}

const runningAsScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (runningAsScript) {
  const modeFlagIndex = process.argv.indexOf('--mode');
  const mode = modeFlagIndex >= 0 ? process.argv[modeFlagIndex + 1] : DEFAULT_MODE;
  const failures = await validateCurrentWebEnv({ mode });
  if (failures.length) {
    console.error('web production environment check failed');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
  } else {
    console.log('web production environment check passed');
  }
}
