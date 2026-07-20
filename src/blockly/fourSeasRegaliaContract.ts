export const FOUR_SEAS_BLOCK_DEFINITIONS = {
  xiyou_request_regalia: { opcode: 'request_regalia', parentScope: 'top' },
  xiyou_collect_gifts: { opcode: 'collect_gifts', parentScope: 'top' },
  xiyou_receive_cloud_boots: { opcode: 'receive_cloud_boots', parentScope: 'collect' },
  xiyou_receive_golden_armor: { opcode: 'receive_golden_armor', parentScope: 'collect' },
  xiyou_receive_purple_crown: { opcode: 'receive_purple_crown', parentScope: 'collect' },
  xiyou_equip_regalia: { opcode: 'equip_regalia', parentScope: 'top' },
  xiyou_wear_crown: { opcode: 'wear_crown', parentScope: 'equip' },
  xiyou_wear_armor: { opcode: 'wear_armor', parentScope: 'equip' },
  xiyou_wear_boots: { opcode: 'wear_boots', parentScope: 'equip' },
  xiyou_verify_regalia: { opcode: 'verify_regalia', parentScope: 'top' },
} as const

type FourSeasBlockDefinitions = typeof FOUR_SEAS_BLOCK_DEFINITIONS

export type FourSeasBlockType = keyof FourSeasBlockDefinitions
export type FourSeasOpcode = FourSeasBlockDefinitions[FourSeasBlockType]['opcode']
export type FourSeasOpcodeParentScope =
  FourSeasBlockDefinitions[FourSeasBlockType]['parentScope']
export type FourSeasOpcodePlacement = 'top' | 'child'
export type FourSeasTopBlockType = {
  [TBlockType in FourSeasBlockType]:
    FourSeasBlockDefinitions[TBlockType]['parentScope'] extends 'top' ? TBlockType : never
}[FourSeasBlockType]
export type FourSeasChildBlockType = Exclude<FourSeasBlockType, FourSeasTopBlockType>

const blockEntries = Object.entries(FOUR_SEAS_BLOCK_DEFINITIONS) as Array<[
  FourSeasBlockType,
  FourSeasBlockDefinitions[FourSeasBlockType],
]>

export const FOUR_SEAS_BLOCK_OPCODE = Object.fromEntries(
  blockEntries.map(([blockType, definition]) => [blockType, definition.opcode]),
) as { readonly [TBlockType in FourSeasBlockType]: FourSeasBlockDefinitions[TBlockType]['opcode'] }

export const FOUR_SEAS_TOP_BLOCK_TYPES = blockEntries
  .filter(([, definition]) => definition.parentScope === 'top')
  .map(([blockType]) => blockType) as readonly FourSeasTopBlockType[]

export const FOUR_SEAS_CHILD_BLOCK_TYPES = blockEntries
  .filter(([, definition]) => definition.parentScope !== 'top')
  .map(([blockType]) => blockType) as readonly FourSeasChildBlockType[]

export const FOUR_SEAS_OPCODE_PARENT_SCOPE = Object.fromEntries(
  blockEntries.map(([, definition]) => [definition.opcode, definition.parentScope]),
) as Readonly<Record<FourSeasOpcode, FourSeasOpcodeParentScope>>

export const FOUR_SEAS_OPCODE_PLACEMENT = Object.fromEntries(
  blockEntries.map(([, definition]) => [
    definition.opcode,
    definition.parentScope === 'top' ? 'top' : 'child',
  ]),
) as Readonly<Record<FourSeasOpcode, FourSeasOpcodePlacement>>

const topTypes = new Set<string>(FOUR_SEAS_TOP_BLOCK_TYPES)
const childTypes = new Set<string>(FOUR_SEAS_CHILD_BLOCK_TYPES)
const opcodes = new Set<string>(Object.values(FOUR_SEAS_BLOCK_OPCODE))

if (opcodes.size !== blockEntries.length) {
  throw new Error('Four Seas block definitions must use unique opcodes')
}

export function isFourSeasBlockType(type: string): type is FourSeasBlockType {
  return Object.prototype.hasOwnProperty.call(FOUR_SEAS_BLOCK_OPCODE, type)
}

export function isFourSeasTopBlockType(
  type: string,
): type is FourSeasTopBlockType {
  return topTypes.has(type)
}

export function isFourSeasChildBlockType(
  type: string,
): type is FourSeasChildBlockType {
  return childTypes.has(type)
}

export function isFourSeasOpcode(opcode: string): opcode is FourSeasOpcode {
  return opcodes.has(opcode)
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
