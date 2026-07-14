import type { Block, Workspace } from 'blockly'
import { isDragonBlockType, type DragonBlockType } from './dragonPalaceBlocks'

export interface WorkspaceDraftV1 {
  version: 1
  blocks: Array<{
    id: string
    type: DragonBlockType
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

export function saveWorkspaceDraft(workspace: Workspace): WorkspaceDraftV1 {
  return {
    version: 1,
    blocks: workspace
      .getAllBlocks(false)
      .sort(byId)
      .map((block) => {
        if (!isDragonBlockType(block.type)) {
          throw new Error(`Cannot save unknown block type: ${block.type}`)
        }
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
}

function validateDraft(draft: WorkspaceDraftV1): void {
  if (draft.version !== 1 || !Array.isArray(draft.blocks)) {
    throw new Error('Unsupported workspace draft')
  }

  const ids = new Set<string>()
  const predecessorIds = new Set<string>()

  for (const block of draft.blocks) {
    if (typeof block.id !== 'string' || block.id.length === 0) {
      throw new Error('Draft block id must be a non-empty string')
    }
    if (ids.has(block.id)) throw new Error(`Duplicate block id: ${block.id}`)
    ids.add(block.id)
    if (!isDragonBlockType(block.type)) {
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

export function loadWorkspaceDraft(workspace: Workspace, draft: WorkspaceDraftV1): void {
  validateDraft(draft)

  workspace.clear()
  const created = new Map<string, Block>()

  for (const saved of draft.blocks) {
    const block = workspace.newBlock(saved.type, saved.id)
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
    block.nextConnection.connect(next.previousConnection)
  }
}
