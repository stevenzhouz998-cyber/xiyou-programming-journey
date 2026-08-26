import type { Workspace } from 'blockly/core';
import {
  compileMonkeyKingDraft,
  isMonkeyKingBlockType,
  MONKEY_KING_BLOCK_DEFINITIONS,
  type MonkeyKingInstruction,
  type MonkeyKingWorkspaceDraftV1,
} from './weekTwoMonkeyKingContract';

export type MonkeyKingCompileDiagnosticCode = 'empty-workspace' | 'unknown-block' | 'invalid-graph' | 'missing-handler' | 'duplicate-handler' | 'empty-handler' | 'orphan-action';
export type MonkeyKingCompileResult =
  | { ok: true; draft: MonkeyKingWorkspaceDraftV1; trace: MonkeyKingInstruction[] }
  | { ok: false; draft: MonkeyKingWorkspaceDraftV1 | null; trace: []; diagnostics: Array<{ code: MonkeyKingCompileDiagnosticCode; sourceBlockId: string | null; concept: 'program-structure' }> };

const failure = (code: MonkeyKingCompileDiagnosticCode, sourceBlockId: string | null, draft: MonkeyKingWorkspaceDraftV1 | null = null): MonkeyKingCompileResult => ({
  ok: false,
  draft,
  trace: [],
  diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }],
});

export function snapshotMonkeyKingWorkspace(workspace: Workspace): MonkeyKingWorkspaceDraftV1 {
  return {
    version: 1,
    missionId: 'w2-m2',
    blocks: workspace.getAllBlocks(false).map((block) => {
      const point = block.getRelativeToSurfaceXY();
      return {
        id: block.id,
        type: block.type as MonkeyKingWorkspaceDraftV1['blocks'][number]['type'],
        nextId: block.getNextBlock()?.id ?? null,
        parentBlockId: block.getSurroundParent()?.id ?? null,
        x: point.x,
        y: point.y,
      };
    }),
  };
}

function diagnosticFor(draft: MonkeyKingWorkspaceDraftV1, message: string): { code: MonkeyKingCompileDiagnosticCode; sourceBlockId: string | null } {
  const handlers = draft.blocks.filter((block) => MONKEY_KING_BLOCK_DEFINITIONS[block.type].kind === 'handler');
  if (message.includes('缺少')) return { code: 'missing-handler', sourceBlockId: handlers[0]?.id ?? draft.blocks[0]?.id ?? null };
  if (message.includes('重复')) {
    const duplicate = handlers.find((handler, index) => handlers.findIndex((candidate) => candidate.type === handler.type) !== index);
    return { code: 'duplicate-handler', sourceBlockId: duplicate?.id ?? handlers[0]?.id ?? null };
  }
  if (message.includes('不能为空')) {
    const empty = handlers.find((handler) => !draft.blocks.some((block) => block.parentBlockId === handler.id));
    return { code: 'empty-handler', sourceBlockId: empty?.id ?? handlers[0]?.id ?? null };
  }
  if (message.includes('必须连接在事件帽下')) {
    const orphan = draft.blocks.find((block) => MONKEY_KING_BLOCK_DEFINITIONS[block.type].kind === 'action' && block.parentBlockId === null);
    return { code: 'orphan-action', sourceBlockId: orphan?.id ?? draft.blocks[0]?.id ?? null };
  }
  return { code: 'invalid-graph', sourceBlockId: workspaceProblemBlock(draft) };
}

function workspaceProblemBlock(draft: MonkeyKingWorkspaceDraftV1): string | null {
  const predecessors = new Set<string>();
  for (const block of draft.blocks) {
    if (block.nextId === null) continue;
    if (predecessors.has(block.nextId)) return block.id;
    predecessors.add(block.nextId);
  }
  return draft.blocks[0]?.id ?? null;
}

export function compileMonkeyKingWorkspace(workspace: Workspace): MonkeyKingCompileResult {
  const blocks = workspace.getAllBlocks(false);
  if (blocks.length === 0) return failure('empty-workspace', null);
  const unknown = blocks.find((block) => !isMonkeyKingBlockType(block.type));
  if (unknown) return failure('unknown-block', unknown.id);
  const draft = snapshotMonkeyKingWorkspace(workspace);
  try {
    return { ok: true, draft, trace: compileMonkeyKingDraft(draft) };
  } catch (error) {
    const diagnostic = diagnosticFor(draft, error instanceof Error ? error.message : String(error));
    return failure(diagnostic.code, diagnostic.sourceBlockId, draft);
  }
}
