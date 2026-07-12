import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ProgressProvider, useProgress } from './ProgressContext';
import { createInitialProgress, serializeProgress } from '../progress/progress';
import { CURRENT_PROGRESS_KEY, SNAPSHOT_PROGRESS_KEY } from '../progress/storage';

const originalStorage = localStorage;

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
  return <>
    <output data-testid="state">{JSON.stringify({
      learnerName: state.progress.learnerName,
      loadStatus: state.loadStatus,
      loadPersistence: state.loadPersistence,
      loadError: state.loadError,
      corruptDownload: state.corruptDownload,
      saveStatus: state.saveStatus,
      saveError: state.saveError,
    })}</output>
    <button onClick={() => state.replaceProgress({ ...state.progress, learnerName: '会话新名字' })}>保存</button>
    <button onClick={() => state.acknowledgePrivacy()}>确认隐私</button>
    <button onClick={() => state.retrySave()}>重试保存</button>
  </>;
}

describe('ProgressContext persistence status', () => {
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
});
