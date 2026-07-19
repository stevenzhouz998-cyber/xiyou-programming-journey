import type { Block, Workspace } from 'blockly/core'
import {
  initializeWorkspaceBlock,
  isFourSeasBlockType,
  isFourSeasChildBlockType,
  renderWorkspaceTopBlocks,
  type FourSeasBlockType,
} from './fourSeasRegaliaBlocks'

const MAX_DRAFT_BLOCKS = 100

export interface FourSeasWorkspaceDraftV1 {
  version: 1
  blocks: Array<{
    id: string
    type: FourSeasBlockType
    nextId: string | null
    parentBlockId: string | null
    x: number
    y: number
  }>
}

function byId(left: Block, right: Block): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

function isSafeCoordinate(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER
}

function expectedParentType(type: FourSeasBlockType): FourSeasBlockType | null {
  if (type.startsWith('xiyou_receive_')) return 'xiyou_collect_gifts'
  if (type.startsWith('xiyou_wear_')) return 'xiyou_equip_regalia'
  return null
}

function validateDraft(draft: FourSeasWorkspaceDraftV1): void {
  if (draft.version !== 1 || !Array.isArray(draft.blocks)) {
    throw new Error('Unsupported four seas workspace draft')
  }
  if (draft.blocks.length > MAX_DRAFT_BLOCKS) {
    throw new Error(`Four seas workspace draft exceeds ${MAX_DRAFT_BLOCKS} blocks`)
  }

  const byBlockId = new Map<string, FourSeasWorkspaceDraftV1['blocks'][number]>()
  for (const block of draft.blocks) {
    if (typeof block.id !== 'string' || block.id.length === 0) {
      throw new Error('Draft block id must be a non-empty string')
    }
    if (byBlockId.has(block.id)) throw new Error(`Duplicate block id: ${block.id}`)
    if (!isFourSeasBlockType(block.type)) throw new Error(`Unknown block type: ${String(block.type)}`)
    if (!isSafeCoordinate(block.x) || !isSafeCoordinate(block.y)) {
      throw new Error(`Unsafe block position: ${block.id}`)
    }
    byBlockId.set(block.id, block)
  }

  const predecessorIds = new Set<string>()
  for (const block of draft.blocks) {
    const requiredParentType = expectedParentType(block.type)
    if (requiredParentType === null) {
      if (block.parentBlockId !== null) throw new Error(`Top block cannot have a parent: ${block.id}`)
    } else {
      if (typeof block.parentBlockId !== 'string') throw new Error(`Child block requires a parent: ${block.id}`)
      const parent = byBlockId.get(block.parentBlockId)
      if (!parent) throw new Error(`Unknown parent block id: ${block.parentBlockId}`)
      if (parent.type !== requiredParentType) throw new Error(`Wrong parent block type: ${block.id}`)
    }

    if (block.nextId === null) continue
    if (typeof block.nextId !== 'string' || !byBlockId.has(block.nextId)) {
      throw new Error(`Unknown next block id: ${String(block.nextId)}`)
    }
    const next = byBlockId.get(block.nextId)!
    if (next.parentBlockId !== block.parentBlockId) throw new Error(`Cross-scope next link: ${block.id}`)
    if (predecessorIds.has(block.nextId)) throw new Error(`Block has multiple predecessors: ${block.nextId}`)
    predecessorIds.add(block.nextId)
  }

  const scopes = new Map<string | null, string[]>()
  for (const block of draft.blocks) {
    const scope = scopes.get(block.parentBlockId) ?? []
    scope.push(block.id)
    scopes.set(block.parentBlockId, scope)
  }
  for (const [parentId, ids] of scopes) {
    const heads = ids.filter((id) => !predecessorIds.has(id))
    if (heads.length !== 1) throw new Error(`Scope must have exactly one head: ${String(parentId)}`)
  }

  for (const start of byBlockId.keys()) {
    const path = new Set<string>()
    let current: string | null = start
    while (current !== null) {
      if (path.has(current)) throw new Error(`Cyclic block chain: ${current}`)
      path.add(current)
      current = byBlockId.get(current)?.nextId ?? null
    }
  }
}

function assertSnapshotCompatible(block: Block): void {
  if (block.previousConnection === null || block.nextConnection === null) {
    throw new Error(`Workspace block cannot be represented in a draft snapshot: ${block.id}`)
  }
  const surround = block.getSurroundParent()
  if (isFourSeasChildBlockType(block.type)) {
    if (surround === null) throw new Error(`Workspace child block has no container: ${block.id}`)
  } else if (surround !== null) {
    throw new Error(`Workspace top block is nested: ${block.id}`)
  }

  const nextTarget = block.nextConnection.targetConnection
  if (nextTarget !== null) {
    const next = nextTarget.getSourceBlock()
    if (
      nextTarget !== next.previousConnection
      || nextTarget.targetConnection !== block.nextConnection
      || block.getNextBlock() !== next
      || next.getSurroundParent() !== surround
    ) {
      throw new Error(`Workspace has an invalid next connection snapshot: ${block.id}`)
    }
  } else if (block.getNextBlock() !== null) {
    throw new Error(`Workspace has an invalid next connection snapshot: ${block.id}`)
  }
}

export function saveFourSeasWorkspaceDraft(workspace: Workspace): FourSeasWorkspaceDraftV1 {
  const blocks = workspace.getAllBlocks(false).sort(byId)
  if (blocks.length > MAX_DRAFT_BLOCKS) throw new Error(`Workspace exceeds ${MAX_DRAFT_BLOCKS} blocks`)
  const draft: FourSeasWorkspaceDraftV1 = {
    version: 1,
    blocks: blocks.map((block) => {
      if (!isFourSeasBlockType(block.type)) throw new Error(`Cannot save unknown block type: ${block.type}`)
      assertSnapshotCompatible(block)
      const position = block.getRelativeToSurfaceXY()
      return {
        id: block.id,
        type: block.type,
        nextId: block.getNextBlock()?.id ?? null,
        parentBlockId: block.getSurroundParent()?.id ?? null,
        x: position.x,
        y: position.y,
      }
    }),
  }
  try {
    validateDraft(draft)
  } catch (error) {
    throw new Error('Workspace cannot be represented as a lossless four seas draft snapshot', { cause: error })
  }
  return draft
}

function applyValidatedDraft(workspace: Workspace, draft: FourSeasWorkspaceDraftV1): void {
  workspace.clear()
  const created = new Map<string, Block>()
  for (const saved of draft.blocks) {
    const block = workspace.newBlock(saved.type, saved.id)
    initializeWorkspaceBlock(block)
    block.moveBy(saved.x, saved.y)
    created.set(saved.id, block)
  }
  for (const saved of draft.blocks) {
    if (saved.nextId === null) continue
    const block = created.get(saved.id)
    const next = created.get(saved.nextId)
    if (!block?.nextConnection || !next?.previousConnection || !block.nextConnection.connect(next.previousConnection)) {
      throw new Error(`Failed to restore block connection: ${saved.id}`)
    }
  }

  const predecessorIds = new Set(draft.blocks.flatMap((block) => (block.nextId === null ? [] : [block.nextId])))
  for (const saved of draft.blocks) {
    if (saved.parentBlockId === null || predecessorIds.has(saved.id)) continue
    const parent = created.get(saved.parentBlockId)
    const child = created.get(saved.id)
    const inputName = parent?.type === 'xiyou_collect_gifts' ? 'GIFTS' : parent?.type === 'xiyou_equip_regalia' ? 'GEAR' : null
    const input = inputName === null ? null : parent?.getInput(inputName)?.connection
    if (!input || !child?.previousConnection || !input.connect(child.previousConnection)) {
      throw new Error(`Failed to restore child scope: ${saved.id}`)
    }
  }
  renderWorkspaceTopBlocks(workspace)
}

export function loadFourSeasWorkspaceDraft(
  workspace: Workspace,
  draft: FourSeasWorkspaceDraftV1,
): void {
  validateDraft(draft)
  const previousDraft = saveFourSeasWorkspaceDraft(workspace)
  try {
    applyValidatedDraft(workspace, draft)
  } catch (applyError) {
    try {
      applyValidatedDraft(workspace, previousDraft)
    } catch (rollbackError) {
      throw new AggregateError(
        [applyError, rollbackError],
        'Failed to load four seas workspace draft and failed to restore the previous snapshot',
      )
    }
    throw applyError
  }
}
