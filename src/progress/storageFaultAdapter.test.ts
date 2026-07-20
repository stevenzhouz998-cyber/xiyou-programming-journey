import { describe, expect, it } from 'vitest';
import { runFourSeasRegalia } from '../battle/fourSeasRegalia';
import type { FourSeasInstruction } from '../battle/types';
import { storageFaultAdapter as e2eStorageFaultAdapter } from '../../e2e/support/storageFaultAdapter';
import { createInitialProgress, serializeProgress } from './progress';
import { createMissionSession, recordHint, recordRun, updateWorkspaceDraft } from './session';
import { storageFaultAdapter as productionStorageFaultAdapter } from './storageFaultAdapter';
import type { ProgressV3 } from './types';

const CURRENT_KEY = 'xiyou-programming-progress-v3';
const SNAPSHOT_KEY = 'xiyou-programming-progress-snapshot-v3';
const MODE_KEY = 'xiyou-test-storage-mode';
const NOW = '2026-07-20T00:00:00.000Z';
const trace: FourSeasInstruction[] = [
  { instructionId: 'instruction:request', sourceBlockId: 'request', parentBlockId: null, opcode: 'request_regalia' },
  { instructionId: 'instruction:collect', sourceBlockId: 'collect', parentBlockId: null, opcode: 'collect_gifts' },
  { instructionId: 'instruction:crown', sourceBlockId: 'crown', parentBlockId: 'collect', opcode: 'receive_purple_crown' },
  { instructionId: 'instruction:armor', sourceBlockId: 'armor', parentBlockId: 'collect', opcode: 'receive_golden_armor' },
  { instructionId: 'instruction:boots', sourceBlockId: 'boots', parentBlockId: 'collect', opcode: 'receive_cloud_boots' },
  { instructionId: 'instruction:equip', sourceBlockId: 'equip', parentBlockId: null, opcode: 'equip_regalia' },
  { instructionId: 'instruction:equip-crown', sourceBlockId: 'equip-crown', parentBlockId: 'equip', opcode: 'wear_crown' },
  { instructionId: 'instruction:equip-armor', sourceBlockId: 'equip-armor', parentBlockId: 'equip', opcode: 'wear_armor' },
  { instructionId: 'instruction:equip-boots', sourceBlockId: 'equip-boots', parentBlockId: 'equip', opcode: 'wear_boots' },
  { instructionId: 'instruction:verify', sourceBlockId: 'verify', parentBlockId: null, opcode: 'verify_regalia' },
];

class MemoryStorage implements Storage {
  values = new Map<string, string>();
  reads: string[] = [];
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { this.reads.push(key); return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function withDraft(base = createInitialProgress()) {
  const session = createMissionSession('w1-m3', NOW);
  const workspace = { version: 1 as const, blocks: [{ id: 'request', type: 'xiyou_request_regalia' as const, parentBlockId: null, nextId: null, x: 10, y: 10 }] };
  return { ...base, sessions: { ...base.sessions, 'w1-m3': updateWorkspaceDraft(session, workspace, NOW) }, savedAt: NOW };
}

function storeCurrent(storage: MemoryStorage, progress: ProgressV3, mode: string) {
  storage.setItem(CURRENT_KEY, serializeProgress(progress));
  storage.setItem(MODE_KEY, mode);
}

describe('storage fault adapters', () => {
  it('keeps the production adapter a typed no-op without any storage reads', () => {
    const storage = new MemoryStorage();
    expect(productionStorageFaultAdapter.beforeProgressWrite({ storage, progress: createInitialProgress() })).toBeNull();
    productionStorageFaultAdapter.beforeProgressLoad(storage);
    expect(storage.reads).toEqual([]);
  });

  it('injects only an exact w1-m3 draft delta and ignores settings or hint writes', () => {
    const storage = new MemoryStorage();
    const base = createInitialProgress();
    storeCurrent(storage, base, 'fail-regalia-draft');
    const draft = withDraft(base);
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: draft })).toMatch(/fault/i);
    storeCurrent(storage, draft, 'fail-regalia-draft');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...draft, settings: { ...draft.settings, muted: true } } })).toBeNull();
    const hinted = { ...draft, sessions: { ...draft.sessions, 'w1-m3': recordHint(structuredClone(draft.sessions['w1-m3']!), 'observe', NOW) } };
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: hinted })).toBeNull();
  });

  it('injects only an exact w1-m3 run delta and ignores other mission changes', () => {
    const storage = new MemoryStorage();
    const draft = withDraft();
    storeCurrent(storage, draft, 'fail-regalia-session');
    const run = { ...draft, sessions: { ...draft.sessions, 'w1-m3': recordRun(structuredClone(draft.sessions['w1-m3']!), runFourSeasRegalia(trace), trace, NOW) } };
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: run })).toMatch(/fault/i);
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...draft, learnerName: 'other change' } })).toBeNull();
  });

  it('injects only the exact w1-m3 completion delta', () => {
    const storage = new MemoryStorage();
    const run = withDraft();
    storeCurrent(storage, run, 'fail-regalia-completion');
    const completed: ProgressV3 = { ...run, missions: { ...run.missions, 'w1-m3': { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW } } };
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: completed })).toMatch(/fault/i);
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...run, missions: { 'w1-m4': completed.missions['w1-m3'] } } })).toBeNull();
  });

  it('corrupts only the approved current-load stage and preserves its legal snapshot', () => {
    const storage = new MemoryStorage();
    const current = serializeProgress(withDraft());
    storage.setItem(CURRENT_KEY, current);
    storage.setItem(MODE_KEY, 'corrupt-regalia-current');
    e2eStorageFaultAdapter.beforeProgressLoad(storage);
    expect(storage.getItem(SNAPSHOT_KEY)).toBe(current);
    expect(storage.getItem(CURRENT_KEY)).not.toBe(current);
    expect(storage.getItem(MODE_KEY)).toBe('off');
  });
});
