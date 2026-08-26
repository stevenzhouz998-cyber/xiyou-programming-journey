import * as Blockly from 'blockly';
import { describe, expect, it, vi } from 'vitest';
import { runFourSeasRegalia } from '../battle/fourSeasRegalia';
import { runRuyiStaffBattle } from '../battle/ruyiStaff';
import type { RuyiStaffInstruction } from '../battle/types';
import { registerFourSeasRegaliaBlocks } from '../blockly/fourSeasRegaliaBlocks';
import { compileFourSeasRegaliaWorkspace } from '../blockly/fourSeasRegaliaCompiler';
import { loadFourSeasWorkspaceDraft, saveFourSeasWorkspaceDraft, type FourSeasWorkspaceDraftV1 } from '../blockly/fourSeasRegaliaDraft';
import { createInitialProgress, serializeProgress } from './progress';
import { PROGRESS_SCHEMA_LIMITS } from './schema';
import {
  CORRUPT,
  CORRUPT_PROGRESS_KEY,
  CURRENT,
  CURRENT_PROGRESS_KEY,
  LEGACY_PROGRESS_KEY,
  LEGACY_V2_CORRUPT_KEY,
  LEGACY_V2_CURRENT_KEY,
  LEGACY_V2_SNAPSHOT_KEY,
  LEGACY_WORKSPACE_KEY,
  REVISION_PROGRESS_KEY,
  SNAPSHOT,
  SNAPSHOT_PROGRESS_KEY,
  createProgressBackup,
  loadProgressTransaction,
  retrySave,
  saveProgressTransaction,
} from './storage';
import { repairLoadedProgressTransaction } from './storageRepair';
import { clearProgressTransaction, importProgressTransaction } from './storageParent';
import type { ProgressV3 } from './types';
import {
  createMissionSession,
  recordCompileFailure,
  recordHint,
  recordRun,
  updateWorkspaceDraft,
} from './session';

const NOW = new Date('2026-07-12T08:09:10.000Z');
const clock = () => NOW;

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  failWrites = new Set<string>();
  throwAfterWrites = new Set<string>();
  mismatchWrites = new Set<string>();
  failReads = new Set<string>();
  failRemoves = new Set<string>();
  failReadAfterWrites = new Set<string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) {
    if (this.failReads.has(key)) throw new Error(`read-blocked:${key}`);
    return this.values.get(key) ?? null;
  }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) {
    if (this.failRemoves.has(key)) throw new Error(`remove-blocked:${key}`);
    this.values.delete(key);
  }
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

function loadAndRepair(storage: Storage, loadClock = clock) {
  const loaded = loadProgressTransaction(storage, loadClock);
  if (!loaded.repair) return loaded;
  const repaired = repairLoadedProgressTransaction(loaded.repair, storage);
  return {
    ...loaded,
    persistence: repaired.status === 'saved' ? 'saved' as const : 'unsaved' as const,
    error: repaired.status === 'saved' ? null : repaired.error,
  };
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
  const {
    sessions: _sessions,
    equipment: _equipment,
    abilities: _abilities,
    missionCompletionEvidence: _missionCompletionEvidence,
    ...withoutV3OnlyFields
  } = current;
  return JSON.stringify({
    ...withoutV3OnlyFields,
    version: 2,
    schemaRevision: 1,
    learnerName: name,
  }, null, 2);
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

const ruyiTrace: RuyiStaffInstruction[] = [
  { instructionId: 'instruction:inspect', sourceBlockId: 'inspect', opcode: 'inspect_weights' },
  { instructionId: 'instruction:choose', sourceBlockId: 'choose', opcode: 'choose_ruyi_staff' },
  { instructionId: 'instruction:shrink', sourceBlockId: 'shrink', opcode: 'shrink_ruyi_staff' },
];

function progressWithRuyiSession(name: string): ProgressV3 {
  return {
    ...progress(name),
    sessions: {
      'w1-m2': {
        workspace: {
          version: 1,
          blocks: [
            { id: 'inspect', type: 'xiyou_inspect_weights', nextId: 'choose', x: 12, y: 34 },
            { id: 'choose', type: 'xiyou_choose_ruyi_staff', nextId: 'shrink', x: 12, y: 68 },
            { id: 'shrink', type: 'xiyou_shrink_ruyi_staff', nextId: null, x: 12, y: 102 },
          ],
        },
        lastTrace: structuredClone(ruyiTrace),
        lastRun: runRuyiStaffBattle(ruyiTrace),
        totalRuns: 2,
        runtimeFailures: 1,
        compileFailures: 1,
        usedHintTiers: ['observe'],
        conceptFailures: { programStructure: 1, sequencePrecondition: 1, completeness: 0 },
        lastRunAt: '2026-07-12T08:00:00.000Z',
        savedAt: '2026-07-12T08:01:00.000Z',
      },
    },
  };
}

function progressWithFourSeasSession(name: string): ProgressV3 {
  const draft: FourSeasWorkspaceDraftV1 = {
    version: 1,
    blocks: [
      { id: 'request-stable', type: 'xiyou_request_regalia', nextId: 'collect-stable', parentBlockId: null, x: 0, y: 0 },
      { id: 'collect-stable', type: 'xiyou_collect_gifts', nextId: 'equip-stable', parentBlockId: null, x: 10, y: 10 },
      { id: 'boots-gift-stable', type: 'xiyou_receive_cloud_boots', nextId: 'armor-gift-stable', parentBlockId: 'collect-stable', x: 20, y: 20 },
      { id: 'armor-gift-stable', type: 'xiyou_receive_golden_armor', nextId: 'crown-gift-stable', parentBlockId: 'collect-stable', x: 30, y: 30 },
      { id: 'crown-gift-stable', type: 'xiyou_receive_purple_crown', nextId: null, parentBlockId: 'collect-stable', x: 40, y: 40 },
      { id: 'equip-stable', type: 'xiyou_equip_regalia', nextId: 'verify-stable', parentBlockId: null, x: 50, y: 50 },
      { id: 'crown-wear-stable', type: 'xiyou_wear_crown', nextId: 'armor-wear-stable', parentBlockId: 'equip-stable', x: 60, y: 60 },
      { id: 'armor-wear-stable', type: 'xiyou_wear_armor', nextId: 'boots-wear-stable', parentBlockId: 'equip-stable', x: 70, y: 70 },
      { id: 'boots-wear-stable', type: 'xiyou_wear_boots', nextId: null, parentBlockId: 'equip-stable', x: 80, y: 80 },
      { id: 'verify-stable', type: 'xiyou_verify_regalia', nextId: null, parentBlockId: null, x: 90, y: 90 },
    ],
  };
  registerFourSeasRegaliaBlocks();
  const workspace = new Blockly.Workspace();
  try {
    loadFourSeasWorkspaceDraft(workspace, draft);
    const compiled = compileFourSeasRegaliaWorkspace(workspace);
    if (!compiled.ok) throw new Error('expected real w1-m3 fixture to compile');
    let session = updateWorkspaceDraft(
      createMissionSession('w1-m3', '2026-07-12T08:00:00.000Z'),
      saveFourSeasWorkspaceDraft(workspace),
      '2026-07-12T08:00:00.000Z',
    );
    session = recordCompileFailure(session, 'program-structure', '2026-07-12T08:00:00.000Z');
    session = recordCompileFailure(session, 'program-structure', '2026-07-12T08:00:00.000Z');
    session = recordRun(
      session,
      runFourSeasRegalia(compiled.trace),
      compiled.trace,
      '2026-07-12T08:01:00.000Z',
    );
    session = recordHint(session, 'observe', '2026-07-12T08:01:00.000Z');
    return {
      ...progress(name),
      sessions: { 'w1-m3': session },
    };
  } finally {
    workspace.dispose();
  }
}

describe('progress storage transactions', () => {
  it('does not interpret E2E corruption sentinels in the production loader', () => {
    const storage = new MemoryStorage();
    const legal = serializeProgress(progress('production child'));
    storage.setItem(CURRENT_PROGRESS_KEY, legal);
    storage.setItem('xiyou-test-storage-mode', 'corrupt-regalia-current');

    const loaded = loadProgressTransaction(storage, clock);

    expect(loaded).toMatchObject({ status: 'normal', progress: { learnerName: 'production child' } });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(legal);
    expect(storage.getItem('xiyou-test-storage-mode')).toBe('corrupt-regalia-current');
  });
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
      persistence: 'idle', error: null, corruptError: null, revision: 0, repair: null,
    });
    expect(storage.length).toBe(0);
  });

  it('loads the companion revision and fails closed on invalid revision bytes', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('当前')));
    storage.setItem(REVISION_PROGRESS_KEY, '12');
    expect(loadProgressTransaction(storage, clock)).toMatchObject({ status: 'normal', revision: 12 });

    storage.setItem(REVISION_PROGRESS_KEY, '01');
    expect(loadProgressTransaction(storage, clock)).toMatchObject({
      status: 'storage-unavailable', persistence: 'unsaved', revision: 0,
      error: expect.stringContaining('revision'), progress: { learnerName: '小行者' },
    });
    expect(storage.getItem(REVISION_PROGRESS_KEY)).toBe('01');
    expect(JSON.parse(storage.getItem(CURRENT_PROGRESS_KEY)!)).toMatchObject({ learnerName: '当前' });
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

    const inspected = loadProgressTransaction(storage, clock);
    expect(inspected).toMatchObject({ status: 'migrated', persistence: 'unsaved' });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBeNull();
    const result = loadAndRepair(storage);

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

    expect(loadAndRepair(storage)).toMatchObject({
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
    const result = loadAndRepair(storage);
    expect(result).toMatchObject({ status: 'migrated', persistence: 'saved', error: null, progress: { version: 3, sessions: {}, learnerName: '旧行者' } });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(serializeProgress(result.progress));
    expect(storage.getItem(LEGACY_PROGRESS_KEY)).toBe(legacy());
  });

  it('keeps migrated session data but reports a real migration write failure', () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_PROGRESS_KEY, legacy());
    storage.failWrites.add(CURRENT_PROGRESS_KEY);
    expect(loadAndRepair(storage)).toMatchObject({
      status: 'migrated', persistence: 'unsaved', progress: { learnerName: '旧行者' },
      error: expect.stringContaining('写回加载存档'),
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

    expect(loadAndRepair(storage)).toMatchObject({
      status: 'migrated', persistence: 'unsaved', corruptDownload: v2Envelope,
      progress: { learnerName: '写失败 V2' }, error: expect.stringContaining('写回加载存档'),
    });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_V2_CURRENT_KEY)).toBe(v2Current);
    expect(storage.getItem(LEGACY_V2_CORRUPT_KEY)).toBe(v2Envelope);
  });

  it('preserves corrupt current in an envelope and recovers a valid snapshot', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad current');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('快照')));
    const result = loadAndRepair(storage);
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

  it('inspects a corrupt load without mutating storage', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad current');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('旧快照')));
    const before = storage.snapshot();

    const loaded = loadProgressTransaction(storage, clock);

    expect(loaded).toMatchObject({ status: 'recovered-from-snapshot', persistence: 'unsaved', repair: { expectedCurrentRaw: '{bad current' } });
    expect(storage.snapshot()).toEqual(before);
  });

  it('recovers V3 snapshot sessions and preserves them when reopened', () => {
    const storage = new MemoryStorage();
    const damagedBytes = '\u0000{broken V3 bytes}\n';
    const snapshot = progressWithSession('含会话快照');
    storage.setItem(CURRENT_PROGRESS_KEY, damagedBytes);
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(snapshot));

    const recovered = loadAndRepair(storage);
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

  it('preserves damaged w1-m2 current bytes and reopens the exact snapshot session', () => {
    const storage = new MemoryStorage();
    const damagedBytes = '\u0000{damaged w1-m2 current bytes}\n';
    const snapshot = progressWithRuyiSession('如意快照');
    storage.setItem(CURRENT_PROGRESS_KEY, damagedBytes);
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(snapshot));

    const recovered = loadAndRepair(storage);
    expect(recovered).toMatchObject({
      status: 'recovered-from-snapshot',
      persistence: 'saved',
      progress: { sessions: { 'w1-m2': { totalRuns: 2 } } },
    });
    expect(JSON.parse(recovered.corruptDownload!).current).toBe(damagedBytes);
    expect(storage.getItem(CORRUPT_PROGRESS_KEY)).toBe(recovered.corruptDownload);
    expect(JSON.parse(storage.getItem(CORRUPT_PROGRESS_KEY)!).current).toBe(damagedBytes);

    const reopened = loadProgressTransaction(storage, clock);
    expect(reopened.progress.sessions['w1-m2']).toEqual(snapshot.sessions['w1-m2']);
    expect(reopened.progress.sessions['w1-m2']?.workspace.blocks.map((block) => block.id))
      .toEqual(['inspect', 'choose', 'shrink']);
    expect(reopened.progress.sessions['w1-m2']?.lastTrace).toEqual(ruyiTrace);
    expect(reopened.progress.sessions['w1-m2']?.lastRun).toEqual(runRuyiStaffBattle(ruyiTrace));
  });

  it('preserves damaged nested w1-m3 bytes and recovers exact ids and parent links that remain runnable', () => {
    const storage = new MemoryStorage();
    const snapshot = progressWithFourSeasSession('四海快照');
    const damaged = structuredClone(snapshot);
    damaged.sessions['w1-m3']!.workspace.blocks[2].parentBlockId = 'forged-parent';
    const damagedBytes = serializeProgress(damaged);
    storage.setItem(CURRENT_PROGRESS_KEY, damagedBytes);
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(snapshot));

    const recovered = loadAndRepair(storage);
    expect(recovered).toMatchObject({
      status: 'recovered-from-snapshot',
      persistence: 'saved',
      progress: { sessions: { 'w1-m3': { totalRuns: 1 } } },
    });
    expect(JSON.parse(recovered.corruptDownload!).current).toBe(damagedBytes);
    const session = recovered.progress.sessions['w1-m3']!;
    expect(session.workspace.blocks.map((block) => [block.id, block.parentBlockId]))
      .toEqual(snapshot.sessions['w1-m3']!.workspace.blocks.map((block) => [block.id, block.parentBlockId]));

    const workspace = new Blockly.Workspace();
    try {
      loadFourSeasWorkspaceDraft(workspace, session.workspace);
      const compiled = compileFourSeasRegaliaWorkspace(workspace);
      expect(compiled).toMatchObject({ ok: true });
      if (!compiled.ok) throw new Error('recovered fixture no longer compiles');
      expect(runFourSeasRegalia(compiled.trace)).toEqual(session.lastRun);
    } finally {
      workspace.dispose();
    }
  });

  it('preserves both corrupt sources and resets when snapshot is invalid', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad current');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, '{bad snapshot');
    const result = loadAndRepair(storage);
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
    const result = loadAndRepair(storage);
    expect(result.status).toBe('reset-after-corruption');
    expect(JSON.parse(result.corruptDownload!).snapshot).toBe(JSON.stringify({ version: 999 }));
  });

  it('keeps recovered session data but reports a corrupt-envelope write failure', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('快照')));
    storage.failWrites.add(CORRUPT_PROGRESS_KEY);
    const result = loadAndRepair(storage);
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
    expect(loadAndRepair(storage)).toMatchObject({
      status: 'reset-after-corruption', persistence: 'unsaved',
      error: expect.stringContaining('保留损坏存档'),
    });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe('{bad current');
  });

  it('keeps corrupt current protected across later save and import transactions', () => {
    for (const transaction of [
      (storage: Storage) => saveProgressTransaction(progress('稍后保存'), storage),
      (storage: Storage) => importProgressTransaction(serializeProgress(progress('稍后导入')), storage),
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

  it('never accepts a matching legacy V2 envelope as protection for corrupt V3 current', () => {
    const corruptV3 = '{bad V3 current';
    const legacyEnvelope = JSON.stringify({
      current: corruptV3,
      snapshot: null,
      capturedAt: NOW.toISOString(),
    });
    const cases = [
      ['save', (storage: Storage) => saveProgressTransaction(progress('新保存'), storage), 'unsaved'],
      ['import', (storage: Storage) => importProgressTransaction(serializeProgress(progress('新导入')), storage), 'unsaved'],
    ] as const;

    for (const [, transaction, expectedStatus] of cases) {
      const storage = new MemoryStorage();
      storage.setItem(CURRENT_PROGRESS_KEY, corruptV3);
      storage.setItem(LEGACY_V2_CORRUPT_KEY, legacyEnvelope);

      expect(transaction(storage)).toMatchObject({
        status: expectedStatus,
        error: expect.stringContaining('损坏原文尚未安全保留'),
      });
      expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(corruptV3);
      expect(storage.getItem(CORRUPT_PROGRESS_KEY)).toBeNull();
      expect(storage.getItem(SNAPSHOT_PROGRESS_KEY)).toBeNull();
      expect(storage.getItem(LEGACY_V2_CORRUPT_KEY)).toBe(legacyEnvelope);
    }
  });

  it('allows save and import when an exact valid corrupt envelope protects current', () => {
    for (const transaction of [
      (storage: Storage) => saveProgressTransaction(progress('稍后保存'), storage),
      (storage: Storage) => importProgressTransaction(serializeProgress(progress('稍后导入')), storage),
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
    expect(storage.getItem(CORRUPT_PROGRESS_KEY)).toBeNull();
  });

  it('returns recovered session data and reports when rewriting current fails', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, '{bad');
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('快照')));
    storage.failWrites.add(CURRENT_PROGRESS_KEY);
    expect(loadAndRepair(storage)).toMatchObject({
      status: 'recovered-from-snapshot', persistence: 'unsaved', progress: { learnerName: '快照' },
      error: expect.stringContaining('写回加载存档'),
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
    expect(loadAndRepair(recoveryStorage)).toMatchObject({ persistence: 'saved', error: null });
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
    expect(loadAndRepair(corruptVerifyUnreadable)).toMatchObject({
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

  it('rejects oversized malformed ASCII import before JSON parsing or storage mutation', () => {
    const storage = new MemoryStorage();
    const raw = 'x'.repeat(PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes + 1);
    const parse = vi.spyOn(JSON, 'parse');
    try {
      expect(importProgressTransaction(raw, storage)).toMatchObject({
        status: 'rejected',
        error: expect.stringContaining(`最多${PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes}`),
      });
      expect(parse).not.toHaveBeenCalled();
      expect(storage.snapshot()).toEqual({});
    } finally {
      parse.mockRestore();
    }
  });

  it('rejects oversized multibyte import before JSON parsing or storage mutation', () => {
    const storage = new MemoryStorage();
    const raw = '界'.repeat(Math.floor(PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes / 3) + 1);
    expect(raw.length).toBeLessThan(PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes);
    expect(new TextEncoder().encode(raw).byteLength).toBeGreaterThan(PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes);
    const parse = vi.spyOn(JSON, 'parse');
    try {
      expect(importProgressTransaction(raw, storage)).toMatchObject({
        status: 'rejected',
        error: expect.stringContaining(`最多${PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes}`),
      });
      expect(parse).not.toHaveBeenCalled();
      expect(storage.snapshot()).toEqual({});
    } finally {
      parse.mockRestore();
    }
  });

  it('rejects oversized legacy current before JSON parsing and leaves every key unchanged', () => {
    const storage = new MemoryStorage();
    const raw = 'x'.repeat(PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes + 1);
    storage.setItem(LEGACY_V2_CURRENT_KEY, raw);
    const before = storage.snapshot();
    const parse = vi.spyOn(JSON, 'parse');
    try {
      expect(loadProgressTransaction(storage, clock)).toMatchObject({
        status: 'normal', persistence: 'idle', progress: createInitialProgress(),
      });
      expect(parse).not.toHaveBeenCalled();
      expect(storage.snapshot()).toEqual(before);
      expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBeNull();
    } finally {
      parse.mockRestore();
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

  it('clears every recovery and legacy route before writing fresh initial progress', () => {
    const storage = new MemoryStorage();
    const old = progress('旧');
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(old));
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('旧快照')));
    storage.setItem(CORRUPT_PROGRESS_KEY, 'old corrupt');
    storage.setItem(LEGACY_V2_CURRENT_KEY, legacyV2('旧 V2'));
    storage.setItem(LEGACY_V2_SNAPSHOT_KEY, legacyV2('旧 V2 快照'));
    storage.setItem(LEGACY_V2_CORRUPT_KEY, 'old V2 corrupt');
    storage.setItem(LEGACY_PROGRESS_KEY, legacy('旧 V1'));
    storage.setItem(LEGACY_WORKSPACE_KEY, '{"blocks":[]}');
    storage.setItem(REVISION_PROGRESS_KEY, '9');
    const result = clearProgressTransaction(storage);
    expect(result).toMatchObject({ status: 'cleared', progress: createInitialProgress() });
    expect(storage.getItem(CURRENT_PROGRESS_KEY)).toBe(serializeProgress(createInitialProgress()));
    expect(storage.getItem(SNAPSHOT_PROGRESS_KEY)).toBeNull();
    expect(storage.getItem(CORRUPT_PROGRESS_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_V2_CURRENT_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_V2_SNAPSHOT_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_V2_CORRUPT_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_PROGRESS_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_WORKSPACE_KEY)).toBeNull();

    storage.setItem(CURRENT_PROGRESS_KEY, '{bad fresh current');
    const reloaded = loadProgressTransaction(storage, clock);
    expect(reloaded.status).toBe('reset-after-corruption');
    expect(reloaded.progress).toEqual(expect.objectContaining({ learnerName: '小行者', sessions: {}, missions: {} }));
  });

  it('clears every legacy Blockly workspace while preserving unrelated storage', () => {
    const storage = new MemoryStorage();
    const otherWorkspaceKey = 'xiyou-workspace-w2-m3';
    const unrelatedKey = 'unrelated-app-setting';
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('旧')));
    storage.setItem(LEGACY_WORKSPACE_KEY, '{"blocks":["w1-m1"]}');
    storage.setItem(otherWorkspaceKey, '{"blocks":["w2-m3"]}');
    storage.setItem(unrelatedKey, 'keep me');

    expect(clearProgressTransaction(storage)).toMatchObject({ status: 'cleared' });
    expect(storage.getItem(LEGACY_WORKSPACE_KEY)).toBeNull();
    expect(storage.getItem(otherWorkspaceKey)).toBeNull();
    expect(storage.getItem(unrelatedKey)).toBe('keep me');
  });

  it('rolls back the main save and dynamic workspace bytes when dynamic workspace removal fails', () => {
    const storage = new MemoryStorage();
    const otherWorkspaceKey = 'xiyou-workspace-w2-m3';
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('保留')));
    storage.setItem(LEGACY_WORKSPACE_KEY, '{"blocks":["w1-m1"]}');
    storage.setItem(otherWorkspaceKey, '{"blocks":["w2-m3"]}');
    const before = storage.snapshot();
    storage.failRemoves.add(otherWorkspaceKey);

    expect(clearProgressTransaction(storage)).toMatchObject({ status: 'unchanged' });
    expect(storage.snapshot()).toEqual(before);
  });

  it('rolls back every clear key byte-for-byte when a removal fails', () => {
    const storage = new MemoryStorage();
    storage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress('保留')));
    storage.setItem(SNAPSHOT_PROGRESS_KEY, serializeProgress(progress('保留快照')));
    storage.setItem(CORRUPT_PROGRESS_KEY, 'corrupt bytes');
    storage.setItem(LEGACY_V2_CURRENT_KEY, legacyV2('保留 V2'));
    storage.setItem(REVISION_PROGRESS_KEY, '4');
    const before = storage.snapshot();
    storage.failRemoves.add(CORRUPT_PROGRESS_KEY);

    expect(clearProgressTransaction(storage)).toMatchObject({ status: 'unchanged' });
    expect(storage.snapshot()).toEqual(before);
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
