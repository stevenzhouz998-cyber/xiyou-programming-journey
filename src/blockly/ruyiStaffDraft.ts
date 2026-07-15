import type { Block, Workspace } from 'blockly/core'
import {
  initializeWorkspaceBlock,
  isRuyiBlockType,
  renderWorkspaceTopBlocks,
  type RuyiBlockType,
} from './ruyiStaffBlocks'

export interface RuyiWorkspaceDraftV1 {
  version: 1
  blocks: Array<{
    id: string
    type: RuyiBlockType
    nextId: string | null
    x: number
    y: number
  }>
}

function byId(left: Block, right: Block): number {
  if (left.id < right.id) return -1
  if (left.id > right.id) return 1
  return 0
}

function isSafeCoordinate(value: number): boolean {
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER
}

function assertSnapshotCompatible(block: Block): void {
  const previous = block.previousConnection
  const next = block.nextConnection
  if (previous === null || next === null) {
    throw new Error(`Workspace block cannot be represented in a draft snapshot: ${block.id}`)
  }

  const previousTarget = previous.targetConnection
  if (previousTarget !== null) {
    const previousBlock = previousTarget.getSourceBlock()
    if (
      previousTarget !== previousBlock.nextConnection
      || previousTarget.targetConnection !== previous
      || block.getPreviousBlock() !== previousBlock
    ) {
      throw new Error(`Workspace has an invalid previous connection snapshot: ${block.id}`)
    }
  } else if (block.getPreviousBlock() !== null) {
    throw new Error(`Workspace has an invalid previous connection snapshot: ${block.id}`)
  }

  const nextTarget = next.targetConnection
  if (nextTarget !== null) {
    const nextBlock = nextTarget.getSourceBlock()
    if (
      nextTarget !== nextBlock.previousConnection
      || nextTarget.targetConnection !== next
      || block.getNextBlock() !== nextBlock
    ) {
      throw new Error(`Workspace has an invalid next connection snapshot: ${block.id}`)
    }
  } else if (block.getNextBlock() !== null) {
    throw new Error(`Workspace has an invalid next connection snapshot: ${block.id}`)
  }
}

export function saveRuyiWorkspaceDraft(workspace: Workspace): RuyiWorkspaceDraftV1 {
  const draft: RuyiWorkspaceDraftV1 = {
    version: 1,
    blocks: workspace
      .getAllBlocks(false)
      .sort(byId)
      .map((block) => {
        if (!isRuyiBlockType(block.type)) {
          throw new Error(`Cannot save unknown block type: ${block.type}`)
        }
        assertSnapshotCompatible(block)
        const position = block.getRelativeToSurfaceXY()
        return {
          id: block.id,
          type: block.type,
          nextId: block.getNextBlock()?.id ?? null,
          x: position.x,
          y: position.y,
        }
      }),
  }
  try {
    validateDraft(draft)
  } catch (error) {
    throw new Error('Workspace cannot be represented as a lossless draft snapshot', {
      cause: error,
    })
  }
  return draft
}

function validateDraft(draft: RuyiWorkspaceDraftV1): void {
  if (draft.version !== 1 || !Array.isArray(draft.blocks)) {
    throw new Error('Unsupported ruyi workspace draft')
  }
  const ids = new Set<string>()
  const predecessorIds = new Set<string>()
  for (const block of draft.blocks) {
    if (typeof block.id !== 'string' || block.id.length === 0) {
      throw new Error('Draft block id must be a non-empty string')
    }
    if (ids.has(block.id)) throw new Error(`Duplicate block id: ${block.id}`)
    ids.add(block.id)
    if (!isRuyiBlockType(block.type)) {
      throw new Error(`Unknown block type: ${String(block.type)}`)
    }
    if (!isSafeCoordinate(block.x) || !isSafeCoordinate(block.y)) {
      throw new Error(`Unsafe block position: ${block.id}`)
    }
  }

  for (const block of draft.blocks) {
    if (block.nextId === null) continue
    if (typeof block.nextId !== 'string' || !ids.has(block.nextId)) {
      throw new Error(`Unknown next block id: ${String(block.nextId)}`)
    }
    if (block.nextId === block.id) throw new Error(`Self-linked block: ${block.id}`)
    if (predecessorIds.has(block.nextId)) {
      throw new Error(`Block has multiple predecessors: ${block.nextId}`)
    }
    predecessorIds.add(block.nextId)
  }

  const nextById = new Map(draft.blocks.map((block) => [block.id, block.nextId]))
  for (const start of ids) {
    const path = new Set<string>()
    let current: string | null = start
    while (current !== null) {
      if (path.has(current)) throw new Error(`Cyclic block chain: ${current}`)
      path.add(current)
      current = nextById.get(current) ?? null
    }
  }
}

function applyValidatedDraft(workspace: Workspace, draft: RuyiWorkspaceDraftV1): void {
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
    if (!block?.nextConnection || !next?.previousConnection) {
      throw new Error(`Cannot restore block connection: ${saved.id}`)
    }
    if (!block.nextConnection.connect(next.previousConnection)) {
      throw new Error(`Failed to restore block connection: ${saved.id}`)
    }
  }
  renderWorkspaceTopBlocks(workspace)
}

export function loadRuyiWorkspaceDraft(
  workspace: Workspace,
  draft: RuyiWorkspaceDraftV1,
): void {
  validateDraft(draft)
  const previousDraft = saveRuyiWorkspaceDraft(workspace)
  try {
    applyValidatedDraft(workspace, draft)
  } catch (applyError) {
    try {
      applyValidatedDraft(workspace, previousDraft)
    } catch (rollbackError) {
      throw new AggregateError(
        [applyError, rollbackError],
        'Failed to load ruyi workspace draft and failed to restore the previous snapshot',
      )
    }
    throw applyError
  }
}
