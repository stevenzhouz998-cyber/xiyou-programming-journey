import type { Block, Workspace } from 'blockly/core';
import { HEAVENLY_SIGNAL_QUEUE, compileHeavenlySignalBossDraft, isHeavenlySignalBossBlockType, type HeavenlySignalBossInstruction, type HeavenlySignalBossWorkspaceDraftV1 } from './weekTwoHeavenlySignalBossContract';

export type HeavenlySignalBossCompileDiagnosticCode = 'empty-workspace' | 'unknown-block' | 'missing-handler' | 'duplicate-handler' | 'missing-condition' | 'invalid-graph';
export type HeavenlySignalBossCompileResult = { ok: true; draft: HeavenlySignalBossWorkspaceDraftV1; trace: HeavenlySignalBossInstruction[] } | { ok: false; draft: HeavenlySignalBossWorkspaceDraftV1 | null; trace: []; diagnostics: Array<{ code: HeavenlySignalBossCompileDiagnosticCode; sourceBlockId: string | null; concept: 'program-structure' }> };
const failure = (code: HeavenlySignalBossCompileDiagnosticCode, sourceBlockId: string | null, draft: HeavenlySignalBossWorkspaceDraftV1 | null = null): HeavenlySignalBossCompileResult => ({ ok: false, draft, trace: [], diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }] });
const handlerType = (block: Block | null): Block | null => { for (let current = block; current; current = current.getSurroundParent()) if (current.type.startsWith('xiyou_boss_on_')) return current; return null; };
export function snapshotHeavenlySignalBossWorkspace(workspace: Workspace): HeavenlySignalBossWorkspaceDraftV1 {
  return { version: 1, missionId: 'w2-m5', blocks: workspace.getAllBlocks(false).map((block) => {
    const point = block.getRelativeToSurfaceXY(); const parent = block.getSurroundParent(); const handler = block.type.startsWith('xiyou_boss_on_') ? block : handlerType(parent);
    const previous = block.getPreviousBlock();
    return { id: block.id, type: block.type as HeavenlySignalBossWorkspaceDraftV1['blocks'][number]['type'], previousId: previous && previous.id !== parent?.id ? previous.id : null, nextId: block.getNextBlock()?.id ?? null, parentBlockId: parent?.id ?? null, handlerBlockId: handler?.id ?? '', repeatCount: block.type === 'xiyou_boss_repeat_horse_care' ? Number(block.getFieldValue('TIMES')) : null, conditionBlockId: block.type === 'xiyou_boss_repeat_until_furnace_ready' ? block.getInputTargetBlock('CONDITION')?.id ?? null : null, x: point.x, y: point.y };
  }) };
}
export function compileHeavenlySignalBossWorkspace(workspace: Workspace): HeavenlySignalBossCompileResult {
  const blocks = workspace.getAllBlocks(false); if (blocks.length === 0) return failure('empty-workspace', null);
  const unknown = blocks.find((block) => !isHeavenlySignalBossBlockType(block.type)); if (unknown) return failure('unknown-block', unknown.id);
  const draft = snapshotHeavenlySignalBossWorkspace(workspace);
  for (const eventType of HEAVENLY_SIGNAL_QUEUE) {
    const hats = draft.blocks.filter((block) => block.type === ({ 'stable-duty': 'xiyou_boss_on_stable_duty', 'returned-flower-fruit': 'xiyou_boss_on_returned_flower_fruit', 'heavenly-title': 'xiyou_boss_on_heavenly_title', 'peach-message': 'xiyou_boss_on_peach_message', 'furnace-refining': 'xiyou_boss_on_furnace_refining' } as const)[eventType]);
    if (hats.length === 0) return failure('missing-handler', draft.blocks[0]?.id ?? null, draft); if (hats.length > 1) return failure('duplicate-handler', hats[1]?.id ?? hats[0]?.id ?? null, draft);
  }
  const loop = blocks.find((block) => block.type === 'xiyou_boss_repeat_until_furnace_ready'); if (loop && !loop.getInputTargetBlock('CONDITION')) return failure('missing-condition', loop.id, draft);
  try { return { ok: true, draft, trace: compileHeavenlySignalBossDraft(draft) }; } catch { return failure('invalid-graph', workspace.getTopBlocks(false)[0]?.id ?? blocks[0]?.id ?? null, draft); }
}
