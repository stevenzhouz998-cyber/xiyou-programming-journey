import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { assertWeekThreeBossE2ESourceContract, W3_M5_TAGS } from './check-week-three-boss-e2e-contract.mjs';

const actual = () => readFileSync(fileURLToPath(new URL('../e2e/week-three-boss.spec.ts', import.meta.url)), 'utf8');

test('requires the full W3-M5 evidence matrix', () => {
  assert.throws(() => assertWeekThreeBossE2ESourceContract(''), /missing/i);
});

test('rejects W3-M5 browser-state injection, legacy shortcuts, dynamic code, and health tampering', () => {
  const base = `// ${W3_M5_TAGS.join(' ')}\nfunction formalW3M4Prerequisite() { return 'legal'; }\nattachHealth(page); test.afterEach(() => expect(healthEvents.get(page)).toEqual([]));`;
  for (const injected of [
    "page.evaluate(() => localStorage.setItem('x', JSON.stringify({ missions: { 'w3-m5': true } })))",
    "page.addInitScript(() => localStorage.setItem('x', JSON.stringify({ sessions: { 'w3-m5': {} } })))",
    'expectedSequence', 'LegacyMissionBuilder', 'MissionTools', 'eval("x")', 'new Function("x")', 'healthEvents.clear()',
  ]) assert.throws(() => assertWeekThreeBossE2ESourceContract(`${base}\n${injected}`), /forbidden|injection|health|dynamic|legacy/i);
});

test('requires real visible repair, success, recovery, and five-project collection evidence', () => {
  const helper = "function formalW3M4Prerequisite() { return 'legal'; }";
  const minimal = `// ${W3_M5_TAGS.join(' ')}\n${helper}\nconst W3_M4_PREREQUISITE_SHA256 = '${createHash('sha256').update(helper).digest('hex')}';\nattachHealth(page); test.afterEach(() => expect(healthEvents.get(page)).toEqual([]));`;
  assert.throws(() => assertWeekThreeBossE2ESourceContract(minimal), /repair|success|storage|project|skip/i);
});

test('binds the AST gate to the real W3-M5 browser file', () => {
  assert.doesNotThrow(() => assertWeekThreeBossE2ESourceContract(actual()));
});
