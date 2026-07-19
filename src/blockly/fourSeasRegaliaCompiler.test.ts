import * as Blockly from 'blockly'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerDragonPalaceBlocks } from './dragonPalaceBlocks'
import {
  FOUR_SEAS_BLOCK_OPCODE,
  registerFourSeasRegaliaBlocks,
  type FourSeasBlockType,
} from './fourSeasRegaliaBlocks'
import { compileFourSeasRegaliaWorkspace } from './fourSeasRegaliaCompiler'
import { registerRuyiStaffBlocks } from './ruyiStaffBlocks'

const expectedMap = {
  xiyou_request_regalia: 'request_regalia',
  xiyou_collect_gifts: 'collect_gifts',
  xiyou_receive_cloud_boots: 'receive_cloud_boots',
  xiyou_receive_golden_armor: 'receive_golden_armor',
  xiyou_receive_purple_crown: 'receive_purple_crown',
  xiyou_equip_regalia: 'equip_regalia',
  xiyou_wear_crown: 'wear_crown',
  xiyou_wear_armor: 'wear_armor',
  xiyou_wear_boots: 'wear_boots',
  xiyou_verify_regalia: 'verify_regalia',
} as const

function connect(previous: Blockly.Block, next: Blockly.Block): void {
  if (!previous.nextConnection || !next.previousConnection) throw new Error('missing chain connection')
  previous.nextConnection.connect(next.previousConnection)
}

function connectInput(container: Blockly.Block, inputName: 'GIFTS' | 'GEAR', child: Blockly.Block): void {
  const input = container.getInput(inputName)?.connection
  if (!input || !child.previousConnection) throw new Error(`missing ${inputName} connection`)
  input.connect(child.previousConnection)
}

function buildValidWorkspace(workspace: Blockly.Workspace) {
  const request = workspace.newBlock('xiyou_request_regalia', 'request')
  const collect = workspace.newBlock('xiyou_collect_gifts', 'collect')
  const bootsGift = workspace.newBlock('xiyou_receive_cloud_boots', 'boots-gift')
  const armorGift = workspace.newBlock('xiyou_receive_golden_armor', 'armor-gift')
  const crownGift = workspace.newBlock('xiyou_receive_purple_crown', 'crown-gift')
  const equip = workspace.newBlock('xiyou_equip_regalia', 'equip')
  const crownWear = workspace.newBlock('xiyou_wear_crown', 'crown-wear')
  const armorWear = workspace.newBlock('xiyou_wear_armor', 'armor-wear')
  const bootsWear = workspace.newBlock('xiyou_wear_boots', 'boots-wear')
  const verify = workspace.newBlock('xiyou_verify_regalia', 'verify')
  connect(request, collect)
  connect(collect, equip)
  connect(equip, verify)
  connectInput(collect, 'GIFTS', bootsGift)
  connect(bootsGift, armorGift)
  connect(armorGift, crownGift)
  connectInput(equip, 'GEAR', crownWear)
  connect(crownWear, armorWear)
  connect(armorWear, bootsWear)
  return { request, collect, bootsGift, armorGift, crownGift, equip, crownWear, armorWear, bootsWear, verify }
}

function expectedInstruction(
  sourceBlockId: string,
  opcode: string,
  parentBlockId: string | null,
) {
  return { instructionId: `instruction:${sourceBlockId}`, sourceBlockId, parentBlockId, opcode }
}

function buildTopChain(
  workspace: Blockly.Workspace,
  count: number,
  idForIndex: (index: number) => string = (index) => `block-${index.toString().padStart(3, '0')}`,
): Blockly.Block[] {
  const blocks = Array.from({ length: count }, (_, index) =>
    workspace.newBlock('xiyou_request_regalia', idForIndex(index)))
  for (let index = 1; index < blocks.length; index += 1) connect(blocks[index - 1], blocks[index])
  return blocks
}

describe('compileFourSeasRegaliaWorkspace', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    registerFourSeasRegaliaBlocks()
    registerDragonPalaceBlocks()
    registerRuyiStaffBlocks()
    workspace = new Blockly.Workspace()
  })

  afterEach(() => workspace.dispose())

  it('registers the exact catalogue with typed top and generic child statement connections', () => {
    expect(FOUR_SEAS_BLOCK_OPCODE).toEqual(expectedMap)
    expect(() => registerFourSeasRegaliaBlocks()).not.toThrow()

    for (const type of Object.keys(expectedMap) as FourSeasBlockType[]) {
      const block = workspace.newBlock(type, `block:${type}`)
      const isChild = type.includes('_receive_') || type.includes('_wear_')
      expect(block.previousConnection?.getCheck()).toEqual([isChild ? 'FourSeasSubtask' : 'FourSeasTop'])
      expect(block.nextConnection?.getCheck()).toEqual([isChild ? 'FourSeasSubtask' : 'FourSeasTop'])
      expect(block.outputConnection).toBeNull()
    }
    expect(workspace.newBlock('xiyou_collect_gifts').getInput('GIFTS')?.connection?.getCheck()).toEqual([
      'FourSeasSubtask',
    ])
    expect(workspace.newBlock('xiyou_equip_regalia').getInput('GEAR')?.connection?.getCheck()).toEqual([
      'FourSeasSubtask',
    ])
  })

  it('compiles a real nested workspace in main-chain preorder with exact parent identities', () => {
    buildValidWorkspace(workspace)

    expect(compileFourSeasRegaliaWorkspace(workspace)).toEqual({
      ok: true,
      trace: [
        expectedInstruction('request', 'request_regalia', null),
        expectedInstruction('collect', 'collect_gifts', null),
        expectedInstruction('boots-gift', 'receive_cloud_boots', 'collect'),
        expectedInstruction('armor-gift', 'receive_golden_armor', 'collect'),
        expectedInstruction('crown-gift', 'receive_purple_crown', 'collect'),
        expectedInstruction('equip', 'equip_regalia', null),
        expectedInstruction('crown-wear', 'wear_crown', 'equip'),
        expectedInstruction('armor-wear', 'wear_armor', 'equip'),
        expectedInstruction('boots-wear', 'wear_boots', 'equip'),
        expectedInstruction('verify', 'verify_regalia', null),
      ],
    })
  })

  it('accepts exactly 500 blocks and rejects the first block beyond the formal boundary', () => {
    buildTopChain(workspace, 500)
    const accepted = compileFourSeasRegaliaWorkspace(workspace)
    expect(accepted.ok && accepted.trace).toHaveLength(500)

    workspace.clear()
    buildTopChain(workspace, 501)
    const rejected = compileFourSeasRegaliaWorkspace(workspace)
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) {
      expect(rejected).toEqual({
        ok: false,
        trace: [],
        diagnostics: [
          { code: 'workspace-boundary', sourceBlockId: 'block-500', concept: 'program-structure' },
        ],
      })
    }
  })

  it('accepts a 256-character block id and rejects a longer source identity', () => {
    workspace.newBlock('xiyou_request_regalia', 'a'.repeat(256))
    expect(compileFourSeasRegaliaWorkspace(workspace).ok).toBe(true)

    workspace.clear()
    const overlongId = 'b'.repeat(257)
    workspace.newBlock('xiyou_request_regalia', overlongId)
    const rejected = compileFourSeasRegaliaWorkspace(workspace)
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) {
      expect(rejected).toEqual({
        ok: false,
        trace: [],
        diagnostics: [
          { code: 'workspace-boundary', sourceBlockId: overlongId, concept: 'program-structure' },
        ],
      })
    }
  })

  it.each([
    { name: 'the positive safe coordinate boundary', coordinate: Number.MAX_SAFE_INTEGER, accepted: true },
    { name: 'the negative safe coordinate boundary', coordinate: -Number.MAX_SAFE_INTEGER, accepted: true },
    { name: 'a coordinate above the safe boundary', coordinate: Number.MAX_SAFE_INTEGER + 1, accepted: false },
    { name: 'positive infinity', coordinate: Infinity, accepted: false },
    { name: 'NaN', coordinate: Number.NaN, accepted: false },
  ])('$name is validated before trace generation', ({ coordinate, accepted }) => {
    const block = workspace.newBlock('xiyou_request_regalia', 'coordinate-block')
    block.moveBy(coordinate, 0)
    const result = compileFourSeasRegaliaWorkspace(workspace)
    if (accepted) {
      expect(result.ok).toBe(true)
    } else {
      expect(result).toEqual({
        ok: false,
        trace: [],
        diagnostics: [
          { code: 'workspace-boundary', sourceBlockId: 'coordinate-block', concept: 'program-structure' },
        ],
      })
    }
  })

  it('reflects real child reordering and wrong-container placement instead of correcting it', () => {
    const blocks = buildValidWorkspace(workspace)
    blocks.bootsGift.previousConnection?.disconnect()
    blocks.bootsGift.nextConnection?.disconnect()
    blocks.armorGift.nextConnection?.disconnect()
    connectInput(blocks.collect, 'GIFTS', blocks.armorGift)
    connect(blocks.armorGift, blocks.bootsGift)
    connect(blocks.bootsGift, blocks.crownGift)

    const reordered = compileFourSeasRegaliaWorkspace(workspace)
    expect(reordered.ok && reordered.trace.slice(2, 5).map((item) => item.opcode)).toEqual([
      'receive_golden_armor',
      'receive_cloud_boots',
      'receive_purple_crown',
    ])

    blocks.crownGift.previousConnection?.disconnect()
    blocks.crownWear.previousConnection?.disconnect()
    connect(blocks.bootsGift, blocks.crownWear)
    connectInput(blocks.equip, 'GEAR', blocks.crownGift)
    const misplaced = compileFourSeasRegaliaWorkspace(workspace)
    expect(misplaced.ok && misplaced.trace.find((item) => item.sourceBlockId === 'crown-wear')?.parentBlockId).toBe('collect')
    expect(misplaced.ok && misplaced.trace.find((item) => item.sourceBlockId === 'crown-gift')?.parentBlockId).toBe('equip')
  })

  it.each([
    {
      name: 'an empty workspace',
      setup: () => undefined,
      code: 'empty-workspace',
      sourceBlockId: null,
    },
    {
      name: 'multiple main chains',
      setup: () => {
        workspace.newBlock('xiyou_request_regalia', 'a')
        workspace.newBlock('xiyou_verify_regalia', 'b')
      },
      code: 'multiple-main-chain',
      sourceBlockId: 'a',
    },
    {
      name: 'a collect container without children',
      setup: () => workspace.newBlock('xiyou_collect_gifts', 'empty-collect'),
      code: 'missing-child-chain',
      sourceBlockId: 'empty-collect',
    },
    {
      name: 'an equip container without children',
      setup: () => workspace.newBlock('xiyou_equip_regalia', 'empty-equip'),
      code: 'missing-child-chain',
      sourceBlockId: 'empty-equip',
    },
    {
      name: 'an orphan child',
      setup: () => workspace.newBlock('xiyou_wear_crown', 'orphan'),
      code: 'orphan-child',
      sourceBlockId: 'orphan',
    },
  ])('rejects $name without a partial trace', ({ setup, code, sourceBlockId }) => {
    setup()
    expect(compileFourSeasRegaliaWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [{ code, sourceBlockId, concept: 'program-structure' }],
    })
  })

  it.each([
    ['an unknown block', 'xiyou_unknown_four_seas', 'unknown'],
    ['a w1-m1 block', 'xiyou_enter_palace', 'dragon'],
    ['a w1-m2 block', 'xiyou_inspect_weights', 'ruyi'],
  ])('rejects %s', (_name, type, id) => {
    if (type === 'xiyou_unknown_four_seas') {
      Blockly.defineBlocksWithJsonArray([
        { type, message0: 'unknown', previousStatement: null, nextStatement: null },
      ])
    }
    workspace.newBlock(type, id)
    expect(compileFourSeasRegaliaWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [{ code: 'unknown-block', sourceBlockId: id, concept: 'program-structure' }],
    })
  })

  it('rejects a forged non-canonical bidirectional connection', () => {
    const blocks = buildValidWorkspace(workspace)
    blocks.request.getNextBlock = (() => blocks.equip) as typeof blocks.request.getNextBlock

    expect(compileFourSeasRegaliaWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [{ code: 'invalid-connection', sourceBlockId: 'request', concept: 'program-structure' }],
    })
  })

  it('rejects a container nested inside a statement input even when checks are maliciously loosened', () => {
    const collect = workspace.newBlock('xiyou_collect_gifts', 'outer')
    const nested = workspace.newBlock('xiyou_equip_regalia', 'nested')
    collect.getInput('GIFTS')?.connection?.setCheck(null)
    nested.previousConnection?.setCheck(null)
    connectInput(collect, 'GIFTS', nested)

    expect(compileFourSeasRegaliaWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [{ code: 'invalid-nesting', sourceBlockId: 'nested', concept: 'program-structure' }],
    })
  })

  it('rejects a forged traversal cycle deterministically', () => {
    const blocks = buildValidWorkspace(workspace)
    blocks.armorGift.getNextBlock = (() => blocks.bootsGift) as typeof blocks.armorGift.getNextBlock

    expect(compileFourSeasRegaliaWorkspace(workspace)).toEqual({
      ok: false,
      trace: [],
      diagnostics: [{ code: 'invalid-connection', sourceBlockId: 'armor-gift', concept: 'program-structure' }],
    })
  })
})
