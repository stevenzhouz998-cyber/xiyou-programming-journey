import type { ProgressV3 } from './types';
import {
  CORRUPT_PROGRESS_KEY, CURRENT_PROGRESS_KEY, REVISION_PROGRESS_KEY,
  LEGACY_WORKSPACE_PREFIX, SNAPSHOT_PROGRESS_KEY, parseStoredRevision, saveProgressTransaction,
} from './storage';

export interface LockManagerLike { request<T>(name: string, callback: () => Promise<T> | T): Promise<T> }
export interface CoordinatorOptions { storage?: Storage; lockManager?: LockManagerLike | null }
export interface SaveCoordinatorOptions extends CoordinatorOptions { legacyWorkspaceKey?: string }
export const PROGRESS_CONFLICT_ERROR = '其他标签页已更新，已暂停保存';
type Conflict = { status: 'conflict'; expectedRevision: number; actualRevision: number; progress: ProgressV3; error: string };
export type CoordinatedSaveResult =
  | { status: 'saved'; revision: number; progress: ProgressV3 }
  | { status: 'unsaved'; progress: ProgressV3; error: string; storageMayHaveChanged?: true }
  | Conflict;

const locks = (options: CoordinatorOptions) => options.lockManager === undefined
  ? (typeof navigator === 'undefined' ? null : (navigator as Navigator & { locks?: LockManagerLike }).locks ?? null)
  : options.lockManager;
function locked<T>(options: CoordinatorOptions, operation: () => T | Promise<T>): Promise<T> {
  const manager = locks(options);
  if (!manager) return Promise.reject(new Error('浏览器不支持可靠的跨标签页存档锁，已拒绝写入'));
  try {
    return Promise.resolve(manager.request('xiyou-programming-progress-v3-write', operation));
  } catch (error) {
    return Promise.reject(error);
  }
}
function message(error: unknown) { return error instanceof Error ? error.message : String(error); }
function conflict(progress: ProgressV3, expectedRevision: number, actualRevision: number): Conflict {
  return { status: 'conflict', progress, expectedRevision, actualRevision, error: PROGRESS_CONFLICT_ERROR };
}
function capture(storage: Storage, keys: readonly string[]) {
  return new Map(keys.map((key) => [key, storage.getItem(key)]));
}
function restore(storage: Storage, before: Map<string, string | null>) {
  const errors: string[] = [];
  for (const [key, raw] of before) try {
    if (storage.getItem(key) !== raw) raw === null ? storage.removeItem(key) : storage.setItem(key, raw);
    if (storage.getItem(key) !== raw) errors.push(`${key}回滚校验不一致`);
  } catch (error) { errors.push(`${key}: ${message(error)}`); }
  return errors;
}

export type CoordinatedSuccess = { status: 'saved' | 'cleared'; progress: ProgressV3 };
type CoordinatedKeySource = readonly string[] | ((storage: Storage) => readonly string[]);
export function coordinateProgressWrite<T>(
  progress: ProgressV3, expected: number, options: CoordinatorOptions, keys: CoordinatedKeySource,
  operation: (storage: Storage, transactionKeys: readonly string[]) => T,
  isSuccess: (result: T) => result is T & CoordinatedSuccess,
  failureStatus: 'unsaved' | 'unchanged' = 'unsaved',
): Promise<(T & { revision?: number }) | Conflict> {
  return locked(options, () => {
    const storage = options.storage ?? localStorage;
    let actual: number;
    try { actual = parseStoredRevision(storage.getItem(REVISION_PROGRESS_KEY)); }
    catch (error) { return { status: failureStatus, progress, error: message(error) } as T; }
    if (actual !== expected) return conflict(progress, expected, actual);
    let before: Map<string, string | null>;
    let transactionKeys: readonly string[];
    try {
      transactionKeys = typeof keys === 'function' ? keys(storage) : keys;
      before = capture(storage, transactionKeys);
    }
    catch (error) { return { status: failureStatus, progress, error: `写入前读取失败：${message(error)}` } as T; }
    const result = operation(storage, transactionKeys);
    if (!isSuccess(result)) {
      const rollback = restore(storage, before);
      if (rollback.length) {
        if (failureStatus === 'unchanged') {
          return { status: 'unknown', progress, error: `${(result as { error?: string }).error ?? '写入失败'}；回滚失败：${rollback.join('；')}` } as T;
        }
        return {
          status: 'unsaved', progress,
          error: `${(result as { error?: string }).error ?? '写入失败'}；回滚失败：${rollback.join('；')}`,
          storageMayHaveChanged: true,
        } as T;
      }
      return result;
    }
    const revision = actual + 1;
    try {
      storage.setItem(REVISION_PROGRESS_KEY, String(revision));
      if (storage.getItem(REVISION_PROGRESS_KEY) !== String(revision)) throw new Error('revision 读回不一致');
      return { ...result, revision };
    } catch (error) {
      const rollback = restore(storage, before);
      const status = result.status === 'cleared' ? (rollback.length ? 'unknown' : 'unchanged') : 'unsaved';
      return {
        status,
        progress,
        error: `revision 写入失败：${message(error)}${rollback.length ? `；回滚失败：${rollback.join('；')}` : ''}`,
        ...(result.status !== 'cleared' && rollback.length ? { storageMayHaveChanged: true as const } : {}),
      } as T;
    }
  }).catch((error) => ({
    status: failureStatus,
    progress,
    error: `跨标签页写入协调失败：${message(error)}`,
  } as T)) as Promise<(T & { revision?: number }) | Conflict>;
}

const saveKeys = [CURRENT_PROGRESS_KEY, SNAPSHOT_PROGRESS_KEY, CORRUPT_PROGRESS_KEY, REVISION_PROGRESS_KEY];
function saveWithLegacyCleanup(progress: ProgressV3, storage: Storage, legacyWorkspaceKey?: string) {
  const saved = saveProgressTransaction(progress, storage);
  if (saved.status !== 'saved' || legacyWorkspaceKey === undefined) return saved;
  try {
    storage.removeItem(legacyWorkspaceKey);
    if (storage.getItem(legacyWorkspaceKey) !== null) throw new Error('删除后读回不一致');
    return saved;
  } catch (error) {
    return { status: 'unsaved' as const, progress, error: `旧版积木草稿清理失败：${message(error)}` };
  }
}

export function saveProgressCoordinated(
  progress: ProgressV3,
  expected: number,
  options: SaveCoordinatorOptions = {},
): Promise<CoordinatedSaveResult> {
  const storage = options.storage ?? (typeof localStorage === 'undefined' ? undefined : localStorage);
  const testMode = storage?.getItem('xiyou-test-storage-mode');
  const regalia = progress.sessions['w1-m3'];
  const failTestWrite = testMode === 'fail-regalia-draft'
    ? regalia !== undefined && regalia.workspace.blocks.length > 0 && regalia.lastRun === null && progress.missions['w1-m3'] === undefined
    : testMode === 'fail-regalia-session'
      ? regalia?.lastRun !== null && regalia?.lastRun !== undefined && progress.missions['w1-m3'] === undefined
      : testMode === 'fail-regalia-completion'
        ? progress.missions['w1-m3'] !== undefined
        : false;
  if (failTestWrite) return Promise.resolve({ status: 'unsaved', progress, error: '四海披挂测试存储故障' });
  const legacyWorkspaceKey = options.legacyWorkspaceKey;
  if (legacyWorkspaceKey !== undefined && !legacyWorkspaceKey.startsWith(LEGACY_WORKSPACE_PREFIX)) {
    return Promise.resolve({
      status: 'unsaved' as const,
      progress,
      error: '旧版积木草稿键无效',
    });
  }
  const transactionKeys = legacyWorkspaceKey === undefined ? saveKeys : [...saveKeys, legacyWorkspaceKey];
  return coordinateProgressWrite(progress, expected, options, transactionKeys,
    storage => saveWithLegacyCleanup(progress, storage, legacyWorkspaceKey),
    (result): result is ReturnType<typeof saveProgressTransaction> & CoordinatedSuccess => result.status === 'saved') as Promise<CoordinatedSaveResult>;
}
