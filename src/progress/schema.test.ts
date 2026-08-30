import * as Blockly from 'blockly';
import { describe, expect, it } from 'vitest';
import { runFourSeasRegalia } from '../battle/fourSeasRegalia';
import { runDragonPalaceBattle } from '../battle/dragonPalace';
import { runRuyiStaffBattle } from '../battle/ruyiStaff';
import { runAdvancedWeekOne } from '../battle/advancedWeekOne';
import type { RuyiStaffInstruction } from '../battle/types';
import { registerFourSeasRegaliaBlocks } from '../blockly/fourSeasRegaliaBlocks';
import { compileFourSeasRegaliaWorkspace } from '../blockly/fourSeasRegaliaCompiler';
import {
  loadFourSeasWorkspaceDraft,
  saveFourSeasWorkspaceDraft,
  FOUR_SEAS_WORKSPACE_LIMITS,
  type FourSeasWorkspaceDraftV1,
} from '../blockly/fourSeasRegaliaDraft';
import { completeMission, createInitialProgress } from './progress';
import { initialEquipment } from './equipment';
import { migrateProgress, parseProgress, PROGRESS_SCHEMA_LIMITS } from './schema';
import {
  createMissionSession,
  recordCompileFailure,
  recordConditionObservationUse,
  recordHint,
  recordRun,
  updateWorkspaceDraft,
} from './session';
import type {
  DragonPalaceMissionSession,
  FourSeasRegaliaMissionSession,
  ProgressV3,
  RuyiStaffMissionSession,
  AdvancedWeekOneMissionSession,
} from './types';
import { compileAdvancedWeekOneDraft, type AdvancedWeekOneWorkspaceDraftV1 } from '../blockly/advancedWeekOneDraft';
import {
  compileManorHelpDraft,
  createDefaultManorHelpDraft,
  runManorHelp,
} from '../blockly/weekThreeManorHelpContract';
import { compileCuilanBooleanDraft, runCuilanBooleanForDraft } from '../blockly/weekThreeCuilanBooleanContract';

const fourSeasDraft = (): FourSeasWorkspaceDraftV1 => ({
  version: 1,
  blocks: [
    { id: 'armor-gift', type: 'xiyou_receive_golden_armor', nextId: 'crown-gift', parentBlockId: 'collect', x: 31.5, y: 62.25 },
    { id: 'armor-wear', type: 'xiyou_wear_armor', nextId: 'boots-wear', parentBlockId: 'equip', x: 44.5, y: 78.25 },
    { id: 'boots-gift', type: 'xiyou_receive_cloud_boots', nextId: 'armor-gift', parentBlockId: 'collect', x: 21.5, y: 42.25 },
    { id: 'boots-wear', type: 'xiyou_wear_boots', nextId: null, parentBlockId: 'equip', x: 54.5, y: 98.25 },
    { id: 'collect', type: 'xiyou_collect_gifts', nextId: 'equip', parentBlockId: null, x: 10.5, y: 20.25 },
    { id: 'crown-gift', type: 'xiyou_receive_purple_crown', nextId: null, parentBlockId: 'collect', x: 41.5, y: 82.25 },
    { id: 'crown-wear', type: 'xiyou_wear_crown', nextId: 'armor-wear', parentBlockId: 'equip', x: 34.5, y: 58.25 },
    { id: 'equip', type: 'xiyou_equip_regalia', nextId: 'verify', parentBlockId: null, x: 20.5, y: 40.25 },
    { id: 'request', type: 'xiyou_request_regalia', nextId: 'collect', parentBlockId: null, x: -12.5, y: -3.25 },
    { id: 'verify', type: 'xiyou_verify_regalia', nextId: null, parentBlockId: null, x: 30.5, y: 60.25 },
  ],
});

function validFourSeasSession(
  draft: FourSeasWorkspaceDraftV1 = fourSeasDraft(),
): FourSeasRegaliaMissionSession {
  registerFourSeasRegaliaBlocks();
  const workspace = new Blockly.Workspace();
  try {
    loadFourSeasWorkspaceDraft(workspace, draft);
    const persistedDraft = saveFourSeasWorkspaceDraft(workspace);
    const compiled = compileFourSeasRegaliaWorkspace(workspace);
    if (!compiled.ok) throw new Error(`fixture did not compile: ${compiled.diagnostics[0]?.code}`);
    let session = updateWorkspaceDraft(createMissionSession('w1-m3', NOW), persistedDraft, NOW);
    session = recordCompileFailure(session, 'program-structure', NOW);
    session = recordCompileFailure(session, 'program-structure', NOW);
    session = recordRun(session, runFourSeasRegalia(compiled.trace), compiled.trace, NOW);
    session = recordHint(session, 'observe', NOW);
    return recordHint(session, 'think', NOW);
  } finally {
    workspace.dispose();
  }
}

const NOW = '2026-07-12T00:00:00.000Z';
const {
  maxRawJsonBytes: MAX_RAW_JSON_BYTES,
  maxWorkspaceBlocks: MAX_WORKSPACE_BLOCKS,
  maxTraceInstructions: MAX_TRACE_INSTRUCTIONS,
  maxBattleEvents: MAX_BATTLE_EVENTS,
  maxBlockOrSourceIdLength: MAX_BLOCK_OR_SOURCE_ID_LENGTH,
  maxInstructionIdLength: MAX_INSTRUCTION_ID_LENGTH,
} = PROGRESS_SCHEMA_LIMITS;

const validMission = {
  status: 'completed' as const,
  stars: 2 as const,
  attempts: 1,
  hintsUsed: 0,
  completedAt: NOW,
};

const validV1 = {
  version: 1 as const,
  learnerName: '小行者',
  missions: { 'w1-m1': validMission },
  settings: { muted: true, reducedMotion: true, parentPin: '4826' },
  savedAt: NOW,
};

const validV2 = {
  ...validV1,
  version: 2 as const,
  schemaRevision: 1 as const,
  settings: { ...validV1.settings, reducedMotionOverride: true },
  privacy: { localDataNoticeSeen: true },
  recovery: { lastRecoveredAt: NOW, source: 'snapshot' as const },
};

const trace = [
  { instructionId: 'instruction:block-a', sourceBlockId: 'block-a', opcode: 'enter_palace' as const },
  { instructionId: 'instruction:block-b', sourceBlockId: 'block-b', opcode: 'request_weapon' as const },
  { instructionId: 'instruction:block-c', sourceBlockId: 'block-c', opcode: 'test_weapon' as const },
];

const validSession = (): DragonPalaceMissionSession => ({
  workspace: {
    version: 1 as const,
    blocks: [
      { id: 'draft-a', type: 'xiyou_enter_palace' as const, nextId: 'draft-b', x: 10.5, y: -20.25 },
      { id: 'draft-b', type: 'xiyou_request_weapon' as const, nextId: null, x: Number.MAX_SAFE_INTEGER, y: 0 },
    ],
  },
  lastTrace: structuredClone(trace),
  lastRun: runDragonPalaceBattle(trace),
  totalRuns: 3,
  runtimeFailures: 1,
  compileFailures: 2,
  usedHintTiers: ['observe', 'partial'] as Array<'observe' | 'think' | 'partial'>,
  conceptFailures: { programStructure: 2, sequencePrecondition: 1, completeness: 0 },
  lastRunAt: NOW,
  savedAt: NOW,
});

type ValidV3 = Omit<ProgressV3, 'sessions'> & {
  sessions: { 'w1-m1': DragonPalaceMissionSession };
};

const validV3 = (): ValidV3 => ({
  ...validV2,
  version: 3 as const,
  schemaRevision: 7 as const,
  missions: structuredClone(validV2.missions),
  sessions: { 'w1-m1': validSession() },
  equipment: initialEquipment(),
  abilities: { conditionObservation: { acquiredAt: null, stableUnlockedAt: null } },
  missionCompletionEvidence: {},
});

const validV3Revision1 = () => {
  const { equipment: _equipment, abilities: _abilities, missionCompletionEvidence: _evidence, ...legacy } = validV3();
  return { ...legacy, schemaRevision: 1 as const };
};

const validV3Revision2 = () => {
  const { abilities: _abilities, missionCompletionEvidence: _evidence, ...legacy } = validV3();
  return { ...legacy, schemaRevision: 2 as const };
};

function formalManorHelpEvidence(completedAt = NOW) {
  const workspace = createDefaultManorHelpDraft();
  workspace.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help';
  const trace = compileManorHelpDraft(workspace);
  return {
    kind: 'formal-v3' as const,
    completedAt,
    verifiedAt: NOW,
    workspace,
    trace,
    run: runManorHelp(trace),
  };
}

const ruyiTrace: RuyiStaffInstruction[] = [
  { instructionId: 'instruction:inspect', sourceBlockId: 'inspect', opcode: 'inspect_weights' as const },
  { instructionId: 'instruction:choose', sourceBlockId: 'choose', opcode: 'choose_ruyi_staff' as const },
  { instructionId: 'instruction:shrink', sourceBlockId: 'shrink', opcode: 'shrink_ruyi_staff' as const },
];

const validRuyiSession = (): RuyiStaffMissionSession => ({
  workspace: {
    version: 1 as const,
    blocks: [
      { id: 'inspect', type: 'xiyou_inspect_weights' as const, nextId: 'choose', x: 10, y: 20 },
      { id: 'choose', type: 'xiyou_choose_ruyi_staff' as const, nextId: 'shrink', x: 10, y: 60 },
      { id: 'shrink', type: 'xiyou_shrink_ruyi_staff' as const, nextId: null, x: 10, y: 100 },
    ],
  },
  lastTrace: structuredClone(ruyiTrace),
  lastRun: runRuyiStaffBattle(ruyiTrace),
  totalRuns: 1,
  runtimeFailures: 0,
  compileFailures: 0,
  usedHintTiers: ['observe'] as Array<'observe' | 'think' | 'partial'>,
  conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
  lastRunAt: NOW,
  savedAt: NOW,
});

function validAdvancedSession(missionId: 'w1-m4' | 'w1-m5'): AdvancedWeekOneMissionSession {
  const blocks: Array<[string, AdvancedWeekOneWorkspaceDraftV1['blocks'][number]['type'], string | null, string | null]> = missionId === 'w1-m4' ? [
    ['open', 'xiyou_underworld_open_register', 'find', null], ['find', 'xiyou_underworld_find_monkey_records', 'handle', null],
    ['read', 'xiyou_underworld_read_index', 'match', 'find'], ['match', 'xiyou_underworld_match_monkey_kind', 'collect', 'find'],
    ['collect', 'xiyou_underworld_collect_named_records', null, 'find'], ['handle', 'xiyou_underworld_handle_names', 'verify', null], ['verify', 'xiyou_underworld_verify_register', null, null],
  ] : [
    ['plan', 'xiyou_boss_plan_third_chapter', 'dragon', null], ['dragon', 'xiyou_boss_dragon_checkpoint', 'regalia', null], ['enter', 'xiyou_boss_enter_palace', 'weights', 'dragon'], ['weights', 'xiyou_boss_compare_weights', 'staff', 'dragon'], ['staff', 'xiyou_boss_select_staff', null, 'dragon'],
    ['regalia', 'xiyou_boss_regalia_checkpoint', 'register', null], ['gifts', 'xiyou_boss_split_gifts', 'regalia-ok', 'regalia'], ['regalia-ok', 'xiyou_boss_verify_regalia', null, 'regalia'],
    ['register', 'xiyou_boss_register_checkpoint', 'verify', null], ['open', 'xiyou_boss_open_register', 'find', 'register'], ['find', 'xiyou_boss_find_monkey_records', 'handle', 'register'], ['handle', 'xiyou_boss_handle_names', null, 'register'], ['verify', 'xiyou_boss_verify_causal_chain', null, null],
  ];
  const draft: AdvancedWeekOneWorkspaceDraftV1 = { version: 1, missionId, blocks: blocks.map(([id, type, nextId, parentBlockId], index) => ({ id, type, nextId, parentBlockId, x: 0, y: index * 32 })) };
  const trace = compileAdvancedWeekOneDraft(draft);
  if (missionId === 'w1-m4') {
    return recordRun(updateWorkspaceDraft(createMissionSession('w1-m4', NOW), draft, NOW), runAdvancedWeekOne(missionId, trace), trace, NOW);
  }
  return recordRun(updateWorkspaceDraft(createMissionSession('w1-m5', NOW), draft, NOW), runAdvancedWeekOne(missionId, trace), trace, NOW);
}

describe('progress schema', () => {
  it('admits replayable observation lineage only when the derived fire-eye ability is acquired and stable', () => {
    const draft = createDefaultManorHelpDraft();
    const run = runManorHelp(compileManorHelpDraft(draft));
    const session = recordConditionObservationUse(
      recordRun(createMissionSession('w3-m1', NOW), run, compileManorHelpDraft(draft), NOW),
      run.failureSnapshot!.snapshotId,
      NOW,
    );
    const value = validV3() as unknown as ProgressV3;
    value.sessions = { 'w3-m1': session };
    value.missions = {
      'w2-m4': { ...validMission, completedAt: NOW },
      'w2-m5': { ...validMission, completedAt: NOW },
    };
    value.abilities = { conditionObservation: { acquiredAt: NOW, stableUnlockedAt: NOW } };
    expect(parseProgress(JSON.stringify(value))).toEqual(value);

    for (const [missions, abilities] of [
      [{}, { conditionObservation: { acquiredAt: null, stableUnlockedAt: null } }],
      [{ 'w2-m4': { ...validMission, completedAt: NOW } }, { conditionObservation: { acquiredAt: NOW, stableUnlockedAt: null } }],
    ] as const) {
      const forged = structuredClone(value);
      forged.missions = missions;
      forged.abilities = abilities;
      expect(() => parseProgress(JSON.stringify(forged))).toThrow(/abilities|火眼金睛/);
    }
  });

  it('requires exact current-revision W3-M1 completion evidence and replays its frozen formal proof', () => {
    const value = validV3() as any;
    value.missions['w3-m1'] = { ...validMission, completedAt: NOW };
    value.missionCompletionEvidence = { 'w3-m1': formalManorHelpEvidence() };
    expect(parseProgress(JSON.stringify(value))).toEqual(value);

    const mutations: Array<(candidate: any) => void> = [
      (candidate) => { candidate.missionCompletionEvidence['w3-m1'].workspace.blocks[0].id = 'forged'; },
      (candidate) => { candidate.missionCompletionEvidence['w3-m1'].trace[0].sourceBlockId = 'forged'; },
      (candidate) => { candidate.missionCompletionEvidence['w3-m1'].run.scenarioResults[1].passed = false; },
      (candidate) => { candidate.missionCompletionEvidence['w3-m1'].run.failureSnapshot = {}; },
      (candidate) => { candidate.missionCompletionEvidence['w3-m1'].run.completed = false; },
      (candidate) => { candidate.missionCompletionEvidence['w3-m1'].completedAt = '2026-08-26T00:00:01.000Z'; },
      (candidate) => { candidate.missionCompletionEvidence['w3-m1'].verifiedAt = 'not-an-iso-date'; },
    ];
    for (const mutate of mutations) {
      const forged = structuredClone(value);
      mutate(forged);
      expect(() => parseProgress(JSON.stringify(forged))).toThrow(/进度文件格式无效/);
    }

    const missingEvidence = structuredClone(value); delete missingEvidence.missionCompletionEvidence;
    expect(() => parseProgress(JSON.stringify(missingEvidence))).toThrow(/missionCompletionEvidence/);
    const evidenceWithoutMission = validV3() as any;
    evidenceWithoutMission.missionCompletionEvidence = { 'w3-m1': formalManorHelpEvidence() };
    expect(() => parseProgress(JSON.stringify(evidenceWithoutMission))).toThrow(/missionCompletionEvidence/);
    const unknownKey = structuredClone(value); unknownKey.missionCompletionEvidence.extra = {};
    expect(() => parseProgress(JSON.stringify(unknownKey))).toThrow(/未知字段/);
  });

  it('migrates all pre-formal W3-M1 completions to labelled legacy evidence without inventing formal proof', () => {
    const expected = (sourceVersion: 1 | 2 | 3, sourceSchemaRevision: null | 1 | 2) => ({
      kind: 'legacy-preformal', completedAt: NOW, sourceVersion, sourceSchemaRevision,
    });
    const v1 = { ...validV1, missions: { 'w3-m1': validMission } };
    const v2 = { ...validV2, missions: { 'w3-m1': validMission } };
    const v3r1 = validV3Revision1(); v3r1.missions = { 'w3-m1': validMission };
    const v3r2 = validV3Revision2(); v3r2.missions = { 'w3-m1': validMission };
    for (const [raw, marker] of [
      [v1, expected(1, null)], [v2, expected(2, 1)], [v3r1, expected(3, 1)], [v3r2, expected(3, 2)],
    ] as const) {
      const migrated = migrateProgress(raw);
      expect(migrated.missionCompletionEvidence['w3-m1']).toEqual(marker);
      expect(migrateProgress(JSON.parse(JSON.stringify(migrated))).missionCompletionEvidence['w3-m1']).toEqual(marker);
    }
  });
  it('migrates pre-formal W3-M2 completion to legacy evidence without inventing a formal proof', () => {
    const v3r2 = validV3Revision2();
    v3r2.missions = { 'w3-m2': validMission };
    const migrated = migrateProgress(v3r2);
    expect(migrated.missionCompletionEvidence['w3-m2']).toEqual({
      kind: 'legacy-preformal', completedAt: NOW, sourceVersion: 3, sourceSchemaRevision: 3,
    });
  });
  it('round-trips a real compiled w1-m3 nested draft, trace, canonical run, ids, parents, and counters', () => {
    const session = validFourSeasSession();
    const value = { ...validV3(), sessions: { 'w1-m3': session } };

    expect(parseProgress(JSON.stringify(value))).toEqual(value);
    expect(session.lastTrace.some((item) => item.parentBlockId === 'collect')).toBe(true);
    expect(session.lastRun?.events.some((item) => item.parentBlockId === 'equip')).toBe(true);
  });

  it('accepts a persistable wrong-container graph but keeps its canonical container-scope rejection', () => {
    const draft = fourSeasDraft();
    const gift = draft.blocks.find((block) => block.id === 'boots-gift')!;
    const wear = draft.blocks.find((block) => block.id === 'crown-wear')!;
    gift.type = 'xiyou_wear_crown';
    wear.type = 'xiyou_receive_cloud_boots';
    const session = validFourSeasSession(draft);
    expect(session.lastRun).toMatchObject({
      completed: false,
      diagnostic: { type: 'instruction-rejected', concept: 'container-scope' },
    });
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': session } })).not.toThrow();
  });

  const compilerImpossibleCases: Array<[
    string,
    (trace: FourSeasRegaliaMissionSession['lastTrace']) => void,
  ]> = [
    ['top opcode with a parent', (lastTrace) => { lastTrace[0].parentBlockId = 'collect'; }],
    ['child opcode without a parent', (lastTrace) => { lastTrace[2].parentBlockId = null; }],
    ['child referencing a later container', (lastTrace) => { lastTrace[2].parentBlockId = 'equip'; }],
    ['nested container opcode', (lastTrace) => { lastTrace[5].parentBlockId = 'collect'; }],
    ['child returning to a closed container scope', (lastTrace) => {
      const oldCollectChildren = lastTrace.splice(2, 3);
      lastTrace.push(...oldCollectChildren);
    }],
    ['empty collect container', (lastTrace) => { lastTrace.splice(2, 3); }],
    ['empty equip container', (lastTrace) => { lastTrace.splice(6, 3); }],
  ];
  const compilerImpossibleRunCases: Array<[
    string,
    (trace: FourSeasRegaliaMissionSession['lastTrace']) => void,
    'without a stored run' | 'with its canonical stored failure',
  ]> = compilerImpossibleCases.flatMap(([label, mutate]) => ([
    [label, mutate, 'without a stored run' as const],
    [label, mutate, 'with its canonical stored failure' as const],
  ]));

  it.each(compilerImpossibleRunCases)(
    'rejects compiler-impossible w1-m3 trace provenance: %s %s',
    (_label, mutate, runMode) => {
      const session = validFourSeasSession();
      mutate(session.lastTrace);
      if (runMode === 'without a stored run') {
        session.lastRun = null;
        session.lastRunAt = null;
        session.totalRuns = 0;
        session.runtimeFailures = 0;
        session.conceptFailures.sequencePrecondition = 0;
        session.conceptFailures.completeness = 0;
      } else {
        const canonical = runFourSeasRegalia(session.lastTrace);
        session.lastRun = canonical;
        session.lastRunAt = NOW;
        session.totalRuns = 1;
        session.runtimeFailures = canonical.completed ? 0 : 1;
        session.conceptFailures.sequencePrecondition = canonical.completed
          || canonical.diagnostic.type !== 'instruction-rejected' ? 0 : 1;
        session.conceptFailures.completeness = canonical.completed
          || canonical.diagnostic.type !== 'program-ended-incomplete' ? 0 : 1;
      }
      expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': session } }))
        .toThrow(/lastTrace.*(?:parentBlockId|容器|作用域|顺序)/);
    },
  );

  it('accepts w1-m3 evidence accumulated through the session API', () => {
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': validFourSeasSession() } }))
      .not.toThrow();
  });

  it('accepts a real multi-run w1-m3 session whose latest run succeeds after an earlier failure', () => {
    const fixture = validFourSeasSession();
    const rejectedTrace = [fixture.lastTrace.at(-1)!];
    let session = createMissionSession('w1-m3', NOW);
    session = recordRun(session, runFourSeasRegalia(rejectedTrace), rejectedTrace, NOW);
    session = recordRun(session, runFourSeasRegalia(fixture.lastTrace), fixture.lastTrace, NOW);
    expect(session).toMatchObject({ totalRuns: 2, runtimeFailures: 1, lastRun: { completed: true } });
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': session } }))
      .not.toThrow();
  });

  it.each([
    ['zero runs with stored run evidence', (session: FourSeasRegaliaMissionSession) => { session.totalRuns = 0; }],
    ['runs with only lastRunAt', (session: FourSeasRegaliaMissionSession) => { session.lastRun = null; }],
    ['runs with only lastRun', (session: FourSeasRegaliaMissionSession) => { session.lastRunAt = null; }],
    ['runs with neither last evidence field', (session: FourSeasRegaliaMissionSession) => {
      session.lastRun = null;
      session.lastRunAt = null;
    }],
    ['more runtime failures than runs', (session: FourSeasRegaliaMissionSession) => { session.runtimeFailures = 2; }],
    ['compile failures disagree with structure failures', (session: FourSeasRegaliaMissionSession) => { session.compileFailures = 3; }],
    ['runtime failures disagree with diagnostic concepts', (session: FourSeasRegaliaMissionSession) => { session.runtimeFailures = 1; }],
    ['runtime concept sum overflows a safe integer', (session: FourSeasRegaliaMissionSession) => {
      session.totalRuns = Number.MAX_SAFE_INTEGER;
      session.runtimeFailures = Number.MAX_SAFE_INTEGER;
      session.conceptFailures.sequencePrecondition = Number.MAX_SAFE_INTEGER;
      session.conceptFailures.completeness = 1;
    }],
  ] as const)('rejects impossible w1-m3 session evidence: %s', (_label, mutate) => {
    const session = validFourSeasSession();
    mutate(session);
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': session } }))
      .toThrow(/sessions\.w1-m3.*(?:运行|时间|失败|计数|证据|安全)/);
  });

  it.each([
    ['successful latest run but every run counted as failed', (session: FourSeasRegaliaMissionSession) => {
      session.runtimeFailures = session.totalRuns;
      session.conceptFailures.sequencePrecondition = session.totalRuns;
    }],
    ['latest rejected run recorded under the wrong concept', (session: FourSeasRegaliaMissionSession) => {
      const rejectedTrace = [session.lastTrace.at(-1)!];
      session.lastTrace = rejectedTrace;
      session.lastRun = runFourSeasRegalia(rejectedTrace);
      session.runtimeFailures = 1;
      session.conceptFailures.sequencePrecondition = 0;
      session.conceptFailures.completeness = 1;
    }],
    ['zero runs retaining a historical trace', (session: FourSeasRegaliaMissionSession) => {
      session.totalRuns = 0;
      session.runtimeFailures = 0;
      session.lastRun = null;
      session.lastRunAt = null;
      session.conceptFailures.sequencePrecondition = 0;
      session.conceptFailures.completeness = 0;
    }],
  ] as const)('rejects latest-run evidence inconsistent with cumulative w1-m3 statistics: %s', (
    _label,
    mutate,
  ) => {
    const session = validFourSeasSession();
    mutate(session);
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': session } }))
      .toThrow(/sessions\.w1-m3.*(?:lastTrace|成功|失败|概念|运行)/);
  });

  it('rejects a positive w1-m3 run count with an empty canonical trace', () => {
    const session = validFourSeasSession();
    session.totalRuns = 1;
    session.lastTrace = [];
    session.lastRun = runFourSeasRegalia([]);
    session.runtimeFailures = 1;
    session.conceptFailures.sequencePrecondition = 0;
    session.conceptFailures.completeness = 1;

    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': session } }))
      .toThrow(/sessions\.w1-m3.*lastTrace.*不得为空/);
  });

  it('rejects every forged w1-m3 provenance and canonical-run field', () => {
    const cases: Array<[string, (session: FourSeasRegaliaMissionSession) => void]> = [
      ['foreign block type', (session) => { session.workspace.blocks[0].type = 'xiyou_enter_palace' as never; }],
      ['forged parent id', (session) => { session.workspace.blocks[0].parentBlockId = 'foreign-parent'; }],
      ['wrong opcode', (session) => { session.lastTrace[0].opcode = 'verify_regalia'; }],
      ['foreign state', (session) => { session.lastRun!.events[0].state = 'weapon-tested' as never; }],
      ['event source outside trace', (session) => {
        const event = session.lastRun!.events.find((item) => item.instructionId !== null)!;
        event.instructionId = 'instruction:foreign';
        event.sourceBlockId = 'foreign';
      }],
      ['event parent mismatch', (session) => {
        const event = session.lastRun!.events.find((item) => item.parentBlockId === 'collect')!;
        event.parentBlockId = 'equip';
      }],
      ['noncanonical run', (session) => { session.lastRun!.events[0].messageCode = 'forged'; }],
      ['mismatched final state', (session) => { session.lastRun!.finalState = 'awaiting-request' as never; }],
      ['duplicate workspace ids', (session) => { session.workspace.blocks[1].id = session.workspace.blocks[0].id; }],
      ['duplicate trace ids', (session) => { session.lastTrace[1] = structuredClone(session.lastTrace[0]); }],
    ];
    for (const [label, mutate] of cases) {
      const session = validFourSeasSession();
      mutate(session);
      expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': session } }), label)
        .toThrow(/\u8fdb\u5ea6\u6587\u4ef6\u683c\u5f0f\u65e0\u6548/);
    }

    const rejected = validFourSeasSession();
    rejected.lastTrace = rejected.lastTrace.slice(0, 7);
    rejected.lastRun = runFourSeasRegalia(rejected.lastTrace);
    if (!rejected.lastRun.diagnostic) throw new Error('expected diagnostic fixture');
    rejected.lastRun.diagnostic.parentBlockId = 'collect';
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': rejected } }))
      .toThrow(/\u8fdb\u5ea6\u6587\u4ef6\u683c\u5f0f\u65e0\u6548/);
  });

  it('locks w1-m3 to Task 1 workspace and trace boundaries while parsing real m4/m5 sessions independently', () => {
    expect(PROGRESS_SCHEMA_LIMITS.maxWorkspaceBlocks).toBe(FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks);
    expect(PROGRESS_SCHEMA_LIMITS.maxBlockOrSourceIdLength).toBe(FOUR_SEAS_WORKSPACE_LIMITS.maxBlockOrSourceIdLength);

    const overBlocks = validFourSeasSession();
    overBlocks.workspace.blocks = Array.from({ length: FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks + 1 }, (_, index) => ({
      id: `block-${index}`,
      type: 'xiyou_request_regalia' as const,
      nextId: null,
      parentBlockId: null,
      x: 0,
      y: 0,
    }));
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': overBlocks } })).toThrow(/\u6700\u591a500\u9879/);

    const overId = validFourSeasSession();
    overId.workspace.blocks[0].id = 'x'.repeat(FOUR_SEAS_WORKSPACE_LIMITS.maxBlockOrSourceIdLength + 1);
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': overId } })).toThrow(/\u6700\u591a256\u4e2a\u5b57\u7b26/);

    const unsafeCoordinate = validFourSeasSession();
    unsafeCoordinate.workspace.blocks[0].x = Number.MAX_SAFE_INTEGER + 1;
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m3': unsafeCoordinate } })).toThrow(/\u5b89\u5168\u7684\u6709\u9650\u5750\u6807/);
    expect(parseProgress(JSON.stringify({ ...validV3(), sessions: { 'w1-m4': validAdvancedSession('w1-m4') } })).sessions['w1-m4']?.lastRun)
      .toMatchObject({ completed: true, finalState: 'underworld-verified' });
    expect(parseProgress(JSON.stringify({ ...validV3(), sessions: { 'w1-m5': validAdvancedSession('w1-m5') } })).sessions['w1-m5']?.lastRun)
      .toMatchObject({ completed: true, finalState: 'boss-verified' });
    const forged = validAdvancedSession('w1-m4');
    forged.lastTrace[0].opcode = 'underworld_verify_register';
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m4': forged } })).toThrow(/lastTrace|workspace|进度文件格式无效/);
  });
  it('round-trips a fresh V3 document through JSON parsing', () => {
    const progress = createInitialProgress();
    expect(progress).toMatchObject({
      version: 3,
      schemaRevision: 7,
      sessions: {},
      equipment: initialEquipment(),
      abilities: { conditionObservation: { acquiredAt: null, stableUnlockedAt: null } },
      missionCompletionEvidence: {},
    });
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });

  it('migrates V3 revision 1 to revision 3 and backfills earned equipment from durable completion times', () => {
    const legacy = validV3Revision1();
    legacy.missions = {
      'w1-m1': validMission,
      'w1-m2': { ...validMission, completedAt: '2026-07-13T00:00:00.000Z' },
      'w1-m3': { ...validMission, completedAt: '2026-07-14T00:00:00.000Z' },
    };
    const migrated = migrateProgress(legacy);
    expect(migrated).toMatchObject({
      version: 3,
      schemaRevision: 7,
      abilities: { conditionObservation: { acquiredAt: null, stableUnlockedAt: null } },
    });
    expect(migrated.equipment).toEqual({
      version: 1,
      inventory: {
        'ruyi-staff': { grantedBy: 'w1-m2', grantedAt: '2026-07-13T00:00:00.000Z' },
        'phoenix-crown': { grantedBy: 'w1-m3', grantedAt: '2026-07-14T00:00:00.000Z' },
        'golden-chain-armor': { grantedBy: 'w1-m3', grantedAt: '2026-07-14T00:00:00.000Z' },
        'cloud-walking-boots': { grantedBy: 'w1-m3', grantedAt: '2026-07-14T00:00:00.000Z' },
      },
      equipped: { weapon: null, head: null, body: null, feet: null },
    });
  });

  it('rejects equipped-but-unowned items, wrong slots, and forged reward provenance', () => {
    const current = migrateProgress(validV3()) as ProgressV3 & { equipment: any };
    const equippedButUnowned = structuredClone(current);
    equippedButUnowned.equipment.equipped.weapon = 'ruyi-staff';
    expect(() => migrateProgress(equippedButUnowned)).toThrow(/equipment|装备|未获得/);

    const wrongSlot = structuredClone(current);
    wrongSlot.equipment.inventory['ruyi-staff'] = { grantedBy: 'w1-m2', grantedAt: NOW };
    wrongSlot.equipment.equipped.head = 'ruyi-staff';
    expect(() => migrateProgress(wrongSlot)).toThrow(/equipment|装备|栏位/);

    const forged = structuredClone(current);
    forged.equipment.inventory['ruyi-staff'] = { grantedBy: 'w1-m3', grantedAt: NOW };
    expect(() => migrateProgress(forged)).toThrow(/equipment|奖励|来源/);
  });

  it('round-trips a valid w1-m2 draft, trace, and canonical ruyi staff run', () => {
    const value = { ...validV3(), sessions: { 'w1-m2': validRuyiSession() } };

    expect(parseProgress(JSON.stringify(value))).toEqual(value);
  });

  it('dispatches executable session parsing strictly by mission id', () => {
    const dragonInRuyi = { ...validV3(), sessions: { 'w1-m2': validSession() } };
    expect(() => migrateProgress(dragonInRuyi)).toThrow(/w1-m2.*(?:workspace|lastTrace)/);

    const ruyiInDragon = { ...validV3(), sessions: { 'w1-m1': validRuyiSession() } };
    expect(() => migrateProgress(ruyiInDragon)).toThrow(/w1-m1.*(?:workspace|lastTrace)/);

    const wrongMissionSession = { ...validV3(), sessions: { 'w1-m4': validRuyiSession() } };
    expect(() => migrateProgress(wrongMissionSession)).toThrow(/workspace|积木/);
  });

  it('rejects a dragon block inside an otherwise valid w1-m2 draft', () => {
    const session = validRuyiSession();
    session.workspace.blocks[0].type = 'xiyou_enter_palace' as never;

    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': session } }))
      .toThrow(/w1-m2.*workspace.*type/);
  });

  it('rejects foreign ruyi opcodes, states, and forged event provenance', () => {
    const foreignOpcode = validRuyiSession();
    foreignOpcode.lastTrace[0].opcode = 'enter_palace' as never;
    foreignOpcode.lastRun = null;
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': foreignOpcode } }))
      .toThrow(/lastTrace.*操作码/);

    const foreignState = validRuyiSession();
    foreignState.lastRun!.events[0].state = 'outside-palace' as never;
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': foreignState } }))
      .toThrow(/lastRun.*状态/);

    const forgedSource = validRuyiSession();
    const accepted = forgedSource.lastRun!.events.find((event) => event.type === 'instruction-accepted')!;
    Object.assign(accepted, { instructionId: 'instruction:forged', sourceBlockId: 'forged' });
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': forgedSource } }))
      .toThrow(/lastRun.*指令来源/);
  });

  it('rejects a noncanonical ruyi run and accepts the canonical wrong-weapon failure', () => {
    const forged = validRuyiSession();
    forged.lastRun!.events[1].messageCode = 'forged.ruyi-message';
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': forged } }))
      .toThrow(/确定性运行结果不一致/);

    const wrongWeaponTrace = [
      ruyiTrace[0],
      { instructionId: 'instruction:sabre', sourceBlockId: 'sabre', opcode: 'choose_sabre' as const },
    ];
    const wrongWeapon = validRuyiSession();
    wrongWeapon.lastTrace = wrongWeaponTrace;
    wrongWeapon.lastRun = runRuyiStaffBattle(wrongWeaponTrace);
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': wrongWeapon } }))
      .not.toThrow();
  });

  it('applies strict ruyi session keys, id uniqueness, id bounds, and array bounds', () => {
    const unknownKey = validRuyiSession();
    Object.assign(unknownKey, { unexpected: true });
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': unknownKey } }))
      .toThrow(/未知字段/);

    const duplicateBlocks = validRuyiSession();
    duplicateBlocks.workspace.blocks.push(structuredClone(duplicateBlocks.workspace.blocks[0]));
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': duplicateBlocks } }))
      .toThrow(/重复block id/);

    const oversizedId = validRuyiSession();
    oversizedId.workspace.blocks[0].id = 'r'.repeat(MAX_BLOCK_OR_SOURCE_ID_LENGTH + 1);
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': oversizedId } }))
      .toThrow(/id.*256个字符/);

    const tooManyInstructions = validRuyiSession();
    tooManyInstructions.lastTrace = Array.from(
      { length: MAX_TRACE_INSTRUCTIONS + 1 },
      (_, index) => ({
        instructionId: `instruction:ruyi-${index}`,
        sourceBlockId: `ruyi-${index}`,
        opcode: 'inspect_weights' as const,
      }),
    );
    tooManyInstructions.lastRun = null;
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': tooManyInstructions } }))
      .toThrow(/lastTrace.*最多500项/);
  });

  it('keeps the ruyi workspace block boundary and rejects one block over it', () => {
    const boundary = validRuyiSession();
    boundary.workspace.blocks = Array.from(
      { length: MAX_WORKSPACE_BLOCKS },
      (_, index) => ({
        id: `ruyi-block-${index}`,
        type: 'xiyou_inspect_weights' as const,
        nextId: null,
        x: index,
        y: 0,
      }),
    );
    boundary.lastTrace = [];
    boundary.lastRun = null;
    const parsed = migrateProgress({ ...validV3(), sessions: { 'w1-m2': boundary } });
    expect(parsed.sessions['w1-m2']?.workspace.blocks).toHaveLength(MAX_WORKSPACE_BLOCKS);

    const overLimit = validRuyiSession();
    overLimit.workspace.blocks = Array.from(
      { length: MAX_WORKSPACE_BLOCKS + 1 },
      (_, index) => ({
        id: `ruyi-over-${index}`,
        type: 'xiyou_inspect_weights' as const,
        nextId: null,
        x: index,
        y: 0,
      }),
    );
    overLimit.lastTrace = [];
    overLimit.lastRun = null;
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': overLimit } }))
      .toThrow(/w1-m2\.workspace\.blocks.*最多500项/);
  });

  it('applies the ruyi event boundary before canonical comparison and rejects one event over it', () => {
    const boundary = validRuyiSession();
    const canonical = boundary.lastRun!;
    canonical.events = [
      structuredClone(canonical.events[0]),
      ...Array.from(
        { length: MAX_BATTLE_EVENTS - 2 },
        () => structuredClone(canonical.events[1]),
      ),
      structuredClone(canonical.events.at(-1)!),
    ];
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': boundary } }))
      .toThrow(/确定性运行结果不一致/);
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': boundary } }))
      .not.toThrow(/events.*最多1002项/);

    const overLimit = validRuyiSession();
    overLimit.lastRun!.events = Array.from(
      { length: MAX_BATTLE_EVENTS + 1 },
      () => structuredClone(overLimit.lastRun!.events[0]),
    );
    expect(() => migrateProgress({ ...validV3(), sessions: { 'w1-m2': overLimit } }))
      .toThrow(/w1-m2\.lastRun\.events.*最多1002项/);
  });

  it('migrates V1 to V3 without losing legacy mission or settings data', () => {
    expect(migrateProgress(validV1)).toEqual({
      ...validV1,
      version: 3,
      schemaRevision: 7,
      settings: { ...validV1.settings, reducedMotionOverride: false },
      privacy: { localDataNoticeSeen: false },
      recovery: { lastRecoveredAt: null, source: null },
      sessions: {},
      equipment: initialEquipment(),
      abilities: { conditionObservation: { acquiredAt: null, stableUnlockedAt: null } },
      missionCompletionEvidence: {},
    });
  });

  it('migrates V2 to V3 without losing V2 fields', () => {
    expect(migrateProgress(validV2)).toEqual({
      ...validV2,
      version: 3,
      schemaRevision: 7,
      sessions: {},
      equipment: initialEquipment(),
      abilities: { conditionObservation: { acquiredAt: null, stableUnlockedAt: null } },
      missionCompletionEvidence: {},
    });
  });

  it('migrates revision-2 w2 completion without a historical session and preserves other progress data', () => {
    const legacy = validV3Revision2();
    const missions = {
      'w2-m4': { ...validMission, completedAt: '2026-08-24T00:00:00.000Z' },
      'w2-m5': { ...validMission, completedAt: '2026-08-25T00:00:00.000Z' },
    };
    const migrated = migrateProgress({
      ...legacy,
      missions,
      sessions: {},
      savedAt: '2026-08-26T00:00:00.000Z',
    });

    expect(migrated).toMatchObject({
      version: 3,
      schemaRevision: 7,
      missions,
      settings: legacy.settings,
      privacy: legacy.privacy,
      recovery: legacy.recovery,
      sessions: {},
      equipment: initialEquipment(),
      savedAt: '2026-08-26T00:00:00.000Z',
      abilities: {
        conditionObservation: {
          acquiredAt: '2026-08-24T00:00:00.000Z',
          stableUnlockedAt: '2026-08-25T00:00:00.000Z',
        },
      },
    });
  });

  it('rejects forged, missing, extra, or inconsistent revision-3 ability fields', () => {
    const forged = validV3();
    forged.abilities.conditionObservation.acquiredAt = NOW;
    expect(() => migrateProgress(forged)).toThrow(/abilities/);

    const missing = validV3() as { abilities?: unknown };
    delete missing.abilities;
    expect(() => migrateProgress(missing)).toThrow(/缺少字段 abilities/);

    const extra = validV3() as { abilities: { conditionObservation: Record<string, unknown> } };
    extra.abilities.conditionObservation.unlockedBy = 'w2-m5';
    expect(() => migrateProgress(extra)).toThrow(/未知字段/);

    const invalidTimestamp = validV3() as { abilities: { conditionObservation: { acquiredAt: unknown; stableUnlockedAt: unknown } } };
    invalidTimestamp.abilities.conditionObservation.acquiredAt = 123;
    expect(() => migrateProgress(invalidTimestamp)).toThrow(/abilities\.conditionObservation\.acquiredAt/);

    const m5Only = validV3();
    m5Only.missions = { 'w2-m5': { ...validMission, completedAt: NOW } };
    m5Only.abilities.conditionObservation = { acquiredAt: null, stableUnlockedAt: NOW };
    expect(() => migrateProgress(m5Only)).toThrow(/abilities/);
  });

  it('retires the public legacy default during migration', () => {
    const migrated = migrateProgress({ ...validV2, settings: { ...validV2.settings, parentPin: '2580' } });
    expect(migrated.settings.parentPin).toBe('unset');
  });

  it('strictly parses valid completed, incomplete, and rejected session runs', () => {
    const completed = validV3();
    const incompleteTrace = trace.slice(0, 1);
    const incomplete = validV3();
    incomplete.sessions['w1-m1'].lastTrace = incompleteTrace;
    incomplete.sessions['w1-m1'].lastRun = runDragonPalaceBattle(incompleteTrace);
    const rejectedTrace = [trace[1]];
    const rejected = validV3();
    rejected.sessions['w1-m1'].lastTrace = rejectedTrace;
    rejected.sessions['w1-m1'].lastRun = runDragonPalaceBattle(rejectedTrace);

    expect(migrateProgress(completed)).toEqual(completed);
    expect(migrateProgress(incomplete)).toEqual(incomplete);
    expect(migrateProgress(rejected)).toEqual(rejected);
  });

  it('allows an empty or disconnected draft and keeps historical trace independent of current blocks', () => {
    const value = validV3();
    value.sessions['w1-m1'].workspace.blocks = [
      { id: 'current-a', type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 },
      { id: 'current-b', type: 'xiyou_test_weapon', nextId: null, x: 1, y: 1 },
    ];
    expect(() => migrateProgress(value)).not.toThrow();

    value.sessions['w1-m1'].workspace.blocks = [];
    expect(() => migrateProgress(value)).not.toThrow();
  });

  it('returns a new deeply isolated V3 tree', () => {
    const input = validV3();
    const result = migrateProgress(input);
    const resultSession = result.sessions['w1-m1'];
    if (!resultSession) throw new Error('expected parsed w1-m1 session');

    expect(result).not.toBe(input);
    expect(result.sessions).not.toBe(input.sessions);
    expect(result.sessions['w1-m1']).not.toBe(input.sessions['w1-m1']);
    expect(resultSession.workspace.blocks).not.toBe(input.sessions['w1-m1'].workspace.blocks);
    expect(resultSession.lastTrace).not.toBe(input.sessions['w1-m1'].lastTrace);
    expect(resultSession.lastRun).not.toBe(input.sessions['w1-m1'].lastRun);

    input.sessions['w1-m1'].workspace.blocks[0].id = 'mutated';
    input.sessions['w1-m1'].lastTrace[0].opcode = 'test_weapon';
    input.sessions['w1-m1'].lastRun!.events[0].messageCode = 'mutated';
    expect(resultSession.workspace.blocks[0].id).toBe('draft-a');
    expect(resultSession.lastTrace[0].opcode).toBe('enter_palace');
    expect(resultSession.lastRun!.events[0].messageCode).toBe('dragon-palace.run-started');
  });

  it('rejects unsupported versions and malformed JSON with stable messages', () => {
    expect(() => parseProgress('{broken')).toThrow('进度文件无法读取');
    expect(() => migrateProgress({ version: 999 })).toThrow('进度版本不受支持');
  });

  it.each([
    ['unknown mission', { ...validV1, missions: { unknown: validMission } }],
    ['stars below range', { ...validV1, missions: { 'w1-m1': { ...validMission, stars: 0 } } }],
    ['stars above range', { ...validV1, missions: { 'w1-m1': { ...validMission, stars: 4 } } }],
    ['fractional attempts', { ...validV1, missions: { 'w1-m1': { ...validMission, attempts: 1.5 } } }],
    ['negative attempts', { ...validV1, missions: { 'w1-m1': { ...validMission, attempts: -1 } } }],
    ['infinite attempts', { ...validV1, missions: { 'w1-m1': { ...validMission, attempts: Infinity } } }],
    ['fractional hints', { ...validV1, missions: { 'w1-m1': { ...validMission, hintsUsed: 0.5 } } }],
    ['negative hints', { ...validV1, missions: { 'w1-m1': { ...validMission, hintsUsed: -1 } } }],
    ['infinite hints', { ...validV1, missions: { 'w1-m1': { ...validMission, hintsUsed: Infinity } } }],
    ['invalid completion date', { ...validV1, missions: { 'w1-m1': { ...validMission, completedAt: 'not-a-date' } } }],
    ['invalid saved date', { ...validV1, savedAt: 'not-a-date' }],
    ['short PIN', { ...validV1, settings: { ...validV1.settings, parentPin: '123' } }],
    ['non-numeric PIN', { ...validV1, settings: { ...validV1.settings, parentPin: '12ab' } }],
    ['missing field', { ...validV1, learnerName: undefined }],
    ['wrong field type', { ...validV1, settings: { ...validV1.settings, muted: 'no' } }],
  ])('keeps rejecting invalid legacy V1 data: %s', (_label, value) => {
    expect(() => migrateProgress(value)).toThrow(/进度文件/);
  });

  it.each([
    ['completedAt rollover', { ...validV1, missions: { 'w1-m1': { ...validMission, completedAt: '2026-02-30T00:00:00.000Z' } } }],
    ['completedAt numeric text', { ...validV1, missions: { 'w1-m1': { ...validMission, completedAt: '1' } } }],
    ['savedAt offset', { ...validV1, savedAt: '2026-07-12T08:00:00.000+08:00' }],
    ['savedAt without milliseconds', { ...validV1, savedAt: '2026-07-12T00:00:00Z' }],
    ['recovery date rollover', {
      ...validV2,
      recovery: { lastRecoveredAt: '2026-02-30T00:00:00.000Z', source: 'snapshot' },
    }],
    ['recovery date offset', {
      ...validV2,
      recovery: { lastRecoveredAt: '2026-07-12T08:00:00.000+08:00', source: 'snapshot' },
    }],
  ])('keeps rejecting non-canonical legacy ISO UTC dates: %s', (_label, value) => {
    expect(() => migrateProgress(value)).toThrow(/必须是有效ISO UTC日期/);
  });

  it.each([
    ['missing schemaRevision', { ...validV2, schemaRevision: undefined }],
    ['unsupported schemaRevision', { ...validV2, schemaRevision: 2 }],
    ['invalid privacy flag', { ...validV2, privacy: { localDataNoticeSeen: 'yes' } }],
    ['invalid recovery source', { ...validV2, recovery: { lastRecoveredAt: null, source: 'cloud' } }],
    ['invalid recovery date type', { ...validV2, recovery: { lastRecoveredAt: 123, source: 'snapshot' } }],
    ['invalid recovery date format', { ...validV2, recovery: { lastRecoveredAt: '2026-07-12', source: 'snapshot' } }],
    ['missing reduced motion override', {
      ...validV2,
      settings: { muted: false, reducedMotion: false, parentPin: '2580' },
    }],
    ['unknown privacy field', { ...validV2, privacy: { localDataNoticeSeen: false, tracking: false } }],
    ['unknown recovery field', { ...validV2, recovery: { lastRecoveredAt: null, source: null, backup: false } }],
    ['unknown settings field', { ...validV2, settings: { ...validV2.settings, theme: 'dark' } }],
    ['unknown top-level field', { ...validV2, unexpected: true }],
  ])('keeps rejecting invalid V2: %s', (_label, value) => {
    expect(() => migrateProgress(value)).toThrow(/进度文件格式无效/);
  });

  it('returns a fresh V3 tree isolated from mutable legacy V1 input', () => {
    const input = {
      version: 1,
      learnerName: '小行者',
      missions: { 'w1-m1': { ...validMission } },
      settings: { muted: true, reducedMotion: true, parentPin: '2580' },
      savedAt: NOW,
    };
    const result = migrateProgress(input);

    expect(result.missions).not.toBe(input.missions);
    expect(result.missions['w1-m1']).not.toBe(input.missions['w1-m1']);
    expect(result.settings).not.toBe(input.settings);
    input.learnerName = '已更改';
    input.settings.muted = false;
    Object.assign(input.missions['w1-m1'], { stars: 1 });
    expect(result.learnerName).toBe('小行者');
    expect(result.settings.muted).toBe(true);
    expect(result.missions['w1-m1'].stars).toBe(2);
  });

  it.each([
    ['top level', () => ({ ...validV3(), unexpected: true })],
    ['session', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'], { unexpected: true });
      return value;
    }],
    ['workspace', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].workspace, { unexpected: true });
      return value;
    }],
    ['workspace block', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].workspace.blocks[0], { unexpected: true });
      return value;
    }],
    ['trace instruction', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].lastTrace[0], { unexpected: true });
      return value;
    }],
    ['run result', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].lastRun!, { unexpected: true });
      return value;
    }],
    ['run event', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].lastRun!.events[0], { unexpected: true });
      return value;
    }],
    ['penalty', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].lastRun!.penalty, { unexpected: true });
      return value;
    }],
    ['concept failures', () => {
      const value = validV3();
      Object.assign(value.sessions['w1-m1'].conceptFailures, { unexpected: true });
      return value;
    }],
  ])('rejects unknown fields at %s', (_label, makeValue) => {
    expect(() => migrateProgress(makeValue())).toThrow(/未知字段/);
  });

  it('rejects missing fields at every strict V3 layer', () => {
    const cases: unknown[] = [];
    const missingSession = validV3();
    delete (missingSession.sessions['w1-m1'] as Partial<typeof missingSession.sessions['w1-m1']>).savedAt;
    cases.push(missingSession);
    const missingBlock = validV3();
    delete (missingBlock.sessions['w1-m1'].workspace.blocks[0] as Partial<typeof missingBlock.sessions['w1-m1']['workspace']['blocks'][number]>).x;
    cases.push(missingBlock);
    const missingEvent = validV3();
    delete (missingEvent.sessions['w1-m1'].lastRun!.events[0] as { messageCode?: string }).messageCode;
    cases.push(missingEvent);
    for (const value of cases) expect(() => migrateProgress(value)).toThrow(/缺少字段/);
  });

  it('rejects unknown missions and non-plain session maps', () => {
    const unknown = { ...validV3(), sessions: { unknown: validSession() } };
    expect(() => migrateProgress(unknown)).toThrow('未知任务 unknown');

    const polluted = {
      ...validV3(),
      sessions: Object.assign(Object.create(null), validV3().sessions),
    };
    expect(() => migrateProgress(polluted)).toThrow(/sessions必须是对象/);
  });

  it.each(['totalRuns', 'runtimeFailures', 'compileFailures'] as const)(
    'rejects every invalid %s counter',
    (field) => {
      for (const invalid of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, Number.NaN, '1']) {
        const value = validV3();
        (value.sessions['w1-m1'][field] as unknown) = invalid;
        expect(() => migrateProgress(value)).toThrow(/非负整数/);
      }
    },
  );

  it.each(['programStructure', 'sequencePrecondition', 'completeness'] as const)(
    'rejects every invalid concept counter %s',
    (field) => {
      for (const invalid of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, Number.NaN, '1']) {
        const value = validV3();
        (value.sessions['w1-m1'].conceptFailures[field] as unknown) = invalid;
        expect(() => migrateProgress(value)).toThrow(/非负整数/);
      }
    },
  );

  it('rejects unknown or duplicate hint tiers', () => {
    const duplicate = validV3();
    duplicate.sessions['w1-m1'].usedHintTiers = ['observe', 'observe'];
    expect(() => migrateProgress(duplicate)).toThrow(/提示层级/);

    const unknown = validV3();
    unknown.sessions['w1-m1'].usedHintTiers = ['answer' as never];
    expect(() => migrateProgress(unknown)).toThrow(/提示层级/);
  });

  it.each([
    ['lastRunAt', 'not-a-date'],
    ['lastRunAt', '2026-07-12T08:00:00.000+08:00'],
    ['savedAt', '2026-02-30T00:00:00.000Z'],
    ['savedAt', '2026-07-12T00:00:00Z'],
  ] as const)('rejects bad session date %s=%s', (field, invalid) => {
    const value = validV3();
    value.sessions['w1-m1'][field] = invalid;
    expect(() => migrateProgress(value)).toThrow(/有效ISO UTC日期/);
  });

  it.each([
    ['duplicate id', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => blocks.push({ ...blocks[0] })],
    ['unknown next', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].nextId = 'missing'; }],
    ['self link', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].nextId = blocks[0].id; }],
    ['cycle', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[1].nextId = blocks[0].id; }],
    ['multiple predecessor', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => {
      blocks.push({ id: 'draft-c', type: 'xiyou_test_weapon', nextId: 'draft-b', x: 0, y: 0 });
    }],
    ['unknown type', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].type = 'unknown' as never; }],
    ['empty id', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].id = ''; }],
    ['infinite coordinate', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].x = Infinity; }],
    ['unsafe coordinate', (blocks: ReturnType<typeof validSession>['workspace']['blocks']) => { blocks[0].y = Number.MAX_SAFE_INTEGER + 1; }],
  ])('rejects bad workspace: %s', (_label, mutate) => {
    const value = validV3();
    mutate(value.sessions['w1-m1'].workspace.blocks);
    expect(() => migrateProgress(value)).toThrow(/workspace/);
  });

  it.each([
    ['unknown opcode', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastTrace[0].opcode = 'unknown' as never; }],
    ['bad instruction relation', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastTrace[0].instructionId = 'wrong'; }],
    ['empty source id', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastTrace[0].sourceBlockId = ''; }],
  ])('rejects bad trace: %s', (_label, mutate) => {
    const value = validV3();
    mutate(value);
    expect(() => migrateProgress(value)).toThrow(/lastTrace/);
  });

  it.each([
    ['nonzero penalty', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastRun!.penalty.livesLost = 1 as never; }],
    ['lifecycle provenance', (value: ReturnType<typeof validV3>) => {
      Object.assign(value.sessions['w1-m1'].lastRun!.events[0], trace[0]);
    }],
    ['instruction provenance missing', (value: ReturnType<typeof validV3>) => {
      const event = value.sessions['w1-m1'].lastRun!.events.find((item) => item.type === 'instruction-accepted')!;
      Object.assign(event, { instructionId: null, sourceBlockId: null, opcode: null });
    }],
    ['event not in trace', (value: ReturnType<typeof validV3>) => {
      const event = value.sessions['w1-m1'].lastRun!.events.find((item) => item.type === 'instruction-accepted')!;
      Object.assign(event, { instructionId: 'instruction:other', sourceBlockId: 'other' });
    }],
    ['empty event message', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastRun!.events[0].messageCode = ''; }],
    ['completed wrong final state', (value: ReturnType<typeof validV3>) => { value.sessions['w1-m1'].lastRun!.finalState = 'outside-palace' as never; }],
    ['completed with diagnostic', (value: ReturnType<typeof validV3>) => {
      value.sessions['w1-m1'].lastRun!.diagnostic = runDragonPalaceBattle(trace.slice(0, 1)).diagnostic;
    }],
  ])('rejects impossible run: %s', (_label, mutate) => {
    const value = validV3();
    mutate(value);
    expect(() => migrateProgress(value)).toThrow(/lastRun/);
  });

  it('rejects incomplete and rejected diagnostics with impossible provenance', () => {
    const incompleteTrace = trace.slice(0, 1);
    const incomplete = validV3();
    incomplete.sessions['w1-m1'].lastTrace = incompleteTrace;
    incomplete.sessions['w1-m1'].lastRun = runDragonPalaceBattle(incompleteTrace);
    incomplete.sessions['w1-m1'].lastRun!.diagnostic!.sourceBlockId = 'not-last';
    expect(() => migrateProgress(incomplete)).toThrow(/lastRun/);

    const rejectedTrace = [trace[1]];
    const rejected = validV3();
    rejected.sessions['w1-m1'].lastTrace = rejectedTrace;
    rejected.sessions['w1-m1'].lastRun = runDragonPalaceBattle(rejectedTrace);
    rejected.sessions['w1-m1'].lastRun!.diagnostic!.instructionId = 'instruction:other';
    expect(() => migrateProgress(rejected)).toThrow(/lastRun/);
  });

  it('rejects forged accepted and state-changed events that the trace cannot execute', () => {
    const value = validV3();
    const impossibleTrace = [trace[2]];
    value.sessions['w1-m1'].lastTrace = impossibleTrace;
    value.sessions['w1-m1'].lastRun = {
      completed: true,
      finalState: 'weapon-tested',
      events: [
        {
          type: 'run-started', state: 'outside-palace', instructionId: null, sourceBlockId: null,
          opcode: null, messageCode: 'forged.start',
        },
        {
          type: 'instruction-accepted', state: 'outside-palace', ...impossibleTrace[0],
          messageCode: 'forged.accepted',
        },
        {
          type: 'state-changed', state: 'weapon-tested', ...impossibleTrace[0],
          messageCode: 'forged.state-changed',
        },
        {
          type: 'run-finished', state: 'weapon-tested', instructionId: null, sourceBlockId: null,
          opcode: null, messageCode: 'forged.finished',
        },
      ],
      diagnostic: null,
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    };

    expect(() => migrateProgress(value)).toThrow(/lastTrace.*不一致|确定性/);
  });

  it.each([
    ['missing event', (events: NonNullable<DragonPalaceMissionSession['lastRun']>['events']) => { events.splice(1, 1); }],
    ['reordered events', (events: NonNullable<DragonPalaceMissionSession['lastRun']>['events']) => {
      [events[1], events[2]] = [events[2], events[1]];
    }],
    ['duplicate event', (events: NonNullable<DragonPalaceMissionSession['lastRun']>['events']) => {
      events.splice(1, 0, structuredClone(events[1]));
    }],
  ])('rejects a canonical run with %s', (_label, mutate) => {
    const value = validV3();
    mutate(value.sessions['w1-m1'].lastRun!.events);
    expect(() => migrateProgress(value)).toThrow(/lastTrace.*不一致|确定性/);
  });

  it('rejects noncanonical message codes even when every event field is otherwise valid', () => {
    const value = validV3();
    value.sessions['w1-m1'].lastRun!.events[1].messageCode = 'forged.noncanonical-message';
    expect(() => migrateProgress(value)).toThrow(/lastTrace.*不一致|确定性/);
  });

  it('rejects a valid run result generated from a different trace', () => {
    const value = validV3();
    value.sessions['w1-m1'].lastRun = runDragonPalaceBattle(trace.slice(0, 1));
    expect(() => migrateProgress(value)).toThrow(/lastTrace.*不一致|确定性/);
  });

  it('rejects duplicate trace provenance even when the run is canonical for that duplicate trace', () => {
    const value = validV3();
    const duplicateTrace = [
      { instructionId: 'instruction:reused', sourceBlockId: 'reused', opcode: 'enter_palace' as const },
      { instructionId: 'instruction:reused', sourceBlockId: 'reused', opcode: 'request_weapon' as const },
    ];
    value.sessions['w1-m1'].lastTrace = duplicateTrace;
    value.sessions['w1-m1'].lastRun = runDragonPalaceBattle(duplicateTrace);
    expect(() => migrateProgress(value)).toThrow(/lastTrace.*重复.*(?:sourceBlockId|instructionId)/);
  });

  it('allows repeated opcodes when each trace instruction has distinct provenance', () => {
    const value = validV3();
    const repeatedOpcodeTrace = [
      { instructionId: 'instruction:first', sourceBlockId: 'first', opcode: 'enter_palace' as const },
      { instructionId: 'instruction:second', sourceBlockId: 'second', opcode: 'enter_palace' as const },
    ];
    value.sessions['w1-m1'].lastTrace = repeatedOpcodeTrace;
    value.sessions['w1-m1'].lastRun = runDragonPalaceBattle(repeatedOpcodeTrace);
    expect(() => migrateProgress(value)).not.toThrow();
  });

  it('enforces the raw UTF-8 byte budget at the exact boundary before parsing JSON', () => {
    const base = JSON.stringify(createInitialProgress());
    const baseBytes = new TextEncoder().encode(base).byteLength;
    const atLimit = `${base}${' '.repeat(MAX_RAW_JSON_BYTES - baseBytes)}`;
    expect(new TextEncoder().encode(atLimit).byteLength).toBe(MAX_RAW_JSON_BYTES);
    expect(parseProgress(atLimit)).toEqual(createInitialProgress());
    expect(() => parseProgress(`${atLimit} `)).toThrow(/UTF-8字节.*1048576/);

    const multibyteOverLimit = JSON.stringify({ version: 3, padding: '你'.repeat(350_000) });
    expect(multibyteOverLimit.length).toBeLessThan(MAX_RAW_JSON_BYTES);
    expect(new TextEncoder().encode(multibyteOverLimit).byteLength).toBeGreaterThan(MAX_RAW_JSON_BYTES);
    expect(() => parseProgress(multibyteOverLimit)).toThrow(/UTF-8字节.*1048576/);
  });

  it('migrates long legacy learner names without loss and round-trips them as V3', () => {
    const learnerName = '旧名字'.repeat(100);
    for (const legacy of [
      { ...validV1, learnerName },
      { ...validV2, learnerName },
    ]) {
      const migrated = migrateProgress(legacy);
      expect(migrated.learnerName).toBe(learnerName);
      expect(parseProgress(JSON.stringify(migrated))).toEqual(migrated);
    }
  });

  it('round-trips a maximum-length block id through derived trace provenance and engine result', () => {
    const blockId = 'b'.repeat(MAX_BLOCK_OR_SOURCE_ID_LENGTH);
    const value = validV3();
    value.sessions['w1-m1'].workspace.blocks = [
      { id: blockId, type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 },
    ];
    value.sessions['w1-m1'].lastTrace = [{
      instructionId: `instruction:${blockId}`,
      sourceBlockId: blockId,
      opcode: 'enter_palace',
    }];
    value.sessions['w1-m1'].lastRun = runDragonPalaceBattle(value.sessions['w1-m1'].lastTrace);

    const parsed = parseProgress(JSON.stringify(value));
    expect(parsed).toEqual(value);
    expect(parsed.sessions['w1-m1']?.lastTrace[0].instructionId).toHaveLength(
      MAX_INSTRUCTION_ID_LENGTH,
    );
  });

  it('rejects block, source, and derived-instruction ids above their field limits', () => {
    const blockOverLimit = validV3();
    blockOverLimit.sessions['w1-m1'].workspace.blocks[0].id = 'b'.repeat(MAX_BLOCK_OR_SOURCE_ID_LENGTH + 1);
    expect(() => migrateProgress(blockOverLimit)).toThrow(/workspace.*id.*256个字符/);

    const sourceOverLimit = validV3();
    const sourceId = 's'.repeat(MAX_BLOCK_OR_SOURCE_ID_LENGTH + 1);
    sourceOverLimit.sessions['w1-m1'].lastTrace = [{
      instructionId: `instruction:${sourceId}`,
      sourceBlockId: sourceId,
      opcode: 'enter_palace',
    }];
    sourceOverLimit.sessions['w1-m1'].lastRun = null;
    expect(() => migrateProgress(sourceOverLimit)).toThrow(/sourceBlockId.*256个字符/);

    const instructionOverLimit = validV3();
    instructionOverLimit.sessions['w1-m1'].lastTrace[0].instructionId = 'i'.repeat(
      MAX_INSTRUCTION_ID_LENGTH + 1,
    );
    instructionOverLimit.sessions['w1-m1'].lastRun = null;
    expect(() => migrateProgress(instructionOverLimit)).toThrow(/instructionId.*268个字符/);
  });

  it('enforces workspace block count before deep block validation and keeps the 500-block boundary', () => {
    const boundary = validV3();
    boundary.sessions['w1-m1'].workspace.blocks = Array.from(
      { length: MAX_WORKSPACE_BLOCKS },
      (_, index) => ({ id: `block-${index}`, type: 'xiyou_enter_palace', nextId: null, x: index, y: 0 }),
    );
    boundary.sessions['w1-m1'].lastTrace = [];
    boundary.sessions['w1-m1'].lastRun = null;
    expect(migrateProgress(boundary).sessions['w1-m1']?.workspace.blocks).toHaveLength(MAX_WORKSPACE_BLOCKS);

    const overLimit = validV3();
    const poison = { id: 'poison', type: 'xiyou_enter_palace' as const, nextId: null, x: 0, y: 0 };
    Object.defineProperty(poison, 'id', { get: () => { throw new Error('deep block traversal happened'); } });
    overLimit.sessions['w1-m1'].workspace.blocks = [
      poison,
      ...Array.from(
        { length: MAX_WORKSPACE_BLOCKS },
        (_, index) => ({ id: `over-${index}`, type: 'xiyou_enter_palace' as const, nextId: null, x: index, y: 0 }),
      ),
    ];
    expect(() => migrateProgress(overLimit)).toThrow(/workspace\.blocks.*最多500项/);
  });

  it('enforces trace count before instruction parsing and keeps the 500-instruction boundary', () => {
    const makeTrace = (length: number) => Array.from({ length }, (_, index) => ({
      instructionId: `instruction:trace-${index}`,
      sourceBlockId: `trace-${index}`,
      opcode: 'enter_palace' as const,
    }));
    const boundary = validV3();
    boundary.sessions['w1-m1'].lastTrace = makeTrace(MAX_TRACE_INSTRUCTIONS);
    boundary.sessions['w1-m1'].lastRun = null;
    expect(migrateProgress(boundary).sessions['w1-m1']?.lastTrace).toHaveLength(MAX_TRACE_INSTRUCTIONS);

    const overLimit = validV3();
    overLimit.sessions['w1-m1'].lastTrace = makeTrace(MAX_TRACE_INSTRUCTIONS + 1);
    expect(() => migrateProgress(overLimit)).toThrow(/lastTrace.*最多500项/);
  });

  it('applies the event boundary before canonical comparison', () => {
    const boundary = validV3();
    const canonical = boundary.sessions['w1-m1'].lastRun!;
    canonical.events = [
      structuredClone(canonical.events[0]),
      ...Array.from(
        { length: MAX_BATTLE_EVENTS - 2 },
        () => structuredClone(canonical.events[1]),
      ),
      structuredClone(canonical.events.at(-1)!),
    ];
    expect(() => migrateProgress(boundary)).toThrow(/确定性运行结果不一致/);
    expect(() => migrateProgress(boundary)).not.toThrow(/events.*最多1002项/);

    const overLimit = validV3();
    overLimit.sessions['w1-m1'].lastRun!.events = Array.from(
      { length: MAX_BATTLE_EVENTS + 1 },
      () => structuredClone(overLimit.sessions['w1-m1'].lastRun!.events[0]),
    );
    expect(() => migrateProgress(overLimit)).toThrow(/lastRun\.events.*最多1002项/);
  });

  it('detects a maximum-sized workspace cycle without changing draft semantics', () => {
    const value = validV3();
    value.sessions['w1-m1'].workspace.blocks = Array.from(
      { length: MAX_WORKSPACE_BLOCKS },
      (_, index) => ({
        id: `cycle-${index}`,
        type: 'xiyou_enter_palace',
        nextId: `cycle-${(index + 1) % MAX_WORKSPACE_BLOCKS}`,
        x: index,
        y: 0,
      }),
    );
    value.sessions['w1-m1'].lastTrace = [];
    value.sessions['w1-m1'].lastRun = null;
    expect(() => migrateProgress(value)).toThrow(/workspace.*cycle/);
  });

  it('allows a null lastRun and still returns an isolated session tree', () => {
    const value = validV3();
    value.sessions['w1-m1'].lastRun = null;
    const parsed = migrateProgress(value);
    expect(parsed.sessions['w1-m1']?.lastRun).toBeNull();
    expect(parsed.sessions['w1-m1']).not.toBe(value.sessions['w1-m1']);
  });

  it.each([null, [], new Date(), Object.create(null)])('rejects non-plain document objects', (value) => {
    expect(() => migrateProgress(value)).toThrow('进度文件格式无效');
  });

  it('wraps malformed W3-M2 session parser errors in the unified progress-file error', () => {
    const value = validV3() as any;
    const session = createMissionSession('w3-m2', NOW);
    session.totalRuns = 1;
    session.lastRunAt = NOW;
    value.sessions = { 'w3-m2': session };
    expect(() => parseProgress(JSON.stringify(value))).toThrow(/进度文件格式无效/);
  });

  it('wraps forged formal W3-M2 proof workspace and trace errors in the unified progress-file error', () => {
    const draft = createMissionSession('w3-m2', NOW).workspace;
    draft.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
    const trace = compileCuilanBooleanDraft(draft);
    const session = recordRun(updateWorkspaceDraft(createMissionSession('w3-m2', NOW), draft, NOW), runCuilanBooleanForDraft(draft, trace), trace, NOW);
    let progress = createInitialProgress(); progress.sessions['w3-m2'] = session; progress = completeMission(progress, 'w3-m2', { stars: 3, hintsUsed: 0 });
    const forgedWorkspace = structuredClone(progress) as any; forgedWorkspace.missionCompletionEvidence['w3-m2'].workspace.blocks = [];
    const forgedTrace = structuredClone(progress) as any; forgedTrace.missionCompletionEvidence['w3-m2'].trace = [];
    expect(() => parseProgress(JSON.stringify(forgedWorkspace))).toThrow(/进度文件格式无效/);
    expect(() => parseProgress(JSON.stringify(forgedTrace))).toThrow(/进度文件格式无效/);
  });

  it('keeps strict V2 validation as a legacy document contract', () => {
    expect(() => migrateProgress({ ...validV2, unexpected: true })).toThrow(/未知字段/);
    expect(() => migrateProgress({ ...validV2, settings: { ...validV2.settings, theme: 'dark' } })).toThrow(/未知字段/);
    expect(() => migrateProgress({ ...validV2, schemaRevision: 2 })).toThrow(/schemaRevision/);
  });
});
