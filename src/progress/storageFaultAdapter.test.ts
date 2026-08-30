import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runFourSeasRegalia } from '../battle/fourSeasRegalia';
import type { FourSeasInstruction } from '../battle/types';
import { storageFaultAdapter as e2eStorageFaultAdapter } from '../../e2e/support/storageFaultAdapter';
import { completeMission, createInitialProgress, serializeProgress } from './progress';
import { createMissionSession, recordConditionObservationUse, recordCuilanConditionObservationUse, recordHint, recordRun, updateWorkspaceDraft } from './session';
import { compileManorHelpDraft, createDefaultManorHelpDraft, runManorHelp } from '../blockly/weekThreeManorHelpContract';
import { compileCuilanBooleanDraft, createDefaultCuilanBooleanDraft, runCuilanBooleanForDraft } from '../blockly/weekThreeCuilanBooleanContract';
import { compileBajieJoiningDraft, runBajieJoiningForDraft } from '../blockly/weekThreeBajieJoiningContract';
import { compileHeavenlySignalBossDraft, createDefaultHeavenlySignalBossDraft, runHeavenlySignalBoss } from '../blockly/weekTwoHeavenlySignalBossContract';
import { compileWeekThreeBossDraft } from '../blockly/weekThreeBossCompiler';
import { runWeekThreeBossDraft } from '../blockly/weekThreeBossContract';
import { createSolvedWeekThreeBossDraftForTest } from '../blockly/weekThreeBossTestHelpers';
import { compileWeekFourMappingDraft } from '../blockly/weekFourMappingCompiler';
import { compareWeekFourMappingTraces } from '../blockly/weekFourMappingContract';
import { SOLVED_WEEK_FOUR_MAPPING_PYTHON, parseWeekFourMappingPython } from '../engine/weekFourPythonMappingGrammar';
import { createWeekFourMappingSession, recordWeekFourMappingObservation, recordWeekFourMappingRun, updateWeekFourMappingCode } from './weekFourMappingSession';
import { WEEK_FOUR_MAPPING_STORAGE_FAULT_MODES, WEEK_THREE_BOSS_STORAGE_FAULT_MODES, storageFaultAdapter as productionStorageFaultAdapter } from './storageFaultAdapter';
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

function withManorDraft(base = createInitialProgress()) {
  const session = createMissionSession('w3-m1', NOW);
  return {
    ...base,
    sessions: { ...base.sessions, 'w3-m1': updateWorkspaceDraft(session, session.workspace, NOW) },
    savedAt: NOW,
  };
}

function withFailedManorRun(base = withManorDraft()) {
  const session = base.sessions['w3-m1']!;
  const trace = compileManorHelpDraft(session.workspace);
  return {
    ...base,
    sessions: { ...base.sessions, 'w3-m1': recordRun(session, runManorHelp(trace), trace, '2026-08-26T00:01:00.000Z') },
    savedAt: '2026-08-26T00:01:00.000Z',
  };
}

function withSuccessfulManorRun(base = withManorDraft()) {
  const draft = createDefaultManorHelpDraft();
  draft.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help';
  const trace = compileManorHelpDraft(draft);
  const session = updateWorkspaceDraft(base.sessions['w3-m1']!, draft, '2026-08-26T00:01:00.000Z');
  return {
    ...base,
    sessions: { ...base.sessions, 'w3-m1': recordRun(session, runManorHelp(trace), trace, '2026-08-26T00:02:00.000Z') },
    savedAt: '2026-08-26T00:02:00.000Z',
  };
}

function withCuilanDraft(base = createInitialProgress()) {
  const session = createMissionSession('w3-m2', NOW);
  return { ...base, sessions: { ...base.sessions, 'w3-m2': updateWorkspaceDraft(session, session.workspace, NOW) }, savedAt: NOW };
}

function withFailedCuilanRun(base = withCuilanDraft()) {
  const session = base.sessions['w3-m2']!;
  const trace = compileCuilanBooleanDraft(session.workspace);
  return { ...base, sessions: { ...base.sessions, 'w3-m2': recordRun(session, runCuilanBooleanForDraft(session.workspace, trace), trace, '2026-08-27T00:01:00.000Z') }, savedAt: '2026-08-27T00:01:00.000Z' };
}

function withSuccessfulCuilanRun(base = withCuilanDraft()) {
  const draft = createDefaultCuilanBooleanDraft();
  draft.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
  const trace = compileCuilanBooleanDraft(draft);
  const session = updateWorkspaceDraft(base.sessions['w3-m2']!, draft, '2026-08-27T00:01:00.000Z');
  return { ...base, sessions: { ...base.sessions, 'w3-m2': recordRun(session, runCuilanBooleanForDraft(draft, trace), trace, '2026-08-27T00:02:00.000Z') }, savedAt: '2026-08-27T00:02:00.000Z' };
}

function withBajieDraft(base = createInitialProgress()) {
  const session = createMissionSession('w3-m4', NOW);
  return { ...base, sessions: { ...base.sessions, 'w3-m4': updateWorkspaceDraft(session, session.workspace, NOW) }, savedAt: NOW };
}
function withFailedBajieRun(base = withBajieDraft()) {
  const session = base.sessions['w3-m4']!; const trace = compileBajieJoiningDraft(session.workspace);
  return { ...base, sessions: { ...base.sessions, 'w3-m4': recordRun(session, runBajieJoiningForDraft(session.workspace, trace), trace, '2026-08-28T00:01:00.000Z') }, savedAt: '2026-08-28T00:01:00.000Z' };
}
function withSuccessfulBajieRun(base = withBajieDraft()) {
  const draft = structuredClone(base.sessions['w3-m4']!.workspace); draft.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and'; const trace = compileBajieJoiningDraft(draft); const session = updateWorkspaceDraft(base.sessions['w3-m4']!, draft, '2026-08-28T00:01:00.000Z');
  return { ...base, sessions: { ...base.sessions, 'w3-m4': recordRun(session, runBajieJoiningForDraft(draft, trace), trace, '2026-08-28T00:02:00.000Z') }, savedAt: '2026-08-28T00:02:00.000Z' };
}
function withFormalW3M4(base = createInitialProgress()) {
  return completeMission(withSuccessfulBajieRun(withBajieDraft(base)), 'w3-m4', { stars: 3, hintsUsed: 0 });
}

function withBossDraft(base = createInitialProgress()) {
  const session = createMissionSession('w3-m5', NOW);
  return { ...base, sessions: { ...base.sessions, 'w3-m5': updateWorkspaceDraft(session, session.workspace, NOW) }, savedAt: NOW };
}
function withFailedBossRun(base = withBossDraft()) {
  const session = base.sessions['w3-m5']!; const compiled = compileWeekThreeBossDraft(session.workspace);
  if (!compiled.ok) throw new Error('test boss draft must compile');
  return { ...base, sessions: { ...base.sessions, 'w3-m5': recordRun(session, runWeekThreeBossDraft(session.workspace), compiled.trace, '2026-08-30T00:01:00.000Z') }, savedAt: '2026-08-30T00:01:00.000Z' };
}
function withSuccessfulBossRun(base = withBossDraft()) {
  const draft = createSolvedWeekThreeBossDraftForTest(); const compiled = compileWeekThreeBossDraft(draft);
  if (!compiled.ok) throw new Error('test solved boss draft must compile');
  const session = updateWorkspaceDraft(base.sessions['w3-m5']!, draft, '2026-08-30T00:01:00.000Z');
  return { ...base, sessions: { ...base.sessions, 'w3-m5': recordRun(session, runWeekThreeBossDraft(draft), compiled.trace, '2026-08-30T00:02:00.000Z') }, savedAt: '2026-08-30T00:02:00.000Z' };
}

function withW4Draft(base = createInitialProgress()) {
  const session = updateWeekFourMappingCode(createWeekFourMappingSession(NOW), SOLVED_WEEK_FOUR_MAPPING_PYTHON, '2026-08-30T00:00:01.000Z');
  return { ...base, sessions: { ...base.sessions, 'w4-m1': session }, savedAt: session.savedAt };
}
function withW4Run(base = withW4Draft()) {
  const session = base.sessions['w4-m1']!;
  const blocklyTrace = compileWeekFourMappingDraft(session.workspace).trace;
  const pythonTrace = parseWeekFourMappingPython(session.pythonCode).trace;
  const saved = recordWeekFourMappingRun(session, { blocklyTrace, pythonTrace, run: compareWeekFourMappingTraces(blocklyTrace, pythonTrace) }, '2026-08-30T00:00:02.000Z');
  return { ...base, sessions: { ...base.sessions, 'w4-m1': saved }, savedAt: saved.savedAt };
}
function withW4FailedRun(base = createInitialProgress()) {
  const session = createWeekFourMappingSession(NOW);
  const blocklyTrace = compileWeekFourMappingDraft(session.workspace).trace;
  const pythonTrace = parseWeekFourMappingPython(session.pythonCode).trace;
  const saved = recordWeekFourMappingRun(session, { blocklyTrace, pythonTrace, run: compareWeekFourMappingTraces(blocklyTrace, pythonTrace) }, '2026-08-30T00:00:02.000Z');
  return { ...base, sessions: { ...base.sessions, 'w4-m1': saved }, savedAt: saved.savedAt };
}

describe('storage fault adapters', () => {
  it('keeps the E2E fault adapter free of W3 runtime imports', () => {
    const source = readFileSync('e2e/support/storageFaultAdapter.ts', 'utf8');
    expect(source).not.toContain('../../src/blockly/weekThreeManorHelpContract');
    expect(source).not.toContain('../../src/progress/session');
  });

  it('keeps the production adapter a typed no-op without any storage reads', () => {
    const storage = new MemoryStorage();
    expect(productionStorageFaultAdapter.beforeProgressWrite({ storage, progress: createInitialProgress() })).toBeNull();
    productionStorageFaultAdapter.beforeProgressLoad(storage);
    expect(storage.reads).toEqual([]);
  });

  it('declares the four isolated W3-M5 write faults and current-corruption mode without enabling them in production', () => {
    expect(WEEK_THREE_BOSS_STORAGE_FAULT_MODES).toEqual([
      'fail-week-three-boss-draft', 'fail-week-three-boss-run', 'fail-week-three-boss-observation', 'fail-week-three-boss-completion', 'corrupt-week-three-boss-current',
    ]);
  });

  it('declares five isolated W4 write faults without enabling them in production', () => {
    expect(WEEK_FOUR_MAPPING_STORAGE_FAULT_MODES).toEqual([
      'fail-w4-m1-draft', 'fail-w4-m1-run', 'fail-w4-m1-observation', 'fail-w4-m1-work', 'fail-w4-m1-completion',
    ]);
  });

  it('injects only exact W4 draft, run, and atomic work/completion deltas', () => {
    const storage = new MemoryStorage();
    const base = createInitialProgress(); const draft = withW4Draft(base); const run = withW4Run(draft);
    storeCurrent(storage, base, 'fail-w4-m1-draft');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: draft })).toMatch(/fault/i);
    storeCurrent(storage, draft, 'fail-w4-m1-run');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: run })).toMatch(/fault/i);
    const forCompletion = structuredClone(run); forCompletion.missionCompletionEvidence['w3-m5'] = { kind: 'formal-v3' } as never;
    const completed = completeMission(forCompletion, 'w4-m1', { stars: 3, hintsUsed: 0 });
    storeCurrent(storage, forCompletion, 'fail-w4-m1-work');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: completed })).toMatch(/fault/i);
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...completed, works: {} } })).toBeNull();
    storeCurrent(storage, forCompletion, 'fail-w4-m1-completion');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: completed })).toMatch(/fault/i);

    const failed = withW4FailedRun();
    const observedSession = recordWeekFourMappingObservation(failed.sessions['w4-m1']!, '2026-08-30T00:00:03.000Z');
    const observed = { ...failed, sessions: { ...failed.sessions, 'w4-m1': observedSession }, savedAt: observedSession.savedAt };
    storeCurrent(storage, failed, 'fail-w4-m1-observation');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: observed })).toMatch(/fault/i);
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

  it('injects only exact W3 draft, failed-run, and observation deltas', () => {
    const storage = new MemoryStorage();
    const base = createInitialProgress();
    const draft = withManorDraft(base);
    storeCurrent(storage, base, 'fail-manor-draft');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: draft })).toMatch(/fault/i);
    storeCurrent(storage, draft, 'fail-manor-draft');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: structuredClone(draft) })).toBeNull();
    const reSavedDraft = {
      ...draft,
      sessions: { ...draft.sessions, 'w3-m1': updateWorkspaceDraft(draft.sessions['w3-m1']!, draft.sessions['w3-m1']!.workspace, '2026-08-26T00:00:00.000Z') },
      savedAt: '2026-08-26T00:00:00.000Z',
    };
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: reSavedDraft })).toMatch(/fault/i);
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...draft, learnerName: 'unrelated' } })).toBeNull();

    const failed = withFailedManorRun(draft);
    storeCurrent(storage, draft, 'fail-manor-session');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: failed })).toMatch(/fault/i);
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...failed, settings: { ...failed.settings, muted: true } } })).toBeNull();

    const observation = {
      ...failed,
      sessions: {
        ...failed.sessions,
        'w3-m1': recordConditionObservationUse(failed.sessions['w3-m1']!, failed.sessions['w3-m1']!.failureSnapshot!.snapshotId, '2026-08-26T00:02:00.000Z'),
      },
      savedAt: '2026-08-26T00:02:00.000Z',
    };
    storeCurrent(storage, failed, 'fail-manor-observation');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: observation })).toMatch(/fault/i);
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...observation, missions: { 'w1-m1': { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: NOW } } } })).toBeNull();
    const duplicateObservation = structuredClone(observation);
    const duplicateUse = duplicateObservation.sessions['w3-m1']!.conditionObservationUses[0]!;
    duplicateObservation.sessions['w3-m1']!.conditionObservationUses.push({ ...duplicateUse, usedAt: '2026-08-26T00:03:00.000Z' });
    duplicateObservation.sessions['w3-m1']!.savedAt = '2026-08-26T00:03:00.000Z';
    duplicateObservation.savedAt = '2026-08-26T00:03:00.000Z';
    storeCurrent(storage, observation, 'fail-manor-observation');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: duplicateObservation })).toBeNull();
  });

  it('injects only a formal W3 completion after a persisted successful run', () => {
    const storage = new MemoryStorage();
    const successful = withSuccessfulManorRun();
    const completed = completeMission(successful, 'w3-m1', { stars: 3, hintsUsed: 0 });
    storeCurrent(storage, successful, 'fail-manor-completion');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: completed })).toMatch(/fault/i);
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...completed, learnerName: 'unrelated' } })).toBeNull();
    const staleCompletionTime = structuredClone(completed);
    staleCompletionTime.missions['w3-m1'].completedAt = NOW;
    staleCompletionTime.missionCompletionEvidence['w3-m1'] = {
      ...staleCompletionTime.missionCompletionEvidence['w3-m1']!,
      completedAt: NOW,
    };
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: staleCompletionTime })).toBeNull();
  });

  it('injects only exact W3-M2 draft, failed-run, observation, and formal completion deltas', () => {
    const storage = new MemoryStorage();
    const base = createInitialProgress(); const draft = withCuilanDraft(base);
    storeCurrent(storage, base, 'fail-cuilan-draft');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: draft })).toMatch(/fault/i);
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...draft, learnerName: 'unrelated' } })).toBeNull();
    const failed = withFailedCuilanRun(draft);
    storeCurrent(storage, draft, 'fail-cuilan-run');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: failed })).toMatch(/fault/i);
    const observed = { ...failed, sessions: { ...failed.sessions, 'w3-m2': recordCuilanConditionObservationUse(failed.sessions['w3-m2']!, failed.sessions['w3-m2']!.failureSnapshot!.snapshotId, '2026-08-27T00:02:00.000Z') }, savedAt: '2026-08-27T00:02:00.000Z' };
    storeCurrent(storage, failed, 'fail-cuilan-observation');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: observed })).toMatch(/fault/i);
    const successful = withSuccessfulCuilanRun(); const completed = completeMission(successful, 'w3-m2', { stars: 3, hintsUsed: 0 });
    storeCurrent(storage, successful, 'fail-cuilan-completion');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: completed })).toMatch(/fault/i);
    const forged = structuredClone(completed); delete forged.missionCompletionEvidence['w3-m2'];
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: forged })).toBeNull();
  });

  it('rejects W3 completion when the persisted success run has a diagnostic or penalty', () => {
    const storage = new MemoryStorage();
    const successful = withSuccessfulManorRun();
    const completed = completeMission(successful, 'w3-m1', { stars: 3, hintsUsed: 0 });
    const diagnosticBase = structuredClone(successful);
    const diagnosticCompleted = structuredClone(completed);
    diagnosticBase.sessions['w3-m1']!.lastRun = {
      ...diagnosticBase.sessions['w3-m1']!.lastRun!,
      diagnostic: { concept: 'condition-selection', sourceBlockId: 'forged', messageCode: 'forged' },
    } as any;
    diagnosticCompleted.sessions['w3-m1'] = structuredClone(diagnosticBase.sessions['w3-m1']);
    diagnosticCompleted.missionCompletionEvidence['w3-m1'] = {
      ...diagnosticCompleted.missionCompletionEvidence['w3-m1']!,
      run: structuredClone(diagnosticBase.sessions['w3-m1']!.lastRun),
    } as any;
    storeCurrent(storage, diagnosticBase, 'fail-manor-completion');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: diagnosticCompleted })).toBeNull();

    const penaltyBase = structuredClone(successful);
    const penaltyCompleted = structuredClone(completed);
    penaltyBase.sessions['w3-m1']!.lastRun = {
      ...penaltyBase.sessions['w3-m1']!.lastRun!,
      penalty: { livesLost: 1, resourcesLost: 0, starsLost: 0 },
    } as any;
    penaltyCompleted.sessions['w3-m1'] = structuredClone(penaltyBase.sessions['w3-m1']);
    penaltyCompleted.missionCompletionEvidence['w3-m1'] = {
      ...penaltyCompleted.missionCompletionEvidence['w3-m1']!,
      run: structuredClone(penaltyBase.sessions['w3-m1']!.lastRun),
    } as any;
    storeCurrent(storage, penaltyBase, 'fail-manor-completion');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: penaltyCompleted })).toBeNull();
  });

  it('injects only the W2 Boss completion that stabilizes the already acquired ability', () => {
    const storage = new MemoryStorage();
    const draft = createDefaultHeavenlySignalBossDraft();
    const trace = compileHeavenlySignalBossDraft(draft);
    let base = completeMission(createInitialProgress(), 'w2-m4', { stars: 3, hintsUsed: 0 });
    base = {
      ...base,
      sessions: { ...base.sessions, 'w2-m5': recordRun(createMissionSession('w2-m5', NOW), runHeavenlySignalBoss(trace), trace, NOW) },
      savedAt: NOW,
    };
    const completed = completeMission(base, 'w2-m5', { stars: 3, hintsUsed: 0 });
    storeCurrent(storage, base, 'fail-boss-completion');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: completed })).toMatch(/fault/i);

    const wrongAbility = structuredClone(completed);
    wrongAbility.abilities.conditionObservation.stableUnlockedAt = null;
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: wrongAbility })).toBeNull();
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...completed, learnerName: 'other change' } })).toBeNull();
  });

  it('corrupts only W3 current data and preserves an exact legal snapshot', () => {
    const storage = new MemoryStorage();
    const current = serializeProgress(withManorDraft());
    storage.setItem(CURRENT_KEY, current);
    storage.setItem(MODE_KEY, 'corrupt-manor-current');
    e2eStorageFaultAdapter.beforeProgressLoad(storage);
    expect(storage.getItem(SNAPSHOT_KEY)).toBe(current);
    expect(storage.getItem(CURRENT_KEY)).toBe('{broken w3-m1 current');
    expect(storage.getItem(MODE_KEY)).toBe('off');
  });

  it('injects only exact W3-M4 draft, run, observation, completion, and corrupt deltas', () => {
    const storage = new MemoryStorage(); const base = createInitialProgress(); const draft = withBajieDraft(base);
    storeCurrent(storage, base, 'fail-bajie-draft'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: draft })).toMatch(/fault/i);
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...draft, settings: { ...draft.settings, muted: true } } })).toBeNull();
    const hinted = structuredClone(draft); hinted.sessions['w3-m4']!.usedHintTiers.push('observe'); storeCurrent(storage, base, 'fail-bajie-draft'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: hinted })).toBeNull();
    const failed = withFailedBajieRun(draft); storeCurrent(storage, draft, 'fail-bajie-run'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: failed })).toMatch(/fault/i);
    const badRun = structuredClone(failed); badRun.sessions['w3-m4']!.lastRun!.penalty = { livesLost: 1, resourcesLost: 0, starsLost: 0 } as never; storeCurrent(storage, draft, 'fail-bajie-run'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: badRun })).toBeNull();
    const observed = { ...failed, sessions: { ...failed.sessions, 'w3-m4': recordConditionObservationUse(failed.sessions['w3-m4']!, failed.sessions['w3-m4']!.failureSnapshot!.snapshotId, '2026-08-28T00:02:00.000Z') }, savedAt: '2026-08-28T00:02:00.000Z' };
    storeCurrent(storage, failed, 'fail-bajie-observation'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: observed })).toMatch(/fault/i);
    const success = withSuccessfulBajieRun(); const run = success.sessions['w3-m4']!.lastRun!; const completion = structuredClone(success); completion.missions['w3-m4'] = { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: completion.savedAt }; completion.missionCompletionEvidence['w3-m4'] = { kind: 'formal-v3', completedAt: completion.savedAt, verifiedAt: completion.savedAt, workspace: structuredClone(success.sessions['w3-m4']!.workspace), trace: structuredClone(success.sessions['w3-m4']!.lastTrace), run: structuredClone(run) };
    storeCurrent(storage, success, 'fail-bajie-completion'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: completion })).toMatch(/fault/i);
    const badCompletion = structuredClone(completion); badCompletion.missions['w3-m4']!.stars = 4 as never; storeCurrent(storage, success, 'fail-bajie-completion'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: badCompletion })).toBeNull();
    const current = serializeProgress(completion); storage.setItem(CURRENT_KEY, current); storage.setItem(MODE_KEY, 'corrupt-bajie-current'); e2eStorageFaultAdapter.beforeProgressLoad(storage); expect(storage.getItem(SNAPSHOT_KEY)).toBe(current); expect(storage.getItem(CURRENT_KEY)).toBe('{broken w3-m4 current');
  });

  it('injects only exact W3-M5 draft, run, observation, completion, and corrupt deltas', () => {
    const storage = new MemoryStorage(); const base = createInitialProgress(); const draft = withBossDraft(base);
    storeCurrent(storage, base, 'fail-week-three-boss-draft'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: draft })).toBe('regalia storage fault');
    expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: { ...draft, learnerName: 'unrelated' } })).toBeNull();
    const failed = withFailedBossRun(draft); storeCurrent(storage, draft, 'fail-week-three-boss-run'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: failed })).toBe('regalia storage fault');
    const observed = { ...failed, sessions: { ...failed.sessions, 'w3-m5': recordConditionObservationUse(failed.sessions['w3-m5']!, failed.sessions['w3-m5']!.failureSnapshot!.snapshotId, '2026-08-30T00:02:00.000Z') }, savedAt: '2026-08-30T00:02:00.000Z' };
    storeCurrent(storage, failed, 'fail-week-three-boss-observation'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: observed })).toBe('regalia storage fault');
    const successful = withSuccessfulBossRun(withBossDraft(withFormalW3M4())); const completed = completeMission(successful, 'w3-m5', { stars: 3, hintsUsed: 0 });
    storeCurrent(storage, successful, 'fail-week-three-boss-completion'); expect(e2eStorageFaultAdapter.beforeProgressWrite({ storage, progress: completed })).toBe('regalia storage fault');
    const current = serializeProgress(completed); storage.setItem(CURRENT_KEY, current); storage.setItem(MODE_KEY, 'corrupt-week-three-boss-current'); e2eStorageFaultAdapter.beforeProgressLoad(storage);
    expect(storage.getItem(SNAPSHOT_KEY)).toBe(current); expect(storage.getItem(CURRENT_KEY)).toBe('{broken w3-m5 current'); expect(storage.getItem(MODE_KEY)).toBe('off');
  });
});
