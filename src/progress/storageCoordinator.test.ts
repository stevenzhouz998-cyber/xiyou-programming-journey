import { describe, expect, it } from 'vitest';
import { completeMission, createInitialProgress, serializeProgress } from './progress';
import {
  CORRUPT_PROGRESS_KEY,
  CURRENT_PROGRESS_KEY,
  LEGACY_PROGRESS_KEY,
  loadProgressTransaction,
  REVISION_PROGRESS_KEY,
  SNAPSHOT_PROGRESS_KEY,
} from './storage';
import { saveProgressCoordinated } from './storageCoordinator';
import { repairLoadedProgressCoordinated } from './storageRepair';
import { clearProgressCoordinated, importProgressCoordinated } from './storageCoordinatorParent';
import type { ProgressV3 } from './types';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  failWrites = new Set<string>();
  failWritesOnce = new Set<string>();
  failRemoves = new Set<string>();
  failCurrentValues = new Set<string>();
  failReads = new Set<string>();
  failReadAfterWrites = new Set<string>();
  removedKeys: string[] = [];
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) {
    if (this.failReads.has(key)) throw new Error(`read-blocked:${key}`);
    return this.values.get(key) ?? null;
  }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) {
    this.removedKeys.push(key);
    if (this.failRemoves.has(key)) throw new Error(`remove-blocked:${key}`);
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    if (this.failWritesOnce.delete(key)) throw new Error(`write-blocked-once:${key}`);
    if (this.failWrites.has(key)) throw new Error(`write-blocked:${key}`);
    if (key === CURRENT_PROGRESS_KEY && this.failCurrentValues.has(value)) throw new Error(`value-blocked:${key}`);
    this.values.set(key, value);
    if (this.failReadAfterWrites.has(key)) this.failReads.add(key);
  }
  peek(key: string) { return this.values.get(key) ?? null; }
}

const immediateLockManager = {
  request: async <T>(_name: string, callback: () => Promise<T> | T): Promise<T> => callback(),
};

describe('cross-tab storage coordinator', () => {
  it('ignores browser test fault sentinels in the production coordinator', async () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(createInitialProgress()));
    storage.setItem(REVISION_PROGRESS_KEY, '0');
    storage.setItem('xiyou-test-storage-mode', 'fail-regalia-completion');
    let completed: ProgressV3 = createInitialProgress();
    completed = completeMission(completed, 'w1-m1', { stars: 3, hintsUsed: 0 });
    completed = completeMission(completed, 'w1-m2', { stars: 3, hintsUsed: 0 });
    completed = completeMission(completed, 'w1-m3', { stars: 3, hintsUsed: 0 });

    const result = await saveProgressCoordinated(completed, 0, { storage, lockManager: immediateLockManager });

    expect(result).toMatchObject({ status: 'saved', revision: 1 });
    expect(JSON.parse(storage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ missions: { 'w1-m3': { status: 'completed' } } });
  });
  it('fails closed without a reliable cross-tab lock instead of reporting a silent save success', async () => {
    const storage = new MemoryStorage();
    const currentRaw = serializeProgress(createInitialProgress());
    storage.setItem(CURRENT_PROGRESS_KEY, currentRaw);
    storage.setItem(REVISION_PROGRESS_KEY, '0');

    const result = await saveProgressCoordinated(
      { ...createInitialProgress(), learnerName: '不应静默覆盖' },
      0,
      { storage, lockManager: null },
    );

    expect(result).toMatchObject({ status: 'unsaved', error: expect.stringContaining('跨标签页') });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(currentRaw);
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('0');
  });

  it('normalizes a rejected Web Lock request to unsaved without touching storage', async () => {
    const storage = new MemoryStorage();
    const currentRaw = serializeProgress(createInitialProgress());
    storage.setItem(CURRENT_PROGRESS_KEY, currentRaw);
    storage.setItem(REVISION_PROGRESS_KEY, '0');
    const lockManager = { request: async <T>(): Promise<T> => { throw new Error('lock denied'); } };

    const result = await saveProgressCoordinated(
      { ...createInitialProgress(), learnerName: '不应写入' },
      0,
      { storage, lockManager },
    );

    expect(result).toMatchObject({ status: 'unsaved', error: expect.stringContaining('lock denied') });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(currentRaw);
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('0');
  });

  it('serializes writes with Web Locks and rejects the stale writer without mutating storage', async () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(createInitialProgress()));
    storage.setItem(REVISION_PROGRESS_KEY, '0');
    let queue = Promise.resolve();
    const lockManager = {
      request: <T>(_name: string, callback: () => Promise<T> | T): Promise<T> => {
        const run = queue.then(callback, callback);
        queue = run.then(() => undefined, () => undefined);
        return run;
      },
    };
    const a = { ...createInitialProgress(), learnerName: 'A' };
    const b = { ...createInitialProgress(), learnerName: 'B' };

    const [first, stale] = await Promise.all([
      saveProgressCoordinated(a, 0, { storage, lockManager }),
      saveProgressCoordinated(b, 0, { storage, lockManager }),
    ]);

    expect(first).toMatchObject({ status: 'saved', revision: 1 });
    expect(stale).toMatchObject({ status: 'conflict', expectedRevision: 0, actualRevision: 1 });
    expect(JSON.parse(storage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: 'A' });
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('1');
  });

  it('rolls the V3 save back byte-for-byte when coordinated legacy cleanup fails', async () => {
    const storage = new MemoryStorage();
    const legacyWorkspaceKey = 'xiyou-workspace-w1-m1';
    const legacyWorkspaceRaw = '{"blocks":{"languageVersion":0,"blocks":[]}}';
    const currentRaw = serializeProgress({ ...createInitialProgress(), learnerName: '旧孩子' });
    storage.setItem(CURRENT_PROGRESS_KEY, currentRaw);
    storage.setItem(REVISION_PROGRESS_KEY, '0');
    storage.setItem(legacyWorkspaceKey, legacyWorkspaceRaw);
    storage.failRemoves.add(legacyWorkspaceKey);

    const result = await saveProgressCoordinated(
      { ...createInitialProgress(), learnerName: '迁移孩子' },
      0,
      { storage, lockManager: immediateLockManager, legacyWorkspaceKey },
    );

    expect(result).toMatchObject({ status: 'unsaved', error: expect.stringContaining('旧版积木草稿清理失败') });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(currentRaw);
    expect(storage.getItem(legacyWorkspaceKey)).toBe(legacyWorkspaceRaw);
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('0');
  });

  it('serializes legacy cleanup with clear so exactly one same-revision transaction wins', async () => {
    const storage = new MemoryStorage();
    const legacyWorkspaceKey = 'xiyou-workspace-w1-m1';
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(createInitialProgress()));
    storage.setItem(REVISION_PROGRESS_KEY, '0');
    storage.setItem(legacyWorkspaceKey, '{"legacy":true}');
    let queue = Promise.resolve();
    const lockManager = {
      request: <T>(_name: string, callback: () => Promise<T> | T): Promise<T> => {
        const run = queue.then(callback, callback);
        queue = run.then(() => undefined, () => undefined);
        return run;
      },
    };

    const [saved, staleClear] = await Promise.all([
      saveProgressCoordinated(
        { ...createInitialProgress(), learnerName: '迁移孩子' },
        0,
        { storage, lockManager, legacyWorkspaceKey },
      ),
      clearProgressCoordinated(0, { storage, lockManager }),
    ]);

    expect(saved).toMatchObject({ status: 'saved', revision: 1 });
    expect(staleClear).toMatchObject({ status: 'conflict', expectedRevision: 0, actualRevision: 1 });
    expect(JSON.parse(storage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '迁移孩子' });
    expect(storage.getItem(legacyWorkspaceKey)).toBeNull();
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('1');
  });

  it('rejects a stale load repair after a newer save advances the revision', async () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_PROGRESS_KEY, JSON.stringify({
      version: 1, learnerName: '旧迁移', missions: {},
      settings: { muted: false, reducedMotion: false, parentPin: '2580' },
      savedAt: '2026-07-01T00:00:00.000Z',
    }));
    storage.setItem(REVISION_PROGRESS_KEY, '0');
    const inspected = loadProgressTransaction(storage);
    expect(inspected.repair).not.toBeNull();

    const saved = await saveProgressCoordinated(
      { ...createInitialProgress(), learnerName: '并发新保存' },
      0,
      { storage, lockManager: immediateLockManager },
    );
    const staleRepair = await repairLoadedProgressCoordinated(inspected.repair!, { storage, lockManager: immediateLockManager });

    expect(saved).toMatchObject({ status: 'saved', revision: 1 });
    expect(staleRepair).toMatchObject({ status: 'conflict', expectedRevision: 0, actualRevision: 1 });
    expect(JSON.parse(storage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '并发新保存' });
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('1');
  });

  it('reports storageMayHaveChanged when a failed save cannot be rolled back', async () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(createInitialProgress()));
    storage.setItem(REVISION_PROGRESS_KEY, '0');
    storage.failReadAfterWrites.add(CURRENT_PROGRESS_KEY);

    const result = await saveProgressCoordinated(
      { ...createInitialProgress(), settings: { ...createInitialProgress().settings, parentPin: '7319' } },
      0,
      { storage, lockManager: immediateLockManager },
    );

    expect(result).toMatchObject({
      status: 'unsaved', storageMayHaveChanged: true,
      error: expect.stringContaining('回滚失败'),
    });
    expect(JSON.parse(storage.peek(CURRENT_PROGRESS_KEY)!).settings.parentPin).toBe('7319');
    expect(storage.peek(REVISION_PROGRESS_KEY)).toBe('0');
  });

  it('reports storageMayHaveChanged when revision failure cannot restore the prior save', async () => {
    const storage = new MemoryStorage();
    const oldRaw = serializeProgress({ ...createInitialProgress(), learnerName: '旧凭据' });
    storage.setItem(CURRENT_PROGRESS_KEY, oldRaw);
    storage.setItem(REVISION_PROGRESS_KEY, '0');
    storage.failWritesOnce.add(REVISION_PROGRESS_KEY);
    storage.failCurrentValues.add(oldRaw);

    const result = await saveProgressCoordinated(
      { ...createInitialProgress(), learnerName: '新凭据' },
      0,
      { storage, lockManager: immediateLockManager },
    );

    expect(result).toMatchObject({
      status: 'unsaved', storageMayHaveChanged: true,
      error: expect.stringContaining('revision 写入失败'),
    });
    if (result.status === 'saved') throw new Error('本用例要求 revision 写入失败');
    expect(result.error).toContain('回滚失败');
    expect(JSON.parse(storage.peek(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '新凭据' });
    expect(storage.peek(REVISION_PROGRESS_KEY)).toBe('0');
  });

  it('fails closed on an invalid persisted revision and preserves the raw bytes', async () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(createInitialProgress()));
    storage.setItem(REVISION_PROGRESS_KEY, '-1');
    const before = storage.getItem(CURRENT_PROGRESS_KEY);

    const result = await saveProgressCoordinated(
      { ...createInitialProgress(), learnerName: '不应写入' },
      0,
      { storage, lockManager: immediateLockManager },
    );

    expect(result).toMatchObject({ status: 'unsaved', error: expect.stringContaining('revision') });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(before);
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('-1');
  });

  it('reports a clear preflight failure as unchanged instead of an unrecognized success-like status', async () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...createInitialProgress(), learnerName: '保留我' }));
    storage.setItem(REVISION_PROGRESS_KEY, 'invalid');

    const result = await clearProgressCoordinated(0, { storage, lockManager: immediateLockManager });

    expect(result).toMatchObject({ status: 'unchanged', error: expect.stringContaining('revision') });
    expect(JSON.parse(storage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '保留我' });
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('invalid');
  });

  it('imports and clears under the same revision contract, so a stale tab cannot revive cleared data', async () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress({ ...createInitialProgress(), learnerName: '旧孩子' }));
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress({ ...createInitialProgress(), learnerName: '更旧孩子' }));
    storage.setItem(CORRUPT_PROGRESS_KEY, 'old corrupt');
    storage.setItem(LEGACY_PROGRESS_KEY, 'old legacy');
    storage.setItem(REVISION_PROGRESS_KEY, '3');

    const imported = await importProgressCoordinated(
      serializeProgress({ ...createInitialProgress(), learnerName: '导入孩子' }),
      3,
      { storage, lockManager: immediateLockManager },
    );
    expect(imported).toMatchObject({ status: 'saved', revision: 4, sourceVersion: 3 });

    const cleared = await clearProgressCoordinated(4, { storage, lockManager: immediateLockManager });
    expect(cleared).toMatchObject({ status: 'cleared', revision: 5 });
    expect(storage.getItem(SNAPSHOT_PROGRESS_KEY)).toBeNull();
    expect(storage.getItem(CORRUPT_PROGRESS_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_PROGRESS_KEY)).toBeNull();

    const stale = await saveProgressCoordinated(
      { ...createInitialProgress(), learnerName: '旧页复活' },
      4,
      { storage, lockManager: immediateLockManager },
    );
    expect(stale).toMatchObject({ status: 'conflict', actualRevision: 5 });
    expect(JSON.parse(storage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '小行者' });
  });

  it('captures dynamic workspace keys inside the lock so revision failure restores them', async () => {
    const storage = new MemoryStorage();
    const dynamicWorkspaceKey = 'xiyou-workspace-w2-m3';
    const dynamicWorkspaceRaw = '{"blocks":["w2-m3"]}';
    const currentRaw = serializeProgress({ ...createInitialProgress(), learnerName: '保留孩子' });
    storage.setItem(CURRENT_PROGRESS_KEY, currentRaw);
    storage.setItem(REVISION_PROGRESS_KEY, '0');
    storage.failWritesOnce.add(REVISION_PROGRESS_KEY);
    const lockManager = {
      request: async <T>(_name: string, callback: () => Promise<T> | T): Promise<T> => {
        storage.setItem(dynamicWorkspaceKey, dynamicWorkspaceRaw);
        return callback();
      },
    };

    const result = await clearProgressCoordinated(0, { storage, lockManager });

    expect(result).toMatchObject({ status: 'unchanged' });
    expect(storage.removedKeys).toContain(dynamicWorkspaceKey);
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(currentRaw);
    expect(storage.getItem(dynamicWorkspaceKey)).toBe(dynamicWorkspaceRaw);
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('0');
  });

  it('reports unknown when revision failure cannot restore a captured dynamic workspace', async () => {
    const storage = new MemoryStorage();
    const dynamicWorkspaceKey = 'xiyou-workspace-w2-m3';
    const dynamicWorkspaceRaw = '{"blocks":["w2-m3"]}';
    const currentRaw = serializeProgress({ ...createInitialProgress(), learnerName: '保留孩子' });
    storage.setItem(CURRENT_PROGRESS_KEY, currentRaw);
    storage.setItem(REVISION_PROGRESS_KEY, '0');
    storage.failWritesOnce.add(REVISION_PROGRESS_KEY);
    const lockManager = {
      request: async <T>(_name: string, callback: () => Promise<T> | T): Promise<T> => {
        storage.setItem(dynamicWorkspaceKey, dynamicWorkspaceRaw);
        storage.failWrites.add(dynamicWorkspaceKey);
        return callback();
      },
    };

    const result = await clearProgressCoordinated(0, { storage, lockManager });

    expect(result).toMatchObject({ status: 'unknown', error: expect.stringContaining('回滚失败') });
    expect(storage.removedKeys).toContain(dynamicWorkspaceKey);
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(currentRaw);
    expect(storage.getItem(dynamicWorkspaceKey)).toBeNull();
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('0');
  });
});
