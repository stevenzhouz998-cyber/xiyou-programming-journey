import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assertWeekThreeManorHelpE2ESourceContract } from './check-week-three-manor-help-e2e-contract.mjs';

const actualE2ESource = () => readFileSync(
  fileURLToPath(new URL('../e2e/week-three-manor-help-condition.spec.ts', import.meta.url)),
  'utf8',
);

const compliantSource = `
  test('@w3-m1-full @w3-m1-keyboard @w3-m1-storage @w3-m1-corrupt @w3-m1-parent', () => {})
  test('@w3-m1-cold @w3-m1-asset-fault @w3-m1-narrow @w3-m1-external @w3-m1-lazy', () => {})
  火眼金睛·条件观察
  练习情境·不改变原著
  WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES
  function attachHealth() {}
  const healthEvents = new WeakMap()
  let expectedFailureUrl = null
  function expectedFailure(urlOrDetail) { return expectedFailureUrl !== null && (urlOrDetail === expectedFailureUrl || urlOrDetail.includes(expectedFailureUrl)); }
  const blocklyAbort = (url, detail) => url === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(detail)
  async function attach(page, testInfo, name) { const path = testInfo.outputPath(\`${'${name}'}-${'${testInfo.project.name}'}.png\`); await page.screenshot({ path, fullPage: true }); await testInfo.attach(\`${'${name}'}-${'${testInfo.project.name}'}.png\`, { path, contentType: 'image/png' }); }
  page.addInitScript(() => {})
  test.afterEach(async ({ page }) => { expect(healthEvents.get(page), 'unexpected W3-M1 browser health events').toEqual([]); })
`;

test('requires the W3-M1 browser evidence matrix and rejects legacy or direct completion injection', () => {
  assert.doesNotThrow(() => assertWeekThreeManorHelpE2ESourceContract(compliantSource));
  for (const required of [
    '@w3-m1-full',
    '@w3-m1-keyboard',
    '@w3-m1-storage',
    '@w3-m1-corrupt',
    '@w3-m1-parent',
    '@w3-m1-cold',
    '@w3-m1-asset-fault',
    '@w3-m1-narrow',
    '@w3-m1-external',
    '@w3-m1-lazy',
    '火眼金睛·条件观察',
    '练习情境·不改变原著',
    'WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES',
  ]) {
    assert.throws(() => assertWeekThreeManorHelpE2ESourceContract(compliantSource.replace(required, '')), new RegExp(required));
  }
  for (const injectedSuccess of [
    "expectedSequence: []",
    'LegacyMissionBuilder',
    'MissionTools',
    "sessions: { 'w3-m1': { completed: true } }",
    "missions: { 'w3-m1': { completed: true } }",
    "progress.sessions['w3-m1'] = { completed: true }",
    "progress.missions['w3-m1'] = { completed: true }",
    "progress.sessions = { 'w3-m1': { completed: true } }",
    "progress.missions = { 'w3-m1': { completed: true } }",
    "progress['sessions'] = { 'w3-m1': { completed: true } }",
    "progress['missions'] = { 'w3-m1': { completed: true } }",
    "Object.assign(progress.sessions, { 'w3-m1': { completed: true } })",
    "progress.missions['w3-m1'].completed = true",
    "progress.sessions['w3-m1'].lastRun = snapshot",
    "progress['missions']['w3-m1'].completed = true",
    "progress['sessions']['w3-m1']['lastRun'] = snapshot",
    "Object.assign(progress.missions['w3-m1'], { completed: true })",
    "Object.assign(progress['sessions']['w3-m1'], { lastRun: snapshot })",
  ]) {
    assert.throws(() => assertWeekThreeManorHelpE2ESourceContract(`${compliantSource}\n${injectedSuccess}`), /legacy|inject/i);
  }
  assert.doesNotThrow(() => assertWeekThreeManorHelpE2ESourceContract(`${compliantSource}\npage.evaluate(() => localStorage.getItem('xiyou-programming-progress-v3'))`));
  for (const forbidden of [
    'healthEvents = []',
    'healthEvents.filter(Boolean)',
    'healthEvents.length = 0',
    "page.evaluate(() => { progress.sessions['w3-m1'] = snapshot })",
    "page.addInitScript(() => { progress.missions['w3-m1'] = completed })",
  ]) assert.throws(() => assertWeekThreeManorHelpE2ESourceContract(`${compliantSource}\n${forbidden}`), /legacy|inject|health|hidden/i);
  for (const broadExemption of [
    'if (/503|Failed/.test(urlOrDetail)) return;',
    "if (new URL(urlOrDetail).hostname === 'static.blockly.com') return;",
    'if (response.status() === 503) return;',
  ]) assert.throws(() => assertWeekThreeManorHelpE2ESourceContract(`${compliantSource}\n${broadExemption}`), /health|exemption|broad/i);
});

test('binds the source contract to the real W3-M1 Playwright evidence file', () => {
  assert.doesNotThrow(() => assertWeekThreeManorHelpE2ESourceContract(actualE2ESource()));
});
