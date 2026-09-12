import { readFileSync, readdirSync, statSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { SOLVED_WEEK_SIX_RECORDS_PYTHON } from '../src/engine/weekSixRecordsPythonGrammar';
import { formalW5M5Prerequisite, formalW6M1Completion } from './support/w6m1Prerequisite';
import { collectRuntimeClosure, WEEK_SIX_RECORDS_COLD_LOAD_MAX_BYTES } from '../scripts/check-bundle-budget.mjs';
import { PYTHON_RUNTIME_TRANSFER_MAX_BYTES } from '../scripts/budget-limits.mjs';

const KEY = 'xiyou-programming-progress-v3';
const REV = 'xiyou-programming-progress-revision-v3';
const MODE = 'xiyou-test-storage-mode';
const saved = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);

async function seed(page: Page, raw = formalW5M5Prerequisite()) {
  await page.addInitScript(({ key, rev, raw }) => { if (localStorage.getItem(key) === null) { localStorage.setItem(key, raw); localStorage.setItem(rev, '0'); } }, { key: KEY, rev: REV, raw });
}

async function open(page: Page) {
  await page.goto('./#/mission/w6-m1');
  await expect(page.getByLabel('W6-M1 Python 字典记录代码')).toBeVisible();
  await expect(page.getByRole('status', { name: 'Python 运行环境已准备' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /运行字段读取代码|重播已保存事实表/ })).toBeEnabled();
}
async function setCode(page: Page, code: string) { const editor = page.getByLabel('W6-M1 Python 字典记录代码'); await editor.fill(code); await expect.poll(async () => (await saved(page)).sessions['w6-m1']?.pythonCode).toBe(code); }
async function unlockParent(page: Page) {
  const acknowledge = page.getByRole('button', { name: '我知道了', exact: true });
  if (await acknowledge.isVisible()) {
    await acknowledge.click(); await expect(acknowledge).toBeHidden();
    await expect(page.getByTestId('app-background')).not.toHaveAttribute('inert', '');
  }
  const report = page.getByRole('button', { name: '导出进度', exact: true }); const login = page.getByLabel('家长 PIN', { exact: true }); const setup = page.getByLabel('设置 4 位家长 PIN', { exact: true }); await expect(report.or(login).or(setup)).toBeVisible();
  if (await report.isVisible()) return; if (await login.isVisible()) { await login.fill('4826'); await page.getByRole('button', { name: '进入周报' }).click(); return; }
  const confirm = page.getByLabel('确认家长 PIN');
  await setup.fill('4826'); await confirm.fill('4826');
  await expect(setup).toHaveValue('4826'); await expect(confirm).toHaveValue('4826');
  await page.getByRole('button', { name: '创建家长 PIN' }).click();
  await expect(page.getByLabel('我已安全保存恢复码')).toBeVisible();
  await page.getByLabel('我已安全保存恢复码').check(); await page.getByRole('button', { name: '确认已保存并进入' }).click();
}

test('@w6-m1-full real dictionary field reads fail visibly, recover the draft, seal proof and replay readonly', async ({ page }, info) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  await seed(page); await open(page);
  await expect.poll(async () => (await saved(page)).sessions['w6-m1']?.pythonCode).toBeTruthy();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '观察提示', exact: true }).click();
  await expect.poll(async () => (await saved(page)).sessions['w6-m1']?.usedHintTiers).toContain('observe');

  await page.getByRole('button', { name: '运行字段读取代码' }).click();
  await expect.poll(async () => (await saved(page)).sessions['w6-m1']?.totalRuns).toBe(1);
  const failed = await saved(page);
  expect(failed.sessions['w6-m1'].lastRun).toMatchObject({ state: 'field-read-conflict', completed: false, rows: [{ attempt: '一调', story: '一调' }, { attempt: '二调', story: '二调' }, { attempt: '三调', story: '三调' }], penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  expect(failed.missionCompletionEvidence['w6-m1']).toBeUndefined();
  await expect(page.getByLabel('字典记录运行结果')).toContainText('经过栏重复了调次');

  const editor = page.getByLabel('W6-M1 Python 字典记录代码');
  await editor.focus(); await editor.press('ControlOrMeta+A'); await page.keyboard.insertText(SOLVED_WEEK_SIX_RECORDS_PYTHON);
  await expect.poll(async () => (await saved(page)).sessions['w6-m1']?.pythonCode).toBe(SOLVED_WEEK_SIX_RECORDS_PYTHON);
  await page.reload(); await open(page); await expect(editor).toHaveText(/record\["经过"\]/);

  await page.getByRole('button', { name: '运行字段读取代码' }).click();
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 });
  const completed = await saved(page);
  expect(completed.schemaRevision).toBe(22);
  expect(completed.missionCompletionEvidence['w6-m1']).toMatchObject({ kind: 'formal-v3', workId: 'w6-m1-structured-records-table' });
  expect(completed.works['w6-m1-structured-records-table'].run).toMatchObject({ state: 'records-proven', completed: true });
  await page.screenshot({ path: info.outputPath(`w6m1-success-${info.project.name}.png`), fullPage: true });

  await page.reload(); await open(page);
  await expect(page.getByRole('button', { name: '观察提示', exact: true })).toBeDisabled();
  const beforeReplay = await page.evaluate(({ key, rev }) => [localStorage.getItem(key), localStorage.getItem(rev)], { key: KEY, rev: REV });
  await page.getByRole('button', { name: '重播已保存事实表' }).click();
  await expect(page.getByLabel('字典记录运行结果')).toContainText('真实重播事实表', { timeout: 30_000 });
  expect(await page.evaluate(({ key, rev }) => [localStorage.getItem(key), localStorage.getItem(rev)], { key: KEY, rev: REV })).toEqual(beforeReplay);
  expect(errors).toEqual([]);
});

for (const stage of ['draft', 'validation', 'run', 'observation', 'work', 'completion'] as const) test(`@w6-m1-storage ${stage} write failure retries the exact saved transaction`, async ({ page }) => {
  await seed(page); await open(page);
  if (stage === 'observation') { await page.getByRole('button', { name: '运行字段读取代码' }).click(); await expect.poll(async () => (await saved(page)).sessions['w6-m1'].totalRuns).toBe(1); }
  if (stage === 'validation') await setCode(page, 'import os');
  if (stage === 'work' || stage === 'completion') await setCode(page, SOLVED_WEEK_SIX_RECORDS_PYTHON);
  await page.evaluate(({ mode, stage }) => localStorage.setItem(mode, `fail-w6-m1-${stage === 'validation' ? 'run' : stage}`), { mode: MODE, stage });
  if (stage === 'draft') await page.getByLabel('W6-M1 Python 字典记录代码').fill(`${SOLVED_WEEK_SIX_RECORDS_PYTHON}\n# 草稿`);
  else if (stage === 'observation') await page.getByRole('button', { name: /火眼金睛/ }).click();
  else await page.getByRole('button', { name: '运行字段读取代码' }).click();
  const retry = page.locator('.week-six-records-feedback').getByRole('button', { name: '重试保存' });
  await expect(retry).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: '观察提示', exact: true })).toBeDisabled();
  await expect(page.locator('.recovery-notice').getByRole('button', { name: '重试保存' })).toHaveCount(0);
  await page.evaluate((mode) => localStorage.removeItem(mode), MODE); await retry.click();
  if (stage === 'work' || stage === 'completion') await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 });
  else if (stage === 'validation') await expect.poll(async () => (await saved(page)).sessions['w6-m1'].validationFailures).toBe(1);
  else if (stage === 'observation') await expect.poll(async () => (await saved(page)).sessions['w6-m1'].conditionObservationUses.length).toBe(1);
  else if (stage === 'run') await expect.poll(async () => (await saved(page)).sessions['w6-m1'].totalRuns).toBe(1);
  else await expect.poll(async () => (await saved(page)).sessions['w6-m1'].pythonCode).toContain('# 草稿');
});

test('@w6-m1-external stale tab cannot overwrite a newer dictionary draft', async ({ page, context }) => {
  await seed(page); await page.addInitScript(() => window.addEventListener('storage', (event) => event.stopImmediatePropagation(), true)); await open(page);
  const second = await context.newPage(); await open(second); await setCode(second, SOLVED_WEEK_SIX_RECORDS_PYTHON);
  await page.getByRole('button', { name: '运行字段读取代码' }).click(); await expect(page.getByRole('button', { name: '载入其他标签页进度' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: '载入其他标签页进度' }).click(); await expect(page.getByLabel('W6-M1 Python 字典记录代码')).toHaveText(/record\["经过"\]/);
});

test('@w6-m1-assets missing scene blocks proof and asset retry completes without rerunning Python', async ({ page }) => {
  await seed(page); await page.route(/flaming-mountain-background\.webp/, (route) => route.fulfill({ status: 503, body: 'unavailable' })); await open(page); await setCode(page, SOLVED_WEEK_SIX_RECORDS_PYTHON);
  await page.getByRole('button', { name: '运行字段读取代码' }).click(); await expect.poll(async () => (await saved(page)).sessions['w6-m1'].lastRun?.completed).toBe(true); expect((await saved(page)).missions['w6-m1']).toBeUndefined();
  await page.unroute(/flaming-mountain-background\.webp/); await page.getByRole('button', { name: '重试加载火焰山场景' }).click(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 }); expect((await saved(page)).sessions['w6-m1'].totalRuns).toBe(1);
});

test('@w6-m1-runtime load failure unlocks the UI and a fresh runtime recovers', async ({ page }) => {
  await seed(page); await page.route(/pyodide\.mjs(?:\?.*)?$/, (route) => route.fulfill({ status: 503, body: 'unavailable' })); await page.goto('./#/mission/w6-m1');
  await expect(page.getByRole('status', { name: 'Python 运行环境暂不可用' })).toBeVisible({ timeout: 30_000 }); await page.getByRole('button', { name: '运行字段读取代码' }).click();
  await expect.poll(async () => (await saved(page)).sessions['w6-m1'].runnerInfrastructureFailures).toBe(1); await expect(page.getByRole('button', { name: '运行字段读取代码' })).toBeEnabled();
  await page.unroute(/pyodide\.mjs(?:\?.*)?$/); await page.getByRole('button', { name: '运行字段读取代码' }).click(); await expect.poll(async () => (await saved(page)).sessions['w6-m1'].lastRun?.state).toBe('field-read-conflict');
});

test('@w6-m1-runtime a failed infrastructure record recovers through the global save retry', async ({ page }) => {
  await seed(page);
  await page.route(/pyodide\.mjs(?:\?.*)?$/, (route) => route.fulfill({ status: 503, body: 'unavailable' }));
  await page.goto('./#/mission/w6-m1');
  await expect(page.getByRole('status', { name: 'Python 运行环境暂不可用' })).toBeVisible({ timeout: 30_000 });
  await page.evaluate((mode) => localStorage.setItem(mode, 'fail-w6-m1-run'), MODE);
  await page.getByRole('button', { name: '运行字段读取代码' }).click();
  const globalRetry = page.locator('.recovery-notice').getByRole('button', { name: '重试保存' });
  await expect(globalRetry).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.week-six-records-feedback').getByRole('button', { name: '重试保存' })).toHaveCount(0);
  await page.evaluate((mode) => localStorage.removeItem(mode), MODE);
  await globalRetry.click();
  await expect(globalRetry).toBeHidden();
  await expect.poll(async () => (await saved(page)).sessions['w6-m1'].runnerInfrastructureFailures).toBe(1);
  expect((await saved(page)).sessions['w6-m1'].totalRuns).toBe(0);
  await page.unroute(/pyodide\.mjs(?:\?.*)?$/);
  await page.getByRole('button', { name: '运行字段读取代码' }).click();
  await expect.poll(async () => (await saved(page)).sessions['w6-m1'].lastRun?.state).toBe('field-read-conflict');
});

test('@w6-m1-runtime cancel rejects a delayed result and a later fresh run succeeds', async ({ page }) => {
  await seed(page); await page.route(/weekSixRecordsPython\.worker-[^/]+\.js/, async (route) => { const response = await route.fetch(); const actual = await response.text(); await route.fulfill({ response, body: `const send=self.postMessage.bind(self);self.postMessage=(m,...r)=>m?.type==='result'?setTimeout(()=>send(m,...r),1200):send(m,...r);\n${actual}`, contentType: 'application/javascript' }); });
  await open(page); await page.getByRole('button', { name: '运行字段读取代码' }).click(); await page.getByRole('button', { name: '取消本次运行' }).click(); await expect(page.getByLabel('字典记录运行结果')).toContainText('已取消'); await page.waitForTimeout(1300); expect((await saved(page)).sessions['w6-m1'].lastRun).toBeNull(); await expect(page.getByRole('button', { name: '运行字段读取代码' })).toBeEnabled();
  await page.unroute(/weekSixRecordsPython\.worker-[^/]+\.js/); await page.getByRole('button', { name: '运行字段读取代码' }).click(); await expect.poll(async () => (await saved(page)).sessions['w6-m1'].lastRun?.state).toBe('field-read-conflict');
});

test('@w6-m1-security the built Worker rejects authority-bearing Python and still runs the allowlisted program', async ({ page }) => {
  test.setTimeout(90_000);
  let workerUrl = '';
  page.on('request', (request) => { if (/weekSixRecordsPython\.worker-[^/]+\.js/.test(request.url())) workerUrl = request.url(); });
  await seed(page); await open(page);
  expect(new URL(workerUrl).origin).toBe(new URL(page.url()).origin);
  const before = await page.evaluate(({ key, rev }) => [localStorage.getItem(key), localStorage.getItem(rev)], { key: KEY, rev: REV });
  const outcomes = await page.evaluate(async ({ workerUrl, solved }) => {
    const worker = new Worker(workerUrl, { type: 'module' });
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(Error('worker ready timeout')), 30_000);
      worker.onerror = () => reject(Error('worker load error'));
      worker.onmessage = (event) => { if (event.data?.type === 'ready') { window.clearTimeout(timer); resolve(); } else if (event.data?.type === 'load-error') reject(Error(String(event.data.error))); };
    });
    const codes = ['import os', '().__class__', '__import__("os")', 'open("/tmp/x")', 'while True:\n    pass', solved];
    const results: string[] = [];
    for (let index = 0; index < codes.length; index += 1) {
      results.push(await new Promise<string>((resolve, reject) => {
        const requestId = index + 1; const timer = window.setTimeout(() => reject(Error('worker run timeout')), 10_000);
        worker.onmessage = (event) => { if (event.data?.requestId === requestId) { window.clearTimeout(timer); resolve(String(event.data.type)); } };
        worker.postMessage({ type: 'run', requestId, code: codes[index] });
      }));
    }
    worker.terminate(); return results;
  }, { workerUrl, solved: SOLVED_WEEK_SIX_RECORDS_PYTHON });
  expect(outcomes).toEqual(['error', 'error', 'error', 'error', 'error', 'result']);
  expect(await page.evaluate(({ key, rev }) => [localStorage.getItem(key), localStorage.getItem(rev)], { key: KEY, rev: REV })).toEqual(before);
});

test('@w6-m1-lazy a failed W6 experience chunk retries locally without losing the prerequisite save', async ({ page }) => {
  await seed(page);
  let failed = false;
  await page.route(/WeekSixRecordsExperience-[^/]+\.js/, (route) => {
    if (!failed) { failed = true; return route.fulfill({ status: 503, body: 'unavailable' }); }
    return route.continue();
  });
  await page.goto('./#/mission/w6-m1');
  await expect(page.getByText('结构化事实表体验加载失败')).toBeVisible({ timeout: 30_000 });
  const before = await saved(page);
  await page.getByRole('button', { name: '重新加载页面' }).click();
  await open(page);
  const after = await saved(page);
  expect(after.missionCompletionEvidence['w5-m5']).toEqual(before.missionCompletionEvidence['w5-m5']);
  expect(after.works['w5-m5-story-orchestration-record']).toEqual(before.works['w5-m5-story-orchestration-record']);
  expect(after.sessions['w5-m5']).toEqual(before.sessions['w5-m5']);
  expect(after.sessions['w6-m1']).toMatchObject({ totalRuns: 0, lastRun: null });
});

test('@w6-m1-home-lazy the new home route chunk exposes a visible retry and still opens the real first level', async ({ page }) => {
  let failed = false;
  await page.route(/HomePage-[^/]+\.js/, (route) => {
    if (!failed) { failed = true; return route.fulfill({ status: 503, body: 'unavailable' }); }
    return route.continue();
  });
  await page.goto('./');
  const acknowledge = page.getByRole('button', { name: '我知道了', exact: true }); if (await acknowledge.isVisible()) await acknowledge.click();
  await expect(page.getByText('页面内容加载失败')).toBeVisible({ timeout: 30_000 });
  await page.unroute(/HomePage-[^/]+\.js/);
  await page.getByRole('button', { name: '重新加载页面' }).click();
  await expect(page.getByRole('heading', { name: '西游编程记' })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: '开始第一关：龙宫求兵' }).click();
  await expect(page).toHaveURL(/#\/mission\/w1-m1/);
  await expect(page.getByRole('heading', { name: '龙宫求兵' })).toBeVisible();
});

test('@w6-m1-corrupt @w6-m1-parent damaged current restores formal work and export/import preserves the parent summary', async ({ page }) => {
  await seed(page, formalW6M1Completion()); await page.goto('./'); await page.evaluate((mode) => localStorage.setItem(mode, 'corrupt-w6-m1-current'), MODE); await page.reload(); await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
  const recovered = await saved(page); expect(recovered.missionCompletionEvidence['w6-m1'].kind).toBe('formal-v3'); expect(recovered.works['w6-m1-structured-records-table']).toBeTruthy();
  await page.goto('./#/parent'); await unlockParent(page); const summary = page.getByRole('region', { name: '第六周结构化记录学习摘要' }); await expect(summary).toContainText('学习按字段读取记录'); await expect(summary).not.toContainText(/pythonCode|canonicalTrace|record\["经过"\]/);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: '导出进度' }).click(); const bytes = readFileSync((await (await download).path())!);
  await page.getByRole('button', { name: '清空学习数据' }).click(); await page.getByLabel('输入“清空”以确认').fill('清空');
  const clearDownload = page.waitForEvent('download'); await page.getByRole('button', { name: '备份并清空' }).click(); await clearDownload;
  await expect.poll(async () => (await saved(page)).missionCompletionEvidence['w6-m1']).toBeUndefined();
  await page.reload();
  await unlockParent(page);
  await page.getByLabel('选择进度文件').setInputFiles({ name: 'w6m1.json', mimeType: 'application/json', buffer: bytes });
  await expect(page.getByText(/导入成功/)).toBeVisible();
  await expect.poll(async () => (await saved(page)).missionCompletionEvidence['w6-m1']?.kind).toBe('formal-v3');
  expect((await saved(page)).works['w6-m1-structured-records-table']).toBeTruthy();
});

test('@w6-m1-legacy legacy W5-M5 history cannot enter formal W6-M1', async ({ page }) => {
  const old = JSON.parse(formalW5M5Prerequisite()); old.missionCompletionEvidence['w5-m5'] = { kind: 'legacy-replay-only', completedAt: old.missions['w5-m5'].completedAt, sourceVersion: 3, sourceSchemaRevision: 16 }; delete old.sessions['w5-m5']; delete old.works['w5-m5-story-orchestration-record'];
  await seed(page, JSON.stringify(old)); await page.goto('./#/mission/w6-m1'); await expect(page.getByText(/历史学习记录|正式证明/)).toBeVisible(); await expect(page.getByLabel('W6-M1 Python 字典记录代码')).toHaveCount(0);
});

test('@w6-m1-full @w6-m1-cold W6 lazy route, Worker, generated scene and local runtime stay inside inherited budgets', async ({ page }) => {
  const manifest = JSON.parse(readFileSync(new URL('../dist-e2e/.vite/manifest.json', import.meta.url), 'utf8')); const keys = collectRuntimeClosure(manifest, 'src/components/WeekSixRecordsExperience.tsx'); const files = [...keys].map((key) => manifest[key]?.file).filter((file): file is string => typeof file === 'string' && file.endsWith('.js'));
  const lazyBytes = files.reduce((sum, file) => sum + statSync(new URL(`../dist-e2e/${file}`, import.meta.url)).size, 0); expect(lazyBytes).toBeLessThanOrEqual(WEEK_SIX_RECORDS_COLD_LOAD_MAX_BYTES);
  const workers = readdirSync(new URL('../dist-e2e/assets/', import.meta.url)).filter((file) => /^weekSixRecordsPython\.worker-.*\.js$/.test(file)); expect(workers).toHaveLength(1); expect(statSync(new URL(`../dist-e2e/assets/${workers[0]}`, import.meta.url)).size).toBeLessThan(PYTHON_RUNTIME_TRANSFER_MAX_BYTES);
  expect(statSync(new URL('../public/assets/week-six-records/flaming-mountain-background.webp', import.meta.url)).size).toBeLessThan(512 * 1024);
  const requested: string[] = []; page.on('request', (request) => requested.push(request.url())); await seed(page); await open(page);
  const local = new URL(page.url()).origin;
  expect(requested.some((url) => /weekSixRecordsPython\.worker-/.test(url) && new URL(url).origin === local)).toBe(true);
  const runtimeProbe = await page.evaluate(async () => {
    const url = new URL('./runtime/pyodide-314.0.2/pyodide.mjs', window.location.href);
    const response = await fetch(url);
    return { origin: url.origin, status: response.status, contentType: response.headers.get('content-type') };
  });
  expect(runtimeProbe).toMatchObject({ origin: local, status: 200 });
  expect(runtimeProbe.contentType).toMatch(/javascript/);
});
