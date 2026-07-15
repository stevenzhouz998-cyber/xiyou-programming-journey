import * as Blockly from 'blockly'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerDragonPalaceBlocks } from './dragonPalaceBlocks'
import { registerRuyiStaffBlocks } from './ruyiStaffBlocks'
import { compileRuyiStaffWorkspace } from './ruyiStaffCompiler'
import {
  loadRuyiWorkspaceDraft,
  saveRuyiWorkspaceDraft,
  type RuyiWorkspaceDraftV1,
} from './ruyiStaffDraft'

function connect(previous: Blockly.Block, next: Blockly.Block) {
  if (!previous.nextConnection || !next.previousConnection) throw new Error('missing connection')
  previous.nextConnection.connect(next.previousConnection)
}

const validDraft: RuyiWorkspaceDraftV1 = {
  version: 1,
  blocks: [
    { id: 'choose', type: 'xiyou_choose_ruyi_staff', nextId: 'shrink', x: 20, y: 50 },
    { id: 'inspect', type: 'xiyou_inspect_weights', nextId: 'choose', x: 12.5, y: -3.25 },
    { id: 'shrink', type: 'xiyou_shrink_ruyi_staff', nextId: null, x: 20, y: 100 },
  ],
}

describe('RuyiWorkspaceDraftV1', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    registerRuyiStaffBlocks()
    registerDragonPalaceBlocks()
    workspace = new Blockly.Workspace()
  })

  afterEach(() => workspace.dispose())

  it('round trips version 1 stable ids, connections, coordinates, and compiled trace', () => {
    loadRuyiWorkspaceDraft(workspace, validDraft)
    const saved = saveRuyiWorkspaceDraft(workspace)
    const restored = new Blockly.Workspace()
    try {
      loadRuyiWorkspaceDraft(restored, saved)
      expect(saveRuyiWorkspaceDraft(restored)).toEqual(validDraft)
      expect(compileRuyiStaffWorkspace(restored)).toEqual(compileRuyiStaffWorkspace(workspace))
    } finally {
      restored.dispose()
    }
  })

  it('saves blocks in deterministic code-point id order', () => {
    workspace.newBlock('xiyou_inspect_weights', 'a-lowercase')
    workspace.newBlock('xiyou_choose_ruyi_staff', 'B-uppercase')

    expect(saveRuyiWorkspaceDraft(workspace).blocks.map((block) => block.id)).toEqual([
      'B-uppercase',
      'a-lowercase',
    ])
  })

  it.each([
    {
      name: 'duplicate ids',
      blocks: [
        { id: 'same', type: 'xiyou_inspect_weights', nextId: null, x: 0, y: 0 },
        { id: 'same', type: 'xiyou_choose_sabre', nextId: null, x: 1, y: 1 },
      ],
    },
    {
      name: 'cycles',
      blocks: [
        { id: 'a', type: 'xiyou_inspect_weights', nextId: 'b', x: 0, y: 0 },
        { id: 'b', type: 'xiyou_choose_ruyi_staff', nextId: 'a', x: 0, y: 50 },
      ],
    },
    {
      name: 'unsafe coordinates',
      blocks: [
        { id: 'bad', type: 'xiyou_inspect_weights', nextId: null, x: Infinity, y: 0 },
      ],
    },
    {
      name: 'unknown nextId',
      blocks: [
        { id: 'bad', type: 'xiyou_inspect_weights', nextId: 'missing', x: 0, y: 0 },
      ],
    },
    {
      name: 'a real w1-m1 block',
      blocks: [
        { id: 'dragon', type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 },
      ],
    },
  ])('rejects $name before mutating workspace or input', ({ blocks }) => {
    loadRuyiWorkspaceDraft(workspace, validDraft)
    const before = saveRuyiWorkspaceDraft(workspace)
    const incoming = { version: 1, blocks } as RuyiWorkspaceDraftV1
    const inputSnapshot = structuredClone(incoming)

    expect(() => loadRuyiWorkspaceDraft(workspace, incoming)).toThrow()
    expect(saveRuyiWorkspaceDraft(workspace)).toEqual(before)
    expect(incoming).toEqual(inputSnapshot)
  })

  it('rejects saving a w1-m1 workspace', () => {
    workspace.newBlock('xiyou_enter_palace', 'dragon')
    expect(() => saveRuyiWorkspaceDraft(workspace)).toThrow(/unknown block/i)
  })

  it('restores the exact previous draft when applying a validated draft fails', () => {
    loadRuyiWorkspaceDraft(workspace, validDraft)
    const before = saveRuyiWorkspaceDraft(workspace)
    const incoming: RuyiWorkspaceDraftV1 = {
      version: 1,
      blocks: [{ id: 'incoming', type: 'xiyou_choose_halberd', nextId: null, x: 3, y: 4 }],
    }
    const realNewBlock = workspace.newBlock.bind(workspace)
    let shouldFail = true
    workspace.newBlock = ((type: string, id?: string) => {
      if (shouldFail) {
        shouldFail = false
        throw new Error('synthetic apply failure')
      }
      return realNewBlock(type, id)
    }) as typeof workspace.newBlock

    expect(() => loadRuyiWorkspaceDraft(workspace, incoming)).toThrow(/synthetic apply failure/)
    expect(saveRuyiWorkspaceDraft(workspace)).toEqual(before)
  })

  it('throws AggregateError containing apply and rollback failures', () => {
    const first = workspace.newBlock('xiyou_inspect_weights', 'first')
    const second = workspace.newBlock('xiyou_choose_ruyi_staff', 'second')
    connect(first, second)
    const realNewBlock = workspace.newBlock.bind(workspace)
    workspace.newBlock = ((type: string, id?: string) => {
      if (id === 'incoming') throw new Error('apply failed')
      if (id === 'first') throw new Error('rollback failed')
      return realNewBlock(type, id)
    }) as typeof workspace.newBlock
    const incoming: RuyiWorkspaceDraftV1 = {
      version: 1,
      blocks: [{ id: 'incoming', type: 'xiyou_choose_halberd', nextId: null, x: 0, y: 0 }],
    }

    let thrown: unknown
    try {
      loadRuyiWorkspaceDraft(workspace, incoming)
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
