import * as Blockly from 'blockly'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runFourSeasRegalia } from '../battle/fourSeasRegalia'
import { registerDragonPalaceBlocks } from './dragonPalaceBlocks'
import { registerFourSeasRegaliaBlocks } from './fourSeasRegaliaBlocks'
import { compileFourSeasRegaliaWorkspace } from './fourSeasRegaliaCompiler'
import {
  loadFourSeasWorkspaceDraft,
  saveFourSeasWorkspaceDraft,
  type FourSeasWorkspaceDraftV1,
} from './fourSeasRegaliaDraft'
import { registerRuyiStaffBlocks } from './ruyiStaffBlocks'

const validDraft: FourSeasWorkspaceDraftV1 = {
  version: 1,
  blocks: [
    { id: 'armor-gift', type: 'xiyou_receive_golden_armor', nextId: 'crown-gift', parentBlockId: 'collect', x: 31.5, y: 62.25 },
    { id: 'armor-wear', type: 'xiyou_wear_armor', nextId: 'boots-wear', parentBlockId: 'equip', x: 44.5, y: 78.25 },
    { id: 'boots-gift', type: 'xiyou_receive_cloud_boots', nextId: 'armor-gift', parentBlockId: 'collect', x: 21.5, y: 42.25 },
    { id: 'boots-wear', type: 'xiyou_wear_boots', nextId: null, parentBlockId: 'equip', x: 54.5, y: 98.25 },
    { id: 'collect', type: 'xiyou_collect_gifts', nextId: 'equip', parentBlockId: null, x: 10.5, y: 20.25 },
    { id: 'crown-gift', type: 'xiyou_receive_purple_crown', nextId: null, parentBlockId: 'collect', x: 41.5, y: 82.25 },
    { id: 'crown-wear', type: 'xiyou_wear_crown', nextId: 'armor-wear', parentBlockId: 'equip', x: 34.5, y: 58.25 },
    { id: 'equip', type: 'xiyou_equip_regalia', nextId: 'verify', parentBlockId: null, x: 20.5, y: 40.25 },
    { id: 'request', type: 'xiyou_request_regalia', nextId: 'collect', parentBlockId: null, x: -12.5, y: -3.25 },
    { id: 'verify', type: 'xiyou_verify_regalia', nextId: null, parentBlockId: null, x: 30.5, y: 60.25 },
  ],
}

function oneBlockDraft(
  overrides: Partial<FourSeasWorkspaceDraftV1['blocks'][number]> = {},
): FourSeasWorkspaceDraftV1 {
  return {
    version: 1,
    blocks: [
      {
        id: 'request',
        type: 'xiyou_request_regalia',
        nextId: null,
        parentBlockId: null,
        x: 0,
        y: 0,
        ...overrides,
      },
    ],
  }
}

function connect(previous: Blockly.Block, next: Blockly.Block): void {
  if (!previous.nextConnection || !next.previousConnection) throw new Error('missing connection')
  previous.nextConnection.connect(next.previousConnection)
}

function connectInput(
  container: Blockly.Block,
  inputName: 'GIFTS' | 'GEAR',
  child: Blockly.Block,
): void {
  const input = container.getInput(inputName)?.connection
  if (!input || !child.previousConnection) throw new Error(`missing ${inputName} connection`)
  input.connect(child.previousConnection)
}

function buildWorkspaceWithMisplacedChild(
  workspace: Blockly.Workspace,
  placement: 'receive-under-equip' | 'wear-under-collect',
): string {
  const request = workspace.newBlock('xiyou_request_regalia', 'request')
  const collect = workspace.newBlock('xiyou_collect_gifts', 'collect')
  const boots = workspace.newBlock('xiyou_receive_cloud_boots', 'boots')
  const armor = workspace.newBlock('xiyou_receive_golden_armor', 'armor')
  const crown = workspace.newBlock('xiyou_receive_purple_crown', 'crown')
  const equip = workspace.newBlock('xiyou_equip_regalia', 'equip')
  const verify = workspace.newBlock('xiyou_verify_regalia', 'verify')
  connect(request, collect)
  connect(collect, equip)
  connect(equip, verify)
  connectInput(collect, 'GIFTS', boots)
  connect(boots, armor)
  connect(armor, crown)

  if (placement === 'receive-under-equip') {
    const misplaced = workspace.newBlock('xiyou_receive_cloud_boots', 'receive-in-equip')
    connectInput(equip, 'GEAR', misplaced)
    return misplaced.id
  }

  const misplaced = workspace.newBlock('xiyou_wear_crown', 'wear-in-collect')
  const equipChild = workspace.newBlock('xiyou_wear_crown', 'equip-child')
  connect(crown, misplaced)
  connectInput(equip, 'GEAR', equipChild)
  return misplaced.id
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

describe('FourSeasWorkspaceDraftV1', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    registerFourSeasRegaliaBlocks()
    registerDragonPalaceBlocks()
    registerRuyiStaffBlocks()
    workspace = new Blockly.Workspace()
  })

  afterEach(() => workspace.dispose())

  it('round trips stable ids, top links, child heads, scopes, coordinates, and compiled trace', () => {
    loadFourSeasWorkspaceDraft(workspace, validDraft)
    expect(workspace.getBlockById('collect')?.getInputTargetBlock('GIFTS')?.id).toBe('boots-gift')
    expect(workspace.getBlockById('equip')?.getInputTargetBlock('GEAR')?.id).toBe('crown-wear')

    const saved = saveFourSeasWorkspaceDraft(workspace)
    const restored = new Blockly.Workspace()
    try {
      loadFourSeasWorkspaceDraft(restored, saved)
      expect(saveFourSeasWorkspaceDraft(restored)).toEqual(validDraft)
      expect(compileFourSeasRegaliaWorkspace(restored)).toEqual(compileFourSeasRegaliaWorkspace(workspace))
    } finally {
      restored.dispose()
    }
  })

  it('saves in deterministic code-point id order without changing coordinates', () => {
    loadFourSeasWorkspaceDraft(workspace, validDraft)
    const saved = saveFourSeasWorkspaceDraft(workspace)

    expect(saved.blocks.map((block) => block.id)).toEqual([...saved.blocks.map((block) => block.id)].sort())
    expect(saved.blocks.find((block) => block.id === 'request')).toMatchObject({ x: -12.5, y: -3.25 })
  })

  it.each([
    { placement: 'receive-under-equip', misplacedId: 'receive-in-equip', parentBlockId: 'equip' },
    { placement: 'wear-under-collect', misplacedId: 'wear-in-collect', parentBlockId: 'collect' },
  ] as const)(
    'round trips $placement and leaves the semantic rejection to the runner',
    ({ placement, misplacedId, parentBlockId }) => {
      buildWorkspaceWithMisplacedChild(workspace, placement)
      const saved = saveFourSeasWorkspaceDraft(workspace)
      const restored = new Blockly.Workspace()
      try {
        loadFourSeasWorkspaceDraft(restored, saved)
        const compiled = compileFourSeasRegaliaWorkspace(restored)
        expect(compiled.ok).toBe(true)
        if (!compiled.ok) throw new Error('expected the structurally valid workspace to compile')
        expect(compiled.trace.find((item) => item.sourceBlockId === misplacedId)).toMatchObject({
          sourceBlockId: misplacedId,
          parentBlockId,
        })

        const result = runFourSeasRegalia(compiled.trace)
        expect(result.diagnostic).toMatchObject({
          type: 'instruction-rejected',
          concept: 'container-scope',
          sourceBlockId: misplacedId,
          parentBlockId,
        })
      } finally {
        restored.dispose()
      }
    },
  )

  it('accepts the formal 500-block workspace boundary', () => {
    buildTopChain(workspace, 500)
    expect(saveFourSeasWorkspaceDraft(workspace).blocks).toHaveLength(500)
  })

  it('accepts 256-character ids and rejects longer ids', () => {
    workspace.newBlock('xiyou_request_regalia', 'a'.repeat(256))
    expect(saveFourSeasWorkspaceDraft(workspace).blocks[0].id).toHaveLength(256)

    workspace.clear()
    workspace.newBlock('xiyou_request_regalia', 'b'.repeat(257))
    expect(() => saveFourSeasWorkspaceDraft(workspace)).toThrow()
  })

  it.each([
    { name: 'the positive safe coordinate boundary', coordinate: Number.MAX_SAFE_INTEGER, accepted: true },
    { name: 'the negative safe coordinate boundary', coordinate: -Number.MAX_SAFE_INTEGER, accepted: true },
    { name: 'a coordinate above the safe boundary', coordinate: Number.MAX_SAFE_INTEGER + 1, accepted: false },
    { name: 'positive infinity', coordinate: Infinity, accepted: false },
    { name: 'NaN', coordinate: Number.NaN, accepted: false },
  ])('$name is consistently handled by draft save', ({ coordinate, accepted }) => {
    const block = workspace.newBlock('xiyou_request_regalia', 'coordinate-block')
    block.moveBy(coordinate, 0)
    if (accepted) {
      expect(saveFourSeasWorkspaceDraft(workspace).blocks[0].x).toBe(coordinate)
    } else {
      expect(() => saveFourSeasWorkspaceDraft(workspace)).toThrow()
    }
  })

  it.each([
    {
      name: 'duplicate ids',
      draft: {
        version: 1,
        blocks: [
          oneBlockDraft().blocks[0],
          { ...oneBlockDraft().blocks[0], type: 'xiyou_verify_regalia' },
        ],
      },
    },
    { name: 'unknown nextId', draft: oneBlockDraft({ nextId: 'missing' }) },
    {
      name: 'unknown parent',
      draft: oneBlockDraft({
        type: 'xiyou_receive_cloud_boots',
        parentBlockId: 'missing',
      }),
    },
    {
      name: 'wrong-type parent',
      draft: {
        version: 1,
        blocks: [
          { id: 'request', type: 'xiyou_request_regalia', nextId: null, parentBlockId: null, x: 0, y: 0 },
          { id: 'gift', type: 'xiyou_receive_cloud_boots', nextId: null, parentBlockId: 'request', x: 0, y: 20 },
        ],
      },
    },
    {
      name: 'multiple child heads in one scope',
      draft: {
        version: 1,
        blocks: [
          { id: 'collect', type: 'xiyou_collect_gifts', nextId: null, parentBlockId: null, x: 0, y: 0 },
          { id: 'gift-a', type: 'xiyou_receive_cloud_boots', nextId: null, parentBlockId: 'collect', x: 0, y: 20 },
          { id: 'gift-b', type: 'xiyou_receive_golden_armor', nextId: null, parentBlockId: 'collect', x: 0, y: 40 },
        ],
      },
    },
    {
      name: 'cross-scope next link',
      draft: {
        version: 1,
        blocks: [
          { id: 'collect', type: 'xiyou_collect_gifts', nextId: 'equip', parentBlockId: null, x: 0, y: 0 },
          { id: 'equip', type: 'xiyou_equip_regalia', nextId: null, parentBlockId: null, x: 0, y: 20 },
          { id: 'gift', type: 'xiyou_receive_cloud_boots', nextId: 'wear', parentBlockId: 'collect', x: 0, y: 40 },
          { id: 'wear', type: 'xiyou_wear_crown', nextId: null, parentBlockId: 'equip', x: 0, y: 60 },
        ],
      },
    },
    {
      name: 'cycle',
      draft: {
        version: 1,
        blocks: [
          { id: 'a', type: 'xiyou_request_regalia', nextId: 'b', parentBlockId: null, x: 0, y: 0 },
          { id: 'b', type: 'xiyou_verify_regalia', nextId: 'a', parentBlockId: null, x: 0, y: 20 },
        ],
      },
    },
    { name: 'unsafe coordinate', draft: oneBlockDraft({ x: Infinity }) },
    {
      name: 'a foreign w1-m1 block',
      draft: oneBlockDraft({ type: 'xiyou_enter_palace' as 'xiyou_request_regalia' }),
    },
    {
      name: 'a foreign w1-m2 block',
      draft: oneBlockDraft({ type: 'xiyou_inspect_weights' as 'xiyou_request_regalia' }),
    },
    {
      name: 'more than 500 nodes',
      draft: {
        version: 1,
        blocks: Array.from({ length: 501 }, (_, index) => ({
          id: `block-${index}`,
          type: 'xiyou_request_regalia' as const,
          nextId: index === 500 ? null : `block-${index + 1}`,
          parentBlockId: null,
          x: index,
          y: index,
        })),
      },
    },
  ])('rejects $name before mutating the workspace or input', ({ draft }) => {
    loadFourSeasWorkspaceDraft(workspace, validDraft)
    const before = saveFourSeasWorkspaceDraft(workspace)
    const input = draft as FourSeasWorkspaceDraftV1
    const snapshot = structuredClone(input)

    expect(() => loadFourSeasWorkspaceDraft(workspace, input)).toThrow()
    expect(saveFourSeasWorkspaceDraft(workspace)).toEqual(before)
    expect(input).toEqual(snapshot)
  })

  it('rejects saving foreign mission blocks', () => {
    workspace.newBlock('xiyou_enter_palace', 'dragon')
    expect(() => saveFourSeasWorkspaceDraft(workspace)).toThrow(/unknown block/i)
  })

  it('restores the exact previous workspace when applying a validated draft fails', () => {
    loadFourSeasWorkspaceDraft(workspace, validDraft)
    const before = saveFourSeasWorkspaceDraft(workspace)
    const realNewBlock = workspace.newBlock.bind(workspace)
    let shouldFail = true
    workspace.newBlock = ((type: string, id?: string) => {
      if (shouldFail) {
        shouldFail = false
        throw new Error('synthetic apply failure')
      }
      return realNewBlock(type, id)
    }) as typeof workspace.newBlock

    expect(() => loadFourSeasWorkspaceDraft(workspace, oneBlockDraft())).toThrow(/synthetic apply failure/)
    expect(saveFourSeasWorkspaceDraft(workspace)).toEqual(before)
  })

  it('throws AggregateError with both errors when apply and rollback fail', () => {
    loadFourSeasWorkspaceDraft(workspace, oneBlockDraft({ id: 'old' }))
    const realNewBlock = workspace.newBlock.bind(workspace)
    workspace.newBlock = ((type: string, id?: string) => {
      if (id === 'incoming') throw new Error('apply failed')
      if (id === 'old') throw new Error('rollback failed')
      return realNewBlock(type, id)
    }) as typeof workspace.newBlock

    let thrown: unknown
    try {
      loadFourSeasWorkspaceDraft(workspace, oneBlockDraft({ id: 'incoming' }))
    } catch (error) {
      thrown = error
    }
    expect(thrown).toBeInstanceOf(AggregateError)
    expect((thrown as AggregateError).errors).toEqual([
      expect.objectContaining({ message: 'apply failed' }),
      expect.objectContaining({ message: 'rollback failed' }),
    ])
  })
})
