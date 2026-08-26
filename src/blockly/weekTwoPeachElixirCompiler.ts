import type { Block, Connection, Workspace } from 'blockly/core';
import {
  PEACH_ELIXIR_BLOCK_DEFINITIONS,
  compilePeachElixirDraft,
  isPeachElixirBlockType,
  type PeachElixirBlockType,
  type PeachElixirInstruction,
  type PeachElixirWorkspaceDraftV1,
} from './weekTwoPeachElixirContract';

export type PeachElixirCompileDiagnosticCode = 'empty-workspace' | 'unknown-block' | 'invalid-connection' | 'multiple-main-chain' | 'missing-action' | 'duplicate-action' | 'workspace-boundary';
export type PeachElixirCompileResult =
  | { ok: true; draft: PeachElixirWorkspaceDraftV1; trace: PeachElixirInstruction[] }
  | { ok: false; draft: PeachElixirWorkspaceDraftV1 | null; trace: []; diagnostics: Array<{ code: PeachElixirCompileDiagnosticCode; sourceBlockId: string | null; concept: 'program-structure' }> };

const failure = (code: PeachElixirCompileDiagnosticCode, sourceBlockId: string | null, draft: PeachElixirWorkspaceDraftV1 | null = null): PeachElixirCompileResult => ({
  ok: false,
  draft,
  trace: [],
  diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }],
});

function reciprocal(connection: Connection | null, target: Connection | null): boolean {
  return connection !== null && target !== null && connection.targetConnection === target && target.targetConnection === connection;
}

function canonicalConnections(block: Block): boolean {
  if (!block.previousConnection || !block.nextConnection) return false;
  const previous = block.getPreviousBlock();
  const next = block.getNextBlock();
  if (previous === null) {
    if (block.previousConnection.targetConnection !== null) return false;
  } else if (!reciprocal(block.previousConnection, previous.nextConnection)) return false;
  if (next === null) {
    if (block.nextConnection.targetConnection !== null) return false;
  } else if (!reciprocal(block.nextConnection, next.previousConnection)) return false;
  return true;
}

export function snapshotPeachElixirWorkspace(workspace: Workspace): PeachElixirWorkspaceDraftV1 {
  return {
    version: 1,
    missionId: 'w2-m3',
    blocks: workspace.getAllBlocks(false).map((block) => {
      const point = block.getRelativeToSurfaceXY();
      return {
        id: block.id,
        type: block.type as PeachElixirBlockType,
        previousId: block.getPreviousBlock()?.id ?? null,
        nextId: block.getNextBlock()?.id ?? null,
        x: point.x,
        y: point.y,
      };
    }),
  };
}

export function compilePeachElixirWorkspace(workspace: Workspace): PeachElixirCompileResult {
  const blocks = workspace.getAllBlocks(false);
  if (blocks.length === 0) return failure('empty-workspace', null);
  const unknown = blocks.find((block) => !isPeachElixirBlockType(block.type));
  if (unknown) return failure('unknown-block', unknown.id);
  const draft = snapshotPeachElixirWorkspace(workspace);

  const invalid = blocks.find((block) => !canonicalConnections(block));
  if (invalid) return failure('invalid-connection', invalid.id, draft);

  for (const type of Object.keys(PEACH_ELIXIR_BLOCK_DEFINITIONS) as PeachElixirBlockType[]) {
    const matches = blocks.filter((block) => block.type === type);
    if (matches.length === 0) return failure('missing-action', blocks[0]?.id ?? null, draft);
    if (matches.length > 1) return failure('duplicate-action', matches[1].id, draft);
  }

  const roots = blocks.filter((block) => block.getPreviousBlock() === null);
  if (roots.length !== 1) return failure('multiple-main-chain', roots[1]?.id ?? roots[0]?.id ?? blocks[0].id, draft);

  try {
    return { ok: true, draft, trace: compilePeachElixirDraft(draft) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failure(message.includes('过多') || message.includes('坐标') ? 'workspace-boundary' : 'invalid-connection', blocks[0].id, draft);
  }
}
