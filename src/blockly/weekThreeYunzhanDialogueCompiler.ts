import type { Block, Workspace } from 'blockly/core';
import { YUNZHAN_DIALOGUE_BLOCK_TYPES, YunzhanDialogueGraphError, compileYunzhanDialogueDraft, createDefaultYunzhanDialogueDraft, validateYunzhanDialogueDraft, type YunzhanDialogueInstruction, type YunzhanDialogueWorkspaceDraftV1 } from './weekThreeYunzhanDialogueContract';
import { registerYunzhanDialogueBlocks } from './weekThreeYunzhanDialogueBlocks';

export type YunzhanDialogueCompileResult = { ok: true; draft: YunzhanDialogueWorkspaceDraftV1; trace: YunzhanDialogueInstruction[] } | { ok: false; draft: YunzhanDialogueWorkspaceDraftV1 | null; trace: []; diagnostics: Array<{ code: string; sourceBlockId: string | null; concept: 'program-structure' }> };
const knownTypes = new Set<string>(YUNZHAN_DIALOGUE_BLOCK_TYPES);
const fail = (code: string, sourceBlockId: string | null, draft: YunzhanDialogueWorkspaceDraftV1 | null = null): YunzhanDialogueCompileResult => ({ ok: false, draft, trace: [], diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }] });
const ownership = (block: Block | null, branch: 'then' | 'else', result: Map<string, 'then' | 'else'>) => { for (let current = block, seen = new Set<string>(); current && !seen.has(current.id); current = current.getNextBlock()) { seen.add(current.id); result.set(current.id, branch); } };

export function serializeYunzhanDialogueWorkspace(workspace: Workspace): YunzhanDialogueWorkspaceDraftV1 {
  const all = workspace.getAllBlocks(false); const branches = new Map<string, 'then' | 'else'>();
  const gate = all.find((block) => block.type === 'w3_yunzhan_if_pilgrimage_explicit');
  if (gate) { ownership(gate.getInputTargetBlock('THEN'), 'then', branches); ownership(gate.getInputTargetBlock('ELSE'), 'else', branches); }
  return { version: 1, missionId: 'w3-m3', blocks: all.map((block) => { const parent = block.getSurroundParent(); const previous = block.getPreviousBlock(); const point = block.getRelativeToSurfaceXY(); const condition = block.type === 'w3_yunzhan_condition_pilgrimage_explicit'; return { id: block.id, type: block.type as YunzhanDialogueWorkspaceDraftV1['blocks'][number]['type'], previousId: previous && previous.id !== parent?.id ? previous.id : null, nextId: block.getNextBlock()?.id ?? null, parentBlockId: parent?.id ?? null, conditionBlockId: block.type === 'w3_yunzhan_if_pilgrimage_explicit' ? block.getInputTargetBlock('CONDITION')?.id ?? null : null, branch: condition || !parent || parent.type !== 'w3_yunzhan_if_pilgrimage_explicit' ? null : branches.get(block.id) ?? null, x: point.x, y: point.y }; }) };
}

export function restoreYunzhanDialogueWorkspace(workspace: Workspace, draft: YunzhanDialogueWorkspaceDraftV1): void {
  validateYunzhanDialogueDraft(draft); registerYunzhanDialogueBlocks(); workspace.clear();
  const blocks = new Map(draft.blocks.map((item) => [item.id, workspace.newBlock(item.type, item.id)]));
  for (const item of draft.blocks) blocks.get(item.id)!.moveBy(Math.max(-10000, Math.min(10000, item.x)), Math.max(-10000, Math.min(10000, item.y)));
  for (const item of draft.blocks) { const block = blocks.get(item.id)!; if (item.conditionBlockId) block.getInput('CONDITION')?.connection?.connect(blocks.get(item.conditionBlockId)!.outputConnection!); if (item.parentBlockId && item.branch) blocks.get(item.parentBlockId)!.getInput(item.branch === 'then' ? 'THEN' : 'ELSE')?.connection?.connect(block.previousConnection!); }
}
export const restoreDefaultYunzhanDialogueWorkspace = (workspace: Workspace) => restoreYunzhanDialogueWorkspace(workspace, createDefaultYunzhanDialogueDraft());
export function compileYunzhanDialogueWorkspace(workspace: Workspace): YunzhanDialogueCompileResult {
  const all = workspace.getAllBlocks(false); if (!all.length) return fail('empty-workspace', null); const unknown = all.find((block) => !knownTypes.has(block.type)); if (unknown) return fail('unknown-block', unknown.id);
  const draft = serializeYunzhanDialogueWorkspace(workspace); try { return { ok: true, draft, trace: compileYunzhanDialogueDraft(draft) }; } catch (error) { return error instanceof YunzhanDialogueGraphError ? fail(error.code, error.sourceBlockId, draft) : fail('invalid-graph', all[0]?.id ?? null, draft); }
}
