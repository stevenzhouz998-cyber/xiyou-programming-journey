import type { FourSeasOpcode } from '../battle/types'

export const FOUR_SEAS_BLOCK_OPCODE = {
  xiyou_request_regalia: 'request_regalia',
  xiyou_collect_gifts: 'collect_gifts',
  xiyou_receive_cloud_boots: 'receive_cloud_boots',
  xiyou_receive_golden_armor: 'receive_golden_armor',
  xiyou_receive_purple_crown: 'receive_purple_crown',
  xiyou_equip_regalia: 'equip_regalia',
  xiyou_wear_crown: 'wear_crown',
  xiyou_wear_armor: 'wear_armor',
  xiyou_wear_boots: 'wear_boots',
  xiyou_verify_regalia: 'verify_regalia',
} as const satisfies Record<string, FourSeasOpcode>

export type FourSeasBlockType = keyof typeof FOUR_SEAS_BLOCK_OPCODE

export const FOUR_SEAS_TOP_BLOCK_TYPES = [
  'xiyou_request_regalia',
  'xiyou_collect_gifts',
  'xiyou_equip_regalia',
  'xiyou_verify_regalia',
] as const satisfies readonly FourSeasBlockType[]

export const FOUR_SEAS_CHILD_BLOCK_TYPES = [
  'xiyou_receive_cloud_boots',
  'xiyou_receive_golden_armor',
  'xiyou_receive_purple_crown',
  'xiyou_wear_crown',
  'xiyou_wear_armor',
  'xiyou_wear_boots',
] as const satisfies readonly FourSeasBlockType[]

export const FOUR_SEAS_BLOCK_LABELS: Readonly<Record<FourSeasBlockType, string>> = {
  xiyou_request_regalia: '向东海龙王请求披挂',
  xiyou_collect_gifts: '收齐三海宝物',
  xiyou_receive_cloud_boots: '收下北海的藕丝步云履',
  xiyou_receive_golden_armor: '收下西海的锁子黄金甲',
  xiyou_receive_purple_crown: '收下南海的凤翅紫金冠',
  xiyou_equip_regalia: '穿戴整副披挂',
  xiyou_wear_crown: '戴上凤翅紫金冠',
  xiyou_wear_armor: '穿上锁子黄金甲',
  xiyou_wear_boots: '踏上藕丝步云履',
  xiyou_verify_regalia: '检查披挂是否齐全',
}

const topTypes = new Set<string>(FOUR_SEAS_TOP_BLOCK_TYPES)
const childTypes = new Set<string>(FOUR_SEAS_CHILD_BLOCK_TYPES)

export function isFourSeasBlockType(type: string): type is FourSeasBlockType {
  return Object.prototype.hasOwnProperty.call(FOUR_SEAS_BLOCK_OPCODE, type)
}

export function isFourSeasTopBlockType(
  type: string,
): type is (typeof FOUR_SEAS_TOP_BLOCK_TYPES)[number] {
  return topTypes.has(type)
}

export function isFourSeasChildBlockType(
  type: string,
): type is (typeof FOUR_SEAS_CHILD_BLOCK_TYPES)[number] {
  return childTypes.has(type)
}

export const FOUR_SEAS_WORKSPACE_LIMITS = {
  maxWorkspaceBlocks: 500,
  maxBlockOrSourceIdLength: 256,
  maxCoordinateMagnitude: Number.MAX_SAFE_INTEGER,
} as const

export interface FourSeasWorkspaceBoundaryItem {
  id: unknown
  x: unknown
  y: unknown
}

export interface FourSeasWorkspaceBoundaryViolation {
  reason: 'block-count' | 'block-id' | 'coordinate'
  sourceBlockId: string | null
}

export function findFourSeasWorkspaceBoundaryViolation(
  blocks: readonly FourSeasWorkspaceBoundaryItem[],
): FourSeasWorkspaceBoundaryViolation | null {
  if (blocks.length > FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks) {
    const firstOverBoundary = blocks[FOUR_SEAS_WORKSPACE_LIMITS.maxWorkspaceBlocks]
    return {
      reason: 'block-count',
      sourceBlockId:
        typeof firstOverBoundary?.id === 'string' ? firstOverBoundary.id : null,
    }
  }
  for (const block of blocks) {
    const sourceBlockId = typeof block.id === 'string' ? block.id : null
    if (
      typeof block.id === 'string'
      && block.id.length > FOUR_SEAS_WORKSPACE_LIMITS.maxBlockOrSourceIdLength
    ) {
      return { reason: 'block-id', sourceBlockId }
    }
    if (
      typeof block.x !== 'number'
      || typeof block.y !== 'number'
      || !Number.isFinite(block.x)
      || !Number.isFinite(block.y)
      || Math.abs(block.x) > FOUR_SEAS_WORKSPACE_LIMITS.maxCoordinateMagnitude
      || Math.abs(block.y) > FOUR_SEAS_WORKSPACE_LIMITS.maxCoordinateMagnitude
    ) {
      return { reason: 'coordinate', sourceBlockId }
    }
  }
  return null
}
