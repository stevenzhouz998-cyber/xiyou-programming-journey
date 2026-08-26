import { describe, expect, it } from 'vitest';
import {
  MANOR_HELP_BLOCK_TYPES,
  MANOR_HELP_MISSION_ID,
  MANOR_HELP_SCENARIOS,
  MAX_MANOR_HELP_BLOCKS,
  MAX_MANOR_HELP_BLOCK_ID_LENGTH,
  ManorHelpGraphError,
  compileManorHelpDraft,
  createDefaultManorHelpDraft,
  runManorHelp,
  validateManorHelpDraft,
  type ManorHelpWorkspaceDraftV1,
} from './weekThreeManorHelpContract';

const clone = <T,>(value: T): T => structuredClone(value);

function correctDraft(): ManorHelpWorkspaceDraftV1 {
  const draft = createDefaultManorHelpDraft();
  const condition = draft.blocks.find((block) => block.type === 'w3_manor_condition_mentions_gao_manor')!;
  condition.type = 'w3_manor_condition_explicit_demon_help';
  return draft;
}

function changed(mutator: (draft: ManorHelpWorkspaceDraftV1) => void): ManorHelpWorkspaceDraftV1 {
  const draft = clone(createDefaultManorHelpDraft());
  mutator(draft);
  return draft;
}

function graphError(run: () => void, code: string, sourceBlockId: string) {
  try {
    run();
    throw new Error('expected graph error');
  } catch (error) {
    expect(error).toBeInstanceOf(ManorHelpGraphError);
    expect(error).toMatchObject({ code, sourceBlockId });
  }
}

describe('W3-M1 manor help graph contract', () => {
  it('defines exactly the fixed mission, public scenario order, and six block types', () => {
    expect(MANOR_HELP_MISSION_ID).toBe('w3-m1');
    expect(MANOR_HELP_BLOCK_TYPES).toEqual([
      'w3_manor_receive_message',
      'w3_manor_if_message',
      'w3_manor_condition_explicit_demon_help',
      'w3_manor_condition_mentions_gao_manor',
      'w3_manor_accept_and_return_notice',
      'w3_manor_continue_journey',
    ]);
    expect(MANOR_HELP_SCENARIOS).toEqual([
      expect.objectContaining({ scenarioId: 'canon-gaocai-help', mentionsGaoManor: true, explicitDemonHelp: true, expectedBranch: 'then', expectedAction: 'accept-and-return-notice' }),
      expect.objectContaining({ scenarioId: 'practice-manor-directions', mentionsGaoManor: true, explicitDemonHelp: false, expectedBranch: 'else', expectedAction: 'continue-journey', isCanon: false }),
    ]);
  });

  it('exposes deeply frozen scenario facts without letting mutation change default or correct behavior', () => {
    const before = structuredClone(MANOR_HELP_SCENARIOS);
    const defaultBefore = runManorHelp(compileManorHelpDraft(createDefaultManorHelpDraft()));
    const correctBefore = runManorHelp(compileManorHelpDraft(correctDraft()));
    try { (MANOR_HELP_SCENARIOS[0] as unknown as { evidenceCode: string }).evidenceCode = 'forged-evidence'; } catch { /* frozen in strict mode */ }
    try { (MANOR_HELP_SCENARIOS as unknown as Array<unknown>).push({}); } catch { /* frozen in strict mode */ }
    if (MANOR_HELP_SCENARIOS.length !== before.length) (MANOR_HELP_SCENARIOS as unknown as Array<unknown>).pop();
    if (MANOR_HELP_SCENARIOS[0].evidenceCode !== before[0].evidenceCode) (MANOR_HELP_SCENARIOS[0] as unknown as { evidenceCode: string }).evidenceCode = before[0].evidenceCode;
    expect(Object.isFrozen(MANOR_HELP_SCENARIOS)).toBe(true);
    expect(MANOR_HELP_SCENARIOS.every(Object.isFrozen)).toBe(true);
    expect(MANOR_HELP_SCENARIOS).toEqual(before);
    expect(runManorHelp(compileManorHelpDraft(createDefaultManorHelpDraft()))).toEqual(defaultBefore);
    expect(runManorHelp(compileManorHelpDraft(correctDraft()))).toEqual(correctBefore);
  });

  it('starts from one visible graph whose wrong mentions-manor condition fails only the practice message with zero penalty', () => {
    const draft = createDefaultManorHelpDraft();
    expect(draft).toMatchObject({ version: 1, missionId: 'w3-m1' });
    expect(draft.blocks.find((block) => block.type === 'w3_manor_if_message')?.conditionBlockId).toBe('manor-condition');
    expect(draft.blocks.find((block) => block.id === 'manor-condition')?.type).toBe('w3_manor_condition_mentions_gao_manor');

    const result = runManorHelp(compileManorHelpDraft(draft));
    expect(result.scenarioResults).toEqual([
      expect.objectContaining({ scenarioId: 'canon-gaocai-help', observedValue: true, actualBranch: 'then', actionOpcode: 'accept-and-return-notice', passed: true }),
      expect.objectContaining({ scenarioId: 'practice-manor-directions', observedValue: true, actualBranch: 'then', actionOpcode: 'accept-and-return-notice', passed: false }),
    ]);
    expect(result).toMatchObject({
      completed: false,
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
      diagnostic: { concept: 'condition-selection', sourceBlockId: 'manor-condition' },
      failureSnapshot: {
        conditionSourceBlockId: 'manor-condition', conditionKind: 'mentions-gao-manor', scenarioId: 'practice-manor-directions', observedValue: true,
        evidenceCode: 'practice-no-explicit-demon-help', evidenceTextKey: 'manor-help.practice.no-explicit-demon-help', branch: 'then',
      },
    });
  });

  it('compiles one canonical three-instruction trace for each fixed scenario from the connected graph', () => {
    const trace = compileManorHelpDraft(correctDraft());
    expect(trace).toHaveLength(6);
    expect(trace.map((item) => [item.scenarioId, item.opcode])).toEqual([
      ['canon-gaocai-help', 'receive-message'], ['canon-gaocai-help', 'condition-checked'], ['canon-gaocai-help', 'accept-and-return-notice'],
      ['practice-manor-directions', 'receive-message'], ['practice-manor-directions', 'condition-checked'], ['practice-manor-directions', 'continue-journey'],
    ]);
    expect(trace[4]).toMatchObject({
      sourceBlockId: 'manor-condition', parentBlockId: 'manor-if', conditionSourceBlockId: 'manor-condition',
      conditionKind: 'explicit-demon-help', conditionLabel: '口信是在明确请求降妖帮助', observedValue: false,
      evidenceCode: 'practice-no-explicit-demon-help', evidenceTextKey: 'manor-help.practice.no-explicit-demon-help', actualBranch: 'else',
    });
  });

  it('completes only after both scenarios use the explicit-help condition and remains deterministic', () => {
    const trace = compileManorHelpDraft(correctDraft());
    const first = runManorHelp(trace);
    const replay = runManorHelp(clone(trace));
    expect(first).toEqual(replay);
    expect(first).toMatchObject({
      completed: true,
      diagnostic: null,
      failureSnapshot: null,
      scenarioResults: [
        { scenarioId: 'canon-gaocai-help', observedValue: true, actualBranch: 'then', actionOpcode: 'accept-and-return-notice', passed: true },
        { scenarioId: 'practice-manor-directions', observedValue: false, actualBranch: 'else', actionOpcode: 'continue-journey', passed: true },
      ],
    });
  });

  it('derives condition semantics from type and fixed scenario facts, never ids, coordinates, or labels', () => {
    const draft = correctDraft();
    const ids = new Map(draft.blocks.map((block, index) => [block.id, `blockly-random-${index * 19}`]));
    for (const block of draft.blocks) {
      block.id = ids.get(block.id)!;
      block.previousId = block.previousId === null ? null : ids.get(block.previousId)!;
      block.nextId = block.nextId === null ? null : ids.get(block.nextId)!;
      block.parentBlockId = block.parentBlockId === null ? null : ids.get(block.parentBlockId)!;
      block.conditionBlockId = block.conditionBlockId === null ? null : ids.get(block.conditionBlockId)!;
      block.x = -9876.5; block.y = 8765.25;
    }
    const result = runManorHelp(compileManorHelpDraft(draft));
    expect(result).toMatchObject({ completed: true, scenarioResults: [
      { observedValue: true, actualBranch: 'then', passed: true },
      { observedValue: false, actualBranch: 'else', passed: true },
    ] });
  });

  it('treats swapped visible branch actions as routing failure and focuses the action actually run', () => {
    const draft = correctDraft();
    const thenAction = draft.blocks.find((block) => block.branch === 'then')!;
    const elseAction = draft.blocks.find((block) => block.branch === 'else')!;
    [thenAction.type, elseAction.type] = [elseAction.type, thenAction.type];
    const result = runManorHelp(compileManorHelpDraft(draft));
    expect(result).toMatchObject({
      completed: false,
      diagnostic: { concept: 'branch-routing', sourceBlockId: thenAction.id },
      failureSnapshot: { conditionSourceBlockId: 'manor-condition', scenarioId: 'canon-gaocai-help', branch: 'then' },
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
  });

  it('does not complete when only the canonical scenario trace is present', () => {
    const result = runManorHelp(compileManorHelpDraft(correctDraft()).filter((item) => item.scenarioId === 'canon-gaocai-help'));
    expect(result).toMatchObject({ completed: false, diagnostic: { concept: 'invalid-trace', sourceBlockId: 'manor-root' }, failureSnapshot: null });
  });

  it('recomputes observed values from fixed scenario facts instead of trusting a forged trace', () => {
    const trace = compileManorHelpDraft(correctDraft());
    for (const item of trace.filter((item) => item.scenarioId === 'practice-manor-directions')) item.observedValue = true;
    const result = runManorHelp(trace);
    expect(result).toMatchObject({ completed: false, diagnostic: { concept: 'invalid-trace', sourceBlockId: 'manor-root' }, failureSnapshot: null });
  });

  it('rejects two individually plausible scenario segments when they claim different compiled graph provenance', () => {
    const trace = compileManorHelpDraft(correctDraft());
    for (const item of trace.filter((item) => item.scenarioId === 'practice-manor-directions')) {
      item.conditionKind = 'mentions-gao-manor';
      item.conditionLabel = '口信提到了高老庄';
      item.observedValue = true;
      item.actualBranch = 'then';
      if (item.opcode === 'continue-journey') item.opcode = 'accept-and-return-notice';
    }
    const result = runManorHelp(trace);
    expect(result).toMatchObject({ completed: false, diagnostic: { concept: 'invalid-trace' }, failureSnapshot: null, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  });

  it.each([
    ['receive opcode', (trace: ReturnType<typeof compileManorHelpDraft>) => { trace[0].opcode = 'condition-checked'; }],
    ['condition source', (trace: ReturnType<typeof compileManorHelpDraft>) => { trace[1].sourceBlockId = 'forged-condition'; }],
    ['action parent', (trace: ReturnType<typeof compileManorHelpDraft>) => { trace[2].parentBlockId = 'forged-if'; }],
    ['condition source reference', (trace: ReturnType<typeof compileManorHelpDraft>) => { trace[4].conditionSourceBlockId = 'forged-condition'; }],
    ['instruction id', (trace: ReturnType<typeof compileManorHelpDraft>) => { trace[5].instructionId = 'forged-id'; }],
    ['scenario order', (trace: ReturnType<typeof compileManorHelpDraft>) => { [trace[0], trace[3]] = [trace[3], trace[0]]; }],
    ['trace length', (trace: ReturnType<typeof compileManorHelpDraft>) => { trace.pop(); }],
    ['evidence', (trace: ReturnType<typeof compileManorHelpDraft>) => { trace[3].evidenceCode = 'forged-evidence'; }],
  ])('rejects forged %s without throwing or completing', (_label, mutate) => {
    const trace = compileManorHelpDraft(correctDraft());
    mutate(trace);
    expect(() => runManorHelp(trace)).not.toThrow();
    expect(runManorHelp(trace)).toMatchObject({ completed: false, diagnostic: { concept: 'invalid-trace' }, failureSnapshot: null, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  });

  it('records full instruction provenance in successful and failed runtime events', () => {
    const completed = runManorHelp(compileManorHelpDraft(correctDraft()));
    const successInstructionEvents = completed.events.filter((event) => event.scenarioId !== null && event.type !== 'scenario-settled');
    expect(successInstructionEvents).toHaveLength(6);
    expect(successInstructionEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'message-received', scenarioId: 'canon-gaocai-help', opcode: 'receive-message', sourceBlockId: 'manor-root', parentBlockId: null, conditionSourceBlockId: 'manor-condition', conditionKind: 'explicit-demon-help', observedValue: true, actualBranch: 'then' }),
      expect.objectContaining({ type: 'condition-observed', scenarioId: 'practice-manor-directions', opcode: 'condition-checked', sourceBlockId: 'manor-condition', parentBlockId: 'manor-if', conditionSourceBlockId: 'manor-condition', conditionKind: 'explicit-demon-help', observedValue: false, evidenceCode: 'practice-no-explicit-demon-help', actualBranch: 'else' }),
    ]));
    const failed = runManorHelp(compileManorHelpDraft(createDefaultManorHelpDraft()));
    expect(failed.events.find((event) => event.type === 'condition-observed' && event.scenarioId === 'practice-manor-directions')).toMatchObject({ opcode: 'condition-checked', sourceBlockId: 'manor-condition', parentBlockId: 'manor-if', conditionSourceBlockId: 'manor-condition', conditionKind: 'mentions-gao-manor', conditionLabel: '口信提到了高老庄', observedValue: true, evidenceCode: 'practice-no-explicit-demon-help', evidenceTextKey: 'manor-help.practice.no-explicit-demon-help', actualBranch: 'then' });
  });

  it.each([null, [], {}, { blocks: [] }, { version: 1, missionId: 'w3-m1', blocks: {} }, { version: 1, missionId: 'w3-m1', blocks: [null] }, { version: 1, missionId: 'w3-m1', blocks: [new Date()] }])('fails closed for invalid draft input %#', (value) => {
    graphError(() => validateManorHelpDraft(value), 'invalid-draft', 'workspace');
  });

  it.each([null, {}, [], [null], [42], [new Date()]])('returns a safe invalid trace result for unknown runner input %#', (value) => {
    expect(() => runManorHelp(value)).not.toThrow();
    expect(runManorHelp(value)).toMatchObject({ completed: false, diagnostic: { concept: 'invalid-trace', sourceBlockId: 'workspace' }, failureSnapshot: null, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  });

  it('returns a fresh penalty object so caller mutation cannot affect a later run', () => {
    const first = runManorHelp(compileManorHelpDraft(correctDraft()));
    try { (first.penalty as { livesLost: number }).livesLost = 9; } catch { /* frozen penalty is also acceptable */ }
    const second = runManorHelp(compileManorHelpDraft(correctDraft()));
    expect(second.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
    expect(second.penalty).not.toBe(first.penalty);
  });

  it.each([
    ['empty', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks = []; }, 'empty-workspace', 'workspace'],
    ['too many blocks', (draft: ManorHelpWorkspaceDraftV1) => { while (draft.blocks.length <= MAX_MANOR_HELP_BLOCKS) draft.blocks.push({ ...draft.blocks[0], id: `extra-${draft.blocks.length}` }); }, 'too-many-blocks', 'manor-root'],
    ['long id', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks[0].id = 'x'.repeat(MAX_MANOR_HELP_BLOCK_ID_LENGTH + 1); }, 'invalid-id', 'x'.repeat(MAX_MANOR_HELP_BLOCK_ID_LENGTH + 1)],
    ['unknown type', (draft: ManorHelpWorkspaceDraftV1) => { (draft.blocks[0] as { type: string }).type = 'unknown'; }, 'unknown-type', 'manor-root'],
    ['duplicate id', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks[1].id = draft.blocks[0].id; }, 'duplicate-id', 'manor-root'],
    ['missing reference', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks[0].nextId = 'missing'; }, 'unknown-reference', 'manor-root'],
    ['nonreciprocal connection', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks[1].previousId = null; }, 'nonreciprocal-link', 'manor-if'],
    ['multiple roots', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks[1].previousId = null; draft.blocks[0].nextId = null; }, 'multiple-top-roots', 'manor-if'],
    ['cross-container connection', (draft: ManorHelpWorkspaceDraftV1) => { const action = draft.blocks.find((block) => block.branch === 'then')!; action.nextId = 'manor-root'; draft.blocks[0].previousId = action.id; }, 'cross-container-link', actionId(createDefaultManorHelpDraft(), 'then')],
    ['cycle', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks[1].nextId = 'manor-root'; draft.blocks[0].previousId = 'manor-if'; }, 'cycle', 'manor-root'],
    ['wrong top order', (draft: ManorHelpWorkspaceDraftV1) => { const root = draft.blocks[0]; const ifBlock = draft.blocks[1]; root.type = 'w3_manor_if_message'; root.conditionBlockId = 'manor-condition'; ifBlock.type = 'w3_manor_receive_message'; ifBlock.conditionBlockId = null; }, 'wrong-top-order', 'manor-root'],
    ['missing root', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks[0].type = 'w3_manor_if_message'; draft.blocks[0].conditionBlockId = null; }, 'missing-root', 'manor-root'],
    ['duplicate root', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks.push({ ...draft.blocks[0], id: 'second-root', nextId: null, x: 480 }); }, 'duplicate-root', 'second-root'],
    ['missing if', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks.splice(1, 1); draft.blocks[0].nextId = null; for (const block of draft.blocks.slice(1)) block.parentBlockId = 'manor-root'; }, 'missing-if', 'manor-root'],
    ['duplicate if', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks.push({ ...draft.blocks[1], id: 'second-if', previousId: null, nextId: null, conditionBlockId: 'manor-condition', x: 480 }); }, 'duplicate-if', 'second-if'],
    ['missing required condition', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks.splice(2, 1); draft.blocks.find((block) => block.id === 'manor-if')!.conditionBlockId = null; }, 'missing-condition', 'manor-if'],
    ['duplicate condition', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks.push({ ...draft.blocks[2], id: 'second-condition', x: 480 }); }, 'duplicate-condition', 'second-condition'],
    ['duplicate action', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks.find((block) => block.branch === 'else')!.type = 'w3_manor_accept_and_return_notice'; }, 'duplicate-action', 'manor-else'],
    ['condition wrong shape', (draft: ManorHelpWorkspaceDraftV1) => { const condition = draft.blocks.find((block) => block.id === 'manor-condition')!; condition.previousId = 'manor-root'; }, 'condition-shape', 'manor-condition'],
    ['wrong condition input', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks.find((block) => block.id === 'manor-if')!.conditionBlockId = 'manor-then'; }, 'invalid-input-semantics', 'manor-if'],
    ['missing then', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks.splice(draft.blocks.findIndex((block) => block.branch === 'then'), 1); }, 'missing-then', 'manor-if'],
    ['missing else', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks.splice(draft.blocks.findIndex((block) => block.branch === 'else'), 1); }, 'missing-else', 'manor-if'],
    ['orphan', (draft: ManorHelpWorkspaceDraftV1) => { const action = draft.blocks.find((block) => block.branch === 'then')!; action.parentBlockId = null; action.branch = null; }, 'orphan-block', 'manor-then'],
    ['cross branch connection', (draft: ManorHelpWorkspaceDraftV1) => { const action = draft.blocks.find((block) => block.branch === 'then')!; action.nextId = 'manor-else'; draft.blocks.find((block) => block.id === 'manor-else')!.previousId = action.id; }, 'cross-container-link', 'manor-then'],
    ['action wrong branch field', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks.find((block) => block.id === 'manor-then')!.branch = 'else'; }, 'duplicate-branch-action', 'manor-then'],
    ['condition placed top', (draft: ManorHelpWorkspaceDraftV1) => { const condition = draft.blocks.find((block) => block.id === 'manor-condition')!; condition.parentBlockId = null; }, 'condition-shape', 'manor-condition'],
    ['action placed top', (draft: ManorHelpWorkspaceDraftV1) => { const action = draft.blocks.find((block) => block.id === 'manor-then')!; action.parentBlockId = null; action.branch = null; }, 'orphan-block', 'manor-then'],
    ['invalid coordinates', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks[0].x = Number.NaN; }, 'invalid-coordinate', 'manor-root'],
    ['out of bounds coordinates', (draft: ManorHelpWorkspaceDraftV1) => { draft.blocks[0].y = 10001; }, 'coordinate-out-of-bounds', 'manor-root'],
  ])('rejects %s with a stable focus id', (_label, mutate, code, sourceBlockId) => {
    graphError(() => validateManorHelpDraft(changed(mutate)), code, sourceBlockId);
  });
});

function actionId(draft: ManorHelpWorkspaceDraftV1, branch: 'then' | 'else') {
  return draft.blocks.find((block) => block.branch === branch)!.id;
}
