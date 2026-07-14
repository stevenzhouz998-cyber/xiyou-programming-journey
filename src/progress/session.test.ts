import { describe, expect, it } from 'vitest';
import { runDragonPalaceBattle } from '../battle/dragonPalace';
import type { BattleInstruction } from '../battle/types';
import type { WorkspaceDraftV1 } from '../blockly/draft';
import {
  createMissionSession,
  getSessionSupport,
  recordCompileFailure,
  recordHint,
  recordRun,
  updateWorkspaceDraft,
} from './session';

const NOW = '2026-07-15T06:00:00.000Z';
const LATER = '2026-07-15T06:05:00.000Z';

const completeTrace: BattleInstruction[] = [
  { instructionId: 'instruction:enter', sourceBlockId: 'enter', opcode: 'enter_palace' },
  { instructionId: 'instruction:request', sourceBlockId: 'request', opcode: 'request_weapon' },
  { instructionId: 'instruction:test', sourceBlockId: 'test', opcode: 'test_weapon' },
];

const rejectedTrace: BattleInstruction[] = [
  { instructionId: 'instruction:request-first', sourceBlockId: 'request-first', opcode: 'request_weapon' },
];

const incompleteTrace: BattleInstruction[] = [
  { instructionId: 'instruction:enter-only', sourceBlockId: 'enter-only', opcode: 'enter_palace' },
];

describe('mission session rules', () => {
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
    ['compileFailures', (session: ReturnType<typeof createMissionSession>) => {
      session.compileFailures = Number.MAX_SAFE_INTEGER;
      return () => recordCompileFailure(session, 'program-structure', LATER);
    }],
    ['programStructure', (session: ReturnType<typeof createMissionSession>) => {
      session.conceptFailures.programStructure = Number.MAX_SAFE_INTEGER;
      return () => recordCompileFailure(session, 'program-structure', LATER);
    }],
    ['totalRuns', (session: ReturnType<typeof createMissionSession>) => {
      session.totalRuns = Number.MAX_SAFE_INTEGER;
      return () => recordRun(session, runDragonPalaceBattle(completeTrace), completeTrace, LATER);
    }],
    ['runtimeFailures', (session: ReturnType<typeof createMissionSession>) => {
      session.runtimeFailures = Number.MAX_SAFE_INTEGER;
      return () => recordRun(session, runDragonPalaceBattle(rejectedTrace), rejectedTrace, LATER);
    }],
    ['sequencePrecondition', (session: ReturnType<typeof createMissionSession>) => {
      session.conceptFailures.sequencePrecondition = Number.MAX_SAFE_INTEGER;
      return () => recordRun(session, runDragonPalaceBattle(rejectedTrace), rejectedTrace, LATER);
    }],
    ['completeness', (session: ReturnType<typeof createMissionSession>) => {
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
