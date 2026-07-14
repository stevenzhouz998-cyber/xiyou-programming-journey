import * as Blockly from 'blockly'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { compileDragonPalaceWorkspace } from './compiler'
import { registerDragonPalaceBlocks } from './dragonPalaceBlocks'
import { appendActionBlock, deleteActionBlock, moveActionBlock } from './workspaceCommands'

function opcodes(workspace: Blockly.Workspace) {
  const result = compileDragonPalaceWorkspace(workspace)
  if (!result.ok) throw new Error('Expected a compilable workspace')
  return result.trace.map((instruction) => instruction.opcode)
}

describe('workspace commands', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    registerDragonPalaceBlocks()
    workspace = new Blockly.Workspace()
  })

  afterEach(() => workspace.dispose())

  it('appends real Blockly blocks to the unique main chain', () => {
    const enter = appendActionBlock(workspace, 'xiyou_enter_palace')
    const request = appendActionBlock(workspace, 'xiyou_request_weapon')
    const test = appendActionBlock(workspace, 'xiyou_test_weapon')

    expect(enter.getNextBlock()).toBe(request)
    expect(request.getNextBlock()).toBe(test)
    expect(workspace.getAllBlocks(false)).toHaveLength(3)
    expect(opcodes(workspace)).toEqual(['enter_palace', 'request_weapon', 'test_weapon'])
  })

  it('does not guess a chain when append sees multiple top-level blocks', () => {
    workspace.newBlock('xiyou_enter_palace', 'one')
    workspace.newBlock('xiyou_request_weapon', 'two')

    expect(() => appendActionBlock(workspace, 'xiyou_test_weapon')).toThrow(/multiple/i)
    expect(workspace.getAllBlocks(false).map((block) => block.id).sort()).toEqual(['one', 'two'])
  })

  it('moves a block through real connections and preserves every block id', () => {
    const enter = appendActionBlock(workspace, 'xiyou_enter_palace')
    const request = appendActionBlock(workspace, 'xiyou_request_weapon')
    const test = appendActionBlock(workspace, 'xiyou_test_weapon')
    const ids = [enter.id, request.id, test.id].sort()

    expect(moveActionBlock(workspace, request.id, 1)).toBe(true)
    expect(opcodes(workspace)).toEqual(['enter_palace', 'test_weapon', 'request_weapon'])
    expect(workspace.getAllBlocks(false).map((block) => block.id).sort()).toEqual(ids)

    expect(moveActionBlock(workspace, request.id, -1)).toBe(true)
    expect(opcodes(workspace)).toEqual(['enter_palace', 'request_weapon', 'test_weapon'])
  })

  it('returns false when a move would cross a chain boundary', () => {
    const enter = appendActionBlock(workspace, 'xiyou_enter_palace')
    const request = appendActionBlock(workspace, 'xiyou_request_weapon')

    expect(moveActionBlock(workspace, enter.id, -1)).toBe(false)
    expect(moveActionBlock(workspace, request.id, 1)).toBe(false)
    expect(opcodes(workspace)).toEqual(['enter_palace', 'request_weapon'])
  })

  it('deletes only the target block and reconnects its neighbours', () => {
    const enter = appendActionBlock(workspace, 'xiyou_enter_palace')
    const request = appendActionBlock(workspace, 'xiyou_request_weapon')
    const test = appendActionBlock(workspace, 'xiyou_test_weapon')

    expect(deleteActionBlock(workspace, request.id)).toBe(true)
    expect(enter.getNextBlock()).toBe(test)
    expect(workspace.getBlockById(request.id)).toBeNull()
    expect(workspace.getAllBlocks(false).map((block) => block.id).sort()).toEqual(
      [enter.id, test.id].sort(),
    )
    expect(opcodes(workspace)).toEqual(['enter_palace', 'test_weapon'])
  })
})
