import type { Block, Workspace } from 'blockly'
import type { BattleInstruction } from '../battle/types'
import { DRAGON_BLOCK_OPCODE, isDragonBlockType } from './dragonPalaceBlocks'

export type CompileDiagnosticCode =
  | 'unknown-block'
  | 'invalid-connection'
  | 'multiple-top-level'
  | 'empty-workspace'

export type CompileDiagnostic = {
  code: CompileDiagnosticCode
  sourceBlockId: string | null
  concept: 'program-structure'
}

export type CompileResult =
  | { ok: true; trace: BattleInstruction[] }
  | { ok: false; trace: []; diagnostics: CompileDiagnostic[] }

function failure(code: CompileDiagnosticCode, sourceBlockId: string | null): CompileResult {
  return {
    ok: false,
    trace: [],
    diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }],
  }
}

function byId(left: Block, right: Block): number {
  if (left.id < right.id) return -1
  if (left.id > right.id) return 1
  return 0
}

function hasCanonicalConnections(block: Block): boolean {
  const previous = block.previousConnection
  const next = block.nextConnection
  if (previous === null || next === null) return false

  const previousTarget = previous.targetConnection
  if (previousTarget !== null) {
    const previousBlock = previousTarget.getSourceBlock()
    if (previousTarget !== previousBlock.nextConnection) return false
    if (previousTarget.targetConnection !== previous) return false
    if (block.getPreviousBlock() !== previousBlock) return false
  } else if (block.getPreviousBlock() !== null) {
    return false
  }

  const nextTarget = next.targetConnection
  if (nextTarget !== null) {
    const nextBlock = nextTarget.getSourceBlock()
    if (nextTarget !== nextBlock.previousConnection) return false
    if (nextTarget.targetConnection !== next) return false
    if (block.getNextBlock() !== nextBlock) return false
  } else if (block.getNextBlock() !== null) {
    return false
  }

  return true
}

export function compileDragonPalaceWorkspace(workspace: Workspace): CompileResult {
  const blocks = workspace.getAllBlocks(false).sort(byId)

  const unknown = blocks.find((block) => !isDragonBlockType(block.type))
  if (unknown) return failure('unknown-block', unknown.id)

  const invalid = blocks.find((block) => !hasCanonicalConnections(block))
  if (invalid) return failure('invalid-connection', invalid.id)

  const topBlocks = workspace.getTopBlocks(false).sort(byId)
  if (topBlocks.length > 1) return failure('multiple-top-level', topBlocks[0].id)
  if (blocks.length === 0) return failure('empty-workspace', null)
  if (topBlocks.length !== 1) return failure('invalid-connection', blocks[0].id)

  const trace: BattleInstruction[] = []
  const visited = new Set<string>()
  let block: Block | null = topBlocks[0]

  while (block !== null) {
    if (visited.has(block.id)) return failure('invalid-connection', block.id)
    visited.add(block.id)

    if (!isDragonBlockType(block.type)) return failure('unknown-block', block.id)
    trace.push({
      instructionId: `instruction:${block.id}`,
      sourceBlockId: block.id,
      opcode: DRAGON_BLOCK_OPCODE[block.type],
    })
    block = block.getNextBlock()
  }

  if (visited.size !== blocks.length) {
    const unreachable = blocks.find((candidate) => !visited.has(candidate.id))
    return failure('invalid-connection', unreachable?.id ?? null)
  }

  return { ok: true, trace }
}
