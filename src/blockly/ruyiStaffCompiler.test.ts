import * as Blockly from 'blockly'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerDragonPalaceBlocks } from './dragonPalaceBlocks'
import {
  RUYI_BLOCK_OPCODE,
  registerRuyiStaffBlocks,
  type RuyiBlockType,
} from './ruyiStaffBlocks'
import { compileRuyiStaffWorkspace } from './ruyiStaffCompiler'

const expectedMap = {
  xiyou_inspect_weights: 'inspect_weights',
  xiyou_choose_sabre: 'choose_sabre',
  xiyou_choose_halberd: 'choose_halberd',
  xiyou_choose_ruyi_staff: 'choose_ruyi_staff',
  xiyou_shrink_ruyi_staff: 'shrink_ruyi_staff',
} as const

function connect(previous: Blockly.Block, next: Blockly.Block) {
  if (!previous.nextConnection || !next.previousConnection) {
    throw new Error('Expected statement connections')
  }
  previous.nextConnection.connect(next.previousConnection)
}

describe('compileRuyiStaffWorkspace', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    registerRuyiStaffBlocks()
    registerDragonPalaceBlocks()
    workspace = new Blockly.Workspace()
  })

  afterEach(() => workspace.dispose())

  it('exports the exact opcode map and registers true statement blocks idempotently', () => {
    expect(RUYI_BLOCK_OPCODE).toEqual(expectedMap)
    expect(() => registerRuyiStaffBlocks()).not.toThrow()

    for (const type of Object.keys(expectedMap) as RuyiBlockType[]) {
      const block = workspace.newBlock(type, `block:${type}`)
      expect(block.previousConnection).not.toBeNull()
      expect(block.nextConnection).not.toBeNull()
      expect(block.outputConnection).toBeNull()
    }
  })

  it('compiles the unique connected visible chain with stable source identities', () => {
    const inspect = workspace.newBlock('xiyou_inspect_weights', 'inspect')
    const choose = workspace.newBlock('xiyou_choose_ruyi_staff', 'choose')
    const shrink = workspace.newBlock('xiyou_shrink_ruyi_staff', 'shrink')
    connect(inspect, choose)
    connect(choose, shrink)

    expect(compileRuyiStaffWorkspace(workspace)).toEqual({
      ok: true,
      trace: [
        instruction('inspect', 'inspect_weights'),
        instruction('choose', 'choose_ruyi_staff'),
        instruction('shrink', 'shrink_ruyi_staff'),
      ],
    })
  })

  it.each([
    { name: 'empty workspaces', setup: () => undefined, code: 'empty-workspace', id: null },
    {
      name: 'multiple top-level chains',
      setup: () => {
        workspace.newBlock('xiyou_inspect_weights', 'a')
        workspace.newBlock('xiyou_choose_ruyi_staff', 'b')
      },
      code: 'multiple-top-level',
      id: 'a',
    },
    {
      name: 'a malformed statement block',
      setup: () => {
        const block = workspace.newBlock('xiyou_inspect_weights', 'malformed')
        block.setNextStatement(false)
      },
      code: 'invalid-connection',
      id: 'malformed',
    },
  ])('rejects $name without a partial trace', ({ setup, code, id }) => {
    setup()
    expect(compileRuyiStaffWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [{ code, sourceBlockId: id, concept: 'program-structure' }],
    })
  })

  it.each([
    ['an unknown statement block', 'xiyou_unknown_ruyi', 'unknown'],
    ['a real w1-m1 block', 'xiyou_enter_palace', 'dragon'],
  ])('rejects %s', (_name, type, id) => {
    if (type === 'xiyou_unknown_ruyi') {
      Blockly.defineBlocksWithJsonArray([
        { type, message0: 'unknown', previousStatement: null, nextStatement: null },
      ])
    }
    workspace.newBlock(type, id)

    expect(compileRuyiStaffWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [
        { code: 'unknown-block', sourceBlockId: id, concept: 'program-structure' },
      ],
    })
  })
})

function instruction(sourceBlockId: string, opcode: string) {
  return { instructionId: `instruction:${sourceBlockId}`, sourceBlockId, opcode }
}
