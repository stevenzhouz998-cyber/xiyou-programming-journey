import { traceForField, type WeekFourMappingTraceItem } from './weekFourMappingContract';

export const WEEK_FOUR_MAPPING_BLOCK_TYPES = {
  root: 'w4_mapping_when_visitor',
  ifIdentity: 'w4_mapping_if_identity',
  identityIsDemon: 'w4_mapping_identity_is_baigujing',
  continueVerification: 'w4_mapping_continue_verification',
  politePass: 'w4_mapping_polite_pass',
} as const;
export const WEEK_FOUR_MAPPING_COORDINATE_LIMIT = 20_000;
export interface WeekFourMappingWorkspaceBlock {
  id: string; type: string; x: number; y: number; parentBlockId: string | null; previousId: string | null; nextId: string | null;
  conditionId?: string | null; thenFirstId?: string | null; elseFirstId?: string | null;
}
export interface WeekFourMappingWorkspaceDraftV1 { version: 1; missionId: 'w4-m1'; blocks: WeekFourMappingWorkspaceBlock[]; }
export interface WeekFourMappingCompileResult { draft: WeekFourMappingWorkspaceDraftV1; trace: WeekFourMappingTraceItem[]; }

const ids = ['mapping-root', 'mapping-if', 'mapping-condition', 'mapping-then', 'mapping-else'] as const;
const clamp = (value: number) => Math.max(-WEEK_FOUR_MAPPING_COORDINATE_LIMIT, Math.min(WEEK_FOUR_MAPPING_COORDINATE_LIMIT, value));

export function createDefaultWeekFourMappingDraft(): WeekFourMappingWorkspaceDraftV1 {
  const types = WEEK_FOUR_MAPPING_BLOCK_TYPES;
  return { version: 1, missionId: 'w4-m1', blocks: [
    { id: 'mapping-root', type: types.root, x: 40, y: 40, parentBlockId: null, previousId: null, nextId: null },
    { id: 'mapping-if', type: types.ifIdentity, x: 40, y: 100, parentBlockId: 'mapping-root', previousId: 'mapping-root', nextId: null, conditionId: 'mapping-condition', thenFirstId: 'mapping-then', elseFirstId: 'mapping-else' },
    { id: 'mapping-condition', type: types.identityIsDemon, x: 260, y: 100, parentBlockId: 'mapping-if', previousId: null, nextId: null },
    { id: 'mapping-then', type: types.continueVerification, x: 100, y: 160, parentBlockId: 'mapping-if', previousId: 'mapping-if', nextId: null },
    { id: 'mapping-else', type: types.politePass, x: 100, y: 220, parentBlockId: 'mapping-if', previousId: 'mapping-if', nextId: null },
  ] };
}

function validDraft(value: unknown): WeekFourMappingWorkspaceDraftV1 {
  if (!value || typeof value !== 'object') throw new Error('W4-M1 Blockly 草稿无效。');
  const draft = value as WeekFourMappingWorkspaceDraftV1;
  if (draft.version !== 1 || draft.missionId !== 'w4-m1' || !Array.isArray(draft.blocks) || draft.blocks.length !== ids.length) throw new Error('W4-M1 Blockly 草稿结构无效。');
  const map = new Map(draft.blocks.map((block) => [block.id, block]));
  if (map.size !== ids.length || ids.some((id) => !map.has(id))) throw new Error('W4-M1 Blockly 图必须含一组稳定积木。');
  const types = WEEK_FOUR_MAPPING_BLOCK_TYPES;
  const root = map.get('mapping-root')!, condition = map.get('mapping-condition')!, ifBlock = map.get('mapping-if')!, thenBlock = map.get('mapping-then')!, elseBlock = map.get('mapping-else')!;
  for (const block of map.values()) {
    const expectedKeys = new Set(['id', 'type', 'x', 'y', 'parentBlockId', 'previousId', 'nextId']);
    if (block.id === 'mapping-if') for (const key of ['conditionId', 'thenFirstId', 'elseFirstId']) expectedKeys.add(key);
    if (Object.keys(block).length !== expectedKeys.size || Object.keys(block).some((key) => !expectedKeys.has(key))) throw new Error('W4-M1 Blockly 积木含未知字段。');
    if (!Number.isFinite(block.x) || !Number.isFinite(block.y) || typeof block.type !== 'string' || !Object.values(types).includes(block.type as never)) throw new Error('W4-M1 Blockly 积木无效。');
  }
  if (root.type !== types.root || root.parentBlockId !== null || root.previousId !== null || root.nextId !== null) throw new Error('W4-M1 Blockly 根连接无效。');
  if (ifBlock.type !== types.ifIdentity || ifBlock.parentBlockId !== 'mapping-root' || ifBlock.previousId !== 'mapping-root' || ifBlock.nextId !== null || ifBlock.conditionId !== 'mapping-condition' || ifBlock.thenFirstId !== 'mapping-then' || ifBlock.elseFirstId !== 'mapping-else') throw new Error('W4-M1 Blockly 条件连接无效。');
  if (condition.type !== types.identityIsDemon || condition.parentBlockId !== 'mapping-if' || condition.previousId !== null || condition.nextId !== null) throw new Error('W4-M1 Blockly 条件连接无效。');
  for (const [block, type] of [[thenBlock, types.continueVerification], [elseBlock, types.politePass]] as const) if (block.type !== type || block.parentBlockId !== 'mapping-if' || block.previousId !== 'mapping-if' || block.nextId !== null) throw new Error('W4-M1 Blockly 分支连接无效。');
  return { version: 1, missionId: 'w4-m1', blocks: draft.blocks.map((block) => ({ ...structuredClone(block), x: clamp(block.x), y: clamp(block.y) })) };
}

export function compileWeekFourMappingDraft(value: unknown): WeekFourMappingCompileResult {
  const draft = validDraft(value);
  return { draft, trace: traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' }) };
}

export function focusableBlockIdForMappingFailure(): 'mapping-condition' { return 'mapping-condition'; }
