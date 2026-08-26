import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { completeMission, createInitialProgress, serializeProgress } from '../src/progress/progress';
import { WEEK_TWO_PEACH_ELIXIR_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs';

const CURRENT_KEY = 'xiyou-programming-progress-v3';
const REVISION_KEY = 'xiyou-programming-progress-revision-v3';
const MODE_KEY = 'xiyou-test-storage-mode';
type HealthEvent = { kind: 'console' | 'page' | 'request' | 'response'; detail: string };
let expectedFailureUrl: string | null = null;

function prerequisite(): string {
  let progress = createInitialProgress();
  progress = { ...progress, settings: { ...progress.settings, muted: true, reducedMotion: true, reducedMotionOverride: true }, privacy: { localDataNoticeSeen: true } };
  for (const missionId of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2']) progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 });
  return serializeProgress(progress);
}
function expectedFailure(detail: string, url = '') {
  if (!expectedFailureUrl) return false;
  return url === expectedFailureUrl || detail.includes(expectedFailureUrl) || /Failed to fetch dynamically imported module|dynamically imported module|503 \(Service Unavailable\)/i.test(detail);
}
function attachHealth(page: Page, events: HealthEvent[]) {
  page.on('console', (message) => { if (message.type() === 'error' && !expectedFailure(message.text(), message.location().url)) events.push({ kind: 'console', detail: message.text() }); });
  page.on('pageerror', (error) => { if (!expectedFailure(error.message)) events.push({ kind: 'page', detail: error.message }); });
  page.on('requestfailed', (request) => {
    const detail = request.failure()?.errorText ?? '';
    if (expectedFailure(detail, request.url())) return;
    if (request.url() === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(detail)) return;
    if (request.url().includes('/assets/audio/') && /ABORTED|cancelled/i.test(detail)) return;
    events.push({ kind: 'request', detail: `${request.url()} ${detail}` });
  });
  page.on('response', (response) => { if (response.status() >= 400 && !expectedFailure(`HTTP ${response.status()}`, response.url())) events.push({ kind: 'response', detail: `${response.status()} ${response.url()}` }); });
}
async function correct(page: Page, keyboard = false) {
  const button = page.getByRole('button', { name: '将 吃下金丹 下移一步' });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); } else await button.click();
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m3']?.workspace.blocks.find((block: { id: string }) => block.id === 'peach-tusita') ?? null, CURRENT_KEY)).toMatchObject({ previousId: 'peach-drink', nextId: 'peach-elixir' });
}
async function run(page: Page, keyboard = false) {
  const button = page.getByRole('button', { name: '运行调试后的故事' });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
}

test.describe('formal w2-m3 peach and elixir sequence debugging', () => {
  let healthEvents: HealthEvent[];
  test.beforeEach(async ({ page }) => {
    healthEvents = [];
    expectedFailureUrl = null;
    attachHealth(page, healthEvents);
    await page.addInitScript(({ currentKey, revisionKey, raw }) => {
      if (localStorage.getItem(currentKey) === null) { localStorage.setItem(currentKey, raw); localStorage.setItem(revisionKey, '0'); }
    }, { currentKey: CURRENT_KEY, revisionKey: REVISION_KEY, raw: prerequisite() });
  });
  test.afterEach(() => expect(healthEvents, 'unexpected w2-m3 browser health events').toEqual([]));

  test('@peach-full visible wrong order, refresh, replay, correction, completion and w2-m4 unlock use the formal graph', async ({ page }, testInfo) => {
    await page.goto('./#/mission/w2-m3');
    await expect(page.getByRole('heading', { name: '蟠桃与金丹' })).toBeVisible();
    await expect(page.getByText('兼容指令序列')).toHaveCount(0);
    await run(page);
    await expect(page.getByRole('alert').filter({ hasText: '金丹积木跑得太早' })).toBeVisible();
    await expect(page.locator('.peach-elixir-scene')).toHaveAttribute('data-scene-state', 'banquet-visited');
    await expect(page.locator('.peach-elixir-scene')).toHaveAttribute('data-motion-mode', 'reduced');
    await expect(page.locator('.peach-elixir-scene')).toHaveAttribute('data-muted', 'true');
    await expect(page.getByAltText('蟠桃与金丹调试进度状态')).toHaveAttribute('data-sprite-stage', '3');
    expect(await page.getByAltText('蟠桃园到兜率宫的天宫路线').evaluate((image: HTMLImageElement) => ({ width: image.naturalWidth, height: image.naturalHeight }))).toEqual({ width: 1600, height: 900 });
    expect(await page.getByAltText('蟠桃与金丹调试进度状态').evaluate((image: HTMLImageElement) => ({ width: image.naturalWidth, height: image.naturalHeight }))).toEqual({ width: 1536, height: 1024 });
    await page.reload();
    await expect(page.getByRole('alert').filter({ hasText: '金丹积木跑得太早' })).toBeVisible();
    await page.getByRole('button', { name: '重播最近一次' }).click();
    await expect(page.locator('.peach-elixir-scene')).toHaveAttribute('data-scene-state', 'banquet-visited');

    const host = page.locator('.advanced-blockly-host');
    await expect(host.locator('svg.blocklySvg')).toBeVisible();
    const visual = await host.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const roots = [...element.querySelectorAll<SVGGElement>('.blocklyBlockCanvas > g.blocklyDraggable')].filter((node) => getComputedStyle(node).display !== 'none').map((node) => {
        const block = node.getBoundingClientRect();
        const path = node.querySelector<SVGPathElement>('.blocklyPath');
        return { left: block.left, right: block.right, top: block.top, bottom: block.bottom, width: block.width, height: block.height, fill: path ? getComputedStyle(path).fill : '', opacity: path ? getComputedStyle(path).opacity : '', text: node.textContent ?? '' };
      });
      return { host: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }, roots };
    });
    expect(visual.roots).toHaveLength(1);
    expect(visual.roots[0].text).toContain('吃下金丹');
    expect(visual.host.width).toBeGreaterThan(240);
    expect(visual.host.height).toBeGreaterThanOrEqual(360);
    expect(visual.roots[0].width).toBeGreaterThan(140);
    expect(visual.roots[0].height).toBeGreaterThan(180);
    expect(visual.roots[0].fill).not.toBe('none');
    expect(visual.roots[0].fill).not.toBe('rgba(0, 0, 0, 0)');
    expect(visual.roots[0].opacity).not.toBe('0');
    expect(visual.roots[0].left).toBeGreaterThanOrEqual(visual.host.left - 1);
    expect(visual.roots[0].right).toBeLessThanOrEqual(visual.host.right + 1);
    expect(visual.roots[0].top).toBeGreaterThanOrEqual(visual.host.top - 1);
    expect(visual.roots[0].bottom).toBeLessThanOrEqual(visual.host.bottom + 1);
    const geometry = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, body: document.body.scrollWidth, viewport: window.innerWidth }));
    expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.body).toBeLessThanOrEqual(geometry.viewport);
    const blocklyScreenshot = await host.screenshot();
    const blocklyStats = await sharp(blocklyScreenshot).stats();
    expect(Math.max(...blocklyStats.channels.slice(0, 3).map((channel) => channel.stdev)), 'real Blockly pixels must be visibly rendered').toBeGreaterThan(20);
    await testInfo.attach(`peach-elixir-blockly-${testInfo.project.name}.png`, { body: blocklyScreenshot, contentType: 'image/png' });
    await testInfo.attach(`peach-elixir-failure-${testInfo.project.name}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

    await expect(page.getByRole('button', { name: '将 吃下金丹 下移一步' })).toBeEnabled();
    await correct(page);
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(saved.missions['w2-m3']).toMatchObject({ status: 'completed', attempts: 1 });
    expect(saved.sessions['w2-m3']).toMatchObject({ totalRuns: 2, runtimeFailures: 1, lastRun: { completed: true, finalState: 'elixir-eaten' } });
    expect(saved.sessions['w2-m3'].lastTrace.map((item: { opcode: string }) => item.opcode)).toEqual(['guard_peach_garden', 'learn_peach_banquet', 'drink_at_banquet', 'stumble_into_tusita', 'eat_golden_elixir']);
    await testInfo.attach(`peach-elixir-success-${testInfo.project.name}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await page.getByRole('button', { name: '继续下一关' }).click();
    await expect(page.getByRole('heading', { name: '八卦炉脱身' })).toBeVisible();
  });

  test('@peach-keyboard Chromium and Firefox keyboard correction produces the same ordinary-motion unmuted trace', async ({ page }) => {
    await page.goto('./#/mission/w2-m3');
    for (const name of ['使用普通动画', '开启声音']) { const button = page.getByRole('button', { name }); await button.focus(); await page.keyboard.press('Enter'); }
    await correct(page, true);
    await run(page, true);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await expect(page.locator('.peach-elixir-scene')).toHaveAttribute('data-motion-mode', 'standard');
    await expect(page.locator('.peach-elixir-scene')).toHaveAttribute('data-muted', 'false');
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m3'].lastTrace.map((item: { opcode: string }) => item.opcode), CURRENT_KEY)).toEqual(['guard_peach_garden', 'learn_peach_banquet', 'drink_at_banquet', 'stumble_into_tusita', 'eat_golden_elixir']);
  });

  test('@peach-external a stale tab cannot overwrite the winning draft and can visibly reload it', async ({ page, context }) => {
    await page.goto('./#/mission/w2-m3');
    const stale = await context.newPage(); attachHealth(stale, healthEvents); await stale.goto('./#/mission/w2-m3');
    await correct(page);
    await expect(stale.getByText(/其他标签页已更新/).first()).toBeVisible();
    await stale.getByRole('button', { name: '删除 醉后误入兜率宫' }).click();
    const recovery = stale.locator('.peach-elixir-experience .unsaved-session');
    await expect(recovery).toContainText('本次记录与其他标签页冲突');
    await recovery.getByRole('button', { name: '载入其他标签页版本' }).click();
    await expect(stale.getByRole('button', { name: '将 吃下金丹 下移一步' })).toBeDisabled();
    expect(await stale.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m3'].workspace.blocks.length, CURRENT_KEY)).toBe(5);
    await stale.close();
  });

  test('@peach-corrupt damaged bytes are preserved while the exact w2-m3 session recovers from snapshot', async ({ page }) => {
    await page.goto('./#/mission/w2-m3'); await correct(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m3'], CURRENT_KEY);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'corrupt-peach-current'), MODE_KEY);
    await page.reload();
    await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('xiyou-programming-progress-corrupt-v3')!).current)).toBe('{broken w2-m3 current');
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m3'], CURRENT_KEY)).toEqual(before);
  });

  test('@peach-parent parent report exports and restores the exact canonical sequence-debugging session', async ({ page }) => {
    await page.goto('./#/mission/w2-m3'); await correct(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await page.getByRole('button', { name: '回成长地图' }).click(); await page.getByRole('button', { name: '家长周报' }).click();
    await page.getByLabel('设置 4 位家长 PIN').fill('4826'); await page.getByLabel('确认家长 PIN').fill('4826'); await page.getByRole('button', { name: '创建家长 PIN' }).click();
    await page.getByLabel('我已安全保存恢复码').check(); await page.getByRole('button', { name: '确认已保存并进入' }).click();
    await expect(page.getByText(/已完成：.*蟠桃与金丹/)).toBeVisible(); await expect(page.getByText(/运行 1 次 · 调整 0 次/)).toBeVisible();
    const downloadStarted = page.waitForEvent('download'); await page.getByRole('button', { name: '导出进度' }).click(); const downloadPath = await (await downloadStarted).path(); expect(downloadPath).not.toBeNull();
    const exported = JSON.parse(readFileSync(downloadPath!, 'utf8'));
    await page.getByRole('button', { name: '成长地图' }).click(); await page.getByRole('button', { name: '蟠桃与金丹' }).click(); await page.getByRole('button', { name: '删除 醉后误入兜率宫' }).click();
    await page.getByRole('button', { name: '家长周报' }).click(); await page.getByLabel('家长 PIN').fill('4826'); await page.getByRole('button', { name: '进入周报' }).click();
    await page.getByLabel('选择进度文件').setInputFiles({ name: 'w2-peach-progress.json', mimeType: 'application/json', buffer: readFileSync(downloadPath!) });
    await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m3'], CURRENT_KEY)).toEqual(exported.sessions['w2-m3']);
  });

  test('@peach-storage failed draft save stays visible and retries without losing the corrected graph', async ({ page }) => {
    await page.goto('./#/mission/w2-m3'); await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-peach-draft'), MODE_KEY); await page.getByRole('button', { name: '将 吃下金丹 下移一步' }).click();
    await expect(page.getByRole('alert').filter({ hasText: '本次学习记录尚未保存' })).toBeVisible();
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY); await page.getByRole('button', { name: '重试保存本次记录' }).click();
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m3']?.workspace.blocks.find((block: { id: string }) => block.id === 'peach-tusita')?.nextId, CURRENT_KEY)).toBe('peach-elixir');
  });

  test('@peach-storage failed run save hides playback and success until session retry', async ({ page }) => {
    await page.goto('./#/mission/w2-m3'); await correct(page); await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-peach-session'), MODE_KEY); await run(page);
    await expect(page.getByRole('alert').filter({ hasText: '本次学习记录尚未保存' })).toBeVisible(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY); await page.getByRole('button', { name: '重试保存本次记录' }).click(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  });

  test('@peach-storage failed completion save shows a distinct retry and never exposes success early', async ({ page }) => {
    await page.goto('./#/mission/w2-m3'); await correct(page); await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-peach-completion'), MODE_KEY); await run(page);
    await expect(page.getByRole('button', { name: '重试保存通关' })).toBeVisible(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY); await page.getByRole('button', { name: '重试保存通关' }).click(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  });

  test('@peach-cold formal w2-m3 route stays inside 3 MiB and missing task/application assets fail closed', async ({ page, request }, testInfo) => {
    const bodies: Array<Promise<number>> = []; page.on('response', (response) => { if (response.status() >= 200 && response.status() < 300) bodies.push(response.body().then((body) => body.length)); });
    await page.goto('./#/mission/w2-m3'); await expect(page.locator('.peach-elixir-scene')).toHaveAttribute('data-scene-ready', 'true'); await expect(page.getByRole('region', { name: '蟠桃与金丹 Blockly 顺序调试工作区' })).toBeVisible();
    const bytes = (await Promise.all(bodies)).reduce((sum, size) => sum + size, 0); expect(bytes).toBeLessThanOrEqual(WEEK_TWO_PEACH_ELIXIR_COLD_LOAD_MAX_BYTES);
    expect((await request.get('/xiyou-programming-journey/assets/week-two-peach-elixir/not-found.webp', { headers: { accept: 'image/webp' } })).status()).toBe(404);
    await page.goto('./#/mission/definitely-not-a-real-mission');
    await expect(page.getByRole('heading', { name: '这页经卷没有找到' })).toBeVisible();
    await testInfo.attach('w2-m3-cold.json', { body: Buffer.from(JSON.stringify({ project: testInfo.project.name, bytes, limit: WEEK_TWO_PEACH_ELIXIR_COLD_LOAD_MAX_BYTES })), contentType: 'application/json' });
  });

  test('@peach-asset-fault failed scene image blocks completion and retries the exact approved asset', async ({ page }) => {
    let failed = false;
    await page.route(/heavenly-route-background\.webp(?:\?.*)?$/, async (route) => { const url = new URL(route.request().url()); if (!url.searchParams.has('retry')) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic peach asset failure' }); } else await route.continue(); });
    await page.goto('./#/mission/w2-m3'); await expect.poll(() => failed).toBe(true); await expect(page.getByRole('alert').filter({ hasText: '场景图片没有加载成功' })).toBeVisible(); await correct(page); await run(page); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.getByRole('button', { name: '重试加载场景图片' }).click(); await expect(page.locator('.peach-elixir-scene')).toHaveAttribute('data-scene-ready', 'true'); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible(); expectedFailureUrl = null;
  });

  for (const boundary of [
    { name: 'Experience', pattern: /WeekTwoPeachElixirExperience-[^/]+\.js(?:\?.*)?$/, failure: '蟠桃与金丹顺序调试任务加载失败', survivor: null },
    { name: 'Scene', pattern: /WeekTwoPeachElixirScene-[^/]+\.js(?:\?.*)?$/, failure: '蟠桃与金丹调试场景加载失败', survivor: '运行调试后的故事' },
    { name: 'Workspace', pattern: /WeekTwoPeachElixirBlocklyWorkspace-[^/]+\.js(?:\?.*)?$/, failure: '蟠桃与金丹调试积木加载失败', survivor: '蟠桃与金丹代码执行场景' },
  ]) test(`@peach-lazy ${boundary.name} lazy failure preserves the unaffected page and visibly reloads`, async ({ page }) => {
    let failed = false;
    await page.route(boundary.pattern, async (route) => { if (!failed) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: `synthetic ${boundary.name} chunk failure` }); } else await route.continue(); });
    await page.goto('./#/mission/w2-m3'); await expect.poll(() => failed).toBe(true); await expect(page.getByRole('alert').filter({ hasText: boundary.failure })).toBeVisible();
    if (boundary.survivor === '运行调试后的故事') await expect(page.getByRole('button', { name: boundary.survivor })).toBeVisible();
    if (boundary.survivor?.includes('代码执行场景')) await expect(page.getByRole('img', { name: boundary.survivor })).toBeVisible();
    await page.getByRole('alert').filter({ hasText: boundary.failure }).getByRole('button', { name: '重新加载页面' }).click(); await expect(page.getByRole('button', { name: '运行调试后的故事' })).toBeVisible(); await expect(page.locator('.peach-elixir-scene')).toHaveAttribute('data-scene-ready', 'true'); expectedFailureUrl = null;
  });
});
