import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const projectRoot = process.cwd();
const errors = [];
const warnings = [];

function check(name, ok, detail) {
  if (ok) {
    console.log(`  ok  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    errors.push(name);
    console.error(`  fail ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function warn(name, detail) {
  warnings.push(name);
  console.log(`  warn ${name}${detail ? ` — ${detail}` : ''}`);
}

console.log('Cursor runtime checks\n');

check(
  'cursor-agent on PATH',
  (() => {
    try {
      execSync('which cursor-agent', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  })(),
);

check(
  '.cursor/mcp.json',
  existsSync(join(projectRoot, '.cursor/mcp.json')),
  'ai-sdlc MCP advisor',
);

check(
  '.cursor/rules/ai-sdlc.mdc',
  existsSync(join(projectRoot, '.cursor/rules/ai-sdlc.mdc')),
);

if (process.env.CURSOR_API_KEY) {
  check('CURSOR_API_KEY', true, 'set in environment');
} else if (existsSync(join(projectRoot, '.env'))) {
  warn('CURSOR_API_KEY', 'not in shell env — copy .env.example to .env and export');
} else {
  warn('CURSOR_API_KEY', 'missing — copy .env.example to .env before pipeline runs');
}

const runner = process.env.AI_SDLC_RUNNER ?? 'cursor';
check('AI_SDLC_RUNNER', runner === 'cursor', `value=${runner}`);

console.log('');
if (errors.length > 0) {
  console.error(`${errors.length} check(s) failed.`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.log(`${warnings.length} warning(s). Pipeline runs need CURSOR_API_KEY.`);
}

console.log('Cursor runtime is configured for AI-SDLC.');
