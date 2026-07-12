import { createInitialProgress, parseProgress } from './schema';
import type { ProgressV2 } from './types';

export const CURRENT_PROGRESS_KEY = 'xiyou-programming-progress-v2';
export const SNAPSHOT_PROGRESS_KEY = 'xiyou-programming-progress-snapshot-v2';
export const CORRUPT_PROGRESS_KEY = 'xiyou-programming-progress-corrupt-v2';
export const LEGACY_PROGRESS_KEY = 'xiyou-programming-progress-v1';
export const CURRENT = CURRENT_PROGRESS_KEY;
export const SNAPSHOT = SNAPSHOT_PROGRESS_KEY;
export const CORRUPT = CORRUPT_PROGRESS_KEY;

export type LoadStatus = 'normal' | 'migrated' | 'recovered-from-snapshot' | 'reset-after-corruption' | 'storage-unavailable';
export interface LoadResult {
  progress: ProgressV2;
  status: LoadStatus;
  corruptDownload: string | null;
  persistence: 'saved' | 'unsaved';
  error: string | null;
}
export type SaveResult =
  | { status: 'saved'; progress: ProgressV2 }
  | { status: 'unsaved'; progress: ProgressV2; error: string };
export type ImportResult = SaveResult | { status: 'rejected'; error: string };
export interface ProgressBackup { filename: string; contents: string; mimeType: 'application/json' }

type Clock = () => Date;
const systemClock: Clock = () => new Date();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function serialize(progress: ProgressV2): string {
  return JSON.stringify(progress, null, 2);
}

function valid(raw: string | null): ProgressV2 | null {
  if (raw === null) return null;
  try { return parseProgress(raw); } catch { return null; }
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function currentCorruptionProtectionError(storage: Storage, currentRaw: string): string | null {
  let envelopeRaw: string | null;
  try { envelopeRaw = storage.getItem(CORRUPT_PROGRESS_KEY); }
  catch { return '损坏原文尚未安全保留：无法读取损坏存档信封'; }
  if (envelopeRaw === null) return '损坏原文尚未安全保留：缺少损坏存档信封';

  try {
    const envelope: unknown = JSON.parse(envelopeRaw);
    if (typeof envelope !== 'object' || envelope === null || Object.getPrototypeOf(envelope) !== Object.prototype) {
      return '损坏原文尚未安全保留：损坏存档信封格式无效';
    }
    const record = envelope as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length !== 3 || !['current', 'snapshot', 'capturedAt'].every((key) => keys.includes(key))) {
      return '损坏原文尚未安全保留：损坏存档信封格式无效';
    }
    if (record.current !== currentRaw
      || (record.snapshot !== null && typeof record.snapshot !== 'string')
      || !isCanonicalIso(record.capturedAt)) {
      return '损坏原文尚未安全保留：损坏存档信封不匹配';
    }
    return null;
  } catch {
    return '损坏原文尚未安全保留：损坏存档信封格式无效';
  }
}

function writeAndVerify(storage: Storage, key: string, value: string, stage: string): string | null {
  try { storage.setItem(key, value); } catch { /* verify because some stores throw after committing */ }
  try {
    if (storage.getItem(key) === value) return null;
    return `${stage}失败：写入内容校验不一致`;
  } catch (error) {
    return `${stage}失败：无法校验写入结果（${errorMessage(error)}）`;
  }
}

function loadResult(
  progress: ProgressV2,
  status: LoadStatus,
  corruptDownload: string | null,
  errors: string[] = [],
): LoadResult {
  return {
    progress,
    status,
    corruptDownload,
    persistence: errors.length === 0 ? 'saved' : 'unsaved',
    error: errors.length === 0 ? null : errors.join('；'),
  };
}

export function loadProgressTransaction(storage: Storage = localStorage, clock: Clock = systemClock): LoadResult {
  let currentRaw: string | null;
  try { currentRaw = storage.getItem(CURRENT_PROGRESS_KEY); }
  catch (error) {
    return loadResult(createInitialProgress(), 'storage-unavailable', null, [`读取当前存档失败：${errorMessage(error)}`]);
  }
  if (currentRaw === null) {
    let legacyRaw: string | null;
    try { legacyRaw = storage.getItem(LEGACY_PROGRESS_KEY); }
    catch (error) {
      return loadResult(createInitialProgress(), 'storage-unavailable', null, [`读取旧版存档失败：${errorMessage(error)}`]);
    }
    if (legacyRaw !== null) {
      try {
        const migrated = parseProgress(legacyRaw);
        const error = writeAndVerify(storage, CURRENT_PROGRESS_KEY, serialize(migrated), '迁移当前存档');
        return loadResult(migrated, 'migrated', null, error ? [error] : []);
      } catch {
        // A malformed legacy save is ignored; the original remains available for rollback.
      }
    }
    // No write is required yet, so there is no pending persistence failure.
    return loadResult(createInitialProgress(), 'normal', null);
  }

  const current = valid(currentRaw);
  if (current) return loadResult(current, 'normal', null);

  const capturedAt = clock().toISOString();
  let snapshotRaw: string | null;
  try { snapshotRaw = storage.getItem(SNAPSHOT_PROGRESS_KEY); }
  catch (error) {
    const corruptDownload = JSON.stringify({ current: currentRaw, snapshot: null, capturedAt });
    const errors = [`读取快照失败：${errorMessage(error)}`];
    const corruptError = writeAndVerify(storage, CORRUPT_PROGRESS_KEY, corruptDownload, '保留损坏存档');
    if (corruptError) errors.push(corruptError);
    return loadResult(createInitialProgress(), 'storage-unavailable', corruptDownload, errors);
  }
  const corruptDownload = JSON.stringify({ current: currentRaw, snapshot: snapshotRaw, capturedAt });
  const errors: string[] = [];
  const corruptError = writeAndVerify(storage, CORRUPT_PROGRESS_KEY, corruptDownload, '保留损坏存档');
  if (corruptError) errors.push(corruptError);

  const snapshot = valid(snapshotRaw);
  const progress: ProgressV2 = snapshot
    ? { ...snapshot, recovery: { lastRecoveredAt: capturedAt, source: 'snapshot' } }
    : { ...createInitialProgress(), recovery: { lastRecoveredAt: capturedAt, source: 'initial' } };
  // Never destroy the only corrupt source before its envelope is durably verified.
  if (!corruptError) {
    const currentError = writeAndVerify(storage, CURRENT_PROGRESS_KEY, serialize(progress), '写回恢复存档');
    if (currentError) errors.push(currentError);
  }
  return loadResult(
    progress,
    snapshot ? 'recovered-from-snapshot' : 'reset-after-corruption',
    corruptDownload,
    errors,
  );
}

export function saveProgressTransaction(progress: ProgressV2, storage: Storage = localStorage): SaveResult {
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

export function retrySave(progress: ProgressV2, storage: Storage = localStorage): SaveResult {
  return saveProgressTransaction(progress, storage);
}

export function importProgressTransaction(raw: string, storage: Storage = localStorage): ImportResult {
  let progress: ProgressV2;
  try { progress = parseProgress(raw); }
  catch (error) { return { status: 'rejected', error: errorMessage(error) }; }
  return saveProgressTransaction(progress, storage);
}

export function createProgressBackup(progress: ProgressV2, clock: Clock = systemClock): ProgressBackup {
  const date = clock().toISOString().slice(0, 10);
  return { filename: `xiyou-progress-${date}.json`, contents: serialize(progress), mimeType: 'application/json' };
}

export function clearProgressTransaction(storage: Storage = localStorage): SaveResult {
  return saveProgressTransaction(createInitialProgress(), storage);
}
