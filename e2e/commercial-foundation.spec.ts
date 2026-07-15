import { expect, test, type Page, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

type HealthEvent = { kind: 'console' | 'pageerror' | 'requestfailed' | 'http'; url: string; detail: string; status?: number; phase?: string };
let healthEvents: HealthEvent[] = [];
let allowHealth: (event: HealthEvent) => boolean = () => false;
let healthPhase = 'normal';
let healthOwnerUrl: string | null = null;
const blocklyWorkspaceChunk = /\/assets\/BlocklyWorkspace-[^/]+\.js(?:\?.*)?$/;
const appEntryChunk = /\/assets\/index-[^/]+\.js(?:\?.*)?$/;
type BrowserName = 'chromium' | 'firefox' | 'webkit';
const updateEvidence = process.env.XIYOU_UPDATE_EVIDENCE === '1';
const pyodideDirectory = 'https://cdn.jsdelivr.net/pyodide/v314.0.2/full/';
const pyodideModule = `${pyodideDirectory}pyodide.mjs`;
const isAllowedPythonHealth = (event: HealthEvent, pageUrl: string, browserName: BrowserName) => {
  if (event.phase !== 'python-runtime') return false;
  if ((event.kind === 'requestfailed' || event.kind === 'http') && (event.url === pyodideModule || event.url.startsWith(pyodideDirectory))) return true;
  return browserName === 'firefox' && event.kind === 'console' && event.url === pageUrl
    && /#\/mission\/w4-m2$/.test(pageUrl) && event.detail === 'uncaught exception: undefined';
};
const isAllowedLazyFailure = (event: HealthEvent, target503Url: string | null, browserName: BrowserName) => {
  if (!target503Url || !blocklyWorkspaceChunk.test(target503Url) || event.phase !== 'lazy-target-503' || event.kind !== 'console') return false;
  let sameOrigin = false;
  try { sameOrigin = new URL(event.url).origin === new URL(target503Url).origin; } catch { return false; }
  if (!sameOrigin) return false;
  if (event.url === target503Url && event.detail === 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)') return true;
  const dynamicImportFailure = `Failed to fetch dynamically imported module: ${target503Url}`;
  return event.detail === dynamicImportFailure || event.detail === `TypeError: ${dynamicImportFailure}`
    || (appEntryChunk.test(event.url) && ((browserName === 'webkit' && event.detail === 'TypeError: Importing a module script failed.')
      || (browserName === 'firefox' && event.detail === 'Error')));
};
const expectedFontNavigationAbort = (event: HealthEvent) => event.kind === 'requestfailed'
  && event.url.startsWith('https://fonts.gstatic.com/') && event.detail.includes('ABORTED');
const expectedMediaNavigationAbort = (event: HealthEvent) => event.kind === 'requestfailed'
  && event.url.includes('/assets/audio/') && /ABORTED|cancelled/i.test(event.detail);
const expectedBlocklyNavigationAbort = (event: HealthEvent) => event.kind === 'requestfailed'
  && event.url === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(event.detail);

test.beforeEach(async ({ page, browserName }) => {
  healthEvents = [];
  healthPhase = 'normal';
  healthOwnerUrl = null;
  allowHealth = event => expectedFontNavigationAbort(event) || expectedMediaNavigationAbort(event) || expectedBlocklyNavigationAbort(event);
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const rawDetail = message.text();
    const detail = browserName === 'firefox' && rawDetail === '[JavaScript Error: "uncaught exception: undefined"]'
      ? 'uncaught exception: undefined'
      : rawDetail;
    healthEvents.push({ kind: 'console', url: message.location().url || healthOwnerUrl || page.url(), detail, phase: healthPhase });
  });
  page.on('pageerror', error => healthEvents.push({ kind: 'pageerror', url: page.url(), detail: error.message }));
  page.on('requestfailed', request => healthEvents.push({ kind: 'requestfailed', url: request.url(), detail: request.failure()?.errorText ?? 'unknown', phase: healthPhase }));
  page.on('response', response => { if (response.status() >= 400) healthEvents.push({ kind: 'http', url: response.url(), status: response.status(), detail: response.statusText(), phase: healthPhase }); });
  if (updateEvidence) await page.addInitScript((fixedTime) => {
    const NativeDate = Date;
    class EvidenceDate extends NativeDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        super(...(args.length ? args : [fixedTime]));
      }
      static now() { return fixedTime; }
    }
    Object.defineProperty(window, 'Date', { value: EvidenceDate });
  }, new Date('2026-07-13T00:00:00.000Z').valueOf());
});

test.afterEach(() => {
  expect(healthEvents.filter(event => !allowHealth(event)), 'unexpected browser health events').toEqual([]);
});

const currentKey = 'xiyou-programming-progress-v3';
const snapshotKey = 'xiyou-programming-progress-snapshot-v3';
const corruptKey = 'xiyou-programming-progress-corrupt-v3';

const v1 = (completed = false) => ({
  version: 1, learnerName: '小行者',
  missions: completed ? { 'w1-m1': { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: '2026-07-12T00:00:00.000Z' } } : {},
  settings: { muted: true, reducedMotion: false, parentPin: '2580' }, savedAt: '2026-07-12T00:00:00.000Z',
});
const v2 = (completed = false, privacySeen = true) => ({
  ...v1(completed), version: 2, schemaRevision: 1,
  settings: { ...v1(completed).settings, reducedMotionOverride: false },
  privacy: { localDataNoticeSeen: privacySeen }, recovery: { lastRecoveredAt: null, source: null },
});
const v3 = (completed = false, privacySeen = true) => ({
  ...v2(completed, privacySeen), version: 3, sessions: {},
});

async function acknowledge(page: Page) {
  await page.goto('./');
  const dialog = page.getByRole('dialog', { name: '你的学习数据保存在这台设备' });
  if (await dialog.isVisible()) {
    await expect(page.getByTestId('app-background')).toHaveAttribute('inert', '');
    await page.getByRole('button', { name: '我知道了' }).click();
    await expect(dialog).toBeHidden();
  }
}

async function expectNoPageOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

async function captureScreenshot(page: Page, testInfo: TestInfo, filename: string) {
  const target = updateEvidence
    ? path.resolve('docs/verification/screenshots', filename)
    : testInfo.outputPath('screenshots', filename);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await page.screenshot({ path: target, fullPage: true, animations: 'disabled' });
}

test('home has healthy navigation, assets, responsive layout, and evidence screenshot', async ({ page }, testInfo) => {
  await acknowledge(page);
  await expect(page.getByRole('heading', { name: '西游编程记', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('button', { name: /家长周报/ })).toBeVisible();
  await expectNoPageOverflow(page);
  const responses = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => (entry as PerformanceResourceTiming).name));
  expect(responses.filter(url => url.includes('/assets/')).length).toBeGreaterThan(0);
  expect(responses.some(url => url.endsWith('.png'))).toBe(false);
  if (!testInfo.project.name.includes('firefox')) {
    const width = page.viewportSize()!.width;
    if ([390, 768, 1440].includes(width)) await captureScreenshot(page, testInfo, `foundation-home-${width}.png`);
  }
});

test('320px home, first mission and parent PIN never overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await acknowledge(page);
  await expectNoPageOverflow(page);
  await page.getByRole('button', { name: /(开始第一关|继续今日闯关)/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('龙宫求兵');
  await expectNoPageOverflow(page);
  await page.goto('/xiyou-programming-journey/#/parent');
  await expect(page.getByLabel('家长 PIN')).toBeVisible();
  await expectNoPageOverflow(page);
});

test('child failure, real Blockly success, persistence, export and strict imports', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await acknowledge(page);
  await page.getByRole('button', { name: /(开始第一关|继续今日闯关)/ }).click();
  await expect(page.locator('.blockly-host')).toBeVisible({ timeout: 3000 });
  await page.getByRole('button', { name: '加入：请求兵器' }).click();
  await page.getByRole('button', { name: '加入：进入龙宫' }).click();
  await page.getByRole('button', { name: '加入：试用兵器' }).click();
  await page.getByRole('button', { name: '执行战斗指令' }).click();
  await expect(page.getByRole('alert').filter({ hasText: '悟空还在龙宫外' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeHidden();
  await page.getByRole('button', { name: '回到问题积木' }).click();
  await page.getByRole('button', { name: '上移：进入龙宫' }).click();
  await page.getByRole('button', { name: '删除：试用兵器' }).click();
  await page.getByRole('button', { name: '加入：试用兵器' }).click();
  await page.getByRole('button', { name: '执行战斗指令' }).click();
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  if (testInfo.project.name === 'desktop-chromium-1440x1024') await captureScreenshot(page, testInfo, 'foundation-mission-1440.png');
  await page.getByRole('button', { name: '回成长地图' }).click();
  await page.reload();
  await expect(page.getByText('1/30 关已完成')).toBeVisible();
  await page.goto('/xiyou-programming-journey/#/parent');
  await expect(page.getByRole('heading', { name: '家长周报', level: 1 })).toBeFocused();
  await page.getByLabel('家长 PIN').fill('2580');
  await page.getByLabel('家长 PIN').press('Enter');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出进度' }).click();
  await downloadPromise;
  if (testInfo.project.name === 'desktop-chromium-1440x1024') await captureScreenshot(page, testInfo, 'foundation-parent-1440.png');
  const fileChooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '导入进度' }).focus();
  await page.keyboard.press('Enter');
  await (await fileChooser).setFiles({ name: 'v1.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(v1(true))) });
  await expect(page.getByText('导入成功：已将 V1 升级为 V3。')).toBeVisible();
  const before = await page.evaluate(key => localStorage.getItem(key), currentKey);
  const input = page.getByLabel('选择进度文件');
  await input.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
  await expect(page.getByText(/导入失败：进度文件无法读取/)).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), currentKey)).toBe(before);
});

test('snapshot recovery preserves corrupt source and exposes download', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(({ currentKey, snapshotKey, snapshot }) => { localStorage.setItem(currentKey, '{bad'); localStorage.setItem(snapshotKey, JSON.stringify(snapshot)); }, { currentKey, snapshotKey, snapshot: v3(true) });
  await page.reload();
  await expect(page.getByText(/(snapshot|快照|恢复)/i).first()).toBeVisible();
  const close = page.getByRole('button', { name: '关闭进度提示' });
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(close).toBeHidden();
  await expect(page.getByRole('heading', { name: '西游编程记', level: 1 })).toBeFocused();
  await expect(page.getByTestId('app-background')).not.toHaveAttribute('inert', '');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).recovery.source, currentKey)).toBe('snapshot');
  const envelope = await page.evaluate(key => localStorage.getItem(key), corruptKey);
  expect(envelope).not.toBeNull();
  await page.reload();
  await expect(page.getByText('有一份存档信息需要家长查看')).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).recovery.source, currentKey)).toBe('snapshot');
  expect(await page.evaluate(key => localStorage.getItem(key), corruptKey)).toBe(envelope);
  await page.goto('/xiyou-programming-journey/#/parent');
  await expect(page.getByRole('heading', { name: '家长周报', level: 1 })).toBeFocused();
  await page.getByLabel('家长 PIN').fill('2580');
  await page.getByLabel('家长 PIN').press('Enter');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载损坏原文' }).click();
  const download = await downloaded;
  const downloadedPath = await download.path();
  expect(downloadedPath).not.toBeNull();
  expect(fs.readFileSync(downloadedPath!, 'utf8')).toBe(envelope);
  expect(await page.evaluate(key => localStorage.getItem(key), corruptKey)).toBe(envelope);
});

test('keyboard-only PIN, hint and clear cancellation preserve focus isolation', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: '我知道了' })).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /(开始第一关|继续今日闯关)/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/mission\/w1-m1$/);
  await expect(page.getByRole('heading', { name: '龙宫求兵', level: 1 })).toBeFocused();
  await page.getByRole('button', { name: '观察提示' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.hint-panel p').nth(1)).toBeVisible();
  await page.goto('/xiyou-programming-journey/#/parent');
  await expect(page.getByRole('heading', { name: '家长周报', level: 1 })).toBeFocused();
  await page.getByLabel('家长 PIN').focus();
  for (const key of ['2', '5', '8', '0']) await page.keyboard.press(key);
  await expect(page.getByLabel('家长 PIN')).toHaveValue('2580');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '清空学习数据' }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByTestId('parent-data-background')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '清空学习数据' })).toBeFocused();
});

test('parent backup-and-clear resets to initial V3 and reopens privacy with focus', async ({ page }) => {
  await acknowledge(page);
  await page.goto('/xiyou-programming-journey/#/parent');
  await expect(page.getByRole('heading', { name: '家长周报', level: 1 })).toBeFocused();
  await page.getByLabel('家长 PIN').fill('2580');
  await page.getByLabel('家长 PIN').press('Enter');
  await page.getByRole('button', { name: '清空学习数据' }).click();
  await page.getByLabel('输入“清空”以确认').fill('清空');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '备份并清空' }).click();
  await downloaded;
  await expect(page.getByRole('button', { name: '我知道了' })).toBeFocused();
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), currentKey);
  expect(stored.version).toBe(3); expect(stored.missions).toEqual({}); expect(stored.sessions).toEqual({}); expect(stored.privacy.localDataNoticeSeen).toBe(false);
});

test('unlocked Python and AI tools load real editors without page overflow', async ({ page, browserName }) => {
  const missions: Record<string, object> = {};
  for (let week = 1; week <= 5; week++) for (let mission = 1; mission <= 5; mission++) missions[`w${week}-m${mission}`] = { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: '2026-07-12T00:00:00.000Z' };
  missions['w6-m1'] = { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: '2026-07-12T00:00:00.000Z' };
  await acknowledge(page);
  await page.goto('/xiyou-programming-journey/#/parent');
  await expect(page.getByRole('heading', { name: '家长周报', level: 1 })).toBeFocused();
  await page.getByLabel('家长 PIN').fill('2580');
  await page.getByLabel('家长 PIN').press('Enter');
  await expect(page.getByRole('button', { name: '导入进度' })).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '导入进度' }).focus();
  await page.keyboard.press('Enter');
  await (await chooser).setFiles({ name: 'mode-fixture-v2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...v2(), missions })) });
  await expect(page.getByText('导入成功：已将 V2 升级为 V3。')).toBeVisible();
  await page.goto('/xiyou-programming-journey/#/mission/w4-m2');
  const pythonPageUrl = page.url();
  healthPhase = 'python-runtime';
  healthOwnerUrl = pythonPageUrl;
  allowHealth = event => expectedFontNavigationAbort(event) || expectedMediaNavigationAbort(event) || expectedBlocklyNavigationAbort(event)
    || isAllowedPythonHealth(event, pythonPageUrl, browserName);
  expect(isAllowedPythonHealth({ kind: 'console', url: pythonPageUrl, detail: 'uncaught exception: undefined extra', phase: 'python-runtime' }, pythonPageUrl, 'firefox')).toBe(false);
  expect(isAllowedPythonHealth({ kind: 'console', url: pythonPageUrl, detail: 'uncaught exception: undefined', phase: 'normal' }, pythonPageUrl, 'firefox')).toBe(false);
  expect(isAllowedPythonHealth({ kind: 'requestfailed', url: 'https://cdn.jsdelivr.net/pyodide/latest/full/pyodide.mjs', detail: 'failed', phase: 'python-runtime' }, pythonPageUrl, browserName)).toBe(false);
  await expect(page.locator('.cm-editor')).toBeVisible({ timeout: 3000 });
  await page.getByRole('button', { name: '运行 Python' }).click();
  await expect(page.locator('.console pre')).not.toHaveText('点击运行，看看代码会说什么。', { timeout: 4000 });
  const pythonOutput = (await page.locator('.console pre').textContent())?.trim();
  if (pythonOutput === '白骨精') await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  else expect(pythonOutput).toBe('运行环境超过 3 秒未就绪，已安全停止。请检查网络后再试。');
  await expectNoPageOverflow(page);
  await page.waitForTimeout(500);
  await page.goto('/xiyou-programming-journey/#/mission/w6-m2');
  await expect(page.locator('.ai-lab')).toBeVisible({ timeout: 3000 });
  await expectNoPageOverflow(page);
});

test('lazy tool failure is visible quickly and reload recovers', async ({ page, browserName }) => {
  let fail = true; let failedAt = 0; let target503Url: string | null = null;
  healthPhase = 'lazy-target-503';
  await page.route('**/assets/BlocklyWorkspace-*.js', async route => {
    if (fail) {
      failedAt = Date.now();
      if (blocklyWorkspaceChunk.test(route.request().url())) target503Url = route.request().url();
      await route.fulfill({ status: 503, headers: { 'cache-control': 'no-store' }, body: 'unavailable' });
    }
    else await route.continue();
  });
  await acknowledge(page);
  await page.getByRole('button', { name: /(开始第一关|继续今日闯关)/ }).click();
  await expect(page.getByRole('alert')).toContainText('任务工具加载失败', { timeout: 1000 });
  expect(Date.now() - failedAt).toBeLessThanOrEqual(1000);
  expect(target503Url).not.toBeNull();
  allowHealth = event => expectedFontNavigationAbort(event) || expectedMediaNavigationAbort(event) || expectedBlocklyNavigationAbort(event)
    || isAllowedLazyFailure(event, target503Url, browserName)
    || (event.url === target503Url && ((event.kind === 'http' && event.status === 503) || event.kind === 'requestfailed'));
  const knownTarget = `${new URL(page.url()).origin}/assets/BlocklyWorkspace-known.js`;
  const knownEntry = `${new URL(page.url()).origin}/assets/index-known.js`;
  expect(isAllowedLazyFailure({ kind: 'console', url: page.url(), detail: 'unrelated console error', phase: 'lazy-target-503' }, knownTarget, browserName)).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownEntry, detail: 'Error', phase: 'lazy-target-503' }, knownTarget, 'chromium')).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'console', url: 'https://example.com/assets/index-unrelated.js', detail: 'Error', phase: 'lazy-target-503' }, knownTarget, 'firefox')).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'console', url: 'https://example.com/assets/BlocklyWorkspace-known.js', detail: 'Failed to load resource: the server responded with a status of 503', phase: 'lazy-target-503' }, knownTarget, 'chromium')).toBe(false);
  const resource503 = 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)';
  expect(isAllowedLazyFailure({ kind: 'console', url: knownTarget, detail: resource503, phase: 'lazy-target-503' }, knownTarget, 'webkit')).toBe(true);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownTarget, detail: `${resource503} unrelated suffix`, phase: 'lazy-target-503' }, knownTarget, 'chromium')).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownTarget, detail: resource503, phase: 'normal' }, knownTarget, 'chromium')).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'pageerror', url: knownTarget, detail: 'Failed to load resource: the server responded with a status of 503', phase: 'lazy-target-503' }, knownTarget, 'chromium')).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownTarget, detail: 'Failed to load resource: the server responded with a status of 503', phase: 'lazy-target-503' }, null, 'chromium')).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownEntry, detail: `Failed to fetch dynamically imported module: ${knownTarget}`, phase: 'lazy-target-503' }, knownTarget, 'chromium')).toBe(true);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownEntry, detail: `TypeError: Failed to fetch dynamically imported module: ${knownTarget}`, phase: 'lazy-target-503' }, knownTarget, 'chromium')).toBe(true);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownEntry, detail: 'Failed to fetch dynamically imported module: /assets/BlocklyWorkspace-near.js', phase: 'lazy-target-503' }, knownTarget, 'chromium')).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownEntry, detail: `Failed to fetch dynamically imported module: ${knownTarget} unrelated suffix`, phase: 'lazy-target-503' }, knownTarget, 'chromium')).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownEntry, detail: `TypeError: Failed to fetch dynamically imported module: ${knownTarget} unrelated suffix`, phase: 'lazy-target-503' }, knownTarget, 'chromium')).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownEntry, detail: 'TypeError: Importing a module script failed.', phase: 'lazy-target-503' }, knownTarget, 'webkit')).toBe(true);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownEntry, detail: 'Error', phase: 'lazy-target-503' }, knownTarget, 'webkit')).toBe(false);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownEntry, detail: 'Error', phase: 'lazy-target-503' }, knownTarget, 'firefox')).toBe(true);
  expect(isAllowedLazyFailure({ kind: 'console', url: knownEntry, detail: 'TypeError: Importing a module script failed.', phase: 'lazy-target-503' }, knownTarget, 'firefox')).toBe(false);
  fail = false;
  await page.getByRole('button', { name: '重新加载页面' }).click();
  await expect(page).toHaveURL(/tool-retry=/);
  const recoveredPage = await page.context().newPage();
  const recoveredHealth: HealthEvent[] = [];
  recoveredPage.on('console', message => { if (message.type() === 'error') recoveredHealth.push({ kind: 'console', url: message.location().url || recoveredPage.url(), detail: message.text() }); });
  recoveredPage.on('pageerror', error => recoveredHealth.push({ kind: 'pageerror', url: recoveredPage.url(), detail: error.message }));
  recoveredPage.on('requestfailed', request => recoveredHealth.push({ kind: 'requestfailed', url: request.url(), detail: request.failure()?.errorText ?? 'unknown' }));
  recoveredPage.on('response', response => { if (response.status() >= 400) recoveredHealth.push({ kind: 'http', url: response.url(), status: response.status(), detail: response.statusText() }); });
  await recoveredPage.goto(page.url());
  await expect(recoveredPage.locator('.blockly-host')).toBeVisible({ timeout: 8000 });
  await recoveredPage.waitForLoadState('networkidle');
  expect(recoveredHealth, 'recovered clean tab browser health').toEqual([]);
  await recoveredPage.close();
});

test('persistent reduced motion and mute settings reach visible controls and real scene branch', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await acknowledge(page);
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true');
  await page.getByRole('button', { name: '使用普通动画' }).click();
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'false');
  await page.reload();
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'false');
  await page.getByRole('button', { name: '减弱动画' }).click();
  await page.reload();
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true');
  await page.getByRole('button', { name: '关闭声音' }).click();
  await expect(page.getByRole('button', { name: '开启声音' })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).settings.muted, currentKey)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: '开启声音' })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).settings.muted, currentKey)).toBe(true);
  await page.getByRole('button', { name: /(开始第一关|继续今日闯关)/ }).click();
  await expect(page.locator('.game-scene')).toHaveAttribute('data-motion-mode', 'reduced');
  if (test.info().project.name.includes('mobile')) {
    const boxes = await page.locator('button:visible').evaluateAll(buttons => buttons.map(button => button.getBoundingClientRect()).map(({ width, height }) => ({ width, height })));
    expect(boxes.filter(box => box.width < 44 || box.height < 44)).toEqual([]);
  }
});

test('GitHub Pages base path, not-found behavior, and transfer budget', async ({ page }) => {
  const responses: { url: string; status: number }[] = [];
  const responseBodies: Promise<{ url: string; bytes?: number; required: boolean; error?: string }>[] = [];
  page.on('response', response => responses.push({ url: response.url(), status: response.status() }));
  page.on('response', response => {
    if (response.status() >= 300 || !['document', 'script', 'stylesheet', 'image', 'font'].includes(response.request().resourceType())) return;
    const required = new URL(response.url()).origin === 'http://127.0.0.1:4173';
    responseBodies.push(response.body()
      .then(body => ({ url: response.url(), bytes: body.byteLength, required }))
      .catch(error => ({ url: response.url(), required, error: error instanceof Error ? error.message : String(error) })));
  });
  await acknowledge(page);
  await page.waitForLoadState('networkidle');
  const bodyResults = await Promise.all(responseBodies);
  expect(bodyResults.filter(result => result.required && result.error), 'all required local response bodies must be measurable').toEqual([]);
  const homeBytes = new Map(bodyResults.filter(result => result.bytes !== undefined).map(result => [result.url, result.bytes!]));
  const measuredBytes = [...homeBytes.values()].reduce((sum, bytes) => sum + bytes, 0);
  expect([...homeBytes.keys()].some(url => url.endsWith('.png'))).toBe(false);
  expect(measuredBytes).toBeLessThanOrEqual(650 * 1024);
  await page.goto('/xiyou-programming-journey/#/route-that-does-not-exist');
  await expect(page.getByRole('heading', { name: '西游编程记', level: 1 })).toBeVisible();
  expect(responses.filter(item => item.url.includes('/xiyou-programming-journey/')).every(item => item.status < 400)).toBe(true);
  if (test.info().project.name === 'desktop-chromium-1440x1024') {
    await page.goto('./');
    const transfer = await page.evaluate(() => performance.getEntriesByType('resource').reduce((sum, entry) => sum + ((entry as PerformanceResourceTiming).transferSize || (entry as PerformanceResourceTiming).encodedBodySize || 0), 0));
    const metricsPath = test.info().outputPath('metrics', 'home-transfer.json');
    fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
    fs.writeFileSync(metricsPath, JSON.stringify({ transferBytes: transfer, responseBodyBytes: measuredBytes, urls: [...homeBytes.keys()] }));
  }
});
