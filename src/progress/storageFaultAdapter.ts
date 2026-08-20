import type { ProgressV3 } from './types';

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
