import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { completeMission, createInitialProgress, serializeProgress } from '../src/progress/progress';
import { createMissionSession, recordRun, updateWorkspaceDraft } from '../src/progress/session';
import { compileManorHelpDraft, createDefaultManorHelpDraft, runManorHelp } from '../src/blockly/weekThreeManorHelpContract';
import { compileCuilanBooleanDraft, runCuilanBooleanForDraft } from '../src/blockly/weekThreeCuilanBooleanContract';
import { WEEK_THREE_YUNZHAN_DIALOGUE_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs';

const CURRENT_KEY = 'xiyou-programming-progress-v3';
const REVISION_KEY = 'xiyou-programming-progress-revision-v3';
const MODE_KEY = 'xiyou-test-storage-mode';
type HealthEvent = { kind: string; url: string; detail: string };
const healthEvents = new WeakMap<Page, HealthEvent[]>();
let expectedFailureUrl: string | null = null;

function prerequisite(testInfo: TestInfo) {
  let progress = createInitialProgress();
  const standard = /motion parity/i.test(testInfo.title);
  progress = { ...progress, settings: { ...progress.settings, muted: !standard, reducedMotion: !standard, reducedMotionOverride: !standard }, privacy: { localDataNoticeSeen: true } };
  for (const id of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4', 'w2-m5'] as const) progress = completeMission(progress, id, { stars: 3, hintsUsed: 0 });
  const manor = createDefaultManorHelpDraft();
  manor.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help';
  const manorTrace = compileManorHelpDraft(manor);
  const manorSession = recordRun(updateWorkspaceDraft(createMissionSession('w3-m1'), manor, '2026-08-27T00:00:00.000Z'), runManorHelp(manorTrace), manorTrace, '2026-08-27T00:00:01.000Z');
  progress = completeMission({ ...progress, sessions: { ...progress.sessions, 'w3-m1': manorSession } }, 'w3-m1', { stars: 3, hintsUsed: 0 });
  const cuilan = createMissionSession('w3-m2');
  const cuilanDraft = structuredClone(cuilan.workspace);
  cuilanDraft.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
  const cuilanTrace = compileCuilanBooleanDraft(cuilanDraft);
  const cuilanSession = recordRun(updateWorkspaceDraft(cuilan, cuilanDraft, '2026-08-27T00:00:02.000Z'), runCuilanBooleanForDraft(cuilanDraft, cuilanTrace), cuilanTrace, '2026-08-27T00:00:03.000Z');
  return serializeProgress(completeMission({ ...progress, sessions: { ...progress.sessions, 'w3-m2': cuilanSession } }, 'w3-m2', { stars: 3, hintsUsed: 0 }));
}

function expectedFailure(value: string) { return expectedFailureUrl !== null && (value === expectedFailureUrl || value.includes(expectedFailureUrl)); }
function attachHealth(page: Page) {
  const events: HealthEvent[] = [];
  healthEvents.set(page, events);
  page.on('console', (message) => { if (message.type() === 'error' && !expectedFailure(message.location().url) && !expectedFailure(message.text())) events.push({ kind: 'console', url: message.location().url || page.url(), detail: message.text() }); });
  page.on('pageerror', (error) => events.push({ kind: 'page', url: page.url(), detail: error.message }));
  page.on('requestfailed', (request) => { const detail = request.failure()?.errorText ?? ''; if (expectedFailure(request.url()) || (request.url() === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(detail))) return; events.push({ kind: 'request', url: request.url(), detail }); });
  page.on('response', (response) => { if (response.status() >= 400 && !expectedFailure(response.url())) events.push({ kind: 'response', url: response.url(), detail: `HTTP ${response.status()}` }); });
}

const workspace = (page: Page) => page.getByRole('region', { name: '云栈洞对话 Blockly 工作区', exact: true });
async function storedProgress(page: Page) { return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY); }
async function gotoYunzhan(page: Page) {
  await page.goto('./#/mission/w3-m3');
  await expect(page.getByText('让分支跟着西行使命走')).toBeVisible();
  await expect(page.getByRole('img', { name: '云栈洞执行场景' })).toHaveAttribute('data-scene-ready', 'true');
  await expect(page.locator('.advanced-blockly-host svg.blocklySvg')).toBeVisible();
}
async function press(page: Page, name: string, keyboard = false) {
  const button = page.getByRole('button', { name, exact: true });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await button.press('Enter'); } else await button.click();
}
async function swap(page: Page, key: 'Enter' | 'Space' | null = null, waitForPersistence = true, expectedBranch: 'then' | 'else' = 'else') {
  const button = page.getByRole('button', { name: '交换两个分支里的动作', exact: true });
  await expect(button).toBeEnabled();
  if (key === null) await button.click(); else { await button.focus(); await button.press(key); }
  await expect(workspace(page).locator('.blocklyDraggable[data-id="yunzhan-then-action"]')).toBeVisible();
  if (waitForPersistence) await expect.poll(async () => (await storedProgress(page)).sessions['w3-m3']?.workspace.blocks.find((block: { id: string }) => block.id === 'yunzhan-then-action')?.branch ?? null).toBe(expectedBranch);
}
async function run(page: Page, keyboard = false) { await press(page, '执行两轮对话', keyboard); }
async function complete(page: Page) { await swap(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible(); }
async function attach(page: Page, testInfo: TestInfo, name: string) { const path = testInfo.outputPath(`${name}-${testInfo.project.name}.png`); await page.screenshot({ path, fullPage: true }); await testInfo.attach(`${name}-${testInfo.project.name}.png`, { path, contentType: 'image/png' }); }

test.describe('W3-M3 云栈洞双轮对话', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    expectedFailureUrl = null;
    attachHealth(page);
    await page.addInitScript(({ raw, current, revision }) => { if (localStorage.getItem(current) === null) { localStorage.setItem(current, raw); localStorage.setItem(revision, '0'); } }, { raw: prerequisite(testInfo), current: CURRENT_KEY, revision: REVISION_KEY });
  });
  test.afterEach(async ({ page }) => { expect(healthEvents.get(page), 'unexpected W3-M3 browser health events').toEqual([]); });

  test('@w3-m3-full @w3-m3-narrow child sees the wrong Blockly branches, records evidence, repairs the same graph, unlocks W3-M4, and replays without a new run', async ({ page }, testInfo) => {
    await gotoYunzhan(page);
    const pixels = await workspace(page).locator('.advanced-blockly-host').screenshot();
    expect(new Set(pixels).size).toBeGreaterThan(20);
    const blockBounds = await workspace(page).evaluate((root) => { const host = root.querySelector<HTMLElement>('.advanced-blockly-host')!.getBoundingClientRect(); return [...root.querySelectorAll<HTMLElement>('.blocklyDraggable[data-id]')].map((block) => { const rect = block.getBoundingClientRect(); return { id: block.dataset.id, left: rect.left - host.left, right: host.right - rect.right, top: rect.top - host.top, bottom: host.bottom - rect.bottom }; }); });
    expect(blockBounds).toHaveLength(4);
    for (const bounds of blockBounds) { expect(bounds.left, `${bounds.id} left`).toBeGreaterThanOrEqual(-2); expect(bounds.right, `${bounds.id} right`).toBeGreaterThanOrEqual(-2); expect(bounds.top, `${bounds.id} top`).toBeGreaterThanOrEqual(-2); expect(bounds.bottom, `${bounds.id} bottom`).toBeGreaterThanOrEqual(-2); }
    const geometry = await page.evaluate(() => { const box = (selector: string) => document.querySelector<HTMLElement>(selector)!.getBoundingClientRect(); return { width: innerWidth, scroll: document.documentElement.scrollWidth, scene: box('.week-three-yunzhan-scene'), workspace: box('[aria-label="云栈洞对话 Blockly 工作区"]') }; });
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
    expect(geometry.scene.width).toBeGreaterThan(200);
    expect(geometry.workspace.width).toBeGreaterThan(200);
    await attach(page, testInfo, 'yunzhan-default-blockly');
    await run(page);
    await expect(page.getByText('猪刚鬣放下钉耙，说明受观音点化的来历。', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '火眼金睛：观察本次判断', exact: true })).toBeVisible();
    await attach(page, testInfo, 'yunzhan-failure');
    await press(page, '火眼金睛：观察本次判断');
    const observation = page.locator('.week-three-yunzhan-experience > aside[role="status"]');
    await expect(observation).toContainText('当前话语是否明确说明唐三藏正在西行取经');
    await expect(observation).toContainText('假');
    await expect(observation).not.toContainText('交换');
    await swap(page);
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await attach(page, testInfo, 'yunzhan-success');
    const completed = await storedProgress(page);
    expect(completed.sessions['w3-m3'].lastRun.completed).toBe(true);
    expect(completed.missionCompletionEvidence['w3-m3'].kind).toBe('formal-v3');
    await press(page, '回成长地图');
    await expect(page.getByRole('button', { name: '八戒归队', exact: true })).toBeEnabled();
    await page.goto('./#/mission/w3-m3');
    const beforeReplay = (await storedProgress(page)).sessions['w3-m3'].totalRuns;
    await press(page, '重播上次运行');
    await expect.poll(async () => (await storedProgress(page)).sessions['w3-m3'].totalRuns).toBe(beforeReplay);
  });

  test('@w3-m3-keyboard Enter and Space swap the same visible workspace and run the repaired graph', async ({ page }) => {
    await gotoYunzhan(page);
    await swap(page, 'Enter', true, 'else');
    await swap(page, 'Space', true, 'then');
    await swap(page, 'Space', true, 'else');
    await run(page, true);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  });

  for (const mode of ['draft', 'run', 'observation', 'completion'] as const) test(`@w3-m3-storage ${mode} save fault fails closed until the child uses visible retry`, async ({ page }) => {
    await gotoYunzhan(page);
    const before = await storedProgress(page);
    if (mode === 'draft') {
      await page.evaluate((key) => localStorage.setItem(key, 'fail-yunzhan-draft'), MODE_KEY);
      await swap(page, null, false);
      expect((await storedProgress(page)).sessions['w3-m3']?.workspace ?? null).toEqual(before.sessions['w3-m3']?.workspace ?? null);
    } else if (mode === 'run') {
      await swap(page);
      await page.evaluate((key) => localStorage.setItem(key, 'fail-yunzhan-run'), MODE_KEY);
      await run(page);
    } else if (mode === 'observation') {
      await run(page);
      await page.evaluate((key) => localStorage.setItem(key, 'fail-yunzhan-observation'), MODE_KEY);
      await press(page, '火眼金睛：观察本次判断');
    } else {
      await swap(page);
      await page.evaluate((key) => localStorage.setItem(key, 'fail-yunzhan-completion'), MODE_KEY);
      await run(page);
    }
    const recovery = page.locator('.week-three-yunzhan-experience > [role="alert"]').filter({ hasText: /待重试|通关待保存/ });
    await expect(recovery).toBeVisible();
    await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY);
    if (mode === 'completion') {
      await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
      const unsaved = await storedProgress(page);
      expect(unsaved.missions['w3-m3']).toBeUndefined();
      expect(unsaved.missionCompletionEvidence['w3-m3']).toBeUndefined();
      await page.getByRole('button', { name: '重试保存通关', exact: true }).click();
      await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
      const saved = await storedProgress(page);
      expect(saved.missionCompletionEvidence['w3-m3']?.kind).toBe('formal-v3');
    } else await recovery.getByRole('button', { name: '重试保存', exact: true }).click();
  });

  test('@w3-m3-storage motion parity changes presentation but not saved facts or trace', async ({ page }) => {
    await gotoYunzhan(page);
    const scene = page.getByRole('img', { name: '云栈洞执行场景' });
    await expect(scene).toHaveAttribute('data-motion-mode', 'standard');
    await expect(scene).toHaveAttribute('data-muted', 'false');
    await run(page);
    await expect.poll(async () => Boolean((await storedProgress(page)).sessions['w3-m3']?.lastRun)).toBe(true);
    const standard = await page.evaluate((key) => { const session = JSON.parse(localStorage.getItem(key)!).sessions['w3-m3']; return { lastTrace: session.lastTrace, roundResults: session.roundResults, finalState: session.lastRun.finalState, penalty: session.lastRun.penalty }; }, CURRENT_KEY);
    await press(page, '减弱动画');
    await press(page, '关闭声音');
    await expect(scene).toHaveAttribute('data-motion-mode', 'reduced');
    await expect(scene).toHaveAttribute('data-muted', 'true');
    await run(page);
    await expect.poll(async () => (await storedProgress(page)).sessions['w3-m3']?.totalRuns).toBe(2);
    const reduced = await page.evaluate((key) => { const session = JSON.parse(localStorage.getItem(key)!).sessions['w3-m3']; return { lastTrace: session.lastTrace, roundResults: session.roundResults, finalState: session.lastRun.finalState, penalty: session.lastRun.penalty }; }, CURRENT_KEY);
    expect(reduced).toEqual(standard);
  });

  test('@w3-m3-external stale tab cannot overwrite the corrected visible graph', async ({ page, context }) => {
    await gotoYunzhan(page);
    const stale = await context.newPage();
    attachHealth(stale);
    try {
      await stale.goto('./#/mission/w3-m3');
      await swap(page);
      await expect(stale.getByText(/其他标签页已有新的学习进度/)).toBeVisible();
      await expect(stale.getByRole('button', { name: '交换两个分支里的动作', exact: true })).toBeDisabled();
    } finally {
      try { expect(healthEvents.get(stale), 'unexpected W3-M3 stale-page browser health events').toEqual([]); } finally { await stale.close(); }
    }
  });

  test('@w3-m3-corrupt corrupt current preserves raw bytes and restores the exact legal snapshot', async ({ page }) => {
    await gotoYunzhan(page);
    await complete(page);
    const before = await storedProgress(page);
    await page.evaluate((key) => localStorage.setItem(key, 'corrupt-yunzhan-current'), MODE_KEY);
    await page.reload();
    await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
    await press(page, '成长地图');
    await expect(page).toHaveURL(/#\/$/);
    await press(page, '家长周报');
    await page.getByLabel('设置 4 位家长 PIN').fill('4826');
    await page.getByLabel('确认家长 PIN').fill('4826');
    await press(page, '创建家长 PIN');
    await page.getByLabel('我已安全保存恢复码').check();
    await press(page, '确认已保存并进入');
    const damaged = page.waitForEvent('download');
    await press(page, '下载损坏原文');
    const damagedPath = await (await damaged).path();
    expect(damagedPath).not.toBeNull();
    expect(JSON.parse(readFileSync(damagedPath!, 'utf8')).current).toBe('{broken w3-m3 current');
    const recovered = await storedProgress(page);
    expect(recovered.sessions['w3-m3']).toEqual(before.sessions['w3-m3']);
    expect(recovered.missionCompletionEvidence['w3-m3']).toEqual(before.missionCompletionEvidence['w3-m3']);
  });

  test('@w3-m3-parent parent export-import restores formal proof and leaves W3-M4 unlocked', async ({ page }) => {
    await gotoYunzhan(page);
    await complete(page);
    await press(page, '回成长地图');
    await expect(page).toHaveURL(/#\/$/);
    await press(page, '家长周报');
    await page.getByLabel('设置 4 位家长 PIN').fill('4826');
    await page.getByLabel('确认家长 PIN').fill('4826');
    await press(page, '创建家长 PIN');
    await page.getByLabel('我已安全保存恢复码').check();
    await press(page, '确认已保存并进入');
    await expect(page.getByRole('region', { name: '火眼金睛学习能力' })).toContainText('云栈洞交锋正式 Blockly 证明已保存');
    const download = page.waitForEvent('download');
    await press(page, '导出进度');
    const path = await (await download).path();
    expect(path).not.toBeNull();
    const exported = JSON.parse(readFileSync(path!, 'utf8'));
    await press(page, '成长地图');
    await expect(page).toHaveURL(/#\/$/);
    await press(page, '云栈洞交锋');
    await swap(page);
    await expect.poll(async () => (await storedProgress(page)).sessions['w3-m3']).not.toEqual(exported.sessions['w3-m3']);
    await press(page, '家长周报');
    await page.getByLabel('家长 PIN').fill('4826');
    await press(page, '进入周报');
    await page.getByLabel('选择进度文件').setInputFiles({ name: 'w3-m3-progress.json', mimeType: 'application/json', buffer: readFileSync(path!) });
    await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible();
    const restored = await storedProgress(page);
    expect(restored.sessions['w3-m3']).toEqual(exported.sessions['w3-m3']);
    expect(restored.missions['w3-m3']).toEqual(exported.missions['w3-m3']);
    expect(restored.missionCompletionEvidence['w3-m3']).toEqual(exported.missionCompletionEvidence['w3-m3']);
    await press(page, '成长地图');
    await expect(page.getByRole('button', { name: '八戒归队', exact: true })).toBeEnabled();
  });

  test('@w3-m3-cold loads within its budget and missing art is a real 404', async ({ page, request }) => {
    const bodies: Array<Promise<number>> = [];
    page.on('response', (response) => { if (response.status() >= 200 && response.status() < 300) bodies.push(response.body().then((body) => body.length)); });
    await gotoYunzhan(page);
    expect((await Promise.all(bodies)).reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(WEEK_THREE_YUNZHAN_DIALOGUE_COLD_LOAD_MAX_BYTES);
    expect((await request.get('/xiyou-programming-journey/assets/week-three-yunzhan-dialogue/not-found.webp', { headers: { accept: 'image/webp' } })).status()).toBe(404);
  });

  test('@w3-m3-asset-fault a rejected scene asset blocks completion until the child retries it', async ({ page }) => {
    let failed = false;
    await page.route(/yunzhan-dialogue-background\.webp(?:\?.*)?$/, async (route) => {
      if (!failed) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic asset failure' }); }
      else if (new URL(route.request().url()).searchParams.has('retry')) await route.continue(); else await route.abort();
    });
    await page.goto('./#/mission/w3-m3');
    await expect.poll(() => failed).toBe(true);
    await expect(page.getByRole('alert').filter({ hasText: '场景图片没有加载成功' })).toBeVisible();
    await swap(page);
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await press(page, '重试加载场景图片');
    await expect(page.getByRole('img', { name: '云栈洞执行场景', includeHidden: true })).toHaveAttribute('data-scene-ready', 'true');
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    expectedFailureUrl = null;
  });

  for (const boundary of [
    { name: 'Experience', pattern: /WeekThreeYunzhanDialogueExperience-[^/]+\.js(?:\?.*)?$/, failure: '云栈洞对话任务加载失败' },
    { name: 'Scene', pattern: /WeekThreeYunzhanDialogueScene-[^/]+\.js(?:\?.*)?$/, failure: '云栈洞场景加载失败' },
    { name: 'Workspace', pattern: /WeekThreeYunzhanDialogueBlocklyWorkspace-[^/]+\.js(?:\?.*)?$/, failure: '云栈洞积木加载失败' },
  ]) test(`@w3-m3-lazy ${boundary.name} lazy failure has visible recovery`, async ({ page }) => {
    let failed = false;
    await page.route(boundary.pattern, async (route) => { if (!failed) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic chunk failure' }); } else await route.continue(); });
    await page.goto('./#/mission/w3-m3');
    await expect.poll(() => failed).toBe(true);
    const alert = page.getByRole('alert').filter({ hasText: boundary.failure });
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: '重新加载页面' }).click();
    await expect(page.getByText('让分支跟着西行使命走')).toBeVisible();
    expectedFailureUrl = null;
  });
});
