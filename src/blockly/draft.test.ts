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
