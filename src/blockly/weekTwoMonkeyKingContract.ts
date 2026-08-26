export const MONKEY_KING_MISSION_ID = 'w2-m2' as const;

export const MONKEY_KING_EVENT_QUEUE = ['return-to-flower-fruit', 'heavenly-title-conferred'] as const;
export type MonkeyKingEventType = typeof MONKEY_KING_EVENT_QUEUE[number];

export const MONKEY_KING_BLOCK_DEFINITIONS = {
  xiyou_on_return_flower_fruit: { kind: 'handler', eventType: 'return-to-flower-fruit' },
  xiyou_on_heavenly_title: { kind: 'handler', eventType: 'heavenly-title-conferred' },
  xiyou_raise_great_sage_flag: { kind: 'action', opcode: 'raise_great_sage_flag', eventType: 'return-to-flower-fruit' },
  xiyou_accept_great_sage_title: { kind: 'action', opcode: 'accept_great_sage_title', eventType: 'heavenly-title-conferred' },
  xiyou_build_great_sage_residence: { kind: 'action', opcode: 'build_great_sage_residence', eventType: 'heavenly-title-conferred' },
} as const;

export type MonkeyKingBlockType = keyof typeof MONKEY_KING_BLOCK_DEFINITIONS;
export type MonkeyKingOpcode = 'raise_great_sage_flag' | 'accept_great_sage_title' | 'build_great_sage_residence';
export type MonkeyKingState = 'awaiting-return' | 'flag-raised' | 'title-accepted' | 'residence-built';

export interface MonkeyKingWorkspaceBlock {
  id: string;
  type: MonkeyKingBlockType;
  nextId: string | null;
  parentBlockId: string | null;
  x: number;
  y: number;
}

export interface MonkeyKingWorkspaceDraftV1 {
  version: 1;
  missionId: typeof MONKEY_KING_MISSION_ID;
  blocks: MonkeyKingWorkspaceBlock[];
}

interface MonkeyKingInstructionBase {
  instructionId: string;
  eventId: string;
  eventType: MonkeyKingEventType;
  dispatchIndex: number;
  handlerBlockId: string;
  sourceBlockId: string;
  parentBlockId: string | null;
}

export type MonkeyKingInstruction =
  | (MonkeyKingInstructionBase & { kind: 'handler'; opcode: null })
  | (MonkeyKingInstructionBase & { kind: 'action'; opcode: MonkeyKingOpcode });

export interface MonkeyKingRuntimeEvent {
  type: 'run-started' | 'event-dispatched' | 'handler-entered' | 'instruction-accepted' | 'instruction-rejected' | 'state-changed' | 'handler-finished' | 'run-finished';
  state: MonkeyKingState;
  eventId: string | null;
  eventType: MonkeyKingEventType | null;
  dispatchIndex: number | null;
  handlerBlockId: string | null;
  instructionId: string | null;
  sourceBlockId: string | null;
  parentBlockId: string | null;
  opcode: MonkeyKingOpcode | null;
  messageCode: string;
}

export interface MonkeyKingDiagnostic {
  type: 'instruction-rejected' | 'program-ended-incomplete';
  concept: 'event-routing' | 'handler-sequence' | 'completeness';
  state: MonkeyKingState;
  eventId: string | null;
  eventType: MonkeyKingEventType | null;
  dispatchIndex: number | null;
  handlerBlockId: string | null;
  instructionId: string | null;
  sourceBlockId: string | null;
  parentBlockId: string | null;
  opcode: MonkeyKingOpcode | null;
  messageCode: string;
}

export interface MonkeyKingRunResult {
  completed: boolean;
  finalState: MonkeyKingState;
  dispatchedEvents: MonkeyKingEventType[];
  diagnostic: MonkeyKingDiagnostic | null;
  events: MonkeyKingRuntimeEvent[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

const MAX_BLOCKS = 100;
const MAX_ID_LENGTH = 256;

export function isMonkeyKingBlockType(value: string): value is MonkeyKingBlockType {
  return Object.prototype.hasOwnProperty.call(MONKEY_KING_BLOCK_DEFINITIONS, value);
}

export function isMonkeyKingOpcode(value: string): value is MonkeyKingOpcode {
  return value === 'raise_great_sage_flag' || value === 'accept_great_sage_title' || value === 'build_great_sage_residence';
}

export function isMonkeyKingEventType(value: string): value is MonkeyKingEventType {
  return value === 'return-to-flower-fruit' || value === 'heavenly-title-conferred';
}

export function validateMonkeyKingDraft(draft: MonkeyKingWorkspaceDraftV1): void {
  if (draft.version !== 1 || draft.missionId !== MONKEY_KING_MISSION_ID || !Array.isArray(draft.blocks)) throw new Error('齐天大圣草稿版本无效');
  if (draft.blocks.length > MAX_BLOCKS) throw new Error('齐天大圣草稿积木过多');
  const byId = new Map<string, MonkeyKingWorkspaceBlock>();
  const predecessors = new Set<string>();

  for (const block of draft.blocks) {
    if (!block.id || block.id.length > MAX_ID_LENGTH || byId.has(block.id) || !isMonkeyKingBlockType(block.type)) throw new Error('齐天大圣草稿包含无效积木');
    if (!Number.isFinite(block.x) || !Number.isFinite(block.y)) throw new Error('齐天大圣草稿坐标无效');
    if (block.nextId !== null && (!block.nextId || block.nextId.length > MAX_ID_LENGTH || predecessors.has(block.nextId))) throw new Error('齐天大圣草稿连接无效');
    if (block.parentBlockId !== null && (!block.parentBlockId || block.parentBlockId.length > MAX_ID_LENGTH)) throw new Error('齐天大圣草稿事件来源无效');
    byId.set(block.id, block);
    if (block.nextId !== null) predecessors.add(block.nextId);
  }

  for (const block of byId.values()) {
    const definition = MONKEY_KING_BLOCK_DEFINITIONS[block.type];
    if ((block.nextId !== null && !byId.has(block.nextId)) || (block.parentBlockId !== null && !byId.has(block.parentBlockId))) throw new Error('齐天大圣草稿引用未知积木');
    if (definition.kind === 'handler' && (block.parentBlockId !== null || block.nextId !== null)) throw new Error('事件帽必须位于程序顶层');
    if (definition.kind === 'action' && block.parentBlockId !== null) {
      const parent = byId.get(block.parentBlockId)!;
      if (MONKEY_KING_BLOCK_DEFINITIONS[parent.type].kind !== 'handler') throw new Error('动作积木只能连接在事件帽下');
    }
    if (block.nextId !== null && byId.get(block.nextId)!.parentBlockId !== block.parentBlockId) throw new Error('齐天大圣草稿包含跨事件连接');
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error('齐天大圣草稿包含连接环');
    if (visited.has(id)) return;
    visiting.add(id);
    const next = byId.get(id)?.nextId;
    if (next !== null && next !== undefined) visit(next);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) visit(id);
}

function actionChain(draft: MonkeyKingWorkspaceDraftV1, handlerId: string): MonkeyKingWorkspaceBlock[] {
  const predecessors = new Set(draft.blocks.flatMap((block) => block.nextId === null ? [] : [block.nextId]));
  const roots = draft.blocks.filter((block) => block.parentBlockId === handlerId && !predecessors.has(block.id));
  if (roots.length === 0) throw new Error('齐天大圣事件处理器不能为空');
  if (roots.length !== 1) throw new Error('齐天大圣事件处理器必须只有一条动作链');
  const byId = new Map(draft.blocks.map((block) => [block.id, block]));
  const chain: MonkeyKingWorkspaceBlock[] = [];
  for (let current: MonkeyKingWorkspaceBlock | undefined = roots[0]; current; current = current.nextId === null ? undefined : byId.get(current.nextId)) chain.push(current);
  const nestedCount = draft.blocks.filter((block) => block.parentBlockId === handlerId).length;
  if (chain.length !== nestedCount) throw new Error('齐天大圣事件处理器包含断开的动作');
  return chain;
}

export function compileMonkeyKingDraft(draft: MonkeyKingWorkspaceDraftV1): MonkeyKingInstruction[] {
  validateMonkeyKingDraft(draft);
  const orphan = draft.blocks.find((block) => MONKEY_KING_BLOCK_DEFINITIONS[block.type].kind === 'action' && block.parentBlockId === null);
  if (orphan) throw new Error(`动作积木必须连接在事件帽下：${orphan.id}`);
  const trace: MonkeyKingInstruction[] = [];

  for (const [dispatchIndex, eventType] of MONKEY_KING_EVENT_QUEUE.entries()) {
    const hats = draft.blocks.filter((block) => {
      const definition = MONKEY_KING_BLOCK_DEFINITIONS[block.type];
      return definition.kind === 'handler' && definition.eventType === eventType;
    });
    if (hats.length === 0) throw new Error(`缺少${eventType}事件帽`);
    if (hats.length !== 1) throw new Error(`重复${eventType}事件帽`);
    const handler = hats[0];
    const eventId = `dispatch:${eventType}`;
    trace.push({ kind: 'handler', instructionId: `handler:${handler.id}`, eventId, eventType, dispatchIndex, handlerBlockId: handler.id, sourceBlockId: handler.id, parentBlockId: null, opcode: null });
    for (const block of actionChain(draft, handler.id)) {
      const definition = MONKEY_KING_BLOCK_DEFINITIONS[block.type];
      if (definition.kind !== 'action') throw new Error('事件处理器只能包含动作积木');
      trace.push({ kind: 'action', instructionId: `instruction:${block.id}`, eventId, eventType, dispatchIndex, handlerBlockId: handler.id, sourceBlockId: block.id, parentBlockId: block.parentBlockId, opcode: definition.opcode });
    }
  }
  return trace;
}

export function runMonkeyKingEvents(trace: readonly MonkeyKingInstruction[]): MonkeyKingRunResult {
  let state: MonkeyKingState = 'awaiting-return';
  const dispatchedEvents: MonkeyKingEventType[] = [];
  const events: MonkeyKingRuntimeEvent[] = [];
  const penalty = { livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const };
  const runtimeEvent = (type: MonkeyKingRuntimeEvent['type'], item: MonkeyKingInstruction | null, messageCode: string): MonkeyKingRuntimeEvent => ({
    type,
    state,
    eventId: item?.eventId ?? null,
    eventType: item?.eventType ?? null,
    dispatchIndex: item?.dispatchIndex ?? null,
    handlerBlockId: item?.handlerBlockId ?? null,
    instructionId: item?.instructionId ?? null,
    sourceBlockId: item?.sourceBlockId ?? null,
    parentBlockId: item?.parentBlockId ?? null,
    opcode: item?.opcode ?? null,
    messageCode,
  });
  const finishRejected = (item: MonkeyKingInstruction, concept: MonkeyKingDiagnostic['concept'], messageCode: string): MonkeyKingRunResult => {
    const diagnostic: MonkeyKingDiagnostic = { type: 'instruction-rejected', concept, state, eventId: item.eventId, eventType: item.eventType, dispatchIndex: item.dispatchIndex, handlerBlockId: item.handlerBlockId, instructionId: item.instructionId, sourceBlockId: item.sourceBlockId, parentBlockId: item.parentBlockId, opcode: item.opcode, messageCode };
    events.push(runtimeEvent('instruction-rejected', item, messageCode), runtimeEvent('run-finished', null, 'monkey-king.run-finished.rejected'));
    return { completed: false, finalState: state, dispatchedEvents, diagnostic, events, penalty };
  };

  events.push(runtimeEvent('run-started', null, 'monkey-king.run-started'));
  for (const [dispatchIndex, eventType] of MONKEY_KING_EVENT_QUEUE.entries()) {
    const handler = trace.find((item) => item.kind === 'handler' && item.eventType === eventType && item.dispatchIndex === dispatchIndex);
    if (!handler) {
      const diagnostic: MonkeyKingDiagnostic = { type: 'program-ended-incomplete', concept: 'completeness', state, eventId: `dispatch:${eventType}`, eventType, dispatchIndex, handlerBlockId: null, instructionId: null, sourceBlockId: null, parentBlockId: null, opcode: null, messageCode: `monkey-king.missing-handler.${eventType}` };
      events.push(runtimeEvent('run-finished', null, 'monkey-king.run-finished.incomplete'));
      return { completed: false, finalState: state, dispatchedEvents, diagnostic, events, penalty };
    }
    dispatchedEvents.push(eventType);
    events.push(runtimeEvent('event-dispatched', handler, `monkey-king.event-dispatched.${eventType}`), runtimeEvent('handler-entered', handler, `monkey-king.handler-entered.${eventType}`));
    const actions = trace.filter((item) => item.kind === 'action' && item.eventType === eventType && item.dispatchIndex === dispatchIndex && item.handlerBlockId === handler.handlerBlockId);
    for (const item of actions) {
      const intendedEvent = item.opcode === 'raise_great_sage_flag' ? 'return-to-flower-fruit' : 'heavenly-title-conferred';
      if (intendedEvent !== eventType) return finishRejected(item, 'event-routing', `monkey-king.event-routing.${eventType}.${item.opcode}`);
      let nextState: MonkeyKingState | null = null;
      if (item.opcode === 'raise_great_sage_flag' && state === 'awaiting-return') nextState = 'flag-raised';
      else if (item.opcode === 'accept_great_sage_title' && state === 'flag-raised') nextState = 'title-accepted';
      else if (item.opcode === 'build_great_sage_residence' && state === 'title-accepted') nextState = 'residence-built';
      if (nextState === null) return finishRejected(item, 'handler-sequence', `monkey-king.handler-sequence.${state}.${item.opcode}`);
      events.push(runtimeEvent('instruction-accepted', item, 'monkey-king.instruction-accepted'));
      state = nextState;
      events.push(runtimeEvent('state-changed', item, `monkey-king.state-changed.${state}`));
    }
    events.push(runtimeEvent('handler-finished', handler, `monkey-king.handler-finished.${eventType}`));
  }

  const completed = state === 'residence-built';
  events.push(runtimeEvent('run-finished', null, completed ? 'monkey-king.run-finished.completed' : 'monkey-king.run-finished.incomplete'));
  const last = [...trace].reverse().find((item) => item.kind === 'action') ?? [...trace].reverse()[0] ?? null;
  const diagnostic: MonkeyKingDiagnostic | null = completed ? null : { type: 'program-ended-incomplete', concept: 'completeness', state, eventId: last?.eventId ?? null, eventType: last?.eventType ?? null, dispatchIndex: last?.dispatchIndex ?? null, handlerBlockId: last?.handlerBlockId ?? null, instructionId: last?.instructionId ?? null, sourceBlockId: last?.sourceBlockId ?? null, parentBlockId: last?.parentBlockId ?? null, opcode: last?.opcode ?? null, messageCode: `monkey-king.program-ended-incomplete.${state}` };
  return { completed, finalState: state, dispatchedEvents, diagnostic, events, penalty };
}
