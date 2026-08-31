import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { assertWeekFourVariableE2ESourceContract, W4_M2_TAGS } from './check-week-four-variable-e2e-contract.mjs';

const actual = () => readFileSync(fileURLToPath(new URL('../e2e/week-four-python-variable-overwrite.spec.ts', import.meta.url)), 'utf8');
const formalHelper = "function formalW4M1Prerequisite() { return 'formal-w4-m1-only'; }";
const safeSource = `
  // ${W4_M2_TAGS.join(' ')}
  ${formalHelper}
  const W4_M1_FORMAL_PREREQUISITE_SHA256 = '${createHash('sha256').update(formalHelper).digest('hex')}';
  function attachHealth(page) { return page; }
  test.afterEach(({ page }) => expect(healthEvents.get(page)).toEqual([]));
  test('@w4-m2-full visible child path', async () => {});
  test('@w4-m2-keyboard visible editor path', async () => {});
  test('@w4-m2-mouse visible editor path', async () => {});
  test('@w4-m2-touch visible editor path', async () => {});
  test('@w4-m2-accessibility visible status path', async () => { await expect(page.getByRole('textbox', { name: 'W4-M2 Python 代码' })).toBeVisible(); await page.getByRole('combobox', { name: '第二次核验写入哪个变量' }).focus(); await expect(page.getByRole('button', { name: '写入 identity' })).toBeFocused(); await expect(page.getByRole('status', { name: '可访问状态' })).toBeVisible(); await expect(page.getByRole('alert', { name: '保存失败' })).toBeVisible(); await expect(page.getByRole('dialog', { name: '完成对话框' })).toBeVisible(); await expect(page.locator('.feedback')).toHaveAttribute('aria-live', 'polite'); await page.getByRole('button').press('Enter'); await page.getByRole('button').press(' '); });
  test('@w4-m2-parent non-answer summary path', async () => {});
  test('@w4-m2-clear clear path', async () => { const clearBefore = progress; await page.getByRole('button', { name: '清空学习数据' }).click(); await page.getByLabel('输入“清空”以确认').fill('清空'); const download = page.waitForEvent('download'); await page.getByRole('button', { name: '备份并清空' }).click(); const clearBackupBytes = '{}'; expect(JSON.parse(clearBackupBytes)).toEqual(clearBefore); expect(progress.sessions["w4-m2"]).toBeUndefined(); expect(progress.works['w4-m2-variable-evidence-record']).toBeUndefined(); expect(progress.missionCompletionEvidence["w4-m2"]).toBeUndefined(); expect(progress.missions["w4-m2"]).toBeUndefined(); expect(progress.settings).toEqual(createInitialProgress().settings); expect(progress.privacy).toEqual(createInitialProgress().privacy); await page.getByRole('heading', { name: '这一关还没有解锁' }).toBeVisible(); });
  test('@w4-m2-work persisted work path', async () => {});
  test('@w4-m2-narrow narrow layout path', async () => {});
  test('@w4-m2-external external-progress path', async () => { const stale = page; await stale.route(/pyodide/, () => undefined); await run(stale); await chooseIdentity(page); const currentRevision = revision; const currentCode = progress.sessions['w4-m2']?.pythonCode; await expect(page.getByRole('alert', { name: '其他标签页已有新的学习进度' })).toBeVisible(); await page.getByRole('button', { name: '载入其他标签页进度' }).click(); });
  test('@w4-m2-python-security built Worker request-response probe', async ({ page }) => {
    const before = await page.evaluate(() => ({ current: localStorage.getItem('current'), revision: localStorage.getItem('revision') }));
    await page.evaluate(async () => {
      const workerUrl = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => url.includes('weekFourVariablePython.worker-'));
      const worker = new Worker(workerUrl, { type: 'module' });
      let nextRequestId = 1;
      const requestIds = [];
      const inputs = [
        { label: 'syntax error', code: 'appearance =' }, { label: 'import', code: 'import os' },
        { label: 'file', code: "open('save.txt')" }, { label: 'browser-network', code: 'from js import fetch' },
        { label: 'browser-location', code: 'window.location' }, { label: 'attribute', code: 'identity.__class__' },
        { label: 'subscript', code: 'identity[0]' }, { label: 'eval', code: 'eval("1")' },
        { label: 'dunder', code: '__import__("os")' }, { label: 'unknown call', code: 'unknown_name()' },
        { label: 'infinite loop', code: 'while True: pass' },
      ];
      try {
        await new Promise((resolve) => { worker.onmessage = (event) => { if (event.data?.type === 'ready') resolve(); }; });
        for (const { label, code } of inputs) {
          const requestId = nextRequestId++;
          requestIds.push(requestId);
          const message = await Promise.race([
            new Promise((resolve) => { worker.onmessage = (event) => { if (event.data?.requestId === requestId) resolve(event.data); }; worker.postMessage({ type: 'run', requestId, code }); }),
            new Promise((resolve) => setTimeout(() => resolve('timeout'), 1_000)),
          ]);
          expect(message?.type === 'error' || message === 'timeout').toBe(true);
        }
        expect(new Set(requestIds).size).toBe(inputs.length);
      } finally { worker.terminate(); }
    });
    const after = await page.evaluate(() => ({ current: localStorage.getItem('current'), revision: localStorage.getItem('revision') }));
    expect(after).toEqual(before);
  });
  test('@w4-m2-cold aggregate runtime budget', async ({ page, context }, testInfo) => {
    const responses = []; page.on('response', (response) => responses.push(response));
    const chromiumProject = testInfo.project.name.includes('chromium');
    const client = chromiumProject ? await context.newCDPSession(page) : null;
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: 1_250_000, uploadThroughput: 1_250_000, connectionType: 'cellular3g' });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const navigationStart = performance.now();
    await page.goto('./#/mission/w4-m2');
    await expect(page.getByRole('heading', { name: '两只证据匣，别让变量被覆盖' })).toBeVisible();
    await expect(page.getByLabel('W4-M2 Python 代码')).toBeVisible();
    const expectedRuntimeFiles = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
    const runtimeRoot = new URL('runtime/pyodide-314.0.2/', page.url());
    expect(runtimeRoot.pathname).toBe('/xiyou-programming-journey/runtime/pyodide-314.0.2/');
    const buildManifest = {};
    const localClosureFiles = [...collectRuntimeClosure(buildManifest, 'src/components/WeekFourVariableEvidenceExperience.tsx')];
    const localManifestBytes = 900000;
    const weekFourVariableWorkerBytes = 1;
    const localClosurePaths = new Set(localClosureFiles);
    const localResponsesByPath = new Map(responses.filter((response) => response.status() >= 200 && response.status() < 400).map((response) => [response.url(), response]));
    const requiredObservedLocalFiles = localClosureFiles.filter((file) => file.includes('WeekFourVariableEvidenceExperience-') || file.includes('codemirror-editor-'));
    expect(requiredObservedLocalFiles.every((file) => localResponsesByPath.has(file))).toBe(true);
    const pyodideResponses = responses.filter((response) => expectedRuntimeFiles.some((file) => response.url().endsWith(file)));
    expect(pyodideResponses).toHaveLength(5);
    expect(new Set(pyodideResponses.map((response) => new URL(response.url()).pathname)).size).toBe(5);
    const localMeasurements = await Promise.all([...localResponsesByPath.values()].map(async (response) => ({ bytes: (await response.body()).byteLength })));
    const pyodideMeasurements = await Promise.all(pyodideResponses.map(async (response) => {
      const responseUrl = new URL(response.url());
      expect(responseUrl.origin === runtimeRoot.origin).toBe(true);
      expect(responseUrl.pathname.startsWith(runtimeRoot.pathname)).toBe(true);
      return { bytes: (await response.body()).byteLength };
    }));
    const observedLocalBytes = localMeasurements.reduce((sum, item) => sum + item.bytes, 0);
    const totalLocalBytes = localManifestBytes + weekFourVariableWorkerBytes;
    const totalPyodideBytes = pyodideMeasurements.reduce((sum, item) => sum + item.bytes, 0);
    await expect(page.getByRole('status', { name: 'Python 运行环境已准备' })).toBeVisible();
    const workerReadyAt = performance.now();
    await page.getByRole('button', { name: '运行取证' }).click();
    await expect(page.getByText('外形匣被覆盖，身份匣为空；这个失败事实已经保存。')).toBeVisible();
    await expect(page.getByTestId('variable-state-unsealed')).toHaveAttribute('data-state-cell', 'unsealed');
    const firstResultAt = performance.now();
    await page.getByRole('combobox', { name: '第二次核验写入哪个变量' }).selectOption('identity');
    await page.getByRole('button', { name: '运行取证' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await expect(page.getByTestId('variable-state-sealed')).toHaveAttribute('data-state-cell', 'sealed');
    const warmResultAt = performance.now();
    const coldMs = firstResultAt - navigationStart;
    const warmMs = warmResultAt - firstResultAt;
    expect(totalLocalBytes).toBeLessThanOrEqual(WEEK_FOUR_VARIABLE_COLD_LOAD_MAX_BYTES);
    expect(totalPyodideBytes).toBeLessThanOrEqual(PYTHON_RUNTIME_TRANSFER_MAX_BYTES);
    expect(coldMs).toBeLessThanOrEqual(20_000); expect(warmMs).toBeLessThanOrEqual(1_000);
    await testInfo.attach('w4m2-cold-metrics.json', { body: JSON.stringify({ totalLocalBytes, totalPyodideBytes, workerReadyMs: workerReadyAt - navigationStart, coldMs, warmMs }), contentType: 'application/json' });
  });
  test('@w4-m2-storage draft', async ({ page }) => { const draftBefore = progress; await setStorageFaultMode('fail-w4-m2-draft'); expect(draftBefore.missionCompletionEvidence['w4-m2']).toBeUndefined(); await setStorageFaultMode('off'); await page.getByRole('button', { name: '重试保存草稿' }).click(); const draftAfterRetry = progress; expect(draftAfterRetry.sessions['w4-m2']?.pythonCode).toBe(draftBefore.sessions['w4-m2']?.pythonCode); expect(draftAfterRetry.sessions['w4-m2']?.lastRun).toBeNull(); });
  test('@w4-m2-storage run', async ({ page }) => { const runBefore = progress; await setStorageFaultMode('fail-w4-m2-run'); expect(runBefore.missionCompletionEvidence['w4-m2']).toBeUndefined(); await setStorageFaultMode('off'); await page.getByRole('button', { name: '重试运行' }).click(); const runAfterRetry = progress; expect(runAfterRetry.sessions['w4-m2']?.pythonCode).toBe(runBefore.sessions['w4-m2']?.pythonCode); expect(runAfterRetry.sessions['w4-m2']?.lastRun).toBeDefined(); expect(runAfterRetry.sessions['w4-m2']?.overwriteFailures).toBe(1); expect(runAfterRetry.sessions['w4-m2']?.totalRuns).toBe(1); });
  test('@w4-m2-storage observation', async ({ page }) => { const observationBefore = progress; await setStorageFaultMode('fail-w4-m2-observation'); expect(observationBefore.sessions['w4-m2']?.conditionObservationUses).toHaveLength(0); await setStorageFaultMode('off'); await page.getByRole('button', { name: '重试观察' }).click(); const observationAfterRetry = progress; expect(observationAfterRetry.sessions['w4-m2']?.conditionObservationUses).toHaveLength(1); expect(observationAfterRetry.sessions['w4-m2']?.pythonCode).toEqual(observationBefore.sessions['w4-m2']?.pythonCode); expect(observationAfterRetry.sessions['w4-m2']?.lastRun).toEqual(observationBefore.sessions['w4-m2']?.lastRun); });
  test('@w4-m2-storage work', async ({ page }) => { const workBeforeRetry = progress; await setStorageFaultMode('fail-w4-m2-work'); expect(workBeforeRetry.works['w4-m2-variable-evidence-record']).toBeUndefined(); expect(workBeforeRetry.missionCompletionEvidence['w4-m2']).toBeUndefined(); await setStorageFaultMode('off'); await page.getByRole('button', { name: '重试保存作品' }).click(); const workAfterRetry = progress; expect(workAfterRetry.works['w4-m2-variable-evidence-record']).toBeDefined(); expect(workAfterRetry.missions['w4-m3']).toBeUndefined(); });
  test('@w4-m2-storage completion', async ({ page }) => { const completionBeforeRetry = progress; await setStorageFaultMode('fail-w4-m2-completion'); expect(completionBeforeRetry.works['w4-m2-variable-evidence-record']).toBeUndefined(); expect(completionBeforeRetry.missionCompletionEvidence['w4-m2']).toBeUndefined(); await setStorageFaultMode('off'); await page.getByRole('button', { name: '重试完成保存' }).click(); const completionAfterRetry = progress; expect(completionAfterRetry.missionCompletionEvidence['w4-m2']).toBeDefined(); expect(completionAfterRetry.missions['w4-m3']).toBeDefined(); });
  test('@w4-m2-runtime-fault load', async () => { await fault('fail-w4-m2-runtime-load'); expect(progress.sessions['w4-m2']?.runnerInfrastructureFailures).toBe(1); expect(progress.sessions['w4-m2']?.totalRuns).toBe(0); await retry(); expect(progress.sessions['w4-m2']?.lastRun?.finalState).toBe('evidence-unsealed'); expect(progress.sessions['w4-m2']?.totalRuns).toBe(1); expect(progress.sessions['w4-m2']?.overwriteFailures).toBe(1); expect(progress.missions["w4-m2"]).toBeUndefined(); expect(progress.works['w4-m2-variable-evidence-record']).toBeUndefined(); await page.getByRole('heading', { name: '这一关还没有解锁' }); });
  test('@w4-m2-runtime-fault timeout', async () => { await fault('fail-w4-m2-runtime-timeout'); expect(progress.sessions['w4-m2']?.runnerInfrastructureFailures).toBe(1); expect(progress.sessions['w4-m2']?.totalRuns).toBe(1); await retry(); expect(progress.sessions['w4-m2']?.lastRun?.finalState).toBe('evidence-unsealed'); expect(progress.sessions['w4-m2']?.totalRuns).toBe(2); expect(progress.sessions['w4-m2']?.overwriteFailures).toBe(1); expect(progress.missions["w4-m2"]).toBeUndefined(); expect(progress.works['w4-m2-variable-evidence-record']).toBeUndefined(); await page.getByRole('heading', { name: '这一关还没有解锁' }); });
  test('@w4-m2-asset-fault', async () => { await fault('fail-w4-m2-assets'); expect(progress.sessions['w4-m2']?.lastRun?.finalState).toBe('evidence-sealed'); const workerRunCount = 1; await retry(); expect(progress.missionCompletionEvidence['w4-m2']?.kind).toBe('formal-v3'); expect(progress.sessions['w4-m2']?.totalRuns).toBe(workerRunCount); expect(progress.sessions['w4-m2']?.runnerInfrastructureFailures).toBe(0); expect(progress.sessions['w4-m2']?.overwriteFailures).toBe(0); expect(progress.missions['w4-m2']?.attempts).toBe(1); });
  test('@w4-m2-lazy', async () => { const chunk = 'WeekFourVariableEvidenceExperience-'; expect(progress.sessions['w4-m2']?.lastRun?.finalState).toBe('evidence-sealed'); const workerRunCount = 1; await retry(); expect(progress.missionCompletionEvidence['w4-m2']?.kind).toBe('formal-v3'); expect(progress.sessions['w4-m2']?.totalRuns).toBe(workerRunCount); expect(progress.sessions['w4-m2']?.runnerInfrastructureFailures).toBe(0); expect(progress.sessions['w4-m2']?.overwriteFailures).toBe(0); expect(progress.missions['w4-m2']?.attempts).toBe(1); });
  test('@w4-m2-corrupt current', async () => { await fault('corrupt-w4-variable-current'); const corruptBytes = downloadedBytes; const download = downloadedBytes; const lastLegalSnapshot = recoveredCurrent; expect(recoveredCurrent.sessions['w4-m2'].lastCanonicalTrace).toEqual(lastLegalSnapshot.sessions['w4-m2'].lastCanonicalTrace); expect(recoveredCurrent.sessions['w4-m2'].lastWorkerTrace).toEqual(lastLegalSnapshot.sessions['w4-m2'].lastWorkerTrace); expect(recoveredCurrent.works['w4-m2-variable-evidence-record']).toBeDefined(); expect(downloadedBytes).toBe(corruptBytes); expect(download).toContain('{broken w4-m2 current'); const replayBefore = progress; await retry(); });
`;

test('requires every W4-M2 evidence tag and a fixed W4-M1-only prerequisite', () => {
  assert.throws(() => assertWeekFourVariableE2ESourceContract(''), /missing|must appear in a real test title/i);
  assert.doesNotThrow(() => assertWeekFourVariableE2ESourceContract(safeSource));
});

test('rejects legacy answers, direct W4-M2 progress injection, mutable health checks, and non-inline browser callbacks', () => {
  for (const injected of [
    'expectedSequence', 'expectedOutput', 'starterCode', 'LegacyMissionBuilder', 'MissionTools', 'eval("x")', 'new Function("x")',
    "progress.sessions['w4-m2'] = {}", "next.works['w4-m2-variable-evidence-record'] = {}", "state.missionCompletionEvidence['w4-m2'] = {}",
    "progress['sessions']['w4-m2'].pythonCode = 'forged'", "Object.assign(progress['sessions']['w4-m2'], { pythonCode: 'forged' })",
    "const missionId = 'w4-m2'; const forgedSession = progress['sessions'][missionId]; forgedSession.pythonCode = 'forged'",
    "const sessions = progress.sessions; sessions['w4-m2'].pythonCode = 'forged'",
    "const arbitrary = progress; arbitrary.sessions['w4-m2'].pythonCode = 'forged'",
    "const firstAlias = progress; const secondAlias = firstAlias; secondAlias.works['w4-m2-variable-evidence-record'] = {}",
    "const p = createInitialProgress(); p.sessions['w4-m2'] = { forged: true }",
    "const evidence = progress.missionCompletionEvidence; Object.assign(evidence, { 'w4-m2': { kind: 'forged' } })",
    "const works = progress.works; Object.assign(works, { 'w4-m2-variable-evidence-record': { kind: 'forged' } })",
    "const sessions = progress.sessions; Object.assign(sessions, { [unknownKey]: { forged: true } })",
    "const dynamicKey = unknownKey; progress.sessions[dynamicKey].pythonCode = 'forged'", 'localStorage.setItem("xiyou-programming-progress", "forged")', 'const storage = sessionStorage; storage.setItem("anything", "forged")',
    'window.localStorage.setItem("anything", "forged")', 'globalThis.sessionStorage.setItem("anything", "forged")', "window['localStorage'].setItem('anything', 'forged')", "globalThis['sessionStorage'].setItem('anything', 'forged')", 'const store = window.localStorage; store.setItem("anything", "forged")', "const elementStore = globalThis['localStorage']; elementStore.setItem('anything', 'forged')",
    "Storage.prototype.setItem.call(globalThis.localStorage, 'xiyou-programming-progress-v3', 'forged')",
    "const progressKey = 'xiyou-programming-progress-v3'; Storage.prototype.setItem.call(window.localStorage, progressKey, 'forged')",
    "test.beforeEach(async ({ page }) => { await page.addInitScript(() => Storage.prototype.setItem.call(globalThis.localStorage, 'xiyou-programming-progress-v3', JSON.stringify({ sessions: { 'w4-m2': { forged: true } } }))); });",
    'healthEvents.get(page).splice(0)', 'test.skip()', 'page.evaluate(probe)',
  ]) assert.throws(() => assertWeekFourVariableE2ESourceContract(`${safeSource}\n${injected}`), /forbidden|inject|storage|health|inline|skip|legacy/i);
});

test('requires every W4-M2 tag to occur in a unique real test title, never only a comment', () => {
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(safeSource.replace("test('@w4-m2-full visible child path', async () => {});", '/* @w4-m2-full */')),
    /real test title/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(`${safeSource}\ntest('@w4-m2-full visible child path', async () => {});`),
    /duplicate test titles/i,
  );
});

test('binds the only browser progress seed to the exact reviewed W4-M1 prerequisite value', () => {
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(actual().replace(
      'const value = formalW4M1Prerequisite();',
      "const value = formalW4M1Prerequisite().replace('w4-m1', 'w4-m2');",
    )),
    /storage|inject|prerequisite/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(actual().replace(
      '{ current: CURRENT_KEY, revision: REVISION_KEY, value },',
      "{ current: CURRENT_KEY, revision: REVISION_KEY, value: JSON.stringify({ sessions: { 'w4-m2': { forged: true } } }) },",
    )),
    /storage|inject|prerequisite/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(actual().replace(
      '({ current, revision, value: raw }) => {',
      "({ current, revision, value: raw }) => { raw = JSON.stringify({ sessions: { 'w4-m2': { forged: true } } });",
    )),
    /storage|inject|prerequisite/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(`${safeSource}\nconst p = JSON.parse('{}'); p.sessions = { 'w4-m2': { forged: true } };`),
    /inject|assignment/i,
  );
});

test('rejects synthetic Worker outcomes and missing concrete W4-M2 safety or recovery evidence', () => {
  const synthetic = safeSource.replace(
    'for (const { label, code } of inputs)',
    'inputs.map(({ label, code }) => ({ label, code, rejected: true })); for (const { label, code } of inputs)',
  );
  assert.throws(() => assertWeekFourVariableE2ESourceContract(synthetic), /security probe.*synthesize/i);
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(safeSource.replace("{ label: 'infinite loop', code: 'while True: pass' },", '')),
    /infinite-loop inputs/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(safeSource.replace("await fault('fail-w4-m2-runtime-timeout');", '')),
    /runtime-fault timeout/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(safeSource.replace("expect(pyodideResponses).toHaveLength(5);", '')),
    /five runtime responses/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(safeSource.replace('const coldMs = firstResultAt - navigationStart;', 'const coldMs = 1;')),
    /timings must not use fixed numeric/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(safeSource.replace("await page.goto('./#/mission/w4-m2');", '')),
    /real W4-M2 hash route|wait for page/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(safeSource.replace("await page.goto('./#/mission/w4-m2');", "await page.goto('./#/mission/w4-m1');")),
    /real W4-M2 hash route|wait for page/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(safeSource.replace("await page.getByRole('combobox', { name: '第二次核验写入哪个变量' }).selectOption('identity');", '')),
    /visible identity edit/i,
  );
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(safeSource.replace("await setStorageFaultMode('off');", "await setStorageFaultMode('on');")),
    /storage retry draft.*fault enable, fault disable/i,
  );
  for (const missingWait of [
    "await expect(page.getByRole('heading', { name: '两只证据匣，别让变量被覆盖' })).toBeVisible();",
    "await expect(page.getByLabel('W4-M2 Python 代码')).toBeVisible();",
    "await expect(page.getByRole('status', { name: 'Python 运行环境已准备' })).toBeVisible();",
    "await expect(page.getByText('外形匣被覆盖，身份匣为空；这个失败事实已经保存。')).toBeVisible();",
    "await expect(page.getByTestId('variable-state-unsealed')).toHaveAttribute('data-state-cell', 'unsealed');",
    "await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();",
    "await expect(page.getByTestId('variable-state-sealed')).toHaveAttribute('data-state-cell', 'sealed');",
  ]) {
    assert.throws(
      () => assertWeekFourVariableE2ESourceContract(safeSource.replace(missingWait, '')),
      /cold probe must .*wait|cold probe must attach/i,
    );
  }
});

test('requires a named cold-metrics attachment with all measured values', () => {
  const attachment = "await testInfo.attach('w4m2-cold-metrics.json', { body: JSON.stringify({ totalLocalBytes, totalPyodideBytes, workerReadyMs: workerReadyAt - navigationStart, coldMs, warmMs }), contentType: 'application/json' });";
  assert.throws(
    () => assertWeekFourVariableE2ESourceContract(safeSource.replace(attachment, '')),
    /named cold metrics JSON/i,
  );
});

test('binds the source gate to the real five-project W4-M2 browser specification', () => {
  assert.doesNotThrow(() => assertWeekFourVariableE2ESourceContract(actual()));
});
