import type { ProgressV3 } from './types';

export interface StorageFaultAdapter {
  beforeProgressWrite(input: { storage: Storage; progress: ProgressV3 }): string | null;
  beforeProgressLoad(storage: Storage): void;
}

export const storageFaultAdapter: StorageFaultAdapter = {
  beforeProgressWrite: () => null,
  beforeProgressLoad: () => undefined,
};
