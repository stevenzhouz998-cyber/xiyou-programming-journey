import {
  CORRUPT_PROGRESS_KEY,
  CURRENT_PROGRESS_KEY,
  REVISION_PROGRESS_KEY,
  SNAPSHOT_PROGRESS_KEY,
  writeAndVerify,
  type LoadRepair,
  type SaveResult,
} from './storage';
import {
  coordinateProgressWrite,
  type CoordinatedSaveResult,
  type CoordinatedSuccess,
  type CoordinatorOptions,
} from './storageCoordinator';

const message = (error: unknown) => error instanceof Error ? error.message : String(error);

export function repairLoadedProgressTransaction(repair: LoadRepair, storage: Storage = localStorage): SaveResult {
  try {
    if (storage.getItem(CURRENT_PROGRESS_KEY) !== repair.expectedCurrentRaw) {
      return { status: 'unsaved', progress: repair.progress, error: '加载后存档已变化，已取消旧修复' };
    }
    if (repair.corruptRaw !== null) {
      const error = writeAndVerify(storage, CORRUPT_PROGRESS_KEY, repair.corruptRaw, '保留损坏存档');
      if (error) return { status: 'unsaved', progress: repair.progress, error };
    }
    if (repair.currentRaw !== null) {
      const error = writeAndVerify(storage, CURRENT_PROGRESS_KEY, repair.currentRaw, '写回加载存档');
      if (error) return { status: 'unsaved', progress: repair.progress, error };
    }
    return { status: 'saved', progress: repair.progress };
  } catch (error) {
    return { status: 'unsaved', progress: repair.progress, error: `加载修复失败：${message(error)}` };
  }
}

const repairKeys = [CURRENT_PROGRESS_KEY, SNAPSHOT_PROGRESS_KEY, CORRUPT_PROGRESS_KEY, REVISION_PROGRESS_KEY];

export function repairLoadedProgressCoordinated(repair: LoadRepair, options: CoordinatorOptions = {}) {
  return coordinateProgressWrite(
    repair.progress,
    repair.expectedRevision,
    options,
    repairKeys,
    storage => repairLoadedProgressTransaction(repair, storage),
    (result): result is ReturnType<typeof repairLoadedProgressTransaction> & CoordinatedSuccess => result.status === 'saved',
  ) as Promise<CoordinatedSaveResult>;
}
