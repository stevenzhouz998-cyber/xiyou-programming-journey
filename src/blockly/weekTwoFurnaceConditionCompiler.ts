import type { Workspace } from 'blockly/core';
import { compileFurnaceConditionDraft, isFurnaceConditionBlockType, type FurnaceConditionInstruction, type FurnaceConditionWorkspaceDraftV1 } from './weekTwoFurnaceConditionContract';

export type FurnaceConditionCompileResult =
  | { ok: true; draft: FurnaceConditionWorkspaceDraftV1; trace: FurnaceConditionInstruction[] }
  | { ok: false; draft: FurnaceConditionWorkspaceDraftV1 | null; trace: []; diagnostics: Array<{ code: 'empty-workspace' | 'unknown-block' | 'missing-condition' | 'invalid-graph'; sourceBlockId: string | null; concept: 'program-structure' }> };

type FurnaceConditionCompileFailure = Extract<FurnaceConditionCompileResult, { ok: false }>;
type FurnaceConditionDiagnosticCode = FurnaceConditionCompileFailure['diagnostics'][number]['code'];

const failure = (code: FurnaceConditionDiagnosticCode, sourceBlockId: string | null, draft: FurnaceConditionWorkspaceDraftV1 | null = null): FurnaceConditionCompileResult => ({ ok: false, draft, trace: [], diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }] });

export function snapshotFurnaceConditionWorkspace(workspace: Workspace): FurnaceConditionWorkspaceDraftV1 {
  return { version: 1, missionId: 'w2-m4', blocks: workspace.getAllBlocks(false).map((block) => {
    const point = block.getRelativeToSurfaceXY();
    const parentBlockId = block.getSurroundParent()?.id ?? null;
    const previous = block.getPreviousBlock();
    return { id: block.id, type: block.type as FurnaceConditionWorkspaceDraftV1['blocks'][number]['type'], previousId: previous && previous.id !== parentBlockId ? previous.id : null, nextId: block.getNextBlock()?.id ?? null, parentBlockId, conditionBlockId: block.type === 'xiyou_repeat_until_furnace_ready' ? block.getInputTargetBlock('CONDITION')?.id ?? null : null, x: point.x, y: point.y };
  }) };
}

export function compileFurnaceConditionWorkspace(workspace: Workspace): FurnaceConditionCompileResult {
  const blocks = workspace.getAllBlocks(false);
  if (blocks.length === 0) return failure('empty-workspace', null);
  const unknown = blocks.find((block) => !isFurnaceConditionBlockType(block.type));
  if (unknown) return failure('unknown-block', unknown.id);
  const draft = snapshotFurnaceConditionWorkspace(workspace);
  const loop = blocks.find((block) => block.type === 'xiyou_repeat_until_furnace_ready');
  if (loop && !loop.getInputTargetBlock('CONDITION')) return failure('missing-condition', loop.id, draft);
  try { return { ok: true, draft, trace: compileFurnaceConditionDraft(draft) }; } catch { return failure('invalid-graph', workspace.getTopBlocks(false)[0]?.id ?? blocks[0]?.id ?? null, draft); }
}
