import { expect, test, type Page } from '@playwright/test';

const currentKey = 'xiyou-programming-progress-v3';
const snapshotKey = 'xiyou-programming-progress-snapshot-v3';
const revisionKey = 'xiyou-programming-progress-revision-v3';
const writeLockName = 'xiyou-programming-progress-v3-write';
const TEST_PARENT_ACCESS = 'access-v1:cf7667b114bf7a735116fc8439f0d17f3213159c48b22be56376521fbbc5cbb1:678bd461a82e086d3332d9c0f72cfae199f75eab78fba024dd8d28acd1702e27';

const initial = {
  version: 3, schemaRevision: 1, learnerName: '双页孩子', missions: {},
  settings: { muted: false, reducedMotion: false, reducedMotionOverride: false, parentPin: TEST_PARENT_ACCESS },
  privacy: { localDataNoticeSeen: true }, recovery: { lastRecoveredAt: null, source: null },
  sessions: {}, savedAt: '2026-07-15T00:00:00.000Z',
};

async function revision(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), revisionKey);
}

test('@storage @full serializes two tabs, exposes conflict recovery, and prevents stale revival after clear', async ({ context, page, browserName }) => {
  await page.goto('./');
  await page.evaluate(({ currentKey, revisionKey, initial }) => {
    localStorage.clear();
    localStorage.setItem(currentKey, JSON.stringify(initial));
    localStorage.setItem(revisionKey, '0');
  }, { currentKey, revisionKey, initial });
  await page.reload();
  const stale = await context.newPage();
  await stale.goto('./');

  if (browserName === 'chromium') {
    expect(await page.evaluate(() => typeof navigator.locks?.request)).toBe('function');
  }

  await page.getByRole('button', { name: '减弱动画' }).click();
  await expect.poll(() => revision(page)).toBe('1');
  await expect(stale.getByRole('alert')).toContainText('其他标签页已更新，已暂停保存');
  await expect(stale.getByRole('button', { name: '重试保存' })).toHaveCount(0);

  const download = stale.waitForEvent('download');
  await stale.getByRole('button', { name: '下载本页备份' }).click();
  await download;
  await stale.getByRole('button', { name: '载入其他标签页版本' }).click();
  await expect(stale.getByRole('button', { name: '使用普通动画' })).toBeVisible();

  await stale.getByRole('button', { name: /声音/ }).click();
  await expect.poll(() => revision(stale)).toBe('2');
  await expect(page.getByRole('alert')).toContainText('其他标签页已更新');
  await page.getByRole('button', { name: '载入其他标签页版本' }).click();

  await page.getByRole('button', { name: '家长周报' }).click();
  await page.getByLabel('家长 PIN').fill('4826');
  await page.getByRole('button', { name: '进入周报' }).click();
  await page.getByRole('button', { name: '清空学习数据' }).click();
  await page.getByLabel('输入“清空”以确认').fill('清空');
  const clearDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: '备份并清空' }).click();
  await clearDownload;
  await expect.poll(() => revision(page)).toBe('3');

  await expect(stale.getByRole('alert')).toContainText('其他标签页已更新');
  const before = await stale.evaluate((key) => localStorage.getItem(key), currentKey);
  await stale.getByRole('button', { name: /声音/ }).click();
  await expect.poll(() => stale.evaluate((key) => localStorage.getItem(key), currentKey)).toBe(before);
  expect(JSON.parse(before!)).toMatchObject({ learnerName: '小行者', missions: {}, sessions: {} });
  await stale.close();
});

test('@storage gives exactly one winner to simultaneous stale writers under the Web Lock', async ({ context, page }) => {
  await page.goto('./');
  await page.evaluate(({ currentKey, revisionKey, initial }) => {
    localStorage.clear();
    localStorage.setItem(currentKey, JSON.stringify(initial));
    localStorage.setItem(revisionKey, '0');
  }, { currentKey, revisionKey, initial });
  await page.reload();
  const second = await context.newPage();
  await second.goto('./');
  const holder = await context.newPage();
  await holder.goto('./');
  expect(await page.evaluate(() => typeof navigator.locks?.request)).toBe('function');

  await holder.evaluate((name) => {
    const state = window as Window & { __progressLockHeld?: boolean; __releaseProgressLock?: () => void };
    let release!: () => void;
    const released = new Promise<void>((resolve) => { release = resolve; });
    state.__releaseProgressLock = release;
    void navigator.locks.request(name, async () => {
      state.__progressLockHeld = true;
      await released;
    });
  }, writeLockName);
  await expect.poll(() => holder.evaluate(() => (window as Window & { __progressLockHeld?: boolean }).__progressLockHeld)).toBe(true);

  await Promise.all([
    page.getByRole('button', { name: '减弱动画' }).click(),
    second.getByRole('button', { name: '关闭声音' }).click(),
  ]);
  await expect.poll(() => holder.evaluate(async (name) => (
    (await navigator.locks.query()).pending.filter((request) => request.name === name).length
  ), writeLockName)).toBe(2);
  expect(await revision(holder)).toBe('0');

  await holder.evaluate(() => (window as Window & { __releaseProgressLock?: () => void }).__releaseProgressLock?.());
  await expect.poll(() => revision(page)).toBe('1');
  await expect.poll(async () => (
    await page.getByRole('alert').count() + await second.getByRole('alert').count()
  )).toBe(1);
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), currentKey);
  expect(
    (stored.settings.reducedMotion === true && stored.settings.muted === false)
      || (stored.settings.reducedMotion === false && stored.settings.muted === true),
  ).toBe(true);
  await holder.close();
  await second.close();
});

test('@storage fails closed in two independent pages when Web Locks are unavailable', async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
  });
  await page.goto('./');
  expect(await page.evaluate(() => typeof navigator.locks)).toBe('undefined');
  await page.evaluate(({ currentKey, revisionKey, initial }) => {
    localStorage.clear();
    localStorage.setItem(currentKey, JSON.stringify(initial));
    localStorage.setItem(revisionKey, '0');
  }, { currentKey, revisionKey, initial });
  await page.reload();
  const second = await context.newPage();
  await second.goto('./');
  expect(await second.evaluate(() => typeof navigator.locks)).toBe('undefined');

  await Promise.all([
    page.getByRole('button', { name: '减弱动画' }).click(),
    second.getByRole('button', { name: '关闭声音' }).click(),
  ]);

  await expect(page.getByRole('alert')).toContainText('浏览器不支持可靠的跨标签页存档锁');
  await expect(second.getByRole('alert')).toContainText('浏览器不支持可靠的跨标签页存档锁');
  expect(await revision(page)).toBe('0');
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), currentKey);
  expect(stored.settings).toMatchObject({ reducedMotion: false, muted: false });
  await second.close();
});

test('@storage exposes conflict recovery when CAS detects staleness without a storage event', async ({ context, page }) => {
  await page.goto('./');
  await page.evaluate(({ currentKey, revisionKey, initial }) => {
    localStorage.clear();
    localStorage.setItem(currentKey, JSON.stringify(initial));
    localStorage.setItem(revisionKey, '0');
  }, { currentKey, revisionKey, initial });
  await page.reload();
  const stale = await context.newPage();
  await stale.addInitScript(() => {
    const nativeAddEventListener = window.addEventListener;
    Object.defineProperty(window, 'addEventListener', {
      configurable: true,
      value(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
        if (type !== 'storage') nativeAddEventListener.call(window, type, listener, options);
      },
    });
  });
  await stale.goto('./');

  await page.getByRole('button', { name: '减弱动画' }).click();
  await expect.poll(() => revision(page)).toBe('1');
  await expect(stale.getByRole('alert')).toHaveCount(0);
  await stale.getByRole('button', { name: '关闭声音' }).click();

  await expect(stale.getByRole('alert')).toContainText('其他标签页已更新，已暂停保存');
  await expect(stale.getByRole('button', { name: '下载本页备份' })).toBeVisible();
  await expect(stale.getByRole('button', { name: '载入其他标签页版本' })).toBeVisible();
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), currentKey);
  expect(stored.settings).toMatchObject({ reducedMotion: true, muted: false });
  await stale.close();
});

test('@storage keeps a visible parent entry recovery action when its lazy chunk returns 503', async ({ page }) => {
  let fail = true;
  let target: string | null = null;
  await page.route('**/assets/ParentAccessGate-*.js', async (route) => {
    target = route.request().url();
    if (fail) await route.fulfill({ status: 503, headers: { 'cache-control': 'no-store' }, body: 'unavailable' });
    else await route.continue();
  });
  await page.goto('./#/parent');
  await page.evaluate(({ currentKey, revisionKey, initial }) => {
    localStorage.clear();
    localStorage.setItem(currentKey, JSON.stringify(initial));
    localStorage.setItem(revisionKey, '0');
  }, { currentKey, revisionKey, initial });
  await page.reload();

  await expect(page.getByRole('alert')).toContainText('家长入口加载失败');
  await expect(page.getByRole('button', { name: '西游编程记' })).toBeVisible();
  await expect(page.getByRole('button', { name: '重新加载页面' })).toBeVisible();
  expect(target).not.toBeNull();

  fail = false;
  await page.getByRole('button', { name: '重新加载页面' }).click();
  await expect(page).toHaveURL(/section-retry=/);
  await expect(page.getByLabel('家长 PIN')).toBeVisible();
});

test('@storage keeps a visible recovery action when the recovery notice lazy chunk returns 503', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(({ currentKey, snapshotKey, revisionKey, initial }) => {
    localStorage.clear();
    localStorage.setItem(currentKey, '{broken current');
    localStorage.setItem(snapshotKey, JSON.stringify(initial));
    localStorage.setItem(revisionKey, '0');
  }, { currentKey, snapshotKey, revisionKey, initial });
  let fail = true;
  let target: string | null = null;
  await page.route('**/assets/RecoveryNotice-*.js', async (route) => {
    target = route.request().url();
    if (fail) await route.fulfill({ status: 503, headers: { 'cache-control': 'no-store' }, body: 'unavailable' });
    else await route.continue();
  });
  await page.reload();

  await expect(page.getByRole('alert')).toContainText('存档恢复提示加载失败');
  await expect(page.getByRole('heading', { name: '西游编程记' })).toBeVisible();
  await expect(page.getByRole('button', { name: '重新加载页面' })).toBeVisible();
  expect(target).not.toBeNull();

  fail = false;
  await page.getByRole('button', { name: '重新加载页面' }).click();
  await expect(page).toHaveURL(/section-retry=/);
  await expect(page.getByText('有一份存档信息需要家长查看')).toBeVisible();
});

test('@storage reloads external corruption metadata and preserves the damaged source for parent download', async ({ context, page }) => {
  await page.goto('./');
  await page.evaluate(({ currentKey, revisionKey, initial }) => {
    localStorage.clear();
    localStorage.setItem(currentKey, JSON.stringify(initial));
    localStorage.setItem(revisionKey, '0');
  }, { currentKey, revisionKey, initial });
  await page.reload();
  const writer = await context.newPage();
  await writer.goto('./');

  const snapshot = { ...initial, learnerName: '外部快照孩子' };
  const corrupt = '{external broken current';
  await writer.evaluate(({ currentKey, snapshotKey, revisionKey, snapshot, corrupt }) => {
    localStorage.setItem(currentKey, corrupt);
    localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
    localStorage.setItem(revisionKey, '1');
  }, { currentKey, snapshotKey, revisionKey, snapshot, corrupt });

  await expect(page.getByRole('alert')).toContainText('其他标签页已更新');
  await page.getByRole('button', { name: '载入其他标签页版本' }).click();
  await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
  await expect(page.getByText('外部快照孩子')).toBeVisible();
  await page.getByRole('button', { name: '家长周报' }).click();
  await page.getByLabel('家长 PIN').fill('4826');
  await page.getByRole('button', { name: '进入周报' }).click();
  await expect(page.getByRole('button', { name: '下载损坏原文' })).toBeVisible();
  const downloadStarted = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载损坏原文' }).click();
  const download = await downloadStarted;
  const path = await download.path();
  expect(path).not.toBeNull();
  const contents = await (await import('node:fs/promises')).readFile(path!, 'utf8');
  expect(JSON.parse(contents).current).toBe(corrupt);
  await writer.close();
});
