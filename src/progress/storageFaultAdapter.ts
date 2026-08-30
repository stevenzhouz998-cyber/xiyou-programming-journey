import type { ProgressV3 } from './types';

/** Test-only names shared with the E2E adapter; production never reads or enables them. */
export const WEEK_THREE_BOSS_STORAGE_FAULT_MODES = [
  'fail-week-three-boss-draft',
  'fail-week-three-boss-run',
  'fail-week-three-boss-observation',
  'fail-week-three-boss-completion',
  'corrupt-week-three-boss-current',
] as const;

/** Test-only W4 save stages. Production never reads browser storage fault flags. */
export const WEEK_FOUR_MAPPING_STORAGE_FAULT_MODES = [
  'fail-w4-m1-draft',
  'fail-w4-m1-run',
  'fail-w4-m1-observation',
  'fail-w4-m1-work',
  'fail-w4-m1-completion',
] as const;

export interface StorageFaultAdapter {
  beforeProgressWrite(input: { storage: Storage; progress: ProgressV3 }): string | null;
  beforeProgressLoad(storage: Storage): void;
}

export type AdvancedStorageFaultHandler = StorageFaultAdapter['beforeProgressWrite'];
let advancedStorageFaultHandler: AdvancedStorageFaultHandler = () => null;

export function registerAdvancedStorageFaultHandler(handler: AdvancedStorageFaultHandler): void {
  advancedStorageFaultHandler = handler;
}

export const storageFaultAdapter: StorageFaultAdapter = {
  beforeProgressWrite: (input) => advancedStorageFaultHandler(input),
  beforeProgressLoad: () => undefined,
};
