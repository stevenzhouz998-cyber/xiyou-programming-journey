import { describe, expect, it } from 'vitest';
import { createInitialProgress, serializeProgress } from './progress';
import {
  CORRUPT,
  CORRUPT_PROGRESS_KEY,
  CURRENT,
  CURRENT_PROGRESS_KEY,
  LEGACY_PROGRESS_KEY,
  LEGACY_V2_CORRUPT_KEY,
  LEGACY_V2_CURRENT_KEY,
  LEGACY_V2_SNAPSHOT_KEY,
  SNAPSHOT,
  SNAPSHOT_PROGRESS_KEY,
  clearProgressTransaction,
  createProgressBackup,
  importProgressTransaction,
  loadProgressTransaction,
  retrySave,
  saveProgressTransaction,
} from './storage';
import type { ProgressV3 } from './types';

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

function legacyV2(name = 'V2 行者') {
  const current = createInitialProgress();
  const { sessions: _sessions, ...withoutSessions } = current;
  return JSON.stringify({ ...withoutSessions, version: 2, learnerName: name }, null, 2);
}

function progressWithSession(name: string): ProgressV3 {
  return {
    ...progress(name),
    sessions: {
      'w1-m1': {
        workspace: {
          version: 1,
          blocks: [{ id: 'saved-block', type: 'xiyou_enter_palace', nextId: null, x: 12, y: 34 }],
        },
        lastTrace: [{
          instructionId: 'instruction:saved-block',
          sourceBlockId: 'saved-block',
          opcode: 'enter_palace',
        }],
        lastRun: null,
        totalRuns: 4,
        runtimeFailures: 1,
        compileFailures: 2,
        usedHintTiers: ['observe'],
        conceptFailures: { programStructure: 2, sequencePrecondition: 1, completeness: 0 },
        lastRunAt: '2026-07-12T08:00:00.000Z',
        savedAt: '2026-07-12T08:01:00.000Z',
      },
    },
  };
}

describe('progress storage transactions', () => {
  it('uses exact V3 keys and keeps the aliases pointed at V3', () => {
    expect(CURRENT_PROGRESS_KEY).toBe('xiyou-programming-progress-v3');
    expect(SNAPSHOT_PROGRESS_KEY).toBe('xiyou-programming-progress-snapshot-v3');
    expect(CORRUPT_PROGRESS_KEY).toBe('xiyou-programming-progress-corrupt-v3');
    expect(LEGACY_V2_CURRENT_KEY).toBe('xiyou-programming-progress-v2');
    expect(LEGACY_V2_SNAPSHOT_KEY).toBe('xiyou-programming-progress-snapshot-v2');
    expect(LEGACY_V2_CORRUPT_KEY).toBe('xiyou-programming-progress-corrupt-v2');
    expect(LEGACY_PROGRESS_KEY).toBe('xiyou-programming-progress-v1');
    expect({ CURRENT, SNAPSHOT, CORRUPT }).toEqual({
      CURRENT: CURRENT_PROGRESS_KEY,
      SNAPSHOT: SNAPSHOT_PROGRESS_KEY,
      CORRUPT: CORRUPT_PROGRESS_KEY,
    });
  });

  it('returns initial progress without writing when no save exists', () => {
    const storage = new MemoryStorage();
    expect(loadProgressTransaction(storage, clock)).toEqual({
      progress: createInitialProgress(), status: 'normal', corruptDownload: null,
      persistence: 'idle', error: null, corruptError: null,
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

  it('loads a valid current V3 save normally while retaining V2 key strings', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('当前')));
    storage.setItem(LEGACY_V2_CURRENT_KEY, legacyV2('不应覆盖 V3'));
    expect(loadProgressTransaction(storage, clock)).toMatchObject({ status: 'normal', persistence: 'saved', error: null, progress: { learnerName: '当前' } });
  });

  it('migrates valid V2 current to V3 and preserves every legacy V2 key byte-for-byte', () => {
    const storage = new MemoryStorage();
    const v2Current = legacyV2('V2 迁移');
    const v2Snapshot = legacyV2('V2 快照');
    const v2Corrupt = JSON.stringify({
      current: '{legacy bad current', snapshot: v2Snapshot, capturedAt: NOW.toISOString(),
    });
    storage.setItem(LEGACY_V2_CURRENT_KEY, v2Current);
    storage.setItem(LEGACY_V2_SNAPSHOT_KEY, v2Snapshot);
    storage.setItem(LEGACY_V2_CORRUPT_KEY, v2Corrupt);

    const result = loadProgressTransaction(storage, clock);

    expect(result).toMatchObject({
      status: 'migrated', persistence: 'saved', error: null, corruptError: null,
      corruptDownload: v2Corrupt,
      progress: { version: 3, learnerName: 'V2 迁移', sessions: {} },
    });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(serializeProgress(result.progress));
    expect(storage.getItem(LEGACY_V2_CURRENT_KEY)).toBe(v2Current);
    expect(storage.getItem(LEGACY_V2_SNAPSHOT_KEY)).toBe(v2Snapshot);
    expect(storage.getItem(LEGACY_V2_CORRUPT_KEY)).toBe(v2Corrupt);
  });

  it('skips malformed V2 current and migrates a valid V1 without changing either legacy key', () => {
    const storage = new MemoryStorage();
    const badV2 = '{bad V2';
    const validV1 = legacy('V1 回退');
    storage.setItem(LEGACY_V2_CURRENT_KEY, badV2);
    storage.setItem(LEGACY_PROGRESS_KEY, validV1);

    expect(loadProgressTransaction(storage, clock)).toMatchObject({
      status: 'migrated', persistence: 'saved', progress: { learnerName: 'V1 回退' },
    });
    expect(storage.getItem(LEGACY_V2_CURRENT_KEY)).toBe(badV2);
    expect(storage.getItem(LEGACY_PROGRESS_KEY)).toBe(validV1);
  });

  it('does not migrate malformed V2 or V1 current data', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_V2_CURRENT_KEY, '{bad V2');
    storage.setItem(LEGACY_PROGRESS_KEY, JSON.stringify({ version: 1, learnerName: '字段不完整' }));

    expect(loadProgressTransaction(storage, clock)).toMatchObject({
      status: 'normal', persistence: 'idle', progress: createInitialProgress(),
    });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_V2_CURRENT_KEY)).toBe('{bad V2');
    expect(storage.getItem(LEGACY_PROGRESS_KEY)).toBe(JSON.stringify({ version: 1, learnerName: '字段不完整' }));
  });

  it('keeps a valid corrupt envelope downloadable after recovered current is reopened', () => {
    const storage = new MemoryStorage();
    const recovered = {
      ...progress('已恢复'),
      recovery: { lastRecoveredAt: NOW.toISOString(), source: 'snapshot' as const },
    };
    const envelope = JSON.stringify({
      current: '{bad current',
      snapshot: serializeProgress(progress('恢复源快照')),
      capturedAt: NOW.toISOString(),
    });
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(recovered));
    storage.setItem(CORRUPT_PROGRESS_KEY, envelope);

    expect(loadProgressTransaction(storage, clock)).toMatchObject({
      status: 'normal', persistence: 'saved', error: null, corruptError: null,
      corruptDownload: envelope,
      progress: { learnerName: '已恢复' },
    });
    expect(storage.getItem(CORRUPT_PROGRESS_KEY)).toBe(envelope);
  });

  it('prefers the V3 corrupt envelope and only falls back to legacy V2 when V3 is absent', () => {
    const storage = new MemoryStorage();
    const v3Envelope = JSON.stringify({ current: '{v3 bad', snapshot: null, capturedAt: NOW.toISOString() });
    const v2Envelope = JSON.stringify({ current: '{v2 bad', snapshot: null, capturedAt: NOW.toISOString() });
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('有效当前')));
    storage.setItem(CORRUPT_PROGRESS_KEY, v3Envelope);
    storage.setItem(LEGACY_V2_CORRUPT_KEY, v2Envelope);
    expect(loadProgressTransaction(storage, clock)).toMatchObject({
      corruptDownload: v3Envelope, corruptError: null,
    });

    storage.removeItem(CORRUPT_PROGRESS_KEY);
    expect(loadProgressTransaction(storage, clock)).toMatchObject({
      corruptDownload: v2Envelope, corruptError: null,
    });
    expect(storage.getItem(LEGACY_V2_CORRUPT_KEY)).toBe(v2Envelope);
  });

  it('honestly reports malformed or unreadable legacy V2 corrupt envelopes without inventing a download', () => {
    const malformed = new MemoryStorage();
    malformed.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('有效当前')));
    malformed.setItem(LEGACY_V2_CORRUPT_KEY, '{bad envelope');
    expect(loadProgressTransaction(malformed, clock)).toMatchObject({
      corruptDownload: null,
      corruptError: expect.stringContaining('损坏存档信息无法读取'),
    });

    const unreadable = new MemoryStorage();
    unreadable.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('有效当前')));
    unreadable.setItem(LEGACY_V2_CORRUPT_KEY, JSON.stringify({
      current: '{legacy bad', snapshot: null, capturedAt: NOW.toISOString(),
    }));
    unreadable.failReads.add(LEGACY_V2_CORRUPT_KEY);
    expect(loadProgressTransaction(unreadable, clock)).toMatchObject({
      corruptDownload: null,
      corruptError: expect.stringContaining('无法读取损坏存档信息'),
    });
  });

  it('keeps valid current saved while exposing malformed or unreadable corrupt-envelope errors', () => {
    const malformed = new MemoryStorage();
    malformed.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('有效当前')));
    malformed.setItem(CORRUPT_PROGRESS_KEY, '{bad envelope');
    malformed.setItem(LEGACY_V2_CORRUPT_KEY, JSON.stringify({
      current: '{valid legacy envelope', snapshot: null, capturedAt: NOW.toISOString(),
    }));
    expect(loadProgressTransaction(malformed, clock)).toMatchObject({
      status: 'normal', persistence: 'saved', error: null, corruptDownload: null,
      corruptError: expect.stringContaining('损坏存档信息无法读取'),
      progress: { learnerName: '有效当前' },
    });
    expect(malformed.getItem(CORRUPT_PROGRESS_KEY)).toBe('{bad envelope');

    const unreadable = new MemoryStorage();
    unreadable.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('有效当前')));
    unreadable.setItem(CORRUPT_PROGRESS_KEY, JSON.stringify({ current: '{bad', snapshot: null, capturedAt: NOW.toISOString() }));
    unreadable.setItem(LEGACY_V2_CORRUPT_KEY, JSON.stringify({
      current: '{valid legacy envelope', snapshot: null, capturedAt: NOW.toISOString(),
    }));
    unreadable.failReads.add(CORRUPT_PROGRESS_KEY);
    expect(loadProgressTransaction(unreadable, clock)).toMatchObject({
      status: 'normal', persistence: 'saved', error: null, corruptDownload: null,
      corruptError: expect.stringContaining('无法读取损坏存档信息'),
      progress: { learnerName: '有效当前' },
    });
  });

  it('migrates a valid legacy V1 and preserves the legacy key', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_PROGRESS_KEY, legacy());
    const result = loadProgressTransaction(storage, clock);
    expect(result).toMatchObject({ status: 'migrated', persistence: 'saved', error: null, progress: { version: 3, sessions: {}, learnerName: '旧行者' } });
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

  it('reports V2 migration write failure as migrated and unsaved while preserving legacy evidence', () => {
    const storage = new MemoryStorage();
    const v2Current = legacyV2('写失败 V2');
    const v2Envelope = JSON.stringify({ current: '{old bad', snapshot: null, capturedAt: NOW.toISOString() });
    storage.setItem(LEGACY_V2_CURRENT_KEY, v2Current);
    storage.setItem(LEGACY_V2_CORRUPT_KEY, v2Envelope);
    storage.failWrites.add(CURRENT_PROGRESS_KEY);

    expect(loadProgressTransaction(storage, clock)).toMatchObject({
      status: 'migrated', persistence: 'unsaved', corruptDownload: v2Envelope,
      progress: { learnerName: '写失败 V2' }, error: expect.stringContaining('迁移当前存档'),
    });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_V2_CURRENT_KEY)).toBe(v2Current);
    expect(storage.getItem(LEGACY_V2_CORRUPT_KEY)).toBe(v2Envelope);
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

  it('recovers V3 snapshot sessions and preserves them when reopened', () => {
    const storage = new MemoryStorage();
    const damagedBytes = '\u0000{broken V3 bytes}\n';
    const snapshot = progressWithSession('含会话快照');
    storage.setItem(CURRENT_PROGRESS_KEY, damagedBytes);
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(snapshot));

    const recovered = loadProgressTransaction(storage, clock);
    expect(recovered).toMatchObject({
      status: 'recovered-from-snapshot', persistence: 'saved',
      progress: { learnerName: '含会话快照', sessions: { 'w1-m1': { totalRuns: 4 } } },
    });
    expect(JSON.parse(recovered.corruptDownload!).current).toBe(damagedBytes);

    const reopened = loadProgressTransaction(storage, clock);
    expect(reopened).toMatchObject({
      status: 'normal', persistence: 'saved', corruptDownload: recovered.corruptDownload,
      progress: { learnerName: '含会话快照', sessions: { 'w1-m1': { totalRuns: 4 } } },
    });
    expect(reopened.progress.sessions['w1-m1']).toEqual(recovered.progress.sessions['w1-m1']);
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

      const result = transaction(storage);
      expect(result).toMatchObject({ error: expect.stringContaining('损坏原文尚未安全保留') });
      expect(['unsaved', 'unchanged']).toContain(result.status);
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

      expect(['saved', 'cleared']).toContain(transaction(storage).status);
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
    for (const [failedKey, message] of [
      [CURRENT_PROGRESS_KEY, '读取当前存档'],
      [LEGACY_V2_CURRENT_KEY, '读取 V2 旧版存档'],
      [LEGACY_PROGRESS_KEY, '读取旧版存档'],
    ] as const) {
      const storage = new MemoryStorage();
      storage.failReads.add(failedKey);
      expect(() => loadProgressTransaction(storage, clock)).not.toThrow();
      expect(loadProgressTransaction(storage, clock)).toMatchObject({
        status: 'storage-unavailable', persistence: 'unsaved', progress: createInitialProgress(),
        error: expect.stringContaining(message),
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
    expect(result).toMatchObject({ status: 'saved', sourceVersion: 1, progress: { version: 3, sessions: {}, learnerName: '导入' } });
    expect(storage.getItem(SNAPSHOT_PROGRESS_KEY)).toBe(serializeProgress(old));
  });

  it.each([
    [1, () => legacy('V1 来源')],
    [2, () => legacyV2('V2 来源')],
    [3, () => serializeProgress(progress('V3 来源'))],
  ] as const)('reports sourceVersion %s and returns V3 for a valid import', (sourceVersion, raw) => {
    const storage = new MemoryStorage();
    const result = importProgressTransaction(raw(), storage);
    expect(result).toMatchObject({
      status: 'saved',
      sourceVersion,
      progress: { version: 3, sessions: {} },
    });
    if (result.status !== 'saved') throw new Error('expected saved import');
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(serializeProgress(result.progress));
    expect(storage.getItem(LEGACY_V2_CURRENT_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_PROGRESS_KEY)).toBeNull();
  });

  it('rolls back every import key byte-for-byte when writing current fails', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('旧')));
    storage.setItem(SNAPSHOT_PROGRESS_KEY, 'snapshot bytes');
    storage.setItem(CORRUPT_PROGRESS_KEY, 'corrupt bytes');
    const before = storage.snapshot();
    storage.failWrites.add(CURRENT_PROGRESS_KEY);
    const result = importProgressTransaction(serializeProgress(progress('新')), storage);
    expect(result.status).toBe('unsaved');
    expect(storage.snapshot()).toEqual(before);
  });

  it('rolls back only V3 import keys and never touches legacy keys', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('旧 V3')));
    storage.setItem(SNAPSHOT_PROGRESS_KEY, 'V3 snapshot bytes');
    storage.setItem(CORRUPT_PROGRESS_KEY, 'V3 corrupt bytes');
    storage.setItem(LEGACY_V2_CURRENT_KEY, legacyV2('旧 V2'));
    storage.setItem(LEGACY_V2_SNAPSHOT_KEY, 'V2 snapshot bytes');
    storage.setItem(LEGACY_V2_CORRUPT_KEY, 'V2 corrupt bytes');
    storage.setItem(LEGACY_PROGRESS_KEY, legacy('旧 V1'));
    const before = storage.snapshot();
    storage.failWrites.add(CURRENT_PROGRESS_KEY);

    expect(importProgressTransaction(serializeProgress(progressWithSession('新 V3')), storage)).toMatchObject({
      status: 'unsaved', sourceVersion: 3, storageMayHaveChanged: false,
    });
    expect(storage.snapshot()).toEqual(before);
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
    expect(result).toEqual({ status: 'cleared', progress: createInitialProgress() });
    expect(storage.getItem(SNAPSHOT_PROGRESS_KEY)).toBe(serializeProgress(old));
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(serializeProgress(createInitialProgress()));
  });

  it('makes clear write failures observable and retains current', () => {
    const storage = new MemoryStorage();
    const oldRaw = serializeProgress(progress('旧'));
    storage.setItem(CURRENT_PROGRESS_KEY, oldRaw);
    storage.failWrites.add(CURRENT_PROGRESS_KEY);
    expect(clearProgressTransaction(storage).status).toBe('unchanged');
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(oldRaw);
  });

  it('reports unknown when clear commits but the result cannot be read back', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('旧')));
    storage.failReadAfterWrites.add(CURRENT_PROGRESS_KEY);
    const result = clearProgressTransaction(storage);
    expect(result).toMatchObject({ status: 'unknown', error: expect.stringContaining('无法确认') });
    storage.failReads.clear();
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(serializeProgress(createInitialProgress()));
  });
});
