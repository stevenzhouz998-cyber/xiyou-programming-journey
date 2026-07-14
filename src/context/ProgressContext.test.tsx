import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProgressProvider, useProgress, type ProgressContextValue } from './ProgressContext';
import { createInitialProgress, serializeProgress } from '../progress/progress';
import { CORRUPT_PROGRESS_KEY, CURRENT_PROGRESS_KEY, SNAPSHOT_PROGRESS_KEY } from '../progress/storage';
import {
  createMissionSession,
  recordCompileFailure,
  recordHint,
} from '../progress/session';

const originalStorage = localStorage;
const SESSION_NOW = '2026-07-15T06:00:00.000Z';
let latestContext: ProgressContextValue | null = null;

function installStorage(initial: Record<string, string>, failWrites = false) {
  const values = new Map(Object.entries(initial));
  const controls = { failWrites, failKeys: new Set<string>() };
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => {
      if (controls.failWrites || controls.failKeys.has(key)) throw new Error('disk unavailable');
      values.set(key, value);
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
  return controls;
}

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: originalStorage, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: originalStorage, configurable: true });
  originalStorage.clear();
});

function Probe() {
  const state = useProgress();
  latestContext = state;
  return <>
    <output data-testid="state">{JSON.stringify({
      learnerName: state.progress.learnerName,
      loadStatus: state.loadStatus,
      loadPersistence: state.loadPersistence,
      loadError: state.loadError,
      corruptDownload: state.corruptDownload,
      corruptError: state.corruptError,
      saveStatus: state.saveStatus,
      saveError: state.saveError,
      sessions: state.progress.sessions,
      progressSavedAt: state.progress.savedAt,
    })}</output>
    <button onClick={() => state.replaceProgress({ ...state.progress, learnerName: '会话新名字' })}>保存</button>
    <button onClick={() => state.acknowledgePrivacy()}>确认隐私</button>
    <button onClick={() => state.retrySave()}>重试保存</button>
    <button onClick={() => state.importProgressFile(serializeProgress({ ...createInitialProgress(), learnerName: '导入名字' }))}>导入</button>
    <button onClick={() => state.clearProgress()}>清空</button>
  </>;
}

describe('ProgressContext persistence status', () => {
  it('starts idle before the first durable mutation and then becomes saved', () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ loadPersistence: 'idle', saveStatus: 'idle' });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ loadPersistence: 'saved', saveStatus: 'saved' });
  });
  it('exposes snapshot recovery load details', () => {
    installStorage({
      [CURRENT_PROGRESS_KEY]: '{bad',
      [SNAPSHOT_PROGRESS_KEY]: serializeProgress({ ...createInitialProgress(), learnerName: '快照名字' }),
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: '快照名字', loadStatus: 'recovered-from-snapshot', loadPersistence: 'saved', loadError: null,
    });
    expect(JSON.parse(screen.getByTestId('state').textContent!).corruptDownload).toContain('"current":"{bad"');
  });

  it('exposes the preserved corrupt source again on the second initialization', () => {
    const recovered = {
      ...createInitialProgress(), learnerName: '已恢复',
      recovery: { lastRecoveredAt: '2026-07-12T08:09:10.000Z', source: 'snapshot' as const },
    };
    const envelope = JSON.stringify({
      current: '{bad', snapshot: serializeProgress(createInitialProgress()), capturedAt: '2026-07-12T08:09:10.000Z',
    });
    installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress(recovered),
      [CORRUPT_PROGRESS_KEY]: envelope,
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: '已恢复', loadStatus: 'normal', loadPersistence: 'saved',
      loadError: null, corruptError: null, corruptDownload: envelope,
    });
  });

  it('keeps unsaved progress in the session and exposes save failure', () => {
    installStorage({}, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: '会话新名字', saveStatus: 'unsaved', saveError: expect.stringContaining('写入当前存档'),
    });
  });

  it('retries only after first creating a real unsaved session state', () => {
    const storage = installStorage({}, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: '会话新名字', saveStatus: 'unsaved', saveError: expect.any(String),
    });
    storage.failWrites = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ saveStatus: 'saved', saveError: null });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '会话新名字' });
  });

  it('retries a recovered snapshot that could not initially be written back', () => {
    const storage = installStorage({
      [CURRENT_PROGRESS_KEY]: '{bad',
      [SNAPSHOT_PROGRESS_KEY]: serializeProgress({ ...createInitialProgress(), learnerName: '恢复会话' }),
    });
    storage.failKeys.add(CURRENT_PROGRESS_KEY);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: '恢复会话', loadStatus: 'recovered-from-snapshot', loadPersistence: 'unsaved',
    });
    storage.failKeys.clear();
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      loadStatus: 'recovered-from-snapshot', loadPersistence: 'saved', saveStatus: 'saved', saveError: null,
    });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '恢复会话' });
  });

  it('replaces React progress only after an import is durably saved', () => {
    const storage = installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress({ ...createInitialProgress(), learnerName: '旧名字' }),
    }, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    fireEvent.click(screen.getByRole('button', { name: '导入' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ learnerName: '旧名字' });
    storage.failWrites = false;
    fireEvent.click(screen.getByRole('button', { name: '导入' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ learnerName: '导入名字', saveStatus: 'saved' });
  });

  it('keeps current session progress when clear cannot be stored', () => {
    installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress({ ...createInitialProgress(), learnerName: '保留我' }),
    }, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    fireEvent.click(screen.getByRole('button', { name: '清空' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ learnerName: '保留我' });
  });

  it('creates a missing mission session and commits an updater result through V3 storage', () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);

    let result: ReturnType<ProgressContextValue['updateMissionSession']> | undefined;
    act(() => {
      result = latestContext!.updateMissionSession('w1-m1', (session) => (
        recordCompileFailure(session, 'program-structure', SESSION_NOW)
      ));
    });

    expect(result).toMatchObject({ status: 'saved' });
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state.sessions['w1-m1']).toMatchObject({
      compileFailures: 1,
      totalRuns: 0,
      conceptFailures: { programStructure: 1 },
      savedAt: SESSION_NOW,
    });
    expect(state.progressSavedAt).toMatch(/^\d{4}-\d{2}-\d{2}T.*\.\d{3}Z$/);
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m1'])
      .toEqual(state.sessions['w1-m1']);
  });

  it('updates an existing session instead of resetting its prior evidence', () => {
    const session = recordCompileFailure(createMissionSession(SESSION_NOW), 'program-structure', SESSION_NOW);
    installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress({
        ...createInitialProgress(),
        sessions: { 'w1-m1': session },
        savedAt: SESSION_NOW,
      }),
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);

    act(() => {
      latestContext!.updateMissionSession('w1-m1', (current) => (
        recordCompileFailure(current, 'program-structure', SESSION_NOW)
      ));
    });

    expect(JSON.parse(screen.getByTestId('state').textContent!).sessions['w1-m1'])
      .toMatchObject({ compileFailures: 2, conceptFailures: { programStructure: 2 } });
  });

  it('keeps an unsaved session mutation in memory and retries the same evidence', () => {
    const storage = installStorage({}, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);

    act(() => {
      latestContext!.recordMissionHint('w1-m1', 'observe');
    });
    const unsaved = JSON.parse(screen.getByTestId('state').textContent!);
    expect(unsaved).toMatchObject({
      saveStatus: 'unsaved',
      saveError: expect.any(String),
      sessions: { 'w1-m1': { usedHintTiers: ['observe'] } },
    });
    expect(localStorage.getItem(CURRENT_PROGRESS_KEY)).toBeNull();

    storage.failWrites = false;
    act(() => { latestContext!.retrySave(); });

    const saved = JSON.parse(screen.getByTestId('state').textContent!);
    expect(saved).toMatchObject({ saveStatus: 'saved', saveError: null });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m1'])
      .toEqual(saved.sessions['w1-m1']);
  });

  it('delegates hint recording to the session helper and deduplicates repeated tiers', () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);

    act(() => { latestContext!.recordMissionHint('w1-m1', 'think'); });
    act(() => { latestContext!.recordMissionHint('w1-m1', 'think'); });

    expect(JSON.parse(screen.getByTestId('state').textContent!).sessions['w1-m1'].usedHintTiers)
      .toEqual(['think']);
  });

  it('rejects unknown missions before calling the updater or changing memory', () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);
    const before = screen.getByTestId('state').textContent;
    let updaterCalled = false;

    expect(() => latestContext!.updateMissionSession('unknown-mission', (session) => {
      updaterCalled = true;
      return session;
    })).toThrow('任务编号无效');
    expect(updaterCalled).toBe(false);
    expect(screen.getByTestId('state').textContent).toBe(before);
    expect(localStorage.getItem(CURRENT_PROGRESS_KEY)).toBeNull();
  });

  it('rejects an invalid updater result without allowing updater mutation to pollute memory', () => {
    const session = createMissionSession(SESSION_NOW);
    installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress({
        ...createInitialProgress(), sessions: { 'w1-m1': session }, savedAt: SESSION_NOW,
      }),
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);
    const before = screen.getByTestId('state').textContent;
    const storedBefore = localStorage.getItem(CURRENT_PROGRESS_KEY);

    expect(() => latestContext!.updateMissionSession('w1-m1', (draft) => {
      draft.totalRuns = -1;
      return draft;
    })).toThrow(/非负整数/);

    expect(screen.getByTestId('state').textContent).toBe(before);
    expect(localStorage.getItem(CURRENT_PROGRESS_KEY)).toBe(storedBefore);
  });

  it('serializes two distinct hint mutations issued in the same event', () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);
    let first: ReturnType<ProgressContextValue['recordMissionHint']> | undefined;
    let second: ReturnType<ProgressContextValue['recordMissionHint']> | undefined;

    act(() => {
      first = latestContext!.recordMissionHint('w1-m1', 'observe');
      second = latestContext!.recordMissionHint('w1-m1', 'think');
    });

    expect(first).toMatchObject({ status: 'saved' });
    expect(second).toMatchObject({ status: 'saved' });
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state.sessions['w1-m1'].usedHintTiers).toEqual(['observe', 'think']);
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m1'])
      .toEqual(state.sessions['w1-m1']);
  });

  it('serializes two generic session updaters issued in the same event', () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);
    let first: ReturnType<ProgressContextValue['updateMissionSession']> | undefined;
    let second: ReturnType<ProgressContextValue['updateMissionSession']> | undefined;

    act(() => {
      first = latestContext!.updateMissionSession('w1-m1', (session) => (
        recordCompileFailure(session, 'program-structure', SESSION_NOW)
      ));
      second = latestContext!.updateMissionSession('w1-m1', (session) => (
        recordHint(session, 'partial', SESSION_NOW)
      ));
    });

    expect(first).toMatchObject({ status: 'saved' });
    expect(second).toMatchObject({ status: 'saved' });
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state.sessions['w1-m1']).toMatchObject({
      compileFailures: 1,
      conceptFailures: { programStructure: 1 },
      usedHintTiers: ['partial'],
    });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m1'])
      .toEqual(state.sessions['w1-m1']);
  });

  it('immediately retries the latest unsaved session before React rerenders', () => {
    const storage = installStorage({}, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    let failed: ReturnType<ProgressContextValue['recordMissionHint']> | undefined;
    let retried: ReturnType<ProgressContextValue['retrySave']> | undefined;

    act(() => {
      failed = latestContext!.recordMissionHint('w1-m1', 'observe');
      storage.failWrites = false;
      retried = latestContext!.retrySave();
    });

    expect(failed).toMatchObject({ status: 'unsaved' });
    expect(retried).toMatchObject({ status: 'saved' });
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state).toMatchObject({
      saveStatus: 'saved',
      saveError: null,
      sessions: { 'w1-m1': { usedHintTiers: ['observe'] } },
    });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m1'])
      .toEqual(state.sessions['w1-m1']);
  });
});
