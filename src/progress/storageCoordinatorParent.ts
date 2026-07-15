import { createInitialProgress } from './schema';
import {
  CORRUPT_PROGRESS_KEY,
  CURRENT_PROGRESS_KEY,
  getClearProgressKeys,
  REVISION_PROGRESS_KEY,
  SNAPSHOT_PROGRESS_KEY,
  type ClearResult,
  type ImportResult,
} from './storage';
import { clearProgressTransaction, importProgressTransaction } from './storageParent';
import {
  coordinateProgressWrite,
  type CoordinatedSuccess,
  type CoordinatorOptions,
  type CoordinatedSaveResult,
} from './storageCoordinator';

type Conflict = Extract<CoordinatedSaveResult, { status: 'conflict' }>;
export type CoordinatedImportResult =
  | (Extract<ImportResult, { status: 'saved' }> & { revision: number })
  | Exclude<ImportResult, { status: 'saved' }> | Conflict;
export type CoordinatedClearResult =
  | (Extract<ClearResult, { status: 'cleared' }> & { revision: number })
  | Exclude<ClearResult, { status: 'cleared' }> | Conflict;

const saveKeys = [CURRENT_PROGRESS_KEY, SNAPSHOT_PROGRESS_KEY, CORRUPT_PROGRESS_KEY, REVISION_PROGRESS_KEY];

export function importProgressCoordinated(raw: string, expected: number, options: CoordinatorOptions = {}) {
  let progress = createInitialProgress();
  try { const parsed = JSON.parse(raw); if (parsed?.version === 3) progress = parsed; } catch { /* transaction rejects raw */ }
  return coordinateProgressWrite(progress, expected, options, saveKeys, storage => importProgressTransaction(raw, storage),
    (result): result is ImportResult & CoordinatedSuccess => result.status === 'saved') as Promise<CoordinatedImportResult>;
}

export function clearProgressCoordinated(expected: number, options: CoordinatorOptions = {}) {
  const progress = createInitialProgress();
  return coordinateProgressWrite(progress, expected, options, getClearProgressKeys,
    (storage, transactionKeys) => clearProgressTransaction(storage, transactionKeys),
    (result): result is ClearResult & CoordinatedSuccess => result.status === 'cleared', 'unchanged') as Promise<CoordinatedClearResult>;
}
