import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { createInitialProgress, serializeProgress } from './progress/progress';
import { CORRUPT_PROGRESS_KEY, CURRENT_PROGRESS_KEY, SNAPSHOT_PROGRESS_KEY } from './progress/storage';
import type { BattleEvent } from './battle/types';
import { createMissionSession } from './progress/session';

vi.mock('./components/GameScene', () => ({
  GameScene: ({ events, onPlaybackComplete }: { events: BattleEvent[]; onPlaybackComplete?: () => void }) => <section aria-label="测试龙宫场景"><output data-testid="app-scene-events">{JSON.stringify(events)}</output><button type="button" onClick={onPlaybackComplete}>完成场景播放</button></section>,
}));

const originalStorage = localStorage;

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

describe('西游编程记', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: originalStorage, configurable: true });
    Object.defineProperty(window, 'localStorage', { value: originalStorage, configurable: true });
    localStorage.clear();
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

  it('shows the six-week canonical journey and the first mission', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    expect(screen.getByRole('heading', { name: '西游编程记' })).toBeInTheDocument();
    expect(screen.getAllByText(/第[一二三四五六]周/)).toHaveLength(6);
    expect(screen.getByRole('button', { name: /开始第一关/ })).toBeEnabled();
  });

  it('opens the first canonical mission with source and three-level hints', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    expect(screen.getByRole('heading', { name: '龙宫求兵' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /查看原著第三回/ })).toHaveAttribute('href', expect.stringContaining('wikisource.org'));
    expect(screen.getByRole('button', { name: '观察提示' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '思路提示' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '半成品提示' })).toBeInTheDocument();
  });

  it('lets a child finish the first mission through the command scroll', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    expect(screen.queryByRole('heading', { name: '闯关成功' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    expect(screen.getByRole('heading', { name: '闯关成功' })).toBeInTheDocument();
  });

  it('records each stable hint tier once and bases stars on distinct tiers', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
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

    expect(screen.getByLabelText('1颗星')).toBeVisible();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      missions: { 'w1-m1': { hintsUsed: 2, stars: 1 } },
      sessions: { 'w1-m1': { usedHintTiers: ['observe', 'think'] } },
    });
  });

  it('keeps repeated Dragon Palace success idempotent while still counting the engine run', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(screen.getByRole('button', { name: '观察提示' }));
    fireEvent.click(screen.getByRole('button', { name: '思路提示' }));
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      missions: { 'w1-m1': { attempts: 1, hintsUsed: 2 } },
      sessions: { 'w1-m1': { totalRuns: 1 } },
    });

    fireEvent.keyDown(screen.getByRole('dialog', { name: '闯关成功' }), { key: 'Escape' });
    fireEvent.click(await screen.findByRole('button', { name: '龙宫求兵' }));
    fireEvent.click(await screen.findByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));

    expect(screen.queryByRole('dialog', { name: '闯关成功' })).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      missions: { 'w1-m1': { attempts: 1, hintsUsed: 2 } },
      sessions: { 'w1-m1': { totalRuns: 2 } },
    });
  });

  it('isolates and traps the success dialog, then resets state on same-mode navigation', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    const dialog = screen.getByRole('dialog', { name: '闯关成功' });
    expect(screen.getByTestId('app-background')).toHaveAttribute('inert');
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
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    fireEvent.keyDown(screen.getByRole('dialog', { name: '闯关成功' }), { key: 'Escape' });
    const homeHeading = screen.getByRole('heading', { name: '西游编程记' });
    await waitFor(() => expect(homeHeading).toHaveFocus());
  });

  it('protects the parent report with the local PIN', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '2580' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    expect(screen.getByRole('heading', { name: '家长周报' })).toBeInTheDocument();
    expect(screen.getByText('学习数据仅保存在这台电脑')).toBeInTheDocument();
  });

  it('shows only aggregate Dragon Palace attempts and support behind the parent PIN', () => {
    const progress = createInitialProgress();
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
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '2580' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));

    expect(screen.getByText('运行 3 次 · 调整 2 次')).toBeVisible();
    expect(screen.getByText('程序结构')).toBeVisible();
    expect(screen.queryByText('private-block')).not.toBeInTheDocument();
    expect(screen.queryByText('xiyou_enter_palace')).not.toBeInTheDocument();
  });

  it('submits the parent PIN through the form keyboard path', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    const input = screen.getByLabelText('家长 PIN');
    fireEvent.change(input, { target: { value: '2580' } });
    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(screen.getByText('学习数据仅保存在这台电脑')).toBeInTheDocument();
  });

  it('keeps data operations protected after a wrong PIN', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '0000' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    expect(screen.getByText('PIN 不正确，请再检查一次。')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '清空学习数据' })).not.toBeInTheDocument();
  });

  it('isolates the entire parent page while the clear dialog is open', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...createInitialProgress(), privacy: { localDataNoticeSeen: true } }));
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '2580' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
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
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...createInitialProgress(), learnerName: '旧进度', privacy: { localDataNoticeSeen: true } }));
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:backup');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '2580' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    fireEvent.click(screen.getByRole('button', { name: '清空学习数据' }));
    fireEvent.change(screen.getByLabelText('输入“清空”以确认'), { target: { value: '清空' } });
    fireEvent.click(screen.getByRole('button', { name: '备份并清空' }));
    const acknowledge = await screen.findByRole('button', { name: '我知道了' });
    await waitFor(() => expect(acknowledge).toHaveFocus());
    expect(screen.getByTestId('app-background')).toHaveAttribute('inert');
  });

  it('shows snapshot recovery below the header on every route', () => {
    localStorage.setItem(CURRENT_PROGRESS_KEY, '{bad');
    localStorage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress({
      ...createInitialProgress(), privacy: { localDataNoticeSeen: true },
    }));
    window.location.hash = '#/mission/w1-m1';
    render(<App />);
    expect(screen.getAllByRole('status').some((status) => status.textContent?.includes('学习进度已经安全恢复'))).toBe(true);
    expect(screen.getByRole('heading', { name: '龙宫求兵' })).toBeInTheDocument();
  });

  it('keeps parent recovery details available after a recovered save is reopened', () => {
    const recovered = {
      ...createInitialProgress(), privacy: { localDataNoticeSeen: true },
      recovery: { lastRecoveredAt: '2026-07-12T08:09:10.000Z', source: 'snapshot' as const },
    };
    const envelope = JSON.stringify({
      current: '{bad', snapshot: serializeProgress(createInitialProgress()), capturedAt: '2026-07-12T08:09:10.000Z',
    });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(recovered));
    localStorage.setItem(CORRUPT_PROGRESS_KEY, envelope);
    window.location.hash = '#/parent';
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('有一份存档信息需要家长查看');
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '2580' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    expect(screen.getByRole('button', { name: '下载损坏原文' })).toBeInTheDocument();
  });

  it('retries the real unsaved mission state until it is durably stored', async () => {
    const saved = serializeProgress({
      ...createInitialProgress(), privacy: { localDataNoticeSeen: true },
    });
    const storage = installDynamicStorage({ [CURRENT_PROGRESS_KEY]: saved }, true, '磁盘错误 A');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /开始第一关/ }));
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }));
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }));
    fireEvent.click(screen.getByRole('button', { name: '完成场景播放' }));
    expect(screen.getByRole('heading', { name: '闯关成功' })).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('磁盘错误 A');
    storage.failMessage = '磁盘错误 B';
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    expect(screen.getByRole('alert')).toHaveTextContent('磁盘错误 B');
    storage.failWrites = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({
      missions: { 'w1-m1': { status: 'completed' } },
    });
  });

  it('persists the first-use privacy acknowledgement', () => {
    const first = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    expect(screen.queryByRole('dialog', { name: '你的学习数据保存在这台设备' })).not.toBeInTheDocument();
    first.unmount();
    render(<App />);
    expect(screen.queryByRole('dialog', { name: '你的学习数据保存在这台设备' })).not.toBeInTheDocument();
  });

  it('keeps privacy open after failure and closes it only after a real saved retry', () => {
    const storage = installDynamicStorage({}, true, '隐私确认无法写入');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    expect(screen.getByRole('dialog', { name: '你的学习数据保存在这台设备' })).toBeInTheDocument();
    expect(screen.getByTestId('app-background')).toHaveAttribute('inert');
    expect(screen.getByTestId('app-background')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText(/确认尚未保存/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('确认尚未保存');
    expect(screen.getByRole('alert')).toHaveTextContent('隐私确认无法写入');
    storage.failWrites = false;
    fireEvent.click(screen.getByRole('button', { name: '我知道了' }));
    expect(screen.queryByRole('dialog', { name: '你的学习数据保存在这台设备' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ privacy: { localDataNoticeSeen: true } });
    expect(screen.getByTestId('app-background')).not.toHaveAttribute('inert');
    expect(screen.getByTestId('app-background')).not.toHaveAttribute('aria-hidden');
  });

  it('keeps current React progress unchanged when imported persistence fails', async () => {
    const current = { ...createInitialProgress(), learnerName: '旧进度', privacy: { localDataNoticeSeen: true } };
    const storage = installDynamicStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(current) }, true, '导入写盘失败');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '家长周报' }));
    fireEvent.change(screen.getByLabelText('家长 PIN'), { target: { value: '2580' } });
    fireEvent.click(screen.getByRole('button', { name: '进入周报' }));
    const imported = { ...createInitialProgress(), learnerName: '导入会话', privacy: { localDataNoticeSeen: true } };
    fireEvent.change(screen.getByLabelText('选择进度文件'), {
      target: { files: [new File([serializeProgress(imported)], 'progress.json', { type: 'application/json' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('当前进度未被修改');
    expect(screen.getByRole('alert')).toHaveTextContent('导入写盘失败');
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '旧进度' });
    expect(screen.getByText('旧进度')).toBeInTheDocument();
    expect(screen.queryByText('导入会话')).not.toBeInTheDocument();
  });

  it('uses system reduced motion until the learner makes a persistent choice', () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })) });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({
      ...createInitialProgress(), privacy: { localDataNoticeSeen: true },
    }));
    const first = render(<App />);
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true');
    fireEvent.click(screen.getByRole('button', { name: '使用普通动画' }));
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'false');
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).settings).toMatchObject({ reducedMotion: false, reducedMotionOverride: true });
    first.unmount();
    render(<App />);
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'false');
  });

  it('follows later system motion changes while no explicit override exists', () => {
    let change: ((event: { matches: boolean }) => void) | undefined;
    const removeEventListener = vi.fn();
    const media = {
      matches: false, media: '(prefers-reduced-motion: reduce)', onchange: null,
      addEventListener: vi.fn((_type: string, listener: (event: { matches: boolean }) => void) => { change = listener; }),
      removeEventListener, addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    };
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => media) });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({
      ...createInitialProgress(), privacy: { localDataNoticeSeen: true },
    }));
    const view = render(<App />);
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'false');
    act(() => change?.({ matches: true }));
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true');
    view.unmount();
    expect(removeEventListener).toHaveBeenCalledOnce();
  });

  it('supports and cleans up legacy motion listeners', () => {
    let change: ((event: { matches: boolean }) => void) | undefined;
    const removeListener = vi.fn();
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({
      matches: false, media: '(prefers-reduced-motion: reduce)', onchange: null,
      addListener: vi.fn((listener: (event: { matches: boolean }) => void) => { change = listener; }),
      removeListener,
      dispatchEvent: vi.fn(),
    })) });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...createInitialProgress(), privacy: { localDataNoticeSeen: true } }));
    const view = render(<App />);
    act(() => change?.({ matches: true }));
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true');
    view.unmount();
    expect(removeListener).toHaveBeenCalledOnce();
  });

  it('falls back safely when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', { configurable: true, value: undefined });
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...createInitialProgress(), privacy: { localDataNoticeSeen: true } }));
    render(<App />);
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'false');
  });
});
