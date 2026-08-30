export const BAJIE_JOINING_MISSION_ID = 'w3-m4' as const;

export const BAJIE_JOINING_BLOCK_TYPES = [
  'w3_bajie_receive_statement',
  'w3_bajie_if_join_ready',
  'w3_bajie_boolean_operation',
  'w3_bajie_condition_guanyin_precepts',
  'w3_bajie_condition_willing_westward',
  'w3_bajie_formally_join_team',
  'w3_bajie_continue_verification',
] as const;

export type BajieJoiningBlockType = typeof BAJIE_JOINING_BLOCK_TYPES[number];
export type BajieJoiningOperator = 'and' | 'or';
export type BajieJoiningScenarioId = 'canon-bajie-joins' | 'practice-precepts-only' | 'practice-willing-only';
export type BajieJoiningBranch = 'then' | 'else';
export type BajieJoiningConditionKind = 'guanyin-precepts' | 'willing-westward';
export type BajieJoiningOpcode = 'receive-statement' | 'check-guanyin-precepts' | 'check-willing-westward' | 'combine-conditions' | 'formally-join-team' | 'continue-verification';
export type BajieJoiningState = 'checking-westward-team' | 'westward-team-departed';

export interface BajieJoiningWorkspaceBlock {
  id: string;
  type: BajieJoiningBlockType;
  previousId: string | null;
  nextId: string | null;
  parentBlockId: string | null;
  conditionBlockId: string | null;
  leftBlockId: string | null;
  rightBlockId: string | null;
  operator: BajieJoiningOperator | null;
  branch: BajieJoiningBranch | null;
  x: number;
  y: number;
}

export interface BajieJoiningWorkspaceDraftV1 {
  version: 1;
  missionId: typeof BAJIE_JOINING_MISSION_ID;
  blocks: BajieJoiningWorkspaceBlock[];
}

export interface BajieJoiningInstruction {
  instructionId: string;
  scenarioId: BajieJoiningScenarioId;
  opcode: BajieJoiningOpcode;
  sourceBlockId: string;
  parentBlockId: string | null;
  conditionKind: BajieJoiningConditionKind | null;
  evidenceCode: string;
  operator: BajieJoiningOperator;
  left: boolean;
  right: boolean;
  combined: boolean;
  actualBranch: BajieJoiningBranch;
}

export interface BajieJoiningScenarioResult {
  scenarioId: BajieJoiningScenarioId;
  left: boolean;
  right: boolean;
  combined: boolean;
  actualBranch: BajieJoiningBranch;
  actionOpcode: Extract<BajieJoiningOpcode, 'formally-join-team' | 'continue-verification'>;
  passed: boolean;
}

export interface BajieJoiningFailureSnapshot {
  snapshotId: string;
  scenarioId: BajieJoiningScenarioId;
  operator: BajieJoiningOperator;
  left: boolean;
  right: boolean;
  combined: boolean;
  actualBranch: BajieJoiningBranch;
  actionOpcode: Extract<BajieJoiningOpcode, 'formally-join-team' | 'continue-verification'>;
  sourceBlockId: string;
  leftSourceBlockId: string;
  rightSourceBlockId: string;
  leftConditionKind: BajieJoiningConditionKind;
  rightConditionKind: BajieJoiningConditionKind;
}

export interface BajieJoiningRunResult {
  completed: boolean;
  finalState: BajieJoiningState;
  scenarioResults: BajieJoiningScenarioResult[];
  failureSnapshot: BajieJoiningFailureSnapshot | null;
  diagnostic: { concept: 'invalid-trace'; sourceBlockId: string | null } | null;
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

export interface BajieJoiningScenario {
  id: BajieJoiningScenarioId;
  cardKind: 'canon' | 'practice';
  publicTitle: string;
  publicStatement: string;
  guanyinPrecepts: boolean;
  willingWestward: boolean;
  expectedBranch: BajieJoiningBranch;
  evidenceCode: string;
}

const bajieJoiningScenarios: BajieJoiningScenario[] = [
  { id: 'canon-bajie-joins', cardKind: 'canon', publicTitle: '原著情境·八戒归队', publicStatement: '猪悟能已蒙观音劝善受戒，也明确愿随唐僧西去。', guanyinPrecepts: true, willingWestward: true, expectedBranch: 'then', evidenceCode: 'chapter-19-guanyin-precepts-and-westward-departure' },
  { id: 'practice-precepts-only', cardKind: 'practice', publicTitle: '逻辑练习·不改变原著', publicStatement: '逻辑练习，不改变原著：这位同行者已蒙观音劝善受戒，但没有明确愿随唐僧西去。', guanyinPrecepts: true, willingWestward: false, expectedBranch: 'else', evidenceCode: 'logic-practice-precepts-only' },
  { id: 'practice-willing-only', cardKind: 'practice', publicTitle: '逻辑练习·不改变原著', publicStatement: '逻辑练习，不改变原著：这位同行者明确愿随唐僧西去，但尚未蒙观音劝善受戒。', guanyinPrecepts: false, willingWestward: true, expectedBranch: 'else', evidenceCode: 'logic-practice-willing-only' },
] as const;

for (const scenario of bajieJoiningScenarios) Object.freeze(scenario);
export const BAJIE_JOINING_SCENARIOS: ReadonlyArray<Readonly<BajieJoiningScenario>> = Object.freeze(bajieJoiningScenarios);

const MAX_BLOCKS = 32;
const MAX_ID_LENGTH = 128;
const MAX_COORDINATE = 10_000;
const knownTypes = new Set<string>(BAJIE_JOINING_BLOCK_TYPES);
const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const isPlainRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const nullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const branchFor = (combined: boolean): BajieJoiningBranch => combined ? 'then' : 'else';
const penalty = () => ({ livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const });

export class BajieJoiningGraphError extends Error {
  constructor(readonly code: string, readonly sourceBlockId: string) {
    super(code);
    this.name = 'BajieJoiningGraphError';
  }
}

const graphError = (code: string, sourceBlockId: string): never => { throw new BajieJoiningGraphError(code, sourceBlockId); };
const fallbackId = (draft: BajieJoiningWorkspaceDraftV1) => draft.blocks[0]?.id || 'workspace';
const isWorkspaceBlock = (value: unknown): value is BajieJoiningWorkspaceBlock => isPlainRecord(value)
  && typeof value.id === 'string' && typeof value.type === 'string'
  && nullableString(value.previousId) && nullableString(value.nextId) && nullableString(value.parentBlockId) && nullableString(value.conditionBlockId)
  && nullableString(value.leftBlockId) && nullableString(value.rightBlockId)
  && (value.operator === null || value.operator === 'and' || value.operator === 'or' || typeof value.operator === 'string')
  && (value.branch === null || value.branch === 'then' || value.branch === 'else')
  && typeof value.x === 'number' && typeof value.y === 'number';

export function createDefaultBajieJoiningDraft(): BajieJoiningWorkspaceDraftV1 {
  return {
    version: 1,
    missionId: BAJIE_JOINING_MISSION_ID,
    blocks: [
      { id: 'bajie-receive-statement', type: 'w3_bajie_receive_statement', previousId: null, nextId: 'bajie-if-join-ready', parentBlockId: null, conditionBlockId: null, leftBlockId: null, rightBlockId: null, operator: null, branch: null, x: 40, y: 32 },
      { id: 'bajie-if-join-ready', type: 'w3_bajie_if_join_ready', previousId: 'bajie-receive-statement', nextId: null, parentBlockId: null, conditionBlockId: 'bajie-boolean-operation', leftBlockId: null, rightBlockId: null, operator: null, branch: null, x: 40, y: 96 },
      { id: 'bajie-boolean-operation', type: 'w3_bajie_boolean_operation', previousId: null, nextId: null, parentBlockId: 'bajie-if-join-ready', conditionBlockId: null, leftBlockId: 'bajie-guanyin-precepts', rightBlockId: 'bajie-willing-westward', operator: 'or', branch: null, x: 280, y: 96 },
      { id: 'bajie-guanyin-precepts', type: 'w3_bajie_condition_guanyin_precepts', previousId: null, nextId: null, parentBlockId: 'bajie-boolean-operation', conditionBlockId: null, leftBlockId: null, rightBlockId: null, operator: null, branch: null, x: 330, y: 140 },
      { id: 'bajie-willing-westward', type: 'w3_bajie_condition_willing_westward', previousId: null, nextId: null, parentBlockId: 'bajie-boolean-operation', conditionBlockId: null, leftBlockId: null, rightBlockId: null, operator: null, branch: null, x: 330, y: 188 },
      { id: 'bajie-formally-join-team', type: 'w3_bajie_formally_join_team', previousId: null, nextId: null, parentBlockId: 'bajie-if-join-ready', conditionBlockId: null, leftBlockId: null, rightBlockId: null, operator: null, branch: 'then', x: 92, y: 260 },
      { id: 'bajie-continue-verification', type: 'w3_bajie_continue_verification', previousId: null, nextId: null, parentBlockId: 'bajie-if-join-ready', conditionBlockId: null, leftBlockId: null, rightBlockId: null, operator: null, branch: 'else', x: 92, y: 322 },
    ],
  };
}

export function validateBajieJoiningDraftEnvelope(value: unknown): BajieJoiningWorkspaceDraftV1 {
  if (!isPlainRecord(value) || value.version !== 1 || value.missionId !== BAJIE_JOINING_MISSION_ID || !Array.isArray(value.blocks)) graphError('invalid-draft', 'workspace');
  const blocks = (value as Record<string, unknown>).blocks as unknown[];
  if (blocks.length === 0) graphError('empty-workspace', 'workspace');
  if (blocks.length > MAX_BLOCKS) graphError('too-many-blocks', 'workspace');
  return value as BajieJoiningWorkspaceDraftV1;
}

export function validateBajieJoiningDraft(value: unknown): asserts value is BajieJoiningWorkspaceDraftV1 {
  const draft = validateBajieJoiningDraftEnvelope(value);
  for (let index = 0; index < draft.blocks.length; index += 1) {
    if (!hasOwn(draft.blocks, String(index)) || !isWorkspaceBlock(draft.blocks[index])) graphError('invalid-block', 'workspace');
  }
  const byId = new Map<string, BajieJoiningWorkspaceBlock>();
  for (const block of draft.blocks) {
    if (!block.id || block.id.length > MAX_ID_LENGTH || byId.has(block.id)) graphError(!block.id || block.id.length > MAX_ID_LENGTH ? 'invalid-id' : 'duplicate-id', block.id || fallbackId(draft));
    if (!knownTypes.has(block.type)) graphError('unknown-type', block.id);
    for (const reference of [block.previousId, block.nextId, block.parentBlockId, block.conditionBlockId, block.leftBlockId, block.rightBlockId]) if (reference !== null && (reference.length === 0 || reference.length > MAX_ID_LENGTH)) graphError('invalid-reference', block.id);
    if (!Number.isFinite(block.x) || !Number.isFinite(block.y) || Math.abs(block.x) > MAX_COORDINATE || Math.abs(block.y) > MAX_COORDINATE) graphError('invalid-coordinate', block.id);
    byId.set(block.id, block);
  }
  const one = (type: BajieJoiningBlockType) => {
    const matches = draft.blocks.filter((block) => block.type === type);
    if (matches.length !== 1) graphError(matches.length ? 'duplicate-required-block' : 'missing-required-block', matches[1]?.id ?? fallbackId(draft));
    return matches[0]!;
  };
  const receive = one('w3_bajie_receive_statement');
  const ifJoin = one('w3_bajie_if_join_ready');
  const operation = one('w3_bajie_boolean_operation');
  const guanyin = one('w3_bajie_condition_guanyin_precepts');
  const willing = one('w3_bajie_condition_willing_westward');
  const join = one('w3_bajie_formally_join_team');
  const continueVerification = one('w3_bajie_continue_verification');
  for (const block of byId.values()) {
    for (const ref of [block.previousId, block.nextId, block.parentBlockId, block.conditionBlockId, block.leftBlockId, block.rightBlockId]) if (ref !== null && !byId.has(ref)) graphError('unknown-reference', block.id);
    if (block.previousId && byId.get(block.previousId)!.nextId !== block.id) graphError('nonreciprocal-link', block.id);
    if (block.nextId && byId.get(block.nextId)!.previousId !== block.id) graphError('nonreciprocal-link', block.nextId);
    if (block.nextId && byId.get(block.nextId)!.parentBlockId !== block.parentBlockId) graphError('cross-container-link', block.id);
  }
  for (const start of byId.values()) {
    const seen = new Set<string>();
    for (let current: BajieJoiningWorkspaceBlock = start; ; current = byId.get(current.nextId)!) {
      if (seen.has(current.id)) graphError('cycle', current.id);
      seen.add(current.id);
      if (current.nextId === null) break;
    }
  }
  const detachedChild = [operation, guanyin, willing, join, continueVerification]
    .find((block) => block.parentBlockId === null && block.previousId === null && block.nextId === null && block.branch === null);
  if (detachedChild) graphError('orphan-block', detachedChild.id);
  if (receive.parentBlockId !== null || receive.previousId !== null || receive.nextId !== ifJoin.id || receive.conditionBlockId !== null || receive.leftBlockId !== null || receive.rightBlockId !== null || receive.operator !== null || receive.branch !== null) graphError('root-shape', receive.id);
  if (ifJoin.parentBlockId !== null || ifJoin.previousId !== receive.id || ifJoin.nextId !== null || ifJoin.conditionBlockId !== operation.id || ifJoin.leftBlockId !== null || ifJoin.rightBlockId !== null || ifJoin.operator !== null || ifJoin.branch !== null) graphError('if-shape', ifJoin.id);
  if (operation.parentBlockId !== ifJoin.id || operation.previousId !== null || operation.nextId !== null || operation.conditionBlockId !== null || operation.branch !== null) graphError('operation-shape', operation.id);
  if (operation.operator !== 'and' && operation.operator !== 'or') graphError('unknown-operator', operation.id);
  const leftBlockId = operation.leftBlockId;
  const rightBlockId = operation.rightBlockId;
  if (!leftBlockId || !rightBlockId) graphError('missing-boolean-input', operation.id);
  if (leftBlockId === rightBlockId) graphError('duplicate-boolean-input', operation.id);
  const checkCondition = (block: BajieJoiningWorkspaceBlock) => {
    if (block.parentBlockId !== operation.id || block.previousId !== null || block.nextId !== null || block.conditionBlockId !== null || block.leftBlockId !== null || block.rightBlockId !== null || block.operator !== null || block.branch !== null) graphError('condition-shape', block.id);
  };
  checkCondition(guanyin); checkCondition(willing);
  if (![guanyin.id, willing.id].includes(leftBlockId!) || ![guanyin.id, willing.id].includes(rightBlockId!)) graphError('wrong-boolean-input', operation.id);
  const checkAction = (block: BajieJoiningWorkspaceBlock, branch: BajieJoiningBranch) => {
    if (block.parentBlockId !== ifJoin.id || block.previousId !== null || block.nextId !== null || block.conditionBlockId !== null || block.leftBlockId !== null || block.rightBlockId !== null || block.operator !== null || block.branch !== branch) graphError('action-shape', block.id);
  };
  checkAction(join, 'then'); checkAction(continueVerification, 'else');
  const roots = draft.blocks.filter((block) => block.parentBlockId === null && block.previousId === null);
  if (roots.length !== 1) graphError(roots.length > 1 ? 'multiple-top-roots' : 'missing-top-root', roots[1]?.id ?? receive.id);
  const owned = new Set([receive.id, ifJoin.id, operation.id, guanyin.id, willing.id, join.id, continueVerification.id]);
  if (owned.size !== byId.size) graphError('orphan-block', [...byId.keys()].find((id) => !owned.has(id))!);
}

const conditionForType = (type: BajieJoiningBlockType): BajieJoiningConditionKind | null => type === 'w3_bajie_condition_guanyin_precepts' ? 'guanyin-precepts' : type === 'w3_bajie_condition_willing_westward' ? 'willing-westward' : null;
const valueFor = (scenario: Readonly<BajieJoiningScenario>, kind: BajieJoiningConditionKind) => kind === 'guanyin-precepts' ? scenario.guanyinPrecepts : scenario.willingWestward;
const combine = (operator: BajieJoiningOperator, left: boolean, right: boolean) => operator === 'and' ? left && right : left || right;

export function compileBajieJoiningDraft(value: unknown): BajieJoiningInstruction[] {
  validateBajieJoiningDraft(value);
  const draft = value;
  const byId = new Map(draft.blocks.map((block) => [block.id, block]));
  const required = (type: BajieJoiningBlockType) => draft.blocks.find((block) => block.type === type)!;
  const receive = required('w3_bajie_receive_statement');
  const ifJoin = required('w3_bajie_if_join_ready');
  const operation = required('w3_bajie_boolean_operation');
  const leftBlock = byId.get(operation.leftBlockId!)!;
  const rightBlock = byId.get(operation.rightBlockId!)!;
  const leftKind = conditionForType(leftBlock.type)!;
  const rightKind = conditionForType(rightBlock.type)!;
  const actionFor = (branch: BajieJoiningBranch) => branch === 'then' ? required('w3_bajie_formally_join_team') : required('w3_bajie_continue_verification');
  return BAJIE_JOINING_SCENARIOS.flatMap((scenario) => {
    const left = valueFor(scenario, leftKind);
    const right = valueFor(scenario, rightKind);
    const combined = combine(operation.operator!, left, right);
    const actualBranch = branchFor(combined);
    const action = actionFor(actualBranch);
    const item = (opcode: BajieJoiningOpcode, sourceBlockId: string, parentBlockId: string | null, conditionKind: BajieJoiningConditionKind | null): BajieJoiningInstruction => ({
      instructionId: `${scenario.id}:${opcode}:${sourceBlockId}`, scenarioId: scenario.id, opcode, sourceBlockId, parentBlockId, conditionKind, evidenceCode: scenario.evidenceCode,
      operator: operation.operator!, left, right, combined, actualBranch,
    });
    return [
      item('receive-statement', receive.id, null, null),
      item(leftKind === 'guanyin-precepts' ? 'check-guanyin-precepts' : 'check-willing-westward', leftBlock.id, operation.id, leftKind),
      item(rightKind === 'guanyin-precepts' ? 'check-guanyin-precepts' : 'check-willing-westward', rightBlock.id, operation.id, rightKind),
      item('combine-conditions', operation.id, ifJoin.id, null),
      item(actualBranch === 'then' ? 'formally-join-team' : 'continue-verification', action.id, ifJoin.id, null),
    ];
  });
}

const instructionKeys: ReadonlyArray<keyof BajieJoiningInstruction> = ['instructionId', 'scenarioId', 'opcode', 'sourceBlockId', 'parentBlockId', 'conditionKind', 'evidenceCode', 'operator', 'left', 'right', 'combined', 'actualBranch'];
const sameTrace = (canonical: readonly BajieJoiningInstruction[], input: unknown): boolean => {
  if (!Array.isArray(input) || input.length !== canonical.length) return false;
  for (let index = 0; index < input.length; index += 1) {
    if (!hasOwn(input, String(index))) return false;
    const candidate = input[index];
    if (!isPlainRecord(candidate)) return false;
    const keys = Object.keys(candidate);
    if (keys.length !== instructionKeys.length || keys.some((key) => !instructionKeys.includes(key as keyof BajieJoiningInstruction))) return false;
    if (!instructionKeys.every((key) => candidate[key] === canonical[index]![key])) return false;
  }
  return true;
};

export function runBajieJoiningForDraft(draft: unknown, traceInput: unknown): BajieJoiningRunResult {
  const rejected = (sourceBlockId: string | null): BajieJoiningRunResult => ({ completed: false, finalState: 'checking-westward-team', scenarioResults: [], failureSnapshot: null, diagnostic: { concept: 'invalid-trace', sourceBlockId }, penalty: penalty() });
  let canonical: BajieJoiningInstruction[];
  try { canonical = compileBajieJoiningDraft(draft); } catch (error) { return rejected(error instanceof BajieJoiningGraphError ? error.sourceBlockId : null); }
  try { if (!sameTrace(canonical, traceInput)) return rejected(null); } catch { return rejected(null); }
  const operation = (draft as BajieJoiningWorkspaceDraftV1).blocks.find((block) => block.type === 'w3_bajie_boolean_operation')!;
  const results: BajieJoiningScenarioResult[] = [];
  for (const scenario of BAJIE_JOINING_SCENARIOS) {
    const item = canonical.find((entry) => entry.scenarioId === scenario.id && entry.opcode === 'combine-conditions')!;
    const action = canonical.find((entry) => entry.scenarioId === scenario.id && (entry.opcode === 'formally-join-team' || entry.opcode === 'continue-verification'))!;
    const expectedBranch = scenario.expectedBranch;
    const result: BajieJoiningScenarioResult = { scenarioId: scenario.id, left: item.left, right: item.right, combined: item.combined, actualBranch: item.actualBranch, actionOpcode: action.opcode as BajieJoiningScenarioResult['actionOpcode'], passed: item.actualBranch === expectedBranch };
    if (!result.passed) {
      return {
        completed: false, finalState: 'checking-westward-team', scenarioResults: results,
        failureSnapshot: { snapshotId: `bajie:${scenario.id}:${operation.id}:${item.actualBranch}`, scenarioId: scenario.id, operator: item.operator, left: item.left, right: item.right, combined: item.combined, actualBranch: item.actualBranch, actionOpcode: result.actionOpcode, sourceBlockId: operation.id, leftSourceBlockId: operation.leftBlockId!, rightSourceBlockId: operation.rightBlockId!, leftConditionKind: canonical.find((entry) => entry.scenarioId === scenario.id && entry.sourceBlockId === operation.leftBlockId)?.conditionKind!, rightConditionKind: canonical.find((entry) => entry.scenarioId === scenario.id && entry.sourceBlockId === operation.rightBlockId)?.conditionKind! },
        diagnostic: null, penalty: penalty(),
      };
    }
    results.push(result);
  }
  return { completed: true, finalState: 'westward-team-departed', scenarioResults: results, failureSnapshot: null, diagnostic: null, penalty: penalty() };
}
