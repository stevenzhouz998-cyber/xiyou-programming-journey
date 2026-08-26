import { expect, test, type Page } from '@playwright/test';
import { completeMission, createInitialProgress, serializeProgress } from '../src/progress/progress';
import { WEEK_TWO_FURNACE_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs';

const CURRENT_KEY = 'xiyou-programming-progress-v3';
const REVISION_KEY = 'xiyou-programming-progress-revision-v3';
const MODE_KEY = 'xiyou-test-storage-mode';
type HealthEvent = { kind: 'console' | 'page' | 'request' | 'response'; detail: string };
let expectedFailureUrl: string | null = null;

function prerequisite() {
  let progress = createInitialProgress();
  progress = { ...progress, settings: { ...progress.settings, muted: true, reducedMotion: true, reducedMotionOverride: true }, privacy: { localDataNoticeSeen: true } };
  for (const missionId of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2', 'w2-m3']) progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 });
  return serializeProgress(progress);
}

function expectedFailure(detail: string, url = '') {
  return expectedFailureUrl !== null && (url === expectedFailureUrl || detail.includes(expectedFailureUrl) || /503 \(Service Unavailable\)|Failed to load resource/i.test(detail));
}

function attachHealth(page: Page, events: HealthEvent[]) {
  page.on('console', (message) => { if (message.type() === 'error' && !expectedFailure(message.text(), message.location().url)) events.push({ kind: 'console', detail: message.text() }); });
  page.on('pageerror', (error) => { if (!expectedFailure(error.message)) events.push({ kind: 'page', detail: error.message }); });
  page.on('requestfailed', (request) => {
    const detail = request.failure()?.errorText ?? '';
    if (expectedFailure(detail, request.url()) || (request.url() === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(detail))) return;
    events.push({ kind: 'request', detail: `${request.url()} ${detail}` });
  });
  page.on('response', (response) => { if (response.status() >= 400 && !expectedFailure(`HTTP ${response.status()}`, response.url())) events.push({ kind: 'response', detail: `${response.status()} ${response.url()}` }); });
}

async function run(page: Page, keyboard = false) {
  const button = page.getByRole('button', { name: '执行八卦炉循环' });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
}

async function correct(page: Page, keyboard = false) {
  const button = page.getByRole('button', { name: '换成：听见炉头声响并看见光明' });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await page.keyboard.press('Enter'); } else await button.click();
  await expect(page.getByRole('list', { name: '八卦炉真实积木连接' })).toContainText('听见炉头声响并看见光明');
}

test.describe('formal W2-M4 furnace repeat-until condition loop', () => {
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

  test.afterEach(() => expect(healthEvents, 'unexpected W2-M4 browser health events').toEqual([]));

  test('@full @narrow @furnace-full child saves the visible wrong condition, replaces it, reaches 49 days, refreshes, and replays without a second reward', async ({ page }) => {
    await page.goto('./#/mission/w2-m4');
    await expect(page.getByRole('heading', { name: '八卦炉脱身' })).toBeVisible();
    await expect(page.getByText('兼容指令序列')).toHaveCount(0);
    await expect(page.locator('.furnace-condition-scene')).toHaveAttribute('data-scene-ready', 'true');

    await run(page);
    await expect(page.getByRole('alert')).toContainText('眼睛变红只说明烟很大');
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await expect.poll(() => page.evaluate((key) => {
      const progress = JSON.parse(localStorage.getItem(key)!);
      return { completed: progress.sessions['w2-m4']?.lastRun?.completed ?? null, mission: progress.missions['w2-m4'] ?? null };
    }, CURRENT_KEY)).toEqual({ completed: false, mission: null });

    await correct(page);
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await expect(page.locator('.furnace-condition-scene')).toHaveAttribute('data-scene-state', 'furnace-toppled');
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(saved.missions['w2-m4']).toMatchObject({ status: 'completed', attempts: 1, stars: 3 });
    expect(saved.sessions['w2-m4']).toMatchObject({ totalRuns: 2, runtimeFailures: 1, lastRun: { completed: true, finalState: 'furnace-toppled', elapsedDays: 49, completedRounds: 7, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } } });
    expect(saved.sessions['w2-m4'].lastTrace.at(-1)).toMatchObject({ opcode: 'kick_furnace', elapsedDays: 49 });

    await page.reload();
    await expect(page.getByRole('button', { name: '重播最近一次' })).toBeEnabled();
    await page.getByRole('button', { name: '重播最近一次' }).click();
    await expect(page.getByRole('img', { name: '八卦炉脱身代码执行场景' })).toHaveAttribute('data-scene-state', 'furnace-toppled');
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).missions['w2-m4'].attempts, CURRENT_KEY)).toBe(1);
  });

  test('@furnace-keyboard @keyboard Chromium and Firefox keyboard replacement produces the same correct visible condition and trace', async ({ page }) => {
    await page.goto('./#/mission/w2-m4');
    await correct(page, true);
    await run(page, true);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w2-m4'].lastTrace.at(-1), CURRENT_KEY)).toMatchObject({ opcode: 'kick_furnace', elapsedDays: 49 });
  });

  test('@furnace-storage @storage a failed run save shows retry and never reveals playback or success early', async ({ page }) => {
    await page.goto('./#/mission/w2-m4');
    await correct(page);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-furnace-session'), MODE_KEY);
    await run(page);
    await expect(page.getByRole('alert').filter({ hasText: '本次学习记录尚未保存' })).toBeVisible();
    await expect(page.getByRole('button', { name: '重试保存本次记录' })).toBeVisible();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY);
    await page.getByRole('button', { name: '重试保存本次记录' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  });

  test('@furnace-storage @storage a failed draft save visibly retries, clears both warnings, and unlocks without playback', async ({ page }) => {
    await page.goto('./#/mission/w2-m4');
    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'fail-furnace-draft'), MODE_KEY);
    await correct(page);
    await expect(page.locator('.furnace-condition-experience .unsaved-session')).toContainText('本次学习记录尚未保存');
    await expect(page.getByText('这次积木更改还没有保存。')).toBeVisible();
    await expect(page.getByRole('button', { name: '执行八卦炉循环' })).toBeDisabled();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);

    await page.evaluate((modeKey) => localStorage.setItem(modeKey, 'off'), MODE_KEY);
    await page.locator('.furnace-condition-experience .unsaved-session').getByRole('button', { name: '重试保存本次记录' }).click();
    await expect(page.locator('.furnace-condition-experience .unsaved-session')).toHaveCount(0);
    await expect(page.getByText('这次积木更改还没有保存。')).toHaveCount(0);
    await expect(page.getByRole('button', { name: '执行八卦炉循环' })).toBeEnabled();
    expect(await page.evaluate((key) => {
      const session = JSON.parse(localStorage.getItem(key)!).sessions['w2-m4'];
      return { lastRun: session.lastRun, condition: session.workspace.blocks.find((block: { type: string }) => block.type === 'xiyou_condition_furnace_open')?.type };
    }, CURRENT_KEY)).toEqual({ lastRun: null, condition: 'xiyou_condition_furnace_open' });
  });

  test('@furnace-storage @storage a stale draft conflict offers backup and loads the winning visible condition', async ({ page, context }) => {
    await page.goto('./#/mission/w2-m4');
    const stale = await context.newPage();
    attachHealth(stale, healthEvents);
    await stale.goto('./#/mission/w2-m4');

    await correct(page);
    await expect(stale.getByText(/其他标签页已更新/).first()).toBeVisible();
    await stale.getByRole('button', { name: '换成：烟雾完全散去' }).click();
    const recovery = stale.locator('.furnace-condition-experience .unsaved-session').filter({ hasText: '本次记录与其他标签页冲突' });
    await expect(recovery).toBeVisible();
    const downloadStarted = stale.waitForEvent('download');
    await recovery.getByRole('button', { name: '下载本页备份' }).click();
    expect(await (await downloadStarted).path()).not.toBeNull();
    await recovery.getByRole('button', { name: '载入其他标签页版本' }).click();

    await expect(recovery).toHaveCount(0);
    await expect(stale.getByText('其他标签页已经更新，这次积木更改暂停保存。')).toHaveCount(0);
    await expect(stale.getByRole('list', { name: '八卦炉真实积木连接' })).toContainText('听见炉头声响并看见光明');
    await expect(stale.getByRole('button', { name: '执行八卦炉循环' })).toBeEnabled();
    await stale.close();
  });

  test('@furnace-asset-fault a scene image failure blocks completion until its visible retry restores readiness', async ({ page }) => {
    let failed = false;
    await page.route(/furnace-interior-background\.webp(?:\?.*)?$/, async (route) => {
      const url = new URL(route.request().url());
      if (!url.searchParams.has('retry')) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic furnace asset failure' }); }
      else await route.continue();
    });
    await page.goto('./#/mission/w2-m4');
    await expect.poll(() => failed).toBe(true);
    await expect(page.getByRole('alert').filter({ hasText: '场景图片没有加载成功' })).toBeVisible();
    await correct(page);
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.getByRole('button', { name: '重试加载场景图片' }).click();
    await expect(page.locator('.furnace-condition-scene')).toHaveAttribute('data-scene-ready', 'true');
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    expectedFailureUrl = null;
  });

  test('@furnace-cold @cold formal W2-M4 stays inside its fixed cold budget and missing task asset is a 404', async ({ page, request }) => {
    const bodies: Array<Promise<number>> = [];
    page.on('response', (response) => { if (response.status() >= 200 && response.status() < 300) bodies.push(response.body().then((body) => body.length)); });
    await page.goto('./#/mission/w2-m4');
    await expect(page.getByRole('img', { name: '八卦炉脱身代码执行场景' })).toHaveAttribute('data-scene-ready', 'true');
    await expect(page.getByRole('list', { name: '八卦炉真实积木连接' })).toBeVisible();
    expect((await Promise.all(bodies)).reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(WEEK_TWO_FURNACE_COLD_LOAD_MAX_BYTES);
    expect((await request.get('/xiyou-programming-journey/assets/week-two-furnace/not-found.webp', { headers: { accept: 'image/webp' } })).status()).toBe(404);
  });
});
