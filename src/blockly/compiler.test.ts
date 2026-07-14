import * as Blockly from 'blockly'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DRAGON_BLOCK_OPCODE,
  registerDragonPalaceBlocks,
  type DragonBlockType,
} from './dragonPalaceBlocks'
import { compileDragonPalaceWorkspace } from './compiler'

const blockTypes = Object.keys(DRAGON_BLOCK_OPCODE) as DragonBlockType[]
const approvedLabels: Record<DragonBlockType, string> = {
  xiyou_enter_palace: '进入龙宫',
  xiyou_request_weapon: '请求兵器',
  xiyou_test_weapon: '试用兵器',
}

function addBlock(workspace: Blockly.Workspace, type: DragonBlockType, id: string) {
  return workspace.newBlock(type, id)
}

function connect(previous: Blockly.Block, next: Blockly.Block) {
  if (!previous.nextConnection || !next.previousConnection) {
    throw new Error('Expected statement connections')
  }
  previous.nextConnection.connect(next.previousConnection)
}

describe('compileDragonPalaceWorkspace', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    registerDragonPalaceBlocks()
    workspace = new Blockly.Workspace()
  })

  afterEach(() => workspace.dispose())

  it('registers fixed action blocks idempotently without an editable opcode field', () => {
    expect(() => registerDragonPalaceBlocks()).not.toThrow()
    expect(() => registerDragonPalaceBlocks()).not.toThrow()

    for (const type of blockTypes) {
      const block = addBlock(workspace, type, `block:${type}`)
      expect(block.previousConnection).not.toBeNull()
      expect(block.nextConnection).not.toBeNull()
      expect(block.getField('OPCODE')).toBeNull()
      expect(block.toString()).toBe(approvedLabels[type])
    }
  })

  it('compiles the actual connected block chain with stable source identities', () => {
    const enter = addBlock(workspace, 'xiyou_enter_palace', 'enter-1')
    const request = addBlock(workspace, 'xiyou_request_weapon', 'request-1')
    const test = addBlock(workspace, 'xiyou_test_weapon', 'test-1')
    connect(enter, request)
    connect(request, test)

    expect(compileDragonPalaceWorkspace(workspace)).toEqual({
      ok: true,
      trace: [
        {
          instructionId: 'instruction:enter-1',
          sourceBlockId: 'enter-1',
          opcode: 'enter_palace',
        },
        {
          instructionId: 'instruction:request-1',
          sourceBlockId: 'request-1',
          opcode: 'request_weapon',
        },
        {
          instructionId: 'instruction:test-1',
          sourceBlockId: 'test-1',
          opcode: 'test_weapon',
        },
      ],
    })
  })

  it('returns empty-workspace without an executable partial trace', () => {
    expect(compileDragonPalaceWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [
        {
          code: 'empty-workspace',
          sourceBlockId: null,
          concept: 'program-structure',
        },
      ],
    })
  })

  it('reports multiple top-level chains, including an isolated known block', () => {
    addBlock(workspace, 'xiyou_enter_palace', 'enter')
    addBlock(workspace, 'xiyou_request_weapon', 'isolated')

    expect(compileDragonPalaceWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [
        {
          code: 'multiple-top-level',
          sourceBlockId: 'enter',
          concept: 'program-structure',
        },
      ],
    })
  })

  it('prioritizes an unknown block over multiple top-level diagnostics', () => {
    Blockly.defineBlocksWithJsonArray([
      {
        type: 'xiyou_unknown_action',
        message0: '未知动作',
        previousStatement: null,
        nextStatement: null,
      },
    ])
    addBlock(workspace, 'xiyou_enter_palace', 'known')
    workspace.newBlock('xiyou_unknown_action', 'unknown')

    expect(compileDragonPalaceWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [
        {
          code: 'unknown-block',
          sourceBlockId: 'unknown',
          concept: 'program-structure',
        },
      ],
    })
  })

  it('reports a known block missing its canonical statement connection', () => {
    const malformed = addBlock(workspace, 'xiyou_enter_palace', 'malformed')
    malformed.setNextStatement(false)

    expect(compileDragonPalaceWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [
        {
          code: 'invalid-connection',
          sourceBlockId: 'malformed',
          concept: 'program-structure',
        },
      ],
    })
  })
})
