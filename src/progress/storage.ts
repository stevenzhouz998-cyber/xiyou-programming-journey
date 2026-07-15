import { createInitialProgress, parseProgress } from './schema';
import type { ProgressV3 } from './types';

export const CURRENT_PROGRESS_KEY = 'xiyou-programming-progress-v3';
export const SNAPSHOT_PROGRESS_KEY = 'xiyou-programming-progress-snapshot-v3';
export const CORRUPT_PROGRESS_KEY = 'xiyou-programming-progress-corrupt-v3';
export const LEGACY_V2_CURRENT_KEY = 'xiyou-programming-progress-v2';
export const LEGACY_V2_SNAPSHOT_KEY = 'xiyou-programming-progress-snapshot-v2';
export const LEGACY_V2_CORRUPT_KEY = 'xiyou-programming-progress-corrupt-v2';
export const LEGACY_PROGRESS_KEY = 'xiyou-programming-progress-v1';
export const LEGACY_WORKSPACE_PREFIX = 'xiyou-workspace-';
export const LEGACY_WORKSPACE_KEY = 'xiyou-workspace-w1-m1';
export const REVISION_PROGRESS_KEY = 'xiyou-programming-progress-revision-v3';
export const CURRENT = CURRENT_PROGRESS_KEY;
export const SNAPSHOT = SNAPSHOT_PROGRESS_KEY;
export const CORRUPT = CORRUPT_PROGRESS_KEY;
export const CLEAR_PROGRESS_KEYS = [
  CURRENT_PROGRESS_KEY,
  SNAPSHOT_PROGRESS_KEY,
  CORRUPT_PROGRESS_KEY,
  LEGACY_V2_CURRENT_KEY,
  LEGACY_V2_SNAPSHOT_KEY,
  LEGACY_V2_CORRUPT_KEY,
  LEGACY_PROGRESS_KEY,
  LEGACY_WORKSPACE_KEY,
  REVISION_PROGRESS_KEY,
] as const;

export function getClearProgressKeys(storage: Storage): string[] {
  const keys = new Set<string>(CLEAR_PROGRESS_KEYS);
  const length = storage.length;
  for (let index = 0; index < length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(LEGACY_WORKSPACE_PREFIX)) keys.add(key);
  }
  return [...keys];
}

export type LoadStatus = 'normal' | 'migrated' | 'recovered-from-snapshot' | 'reset-after-corruption' | 'storage-unavailable';
export interface LoadResult {
  progress: ProgressV3;
  revision: number;
  status: LoadStatus;
  corruptDownload: string | null;
  persistence: 'idle' | 'saved' | 'unsaved';
  error: string | null;
  corruptError: string | null;
  repair: LoadRepair | null;
}
export interface LoadRepair {
  expectedRevision: number;
  expectedCurrentRaw: string | null;
  progress: ProgressV3;
  currentRaw: string | null;
  corruptRaw: string | null;
}
export type SaveResult =
  | { status: 'saved'; progress: ProgressV3 }
  | { status: 'unsaved'; progress: ProgressV3; error: string };
export type ImportResult =
  | ({ status: 'saved'; progress: ProgressV3 } & { sourceVersion: 1 | 2 | 3 })
  | ({ status: 'unsaved'; progress: ProgressV3; error: string; storageMayHaveChanged?: false } & { sourceVersion: 1 | 2 | 3 })
  | { status: 'rollback-failed'; progress: ProgressV3; error: string; sourceVersion: 1 | 2 | 3; storageMayHaveChanged: true }
  | { status: 'rejected'; error: string };
export interface ProgressBackup { filename: string; contents: string; mimeType: 'application/json' }
export type ClearResult =
  | { status: 'cleared'; progress: ProgressV3 }
  | { status: 'unchanged'; progress: ProgressV3; error: string }
  | { status: 'unknown'; progress: ProgressV3; error: string };

export function parseStoredRevision(raw: string | null): number {
  if (raw === null) return 0;
  if (!/^(0|[1-9]\d*)$/.test(raw)) throw new Error('progress revision 格式无效');
  const revision = Number(raw);
  if (!Number.isSafeInteger(revision)) throw new Error('progress revision 超出安全范围');
  return revision;
}

type Clock = () => Date;
const systemClock: Clock = () => new Date();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function serialize(progress: ProgressV3): string {
  return JSON.stringify(progress, null, 2);
}

function valid(raw: string | null): ProgressV3 | null {
  if (raw === null) return null;
  try { return parseProgress(raw); } catch { return null; }
}

function validLegacy(raw: string | null, version: 1 | 2): ProgressV3 | null {
  if (raw === null) return null;
  try {
    const progress = parseProgress(raw);
    const source: unknown = JSON.parse(raw);
    if (typeof source !== 'object' || source === null || (source as { version?: unknown }).version !== version) {
      return null;
    }
    return progress;
  } catch {
    return null;
  }
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

interface CorruptEnvelope {
  current: string;
  snapshot: string | null;
  capturedAt: string;
}

function parseCorruptEnvelope(raw: string): CorruptEnvelope {
  const envelope: unknown = JSON.parse(raw);
  if (typeof envelope !== 'object' || envelope === null || Object.getPrototypeOf(envelope) !== Object.prototype) {
    throw new Error('损坏存档信息无法读取：信封格式无效');
  }
  const record = envelope as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 3 || !['current', 'snapshot', 'capturedAt'].every((key) => keys.includes(key))
    || typeof record.current !== 'string'
    || (record.snapshot !== null && typeof record.snapshot !== 'string')
    || !isCanonicalIso(record.capturedAt)) {
    throw new Error('损坏存档信息无法读取：信封内容无效');
  }
  return record as unknown as CorruptEnvelope;
}

function readCorruptEnvelope(
  storage: Storage,
  key: typeof CORRUPT_PROGRESS_KEY | typeof LEGACY_V2_CORRUPT_KEY,
): { state: 'absent' | 'present' | 'error'; corruptDownload: string | null; corruptError: string | null } {
  let raw: string | null;
  try { raw = storage.getItem(key); }
  catch (error) {
    return {
      state: 'error',
      corruptDownload: null,
      corruptError: `无法读取损坏存档信息：${errorMessage(error)}`,
    };
  }
  if (raw === null) return { state: 'absent', corruptDownload: null, corruptError: null };
  try {
    parseCorruptEnvelope(raw);
    return { state: 'present', corruptDownload: raw, corruptError: null };
  } catch (error) {
    const detail = errorMessage(error);
    return {
      state: 'error',
      corruptDownload: null,
      corruptError: detail.startsWith('损坏存档信息无法读取') ? detail : `损坏存档信息无法读取：${detail}`,
    };
  }
}

function readPreservedCorruption(storage: Storage): { corruptDownload: string | null; corruptError: string | null } {
  const current = readCorruptEnvelope(storage, CORRUPT_PROGRESS_KEY);
  if (current.state !== 'absent') return current;
  return readCorruptEnvelope(storage, LEGACY_V2_CORRUPT_KEY);
}

function currentCorruptionProtectionError(storage: Storage, currentRaw: string): string | null {
  let envelopeRaw: string | null;
  try { envelopeRaw = storage.getItem(CORRUPT_PROGRESS_KEY); }
  catch { return '损坏原文尚未安全保留：无法读取损坏存档信封'; }
  if (envelopeRaw === null) return '损坏原文尚未安全保留：缺少损坏存档信封';

  try {
    const record = parseCorruptEnvelope(envelopeRaw);
    if (record.current !== currentRaw) {
      return '损坏原文尚未安全保留：损坏存档信封不匹配';
    }
    return null;
  } catch {
    return '损坏原文尚未安全保留：损坏存档信封格式无效';
  }
}

export function writeAndVerify(storage: Storage, key: string, value: string, stage: string): string | null {
  let writeError: unknown = null;
  try { storage.setItem(key, value); } catch (error) { writeError = error; /* verify because some stores throw after committing */ }
  try {
    if (storage.getItem(key) === value) return null;
    return writeError
      ? `${stage}失败：${errorMessage(writeError)}；写入内容校验不一致`
      : `${stage}失败：写入内容校验不一致`;
  } catch (error) {
    const writeDetail = writeError ? `${errorMessage(writeError)}；` : '';
    return `${stage}失败：${writeDetail}无法校验写入结果（${errorMessage(error)}）`;
  }
}

function loadResult(
  progress: ProgressV3,
  status: LoadStatus,
  corruptDownload: string | null,
  errors: string[] = [],
  idle = false,
  corruptError: string | null = null,
  revision = 0,
  repair: LoadRepair | null = null,
): LoadResult {
  return {
    progress,
    status,
    corruptDownload,
    persistence: errors.length || repair ? 'unsaved' : idle ? 'idle' : 'saved',
    error: errors.length === 0 ? null : errors.join('；'),
    corruptError,
    revision,
    repair,
  };
}

export function loadProgressTransaction(storage: Storage = localStorage, clock: Clock = systemClock): LoadResult {
  let revision: number;
  try { revision = parseStoredRevision(storage.getItem(REVISION_PROGRESS_KEY)); }
  catch (error) {
    return loadResult(createInitialProgress(), 'storage-unavailable', null, [errorMessage(error)]);
  }
  const finish = (
    progress: ProgressV3,
    status: LoadStatus,
    corruptDownload: string | null,
    errors: string[] = [],
    idle = false,
    corruptError: string | null = null,
    repair: LoadRepair | null = null,
  ) => loadResult(progress, status, corruptDownload, errors, idle, corruptError, revision, repair);
  let currentRaw: string | null;
  try { currentRaw = storage.getItem(CURRENT_PROGRESS_KEY); }
  catch (error) {
    return finish(createInitialProgress(), 'storage-unavailable', null, [`读取当前存档失败：${errorMessage(error)}`]);
  }
  if (currentRaw === null) {
    let legacyV2Raw: string | null;
    try { legacyV2Raw = storage.getItem(LEGACY_V2_CURRENT_KEY); }
    catch (error) {
      return finish(createInitialProgress(), 'storage-unavailable', null, [`读取 V2 旧版存档失败：${errorMessage(error)}`]);
    }
    const legacyV2 = validLegacy(legacyV2Raw, 2);
    if (legacyV2) {
      const preserved = readPreservedCorruption(storage);
      return finish(
        legacyV2,
        'migrated',
        preserved.corruptDownload,
        [],
        false,
        preserved.corruptError,
        {
          expectedRevision: revision,
          expectedCurrentRaw: null,
          progress: legacyV2,
          currentRaw: serialize(legacyV2),
          corruptRaw: null,
        },
      );
    }

    let legacyRaw: string | null;
    try { legacyRaw = storage.getItem(LEGACY_PROGRESS_KEY); }
    catch (error) {
      return finish(createInitialProgress(), 'storage-unavailable', null, [`读取旧版存档失败：${errorMessage(error)}`]);
    }
    const legacy = validLegacy(legacyRaw, 1);
    if (legacy) {
      const preserved = readPreservedCorruption(storage);
      return finish(
        legacy,
        'migrated',
        preserved.corruptDownload,
        [],
        false,
        preserved.corruptError,
        {
          expectedRevision: revision,
          expectedCurrentRaw: null,
          progress: legacy,
          currentRaw: serialize(legacy),
          corruptRaw: null,
        },
      );
    }
    // No write is required yet, so there is no pending persistence failure.
    const preserved = readPreservedCorruption(storage);
    return finish(
      createInitialProgress(),
      'normal',
      preserved.corruptDownload,
      [],
      true,
      preserved.corruptError,
    );
  }

  const current = valid(currentRaw);
  if (current) {
    const preserved = readPreservedCorruption(storage);
    return finish(current, 'normal', preserved.corruptDownload, [], false, preserved.corruptError);
  }

  const capturedAt = clock().toISOString();
  let snapshotRaw: string | null;
  try { snapshotRaw = storage.getItem(SNAPSHOT_PROGRESS_KEY); }
  catch (error) {
    const corruptDownload = JSON.stringify({ current: currentRaw, snapshot: null, capturedAt });
    const errors = [`读取快照失败：${errorMessage(error)}`];
    return finish(createInitialProgress(), 'storage-unavailable', corruptDownload, errors);
  }
  const corruptDownload = JSON.stringify({ current: currentRaw, snapshot: snapshotRaw, capturedAt });
  const snapshot = valid(snapshotRaw);
  const progress: ProgressV3 = snapshot
    ? { ...snapshot, recovery: { lastRecoveredAt: capturedAt, source: 'snapshot' } }
    : { ...createInitialProgress(), recovery: { lastRecoveredAt: capturedAt, source: 'initial' } };
  return finish(
    progress,
    snapshot ? 'recovered-from-snapshot' : 'reset-after-corruption',
    corruptDownload,
    [],
    false,
    null,
    {
      expectedRevision: revision,
      expectedCurrentRaw: currentRaw,
      progress,
      currentRaw: serialize(progress),
      corruptRaw: corruptDownload,
    },
  );
}

export function saveProgressTransaction(progress: ProgressV3, storage: Storage = localStorage): SaveResult {
  try {
    parseProgress(serialize(progress));
  } catch (error) {
    return { status: 'unsaved', progress, error: errorMessage(error) };
  }

  try {
    const currentRaw = storage.getItem(CURRENT_PROGRESS_KEY);
    const current = valid(currentRaw);
    if (currentRaw !== null && !current) {
      const protectionError = currentCorruptionProtectionError(storage, currentRaw);
      if (protectionError) return { status: 'unsaved', progress, error: protectionError };
    }
    if (current) {
      const snapshotError = writeAndVerify(storage, SNAPSHOT_PROGRESS_KEY, currentRaw!, '写入快照');
      if (snapshotError) return { status: 'unsaved', progress, error: snapshotError };
    }
    const currentError = writeAndVerify(storage, CURRENT_PROGRESS_KEY, serialize(progress), '写入当前存档');
    if (currentError) return { status: 'unsaved', progress, error: currentError };
    return { status: 'saved', progress };
  } catch (error) {
    return { status: 'unsaved', progress, error: `读取当前存档失败：${errorMessage(error)}` };
  }
}

export function retrySave(progress: ProgressV3, storage: Storage = localStorage): SaveResult {
  return saveProgressTransaction(progress, storage);
}

export function createProgressBackup(progress: ProgressV3, clock: Clock = systemClock): ProgressBackup {
  const date = clock().toISOString().slice(0, 10);
  return { filename: `xiyou-progress-${date}.json`, contents: serialize(progress), mimeType: 'application/json' };
}
