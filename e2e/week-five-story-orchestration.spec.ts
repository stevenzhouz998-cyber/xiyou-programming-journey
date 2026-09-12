import { readFileSync, readdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON, SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON } from '../src/engine/weekFiveStoryOrchestrationPythonGrammar';
import { formalW5M4Prerequisite } from './support/w5m5Prerequisite';
import { collectRuntimeClosure, WEEK_FIVE_STORY_ORCHESTRATION_MAX_LAZY_BYTES } from '../scripts/check-bundle-budget.mjs';
import { PYTHON_RUNTIME_TRANSFER_MAX_BYTES } from '../scripts/budget-limits.mjs';

const KEY = 'xiyou-programming-progress-v3';
const REV = 'xiyou-programming-progress-revision-v3';
const MODE = 'xiyou-test-storage-mode';
const DEFAULT = DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON;
const SOLVED = SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON;
const LOOP_FIXED = DEFAULT.replace('    register(monk)', '        register(monk)');
const TEMPLE_FIXED = LOOP_FIXED.replace('    rescue_monks()\n    record_weather_sequence()', '    rescue_monks()\n    record_sanqing()\n    record_weather_sequence()');
const WEATHER_FIXED = TEMPLE_FIXED.replace("    record_weather('风')", '    record_weather(order)');
const saved = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
const session = async (page: Page) => (await saved(page)).sessions['w5-m5'];
const runButton = (page: Page) => page.getByRole('button', { name: '运行完整故事', exact: true });

async function seed(page: Page, raw = formalW5M4Prerequisite()) {
  await page.addInitScript(({ key, rev, raw }) => { if (localStorage.getItem(key) === null) { localStorage.setItem(key, raw); localStorage.setItem(rev, '0'); } }, { key: KEY, rev: REV, raw });
}
async function open(page: Page) {
  await page.goto('./#/mission/w5-m5');
  await expect(page.getByLabel('W5-M5 Python 故事总编排代码')).toBeVisible();
  await expect(runButton(page).or(page.getByRole('button', { name: '真实回放总编排作品', exact: true }))).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByRole('status', { name: 'Python 运行环境已准备' })).toBeVisible({ timeout: 30_000 });
}
async function setCode(page: Page, code: string) {
  await page.getByLabel('W5-M5 Python 故事总编排代码').fill(code);
  await expect.poll(async () => (await session(page)).pythonCode).toBe(code);
  await expect(runButton(page)).toBeEnabled();
}
async function run(page: Page) {
  const before = (await session(page)).totalRuns;
  await runButton(page).click();
  await expect.poll(async () => (await session(page)).totalRuns).toBe(before + 1);
  await expect(runButton(page)).toBeEnabled({ timeout: 30_000 });
}
async function openParent(page: Page) {
  await page.goto('./#/parent');
  await unlockParent(page);
}
async function unlockParent(page: Page) {
  const acknowledge = page.getByRole('button', { name: '我知道了', exact: true });
  if (await acknowledge.isVisible()) await acknowledge.click();
  await expect(page.getByTestId('app-background')).not.toHaveAttribute('inert', '');
  const report = page.getByRole('button', { name: '导出进度', exact: true });
  const login = page.getByLabel('家长 PIN', { exact: true });
  const setup = page.getByLabel('设置 4 位家长 PIN', { exact: true });
  await expect(report.or(login).or(setup)).toBeVisible();
  if (await report.isVisible()) return;
  if (await login.isVisible()) {
    await login.fill('4826'); await page.getByRole('button', { name: '进入周报', exact: true }).click(); await expect(report).toBeVisible(); return;
  }
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(setup).toBeVisible(); await expect(setup).toHaveValue('');
  await setup.fill('4826'); const confirm = page.getByLabel('确认家长 PIN', { exact: true }); await confirm.fill('4826');
  await expect(setup).toHaveValue('4826'); await expect(confirm).toHaveValue('4826');
  await page.waitForTimeout(500);
  await expect(setup).toHaveValue('4826'); await expect(confirm).toHaveValue('4826');
  await page.getByRole('button', { name: '创建家长 PIN', exact: true }).click();
  await page.getByLabel('我已安全保存恢复码').check();
  await page.getByRole('button', { name: '确认已保存并进入', exact: true }).click();
  await expect(report).toBeVisible();
}

test('@w5-m5-full real orchestration reveals four blockers in order, seals proof, restores and replays readonly', async ({ page }, info) => {
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await seed(page); await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('img[alt*="彩色大书"]')).toHaveJSProperty('complete', true);
  await page.screenshot({ path: info.outputPath(`w5m5-default-${info.project.name}.png`), fullPage: true });

  await run(page);
  expect((await session(page)).lastRun).toMatchObject({ state: 'monk-loop-conflict', penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  expect((await session(page)).failureSnapshot.sourceSpans[0].line).toBe(5);
  await page.getByRole('button', { name: /火眼金睛/ }).click();
  await expect(page.getByRole('status', { name: '已保存的故事总编排实际执行' })).toContainText('循环外登记丙');

  await setCode(page, LOOP_FIXED); await run(page);
  expect((await session(page)).lastRun.state).toBe('temple-call-conflict');
  await setCode(page, TEMPLE_FIXED); await run(page);
  expect((await session(page)).lastRun.state).toBe('weather-binding-conflict');
  await setCode(page, WEATHER_FIXED); await run(page);
  expect((await session(page)).lastRun.state).toBe('later-call-order-conflict');

  await setCode(page, SOLVED);
  await runButton(page).click();
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 });
  const completed = await saved(page);
  expect(completed.schemaRevision).toBe(22);
  expect(completed.missionCompletionEvidence['w5-m5'].kind).toBe('formal-v3');
  expect(completed.works['w5-m5-story-orchestration-record'].run.completed).toBe(true);

  await page.reload(); await open(page);
  const replayBefore = await saved(page);
  await expect(page.locator('.week-five-temple-epilogue').getByText(/师徒经历三清观/)).toBeVisible();
  await page.getByRole('button', { name: '真实回放总编排作品' }).click();
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 });
  expect(await saved(page)).toEqual(replayBefore);

  await openParent(page);
  const summary = page.getByRole('region', { name: '第五周故事总编排学习摘要' });
  await expect(summary).toContainText('车迟国故事总编排正式证明及作品已保存');
  await expect(summary).not.toContainText(/record_meditation|record_guess|pythonCode|canonicalTrace/);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出进度', exact: true }).click();
  const bytes = readFileSync((await (await download).path())!);
  await page.getByRole('button', { name: '清空学习数据', exact: true }).click();
  await page.getByLabel('输入“清空”以确认').fill('清空');
  const revisionBeforeClear = await page.evaluate((key) => localStorage.getItem(key), REV);
  const backup = page.waitForEvent('download');
  await page.getByRole('button', { name: '备份并清空', exact: true }).click(); await backup;
  await expect.poll(async () => page.evaluate((key) => localStorage.getItem(key), REV)).not.toBe(revisionBeforeClear);
  await expect.poll(async () => (await saved(page)).missions['w5-m5']).toBeUndefined();
  await expect(page.getByLabel('设置 4 位家长 PIN', { exact: true })).toBeVisible({ timeout: 30_000 });
  await unlockParent(page);
  await page.getByLabel('选择进度文件').setInputFiles({ name: 'w5m5.json', mimeType: 'application/json', buffer: bytes });
  await expect.poll(async () => (await saved(page)).missionCompletionEvidence['w5-m5']?.kind).toBe('formal-v3');
  await page.goto('./#/mission/w5-m5');
  expect((await saved(page)).missions['w6-m1']).toBeUndefined();
  expect(errors).toEqual([]);
});

test('@w5-m5-keyboard CodeMirror stays keyboard reachable and helper controls do not mutate the work', async ({ page }) => {
  await seed(page); await open(page);
  const editor = page.getByLabel('W5-M5 Python 故事总编排代码');
  await editor.focus(); await editor.press('ControlOrMeta+A'); await page.keyboard.insertText(SOLVED);
  await expect.poll(async () => (await session(page)).pythonCode).toBe(SOLVED);
  await editor.press('Tab'); await expect(page.getByRole('button', { name: '定位解困循环' })).toBeFocused();
  const before = await session(page);
  await page.getByRole('button', { name: '定位解困循环' }).click(); await expect(editor).toBeFocused();
  await page.getByRole('button', { name: '定位总编排' }).click(); await expect(editor).toBeFocused();
  expect((await session(page)).pythonCode).toBe(before.pythonCode);
  await runButton(page).focus(); await runButton(page).press('Enter');
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 });
});

for (const stage of ['run', 'validation', 'observation', 'work', 'completion'] as const) test(`@w5-m5-storage ${stage} failure retries the exact transaction`, async ({ page }) => {
  await seed(page); await open(page);
  if (stage === 'observation') await run(page);
  if (stage === 'validation') await setCode(page, 'import os');
  if (stage === 'work' || stage === 'completion') await setCode(page, SOLVED);
  await page.evaluate(({ mode, stage }) => localStorage.setItem(mode, `fail-w5-m5-${stage === 'validation' ? 'run' : stage}`), { mode: MODE, stage });
  if (stage === 'observation') await page.getByRole('button', { name: /火眼金睛/ }).click(); else await runButton(page).click();
  await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible({ timeout: 30_000 });
  await page.evaluate((mode) => localStorage.removeItem(mode), MODE);
  await page.getByRole('button', { name: '重试保存', exact: true }).click();
  if (stage === 'work' || stage === 'completion') await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 });
  else if (stage === 'validation') await expect.poll(async () => (await session(page)).validationFailures).toBe(1);
  else if (stage === 'observation') await expect.poll(async () => (await session(page)).conditionObservationUses.length).toBe(1);
  else await expect.poll(async () => (await session(page)).totalRuns).toBe(1);
});

test('@w5-m5-security actual built Worker rejects unsupported syntax and accepts only the real solved trace', async ({ page }) => {
  await seed(page); await open(page); const before = await saved(page);
  const workers = readdirSync('dist-e2e/assets').filter((file) => /^weekFiveStoryOrchestrationPython.worker-.*\.js$/.test(file));
  expect(workers).toHaveLength(1);
  const result = await page.evaluate(async ({ file, solved }) => {
    const worker = new Worker(new URL(`assets/${file}`, document.baseURI), { type: 'module' });
    await new Promise<void>((resolve, reject) => { worker.onmessage = (event) => event.data.type === 'ready' ? resolve() : reject(Error('load')); worker.onerror = () => reject(Error('worker')); });
    const output: any[] = []; let requestId = 0;
    for (const code of ['import os', 'def record_meditation[T]():\n    record_trial(\'坐禅\')', 'record_trial.__call__(\'坐禅\')', solved]) output.push(await new Promise((resolve) => { worker.onmessage = (event) => resolve(event.data); worker.postMessage({ type: 'run', requestId: ++requestId, code }); }));
    worker.terminate(); return output;
  }, { file: workers[0], solved: SOLVED });
  expect(result.slice(0, 3).map((item) => item.type)).toEqual(['error', 'error', 'error']);
  expect(result[3].type).toBe('result');
  expect(result[3].trace.filter((item: any) => item.kind === 'trial-action')).toHaveLength(5);
  expect(await saved(page)).toEqual(before);
});

test('@w5-m5-assets missing courtyard blocks proof and retry completes without rerunning Python', async ({ page }) => {
  await seed(page); let requests = 0; const pattern = /contest-courtyard-background\.webp/;
  await page.route(pattern, async (route) => { requests += 1; await route.fulfill({ status: 503, body: 'unavailable' }); });
  await open(page); await setCode(page, SOLVED); await run(page);
  expect((await session(page)).lastRun.completed).toBe(true); expect((await saved(page)).missions['w5-m5']).toBeUndefined(); expect(requests).toBeGreaterThan(0);
  await page.unroute(pattern); await page.getByRole('button', { name: '重试加载故事庭院' }).click();
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 });
  expect((await session(page)).totalRuns).toBe(1);
});

test('@w5-m5-corrupt restores the formal snapshot, preserves damaged source, and readonly replay remains exact', async ({ page }) => {
  await seed(page); await open(page); await setCode(page, SOLVED); await runButton(page).click();
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 });
  const completed = await saved(page);
  await page.evaluate((mode) => localStorage.setItem(mode, 'corrupt-w5-m5-current'), MODE); await page.reload();
  await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
  const recovered = await saved(page);
  expect(recovered.recovery.source).toBe('snapshot'); expect(recovered.works['w5-m5-story-orchestration-record']).toEqual(completed.works['w5-m5-story-orchestration-record']);
  await open(page); const before = await saved(page); await page.getByRole('button', { name: '真实回放总编排作品' }).click();
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 }); expect(await saved(page)).toEqual(before);
});

test('@w5-m5-external a stale tab cannot overwrite and explicitly reloads the newer draft', async ({ page, context }) => {
  await seed(page); await page.addInitScript(() => window.addEventListener('storage', (event) => event.stopImmediatePropagation(), true)); await open(page);
  const second = await context.newPage(); await open(second); await setCode(second, LOOP_FIXED);
  const external = await saved(second);
  await runButton(page).click();
  await expect(page.getByRole('button', { name: '载入其他标签页进度' })).toBeVisible();
  expect(await saved(page)).toEqual(external);
  await page.getByRole('button', { name: '载入其他标签页进度' }).click();
  await expect.poll(async () => (await session(page)).pythonCode).toBe(LOOP_FIXED);
});

test('@w5-m5-runtime Pyodide load failure is infrastructure and a later real Worker run recovers', async ({ page }) => {
  await seed(page); let blocked = 0; const pattern = /pyodide\.mjs(?:\?.*)?$/;
  await page.route(pattern, async (route) => { blocked += 1; await route.fulfill({ status: 503, body: 'unavailable' }); });
  await page.goto('./#/mission/w5-m5');
  await expect(page.getByLabel('W5-M5 Python 故事总编排代码')).toBeVisible();
  await expect(page.getByRole('status', { name: 'Python 运行环境暂不可用' })).toBeVisible({ timeout: 30_000 });
  await runButton(page).click();
  await expect.poll(async () => (await session(page)).runnerInfrastructureFailures).toBe(1);
  expect((await session(page)).totalRuns).toBe(0); expect((await session(page)).pythonCode).toBe(DEFAULT); expect(blocked).toBeGreaterThan(0);
  await page.unroute(pattern); await run(page); expect((await session(page)).lastRun.state).toBe('monk-loop-conflict');
});

test('@w5-m5-runtime timeout counts one attempted run and explicit cancel discards a delayed result', async ({ page }) => {
  await seed(page); let delivered = 0; const pattern = /weekFiveStoryOrchestrationPython.worker-[^/]+\.js/;
  await page.route(pattern, async (route) => {
    const response = await route.fetch(); const actual = await response.text(); delivered += 1;
    await route.fulfill({ response, body: `const forward=self.postMessage.bind(self);self.postMessage=(m,...r)=>m?.type==='result'?setTimeout(()=>forward(m,...r),1200):forward(m,...r);\n${actual}`, contentType: 'application/javascript' });
  });
  await open(page); await runButton(page).click();
  await expect.poll(async () => (await session(page)).runnerInfrastructureFailures).toBe(1);
  expect((await session(page)).totalRuns).toBe(1); expect((await session(page)).lastRun).toBeNull();
  await runButton(page).click(); await page.getByRole('button', { name: '取消本次运行' }).click();
  await expect(page.getByText(/迟到的运行结果不会保存/)).toBeVisible(); await page.waitForTimeout(1400);
  expect((await session(page)).lastRun).toBeNull(); expect((await session(page)).totalRuns).toBe(1);
  expect(delivered).toBeGreaterThan(0); await page.unroute(pattern);
});

test('@w5-m5-legacy revision 16 completion stays legacy until a real solved run upgrades the proof', async ({ page }) => {
  const old = JSON.parse(formalW5M4Prerequisite()); old.schemaRevision = 16; old.missions['w5-m5'] = { status: 'completed', stars: 2, hintsUsed: 1, attempts: 2, completedAt: '2026-09-11T00:00:20.000Z' };
  await seed(page, JSON.stringify(old)); await open(page);
  expect((await saved(page)).missionCompletionEvidence['w5-m5'].kind).toBe('legacy-replay-only');
  await setCode(page, SOLVED); await runButton(page).click();
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 });
  const current = await saved(page); expect(current.missions['w5-m5']).toEqual(old.missions['w5-m5']); expect(current.missionCompletionEvidence['w5-m5'].kind).toBe('formal-v3');
});

test('@w5-m5-cold lazy closure, media, built Worker, local Pyodide, first and warm real results stay within inherited budgets', async ({ page, context }, info) => {
  test.setTimeout(90_000);
  const responses: any[] = [];
  page.on('response', (response) => responses.push(response));
  const chromiumProject = info.project.name.includes('chromium');
  const runtimeFiles = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
  const manifest = JSON.parse(readFileSync(new URL('../dist-e2e/.vite/manifest.json', import.meta.url), 'utf8'));
  const closureFiles = [...collectRuntimeClosure(manifest, 'src/components/WeekFiveStoryOrchestrationExperience.tsx')].map((key) => manifest[key]?.file).filter((file): file is string => typeof file === 'string' && file.endsWith('.js'));
  const closureBytes = closureFiles.reduce((sum, file) => sum + statSync(new URL(`../dist-e2e/${file}`, import.meta.url)).size, 0);
  const workers = readdirSync(new URL('../dist-e2e/assets/', import.meta.url)).filter((file) => /^weekFiveStoryOrchestrationPython.worker-.*\.js$/.test(file)); expect(workers).toHaveLength(1);
  const workerBytes = statSync(new URL(`../dist-e2e/assets/${workers[0]}`, import.meta.url)).size;
  const compatibleBytes = new Map<string, number>();
  if (!chromiumProject) {
    await context.route('**/runtime/pyodide-314.0.2/**', async (route) => {
      const response = await route.fetch(); const body = await response.body();
      compatibleBytes.set(new URL(route.request().url()).pathname, body.byteLength);
      await route.fulfill({ response, body });
    });
  }
  const client = chromiumProject ? await context.newCDPSession(page) : null;
  if (client) {
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: 1_250_000, uploadThroughput: 1_250_000, connectionType: 'cellular3g' });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  await seed(page); const startedAt = performance.now(); await open(page); const readyAt = performance.now();
  const runtimeRoot = new URL('runtime/pyodide-314.0.2/', page.url());
  const missingCompatibilityFiles = chromiumProject ? [] : runtimeFiles.filter((file) => ![...compatibleBytes.keys()].some((pathname) => pathname.endsWith(file)));
  if (missingCompatibilityFiles.length) {
    await page.evaluate(async ({ root, files }) => {
      await Promise.all(files.map(async (file) => { const response = await fetch(new URL(file, root), { cache: 'no-store' }); if (!response.ok) throw new Error(`runtime compatibility probe failed: ${response.status}`); await response.arrayBuffer(); }));
    }, { root: runtimeRoot.href, files: missingCompatibilityFiles });
  }
  await run(page); const firstAt = performance.now(); await run(page); const warmAt = performance.now();
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name));
  expect(resources.some((url) => url.includes('weekFiveStoryOrchestrationPython.worker-'))).toBe(true);
  const localPaths = new Set(closureFiles.map((file) => new URL(file, page.url()).pathname));
  const localResponses = responses.filter((response) => localPaths.has(new URL(response.url()).pathname));
  const runtimeResponses = responses.filter((response) => runtimeFiles.some((file) => response.url().endsWith(file)));
  const mediaResponses = responses.filter((response) => new URL(response.url()).pathname.endsWith('/assets/week-five-trials/contest-courtyard-background.webp'));
  const localObservedBytes = (await Promise.all(localResponses.map(async (response) => (await response.body()).byteLength))).reduce((sum, bytes) => sum + bytes, 0);
  const runtimeBytes = chromiumProject
    ? (await Promise.all(runtimeResponses.map(async (response) => (await response.body()).byteLength))).reduce((sum, bytes) => sum + bytes, 0)
    : runtimeFiles.reduce((sum, file) => sum + ([...compatibleBytes.entries()].find(([pathname]) => pathname.endsWith(file))?.[1] ?? 0), 0);
  const mediaBytes = (await Promise.all(mediaResponses.map(async (response) => (await response.body()).byteLength))).reduce((sum, bytes) => sum + bytes, 0);
  if (chromiumProject) expect(new Set(runtimeResponses.map((response) => new URL(response.url()).pathname)).size).toBe(5);
  else expect(runtimeFiles.every((file) => [...compatibleBytes.keys()].some((pathname) => pathname.endsWith(file)))).toBe(true);
  expect(runtimeResponses.every((response) => new URL(response.url()).origin === new URL(page.url()).origin)).toBe(true);
  expect(mediaResponses).toHaveLength(1);
  expect(closureBytes + workerBytes).toBeLessThanOrEqual(WEEK_FIVE_STORY_ORCHESTRATION_MAX_LAZY_BYTES);
  expect(localObservedBytes).toBeGreaterThan(0);
  expect(runtimeBytes).toBeLessThanOrEqual(PYTHON_RUNTIME_TRANSFER_MAX_BYTES);
  expect(mediaBytes).toBeLessThanOrEqual(1.25 * 1024 * 1024);
  expect(firstAt - startedAt).toBeLessThanOrEqual(20_000);
  expect(warmAt - firstAt).toBeLessThanOrEqual(1_000);
  const metricsPath = info.outputPath(`w5m5-cold-${info.project.name}.json`);
  await writeFile(metricsPath, JSON.stringify({ project: info.project.name, throttled: chromiumProject, closureBytes, workerBytes, localObservedBytes, runtimeBytes, runtimeOrigins: [...new Set(runtimeResponses.map((response) => new URL(response.url()).origin))], mediaBytes, readyMs: readyAt - startedAt, firstResultMs: firstAt - startedAt, warmResultMs: warmAt - firstAt }, null, 2));
  await info.attach(`w5m5-cold-${info.project.name}.json`, { path: metricsPath, contentType: 'application/json' });
});
