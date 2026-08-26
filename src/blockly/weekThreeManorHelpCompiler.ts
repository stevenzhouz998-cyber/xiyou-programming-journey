import type { Block, Workspace } from 'blockly/core';
import {
  MANOR_HELP_BLOCK_TYPES,
  ManorHelpGraphError,
  compileManorHelpDraft,
  type ManorHelpInstruction,
  type ManorHelpWorkspaceDraftV1,
} from './weekThreeManorHelpContract';

export type ManorHelpCompileResult =
  | { ok: true; draft: ManorHelpWorkspaceDraftV1; trace: ManorHelpInstruction[] }
  | { ok: false; draft: ManorHelpWorkspaceDraftV1 | null; trace: []; diagnostics: Array<{ code: string; sourceBlockId: string | null; concept: 'program-structure' }> };

const knownTypes = new Set<string>(MANOR_HELP_BLOCK_TYPES);
const failure = (code: string, sourceBlockId: string | null, draft: ManorHelpWorkspaceDraftV1 | null = null): ManorHelpCompileResult => ({
  ok: false, draft, trace: [], diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }],
});

function ownBranch(block: Block | null, branch: 'then' | 'else', ownership: Map<string, 'then' | 'else'>): void {
  const seen = new Set<string>();
  for (let current = block; current && !seen.has(current.id); current = current.getNextBlock()) {
    seen.add(current.id);
    ownership.set(current.id, branch);
  }
}

export function snapshotManorHelpWorkspace(workspace: Workspace): ManorHelpWorkspaceDraftV1 {
  const blocks = workspace.getAllBlocks(false);
  const branchOwnership = new Map<string, Map<string, 'then' | 'else'>>();
  for (const block of blocks) {
    if (block.type !== 'w3_manor_if_message') continue;
    const ownership = new Map<string, 'then' | 'else'>();
    ownBranch(block.getInputTargetBlock('THEN'), 'then', ownership);
    ownBranch(block.getInputTargetBlock('ELSE'), 'else', ownership);
    branchOwnership.set(block.id, ownership);
  }
  return {
    version: 1,
    missionId: 'w3-m1',
    blocks: blocks.map((block) => {
      const point = block.getRelativeToSurfaceXY();
      const parent = block.getSurroundParent();
      const previous = block.getPreviousBlock();
      const isCondition = block.type === 'w3_manor_condition_explicit_demon_help' || block.type === 'w3_manor_condition_mentions_gao_manor';
      return {
        id: block.id,
        type: block.type as ManorHelpWorkspaceDraftV1['blocks'][number]['type'],
        previousId: previous && previous.id !== parent?.id ? previous.id : null,
        nextId: block.getNextBlock()?.id ?? null,
        parentBlockId: parent?.id ?? null,
        conditionBlockId: block.type === 'w3_manor_if_message' ? block.getInputTargetBlock('CONDITION')?.id ?? null : null,
        branch: isCondition || parent?.type !== 'w3_manor_if_message' ? null : branchOwnership.get(parent.id)?.get(block.id) ?? null,
        x: point.x,
        y: point.y,
      };
    }),
  };
}

export function compileManorHelpWorkspace(workspace: Workspace): ManorHelpCompileResult {
  const blocks = workspace.getAllBlocks(false);
  if (blocks.length === 0) return failure('empty-workspace', null);
  const unknown = blocks.find((block) => !knownTypes.has(block.type));
  if (unknown) return failure('unknown-block', unknown.id);
  const draft = snapshotManorHelpWorkspace(workspace);
  const ifBlock = blocks.find((block) => block.type === 'w3_manor_if_message');
  if (ifBlock && !ifBlock.getInputTargetBlock('CONDITION')) return failure('missing-condition', ifBlock.id, draft);
  try {
    return { ok: true, draft, trace: compileManorHelpDraft(draft) };
  } catch (error) {
    if (error instanceof ManorHelpGraphError) return failure(error.code, error.sourceBlockId, draft);
    return failure('invalid-graph', workspace.getTopBlocks(false)[0]?.id ?? blocks[0]?.id ?? null, draft);
  }
}
