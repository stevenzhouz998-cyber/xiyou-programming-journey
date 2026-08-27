import type { Block, Workspace } from 'blockly/core';
import {
  CUILAN_BOOLEAN_BLOCK_TYPES,
  CuilanBooleanGraphError,
  compileCuilanBooleanDraft,
  createDefaultCuilanBooleanDraft,
  validateCuilanBooleanDraft,
  type CuilanBooleanInstruction,
  type CuilanBooleanWorkspaceDraftV1,
} from './weekThreeCuilanBooleanContract';
import { registerCuilanBooleanBlocks } from './weekThreeCuilanBooleanBlocks';

export type CuilanBooleanCompileResult =
  | { ok: true; draft: CuilanBooleanWorkspaceDraftV1; trace: CuilanBooleanInstruction[] }
  | { ok: false; draft: CuilanBooleanWorkspaceDraftV1 | null; trace: []; diagnostics: Array<{ code: string; sourceBlockId: string | null; concept: 'program-structure' }> };

const knownTypes = new Set<string>(CUILAN_BOOLEAN_BLOCK_TYPES);
const fail = (code: string, sourceBlockId: string | null, draft: CuilanBooleanWorkspaceDraftV1 | null = null): CuilanBooleanCompileResult => ({ ok: false, draft, trace: [], diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }] });

function branchOwnership(block: Block | null, branch: 'then' | 'else', result: Map<string, 'then' | 'else'>): void {
  const seen = new Set<string>();
  for (let current = block; current && !seen.has(current.id); current = current.getNextBlock()) {
    seen.add(current.id);
    result.set(current.id, branch);
  }
}

export function serializeCuilanBooleanWorkspace(workspace: Workspace): CuilanBooleanWorkspaceDraftV1 {
  const blocks = workspace.getAllBlocks(false);
  const ownership = new Map<string, Map<string, 'then' | 'else'>>();
  for (const block of blocks) {
    if (block.type !== 'w3_cuilan_if_disguise_ready' && block.type !== 'w3_cuilan_if_identity_reveal') continue;
    const branches = new Map<string, 'then' | 'else'>();
    branchOwnership(block.getInputTargetBlock('THEN'), 'then', branches);
    branchOwnership(block.getInputTargetBlock('ELSE'), 'else', branches);
    ownership.set(block.id, branches);
  }
  return {
    version: 1,
    missionId: 'w3-m2',
    blocks: blocks.map((block) => {
      const parent = block.getSurroundParent();
      const previous = block.getPreviousBlock();
      const point = block.getRelativeToSurfaceXY();
      const condition = block.type === 'w3_cuilan_condition_appearance_matches' || block.type === 'w3_cuilan_condition_identity_is_cuilan';
      return {
        id: block.id,
        type: block.type as CuilanBooleanWorkspaceDraftV1['blocks'][number]['type'],
        previousId: previous && previous.id !== parent?.id ? previous.id : null,
        nextId: block.getNextBlock()?.id ?? null,
        parentBlockId: parent?.id ?? null,
        conditionBlockId: block.type === 'w3_cuilan_if_disguise_ready' || block.type === 'w3_cuilan_if_identity_reveal' ? block.getInputTargetBlock('CONDITION')?.id ?? null : null,
        branch: condition || !parent || (parent.type !== 'w3_cuilan_if_disguise_ready' && parent.type !== 'w3_cuilan_if_identity_reveal') ? null : ownership.get(parent.id)?.get(block.id) ?? null,
        x: point.x,
        y: point.y,
      };
    }),
  };
}

export function restoreCuilanBooleanWorkspace(workspace: Workspace, draft: CuilanBooleanWorkspaceDraftV1): void {
  validateCuilanBooleanDraft(draft);
  registerCuilanBooleanBlocks();
  workspace.clear();
  const blocks = new Map(draft.blocks.map((item) => [item.id, workspace.newBlock(item.type, item.id)]));
  for (const item of draft.blocks) blocks.get(item.id)!.moveBy(item.x, item.y);
  for (const item of draft.blocks) {
    const block = blocks.get(item.id)!;
    if (item.nextId !== null && item.parentBlockId === null) block.nextConnection?.connect(blocks.get(item.nextId)!.previousConnection!);
    if (item.conditionBlockId !== null) block.getInput('CONDITION')?.connection?.connect(blocks.get(item.conditionBlockId)!.outputConnection!);
    if (item.parentBlockId !== null && item.branch !== null && item.previousId === null) blocks.get(item.parentBlockId)!.getInput(item.branch === 'then' ? 'THEN' : 'ELSE')?.connection?.connect(block.previousConnection!);
  }
}

export function restoreDefaultCuilanBooleanWorkspace(workspace: Workspace): void {
  restoreCuilanBooleanWorkspace(workspace, createDefaultCuilanBooleanDraft());
}

export function compileCuilanBooleanWorkspace(workspace: Workspace): CuilanBooleanCompileResult {
  const visible = workspace.getAllBlocks(false);
  if (visible.length === 0) return fail('empty-workspace', null);
  const unknown = visible.find((block) => !knownTypes.has(block.type));
  if (unknown) return fail('unknown-block', unknown.id);
  const draft = serializeCuilanBooleanWorkspace(workspace);
  try {
    return { ok: true, draft, trace: compileCuilanBooleanDraft(draft) };
  } catch (error) {
    if (error instanceof CuilanBooleanGraphError) return fail(error.code, error.sourceBlockId, draft);
    return fail('invalid-graph', visible[0]?.id ?? null, draft);
  }
}
