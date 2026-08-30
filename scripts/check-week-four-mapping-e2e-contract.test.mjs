import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assertWeekFourMappingE2ESourceContract, W4_M1_TAGS } from './check-week-four-mapping-e2e-contract.mjs';

const actual = () => readFileSync(fileURLToPath(new URL('../e2e/week-four-blockly-python-mapping.spec.ts', import.meta.url)), 'utf8');
const formalHelper = "function formalW3M5Prerequisite() { return 'formal-w3-m5-only'; }";
const safeSource = `
  // ${W4_M1_TAGS.join(' ')}
  ${formalHelper}
  const W3_M5_FORMAL_PREREQUISITE_SHA256 = '${createHash('sha256').update(formalHelper).digest('hex')}';
  function attachHealth(page) { return page; }
  test.afterEach(({ page }) => expect(healthEvents.get(page)).toEqual([]));
  test('@w4-m1-full visible child path', async ({ page }) => {
    await page.getByRole('button', { name: '对照运行' }).click();
    await page.getByRole('combobox', { name: '选择 Python 判断字段' }).selectOption('identity');
  });
  test('@w4-m1-python-security read-only runner probe', async ({ page }) => {
    await page.evaluate(() => window.__w4RunnerProbe?.());
  });
`;
const secureProbe = `
  test('@w4-m1-python-security built Worker request-response probe', async ({ page }) => {
    const before = await page.evaluate(() => ({ current: localStorage.getItem('current'), revision: localStorage.getItem('revision') }));
    const rejected = await page.evaluate(async () => {
      const workerUrl = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => url.includes('weekFourPythonMapping.worker-'));
      const worker = new Worker(workerUrl, { type: 'module' });
      const cards = [{ id: 'card', appearance: 'a', identity: 'b' }];
      try {
        await new Promise((resolve) => { worker.onmessage = (event) => { if (event.data?.type === 'ready') resolve(); }; });
        const requestId = 100;
        const message = await new Promise((resolve) => { worker.onmessage = (event) => { if (event.data?.type === 'error' && event.data.requestId === requestId) resolve(event.data); }; worker.postMessage({ type: 'run', requestId, code: 'bad', cards, sourceSpan: { line: 1, from: 1, to: 2 } }); });
        return message.type === 'error' && message.requestId === requestId;
      } finally { worker.terminate(); }
    });
    expect(rejected).toBe(true);
    expect(await page.evaluate(() => ({ current: localStorage.getItem('current'), revision: localStorage.getItem('revision') }))).toEqual(before);
  });
`;

test('requires all fourteen W4-M1 evidence tags and a fixed W3-M5-only prerequisite', () => {
  assert.throws(() => assertWeekFourMappingE2ESourceContract(''), /missing/i);
  assert.throws(() => assertWeekFourMappingE2ESourceContract(`${safeSource}\n${secureProbe}`), /cold probe/i);
  assert.doesNotThrow(() => assertWeekFourMappingE2ESourceContract(actual()));
});

test('rejects synthetic security evidence instead of a built Worker request-response probe', () => {
  for (const synthetic of [
    "const rejected = inputs.map(([label]) => ({ label, rejected: true }));",
    "const rejected = inputs.map(() => ({ rejected: true }));",
    "expect(rejected).toEqual(inputs.map(() => true));",
  ]) {
    assert.throws(
      () => assertWeekFourMappingE2ESourceContract(`${actual()}\n${synthetic}`),
      /security probe/i,
    );
  }
});

test('rejects a cold probe that checks each Pyodide response but omits the aggregate transfer budget', () => {
  const weaker = actual()
    .replaceAll('const totalPyodideBytes = pyodideResponses.reduce((sum, item) => sum + item.bytes, 0);', '')
    .replaceAll('expect(totalPyodideBytes).toBeLessThanOrEqual(PYTHON_RUNTIME_TRANSFER_MAX_BYTES);', 'expect(pyodideResponses.every((item) => item.bytes <= PYTHON_RUNTIME_TRANSFER_MAX_BYTES)).toBe(true);');
  assert.throws(() => assertWeekFourMappingE2ESourceContract(weaker), /sum local and Pyodide|total budget/i);
});

test('requires cold evidence to accept only fixed same-origin Pyodide runtime paths', () => {
  const weaker = actual().replace(
    "const applicationRoot = new URL('./', page.url()); const runtimeRoot = new URL('runtime/pyodide-314.0.2/', applicationRoot);",
    "const runtimeRoot = new URL('/runtime/pyodide-314.0.2/', page.url());",
  );
  assert.throws(() => assertWeekFourMappingE2ESourceContract(weaker), /same-origin runtime paths/i);
  const wrongBase = actual().replace(
    "expect(runtimeRoot.pathname).toBe('/xiyou-programming-journey/runtime/pyodide-314.0.2/');",
    "expect(runtimeRoot.pathname).toBe('/runtime/pyodide-314.0.2/');",
  );
  assert.throws(() => assertWeekFourMappingE2ESourceContract(wrongBase), /same-origin runtime paths/i);
  assert.doesNotThrow(() => assertWeekFourMappingE2ESourceContract(actual()));
});

test('requires explicit post-retry state assertions for every W4-M1 storage fault mode', () => {
  assert.throws(() => assertWeekFourMappingE2ESourceContract(actual().replace("expect(runAfterRetry.sessions['w4-m1']?.totalRuns).toBe(1);", '')), /storage retry run/i);
  assert.doesNotThrow(() => assertWeekFourMappingE2ESourceContract(actual()));
});

test('requires deterministic Pyodide load-failure recovery that keeps infrastructure separate from learning', () => {
  assert.throws(() => assertWeekFourMappingE2ESourceContract(actual().replace("expect(runtimeFailure.sessions['w4-m1']?.runnerInfrastructureFailures).toBe(1);", 'expect(true).toBe(true);')), /runtime failure recovery/i);
  assert.doesNotThrow(() => assertWeekFourMappingE2ESourceContract(actual()));
});

test('rejects legacy paths, direct W4 evidence injection, mutable health evidence, and non-inline browser callbacks', () => {
  for (const injected of [
    'expectedSequence', 'expectedOutput', 'LegacyMissionBuilder', 'MissionTools', 'eval("x")', 'new Function("x")',
    "progress.sessions['w4-m1'] = {}", "progress.works['w4-m1-first-python-mapping'] = {}", "progress.missionCompletionEvidence['w4-m1'] = {}",
    "localStorage.setItem('w4-m1', '{}')", 'healthEvents.get(page).splice(0)', 'test.skip()', 'page.evaluate(probe)',
  ]) assert.throws(() => assertWeekFourMappingE2ESourceContract(`${safeSource}\n${injected}`), /forbidden|injection|health|inline|skip|legacy/i);
});

test('rejects a prerequisite helper that knows about W4 state or lacks its reviewed SHA-256 marker', () => {
  const leaking = "function formalW3M5Prerequisite() { return 'w4-m1'; }";
  assert.throws(() => assertWeekFourMappingE2ESourceContract(safeSource.replace(formalHelper, leaking)), /prerequisite|SHA-256/i);
  assert.throws(() => assertWeekFourMappingE2ESourceContract(safeSource.replace('W3_M5_FORMAL_PREREQUISITE_SHA256', 'UNREVIEWED_HELPER')), /SHA-256/i);
});

test('binds the AST gate to the real W4-M1 five-project browser file', () => {
  assert.doesNotThrow(() => assertWeekFourMappingE2ESourceContract(actual()));
});

test('requires the real file to create a Worker security probe, measure cold and warm transfers, and retry actual asset and lazy failures', () => {
  const source = actual();
  for (const marker of [
    'new Worker', 'worker.postMessage', "message.type === 'error'", 'weekFourPythonMapping',
    'syntax error', 'from js import fetch', 'identity.__class__', 'while True: pass',
    'warmMs', 'totalLocalBytes', 'totalPyodideBytes', 'WeekFourMappingExperience-',
    '重新加载页面', '重试场景资源', 'screenshot', 'totalRuns',
  ]) assert.ok(source.includes(marker), `real W4-M1 E2E must contain ${marker}`);
  assert.doesNotMatch(source, /inputs\.map\([^)]*rejected:\s*true|expect\(WEEK_FOUR_MAPPING_COLD_LOAD_MAX_BYTES\)\.toBeLessThanOrEqual/);
});
