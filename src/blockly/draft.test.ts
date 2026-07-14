import * as Blockly from 'blockly'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { compileDragonPalaceWorkspace } from './compiler'
import { loadWorkspaceDraft, saveWorkspaceDraft, type WorkspaceDraftV1 } from './draft'
import { registerDragonPalaceBlocks } from './dragonPalaceBlocks'

function connect(previous: Blockly.Block, next: Blockly.Block) {
  if (!previous.nextConnection || !next.previousConnection) {
    throw new Error('Expected statement connections')
  }
  previous.nextConnection.connect(next.previousConnection)
}

describe('WorkspaceDraftV1', () => {
  let workspace: Blockly.Workspace

  beforeEach(() => {
    registerDragonPalaceBlocks()
    workspace = new Blockly.Workspace()
  })

  afterEach(() => workspace.dispose())

  it('round trips stable ids, types, links, positions, and compiled trace', () => {
    const enter = workspace.newBlock('xiyou_enter_palace', 'enter')
    const request = workspace.newBlock('xiyou_request_weapon', 'request')
    const test = workspace.newBlock('xiyou_test_weapon', 'test')
    enter.moveBy(20, 30)
    request.moveBy(20, 80)
    test.moveBy(20, 130)
    connect(enter, request)
    connect(request, test)

    const beforeTrace = compileDragonPalaceWorkspace(workspace)
    const draft = saveWorkspaceDraft(workspace)
    const snapshot = structuredClone(draft)
    const restored = new Blockly.Workspace()

    try {
      loadWorkspaceDraft(restored, draft)
      expect(draft).toEqual(snapshot)
      expect(saveWorkspaceDraft(restored)).toEqual(draft)
      expect(compileDragonPalaceWorkspace(restored)).toEqual(beforeTrace)
    } finally {
      restored.dispose()
    }
  })

  it('initializes and renders a restored chain in a real WorkspaceSvg', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const svgWorkspace = Blockly.inject(host, { sounds: false })
    const draft: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        { id: 'enter-svg', type: 'xiyou_enter_palace', nextId: 'request-svg', x: 5, y: 7 },
        {
          id: 'request-svg',
          type: 'xiyou_request_weapon',
          nextId: 'test-svg',
          x: 5,
          y: 57,
        },
        { id: 'test-svg', type: 'xiyou_test_weapon', nextId: null, x: 5, y: 107 },
      ],
    }

    try {
      loadWorkspaceDraft(svgWorkspace, draft)
      const blocks = svgWorkspace.getAllBlocks(false) as Blockly.BlockSvg[]
      const canvas = svgWorkspace.getBlockCanvas()

      expect(blocks).toHaveLength(3)
      for (const block of blocks) {
        expect(canvas?.contains(block.getSvgRoot())).toBe(true)
        expect(block.getSvgRoot().querySelector('.blocklyPath')).not.toBeNull()
      }
      expect(svgWorkspace.getBlockById('enter-svg')?.getNextBlock()?.id).toBe('request-svg')
      expect(svgWorkspace.getBlockById('request-svg')?.getNextBlock()?.id).toBe('test-svg')
    } finally {
      svgWorkspace.dispose()
      host.remove()
    }
  })

  it('removes partial SVG blocks before restoring after an apply failure', () => {
    const host = document.createElement('div')
    document.body.append(host)
    const svgWorkspace = Blockly.inject(host, { sounds: false })
    const original: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        { id: 'original-svg', type: 'xiyou_enter_palace', nextId: null, x: 4, y: 8 },
      ],
    }
    const incoming: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        { id: 'incoming-one', type: 'xiyou_request_weapon', nextId: 'incoming-two', x: 5, y: 9 },
        { id: 'incoming-two', type: 'xiyou_test_weapon', nextId: null, x: 5, y: 59 },
      ],
    }

    try {
      loadWorkspaceDraft(svgWorkspace, original)
      const realNewBlock = svgWorkspace.newBlock.bind(svgWorkspace)
      let calls = 0
      svgWorkspace.newBlock = ((prototypeName: string, id?: string) => {
        const block = realNewBlock(prototypeName, id)
        calls += 1
        if (calls === 2) throw new Error('synthetic svg apply failure')
        return block
      }) as typeof svgWorkspace.newBlock

      expect(() => loadWorkspaceDraft(svgWorkspace, incoming)).toThrow(
        /synthetic svg apply failure/,
      )

      const blocks = svgWorkspace.getAllBlocks(false) as Blockly.BlockSvg[]
      const canvas = svgWorkspace.getBlockCanvas()
      const roots = blocks.map((block) => block.getSvgRoot())
      expect(saveWorkspaceDraft(svgWorkspace)).toEqual(original)
      expect(blocks.map((block) => block.id)).toEqual(['original-svg'])
      expect(Array.from(canvas?.children ?? [])).toEqual(roots)
      expect(roots.every((root) => root.isConnected)).toBe(true)
    } finally {
      svgWorkspace.dispose()
      host.remove()
    }
  })

  it('preserves finite fractional Blockly positions within the safe numeric range', () => {
    const draft: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        {
          id: 'fractional',
          type: 'xiyou_enter_palace',
          nextId: null,
          x: 12.5,
          y: -3.25,
        },
      ],
    }

    loadWorkspaceDraft(workspace, draft)

    expect(saveWorkspaceDraft(workspace)).toEqual(draft)
  })

  it('restores the exact prior workspace when applying a validated draft throws', () => {
    const enter = workspace.newBlock('xiyou_enter_palace', 'existing-enter')
    const request = workspace.newBlock('xiyou_request_weapon', 'existing-request')
    enter.moveBy(11, 17)
    request.moveBy(11, 67)
    connect(enter, request)
    const beforeDraft = saveWorkspaceDraft(workspace)
    const beforeDraftBytes = JSON.stringify(beforeDraft)
    const beforeTrace = compileDragonPalaceWorkspace(workspace)
    const incoming: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        {
          id: 'incoming',
          type: 'xiyou_test_weapon',
          nextId: null,
          x: 100,
          y: 200,
        },
      ],
    }
    const incomingSnapshot = structuredClone(incoming)
    const realNewBlock = workspace.newBlock.bind(workspace)
    let shouldFail = true
    workspace.newBlock = ((prototypeName: string, id?: string) => {
      if (shouldFail) {
        shouldFail = false
        throw new Error('synthetic apply failure')
      }
      return realNewBlock(prototypeName, id)
    }) as typeof workspace.newBlock

    expect(() => loadWorkspaceDraft(workspace, incoming)).toThrow(/synthetic apply failure/)

    expect(incoming).toEqual(incomingSnapshot)
    expect(JSON.stringify(saveWorkspaceDraft(workspace))).toBe(beforeDraftBytes)
    expect(compileDragonPalaceWorkspace(workspace)).toEqual(beforeTrace)
  })

  it('rejects before clearing when the prior workspace cannot be represented losslessly', () => {
    const malformed = workspace.newBlock('xiyou_enter_palace', 'malformed-existing')
    malformed.moveBy(4, 6)
    malformed.setNextStatement(false)
    const incoming: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        {
          id: 'incoming',
          type: 'xiyou_test_weapon',
          nextId: null,
          x: 100,
          y: 200,
        },
      ],
    }

    expect(() => loadWorkspaceDraft(workspace, incoming)).toThrow(/snapshot/i)

    expect(workspace.getAllBlocks(false)).toEqual([malformed])
    expect(malformed.nextConnection).toBeNull()
    expect(malformed.getRelativeToSurfaceXY()).toEqual(new Blockly.utils.Coordinate(4, 6))
  })

  it.each([
    {
      name: 'a multi-block cycle',
      draft: {
        version: 1,
        blocks: [
          { id: 'a', type: 'xiyou_enter_palace', nextId: 'b', x: 0, y: 0 },
          { id: 'b', type: 'xiyou_request_weapon', nextId: 'c', x: 0, y: 50 },
          { id: 'c', type: 'xiyou_test_weapon', nextId: 'a', x: 0, y: 100 },
        ],
      },
    },
    {
      name: 'multiple predecessors',
      draft: {
        version: 1,
        blocks: [
          { id: 'a', type: 'xiyou_enter_palace', nextId: 'c', x: 0, y: 0 },
          { id: 'b', type: 'xiyou_request_weapon', nextId: 'c', x: 0, y: 50 },
          { id: 'c', type: 'xiyou_test_weapon', nextId: null, x: 0, y: 100 },
        ],
      },
    },
  ])('rejects $name without changing the target or input', ({ draft }) => {
    const existing = workspace.newBlock('xiyou_test_weapon', 'existing')
    existing.moveBy(7, 9)
    const before = saveWorkspaceDraft(workspace)
    const inputBefore = structuredClone(draft)

    expect(() => loadWorkspaceDraft(workspace, draft as WorkspaceDraftV1)).toThrow()

    expect(draft).toEqual(inputBefore)
    expect(saveWorkspaceDraft(workspace)).toEqual(before)
  })

  it.each([
    {
      name: 'duplicate ids',
      draft: {
        version: 1,
        blocks: [
          { id: 'same', type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 },
          { id: 'same', type: 'xiyou_request_weapon', nextId: null, x: 1, y: 1 },
        ],
      },
    },
    {
      name: 'unknown next ids',
      draft: {
        version: 1,
        blocks: [
          { id: 'enter', type: 'xiyou_enter_palace', nextId: 'missing', x: 0, y: 0 },
        ],
      },
    },
    {
      name: 'self links',
      draft: {
        version: 1,
        blocks: [
          { id: 'enter', type: 'xiyou_enter_palace', nextId: 'enter', x: 0, y: 0 },
        ],
      },
    },
    {
      name: 'unknown block types',
      draft: {
        version: 1,
        blocks: [{ id: 'bad', type: 'not-a-block', nextId: null, x: 0, y: 0 }],
      },
    },
    {
      name: 'non-finite coordinates',
      draft: {
        version: 1,
        blocks: [
          { id: 'bad', type: 'xiyou_enter_palace', nextId: null, x: Number.NaN, y: 0 },
        ],
      },
    },
    {
      name: 'unsafe coordinates',
      draft: {
        version: 1,
        blocks: [
          {
            id: 'bad',
            type: 'xiyou_enter_palace',
            nextId: null,
            x: Number.MAX_SAFE_INTEGER + 1,
            y: 0,
          },
        ],
      },
    },
  ])('rejects $name without mutating the target workspace', ({ draft }) => {
    const existing = workspace.newBlock('xiyou_test_weapon', 'existing')
    existing.moveBy(7, 9)
    const before = saveWorkspaceDraft(workspace)

    expect(() => loadWorkspaceDraft(workspace, draft as WorkspaceDraftV1)).toThrow()
    expect(saveWorkspaceDraft(workspace)).toEqual(before)
  })
})
