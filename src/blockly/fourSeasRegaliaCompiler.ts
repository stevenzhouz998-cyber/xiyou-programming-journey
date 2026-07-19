import type { Block, Connection, Workspace } from 'blockly/core'
import type { FourSeasInstruction } from '../battle/types'
import {
  FOUR_SEAS_BLOCK_OPCODE,
  isFourSeasBlockType,
  isFourSeasChildBlockType,
  isFourSeasTopBlockType,
} from './fourSeasRegaliaBlocks'
import { findFourSeasWorkspaceBoundaryViolation } from './fourSeasRegaliaDraft'

export type FourSeasCompileDiagnosticCode =
  | 'unknown-block'
  | 'invalid-connection'
  | 'multiple-main-chain'
  | 'empty-workspace'
  | 'missing-child-chain'
  | 'orphan-child'
  | 'invalid-nesting'
  | 'workspace-boundary'

export type FourSeasCompileResult =
  | { ok: true; trace: FourSeasInstruction[] }
  | {
      ok: false
      trace: []
      diagnostics: Array<{
        code: FourSeasCompileDiagnosticCode
        sourceBlockId: string | null
        concept: 'program-structure'
      }>
    }

function failure(
  code: FourSeasCompileDiagnosticCode,
  sourceBlockId: string | null,
): FourSeasCompileResult {
  return { ok: false, trace: [], diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }] }
}

function byId(left: Block, right: Block): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

function isReciprocal(connection: Connection, target: Connection): boolean {
  return connection.targetConnection === target && target.targetConnection === connection
}

function hasCanonicalConnections(block: Block): boolean {
  const previous = block.previousConnection
  const next = block.nextConnection
  if (previous === null || next === null) return false

  const previousTarget = previous.targetConnection
  if (previousTarget === null) {
    if (block.getPreviousBlock() !== null) return false
  } else {
    if (!isReciprocal(previous, previousTarget)) return false
    const previousSource = previousTarget.getSourceBlock()
    const isPreviousChain = previousTarget === previousSource.nextConnection
    const isStatementHead =
      previousTarget === previousSource.getInput('GIFTS')?.connection
      || previousTarget === previousSource.getInput('GEAR')?.connection
    if (!isPreviousChain && !isStatementHead) return false
    if (isPreviousChain && block.getPreviousBlock() !== previousSource) return false
    if (isStatementHead && block.getSurroundParent() !== previousSource) return false
  }

  const nextTarget = next.targetConnection
  if (nextTarget === null) {
    if (block.getNextBlock() !== null) return false
  } else {
    if (!isReciprocal(next, nextTarget)) return false
    const nextBlock = nextTarget.getSourceBlock()
    if (nextTarget !== nextBlock.previousConnection) return false
    if (block.getNextBlock() !== nextBlock) return false
  }
  return true
}

function containerChild(block: Block): Block | null {
  if (block.type === 'xiyou_collect_gifts') return block.getInputTargetBlock('GIFTS')
  if (block.type === 'xiyou_equip_regalia') return block.getInputTargetBlock('GEAR')
  return null
}

function containerInputIsCanonical(block: Block): boolean {
  const inputName = block.type === 'xiyou_collect_gifts' ? 'GIFTS' : block.type === 'xiyou_equip_regalia' ? 'GEAR' : null
  if (inputName === null) return true
  const connection = block.getInput(inputName)?.connection
  if (!connection) return false
  const target = connection.targetConnection
  if (target === null) return block.getInputTargetBlock(inputName) === null
  return (
    target === target.getSourceBlock().previousConnection
    && isReciprocal(connection, target)
    && block.getInputTargetBlock(inputName) === target.getSourceBlock()
  )
}

export function compileFourSeasRegaliaWorkspace(workspace: Workspace): FourSeasCompileResult {
  const blocks = workspace.getAllBlocks(false).sort(byId)
  if (blocks.length === 0) return failure('empty-workspace', null)

  const boundaryViolation = findFourSeasWorkspaceBoundaryViolation(
    blocks.map((block) => {
      const position = block.getRelativeToSurfaceXY()
      return { id: block.id, x: position.x, y: position.y }
    }),
  )
  if (boundaryViolation !== null) {
    return failure('workspace-boundary', boundaryViolation.sourceBlockId)
  }

  const unknown = blocks.find((block) => !isFourSeasBlockType(block.type))
  if (unknown) return failure('unknown-block', unknown.id)

  const topBlocks = workspace.getTopBlocks(false).sort(byId)
  const orphan = topBlocks.find((block) => isFourSeasChildBlockType(block.type))
  if (orphan) return failure('orphan-child', orphan.id)
  const mainRoots = topBlocks.filter((block) => isFourSeasTopBlockType(block.type))
  if (mainRoots.length > 1) return failure('multiple-main-chain', mainRoots[0].id)
  if (mainRoots.length !== 1) return failure('invalid-connection', blocks[0].id)

  const invalid = blocks.find(
    (block) => !hasCanonicalConnections(block) || !containerInputIsCanonical(block),
  )
  if (invalid) return failure('invalid-connection', invalid.id)

  const nestedContainer = blocks.find(
    (block) =>
      (block.type === 'xiyou_collect_gifts' || block.type === 'xiyou_equip_regalia')
      && block.getSurroundParent() != null,
  )
  if (nestedContainer) return failure('invalid-nesting', nestedContainer.id)

  const emptyContainer = blocks.find(
    (block) =>
      (block.type === 'xiyou_collect_gifts' || block.type === 'xiyou_equip_regalia')
      && containerChild(block) === null,
  )
  if (emptyContainer) return failure('missing-child-chain', emptyContainer.id)

  const trace: FourSeasInstruction[] = []
  const visited = new Set<string>()
  const appendChain = (head: Block, parentBlockId: string | null): FourSeasCompileResult | null => {
    let current: Block | null = head
    while (current !== null) {
      if (visited.has(current.id)) return failure('invalid-connection', current.id)
      if (!isFourSeasBlockType(current.type)) return failure('unknown-block', current.id)
      if (parentBlockId === null && !isFourSeasTopBlockType(current.type)) {
        return failure('orphan-child', current.id)
      }
      if (parentBlockId !== null && !isFourSeasChildBlockType(current.type)) {
        return failure('invalid-nesting', current.id)
      }
      if ((current.getSurroundParent()?.id ?? null) !== parentBlockId) {
        return failure('invalid-connection', current.id)
      }
      visited.add(current.id)
      trace.push({
        instructionId: `instruction:${current.id}`,
        sourceBlockId: current.id,
        parentBlockId,
        opcode: FOUR_SEAS_BLOCK_OPCODE[current.type],
      })
      const child = containerChild(current)
      if (child !== null) {
        const childFailure = appendChain(child, current.id)
        if (childFailure) return childFailure
      }
      current = current.getNextBlock()
    }
    return null
  }

  const traversalFailure = appendChain(mainRoots[0], null)
  if (traversalFailure) return traversalFailure
  if (visited.size !== blocks.length) {
    return failure('invalid-connection', blocks.find((block) => !visited.has(block.id))?.id ?? null)
  }
  return { ok: true, trace }
}
