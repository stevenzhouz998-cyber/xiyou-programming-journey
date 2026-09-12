import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../e2e/week-six-structured-records.spec.ts', import.meta.url), 'utf8');
const config = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');

test('registers W6-M1 full, persistence, security-adjacent runtime, recovery, parent and budget evidence', () => {
  for (const tag of ['full', 'storage', 'external', 'assets', 'runtime', 'corrupt', 'parent', 'legacy', 'security', 'lazy', 'home-lazy', 'cold']) assert.match(source, new RegExp(`@w6-m1-${tag}\\b`), `missing @w6-m1-${tag}`);
  for (const stage of ['draft', 'validation', 'run', 'observation', 'work', 'completion']) assert.match(source, new RegExp(`'${stage}'`), `missing ${stage} recovery stage`);
  assert.match(source, /weekSixRecordsPython/);
  assert.match(source, /flaming-mountain-background\.webp/);
  assert.match(source, /formalW5M5Prerequisite/);
  assert.match(source, /toEqual\(beforeReplay\)/);
});

test('runs the W6-M1 full and cold paths through all five approved projects', () => {
  assert.equal((config.match(/@w6-m1-full/g) ?? []).length, 5);
  assert.match(config, /workers:\s*1/); assert.match(config, /retries:\s*0/);
});
