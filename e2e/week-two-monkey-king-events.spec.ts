import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { completeMission, createInitialProgress, serializeProgress } from '../src/progress/progress';
import { WEEK_TWO_MONKEY_KING_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs';

const CURRENT_KEY = 'xiyou-programming-progress-v3';
const REVISION_KEY = 'xiyou-programming-progress-revision-v3';
const MODE_KEY = 'xiyou-test-storage-mode';

type HealthEvent = { kind: 'console' | 'page' | 'request' | 'response'; detail: string };
let expectedFailureUrl: string | null = null;

function prerequisite(): string {
  let progress = createInitialProgress();
  progress = { ...progress, settings: { ...progress.settings, muted: true, reducedMotion: true, reducedMotionOverride: true }, privacy: { localDataNoticeSeen: true } };
  for (const missionId of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1']) progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 });
  return serializeProgress(progress);
}

function expectedFailure(detail: string, url = '') {
  if (!expectedFailureUrl) return false;
  return url === expectedFailureUrl || detail.includes(expectedFailureUrl) || /Failed to fetch dynamically imported module|dynamically imported module|503 \(Service Unavailable\)/i.test(detail);
}

function attachHealth(page: Page, events: HealthEvent[]) {
  page.on('console', (message) => {
    if (message.type() === 'error' && !expectedFailure(message.text(), message.location().url)) events.push({ kind: 'console', detail: message.text() });
  });
  page.on('pageerror', (error) => { if (!expectedFailure(error.message)) events.push({ kind: 'page', detail: error.message }); });
  page.on('requestfailed', (request) => {
    const detail = request.failure()?.errorText ?? '';
    if (expectedFailure(detail, request.url())) return;
    if (request.url() === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(detail)) return;
    if (request.url().includes('/assets/audio/') && /ABORTED|cancelled/i.test(detail)) return;
    events.push({ kind: 'request', detail: `${request.url()} ${detail}` });
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !expectedFailure(`HTTP ${response.status()}`, response.url())) events.push({ kind: 'response', detail: `${response.status()} ${response.url()}` });
  });
}

const correctButtons = [
  ['添加事件帽：返回花果山', 'xiyou_on_return_flower_fruit'],
  ['加入返回花果山：竖起齐天大圣旗', 'xiyou_raise_great_sage_flag'],
  ['添加事件帽：天庭正式授号', 'xiyou_on_heavenly_title'],
  ['加入天庭正式授号：接受齐天大圣名号', 'xiyou_accept_great_sage_title'],
  ['加入天庭正式授号：建立齐天大圣府', 'xiyou_build_great_sage_residence'],
] as const;

async function buildCorrect(page: Page, keyboard = false) {
  for (const [index, [name]] of correctButtons.entries()) {
    const button = page.getByRole('button', { name });
    await expect(button).toBeEnabled();
    if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await page.keyboard.press('Enter'); } else await button.click();
    await expect.poll(() => page.evaluate((key) => (JSON.parse(localStorage.getItem(key)!).sessions['w2-m2']?.workspace.blocks.map((block: { type: string }) => block.type) ?? []).sort(), CURRENT_KEY)).toEqual(correctButtons.slice(0, index + 1).map(([, type]) => type).sort());
  }
}

async function run(page: Page, keyboard = false) {
  const button = page.getByRole('button', { name: '派发两个事件' });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
}

async function buildWrongEvent(page: Page) {
  for (const name of [
    '添加事件帽：返回花果山',
    '加入返回花果山：接受齐天大圣名号',
    '添加事件帽：天庭正式授号',
    '加入天庭正式授号：接受齐天大圣名号',
    '加入天庭正式授号：建立齐天大圣府',
  ]) await page.getByRole('button', { name }).click();
}

test.describe('formal w2-m2 monkey king events', () => {
  let healthEvents: HealthEvent[];

  test.beforeEach(async ({ page }) => {
    healthEvents = [];
    expectedFailureUrl = null;
    attachHealth(page, healthEvents);
    await page.addInitScript(({ currentKey, revisionKey, raw }) => {
      if (localStorage.getItem(currentKey) === null) {
        localStorage.setItem(currentKey, raw);
        localStorage.setItem(revisionKey, '0');
      }
    }, { currentKey: CURRENT_KEY, revisionKey: REVISION_KEY, raw: prerequisite() });
  });

  test.afterEach(() => expect(healthEvents, 'unexpected w2-m2 browser health events').toEqual([]));

  test('@monkey-full visible wrong event, refresh, correction, completion and w2-m3 unlock use the formal graph', async ({ page }, testInfo) => {
    await page.goto('./#/mission/w2-m2');
    await expect(page.getByRole('heading', { name: '齐天大圣' })).toBeVisible();
    await expect(page.getByText('兼容指令序列')).toHaveCount(0);
    await buildWrongEvent(page);
    await run(page);

    await expect(page.getByRole('alert').filter({ hasText: '错误的事件帽' })).toBeVisible();
    await expect(page.locator('.monkey-king-scene')).toHaveAttribute('data-scene-state', 'awaiting-return');
    await expect(page.getByAltText('齐天大圣事件进度状态')).toHaveAttribute('data-sprite-stage', '0');
    await expect(page.locator('.monkey-king-scene')).toHaveAttribute('data-motion-mode', 'reduced');
    await expect(page.locator('.monkey-king-scene')).toHaveAttribute('data-muted', 'true');
    expect(await page.getByAltText('花果山齐天大圣营地').evaluate((image: HTMLImageElement) => ({ width: image.naturalWidth, height: image.naturalHeight }))).toEqual({ width: 1600, height: 900 });
    expect(await page.getByAltText('齐天大圣事件进度状态').evaluate((image: HTMLImageElement) => ({ width: image.naturalWidth, height: image.naturalHeight }))).toEqual({ width: 1600, height: 900 });
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m2'].lastRun.diagnostic, CURRENT_KEY)).toMatchObject({ concept: 'event-routing', sourceBlockId: expect.any(String) });

    await page.reload();
    await expect(page.getByRole('alert').filter({ hasText: '错误的事件帽' })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: '当 返回花果山 → 接受齐天大圣名号' })).toBeVisible();
    const host = page.locator('.advanced-blockly-host');
    await expect(host.locator('svg.blocklySvg')).toBeVisible();
    const visual = await host.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const roots = [...element.querySelectorAll<SVGGElement>('.blocklyBlockCanvas > g.blocklyDraggable')].filter((node) => getComputedStyle(node).display !== 'none').map((node) => {
        const block = node.getBoundingClientRect();
        return { left: block.left, right: block.right, top: block.top, bottom: block.bottom, text: node.textContent ?? '' };
      });
      return { host: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, roots };
    });
    expect(visual.roots).toHaveLength(2);
    expect(visual.roots.map((root) => root.text).join(' ')).toContain('返回花果山');
    expect(visual.roots.map((root) => root.text).join(' ')).toContain('天庭正式授号');
    for (const root of visual.roots) {
      expect(root.left).toBeGreaterThanOrEqual(visual.host.left - 1);
      expect(root.right).toBeLessThanOrEqual(visual.host.right + 1);
      expect(root.top).toBeGreaterThanOrEqual(visual.host.top - 1);
      expect(root.bottom).toBeLessThanOrEqual(visual.host.bottom + 1);
    }
    const containment = await page.locator('.play-column').evaluate((container) => {
      const hostRect = container.getBoundingClientRect();
      return [...container.querySelectorAll<HTMLElement>('.monkey-king-scene, .monkey-king-workspace, .monkey-king-experience button')].filter((node) => getComputedStyle(node).display !== 'none').map((node) => {
        const rect = node.getBoundingClientRect();
        return { label: node.getAttribute('aria-label') ?? node.textContent?.trim().slice(0, 40) ?? node.tagName, left: rect.left, right: rect.right, hostLeft: hostRect.left, hostRight: hostRect.right };
      });
    });
    for (const item of containment) { expect(item.left, `${item.label} left`).toBeGreaterThanOrEqual(item.hostLeft - 1); expect(item.right, `${item.label} right`).toBeLessThanOrEqual(item.hostRight + 1); }
    await testInfo.attach(`monkey-king-blockly-${testInfo.project.name}.png`, { body: await host.screenshot(), contentType: 'image/png' });
    await testInfo.attach(`monkey-king-failure-${testInfo.project.name}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });

    await page.getByRole('listitem').filter({ hasText: '当 返回花果山 → 接受齐天大圣名号' }).getByRole('button', { name: '删除' }).click();
    await page.getByRole('button', { name: '加入返回花果山：竖起齐天大圣旗' }).click();
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(saved.missions['w2-m2']).toMatchObject({ status: 'completed', attempts: 1 });
    expect(saved.sessions['w2-m2']).toMatchObject({ totalRuns: 2, runtimeFailures: 1, lastRun: { completed: true, finalState: 'residence-built', dispatchedEvents: ['return-to-flower-fruit', 'heavenly-title-conferred'] } });
    expect(saved.sessions['w2-m2'].lastTrace.map((item: { sourceBlockId: string; parentBlockId: string | null; eventType: string }) => ({ sourceBlockId: item.sourceBlockId, parentBlockId: item.parentBlockId, eventType: item.eventType }))).toEqual(expect.arrayContaining([
      expect.objectContaining({ parentBlockId: null, eventType: 'return-to-flower-fruit' }),
      expect.objectContaining({ parentBlockId: expect.any(String), eventType: 'heavenly-title-conferred' }),
    ]));
    const geometry = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, body: document.body.scrollWidth, viewport: window.innerWidth }));
    expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.body).toBeLessThanOrEqual(geometry.viewport);
    await page.getByRole('button', { name: '继续下一关' }).click();
    await expect(page.getByRole('heading', { name: '蟠桃与金丹' })).toBeVisible();
  });

  test('@monkey-keyboard Chromium and Firefox keyboard input produces the same ordinary-motion unmuted trace', async ({ page }) => {
    await page.goto('./#/mission/w2-m2');
    for (const name of ['使用普通动画', '开启声音']) { const button = page.getByRole('button', { name }); await button.focus(); await page.keyboard.press('Enter'); }
    await buildCorrect(page, true);
    await run(page, true);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await expect(page.locator('.monkey-king-scene')).toHaveAttribute('data-motion-mode', 'standard');
    await expect(page.locator('.monkey-king-scene')).toHaveAttribute('data-muted', 'false');
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m2'].lastTrace.map((item: { opcode: string | null }) => item.opcode), CURRENT_KEY)).toEqual([null, 'raise_great_sage_flag', null, 'accept_great_sage_title', 'build_great_sage_residence']);
  });

  test('@monkey-external a stale tab cannot overwrite the winning event draft and can visibly reload it', async ({ page, context }) => {
    await page.goto('./#/mission/w2-m2');
    const stale = await context.newPage();
    attachHealth(stale, healthEvents);
    await stale.goto('./#/mission/w2-m2');
    await page.getByRole('button', { name: '添加事件帽：返回花果山' }).click();
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m2']?.workspace.blocks.length ?? 0, CURRENT_KEY)).toBe(1);
    await expect(stale.getByText(/其他标签页已更新/).first()).toBeVisible();
    await stale.getByRole('button', { name: '添加事件帽：天庭正式授号' }).click();
    const recovery = stale.locator('.monkey-king-experience .unsaved-session');
    await expect(recovery).toContainText('本次记录与其他标签页冲突');
    await recovery.getByRole('button', { name: '载入其他标签页版本' }).click();
    await expect(stale.getByText('当 返回花果山').last()).toBeVisible();
    expect(await stale.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m2'].workspace.blocks.map((block: { type: string }) => block.type), CURRENT_KEY)).toEqual(['xiyou_on_return_flower_fruit']);
    await stale.close();
  });

  test('@monkey-corrupt damaged bytes are preserved while the exact w2-m2 session recovers from snapshot', async ({ page }) => {
    await page.goto('./#/mission/w2-m2');
    await buildCorrect(page);
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m2'], CURRENT_KEY);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'corrupt-monkey-current'), MODE_KEY);
    await page.reload();
    await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('xiyou-programming-progress-corrupt-v3')!).current)).toBe('{broken w2-m2 current');
    await expect(page.getByText('当 返回花果山').last()).toBeVisible();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m2'], CURRENT_KEY)).toEqual(before);
  });

  test('@monkey-parent parent report exports and restores the exact canonical event session', async ({ page }) => {
    await page.goto('./#/mission/w2-m2');
    await buildCorrect(page);
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await page.getByRole('button', { name: '回成长地图' }).click();
    await page.getByRole('button', { name: '家长周报' }).click();
    await page.getByLabel('设置 4 位家长 PIN').fill('4826');
    await page.getByLabel('确认家长 PIN').fill('4826');
    await page.getByRole('button', { name: '创建家长 PIN' }).click();
    await page.getByLabel('我已安全保存恢复码').check();
    await page.getByRole('button', { name: '确认已保存并进入' }).click();
    await expect(page.getByText(/已完成：.*齐天大圣/)).toBeVisible();
    await expect(page.getByText('运行 1 次 · 调整 0 次')).toBeVisible();
    const downloadStarted = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出进度' }).click();
    const downloadPath = await (await downloadStarted).path();
    expect(downloadPath).not.toBeNull();
    const exported = JSON.parse(readFileSync(downloadPath!, 'utf8'));
    await page.getByRole('button', { name: '成长地图' }).click();
    await page.getByRole('button', { name: '齐天大圣' }).click();
    await page.getByRole('listitem').filter({ hasText: '建立齐天大圣府' }).getByRole('button', { name: '删除' }).click();
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m2'].workspace.blocks.length, CURRENT_KEY)).toBe(4);
    await page.getByRole('button', { name: '家长周报' }).click();
    await page.getByLabel('家长 PIN').fill('4826');
    await page.getByRole('button', { name: '进入周报' }).click();
    await page.getByLabel('选择进度文件').setInputFiles({ name: 'w2-monkey-progress.json', mimeType: 'application/json', buffer: readFileSync(downloadPath!) });
    await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m2'], CURRENT_KEY)).toEqual(exported.sessions['w2-m2']);
  });

  test('@monkey-storage failed draft save stays visible and retries without losing the handler', async ({ page }) => {
    await page.goto('./#/mission/w2-m2');
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-monkey-draft'), MODE_KEY);
    await page.getByRole('button', { name: '添加事件帽：返回花果山' }).click();
    await expect(page.getByRole('alert').filter({ hasText: '本次学习记录尚未保存' })).toBeVisible();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m2'] ?? null, CURRENT_KEY)).toBeNull();
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY);
    await page.getByRole('button', { name: '重试保存本次记录' }).click();
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m2']?.workspace.blocks.length ?? 0, CURRENT_KEY)).toBe(1);
    await expect(page.getByRole('button', { name: '添加事件帽：天庭正式授号' })).toBeEnabled();
  });

  test('@monkey-storage failed run save hides playback and success until session retry', async ({ page }) => {
    await page.goto('./#/mission/w2-m2');
    await buildCorrect(page);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-monkey-session'), MODE_KEY);
    await run(page);
    await expect(page.getByRole('alert').filter({ hasText: '本次学习记录尚未保存' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY);
    await page.getByRole('button', { name: '重试保存本次记录' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  });

  test('@monkey-storage failed completion save shows a distinct retry and never exposes success early', async ({ page }) => {
    await page.goto('./#/mission/w2-m2');
    await buildCorrect(page);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-monkey-completion'), MODE_KEY);
    await run(page);
    await expect(page.getByRole('button', { name: '重试保存通关' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY);
    await page.getByRole('button', { name: '重试保存通关' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  });

  test('@monkey-cold formal w2-m2 route stays inside 3 MiB and a missing approved-family asset is 404', async ({ page, request }, testInfo) => {
    const bodies: Array<Promise<number>> = [];
    page.on('response', (response) => { if (response.status() >= 200 && response.status() < 300) bodies.push(response.body().then((body) => body.length)); });
    await page.goto('./#/mission/w2-m2');
    await expect(page.locator('.monkey-king-scene')).toHaveAttribute('data-scene-ready', 'true');
    await expect(page.getByRole('region', { name: '齐天大圣 Blockly 事件工作区' })).toBeVisible();
    const bytes = (await Promise.all(bodies)).reduce((sum, size) => sum + size, 0);
    expect(bytes).toBeLessThanOrEqual(WEEK_TWO_MONKEY_KING_COLD_LOAD_MAX_BYTES);
    const missing = await request.get('/xiyou-programming-journey/assets/week-two-great-sage/not-found.webp', { headers: { accept: 'image/webp' } });
    expect(missing.status()).toBe(404);
    await testInfo.attach('w2-m2-cold.json', { body: Buffer.from(JSON.stringify({ project: testInfo.project.name, bytes, limit: WEEK_TWO_MONKEY_KING_COLD_LOAD_MAX_BYTES })), contentType: 'application/json' });
  });

  test('@monkey-asset-fault failed scene image blocks completion and retries the exact approved asset', async ({ page }) => {
    let failed = false;
    await page.route(/flower-fruit-background\.webp(?:\?.*)?$/, async (route) => {
      const url = new URL(route.request().url());
      if (!url.searchParams.has('retry')) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic monkey asset failure' }); }
      else await route.continue();
    });
    await page.goto('./#/mission/w2-m2');
    await expect.poll(() => failed).toBe(true);
    await expect(page.getByRole('alert').filter({ hasText: '场景图片没有加载成功' })).toBeVisible();
    await buildCorrect(page);
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.getByRole('button', { name: '重试加载场景图片' }).click();
    await expect(page.locator('.monkey-king-scene')).toHaveAttribute('data-scene-ready', 'true');
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    expectedFailureUrl = null;
  });

  for (const boundary of [
    { name: 'Experience', pattern: /WeekTwoMonkeyKingExperience-[^/]+\.js(?:\?.*)?$/, failure: '齐天大圣事件任务加载失败', survivor: null },
    { name: 'Scene', pattern: /WeekTwoMonkeyKingScene-[^/]+\.js(?:\?.*)?$/, failure: '齐天大圣事件场景加载失败', survivor: '添加事件帽：返回花果山' },
    { name: 'Workspace', pattern: /WeekTwoMonkeyKingBlocklyWorkspace-[^/]+\.js(?:\?.*)?$/, failure: '齐天大圣事件积木加载失败', survivor: '齐天大圣事件代码执行场景' },
  ]) test(`@monkey-lazy ${boundary.name} lazy failure preserves the unaffected page and visibly reloads`, async ({ page }) => {
    let failed = false;
    await page.route(boundary.pattern, async (route) => {
      if (!failed) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: `synthetic ${boundary.name} chunk failure` }); }
      else await route.continue();
    });
    await page.goto('./#/mission/w2-m2');
    await expect.poll(() => failed).toBe(true);
    await expect(page.getByRole('alert').filter({ hasText: boundary.failure })).toBeVisible();
    if (boundary.survivor?.startsWith('添加')) await expect(page.getByRole('button', { name: boundary.survivor })).toBeVisible();
    if (boundary.survivor?.includes('场景')) await expect(page.getByRole('img', { name: boundary.survivor })).toBeVisible();
    await page.getByRole('alert').filter({ hasText: boundary.failure }).getByRole('button', { name: '重新加载页面' }).click();
    await expect(page.getByRole('button', { name: '添加事件帽：返回花果山' })).toBeVisible();
    await expect(page.locator('.monkey-king-scene')).toHaveAttribute('data-scene-ready', 'true');
    expectedFailureUrl = null;
  });
});
