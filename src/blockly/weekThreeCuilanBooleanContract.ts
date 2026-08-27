export const CUILAN_BOOLEAN_MISSION_ID = 'w3-m2' as const;

export const CUILAN_BOOLEAN_BLOCK_TYPES = [
  'w3_cuilan_transform',
  'w3_cuilan_if_disguise_ready',
  'w3_cuilan_condition_appearance_matches',
  'w3_cuilan_hold_disguise',
  'w3_cuilan_adjust_transform',
  'w3_cuilan_collect_clue',
  'w3_cuilan_if_identity_reveal',
  'w3_cuilan_condition_identity_is_cuilan',
  'w3_cuilan_continue_disguise',
  'w3_cuilan_reveal_wukong',
] as const;

export type CuilanBooleanBlockType = typeof CUILAN_BOOLEAN_BLOCK_TYPES[number];
export type CuilanCheckpointId = 'disguise-readiness' | 'identity-reveal';
export type CuilanConditionKind = 'appearance-matches-cuilan' | 'identity-is-cuilan';
export type CuilanBranch = 'then' | 'else';
export type CuilanBooleanOpcode = 'transform-as-cuilan' | 'condition-checked' | 'hold-disguise' | 'adjust-transform' | 'collect-clue' | 'continue-disguise' | 'reveal-wukong';
export type CuilanStoryState = 'cuilan-safe' | 'transformed-as-cuilan' | 'disguise-ready' | 'clue-acquired' | 'identity-checked' | 'revealed' | 'demon-fled';

export interface CuilanBooleanWorkspaceBlock {
  id: string;
  type: CuilanBooleanBlockType;
  previousId: string | null;
  nextId: string | null;
  parentBlockId: string | null;
  conditionBlockId: string | null;
  branch: CuilanBranch | null;
  x: number;
  y: number;
}

export interface CuilanBooleanWorkspaceDraftV1 {
  version: 1;
  missionId: typeof CUILAN_BOOLEAN_MISSION_ID;
  blocks: CuilanBooleanWorkspaceBlock[];
}

export interface CuilanBooleanInstruction {
  instructionId: string;
  opcode: CuilanBooleanOpcode;
  sourceBlockId: string;
  parentBlockId: string | null;
  checkpointId: CuilanCheckpointId;
  conditionSourceBlockId: string;
  conditionKind: CuilanConditionKind;
  conditionLabel: string;
  observedValue: boolean;
  evidenceCode: string;
  evidenceTextKey: string;
  actualBranch: CuilanBranch;
}

export interface CuilanCheckpointResult {
  checkpointId: CuilanCheckpointId;
  observedValue: boolean;
  actualBranch: CuilanBranch;
  actionOpcode: CuilanBooleanOpcode;
  passed: boolean;
}

export interface CuilanFailureSnapshot {
  snapshotId: string;
  checkpointId: CuilanCheckpointId;
  conditionSourceBlockId: string;
  conditionKind: CuilanConditionKind;
  conditionLabel: string;
  observedValue: boolean;
  evidenceCode: string;
  evidenceTextKey: string;
  branch: CuilanBranch;
}

export interface CuilanBooleanDiagnostic {
  concept: 'condition-selection' | 'branch-routing' | 'sequence-precondition' | 'invalid-trace';
  sourceBlockId: string;
  messageCode: string;
}

export interface CuilanBooleanRuntimeEvent {
  type: 'run-started' | 'instruction-accepted' | 'run-finished';
  checkpointId: CuilanCheckpointId | null;
  sourceBlockId: string | null;
  parentBlockId: string | null;
  conditionSourceBlockId: string | null;
  conditionKind: CuilanConditionKind | null;
  observedValue: boolean | null;
  actualBranch: CuilanBranch | null;
  opcode: CuilanBooleanOpcode | null;
  state: CuilanStoryState;
}

export interface CuilanBooleanRunResult {
  completed: boolean;
  finalState: CuilanStoryState;
  checkpointResults: CuilanCheckpointResult[];
  diagnostic: CuilanBooleanDiagnostic | null;
  failureSnapshot: CuilanFailureSnapshot | null;
  events: CuilanBooleanRuntimeEvent[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

export const CUILAN_BOOLEAN_CONDITION_LABELS: Readonly<Record<CuilanConditionKind, string>> = {
  'appearance-matches-cuilan': '外形和高翠兰相同',
  'identity-is-cuilan': '真实身份是高翠兰',
};

const evidence: Readonly<Record<CuilanCheckpointId, { code: string; textKey: string }>> = {
  'disguise-readiness': { code: 'gaocuilan-safe-wukong-disguised', textKey: 'cuilan.disguise.appearance-observed' },
  'identity-reveal': { code: 'demon-name-and-yunzhan-cave-clue', textKey: 'cuilan.identity.clue-observed' },
};

const MAX_BLOCKS = 100;
const MAX_ID_LENGTH = 128;
const MAX_COORDINATE = 10_000;
const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const isPlainRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const nullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const conditionForType = (type: CuilanBooleanBlockType): CuilanConditionKind | null => type === 'w3_cuilan_condition_appearance_matches' ? 'appearance-matches-cuilan' : type === 'w3_cuilan_condition_identity_is_cuilan' ? 'identity-is-cuilan' : null;
const isConditionType = (type: CuilanBooleanBlockType): boolean => conditionForType(type) !== null;
const isActionType = (type: CuilanBooleanBlockType): boolean => type === 'w3_cuilan_hold_disguise' || type === 'w3_cuilan_adjust_transform' || type === 'w3_cuilan_continue_disguise' || type === 'w3_cuilan_reveal_wukong';
const isIfType = (type: CuilanBooleanBlockType): boolean => type === 'w3_cuilan_if_disguise_ready' || type === 'w3_cuilan_if_identity_reveal';
const conditionValue = (kind: CuilanConditionKind): boolean => kind === 'appearance-matches-cuilan';
const branchFor = (value: boolean): CuilanBranch => value ? 'then' : 'else';
const penalty = () => ({ livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const });

export class CuilanBooleanGraphError extends Error {
  constructor(readonly code: string, readonly sourceBlockId: string) {
    super(code);
    this.name = 'CuilanBooleanGraphError';
  }
}

const graphError = (code: string, sourceBlockId: string): never => { throw new CuilanBooleanGraphError(code, sourceBlockId); };
const fallbackId = (draft: CuilanBooleanWorkspaceDraftV1) => draft.blocks[0]?.id || 'workspace';
const isWorkspaceBlock = (value: unknown): value is CuilanBooleanWorkspaceBlock => isPlainRecord(value)
  && typeof value.id === 'string' && typeof value.type === 'string'
  && nullableString(value.previousId) && nullableString(value.nextId) && nullableString(value.parentBlockId) && nullableString(value.conditionBlockId)
  && (value.branch === null || value.branch === 'then' || value.branch === 'else')
  && typeof value.x === 'number' && typeof value.y === 'number';

export function createDefaultCuilanBooleanDraft(): CuilanBooleanWorkspaceDraftV1 {
  return { version: 1, missionId: CUILAN_BOOLEAN_MISSION_ID, blocks: [
    { id: 'cuilan-transform', type: 'w3_cuilan_transform', previousId: null, nextId: 'cuilan-disguise-if', parentBlockId: null, conditionBlockId: null, branch: null, x: 40, y: 32 },
    { id: 'cuilan-disguise-if', type: 'w3_cuilan_if_disguise_ready', previousId: 'cuilan-transform', nextId: 'cuilan-collect-clue', parentBlockId: null, conditionBlockId: 'cuilan-ready-condition', branch: null, x: 40, y: 92 },
    { id: 'cuilan-ready-condition', type: 'w3_cuilan_condition_appearance_matches', previousId: null, nextId: null, parentBlockId: 'cuilan-disguise-if', conditionBlockId: null, branch: null, x: 280, y: 92 },
    { id: 'cuilan-hold-disguise', type: 'w3_cuilan_hold_disguise', previousId: null, nextId: null, parentBlockId: 'cuilan-disguise-if', conditionBlockId: null, branch: 'then', x: 92, y: 164 },
    { id: 'cuilan-adjust-transform', type: 'w3_cuilan_adjust_transform', previousId: null, nextId: null, parentBlockId: 'cuilan-disguise-if', conditionBlockId: null, branch: 'else', x: 92, y: 228 },
    { id: 'cuilan-collect-clue', type: 'w3_cuilan_collect_clue', previousId: 'cuilan-disguise-if', nextId: 'cuilan-identity-if', parentBlockId: null, conditionBlockId: null, branch: null, x: 40, y: 292 },
    { id: 'cuilan-identity-if', type: 'w3_cuilan_if_identity_reveal', previousId: 'cuilan-collect-clue', nextId: null, parentBlockId: null, conditionBlockId: 'cuilan-identity-condition', branch: null, x: 40, y: 352 },
    { id: 'cuilan-identity-condition', type: 'w3_cuilan_condition_appearance_matches', previousId: null, nextId: null, parentBlockId: 'cuilan-identity-if', conditionBlockId: null, branch: null, x: 280, y: 352 },
    { id: 'cuilan-continue-disguise', type: 'w3_cuilan_continue_disguise', previousId: null, nextId: null, parentBlockId: 'cuilan-identity-if', conditionBlockId: null, branch: 'then', x: 92, y: 424 },
    { id: 'cuilan-reveal-wukong', type: 'w3_cuilan_reveal_wukong', previousId: null, nextId: null, parentBlockId: 'cuilan-identity-if', conditionBlockId: null, branch: 'else', x: 92, y: 488 },
  ] };
}

export function validateCuilanBooleanDraft(draft: unknown): asserts draft is CuilanBooleanWorkspaceDraftV1 {
  if (!isPlainRecord(draft) || draft.version !== 1 || draft.missionId !== CUILAN_BOOLEAN_MISSION_ID || !Array.isArray(draft.blocks) || !draft.blocks.every(isWorkspaceBlock)) graphError('invalid-draft', 'workspace');
  const parsed = draft as CuilanBooleanWorkspaceDraftV1;
  if (parsed.blocks.length === 0) graphError('empty-workspace', 'workspace');
  if (parsed.blocks.length > MAX_BLOCKS) graphError('too-many-blocks', fallbackId(parsed));
  const byId = new Map<string, CuilanBooleanWorkspaceBlock>();
  for (const block of parsed.blocks) {
    if (!block.id || block.id.length > MAX_ID_LENGTH || byId.has(block.id)) graphError(!block.id || block.id.length > MAX_ID_LENGTH ? 'invalid-id' : 'duplicate-id', block.id || fallbackId(parsed));
    if (!hasOwn(CUILAN_BOOLEAN_BLOCK_TYPES.reduce<Record<string, true>>((map, type) => { map[type] = true; return map; }, {}), block.type)) graphError('unknown-type', block.id);
    if (!Number.isFinite(block.x) || !Number.isFinite(block.y) || Math.abs(block.x) > MAX_COORDINATE || Math.abs(block.y) > MAX_COORDINATE) graphError('invalid-coordinate', block.id);
    byId.set(block.id, block);
  }
  for (const block of byId.values()) {
    for (const ref of [block.previousId, block.nextId, block.parentBlockId, block.conditionBlockId]) if (ref !== null && !byId.has(ref)) graphError('unknown-reference', block.id);
    if (block.previousId && byId.get(block.previousId)!.nextId !== block.id) graphError('nonreciprocal-link', block.id);
    if (block.nextId && byId.get(block.nextId)!.previousId !== block.id) graphError('nonreciprocal-link', block.nextId);
    if (block.nextId && byId.get(block.nextId)!.parentBlockId !== block.parentBlockId) graphError('cross-container-link', block.id);
    if (block.nextId && block.parentBlockId !== null && byId.get(block.nextId)!.branch !== block.branch) graphError('cross-container-link', block.id);
    if (isConditionType(block.type) && (block.parentBlockId === null || block.previousId !== null || block.nextId !== null || block.conditionBlockId !== null || block.branch !== null || !isIfType(byId.get(block.parentBlockId)!.type))) graphError('condition-shape', block.id);
    if (isActionType(block.type) && (block.parentBlockId === null || block.conditionBlockId !== null || block.branch === null || !isIfType(byId.get(block.parentBlockId)!.type))) graphError('action-shape', block.id);
    if (isIfType(block.type) && (block.parentBlockId !== null || block.branch !== null)) graphError('if-shape', block.id);
    if (!isConditionType(block.type) && !isActionType(block.type) && !isIfType(block.type) && (block.parentBlockId !== null || block.conditionBlockId !== null || block.branch !== null)) graphError('top-level-shape', block.id);
  }
  for (const start of byId.values()) {
    const seen = new Set<string>();
    for (let current: CuilanBooleanWorkspaceBlock = start; ; current = byId.get(current.nextId)!) {
      if (seen.has(current.id)) graphError('cycle', current.id);
      seen.add(current.id);
      if (current.nextId === null) break;
    }
  }
  const byType = (type: CuilanBooleanBlockType) => [...byId.values()].filter((block) => block.type === type);
  const one = (type: CuilanBooleanBlockType) => {
    const matches = byType(type);
    if (matches.length !== 1) graphError(matches.length === 0 ? 'missing-required-block' : 'duplicate-required-block', matches[1]?.id ?? fallbackId(parsed));
    return matches[0]!;
  };
  const transform = one('w3_cuilan_transform');
  const disguiseIf = one('w3_cuilan_if_disguise_ready');
  const clue = one('w3_cuilan_collect_clue');
  const identityIf = one('w3_cuilan_if_identity_reveal');
  const hold = one('w3_cuilan_hold_disguise');
  const adjust = one('w3_cuilan_adjust_transform');
  const continueDisguise = one('w3_cuilan_continue_disguise');
  const reveal = one('w3_cuilan_reveal_wukong');
  const conditions = [...byId.values()].filter((block) => isConditionType(block.type));
  if (conditions.length !== 2) graphError(conditions.length < 2 ? 'missing-condition' : 'duplicate-condition', conditions[2]?.id ?? identityIf.id);
  const topRoots = [...byId.values()].filter((block) => block.parentBlockId === null && block.previousId === null);
  if (topRoots.length !== 1) graphError(topRoots.length > 1 ? 'multiple-top-roots' : 'missing-top-root', topRoots[1]?.id ?? transform.id);
  if (transform.parentBlockId !== null || transform.previousId !== null || transform.nextId !== disguiseIf.id || disguiseIf.previousId !== transform.id || disguiseIf.parentBlockId !== null || disguiseIf.nextId !== clue.id || clue.previousId !== disguiseIf.id || clue.parentBlockId !== null || clue.nextId !== identityIf.id || identityIf.previousId !== clue.id || identityIf.parentBlockId !== null || identityIf.nextId !== null) graphError('wrong-top-order', identityIf.id);
  const inspectGate = (gate: CuilanBooleanWorkspaceBlock, expectedThen: CuilanBooleanWorkspaceBlock, expectedElse: CuilanBooleanWorkspaceBlock) => {
    const condition = gate.conditionBlockId ? byId.get(gate.conditionBlockId) : null;
    if (!condition || !isConditionType(condition.type) || condition.parentBlockId !== gate.id) graphError('missing-condition', gate.id);
    if (conditions.filter((item) => item.parentBlockId === gate.id).length !== 1) graphError('condition-ownership', gate.id);
    const thenBlocks = [...byId.values()].filter((item) => item.parentBlockId === gate.id && item.branch === 'then');
    const elseBlocks = [...byId.values()].filter((item) => item.parentBlockId === gate.id && item.branch === 'else');
    if (thenBlocks.length !== 1) graphError(thenBlocks.length ? 'duplicate-branch-action' : 'missing-then', thenBlocks[1]?.id ?? gate.id);
    if (elseBlocks.length !== 1) graphError(elseBlocks.length ? 'duplicate-branch-action' : 'missing-else', elseBlocks[1]?.id ?? gate.id);
    if (thenBlocks[0] !== expectedThen || elseBlocks[0] !== expectedElse) graphError('wrong-branch-action', gate.id);
    for (const action of [expectedThen, expectedElse]) if (action.previousId !== null || action.nextId !== null || action.conditionBlockId !== null || !isActionType(action.type)) graphError('action-shape', action.id);
  };
  inspectGate(disguiseIf, hold, adjust);
  inspectGate(identityIf, continueDisguise, reveal);
  const owned = new Set([transform.id, disguiseIf.id, clue.id, identityIf.id, hold.id, adjust.id, continueDisguise.id, reveal.id, ...conditions.map((item) => item.id)]);
  if (owned.size !== byId.size) graphError('orphan-block', [...byId.keys()].find((id) => !owned.has(id))!);
}

const opcodeForAction = (type: CuilanBooleanBlockType): Extract<CuilanBooleanOpcode, 'hold-disguise' | 'adjust-transform' | 'continue-disguise' | 'reveal-wukong'> => {
  if (type === 'w3_cuilan_hold_disguise') return 'hold-disguise';
  if (type === 'w3_cuilan_adjust_transform') return 'adjust-transform';
  if (type === 'w3_cuilan_continue_disguise') return 'continue-disguise';
  return 'reveal-wukong';
};

const instruction = (opcode: CuilanBooleanOpcode, sourceBlockId: string, parentBlockId: string | null, checkpointId: CuilanCheckpointId, conditionSourceBlockId: string, conditionKind: CuilanConditionKind): CuilanBooleanInstruction => {
  const observedValue = conditionValue(conditionKind);
  const item = evidence[checkpointId];
  return { instructionId: `${checkpointId}:${opcode}:${sourceBlockId}`, opcode, sourceBlockId, parentBlockId, checkpointId, conditionSourceBlockId, conditionKind, conditionLabel: CUILAN_BOOLEAN_CONDITION_LABELS[conditionKind], observedValue, evidenceCode: item.code, evidenceTextKey: item.textKey, actualBranch: branchFor(observedValue) };
};

export function compileCuilanBooleanDraft(draft: unknown): CuilanBooleanInstruction[] {
  validateCuilanBooleanDraft(draft);
  const byId = new Map(draft.blocks.map((block) => [block.id, block]));
  const transform = draft.blocks.find((block) => block.type === 'w3_cuilan_transform')!;
  const disguiseIf = draft.blocks.find((block) => block.type === 'w3_cuilan_if_disguise_ready')!;
  const clue = draft.blocks.find((block) => block.type === 'w3_cuilan_collect_clue')!;
  const identityIf = draft.blocks.find((block) => block.type === 'w3_cuilan_if_identity_reveal')!;
  const gate = (ifBlock: CuilanBooleanWorkspaceBlock) => {
    const condition = byId.get(ifBlock.conditionBlockId!)!;
    const kind = conditionForType(condition.type)!;
    const branch = branchFor(conditionValue(kind));
    const action = draft.blocks.find((block) => block.parentBlockId === ifBlock.id && block.branch === branch)!;
    return { condition, kind, action };
  };
  const first = gate(disguiseIf);
  const second = gate(identityIf);
  return [
    instruction('transform-as-cuilan', transform.id, null, 'disguise-readiness', first.condition.id, first.kind),
    instruction('condition-checked', first.condition.id, disguiseIf.id, 'disguise-readiness', first.condition.id, first.kind),
    instruction(opcodeForAction(first.action.type), first.action.id, disguiseIf.id, 'disguise-readiness', first.condition.id, first.kind),
    instruction('collect-clue', clue.id, null, 'identity-reveal', second.condition.id, second.kind),
    instruction('condition-checked', second.condition.id, identityIf.id, 'identity-reveal', second.condition.id, second.kind),
    instruction(opcodeForAction(second.action.type), second.action.id, identityIf.id, 'identity-reveal', second.condition.id, second.kind),
  ];
}

const isInstruction = (value: unknown): value is CuilanBooleanInstruction => isPlainRecord(value)
  && typeof value.instructionId === 'string' && typeof value.opcode === 'string' && typeof value.sourceBlockId === 'string' && nullableString(value.parentBlockId)
  && (value.checkpointId === 'disguise-readiness' || value.checkpointId === 'identity-reveal')
  && typeof value.conditionSourceBlockId === 'string' && typeof value.conditionKind === 'string' && typeof value.conditionLabel === 'string'
  && typeof value.observedValue === 'boolean' && typeof value.evidenceCode === 'string' && typeof value.evidenceTextKey === 'string'
  && (value.actualBranch === 'then' || value.actualBranch === 'else');

const failureSnapshot = (item: CuilanBooleanInstruction): CuilanFailureSnapshot => ({
  snapshotId: `cuilan:${item.checkpointId}:${item.conditionSourceBlockId}:${item.actualBranch}`,
  checkpointId: item.checkpointId, conditionSourceBlockId: item.conditionSourceBlockId, conditionKind: item.conditionKind,
  conditionLabel: item.conditionLabel, observedValue: item.observedValue, evidenceCode: item.evidenceCode,
  evidenceTextKey: item.evidenceTextKey, branch: item.actualBranch,
});

const runtimeEvents = (trace: readonly CuilanBooleanInstruction[], finalState: CuilanStoryState): CuilanBooleanRuntimeEvent[] => {
  let state: CuilanStoryState = 'cuilan-safe';
  const events: CuilanBooleanRuntimeEvent[] = [{ type: 'run-started', checkpointId: null, sourceBlockId: null, parentBlockId: null, conditionSourceBlockId: null, conditionKind: null, observedValue: null, actualBranch: null, opcode: null, state }];
  for (const item of trace) {
    if (item.opcode === 'transform-as-cuilan') state = 'transformed-as-cuilan';
    else if (item.opcode === 'hold-disguise') state = 'disguise-ready';
    else if (item.opcode === 'collect-clue') state = 'clue-acquired';
    else if (item.checkpointId === 'identity-reveal' && item.opcode === 'condition-checked') state = 'identity-checked';
    else if (item.opcode === 'reveal-wukong') state = 'revealed';
    events.push({ type: 'instruction-accepted', checkpointId: item.checkpointId, sourceBlockId: item.sourceBlockId, parentBlockId: item.parentBlockId, conditionSourceBlockId: item.conditionSourceBlockId, conditionKind: item.conditionKind, observedValue: item.observedValue, actualBranch: item.actualBranch, opcode: item.opcode, state });
  }
  events.push({ type: 'run-finished', checkpointId: null, sourceBlockId: null, parentBlockId: null, conditionSourceBlockId: null, conditionKind: null, observedValue: null, actualBranch: null, opcode: null, state: finalState });
  return events;
};

function runCanonicalCuilanBooleanTrace(traceInput: unknown): CuilanBooleanRunResult {
  const trace = Array.isArray(traceInput) && traceInput.every(isInstruction) ? traceInput : null;
  const invalid = (sourceBlockId = 'workspace'): CuilanBooleanRunResult => ({ completed: false, finalState: 'cuilan-safe', checkpointResults: [], diagnostic: { concept: 'invalid-trace', sourceBlockId, messageCode: 'cuilan.invalid-trace' }, failureSnapshot: null, events: [], penalty: penalty() });
  if (!trace || trace.length !== 6) return invalid(trace?.find((item) => item.sourceBlockId)?.sourceBlockId);
  const [transform, firstCheck, firstAction, clue, secondCheck, secondAction] = trace;
  const validateGate = (checkpointId: CuilanCheckpointId, before: CuilanBooleanInstruction, check: CuilanBooleanInstruction, action: CuilanBooleanInstruction, expectedBeforeOpcode: CuilanBooleanOpcode, expectedAction: Record<CuilanBranch, CuilanBooleanOpcode>, expectedConditionSource: string | null, expectedParent: string | null): boolean => {
    const conditionKind = check.conditionKind;
    const value = conditionKind === 'appearance-matches-cuilan' ? true : conditionKind === 'identity-is-cuilan' ? false : null;
    const source = check.conditionSourceBlockId;
    const itemEvidence = evidence[checkpointId];
    const common = (item: CuilanBooleanInstruction) => item.checkpointId === checkpointId && item.conditionSourceBlockId === source && item.conditionKind === conditionKind && item.conditionLabel === CUILAN_BOOLEAN_CONDITION_LABELS[conditionKind] && item.observedValue === value && item.actualBranch === branchFor(value) && item.evidenceCode === itemEvidence.code && item.evidenceTextKey === itemEvidence.textKey;
    return value !== null
      && before.opcode === expectedBeforeOpcode && check.opcode === 'condition-checked' && action.opcode === expectedAction[branchFor(value)]
      && common(before) && common(check) && common(action)
      && before.instructionId === `${checkpointId}:${before.opcode}:${before.sourceBlockId}`
      && check.instructionId === `${checkpointId}:condition-checked:${source}` && action.instructionId === `${checkpointId}:${action.opcode}:${action.sourceBlockId}`
      && check.sourceBlockId === source && before.parentBlockId === expectedParent && check.parentBlockId !== null && action.parentBlockId === check.parentBlockId
      && (expectedConditionSource === null || source === expectedConditionSource)
      && before.sourceBlockId.length > 0 && source.length > 0 && action.sourceBlockId.length > 0;
  };
  if (!validateGate('disguise-readiness', transform, firstCheck, firstAction, 'transform-as-cuilan', { then: 'hold-disguise', else: 'adjust-transform' }, null, null)) return invalid(transform.sourceBlockId || 'workspace');
  if (!validateGate('identity-reveal', clue, secondCheck, secondAction, 'collect-clue', { then: 'continue-disguise', else: 'reveal-wukong' }, null, null)) return invalid(clue.sourceBlockId || 'workspace');
  if (transform.sourceBlockId === firstCheck.sourceBlockId || firstCheck.sourceBlockId === secondCheck.sourceBlockId || firstAction.sourceBlockId === secondAction.sourceBlockId || firstCheck.parentBlockId === secondCheck.parentBlockId) return invalid('workspace');
  let state: CuilanStoryState = 'transformed-as-cuilan';
  const results: CuilanCheckpointResult[] = [];
  const fail = (item: CuilanBooleanInstruction, concept: CuilanBooleanDiagnostic['concept'], sourceBlockId: string): CuilanBooleanRunResult => ({ completed: false, finalState: state, checkpointResults: results, diagnostic: { concept, sourceBlockId, messageCode: `cuilan.${concept}` }, failureSnapshot: failureSnapshot(item), events: runtimeEvents(trace.slice(0, trace.indexOf(item) + 1), state), penalty: penalty() });
  if (firstCheck.observedValue !== true || firstCheck.actualBranch !== 'then' || firstAction.opcode !== 'hold-disguise') return fail(firstCheck, firstCheck.observedValue !== true ? 'condition-selection' : 'branch-routing', firstCheck.conditionSourceBlockId);
  state = 'disguise-ready';
  results.push({ checkpointId: 'disguise-readiness', observedValue: true, actualBranch: 'then', actionOpcode: firstAction.opcode, passed: true });
  if (state !== 'disguise-ready' || clue.opcode !== 'collect-clue') return fail(clue, 'sequence-precondition', clue.sourceBlockId);
  state = 'clue-acquired';
  state = 'identity-checked';
  const secondPassed = secondCheck.observedValue === false && secondCheck.actualBranch === 'else' && secondAction.opcode === 'reveal-wukong';
  results.push({ checkpointId: 'identity-reveal', observedValue: secondCheck.observedValue, actualBranch: secondCheck.actualBranch, actionOpcode: secondAction.opcode, passed: secondPassed });
  if (!secondPassed) return fail(secondAction, secondCheck.observedValue !== false ? 'condition-selection' : 'branch-routing', secondCheck.conditionSourceBlockId);
  state = 'revealed';
  state = 'demon-fled';
  return { completed: true, finalState: state, checkpointResults: results, diagnostic: null, failureSnapshot: null, events: runtimeEvents(trace, state), penalty: penalty() };
}

const deepEqual = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((item, index) => deepEqual(item, right[index]));
  if (!isPlainRecord(left) || !isPlainRecord(right)) return false;
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => hasOwn(right, key) && deepEqual(left[key], right[key]));
};

/**
 * The only completion-boundary runner for W3-M2.
 *
 * It recompiles the supplied visible-workspace draft and accepts an optional
 * trace only when it is an exact structural match. Callers must persist the
 * draft, never trust a separately supplied trace as completion evidence.
 */
export function runCuilanBooleanForDraft(draftInput: unknown, traceInput?: unknown): CuilanBooleanRunResult {
  let canonical: CuilanBooleanInstruction[];
  try {
    canonical = compileCuilanBooleanDraft(draftInput);
  } catch {
    return runCanonicalCuilanBooleanTrace(null);
  }
  if (traceInput !== undefined && !deepEqual(canonical, traceInput)) return runCanonicalCuilanBooleanTrace(null);
  return runCanonicalCuilanBooleanTrace(canonical);
}
