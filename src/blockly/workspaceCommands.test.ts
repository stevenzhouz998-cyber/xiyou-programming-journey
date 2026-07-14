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

function workspaceState(workspace: Blockly.Workspace) {
  return {
    blocks: workspace
      .getAllBlocks(false)
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((block) => ({
        id: block.id,
        type: block.type,
        previousId: block.getPreviousBlock()?.id ?? null,
        nextId: block.getNextBlock()?.id ?? null,
        position: block.getRelativeToSurfaceXY(),
      })),
    compile: compileDragonPalaceWorkspace(workspace),
  }
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

  it('does not alter a malformed chain when append throws', () => {
    appendActionBlock(workspace, 'xiyou_enter_palace')
    const malformedTail = appendActionBlock(workspace, 'xiyou_request_weapon')
    malformedTail.setNextStatement(false)
    const before = workspaceState(workspace)

    expect(() => appendActionBlock(workspace, 'xiyou_test_weapon')).toThrow()

    expect(workspaceState(workspace)).toEqual(before)
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

  it('preflights every endpoint before moving and leaves malformed chains untouched', () => {
    appendActionBlock(workspace, 'xiyou_enter_palace')
    appendActionBlock(workspace, 'xiyou_request_weapon')
    const malformedTail = appendActionBlock(workspace, 'xiyou_test_weapon')
    malformedTail.setNextStatement(false)
    const before = workspaceState(workspace)

    expect(() => moveActionBlock(workspace, malformedTail.id, -1)).toThrow()

    expect(workspaceState(workspace)).toEqual(before)
  })

  it('rolls back the original order when reconnecting a move throws', () => {
    const enter = appendActionBlock(workspace, 'xiyou_enter_palace')
    const request = appendActionBlock(workspace, 'xiyou_request_weapon')
    appendActionBlock(workspace, 'xiyou_test_weapon')
    const before = workspaceState(workspace)
    const connection = enter.nextConnection
    if (!connection) throw new Error('Expected next connection')
    const realConnect = connection.connect.bind(connection)
    let shouldFail = true
    connection.connect = ((other: Blockly.Connection) => {
      if (shouldFail) {
        shouldFail = false
        throw new Error('synthetic move reconnect failure')
      }
      return realConnect(other)
    }) as typeof connection.connect

    expect(() => moveActionBlock(workspace, request.id, 1)).toThrow(
      /synthetic move reconnect failure/,
    )

    expect(workspaceState(workspace)).toEqual(before)
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

  it('deletes the head block without deleting its successor', () => {
    const head = appendActionBlock(workspace, 'xiyou_enter_palace')
    const tail = appendActionBlock(workspace, 'xiyou_request_weapon')

    expect(deleteActionBlock(workspace, head.id)).toBe(true)
    expect(workspace.getAllBlocks(false)).toEqual([tail])
    expect(tail.getPreviousBlock()).toBeNull()
  })

  it('deletes the tail block without deleting its predecessor', () => {
    const head = appendActionBlock(workspace, 'xiyou_enter_palace')
    const tail = appendActionBlock(workspace, 'xiyou_request_weapon')

    expect(deleteActionBlock(workspace, tail.id)).toBe(true)
    expect(workspace.getAllBlocks(false)).toEqual([head])
    expect(head.getNextBlock()).toBeNull()
  })

  it('deletes the only block and returns false for a missing id', () => {
    const only = appendActionBlock(workspace, 'xiyou_enter_palace')

    expect(deleteActionBlock(workspace, 'missing')).toBe(false)
    expect(deleteActionBlock(workspace, only.id)).toBe(true)
    expect(workspace.getAllBlocks(false)).toEqual([])
  })

  it('does not alter a malformed chain when delete throws', () => {
    appendActionBlock(workspace, 'xiyou_enter_palace')
    const malformedTail = appendActionBlock(workspace, 'xiyou_request_weapon')
    malformedTail.setNextStatement(false)
    const before = workspaceState(workspace)

    expect(() => deleteActionBlock(workspace, malformedTail.id)).toThrow()

    expect(workspaceState(workspace)).toEqual(before)
  })

  it('rolls back the original chain when reconnecting a delete throws', () => {
    const enter = appendActionBlock(workspace, 'xiyou_enter_palace')
    const request = appendActionBlock(workspace, 'xiyou_request_weapon')
    appendActionBlock(workspace, 'xiyou_test_weapon')
    const before = workspaceState(workspace)
    const connection = enter.nextConnection
    if (!connection) throw new Error('Expected next connection')
    const realConnect = connection.connect.bind(connection)
    let shouldFail = true
    connection.connect = ((other: Blockly.Connection) => {
      if (shouldFail) {
        shouldFail = false
        throw new Error('synthetic delete reconnect failure')
      }
      return realConnect(other)
    }) as typeof connection.connect

    expect(() => deleteActionBlock(workspace, request.id)).toThrow(
      /synthetic delete reconnect failure/,
    )

    expect(workspaceState(workspace)).toEqual(before)
  })
})

describe('WorkspaceSvg commands', () => {
  it('initializes and renders an appended block on the real block canvas', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const workspace = Blockly.inject(host, { sounds: false })

    try {
      const block = appendActionBlock(workspace, 'xiyou_enter_palace') as Blockly.BlockSvg
      const root = block.getSvgRoot()

      expect(root.isConnected).toBe(true)
      expect(workspace.getBlockCanvas()?.contains(root)).toBe(true)
      expect(root.querySelector('.blocklyPath')).not.toBeNull()
    } finally {
      workspace.dispose()
      host.remove()
    }
  })

  it('disposes a partially initialized appended block when connection throws', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const workspace = Blockly.inject(host, { sounds: false })

    try {
      const tail = appendActionBlock(workspace, 'xiyou_enter_palace') as Blockly.BlockSvg
      const connection = tail.nextConnection
      if (!connection) throw new Error('Expected next connection')
      connection.connect = (() => {
        throw new Error('synthetic append connection failure')
      }) as typeof connection.connect

      expect(() => appendActionBlock(workspace, 'xiyou_request_weapon')).toThrow(
        /synthetic append connection failure/,
      )

      const blocks = workspace.getAllBlocks(false) as Blockly.BlockSvg[]
      const canvas = workspace.getBlockCanvas()
      expect(blocks).toEqual([tail])
      expect(Array.from(canvas?.children ?? [])).toEqual([tail.getSvgRoot()])
    } finally {
      workspace.dispose()
      host.remove()
    }
  })
})
