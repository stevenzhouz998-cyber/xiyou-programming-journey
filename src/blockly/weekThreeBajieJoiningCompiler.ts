import type { Block, Workspace } from 'blockly/core';
import {
  BAJIE_JOINING_BLOCK_TYPES,
  BajieJoiningGraphError,
  compileBajieJoiningDraft,
  createDefaultBajieJoiningDraft,
  validateBajieJoiningDraft,
  validateBajieJoiningDraftEnvelope,
  type BajieJoiningInstruction,
  type BajieJoiningWorkspaceDraftV1,
} from './weekThreeBajieJoiningContract';
import { registerBajieJoiningBlocks } from './weekThreeBajieJoiningBlocks';

export type BajieJoiningCompileResult =
  | { ok: true; draft: BajieJoiningWorkspaceDraftV1; trace: BajieJoiningInstruction[] }
  | { ok: false; draft: BajieJoiningWorkspaceDraftV1 | null; trace: []; diagnostics: Array<{ code: string; sourceBlockId: string | null; concept: 'program-structure' }> };

const knownTypes = new Set<string>(BAJIE_JOINING_BLOCK_TYPES);
const MAX_COORDINATE = 10_000;
const clamp = (value: number) => Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, value));
const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const fail = (code: string, sourceBlockId: string | null, draft: BajieJoiningWorkspaceDraftV1 | null = null): BajieJoiningCompileResult => ({ ok: false, draft, trace: [], diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }] });

function branchOwnership(block: Block | null, branch: 'then' | 'else', output: Map<string, 'then' | 'else'>): void {
  const seen = new Set<string>();
  for (let current = block; current && !seen.has(current.id); current = current.getNextBlock()) { seen.add(current.id); output.set(current.id, branch); }
}

export function serializeBajieJoiningWorkspace(workspace: Workspace): BajieJoiningWorkspaceDraftV1 {
  const blocks = workspace.getAllBlocks(false);
  const ownership = new Map<string, Map<string, 'then' | 'else'>>();
  for (const block of blocks) if (block.type === 'w3_bajie_if_join_ready') {
    const branches = new Map<string, 'then' | 'else'>();
    branchOwnership(block.getInputTargetBlock('THEN'), 'then', branches); branchOwnership(block.getInputTargetBlock('ELSE'), 'else', branches);
    ownership.set(block.id, branches);
  }
  return {
    version: 1, missionId: 'w3-m4', blocks: blocks.map((block) => {
      const point = block.getRelativeToSurfaceXY(); const parent = block.getSurroundParent(); const previous = block.getPreviousBlock();
      const isCondition = block.type === 'w3_bajie_condition_guanyin_precepts' || block.type === 'w3_bajie_condition_willing_westward';
      const isOperation = block.type === 'w3_bajie_boolean_operation';
      return {
        id: block.id, type: block.type as BajieJoiningWorkspaceDraftV1['blocks'][number]['type'],
        previousId: previous && previous.id !== parent?.id ? previous.id : null, nextId: block.getNextBlock()?.id ?? null, parentBlockId: parent?.id ?? null,
        conditionBlockId: block.type === 'w3_bajie_if_join_ready' ? block.getInputTargetBlock('CONDITION')?.id ?? null : null,
        leftBlockId: isOperation ? block.getInputTargetBlock('LEFT')?.id ?? null : null, rightBlockId: isOperation ? block.getInputTargetBlock('RIGHT')?.id ?? null : null,
        operator: isOperation ? block.getFieldValue('OPERATOR') as BajieJoiningWorkspaceDraftV1['blocks'][number]['operator'] : null,
        branch: isCondition || parent?.type !== 'w3_bajie_if_join_ready' ? null : ownership.get(parent.id)?.get(block.id) ?? null,
        x: clamp(point.x), y: clamp(point.y),
      };
    }),
  };
}

function normalizedDraft(draft: BajieJoiningWorkspaceDraftV1): BajieJoiningWorkspaceDraftV1 {
  const blocks: BajieJoiningWorkspaceDraftV1['blocks'] = [];
  for (let index = 0; index < draft.blocks.length; index += 1) {
    if (!hasOwn(draft.blocks, String(index))) { blocks.push(undefined as never); continue; }
    const block = draft.blocks[index];
    const raw = block as unknown;
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) { blocks.push(raw as BajieJoiningWorkspaceDraftV1['blocks'][number]); continue; }
    const candidate = raw as Record<string, unknown>;
    blocks.push({ ...candidate, x: typeof candidate.x === 'number' && Number.isFinite(candidate.x) ? clamp(candidate.x) : candidate.x, y: typeof candidate.y === 'number' && Number.isFinite(candidate.y) ? clamp(candidate.y) : candidate.y } as BajieJoiningWorkspaceDraftV1['blocks'][number]);
  }
  return { ...draft, blocks };
}

export function restoreBajieJoiningWorkspace(workspace: Workspace, draft: BajieJoiningWorkspaceDraftV1): void {
  const withinBounds = validateBajieJoiningDraftEnvelope(draft);
  const restored = normalizedDraft(withinBounds); validateBajieJoiningDraft(restored); registerBajieJoiningBlocks();
  workspace.clear();
  const blocks = new Map(restored.blocks.map((item) => [item.id, workspace.newBlock(item.type, item.id)]));
  for (const item of restored.blocks) blocks.get(item.id)!.moveBy(item.x, item.y);
  for (const item of restored.blocks) {
    const block = blocks.get(item.id)!;
    if (item.nextId !== null && item.parentBlockId === null) block.nextConnection?.connect(blocks.get(item.nextId)!.previousConnection!);
    if (item.conditionBlockId !== null) block.getInput('CONDITION')?.connection?.connect(blocks.get(item.conditionBlockId)!.outputConnection!);
    if (item.leftBlockId !== null) block.getInput('LEFT')?.connection?.connect(blocks.get(item.leftBlockId)!.outputConnection!);
    if (item.rightBlockId !== null) block.getInput('RIGHT')?.connection?.connect(blocks.get(item.rightBlockId)!.outputConnection!);
    if (item.operator !== null) block.setFieldValue(item.operator, 'OPERATOR');
    if (item.parentBlockId !== null && item.branch !== null) blocks.get(item.parentBlockId)!.getInput(item.branch === 'then' ? 'THEN' : 'ELSE')?.connection?.connect(block.previousConnection!);
  }
}

export function restoreDefaultBajieJoiningWorkspace(workspace: Workspace): void { restoreBajieJoiningWorkspace(workspace, createDefaultBajieJoiningDraft()); }

export function compileBajieJoiningWorkspace(workspace: Workspace): BajieJoiningCompileResult {
  const visible = workspace.getAllBlocks(false);
  if (visible.length === 0) return fail('empty-workspace', null);
  const unknown = visible.find((block) => !knownTypes.has(block.type));
  if (unknown) return fail('unknown-block', unknown.id);
  const operation = visible.find((block) => block.type === 'w3_bajie_boolean_operation');
  if (operation && (!operation.getInputTargetBlock('LEFT') || !operation.getInputTargetBlock('RIGHT'))) return fail('missing-boolean-input', operation.id, serializeBajieJoiningWorkspace(workspace));
  const draft = serializeBajieJoiningWorkspace(workspace);
  try { return { ok: true, draft, trace: compileBajieJoiningDraft(draft) }; }
  catch (error) {
    if (error instanceof BajieJoiningGraphError) return fail(error.code, error.sourceBlockId, draft);
    return fail('invalid-graph', visible[0]?.id ?? null, draft);
  }
}
