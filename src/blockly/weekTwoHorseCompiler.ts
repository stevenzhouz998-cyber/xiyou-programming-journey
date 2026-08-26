import type { Workspace } from 'blockly/core';
import {
  compileHorseCareDraft,
  isHorseCareBlockType,
  type HorseCareInstruction,
  type HorseCareWorkspaceDraftV1,
} from './weekTwoHorseContract';

export type HorseCareCompileResult =
  | { ok: true; draft: HorseCareWorkspaceDraftV1; trace: HorseCareInstruction[] }
  | { ok: false; draft: HorseCareWorkspaceDraftV1 | null; trace: []; diagnostics: Array<{ code: 'empty-workspace' | 'unknown-block' | 'invalid-graph'; sourceBlockId: string | null; concept: 'program-structure' }> };

const failure = (code: 'empty-workspace' | 'unknown-block' | 'invalid-graph', sourceBlockId: string | null, draft: HorseCareWorkspaceDraftV1 | null = null): HorseCareCompileResult => ({
  ok: false,
  draft,
  trace: [],
  diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }],
});

export function snapshotHorseCareWorkspace(workspace: Workspace): HorseCareWorkspaceDraftV1 {
  return {
    version: 1,
    missionId: 'w2-m1',
    blocks: workspace.getAllBlocks(false).map((block) => {
      const point = block.getRelativeToSurfaceXY();
      return {
        id: block.id,
        type: block.type as HorseCareWorkspaceDraftV1['blocks'][number]['type'],
        nextId: block.getNextBlock()?.id ?? null,
        parentBlockId: block.getSurroundParent()?.id ?? null,
        repeatCount: block.type === 'xiyou_repeat_horse_care' ? Number(block.getFieldValue('TIMES')) : null,
        x: point.x,
        y: point.y,
      };
    }),
  };
}

export function compileHorseCareWorkspace(workspace: Workspace): HorseCareCompileResult {
  const blocks = workspace.getAllBlocks(false);
  if (blocks.length === 0) return failure('empty-workspace', null);
  const unknown = blocks.find((block) => !isHorseCareBlockType(block.type));
  if (unknown) return failure('unknown-block', unknown.id);
  const draft = snapshotHorseCareWorkspace(workspace);
  try {
    return { ok: true, draft, trace: compileHorseCareDraft(draft) };
  } catch {
    return failure('invalid-graph', workspace.getTopBlocks(false)[0]?.id ?? blocks[0]?.id ?? null, draft);
  }
}
