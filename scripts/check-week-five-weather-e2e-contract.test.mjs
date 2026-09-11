import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../e2e/week-five-function-parameter.spec.ts', import.meta.url), 'utf8');
const config = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');

test('registers W5-M3 full, fault, security, recovery, keyboard and cold evidence', () => {
  for (const tag of ['full', 'keyboard', 'storage', 'external', 'security', 'assets', 'runtime', 'corrupt', 'legacy', 'cold']) {
    assert.match(source, new RegExp(`@w5-m3-${tag}\\b`), `missing @w5-m3-${tag}`);
  }
  for (const stage of ['run', 'validation', 'observation', 'work', 'completion']) {
    assert.match(source, new RegExp(`stage === '${stage}'|\\['run', 'validation', 'observation', 'work', 'completion'\\]`), `missing ${stage} storage stage`);
  }
  assert.match(source, /weekFiveWeatherPython\.worker-/);
  assert.match(source, /rain-altar-background\.webp/);
  assert.match(source, /formalW5M2Prerequisite/);
});

test('runs W5-M3 through all five approved Playwright projects', () => {
  assert.equal((config.match(/@w5-m\[12345\]-/g) ?? []).length, 5);
  assert.match(config, /workers:\s*1/);
  assert.match(config, /retries:\s*0/);
});
