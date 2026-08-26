export const FURNACE_CONDITION_MISSION_ID = 'w2-m4' as const;

export const FURNACE_CONDITION_BLOCK_DEFINITIONS = {
  xiyou_enter_eight_trigram_furnace: { scope: 'top', opcode: 'enter_furnace' },
  xiyou_shelter_in_xun: { scope: 'top', opcode: 'shelter_in_xun' },
  xiyou_repeat_until_furnace_ready: { scope: 'top', opcode: 'repeat_until' },
  xiyou_wait_seven_days: { scope: 'loop', opcode: 'wait_seven_days' },
  xiyou_observe_furnace_door: { scope: 'loop', opcode: 'observe_furnace_door' },
  xiyou_leap_out_of_furnace: { scope: 'top', opcode: 'leap_out' },
  xiyou_kick_over_furnace: { scope: 'top', opcode: 'kick_furnace' },
  xiyou_condition_red_eyes: { scope: 'condition', condition: 'red-eyes' },
  xiyou_condition_furnace_open: { scope: 'condition', condition: 'furnace-open' },
  xiyou_condition_smoke_clears: { scope: 'condition', condition: 'smoke-clears' },
} as const;

export type FurnaceConditionBlockType = keyof typeof FURNACE_CONDITION_BLOCK_DEFINITIONS;
export type FurnaceConditionState = 'captured' | 'furnace-entered' | 'sheltered-in-xun' | 'furnace-waiting' | 'furnace-open' | 'escaped' | 'furnace-toppled';
export type FurnaceConditionOpcode = 'enter_furnace' | 'shelter_in_xun' | 'condition_checked' | 'wait_seven_days' | 'observe_furnace_door' | 'leap_out' | 'kick_furnace';
export type FurnaceConditionKind = 'red-eyes' | 'furnace-open' | 'smoke-clears';

export interface FurnaceConditionWorkspaceBlock {
  id: string;
  type: FurnaceConditionBlockType;
  previousId: string | null;
  nextId: string | null;
  parentBlockId: string | null;
  conditionBlockId: string | null;
  x: number;
  y: number;
}

export interface FurnaceConditionWorkspaceDraftV1 {
  version: 1;
  missionId: typeof FURNACE_CONDITION_MISSION_ID;
  blocks: FurnaceConditionWorkspaceBlock[];
}

export interface FurnaceConditionInstruction {
  instructionId: string;
  sourceBlockId: string;
  parentBlockId: string | null;
  conditionSourceBlockId: string | null;
  condition: FurnaceConditionKind | null;
  opcode: FurnaceConditionOpcode;
  iteration: number | null;
  elapsedDays: number;
}

export interface FurnaceConditionDiagnostic {
  type: 'instruction-rejected' | 'condition-never-met' | 'program-ended-incomplete';
  concept: 'loop-condition' | 'condition-never-met' | 'sequence-precondition' | 'completeness';
  sourceBlockId: string | null;
  opcode: FurnaceConditionOpcode | null;
  state: FurnaceConditionState;
  messageCode: string;
}

export interface FurnaceConditionRuntimeEvent {
  type: 'run-started' | 'instruction-accepted' | 'instruction-rejected' | 'state-changed' | 'run-finished';
  state: FurnaceConditionState;
  sourceBlockId: string | null;
  opcode: FurnaceConditionOpcode | null;
  iteration: number | null;
  messageCode: string;
}

export interface FurnaceConditionRunResult {
  completed: boolean;
  finalState: FurnaceConditionState;
  elapsedDays: number;
  completedRounds: number;
  diagnostic: FurnaceConditionDiagnostic | null;
  events: FurnaceConditionRuntimeEvent[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

const MAX_BLOCKS = 100;
const MAX_ID_LENGTH = 256;
const isCondition = (type: FurnaceConditionBlockType) => FURNACE_CONDITION_BLOCK_DEFINITIONS[type].scope === 'condition';
const isLoop = (type: FurnaceConditionBlockType) => type === 'xiyou_repeat_until_furnace_ready';
const conditionFor = (type: FurnaceConditionBlockType): FurnaceConditionKind | null => {
  const definition = FURNACE_CONDITION_BLOCK_DEFINITIONS[type];
  return 'condition' in definition ? definition.condition : null;
};

export function isFurnaceConditionBlockType(value: string): value is FurnaceConditionBlockType {
  return Object.prototype.hasOwnProperty.call(FURNACE_CONDITION_BLOCK_DEFINITIONS, value);
}

export function isFurnaceConditionOpcode(value: string): value is FurnaceConditionOpcode {
  return value === 'enter_furnace'
    || value === 'shelter_in_xun'
    || value === 'condition_checked'
    || value === 'wait_seven_days'
    || value === 'observe_furnace_door'
    || value === 'leap_out'
    || value === 'kick_furnace';
}

export function isFurnaceConditionKind(value: string): value is FurnaceConditionKind {
  return value === 'red-eyes' || value === 'furnace-open' || value === 'smoke-clears';
}

export function createDefaultFurnaceConditionDraft(): FurnaceConditionWorkspaceDraftV1 {
  return {
    version: 1,
    missionId: FURNACE_CONDITION_MISSION_ID,
    blocks: [
      { id: 'enter-furnace', type: 'xiyou_enter_eight_trigram_furnace', previousId: null, nextId: 'shelter-xun', parentBlockId: null, conditionBlockId: null, x: 40, y: 32 },
      { id: 'shelter-xun', type: 'xiyou_shelter_in_xun', previousId: 'enter-furnace', nextId: 'repeat-until-open', parentBlockId: null, conditionBlockId: null, x: 40, y: 84 },
      { id: 'repeat-until-open', type: 'xiyou_repeat_until_furnace_ready', previousId: 'shelter-xun', nextId: 'leap-out', parentBlockId: null, conditionBlockId: 'smoke-red-eyes', x: 40, y: 136 },
      { id: 'smoke-red-eyes', type: 'xiyou_condition_red_eyes', previousId: null, nextId: null, parentBlockId: 'repeat-until-open', conditionBlockId: null, x: 260, y: 136 },
      { id: 'wait-seven-days', type: 'xiyou_wait_seven_days', previousId: null, nextId: 'observe-door', parentBlockId: 'repeat-until-open', conditionBlockId: null, x: 80, y: 196 },
      { id: 'observe-door', type: 'xiyou_observe_furnace_door', previousId: 'wait-seven-days', nextId: null, parentBlockId: 'repeat-until-open', conditionBlockId: null, x: 80, y: 248 },
      { id: 'leap-out', type: 'xiyou_leap_out_of_furnace', previousId: 'repeat-until-open', nextId: 'kick-furnace', parentBlockId: null, conditionBlockId: null, x: 40, y: 304 },
      { id: 'kick-furnace', type: 'xiyou_kick_over_furnace', previousId: 'leap-out', nextId: null, parentBlockId: null, conditionBlockId: null, x: 40, y: 356 },
    ],
  };
}

export function validateFurnaceConditionDraft(draft: FurnaceConditionWorkspaceDraftV1): void {
  if (draft.version !== 1 || draft.missionId !== FURNACE_CONDITION_MISSION_ID || !Array.isArray(draft.blocks)) throw new Error('八卦炉草稿版本无效');
  if (draft.blocks.length > MAX_BLOCKS) throw new Error('八卦炉草稿积木过多');
  const byId = new Map<string, FurnaceConditionWorkspaceBlock>();
  const predecessors = new Set<string>();
  for (const block of draft.blocks) {
    if (!block.id || block.id.length > MAX_ID_LENGTH || byId.has(block.id) || !isFurnaceConditionBlockType(block.type)) throw new Error('八卦炉草稿包含无效积木');
    if (!Number.isFinite(block.x) || !Number.isFinite(block.y)) throw new Error('八卦炉草稿坐标无效');
    if (block.nextId !== null && (!block.nextId || predecessors.has(block.nextId))) throw new Error('八卦炉草稿连接无效');
    if (block.previousId !== null && !block.previousId) throw new Error('八卦炉草稿前序连接无效');
    if (block.parentBlockId !== null && !block.parentBlockId) throw new Error('八卦炉草稿容器无效');
    if (block.conditionBlockId !== null && !block.conditionBlockId) throw new Error('八卦炉草稿条件无效');
    if (block.nextId !== null) predecessors.add(block.nextId);
    byId.set(block.id, block);
  }
  for (const block of byId.values()) {
    if ((block.previousId !== null && !byId.has(block.previousId)) || (block.nextId !== null && !byId.has(block.nextId)) || (block.parentBlockId !== null && !byId.has(block.parentBlockId)) || (block.conditionBlockId !== null && !byId.has(block.conditionBlockId))) throw new Error('八卦炉草稿引用未知积木');
    if (block.previousId !== null && byId.get(block.previousId)!.nextId !== block.id) throw new Error('八卦炉草稿前序连接不一致');
    if (block.nextId !== null && byId.get(block.nextId)!.previousId !== block.id) throw new Error('八卦炉草稿连接不一致');
    if (isCondition(block.type)) {
      if (block.parentBlockId === null || block.previousId !== null || block.nextId !== null || block.conditionBlockId !== null || !isLoop(byId.get(block.parentBlockId)!.type)) throw new Error('八卦炉条件必须连接到循环');
    } else if (isLoop(block.type)) {
      const condition = block.conditionBlockId === null ? null : byId.get(block.conditionBlockId);
      if (!condition || !isCondition(condition.type) || condition.parentBlockId !== block.id) throw new Error('八卦炉循环缺少真实条件');
    } else if (block.conditionBlockId !== null) throw new Error('只有循环可以连接条件');
    if (block.nextId !== null && byId.get(block.nextId)!.parentBlockId !== block.parentBlockId) throw new Error('八卦炉草稿包含跨容器连接');
  }
  const top = draft.blocks.filter((block) => block.parentBlockId === null);
  const topRoots = top.filter((block) => block.previousId === null && !predecessors.has(block.id));
  if (topRoots.length !== 1) throw new Error('八卦炉草稿必须只有一条主程序');
  const chain = (firstId: string, parentBlockId: string | null) => {
    const seen = new Set<string>();
    for (let current: string | null = firstId; current !== null;) {
      const block = byId.get(current);
      if (!block || seen.has(current) || block.parentBlockId !== parentBlockId || isCondition(block.type)) throw new Error('八卦炉草稿包含环或断开的连接');
      seen.add(current);
      current = block.nextId;
    }
    return seen;
  };
  const main = chain(topRoots[0].id, null);
  const loop = [...main].map((id) => byId.get(id)!).find((block) => isLoop(block.type));
  if (!loop) throw new Error('八卦炉草稿缺少循环');
  const children = draft.blocks.filter((block) => block.parentBlockId === loop.id && !isCondition(block.type));
  const childRoots = children.filter((block) => block.previousId === null && !predecessors.has(block.id));
  if (childRoots.length !== 1) throw new Error('八卦炉循环体必须是一条真实连接');
  const body = chain(childRoots[0].id, loop.id);
  if (main.size + body.size + 1 !== draft.blocks.length) throw new Error('八卦炉草稿包含孤立积木');
  const expectedTop: FurnaceConditionBlockType[] = ['xiyou_enter_eight_trigram_furnace', 'xiyou_shelter_in_xun', 'xiyou_repeat_until_furnace_ready', 'xiyou_leap_out_of_furnace', 'xiyou_kick_over_furnace'];
  const expectedBody: FurnaceConditionBlockType[] = ['xiyou_wait_seven_days', 'xiyou_observe_furnace_door'];
  if (expectedTop.some((type) => [...main].filter((id) => byId.get(id)!.type === type).length !== 1) || expectedBody.some((type) => [...body].filter((id) => byId.get(id)!.type === type).length !== 1) || main.size !== expectedTop.length || body.size !== expectedBody.length) throw new Error('八卦炉草稿包含遗漏或重复动作');
}

const item = (sourceBlockId: string, parentBlockId: string | null, opcode: FurnaceConditionOpcode, iteration: number | null, elapsedDays: number, conditionSourceBlockId: string | null = null, condition: FurnaceConditionKind | null = null): FurnaceConditionInstruction => ({ instructionId: `instruction:${sourceBlockId}:${opcode}:${iteration ?? 'once'}`, sourceBlockId, parentBlockId, conditionSourceBlockId, condition, opcode, iteration, elapsedDays });

export function compileFurnaceConditionDraft(draft: FurnaceConditionWorkspaceDraftV1): FurnaceConditionInstruction[] {
  validateFurnaceConditionDraft(draft);
  const byId = new Map(draft.blocks.map((block) => [block.id, block]));
  const root = draft.blocks.find((block) => block.parentBlockId === null && !draft.blocks.some((candidate) => candidate.nextId === block.id))!;
  const top: FurnaceConditionWorkspaceBlock[] = [];
  for (let current: FurnaceConditionWorkspaceBlock | undefined = root; current; current = current.nextId === null ? undefined : byId.get(current.nextId)) top.push(current);
  const loop = top.find((block) => isLoop(block.type))!;
  const conditionBlock = byId.get(loop.conditionBlockId!)!;
  const condition = conditionFor(conditionBlock.type)!;
  const bodyRoot = draft.blocks.find((block) => block.parentBlockId === loop.id && !isCondition(block.type) && !draft.blocks.some((candidate) => candidate.nextId === block.id))!;
  const body: FurnaceConditionWorkspaceBlock[] = [];
  for (let current: FurnaceConditionWorkspaceBlock | undefined = bodyRoot; current; current = current.nextId === null ? undefined : byId.get(current.nextId)) body.push(current);
  const trace: FurnaceConditionInstruction[] = [item(top[0].id, null, 'enter_furnace', null, 0), item(top[1].id, null, 'shelter_in_xun', null, 0)];
  let elapsedDays = 0;
  for (let round = 0; round <= 7; round += 1) {
    const satisfied = condition === 'red-eyes' ? round >= 1 : condition === 'furnace-open' ? round >= 7 : false;
    trace.push(item(loop.id, null, 'condition_checked', round, elapsedDays, conditionBlock.id, condition));
    if (satisfied || round === 7) break;
    elapsedDays += 7;
    trace.push(item(body[0].id, loop.id, 'wait_seven_days', round + 1, elapsedDays));
    trace.push(item(body[1].id, loop.id, 'observe_furnace_door', round + 1, elapsedDays));
  }
  if (condition !== 'smoke-clears') trace.push(item(top[3].id, null, 'leap_out', null, elapsedDays), item(top[4].id, null, 'kick_furnace', null, elapsedDays));
  return trace;
}

export function runFurnaceCondition(trace: readonly FurnaceConditionInstruction[]): FurnaceConditionRunResult {
  let state: FurnaceConditionState = 'captured';
  let elapsedDays = 0;
  let completedRounds = 0;
  let loopExited = false;
  let lastCondition: FurnaceConditionInstruction | null = null;
  const penalty = { livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const };
  const events: FurnaceConditionRuntimeEvent[] = [];
  const event = (type: FurnaceConditionRuntimeEvent['type'], instruction: FurnaceConditionInstruction | null, messageCode: string) => events.push({ type, state, sourceBlockId: instruction?.sourceBlockId ?? null, opcode: instruction?.opcode ?? null, iteration: instruction?.iteration ?? null, messageCode });
  const fail = (instruction: FurnaceConditionInstruction | null, type: FurnaceConditionDiagnostic['type'], concept: FurnaceConditionDiagnostic['concept'], sourceBlockId: string | null, messageCode: string): FurnaceConditionRunResult => {
    const diagnostic = { type, concept, sourceBlockId, opcode: instruction?.opcode ?? null, state, messageCode };
    event('instruction-rejected', instruction, messageCode); event('run-finished', null, 'furnace.run-finished.rejected');
    return { completed: false, finalState: state, elapsedDays, completedRounds, diagnostic, events, penalty };
  };
  event('run-started', null, 'furnace.run-started');
  for (const instruction of trace) {
    const expectedElapsedDays = instruction.opcode === 'wait_seven_days' ? elapsedDays + 7 : elapsedDays;
    if (instruction.elapsedDays !== expectedElapsedDays) return fail(instruction, 'instruction-rejected', 'sequence-precondition', instruction.sourceBlockId, 'furnace.elapsed-days-mismatch');
    if (instruction.opcode === 'enter_furnace' && state === 'captured') state = 'furnace-entered';
    else if (instruction.opcode === 'shelter_in_xun' && state === 'furnace-entered') state = 'sheltered-in-xun';
    else if (instruction.opcode === 'condition_checked' && (state === 'sheltered-in-xun' || state === 'furnace-waiting' || state === 'furnace-open')) {
      lastCondition = instruction;
      const satisfied = instruction.condition === 'red-eyes' ? completedRounds >= 1 : instruction.condition === 'furnace-open' ? state === 'furnace-open' : false;
      if (satisfied) loopExited = true;
      else if (completedRounds >= 7) return fail(instruction, 'condition-never-met', 'condition-never-met', instruction.conditionSourceBlockId, 'furnace.condition-never-met');
    } else if (instruction.opcode === 'wait_seven_days' && !loopExited && (state === 'sheltered-in-xun' || state === 'furnace-waiting')) {
      elapsedDays += 7; state = 'furnace-waiting';
    } else if (instruction.opcode === 'observe_furnace_door' && !loopExited && state === 'furnace-waiting') {
      completedRounds += 1; if (completedRounds === 7) state = 'furnace-open';
    } else if (instruction.opcode === 'leap_out' && loopExited && state === 'furnace-open') state = 'escaped';
    else if (instruction.opcode === 'leap_out' && loopExited) return fail(instruction, 'instruction-rejected', 'loop-condition', lastCondition?.conditionSourceBlockId ?? null, 'furnace.loop-condition.early-exit');
    else if (instruction.opcode === 'kick_furnace' && state === 'escaped') state = 'furnace-toppled';
    else return fail(instruction, 'instruction-rejected', 'sequence-precondition', instruction.sourceBlockId, 'furnace.sequence-precondition');
    event('instruction-accepted', instruction, 'furnace.instruction-accepted'); event('state-changed', instruction, `furnace.state-changed.${state}`);
  }
  const completed = state === 'furnace-toppled';
  const diagnostic = completed ? null : { type: 'program-ended-incomplete' as const, concept: 'completeness' as const, sourceBlockId: trace.at(-1)?.sourceBlockId ?? null, opcode: trace.at(-1)?.opcode ?? null, state, messageCode: 'furnace.program-ended-incomplete' };
  event('run-finished', null, completed ? 'furnace.run-finished.completed' : 'furnace.run-finished.incomplete');
  return { completed, finalState: state, elapsedDays, completedRounds, diagnostic, events, penalty };
}
