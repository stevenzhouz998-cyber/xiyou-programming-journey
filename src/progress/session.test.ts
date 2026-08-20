import * as Blockly from 'blockly';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { runFourSeasRegalia } from '../battle/fourSeasRegalia';
import { runDragonPalaceBattle } from '../battle/dragonPalace';
import { runRuyiStaffBattle } from '../battle/ruyiStaff';
import { runAdvancedWeekOne } from '../battle/advancedWeekOne';
import type { AdvancedWeekOneInstruction } from '../blockly/advancedWeekOneContract';
import type { DragonPalaceInstruction, FourSeasInstruction, RuyiStaffInstruction } from '../battle/types';
import { registerFourSeasRegaliaBlocks } from '../blockly/fourSeasRegaliaBlocks';
import { compileFourSeasRegaliaWorkspace } from '../blockly/fourSeasRegaliaCompiler';
import { loadFourSeasWorkspaceDraft, type FourSeasWorkspaceDraftV1 } from '../blockly/fourSeasRegaliaDraft';
import type { WorkspaceDraftV1 } from '../blockly/draft';
import type { RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft';
import type {
  DragonPalaceMissionSession,
  ExecutableMissionId,
  FourSeasRegaliaMissionSession,
  MissionSession,
  RuyiStaffMissionSession,
} from './types';
import {
  createMissionSession,
  getSessionSupport,
  recordCompileFailure,
  recordHint,
  recordRun,
  updateWorkspaceDraft,
} from './session';
import { recordEquipmentEffectUse } from './equipmentEffectSession';

const NOW = '2026-07-15T06:00:00.000Z';
const LATER = '2026-07-15T06:05:00.000Z';

const completeTrace: DragonPalaceInstruction[] = [
  { instructionId: 'instruction:enter', sourceBlockId: 'enter', opcode: 'enter_palace' },
  { instructionId: 'instruction:request', sourceBlockId: 'request', opcode: 'request_weapon' },
  { instructionId: 'instruction:test', sourceBlockId: 'test', opcode: 'test_weapon' },
];

const rejectedTrace: DragonPalaceInstruction[] = [
  { instructionId: 'instruction:request-first', sourceBlockId: 'request-first', opcode: 'request_weapon' },
];

const incompleteTrace: DragonPalaceInstruction[] = [
  { instructionId: 'instruction:enter-only', sourceBlockId: 'enter-only', opcode: 'enter_palace' },
];

const ruyiTrace: RuyiStaffInstruction[] = [
  { instructionId: 'instruction:inspect', sourceBlockId: 'inspect', opcode: 'inspect_weights' },
  { instructionId: 'instruction:choose', sourceBlockId: 'choose', opcode: 'choose_ruyi_staff' },
  { instructionId: 'instruction:shrink', sourceBlockId: 'shrink', opcode: 'shrink_ruyi_staff' },
];

const wrongWeaponTrace: RuyiStaffInstruction[] = [
  ruyiTrace[0],
  { instructionId: 'instruction:sabre', sourceBlockId: 'sabre', opcode: 'choose_sabre' },
];

function realFourSeasFixture(): { draft: FourSeasWorkspaceDraftV1; trace: FourSeasInstruction[] } {
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
    if (!compiled.ok) throw new Error('expected real w1-m3 fixture to compile');
    return { draft, trace: compiled.trace };
  } finally {
    workspace.dispose();
  }
}

describe('mission session rules', () => {
  it('records each manually invoked advanced equipment effect once without changing run evidence', () => {
    const initial = createMissionSession('w1-m5', NOW)
    const first = recordEquipmentEffectUse(initial, 'weight-reference', LATER)
    const duplicate = recordEquipmentEffectUse(first, 'weight-reference', LATER)
    const second = recordEquipmentEffectUse(duplicate, 'decomposition-view', LATER)

    expect(initial.equipmentEffectsUsed).toEqual([])
    expect(second).toMatchObject({
      equipmentEffectsUsed: ['weight-reference', 'decomposition-view'],
      totalRuns: 0,
      lastRun: null,
      savedAt: LATER,
    })
    expect(() => recordEquipmentEffectUse(initial, 'not-real' as never, LATER)).toThrow(/装备效果/)
  })
  it('creates mission-specific advanced sessions and preserves canonical m4/m5 run evidence', () => {
    const underworldItems: Array<[string, string | null, AdvancedWeekOneInstruction['opcode']]> = [
      ['open', null, 'underworld_open_register'], ['find', null, 'underworld_find_monkey_records'], ['read', 'find', 'underworld_read_index'], ['match', 'find', 'underworld_match_monkey_kind'], ['collect', 'find', 'underworld_collect_named_records'], ['handle', null, 'underworld_handle_names'], ['verify', null, 'underworld_verify_register'],
    ];
    const underworld: AdvancedWeekOneInstruction[] = underworldItems.map(([sourceBlockId, parentBlockId, opcode]) => ({ instructionId: `instruction:${sourceBlockId}`, sourceBlockId, parentBlockId, opcode }))
    const m4 = recordRun(createMissionSession('w1-m4', NOW), runAdvancedWeekOne('w1-m4', underworld), underworld, LATER)
    const m5 = createMissionSession('w1-m5', NOW)
    expect(m4).toMatchObject({ workspace: { missionId: 'w1-m4' }, totalRuns: 1, lastRun: { completed: true, finalState: 'underworld-verified' } })
    expect(m5).toMatchObject({ workspace: { missionId: 'w1-m5' }, lastTrace: [], lastRun: null })
  })
  it('clears stale advanced run evidence after a visible draft edit while preserving run counters', () => {
    const trace: AdvancedWeekOneInstruction[] = [
      { instructionId: 'instruction:open', sourceBlockId: 'open', parentBlockId: null, opcode: 'underworld_open_register' },
    ]
    const recorded = recordRun(
      createMissionSession('w1-m4', NOW),
      runAdvancedWeekOne('w1-m4', trace),
      trace,
      NOW,
    )
    const edited = updateWorkspaceDraft(recorded, {
      version: 1,
      missionId: 'w1-m4',
      blocks: [{ id: 'open-edited', type: 'xiyou_underworld_open_register', nextId: null, parentBlockId: null, x: 0, y: 0 }],
    }, LATER)
    expect(edited).toMatchObject({ totalRuns: 1, lastTrace: [], lastRun: null, lastRunAt: null })
  })
  it('creates and updates a strongly typed w1-m3 session from a real compiled workspace', () => {
    const { draft, trace } = realFourSeasFixture();
    const created = createMissionSession('w1-m3', NOW);
    expectTypeOf(created).toEqualTypeOf<FourSeasRegaliaMissionSession>();
    expect(created).toMatchObject({ workspace: { version: 1, blocks: [] }, totalRuns: 0 });

    const withDraft = updateWorkspaceDraft(created, draft, NOW);
    const recorded = recordRun(withDraft, runFourSeasRegalia(trace), trace, LATER);
    const hinted = recordHint(recordCompileFailure(recorded, 'program-structure', LATER), 'think', LATER);
    expect(hinted).toMatchObject({
      workspace: draft,
      lastTrace: trace,
      totalRuns: 1,
      runtimeFailures: 0,
      compileFailures: 1,
      usedHintTiers: ['think'],
    });
  });

  it('maps repeated w1-m3 sequence and completeness failures to task decomposition support', () => {
    const { trace } = realFourSeasFixture();
    const incomplete = trace.slice(0, 4);
    const rejected = [trace[1]];
    let session = createMissionSession('w1-m3', NOW);
    session = recordRun(session, runFourSeasRegalia(incomplete), incomplete, NOW);
    session = recordRun(session, runFourSeasRegalia(incomplete), incomplete, LATER);
    session = recordRun(session, runFourSeasRegalia(rejected), rejected, LATER);
    session = recordRun(session, runFourSeasRegalia(rejected), rejected, LATER);
    expect(getSessionSupport(session, 'w1-m3')).toContain('任务分解');
  });
  it('creates a mission-specific empty ruyi session without changing V3 JSON field names', () => {
    const session = createMissionSession('w1-m2', NOW);
    expectTypeOf(session).toEqualTypeOf<RuyiStaffMissionSession>();
    expect(session).toEqual({
      workspace: { version: 1, blocks: [] },
      lastTrace: [],
      lastRun: null,
      totalRuns: 0,
      runtimeFailures: 0,
      compileFailures: 0,
      usedHintTiers: [],
      conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
      lastRunAt: null,
      savedAt: NOW,
    });
  });

  it('creates either mission from its id alone at the deterministic epoch with exact static types', () => {
    const dragon = createMissionSession('w1-m1');
    const ruyi = createMissionSession('w1-m2');
    const createFromMissionId = (missionId: ExecutableMissionId) => (
      createMissionSession(missionId)
    );

    expectTypeOf(dragon).toEqualTypeOf<DragonPalaceMissionSession>();
    expectTypeOf(ruyi).toEqualTypeOf<RuyiStaffMissionSession>();
    expectTypeOf(createFromMissionId).returns.toEqualTypeOf<MissionSession>();
    expect(dragon.savedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(ruyi.savedAt).toBe('1970-01-01T00:00:00.000Z');
    expect(dragon.workspace.blocks).toEqual([]);
    expect(ruyi.workspace.blocks).toEqual([]);
    expect(createFromMissionId('w1-m2').savedAt).toBe('1970-01-01T00:00:00.000Z');
  });

  it('keeps legacy timestamp-only and explicit mission-plus-time factory calls compatible', () => {
    expect(createMissionSession(NOW).savedAt).toBe(NOW);
    expect(createMissionSession('w1-m1', LATER).savedAt).toBe(LATER);
    expect(createMissionSession('w1-m2', LATER).savedAt).toBe(LATER);
  });

  it('keeps mission drafts, traces, and runs statically isolated', () => {
    const dragon = createMissionSession('w1-m1', NOW);
    const ruyi = createMissionSession('w1-m2', NOW);
    const dragonDraft: WorkspaceDraftV1 = { version: 1, blocks: [] };
    const ruyiDraft: RuyiWorkspaceDraftV1 = { version: 1, blocks: [] };
    const dragonResult = runDragonPalaceBattle(completeTrace);
    const ruyiResult = runRuyiStaffBattle(ruyiTrace);

    if (false) {
      // @ts-expect-error Dragon sessions cannot accept a Ruyi workspace.
      updateWorkspaceDraft(dragon, ruyiDraft, NOW);
      // @ts-expect-error Ruyi sessions cannot accept a Dragon workspace.
      updateWorkspaceDraft(ruyi, dragonDraft, NOW);
      // @ts-expect-error Dragon sessions cannot store a Ruyi run and trace.
      recordRun(dragon, ruyiResult, ruyiTrace, NOW);
      // @ts-expect-error Ruyi sessions cannot store a Dragon run and trace.
      recordRun(ruyi, dragonResult, completeTrace, NOW);
    }

    expect(dragon.workspace).toEqual(dragonDraft);
    expect(ruyi.workspace).toEqual(ruyiDraft);
  });

  it('stores a typed ruyi draft and canonical run with deep isolation', () => {
    const draft: RuyiWorkspaceDraftV1 = {
      version: 1,
      blocks: [{ id: 'inspect', type: 'xiyou_inspect_weights', nextId: null, x: 1, y: 2 }],
    };
    const withDraft = updateWorkspaceDraft(createMissionSession('w1-m2', NOW), draft, NOW);
    const result = runRuyiStaffBattle(ruyiTrace);
    const recorded = recordRun(withDraft, result, ruyiTrace, LATER);

    expectTypeOf(recorded).toEqualTypeOf<RuyiStaffMissionSession>();
    expect(recorded).toMatchObject({ totalRuns: 1, runtimeFailures: 0, workspace: draft });
    expect(recorded.lastTrace).toEqual(ruyiTrace);
    expect(recorded.lastRun).toEqual(result);
    draft.blocks[0].id = 'mutated';
    result.events[0].messageCode = 'mutated';
    expect(recorded.workspace.blocks[0].id).toBe('inspect');
    expect(recorded.lastRun?.events[0].messageCode).toBe('ruyi-staff.run-started');
  });

  it('counts repeated wrong-weapon selections as runtime failures and numeric-comparison support', () => {
    const first = recordRun(
      createMissionSession('w1-m2', NOW),
      runRuyiStaffBattle(wrongWeaponTrace),
      wrongWeaponTrace,
      NOW,
    );
    const second = recordRun(first, runRuyiStaffBattle(wrongWeaponTrace), wrongWeaponTrace, LATER);

    expect(second).toMatchObject({
      totalRuns: 2,
      runtimeFailures: 2,
      conceptFailures: { sequencePrecondition: 2 },
    });
    expect(getSessionSupport(second, 'w1-m2')).toContain('数值比较');
    expect(getSessionSupport(second, 'w1-m2')).not.toContain('顺序与前置条件');
  });
  it('creates the exact empty evidence baseline at the supplied canonical time', () => {
    expect(createMissionSession(NOW)).toEqual({
      workspace: { version: 1, blocks: [] },
      lastTrace: [],
      lastRun: null,
      totalRuns: 0,
      runtimeFailures: 0,
      compileFailures: 0,
      usedHintTiers: [],
      conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
      lastRunAt: null,
      savedAt: NOW,
    });
  });

  it('updates only the draft and save time while deeply isolating mutable input', () => {
    const initial = recordRun(
      createMissionSession(NOW),
      runDragonPalaceBattle(completeTrace),
      completeTrace,
      NOW,
    );
    const before = structuredClone(initial);
    const workspace: WorkspaceDraftV1 = {
      version: 1,
      blocks: [{ id: 'draft-enter', type: 'xiyou_enter_palace', nextId: null, x: 12, y: 24 }],
    };

    const updated = updateWorkspaceDraft(initial, workspace, LATER);

    expect(initial).toEqual(before);
    expect(updated).not.toBe(initial);
    expect(updated.workspace).not.toBe(workspace);
    expect(updated.lastTrace).not.toBe(initial.lastTrace);
    expect(updated.lastRun).not.toBe(initial.lastRun);
    expect(updated).toMatchObject({
      workspace,
      lastTrace: before.lastTrace,
      lastRun: before.lastRun,
      totalRuns: 1,
      runtimeFailures: 0,
      compileFailures: 0,
      savedAt: LATER,
    });

    workspace.blocks[0].id = 'mutated-outside';
    expect(updated.workspace.blocks[0].id).toBe('draft-enter');
  });

  it('records a compile failure without pretending the engine started', () => {
    const initial = createMissionSession(NOW);
    const updated = recordCompileFailure(initial, 'program-structure', LATER);

    expect(updated).toMatchObject({
      compileFailures: 1,
      totalRuns: 0,
      runtimeFailures: 0,
      conceptFailures: { programStructure: 1, sequencePrecondition: 0, completeness: 0 },
      lastRunAt: null,
      savedAt: LATER,
    });
    expect(initial.compileFailures).toBe(0);
  });

  it('counts every started engine run and stores completed evidence without a failure', () => {
    const initial = createMissionSession(NOW);
    const result = runDragonPalaceBattle(completeTrace);
    const traceInput = structuredClone(completeTrace);
    const resultInput = structuredClone(result);

    const updated = recordRun(initial, resultInput, traceInput, LATER);

    expect(updated).toMatchObject({
      totalRuns: 1,
      runtimeFailures: 0,
      conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
      lastRunAt: LATER,
      savedAt: LATER,
    });
    expect(updated.lastTrace).toEqual(completeTrace);
    expect(updated.lastRun).toEqual(result);
    expect(updated.lastTrace).not.toBe(traceInput);
    expect(updated.lastRun).not.toBe(resultInput);

    traceInput[0].opcode = 'test_weapon';
    resultInput.events[0].messageCode = 'mutated-outside';
    expect(updated.lastTrace[0].opcode).toBe('enter_palace');
    expect(updated.lastRun?.events[0].messageCode).toBe('dragon-palace.run-started');
  });

  it('maps typed instruction rejection to runtime and sequence-precondition failures', () => {
    const updated = recordRun(
      createMissionSession(NOW),
      runDragonPalaceBattle(rejectedTrace),
      rejectedTrace,
      LATER,
    );

    expect(updated).toMatchObject({
      totalRuns: 1,
      runtimeFailures: 1,
      conceptFailures: { programStructure: 0, sequencePrecondition: 1, completeness: 0 },
    });
  });

  it('maps typed incomplete-program diagnostics to runtime and completeness failures', () => {
    const updated = recordRun(
      createMissionSession(NOW),
      runDragonPalaceBattle(incompleteTrace),
      incompleteTrace,
      LATER,
    );

    expect(updated).toMatchObject({
      totalRuns: 1,
      runtimeFailures: 1,
      conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 1 },
    });
  });

  it('records each hint tier once while treating a repeated expansion as a saveable user action', () => {
    const initial = createMissionSession(NOW);
    const once = recordHint(initial, 'observe', NOW);
    const twice = recordHint(once, 'observe', LATER);

    expect(once.usedHintTiers).toEqual(['observe']);
    expect(twice.usedHintTiers).toEqual(['observe']);
    expect(twice.usedHintTiers).not.toBe(once.usedHintTiers);
    expect(twice.savedAt).toBe(LATER);
    expect(initial.usedHintTiers).toEqual([]);
  });

  it.each([
    ['programStructure', '程序结构'],
    ['sequencePrecondition', '顺序与前置条件'],
    ['completeness', '完整性检查'],
  ] as const)('marks %s only at the two-failure boundary', (field, label) => {
    const initial = createMissionSession(NOW);
    expect(getSessionSupport({
      ...initial,
      conceptFailures: { ...initial.conceptFailures, [field]: 1 },
    })).not.toContain(label);
    expect(getSessionSupport({
      ...initial,
      conceptFailures: { ...initial.conceptFailures, [field]: 2 },
    })).toContain(label);
  });

  it('marks multiple distinct hint tiers only at the two-tier boundary', () => {
    const initial = createMissionSession(NOW);
    expect(getSessionSupport({ ...initial, usedHintTiers: ['observe'] })).toEqual([]);
    expect(getSessionSupport({ ...initial, usedHintTiers: ['observe', 'think'] }))
      .toContain('使用了多个提示层级');
  });

  it('returns stable, ordered, duplicate-free support labels', () => {
    const initial = createMissionSession(NOW);
    expect(getSessionSupport({
      ...initial,
      usedHintTiers: ['observe', 'think', 'partial'],
      conceptFailures: { programStructure: 2, sequencePrecondition: 3, completeness: 2 },
    })).toEqual(['程序结构', '顺序与前置条件', '完整性检查', '使用了多个提示层级']);
  });

  it.each([
    ['compileFailures', (session: DragonPalaceMissionSession) => {
      session.compileFailures = Number.MAX_SAFE_INTEGER;
      return () => recordCompileFailure(session, 'program-structure', LATER);
    }],
    ['programStructure', (session: DragonPalaceMissionSession) => {
      session.conceptFailures.programStructure = Number.MAX_SAFE_INTEGER;
      return () => recordCompileFailure(session, 'program-structure', LATER);
    }],
    ['totalRuns', (session: DragonPalaceMissionSession) => {
      session.totalRuns = Number.MAX_SAFE_INTEGER;
      return () => recordRun(session, runDragonPalaceBattle(completeTrace), completeTrace, LATER);
    }],
    ['runtimeFailures', (session: DragonPalaceMissionSession) => {
      session.runtimeFailures = Number.MAX_SAFE_INTEGER;
      return () => recordRun(session, runDragonPalaceBattle(rejectedTrace), rejectedTrace, LATER);
    }],
    ['sequencePrecondition', (session: DragonPalaceMissionSession) => {
      session.conceptFailures.sequencePrecondition = Number.MAX_SAFE_INTEGER;
      return () => recordRun(session, runDragonPalaceBattle(rejectedTrace), rejectedTrace, LATER);
    }],
    ['completeness', (session: DragonPalaceMissionSession) => {
      session.conceptFailures.completeness = Number.MAX_SAFE_INTEGER;
      return () => recordRun(session, runDragonPalaceBattle(incompleteTrace), incompleteTrace, LATER);
    }],
  ] as const)('rejects %s overflow without mutating the input', (_field, arrange) => {
    const session = createMissionSession(NOW);
    const action = arrange(session);
    const before = structuredClone(session);
    expect(action).toThrow(/安全范围/);
    expect(session).toEqual(before);
  });

  it.each([
    '2026-07-15T06:00:00Z',
    '2026-07-15T14:00:00.000+08:00',
    '2026-02-30T00:00:00.000Z',
    'not-a-date',
  ])('rejects non-canonical timestamps: %s', (invalidNow) => {
    const initial = createMissionSession(NOW);
    expect(() => createMissionSession(invalidNow)).toThrow(/ISO UTC/);
    expect(() => updateWorkspaceDraft(initial, { version: 1, blocks: [] }, invalidNow)).toThrow(/ISO UTC/);
    expect(() => recordCompileFailure(initial, 'program-structure', invalidNow)).toThrow(/ISO UTC/);
    expect(() => recordRun(initial, runDragonPalaceBattle(completeTrace), completeTrace, invalidNow)).toThrow(/ISO UTC/);
    expect(() => recordHint(initial, 'observe', invalidNow)).toThrow(/ISO UTC/);
  });
});
