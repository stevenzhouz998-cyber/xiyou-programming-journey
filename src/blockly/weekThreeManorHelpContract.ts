export const MANOR_HELP_MISSION_ID = 'w3-m1' as const;

export const MANOR_HELP_BLOCK_TYPES = [
  'w3_manor_receive_message',
  'w3_manor_if_message',
  'w3_manor_condition_explicit_demon_help',
  'w3_manor_condition_mentions_gao_manor',
  'w3_manor_accept_and_return_notice',
  'w3_manor_continue_journey',
] as const;

export type ManorHelpBlockType = typeof MANOR_HELP_BLOCK_TYPES[number];
export type ManorHelpBranch = 'then' | 'else';
export type ManorHelpConditionKind = 'explicit-demon-help' | 'mentions-gao-manor';
export type ManorHelpOpcode = 'receive-message' | 'condition-checked' | 'accept-and-return-notice' | 'continue-journey';

export interface ManorHelpWorkspaceBlock {
  id: string;
  type: ManorHelpBlockType;
  previousId: string | null;
  nextId: string | null;
  parentBlockId: string | null;
  conditionBlockId: string | null;
  branch: ManorHelpBranch | null;
  x: number;
  y: number;
}

export interface ManorHelpWorkspaceDraftV1 {
  version: 1;
  missionId: typeof MANOR_HELP_MISSION_ID;
  blocks: ManorHelpWorkspaceBlock[];
}

export interface ManorHelpScenario {
  scenarioId: 'canon-gaocai-help' | 'practice-manor-directions';
  isCanon: boolean;
  mentionsGaoManor: boolean;
  explicitDemonHelp: boolean;
  expectedBranch: ManorHelpBranch;
  expectedAction: Extract<ManorHelpOpcode, 'accept-and-return-notice' | 'continue-journey'>;
  evidenceCode: string;
  evidenceTextKey: string;
}

const CANONICAL_MANOR_HELP_SCENARIOS = Object.freeze([
  Object.freeze({
    scenarioId: 'canon-gaocai-help', isCanon: true, mentionsGaoManor: true, explicitDemonHelp: true,
    expectedBranch: 'then', expectedAction: 'accept-and-return-notice',
    evidenceCode: 'canon-gaocai-explicit-demon-help', evidenceTextKey: 'manor-help.canon.explicit-demon-help',
  }),
  Object.freeze({
    scenarioId: 'practice-manor-directions', isCanon: false, mentionsGaoManor: true, explicitDemonHelp: false,
    expectedBranch: 'else', expectedAction: 'continue-journey',
    evidenceCode: 'practice-no-explicit-demon-help', evidenceTextKey: 'manor-help.practice.no-explicit-demon-help',
  }),
] as const);

export const MANOR_HELP_SCENARIOS: readonly Readonly<ManorHelpScenario>[] = CANONICAL_MANOR_HELP_SCENARIOS;

export interface ManorHelpInstruction {
  instructionId: string;
  scenarioId: ManorHelpScenario['scenarioId'];
  opcode: ManorHelpOpcode;
  sourceBlockId: string;
  parentBlockId: string | null;
  conditionSourceBlockId: string;
  conditionKind: ManorHelpConditionKind;
  conditionLabel: string;
  observedValue: boolean;
  evidenceCode: string;
  evidenceTextKey: string;
  actualBranch: ManorHelpBranch;
}

export interface ManorHelpScenarioResult {
  scenarioId: ManorHelpScenario['scenarioId'];
  observedValue: boolean;
  actualBranch: ManorHelpBranch;
  actionOpcode: Extract<ManorHelpOpcode, 'accept-and-return-notice' | 'continue-journey'> | null;
  passed: boolean;
}

export interface ManorHelpFailureSnapshot {
  snapshotId: string;
  conditionSourceBlockId: string;
  conditionKind: ManorHelpConditionKind;
  conditionLabel: string;
  scenarioId: ManorHelpScenario['scenarioId'];
  observedValue: boolean;
  evidenceCode: string;
  evidenceTextKey: string;
  branch: ManorHelpBranch;
}

export interface ManorHelpDiagnostic {
  concept: 'condition-selection' | 'branch-routing' | 'invalid-trace';
  sourceBlockId: string;
  messageCode: string;
}

export interface ManorHelpRuntimeEvent {
  type: 'run-started' | 'message-received' | 'condition-observed' | 'action-selected' | 'scenario-settled' | 'run-finished';
  scenarioId: ManorHelpScenario['scenarioId'] | null;
  opcode: ManorHelpOpcode | null;
  sourceBlockId: string | null;
  parentBlockId: string | null;
  conditionSourceBlockId: string | null;
  conditionKind: ManorHelpConditionKind | null;
  conditionLabel: string | null;
  observedValue: boolean | null;
  evidenceCode: string | null;
  evidenceTextKey: string | null;
  actualBranch: ManorHelpBranch | null;
}

export interface ManorHelpRunResult {
  completed: boolean;
  scenarioResults: ManorHelpScenarioResult[];
  diagnostic: ManorHelpDiagnostic | null;
  failureSnapshot: ManorHelpFailureSnapshot | null;
  events: ManorHelpRuntimeEvent[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

export const MAX_MANOR_HELP_BLOCKS = 100;
export const MAX_MANOR_HELP_BLOCK_ID_LENGTH = 128;
const MAX_COORDINATE = 10_000;

export class ManorHelpGraphError extends Error {
  constructor(readonly code: string, readonly sourceBlockId: string) {
    super(code);
    this.name = 'ManorHelpGraphError';
  }
}

const definition = {
  w3_manor_receive_message: { scope: 'top', opcode: 'receive-message' },
  w3_manor_if_message: { scope: 'top' },
  w3_manor_condition_explicit_demon_help: { scope: 'condition', kind: 'explicit-demon-help', label: '口信是在明确请求降妖帮助' },
  w3_manor_condition_mentions_gao_manor: { scope: 'condition', kind: 'mentions-gao-manor', label: '口信提到了高老庄' },
  w3_manor_accept_and_return_notice: { scope: 'action', opcode: 'accept-and-return-notice' },
  w3_manor_continue_journey: { scope: 'action', opcode: 'continue-journey' },
} as const;

const error = (code: string, sourceBlockId: string): never => { throw new ManorHelpGraphError(code, sourceBlockId); };
const fallbackId = (draft: ManorHelpWorkspaceDraftV1) => draft.blocks[0]?.id ?? 'workspace';
const isBlockType = (value: string): value is ManorHelpBlockType => Object.prototype.hasOwnProperty.call(definition, value);
const isConditionType = (type: ManorHelpBlockType) => definition[type].scope === 'condition';
const isActionType = (type: ManorHelpBlockType) => definition[type].scope === 'action';
const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const isWorkspaceBlockRecord = (value: unknown): value is ManorHelpWorkspaceBlock => isPlainRecord(value)
  && typeof value.id === 'string'
  && typeof value.type === 'string'
  && isNullableString(value.previousId)
  && isNullableString(value.nextId)
  && isNullableString(value.parentBlockId)
  && isNullableString(value.conditionBlockId)
  && (value.branch === null || value.branch === 'then' || value.branch === 'else')
  && typeof value.x === 'number'
  && typeof value.y === 'number';
const isInstructionRecord = (value: unknown): value is ManorHelpInstruction => isPlainRecord(value)
  && typeof value.instructionId === 'string'
  && typeof value.scenarioId === 'string'
  && typeof value.opcode === 'string'
  && typeof value.sourceBlockId === 'string'
  && isNullableString(value.parentBlockId)
  && typeof value.conditionSourceBlockId === 'string'
  && typeof value.conditionKind === 'string'
  && typeof value.conditionLabel === 'string'
  && typeof value.observedValue === 'boolean'
  && typeof value.evidenceCode === 'string'
  && typeof value.evidenceTextKey === 'string'
  && typeof value.actualBranch === 'string';

export function createDefaultManorHelpDraft(): ManorHelpWorkspaceDraftV1 {
  return {
    version: 1,
    missionId: MANOR_HELP_MISSION_ID,
    blocks: [
      { id: 'manor-root', type: 'w3_manor_receive_message', previousId: null, nextId: 'manor-if', parentBlockId: null, conditionBlockId: null, branch: null, x: 48, y: 40 },
      { id: 'manor-if', type: 'w3_manor_if_message', previousId: 'manor-root', nextId: null, parentBlockId: null, conditionBlockId: 'manor-condition', branch: null, x: 48, y: 104 },
      { id: 'manor-condition', type: 'w3_manor_condition_mentions_gao_manor', previousId: null, nextId: null, parentBlockId: 'manor-if', conditionBlockId: null, branch: null, x: 304, y: 104 },
      { id: 'manor-then', type: 'w3_manor_accept_and_return_notice', previousId: null, nextId: null, parentBlockId: 'manor-if', conditionBlockId: null, branch: 'then', x: 96, y: 184 },
      { id: 'manor-else', type: 'w3_manor_continue_journey', previousId: null, nextId: null, parentBlockId: 'manor-if', conditionBlockId: null, branch: 'else', x: 96, y: 256 },
    ],
  };
}

export function validateManorHelpDraft(draft: unknown): asserts draft is ManorHelpWorkspaceDraftV1 {
  if (!isPlainRecord(draft) || draft.version !== 1 || draft.missionId !== MANOR_HELP_MISSION_ID || !Array.isArray(draft.blocks) || !draft.blocks.every(isWorkspaceBlockRecord)) error('invalid-draft', 'workspace');
  const parsed = draft as ManorHelpWorkspaceDraftV1;
  if (parsed.blocks.length === 0) error('empty-workspace', 'workspace');
  if (parsed.blocks.length > MAX_MANOR_HELP_BLOCKS) error('too-many-blocks', fallbackId(parsed));

  const byId = new Map<string, ManorHelpWorkspaceBlock>();
  for (const block of parsed.blocks) {
    if (!block.id || block.id.length > MAX_MANOR_HELP_BLOCK_ID_LENGTH) error('invalid-id', block.id || fallbackId(parsed));
    if (byId.has(block.id)) error('duplicate-id', block.id);
    if (!isBlockType(block.type)) error('unknown-type', block.id);
    if (!Number.isFinite(block.x) || !Number.isFinite(block.y)) error('invalid-coordinate', block.id);
    if (Math.abs(block.x) > MAX_COORDINATE || Math.abs(block.y) > MAX_COORDINATE) error('coordinate-out-of-bounds', block.id);
    byId.set(block.id, block);
  }

  for (const block of byId.values()) {
    for (const reference of [block.previousId, block.nextId, block.parentBlockId, block.conditionBlockId]) {
      if (reference !== null && !byId.has(reference)) error('unknown-reference', block.id);
    }
    if (isConditionType(block.type) && (block.previousId !== null || block.nextId !== null || block.conditionBlockId !== null || block.branch !== null || block.parentBlockId === null)) error('condition-shape', block.id);
    if (isActionType(block.type) && block.parentBlockId === null) error('orphan-block', block.id);
  }

  const receive = [...byId.values()].filter((block) => block.type === 'w3_manor_receive_message');
  const ifBlocks = [...byId.values()].filter((block) => block.type === 'w3_manor_if_message');
  if (receive.length !== 1) error(receive.length === 0 ? 'missing-root' : 'duplicate-root', receive[1]?.id ?? fallbackId(parsed));
  if (ifBlocks.length !== 1) error(ifBlocks.length === 0 ? 'missing-if' : 'duplicate-if', ifBlocks[1]?.id ?? fallbackId(parsed));

  const conditionBlocks = [...byId.values()].filter((block) => isConditionType(block.type));
  if (conditionBlocks.length !== 1) error(conditionBlocks.length === 0 ? 'missing-condition' : 'duplicate-condition', conditionBlocks[1]?.id ?? ifBlocks[0].id);

  for (const block of byId.values()) {
    if (block.previousId !== null && byId.get(block.previousId)!.nextId !== block.id) error('nonreciprocal-link', block.id);
    if (block.nextId !== null && byId.get(block.nextId)!.previousId !== block.id) error('nonreciprocal-link', block.nextId);
    if (block.nextId !== null && byId.get(block.nextId)!.parentBlockId !== block.parentBlockId) error('cross-container-link', block.id);
    if (block.nextId !== null && block.parentBlockId !== null && block.branch !== byId.get(block.nextId)!.branch) error('cross-container-link', block.id);
  }
  for (const start of byId.values()) {
    const seen = new Set<string>();
    for (let current: ManorHelpWorkspaceBlock = start; ; current = byId.get(current.nextId)!) {
      if (seen.has(current.id)) error('cycle', current.id);
      seen.add(current.id);
      if (current.nextId === null) break;
    }
  }

  const root = receive[0];
  const ifBlock = ifBlocks[0];
  const condition = conditionBlocks[0];
  const topRoots = [...byId.values()].filter((block) => block.parentBlockId === null && block.previousId === null);
  if (topRoots.length !== 1) error(topRoots.length > 1 ? 'multiple-top-roots' : 'missing-top-root', topRoots[1]?.id ?? root.id);
  if (root.previousId !== null || root.parentBlockId !== null || root.nextId !== ifBlock.id || ifBlock.previousId !== root.id || ifBlock.parentBlockId !== null || ifBlock.nextId !== null || root.conditionBlockId !== null || root.branch !== null || ifBlock.branch !== null) error('wrong-top-order', ifBlock.id);

  const thenBlocks = [...byId.values()].filter((block) => block.parentBlockId === ifBlock.id && block.branch === 'then');
  const elseBlocks = [...byId.values()].filter((block) => block.parentBlockId === ifBlock.id && block.branch === 'else');
  const branchActions = [...byId.values()].filter((block) => isActionType(block.type) && block.parentBlockId === ifBlock.id);
  if (thenBlocks.length !== 1) error(thenBlocks.length === 0 && branchActions.length > 1 ? 'duplicate-branch-action' : thenBlocks.length === 0 ? 'missing-then' : 'duplicate-branch-action', thenBlocks[1]?.id ?? (branchActions.length > 1 ? branchActions[0]?.id : ifBlock.id));
  if (elseBlocks.length !== 1) error(elseBlocks.length === 0 && branchActions.length > 1 ? 'duplicate-branch-action' : elseBlocks.length === 0 ? 'missing-else' : 'duplicate-branch-action', elseBlocks[1]?.id ?? (branchActions.length > 1 ? branchActions[0]?.id : ifBlock.id));
  const thenAction = thenBlocks[0];
  const elseAction = elseBlocks[0];
  if (ifBlock.conditionBlockId !== condition.id || condition.parentBlockId !== ifBlock.id) error('invalid-input-semantics', ifBlock.id);
  if (condition.parentBlockId !== ifBlock.id) error('condition-shape', condition.id);

  for (const action of [thenAction, elseAction]) {
    if (!isActionType(action.type) || action.parentBlockId !== ifBlock.id || action.previousId !== null || action.nextId !== null || action.conditionBlockId !== null) error('action-shape', action.id);
  }
  if (thenAction.type === elseAction.type) error('duplicate-action', elseAction.id);
  if ([...byId.values()].filter((block) => isActionType(block.type)).length !== 2) error('duplicate-action', ifBlock.id);
  if (new Set([...byId.values()].filter((block) => isActionType(block.type)).map((block) => block.type)).size !== 2) error('duplicate-action', elseAction.id);

  const owned = new Set([root.id, ifBlock.id, condition.id, thenAction.id, elseAction.id]);
  if (owned.size !== byId.size) error('orphan-block', [...byId.keys()].find((id) => !owned.has(id))!);
}

const conditionDetails = (block: ManorHelpWorkspaceBlock) => {
  if (block.type === 'w3_manor_condition_explicit_demon_help') return { kind: 'explicit-demon-help' as const, label: definition.w3_manor_condition_explicit_demon_help.label };
  return { kind: 'mentions-gao-manor' as const, label: definition.w3_manor_condition_mentions_gao_manor.label };
};

const actionOpcode = (block: ManorHelpWorkspaceBlock): Extract<ManorHelpOpcode, 'accept-and-return-notice' | 'continue-journey'> => {
  if (block.type === 'w3_manor_accept_and_return_notice') return 'accept-and-return-notice';
  return 'continue-journey';
};

export function compileManorHelpDraft(draft: unknown): ManorHelpInstruction[] {
  validateManorHelpDraft(draft);
  const byId = new Map(draft.blocks.map((block) => [block.id, block]));
  const root = draft.blocks.find((block) => block.type === 'w3_manor_receive_message')!;
  const ifBlock = byId.get(root.nextId!)!;
  const condition = byId.get(ifBlock.conditionBlockId!)!;
  const details = conditionDetails(condition);
  const actions: Record<ManorHelpBranch, ManorHelpWorkspaceBlock> = {
    then: draft.blocks.find((block) => block.parentBlockId === ifBlock.id && block.branch === 'then')!,
    else: draft.blocks.find((block) => block.parentBlockId === ifBlock.id && block.branch === 'else')!,
  };
  const trace: ManorHelpInstruction[] = [];

  for (const scenario of CANONICAL_MANOR_HELP_SCENARIOS) {
    const observedValue = details.kind === 'explicit-demon-help' ? scenario.explicitDemonHelp : scenario.mentionsGaoManor;
    const actualBranch: ManorHelpBranch = observedValue ? 'then' : 'else';
    const base = {
      scenarioId: scenario.scenarioId, conditionSourceBlockId: condition.id, conditionKind: details.kind, conditionLabel: details.label,
      observedValue, evidenceCode: scenario.evidenceCode, evidenceTextKey: scenario.evidenceTextKey, actualBranch,
    };
    trace.push(
      { instructionId: `${scenario.scenarioId}:receive:${root.id}`, opcode: 'receive-message', sourceBlockId: root.id, parentBlockId: null, ...base },
      { instructionId: `${scenario.scenarioId}:condition:${condition.id}`, opcode: 'condition-checked', sourceBlockId: condition.id, parentBlockId: ifBlock.id, ...base },
      { instructionId: `${scenario.scenarioId}:action:${actions[actualBranch].id}`, opcode: actionOpcode(actions[actualBranch]), sourceBlockId: actions[actualBranch].id, parentBlockId: ifBlock.id, ...base },
    );
  }
  return trace;
}

const createPenalty = () => ({ livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const });

function snapshot(instruction: ManorHelpInstruction): ManorHelpFailureSnapshot {
  return {
    snapshotId: `manor-help:${instruction.scenarioId}:${instruction.conditionSourceBlockId}:${instruction.actualBranch}`,
    conditionSourceBlockId: instruction.conditionSourceBlockId, conditionKind: instruction.conditionKind, conditionLabel: instruction.conditionLabel,
    scenarioId: instruction.scenarioId, observedValue: instruction.observedValue, evidenceCode: instruction.evidenceCode,
    evidenceTextKey: instruction.evidenceTextKey, branch: instruction.actualBranch,
  };
}

export function runManorHelp(traceInput: unknown): ManorHelpRunResult {
  const event = (type: ManorHelpRuntimeEvent['type'], instruction: ManorHelpInstruction | null): ManorHelpRuntimeEvent => ({
    type,
    scenarioId: instruction?.scenarioId ?? null,
    opcode: instruction?.opcode ?? null,
    sourceBlockId: instruction?.sourceBlockId ?? null,
    parentBlockId: instruction?.parentBlockId ?? null,
    conditionSourceBlockId: instruction?.conditionSourceBlockId ?? null,
    conditionKind: instruction?.conditionKind ?? null,
    conditionLabel: instruction?.conditionLabel ?? null,
    observedValue: instruction?.observedValue ?? null,
    evidenceCode: instruction?.evidenceCode ?? null,
    evidenceTextKey: instruction?.evidenceTextKey ?? null,
    actualBranch: instruction?.actualBranch ?? null,
  });
  const events: ManorHelpRuntimeEvent[] = [event('run-started', null)];
  const scenarioResults: ManorHelpScenarioResult[] = [];
  const trace = Array.isArray(traceInput) && traceInput.every(isInstructionRecord) ? traceInput : null;
  const invalidTrace = (): ManorHelpRunResult => {
    const sourceBlockId = trace?.find((instruction) => instruction.sourceBlockId.length > 0)?.sourceBlockId ?? 'workspace';
    events.push(event('run-finished', null));
    return { completed: false, scenarioResults, diagnostic: { concept: 'invalid-trace', sourceBlockId, messageCode: 'manor-help.invalid-trace' }, failureSnapshot: null, events, penalty: createPenalty() };
  };
  const isNonempty = (value: string | null | undefined): value is string => typeof value === 'string' && value.length > 0;
  const isConditionKind = (value: string): value is ManorHelpConditionKind => value === 'explicit-demon-help' || value === 'mentions-gao-manor';
  const isActionOpcode = (value: ManorHelpOpcode): value is Extract<ManorHelpOpcode, 'accept-and-return-notice' | 'continue-journey'> => value === 'accept-and-return-notice' || value === 'continue-journey';
  if (!trace || trace.length !== CANONICAL_MANOR_HELP_SCENARIOS.length * 3) return invalidTrace();

  const firstReceive = trace[0];
  const firstCondition = trace[1];
  if (!firstReceive || !firstCondition || !isNonempty(firstReceive.sourceBlockId) || !isNonempty(firstCondition.sourceBlockId) || !isNonempty(firstCondition.parentBlockId) || !isNonempty(firstCondition.conditionSourceBlockId) || !isConditionKind(firstCondition.conditionKind)) return invalidTrace();
  const rootSourceBlockId = firstReceive.sourceBlockId;
  const ifParentBlockId = firstCondition.parentBlockId;
  const conditionSourceBlockId = firstCondition.conditionSourceBlockId;
  const conditionKind = firstCondition.conditionKind;
  const conditionLabel = conditionKind === 'explicit-demon-help'
    ? definition.w3_manor_condition_explicit_demon_help.label
    : definition.w3_manor_condition_mentions_gao_manor.label;

  for (const [scenarioIndex, scenario] of CANONICAL_MANOR_HELP_SCENARIOS.entries()) {
    const receive = trace[scenarioIndex * 3];
    const checked = trace[scenarioIndex * 3 + 1];
    const action = trace[scenarioIndex * 3 + 2];
    const expectedObservedValue = conditionKind === 'explicit-demon-help' ? scenario.explicitDemonHelp : scenario.mentionsGaoManor;
    const expectedBranch: ManorHelpBranch = expectedObservedValue ? 'then' : 'else';
    if (
      !receive || !checked || !action
      || receive.scenarioId !== scenario.scenarioId || checked.scenarioId !== scenario.scenarioId || action.scenarioId !== scenario.scenarioId
      || receive.opcode !== 'receive-message' || checked.opcode !== 'condition-checked' || !isActionOpcode(action.opcode)
      || !isNonempty(receive.sourceBlockId) || !isNonempty(checked.sourceBlockId) || !isNonempty(action.sourceBlockId)
      || receive.sourceBlockId !== rootSourceBlockId || receive.parentBlockId !== null
      || checked.sourceBlockId !== conditionSourceBlockId || checked.conditionSourceBlockId !== conditionSourceBlockId || checked.parentBlockId !== ifParentBlockId
      || action.parentBlockId !== ifParentBlockId || action.conditionSourceBlockId !== conditionSourceBlockId
      || receive.conditionSourceBlockId !== conditionSourceBlockId
      || receive.conditionKind !== conditionKind || checked.conditionKind !== conditionKind || action.conditionKind !== conditionKind
      || receive.conditionLabel !== conditionLabel || checked.conditionLabel !== conditionLabel || action.conditionLabel !== conditionLabel
      || receive.observedValue !== expectedObservedValue || checked.observedValue !== expectedObservedValue || action.observedValue !== expectedObservedValue
      || receive.actualBranch !== expectedBranch || checked.actualBranch !== expectedBranch || action.actualBranch !== expectedBranch
      || receive.evidenceCode !== scenario.evidenceCode || checked.evidenceCode !== scenario.evidenceCode || action.evidenceCode !== scenario.evidenceCode
      || receive.evidenceTextKey !== scenario.evidenceTextKey || checked.evidenceTextKey !== scenario.evidenceTextKey || action.evidenceTextKey !== scenario.evidenceTextKey
      || receive.instructionId !== `${scenario.scenarioId}:receive:${rootSourceBlockId}`
      || checked.instructionId !== `${scenario.scenarioId}:condition:${conditionSourceBlockId}`
      || action.instructionId !== `${scenario.scenarioId}:action:${action.sourceBlockId}`
    ) return invalidTrace();

    const selectedActionOpcode = action.opcode as Extract<ManorHelpOpcode, 'accept-and-return-notice' | 'continue-journey'>;
    events.push(event('message-received', receive), event('condition-observed', checked), event('action-selected', action));
    const fail = (instruction: ManorHelpInstruction, concept: Extract<ManorHelpDiagnostic['concept'], 'condition-selection' | 'branch-routing'>, sourceBlockId: string): ManorHelpRunResult => {
      scenarioResults.push({ scenarioId: scenario.scenarioId, observedValue: checked.observedValue, actualBranch: checked.actualBranch, actionOpcode: selectedActionOpcode, passed: false });
      events.push(event('scenario-settled', action), event('run-finished', null));
      return { completed: false, scenarioResults, diagnostic: { concept, sourceBlockId, messageCode: `manor-help.${concept}` }, failureSnapshot: snapshot(instruction), events, penalty: createPenalty() };
    };
    if (checked.actualBranch !== scenario.expectedBranch) return fail(checked, 'condition-selection', checked.conditionSourceBlockId);
    if (action.opcode !== scenario.expectedAction) return fail(action, 'branch-routing', action.sourceBlockId);
    scenarioResults.push({ scenarioId: scenario.scenarioId, observedValue: checked.observedValue, actualBranch: checked.actualBranch, actionOpcode: selectedActionOpcode, passed: true });
    events.push(event('scenario-settled', action));
  }
  events.push(event('run-finished', null));
  return { completed: scenarioResults.length === CANONICAL_MANOR_HELP_SCENARIOS.length && scenarioResults.every((result) => result.passed), scenarioResults, diagnostic: null, failureSnapshot: null, events, penalty: createPenalty() };
}
