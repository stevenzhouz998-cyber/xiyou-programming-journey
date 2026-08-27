export const YUNZHAN_DIALOGUE_MISSION_ID = 'w3-m3' as const;

export const YUNZHAN_DIALOGUE_BLOCK_TYPES = [
  'w3_yunzhan_if_pilgrimage_explicit',
  'w3_yunzhan_condition_pilgrimage_explicit',
  'w3_yunzhan_guard_cave',
  'w3_yunzhan_explain_guanyin_origin',
] as const;

export type YunzhanDialogueBlockType = typeof YUNZHAN_DIALOGUE_BLOCK_TYPES[number];
export type YunzhanDialogueBranch = 'then' | 'else';
export type YunzhanDialogueRoundId = 'wukong-identity' | 'pilgrimage-explicit';
export type YunzhanDialogueOpcode = 'guard-cave' | 'explain-guanyin-origin';
export type YunzhanDialogueStoryState = 'cave-guarded' | 'origin-explained';

export interface YunzhanDialogueWorkspaceBlock {
  id: string;
  type: YunzhanDialogueBlockType;
  previousId: string | null;
  nextId: string | null;
  parentBlockId: string | null;
  conditionBlockId: string | null;
  branch: YunzhanDialogueBranch | null;
  x: number;
  y: number;
}

export interface YunzhanDialogueWorkspaceDraftV1 {
  version: 1;
  missionId: typeof YUNZHAN_DIALOGUE_MISSION_ID;
  blocks: YunzhanDialogueWorkspaceBlock[];
}

export interface YunzhanDialogueInstruction {
  instructionId: string;
  roundId: YunzhanDialogueRoundId;
  opcode: YunzhanDialogueOpcode;
  sourceBlockId: string;
  conditionSourceBlockId: string;
  conditionKind: 'pilgrimage-explicit';
  conditionLabel: string;
  observedValue: boolean;
  evidenceText: string;
  actualBranch: YunzhanDialogueBranch;
}

export interface YunzhanDialogueRoundResult {
  roundId: YunzhanDialogueRoundId;
  observedValue: boolean;
  actualBranch: YunzhanDialogueBranch;
  actionOpcode: YunzhanDialogueOpcode;
  passed: boolean;
}

export interface YunzhanDialogueFailureSnapshot {
  snapshotId: string;
  roundId: YunzhanDialogueRoundId;
  conditionKind: 'pilgrimage-explicit';
  conditionLabel: string;
  observedValue: boolean;
  evidenceText: string;
  branch: YunzhanDialogueBranch;
  actionOpcode: YunzhanDialogueOpcode;
}

export interface YunzhanDialogueDiagnostic {
  concept: 'invalid-trace' | 'branch-routing';
  sourceBlockId: string;
  messageCode: string;
}

export interface YunzhanDialogueRuntimeEvent {
  type: 'round-started' | 'action-selected' | 'run-finished';
  roundId: YunzhanDialogueRoundId | null;
  observedValue: boolean | null;
  actualBranch: YunzhanDialogueBranch | null;
  opcode: YunzhanDialogueOpcode | null;
  state: YunzhanDialogueStoryState | null;
}

export interface YunzhanDialogueRunResult {
  completed: boolean;
  finalState: YunzhanDialogueStoryState | null;
  rounds: YunzhanDialogueRoundResult[];
  diagnostic: YunzhanDialogueDiagnostic | null;
  failureSnapshot: YunzhanDialogueFailureSnapshot | null;
  events: YunzhanDialogueRuntimeEvent[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

const hasOwn = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const nullableString = (value: unknown): value is string | null => value === null || typeof value === 'string';
const types = new Set<string>(YUNZHAN_DIALOGUE_BLOCK_TYPES);
const penalty = () => ({ livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const });
const branchFor = (value: boolean): YunzhanDialogueBranch => value ? 'then' : 'else';

const ROUNDS: ReadonlyArray<{ id: YunzhanDialogueRoundId; value: boolean; evidenceText: string; expected: YunzhanDialogueOpcode }> = [
  { id: 'wukong-identity', value: false, evidenceText: '只说明孙悟空身份，还没有说明唐三藏正在西行取经。', expected: 'guard-cave' },
  { id: 'pilgrimage-explicit', value: true, evidenceText: '明确说明要保护唐三藏西行取经。', expected: 'explain-guanyin-origin' },
];

export class YunzhanDialogueGraphError extends Error {
  constructor(readonly code: string, readonly sourceBlockId: string) { super(code); this.name = 'YunzhanDialogueGraphError'; }
}

const fail = (code: string, sourceBlockId: string): never => { throw new YunzhanDialogueGraphError(code, sourceBlockId); };

export function createDefaultYunzhanDialogueDraft(): YunzhanDialogueWorkspaceDraftV1 {
  return { version: 1, missionId: YUNZHAN_DIALOGUE_MISSION_ID, blocks: [
    { id: 'yunzhan-if', type: 'w3_yunzhan_if_pilgrimage_explicit', previousId: null, nextId: null, parentBlockId: null, conditionBlockId: 'yunzhan-condition', branch: null, x: 56, y: 48 },
    { id: 'yunzhan-condition', type: 'w3_yunzhan_condition_pilgrimage_explicit', previousId: null, nextId: null, parentBlockId: 'yunzhan-if', conditionBlockId: null, branch: null, x: 296, y: 48 },
    { id: 'yunzhan-then-action', type: 'w3_yunzhan_guard_cave', previousId: null, nextId: null, parentBlockId: 'yunzhan-if', conditionBlockId: null, branch: 'then', x: 110, y: 134 },
    { id: 'yunzhan-else-action', type: 'w3_yunzhan_explain_guanyin_origin', previousId: null, nextId: null, parentBlockId: 'yunzhan-if', conditionBlockId: null, branch: 'else', x: 110, y: 214 },
  ] };
}

const isBlock = (value: unknown): value is YunzhanDialogueWorkspaceBlock => isRecord(value)
  && typeof value.id === 'string' && typeof value.type === 'string' && nullableString(value.previousId) && nullableString(value.nextId)
  && nullableString(value.parentBlockId) && nullableString(value.conditionBlockId) && (value.branch === null || value.branch === 'then' || value.branch === 'else')
  && typeof value.x === 'number' && typeof value.y === 'number';

export function validateYunzhanDialogueDraft(draft: unknown): asserts draft is YunzhanDialogueWorkspaceDraftV1 {
  if (!isRecord(draft) || draft.version !== 1 || draft.missionId !== YUNZHAN_DIALOGUE_MISSION_ID || !Array.isArray(draft.blocks) || !draft.blocks.every(isBlock)) fail('invalid-draft', 'workspace');
  const parsed = draft as YunzhanDialogueWorkspaceDraftV1;
  if (parsed.blocks.length > 4) fail('unexpected-block', parsed.blocks[0]?.id ?? 'workspace');
  const byId = new Map<string, YunzhanDialogueWorkspaceBlock>();
  for (const block of parsed.blocks) {
    if (!block.id || block.id.length > 128 || byId.has(block.id)) fail('duplicate-or-invalid-id', block.id || 'workspace');
    if (!types.has(block.type)) fail('unknown-type', block.id);
    if (!Number.isFinite(block.x) || !Number.isFinite(block.y)) fail('invalid-coordinate', block.id);
    byId.set(block.id, block);
  }
  for (const block of byId.values()) for (const ref of [block.previousId, block.nextId, block.parentBlockId, block.conditionBlockId]) if (ref && !byId.has(ref)) fail(block.type === 'w3_yunzhan_if_pilgrimage_explicit' && ref === block.conditionBlockId ? 'missing-condition' : 'unknown-reference', block.id);
  const one = (type: YunzhanDialogueBlockType) => {
    const matches = [...byId.values()].filter((block) => block.type === type);
    if (matches.length !== 1) fail(matches.length ? 'duplicate-required-block' : type === 'w3_yunzhan_condition_pilgrimage_explicit' ? 'missing-condition' : 'missing-required-block', matches[0]?.id ?? 'yunzhan-if');
    return matches[0]!;
  };
  const gate = one('w3_yunzhan_if_pilgrimage_explicit');
  const condition = one('w3_yunzhan_condition_pilgrimage_explicit');
  const guard = one('w3_yunzhan_guard_cave');
  const explain = one('w3_yunzhan_explain_guanyin_origin');
  if (gate.parentBlockId !== null || gate.previousId !== null || gate.nextId !== null || gate.branch !== null || gate.conditionBlockId !== condition.id) fail('invalid-gate-shape', gate.id);
  if (condition.parentBlockId !== gate.id || condition.previousId !== null || condition.nextId !== null || condition.branch !== null || condition.conditionBlockId !== null) fail('condition-shape', condition.id);
  const actions = [guard, explain];
  for (const action of actions) if (action.parentBlockId !== gate.id || action.previousId !== null || action.nextId !== null || action.conditionBlockId !== null || action.branch === null) fail('action-shape', action.id);
  if (guard.branch === explain.branch) fail('duplicate-branch-action', gate.id);
}

const opcodeFor = (type: YunzhanDialogueBlockType): YunzhanDialogueOpcode => type === 'w3_yunzhan_guard_cave' ? 'guard-cave' : 'explain-guanyin-origin';

export function compileYunzhanDialogueDraft(draft: unknown): YunzhanDialogueInstruction[] {
  validateYunzhanDialogueDraft(draft);
  const condition = draft.blocks.find((block) => block.type === 'w3_yunzhan_condition_pilgrimage_explicit')!;
  return ROUNDS.map((round) => {
    const actualBranch = branchFor(round.value);
    const action = draft.blocks.find((block) => block.parentBlockId === 'yunzhan-if' && block.branch === actualBranch)!;
    return { instructionId: `${round.id}:${action.id}`, roundId: round.id, opcode: opcodeFor(action.type), sourceBlockId: action.id, conditionSourceBlockId: condition.id, conditionKind: 'pilgrimage-explicit', conditionLabel: '当前话语是否明确说明唐三藏正在西行取经', observedValue: round.value, evidenceText: round.evidenceText, actualBranch };
  });
}

const sameTrace = (left: readonly YunzhanDialogueInstruction[], right: readonly YunzhanDialogueInstruction[]) => JSON.stringify(left) === JSON.stringify(right);
const invalidTrace = (): YunzhanDialogueRunResult => ({ completed: false, finalState: null, rounds: [], diagnostic: { concept: 'invalid-trace', sourceBlockId: 'workspace', messageCode: 'trace-must-be-compiled-from-visible-workspace' }, failureSnapshot: null, events: [], penalty: penalty() });

export function runYunzhanDialogueForDraft(draft: unknown, trace = compileYunzhanDialogueDraft(draft)): YunzhanDialogueRunResult {
  let canonical: YunzhanDialogueInstruction[];
  try { canonical = compileYunzhanDialogueDraft(draft); } catch { return invalidTrace(); }
  if (!sameTrace(canonical, trace)) return invalidTrace();
  const rounds: YunzhanDialogueRoundResult[] = [];
  const events: YunzhanDialogueRuntimeEvent[] = [];
  for (const item of canonical) {
    const expected = ROUNDS.find((round) => round.id === item.roundId)!;
    const passed = item.opcode === expected.expected;
    rounds.push({ roundId: item.roundId, observedValue: item.observedValue, actualBranch: item.actualBranch, actionOpcode: item.opcode, passed });
    events.push({ type: 'round-started', roundId: item.roundId, observedValue: item.observedValue, actualBranch: item.actualBranch, opcode: null, state: null });
    events.push({ type: 'action-selected', roundId: item.roundId, observedValue: item.observedValue, actualBranch: item.actualBranch, opcode: item.opcode, state: passed ? item.opcode === 'guard-cave' ? 'cave-guarded' : 'origin-explained' : null });
    if (!passed) {
      const snapshot: YunzhanDialogueFailureSnapshot = { snapshotId: `yunzhan:${item.roundId}:${item.actualBranch}:${item.sourceBlockId}`, roundId: item.roundId, conditionKind: item.conditionKind, conditionLabel: item.conditionLabel, observedValue: item.observedValue, evidenceText: item.evidenceText, branch: item.actualBranch, actionOpcode: item.opcode };
      events.push({ type: 'run-finished', roundId: item.roundId, observedValue: item.observedValue, actualBranch: item.actualBranch, opcode: item.opcode, state: null });
      return { completed: false, finalState: null, rounds, diagnostic: { concept: 'branch-routing', sourceBlockId: item.sourceBlockId, messageCode: 'dialogue-action-does-not-fit-current-branch' }, failureSnapshot: snapshot, events, penalty: penalty() };
    }
  }
  events.push({ type: 'run-finished', roundId: 'pilgrimage-explicit', observedValue: true, actualBranch: 'then', opcode: 'explain-guanyin-origin', state: 'origin-explained' });
  return { completed: true, finalState: 'origin-explained', rounds, diagnostic: null, failureSnapshot: null, events, penalty: penalty() };
}
