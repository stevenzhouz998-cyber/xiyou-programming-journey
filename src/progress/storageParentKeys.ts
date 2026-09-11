import {
  CURRENT_PROGRESS_KEY,
  SNAPSHOT_PROGRESS_KEY,
  CORRUPT_PROGRESS_KEY,
  LEGACY_V2_CURRENT_KEY,
  LEGACY_V2_SNAPSHOT_KEY,
  LEGACY_V2_CORRUPT_KEY,
  LEGACY_PROGRESS_KEY,
  LEGACY_WORKSPACE_KEY,
  REVISION_PROGRESS_KEY,
  LEGACY_WORKSPACE_PREFIX,
} from './storage';

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
