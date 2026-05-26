import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { validateResource } from '@ai-sdlc/reference';

const coreResources = [
  'pipeline.yaml',
  'agent-role.yaml',
  'quality-gate.yaml',
  'autonomy-policy.yaml',
];

const configDir = join(process.cwd(), '.ai-sdlc');
let allValid = true;

for (const file of coreResources) {
  const doc = parse(readFileSync(join(configDir, file), 'utf-8'));
  const result = validateResource(doc);

  if (result.valid) {
    console.log(`${file}: valid`);
    continue;
  }

  allValid = false;
  console.error(`${file}: invalid`);
  for (const err of result.errors ?? []) {
    console.error(`  ${err.path}: ${err.message}`);
  }
}

process.exit(allValid ? 0 : 1);
