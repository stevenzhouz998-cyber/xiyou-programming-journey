import * as Blockly from 'blockly';
import { describe, expect, it } from 'vitest';
import { runFourSeasRegalia } from '../battle/fourSeasRegalia';
import {
  completeMission,
  createInitialProgress,
  getWeeklyReport,
  importProgress,
  isMissionUnlocked,
  serializeProgress,
} from './progress';
import { runRuyiStaffBattle } from '../battle/ruyiStaff';
import type { RuyiStaffInstruction } from '../battle/types';
import { registerFourSeasRegaliaBlocks } from '../blockly/fourSeasRegaliaBlocks';
import { compileFourSeasRegaliaWorkspace } from '../blockly/fourSeasRegaliaCompiler';
import { loadFourSeasWorkspaceDraft, type FourSeasWorkspaceDraftV1 } from '../blockly/fourSeasRegaliaDraft';
import { createMissionSession, recordConditionObservationUse, recordRun, updateWorkspaceDraft } from './session';
import { recordEquipmentEffectUse } from './equipmentEffectSession';
import { equipItem } from './equipmentOperations';
import {
  compileManorHelpDraft,
  createDefaultManorHelpDraft,
  runManorHelp,
} from '../blockly/weekThreeManorHelpContract';
import { compileCuilanBooleanDraft, runCuilanBooleanForDraft } from '../blockly/weekThreeCuilanBooleanContract';
import { compileYunzhanDialogueDraft, runYunzhanDialogueForDraft } from '../blockly/weekThreeYunzhanDialogueContract';

const NOW = '2026-07-15T06:00:00.000Z';
const wrongWeaponTrace: RuyiStaffInstruction[] = [
  { instructionId: 'instruction:inspect', sourceBlockId: 'inspect', opcode: 'inspect_weights' },
  { instructionId: 'instruction:sabre', sourceBlockId: 'sabre', opcode: 'choose_sabre' },
];

function recordedFourSeasSession() {
  const draft: FourSeasWorkspaceDraftV1 = {
    version: 1,
    blocks: [
      { id: 'request', type: 'xiyou_request_regalia', nextId: 'collect', parentBlockId: null, x: 0, y: 0 },
      { id: 'collect', type: 'xiyou_collect_gifts', nextId: 'equip', parentBlockId: null, x: 10, y: 10 },
      { id: 'boots-gift', type: 'xiyou_receive_cloud_boots', nextId: 'armor-gift', parentBlockId: 'collect', x: 20, y: 20 },
      { id: 'armor-gift', type: 'xiyou_receive_golden_armor', nextId: 'crown-gift', parentBlockId: 'collect', x: 30, y: 30 },
      { id: 'crown-gift', type: 'xiyou_receive_purple_crown', nextId: null, parentBlockId: 'collect', x: 40, y: 40 },
      { id: 'equip', type: 'xiyou_equip_regalia', nextId: 'verify', parentBlockId: null, x: 50, y: 50 },
      { id: 'crown-wear', type: 'xiyou_wear_crown', nextId: 'armor-wear', parentBlockId: 'equip', x: 60, y: 60 },
      { id: 'armor-wear', type: 'xiyou_wear_armor', nextId: 'boots-wear', parentBlockId: 'equip', x: 70, y: 70 },
      { id: 'boots-wear', type: 'xiyou_wear_boots', nextId: null, parentBlockId: 'equip', x: 80, y: 80 },
      { id: 'verify', type: 'xiyou_verify_regalia', nextId: null, parentBlockId: null, x: 90, y: 90 },
    ],
  };
  registerFourSeasRegaliaBlocks();
  const workspace = new Blockly.Workspace();
  try {
    loadFourSeasWorkspaceDraft(workspace, draft);
    const compiled = compileFourSeasRegaliaWorkspace(workspace);
    if (!compiled.ok) throw new Error('expected w1-m3 fixture to compile');
    const initial = updateWorkspaceDraft(createMissionSession('w1-m3', NOW), draft, NOW);
    return recordRun(initial, runFourSeasRegalia(compiled.trace), compiled.trace, NOW);
  } finally {
    workspace.dispose();
  }
}

function successfulManorHelpSession() {
  const draft = createDefaultManorHelpDraft();
  draft.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help';
  const trace = compileManorHelpDraft(draft);
  return recordRun(
    updateWorkspaceDraft(createMissionSession('w3-m1', NOW), draft, NOW),
    runManorHelp(trace),
    trace,
    NOW,
  );
}

describe('progress rules', () => {
  it('rejects W3-M1 completion until the current saved workspace has a canonical two-scenario success', () => {
    expect(() => completeMission(createInitialProgress(), 'w3-m1', { stars: 3, hintsUsed: 0 }))
      .toThrow(/W3-M1.*运行证据/);

    const failed = createInitialProgress();
    failed.sessions['w3-m1'] = recordRun(
      createMissionSession('w3-m1', NOW),
      runManorHelp(compileManorHelpDraft(createDefaultManorHelpDraft())),
      compileManorHelpDraft(createDefaultManorHelpDraft()),
      NOW,
    );
    expect(() => completeMission(failed, 'w3-m1', { stars: 3, hintsUsed: 0 }))
      .toThrow(/W3-M1.*运行证据/);
  });

  it('publishes W3-M1 completion and its formal workspace replay proof atomically', () => {
    const progress = createInitialProgress();
    progress.sessions['w3-m1'] = successfulManorHelpSession();

    const completed = completeMission(progress, 'w3-m1', { stars: 3, hintsUsed: 0 });
    const evidence = (completed as any).missionCompletionEvidence['w3-m1'];
    expect(evidence).toMatchObject({
      kind: 'formal-v3',
      completedAt: completed.missions['w3-m1'].completedAt,
      workspace: progress.sessions['w3-m1'].workspace,
      trace: progress.sessions['w3-m1'].lastTrace,
      run: { completed: true, diagnostic: null, failureSnapshot: null, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } },
    });
    expect(importProgress(serializeProgress(completed))).toEqual(completed);
  });

  it('preserves formal W3-M1 proof through a later failed workspace edit and idempotent repeat', () => {
    const progress = createInitialProgress();
    progress.sessions['w3-m1'] = successfulManorHelpSession();
    const completed = completeMission(progress, 'w3-m1', { stars: 2, hintsUsed: 0 });
    const formal = structuredClone((completed as any).missionCompletionEvidence['w3-m1']);
    const edited = {
      ...completed,
      sessions: {
        ...completed.sessions,
        'w3-m1': recordRun(
          updateWorkspaceDraft(completed.sessions['w3-m1']!, createDefaultManorHelpDraft(), '2026-08-26T00:01:00.000Z'),
          runManorHelp(compileManorHelpDraft(createDefaultManorHelpDraft())),
          compileManorHelpDraft(createDefaultManorHelpDraft()),
          '2026-08-26T00:01:00.000Z',
        ),
      },
    };

    expect(importProgress(serializeProgress(edited)).missionCompletionEvidence['w3-m1']).toEqual(formal);
    expect((completeMission(edited, 'w3-m1', { stars: 1, hintsUsed: 3 }) as any).missionCompletionEvidence['w3-m1'])
      .toEqual(formal);
  });

  it('upgrades legacy W3-M1 history only when a current formal replay exists', () => {
    const progress = createInitialProgress();
    progress.missions['w3-m1'] = { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW };
    (progress as any).missionCompletionEvidence = {
      'w3-m1': { kind: 'legacy-preformal', completedAt: NOW, sourceVersion: 3, sourceSchemaRevision: 2 },
    };
    expect((completeMission(progress, 'w3-m1', { stars: 1, hintsUsed: 0 }) as any).missionCompletionEvidence['w3-m1'])
      .toMatchObject({ kind: 'legacy-preformal' });

    progress.sessions['w3-m1'] = successfulManorHelpSession();
    const upgraded = completeMission(progress, 'w3-m1', { stars: 1, hintsUsed: 0 });
    expect((upgraded as any).missionCompletionEvidence['w3-m1']).toMatchObject({
      kind: 'formal-v3', completedAt: NOW,
    });
  });

  it('reports W3 runs and support without treating condition observation as a hint or adjustment', () => {
    const draft = createDefaultManorHelpDraft();
    const trace = compileManorHelpDraft(draft);
    let session = recordRun(
      updateWorkspaceDraft(createMissionSession('w3-m1', NOW), draft, NOW),
      runManorHelp(trace),
      trace,
      NOW,
    );
    session = recordConditionObservationUse(session, session.failureSnapshot!.snapshotId, '2026-08-26T00:01:00.000Z');
    session = recordRun(session, runManorHelp(trace), trace, '2026-08-26T00:02:00.000Z');
    const progress = createInitialProgress();
    progress.sessions['w3-m1'] = session;

    expect(getWeeklyReport(progress, 3)).toMatchObject({
      completed: 0,
      sessionRuns: 2,
      sessionAdjustments: 2,
      hintsUsed: 0,
      needsSupport: ['真假条件与分支'],
    });
  });
  it('includes W3-M2 boolean runs, failures, and support in the weekly report', () => {
    const draft = createMissionSession('w3-m2', NOW).workspace;
    const trace = compileCuilanBooleanDraft(draft);
    let session = recordRun(createMissionSession('w3-m2', NOW), runCuilanBooleanForDraft(draft, trace), trace, NOW);
    session = recordRun(session, runCuilanBooleanForDraft(draft, trace), trace, '2026-08-26T00:02:00.000Z');
    const progress = createInitialProgress(); progress.sessions['w3-m2'] = session;
    expect(getWeeklyReport(progress, 3)).toMatchObject({ sessionRuns: 2, sessionAdjustments: 2, needsSupport: ['布尔判断与分支'] });
  });
  it('fails closed when weekly stars or hints overflow the safe integer range', () => {
    const progress = createInitialProgress();
    progress.missions['w1-m1'] = {
      status: 'completed',
      stars: Number.MAX_SAFE_INTEGER as never,
      attempts: 1,
      hintsUsed: Number.MAX_SAFE_INTEGER,
      completedAt: NOW,
    };
    progress.missions['w1-m2'] = {
      status: 'completed',
      stars: 1,
      attempts: 1,
      hintsUsed: 1,
      completedAt: NOW,
    };
    expect(() => getWeeklyReport(progress, 1)).toThrow('任务进度计数超出安全范围');

    progress.missions['w1-m1'].stars = 1;
    expect(() => getWeeklyReport(progress, 1)).toThrow('任务进度计数超出安全范围');
  });
  it('persists completed w1-m3 and unlocks w1-m4 across export-import without replay attempts', () => {
    let progress = createInitialProgress();
    progress = completeMission(progress, 'w1-m1', { stars: 2, hintsUsed: 0 });
    progress = completeMission(progress, 'w1-m2', { stars: 2, hintsUsed: 0 });
    progress = { ...progress, sessions: { ...progress.sessions, 'w1-m3': recordedFourSeasSession() } };
    expect(progress.missions['w1-m3']).toBeUndefined();
    progress = completeMission(progress, 'w1-m3', { stars: 3, hintsUsed: 1 });

    const reopened = importProgress(serializeProgress(progress));
    expect(reopened.sessions['w1-m3']).toEqual(progress.sessions['w1-m3']);
    expect(reopened.missions['w1-m3']).toMatchObject({ attempts: 1, hintsUsed: 1 });
    expect(isMissionUnlocked(reopened, 'w1-m4')).toBe(true);

    const replaySaved = { ...reopened, sessions: { ...reopened.sessions, 'w1-m3': recordedFourSeasSession() } };
    expect(replaySaved.missions['w1-m3']).toEqual(reopened.missions['w1-m3']);
  });

  it('publishes mission completion and its equipment rewards in the same progress document exactly once', () => {
    let progress = createInitialProgress();
    progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress = completeMission(progress, 'w1-m2', { stars: 3, hintsUsed: 0 });
    expect(progress.equipment.inventory['ruyi-staff']).toEqual({
      grantedBy: 'w1-m2',
      grantedAt: progress.missions['w1-m2'].completedAt,
    });

    const firstStaffGrant = structuredClone(progress.equipment.inventory['ruyi-staff']);
    progress = completeMission(progress, 'w1-m2', { stars: 1, hintsUsed: 2 });
    expect(progress.equipment.inventory['ruyi-staff']).toEqual(firstStaffGrant);

    progress = completeMission(progress, 'w1-m3', { stars: 3, hintsUsed: 0 });
    expect(Object.keys(progress.equipment.inventory)).toEqual([
      'ruyi-staff', 'phoenix-crown', 'golden-chain-armor', 'cloud-walking-boots',
    ]);
    expect(progress.equipment.inventory['phoenix-crown']?.grantedAt)
      .toBe(progress.missions['w1-m3'].completedAt);
  });

  it('aggregates all three week-one sessions and maps repeated w1-m3 failures to task decomposition', () => {
    const progress = createInitialProgress();
    progress.sessions['w1-m1'] = {
      ...createMissionSession('w1-m1', NOW),
      totalRuns: 2,
      compileFailures: 1,
    };
    progress.sessions['w1-m2'] = {
      ...createMissionSession('w1-m2', NOW),
      totalRuns: 3,
      runtimeFailures: 2,
    };
    progress.sessions['w1-m3'] = {
      ...recordedFourSeasSession(),
      totalRuns: 4,
      runtimeFailures: 3,
      compileFailures: 2,
      conceptFailures: { programStructure: 2, sequencePrecondition: 2, completeness: 2 },
    };

    expect(getWeeklyReport(progress, 1)).toMatchObject({
      sessionRuns: 9,
      sessionAdjustments: 8,
      needsSupport: ['任务分解'],
    });
  });
  it('keeps advanced m4/m5 session evidence through parent export-import and counts their support in week one', () => {
    let progress = createInitialProgress();
    for (let order = 1; order <= 5; order += 1) progress = completeMission(progress, `w1-m${order}`, { stars: 3, hintsUsed: 0 });
    progress.sessions['w1-m4'] = createMissionSession('w1-m4', NOW);
    progress.sessions['w1-m4'] = recordEquipmentEffectUse(progress.sessions['w1-m4'], 'decomposition-view', NOW);
    progress.sessions['w1-m5'] = recordEquipmentEffectUse(createMissionSession('w1-m5', NOW), 'weight-reference', NOW);
    progress.equipment = equipItem(progress.equipment, 'weapon', 'ruyi-staff');
    progress.equipment = equipItem(progress.equipment, 'head', 'phoenix-crown');
    const reopened = importProgress(serializeProgress(progress));
    expect(reopened.sessions['w1-m4']?.workspace.missionId).toBe('w1-m4');
    expect(reopened.sessions['w1-m5']?.workspace.missionId).toBe('w1-m5');
    expect(reopened.sessions['w1-m4']?.equipmentEffectsUsed).toEqual(['decomposition-view']);
    expect(reopened.sessions['w1-m5']?.equipmentEffectsUsed).toEqual(['weight-reference']);
    expect(reopened.equipment).toEqual(progress.equipment);
    expect(getWeeklyReport(reopened, 1)).toMatchObject({ completed: 5, total: 5, sessionRuns: 0, sessionAdjustments: 0 });
  });
  it('unlocks missions in order and requires the boss before the next week', () => {
    let progress = createInitialProgress();
    expect(isMissionUnlocked(progress, 'w1-m1')).toBe(true);
    expect(isMissionUnlocked(progress, 'w1-m2')).toBe(false);

    for (let order = 1; order <= 4; order += 1) {
      progress = completeMission(progress, `w1-m${order}`, { stars: 2, hintsUsed: 1 });
    }
    expect(isMissionUnlocked(progress, 'w1-m5')).toBe(true);
    expect(isMissionUnlocked(progress, 'w2-m1')).toBe(false);

    progress = completeMission(progress, 'w1-m5', { stars: 3, hintsUsed: 0 });
    expect(isMissionUnlocked(progress, 'w2-m1')).toBe(true);
  });

  it('keeps W3-M3 unlocked for migrated W3-M2 legacy completion while requiring proof for new progress', () => {
    const legacy = createInitialProgress();
    legacy.missions['w3-m2'] = { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW };
    legacy.missionCompletionEvidence['w3-m2'] = { kind: 'legacy-preformal', completedAt: NOW, sourceVersion: 3, sourceSchemaRevision: 3 };
    expect(isMissionUnlocked(legacy, 'w3-m3')).toBe(true);

    const newPlayer = createInitialProgress();
    newPlayer.missions['w3-m2'] = { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW };
    expect(isMissionUnlocked(newPlayer, 'w3-m3')).toBe(false);
    newPlayer.missionCompletionEvidence['w3-m2'] = { kind: 'formal-v3', completedAt: NOW, verifiedAt: NOW, workspace: createMissionSession('w3-m2', NOW).workspace, trace: [], run: null } as any;
    expect(isMissionUnlocked(newPlayer, 'w3-m3')).toBe(true);
  });

  it('keeps the best star score while making repeated completion counters idempotent', () => {
    let progress = createInitialProgress();
    progress = {
      ...progress,
      privacy: { localDataNoticeSeen: true },
      recovery: { lastRecoveredAt: '2026-07-12T00:00:00.000Z', source: 'snapshot' },
    };
    progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 });
    progress = completeMission(progress, 'w1-m1', { stars: 1, hintsUsed: 2 });

    expect(progress.missions['w1-m1']).toMatchObject({ stars: 3, attempts: 1, hintsUsed: 0, status: 'completed' });
    expect(progress).toMatchObject({
      version: 3,
      schemaRevision: 6,
      sessions: {},
      privacy: { localDataNoticeSeen: true },
      recovery: { lastRecoveredAt: '2026-07-12T00:00:00.000Z', source: 'snapshot' },
    });
  });

  it('publishes the derived condition-observation ability with w2 completion and keeps it idempotent', () => {
    let progress = createInitialProgress();
    expect(progress).toMatchObject({
      schemaRevision: 6,
      abilities: { conditionObservation: { acquiredAt: null, stableUnlockedAt: null } },
    });

    progress = completeMission(progress, 'w2-m4', { stars: 3, hintsUsed: 0 });
    const acquiredAt = progress.missions['w2-m4'].completedAt;
    expect(progress.abilities.conditionObservation).toEqual({ acquiredAt, stableUnlockedAt: null });

    progress = completeMission(progress, 'w2-m5', { stars: 3, hintsUsed: 0 });
    const stableUnlockedAt = progress.missions['w2-m5'].completedAt;
    expect(progress.abilities.conditionObservation).toEqual({ acquiredAt, stableUnlockedAt });

    const repeated = completeMission(progress, 'w2-m5', { stars: 1, hintsUsed: 2 });
    expect(repeated.abilities.conditionObservation).toEqual({ acquiredAt, stableUnlockedAt });
    expect(importProgress(serializeProgress(repeated)).abilities.conditionObservation)
      .toEqual({ acquiredAt, stableUnlockedAt });
  });

  it('preserves the first completion counters and timestamp across a repeated success', () => {
    const first = completeMission(createInitialProgress(), 'w1-m1', { stars: 1, hintsUsed: 2 });
    const firstRecord = structuredClone(first.missions['w1-m1']);
    const repeated = completeMission(first, 'w1-m1', { stars: 3, hintsUsed: 2 });

    expect(repeated.missions['w1-m1']).toEqual({
      ...firstRecord,
      stars: 3,
      attempts: 1,
      hintsUsed: 2,
    });
  });

  it('normalizes completion input so the returned V3 remains schema-valid', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: Number.NaN, hintsUsed: 1.5 });
    expect(() => importProgress(serializeProgress(progress))).not.toThrow();
  });

  it('rejects an unknown mission id', () => {
    expect(() => completeMission(createInitialProgress(), 'unknown-mission', { stars: 2, hintsUsed: 0 }))
      .toThrow('任务编号无效');
  });

  it('rejects attempts overflow instead of returning an invalid V3', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 0 });
    progress.missions['w1-m1'].attempts = Number.MAX_SAFE_INTEGER;
    expect(() => completeMission(progress, 'w1-m1', { stars: 2, hintsUsed: 0 }))
      .toThrow('任务进度计数超出安全范围');
  });

  it('rejects hints overflow instead of returning an invalid V3', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 0 });
    progress.missions['w1-m1'].hintsUsed = Number.MAX_SAFE_INTEGER;
    expect(() => completeMission(progress, 'w1-m1', { stars: 2, hintsUsed: 1 }))
      .toThrow('任务进度计数超出安全范围');
  });

  it('builds a parent report from local progress', () => {
    let progress = createInitialProgress();
    progress = completeMission(progress, 'w1-m1', { stars: 2, hintsUsed: 2 });
    progress = completeMission(progress, 'w1-m2', { stars: 3, hintsUsed: 0 });

    expect(getWeeklyReport(progress, 1)).toMatchObject({ completed: 2, total: 5, stars: 5, hintsUsed: 2 });
  });

  it('merges the first real mission session support into the week-one parent report', () => {
    const progress = createInitialProgress();
    progress.sessions['w1-m1'] = {
      ...createMissionSession('2026-07-15T06:00:00.000Z'),
      totalRuns: 3,
      runtimeFailures: 1,
      compileFailures: 1,
      conceptFailures: { programStructure: 2, sequencePrecondition: 0, completeness: 0 },
    };

    expect(getWeeklyReport(progress, 1)).toMatchObject({
      needsSupport: ['程序结构'],
    });
    expect(getWeeklyReport(progress, 2).needsSupport).toEqual([]);
  });

  it('aggregates both implemented week-one sessions and preserves mission-specific support wording', () => {
    const progress = createInitialProgress();
    progress.sessions['w1-m1'] = {
      ...createMissionSession('w1-m1', NOW),
      totalRuns: 3,
      runtimeFailures: 2,
      compileFailures: 1,
      conceptFailures: { programStructure: 0, sequencePrecondition: 2, completeness: 0 },
    };
    let ruyi = createMissionSession('w1-m2', NOW);
    ruyi = recordRun(ruyi, runRuyiStaffBattle(wrongWeaponTrace), wrongWeaponTrace, NOW);
    ruyi = recordRun(ruyi, runRuyiStaffBattle(wrongWeaponTrace), wrongWeaponTrace, NOW);
    progress.sessions['w1-m2'] = ruyi;

    expect(getWeeklyReport(progress, 1)).toMatchObject({
      sessionRuns: 5,
      sessionAdjustments: 5,
      needsSupport: ['顺序与前置条件', '数值比较'],
    });
    expect(getWeeklyReport(progress, 2)).toMatchObject({ sessionRuns: 0, sessionAdjustments: 0 });
  });

  it('fails closed when weekly session run aggregation exceeds the safe integer range', () => {
    const progress = createInitialProgress();
    progress.sessions['w1-m1'] = {
      ...createMissionSession('w1-m1', NOW),
      totalRuns: Number.MAX_SAFE_INTEGER,
    };
    progress.sessions['w1-m2'] = {
      ...createMissionSession('w1-m2', NOW),
    };

    expect(getWeeklyReport(progress, 1).sessionRuns).toBe(Number.MAX_SAFE_INTEGER);
    progress.sessions['w1-m2'].totalRuns = 1;
    expect(() => getWeeklyReport(progress, 1)).toThrow('任务进度计数超出安全范围');
  });

  it('fails closed when weekly session adjustment aggregation exceeds the safe integer range', () => {
    const progress = createInitialProgress();
    progress.sessions['w1-m1'] = {
      ...createMissionSession('w1-m1', NOW),
      compileFailures: Number.MAX_SAFE_INTEGER,
    };
    progress.sessions['w1-m2'] = {
      ...createMissionSession('w1-m2', NOW),
    };

    expect(getWeeklyReport(progress, 1).sessionAdjustments).toBe(Number.MAX_SAFE_INTEGER);
    progress.sessions['w1-m2'].runtimeFailures = 1;
    expect(() => getWeeklyReport(progress, 1)).toThrow('任务进度计数超出安全范围');
  });

  it('persists exact w1-m2 session evidence, unlocks w1-m3 only on completion, and does not count replay as an attempt', () => {
    let progress = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 0 });
    const session = recordRun(
      createMissionSession('w1-m2', NOW),
      runRuyiStaffBattle(wrongWeaponTrace),
      wrongWeaponTrace,
      NOW,
    );
    progress = { ...progress, sessions: { ...progress.sessions, 'w1-m2': session } };

    expect(progress.missions['w1-m2']).toBeUndefined();
    expect(isMissionUnlocked(progress, 'w1-m3')).toBe(false);
    const roundTripped = importProgress(serializeProgress(progress));
    expect(roundTripped.sessions['w1-m2']).toEqual(session);

    const completed = completeMission(roundTripped, 'w1-m2', { stars: 3, hintsUsed: 1 });
    expect(completed.missions['w1-m2']).toMatchObject({ attempts: 1 });
    expect(completed.sessions['w1-m2']).toEqual(session);
    expect(isMissionUnlocked(completed, 'w1-m3')).toBe(true);
  });

  it('round-trips valid exports and rejects corrupted data', () => {
    const progress = completeMission(createInitialProgress(), 'w1-m1', { stars: 2, hintsUsed: 1 });
    expect(importProgress(serializeProgress(progress))).toEqual(progress);
    expect(() => importProgress('{broken')).toThrow('进度文件无法读取');
    expect(() => importProgress('{"version":999}')).toThrow('进度版本不受支持');
  });

  it('includes W3-M3 failed dialogue runs in week-three support without treating observation as a hint or adjustment', () => {
    let session = createMissionSession('w3-m3', NOW);
    const trace = compileYunzhanDialogueDraft(session.workspace);
    const run = runYunzhanDialogueForDraft(session.workspace, trace);
    session = recordRun(session, run, trace, NOW);
    session = recordRun(session, run, trace, NOW);
    const progress = createInitialProgress();
    progress.sessions['w3-m3'] = session;
    expect(getWeeklyReport(progress, 3)).toMatchObject({ sessionRuns: 2, sessionAdjustments: 2, needsSupport: ['双轮条件分支'] });
    progress.sessions['w3-m3'] = recordConditionObservationUse(session, session.failureSnapshot!.snapshotId, '2026-08-27T00:00:01.000Z');
    const afterObservation = getWeeklyReport(progress, 3);
    expect(afterObservation.sessionAdjustments).toBe(2);
    expect(progress.sessions['w3-m3'].usedHintTiers).toEqual([]);
  });

});
