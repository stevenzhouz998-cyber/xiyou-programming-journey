import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressProvider, useProgress, type ProgressContextValue } from './ProgressContext';
import { completeMission, createInitialProgress, serializeProgress } from '../progress/progress';
import { CORRUPT_PROGRESS_KEY, CURRENT_PROGRESS_KEY, LEGACY_PROGRESS_KEY, REVISION_PROGRESS_KEY, SNAPSHOT_PROGRESS_KEY } from '../progress/storage';
import {
  createMissionSession,
  recordCompileFailure,
  recordHint,
  recordRun,
} from '../progress/session';
import { runRuyiStaffBattle } from '../battle/ruyiStaff';
import { runFourSeasRegalia } from '../battle/fourSeasRegalia';
import type { RuyiStaffInstruction } from '../battle/types';
import * as Blockly from 'blockly';
import { registerFourSeasRegaliaBlocks } from '../blockly/fourSeasRegaliaBlocks';
import { compileFourSeasRegaliaWorkspace } from '../blockly/fourSeasRegaliaCompiler';
import { loadFourSeasWorkspaceDraft, type FourSeasWorkspaceDraftV1 } from '../blockly/fourSeasRegaliaDraft';
import { updateWorkspaceDraft } from '../progress/session';
import type { CoordinatedSaveResult } from '../progress/storageCoordinator';

const originalStorage = localStorage;
const originalLocks = Object.getOwnPropertyDescriptor(navigator, 'locks');
const SESSION_NOW = '2026-07-15T06:00:00.000Z';
const ruyiTrace: RuyiStaffInstruction[] = [
  { instructionId: 'instruction:inspect', sourceBlockId: 'inspect', opcode: 'inspect_weights' },
  { instructionId: 'instruction:choose', sourceBlockId: 'choose', opcode: 'choose_ruyi_staff' },
  { instructionId: 'instruction:shrink', sourceBlockId: 'shrink', opcode: 'shrink_ruyi_staff' },
];

function realFourSeasFixture() {
  const draft: FourSeasWorkspaceDraftV1 = {
    version: 1,
    blocks: [
      { id: 'request', type: 'xiyou_request_regalia', nextId: 'collect', parentBlockId: null, x: 0, y: 0 },
      { id: 'collect', type: 'xiyou_collect_gifts', nextId: 'equip', parentBlockId: null, x: 10, y: 10 },
      { id: 'boots-gift', type: 'xiyou_receive_cloud_boots', nextId: 'armor-gift', parentBlockId: 'collect', x: 20, y: 20 },
      { id: 'armor-gift', type: 'xiyou_receive_golden_armor', nextId: 'crown-gift', parentBlockId: 'collect', x: 30, y: 30 },
      { id: 'crown-gift', type: 'xiyou_receive_purple_crown', nextId: null, parentBlockId: 'collect', x: 40, y: 40 },
      { id: 'equip', type: 'xiyou_equip_regalia', nextId: 'verify', parentBlockId: null, x: 50, y: 50 },
      { id: 'crown-wear', type: 'xiyou_wear_crown', nextId: 'armor-wear', parentBlockId: 'equip', x: 60, y: 60 },
      { id: 'armor-wear', type: 'xiyou_wear_armor', nextId: 'boots-wear', parentBlockId: 'equip', x: 70, y: 70 },
      { id: 'boots-wear', type: 'xiyou_wear_boots', nextId: null, parentBlockId: 'equip', x: 80, y: 80 },
      { id: 'verify', type: 'xiyou_verify_regalia', nextId: null, parentBlockId: null, x: 90, y: 90 },
    ],
  };
  registerFourSeasRegaliaBlocks();
  const workspace = new Blockly.Workspace();
  try {
    loadFourSeasWorkspaceDraft(workspace, draft);
    const compiled = compileFourSeasRegaliaWorkspace(workspace);
    if (!compiled.ok) throw new Error('expected real w1-m3 fixture to compile');
    return { draft, trace: compiled.trace, run: runFourSeasRegalia(compiled.trace) };
  } finally {
    workspace.dispose();
  }
}
let latestContext: ProgressContextValue | null = null;

function installImmediateLocks() {
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: async <T,>(_name: string, callback: () => Promise<T> | T): Promise<T> => callback() },
  });
}

function installStorage(initial: Record<string, string>, failWrites = false) {
  const values = new Map(Object.entries(initial));
  const controls = {
    failWrites,
    failKeys: new Set<string>(),
    failReads: new Set<string>(),
    failReadAfterWrites: new Set<string>(),
    peek: (key: string) => values.get(key) ?? null,
  };
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => {
      if (controls.failReads.has(key)) throw new Error('disk read unavailable');
      return values.get(key) ?? null;
    },
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => {
      if (controls.failWrites || controls.failKeys.has(key)) throw new Error('disk unavailable');
      values.set(key, value);
      if (controls.failReadAfterWrites.has(key)) controls.failReads.add(key);
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
  return controls;
}

beforeEach(() => installImmediateLocks());

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', { value: originalStorage, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: originalStorage, configurable: true });
  originalStorage.clear();
  if (originalLocks) Object.defineProperty(navigator, 'locks', originalLocks);
  else Reflect.deleteProperty(navigator, 'locks');
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
      saveRetryable: state.saveRetryable,
      parentPin: state.progress.settings.parentPin,
      muted: state.progress.settings.muted,
      missions: state.progress.missions,
      sessions: state.progress.sessions,
      equipment: state.progress.equipment,
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
  it('normalizes a rejected storage chunk load and leaves pending with an actionable error', async () => {
    installStorage({});
    render(<ProgressProvider
      loadSaveCoordinator={() => Promise.reject(new Error('storage chunk 503'))}
    ><Probe /></ProgressProvider>);

    let result: Awaited<ReturnType<ProgressContextValue['updateSettings']>> | undefined;
    await act(async () => { result = await latestContext!.updateSettings({ muted: true }); });

    expect(result).toMatchObject({ status: 'unsaved', error: expect.stringContaining('storage chunk 503') });
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      saveStatus: 'unsaved', saveError: expect.stringContaining('storage chunk 503'),
    });
  });

  it('normalizes a rejected Web Lock request and leaves pending with an actionable error', async () => {
    installStorage({});
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: async () => { throw new Error('lock request rejected'); } },
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);

    let result: Awaited<ReturnType<ProgressContextValue['updateSettings']>> | undefined;
    await act(async () => { result = await latestContext!.updateSettings({ muted: true }); });

    expect(result).toMatchObject({ status: 'unsaved', error: expect.stringContaining('lock request rejected') });
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      saveStatus: 'unsaved', saveError: expect.stringContaining('lock request rejected'),
    });
  });

  it('never lets an older completed save overwrite a newer in-memory draft', async () => {
    installStorage({});
    const held: Array<() => void> = [];
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: <T,>(_name: string, callback: () => Promise<T> | T) => new Promise<T>((resolve, reject) => {
          held.push(() => { void Promise.resolve(callback()).then(resolve, reject); });
        }),
      },
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);

    let first!: ReturnType<ProgressContextValue['updateMissionSession']>;
    let second!: ReturnType<ProgressContextValue['updateMissionSession']>;
    act(() => {
      first = latestContext!.updateMissionSession('w1-m1', (session) => recordCompileFailure(session, 'program-structure', SESSION_NOW));
      second = latestContext!.updateMissionSession('w1-m1', (session) => recordCompileFailure(session, 'program-structure', SESSION_NOW));
    });
    await waitFor(() => expect(held).toHaveLength(1));
    await act(async () => { held.shift()!(); await first; });

    expect(latestContext!.progress.sessions['w1-m1']?.compileFailures).toBe(2);

    await waitFor(() => expect(held).toHaveLength(1));
    await act(async () => { held.shift()!(); await second; });
  });
  it('never lets a held initial repair overwrite a newer in-memory draft', async () => {
    installStorage({
      [LEGACY_PROGRESS_KEY]: JSON.stringify({
        version: 1, learnerName: '旧迁移', missions: {},
        settings: { muted: false, reducedMotion: false, parentPin: '2580' },
        savedAt: '2026-07-01T00:00:00.000Z',
      }),
      [REVISION_PROGRESS_KEY]: '0',
    });
    const held: Array<() => void> = [];
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: {
        request: <T,>(_name: string, callback: () => Promise<T> | T) => new Promise<T>((resolve, reject) => {
          held.push(() => { void Promise.resolve(callback()).then(resolve, reject); });
        }),
      },
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);
    await waitFor(() => expect(held).toHaveLength(1));

    let edit!: ReturnType<ProgressContextValue['replaceProgress']>;
    act(() => { edit = latestContext!.replaceProgress({ ...latestContext!.progress, learnerName: '快速新草稿' }); });
    expect(latestContext!.progress.learnerName).toBe('快速新草稿');

    await act(async () => { held.shift()!(); });
    await waitFor(() => expect(held).toHaveLength(1));
    expect(latestContext!.progress.learnerName).toBe('快速新草稿');

    await act(async () => { held.shift()!(); await edit; });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '快速新草稿' });
    expect(localStorage.getItem(REVISION_PROGRESS_KEY)).toBe('2');
  });
  it('pauses a stale tab on an external revision and reloads only after an explicit user action', async () => {
    installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress({ ...createInitialProgress(), learnerName: 'A 初始' }),
      [REVISION_PROGRESS_KEY]: '1',
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);

    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...createInitialProgress(), learnerName: 'B 已保存' }));
    localStorage.setItem(REVISION_PROGRESS_KEY, '2');
    window.dispatchEvent(new StorageEvent('storage', { key: REVISION_PROGRESS_KEY, newValue: '2' }));
    await waitFor(() => expect(latestContext!.saveStatus).toBe('conflict'));
    expect(latestContext!.progress.learnerName).toBe('A 初始');

    const stale = await latestContext!.replaceProgress({ ...latestContext!.progress, learnerName: 'A 旧草稿' });
    expect(stale).toMatchObject({ status: 'conflict' });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: 'B 已保存' });

    act(() => latestContext!.reloadExternalProgress());
    expect(latestContext!.progress.learnerName).toBe('B 已保存');
    expect(latestContext!.revision).toBe(2);
  });
  it('atomically replaces load metadata when an explicit external reload recovers a corrupt current value', async () => {
    installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress({ ...createInitialProgress(), learnerName: 'A 初始' }),
      [REVISION_PROGRESS_KEY]: '1',
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: 'A 初始', loadStatus: 'normal', corruptDownload: null, corruptError: null,
    });

    const recovered = { ...createInitialProgress(), learnerName: 'B 快照' };
    const corrupt = '{broken external current';
    localStorage.setItem(CURRENT_PROGRESS_KEY, corrupt);
    localStorage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(recovered));
    localStorage.setItem(REVISION_PROGRESS_KEY, '2');
    window.dispatchEvent(new StorageEvent('storage', { key: REVISION_PROGRESS_KEY, newValue: '2' }));
    await waitFor(() => expect(latestContext!.saveStatus).toBe('conflict'));

    act(() => latestContext!.reloadExternalProgress());
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: 'B 快照',
      loadStatus: 'recovered-from-snapshot',
      loadPersistence: 'unsaved',
      loadError: null,
      corruptError: null,
    });
    expect(JSON.parse(screen.getByTestId('state').textContent!).corruptDownload).toContain(corrupt);
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      loadStatus: 'recovered-from-snapshot', loadPersistence: 'saved', saveStatus: 'saved', saveError: null,
    }));
  });
  it('starts idle before the first durable mutation and then becomes saved', async () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ loadPersistence: 'idle', saveStatus: 'idle' });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ loadPersistence: 'saved', saveStatus: 'saved' }));
  });
  it('exposes snapshot recovery load details and becomes saved only after coordinated repair', async () => {
    installStorage({
      [CURRENT_PROGRESS_KEY]: '{bad',
      [SNAPSHOT_PROGRESS_KEY]: serializeProgress({ ...createInitialProgress(), learnerName: '快照名字' }),
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: '快照名字', loadStatus: 'recovered-from-snapshot', loadPersistence: 'unsaved', loadError: null,
    });
    expect(JSON.parse(screen.getByTestId('state').textContent!).corruptDownload).toContain('"current":"{bad"');
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      loadPersistence: 'saved', saveStatus: 'saved', saveError: null,
    }));
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

  it('keeps unsaved progress in the session and exposes save failure', async () => {
    installStorage({}, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: '会话新名字', saveStatus: 'unsaved', saveError: expect.stringContaining('写入当前存档'),
    }));
  });

  it('retries only after first creating a real unsaved session state', async () => {
    const storage = installStorage({}, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: '会话新名字', saveStatus: 'unsaved', saveError: expect.any(String),
    }));
    storage.failWrites = false;
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ saveStatus: 'saved', saveError: null }));
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '会话新名字' });
  });

  it('retries a recovered snapshot that could not initially be written back', async () => {
    const storage = installStorage({
      [CURRENT_PROGRESS_KEY]: '{bad',
      [SNAPSHOT_PROGRESS_KEY]: serializeProgress({ ...createInitialProgress(), learnerName: '恢复会话' }),
    });
    storage.failKeys.add(CURRENT_PROGRESS_KEY);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      learnerName: '恢复会话', loadStatus: 'recovered-from-snapshot', loadPersistence: 'unsaved',
      saveStatus: 'unsaved', saveError: expect.stringContaining('写回加载存档'),
    }));
    storage.failKeys.clear();
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      loadStatus: 'recovered-from-snapshot', loadPersistence: 'saved', saveStatus: 'saved', saveError: null,
    }));
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '恢复会话' });
  });

  it('replaces React progress only after an import is durably saved', async () => {
    const storage = installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress({ ...createInitialProgress(), learnerName: '旧名字' }),
    }, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    fireEvent.click(screen.getByRole('button', { name: '导入' }));
    await waitFor(() => expect(latestContext!.saveStatus).toBe('unsaved'));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ learnerName: '旧名字' });
    storage.failWrites = false;
    fireEvent.click(screen.getByRole('button', { name: '导入' }));
    await waitFor(() => expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ learnerName: '导入名字', saveStatus: 'saved' }));
  });

  it('keeps current session progress when clear cannot be stored', () => {
    installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress({ ...createInitialProgress(), learnerName: '保留我' }),
    }, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    fireEvent.click(screen.getByRole('button', { name: '清空' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ learnerName: '保留我' });
  });

  it('publishes a parent credential only after the dedicated durable transaction succeeds', async () => {
    const initial = createInitialProgress();
    initial.settings.parentPin = '4826';
    const storage = installStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(initial) });
    storage.failKeys.add(CURRENT_PROGRESS_KEY);
    render(<ProgressProvider><Probe /></ProgressProvider>);

    let failed: Awaited<ReturnType<ProgressContextValue['commitParentAccess']>> | undefined;
    await act(async () => { failed = await latestContext!.commitParentAccess('7319'); });
    expect(failed).toMatchObject({ status: 'unsaved' });
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      parentPin: '4826', saveStatus: 'unsaved', saveError: expect.any(String), saveRetryable: false,
    });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).settings.parentPin).toBe('4826');

    storage.failKeys.clear();
    await act(async () => { await latestContext!.retrySave(); });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).settings.parentPin).toBe('4826');
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ parentPin: '4826' });

    let saved: Awaited<ReturnType<ProgressContextValue['commitParentAccess']>> | undefined;
    await act(async () => { saved = await latestContext!.commitParentAccess('7319'); });
    expect(saved).toMatchObject({ status: 'saved' });
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({ parentPin: '7319', saveStatus: 'saved' });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).settings.parentPin).toBe('7319');
  });

  it('reports credential storage as uncertain when a write cannot be read back or rolled back', async () => {
    const initial = createInitialProgress();
    initial.settings.parentPin = '4826';
    const storage = installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress(initial),
      [REVISION_PROGRESS_KEY]: '0',
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);
    storage.failReadAfterWrites.add(CURRENT_PROGRESS_KEY);

    let result: Awaited<ReturnType<ProgressContextValue['commitParentAccess']>> | undefined;
    await act(async () => { result = await latestContext!.commitParentAccess('7319'); });

    expect(result).toMatchObject({ status: 'unsaved', storageMayHaveChanged: true });
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      parentPin: '4826', saveStatus: 'unsaved', saveError: expect.stringContaining('回滚失败'),
    });
    expect(JSON.parse(storage.peek(CURRENT_PROGRESS_KEY)!).settings.parentPin).toBe('7319');
    expect(storage.peek(REVISION_PROGRESS_KEY)).toBe('0');
  });

  it('creates a missing mission session and commits an updater result through V3 storage', async () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);

    let result: Awaited<ReturnType<ProgressContextValue['updateMissionSession']>> | undefined;
    await act(async () => {
      result = await latestContext!.updateMissionSession('w1-m1', (session) => (
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

  it('coordinates a typed w1-m2 run and completion without counting session writes as attempts', async () => {
    const unlocked = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 0 });
    installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress(unlocked),
      [REVISION_PROGRESS_KEY]: '0',
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);

    await act(async () => {
      await latestContext!.updateMissionSession('w1-m2', (session) => (
        recordRun(session, runRuyiStaffBattle(ruyiTrace), ruyiTrace, SESSION_NOW)
      ));
    });

    let stored = JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!);
    expect(stored.sessions['w1-m2']).toMatchObject({ totalRuns: 1, runtimeFailures: 0 });
    expect(stored.missions['w1-m2']).toBeUndefined();
    expect(localStorage.getItem(REVISION_PROGRESS_KEY)).toBe('1');

    await act(async () => {
      await latestContext!.complete('w1-m2', { stars: 3, hintsUsed: 0 });
    });
    stored = JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!);
    expect(stored.missions['w1-m2']).toMatchObject({ attempts: 1, stars: 3 });
    expect(stored.sessions['w1-m2']).toMatchObject({ totalRuns: 1 });
    expect(stored.equipment.inventory['ruyi-staff']).toMatchObject({ grantedBy: 'w1-m2' });
    expect(localStorage.getItem(REVISION_PROGRESS_KEY)).toBe('2');
  });

  it('coordinates equip and unequip through the existing save queue', async () => {
    let earned = completeMission(createInitialProgress(), 'w1-m1', { stars: 3, hintsUsed: 0 });
    earned = completeMission(earned, 'w1-m2', { stars: 3, hintsUsed: 0 });
    installStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(earned), [REVISION_PROGRESS_KEY]: '0' });
    render(<ProgressProvider><Probe /></ProgressProvider>);

    let equipped!: CoordinatedSaveResult;
    await act(async () => {
      equipped = await latestContext!.updateEquipment({ type: 'equip', slot: 'weapon', itemId: 'ruyi-staff' });
    });
    expect(equipped).toMatchObject({ status: 'saved' });
    expect(latestContext!.progress.equipment.equipped.weapon).toBe('ruyi-staff');

    await act(async () => {
      await latestContext!.updateEquipment({ type: 'unequip', slot: 'weapon' });
    });
    expect(latestContext!.progress.equipment.equipped.weapon).toBeNull();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).equipment.equipped.weapon).toBeNull();
  });

  it('coordinates typed w1-m3 draft, canonical run, and hint through the existing V3 coordinator', async () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);
    const fixture = realFourSeasFixture();

    await act(async () => {
      await latestContext!.updateMissionSession('w1-m3', (session) => recordHint(
        recordRun(updateWorkspaceDraft(session, fixture.draft, SESSION_NOW), fixture.run, fixture.trace, SESSION_NOW),
        'observe',
        SESSION_NOW,
      ));
    });

    const stored = JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!);
    expect(stored.sessions['w1-m3']).toMatchObject({ totalRuns: 1, usedHintTiers: ['observe'] });
    expect(stored.sessions['w1-m3'].workspace.blocks.find((block: { id: string }) => block.id === 'boots-gift'))
      .toMatchObject({ parentBlockId: 'collect' });
    expect(stored.missions['w1-m3']).toBeUndefined();
  });

  it('coordinates a typed m4 session through the same V3 coordinator without treating it as legacy state', async () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);
    let result!: CoordinatedSaveResult;
    await act(async () => {
      result = await latestContext!.updateMissionSession('w1-m4', (session) => (
        recordCompileFailure(session, 'program-structure', SESSION_NOW)
      ));
    });
    expect(result).toMatchObject({ status: 'saved' });
    expect(latestContext!.progress.sessions['w1-m4']).toMatchObject({ workspace: { missionId: 'w1-m4' }, compileFailures: 1, totalRuns: 0 });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m4'])
      .toMatchObject({ workspace: { missionId: 'w1-m4' }, conceptFailures: { programStructure: 1 } });
  });

  it('keeps an unsaved w1-m3 edit in memory and retries the exact session after storage recovers', async () => {
    const controls = installStorage({}, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    const fixture = realFourSeasFixture();

    let failed!: CoordinatedSaveResult;
    await act(async () => {
      failed = await latestContext!.updateMissionSession('w1-m3', (session) => (
        recordRun(session, fixture.run, fixture.trace, SESSION_NOW)
      ));
    });
    expect(failed).toMatchObject({ status: 'unsaved' });
    expect(latestContext!.progress.sessions['w1-m3']).toMatchObject({ totalRuns: 1 });
    expect(localStorage.getItem(CURRENT_PROGRESS_KEY)).toBeNull();

    controls.failWrites = false;
    await act(async () => { await latestContext!.retrySave(); });
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m3'])
      .toMatchObject({ totalRuns: 1, lastTrace: fixture.trace });
  });

  it('fails closed on a CAS conflict before a w1-m3 write can replace external progress', async () => {
    installStorage({
      [CURRENT_PROGRESS_KEY]: serializeProgress(createInitialProgress()),
      [REVISION_PROGRESS_KEY]: '1',
    });
    render(<ProgressProvider><Probe /></ProgressProvider>);
    const external = { ...createInitialProgress(), learnerName: '外部已保存' };
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(external));
    localStorage.setItem(REVISION_PROGRESS_KEY, '2');
    window.dispatchEvent(new StorageEvent('storage', { key: REVISION_PROGRESS_KEY, newValue: '2' }));
    await waitFor(() => expect(latestContext!.saveStatus).toBe('conflict'));

    const result = await latestContext!.updateMissionSession('w1-m3', (session) => (
      recordCompileFailure(session, 'program-structure', SESSION_NOW)
    ));
    expect(result).toMatchObject({ status: 'conflict' });
    expect(latestContext!.progress.sessions['w1-m3']).toBeUndefined();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).learnerName).toBe('外部已保存');
  });

  it('merges a w1-m3 session into an unpublished completion transaction without extra attempts', async () => {
    installStorage({});
    const pending: Array<{
      progress: Parameters<typeof import('../progress/storageCoordinator').saveProgressCoordinated>[0];
      resolve: (result: CoordinatedSaveResult) => void;
    }> = [];
    const saveProgressCoordinated = vi.fn<typeof import('../progress/storageCoordinator').saveProgressCoordinated>((progress) => (
      new Promise<CoordinatedSaveResult>((resolve) => pending.push({ progress, resolve }))
    ));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as unknown as typeof import('../progress/storageCoordinator'))}><Probe /></ProgressProvider>);

    let completion!: Promise<CoordinatedSaveResult>;
    let sessionWrite!: Promise<CoordinatedSaveResult>;
    act(() => {
      completion = latestContext!.complete('w1-m3', { stars: 3, hintsUsed: 0 });
      sessionWrite = latestContext!.updateMissionSession('w1-m3', (session) => (
        recordCompileFailure(session, 'program-structure', SESSION_NOW)
      ));
    });
    await waitFor(() => expect(pending).toHaveLength(1));
    await act(async () => pending[0].resolve({ status: 'saved', revision: 1, progress: pending[0].progress }));
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[1].progress).toMatchObject({
      missions: { 'w1-m3': { attempts: 1 } },
      sessions: { 'w1-m3': { compileFailures: 1 } },
    });
    await act(async () => pending[1].resolve({ status: 'saved', revision: 2, progress: pending[1].progress }));
    await act(async () => { await Promise.all([completion, sessionWrite]); });
    expect(latestContext!.progress).toMatchObject({
      missions: { 'w1-m3': { attempts: 1 } },
      sessions: { 'w1-m3': { compileFailures: 1 } },
    });
  });

  it('keeps one unpublished completion transaction across settings, hints, sessions and another completion', async () => {
    installStorage({});
    const pending: Array<{
      progress: Parameters<typeof import('../progress/storageCoordinator').saveProgressCoordinated>[0];
      resolve: (result: CoordinatedSaveResult) => void;
    }> = [];
    const saveProgressCoordinated = vi.fn<typeof import('../progress/storageCoordinator').saveProgressCoordinated>((progress) => (
      new Promise<CoordinatedSaveResult>((resolve) => pending.push({ progress, resolve }))
    ));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as unknown as typeof import('../progress/storageCoordinator'))}><Probe /></ProgressProvider>);

    let writes!: Array<Promise<CoordinatedSaveResult>>;
    act(() => {
      writes = [
        latestContext!.complete('w1-m1', { stars: 2, hintsUsed: 0 }),
        latestContext!.updateSettings({ muted: true }),
        latestContext!.recordMissionHint('w1-m2', 'observe'),
        latestContext!.updateMissionSession('w1-m2', (session) => recordCompileFailure(session, 'program-structure', SESSION_NOW)),
        latestContext!.complete('w1-m2', { stars: 3, hintsUsed: 1 }),
      ];
    });

    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      muted: false, missions: {}, sessions: {}, saveStatus: 'pending',
    });

    for (let index = 0; index < writes.length; index += 1) {
      await waitFor(() => expect(pending).toHaveLength(index + 1));
      if (index < writes.length - 1) {
        expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
          muted: false, missions: {}, sessions: {},
        });
      }
      const current = pending[index];
      await act(async () => current.resolve({ status: 'saved', revision: index + 1, progress: current.progress }));
    }
    await act(async () => { await Promise.all(writes); });

    const final = JSON.parse(screen.getByTestId('state').textContent!);
    expect(final).toMatchObject({
      muted: true,
      missions: {
        'w1-m1': { status: 'completed', stars: 2 },
        'w1-m2': { status: 'completed', stars: 3 },
      },
      sessions: { 'w1-m2': { compileFailures: 1, usedHintTiers: ['observe'] } },
      saveStatus: 'saved',
    });
    expect(pending.every(({ progress }) => (
      progress === pending[0].progress || progress.missions['w1-m1']?.status === 'completed'
    ))).toBe(true);
  });

  it('blocks later unpublished writes after the first completion fails and retries the exact merged candidate', async () => {
    installStorage({});
    let resolveFirst!: (result: CoordinatedSaveResult) => void;
    const first = new Promise<CoordinatedSaveResult>((resolve) => { resolveFirst = resolve; });
    const saveProgressCoordinated = vi.fn<typeof import('../progress/storageCoordinator').saveProgressCoordinated>()
      .mockImplementationOnce(() => first)
      .mockImplementation(async (progress) => ({ status: 'saved', revision: 1, progress }));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as unknown as typeof import('../progress/storageCoordinator'))}><Probe /></ProgressProvider>);

    let writes!: Array<Promise<CoordinatedSaveResult>>;
    act(() => {
      writes = [
        latestContext!.complete('w1-m1', { stars: 2, hintsUsed: 0 }),
        latestContext!.updateSettings({ muted: true }),
        latestContext!.complete('w1-m2', { stars: 3, hintsUsed: 1 }),
      ];
    });
    await waitFor(() => expect(saveProgressCoordinated).toHaveBeenCalledOnce());
    await act(async () => resolveFirst({ status: 'unsaved', progress: saveProgressCoordinated.mock.calls[0][0], error: 'held completion failed' }));
    await act(async () => { await Promise.all(writes); });

    expect(saveProgressCoordinated).toHaveBeenCalledOnce();
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      muted: false, missions: {}, saveStatus: 'unsaved',
    });
    await act(async () => { await latestContext!.updateSettings({ reducedMotion: true }); });
    expect(saveProgressCoordinated).toHaveBeenCalledOnce();
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      muted: false, missions: {}, saveStatus: 'unsaved',
    });
    const candidate = JSON.parse(latestContext!.createBackup().contents);
    expect(candidate).toMatchObject({
      settings: { muted: true, reducedMotion: true },
      missions: {
        'w1-m1': { status: 'completed', stars: 2 },
        'w1-m2': { status: 'completed', stars: 3 },
      },
      equipment: { inventory: { 'ruyi-staff': { grantedBy: 'w1-m2' } } },
    });

    await act(async () => { await latestContext!.retrySave(); });
    expect(saveProgressCoordinated).toHaveBeenCalledTimes(2);
    expect(saveProgressCoordinated.mock.calls[1][0]).toEqual(candidate);
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      muted: true,
      missions: {
        'w1-m1': { status: 'completed' },
        'w1-m2': { status: 'completed' },
      },
      saveStatus: 'saved',
    });
  });

  it('refuses a hint for the same mission while its completion candidate is unpublished', async () => {
    const unlocked = completeMission(createInitialProgress(), 'w1-m1', { stars: 3, hintsUsed: 0 });
    installStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(unlocked) });
    const saveProgressCoordinated = vi.fn<typeof import('../progress/storageCoordinator').saveProgressCoordinated>()
      .mockImplementationOnce(async (progress) => ({ status: 'unsaved', progress, error: 'final completion failed' }))
      .mockImplementation(async (progress) => ({ status: 'saved', revision: 1, progress }));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as unknown as typeof import('../progress/storageCoordinator'))}><Probe /></ProgressProvider>);

    let failed!: CoordinatedSaveResult;
    await act(async () => {
      failed = await latestContext!.complete('w1-m2', { stars: 3, hintsUsed: 0 });
    });
    expect(failed).toMatchObject({ status: 'unsaved' });
    const candidateBeforeHint = JSON.parse(latestContext!.createBackup().contents);

    let blockedHint!: CoordinatedSaveResult;
    await act(async () => {
      blockedHint = await latestContext!.recordMissionHint('w1-m2', 'observe');
    });

    expect(blockedHint).toMatchObject({ status: 'unsaved' });
    expect(saveProgressCoordinated).toHaveBeenCalledOnce();
    expect(JSON.parse(latestContext!.createBackup().contents)).toEqual(candidateBeforeHint);
    expect(candidateBeforeHint.sessions['w1-m2']?.usedHintTiers ?? []).toEqual([]);

    await act(async () => { await latestContext!.retrySave(); });
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      missions: { 'w1-m2': { status: 'completed', stars: 3, hintsUsed: 0 } },
      sessions: {},
      saveStatus: 'saved',
    });
    expect(saveProgressCoordinated.mock.calls[1][0]).toEqual(candidateBeforeHint);
    expect(JSON.parse(latestContext!.createBackup().contents)).toEqual(candidateBeforeHint);
  });

  it('rejects a parent access mutation while final completion is held without changing its candidate or recovery state', async () => {
    const initial = createInitialProgress();
    installStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(initial) });
    const saveProgressCoordinated = vi.fn<typeof import('../progress/storageCoordinator').saveProgressCoordinated>()
      .mockImplementationOnce(async (progress) => ({ status: 'unsaved', progress, error: 'final completion failed' }))
      .mockImplementation(async (progress) => ({ status: 'saved', revision: 1, progress }));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as unknown as typeof import('../progress/storageCoordinator'))}><Probe /></ProgressProvider>);

    await act(async () => { await latestContext!.complete('w1-m1', { stars: 3, hintsUsed: 0 }); });
    let parentResult!: Awaited<ReturnType<ProgressContextValue['commitParentAccess']>>;
    await act(async () => { parentResult = await latestContext!.commitParentAccess('new-parent-access'); });

    expect(parentResult).toMatchObject({ status: 'unsaved', error: expect.stringContaining('通关结果') });
    expect(saveProgressCoordinated).toHaveBeenCalledOnce();
    expect(JSON.parse(screen.getByTestId('state').textContent!)).toMatchObject({
      parentPin: 'unset', missions: {}, saveStatus: 'unsaved', saveError: 'final completion failed', saveRetryable: true,
    });
    expect(JSON.parse(latestContext!.createBackup().contents)).toMatchObject({
      settings: { parentPin: 'unset' }, missions: { 'w1-m1': { status: 'completed' } },
    });

    await act(async () => { await latestContext!.retrySave(); });
    expect(saveProgressCoordinated).toHaveBeenCalledTimes(2);
    expect(saveProgressCoordinated.mock.calls[1][0]).toMatchObject({
      settings: { parentPin: 'unset' }, missions: { 'w1-m1': { status: 'completed' } },
    });
  });

  it('atomically discards a held completion after a successful explicit import and never retries the old candidate', async () => {
    const initial = { ...createInitialProgress(), learnerName: '旧状态' };
    installStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(initial) });
    const saveProgressCoordinated = vi.fn<typeof import('../progress/storageCoordinator').saveProgressCoordinated>()
      .mockImplementationOnce(async (progress) => ({ status: 'unsaved', progress, error: 'final completion failed' }))
      .mockImplementation(async (progress, expectedRevision) => ({ status: 'saved', revision: expectedRevision + 1, progress }));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as unknown as typeof import('../progress/storageCoordinator'))}><Probe /></ProgressProvider>);
    await act(async () => { await latestContext!.complete('w1-m1', { stars: 3, hintsUsed: 0 }); });

    const imported = { ...createInitialProgress(), learnerName: '导入替换状态' };
    await act(async () => { await latestContext!.importProgressFile(serializeProgress(imported)); });

    expect(latestContext!.progress).toMatchObject({ learnerName: '导入替换状态', missions: {} });
    expect(JSON.parse(latestContext!.createBackup().contents)).toMatchObject({ learnerName: '导入替换状态', missions: {} });
    await act(async () => { await latestContext!.retrySave(); });
    expect(saveProgressCoordinated.mock.calls.at(-1)?.[0]).toMatchObject({ learnerName: '导入替换状态', missions: {} });
    expect(latestContext!.progress.missions['w1-m1']).toBeUndefined();
  });

  it('atomically discards a held completion after a successful explicit clear and never retries the old candidate', async () => {
    const initial = { ...createInitialProgress(), learnerName: '准备清空' };
    installStorage({ [CURRENT_PROGRESS_KEY]: serializeProgress(initial) });
    const saveProgressCoordinated = vi.fn<typeof import('../progress/storageCoordinator').saveProgressCoordinated>()
      .mockImplementationOnce(async (progress) => ({ status: 'unsaved', progress, error: 'final completion failed' }))
      .mockImplementation(async (progress, expectedRevision) => ({ status: 'saved', revision: expectedRevision + 1, progress }));
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as unknown as typeof import('../progress/storageCoordinator'))}><Probe /></ProgressProvider>);
    await act(async () => { await latestContext!.complete('w1-m1', { stars: 3, hintsUsed: 0 }); });

    await act(async () => { await latestContext!.clearProgress(); });

    expect(latestContext!.progress).toMatchObject({ learnerName: '小行者', missions: {} });
    expect(JSON.parse(latestContext!.createBackup().contents)).toMatchObject({ learnerName: '小行者', missions: {} });
    await act(async () => { await latestContext!.retrySave(); });
    expect(saveProgressCoordinated.mock.calls.at(-1)?.[0]).toMatchObject({ learnerName: '小行者', missions: {} });
    expect(latestContext!.progress.missions['w1-m1']).toBeUndefined();
  });

  it('passes legacy workspace cleanup through the same coordinated session save', async () => {
    const legacyWorkspaceKey = 'xiyou-workspace-w1-m1';
    installStorage({ [legacyWorkspaceKey]: '{"legacy":true}' });
    render(<ProgressProvider><Probe /></ProgressProvider>);

    let result: Awaited<ReturnType<ProgressContextValue['updateMissionSession']>> | undefined;
    await act(async () => {
      result = await latestContext!.updateMissionSession(
        'w1-m1',
        (session) => recordCompileFailure(session, 'program-structure', SESSION_NOW),
        { legacyWorkspaceKey },
      );
    });

    expect(result).toMatchObject({ status: 'saved', revision: 1 });
    expect(localStorage.getItem(legacyWorkspaceKey)).toBeNull();
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m1'])
      .toMatchObject({ compileFailures: 1 });
    expect(localStorage.getItem(REVISION_PROGRESS_KEY)).toBe('1');
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

  it('keeps an unsaved session mutation in memory and retries the same evidence', async () => {
    const storage = installStorage({}, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);

    await act(async () => {
      await latestContext!.recordMissionHint('w1-m1', 'observe');
    });
    const unsaved = JSON.parse(screen.getByTestId('state').textContent!);
    expect(unsaved).toMatchObject({
      saveStatus: 'unsaved',
      saveError: expect.any(String),
      sessions: { 'w1-m1': { usedHintTiers: ['observe'] } },
    });
    expect(localStorage.getItem(CURRENT_PROGRESS_KEY)).toBeNull();

    storage.failWrites = false;
    await act(async () => { await latestContext!.retrySave(); });

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

    const updater = (session: never) => {
      updaterCalled = true;
      return session;
    };
    expect(() => Reflect.apply(
      latestContext!.updateMissionSession,
      null,
      ['unknown-mission', updater],
    )).toThrow('任务编号无效');
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

  it('serializes two distinct hint mutations issued in the same event', async () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);
    let first: Awaited<ReturnType<ProgressContextValue['recordMissionHint']>> | undefined;
    let second: Awaited<ReturnType<ProgressContextValue['recordMissionHint']>> | undefined;

    await act(async () => {
      const firstTask = latestContext!.recordMissionHint('w1-m1', 'observe');
      const secondTask = latestContext!.recordMissionHint('w1-m1', 'think');
      first = await firstTask;
      second = await secondTask;
    });

    expect(first).toMatchObject({ status: 'saved' });
    expect(second).toMatchObject({ status: 'saved' });
    const state = JSON.parse(screen.getByTestId('state').textContent!);
    expect(state.sessions['w1-m1'].usedHintTiers).toEqual(['observe', 'think']);
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m1'])
      .toEqual(state.sessions['w1-m1']);
  });

  it('serializes two generic session updaters issued in the same event', async () => {
    installStorage({});
    render(<ProgressProvider><Probe /></ProgressProvider>);
    let first: Awaited<ReturnType<ProgressContextValue['updateMissionSession']>> | undefined;
    let second: Awaited<ReturnType<ProgressContextValue['updateMissionSession']>> | undefined;

    await act(async () => {
      const firstTask = latestContext!.updateMissionSession('w1-m1', (session) => (
        recordCompileFailure(session, 'program-structure', SESSION_NOW)
      ));
      const secondTask = latestContext!.updateMissionSession('w1-m1', (session) => (
        recordHint(session, 'partial', SESSION_NOW)
      ));
      first = await firstTask;
      second = await secondTask;
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

  it('immediately retries the latest unsaved session before React rerenders', async () => {
    const storage = installStorage({}, true);
    render(<ProgressProvider><Probe /></ProgressProvider>);
    let failed: Awaited<ReturnType<ProgressContextValue['recordMissionHint']>> | undefined;
    let retried: Awaited<ReturnType<ProgressContextValue['retrySave']>> | undefined;

    await act(async () => {
      failed = await latestContext!.recordMissionHint('w1-m1', 'observe');
      storage.failWrites = false;
      retried = await latestContext!.retrySave();
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
