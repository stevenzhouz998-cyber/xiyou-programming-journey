import { createInitialProgress, parseProgress } from './schema';
import type { ProgressV3 } from './types';
import {
  CLEAR_PROGRESS_KEYS,
  CORRUPT_PROGRESS_KEY,
  CURRENT_PROGRESS_KEY,
  getClearProgressKeys,
  SNAPSHOT_PROGRESS_KEY,
  saveProgressTransaction,
  type ClearResult,
  type ImportResult,
} from './storage';

const message = (error: unknown) => error instanceof Error ? error.message : String(error);

export function importProgressTransaction(raw: string, storage: Storage = localStorage): ImportResult {
  let progress: ProgressV3;
  try { progress = parseProgress(raw); }
  catch (error) { return { status: 'rejected', error: message(error) }; }

  let sourceVersion: 1 | 2 | 3;
  try {
    const source: unknown = JSON.parse(raw);
    if (typeof source !== 'object' || source === null || Object.getPrototypeOf(source) !== Object.prototype) {
      return { status: 'rejected', error: '进度文件格式无效：顶层必须是普通对象' };
    }
    const version = (source as { version?: unknown }).version;
    if (version !== 1 && version !== 2 && version !== 3) return { status: 'rejected', error: '进度版本不受支持' };
    sourceVersion = version;
  } catch { return { status: 'rejected', error: '进度文件无法读取' }; }
  const keys = [CURRENT_PROGRESS_KEY, SNAPSHOT_PROGRESS_KEY, CORRUPT_PROGRESS_KEY] as const;
  const before = new Map<string, string | null>();
  try { for (const key of keys) before.set(key, storage.getItem(key)); }
  catch (error) { return { status: 'unsaved', progress, sourceVersion, error: `导入前读取存储失败：${message(error)}` }; }
  const result = saveProgressTransaction(progress, storage);
  if (result.status === 'saved') return { ...result, sourceVersion };

  const rollbackErrors: string[] = [];
  for (const key of keys) {
    const original = before.get(key) ?? null;
    try {
      if (storage.getItem(key) !== original) original === null ? storage.removeItem(key) : storage.setItem(key, original);
      if (storage.getItem(key) !== original) rollbackErrors.push(`${key}校验不一致`);
    } catch (error) { rollbackErrors.push(`${key}: ${message(error)}`); }
  }
  if (rollbackErrors.length) return { status: 'rollback-failed', progress, sourceVersion, storageMayHaveChanged: true, error: `${result.error}；回滚失败：${rollbackErrors.join('；')}` };
  return { ...result, sourceVersion, storageMayHaveChanged: false };
}

export function clearProgressTransaction(
  storage: Storage = localStorage,
  transactionKeys?: readonly string[],
): ClearResult {
  const target = createInitialProgress();
  const targetRaw = JSON.stringify(target, null, 2);
  let keys: readonly string[] = CLEAR_PROGRESS_KEYS;
  const before = new Map<string, string | null>();
  try {
    keys = transactionKeys ?? getClearProgressKeys(storage);
    for (const key of keys) before.set(key, storage.getItem(key));
  }
  catch (error) { return { status: 'unknown', progress: target, error: `清空前无法读取全部存档：${message(error)}` }; }

  const rollback = (cause: string): ClearResult => {
    const errors: string[] = [];
    for (const key of keys) {
      const original = before.get(key) ?? null;
      try {
        if (storage.getItem(key) !== original) original === null ? storage.removeItem(key) : storage.setItem(key, original);
        if (storage.getItem(key) !== original) errors.push(`${key}校验不一致`);
      } catch (error) { errors.push(`${key}: ${message(error)}`); }
    }
    return errors.length
      ? { status: 'unknown', progress: target, error: `${cause}；回滚失败：${errors.join('；')}` }
      : { status: 'unchanged', progress: target, error: cause };
  };

  try {
    storage.setItem(CURRENT_PROGRESS_KEY, targetRaw);
    if (storage.getItem(CURRENT_PROGRESS_KEY) !== targetRaw) return rollback('清空当前存档校验不一致');
    for (const key of keys) {
      if (key === CURRENT_PROGRESS_KEY) continue;
      storage.removeItem(key);
      if (storage.getItem(key) !== null) return rollback(`清空 ${key} 校验不一致`);
    }
    return { status: 'cleared', progress: target };
  } catch (error) {
    return rollback(`清空后无法确认读回结果：${message(error)}`);
  }
}
