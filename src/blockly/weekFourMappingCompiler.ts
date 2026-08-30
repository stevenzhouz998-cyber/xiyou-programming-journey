import * as Blockly from 'blockly';
import { registerWeekFourMappingBlocks } from './weekFourMappingBlocks';
import { compileWeekFourMappingDraft, type WeekFourMappingCompileResult, type WeekFourMappingWorkspaceBlock, type WeekFourMappingWorkspaceDraftV1 } from './weekFourMappingDraft';

export { compileWeekFourMappingDraft, createDefaultWeekFourMappingDraft, focusableBlockIdForMappingFailure, WEEK_FOUR_MAPPING_COORDINATE_LIMIT } from './weekFourMappingDraft';
export type { WeekFourMappingCompileResult, WeekFourMappingWorkspaceBlock, WeekFourMappingWorkspaceDraftV1 } from './weekFourMappingDraft';

export function restoreWeekFourMappingWorkspace(workspace: Blockly.Workspace, value: unknown): WeekFourMappingCompileResult {
  const compiled = compileWeekFourMappingDraft(value);
  registerWeekFourMappingBlocks();
  workspace.clear();
  const map = new Map<string, Blockly.Block>();
  for (const item of compiled.draft.blocks) { const block = workspace.newBlock(item.type, item.id); block.moveBy(item.x, item.y); map.set(item.id, block); }
  const root = map.get('mapping-root')!, ifBlock = map.get('mapping-if')!, condition = map.get('mapping-condition')!, thenBlock = map.get('mapping-then')!, elseBlock = map.get('mapping-else')!;
  root.getInput('BODY')!.connection!.connect(ifBlock.previousConnection!);
  ifBlock.getInput('CONDITION')!.connection!.connect(condition.outputConnection!);
  ifBlock.getInput('THEN')!.connection!.connect(thenBlock.previousConnection!);
  ifBlock.getInput('ELSE')!.connection!.connect(elseBlock.previousConnection!);
  return compiled;
}

export function serializeWeekFourMappingWorkspace(workspace: Blockly.Workspace): WeekFourMappingWorkspaceDraftV1 {
  const block = (id: string) => workspace.getBlockById(id) ?? (() => { throw new Error(`W4-M1 Blockly 缺少 ${id}。`); })();
  const root = block('mapping-root'), ifBlock = block('mapping-if'), condition = block('mapping-condition'), thenBlock = block('mapping-then'), elseBlock = block('mapping-else');
  const item = (source: Blockly.Block, extra: Partial<WeekFourMappingWorkspaceBlock> = {}): WeekFourMappingWorkspaceBlock => { const xy = source.getRelativeToSurfaceXY(); return { id: source.id, type: source.type, x: xy.x, y: xy.y, parentBlockId: source.getParent()?.id ?? null, previousId: source.previousConnection?.targetBlock()?.id ?? null, nextId: source.nextConnection?.targetBlock()?.id ?? null, ...extra }; };
  return { version: 1, missionId: 'w4-m1', blocks: [item(root), item(ifBlock, { conditionId: ifBlock.getInputTargetBlock('CONDITION')?.id ?? null, thenFirstId: ifBlock.getInputTargetBlock('THEN')?.id ?? null, elseFirstId: ifBlock.getInputTargetBlock('ELSE')?.id ?? null }), item(condition), item(thenBlock), item(elseBlock)] };
}

export function compileWeekFourMappingWorkspace(workspace: Blockly.Workspace): WeekFourMappingCompileResult { return compileWeekFourMappingDraft(serializeWeekFourMappingWorkspace(workspace)); }
