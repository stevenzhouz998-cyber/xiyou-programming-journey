import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { completeMission, createInitialProgress, serializeProgress } from '../src/progress/progress';
import { createMissionSession, recordRun, updateWorkspaceDraft } from '../src/progress/session';
import { createDefaultManorHelpDraft, compileManorHelpDraft, runManorHelp } from '../src/blockly/weekThreeManorHelpContract';
import { compileCuilanBooleanDraft, runCuilanBooleanForDraft } from '../src/blockly/weekThreeCuilanBooleanContract';
import { createDefaultYunzhanDialogueDraft, compileYunzhanDialogueDraft, runYunzhanDialogueForDraft } from '../src/blockly/weekThreeYunzhanDialogueContract';
import { createDefaultBajieJoiningDraft, compileBajieJoiningDraft, runBajieJoiningForDraft } from '../src/blockly/weekThreeBajieJoiningContract';
import { compileWeekThreeBossDraft } from '../src/blockly/weekThreeBossCompiler';
import { runWeekThreeBossDraft } from '../src/blockly/weekThreeBossContract';
import { createSolvedWeekThreeBossDraftForTest } from '../src/blockly/weekThreeBossTestHelpers';
import { WEEK_FOUR_MAPPING_COLD_LOAD_MAX_BYTES, PYTHON_RUNTIME_TRANSFER_MAX_BYTES } from '../scripts/budget-limits.mjs';

// @w4-m1-full @w4-m1-keyboard @w4-m1-mouse @w4-m1-touch @w4-m1-storage @w4-m1-corrupt @w4-m1-parent @w4-m1-work @w4-m1-python-security @w4-m1-cold @w4-m1-asset-fault @w4-m1-narrow @w4-m1-external @w4-m1-lazy @w4-m1-runtime-fault
const CURRENT_KEY = 'xiyou-programming-progress-v3';
const REVISION_KEY = 'xiyou-programming-progress-revision-v3';
const MODE_KEY = 'xiyou-test-storage-mode';
type HealthEvent = { kind: string; url: string; detail: string };
const healthEvents = new WeakMap<Page, HealthEvent[]>();
let expectedFailureUrl: string | null = null;

function formalW3M5Prerequisite() {
  let progress = createInitialProgress();
  progress = { ...progress, privacy: { localDataNoticeSeen: true } };
  for (const id of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4', 'w2-m5'] as const) progress = completeMission(progress, id, { stars: 3, hintsUsed: 0 });
  const manor = createDefaultManorHelpDraft(); manor.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help'; const manorTrace = compileManorHelpDraft(manor); progress = { ...progress, sessions: { ...progress.sessions, 'w3-m1': recordRun(updateWorkspaceDraft(createMissionSession('w3-m1'), manor, '2026-08-30T00:00:00.000Z'), runManorHelp(manorTrace), manorTrace, '2026-08-30T00:00:01.000Z') } }; progress = completeMission(progress, 'w3-m1', { stars: 3, hintsUsed: 0 });
  const cuilan = createMissionSession('w3-m2'); const cuilanDraft = structuredClone(cuilan.workspace); cuilanDraft.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan'; const cuilanTrace = compileCuilanBooleanDraft(cuilanDraft); progress = { ...progress, sessions: { ...progress.sessions, 'w3-m2': recordRun(updateWorkspaceDraft(cuilan, cuilanDraft, '2026-08-30T00:00:02.000Z'), runCuilanBooleanForDraft(cuilanDraft, cuilanTrace), cuilanTrace, '2026-08-30T00:00:03.000Z') } }; progress = completeMission(progress, 'w3-m2', { stars: 3, hintsUsed: 0 });
  const yunzhan = createDefaultYunzhanDialogueDraft(); yunzhan.blocks.find((block) => block.id === 'yunzhan-condition')!.type = 'w3_yunzhan_condition_pilgrimage_explicit'; yunzhan.blocks.find((block) => block.id === 'yunzhan-then-action')!.type = 'w3_yunzhan_explain_guanyin_origin'; yunzhan.blocks.find((block) => block.id === 'yunzhan-else-action')!.type = 'w3_yunzhan_guard_cave'; const yunzhanTrace = compileYunzhanDialogueDraft(yunzhan); progress = { ...progress, sessions: { ...progress.sessions, 'w3-m3': recordRun(updateWorkspaceDraft(createMissionSession('w3-m3'), yunzhan, '2026-08-30T00:00:04.000Z'), runYunzhanDialogueForDraft(yunzhan, yunzhanTrace), yunzhanTrace, '2026-08-30T00:00:05.000Z') } }; progress = completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 });
  const bajie = createDefaultBajieJoiningDraft(); bajie.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and'; const bajieTrace = compileBajieJoiningDraft(bajie); progress = { ...progress, sessions: { ...progress.sessions, 'w3-m4': recordRun(updateWorkspaceDraft(createMissionSession('w3-m4'), bajie, '2026-08-30T00:00:06.000Z'), runBajieJoiningForDraft(bajie, bajieTrace), bajieTrace, '2026-08-30T00:00:07.000Z') } }; progress = completeMission(progress, 'w3-m4', { stars: 3, hintsUsed: 0 });
  const boss = createSolvedWeekThreeBossDraftForTest(); const bossTrace = compileWeekThreeBossDraft(boss); progress = { ...progress, sessions: { ...progress.sessions, 'w3-m5': recordRun(updateWorkspaceDraft(createMissionSession('w3-m5'), boss, '2026-08-30T00:00:08.000Z'), runWeekThreeBossDraft(boss), bossTrace.ok ? bossTrace.trace : [], '2026-08-30T00:00:09.000Z') } };
  return serializeProgress(completeMission(progress, 'w3-m5', { stars: 3, hintsUsed: 0 }));
}
const W3_M5_FORMAL_PREREQUISITE_SHA256 = '33ec2b4b2089c7b64cdca46bfd65b5e95c644a1c8b48c306f443b50af92c14c9';

function expectedFailure(value: string) { return expectedFailureUrl !== null && (value === expectedFailureUrl || value.includes(expectedFailureUrl)); }
function attachHealth(page: Page) { const events: HealthEvent[] = []; healthEvents.set(page, events); page.on('console', (message) => { if (message.type() === 'error' && !expectedFailure(message.location().url) && !expectedFailure(message.text())) events.push({ kind: 'console', url: message.location().url || page.url(), detail: message.text() }); }); page.on('pageerror', (error) => events.push({ kind: 'pageerror', url: page.url(), detail: error.message })); page.on('requestfailed', (request) => { const detail = request.failure()?.errorText ?? ''; if (!expectedFailure(request.url())) events.push({ kind: 'requestfailed', url: request.url(), detail }); }); page.on('response', (response) => { if (response.status() >= 400 && !expectedFailure(response.url())) events.push({ kind: 'response', url: response.url(), detail: `HTTP ${response.status()}` }); }); }
async function stored(page: Page) { return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY); }
async function gotoMapping(page: Page) { await page.goto('./#/mission/w4-m1'); await expect(page.locator('.week-four-mapping-experience').getByRole('heading', { name: '同一逻辑，两种写法' })).toBeVisible(); await expect(page.getByRole('region', { name: 'Blockly 参考条件图' })).toBeVisible(); await expect(page.getByLabel('只读 Python 文本')).toBeVisible(); }
async function run(page: Page) { await page.getByRole('button', { name: '对照运行', exact: true }).click(); }
async function chooseIdentity(page: Page) { await page.getByRole('combobox', { name: '选择 Python 判断字段' }).selectOption('identity'); await expect.poll(async () => (await stored(page)).sessions['w4-m1']?.pythonCode).toContain('identity'); }
async function openParent(page: Page) { await page.goto('./#/parent'); await page.getByLabel('设置 4 位家长 PIN').fill('4826'); await page.getByLabel('确认家长 PIN').fill('4826'); await page.getByRole('button', { name: '创建家长 PIN', exact: true }).click(); await page.getByLabel('我已安全保存恢复码').check(); await page.getByRole('button', { name: '确认已保存并进入', exact: true }).click(); }
async function attach(page: Page, testInfo: TestInfo, name: string) { const path = testInfo.outputPath(`${name}-${testInfo.project.name}.png`); await page.screenshot({ path, fullPage: true }); await testInfo.attach(`${name}-${testInfo.project.name}.png`, { path, contentType: 'image/png' }); }

test.describe('W4-M1 Blockly 到 Python 映射真实浏览器证据', () => {
  test.beforeEach(async ({ page }) => { expectedFailureUrl = null; attachHealth(page); const raw = formalW3M5Prerequisite(); await page.addInitScript(({ current, revision, value }) => { if (localStorage.getItem(current) === null) { localStorage.setItem(current, value); localStorage.setItem(revision, '0'); } }, { current: CURRENT_KEY, revision: REVISION_KEY, value: raw }); });
  test.afterEach(async ({ page }) => { expect(healthEvents.get(page), 'unexpected W4-M1 browser health events').toEqual([]); });

  test('@w4-m1-full @w4-m1-work @w4-m1-parent default mismatch, immutable observation, visible repair, two-card proof, refresh, export-import, parent summary, and W4-M2 review', async ({ page }, testInfo) => {
    await gotoMapping(page); const codeLayout = await page.locator('.week-four-mapping-codemirror .cm-content').evaluate((content) => ({ whiteSpace: getComputedStyle(content).whiteSpace, lines: content.querySelectorAll('.cm-line').length })); expect(codeLayout.whiteSpace).toBe('pre'); expect(codeLayout.lines).toBe(4); const codeScroller = await page.locator('.week-four-mapping-codemirror .cm-scroller').evaluate((scroller) => ({ scrollWidth: scroller.scrollWidth, clientWidth: scroller.clientWidth })); expect(codeScroller.scrollWidth).toBeLessThanOrEqual(codeScroller.clientWidth); const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); expect(geometry.scroll).toBeLessThanOrEqual(geometry.width); await attach(page, testInfo, 'w4m1-default');
    await run(page); await expect(page.getByText('两种写法在第一张公开卡得出了不同分支；差异已经保存。')).toBeVisible({ timeout: 25_000 }); await attach(page, testInfo, 'w4m1-mismatch');
    const before = await stored(page); await page.getByRole('button', { name: '火眼金睛：观察本次判断', exact: true }).click(); await expect(page.getByText('火眼金睛：本次已保存的事实')).toBeVisible(); const observed = await stored(page); expect(observed.sessions['w4-m1'].workspace).toEqual(before.sessions['w4-m1'].workspace); expect(observed.sessions['w4-m1'].pythonCode).toBe(before.sessions['w4-m1'].pythonCode); expect(observed.works).toEqual(before.works);
    await chooseIdentity(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 }); await attach(page, testInfo, 'w4m1-matched'); const complete = await stored(page); expect(complete.missionCompletionEvidence['w4-m1'].kind).toBe('formal-v3'); expect(complete.works['w4-m1-first-python-mapping'].run.cardResults).toHaveLength(2);
    await page.reload(); await expect(page.getByText('同一逻辑，两种写法')).toBeVisible(); expect((await stored(page)).works).toEqual(complete.works); const replayBefore = await stored(page); await run(page); await expect(page.getByText('回放核验完成，已保留正式作品和通关证明。')).toBeVisible({ timeout: 25_000 }); expect(await stored(page)).toEqual(replayBefore);
    await openParent(page); const download = page.waitForEvent('download'); await page.getByRole('button', { name: '导出进度', exact: true }).click(); const path = await (await download).path(); expect(path).not.toBeNull(); await page.getByLabel('选择进度文件').setInputFiles({ name: 'w4-m1-progress.json', mimeType: 'application/json', buffer: readFileSync(path!) }); await expect(page.getByText(/导入成功/)).toBeVisible(); await page.goto('./#/mission/w4-m2'); await expect(page.getByText('回看 W4-M1 对照作品')).toBeVisible(); await page.getByText('回看 W4-M1 对照作品').click(); await expect(page.getByLabel('W4-M1 Python 只读作品')).toBeVisible(); await attach(page, testInfo, 'w4m2-work'); expect(await page.getByRole('region', { name: 'W4-M1 只读对照作品' }).getByRole('button').count()).toBe(0);
  });

  test('@w4-m1-keyboard keyboard changes the same read-only CodeMirror source field', async ({ page }) => { await gotoMapping(page); const field = page.getByRole('combobox', { name: '选择 Python 判断字段' }); await field.focus(); await field.press('End'); await field.press('Enter'); await expect.poll(async () => (await stored(page)).sessions['w4-m1']?.pythonCode).toContain('identity'); });
  test('@w4-m1-mouse desktop mouse changes the visible selector', async ({ page }) => { await gotoMapping(page); await chooseIdentity(page); });
  test('@w4-m1-touch touch reaches the same field without a hidden answer state', async ({ page }) => { await gotoMapping(page); const field = page.getByRole('combobox', { name: '选择 Python 判断字段' }); try { await field.tap(); } catch { await field.click(); } await field.selectOption('identity'); await expect.poll(async () => (await stored(page)).sessions['w4-m1']?.pythonCode).toContain('identity'); });

  test('@w4-m1-storage draft fault retains the saved appearance draft after retry', async ({ page }) => { await gotoMapping(page); await page.evaluate(([key, value]) => localStorage.setItem(key, value), [MODE_KEY, 'fail-w4-m1-draft']); await run(page); await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible({ timeout: 25_000 }); await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY); await page.getByRole('button', { name: '重试保存', exact: true }).click(); await expect.poll(async () => (await stored(page)).sessions['w4-m1']?.pythonCode).toContain('appearance'); const draftAfterRetry = await stored(page); expect(draftAfterRetry.sessions['w4-m1']?.lastRun).toBeNull(); expect(draftAfterRetry.missions['w4-m1']).toBeUndefined(); });
  test('@w4-m1-storage run fault retries the saved mismatch without another Worker run', async ({ page }) => { await gotoMapping(page); await page.evaluate(([key, value]) => localStorage.setItem(key, value), [MODE_KEY, 'fail-w4-m1-run']); await run(page); await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible({ timeout: 25_000 }); await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY); await page.getByRole('button', { name: '重试保存', exact: true }).click(); await expect.poll(async () => (await stored(page)).sessions['w4-m1']?.totalRuns).toBe(1); const runAfterRetry = await stored(page); expect(runAfterRetry.sessions['w4-m1']?.lastRun?.completed).toBe(false); expect(runAfterRetry.sessions['w4-m1']?.failureSnapshot).not.toBeNull(); expect(runAfterRetry.sessions['w4-m1']?.totalRuns).toBe(1); expect(runAfterRetry.works['w4-m1-first-python-mapping']).toBeUndefined(); });
  test('@w4-m1-storage observation fault retries one immutable observation', async ({ page }) => { await gotoMapping(page); await page.evaluate(([key, value]) => localStorage.setItem(key, value), [MODE_KEY, 'fail-w4-m1-observation']); await run(page); await expect(page.getByText('两种写法在第一张公开卡得出了不同分支；差异已经保存。')).toBeVisible({ timeout: 25_000 }); const observationBefore = await stored(page); await page.getByRole('button', { name: '火眼金睛：观察本次判断', exact: true }).click(); await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible({ timeout: 25_000 }); await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY); await page.getByRole('button', { name: '重试保存', exact: true }).click(); await expect(page.getByText('火眼金睛：本次已保存的事实')).toBeVisible(); const observationAfterRetry = await stored(page); expect(observationAfterRetry.sessions['w4-m1']?.conditionObservationUses).toHaveLength(1); expect(observationAfterRetry.sessions['w4-m1']?.workspace).toEqual(observationBefore.sessions['w4-m1']?.workspace); expect(observationAfterRetry.sessions['w4-m1']?.pythonCode).toBe(observationBefore.sessions['w4-m1']?.pythonCode); });
  test('@w4-m1-storage work fault atomically publishes work, evidence, and completion after retry', async ({ page }) => { await gotoMapping(page); await page.evaluate(([key, value]) => localStorage.setItem(key, value), [MODE_KEY, 'fail-w4-m1-work']); await chooseIdentity(page); await run(page); await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible({ timeout: 25_000 }); const workBeforeRetry = await stored(page); expect(workBeforeRetry.missions['w4-m1']).toBeUndefined(); expect(workBeforeRetry.missionCompletionEvidence['w4-m1']).toBeUndefined(); expect(workBeforeRetry.works['w4-m1-first-python-mapping']).toBeUndefined(); await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY); await page.getByRole('button', { name: '重试保存', exact: true }).click(); await expect(page.getByRole('button', { name: '重试保存通关', exact: true })).toBeVisible({ timeout: 25_000 }); await page.getByRole('button', { name: '重试保存通关', exact: true }).click(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 }); const afterRetry = await stored(page); expect(afterRetry.missions['w4-m1']?.status).toBe('completed'); expect(afterRetry.missionCompletionEvidence['w4-m1']?.kind).toBe('formal-v3'); expect(afterRetry.works['w4-m1-first-python-mapping']).toBeDefined(); expect(afterRetry.works['w4-m1-first-python-mapping']?.run.completed).toBe(true); });
  test('@w4-m1-storage completion fault atomically publishes work, evidence, and completion after retry', async ({ page }) => { await gotoMapping(page); await page.evaluate(([key, value]) => localStorage.setItem(key, value), [MODE_KEY, 'fail-w4-m1-completion']); await chooseIdentity(page); await run(page); await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible({ timeout: 25_000 }); const completionBeforeRetry = await stored(page); expect(completionBeforeRetry.missions['w4-m1']).toBeUndefined(); expect(completionBeforeRetry.missionCompletionEvidence['w4-m1']).toBeUndefined(); expect(completionBeforeRetry.works['w4-m1-first-python-mapping']).toBeUndefined(); await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY); await page.getByRole('button', { name: '重试保存', exact: true }).click(); await expect(page.getByRole('button', { name: '重试保存通关', exact: true })).toBeVisible({ timeout: 25_000 }); await page.getByRole('button', { name: '重试保存通关', exact: true }).click(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 }); const afterRetry = await stored(page); expect(afterRetry.missions['w4-m1']?.status).toBe('completed'); expect(afterRetry.missionCompletionEvidence['w4-m1']?.kind).toBe('formal-v3'); expect(afterRetry.works['w4-m1-first-python-mapping']).toBeDefined(); expect(afterRetry.works['w4-m1-first-python-mapping']?.run.completed).toBe(true); });
  test('@w4-m1-external stale tab keeps its own backup and requires explicit external reload', async ({ page, context }) => { await gotoMapping(page); const stale = await context.newPage(); attachHealth(stale); try { await stale.goto('./#/mission/w4-m1'); await chooseIdentity(page); await expect(stale.getByRole('alert').filter({ hasText: '其他标签页已有新的学习进度' })).toBeVisible(); await expect(stale.getByRole('button', { name: '对照运行', exact: true })).toBeDisabled(); await stale.getByRole('button', { name: '载入其他标签页进度', exact: true }).click(); await expect(stale.getByRole('button', { name: '对照运行', exact: true })).toBeEnabled(); await expect.poll(async () => (await stored(stale)).sessions['w4-m1']?.pythonCode).toContain('identity'); } finally { expect(healthEvents.get(stale)).toEqual([]); await stale.close(); } });
  test('@w4-m1-corrupt malformed current is recoverable and remains downloadable', async ({ page }) => { await gotoMapping(page); await page.evaluate(([key, value]) => localStorage.setItem(key, value), [MODE_KEY, 'corrupt-week-four-mapping-current']); await page.reload(); await expect(page.getByText('学习进度已经安全恢复')).toBeVisible(); await openParent(page); const download = page.waitForEvent('download'); await page.getByRole('button', { name: '下载损坏原文', exact: true }).click(); expect((await download).suggestedFilename()).toContain('corrupt'); });
  test('@w4-m1-asset-fault scene failure blocks publication until local retry', async ({ page }) => { let faultActive = true; let firstFailure: string | null = null; await page.route(/mapping-states\.webp(?:\?.*)?$/, async (route) => { if (faultActive) { firstFailure ??= route.request().url(); expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic asset failure' }); } else await route.continue(); }); await gotoMapping(page); await expect(page.getByRole('button', { name: '重试场景资源', exact: true })).toBeVisible(); expect(firstFailure).not.toBeNull(); await chooseIdentity(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0); faultActive = false; expectedFailureUrl = null; await page.getByRole('button', { name: '重试场景资源', exact: true }).click(); await expect.poll(async () => page.locator('.week-four-mapping-scene img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 }); });
  test('@w4-m1-lazy actual first Experience chunk 503 exposes retry without publishing W4 state', async ({ page }) => { let failed = false; await page.route(/WeekFourMappingExperience-[^/]+\.js(?:\?.*)?$/, async (route) => { if (!failed) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic lazy failure' }); } else await route.continue(); }); await page.goto('./#/mission/w4-m1'); await expect(page.getByRole('alert')).toContainText('积木变代码体验加载失败'); const before = await stored(page); expect(before.sessions['w4-m1']).toBeUndefined(); expect(before.missions['w4-m1']).toBeUndefined(); await page.getByRole('button', { name: '重新加载页面', exact: true }).click(); await expect(page.getByText('同一逻辑，两种写法')).toBeVisible(); expectedFailureUrl = null; await run(page); await expect(page.getByText('两种写法在第一张公开卡得出了不同分支；差异已经保存。')).toBeVisible({ timeout: 25_000 }); });
  test('@w4-m1-narrow narrow layout keeps scene, Blockly, and Python visible without horizontal overflow', async ({ page }) => { await gotoMapping(page); const geometry = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth })); expect(geometry.scroll).toBeLessThanOrEqual(geometry.width); await expect(page.getByLabel('白虎岭对照舞台')).toBeVisible(); });
  test('@w4-m1-python-security uses the real built Worker and leaves progress and revision bytes unchanged', async ({ page }) => { await gotoMapping(page); await run(page); await expect(page.getByText('两种写法在第一张公开卡得出了不同分支；差异已经保存。')).toBeVisible({ timeout: 25_000 }); const before = await page.evaluate(([current, revision]) => ({ current: localStorage.getItem(current), revision: localStorage.getItem(revision) }), [CURRENT_KEY, REVISION_KEY]); const rejected = await page.evaluate(async () => { const workerUrl = performance.getEntriesByType('resource').map((entry) => entry.name).find((url) => /weekFourPythonMapping\.worker-/.test(url)); if (!workerUrl) throw new Error('W4 Worker resource was not loaded.'); const worker = new Worker(workerUrl, { type: 'module' }); const cards = [{ id: 'canon-mysterious-visitor', appearance: '陌生来客', identity: '白骨精' }, { id: 'practice-mountain-traveller', appearance: '山中樵夫', identity: '普通人' }]; const inputs = [
      ['syntax error', 'if identity =='], ['import', 'import os'], ['open', 'open("x")'], ['from js import fetch', 'from js import fetch'], ['attribute', 'identity.__class__'], ['subscript', 'identity[0]'], ['eval', 'eval("1")'], ['dunder', '__import__("os")'], ['while True: pass', 'while True: pass'],
    ] as const;
    try { await new Promise<void>((resolve, reject) => { const timer = window.setTimeout(() => reject(new Error('Worker ready timeout')), 20_000); worker.onmessage = (event) => { if (event.data?.type === 'ready') { window.clearTimeout(timer); resolve(); } if (event.data?.type === 'load-error') { window.clearTimeout(timer); reject(new Error(event.data.error)); } }; worker.onerror = () => { window.clearTimeout(timer); reject(new Error('Worker failed')); }; }); const results: string[] = []; for (const [label, code] of inputs) { const requestId = results.length + 100; const message = await new Promise<{ type?: string; requestId?: number }>((resolve, reject) => { const timer = window.setTimeout(() => reject(new Error(`${label} timeout`)), 2_000); worker.onmessage = (event) => { const message = event.data; if (message?.requestId === requestId && message.type === 'error') { window.clearTimeout(timer); resolve(message); } }; worker.postMessage({ type: 'run', requestId, code, cards, sourceSpan: { line: 1, from: 3, to: 11 } }); }); if (message.type === 'error' && message.requestId === requestId) results.push(label); } return results; } finally { worker.terminate(); } }); expect(rejected).toHaveLength(9); expect(await page.evaluate(([current, revision]) => ({ current: localStorage.getItem(current), revision: localStorage.getItem(revision) }), [CURRENT_KEY, REVISION_KEY])).toEqual(before); });
});

test.describe('W4-M1 同源 Pyodide runtime 真实浏览器证据', () => {
  test.beforeEach(async ({ page }) => {
    expectedFailureUrl = null;
    attachHealth(page);
    const raw = formalW3M5Prerequisite();
    await page.addInitScript(({ current, revision, value }) => {
      if (localStorage.getItem(current) === null) {
        localStorage.setItem(current, value);
        localStorage.setItem(revision, '0');
      }
    }, { current: CURRENT_KEY, revision: REVISION_KEY, value: raw });
  });
  test.afterEach(async ({ page }) => {
    expect(healthEvents.get(page), 'unexpected same-origin runtime browser health events').toEqual([]);
  });

  test('@w4-m1-runtime-fault same-origin Pyodide 503 records infrastructure-only failure and retries the real mismatch', async ({ page }) => {
    let runtimeUnavailable = true;
    await page.route(/\/xiyou-programming-journey\/runtime\/pyodide-314\.0\.2\/pyodide\.mjs(?:\?.*)?$/, async (route) => {
      if (runtimeUnavailable) {
        expectedFailureUrl = route.request().url();
        await route.fulfill({ status: 503, body: 'synthetic Pyodide load failure' });
      } else await route.continue();
    });
    await gotoMapping(page);
    await run(page);
    await expect(page.getByText('Python 运行环境暂时不可用，这不算学习错误。', { exact: true })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible();
    const runtimeFailure = await stored(page);
    expect(runtimeFailure.sessions['w4-m1']?.runnerInfrastructureFailures).toBe(1);
    expect(runtimeFailure.sessions['w4-m1']?.totalRuns).toBe(0);
    expect(runtimeFailure.missions['w4-m1']).toBeUndefined();
    expect(runtimeFailure.missionCompletionEvidence['w4-m1']).toBeUndefined();
    expect(runtimeFailure.works['w4-m1-first-python-mapping']).toBeUndefined();
    runtimeUnavailable = false;
    expectedFailureUrl = null;
    await page.getByRole('button', { name: '重试保存', exact: true }).click();
    await expect(page.getByText('两种写法在第一张公开卡得出了不同分支；差异已经保存。')).toBeVisible({ timeout: 25_000 });
    const runtimeRecovered = await stored(page);
    expect(runtimeRecovered.sessions['w4-m1']?.runnerInfrastructureFailures).toBe(1);
    expect(runtimeRecovered.sessions['w4-m1']?.totalRuns).toBe(1);
    expect(runtimeRecovered.missions['w4-m1']).toBeUndefined();
    expect(runtimeRecovered.missionCompletionEvidence['w4-m1']).toBeUndefined();
    expect(runtimeRecovered.works['w4-m1-first-python-mapping']).toBeUndefined();
  });

  test('@w4-m1-asset-fault retries a recovered scene and any exact runtime infrastructure alert before publishing', async ({ page }) => {
    let faultActive = true;
    await page.route(/mapping-states\.webp(?:\?.*)?$/, async (route) => {
      if (faultActive) {
        expectedFailureUrl = route.request().url();
        await route.fulfill({ status: 503, body: 'synthetic asset failure' });
      } else await route.continue();
    });
    await gotoMapping(page);
    await expect(page.getByRole('button', { name: '重试场景资源', exact: true })).toBeVisible();
    await chooseIdentity(page);
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    faultActive = false;
    expectedFailureUrl = null;
    await page.getByRole('button', { name: '重试场景资源', exact: true }).click();
    await expect.poll(async () => page.locator('.week-four-mapping-scene img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
    const infrastructure = page.getByText('Python 运行环境暂时不可用，这不算学习错误。', { exact: true });
    if (await infrastructure.isVisible().catch(() => false)) {
      await expect(page.getByRole('button', { name: '重试保存', exact: true })).toBeVisible();
      await page.getByRole('button', { name: '重试保存', exact: true }).click();
      await expect.poll(async () => (await stored(page)).sessions['w4-m1']?.runnerInfrastructureFailures).toBe(1);
    }
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    const assetAfterRecovery = await stored(page);
    expect(assetAfterRecovery.missions['w4-m1']?.status).toBe('completed');
    expect(assetAfterRecovery.missionCompletionEvidence['w4-m1']?.kind).toBe('formal-v3');
    expect(assetAfterRecovery.works['w4-m1-first-python-mapping']).toBeDefined();
  });

  test('@w4-m1-cold desktop Chromium measures fixed-base runtime bytes, cold mismatch, and warm saved run', async ({ page, context }, testInfo) => {
    const transfer: Array<{ url: string; bytes: Promise<number> }> = [];
    page.on('response', (response) => {
      if (response.status() >= 200 && response.status() < 300) transfer.push({ url: response.url(), bytes: response.body().then((body) => body.length) });
    });
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: 1_250_000, uploadThroughput: 1_250_000, connectionType: 'cellular3g' });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const started = performance.now();
    await gotoMapping(page);
    await run(page);
    await expect(page.getByText('两种写法在第一张公开卡得出了不同分支；差异已经保存。')).toBeVisible({ timeout: 20_000 });
    const coldMs = performance.now() - started;
    const measured = await Promise.all(transfer.map(async (item) => ({ url: item.url, bytes: await item.bytes })));
    const sameOrigin = new URL(page.url()).origin;
    const totalLocalBytes = measured.filter((item) => item.url.startsWith(sameOrigin) && /WeekFourMapping|weekFourPythonMapping|blockly-editor|codemirror-editor/.test(item.url)).reduce((sum, item) => sum + item.bytes, 0);
    const applicationRoot = new URL('./', page.url()); const runtimeRoot = new URL('runtime/pyodide-314.0.2/', applicationRoot);
    expect(runtimeRoot.pathname).toBe('/xiyou-programming-journey/runtime/pyodide-314.0.2/');
    const pyodideResponses = measured.filter((item) => {
      const responseUrl = new URL(item.url);
      return responseUrl.origin === runtimeRoot.origin && responseUrl.pathname.startsWith(runtimeRoot.pathname);
    });
    expect(pyodideResponses).toHaveLength(5);
    expect(pyodideResponses.every((item) => item.url.includes('/xiyou-programming-journey/runtime/pyodide-314.0.2/'))).toBe(true);
    const totalPyodideBytes = pyodideResponses.reduce((sum, item) => sum + item.bytes, 0);
    expect(totalLocalBytes).toBeLessThanOrEqual(WEEK_FOUR_MAPPING_COLD_LOAD_MAX_BYTES);
    expect(totalPyodideBytes).toBeLessThanOrEqual(PYTHON_RUNTIME_TRANSFER_MAX_BYTES);
    expect(coldMs).toBeLessThanOrEqual(20_000);
    const beforeRuns = (await stored(page)).sessions['w4-m1'].totalRuns;
    const warmStarted = performance.now();
    await run(page);
    await expect.poll(async () => (await stored(page)).sessions['w4-m1'].totalRuns).toBe(beforeRuns + 1);
    const warmMs = performance.now() - warmStarted;
    expect(warmMs).toBeLessThanOrEqual(1_000);
    const metrics = { totalLocalBytes, totalPyodideBytes, pyodideResponses, coldMs, warmMs };
    console.log(`[w4-m1-cold] ${JSON.stringify(metrics)}`);
    await testInfo.attach('w4-m1-cold-metrics.json', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' });
    await client.detach();
  });
});
