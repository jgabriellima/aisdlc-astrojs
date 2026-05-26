#!/usr/bin/env node
/**
 * AI-SDLC CLI wrapper — forces Cursor as the default agent runner.
 *
 * The stock `ai-sdlc run` falls back to ClaudeCodeRunner when no runner
 * is injected. This wrapper resolves CursorRunner when AI_SDLC_RUNNER=cursor
 * (the default for this project).
 */
import { spawn, execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { CursorRunner, Orchestrator } from '@ai-sdlc/orchestrator';

const projectRoot = process.cwd();

function loadEnvFile() {
  const envPath = join(projectRoot, '.env');
  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function bootstrapGitHubEnv() {
  try {
    const ghToken = execSync('gh auth token', { encoding: 'utf8' }).trim();
    if (ghToken) {
      process.env.GITHUB_TOKEN = ghToken;
      process.env.GH_TOKEN = ghToken;
    }
  } catch {
    if (!process.env.GITHUB_TOKEN && process.env.GH_TOKEN) {
      process.env.GITHUB_TOKEN = process.env.GH_TOKEN;
    }
  }

  if (process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY_OWNER) {
    return;
  }

  try {
    const remote = execSync('git remote get-url origin', {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim();
    const match = remote.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (!match) {
      return;
    }
    process.env.GITHUB_REPOSITORY_OWNER ??= match[1];
    process.env.GITHUB_REPOSITORY ??= `${match[1]}/${match[2]}`;
  } catch {
    // origin not configured yet
  }
}

loadEnvFile();
bootstrapGitHubEnv();
const orchestratorCli = join(
  projectRoot,
  'node_modules/@ai-sdlc/orchestrator/dist/cli/index.js',
);

const args = process.argv.slice(2);
const runnerName = process.env.AI_SDLC_RUNNER ?? 'cursor';
const configDir = process.env.AI_SDLC_CONFIG_DIR ?? '.ai-sdlc';

function parseIssueId(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--issue' || argv[i] === '-i') {
      return argv[i + 1];
    }
    if (argv[i].startsWith('--issue=')) {
      return argv[i].slice('--issue='.length);
    }
  }
  return undefined;
}

function parseStatePath(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--state') {
      return argv[i + 1];
    }
  }
  return undefined;
}

async function runWithCursorRunner(issueId, statePath) {
  if (!process.env.CURSOR_API_KEY) {
    console.error(
      'CURSOR_API_KEY is required for Cursor pipeline runs. Copy .env.example to .env and export the key.',
    );
    process.exit(1);
  }

  const orchestrator = new Orchestrator({
    configDir,
    workDir: projectRoot,
    statePath,
    runner: new CursorRunner(),
  });

  try {
    const result = await orchestrator.run(issueId);
    console.log(
      JSON.stringify(
        {
          issueId,
          runner: 'cursor',
          prUrl: result.prUrl,
          filesChanged: result.filesChanged.length,
          promotionEligible: result.promotionEligible,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    orchestrator.close();
  }
}

async function startWithCursorRunner(statePath) {
  if (!process.env.CURSOR_API_KEY) {
    console.error(
      'CURSOR_API_KEY is required for Cursor watch mode. Copy .env.example to .env and export the key.',
    );
    process.exit(1);
  }

  const orchestrator = new Orchestrator({
    configDir,
    workDir: projectRoot,
    statePath,
    runner: new CursorRunner(),
  });

  const handle = await orchestrator.start();
  console.log('[ai-sdlc] Watch mode started with Cursor runner. Press Ctrl+C to stop.');

  const shutdown = () => {
    console.log('\n[ai-sdlc] Shutting down...');
    handle.stop();
    orchestrator.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function main() {
  bootstrapGitHubEnv();
  const command = args[0];

  if (command === 'run' && runnerName === 'cursor') {
    const issueId = parseIssueId(args.slice(1));
    if (!issueId) {
      console.error('Usage: npm run ai-sdlc -- run --issue <id>');
      process.exit(1);
    }
    await runWithCursorRunner(issueId, parseStatePath(args.slice(1)));
    return;
  }

  if (command === 'start' && runnerName === 'cursor') {
    await startWithCursorRunner(parseStatePath(args.slice(1)));
    return;
  }

  const child = spawn(process.execPath, [orchestratorCli, ...args], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main();
