import type { Block, Workspace } from 'blockly/core'
import {
  initializeWorkspaceBlock,
  isDragonBlockType,
  renderWorkspaceTopBlocks,
  type DragonBlockType,
} from './dragonPalaceBlocks'

function assertCanonicalConnections(block: Block): void {
  const previous = block.previousConnection
  const next = block.nextConnection
  if (previous === null || next === null) {
    throw new Error(`Action block is missing a canonical statement connection: ${block.id}`)
  }

  const previousTarget = previous.targetConnection
  if (previousTarget !== null) {
    const previousBlock = previousTarget.getSourceBlock()
    if (
      previousTarget !== previousBlock.nextConnection ||
      previousTarget.targetConnection !== previous ||
      block.getPreviousBlock() !== previousBlock
    ) {
      throw new Error(`Action block has an invalid previous connection: ${block.id}`)
    }
  } else if (block.getPreviousBlock() !== null) {
    throw new Error(`Action block has an invalid previous connection: ${block.id}`)
  }

  const nextTarget = next.targetConnection
  if (nextTarget !== null) {
    const nextBlock = nextTarget.getSourceBlock()
    if (
      nextTarget !== nextBlock.previousConnection ||
      nextTarget.targetConnection !== next ||
      block.getNextBlock() !== nextBlock
    ) {
      throw new Error(`Action block has an invalid next connection: ${block.id}`)
    }
  } else if (block.getNextBlock() !== null) {
    throw new Error(`Action block has an invalid next connection: ${block.id}`)
  }
}

function canonicalChains(workspace: Workspace): Block[][] {
  const allBlocks = workspace.getAllBlocks(false)
  if (allBlocks.length === 0) return []

  for (const block of allBlocks) {
    if (!isDragonBlockType(block.type)) throw new Error(`Unknown block type: ${block.type}`)
    assertCanonicalConnections(block)
  }

  const visited = new Set<string>()
  const chains = workspace.getTopBlocks(false).map((topBlock) => {
    const chain: Block[] = []
    let current: Block | null = topBlock
    while (current !== null) {
      if (visited.has(current.id)) throw new Error('Invalid cyclic or shared block chain')
      visited.add(current.id)
      chain.push(current)
      current = current.getNextBlock()
    }
    return chain
  })

  if (visited.size !== allBlocks.length) {
    throw new Error('Invalid disconnected or cyclic block chain')
  }
  return chains
}

function uniqueChain(workspace: Workspace): Block[] {
  const chains = canonicalChains(workspace)
  if (chains.length === 0) return []
  if (chains.length !== 1) {
    throw new Error(`Expected one main chain, found multiple top-level chains: ${chains.length}`)
  }

  return chains[0]
}

function assertChainEndpoints(chain: readonly Block[]): void {
  for (const block of chain) {
    if (!block.previousConnection || !block.nextConnection) {
      throw new Error(`Action block is missing a canonical statement connection: ${block.id}`)
    }
  }
}

function disconnectBlocks(blocks: readonly Block[]): void {
  for (const block of blocks) {
    if (block.nextConnection?.isConnected()) block.nextConnection.disconnect()
  }
}

function connectChain(chain: readonly Block[]): void {
  assertChainEndpoints(chain)
  for (let index = 0; index < chain.length - 1; index += 1) {
    const current = chain[index]
    const next = chain[index + 1]
    if (!current.nextConnection || !next.previousConnection) {
      throw new Error('Action block is missing a statement connection')
    }
    if (!current.nextConnection.connect(next.previousConnection)) {
      throw new Error(`Failed to reconnect action block: ${current.id}`)
    }
  }
}

function applyChain(
  workspace: Workspace,
  chain: readonly Block[],
  blocksToDisconnect: readonly Block[] = chain,
): void {
  assertChainEndpoints(chain)
  disconnectBlocks(blocksToDisconnect)
  connectChain(chain)
  renderWorkspaceTopBlocks(workspace)
}

type SavedPosition = { block: Block; x: number; y: number }

function capturePositions(chain: readonly Block[]): SavedPosition[] {
  return chain.map((block) => {
    const position = block.getRelativeToSurfaceXY()
    return { block, x: position.x, y: position.y }
  })
}

function restoreOriginalChain(
  workspace: Workspace,
  original: readonly Block[],
  positions: readonly SavedPosition[],
): void {
  assertChainEndpoints(original)
  disconnectBlocks(original)
  for (const saved of positions) {
    const current = saved.block.getRelativeToSurfaceXY()
    saved.block.moveBy(saved.x - current.x, saved.y - current.y)
  }
  connectChain(original)
  renderWorkspaceTopBlocks(workspace)
}

function throwAfterRollback(
  workspace: Workspace,
  original: readonly Block[],
  positions: readonly SavedPosition[],
  operationError: unknown,
  message: string,
): never {
  try {
    restoreOriginalChain(workspace, original, positions)
  } catch (rollbackError) {
    throw new AggregateError([operationError, rollbackError], message)
  }
  throw operationError
}

export function appendActionBlock(workspace: Workspace, type: DragonBlockType): Block {
  if (!isDragonBlockType(type)) throw new Error(`Unknown block type: ${String(type)}`)
  const chain = uniqueChain(workspace)
  const block = workspace.newBlock(type)
  try {
    initializeWorkspaceBlock(block)
    if (chain.length > 0) {
      const tail = chain.at(-1)
      if (!tail?.nextConnection || !block.previousConnection) {
        throw new Error('Action block is missing a statement connection')
      }
      if (!tail.nextConnection.connect(block.previousConnection)) {
        throw new Error('Failed to append action block')
      }
    }
    renderWorkspaceTopBlocks(workspace)
    return block
  } catch (operationError) {
    try {
      block.dispose(false)
      renderWorkspaceTopBlocks(workspace)
    } catch (cleanupError) {
      throw new AggregateError(
        [operationError, cleanupError],
        'Failed to append action block and failed to remove the partial block',
      )
    }
    throw operationError
  }
}

export function moveActionBlock(
  workspace: Workspace,
  blockId: string,
  direction: -1 | 1,
): boolean {
  const chain = uniqueChain(workspace)
  const currentIndex = chain.findIndex((block) => block.id === blockId)
  if (currentIndex === -1) return false

  const destinationIndex = currentIndex + direction
  if (destinationIndex < 0 || destinationIndex >= chain.length) return false

  const positions = capturePositions(chain)
  const reordered = [...chain]
  const destination = reordered[destinationIndex]
  reordered[destinationIndex] = reordered[currentIndex]
  reordered[currentIndex] = destination
  try {
    applyChain(workspace, reordered)
  } catch (operationError) {
    throwAfterRollback(
      workspace,
      chain,
      positions,
      operationError,
      'Failed to move action block and failed to restore the original chain',
    )
  }
  return true
}

export function deleteActionBlock(workspace: Workspace, blockId: string): boolean {
  const block = workspace.getBlockById(blockId)
  if (block === null) return false
  const chains = canonicalChains(workspace)
  const chain = chains.find((candidate) => candidate.some((item) => item.id === blockId))
  if (!chain) throw new Error(`Block is not in a canonical chain: ${blockId}`)
  const targetIndex = chain.findIndex((candidate) => candidate.id === blockId)
  if (targetIndex === -1) throw new Error(`Block is not in its canonical chain: ${blockId}`)
  const positions = capturePositions(chain)
  const remaining = chain.filter((candidate) => candidate.id !== blockId)

  try {
    applyChain(workspace, remaining, chain)
  } catch (operationError) {
    throwAfterRollback(
      workspace,
      chain,
      positions,
      operationError,
      'Failed to delete action block and failed to restore the original chain',
    )
  }

  try {
    block.dispose(false)
  } catch (disposeError) {
    if (workspace.getBlockById(blockId) === block && !block.disposed) {
      throwAfterRollback(
        workspace,
        chain,
        positions,
        disposeError,
        'Failed to dispose action block and failed to restore the original chain',
      )
    }
    throw new AggregateError(
      [disposeError],
      'Failed while disposing the action block after its chain was updated',
    )
  }
  return true
}
