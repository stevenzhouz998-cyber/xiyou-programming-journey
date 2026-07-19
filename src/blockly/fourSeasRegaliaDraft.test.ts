import * as Blockly from 'blockly'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
          { id: 'equip', type: 'xiyou_equip_regalia', nextId: null, parentBlockId: null, x: 0, y: 0 },
          { id: 'gift', type: 'xiyou_receive_cloud_boots', nextId: null, parentBlockId: 'equip', x: 0, y: 20 },
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
      name: 'more than 100 nodes',
      draft: {
        version: 1,
        blocks: Array.from({ length: 101 }, (_, index) => ({
          id: `block-${index}`,
          type: 'xiyou_request_regalia' as const,
          nextId: index === 100 ? null : `block-${index + 1}`,
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
