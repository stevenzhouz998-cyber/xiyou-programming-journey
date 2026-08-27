import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assertWeekThreeYunzhanDialogueE2ESourceContract } from './check-week-three-yunzhan-dialogue-e2e-contract.mjs';
const actual = () => readFileSync(fileURLToPath(new URL('../e2e/week-three-yunzhan-dialogue.spec.ts', import.meta.url)), 'utf8');
test('requires the W3-M3 browser evidence matrix and rejects legacy shortcuts', () => {
  assert.throws(() => assertWeekThreeYunzhanDialogueE2ESourceContract(''), /missing/);
});

test('rejects direct W3-M3 browser-state injection and unclosed extra pages', () => {
  const evidence = `
    const stale = await context.newPage();
    await stale.addInitScript(() => localStorage.setItem('xiyou-programming-progress-v3', JSON.stringify({ sessions: { 'w3-m3': {} } })));
    test.afterEach(async ({ page }) => { expect(healthEvents.get(page)).toEqual([]); });
    // ${['@w3-m3-full', '@w3-m3-keyboard', '@w3-m3-storage', '@w3-m3-corrupt', '@w3-m3-parent', '@w3-m3-cold', '@w3-m3-asset-fault', '@w3-m3-narrow', '@w3-m3-external', '@w3-m3-lazy'].join(' ')}
    attachHealth(page);
  `;
  assert.throws(() => assertWeekThreeYunzhanDialogueE2ESourceContract(evidence), /direct browser storage write|lacks attachHealth|finally close/);
});

test('binds the anti-shortcut gate to the actual W3-M3 browser file', () => {
  assert.doesNotThrow(() => assertWeekThreeYunzhanDialogueE2ESourceContract(actual()));
});
