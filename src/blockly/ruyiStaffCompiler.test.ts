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

const expectedLabels: Record<RuyiBlockType, string> = {
  xiyou_inspect_weights: '查看三件兵器重量',
  xiyou_choose_sabre: '选择大捍刀（3600斤）',
  xiyou_choose_halberd: '选择方天画戟（7200斤）',
  xiyou_choose_ruyi_staff: '选择定海神针（13500斤）',
  xiyou_shrink_ruyi_staff: '缩小定海神针',
}

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
      expect(block.toString()).toBe(expectedLabels[type])
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

  it('uses code-point block id order for deterministic diagnostics', () => {
    workspace.newBlock('xiyou_inspect_weights', 'a-lowercase')
    workspace.newBlock('xiyou_choose_ruyi_staff', 'B-uppercase')

    expect(compileRuyiStaffWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [
        {
          code: 'multiple-top-level',
          sourceBlockId: 'B-uppercase',
          concept: 'program-structure',
        },
      ],
    })
  })

  it('compiles the reordered real connection chain on the next run', () => {
    const inspect = workspace.newBlock('xiyou_inspect_weights', 'inspect')
    const choose = workspace.newBlock('xiyou_choose_ruyi_staff', 'choose')
    const shrink = workspace.newBlock('xiyou_shrink_ruyi_staff', 'shrink')
    connect(inspect, choose)
    connect(choose, shrink)
    inspect.nextConnection?.disconnect()
    choose.nextConnection?.disconnect()
    connect(inspect, shrink)
    connect(shrink, choose)

    const result = compileRuyiStaffWorkspace(workspace)
    expect(result.ok && result.trace.map((item) => item.opcode)).toEqual([
      'inspect_weights',
      'shrink_ruyi_staff',
      'choose_ruyi_staff',
    ])
  })

  it('removes a disposed real block subtree from the next compiled trace', () => {
    const inspect = workspace.newBlock('xiyou_inspect_weights', 'inspect')
    const choose = workspace.newBlock('xiyou_choose_ruyi_staff', 'choose')
    const shrink = workspace.newBlock('xiyou_shrink_ruyi_staff', 'shrink')
    connect(inspect, choose)
    connect(choose, shrink)

    choose.dispose(false)

    expect(compileRuyiStaffWorkspace(workspace)).toEqual({
      ok: true,
      trace: [
        instruction('inspect', 'inspect_weights'),
      ],
    })
  })

  it('reports multiple top-level structure after a real chain disconnect', () => {
    const inspect = workspace.newBlock('xiyou_inspect_weights', 'inspect')
    const choose = workspace.newBlock('xiyou_choose_ruyi_staff', 'choose')
    const shrink = workspace.newBlock('xiyou_shrink_ruyi_staff', 'shrink')
    connect(inspect, choose)
    connect(choose, shrink)

    choose.previousConnection?.disconnect()

    expect(compileRuyiStaffWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [
        {
          code: 'multiple-top-level',
          sourceBlockId: 'choose',
          concept: 'program-structure',
        },
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
