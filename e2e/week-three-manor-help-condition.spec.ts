import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { completeMission, createInitialProgress, serializeProgress } from '../src/progress/progress';
import { WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs';

const CURRENT_KEY = 'xiyou-programming-progress-v3';
const REVISION_KEY = 'xiyou-programming-progress-revision-v3';
const MODE_KEY = 'xiyou-test-storage-mode';
type HealthEvent = { kind: 'console' | 'page' | 'request' | 'response'; url: string; detail: string };
const healthEvents = new WeakMap<Page, HealthEvent[]>();
let expectedFailureUrl: string | null = null;

function prerequisite(testInfo: TestInfo): string {
  let progress = createInitialProgress();
  const standard = /motion parity/i.test(testInfo.title);
  progress = {
    ...progress,
    settings: {
      ...progress.settings,
      muted: !standard,
      reducedMotion: !standard,
      reducedMotionOverride: !standard,
    },
    privacy: { localDataNoticeSeen: true },
  };
  for (const missionId of ['w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5', 'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4', 'w2-m5']) {
    progress = completeMission(progress, missionId, { stars: 3, hintsUsed: 0 });
  }
  return serializeProgress(progress);
}

function expectedFailure(urlOrDetail: string): boolean { return expectedFailureUrl !== null && (urlOrDetail === expectedFailureUrl || urlOrDetail.includes(expectedFailureUrl)); }

function attachHealth(page: Page) {
  const events: HealthEvent[] = [];
  healthEvents.set(page, events);
  page.on('console', (message) => {
    if (message.type() === 'error' && !expectedFailure(message.location().url) && !expectedFailure(message.text())) {
      events.push({ kind: 'console', url: message.location().url || page.url(), detail: message.text() });
    }
  });
  page.on('pageerror', (error) => events.push({ kind: 'page', url: page.url(), detail: error.message }));
  page.on('requestfailed', (request) => {
    const detail = request.failure()?.errorText ?? '';
    if (expectedFailure(request.url()) || (request.url() === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(detail))) return;
    events.push({ kind: 'request', url: request.url(), detail });
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !expectedFailure(response.url())) {
      events.push({ kind: 'response', url: response.url(), detail: `HTTP ${response.status()}` });
    }
  });
}

async function gotoManor(page: Page) {
  await page.goto('./#/mission/w3-m1');
  await expect(page.getByRole('heading', { name: '庄上求助', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: '庄上求助代码执行场景' })).toHaveAttribute('data-scene-ready', 'true');
  await expect(page.locator('.advanced-blockly-host svg.blocklySvg')).toBeVisible();
}

async function press(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  await expect(button).toBeEnabled();
  await button.click();
}

async function correctCondition(page: Page, keyboard = false) {
  const button = page.getByRole('button', { name: '换成：口信是在明确请求降妖帮助', exact: true });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await button.press('Enter'); } else await button.click();
  await expect(page.locator('.week-three-manor-help-workspace > [role="status"]')).toHaveText('积木已保存');
  await expect(page.getByRole('list', { name: '庄上求助真实积木连接' })).toContainText('口信是在明确请求降妖帮助');
}

async function run(page: Page, keyboard = false) {
  const button = page.getByRole('button', { name: '执行两张口信', exact: true });
  await expect(button).toBeEnabled();
  if (keyboard) { await button.focus(); await expect(button).toBeFocused(); await button.press('Enter'); } else await button.click();
}

async function complete(page: Page, keyboard = false) {
  await correctCondition(page, keyboard);
  await run(page, keyboard);
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
}

async function attach(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}-${testInfo.project.name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(`${name}-${testInfo.project.name}.png`, { path, contentType: 'image/png' });
}

async function storedManorWorkspace(page: Page) {
  return page.evaluate(({ currentKey, revisionKey }) => {
    const progress = JSON.parse(localStorage.getItem(currentKey)!);
    return {
      revision: Number(localStorage.getItem(revisionKey)),
      blocks: progress.sessions['w3-m1']?.workspace?.blocks?.map((block: { id: string; type: string }) => ({ id: block.id, type: block.type })) ?? [],
    };
  }, { currentKey: CURRENT_KEY, revisionKey: REVISION_KEY });
}

async function expectPersistedManorTypes(page: Page, afterRevision: number, types: string[]) {
  await expect.poll(async () => {
    const snapshot = await storedManorWorkspace(page);
    return snapshot.revision > afterRevision && types.every((type) => snapshot.blocks.some((block: { type: string }) => block.type === type));
  }).toBe(true);
}

test.describe('W3-M1 庄上求助条件观察', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    expectedFailureUrl = null;
    attachHealth(page);
    await page.addInitScript(({ currentKey, revisionKey, raw }) => {
      if (localStorage.getItem(currentKey) === null) {
        localStorage.setItem(currentKey, raw);
        localStorage.setItem(revisionKey, '0');
      }
    }, { currentKey: CURRENT_KEY, revisionKey: REVISION_KEY, raw: prerequisite(testInfo) });
  });

  test.afterEach(async ({ page }) => {
    expect(healthEvents.get(page), 'unexpected W3-M1 browser health events').toEqual([]);
  });

  test('@w3-m1-full @w3-m1-narrow child visibly distinguishes original help from the labelled non-canon practice message, saves, refreshes, and replays', async ({ page }, testInfo) => {
    await gotoManor(page);
    await expect(page.getByText('兼容指令序列')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: '原著情境', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: '练习情境·不改变原著', exact: true })).toBeVisible();
    const pixels = await page.locator('.advanced-blockly-host').screenshot();
    const variance = pixels.reduce((sum, byte) => sum + Math.abs(byte - 128), 0) / pixels.length;
    expect(variance).toBeGreaterThan(20);
    const geometry = await page.evaluate(() => {
      const viewport = document.querySelector<HTMLElement>('[data-testid="week-three-manor-help-sprite-viewport"]')!.getBoundingClientRect();
      const scene = document.querySelector<HTMLElement>('.week-three-manor-help-scene')!.getBoundingClientRect();
      const workspace = document.querySelector<HTMLElement>('[aria-label="庄上求助 Blockly 工作区"]')!.getBoundingClientRect();
      const host = document.querySelector<HTMLElement>('.advanced-blockly-host')!.getBoundingClientRect();
      const messages = document.querySelector<HTMLElement>('[aria-label="双情境口信"]')!.getBoundingClientRect();
      const cards = [...document.querySelectorAll<HTMLElement>('[aria-label="双情境口信"] article')].map((card) => card.getBoundingClientRect());
      return { scroll: document.documentElement.scrollWidth, body: document.body.scrollWidth, width: innerWidth, viewport, scene, workspace, host, messages, cards };
    });
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
    expect(geometry.body).toBeLessThanOrEqual(geometry.width);
    expect(geometry.viewport.left).toBeGreaterThanOrEqual(geometry.scene.left - 1);
    expect(geometry.viewport.right).toBeLessThanOrEqual(geometry.scene.right + 1);
    for (const box of [geometry.scene, geometry.workspace, geometry.host, geometry.messages]) {
      expect(box.width).toBeGreaterThan(200); expect(box.height).toBeGreaterThan(0);
    }
    for (const card of geometry.cards) { expect(card.width).toBeGreaterThan(100); expect(card.height).toBeGreaterThan(0); }
    const separated = (first: DOMRect, second: DOMRect) => first.right <= second.left + 1 || second.right <= first.left + 1 || first.bottom <= second.top + 1 || second.bottom <= first.top + 1;
    expect(separated(geometry.scene, geometry.workspace)).toBe(true);
    expect(separated(geometry.cards[0], geometry.cards[1])).toBe(true);
    if (geometry.width <= 900) { expect(geometry.scene.top).toBeLessThan(geometry.workspace.top); expect(geometry.workspace.bottom).toBeLessThanOrEqual(geometry.messages.top + 1); }
    else expect(geometry.scene.left).toBeLessThan(geometry.workspace.left);
    for (const name of ['执行两张口信', '换成：口信是在明确请求降妖帮助']) {
      const box = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44); expect(box?.height).toBeGreaterThanOrEqual(44);
    }

    await run(page);
    await expect(page.getByRole('alert')).toContainText('没有请求降妖帮助');
    const failureLayout = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
      return {
        width: innerWidth,
        workspace: box('[aria-label="庄上求助 Blockly 工作区"]'),
        messages: box('[aria-label="双情境口信"]'),
        feedback: box('.week-three-manor-help-experience > .battle-feedback'),
        fireEye: box('.week-three-manor-help-observation-action'),
        replay: box('.week-three-manor-help-experience > .workspace-actions'),
      };
    });
    expect(failureLayout.workspace.bottom).toBeLessThanOrEqual(failureLayout.messages.top + 1);
    expect(failureLayout.messages.bottom).toBeLessThanOrEqual(failureLayout.feedback.top + 1);
    expect(failureLayout.feedback.bottom).toBeLessThanOrEqual(failureLayout.fireEye.top + 1);
    expect(failureLayout.feedback.bottom).toBeLessThanOrEqual(failureLayout.replay.top + 1);
    if (failureLayout.width <= 520) expect(failureLayout.fireEye.bottom).toBeLessThanOrEqual(failureLayout.replay.top + 1);
    await attach(page, testInfo, 'manor-help-failure');
    const failed = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(failed.sessions['w3-m1']).toMatchObject({ totalRuns: 1, runtimeFailures: 1, lastRun: { completed: false, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } } });
    expect(failed.sessions['w3-m1'].scenarioResults.map((entry: { scenarioId: string; passed: boolean }) => [entry.scenarioId, entry.passed])).toEqual([
      ['canon-gaocai-help', true], ['practice-manor-directions', false],
    ]);
    expect(failed.missions['w3-m1'] ?? null).toBeNull();
    expect(failed.missionCompletionEvidence['w3-m1'] ?? null).toBeNull();

    await press(page, '火眼金睛·条件观察');
    await expect(page.getByRole('region', { name: '条件观察结果' })).toContainText('口信提到了高老庄');
    await expect(page.getByRole('region', { name: '条件观察结果' })).toContainText('真');
    await expect(page.getByRole('region', { name: '条件观察结果' })).toContainText('没有提出求助');
    const observed = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(observed.sessions['w3-m1'].conditionObservationUses).toHaveLength(1);
    expect(observed.sessions['w3-m1'].conditionObservationUses[0]).toMatchObject({
      snapshotId: failed.sessions['w3-m1'].failureSnapshot.snapshotId,
      workspace: failed.sessions['w3-m1'].workspace,
    });
    expect(observed.sessions['w3-m1'].workspace).toEqual(failed.sessions['w3-m1'].workspace);
    expect(observed.sessions['w3-m1'].lastTrace).toEqual(failed.sessions['w3-m1'].lastTrace);
    expect(observed.sessions['w3-m1'].scenarioResults).toEqual(failed.sessions['w3-m1'].scenarioResults);

    await correctCondition(page);
    await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await attach(page, testInfo, 'manor-help-success');
    const completed = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(completed.sessions['w3-m1']).toMatchObject({ totalRuns: 2, runtimeFailures: 1, lastRun: { completed: true } });
    expect(completed.sessions['w3-m1'].conditionObservationUses[0].workspace)
      .toEqual(failed.sessions['w3-m1'].workspace);
    expect(completed.sessions['w3-m1'].conditionObservationUses[0].workspace)
      .not.toEqual(completed.sessions['w3-m1'].workspace);
    expect(completed.sessions['w3-m1'].lastRun.scenarioResults.map((entry: { observedValue: boolean }) => entry.observedValue)).toEqual([true, false]);
    expect(completed.missions['w3-m1']).toMatchObject({ status: 'completed', stars: 3, hintsUsed: 0 });
    expect(completed.missionCompletionEvidence['w3-m1']).toMatchObject({ kind: 'formal-v3' });
    await expect(page.locator('[aria-label="庄上求助代码执行场景"]')).toHaveAttribute('data-state-cell', '3');

    await page.reload();
    await expect(page.getByRole('list', { name: '庄上求助真实积木连接' })).toContainText('口信是在明确请求降妖帮助');
    await expect(page.getByRole('button', { name: '重播最近一次' })).toBeEnabled();
    await press(page, '重播最近一次');
    const replayed = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(replayed.sessions['w3-m1'].totalRuns).toBe(2);
    expect(replayed.missions['w3-m1'].attempts).toBe(completed.missions['w3-m1'].attempts);
    expect(replayed.missionCompletionEvidence['w3-m1']).toEqual(completed.missionCompletionEvidence['w3-m1']);
    await attach(page, testInfo, 'manor-help-blockly');
  });

  test('@w3-m1-keyboard real Blockly action blocks can be deleted, repaired by keyboard helpers, and then run in Chromium and Firefox', async ({ page }) => {
    await gotoManor(page);
    const thenBlock = page.locator('.advanced-blockly-host .blocklyDraggable[data-id="manor-then"]');
    await expect(thenBlock).toBeVisible();
    await thenBlock.click(); await page.keyboard.press('Delete');
    await expect(thenBlock).toHaveCount(0);
    await expect(page.locator('.week-three-manor-help-workspace > [role="status"]')).toHaveText('积木连接待修复，修复后会保存');
    await run(page);
    await expect(page.getByText('两个分支都要有行动积木')).toBeVisible();
    await expect(page.getByRole('button', { name: '执行两张口信', exact: true })).toBeEnabled();
    const beforeThenRestore = (await storedManorWorkspace(page)).revision;
    const restoreThen = page.getByRole('button', { name: '恢复“主动应承”分支', exact: true });
    await restoreThen.focus(); await page.keyboard.press('Enter');
    await expectPersistedManorTypes(page, beforeThenRestore, ['w3_manor_accept_and_return_notice', 'w3_manor_continue_journey']);
    const elseBlock = page.locator('.advanced-blockly-host .blocklyDraggable[data-id="manor-else"]');
    await expect(elseBlock).toBeVisible();
    await elseBlock.click(); await page.keyboard.press('Delete');
    await expect(elseBlock).toHaveCount(0);
    await expect(page.locator('.week-three-manor-help-workspace > [role="status"]')).toHaveText('积木连接待修复，修复后会保存');
    await run(page);
    await expect(page.getByText('两个分支都要有行动积木')).toBeVisible();
    await expect(page.getByRole('button', { name: '执行两张口信', exact: true })).toBeEnabled();
    const beforeElseRestore = (await storedManorWorkspace(page)).revision;
    const restoreElse = page.getByRole('button', { name: '恢复“继续问路”分支', exact: true });
    await restoreElse.focus(); await page.keyboard.press('Enter');
    await expectPersistedManorTypes(page, beforeElseRestore, ['w3_manor_accept_and_return_notice', 'w3_manor_continue_journey']);
    const beforeConditionRepair = (await storedManorWorkspace(page)).revision;
    await correctCondition(page, true);
    await expectPersistedManorTypes(page, beforeConditionRepair, ['w3_manor_condition_explicit_demon_help']);
    await run(page, true);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    await expect(page.getByRole('button', { name: '继续下一关' })).toBeFocused();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w3-m1'].lastRun.completed, CURRENT_KEY)).toBe(true);
  });

  test('@w3-m1-storage draft-save fault visibly blocks execution until the same corrected graph is saved', async ({ page }) => {
    await gotoManor(page);
    await page.evaluate((key) => localStorage.setItem(key, 'fail-manor-draft'), MODE_KEY);
    await correctCondition(page);
    await expect(page.locator('.week-three-manor-help-experience .unsaved-session')).toContainText('本次学习记录尚未保存');
    await expect(page.getByText('这次积木更改还没有保存。')).toBeVisible();
    await expect(page.getByRole('button', { name: '执行两张口信' })).toBeDisabled();
    await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY);
    await press(page, '重试保存本次记录');
    await expect(page.getByRole('button', { name: '执行两张口信' })).toBeEnabled();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w3-m1'].lastRun, CURRENT_KEY)).toBeNull();
  });

  test('@w3-m1-storage run-save fault never plays, observes, or completes before visible retry', async ({ page }) => {
    await gotoManor(page); await correctCondition(page);
    await page.evaluate((key) => localStorage.setItem(key, 'fail-manor-session'), MODE_KEY);
    await run(page);
    await expect(page.getByRole('alert')).toContainText('本次学习记录尚未保存');
    await expect(page.getByRole('button', { name: '火眼金睛·条件观察' })).toHaveCount(0);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY);
    await press(page, '重试保存本次记录');
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  });

  test('@w3-m1-storage observation-save fault does not reveal facts before retry saves its single audit use', async ({ page }) => {
    await gotoManor(page); await run(page); await expect(page.getByRole('button', { name: '重播最近一次' })).toBeEnabled();
    await page.evaluate((key) => localStorage.setItem(key, 'fail-manor-observation'), MODE_KEY);
    await press(page, '火眼金睛·条件观察');
    await expect(page.locator('.week-three-manor-help-experience .unsaved-session')).toBeVisible();
    await expect(page.getByRole('region', { name: '条件观察结果' })).toHaveCount(0);
    await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY);
    await press(page, '重试保存本次记录');
    await expect(page.getByRole('region', { name: '条件观察结果' })).toBeVisible();
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w3-m1'].conditionObservationUses.length, CURRENT_KEY)).toBe(1);
  });

  test('@w3-m1-storage completion-save fault keeps W3-M2 locked and the formal proof absent until retry', async ({ page }) => {
    await gotoManor(page); await correctCondition(page);
    await page.evaluate((key) => localStorage.setItem(key, 'fail-manor-completion'), MODE_KEY);
    await run(page);
    await expect(page.getByRole('alert')).toContainText('通关待保存');
    await expect(page.getByRole('button', { name: '重试保存通关' })).toBeVisible();
    const pending = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(pending.missions['w3-m1'] ?? null).toBeNull(); expect(pending.missionCompletionEvidence['w3-m1'] ?? null).toBeNull();
    await page.evaluate((key) => localStorage.setItem(key, 'off'), MODE_KEY);
    await press(page, '重试保存通关');
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
  });

  test('@w3-m1-storage motion parity keeps the same semantics in standard unmuted and reduced muted modes', async ({ page }) => {
    await gotoManor(page);
    await expect(page.getByRole('img', { name: '庄上求助代码执行场景' })).toHaveAttribute('data-motion-mode', 'standard');
    await expect(page.getByRole('img', { name: '庄上求助代码执行场景' })).toHaveAttribute('data-muted', 'false');
    await complete(page);
    const standard = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w3-m1'].lastRun.scenarioResults, CURRENT_KEY);
    expect(standard.map((item: { passed: boolean }) => item.passed)).toEqual([true, true]);
  });

  test('@w3-m1-external stale tab cannot overwrite a winning visible graph and can download then load the other tab', async ({ page, context }) => {
    await gotoManor(page);
    const stale = await context.newPage(); attachHealth(stale);
    await stale.goto('./#/mission/w3-m1'); await expect(stale.getByRole('heading', { name: '庄上求助', exact: true })).toBeVisible();
    await correctCondition(page);
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w3-m1']?.workspace.blocks.some((block: { type: string }) => block.type === 'w3_manor_condition_explicit_demon_help') ?? false, CURRENT_KEY)).toBe(true);
    await expect(stale.getByText(/其他标签页已更新/).first()).toBeVisible();
    await stale.getByRole('button', { name: '换成：口信提到了高老庄', exact: true }).click();
    const recovery = stale.locator('.week-three-manor-help-experience .unsaved-session').filter({ hasText: '本次记录与其他标签页冲突' });
    await expect(recovery).toBeVisible();
    const download = stale.waitForEvent('download'); await recovery.getByRole('button', { name: '下载本页备份' }).click(); expect(await (await download).path()).not.toBeNull();
    await recovery.getByRole('button', { name: '载入其他标签页版本' }).click();
    await expect(stale.getByRole('list', { name: '庄上求助真实积木连接' })).toContainText('口信是在明确请求降妖帮助');
    await expect(stale.getByRole('button', { name: '执行两张口信' })).toBeEnabled();
    expect(healthEvents.get(stale), 'unexpected stale W3-M1 browser health events').toEqual([]);
    await stale.close();
  });

  test('@w3-m1-corrupt corrupted current progress preserves raw bytes and restores the snapshot session plus formal proof', async ({ page }) => {
    await gotoManor(page); await complete(page);
    const before = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    await page.evaluate((key) => localStorage.setItem(key, 'corrupt-manor-current'), MODE_KEY);
    await page.reload(); await expect(page.getByRole('heading', { name: '庄上求助', exact: true })).toBeVisible();
    const recovered = await page.evaluate((key) => ({ current: localStorage.getItem(key), corrupt: localStorage.getItem('xiyou-programming-progress-corrupt-v3') }), CURRENT_KEY);
    expect(JSON.parse(recovered.corrupt!).current).toBe('{broken w3-m1 current');
    expect(JSON.parse(recovered.current!).sessions['w3-m1']).toEqual(before.sessions['w3-m1']);
    expect(JSON.parse(recovered.current!).missionCompletionEvidence['w3-m1']).toEqual(before.missionCompletionEvidence['w3-m1']);
  });

  test('@w3-m1-parent parent report exposes stable ability, one observation, formal proof, weekly runs and export-import recovery', async ({ page }) => {
    await gotoManor(page); await run(page); await expect(page.getByRole('button', { name: '重播最近一次' })).toBeEnabled(); await press(page, '火眼金睛·条件观察'); await complete(page);
    await press(page, '回成长地图'); await press(page, '家长周报');
    await page.getByLabel('设置 4 位家长 PIN').fill('4826'); await page.getByLabel('确认家长 PIN').fill('4826'); await press(page, '创建家长 PIN');
    await page.getByLabel('我已安全保存恢复码').check(); await press(page, '确认已保存并进入');
    await expect(page.getByRole('region', { name: '火眼金睛学习能力' })).toContainText('已稳定');
    await expect(page.getByRole('region', { name: '火眼金睛学习能力' })).toContainText('主动观察 1 次');
    await expect(page.getByRole('region', { name: '火眼金睛学习能力' })).toContainText('庄上求助正式 Blockly 证明已保存');
    await expect(page.getByText('运行 2 次 · 调整 1 次')).toBeVisible();
    const download = page.waitForEvent('download'); await press(page, '导出进度'); const path = await (await download).path(); expect(path).not.toBeNull();
    const exported = JSON.parse(readFileSync(path!, 'utf8'));
    await press(page, '成长地图'); await press(page, '庄上求助'); await press(page, '换成：口信提到了高老庄');
    await press(page, '家长周报'); await page.getByLabel('家长 PIN').fill('4826'); await press(page, '进入周报');
    await page.getByLabel('选择进度文件').setInputFiles({ name: 'w3-m1-progress.json', mimeType: 'application/json', buffer: readFileSync(path!) });
    await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible();
    const restored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), CURRENT_KEY);
    expect(restored.sessions['w3-m1']).toEqual(exported.sessions['w3-m1']);
    expect(restored.missions['w3-m1']).toEqual(exported.missions['w3-m1']);
    expect(restored.missionCompletionEvidence['w3-m1']).toEqual(exported.missionCompletionEvidence['w3-m1']);
  });

  test('@w3-m1-cold formal W3-M1 stays within cold budget on every project and a missing mission image is 404', async ({ page, request }) => {
    const bodies: Array<Promise<number>> = [];
    page.on('response', (response) => { if (response.status() >= 200 && response.status() < 300) bodies.push(response.body().then((body) => body.length)); });
    await gotoManor(page);
    expect((await Promise.all(bodies)).reduce((sum, size) => sum + size, 0)).toBeLessThanOrEqual(WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES);
    expect((await request.get('/xiyou-programming-journey/assets/week-three-manor-help/not-found.webp', { headers: { accept: 'image/webp' } })).status()).toBe(404);
  });

  test('@w3-m1-asset-fault scene background 503 visibly retries and blocks completion until ready', async ({ page }) => {
    let failed = false;
    await page.route(/manor-help-background\.webp(?:\?.*)?$/, async (route) => {
      if (!new URL(route.request().url()).searchParams.has('retry')) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: 'synthetic manor asset failure' }); } else await route.continue();
    });
    await page.goto('./#/mission/w3-m1'); await expect.poll(() => failed).toBe(true);
    await expect(page.getByRole('alert')).toContainText('场景图片没有加载成功'); await correctCondition(page); await run(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    await press(page, '重试加载场景图片'); await expect(page.locator('[aria-label="庄上求助代码执行场景"]')).toHaveAttribute('data-scene-ready', 'true');
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible(); expectedFailureUrl = null;
  });

  for (const boundary of [
    { name: 'Experience', pattern: /WeekThreeManorHelpExperience-[^/]+\.js(?:\?.*)?$/, failure: '庄上求助条件任务加载失败', survivor: null },
    { name: 'Scene', pattern: /WeekThreeManorHelpScene-[^/]+\.js(?:\?.*)?$/, failure: '庄上求助场景加载失败', survivor: '执行两张口信' },
    { name: 'Workspace', pattern: /WeekThreeManorHelpBlocklyWorkspace-[^/]+\.js(?:\?.*)?$/, failure: '庄上求助积木加载失败', survivor: '庄上求助代码执行场景' },
  ]) test(`@w3-m1-lazy ${boundary.name} lazy failure preserves its sibling boundary and can reload`, async ({ page }) => {
    let failed = false;
    await page.route(boundary.pattern, async (route) => { if (!failed) { failed = true; expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: `synthetic ${boundary.name} chunk failure` }); } else await route.continue(); });
    await page.goto('./#/mission/w3-m1'); await expect.poll(() => failed).toBe(true);
    const alert = page.getByRole('alert').filter({ hasText: boundary.failure }); await expect(alert).toBeVisible();
    if (boundary.survivor === '执行两张口信') await expect(page.getByRole('button', { name: boundary.survivor })).toBeVisible();
    if (boundary.survivor === '庄上求助代码执行场景') await expect(page.getByRole('img', { name: boundary.survivor })).toBeVisible();
    await alert.getByRole('button', { name: '重新加载页面' }).click(); await expect(page.getByRole('button', { name: '执行两张口信' })).toBeVisible();
    expectedFailureUrl = null;
  });
});
