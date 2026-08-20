export const advancedWeekOneMissionIds = ['w1-m4', 'w1-m5'] as const;
export type AdvancedWeekOneMissionId = typeof advancedWeekOneMissionIds[number];

export type AdvancedWeekOneScope = 'top' | 'underworld-lookup' | 'boss-dragon' | 'boss-regalia' | 'boss-register';

export const ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS = {
  xiyou_underworld_open_register: { missionId: 'w1-m4', opcode: 'underworld_open_register', scope: 'top' },
  xiyou_underworld_find_monkey_records: { missionId: 'w1-m4', opcode: 'underworld_find_monkey_records', scope: 'top', childScope: 'underworld-lookup' },
  xiyou_underworld_read_index: { missionId: 'w1-m4', opcode: 'underworld_read_index', scope: 'underworld-lookup' },
  xiyou_underworld_match_monkey_kind: { missionId: 'w1-m4', opcode: 'underworld_match_monkey_kind', scope: 'underworld-lookup' },
  xiyou_underworld_collect_named_records: { missionId: 'w1-m4', opcode: 'underworld_collect_named_records', scope: 'underworld-lookup' },
  xiyou_underworld_handle_names: { missionId: 'w1-m4', opcode: 'underworld_handle_names', scope: 'top' },
  xiyou_underworld_verify_register: { missionId: 'w1-m4', opcode: 'underworld_verify_register', scope: 'top' },
  xiyou_boss_plan_third_chapter: { missionId: 'w1-m5', opcode: 'boss_plan_third_chapter', scope: 'top' },
  xiyou_boss_dragon_checkpoint: { missionId: 'w1-m5', opcode: 'boss_dragon_checkpoint', scope: 'top', childScope: 'boss-dragon' },
  xiyou_boss_enter_palace: { missionId: 'w1-m5', opcode: 'boss_enter_palace', scope: 'boss-dragon' },
  xiyou_boss_compare_weights: { missionId: 'w1-m5', opcode: 'boss_compare_weights', scope: 'boss-dragon' },
  xiyou_boss_select_staff: { missionId: 'w1-m5', opcode: 'boss_select_staff', scope: 'boss-dragon' },
  xiyou_boss_regalia_checkpoint: { missionId: 'w1-m5', opcode: 'boss_regalia_checkpoint', scope: 'top', childScope: 'boss-regalia' },
  xiyou_boss_split_gifts: { missionId: 'w1-m5', opcode: 'boss_split_gifts', scope: 'boss-regalia' },
  xiyou_boss_verify_regalia: { missionId: 'w1-m5', opcode: 'boss_verify_regalia', scope: 'boss-regalia' },
  xiyou_boss_register_checkpoint: { missionId: 'w1-m5', opcode: 'boss_register_checkpoint', scope: 'top', childScope: 'boss-register' },
  xiyou_boss_open_register: { missionId: 'w1-m5', opcode: 'boss_open_register', scope: 'boss-register' },
  xiyou_boss_find_monkey_records: { missionId: 'w1-m5', opcode: 'boss_find_monkey_records', scope: 'boss-register' },
  xiyou_boss_handle_names: { missionId: 'w1-m5', opcode: 'boss_handle_names', scope: 'boss-register' },
  xiyou_boss_verify_causal_chain: { missionId: 'w1-m5', opcode: 'boss_verify_causal_chain', scope: 'top' },
} as const;

export type AdvancedWeekOneBlockType = keyof typeof ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS;
export type AdvancedWeekOneOpcode = typeof ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[AdvancedWeekOneBlockType]['opcode'];

const blockTypes = new Set<string>(Object.keys(ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS));
const opcodes = new Set<string>(Object.values(ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS).map((definition) => definition.opcode));

if (blockTypes.size !== opcodes.size) throw new Error('Advanced Week One blocks must have unique opcodes');

export function isAdvancedWeekOneMissionId(value: string): value is AdvancedWeekOneMissionId {
  return (advancedWeekOneMissionIds as readonly string[]).includes(value);
}

export function isAdvancedWeekOneBlockType(value: string): value is AdvancedWeekOneBlockType {
  return blockTypes.has(value);
}

export function isAdvancedWeekOneOpcode(value: string): value is AdvancedWeekOneOpcode {
  return opcodes.has(value);
}

export const ADVANCED_WEEK_ONE_WORKSPACE_LIMITS = {
  maxWorkspaceBlocks: 500,
  maxBlockOrSourceIdLength: 256,
  maxCoordinateMagnitude: Number.MAX_SAFE_INTEGER,
} as const;

export type AdvancedWeekOneInstruction = {
  instructionId: string;
  sourceBlockId: string;
  parentBlockId: string | null;
  opcode: AdvancedWeekOneOpcode;
};

export interface AdvancedWeekOneWorkspaceBlock { id: string; type: AdvancedWeekOneBlockType; nextId: string | null; parentBlockId: string | null; x: number; y: number; }
export interface AdvancedWeekOneWorkspaceDraftV1 { version: 1; missionId: AdvancedWeekOneMissionId; blocks: AdvancedWeekOneWorkspaceBlock[]; }
export type AdvancedWeekOneState = 'underworld-closed' | 'underworld-opened' | 'underworld-index-read' | 'underworld-monkey-kind-matched' | 'underworld-named-records-collected' | 'underworld-names-handled' | 'underworld-verified' | 'boss-awaiting-plan' | 'boss-planned' | 'boss-dragon-checking' | 'boss-palace-entered' | 'boss-weights-compared' | 'boss-staff-selected' | 'boss-regalia-checking' | 'boss-gifts-split' | 'boss-regalia-checked' | 'boss-register-checking' | 'boss-register-opened' | 'boss-monkey-records-found' | 'boss-names-handled' | 'boss-verified';
export type AdvancedWeekOneEvent = { type: 'run-started' | 'instruction-accepted' | 'instruction-rejected' | 'state-changed' | 'run-finished'; state: AdvancedWeekOneState; instructionId: string | null; sourceBlockId: string | null; parentBlockId: string | null; opcode: AdvancedWeekOneOpcode | null; messageCode: string; };
export type AdvancedWeekOneDiagnostic = { type: 'instruction-rejected' | 'program-ended-incomplete'; concept: 'sequence-precondition' | 'container-scope' | 'completeness'; state: AdvancedWeekOneState; instructionId: string | null; sourceBlockId: string | null; parentBlockId: string | null; opcode: AdvancedWeekOneOpcode | null; messageCode: string; };
export type AdvancedWeekOneRunResult = { completed: boolean; finalState: AdvancedWeekOneState; diagnostic: AdvancedWeekOneDiagnostic | null; events: AdvancedWeekOneEvent[]; penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 }; };

export function validateAdvancedWeekOneDraft(draft: AdvancedWeekOneWorkspaceDraftV1): void {
  if (draft.blocks.length > ADVANCED_WEEK_ONE_WORKSPACE_LIMITS.maxWorkspaceBlocks) throw new Error('Advanced workspace has too many blocks');
  const byId = new Map<string, AdvancedWeekOneWorkspaceBlock>(), predecessors = new Set<string>();
  for (const block of draft.blocks) { const definition = ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[block.type]; if (!definition || definition.missionId !== draft.missionId || !block.id || block.id.length > 256 || byId.has(block.id) || !Number.isFinite(block.x) || !Number.isFinite(block.y) || Math.abs(block.x) > Number.MAX_SAFE_INTEGER || Math.abs(block.y) > Number.MAX_SAFE_INTEGER || (block.nextId !== null && (!block.nextId || block.nextId.length > 256)) || (block.parentBlockId !== null && (!block.parentBlockId || block.parentBlockId.length > 256))) throw new Error('Advanced workspace has invalid block'); byId.set(block.id, block); if (block.nextId !== null && (predecessors.has(block.nextId) || !block.nextId)) throw new Error('Advanced workspace has multiple predecessors'); else if (block.nextId !== null) predecessors.add(block.nextId); }
  for (const block of byId.values()) { if ((block.nextId && !byId.has(block.nextId)) || (block.parentBlockId && !byId.has(block.parentBlockId))) throw new Error('Advanced workspace has invalid graph connection'); const definition = ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[block.type], parent = block.parentBlockId === null ? null : ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[byId.get(block.parentBlockId)!.type] as { childScope?: AdvancedWeekOneScope }; if (block.parentBlockId === null ? definition.scope !== 'top' : parent?.childScope !== definition.scope) throw new Error('Advanced workspace has invalid container scope'); if (block.nextId !== null && byId.get(block.nextId)!.parentBlockId !== block.parentBlockId) throw new Error('Advanced workspace has invalid graph connection'); }
  if (!byId.size) return; const roots = [...byId.values()].filter((block) => block.parentBlockId === null && !predecessors.has(block.id)); if (roots.length !== 1) throw new Error('Advanced workspace must have one top-level chain'); const visited = new Set<string>(); const visit = (id: string | null, parent: string | null) => { for (let current = id; current !== null;) { const block = byId.get(current); if (!block || visited.has(current) || block.parentBlockId !== parent) throw new Error('Advanced workspace has invalid graph connection'); visited.add(current); const child = [...byId.values()].filter((candidate) => candidate.parentBlockId === current && !predecessors.has(candidate.id)); if (child.length > 1) throw new Error('Advanced workspace container has multiple child chains'); if (child.length === 1) visit(child[0].id, current); current = block.nextId; } }; visit(roots[0].id, null); if (visited.size !== byId.size) throw new Error('Advanced workspace contains an orphan or cycle');
}

export function compileAdvancedWeekOneDraft(draft: AdvancedWeekOneWorkspaceDraftV1): AdvancedWeekOneInstruction[] {
  validateAdvancedWeekOneDraft(draft); if (!draft.blocks.length) throw new Error('Advanced workspace must have one top-level chain'); const byId = new Map(draft.blocks.map((block) => [block.id, block])), predecessors = new Set(draft.blocks.flatMap((block) => block.nextId === null ? [] : [block.nextId])); const root = draft.blocks.find((block) => block.parentBlockId === null && !predecessors.has(block.id))!; const trace: AdvancedWeekOneInstruction[] = []; const visit = (id: string | null, parent: string | null) => { for (let current = id; current !== null;) { const block = byId.get(current)!; trace.push({ instructionId: `instruction:${block.id}`, sourceBlockId: block.id, parentBlockId: parent, opcode: ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS[block.type].opcode }); const children = draft.blocks.filter((candidate) => candidate.parentBlockId === current && !predecessors.has(candidate.id)); if (children.length === 1) visit(children[0].id, current); current = block.nextId; } }; visit(root.id, null); return trace;
}

const advancedSequences = {
  'w1-m4': { opcodes: ['underworld_open_register','underworld_find_monkey_records','underworld_read_index','underworld_match_monkey_kind','underworld_collect_named_records','underworld_handle_names','underworld_verify_register'], states: ['underworld-opened','underworld-opened','underworld-index-read','underworld-monkey-kind-matched','underworld-named-records-collected','underworld-names-handled','underworld-verified'] },
  'w1-m5': { opcodes: ['boss_plan_third_chapter','boss_dragon_checkpoint','boss_enter_palace','boss_compare_weights','boss_select_staff','boss_regalia_checkpoint','boss_split_gifts','boss_verify_regalia','boss_register_checkpoint','boss_open_register','boss_find_monkey_records','boss_handle_names','boss_verify_causal_chain'], states: ['boss-planned','boss-dragon-checking','boss-palace-entered','boss-weights-compared','boss-staff-selected','boss-regalia-checking','boss-gifts-split','boss-regalia-checked','boss-register-checking','boss-register-opened','boss-monkey-records-found','boss-names-handled','boss-verified'] },
} as const;
export function runAdvancedWeekOne(missionId: AdvancedWeekOneMissionId, instructions: readonly AdvancedWeekOneInstruction[]): AdvancedWeekOneRunResult { let state: AdvancedWeekOneState = missionId === 'w1-m4' ? 'underworld-closed' : 'boss-awaiting-plan', last: AdvancedWeekOneInstruction | null = null, index = 0; const sequence = advancedSequences[missionId], containers: Record<string, string> = {}, event = (type: AdvancedWeekOneEvent['type'], instruction: AdvancedWeekOneInstruction | null, messageCode: string): AdvancedWeekOneEvent => ({ type, state, instructionId: instruction?.instructionId ?? null, sourceBlockId: instruction?.sourceBlockId ?? null, parentBlockId: instruction?.parentBlockId ?? null, opcode: instruction?.opcode ?? null, messageCode }), events = [event('run-started', null, 'advanced-week-one.run-started')], definitions = Object.values(ADVANCED_WEEK_ONE_BLOCK_DEFINITIONS); for (const instruction of instructions) { const definition = definitions.find((item) => item.missionId === missionId && item.opcode === instruction.opcode), scope = definition && (definition.scope === 'top' ? instruction.parentBlockId === null : containers[definition.scope] === instruction.parentBlockId), next = scope && sequence.opcodes[index] === instruction.opcode ? sequence.states[index] : undefined; if (!next) { const concept = definition && !scope ? 'container-scope' : 'sequence-precondition', messageCode = `advanced-week-one.${missionId}.${concept}.${state}.${instruction.opcode}`, diagnostic: AdvancedWeekOneDiagnostic = { type:'instruction-rejected', concept, state, ...instruction, messageCode }; events.push(event('instruction-rejected', instruction, messageCode), event('run-finished', null, 'advanced-week-one.run-finished.rejected')); return { completed:false, finalState:state, diagnostic, events, penalty:{ livesLost:0,resourcesLost:0,starsLost:0 } }; } events.push(event('instruction-accepted', instruction, 'advanced-week-one.instruction-accepted')); state = next; index += 1; last = instruction; if (definition && 'childScope' in definition) containers[definition.childScope] = instruction.sourceBlockId; events.push(event('state-changed', instruction, `advanced-week-one.state-changed.${state}`)); } const complete = state === (missionId === 'w1-m4' ? 'underworld-verified' : 'boss-verified'); events.push(event('run-finished', null, complete ? 'advanced-week-one.run-finished.completed' : 'advanced-week-one.run-finished.incomplete')); const diagnostic: AdvancedWeekOneDiagnostic | null = complete ? null : { type:'program-ended-incomplete',concept:'completeness',state,instructionId:last?.instructionId ?? null,sourceBlockId:last?.sourceBlockId ?? null,parentBlockId:last?.parentBlockId ?? null,opcode:last?.opcode ?? null,messageCode:`advanced-week-one.${missionId}.program-ended-incomplete.${state}` }; return { completed:complete,finalState:state,diagnostic,events,penalty:{ livesLost:0,resourcesLost:0,starsLost:0 } }; }
