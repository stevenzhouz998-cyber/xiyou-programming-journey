import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { completeMission, createInitialProgress, serializeProgress } from './progress/progress';
import { CORRUPT_PROGRESS_KEY, CURRENT_PROGRESS_KEY, REVISION_PROGRESS_KEY, SNAPSHOT_PROGRESS_KEY } from './progress/storage';
import type { BattleEvent } from './battle/types';
import { createMissionSession } from './progress/session';
import { FourSeasRegaliaRouteBoundary } from './components/MissionPageContent';

vi.mock('./components/GameScene', () => ({
  GameScene: ({ events, onPlaybackComplete }: { events: BattleEvent[]; onPlaybackComplete?: () => void }) => <section aria-label="测试龙宫场景"><output data-testid="app-scene-events">{JSON.stringify(events)}</output><button type="button" onClick={onPlaybackComplete}>完成场景播放</button></section>,
}));

vi.mock('./components/RuyiStaffScene', () => ({
  RuyiStaffScene: ({ events, onPlaybackComplete }: { events: BattleEvent[]; onPlaybackComplete?: () => void }) => <section aria-label="测试定海神针场景"><output data-testid="app-ruyi-events">{JSON.stringify(events)}</output><button type="button" onClick={onPlaybackComplete}>完成定海神针场景播放</button></section>,
}));

vi.mock('./components/FourSeasRegaliaScene', () => ({
  FourSeasRegaliaScene: ({ events, onPlaybackComplete }: { events: BattleEvent[]; onPlaybackComplete?: () => void }) => <section aria-label="测试四海披挂场景"><output data-testid="app-regalia-events">{JSON.stringify(events)}</output><button type="button" onClick={onPlaybackComplete}>完成四海披挂场景播放</button></section>,
}));

const originalStorage = localStorage;
const TEST_PARENT_ACCESS = 'access-v1:cf7667b114bf7a735116fc8439f0d17f3213159c48b22be56376521fbbc5cbb1:678bd461a82e086d3332d9c0f72cfae199f75eab78fba024dd8d28acd1702e27';

function withParentAccess<T extends ReturnType<typeof createInitialProgress>>(progress: T): T {
  progress.settings.parentPin = TEST_PARENT_ACCESS;
  return progress;
}

function installDynamicStorage(initial: Record<string, string>, failWrites = true, failMessage = 'storage disabled') {
  const values = new Map(Object.entries(initial));
  const controls = { failWrites, failMessage };
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => {
      if (controls.failWrites) throw new Error(controls.failMessage);
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
  return controls;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

type SaveCoordinator = typeof import('./progress/storageCoordinator').saveProgressCoordinated;

async function acknowledgePrivacySuccessfully() {
  fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: '你的学习数据保存在这台设备' })).not.toBeInTheDocument());
}

function unlockedW1M3Progress() {
  let progress = withParentAccess(createInitialProgress());
  progress.privacy.localDataNoticeSeen = true;
  progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 });
  return completeMission(progress, 'w1-m2', { stars: 3, hintsUsed: 0 });
}

async function buildCorrectFourSeasProgram() {
  for (const label of [
    '加入主任务：向东海龙王请求披挂',
    '加入主任务：收齐三海宝物',
    '加入主任务：穿戴整副披挂',
    '加入主任务：检查披挂是否齐全',
    '加入穿戴子任务：戴上凤翅紫金冠',
    '加入穿戴子任务：穿上锁子黄金甲',
    '加入穿戴子任务：踏上藕丝步云履',
    '加入收集子任务：收下北海的藕丝步云履',
    '加入收集子任务：收下西海的锁子黄金甲',
    '加入收集子任务：收下南海的凤翅紫金冠',
  ]) fireEvent.click(await screen.findByRole('button', { name: label }, { timeout: 5000 }));
}

describe('西游编程记', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: originalStorage, configurable: true });
    Object.defineProperty(window, 'localStorage', { value: originalStorage, configurable: true });
    localStorage.clear();
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(withParentAccess(createInitialProgress())));
    window.history.pushState({}, '', '/');
    window.location.hash = '#/';
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({
      matches: false,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Object.defineProperty(globalThis, 'localStorage', { value: originalStorage, configurable: true });
    Object.defineProperty(window, 'localStorage', { value: originalStorage, configurable: true });
  });

  it('shows the six-week canonical journey and the first mission', async () => {
    render(<App />);
    await acknowledgePrivacySuccessfully();
    expect(screen.getByRole('heading', { name: '西游编程记' })).toBeInTheDocument();
    expect(screen.getAllByText(/第[一二三四五六]周/)).toHaveLength(6);
    expect(screen.getByRole('button', { name: /开始第一关/ })).toBeEnabled();
  });

  it('shows conflict backup and reload actions when CAS detects a stale tab without a storage event', async () => {
    const loaded = withParentAccess(createInitialProgress());
    loaded.privacy.localDataNoticeSeen = true;
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(loaded));
    localStorage.setItem(REVISION_PROGRESS_KEY, '0');
    render(<App />);

    const external = { ...loaded, learnerName: '其他标签页版本' };
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(external));
    localStorage.setItem(REVISION_PROGRESS_KEY, '1');
    fireEvent.click(screen.getByRole('button', { name: '减弱动画' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('其他标签页已更新，已暂停保存');
    expect(screen.getByRole('button', { name: '下载本页备份' })).toBeVisible();
    expect(screen.getByRole('button', { name: '载入其他标签页版本' })).toBeVisible();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '其他标签页版本' });
  });

  it('opens the first canonical mission with source and three-level hints', async () => {
    render(<App />);
    await acknowledgePrivacySuccessfully();
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    expect(await screen.findByRole('heading', { name: '龙宫求兵' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /查看原著第三回/ })).toHaveAttribute('href', expect.stringContaining('wikisource.org'));
    expect(screen.getByRole('button', { name: '观察提示' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '思路提示' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '半成品提示' })).toBeInTheDocument();
  });

  it('lets a child finish the first mission through the command scroll', async () => {
    render(<App />);
    await acknowledgePrivacySuccessfully();
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }, { timeout: 5000 }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeInTheDocument();
  });

  it('records each stable hint tier once and bases stars on distinct tiers', async () => {
    render(<App />);
    await acknowledgePrivacySuccessfully();
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(screen.getByRole('button', { name: '观察提示' }));
    fireEvent.click(screen.getByRole('button', { name: '观察提示' }));
    fireEvent.click(screen.getByRole('button', { name: '观察提示' }));
    fireEvent.click(screen.getByRole('button', { name: '思路提示' }));
    expect(await screen.findByText(/指令卷轴还是空的/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));

    expect(await screen.findByLabelText('1颗星')).toBeVisible();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      missions: { 'w1-m1': { hintsUsed: 2, stars: 1 } },
      sessions: { 'w1-m1': { usedHintTiers: ['observe', 'think'] } },
    }));
  });

  it('routes w1-m2 to the lazy real Ruyi Staff experience and records its hints transactionally', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    window.location.hash = '#/mission/w1-m2';
    render(<App />);

    expect(await screen.findByRole('button', { name: '加入：查看三件兵器重量' })).toBeVisible();
    expect(screen.queryByText('拖动调整事件顺序')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '观察提示' }));
    fireEvent.click(screen.getByRole('button', { name: '观察提示' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      sessions: { 'w1-m2': { usedHintTiers: ['observe'] } },
    }));
  });

  it('locks hints for a Ruyi battle playback, restores them after an error, and moves focus to the reason', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    window.location.hash = '#/mission/w1-m2';
    render(<App />);

    await fireEvent.click(await screen.findByRole('button', { name: '加入：查看三件兵器重量' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：选择方天画戟（7200斤）' }));
    const hint = screen.getByRole('button', { name: '观察提示' });
    hint.focus();
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));

    const reason = await screen.findByText('战斗指令正在执行，提示会在本次播放结束后恢复。');
    expect(hint).toBeDisabled();
    expect(hint).toHaveAttribute('aria-disabled', 'true');
    expect(reason).toBeVisible();
    expect(hint).not.toHaveFocus();
    expect(document.activeElement).toHaveAttribute('role', 'alert');
    fireEvent.click(hint);
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m2'].usedHintTiers).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: '完成定海神针场景播放' }));
    await waitFor(() => expect(hint).toBeEnabled());
    expect(hint).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(hint);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m2'].usedHintTiers).toEqual(['observe']));
  });

  it('routes only w1-m3 to the formal lazy Four Seas experience while later missions remain compatible', async () => {
    let progress = withParentAccess(createInitialProgress());
    progress.privacy.localDataNoticeSeen = true;
    progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress = completeMission(progress, 'w1-m2', { stars: 3, hintsUsed: 0 });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    window.location.hash = '#/mission/w1-m3';
    const firstView = render(<App />);
    const { container } = firstView;
    expect(await screen.findByRole('heading', { name: '四海披挂', level: 1 })).toBeVisible();
    expect(await screen.findByRole('button', { name: '加入主任务：向东海龙王请求披挂' })).toBeVisible();
    expect(container.querySelector('.legacy-mission-tools')).not.toBeInTheDocument();

    const completed = completeMission(progress, 'w1-m3', { stars: 3, hintsUsed: 0 });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(completed));
    firstView.unmount();
    window.location.hash = '#/mission/w1-m4';
    const secondView = render(<App />);
    expect(await screen.findByRole('heading', { name: '幽冥勾名', level: 1 })).toBeVisible();
    await waitFor(() => expect(secondView.container.querySelector('.legacy-mission-tools')).toHaveAttribute('data-mission-id', 'w1-m4'));
  });

  it('keeps w1-m3 final completion unsaved under the completion owner and reveals success only after its retry', async () => {
    const progress = unlockedW1M3Progress();
    const storage = installDynamicStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(progress) }, false);
    window.location.hash = '#/mission/w1-m3';
    render(<App />);

    await buildCorrectFourSeasProgram();
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      sessions: { 'w1-m3': { lastRun: { completed: true } } },
    }));
    storage.failWrites = true;
    fireEvent.click(screen.getByRole('button', { name: '完成四海披挂场景播放' }));

    expect(await screen.findByRole('button', { name: '重试保存通关' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '重试保存本关' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重试保存编译记录' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '观察提示' })).toBeDisabled();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).not.toHaveProperty('missions.w1-m3');

    storage.failWrites = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存通关' }));
    expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeVisible();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      missions: { 'w1-m3': { status: 'completed' } },
    }));
  });

  it('keeps a w1-m3 final CAS conflict under one completion recovery group and safely loads incomplete CURRENT', async () => {
    const progress = unlockedW1M3Progress();
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    localStorage.setItem(REVISION_PROGRESS_KEY, '0');
    window.location.hash = '#/mission/w1-m3';
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:w1-m3-completion-conflict');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const downloadClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<App />);

    await buildCorrectFourSeasProgram();
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      sessions: { 'w1-m3': { lastRun: { completed: true } } },
    }));
    localStorage.setItem(REVISION_PROGRESS_KEY, String(Number(localStorage.getItem(REVISION_PROGRESS_KEY)) + 1));
    window.dispatchEvent(new StorageEvent('storage', { key: REVISION_PROGRESS_KEY }));
    fireEvent.click(screen.getByRole('button', { name: '完成四海披挂场景播放' }));

    expect(await screen.findByText(/通关待保存/)).toBeVisible();
    expect(screen.getAllByRole('button', { name: '下载本页备份' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '载入其他标签页版本' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '重试保存本关' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重试保存编译记录' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重试保存通关' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '观察提示' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '下载本页备份' }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(downloadClick).toHaveBeenCalledOnce();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).not.toHaveProperty('missions.w1-m3');
    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页版本' }));
    await waitFor(() => expect(screen.queryByText(/通关待保存/)).not.toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '观察提示' })).toBeEnabled();
  });

  it('keeps a w1-m3 run-session CAS conflict under exactly one Experience recovery owner until external load', async () => {
    await import('./components/RecoveryNotice');
    const progress = unlockedW1M3Progress();
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    const external = structuredClone(progress);
    external.learnerName = '四海外部标签页';
    const save = vi.fn<SaveCoordinator>(async (next, expectedRevision) => {
      if (next.sessions['w1-m3']?.lastRun?.completed && !next.missions['w1-m3']) {
        localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(external));
        return { status: 'conflict', progress: next, expectedRevision, actualRevision: expectedRevision + 1, error: 'w1-m3 run conflict' };
      }
      return { status: 'saved', revision: expectedRevision + 1, progress: next };
    });
    window.location.hash = '#/mission/w1-m3';
    render(<App loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as unknown as typeof import('./progress/storageCoordinator'))} />);

    await buildCorrectFourSeasProgram();
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }));

    expect(await screen.findByText('本关运行记录与其他标签页冲突。')).toBeVisible();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(screen.getAllByRole('button', { name: '下载本页备份' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '载入其他标签页版本' })).toHaveLength(1);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.queryByText(/其他标签页已更新，已暂停保存/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重试保存通关' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeDisabled();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).learnerName).toBe('四海外部标签页');

    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页版本' }));
    await waitFor(() => expect(screen.queryByText('本关运行记录与其他标签页冲突。')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '下载本页备份' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '载入其他标签页版本' })).not.toBeInTheDocument();
    expect(screen.getByText('四海外部标签页')).toBeVisible();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).learnerName).toBe('四海外部标签页');
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeEnabled();
  });

  it('releases the w1-m3 compile-conflict owner on route unmount so the same external CURRENT stays recoverable', async () => {
    await import('./components/RecoveryNotice');
    const progress = unlockedW1M3Progress();
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    const external = structuredClone(progress);
    external.learnerName = '卸载后的外部版本';
    const save = vi.fn<SaveCoordinator>(async (next, expectedRevision) => {
      if (next.sessions['w1-m3']?.compileFailures === 1) {
        localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(external));
        return { status: 'conflict', progress: next, expectedRevision, actualRevision: expectedRevision + 1, error: 'w1-m3 compile conflict' };
      }
      return { status: 'saved', revision: expectedRevision + 1, progress: next };
    });
    window.location.hash = '#/mission/w1-m3';
    render(<App loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as unknown as typeof import('./progress/storageCoordinator'))} />);

    fireEvent.click(await screen.findByRole('button', { name: '执行披挂指令' }, { timeout: 5000 }));
    expect(await screen.findByText('编译失败记录与其他标签页冲突。')).toBeVisible();
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
    expect(screen.getAllByRole('button', { name: '下载本页备份' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '载入其他标签页版本' })).toHaveLength(1);
    expect(screen.queryByText(/其他标签页已更新，已暂停保存/)).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '成长地图' })[0]);
    expect(await screen.findByText(/其他标签页已更新，已暂停保存/)).toBeVisible();
    expect(screen.getAllByRole('button', { name: '下载本页备份' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '载入其他标签页版本' })).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).learnerName).toBe('卸载后的外部版本');
    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页版本' }));
    await waitFor(() => expect(screen.queryByText(/其他标签页已更新，已暂停保存/)).not.toBeInTheDocument());
    expect(screen.getByText('卸载后的外部版本')).toBeVisible();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).learnerName).toBe('卸载后的外部版本');
  });

  it('isolates the outer Four Seas experience chunk and keeps story and objective with explicit retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reloadPage = vi.fn();
    render(<><h2>再求披挂的原著故事</h2><h2>按原著顺序整理披挂</h2><FourSeasRegaliaRouteBoundary
      loader={() => Promise.reject(new Error('outer chunk failed'))}
      reloadPage={reloadPage}
      reducedMotion
      muted
      locked={false}
      onComplete={() => undefined}
      onSessionPersistenceActiveChange={() => undefined}
      onInteractionLockChange={() => undefined}
    /></>);
    expect(await screen.findByText('四海披挂任务加载失败')).toBeVisible();
    expect(screen.getByRole('heading', { name: '再求披挂的原著故事' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '按原著顺序整理披挂' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }));
    expect(reloadPage).toHaveBeenCalledOnce();
  });

  it('passes w1-m2 through the same delayed scene-completion and success-audio path', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    window.location.hash = '#/mission/w1-m2';
    const audioPlay = vi.fn().mockResolvedValue(undefined);
    const audio = vi.fn(function MockAudio() { return { play: audioPlay }; });
    vi.stubGlobal('Audio', audio);
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '加入：查看三件兵器重量' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：选择定海神针（13500斤）' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：缩小定海神针' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '完成定海神针场景播放' }));
    expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeVisible();
    expect(audio).toHaveBeenCalledWith('/assets/audio/success.m4a');
  });

  it('offers exactly one final-completion retry when w1-m2 run evidence is already durable', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    const storage = installDynamicStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(progress) }, false);
    window.location.hash = '#/mission/w1-m2';
    const audio = vi.fn(function MockAudio() { return { play: vi.fn() }; });
    vi.stubGlobal('Audio', audio);
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '加入：查看三件兵器重量' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：选择定海神针（13500斤）' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：缩小定海神针' }));
    const hint = screen.getByRole('button', { name: '观察提示' });
    hint.focus();
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    expect(hint).toBeDisabled();
    await waitFor(() => expect(screen.getByText('战斗指令正在执行，提示会在本次播放结束后恢复。')).toHaveFocus());
    fireEvent.click(hint);
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      sessions: { 'w1-m2': { lastRun: { completed: true }, usedHintTiers: [] } },
    }));
    storage.failWrites = true;
    fireEvent.click(screen.getByRole('button', { name: '完成定海神针场景播放' }));

    expect(await screen.findByText('通关待保存：进度尚未安全写入这台电脑。')).toBeVisible();
    expect(screen.queryByRole('button', { name: '重试保存本关' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /重试保存/ })).toHaveLength(1);
    expect(screen.getByRole('button', { name: '重试保存通关' })).toBeVisible();
    expect(document.querySelectorAll('.completion-save-status')).toHaveLength(1);
    expect(screen.getByText('通关结果正在处理，先不要改动指令卷轴。保存完成后就能继续操作。')).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^加入：/ }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.getAllByRole('button', { name: /^(上移|下移|删除)：/ }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.getByRole('button', { name: '清空并重新开始' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '执行战斗指令' })).toBeDisabled();
    expect(hint).toBeDisabled();
    expect(screen.getByText('通关结果尚未保存，请先完成保存恢复。')).toBeVisible();
    fireEvent.click(hint);
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    expect(audio).not.toHaveBeenCalledWith('/assets/audio/success.m4a');
    expect(screen.getByText('1/30 关 · 3 星')).toBeVisible();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).not.toHaveProperty('missions.w1-m2');

    storage.failWrites = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存通关' }));
    expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeVisible();
    expect(audio).toHaveBeenCalledWith('/assets/audio/success.m4a');
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      missions: { 'w1-m2': { status: 'completed', hintsUsed: 0, stars: 3 } },
      sessions: { 'w1-m2': { usedHintTiers: [] } },
    });
  });

  it('locks the w1-m2 workspace while the App-owned final completion write is pending', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    const pendingCompletion = deferred<Awaited<ReturnType<SaveCoordinator>>>();
    let completionDraft: Parameters<SaveCoordinator>[0] | null = null;
    const save = vi.fn<SaveCoordinator>(async (next, expectedRevision) => {
      if (next.missions['w1-m2']) { completionDraft = next; return pendingCompletion.promise; }
      return { status: 'saved', revision: expectedRevision + 1, progress: next };
    });
    window.location.hash = '#/mission/w1-m2';
    render(<App loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as unknown as typeof import('./progress/storageCoordinator'))} />);

    fireEvent.click(await screen.findByRole('button', { name: '加入：查看三件兵器重量' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：选择定海神针（13500斤）' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：缩小定海神针' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成定海神针场景播放' }));

    expect(await screen.findByText('正在保存通关结果…')).toBeVisible();
    expect(screen.getByText('通关结果正在保存，请等保存完成后再使用提示。')).toBeVisible();
    expect(document.querySelectorAll('.completion-save-status')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '执行战斗指令' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '观察提示' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: /^加入：/ }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.queryByRole('button', { name: /重试保存/ })).not.toBeInTheDocument();

    await waitFor(() => expect(completionDraft).not.toBeNull());
    await act(async () => pendingCompletion.resolve({ status: 'saved', revision: 5, progress: completionDraft! }));
    expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeVisible();
  });

  it('distinguishes a pending run-session save from playback after that save becomes durable', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    const pendingRun = deferred<Awaited<ReturnType<SaveCoordinator>>>();
    let runDraft: Parameters<SaveCoordinator>[0] | null = null;
    const save = vi.fn<SaveCoordinator>(async (next, expectedRevision) => {
      if (next.sessions['w1-m2']?.lastRun && !next.missions['w1-m2']) {
        runDraft = next;
        return pendingRun.promise;
      }
      return { status: 'saved', revision: expectedRevision + 1, progress: next };
    });
    window.location.hash = '#/mission/w1-m2';
    render(<App loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as unknown as typeof import('./progress/storageCoordinator'))} />);

    fireEvent.click(await screen.findByRole('button', { name: '加入：查看三件兵器重量' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：选择方天画戟（7200斤）' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));

    expect(await screen.findByText('运行结果正在保存，提示会在保存完成后恢复。')).toBeVisible();
    await waitFor(() => expect(runDraft).not.toBeNull());
    await act(async () => pendingRun.resolve({ status: 'saved', revision: 3, progress: runDraft! }));
    expect(await screen.findByText('战斗指令正在执行，提示会在本次播放结束后恢复。')).toBeVisible();
  });

  it('shows only the local run-session retry in the full w1-m2 page and clears it after recovery', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    const storage = installDynamicStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(progress) }, true, 'session write failed');
    window.location.hash = '#/mission/w1-m2';
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '加入：查看三件兵器重量' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：选择定海神针（13500斤）' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：缩小定海神针' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));

    expect(await screen.findByRole('button', { name: '重试保存本关' })).toBeVisible();
    expect(screen.getByRole('button', { name: '观察提示' })).toBeDisabled();
    expect(screen.getByText('运行结果尚未保存，请先完成保存恢复。')).toBeVisible();
    await act(async () => { await import('./components/RecoveryNotice'); });
    expect(screen.getAllByRole('button', { name: /重试保存/ })).toHaveLength(1);
    expect(screen.queryByText('本次进度尚未保存')).not.toBeInTheDocument();

    storage.failWrites = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存本关' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '重试保存本关' })).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: '重试保存' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '完成定海神针场景播放' }));
    expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeVisible();
    expect(screen.queryByText(/尚未保存|待保存/)).not.toBeInTheDocument();
  });

  it('hands a w1-m2 run-session conflict to exactly one global recovery group', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    const save = vi.fn<SaveCoordinator>(async (next, expectedRevision) => {
      if (next.sessions['w1-m2']?.lastRun?.completed && !next.missions['w1-m2']) return {
        status: 'conflict', progress: next, expectedRevision, actualRevision: expectedRevision + 1, error: 'session conflict',
      };
      return { status: 'saved', revision: expectedRevision + 1, progress: next };
    });
    window.location.hash = '#/mission/w1-m2';
    render(<App loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as unknown as typeof import('./progress/storageCoordinator'))} />);

    fireEvent.click(await screen.findByRole('button', { name: '加入：查看三件兵器重量' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：选择定海神针（13500斤）' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：缩小定海神针' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));

    expect(await screen.findByRole('button', { name: '下载本页备份' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: '下载本页备份' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '载入其他标签页版本' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '重试保存本关' })).not.toBeInTheDocument();
    expect(screen.queryByText(/本关存档与其他标签页冲突|按顶部提示/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText('运行结果尚未保存，请先完成保存恢复。')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页版本' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: '载入其他标签页版本' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: '定海神针' })).toBeVisible();
    expect(screen.getByRole('button', { name: '执行战斗指令' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '观察提示' })).toBeEnabled();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).not.toHaveProperty('missions.w1-m2');
  });

  it('offers one final-conflict recovery group and safely loads an incomplete external w1-m2 progress', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    localStorage.setItem(REVISION_PROGRESS_KEY, '0');
    window.location.hash = '#/mission/w1-m2';
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:conflict-backup');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const downloadClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '加入：查看三件兵器重量' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：选择定海神针（13500斤）' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：缩小定海神针' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      sessions: { 'w1-m2': { lastRun: { completed: true } } },
    }));
    localStorage.setItem(REVISION_PROGRESS_KEY, String(Number(localStorage.getItem(REVISION_PROGRESS_KEY)) + 1));
    window.dispatchEvent(new StorageEvent('storage', { key: REVISION_PROGRESS_KEY }));
    fireEvent.click(screen.getByRole('button', { name: '完成定海神针场景播放' }));

    expect(await screen.findByText(/通关待保存/)).toBeVisible();
    expect(screen.getByText('通关结果尚未保存，请先完成保存恢复。')).toBeVisible();
    expect(screen.queryByRole('button', { name: '重试保存本关' })).not.toBeInTheDocument();
    expect(screen.queryByText(/本关存档与其他标签页冲突/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /重试保存/ })).toHaveLength(0);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '下载本页备份' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '载入其他标签页版本' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: '执行战斗指令' })).toBeDisabled();
    expect(screen.getAllByRole('button', { name: /^加入：/ }).every((button) => button.hasAttribute('disabled'))).toBe(true);
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '下载本页备份' }));
    expect(downloadClick).toHaveBeenCalledOnce();
    const backupBlob = createObjectURL.mock.calls[0][0] as Blob;
    const backupText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(backupBlob);
    });
    expect(JSON.parse(backupText)).toMatchObject({
      missions: { 'w1-m2': { status: 'completed' } },
    });

    const loadExternalVersion = screen.getByRole('button', { name: '载入其他标签页版本' });
    loadExternalVersion.focus();
    fireEvent.click(loadExternalVersion);
    await waitFor(() => expect(screen.queryByText(/通关待保存/)).not.toBeInTheDocument());
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '执行战斗指令' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '观察提示' })).toBeEnabled();
    await waitFor(() => expect(screen.getByRole('button', { name: '加入：查看三件兵器重量' })).toHaveFocus());
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).not.toHaveProperty('missions.w1-m2');
  });

  it('reveals w1-m2 success once when conflict recovery loads an externally completed mission', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    localStorage.setItem(REVISION_PROGRESS_KEY, '0');
    window.location.hash = '#/mission/w1-m2';
    const audio = vi.fn(function MockAudio() { return { play: vi.fn() }; });
    vi.stubGlobal('Audio', audio);
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '加入：查看三件兵器重量' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：选择定海神针（13500斤）' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：缩小定海神针' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      sessions: { 'w1-m2': { lastRun: { completed: true } } },
    }));
    const external = completeMission(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!), 'w1-m2', { stars: 1, hintsUsed: 2 });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(external));
    localStorage.setItem(REVISION_PROGRESS_KEY, String(Number(localStorage.getItem(REVISION_PROGRESS_KEY)) + 1));
    fireEvent.click(screen.getByRole('button', { name: '完成定海神针场景播放' }));
    await screen.findByRole('button', { name: '载入其他标签页版本' });

    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页版本' }));
    expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeVisible();
    expect(screen.getByLabelText('1颗星')).toBeVisible();
    expect(screen.queryByLabelText('3颗星')).not.toBeInTheDocument();
    expect(audio).toHaveBeenCalledTimes(1);
    expect(audio).toHaveBeenCalledWith('/assets/audio/success.m4a');
  });

  it('completes w1-m2 while muted without constructing or playing success audio', async () => {
    const progress = completeMission(withParentAccess(createInitialProgress()), 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress.privacy.localDataNoticeSeen = true;
    progress.settings.muted = true;
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    window.location.hash = '#/mission/w1-m2';
    const audio = vi.fn(function MockAudio() { return { play: vi.fn() }; });
    vi.stubGlobal('Audio', audio);
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '加入：查看三件兵器重量' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：选择定海神针（13500斤）' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：缩小定海神针' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成定海神针场景播放' }));
    expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeVisible();
    expect(audio).not.toHaveBeenCalled();
  });

  it('keeps repeated Dragon Palace success idempotent while still counting the engine run', async () => {
    render(<App />);
    await acknowledgePrivacySuccessfully();
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(screen.getByRole('button', { name: '观察提示' }));
    fireEvent.click(screen.getByRole('button', { name: '思路提示' }));
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      missions: { 'w1-m1': { attempts: 1, hintsUsed: 2 } },
      sessions: { 'w1-m1': { totalRuns: 1 } },
    }));

    fireEvent.keyDown(screen.getByRole('dialog', { name: '闯关成功' }), { key: 'Escape' });
    fireEvent.click(await screen.findByRole('button', { name: '龙宫求兵' }));
    fireEvent.click(await screen.findByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));

    expect(screen.queryByRole('dialog', { name: '闯关成功' })).not.toBeInTheDocument();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      missions: { 'w1-m1': { attempts: 1, hintsUsed: 2 } },
      sessions: { 'w1-m1': { totalRuns: 2 } },
    }));
  });

  it('isolates and traps the success dialog, then resets state on same-mode navigation', async () => {
    render(<App />);
    await acknowledgePrivacySuccessfully();
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    const dialog = await screen.findByRole('dialog', { name: '闯关成功' });
    await waitFor(() => expect(screen.getByTestId('app-background')).toHaveAttribute('inert'));
    expect(screen.getByTestId('mission-background')).toHaveAttribute('inert');
    expect(dialog.closest('[inert]')).toBeNull();
    const next = screen.getByRole('button', { name: '继续下一关' });
    expect(next).toHaveFocus();
    const map = screen.getByRole('button', { name: '回成长地图' });
    map.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(next).toHaveFocus();
    fireEvent.click(next);
    expect(screen.queryByRole('dialog', { name: '闯关成功' })).not.toBeInTheDocument();
    expect(screen.getByTestId('mission-background')).not.toHaveAttribute('inert');
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toHaveFocus());
  });

  it('returns to the map when Escape closes the success dialog', async () => {
    render(<App />);
    await acknowledgePrivacySuccessfully();
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    fireEvent.keyDown(await screen.findByRole('dialog', { name: '闯关成功' }), { key: 'Escape' });
    const homeHeading = screen.getByRole('heading', { name: '西游编程记' });
    await waitFor(() => expect(homeHeading).toHaveFocus());
  });

  it('protects the parent report with the local PIN', async () => {
    render(<App />);
    await acknowledgePrivacySuccessfully();
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(await screen.findByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    expect(screen.getByRole('heading', { name: '家长周报' })).toBeInTheDocument();
    expect(await screen.findByText('学习数据仅保存在这台电脑')).toBeInTheDocument();
  });

  it('shows only aggregate Dragon Palace attempts and support behind the parent PIN', async () => {
    const progress = withParentAccess(createInitialProgress());
    progress.privacy.localDataNoticeSeen = true;
    progress.sessions['w1-m1'] = {
      ...createMissionSession('2026-07-15T06:00:00.000Z'),
      totalRuns: 3,
      runtimeFailures: 1,
      compileFailures: 1,
      conceptFailures: { programStructure: 2, sequencePrecondition: 0, completeness: 0 },
      workspace: { version: 1, blocks: [{ id: 'private-block', type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 }] },
    };
    progress.savedAt = '2026-07-15T06:00:00.000Z';
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    expect(screen.queryByText('运行 3 次 · 调整 2 次')).not.toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));

    expect(await screen.findByText('运行 3 次 · 调整 2 次')).toBeVisible();
    expect(screen.getByText('程序结构')).toBeVisible();
    expect(screen.queryByText('private-block')).not.toBeInTheDocument();
    expect(screen.queryByText('xiyou_enter_palace')).not.toBeInTheDocument();
  });

  it('aggregates both executable week-one sessions in the parent report', async () => {
    const progress = withParentAccess(createInitialProgress());
    progress.privacy.localDataNoticeSeen = true;
    progress.sessions['w1-m1'] = { ...createMissionSession('w1-m1', '2026-07-16T00:00:00.000Z'), totalRuns: 2, runtimeFailures: 1 };
    progress.sessions['w1-m2'] = { ...createMissionSession('w1-m2', '2026-07-16T00:00:00.000Z'), totalRuns: 3, compileFailures: 2 };
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(await screen.findByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    expect(await screen.findByText('运行 5 次 · 调整 3 次')).toBeVisible();
  });

  it('submits the parent PIN through the form keyboard path', async () => {
    render(<App />);
    await acknowledgePrivacySuccessfully();
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    const input = await screen.findByLabelText('家长 PIN');
    fireEvent.change(input, { target: { value: '4826' } });
    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(await screen.findByText('学习数据仅保存在这台电脑')).toBeInTheDocument();
  });

  it('keeps data operations protected after a wrong PIN', async () => {
    render(<App />);
    await acknowledgePrivacySuccessfully();
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(await screen.findByLabelText('家长 PIN'), { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    expect(await screen.findByText('PIN 不正确，请再检查一次。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '清空学习数据' })).not.toBeInTheDocument();
  });

  it('isolates the entire parent page while the clear dialog is open', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...withParentAccess(createInitialProgress()), privacy: { localDataNoticeSeen: true } }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(await screen.findByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByRole('button', { name: '清空学习数据' });
    const opener = screen.getByRole('button', { name: '清空学习数据' });
    fireEvent.click(opener);
    const background = screen.getByTestId('parent-data-background');
    expect(background).toHaveAttribute('inert');
    expect(background).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('dialog')).not.toHaveAttribute('inert');
    const focus = vi.spyOn(opener, 'focus').mockImplementation(() => {
      if (opener.closest('[inert]')) throw new Error('focus attempted inside inert background');
      HTMLElement.prototype.focus.call(opener);
    });
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(background).not.toHaveAttribute('inert'));
    expect(focus).not.toHaveBeenCalled();
    act(() => { while (frames.length && focus.mock.calls.length === 0) frames.shift()?.(performance.now()); });
    expect(focus).toHaveBeenCalledOnce();
    expect(opener).toHaveFocus();
  });

  it('focuses the privacy acknowledgement after a successful backed-up clear', async () => {
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...withParentAccess(createInitialProgress()), learnerName: '旧进度', privacy: { localDataNoticeSeen: true } }));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(await screen.findByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByRole('button', { name: '清空学习数据' });
    fireEvent.click(screen.getByRole('button', { name: '清空学习数据' }));
    fireEvent.change(screen.getByLabelText('输入“清空”以确认'), { target: { value: '清空' } });
    fireEvent.click(screen.getByRole('button', { name: '备份并清空' }));
    const acknowledge = await screen.findByRole('button', { name: '我知道了' });
    await waitFor(() => expect(acknowledge).toHaveFocus());
    expect(screen.getByTestId('app-background')).toHaveAttribute('inert');
  });

  it('shows snapshot recovery below the header on every route', async () => {
    localStorage.setItem(CURRENT_PROGRESS_KEY, '{bad');
    localStorage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress({
      ...withParentAccess(createInitialProgress()), privacy: { localDataNoticeSeen: true },
    }));
    window.location.hash = '#/mission/w1-m1';
    render(<App />);
    expect(await screen.findByText('学习进度已经安全恢复')).toBeVisible();
    expect(screen.getByRole('heading', { name: '龙宫求兵' })).toBeInTheDocument();
  });

  it('keeps parent recovery details available after a recovered save is reopened', async () => {
    const recovered = {
      ...withParentAccess(createInitialProgress()), privacy: { localDataNoticeSeen: true },
      recovery: { lastRecoveredAt: '2026-07-12T08:09:10.000Z', source: 'snapshot' as const },
    };
    const envelope = JSON.stringify({
      current: '{bad', snapshot: serializeProgress(withParentAccess(createInitialProgress())), capturedAt: '2026-07-12T08:09:10.000Z',
    });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(recovered));
    localStorage.setItem(CORRUPT_PROGRESS_KEY, envelope);
    window.location.hash = '#/parent';
    render(<App />);

    expect(await screen.findByText('有一份存档信息需要家长查看')).toBeVisible();
    fireEvent.change(await screen.findByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    expect(await screen.findByRole('button', { name: '下载损坏原文' })).toBeInTheDocument();
  });

  it('keeps w1-m1 in a clear completion-pending state until the final completion save succeeds', async () => {
    const saved = serializeProgress({
      ...withParentAccess(createInitialProgress()), privacy: { localDataNoticeSeen: true },
    });
    const storage = installDynamicStorage({ [CURRENT_PROGRESS_KEY]: saved }, true, '磁盘错误 A');
    const audio = vi.fn(function MockAudio() { return { play: vi.fn() }; });
    vi.stubGlobal('Audio', audio);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    expect(await screen.findByText(/通关待保存/)).toBeVisible();
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '继续下一关' })).not.toBeInTheDocument();
    expect(audio).not.toHaveBeenCalledWith('/assets/audio/success.m4a');
    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(1));
    expect(screen.getByRole('alert')).toHaveTextContent('磁盘错误 A');
    storage.failWrites = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存通关' }));
    expect(await screen.findByRole('heading', { name: '闯关成功' })).toBeVisible();
    expect(audio).toHaveBeenCalledWith('/assets/audio/success.m4a');
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      missions: { 'w1-m1': { status: 'completed' } },
    });
  });

  it('does not show or announce w1-m1 success when final completion hits a CAS conflict', async () => {
    const progress = { ...withParentAccess(createInitialProgress()), privacy: { localDataNoticeSeen: true } };
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    localStorage.setItem(REVISION_PROGRESS_KEY, '0');
    const audio = vi.fn(function MockAudio() { return { play: vi.fn() }; });
    vi.stubGlobal('Audio', audio);
    window.location.hash = '#/mission/w1-m1';
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(REVISION_PROGRESS_KEY) ?? '0')).toBeGreaterThan(0));
    localStorage.setItem(REVISION_PROGRESS_KEY, String(Number(localStorage.getItem(REVISION_PROGRESS_KEY)) + 1));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    expect(await screen.findByText(/通关待保存/)).toBeVisible();
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '继续下一关' })).not.toBeInTheDocument();
    expect(audio).not.toHaveBeenCalled();
  });

  it('invalidates a pending final completion when its mission route unmounts', async () => {
    const progress = { ...withParentAccess(createInitialProgress()), privacy: { localDataNoticeSeen: true } };
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress));
    const pending = deferred<Awaited<ReturnType<SaveCoordinator>>>();
    const save = vi.fn<SaveCoordinator>(async (next, expectedRevision) => {
      if (next.missions['w1-m1']) return pending.promise;
      return { status: 'saved', revision: expectedRevision + 1, progress: next };
    });
    const audio = vi.fn(function MockAudio() { return { play: vi.fn() }; });
    vi.stubGlobal('Audio', audio);
    window.location.hash = '#/mission/w1-m1';
    render(<App loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as unknown as typeof import('./progress/storageCoordinator'))} />);

    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    await waitFor(() => expect(save.mock.calls.some(([next]) => Boolean(next.missions['w1-m1']))).toBe(true));
    expect(screen.getByText('正在保存通关结果…')).toBeVisible();

    fireEvent.click(screen.getAllByRole('button', { name: '成长地图' }).at(-1)!);
    expect(await screen.findByRole('heading', { name: '西游编程记' })).toBeVisible();
    await act(async () => pending.resolve({
      status: 'saved', revision: 5,
      progress: completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 }),
    }));

    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    expect(audio).not.toHaveBeenCalledWith('/assets/audio/success.m4a');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('persists the first-use privacy acknowledgement', async () => {
    const first = render(<App />);
    await acknowledgePrivacySuccessfully();
    expect(screen.queryByRole('dialog', { name: '你的学习数据保存在这台设备' })).not.toBeInTheDocument();
    first.unmount();
    render(<App />);
    expect(screen.queryByRole('dialog', { name: '你的学习数据保存在这台设备' })).not.toBeInTheDocument();
  });

  it('keeps privacy open after failure and closes it only after a real saved retry', async () => {
    const storage = installDynamicStorage({}, true, '隐私确认无法写入');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    await waitFor(() => expect(screen.getByText(/确认尚未保存/)).toBeInTheDocument());
    expect(screen.getByRole('dialog', { name: '你的学习数据保存在这台设备' })).toBeInTheDocument();
    expect(screen.getByTestId('app-background')).toHaveAttribute('inert');
    expect(screen.getByTestId('app-background')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText(/确认尚未保存/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('确认尚未保存');
    expect(screen.getByRole('alert')).toHaveTextContent('隐私确认无法写入');
    storage.failWrites = false;
    await acknowledgePrivacySuccessfully();
    expect(screen.queryByRole('dialog', { name: '你的学习数据保存在这台设备' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ privacy: { localDataNoticeSeen: true } });
    expect(screen.getByTestId('app-background')).not.toHaveAttribute('inert');
    expect(screen.getByTestId('app-background')).not.toHaveAttribute('aria-hidden');
  });

  it('keeps current React progress unchanged when imported persistence fails', async () => {
    const current = { ...withParentAccess(createInitialProgress()), learnerName: '旧进度', privacy: { localDataNoticeSeen: true } };
    const storage = installDynamicStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(current) }, true, '导入写盘失败');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(await screen.findByLabelText('家长 PIN'), { target: { value: '4826' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    await screen.findByLabelText('选择进度文件');
    const imported = { ...withParentAccess(createInitialProgress()), learnerName: '导入会话', privacy: { localDataNoticeSeen: true } };
    fireEvent.change(screen.getByLabelText('选择进度文件'), {
      target: { files: [new File([serializeProgress(imported)], 'progress.json', { type: 'application/json' })] },
    });
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((alert) => alert.textContent?.includes('当前进度未被修改'))).toBe(true);
    expect(alerts.some((alert) => alert.textContent?.includes('导入写盘失败'))).toBe(true);
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '旧进度' });
    expect(screen.getByText('旧进度')).toBeInTheDocument();
    expect(screen.queryByText('导入会话')).not.toBeInTheDocument();
  });

  it('uses system reduced motion until the learner makes a persistent choice', async () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })) });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({
      ...withParentAccess(createInitialProgress()), privacy: { localDataNoticeSeen: true },
    }));
    const first = render(<App />);
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true');
    fireEvent.click(screen.getByRole('button', { name: '使用普通动画' }));
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'false');
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).settings).toMatchObject({ reducedMotion: false, reducedMotionOverride: true }));
    first.unmount();
    render(<App />);
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'false');
  });

  it('follows later system motion changes while no explicit override exists', async () => {
    let change: ((event: { matches: boolean }) => void) | undefined;
    const removeEventListener = vi.fn();
    const media = {
      matches: false, media: '(prefers-reduced-motion: reduce)', onchange: null,
      addEventListener: vi.fn((_type: string, listener: (event: { matches: boolean }) => void) => { change = listener; }),
      removeEventListener, addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    };
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => media) });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({
      ...withParentAccess(createInitialProgress()), privacy: { localDataNoticeSeen: true },
    }));
    const view = render(<App />);
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'false');
    act(() => change?.({ matches: true }));
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true');
    view.unmount();
    expect(removeEventListener).toHaveBeenCalledOnce();
  });

  it('supports and cleans up legacy motion listeners', async () => {
    let change: ((event: { matches: boolean }) => void) | undefined;
    const removeListener = vi.fn();
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({
      matches: false, media: '(prefers-reduced-motion: reduce)', onchange: null,
      addListener: vi.fn((listener: (event: { matches: boolean }) => void) => { change = listener; }),
      removeListener,
      dispatchEvent: vi.fn(),
    })) });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...withParentAccess(createInitialProgress()), privacy: { localDataNoticeSeen: true } }));
    const view = render(<App />);
    act(() => change?.({ matches: true }));
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true');
    view.unmount();
    expect(removeListener).toHaveBeenCalledOnce();
  });

  it('falls back safely when matchMedia is unavailable', async () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...withParentAccess(createInitialProgress()), privacy: { localDataNoticeSeen: true } }));
    render(<App />);
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'false');
  });
});
