import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../e2e/week-five-problem-decomposition.spec.ts', import.meta.url), 'utf8');
const config = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');

test('registers W5-M4 full, fault, security, recovery, keyboard and budget evidence', () => {
  for (const tag of ['full', 'keyboard', 'storage', 'external', 'security', 'assets', 'runtime', 'corrupt', 'legacy', 'cold']) {
    assert.match(source, new RegExp(`@w5-m4-${tag}\\b`), `missing @w5-m4-${tag}`);
  }
  for (const stage of ['run', 'validation', 'observation', 'work', 'completion']) {
    assert.match(source, new RegExp(`stage === '${stage}'|\\['run', 'validation', 'observation', 'work', 'completion'\\]`), `missing ${stage} storage stage`);
  }
  assert.match(source, /weekFiveDecompositionPython\.worker-/);
  assert.match(source, /contest-courtyard-background\.webp/);
  assert.match(source, /formalW5M3Prerequisite/);
  assert.match(source, /record-ownership-conflict/);
  assert.match(source, /coordinator-call-conflict/);
});

test('runs W5-M4 through all five approved Playwright projects', () => {
  assert.equal((config.match(/@w5-m\[12345\]-/g) ?? []).length, 5);
  assert.match(config, /workers:\s*1/);
  assert.match(config, /retries:\s*0/);
});
