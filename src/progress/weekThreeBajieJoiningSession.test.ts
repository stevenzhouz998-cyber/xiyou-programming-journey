import { describe, expect, it } from 'vitest';
import {
  compileBajieJoiningDraft,
  runBajieJoiningForDraft,
} from '../blockly/weekThreeBajieJoiningContract';
import { compileYunzhanDialogueDraft, runYunzhanDialogueForDraft } from '../blockly/weekThreeYunzhanDialogueContract';
import { compileCuilanBooleanDraft, runCuilanBooleanForDraft } from '../blockly/weekThreeCuilanBooleanContract';
import { completeMission, createInitialProgress, getWeeklyReport, isMissionUnlocked, serializeProgress } from './progress';
import { isExecutableMissionId } from './executableMissionIds';
import { migrateProgress } from './schema';
import { createMissionSession, recordConditionObservationUse, recordRun, updateWorkspaceDraft } from './session';
import { parseBajieJoiningSession, parseBajieJoiningWorkspace, sameBajieJoiningData } from './bajieJoiningSessionSchema';
import { runWeekThreeBossDraft } from '../blockly/weekThreeBossContract';
import { createSolvedWeekThreeBossDraftForTest } from '../blockly/weekThreeBossTestHelpers';

const NOW = '2020-01-01T00:00:00.000Z';
const LATER = '2020-01-01T00:00:01.000Z';

function oldV3(schemaRevision: 3 | 4 | 5) {
  const { works: _works, ...legacy } = createInitialProgress();
  return { ...legacy, schemaRevision };
}

function formalM3(progress = createInitialProgress()) {
  const cuilan = createMissionSession('w3-m2', NOW);
  const cuilanDraft = structuredClone(cuilan.workspace);
  cuilanDraft.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
  const cuilanTrace = compileCuilanBooleanDraft(cuilanDraft);
  progress.sessions['w3-m2'] = recordRun(updateWorkspaceDraft(cuilan, cuilanDraft, NOW), runCuilanBooleanForDraft(cuilanDraft, cuilanTrace), cuilanTrace, NOW);
  progress = completeMission(progress, 'w3-m2', { stars: 3, hintsUsed: 0 });
  const session = createMissionSession('w3-m3', NOW);
  const draft = structuredClone(session.workspace);
  draft.blocks.find((block) => block.id === 'yunzhan-condition')!.type = 'w3_yunzhan_condition_pilgrimage_explicit';
  draft.blocks.find((block) => block.id === 'yunzhan-then-action')!.type = 'w3_yunzhan_explain_guanyin_origin';
  draft.blocks.find((block) => block.id === 'yunzhan-else-action')!.type = 'w3_yunzhan_guard_cave';
  const trace = compileYunzhanDialogueDraft(draft);
  progress.sessions['w3-m3'] = recordRun(updateWorkspaceDraft(session, draft, NOW), runYunzhanDialogueForDraft(draft, trace), trace, NOW);
  return completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 });
}

function successfulBajieSession() {
  let session = createMissionSession('w3-m4', NOW);
  const draft = structuredClone(session.workspace);
  draft.blocks.find((block) => block.type === 'w3_bajie_boolean_operation')!.operator = 'and';
  const trace = compileBajieJoiningDraft(draft);
  session = recordRun(updateWorkspaceDraft(session, draft, NOW), runBajieJoiningForDraft(draft, trace), trace, NOW);
  return session;
}

describe('W3-M4 八戒归队 Progress V3', () => {
  it('migrates revision 5 to 6 and isolates old W3-M4 completion as legacy without opening W3-M5', () => {
    const legacy = oldV3(5);
    legacy.missions['w3-m4'] = { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: NOW };
    const migrated = migrateProgress(legacy);
    expect(migrated.schemaRevision).toBe(8);
    expect((migrated as any).missionCompletionEvidence['w3-m4']).toMatchObject({ kind: 'legacy-preformal', completedAt: NOW });
    expect(isMissionUnlocked(migrated, 'w3-m5')).toBe(false);
  });

  it('keeps W3-M5 replay access only when its own historical completion already exists', () => {
    const legacy = oldV3(5);
    legacy.missions['w3-m4'] = { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: NOW };
    legacy.missions['w3-m5'] = { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: LATER };
    expect(isMissionUnlocked(migrateProgress(legacy), 'w3-m5')).toBe(true);
  });

  it('migrates V1, V2, and old V3 W3-M4 records with their real legacy provenance', () => {
    const mission = { status: 'completed' as const, stars: 1 as const, attempts: 1, hintsUsed: 0, completedAt: NOW };
    const v1 = migrateProgress({ version: 1, learnerName: '旧档', missions: { 'w3-m4': mission }, settings: { muted: false, reducedMotion: false, parentPin: 'unset' }, savedAt: NOW });
    expect(v1.missionCompletionEvidence['w3-m4']).toMatchObject({ sourceVersion: 1, sourceSchemaRevision: null });
    const v2 = migrateProgress({ version: 2, schemaRevision: 1, learnerName: '旧档', missions: { 'w3-m4': mission, 'w3-m5': mission }, settings: { muted: false, reducedMotion: false, reducedMotionOverride: false, parentPin: 'unset' }, privacy: { localDataNoticeSeen: false }, recovery: { lastRecoveredAt: null, source: null }, savedAt: NOW });
    expect(v2.missionCompletionEvidence['w3-m4']).toMatchObject({ sourceVersion: 2, sourceSchemaRevision: 1 });
    expect(isMissionUnlocked(v2, 'w3-m5')).toBe(true);
    const v3 = oldV3(4); v3.missions['w3-m4'] = mission;
    const migratedV3 = migrateProgress(v3);
    expect(migratedV3.missionCompletionEvidence['w3-m4']).toMatchObject({ sourceVersion: 3, sourceSchemaRevision: 4 });
    const invalidMarker = structuredClone(migratedV3);
    const marker = invalidMarker.missionCompletionEvidence['w3-m4'];
    if (marker?.kind !== 'legacy-preformal') throw new Error('expected legacy marker');
    (marker as { sourceVersion: number; sourceSchemaRevision: number | null }).sourceVersion = 2;
    (marker as { sourceVersion: number; sourceSchemaRevision: number | null }).sourceSchemaRevision = 5;
    expect(() => migrateProgress(invalidMarker)).toThrow(/来源版本组合|旧证明/);
  });

  it('migrates W3-M5-only history into an independent replay marker', () => {
    const mission = { status: 'completed' as const, stars: 1 as const, attempts: 1, hintsUsed: 0, completedAt: NOW };
    const docs = [
      { version: 1, learnerName: '旧档', missions: { 'w3-m5': mission }, settings: { muted: false, reducedMotion: false, parentPin: 'unset' }, savedAt: NOW },
      { version: 2, schemaRevision: 1, learnerName: '旧档', missions: { 'w3-m5': mission }, settings: { muted: false, reducedMotion: false, reducedMotionOverride: false, parentPin: 'unset' }, privacy: { localDataNoticeSeen: false }, recovery: { lastRecoveredAt: null, source: null }, savedAt: NOW },
    ];
    for (const document of docs) {
      const migrated = migrateProgress(document);
      expect(migrated.missionCompletionEvidence['w3-m4']).toBeUndefined();
      expect(migrated.missionCompletionEvidence['w3-m5']?.kind).toBe('legacy-replay-only');
      expect(isMissionUnlocked(migrated, 'w3-m5')).toBe(true);
      expect(migrateProgress(structuredClone(migrated))).toEqual(migrated);
    }
    const oldV3Document = oldV3(3); oldV3Document.missions['w3-m5'] = mission;
    expect(migrateProgress(oldV3Document).missionCompletionEvidence['w3-m5']).toMatchObject({ kind: 'legacy-replay-only', sourceVersion: 3, sourceSchemaRevision: 6 });
  });

  it('requires a formal W3-M3 proof before entering W3-M4', () => {
    const bare = createInitialProgress();
    bare.missions['w3-m3'] = { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW };
    expect(isMissionUnlocked(bare, 'w3-m4')).toBe(false);
    (bare as any).missionCompletionEvidence['w3-m3'] = { kind: 'legacy-preformal', completedAt: NOW, sourceVersion: 3, sourceSchemaRevision: 4 };
    expect(isMissionUnlocked(bare, 'w3-m4')).toBe(false);
    expect(isMissionUnlocked(formalM3(), 'w3-m4')).toBe(true);
  });

  it('records only valid runtime failure, clears current proof after an edit, and deduplicates observation snapshots', () => {
    let session = createMissionSession('w3-m4', NOW);
    const trace = compileBajieJoiningDraft(session.workspace);
    session = recordRun(session, runBajieJoiningForDraft(session.workspace, trace), trace, NOW);
    expect(session).toMatchObject({ totalRuns: 1, runtimeFailures: 1, compileFailures: 0, failureSnapshot: { scenarioId: 'practice-precepts-only' } });
    const snapshotId = session.failureSnapshot?.snapshotId;
    expect(snapshotId).toBeDefined();
    const observed = recordConditionObservationUse(session, snapshotId!, LATER);
    expect(recordConditionObservationUse(observed, snapshotId!, LATER).conditionObservationUses).toHaveLength(1);
    const edited = updateWorkspaceDraft(observed, structuredClone(observed.workspace), LATER);
    expect(edited).toMatchObject({ totalRuns: 1, runtimeFailures: 1, lastTrace: [], lastRun: null, scenarioResults: [], failureSnapshot: null });
    const progress = createInitialProgress();
    progress.sessions['w3-m4'] = observed;
    expect(getWeeklyReport(progress, 3).bajieJoining).toEqual({ runs: 1, booleanCompositionFailures: 1, observations: 1, proof: 'none', completedAt: null });
  });

  it('creates formal proof solely from a current saved AND workspace and rejects forged completion evidence', () => {
    const progress = formalM3();
    progress.sessions['w3-m4'] = successfulBajieSession();
    const completed = completeMission(progress, 'w3-m4', { stars: 3, hintsUsed: 0 });
    const evidence = completed.missionCompletionEvidence['w3-m4'];
    expect(evidence?.kind).toBe('formal-v3');
    if (evidence?.kind !== 'formal-v3') throw new Error('expected formal W3-M4 evidence');
    const canonicalTrace = compileBajieJoiningDraft(evidence.workspace);
    const canonicalRun = runBajieJoiningForDraft(evidence.workspace, canonicalTrace);
    expect(sameBajieJoiningData(evidence.trace, canonicalTrace)).toBe(true);
    expect(sameBajieJoiningData(evidence.run, canonicalRun)).toBe(true);
    const parsedWorkspace = parseBajieJoiningWorkspace(evidence.workspace);
    expect(sameBajieJoiningData(compileBajieJoiningDraft(parsedWorkspace), canonicalTrace)).toBe(true);
    const savedSession = completed.sessions['w3-m4'];
    expect(sameBajieJoiningData(savedSession?.workspace, parsedWorkspace)).toBe(true);
    expect(sameBajieJoiningData(savedSession?.lastTrace, canonicalTrace)).toBe(true);
    expect(sameBajieJoiningData(savedSession?.lastRun, canonicalRun)).toBe(true);
    expect(savedSession?.lastRunAt! <= savedSession?.savedAt!).toBe(true);
    expect(savedSession?.savedAt! <= evidence.verifiedAt).toBe(true);
    expect(completed.missions['w3-m4']!.completedAt <= evidence.verifiedAt).toBe(true);
    expect(migrateProgress(structuredClone(completed))).toEqual(completed);
    expect(isMissionUnlocked(completed, 'w3-m5')).toBe(true);
    const forged = structuredClone(completed) as any;
    forged.missionCompletionEvidence['w3-m4'].trace[0].operator = 'or';
    expect(() => migrateProgress(forged)).toThrow(/W3-M4|workspace|重放|proof|证据/);
  });

  it('rejects a formal proof when the current saved W3-M4 session is a different graph', () => {
    const progress = formalM3();
    progress.sessions['w3-m4'] = successfulBajieSession();
    const completed = completeMission(progress, 'w3-m4', { stars: 3, hintsUsed: 0 });
    const wrong = successfulBajieSession();
    const changedWorkspace = structuredClone(wrong.workspace);
    changedWorkspace.blocks[0]!.x += 1;
    const wrongTrace = compileBajieJoiningDraft(changedWorkspace);
    completed.sessions['w3-m4'] = recordRun(updateWorkspaceDraft(wrong, changedWorkspace, NOW), runBajieJoiningForDraft(changedWorkspace, wrongTrace), wrongTrace, NOW);
    expect(() => migrateProgress(completed)).toThrow(/绑定当前完成session|当前workspace|W3-M4/);
  });

  it('round-trips a current W3-M5 completion after formal W3-M4 without inventing a legacy marker', () => {
    const progress = formalM3();
    progress.sessions['w3-m4'] = successfulBajieSession();
    const formalM4 = completeMission(progress, 'w3-m4', { stars: 3, hintsUsed: 0 });
    let boss = createMissionSession('w3-m5', NOW);
    const solved = createSolvedWeekThreeBossDraftForTest();
    boss = updateWorkspaceDraft(boss, solved, NOW);
    const bossRun = runWeekThreeBossDraft(solved);
    boss = recordRun(boss, bossRun, bossRun.trace, NOW);
    formalM4.sessions['w3-m5'] = boss;
    const completedM5 = completeMission(formalM4, 'w3-m5', { stars: 2, hintsUsed: 0 });
    expect(completedM5.missionCompletionEvidence['w3-m5']?.kind).toBe('formal-v3');
    expect(migrateProgress(JSON.parse(serializeProgress(completedM5)))).toEqual(completedM5);
    expect(isMissionUnlocked(completedM5, 'w3-m5')).toBe(true);
    expect(isExecutableMissionId('w3-m5')).toBe(true);
  });

  it('refuses W3-M5 formal completion until W3-M4 itself is completed with formal-v3 evidence', () => {
    const progress = formalM3();
    let boss = createMissionSession('w3-m5', NOW);
    const solved = createSolvedWeekThreeBossDraftForTest();
    boss = updateWorkspaceDraft(boss, solved, NOW);
    const run = runWeekThreeBossDraft(solved);
    progress.sessions['w3-m5'] = recordRun(boss, run, run.trace, NOW);
    expect(() => completeMission(progress, 'w3-m5', { stars: 3, hintsUsed: 0 })).toThrow(/W3-M4.*formal-v3|W3-M4.*正式/);
  });

  it('does not trust a bare current W3-M5 completion and bounds hostile session values', () => {
    const bare = createInitialProgress();
    bare.missions['w3-m5'] = { status: 'completed', stars: 1, attempts: 1, hintsUsed: 0, completedAt: NOW };
    expect(isMissionUnlocked(bare, 'w3-m5')).toBe(false);
    expect(() => migrateProgress(bare)).toThrow(/W3-M5|重玩标记|完成证明/);
    const huge = createMissionSession('w3-m4', NOW);
    huge.totalRuns = 1_000_001;
    expect(() => parseBajieJoiningSession(huge)).toThrow(/范围/);
    const sparse = createMissionSession('w3-m4', NOW);
    sparse.lastTrace = new Array(1);
    expect(() => parseBajieJoiningSession(sparse)).toThrow(/数组/);
  });

  it('fails closed for unknown revision and unknown W3-M4 session keys', () => {
    expect(() => migrateProgress({ ...createInitialProgress(), schemaRevision: 99 })).toThrow(/格式|schemaRevision/);
    const progress = createInitialProgress();
    const malformed = { ...createMissionSession('w3-m4', NOW), extra: true };
    progress.sessions['w3-m4'] = malformed as never;
    expect(() => migrateProgress(progress)).toThrow(/sessions\.w3-m4|未知|字段/);
  });
});
