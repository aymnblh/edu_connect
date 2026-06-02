import { readFile, readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const distDir = process.argv[2] || 'dist';
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.map', '.svg', '.txt', '.webmanifest', '.xml']);
const allowedEnvNames = new Set(['VITE_API_BASE_URL']);

const rules = [
  {
    name: 'private key material',
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  },
  {
    name: 'JWT-looking literal',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    name: 'AWS access key literal',
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    name: 'Supabase service-role JWT literal',
    pattern: /\bservice_role\b.{0,80}\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/gi,
  },
  {
    name: 'backend-only environment name',
    pattern: /\b(DATABASE_URL|REDIS_URL|PRIVATE_KEY_PATH|PUBLIC_KEY_PATH|PREVIOUS_PUBLIC_KEY_PATH|SERVER_FINGERPRINT_SALT|PLATFORM_SECRET|NTFY_AUTH_TOKEN|TEST_DATABASE_URL)\b/g,
  },
  {
    name: 'hard-coded secret assignment',
    pattern: /\b(?:api[_-]?key|secret|password|private[_-]?key|service[_-]?role|token)\b\s*[:=]\s*["'][A-Za-z0-9_./+=:@-]{16,}["']/gi,
  },
];

function extensionFor(path) {
  const match = path.match(/(\.[^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

async function textFiles(root) {
  const pending = [root];
  const files = [];
  while (pending.length) {
    const current = pending.pop();
    const currentStat = await stat(current);
    if (currentStat.isDirectory()) {
      for (const entry of await readdir(current)) {
        pending.push(join(current, entry));
      }
      continue;
    }
    if (currentStat.isFile() && textExtensions.has(extensionFor(current))) {
      files.push(current);
    }
  }
  return files;
}

function lineAndColumn(content, index) {
  const before = content.slice(0, index);
  const lines = before.split('\n');
  return {
    line: lines.length,
    column: lines.at(-1).length + 1,
  };
}

function findingMessage(root, file, rule, content, match) {
  const location = lineAndColumn(content, match.index);
  const matched = match[0].replace(/\s+/g, ' ').slice(0, 120);
  return `${relative(root, file)}:${location.line}:${location.column} ${rule.name}: ${matched}`;
}

function scanContent(root, file, content) {
  const findings = [];
  for (const rule of rules) {
    for (const match of content.matchAll(rule.pattern)) {
      if (rule.name === 'backend-only environment name' && allowedEnvNames.has(match[1])) {
        continue;
      }
      findings.push(findingMessage(root, file, rule, content, match));
    }
  }
  return findings;
}

export async function scanBuiltArtifacts(root = distDir) {
  const files = await textFiles(root);
  const findings = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    findings.push(...scanContent(root, file, content));
  }
  return findings;
}

const runningAsScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (runningAsScript) {
  try {
    const findings = await scanBuiltArtifacts(distDir);
    if (findings.length) {
      console.error('built web artifact secret scan failed');
      for (const finding of findings) {
        console.error(`- ${finding}`);
      }
      process.exitCode = 1;
    } else {
      console.log('built web artifact secret scan passed');
    }
  } catch (error) {
    console.error('built web artifact secret scan failed');
    console.error(error);
    process.exitCode = 1;
  }
}
