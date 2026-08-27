import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assertWeekThreeCuilanE2ESourceContract } from './check-week-three-cuilan-e2e-contract.mjs';

const actual = () => readFileSync(fileURLToPath(new URL('../e2e/week-three-cuilan-boolean.spec.ts', import.meta.url)), 'utf8');
const packageJson = () => JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'));
const compliant = `
 @w3-m2-full @w3-m2-keyboard @w3-m2-storage @w3-m2-corrupt @w3-m2-parent @w3-m2-cold @w3-m2-asset-fault @w3-m2-narrow @w3-m2-external @w3-m2-lazy
 火眼金睛·条件观察
 WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES
 选择进度文件 减弱动画 关闭声音 下载损坏原文
 function attachHealth() {} const healthEvents = new WeakMap()
 let expectedFailureUrl = null; function expectedFailure(value) { return expectedFailureUrl !== null && (value === expectedFailureUrl || value.includes(expectedFailureUrl)); }
 page.addInitScript(() => {})
 test.afterEach(async ({ page }) => { expect(healthEvents.get(page), 'unexpected W3-M2 browser health events').toEqual([]); })
 const stale = await context.newPage(); attachHealth(stale); try {} finally { try { expect(healthEvents.get(stale), 'unexpected W3-M2 stale-page browser health events').toEqual([]); } finally { await stale.close(); } }
`;

test('requires the W3-M2 browser matrix and rejects hidden success or filtered health checks', () => {
  assert.doesNotThrow(() => assertWeekThreeCuilanE2ESourceContract(compliant));
  for (const required of ['@w3-m2-full', '@w3-m2-keyboard', '@w3-m2-storage', '@w3-m2-corrupt', '@w3-m2-parent', '@w3-m2-cold', '@w3-m2-asset-fault', '@w3-m2-narrow', '@w3-m2-external', '@w3-m2-lazy']) assert.throws(() => assertWeekThreeCuilanE2ESourceContract(compliant.replace(required, '')), new RegExp(required));
  for (const required of ['选择进度文件', '减弱动画', '关闭声音', '下载损坏原文']) assert.throws(() => assertWeekThreeCuilanE2ESourceContract(compliant.replace(required, '')), new RegExp(required));
  for (const forbidden of ["expectedSequence: []", 'LegacyMissionBuilder', 'MissionTools', "page.evaluate(() => progress.sessions['w3-m2'] = success)", "page.evaluate(() => progress.missions['w3-m2'] = success)", 'healthEvents.filter(Boolean)', 'healthEvents = []']) assert.throws(() => assertWeekThreeCuilanE2ESourceContract(`${compliant}\n${forbidden}`), /legacy|inject|health|hidden/i);
});

test('rejects indirect W3-M2 state writes, health tampering, and dynamic execution shortcuts', () => {
  for (const forbidden of [
    "page.evaluate(() => { progress.sessions['w3-m2'].lastRun = success })",
    "page.evaluate(() => { progress['sessions']['w3-m2'].lastRun = success })",
    "page.evaluate(() => { const session = progress.sessions['w3-m2']; session.lastRun = success })",
    "page.evaluate(() => Object.assign(progress.sessions['w3-m2'], { lastRun: success }))",
    "page.evaluate(() => Reflect.set(progress.missionCompletionEvidence, 'w3-m2', success))",
    "page.evaluate(() => { progress.missions['w3-m2'] = success })",
    "healthEvents.get(page).length = 0",
    "healthEvents.get(page).splice(0)",
    "healthEvents.get(page).pop()",
    "healthEvents.get(page).shift()",
    "const events = healthEvents.get(page); events.length = 0",
    "const events = healthEvents.get(page); const alias = events; alias.pop()",
    "const [events] = [healthEvents.get(page)]; events.shift()",
    "eval('progress.sessions[\\\"w3-m2\\\"].lastRun = success')",
    "Function('progress.sessions[\\\"w3-m2\\\"].lastRun = success')()",
    "setTimeout('healthEvents.get(page).length = 0', 0)",
    "Object.assign(Array.prototype, { pop: () => undefined })",
    "page.evaluate(replayW3M2)",
    "page.addInitScript(seedW3M2)",
    "page.evaluate(() => { const x = 'w3-m2'; localStorage.setItem('x', x) })",
    "const events = healthEvents.get(page); Array.prototype.pop.call(events)",
    "Reflect.apply(Array.prototype.pop, healthEvents.get(page), [])",
    "const events = healthEvents.get(page); const { pop } = events; pop.call(events)",
  ]) assert.throws(() => assertWeekThreeCuilanE2ESourceContract(`${compliant}\n${forbidden}`), /forbidden|inject|health|dynamic/i, forbidden);
});

test('binds the contract to the real W3-M2 Playwright file', () => assert.doesNotThrow(() => assertWeekThreeCuilanE2ESourceContract(actual())));

test('is included in the npm bundle-contract gate', () => {
  assert.match(packageJson().scripts['test:bundle-script'], /scripts\/check-week-three-cuilan-e2e-contract\.test\.mjs/);
});
