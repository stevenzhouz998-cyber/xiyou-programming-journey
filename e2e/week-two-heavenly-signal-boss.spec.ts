import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { completeMission, createInitialProgress, isMissionUnlocked, serializeProgress } from '../src/progress/progress';
import { WEEK_TWO_HEAVENLY_BOSS_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs';

const CURRENT_KEY = 'xiyou-programming-progress-v3'; const REVISION_KEY = 'xiyou-programming-progress-revision-v3'; const MODE_KEY = 'xiyou-test-storage-mode';
type HealthEvent = { kind: 'console' | 'page' | 'request' | 'response'; url: string; detail: string };
let healthEvents: HealthEvent[] = [];
let expectedFailureUrl: string | null = null;
function prerequisite() { let progress = createInitialProgress(); progress = { ...progress, settings: { ...progress.settings, muted: true, reducedMotion: true, reducedMotionOverride: true }, privacy: { localDataNoticeSeen: true } }; for (const missionId of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4']) progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 }); return serializeProgress(progress); }
function expectedFailure(detail: string, url = '') { return expectedFailureUrl !== null && (url === expectedFailureUrl || detail.includes(expectedFailureUrl) || /Failed to fetch dynamically imported module|dynamically imported module|503 \(Service Unavailable\)/i.test(detail)); }
function attachHealth(page: Page) { page.on('console', (message) => { if (message.type() === 'error' && !expectedFailure(message.text(), message.location().url)) healthEvents.push({ kind: 'console', url: message.location().url || page.url(), detail: message.text() }); }); page.on('pageerror', (error) => { if (!expectedFailure(error.message)) healthEvents.push({ kind: 'page', url: page.url(), detail: error.message }); }); page.on('requestfailed', (request) => { const detail = request.failure()?.errorText ?? ''; if (expectedFailure(detail, request.url()) || (request.url() === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(detail))) return; healthEvents.push({ kind: 'request', url: request.url(), detail }); }); page.on('response', (response) => { if (response.status() >= 400 && !expectedFailure(`HTTP ${response.status()}`, response.url())) healthEvents.push({ kind: 'response', url: response.url(), detail: `HTTP ${response.status()}` }); }); }
async function repair(page: Page, name: string) { const button = page.getByRole('button', { name }); await expect(button).toBeEnabled(); await button.click(); await expect(button).toBeEnabled(); }
async function keyboardRepair(page: Page, name: string) { const button = page.getByRole('button', { name }); await expect(button).toBeEnabled(); await button.focus(); await page.keyboard.press('Enter'); await expect(button).toBeEnabled(); }
async function correctAll(page: Page) { for (const name of ['增加天马循环次数', '交换齐天事件动作', '把金丹放到误入兜率宫之后', '换成：听见炉头声响并看见光明']) await repair(page, name); }
async function run(page: Page, keyboard = false) { const button = page.getByRole('button', { name: '执行天宫总试炼' }); await expect(button).toBeEnabled(); if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click(); }
test.describe('W2-M5 heavenly signal Boss', () => {
  test.beforeEach(async ({ page }) => { healthEvents = []; expectedFailureUrl = null; attachHealth(page); await page.addInitScript(({ currentKey, revisionKey, raw }) => { if (localStorage.getItem(currentKey) === null) { localStorage.setItem(currentKey, raw); localStorage.setItem(revisionKey, '0'); } }, { currentKey: CURRENT_KEY, revisionKey: REVISION_KEY, raw: prerequisite() }); });
  test.afterEach(() => expect(healthEvents).toEqual([]));
  test('@boss-full @boss-narrow @full @narrow child visibly repairs four Blockly bugs before the canon-epilogue', async ({ page }) => {
    await page.goto('./#/mission/w2-m5'); await expect(page.getByRole('heading', { name: '天宫总试炼', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '执行天宫总试炼' }).click(); await expect(page.getByRole('alert')).toContainText('还有一匹天马没有照料');
    await repair(page, '增加天马循环次数'); await page.getByRole('button', { name: '执行天宫总试炼' }).click(); await expect(page.getByRole('alert')).toContainText('不属于它的天宫信号');
    await repair(page, '交换齐天事件动作'); await page.getByRole('button', { name: '执行天宫总试炼' }).click(); await expect(page.getByRole('alert')).toContainText('金丹积木跑得太早');
    await repair(page, '把金丹放到误入兜率宫之后'); await page.getByRole('button', { name: '执行天宫总试炼' }).click(); await expect(page.getByRole('alert')).toContainText('眼睛变红只说明烟很大');
    await repair(page, '换成：听见炉头声响并看见光明'); await page.getByRole('button', { name: '执行天宫总试炼' }).click(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY); expect(saved.sessions['w2-m5'].lastRun).toMatchObject({ completed: true, caredHorses: 3, furnaceRounds: 7, elapsedDays: 49 }); expect(saved.sessions['w2-m5'].lastRun.events.at(-1)).toMatchObject({ type: 'canon-epilogue', sourceBlockId: null }); expect(saved.missions['w2-m5']).toMatchObject({ status: 'completed' }); expect(saved.missions['w3-m1']).toBeUndefined();
    await page.reload();
    const restored = await page.evaluate((key) => {
      const session = JSON.parse(localStorage.getItem(key)!).sessions['w2-m5'];
      const block = (id: string) => session.workspace.blocks.find((item: { id: string }) => item.id === id);
      const condition = block(block('furnace-loop').conditionBlockId);
      return { repeatCount: block('stable-repeat').repeatCount, acceptTitleHandler: block('accept-title').handlerBlockId, raiseFlagHandler: block('raise-flag').handlerBlockId, eatElixirPrevious: block('eat-elixir').previousId, eatElixirNext: block('eat-elixir').nextId, stumbleNext: block('stumble-tusita').nextId, conditionType: condition.type, totalRuns: session.totalRuns, hasLastRun: session.lastRun !== null, traceLength: session.lastTrace.length, lastRunAt: session.lastRunAt };
    }, CURRENT_KEY);
    expect(restored).toEqual({ repeatCount: 3, acceptTitleHandler: 'title-handler', raiseFlagHandler: 'return-handler', eatElixirPrevious: 'stumble-tusita', eatElixirNext: null, stumbleNext: 'eat-elixir', conditionType: 'xiyou_boss_condition_furnace_open', totalRuns: 5, hasLastRun: true, traceLength: expect.any(Number), lastRunAt: expect.any(String) });
    expect(restored.traceLength).toBeGreaterThan(0);
    await expect(page.getByRole('button', { name: '重播最近一次' })).toBeEnabled();
    await page.getByRole('button', { name: '重播最近一次' }).click(); expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).missions['w2-m5'].attempts, CURRENT_KEY)).toBe(1);
  });
  test('@boss-keyboard @keyboard Chromium and Firefox keyboard helpers repair the same visible Blockly graph and persist the canonical trace', async ({ page }) => {
    await page.goto('./#/mission/w2-m5');
    for (const name of ['增加天马循环次数', '交换齐天事件动作', '把金丹放到误入兜率宫之后', '换成：听见炉头声响并看见光明']) await keyboardRepair(page, name);
    await expect(page.getByRole('list', { name: '天宫总试炼真实积木连接' })).toContainText('听见炉头声响并看见光明');
    await run(page, true);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    expect(await page.evaluate((key) => {
      const session = JSON.parse(localStorage.getItem(key)!).sessions['w2-m5'];
      return { completed: session.lastRun.completed, caredHorses: session.lastRun.caredHorses, furnaceRounds: session.lastRun.furnaceRounds, elapsedDays: session.lastRun.elapsedDays, finalActionOpcode: [...session.lastTrace].reverse().find((item: { opcode: string | null }) => item.opcode !== null)?.opcode, epilogue: session.lastRun.events.at(-1) };
    }, CURRENT_KEY)).toMatchObject({ completed: true, caredHorses: 3, furnaceRounds: 7, elapsedDays: 49, finalActionOpcode: 'topple_furnace', epilogue: { type: 'canon-epilogue', sourceBlockId: null } });
  });
  test('@boss-storage @storage draft-save failure keeps the Boss locked until visible retry persists the same Blockly repair', async ({ page }) => {
    await page.goto('./#/mission/w2-m5');
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-boss-draft'), MODE_KEY);
    await page.getByRole('button', { name: '增加天马循环次数' }).click();
    await expect(page.getByRole('alert').filter({ hasText: '本次学习记录尚未保存' })).toBeVisible();
    await expect(page.getByRole('button', { name: '执行天宫总试炼' })).toBeDisabled();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY);
    await page.getByRole('button', { name: '重试保存本次记录' }).click();
    await expect(page.getByRole('button', { name: '执行天宫总试炼' })).toBeEnabled();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m5'].workspace.blocks.find((block: { id: string }) => block.id === 'stable-repeat').repeatCount, CURRENT_KEY)).toBe(3);
  });
  test('@boss-storage @storage run-save failure never plays the result before visible retry persists it', async ({ page }) => {
    await page.goto('./#/mission/w2-m5');
    await correctAll(page);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-boss-session'), MODE_KEY);
    await run(page);
    await expect(page.getByRole('alert').filter({ hasText: '本次学习记录尚未保存' })).toBeVisible();
    await expect(page.locator('.heavenly-signal-boss-scene')).toContainText('五道天宫信号正在等待你的积木安排');
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY);
    await page.getByRole('button', { name: '重试保存本次记录' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  });
  test('@boss-storage @storage completion-save failure never unlocks before visible retry persists completion', async ({ page }) => {
    await page.goto('./#/mission/w2-m5');
    await correctAll(page);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-boss-completion'), MODE_KEY);
    await run(page);
    await expect(page.getByRole('alert').filter({ hasText: '通关待保存' })).toBeVisible();
    await expect(page.getByRole('button', { name: '重试保存通关' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).missions['w2-m5'] ?? null, CURRENT_KEY)).toBeNull();
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY);
    await page.getByRole('button', { name: '重试保存通关' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  });
  test('@boss-cold @cold route stays inside the fixed cold budget and task assets fail closed at 404', async ({ page, request }) => { const bodies: Array<Promise<number>> = []; page.on('response', (response) => { if (response.status() >= 200 && response.status() < 300) bodies.push(response.body().then((body) => body.length)); }); await page.goto('./#/mission/w2-m5'); await expect(page.getByRole('img', { name: '天宫总试炼代码执行场景' })).toHaveAttribute('data-scene-ready', 'true'); expect((await Promise.all(bodies)).reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(WEEK_TWO_HEAVENLY_BOSS_COLD_LOAD_MAX_BYTES); expect((await request.get('/xiyou-programming-journey/assets/week-two-heavenly-boss/not-found.webp', { headers: { accept: 'image/webp' } })).status()).toBe(404); });

  test('@boss-corrupt preserves malformed current bytes and restores the exact saved Boss session from snapshot', async ({ page }) => {
    await page.goto('./#/mission/w2-m5'); await correctAll(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m5'], CURRENT_KEY);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'corrupt-boss-current'), MODE_KEY);
    await page.reload();
    await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('xiyou-programming-progress-corrupt-v3')!).current)).toBe('{broken w2-m5 current');
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m5'], CURRENT_KEY)).toEqual(before);
  });

  test('@boss-external stale CAS draft cannot overwrite another tab and offers backup plus external reload', async ({ page, context }) => {
    await page.goto('./#/mission/w2-m5');
    const stale = await context.newPage(); attachHealth(stale); await stale.goto('./#/mission/w2-m5');
    await repair(page, '增加天马循环次数');
    await expect(stale.getByText(/其他标签页已更新/).first()).toBeVisible();
    await stale.getByRole('button', { name: '交换齐天事件动作' }).click();
    const recovery = stale.locator('.heavenly-signal-boss-experience [role="alert"]').filter({ hasText: '本次记录与其他标签页冲突' });
    await expect(recovery).toBeVisible();
    const downloadStarted = stale.waitForEvent('download'); await recovery.getByRole('button', { name: '下载本页备份' }).click(); expect(await (await downloadStarted).path()).not.toBeNull();
    await recovery.getByRole('button', { name: '载入其他标签页版本' }).click();
    await expect(stale.getByRole('button', { name: '增加天马循环次数' })).toBeEnabled();
    expect(await stale.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m5'].workspace.blocks.find((block: { id: string }) => block.id === 'stable-repeat').repeatCount, CURRENT_KEY)).toBe(3);
    await stale.close();
  });

  test('@boss-parent exports and imports the exact graph trace and run, reports composite debugging, and unlocks W3 only after durable completion', async ({ page }) => {
    await page.goto('./#/mission/w2-m5');
    expect(isMissionUnlocked(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY), 'w3-m1')).toBe(false);
    await page.getByRole('button', { name: '观察提示' }).click();
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m5']?.usedHintTiers ?? [], CURRENT_KEY)).toEqual(['observe']);
    await correctAll(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(saved.missions['w2-m5']).toMatchObject({ status: 'completed', stars: 2, hintsUsed: 1 });
    expect(saved.sessions['w2-m5'].usedHintTiers).toEqual(['observe']);
    expect(isMissionUnlocked(saved, 'w3-m1')).toBe(true);
    await page.reload();
    expect(await page.evaluate((key) => {
      const progress = JSON.parse(localStorage.getItem(key)!);
      return { mission: progress.missions['w2-m5'], usedHintTiers: progress.sessions['w2-m5'].usedHintTiers };
    }, CURRENT_KEY)).toMatchObject({ mission: { stars: 2, hintsUsed: 1 }, usedHintTiers: ['observe'] });
    await page.getByRole('button', { name: '成长地图' }).click(); await page.getByRole('button', { name: '家长周报' }).click();
    await page.getByLabel('设置 4 位家长 PIN').fill('4826'); await page.getByLabel('确认家长 PIN').fill('4826'); await page.getByRole('button', { name: '创建家长 PIN' }).click();
    await page.getByLabel('我已安全保存恢复码').check(); await page.getByRole('button', { name: '确认已保存并进入' }).click();
    await expect(page.getByText(/已完成：.*天宫总试炼/)).toBeVisible(); await expect(page.getByText('运行 1 次 · 调整 0 次')).toBeVisible(); await expect(page.getByText('完成 · 14 星 · 1 次提示')).toBeVisible();
    const downloadStarted = page.waitForEvent('download'); await page.getByRole('button', { name: '导出进度' }).click(); const downloadPath = await (await downloadStarted).path(); expect(downloadPath).not.toBeNull();
    const exported = JSON.parse(readFileSync(downloadPath!, 'utf8'));
    await page.getByRole('button', { name: '成长地图' }).click(); await page.getByRole('button', { name: '天宫总试炼' }).click(); await page.getByRole('button', { name: '增加天马循环次数' }).click();
    await page.getByRole('button', { name: '家长周报' }).click(); await page.getByLabel('家长 PIN').fill('4826'); await page.getByRole('button', { name: '进入周报' }).click();
    await page.getByLabel('选择进度文件').setInputFiles({ name: 'w2-m5-progress.json', mimeType: 'application/json', buffer: readFileSync(downloadPath!) });
    await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m5'], CURRENT_KEY)).toEqual(exported.sessions['w2-m5']);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).missions['w2-m5'], CURRENT_KEY)).toEqual(exported.missions['w2-m5']);
  });

  test('@boss-asset-fault Boss scene asset retries a 503 with a visible query and blocks completion until ready', async ({ page }) => {
    let failed = false;
    await page.route(/signal-dispatch-background\.webp(?:\?.*)?$/, async (route) => { const url = new URL(route.request().url()); if (!url.searchParams.has('retry')) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic boss asset failure' }); } else await route.continue(); });
    await page.goto('./#/mission/w2-m5'); await expect.poll(() => failed).toBe(true); await expect(page.getByRole('alert').filter({ hasText: '场景图片没有加载成功' })).toBeVisible(); await correctAll(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.getByRole('button', { name: '重试加载场景图片' }).click(); await expect(page.locator('.heavenly-signal-boss-scene')).toHaveAttribute('data-scene-ready', 'true'); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible(); expectedFailureUrl = null;
  });

  for (const boundary of [
    { name: 'Experience', pattern: /WeekTwoHeavenlySignalBossExperience-[^/]+\.js(?:\?.*)?$/, failure: '天宫信号调度任务加载失败', survivor: null },
    { name: 'Scene', pattern: /WeekTwoHeavenlySignalBossScene-[^/]+\.js(?:\?.*)?$/, failure: '天宫信号调度场景加载失败', survivor: '增加天马循环次数' },
    { name: 'Workspace', pattern: /WeekTwoHeavenlySignalBossBlocklyWorkspace-[^/]+\.js(?:\?.*)?$/, failure: '天宫总试炼积木加载失败', survivor: '天宫总试炼代码执行场景' },
  ]) test(`@boss-lazy ${boundary.name} lazy failure leaves unaffected Boss sections visible and retries`, async ({ page }) => {
    let failed = false;
    await page.route(boundary.pattern, async (route) => { if (!failed) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: `synthetic ${boundary.name} chunk failure` }); } else await route.continue(); });
    await page.goto('./#/mission/w2-m5'); await expect.poll(() => failed).toBe(true); const alert = page.getByRole('alert').filter({ hasText: boundary.failure }); await expect(alert).toBeVisible();
    if (boundary.survivor?.startsWith('增加')) await expect(page.getByRole('button', { name: boundary.survivor })).toBeVisible();
    if (boundary.survivor?.includes('代码执行场景')) await expect(page.getByRole('img', { name: boundary.survivor })).toBeVisible();
    await alert.getByRole('button', { name: '重新加载页面' }).click(); await expect(page.getByRole('button', { name: '增加天马循环次数' })).toBeVisible(); await expect(page.locator('.heavenly-signal-boss-scene')).toHaveAttribute('data-scene-ready', 'true'); expectedFailureUrl = null;
  });
});
