export const HORSE_CARE_MISSION_ID = 'w2-m1' as const;

export const HORSE_CARE_BLOCK_DEFINITIONS = {
  xiyou_accept_stable_post: { scope: 'top', opcode: 'accept_stable_post' },
  xiyou_repeat_horse_care: { scope: 'top', childScope: 'repeat-body' },
  xiyou_care_next_horse: { scope: 'repeat-body', opcode: 'care_next_horse' },
  xiyou_learn_stable_rank: { scope: 'top', opcode: 'learn_stable_rank' },
  xiyou_leave_heaven: { scope: 'top', opcode: 'leave_heaven' },
} as const;

export type HorseCareBlockType = keyof typeof HORSE_CARE_BLOCK_DEFINITIONS;
export type HorseCareOpcode =
  | 'accept_stable_post'
  | 'repeat_horse_care_started'
  | 'care_next_horse'
  | 'repeat_horse_care_finished'
  | 'learn_stable_rank'
  | 'leave_heaven';

export interface HorseCareWorkspaceBlock {
  id: string;
  type: HorseCareBlockType;
  nextId: string | null;
  parentBlockId: string | null;
  repeatCount: number | null;
  x: number;
  y: number;
}

export interface HorseCareWorkspaceDraftV1 {
  version: 1;
  missionId: typeof HORSE_CARE_MISSION_ID;
  blocks: HorseCareWorkspaceBlock[];
}

export interface HorseCareInstruction {
  instructionId: string;
  sourceBlockId: string;
  parentBlockId: string | null;
  opcode: HorseCareOpcode;
  iteration: number | null;
  repeatCount: number | null;
}

export type HorseCareState =
  | 'awaiting-post'
  | 'post-accepted'
  | 'care-loop-started'
  | 'horses-cared-1'
  | 'horses-cared-2'
  | 'horses-cared-3'
  | 'care-loop-finished'
  | 'rank-learned'
  | 'left-heaven';

export interface HorseCareEvent {
  type: 'run-started' | 'instruction-accepted' | 'state-changed' | 'horse-cared' | 'instruction-rejected' | 'run-finished';
  state: HorseCareState;
  instructionId: string | null;
  sourceBlockId: string | null;
  parentBlockId: string | null;
  opcode: HorseCareOpcode | null;
  iteration: number | null;
  repeatCount: number | null;
  messageCode: string;
}

export interface HorseCareDiagnostic {
  type: 'instruction-rejected' | 'program-ended-incomplete';
  concept: 'sequence-precondition' | 'loop-count' | 'completeness';
  state: HorseCareState;
  instructionId: string | null;
  sourceBlockId: string | null;
  parentBlockId: string | null;
  opcode: HorseCareOpcode | null;
  iteration: number | null;
  repeatCount: number | null;
  messageCode: string;
}

export interface HorseCareRunResult {
  completed: boolean;
  finalState: HorseCareState;
  caredHorses: number;
  diagnostic: HorseCareDiagnostic | null;
  events: HorseCareEvent[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

const MAX_BLOCKS = 100;
const MAX_ID_LENGTH = 256;

export function isHorseCareBlockType(value: string): value is HorseCareBlockType {
  return Object.prototype.hasOwnProperty.call(HORSE_CARE_BLOCK_DEFINITIONS, value);
}

export function isHorseCareOpcode(value: string): value is HorseCareOpcode {
  return [
    'accept_stable_post',
    'repeat_horse_care_started',
    'care_next_horse',
    'repeat_horse_care_finished',
    'learn_stable_rank',
    'leave_heaven',
  ].includes(value);
}

export function validateHorseCareDraft(draft: HorseCareWorkspaceDraftV1): void {
  if (draft.version !== 1 || draft.missionId !== HORSE_CARE_MISSION_ID) throw new Error('弼马温草稿版本无效');
  if (draft.blocks.length > MAX_BLOCKS) throw new Error('弼马温草稿积木过多');
  const byId = new Map<string, HorseCareWorkspaceBlock>();
  const predecessors = new Set<string>();

  for (const block of draft.blocks) {
    if (!block.id || block.id.length > MAX_ID_LENGTH || byId.has(block.id) || !isHorseCareBlockType(block.type)) throw new Error('弼马温草稿包含无效积木');
    if (!Number.isFinite(block.x) || !Number.isFinite(block.y)) throw new Error('弼马温草稿坐标无效');
    if (block.nextId !== null && (!block.nextId || block.nextId.length > MAX_ID_LENGTH || predecessors.has(block.nextId))) throw new Error('弼马温草稿连接无效');
    if (block.parentBlockId !== null && (!block.parentBlockId || block.parentBlockId.length > MAX_ID_LENGTH)) throw new Error('弼马温草稿容器无效');
    const isRepeat = block.type === 'xiyou_repeat_horse_care';
    if (isRepeat ? !Number.isInteger(block.repeatCount) || block.repeatCount! < 1 || block.repeatCount! > 6 : block.repeatCount !== null) throw new Error('弼马温循环次数无效');
    byId.set(block.id, block);
    if (block.nextId !== null) predecessors.add(block.nextId);
  }

  for (const block of byId.values()) {
    if ((block.nextId !== null && !byId.has(block.nextId)) || (block.parentBlockId !== null && !byId.has(block.parentBlockId))) throw new Error('弼马温草稿引用未知积木');
    if (block.nextId !== null && byId.get(block.nextId)!.parentBlockId !== block.parentBlockId) throw new Error('弼马温草稿包含跨容器连接');
    if (block.type === 'xiyou_care_next_horse') {
      if (block.parentBlockId === null || byId.get(block.parentBlockId)!.type !== 'xiyou_repeat_horse_care') throw new Error('照料天马积木必须放在循环中');
    } else if (block.parentBlockId !== null) throw new Error('主程序积木不能放进循环体');
  }

  if (draft.blocks.length === 0) return;
  const roots = draft.blocks.filter((block) => block.parentBlockId === null && !predecessors.has(block.id));
  if (roots.length !== 1) throw new Error('弼马温草稿必须只有一条主程序');
  const visited = new Set<string>();
  const visit = (firstId: string | null, parentId: string | null) => {
    for (let currentId = firstId; currentId !== null;) {
      const block = byId.get(currentId);
      if (!block || visited.has(currentId) || block.parentBlockId !== parentId) throw new Error('弼马温草稿包含环或断开的连接');
      visited.add(currentId);
      const childRoots = draft.blocks.filter((candidate) => candidate.parentBlockId === currentId && !predecessors.has(candidate.id));
      if (block.type === 'xiyou_repeat_horse_care') {
        if (childRoots.length > 1) throw new Error('重复照料循环最多只能有一条循环体');
        if (childRoots.length === 1) visit(childRoots[0].id, currentId);
      } else if (childRoots.length !== 0) throw new Error('非循环积木不能包含子程序');
      currentId = block.nextId;
    }
  };
  visit(roots[0].id, null);
  if (visited.size !== draft.blocks.length) throw new Error('弼马温草稿包含孤立积木');
}

export function compileHorseCareDraft(draft: HorseCareWorkspaceDraftV1): HorseCareInstruction[] {
  validateHorseCareDraft(draft);
  if (draft.blocks.length === 0) throw new Error('弼马温草稿不能为空');
  const byId = new Map(draft.blocks.map((block) => [block.id, block]));
  const predecessors = new Set(draft.blocks.flatMap((block) => block.nextId === null ? [] : [block.nextId]));
  const root = draft.blocks.find((block) => block.parentBlockId === null && !predecessors.has(block.id))!;
  const trace: HorseCareInstruction[] = [];
  const instruction = (block: HorseCareWorkspaceBlock, opcode: HorseCareOpcode, suffix = '', iteration: number | null = null, repeatCount: number | null = null): HorseCareInstruction => ({
    instructionId: `instruction:${block.id}${suffix}`,
    sourceBlockId: block.id,
    parentBlockId: block.parentBlockId,
    opcode,
    iteration,
    repeatCount,
  });
  const visitBody = (firstId: string | null, iteration: number) => {
    for (let currentId = firstId; currentId !== null;) {
      const block = byId.get(currentId)!;
      trace.push(instruction(block, 'care_next_horse', `:iteration:${iteration}`, iteration));
      currentId = block.nextId;
    }
  };
  for (let currentId: string | null = root.id; currentId !== null;) {
    const block: HorseCareWorkspaceBlock = byId.get(currentId)!;
    if (block.type === 'xiyou_repeat_horse_care') {
      const repeatCount = block.repeatCount!;
      trace.push(instruction(block, 'repeat_horse_care_started', ':start', null, repeatCount));
      const child = draft.blocks.find((candidate) => candidate.parentBlockId === block.id && !predecessors.has(candidate.id));
      if (!child) throw new Error('重复照料循环必须有一条循环体');
      for (let iteration = 1; iteration <= repeatCount; iteration += 1) visitBody(child.id, iteration);
      trace.push(instruction(block, 'repeat_horse_care_finished', ':finish', null, repeatCount));
    } else {
      const opcode: HorseCareOpcode = block.type === 'xiyou_accept_stable_post'
        ? 'accept_stable_post'
        : block.type === 'xiyou_care_next_horse'
          ? 'care_next_horse'
          : block.type === 'xiyou_learn_stable_rank'
            ? 'learn_stable_rank'
            : 'leave_heaven';
      trace.push(instruction(block, opcode, '', null));
    }
    currentId = block.nextId;
  }
  return trace;
}

export function runHorseCare(instructions: readonly HorseCareInstruction[]): HorseCareRunResult {
  let state: HorseCareState = 'awaiting-post';
  let caredHorses = 0;
  let activeRepeatCount: number | null = null;
  let last: HorseCareInstruction | null = null;
  const penalty = { livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const };
  const event = (type: HorseCareEvent['type'], item: HorseCareInstruction | null, messageCode: string): HorseCareEvent => ({
    type,
    state,
    instructionId: item?.instructionId ?? null,
    sourceBlockId: item?.sourceBlockId ?? null,
    parentBlockId: item?.parentBlockId ?? null,
    opcode: item?.opcode ?? null,
    iteration: item?.iteration ?? null,
    repeatCount: item?.repeatCount ?? null,
    messageCode,
  });
  const events: HorseCareEvent[] = [event('run-started', null, 'horse-care.run-started')];

  for (const item of instructions) {
    let nextState: HorseCareState | null = null;
    let concept: HorseCareDiagnostic['concept'] = 'sequence-precondition';
    if (item.opcode === 'accept_stable_post' && state === 'awaiting-post') nextState = 'post-accepted';
    else if (item.opcode === 'repeat_horse_care_started' && state === 'post-accepted' && item.repeatCount !== null) {
      activeRepeatCount = item.repeatCount;
      nextState = 'care-loop-started';
    } else if (item.opcode === 'care_next_horse' && activeRepeatCount !== null && item.iteration === caredHorses + 1) {
      if (caredHorses < 3 && item.iteration <= activeRepeatCount) {
        caredHorses += 1;
        nextState = `horses-cared-${caredHorses}` as HorseCareState;
      } else concept = 'loop-count';
    } else if (item.opcode === 'repeat_horse_care_finished' && activeRepeatCount === item.repeatCount) {
      if (caredHorses === 3 && activeRepeatCount === 3) nextState = 'care-loop-finished';
      else concept = 'loop-count';
    } else if (item.opcode === 'learn_stable_rank' && state === 'care-loop-finished') nextState = 'rank-learned';
    else if (item.opcode === 'leave_heaven' && state === 'rank-learned') nextState = 'left-heaven';

    if (nextState === null) {
      const messageCode = `horse-care.${concept}.${state}.${item.opcode}`;
      const diagnostic: HorseCareDiagnostic = { type: 'instruction-rejected', concept, state, ...item, messageCode };
      events.push(event('instruction-rejected', item, messageCode), event('run-finished', null, 'horse-care.run-finished.rejected'));
      return { completed: false, finalState: state, caredHorses, diagnostic, events, penalty };
    }

    events.push(event('instruction-accepted', item, 'horse-care.instruction-accepted'));
    state = nextState;
    last = item;
    events.push(event(item.opcode === 'care_next_horse' ? 'horse-cared' : 'state-changed', item, `horse-care.state-changed.${state}`));
  }

  const completed = state === 'left-heaven';
  events.push(event('run-finished', null, completed ? 'horse-care.run-finished.completed' : 'horse-care.run-finished.incomplete'));
  const diagnostic: HorseCareDiagnostic | null = completed ? null : {
    type: 'program-ended-incomplete',
    concept: 'completeness',
    state,
    instructionId: last?.instructionId ?? null,
    sourceBlockId: last?.sourceBlockId ?? null,
    parentBlockId: last?.parentBlockId ?? null,
    opcode: last?.opcode ?? null,
    iteration: last?.iteration ?? null,
    repeatCount: last?.repeatCount ?? null,
    messageCode: `horse-care.program-ended-incomplete.${state}`,
  };
  return { completed, finalState: state, caredHorses, diagnostic, events, penalty };
}
