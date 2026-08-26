export const PEACH_ELIXIR_MISSION_ID = 'w2-m3' as const;

export const PEACH_ELIXIR_BLOCK_DEFINITIONS = {
  xiyou_guard_peach_garden: { opcode: 'guard_peach_garden' },
  xiyou_learn_peach_banquet: { opcode: 'learn_peach_banquet' },
  xiyou_drink_at_banquet: { opcode: 'drink_at_banquet' },
  xiyou_stumble_into_tusita: { opcode: 'stumble_into_tusita' },
  xiyou_eat_golden_elixir: { opcode: 'eat_golden_elixir' },
} as const;

export type PeachElixirBlockType = keyof typeof PEACH_ELIXIR_BLOCK_DEFINITIONS;
export type PeachElixirOpcode = typeof PEACH_ELIXIR_BLOCK_DEFINITIONS[PeachElixirBlockType]['opcode'];
export type PeachElixirState = 'awaiting-garden' | 'garden-guarded' | 'banquet-learned' | 'banquet-visited' | 'tusita-entered' | 'elixir-eaten';

export interface PeachElixirWorkspaceBlock {
  id: string;
  type: PeachElixirBlockType;
  previousId: string | null;
  nextId: string | null;
  x: number;
  y: number;
}

export interface PeachElixirWorkspaceDraftV1 {
  version: 1;
  missionId: typeof PEACH_ELIXIR_MISSION_ID;
  blocks: PeachElixirWorkspaceBlock[];
}

export interface PeachElixirInstruction {
  instructionId: string;
  sourceBlockId: string;
  previousBlockId: string | null;
  nextBlockId: string | null;
  opcode: PeachElixirOpcode;
}

export interface PeachElixirRuntimeEvent {
  type: 'run-started' | 'instruction-accepted' | 'instruction-rejected' | 'state-changed' | 'run-finished';
  state: PeachElixirState;
  instructionId: string | null;
  sourceBlockId: string | null;
  previousBlockId: string | null;
  nextBlockId: string | null;
  opcode: PeachElixirOpcode | null;
  messageCode: string;
}

export interface PeachElixirDiagnostic {
  type: 'instruction-rejected' | 'program-ended-incomplete';
  concept: 'sequence-precondition' | 'completeness';
  state: PeachElixirState;
  instructionId: string | null;
  sourceBlockId: string | null;
  previousBlockId: string | null;
  nextBlockId: string | null;
  opcode: PeachElixirOpcode | null;
  messageCode: string;
}

export interface PeachElixirRunResult {
  completed: boolean;
  finalState: PeachElixirState;
  diagnostic: PeachElixirDiagnostic | null;
  events: PeachElixirRuntimeEvent[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

const MAX_BLOCKS = 100;
const MAX_ID_LENGTH = 256;

export function isPeachElixirBlockType(value: string): value is PeachElixirBlockType {
  return Object.prototype.hasOwnProperty.call(PEACH_ELIXIR_BLOCK_DEFINITIONS, value);
}

export function isPeachElixirOpcode(value: string): value is PeachElixirOpcode {
  return Object.values(PEACH_ELIXIR_BLOCK_DEFINITIONS).some((definition) => definition.opcode === value);
}

export function createDefaultPeachElixirDraft(): PeachElixirWorkspaceDraftV1 {
  return {
    version: 1,
    missionId: PEACH_ELIXIR_MISSION_ID,
    blocks: [
      { id: 'peach-garden', type: 'xiyou_guard_peach_garden', previousId: null, nextId: 'peach-banquet', x: 40, y: 36 },
      { id: 'peach-banquet', type: 'xiyou_learn_peach_banquet', previousId: 'peach-garden', nextId: 'peach-drink', x: 40, y: 88 },
      { id: 'peach-drink', type: 'xiyou_drink_at_banquet', previousId: 'peach-banquet', nextId: 'peach-elixir', x: 40, y: 140 },
      { id: 'peach-elixir', type: 'xiyou_eat_golden_elixir', previousId: 'peach-drink', nextId: 'peach-tusita', x: 40, y: 192 },
      { id: 'peach-tusita', type: 'xiyou_stumble_into_tusita', previousId: 'peach-elixir', nextId: null, x: 40, y: 244 },
    ],
  };
}

export function validatePeachElixirDraft(draft: PeachElixirWorkspaceDraftV1): void {
  if (draft.version !== 1 || draft.missionId !== PEACH_ELIXIR_MISSION_ID || !Array.isArray(draft.blocks)) throw new Error('蟠桃与金丹草稿版本无效');
  if (draft.blocks.length > MAX_BLOCKS) throw new Error('蟠桃与金丹草稿积木过多');
  const byId = new Map<string, PeachElixirWorkspaceBlock>();
  const predecessors = new Set<string>();

  for (const block of draft.blocks) {
    if (!block.id || block.id.length > MAX_ID_LENGTH || byId.has(block.id) || !isPeachElixirBlockType(block.type)) throw new Error('蟠桃与金丹草稿包含无效积木');
    if (!Number.isFinite(block.x) || !Number.isFinite(block.y)) throw new Error('蟠桃与金丹草稿坐标无效');
    if (block.previousId !== null && (!block.previousId || block.previousId.length > MAX_ID_LENGTH)) throw new Error('蟠桃与金丹草稿前序引用无效');
    if (block.nextId !== null && (!block.nextId || block.nextId.length > MAX_ID_LENGTH || predecessors.has(block.nextId))) throw new Error('蟠桃与金丹草稿连接无效');
    byId.set(block.id, block);
    if (block.nextId !== null) predecessors.add(block.nextId);
  }

  for (const block of byId.values()) {
    const previous = block.previousId === null ? null : byId.get(block.previousId);
    const next = block.nextId === null ? null : byId.get(block.nextId);
    if ((block.previousId !== null && !previous) || (block.nextId !== null && !next)) throw new Error('蟠桃与金丹草稿引用未知积木');
    if ((previous && previous.nextId !== block.id) || (next && next.previousId !== block.id)) throw new Error('蟠桃与金丹草稿连接必须双向一致');
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error('蟠桃与金丹草稿包含连接环');
    if (visited.has(id)) return;
    visiting.add(id);
    const next = byId.get(id)?.nextId;
    if (next !== null && next !== undefined) visit(next);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of byId.keys()) visit(id);
}

export function compilePeachElixirDraft(draft: PeachElixirWorkspaceDraftV1): PeachElixirInstruction[] {
  validatePeachElixirDraft(draft);
  const roots = draft.blocks.filter((block) => block.previousId === null);
  if (roots.length !== 1) throw new Error('蟠桃与金丹程序必须只有一条主链');
  const byId = new Map(draft.blocks.map((block) => [block.id, block]));
  const visited = new Set<string>();
  const trace: PeachElixirInstruction[] = [];
  let current: PeachElixirWorkspaceBlock | undefined = roots[0];
  while (current) {
    if (visited.has(current.id)) throw new Error('蟠桃与金丹程序包含连接环');
    visited.add(current.id);
    trace.push({
      instructionId: `instruction:${current.id}`,
      sourceBlockId: current.id,
      previousBlockId: current.previousId,
      nextBlockId: current.nextId,
      opcode: PEACH_ELIXIR_BLOCK_DEFINITIONS[current.type].opcode,
    });
    current = current.nextId === null ? undefined : byId.get(current.nextId);
  }
  if (visited.size !== draft.blocks.length) throw new Error('蟠桃与金丹程序必须连接为一条主链');
  const expectedTypes = Object.keys(PEACH_ELIXIR_BLOCK_DEFINITIONS) as PeachElixirBlockType[];
  for (const type of expectedTypes) {
    if (draft.blocks.filter((block) => block.type === type).length !== 1) throw new Error('蟠桃与金丹程序包含遗漏或重复动作');
  }
  if (draft.blocks.length !== expectedTypes.length) throw new Error('蟠桃与金丹程序包含遗漏或重复动作');
  return trace;
}

const transition: Record<PeachElixirOpcode, { from: PeachElixirState; to: PeachElixirState }> = {
  guard_peach_garden: { from: 'awaiting-garden', to: 'garden-guarded' },
  learn_peach_banquet: { from: 'garden-guarded', to: 'banquet-learned' },
  drink_at_banquet: { from: 'banquet-learned', to: 'banquet-visited' },
  stumble_into_tusita: { from: 'banquet-visited', to: 'tusita-entered' },
  eat_golden_elixir: { from: 'tusita-entered', to: 'elixir-eaten' },
};

export function runPeachElixir(trace: readonly PeachElixirInstruction[]): PeachElixirRunResult {
  let state: PeachElixirState = 'awaiting-garden';
  const events: PeachElixirRuntimeEvent[] = [];
  const penalty = { livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const };
  const event = (type: PeachElixirRuntimeEvent['type'], item: PeachElixirInstruction | null, messageCode: string): PeachElixirRuntimeEvent => ({
    type,
    state,
    instructionId: item?.instructionId ?? null,
    sourceBlockId: item?.sourceBlockId ?? null,
    previousBlockId: item?.previousBlockId ?? null,
    nextBlockId: item?.nextBlockId ?? null,
    opcode: item?.opcode ?? null,
    messageCode,
  });
  events.push(event('run-started', null, 'peach-elixir.run-started'));

  for (const item of trace) {
    const next = transition[item.opcode];
    if (next.from !== state) {
      const messageCode = `peach-elixir.sequence-precondition.${state}.${item.opcode}`;
      const diagnostic: PeachElixirDiagnostic = {
        type: 'instruction-rejected',
        concept: 'sequence-precondition',
        state,
        instructionId: item.instructionId,
        sourceBlockId: item.sourceBlockId,
        previousBlockId: item.previousBlockId,
        nextBlockId: item.nextBlockId,
        opcode: item.opcode,
        messageCode,
      };
      events.push(event('instruction-rejected', item, messageCode), event('run-finished', null, 'peach-elixir.run-finished.rejected'));
      return { completed: false, finalState: state, diagnostic, events, penalty };
    }
    events.push(event('instruction-accepted', item, 'peach-elixir.instruction-accepted'));
    state = next.to;
    events.push(event('state-changed', item, `peach-elixir.state-changed.${state}`));
  }

  const completed = state === 'elixir-eaten';
  const last = trace.at(-1) ?? null;
  events.push(event('run-finished', null, completed ? 'peach-elixir.run-finished.completed' : 'peach-elixir.run-finished.incomplete'));
  const diagnostic: PeachElixirDiagnostic | null = completed ? null : {
    type: 'program-ended-incomplete',
    concept: 'completeness',
    state,
    instructionId: last?.instructionId ?? null,
    sourceBlockId: last?.sourceBlockId ?? null,
    previousBlockId: last?.previousBlockId ?? null,
    nextBlockId: last?.nextBlockId ?? null,
    opcode: last?.opcode ?? null,
    messageCode: `peach-elixir.program-ended-incomplete.${state}`,
  };
  return { completed, finalState: state, diagnostic, events, penalty };
}
