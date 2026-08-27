import { describe, expect, it } from 'vitest';
import { compileCuilanBooleanDraft, createDefaultCuilanBooleanDraft, runCuilanBooleanForDraft } from '../blockly/weekThreeCuilanBooleanContract';
import { createInitialProgress, migrateProgress } from './schema';
import { parseCuilanBooleanSession } from './cuilanBooleanSessionSchema';
import { completeMission, importProgress, isMissionUnlocked, serializeProgress } from './progress';
import { createMissionSession, recordConditionObservationUse, recordRun, updateWorkspaceDraft } from './session';

const NOW = '2026-08-27T00:00:00.000Z';
const LATER = '2026-08-27T00:01:00.000Z';

describe('W3-M2 revision 4 session', () => {
  it('migrates revision 3 while preserving a completed legacy w3-m2 without inventing a session', () => {
    const old = { ...createInitialProgress(), schemaRevision: 3 as const, missions: {
      'w3-m2': { status: 'completed' as const, stars: 3 as const, attempts: 1, hintsUsed: 0, completedAt: NOW },
    } };
    const migrated = migrateProgress(old);
    expect(migrated.schemaRevision).toBe(4);
    expect(migrated.missionCompletionEvidence['w3-m2']).toMatchObject({ kind: 'legacy-preformal' });
    expect(migrated.sessions['w3-m2']).toBeUndefined();
  });

  it('creates an incorrect visible graph, clears current proof on edit, and binds runs to its workspace', () => {
    const session = createMissionSession('w3-m2', NOW);
    const trace = compileCuilanBooleanDraft(session.workspace);
    const failed = runCuilanBooleanForDraft(session.workspace, trace);
    const recorded = recordRun(session, failed, trace, NOW);
    expect(recorded.failureSnapshot?.checkpointId).toBe('identity-reveal');
    const changed = structuredClone(session.workspace);
    changed.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
    const edited = updateWorkspaceDraft(recorded, changed, LATER);
    expect(edited.totalRuns).toBe(1);
    expect(edited).toMatchObject({ lastTrace: [], lastRun: null, checkpointResults: [], failureSnapshot: null });
  });

  it('round-trips cleared current proof after an observed failed run while preserving cumulative audit history', () => {
    const session = createMissionSession('w3-m2', NOW);
    const trace = compileCuilanBooleanDraft(session.workspace);
    const failed = recordRun(session, runCuilanBooleanForDraft(session.workspace, trace), trace, NOW);
    const observed = recordConditionObservationUse(failed, failed.failureSnapshot!.snapshotId, LATER);
    const correct = structuredClone(observed.workspace);
    correct.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
    const edited = updateWorkspaceDraft(observed, correct, '2026-08-27T00:02:00.000Z');
    const progress = createInitialProgress();
    progress.missions = {
      'w2-m4': { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: NOW },
      'w2-m5': { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: NOW },
    };
    progress.abilities = { conditionObservation: { acquiredAt: NOW, stableUnlockedAt: NOW } };
    progress.sessions['w3-m2'] = edited;

    expect(importProgress(serializeProgress(progress)).sessions['w3-m2']).toMatchObject({
      totalRuns: 1,
      runtimeFailures: 1,
      conditionObservationUses: observed.conditionObservationUses,
      lastTrace: [],
      lastRun: null,
      lastRunAt: null,
      checkpointResults: [],
      failureSnapshot: null,
    });
  });

  it('rejects an observation audit whose recorded runtime-failure history was erased', () => {
    const initial = createMissionSession('w3-m2', NOW);
    const trace = compileCuilanBooleanDraft(initial.workspace);
    const failed = recordRun(initial, runCuilanBooleanForDraft(initial.workspace, trace), trace, NOW);
    const observed = recordConditionObservationUse(failed, failed.failureSnapshot!.snapshotId, LATER);
    const correct = structuredClone(observed.workspace);
    correct.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
    const cleared = updateWorkspaceDraft(observed, correct, '2026-08-27T00:02:00.000Z');
    cleared.runtimeFailures = 0;
    cleared.conceptFailures = { programStructure: 0, conditionSelection: 0, branchRouting: 0, sequencePrecondition: 0, completeness: 0 };
    expect(() => parseCuilanBooleanSession(cleared)).toThrow(/观察|失败/);
  });

  it.each([
    ['trace without run', (session: ReturnType<typeof createMissionSession>) => { session.lastTrace = []; }],
    ['run without trace', (session: ReturnType<typeof createMissionSession>) => { session.lastRun = null; }],
    ['run without timestamp', (session: ReturnType<typeof createMissionSession>) => { session.lastRunAt = null; }],
    ['run without checkpoints', (session: ReturnType<typeof createMissionSession>) => { session.checkpointResults = []; }],
    ['run without failure snapshot', (session: ReturnType<typeof createMissionSession>) => { session.failureSnapshot = null; }],
  ])('rejects partially cleared current evidence: %s', (_label, mutate) => {
    const initial = createMissionSession('w3-m2', NOW);
    const trace = compileCuilanBooleanDraft(initial.workspace);
    const recorded = recordRun(initial, runCuilanBooleanForDraft(initial.workspace, trace), trace, NOW);
    mutate(recorded);
    expect(() => parseCuilanBooleanSession(recorded)).toThrow(/运行|重放|lastTrace/);
  });

  it('retains a migrated W3-M2 legacy unlock while a new completion still requires formal proof', () => {
    const legacy = migrateProgress({ ...createInitialProgress(), schemaRevision: 3 as const, missions: {
      'w3-m2': { status: 'completed' as const, stars: 3 as const, attempts: 1, hintsUsed: 0, completedAt: NOW },
    } });
    expect(isMissionUnlocked(legacy, 'w3-m3')).toBe(true);
    legacy.missions['w3-m3'] = { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: LATER };
    expect(isMissionUnlocked(legacy, 'w3-m3')).toBe(true);

    const newPlayer = createInitialProgress();
    newPlayer.missions['w3-m2'] = { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW };
    expect(isMissionUnlocked(newPlayer, 'w3-m3')).toBe(false);

    let session = createMissionSession('w3-m2', NOW);
    const correct = structuredClone(session.workspace);
    correct.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
    session = updateWorkspaceDraft(session, correct, NOW);
    const trace = compileCuilanBooleanDraft(correct);
    session = recordRun(session, runCuilanBooleanForDraft(correct, trace), trace, NOW);
    let progress = createInitialProgress(); progress.sessions['w3-m2'] = session;
    progress = completeMission(progress, 'w3-m2', { stars: 3, hintsUsed: 0 });
    expect(progress.missionCompletionEvidence['w3-m2']?.kind).toBe('formal-v3');
    expect(isMissionUnlocked(progress, 'w3-m3')).toBe(true);
  });
});
