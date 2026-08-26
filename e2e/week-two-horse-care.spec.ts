import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { completeMission, createInitialProgress, serializeProgress } from '../src/progress/progress';
import { WEEK_TWO_HORSE_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs';

const CURRENT_KEY = 'xiyou-programming-progress-v3';
const REVISION_KEY = 'xiyou-programming-progress-revision-v3';

type HealthEvent = { kind: 'console' | 'page' | 'request' | 'response'; detail: string };
let expectedAssetFailureUrl: string | null = null;

function weekOnePrerequisite(): string {
  let progress = createInitialProgress();
  progress = {
    ...progress,
    settings: { ...progress.settings, muted: true, reducedMotion: true, reducedMotionOverride: true },
    privacy: { localDataNoticeSeen: true },
  };
  for (const missionId of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5']) {
    progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 });
  }
  return serializeProgress(progress);
}

function attachHealth(page: Page, events: HealthEvent[]) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      if (expectedAssetFailureUrl && /503|Failed to load resource/i.test(message.text())) return;
      events.push({ kind: 'console', detail: message.text() });
    }
  });
  page.on('pageerror', (error) => events.push({ kind: 'page', detail: error.message }));
  page.on('requestfailed', (request) => {
    const detail = request.failure()?.errorText ?? '';
    if (request.url() === expectedAssetFailureUrl && /ABORTED|cancelled/i.test(detail)) return;
    if (request.url() === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(detail)) return;
    if (request.url().includes('/assets/audio/') && /ABORTED|cancelled/i.test(detail)) return;
    events.push({ kind: 'request', detail: `${request.url()} ${detail}` });
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !(response.status() === 503 && response.url() === expectedAssetFailureUrl)) events.push({ kind: 'response', detail: `${response.status()} ${response.url()}` });
  });
}

test.describe('formal week two horse-care loop', () => {
  let healthEvents: HealthEvent[];

  test.beforeEach(async ({ page }) => {
    healthEvents = [];
    expectedAssetFailureUrl = null;
    attachHealth(page, healthEvents);
    await page.addInitScript(({ currentKey, revisionKey, raw }) => {
      if (localStorage.getItem(currentKey) === null) {
        localStorage.setItem(currentKey, raw);
        localStorage.setItem(revisionKey, '0');
      }
    }, { currentKey: CURRENT_KEY, revisionKey: REVISION_KEY, raw: weekOnePrerequisite() });
  });

  test.afterEach(() => expect(healthEvents).toEqual([]));

  test('@horse-full visible wrong loop, refresh recovery, correction and completion use the formal Progress V3 path', async ({ page }, testInfo) => {
    await page.goto('./#/mission/w2-m1');
    await expect(page.getByRole('heading', { name: '弼马温' })).toBeVisible();
    await expect(page.getByText('兼容指令序列')).toHaveCount(0);

    for (const name of [
      '加入主程序：接受弼马温官职',
      '加入主程序：重复照料天马',
      '加入循环体：照料下一匹天马',
      '加入主程序：了解弼马温品级',
      '加入主程序：离开天庭返回花果山',
    ]) await page.getByRole('button', { name }).click();
    await page.getByRole('button', { name: '减少循环次数' }).click();
    await expect(page.getByText(/重复照料天马：2 次/)).toBeVisible();
    await page.getByRole('button', { name: '执行弼马温循环' }).click();

    await expect(page.getByRole('alert').filter({ hasText: '御马监今天有三匹天马' })).toBeVisible();
    await expect(page.getByRole('img', { name: '弼马温循环代码执行场景' })).toHaveAttribute('data-scene-state', 'horses-cared-2');
    expect(await page.getByAltText('天宫御马监庭院').evaluate((image: HTMLImageElement) => ({ width: image.naturalWidth, height: image.naturalHeight }))).toEqual({ width: 1600, height: 900 });
    expect(await page.getByAltText('三匹天马循环照料状态').evaluate((image: HTMLImageElement) => ({ width: image.naturalWidth, height: image.naturalHeight }))).toEqual({ width: 1600, height: 900 });
    await expect.poll(() => page.evaluate((key) => {
      const progress = JSON.parse(localStorage.getItem(key)!);
      return { totalRuns: progress.sessions['w2-m1'].totalRuns, completed: progress.sessions['w2-m1'].lastRun?.completed ?? null };
    }, CURRENT_KEY)).toEqual({ totalRuns: 1, completed: false });

    await page.reload();
    await expect(page.getByText(/重复照料天马：2 次/)).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: '御马监今天有三匹天马' })).toBeVisible();
    const containment = await page.locator('.play-column').evaluate((container, selector) => {
      const host = container.getBoundingClientRect();
      return [...container.querySelectorAll<HTMLElement>(selector)].filter((node) => {
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden';
      }).map((node) => {
        const rect = node.getBoundingClientRect();
        return { label: node.getAttribute('aria-label') ?? node.textContent?.trim().slice(0, 40) ?? node.tagName, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, hostLeft: host.left, hostRight: host.right };
      });
    }, '.horse-care-scene, .horse-care-workspace, .horse-care-experience button');
    for (const item of containment) {
      expect(item.left, `${item.label} left edge`).toBeGreaterThanOrEqual(item.hostLeft - 1);
      expect(item.right, `${item.label} right edge`).toBeLessThanOrEqual(item.hostRight + 1);
    }
    const blockGeometry = await page.locator('.advanced-blockly-host').evaluate((host) => {
      const hostRect = host.getBoundingClientRect();
      const blocks = [...host.querySelectorAll<SVGGElement>('.blocklyBlockCanvas > g.blocklyDraggable')]
        .filter((block) => block.closest('.blocklyFlyout') === null && getComputedStyle(block).display !== 'none')
        .map((block) => {
          const rect = block.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
        });
      const svg = host.querySelector<SVGSVGElement>('svg.blocklySvg');
      const clips = [...host.querySelectorAll<SVGRectElement>('clipPath rect')].map((rect) => ({ width: rect.getAttribute('width'), height: rect.getAttribute('height'), x: rect.getAttribute('x'), y: rect.getAttribute('y') }));
      return { host: { left: hostRect.left, right: hostRect.right, top: hostRect.top, bottom: hostRect.bottom }, svg: svg ? { width: svg.getAttribute('width'), height: svg.getAttribute('height'), viewBox: svg.getAttribute('viewBox') } : null, clips, blocks };
    });
    expect(blockGeometry.blocks).toHaveLength(1);
    for (const block of blockGeometry.blocks) {
      expect(block.left).toBeGreaterThanOrEqual(blockGeometry.host.left - 1);
      expect(block.right).toBeLessThanOrEqual(blockGeometry.host.right + 1);
      expect(block.top).toBeGreaterThanOrEqual(blockGeometry.host.top - 1);
      expect(block.bottom).toBeLessThanOrEqual(blockGeometry.host.bottom + 1);
    }
    await testInfo.attach(`horse-care-blockly-${testInfo.project.name}.png`, { body: await page.locator('.advanced-blockly-host').screenshot(), contentType: 'image/png' });
    await testInfo.attach(`horse-care-failure-${testInfo.project.name}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await page.getByRole('button', { name: '增加循环次数' }).click();
    await expect(page.getByText(/重复照料天马：3 次/)).toBeVisible();
    await page.getByRole('button', { name: '执行弼马温循环' }).click();

    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(saved.missions['w2-m1']).toMatchObject({ status: 'completed', attempts: 1 });
    expect(saved.sessions['w2-m1']).toMatchObject({ totalRuns: 2, runtimeFailures: 1, lastRun: { completed: true, caredHorses: 3 } });
    expect(saved.sessions['w2-m1'].lastTrace.filter((item: { opcode: string }) => item.opcode === 'care_next_horse').map((item: { iteration: number }) => item.iteration)).toEqual([1, 2, 3]);

    const geometry = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, body: document.body.scrollWidth, viewport: window.innerWidth }));
    expect(geometry.document).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.body).toBeLessThanOrEqual(geometry.viewport);
    await page.getByRole('button', { name: '继续下一关' }).click();
    await expect(page.getByRole('heading', { name: '齐天大圣' })).toBeVisible();
  });

  test('@horse-keyboard keyboard input completes the same formal trace in ordinary motion with sound enabled', async ({ page }) => {
    await page.goto('./#/mission/w2-m1');
    for (const name of ['使用普通动画', '开启声音']) {
      const button = page.getByRole('button', { name });
      await button.focus();
      await page.keyboard.press('Enter');
    }
    for (const name of [
      '加入主程序：接受弼马温官职',
      '加入主程序：重复照料天马',
      '加入循环体：照料下一匹天马',
      '加入主程序：了解弼马温品级',
      '加入主程序：离开天庭返回花果山',
      '执行弼马温循环',
    ]) {
      const button = page.getByRole('button', { name });
      await expect(button).toBeEnabled();
      await button.focus();
      await page.keyboard.press('Enter');
    }

    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await expect(page.locator('.horse-care-scene')).toHaveAttribute('data-motion-mode', 'standard');
    await expect(page.locator('.horse-care-scene')).toHaveAttribute('data-muted', 'false');
    const iterations = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m1'].lastTrace
      .filter((item: { opcode: string }) => item.opcode === 'care_next_horse')
      .map((item: { iteration: number }) => item.iteration), CURRENT_KEY);
    expect(iterations).toEqual([1, 2, 3]);
  });

  test('@horse-external stale W2 tab cannot overwrite the winning draft and visibly reloads it', async ({ page, context }) => {
    await page.goto('./#/mission/w2-m1');
    const stale = await context.newPage();
    attachHealth(stale, healthEvents);
    await stale.goto('./#/mission/w2-m1');
    await expect(stale.getByRole('heading', { name: '弼马温' })).toBeVisible();

    await page.getByRole('button', { name: '加入主程序：接受弼马温官职' }).click();
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m1']?.workspace.blocks.length ?? 0, CURRENT_KEY)).toBe(1);
    await expect(stale.getByText(/其他标签页已更新/).first()).toBeVisible();

    await stale.getByRole('button', { name: '加入主程序：重复照料天马' }).click();
    const recovery = stale.locator('.horse-care-experience .unsaved-session');
    await expect(recovery).toContainText('本次记录与其他标签页冲突');
    await recovery.getByRole('button', { name: '载入其他标签页版本' }).click();
    await expect(stale.getByText('接受弼马温官职').last()).toBeVisible();
    expect(await stale.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m1'].workspace.blocks.map((block: { type: string }) => block.type), CURRENT_KEY)).toEqual(['xiyou_accept_stable_post']);
    await stale.close();
  });

  test('@horse-corrupt damaged current bytes are preserved while the exact W2 session recovers from snapshot', async ({ page }) => {
    await page.goto('./#/mission/w2-m1');
    for (const name of [
      '加入主程序：接受弼马温官职',
      '加入主程序：重复照料天马',
      '加入循环体：照料下一匹天马',
      '加入主程序：了解弼马温品级',
      '加入主程序：离开天庭返回花果山',
    ]) await page.getByRole('button', { name }).click();
    await page.getByRole('button', { name: '执行弼马温循环' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m1'], CURRENT_KEY);

    await page.evaluate(() => localStorage.setItem('xiyou-test-storage-mode', 'corrupt-horse-current'));
    await page.reload();

    await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
    await expect(page.getByRole('link', { name: '请家长查看详情' })).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('xiyou-programming-progress-corrupt-v3')!).current)).toBe('{broken w2-m1 current');
    await expect(page.getByText(/重复照料天马：3 次/)).toBeVisible();
    const after = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m1'], CURRENT_KEY);
    expect(after).toEqual(before);
  });

  test('@horse-parent parent report exports and visibly restores the exact W2 session', async ({ page }) => {
    await page.goto('./#/mission/w2-m1');
    for (const name of [
      '加入主程序：接受弼马温官职',
      '加入主程序：重复照料天马',
      '加入循环体：照料下一匹天马',
      '加入主程序：了解弼马温品级',
      '加入主程序：离开天庭返回花果山',
    ]) await page.getByRole('button', { name }).click();
    await page.getByRole('button', { name: '执行弼马温循环' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await page.getByRole('button', { name: '回成长地图' }).click();
    await page.getByRole('button', { name: '家长周报' }).click();
    await page.getByLabel('设置 4 位家长 PIN').fill('4826');
    await page.getByLabel('确认家长 PIN').fill('4826');
    await page.getByRole('button', { name: '创建家长 PIN' }).click();
    await page.getByLabel('我已安全保存恢复码').check();
    await page.getByRole('button', { name: '确认已保存并进入' }).click();

    await expect(page.getByText('已完成：弼马温')).toBeVisible();
    await expect(page.getByText('运行 1 次 · 调整 0 次')).toBeVisible();
    const downloadStarted = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出进度' }).click();
    const downloadPath = await (await downloadStarted).path();
    expect(downloadPath).not.toBeNull();
    const exported = JSON.parse(readFileSync(downloadPath!, 'utf8'));

    await page.getByRole('button', { name: '成长地图' }).click();
    await page.getByRole('button', { name: '弼马温' }).click();
    await page.getByRole('listitem').filter({ hasText: '离开天庭返回花果山' }).getByRole('button', { name: '删除' }).click();
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m1'].workspace.blocks.length, CURRENT_KEY)).toBe(4);
    await page.getByRole('button', { name: '家长周报' }).click();
    await page.getByLabel('家长 PIN').fill('4826');
    await page.getByRole('button', { name: '进入周报' }).click();
    await page.getByLabel('选择进度文件').setInputFiles({ name: 'w2-horse-progress.json', mimeType: 'application/json', buffer: readFileSync(downloadPath!) });
    await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible();
    const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m1'], CURRENT_KEY);
    expect(restored).toEqual(exported.sessions['w2-m1']);
  });

  test('@horse-cold formal W2 route stays inside its fixed cold budget and missing local asset is 404', async ({ page, request }, testInfo) => {
    const bodies: Array<Promise<number>> = [];
    page.on('response', (response) => {
      if (response.status() >= 200 && response.status() < 300) bodies.push(response.body().then((body) => body.length));
    });
    await page.goto('./#/mission/w2-m1');
    await expect(page.locator('.horse-care-scene')).toHaveAttribute('data-scene-ready', 'true');
    await expect(page.getByRole('region', { name: '弼马温 Blockly 工作区' })).toBeVisible();
    const bytes = (await Promise.all(bodies)).reduce((sum, size) => sum + size, 0);
    expect(bytes).toBeLessThanOrEqual(WEEK_TWO_HORSE_COLD_LOAD_MAX_BYTES);
    const missing = await request.get('/xiyou-programming-journey/assets/week-two-heaven/not-found.webp', { headers: { accept: 'image/webp' } });
    expect(missing.status()).toBe(404);
    await testInfo.attach('w2-m1-cold.json', { body: Buffer.from(JSON.stringify({ project: testInfo.project.name, bytes, limit: WEEK_TWO_HORSE_COLD_LOAD_MAX_BYTES })), contentType: 'application/json' });
  });

  test('@horse-asset-fault a failed formal scene image stays visible and retries the exact approved asset', async ({ page }) => {
    let failed = false;
    await page.route(/stable-background\.webp$/, async (route) => {
      failed = true;
      expectedAssetFailureUrl = route.request().url();
      await route.fulfill({ status: 503, body: 'synthetic horse asset failure' });
    });
    await page.goto('./#/mission/w2-m1');
    await expect.poll(() => failed).toBe(true);
    await expect(page.getByRole('alert').filter({ hasText: '场景图片没有加载成功' })).toBeVisible();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).missions['w2-m1'] ?? null, CURRENT_KEY)).toBeNull();

    await page.getByRole('button', { name: '重试加载场景图片' }).click();
    await expect(page.locator('.horse-care-scene')).toHaveAttribute('data-scene-ready', 'true');
    expect(failed).toBe(true);
    expectedAssetFailureUrl = null;
  });
});
