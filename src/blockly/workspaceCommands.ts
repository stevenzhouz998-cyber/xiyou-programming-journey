import type { Block, Workspace } from 'blockly'
import { isDragonBlockType, type DragonBlockType } from './dragonPalaceBlocks'

function uniqueChain(workspace: Workspace): Block[] {
  const allBlocks = workspace.getAllBlocks(false)
  if (allBlocks.length === 0) return []

  const topBlocks = workspace.getTopBlocks(false)
  if (topBlocks.length !== 1) {
    throw new Error(`Expected one main chain, found multiple top-level chains: ${topBlocks.length}`)
  }

  const chain: Block[] = []
  const visited = new Set<string>()
  let current: Block | null = topBlocks[0]
  while (current !== null) {
    if (visited.has(current.id)) throw new Error('Invalid cyclic block chain')
    if (!isDragonBlockType(current.type)) throw new Error(`Unknown block type: ${current.type}`)
    visited.add(current.id)
    chain.push(current)
    current = current.getNextBlock()
  }

  if (chain.length !== allBlocks.length) throw new Error('Invalid disconnected block chain')
  return chain
}

function reconnectChain(chain: readonly Block[]): void {
  for (const block of chain) {
    if (block.nextConnection?.isConnected()) block.nextConnection.disconnect()
  }
  for (let index = 0; index < chain.length - 1; index += 1) {
    const current = chain[index]
    const next = chain[index + 1]
    if (!current.nextConnection || !next.previousConnection) {
      throw new Error('Action block is missing a statement connection')
    }
    current.nextConnection.connect(next.previousConnection)
  }
}

export function appendActionBlock(workspace: Workspace, type: DragonBlockType): Block {
  if (!isDragonBlockType(type)) throw new Error(`Unknown block type: ${String(type)}`)
  const chain = uniqueChain(workspace)
  const block = workspace.newBlock(type)
  if (chain.length === 0) return block

  const tail = chain.at(-1)
  if (!tail?.nextConnection || !block.previousConnection) {
    block.dispose(false)
    throw new Error('Action block is missing a statement connection')
  }
  tail.nextConnection.connect(block.previousConnection)
  return block
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

  const reordered = [...chain]
  const destination = reordered[destinationIndex]
  reordered[destinationIndex] = reordered[currentIndex]
  reordered[currentIndex] = destination
  reconnectChain(reordered)
  return true
}

export function deleteActionBlock(workspace: Workspace, blockId: string): boolean {
  const block = workspace.getBlockById(blockId)
  if (block === null) return false
  if (!isDragonBlockType(block.type)) throw new Error(`Unknown block type: ${block.type}`)

  const previous = block.getPreviousBlock()
  const next = block.getNextBlock()
  if (block.nextConnection?.isConnected()) block.nextConnection.disconnect()
  if (block.previousConnection?.isConnected()) block.previousConnection.disconnect()

  if (previous !== null && next !== null) {
    if (!previous.nextConnection || !next.previousConnection) {
      throw new Error('Action block is missing a statement connection')
    }
    previous.nextConnection.connect(next.previousConnection)
  }

  block.dispose(false)
  return true
}
