import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { completeMission, createInitialProgress, serializeProgress } from '../src/progress/progress';
import { createMissionSession, recordRun, updateWorkspaceDraft } from '../src/progress/session';
import { compileManorHelpDraft, createDefaultManorHelpDraft, runManorHelp } from '../src/blockly/weekThreeManorHelpContract';
import { WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs';
// 火眼金睛·条件观察 remains a child-triggered, saved audit action.

const CURRENT_KEY = 'xiyou-programming-progress-v3'; const REVISION_KEY = 'xiyou-programming-progress-revision-v3'; const MODE_KEY = 'xiyou-test-storage-mode';
type HealthEvent = { kind: string; url: string; detail: string };
const healthEvents = new WeakMap<Page, HealthEvent[]>(); let expectedFailureUrl: string | null = null;
function prerequisite(testInfo: TestInfo) { let progress = createInitialProgress(); const standard = /motion parity/i.test(testInfo.title); progress = { ...progress, settings: { ...progress.settings, muted: !standard, reducedMotion: !standard, reducedMotionOverride: !standard }, privacy: { localDataNoticeSeen: true } }; for (const id of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4', 'w2-m5']) progress = completeMission(progress, id, { stars: 3, hintsUsed: 0 }); const draft = createDefaultManorHelpDraft(); draft.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help'; const trace = compileManorHelpDraft(draft); const session = recordRun(updateWorkspaceDraft(createMissionSession('w3-m1'), draft, '2026-08-27T00:00:00.000Z'), runManorHelp(trace), trace, '2026-08-27T00:00:01.000Z'); progress = { ...progress, sessions: { ...progress.sessions, 'w3-m1': session }, savedAt: '2026-08-27T00:00:01.000Z' }; return serializeProgress(completeMission(progress, 'w3-m1', { stars: 3, hintsUsed: 0 })); }
function expectedFailure(value: string) { return expectedFailureUrl !== null && (value === expectedFailureUrl || value.includes(expectedFailureUrl)); }
function attachHealth(page: Page) { const events: HealthEvent[] = []; healthEvents.set(page, events); page.on('console', (message) => { if (message.type() === 'error' && !expectedFailure(message.location().url) && !expectedFailure(message.text())) events.push({ kind: 'console', url: message.location().url || page.url(), detail: message.text() }); }); page.on('pageerror', (error) => events.push({ kind: 'page', url: page.url(), detail: error.message })); page.on('requestfailed', (request) => { const detail = request.failure()?.errorText ?? ''; if (expectedFailure(request.url()) || (request.url() === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(detail))) return; events.push({ kind: 'request', url: request.url(), detail }); }); page.on('response', (response) => { if (response.status() >= 400 && !expectedFailure(response.url())) events.push({ kind: 'response', url: response.url(), detail: `HTTP ${response.status()}` }); }); }
async function gotoCuilan(page: Page) { await page.goto('./#/mission/w3-m2'); await expect(page.getByText('同一时刻，外形和身份可以一真一假')).toBeVisible(); await expect(page.getByRole('img', { name: '变化高翠兰执行场景' })).toHaveAttribute('data-scene-ready', 'true'); await expect(page.locator('.advanced-blockly-host svg.blocklySvg')).toBeVisible(); }
async function press(page: Page, name: string, keyboard = false) { const button = page.getByRole('button', { name, exact: true }); await expect(button).toBeEnabled(); if (keyboard) { await button.focus(); await button.press('Enter'); } else await button.click(); }
const cuilanWorkspace = (page: Page) => page.getByRole('region', { name: '变化高翠兰 Blockly 工作区', exact: true });
async function storedCuilanWorkspace(page: Page) { return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY); }
async function correct(page: Page, keyboard = false, waitForPersistence = true) {
  await press(page, '第二道条件换成：真实身份是高翠兰', keyboard);
  await expect(cuilanWorkspace(page).locator('.blocklyDraggable[data-id="cuilan-identity-condition"]')).toBeVisible();
  if (waitForPersistence) await expect.poll(async () => (await storedCuilanWorkspace(page)).sessions['w3-m2']?.workspace.blocks.some((block: { type: string }) => block.type === 'w3_cuilan_condition_identity_is_cuilan') ?? false).toBe(true);
}
async function run(page: Page, keyboard = false) { await press(page, '执行双闸门指令', keyboard); }
async function complete(page: Page, keyboard = false) { await correct(page, keyboard); await run(page, keyboard); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible(); }
async function attach(page: Page, testInfo: TestInfo, name: string) { const path = testInfo.outputPath(`${name}-${testInfo.project.name}.png`); await page.screenshot({ path, fullPage: true }); await testInfo.attach(`${name}-${testInfo.project.name}.png`, { path, contentType: 'image/png' }); }

test.describe('W3-M2 变化高翠兰双闸门', () => {
  test.beforeEach(async ({ page }, testInfo) => { expectedFailureUrl = null; attachHealth(page); await page.addInitScript(({ raw, current, revision }) => { if (localStorage.getItem(current) === null) { localStorage.setItem(current, raw); localStorage.setItem(revision, '0'); } }, { raw: prerequisite(testInfo), current: CURRENT_KEY, revision: REVISION_KEY }); });
  test.afterEach(async ({ page }) => { expect(healthEvents.get(page), 'unexpected W3-M2 browser health events').toEqual([]); });

  test('@w3-m2-full @w3-m2-narrow child runs the wrong default graph, observes stable evidence, repairs the real condition, saves formal proof, and replays', async ({ page }, testInfo) => { await gotoCuilan(page); const pixels = await page.locator('.advanced-blockly-host').screenshot(); expect(new Set(pixels).size).toBeGreaterThan(20); const geometry = await page.evaluate(() => { const box = (s: string) => document.querySelector<HTMLElement>(s)!.getBoundingClientRect(); return { width: innerWidth, scroll: document.documentElement.scrollWidth, scene: box('.week-three-cuilan-scene'), workspace: box('[aria-label="变化高翠兰 Blockly 工作区"]') }; }); expect(geometry.scroll).toBeLessThanOrEqual(geometry.width); expect(geometry.scene.width).toBeGreaterThan(200); expect(geometry.workspace.width).toBeGreaterThan(200); await attach(page, testInfo, 'cuilan-blockly'); await run(page); await expect(page.getByText('第二道检查进入了继续装作高翠兰分支，先观察这次判断的证据。')).toBeVisible(); await attach(page, testInfo, 'cuilan-failure'); await press(page, '使用火眼金睛观察这次判断'); await expect(page.locator('.week-three-cuilan-experience > aside[role="status"]')).toContainText('外形和高翠兰相同'); await correct(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible(); await attach(page, testInfo, 'cuilan-success'); const completed = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY); expect(completed.missionCompletionEvidence['w3-m2'].kind).toBe('formal-v3'); expect(completed.sessions['w3-m2'].lastRun.completed).toBe(true); await page.reload(); await press(page, '重播上次运行'); expect((await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w3-m2'].totalRuns, CURRENT_KEY))).toBe(2); });
  test('@w3-m2-keyboard keyboard repairs the actual condition and completes', async ({ page }) => { await gotoCuilan(page); await correct(page, true); await run(page, true); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible(); });
  for (const mode of ['draft', 'run', 'observation', 'completion'] as const) test(`@w3-m2-storage ${mode} save fault is fail-closed until visible retry`, async ({ page }) => { await gotoCuilan(page); const before = await storedCuilanWorkspace(page); if (mode === 'draft') { await page.evaluate((key) => localStorage.setItem(key, 'fail-cuilan-draft'), MODE_KEY); await correct(page, false, false); expect((await storedCuilanWorkspace(page)).sessions['w3-m2']?.workspace ?? null).toEqual(before.sessions['w3-m2']?.workspace ?? null); } else if (mode === 'run') { await correct(page); await page.evaluate((key) => localStorage.setItem(key, 'fail-cuilan-run'), MODE_KEY); await run(page); } else if (mode === 'observation') { await run(page); await page.evaluate((key) => localStorage.setItem(key, 'fail-cuilan-observation'), MODE_KEY); await press(page, '使用火眼金睛观察这次判断'); } else { await correct(page); await page.evaluate((key) => localStorage.setItem(key, 'fail-cuilan-completion'), MODE_KEY); await run(page); } const recovery = page.locator('.week-three-cuilan-experience > [role="alert"]').filter({ hasText: /待重试|通关待保存/ }); await expect(recovery).toBeVisible(); await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY); if (mode === 'completion') { await page.getByRole('button', { name: '重试保存通关', exact: true }).click(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible(); } else await recovery.getByRole('button', { name: '重试保存', exact: true }).click(); });
  test('@w3-m2-storage motion parity keeps facts and trace unchanged', async ({ page }) => {
    await gotoCuilan(page); const scene = page.getByRole('img', { name: '变化高翠兰执行场景' });
    await expect(scene).toHaveAttribute('data-motion-mode', 'standard'); await expect(scene).toHaveAttribute('data-muted', 'false');
    await run(page);
    await expect.poll(async () => Boolean((await storedCuilanWorkspace(page)).sessions['w3-m2']?.lastRun)).toBe(true);
    const standard = await page.evaluate((key) => { const session = JSON.parse(localStorage.getItem(key)!).sessions['w3-m2']; return { lastTrace: session.lastTrace, checkpointResults: session.checkpointResults, finalState: session.lastRun.finalState, penalty: session.lastRun.penalty }; }, CURRENT_KEY);
    await press(page, '减弱动画'); await press(page, '关闭声音');
    await expect(scene).toHaveAttribute('data-motion-mode', 'reduced'); await expect(scene).toHaveAttribute('data-muted', 'true');
    await run(page);
    await expect.poll(async () => (await storedCuilanWorkspace(page)).sessions['w3-m2']?.totalRuns).toBe(2);
    const reduced = await page.evaluate((key) => { const session = JSON.parse(localStorage.getItem(key)!).sessions['w3-m2']; return { lastTrace: session.lastTrace, checkpointResults: session.checkpointResults, finalState: session.lastRun.finalState, penalty: session.lastRun.penalty }; }, CURRENT_KEY);
    expect(reduced).toEqual(standard);
  });
  test('@w3-m2-external stale tab cannot overwrite the corrected visible graph', async ({ page, context }) => { await gotoCuilan(page); const stale = await context.newPage(); attachHealth(stale); try { await stale.goto('./#/mission/w3-m2'); await correct(page); await expect(stale.getByText(/其他标签页已有新的学习进度/)).toBeVisible(); await expect(stale.getByRole('button', { name: '第二道条件恢复：外形和高翠兰相同' })).toBeDisabled(); } finally { try { expect(healthEvents.get(stale), 'unexpected W3-M2 stale-page browser health events').toEqual([]); } finally { await stale.close(); } } });
  test('@w3-m2-corrupt corrupt current preserves bytes, downloads the damaged source, and restores the exact legal snapshot', async ({ page }) => {
    await gotoCuilan(page); await complete(page);
    const before = await storedCuilanWorkspace(page);
    await page.evaluate((key) => localStorage.setItem(key, 'corrupt-cuilan-current'), MODE_KEY);
    await page.reload(); await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
    await press(page, '成长地图'); await press(page, '家长周报');
    await page.getByLabel('设置 4 位家长 PIN').fill('4826'); await page.getByLabel('确认家长 PIN').fill('4826'); await press(page, '创建家长 PIN');
    await page.getByLabel('我已安全保存恢复码').check(); await press(page, '确认已保存并进入');
    const damaged = page.waitForEvent('download'); await press(page, '下载损坏原文'); const damagedPath = await (await damaged).path(); expect(damagedPath).not.toBeNull();
    expect(JSON.parse(readFileSync(damagedPath!, 'utf8')).current).toBe('{broken w3-m2 current');
    const recovered = await storedCuilanWorkspace(page);
    expect(recovered.sessions['w3-m2']).toEqual(before.sessions['w3-m2']);
    expect(recovered.missionCompletionEvidence['w3-m2']).toEqual(before.missionCompletionEvidence['w3-m2']);
  });
  test('@w3-m2-parent parent export-import restores the formal proof and leaves the next mission unlocked', async ({ page }) => {
    await gotoCuilan(page); await complete(page); await press(page, '回成长地图'); await press(page, '家长周报');
    await page.getByLabel('设置 4 位家长 PIN').fill('4826'); await page.getByLabel('确认家长 PIN').fill('4826'); await press(page, '创建家长 PIN');
    await page.getByLabel('我已安全保存恢复码').check(); await press(page, '确认已保存并进入');
    await expect(page.getByRole('region', { name: '火眼金睛学习能力' })).toContainText('变化高翠兰正式 Blockly 证明已保存');
    const download = page.waitForEvent('download'); await press(page, '导出进度'); const path = await (await download).path(); expect(path).not.toBeNull();
    const exported = JSON.parse(readFileSync(path!, 'utf8'));
    await press(page, '成长地图'); await press(page, '变化高翠兰'); await press(page, '第二道条件恢复：外形和高翠兰相同');
    await expect(cuilanWorkspace(page).locator('.blocklyDraggable[data-id="cuilan-identity-condition"]')).toContainText('外形和高翠兰相同');
    await expect.poll(async () => (await storedCuilanWorkspace(page)).sessions['w3-m2']).not.toEqual(exported.sessions['w3-m2']);
    await press(page, '家长周报'); await page.getByLabel('家长 PIN').fill('4826'); await press(page, '进入周报');
    await page.getByLabel('选择进度文件').setInputFiles({ name: 'w3-m2-progress.json', mimeType: 'application/json', buffer: readFileSync(path!) });
    await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible();
    const restored = await storedCuilanWorkspace(page);
    expect(restored.sessions['w3-m2']).toEqual(exported.sessions['w3-m2']);
    expect(restored.missions['w3-m2']).toEqual(exported.missions['w3-m2']);
    expect(restored.missionCompletionEvidence['w3-m2']).toEqual(exported.missionCompletionEvidence['w3-m2']);
    await press(page, '成长地图'); await expect(page.getByRole('button', { name: '云栈洞交锋', exact: true })).toBeEnabled();
  });
  test('@w3-m2-cold loads within its fixed budget and absent art is 404', async ({ page, request }) => { const bodies: Array<Promise<number>> = []; page.on('response', (response) => { if (response.status() >= 200 && response.status() < 300) bodies.push(response.body().then((body) => body.length)); }); await gotoCuilan(page); expect((await Promise.all(bodies)).reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES); expect((await request.get('/xiyou-programming-journey/assets/week-three-cuilan/not-found.webp', { headers: { accept: 'image/webp' } })).status()).toBe(404); });
  test('@w3-m2-asset-fault a rejected background blocks completion until the child retries it', async ({ page }) => { let failed = false; await page.route(/cuilan-disguise-background\.webp(?:\?.*)?$/, async (route) => { if (!failed) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic asset failure' }); } else if (new URL(route.request().url()).searchParams.has('retry')) await route.continue(); else await route.abort(); }); await page.goto('./#/mission/w3-m2'); await expect.poll(() => failed).toBe(true); await expect(page.getByRole('alert').filter({ hasText: '场景图片没有加载成功' })).toBeVisible(); await correct(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0); await press(page, '重试加载场景图片'); await expect(page.getByRole('img', { name: '变化高翠兰执行场景', includeHidden: true })).toHaveAttribute('data-scene-ready', 'true'); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible(); expectedFailureUrl = null; });
  for (const boundary of [{ name: 'Experience', pattern: /WeekThreeCuilanBooleanExperience-[^/]+\.js(?:\?.*)?$/, failure: '变化高翠兰任务加载失败' }, { name: 'Scene', pattern: /WeekThreeCuilanBooleanScene-[^/]+\.js(?:\?.*)?$/, failure: '变化高翠兰场景加载失败' }, { name: 'Workspace', pattern: /WeekThreeCuilanBooleanBlocklyWorkspace-[^/]+\.js(?:\?.*)?$/, failure: '变化高翠兰积木加载失败' }]) test(`@w3-m2-lazy ${boundary.name} lazy failure has a visible recovery`, async ({ page }) => { let failed = false; await page.route(boundary.pattern, async (route) => { if (!failed) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic chunk failure' }); } else await route.continue(); }); await page.goto('./#/mission/w3-m2'); await expect.poll(() => failed).toBe(true); const alert = page.getByRole('alert').filter({ hasText: boundary.failure }); await expect(alert).toBeVisible(); await alert.getByRole('button', { name: '重新加载页面' }).click(); await expect(page.getByText('同一时刻，外形和身份可以一真一假')).toBeVisible(); expectedFailureUrl = null; });
});
