import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assertWeekThreeBajieJoiningE2ESourceContract, W3_M4_TAGS } from './check-week-three-bajie-joining-e2e-contract.mjs';

const actual = () => readFileSync(fileURLToPath(new URL('../e2e/week-three-bajie-joining.spec.ts', import.meta.url)), 'utf8');
test('requires the W3-M4 browser evidence matrix and rejects shortcuts', () => {
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(''), /missing/);
});
test('rejects direct W3-M4 state injection and unclosed pages', () => {
  const evidence = `async function proof(context: any) { const stale = await context.newPage(); attachHealth(page); try { await stale.addInitScript(() => localStorage.setItem('x', JSON.stringify({ sessions: { 'w3-m4': {} } }))); } finally { await stale.close(); } } test.afterEach(() => expect(healthEvents.get(page)).toEqual([])); // ${W3_M4_TAGS.join(' ')}`;
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(evidence), /direct W3-M4 browser storage write|lacks attachHealth|finally close/);
});
test('rejects computed mission keys and any browser storage write outside the two approved helpers', () => {
  const evidence = `// ${W3_M4_TAGS.join(' ')}\nattachHealth(page); test.afterEach(() => expect(healthEvents.get(page)).toEqual([])); page.evaluate(() => { const key = ['w3', 'm4'].join('-'); const progress = { missions: {} }; progress.missions[key] = { completed: true }; localStorage.setItem(CURRENT_KEY, JSON.stringify(progress)); });`;
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(evidence), /storage|progress|injection/i);
  const alias = `// ${W3_M4_TAGS.join(' ')}\nattachHealth(page); test.afterEach(() => expect(healthEvents.get(page)).toEqual([])); page.evaluate(() => { const key = \`w3-${'m4'}\`; const progress = { sessions: {} }; Object.assign(progress.sessions, { [key]: { proof: true } }); sessionStorage.removeItem(CURRENT_KEY); });`;
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(alias), /storage|progress|injection/i);
});
test('rejects health aliases and computed extra-page factories', () => {
  const healthAlias = `// ${W3_M4_TAGS.join(' ')}\nattachHealth(page); test.afterEach(() => expect(healthEvents.get(page)).toEqual([])); const h = healthEvents.get(page); h.length = 0;`;
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(healthAlias), /health/i);
  const pageAlias = `// ${W3_M4_TAGS.join(' ')}\nattachHealth(page); test.afterEach(() => expect(healthEvents.get(page)).toEqual([])); async function probe() { const k = 'new' + 'Page'; const stale = await page.context()[k](); attachHealth(stale); try { } finally { await stale.close(); } }`;
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(pageAlias), /newPage|computed|page/i);
  const reflectedPage = `// ${W3_M4_TAGS.join(' ')}\nattachHealth(page); test.afterEach(() => expect(healthEvents.get(page)).toEqual([])); async function probe() { const stale = await Reflect.get(page.context(), 'newPage')(); attachHealth(stale); try { } finally { await stale.close(); } }`;
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(reflectedPage), /newPage|computed|page/i);
});
test('rejects forged W3-M4 prerequisite bodies and multi-write MODE_KEY callbacks', () => {
  const forgedHelper = actual().replace("return serializeProgress(completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 }));", "progress.sessions['w3-m4'] = {} as never; return serializeProgress(completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 }));");
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(forgedHelper), /forged|W3-M4/i);
  const forgedMode = actual().replace("page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY)", "page.evaluate((key) => { localStorage.setItem(key, 'off'); localStorage.setItem(CURRENT_KEY, 'forged'); }, MODE_KEY)");
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(forgedMode), /storage|injection/i);
  const dynamicSession = actual().replace("return serializeProgress(completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 }));", "const key = ['w3', 'm4'].join('-'); progress.sessions[key] = {} as never; return serializeProgress(completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 }));");
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(dynamicSession), /forged|progress|subscript|prerequisite review/i);
  const dynamicEvidence = actual().replace("return serializeProgress(completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 }));", "const key = ['w3', 'm4'].join('-'); progress.missionCompletionEvidence[key] = {} as never; return serializeProgress(completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 }));");
  assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(dynamicEvidence), /forged|progress|subscript|prerequisite review/i);
  for (const injected of ["const copy = progress; copy.sessions[key] = {} as never;", "const { sessions } = progress; sessions[key] = {} as never;", "const copy = { ...progress }; copy.missionCompletionEvidence[key] = {} as never;"]) {
    const alias = actual().replace("return serializeProgress(completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 }));", `const key = ['w3', 'm4'].join('-'); ${injected} return serializeProgress(completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 }));`);
    assert.throws(() => assertWeekThreeBajieJoiningE2ESourceContract(alias), /prerequisite review/i);
  }
});
test('binds the anti-shortcut gate to the actual W3-M4 browser file', () => {
  assert.doesNotThrow(() => assertWeekThreeBajieJoiningE2ESourceContract(actual()));
});
