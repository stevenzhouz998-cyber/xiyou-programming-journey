import { describe, expect, it } from 'vitest';
import { createInitialProgress, serializeProgress } from './progress';
import {
  CORRUPT_PROGRESS_KEY,
  CURRENT_PROGRESS_KEY,
  LEGACY_PROGRESS_KEY,
  SNAPSHOT_PROGRESS_KEY,
  clearProgressTransaction,
  createProgressBackup,
  importProgressTransaction,
  loadProgressTransaction,
  retrySave,
  saveProgressTransaction,
} from './storage';

const NOW = new Date('2026-07-12T08:09:10.000Z');
const clock = () => NOW;

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  failWrites = new Set<string>();
  throwAfterWrites = new Set<string>();
  mismatchWrites = new Set<string>();
  failReads = new Set<string>();
  failReadAfterWrites = new Set<string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) {
    if (this.failReads.has(key)) throw new Error(`read-blocked:${key}`);
    return this.values.get(key) ?? null;
  }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    if (this.failWrites.has(key)) throw new Error(`blocked:${key}`);
    this.values.set(key, this.mismatchWrites.has(key) ? `${value}-changed` : value);
    if (this.failReadAfterWrites.has(key)) this.failReads.add(key);
    if (this.throwAfterWrites.has(key)) throw new Error(`after-write:${key}`);
  }
  snapshot() { return Object.fromEntries(this.values); }
}

function progress(name: string) {
  return { ...createInitialProgress(), learnerName: name };
}

function legacy(name = '旧行者') {
  return JSON.stringify({
    version: 1,
    learnerName: name,
    missions: {},
    settings: { muted: false, reducedMotion: false, parentPin: '2580' },
    savedAt: '2026-07-01T00:00:00.000Z',
  });
}

describe('progress storage transactions', () => {
  it('returns initial progress without writing when no save exists', () => {
    const storage = new MemoryStorage();
    expect(loadProgressTransaction(storage, clock)).toEqual({
      progress: createInitialProgress(), status: 'normal', corruptDownload: null,
      persistence: 'saved', error: null,
    });
    expect(storage.length).toBe(0);
  });

  it('reports the original write failure when verification also fails', () => {
    const storage = new MemoryStorage();
    storage.failWrites.add(CURRENT_PROGRESS_KEY);
    expect(saveProgressTransaction(progress('会话'), storage)).toMatchObject({
      status: 'unsaved', error: expect.stringContaining(`blocked:${CURRENT_PROGRESS_KEY}`),
    });
  });

  it('loads a valid V2 current save normally', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('当前')));
    expect(loadProgressTransaction(storage, clock)).toMatchObject({ status: 'normal', persistence: 'saved', error: null, progress: { learnerName: '当前' } });
  });

  it('migrates a valid legacy V1 and preserves the legacy key', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_PROGRESS_KEY, legacy());
    const result = loadProgressTransaction(storage, clock);
    expect(result).toMatchObject({ status: 'migrated', persistence: 'saved', error: null, progress: { version: 2, learnerName: '旧行者' } });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(serializeProgress(result.progress));
    expect(storage.getItem(LEGACY_PROGRESS_KEY)).toBe(legacy());
  });

  it('keeps migrated session data but reports a real migration write failure', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_PROGRESS_KEY, legacy());
    storage.failWrites.add(CURRENT_PROGRESS_KEY);
    expect(loadProgressTransaction(storage, clock)).toMatchObject({
      status: 'migrated', persistence: 'unsaved', progress: { learnerName: '旧行者' },
      error: expect.stringContaining('迁移当前存档'),
    });
    expect(storage.getItem(LEGACY_PROGRESS_KEY)).toBe(legacy());
  });

  it('preserves corrupt current in an envelope and recovers a valid snapshot', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad current');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('快照')));
    const result = loadProgressTransaction(storage, clock);
    expect(result).toMatchObject({
      status: 'recovered-from-snapshot',
      persistence: 'saved', error: null,
      progress: { learnerName: '快照', recovery: { source: 'snapshot', lastRecoveredAt: NOW.toISOString() } },
    });
    const envelope = JSON.stringify({ current: '{bad current', snapshot: storage.getItem(SNAPSHOT_PROGRESS_KEY), capturedAt: NOW.toISOString() });
    expect(result.corruptDownload).toBe(envelope);
    expect(storage.getItem(CORRUPT_PROGRESS_KEY)).toBe(envelope);
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(serializeProgress(result.progress));
  });

  it('preserves both corrupt sources and resets when snapshot is invalid', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad current');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, '{bad snapshot');
    const result = loadProgressTransaction(storage, clock);
    expect(result).toMatchObject({
      status: 'reset-after-corruption', persistence: 'saved', error: null,
      progress: { recovery: { source: 'initial', lastRecoveredAt: NOW.toISOString() } },
    });
    expect(JSON.parse(result.corruptDownload!)).toEqual({ current: '{bad current', snapshot: '{bad snapshot', capturedAt: NOW.toISOString() });
    expect(storage.getItem(CORRUPT_PROGRESS_KEY)).toBe(result.corruptDownload);
  });

  it('treats an invalid snapshot as unavailable while retaining its raw value', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, JSON.stringify({ version: 999 }));
    const result = loadProgressTransaction(storage, clock);
    expect(result.status).toBe('reset-after-corruption');
    expect(JSON.parse(result.corruptDownload!).snapshot).toBe(JSON.stringify({ version: 999 }));
  });

  it('keeps recovered session data but reports a corrupt-envelope write failure', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('快照')));
    storage.failWrites.add(CORRUPT_PROGRESS_KEY);
    const result = loadProgressTransaction(storage, clock);
    expect(result).toMatchObject({
      status: 'recovered-from-snapshot', persistence: 'unsaved', progress: { learnerName: '快照' },
      error: expect.stringContaining('保留损坏存档'),
    });
    expect(result.corruptDownload).toContain('"current":"{bad"');
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe('{bad');
  });

  it('does not replace corrupt current with initial data when corrupt preservation fails', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad current');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, '{bad snapshot');
    storage.failWrites.add(CORRUPT_PROGRESS_KEY);
    expect(loadProgressTransaction(storage, clock)).toMatchObject({
      status: 'reset-after-corruption', persistence: 'unsaved',
      error: expect.stringContaining('保留损坏存档'),
    });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe('{bad current');
  });

  it('keeps corrupt current protected across later save, import, and clear transactions', () => {
    for (const transaction of [
      (storage: Storage) => saveProgressTransaction(progress('稍后保存'), storage),
      (storage: Storage) => importProgressTransaction(serializeProgress(progress('稍后导入')), storage),
      (storage: Storage) => clearProgressTransaction(storage),
    ]) {
      const storage = new MemoryStorage();
      storage.setItem(CURRENT_PROGRESS_KEY, '{bad current');
      storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('快照')));
      storage.failWrites.add(CORRUPT_PROGRESS_KEY);
      expect(loadProgressTransaction(storage, clock).persistence).toBe('unsaved');
      storage.failWrites.clear();
      const snapshotBefore = storage.getItem(SNAPSHOT_PROGRESS_KEY);

      expect(transaction(storage)).toMatchObject({
        status: 'unsaved', error: expect.stringContaining('损坏原文尚未安全保留'),
      });
      expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe('{bad current');
      expect(storage.getItem(SNAPSHOT_PROGRESS_KEY)).toBe(snapshotBefore);
    }
  });

  it('allows save, import, and clear when an exact valid corrupt envelope protects current', () => {
    for (const transaction of [
      (storage: Storage) => saveProgressTransaction(progress('稍后保存'), storage),
      (storage: Storage) => importProgressTransaction(serializeProgress(progress('稍后导入')), storage),
      (storage: Storage) => clearProgressTransaction(storage),
    ]) {
      const storage = new MemoryStorage();
      const corruptRaw = '{bad current';
      const envelope = JSON.stringify({ current: corruptRaw, snapshot: null, capturedAt: NOW.toISOString() });
      storage.setItem(CURRENT_PROGRESS_KEY, corruptRaw);
      storage.setItem(CORRUPT_PROGRESS_KEY, envelope);

      expect(transaction(storage).status).toBe('saved');
      expect(storage.getItem(CURRENT_PROGRESS_KEY)).not.toBe(corruptRaw);
      expect(storage.getItem(CORRUPT_PROGRESS_KEY)).toBe(envelope);
    }
  });

  it('rejects mismatched, malformed, or unreadable corrupt envelopes', () => {
    const cases: Array<(storage: MemoryStorage) => void> = [
      (storage) => storage.setItem(CORRUPT_PROGRESS_KEY, JSON.stringify({ current: 'different', snapshot: null, capturedAt: NOW.toISOString() })),
      (storage) => storage.setItem(CORRUPT_PROGRESS_KEY, '{bad envelope'),
      (storage) => storage.setItem(CORRUPT_PROGRESS_KEY, JSON.stringify({ current: '{bad current', snapshot: null, capturedAt: 'not-a-date' })),
      (storage) => {
        storage.setItem(CORRUPT_PROGRESS_KEY, JSON.stringify({ current: '{bad current', snapshot: null, capturedAt: NOW.toISOString(), extra: true }));
      },
      (storage) => storage.failReads.add(CORRUPT_PROGRESS_KEY),
    ];
    for (const arrange of cases) {
      const storage = new MemoryStorage();
      storage.setItem(CURRENT_PROGRESS_KEY, '{bad current');
      arrange(storage);
      expect(saveProgressTransaction(progress('新'), storage)).toMatchObject({
        status: 'unsaved', error: expect.stringContaining('损坏原文尚未安全保留'),
      });
      expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe('{bad current');
      expect(storage.getItem(SNAPSHOT_PROGRESS_KEY)).toBeNull();
    }
  });

  it('types current and legacy read failures as storage unavailable', () => {
    for (const failedKey of [CURRENT_PROGRESS_KEY, LEGACY_PROGRESS_KEY]) {
      const storage = new MemoryStorage();
      storage.failReads.add(failedKey);
      expect(() => loadProgressTransaction(storage, clock)).not.toThrow();
      expect(loadProgressTransaction(storage, clock)).toMatchObject({
        status: 'storage-unavailable', persistence: 'unsaved', progress: createInitialProgress(),
        error: expect.stringContaining(failedKey === CURRENT_PROGRESS_KEY ? '读取当前存档' : '读取旧版存档'),
      });
    }
  });

  it('preserves corrupt current and reports unavailable when snapshot read fails', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad current');
    storage.failReads.add(SNAPSHOT_PROGRESS_KEY);
    const result = loadProgressTransaction(storage, clock);
    expect(result).toMatchObject({
      status: 'storage-unavailable', persistence: 'unsaved',
      error: expect.stringContaining('读取快照'),
    });
    expect(JSON.parse(result.corruptDownload!)).toEqual({
      current: '{bad current', snapshot: null, capturedAt: NOW.toISOString(),
    });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe('{bad current');
    expect(storage.getItem(CORRUPT_PROGRESS_KEY)).toBe(result.corruptDownload);
  });

  it('returns recovered session data and reports when rewriting current fails', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('快照')));
    storage.failWrites.add(CURRENT_PROGRESS_KEY);
    expect(loadProgressTransaction(storage, clock)).toMatchObject({
      status: 'recovered-from-snapshot', persistence: 'unsaved', progress: { learnerName: '快照' },
      error: expect.stringContaining('写回恢复存档'),
    });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe('{bad');
  });

  it('writes validated current to snapshot before the new current', () => {
    const storage = new MemoryStorage();
    const old = progress('旧');
    const next = progress('新');
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(old));
    expect(saveProgressTransaction(next, storage)).toEqual({ status: 'saved', progress: next });
    expect(storage.getItem(SNAPSHOT_PROGRESS_KEY)).toBe(serializeProgress(old));
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(serializeProgress(next));
  });

  it('rejects invalid input without writing', () => {
    const storage = new MemoryStorage();
    const before = storage.snapshot();
    const invalid = { ...progress('坏'), version: 999 } as never;
    expect(saveProgressTransaction(invalid, storage)).toMatchObject({ status: 'unsaved', progress: invalid });
    expect(storage.snapshot()).toEqual(before);
  });

  it('reports snapshot and current write failures without replacing current', () => {
    for (const failedKey of [SNAPSHOT_PROGRESS_KEY, CURRENT_PROGRESS_KEY]) {
      const storage = new MemoryStorage();
      const oldRaw = serializeProgress(progress('旧'));
      storage.setItem(CURRENT_PROGRESS_KEY, oldRaw);
      storage.failWrites.add(failedKey);
      expect(saveProgressTransaction(progress('新'), storage).status).toBe('unsaved');
      expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(oldRaw);
    }
  });

  it('accepts set-after-write exceptions when verification finds the exact bytes', () => {
    for (const failedKey of [SNAPSHOT_PROGRESS_KEY, CURRENT_PROGRESS_KEY]) {
      const storage = new MemoryStorage();
      storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('旧')));
      storage.throwAfterWrites.add(failedKey);
      expect(saveProgressTransaction(progress('新'), storage).status).toBe('saved');
    }

    const recoveryStorage = new MemoryStorage();
    recoveryStorage.setItem(CURRENT_PROGRESS_KEY, '{bad');
    recoveryStorage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('快照')));
    recoveryStorage.throwAfterWrites.add(CORRUPT_PROGRESS_KEY);
    expect(loadProgressTransaction(recoveryStorage, clock)).toMatchObject({ persistence: 'saved', error: null });
  });

  it('reports verification mismatch and read failures as unsaved', () => {
    const mismatch = new MemoryStorage();
    mismatch.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('旧')));
    mismatch.mismatchWrites.add(SNAPSHOT_PROGRESS_KEY);
    expect(saveProgressTransaction(progress('新'), mismatch)).toMatchObject({
      status: 'unsaved', error: expect.stringContaining('写入快照'),
    });

    const unreadable = new MemoryStorage();
    unreadable.failReads.add(CURRENT_PROGRESS_KEY);
    expect(saveProgressTransaction(progress('新'), unreadable)).toMatchObject({
      status: 'unsaved', error: expect.stringContaining('读取当前存档'),
    });

    const verifyUnreadable = new MemoryStorage();
    verifyUnreadable.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('旧')));
    verifyUnreadable.failReadAfterWrites.add(SNAPSHOT_PROGRESS_KEY);
    expect(saveProgressTransaction(progress('新'), verifyUnreadable)).toMatchObject({
      status: 'unsaved', error: expect.stringContaining('无法校验写入结果'),
    });

    const corruptVerifyUnreadable = new MemoryStorage();
    corruptVerifyUnreadable.setItem(CURRENT_PROGRESS_KEY, '{bad');
    corruptVerifyUnreadable.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('快照')));
    corruptVerifyUnreadable.failReadAfterWrites.add(CORRUPT_PROGRESS_KEY);
    expect(loadProgressTransaction(corruptVerifyUnreadable, clock)).toMatchObject({
      status: 'recovered-from-snapshot', persistence: 'unsaved',
      error: expect.stringContaining('保留损坏存档失败：无法校验写入结果'),
    });
  });

  it('retries the same transaction successfully after storage recovers', () => {
    const storage = new MemoryStorage();
    storage.failWrites.add(CURRENT_PROGRESS_KEY);
    expect(saveProgressTransaction(progress('新'), storage).status).toBe('unsaved');
    storage.failWrites.clear();
    expect(retrySave(progress('新'), storage).status).toBe('saved');
  });

  it('rejects malformed and future imports without changing any key', () => {
    for (const raw of ['{bad', JSON.stringify({ version: 999 })]) {
      const storage = new MemoryStorage();
      storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('旧')));
      storage.setItem(SNAPSHOT_PROGRESS_KEY, 'existing snapshot');
      storage.setItem(CORRUPT_PROGRESS_KEY, 'existing corrupt');
      const before = storage.snapshot();
      expect(importProgressTransaction(raw, storage).status).toBe('rejected');
      expect(storage.snapshot()).toEqual(before);
    }
  });

  it('imports valid data and snapshots the prior current', () => {
    const storage = new MemoryStorage();
    const old = progress('旧');
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(old));
    const result = importProgressTransaction(legacy('导入'), storage);
    expect(result).toMatchObject({ status: 'saved', progress: { version: 2, learnerName: '导入' } });
    expect(storage.getItem(SNAPSHOT_PROGRESS_KEY)).toBe(serializeProgress(old));
  });

  it('creates a stable dated JSON backup without DOM side effects', () => {
    const backup = createProgressBackup(progress('备份'), clock);
    expect(backup).toEqual({
      filename: 'xiyou-progress-2026-07-12.json',
      contents: serializeProgress(progress('备份')),
      mimeType: 'application/json',
    });
  });

  it('clears by snapshotting valid current before writing initial progress', () => {
    const storage = new MemoryStorage();
    const old = progress('旧');
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(old));
    const result = clearProgressTransaction(storage);
    expect(result).toEqual({ status: 'saved', progress: createInitialProgress() });
    expect(storage.getItem(SNAPSHOT_PROGRESS_KEY)).toBe(serializeProgress(old));
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(serializeProgress(createInitialProgress()));
  });

  it('makes clear write failures observable and retains current', () => {
    const storage = new MemoryStorage();
    const oldRaw = serializeProgress(progress('旧'));
    storage.setItem(CURRENT_PROGRESS_KEY, oldRaw);
    storage.failWrites.add(CURRENT_PROGRESS_KEY);
    expect(clearProgressTransaction(storage).status).toBe('unsaved');
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(oldRaw);
  });
});
