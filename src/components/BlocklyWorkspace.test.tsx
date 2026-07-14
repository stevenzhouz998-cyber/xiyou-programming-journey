import * as Blockly from 'blockly'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BattleDiagnostic } from '../battle/types'
import type { CompileResult } from '../blockly/compiler'
import type { WorkspaceDraftV1 } from '../blockly/draft'
import { PROGRESS_SCHEMA_LIMITS } from '../progress/schema'
import { BattleFeedback } from './BattleFeedback'
import {
  BlocklyWorkspace,
  BlocklyWorkspaceAdapterProvider,
  type BlocklyWorkspaceAdapter,
} from './BlocklyWorkspace'

const EMPTY_DRAFT: WorkspaceDraftV1 = { version: 1, blocks: [] }
const LEGACY_KEY = ['xiyou', 'workspace', 'w1-m1'].join('-')

function registerLegacyBlock(): void {
  if (Blockly.Blocks.xiyou_action) return
  Blockly.defineBlocksWithJsonArray([
    {
      type: 'xiyou_action',
      message0: '%1',
      args0: [{ type: 'field_input', name: 'ACTION', text: '原著动作' }],
      previousStatement: null,
      nextStatement: null,
    },
  ])
}

function legacyBytes(labels: readonly string[]): string {
  registerLegacyBlock()
  const workspace = new Blockly.Workspace()
  try {
    const blocks = labels.map((label, index) => {
      const block = workspace.newBlock('xiyou_action', `legacy-${index + 1}`)
      block.setFieldValue(label, 'ACTION')
      block.moveBy(24, 40 + index * 56)
      return block
    })
    for (let index = 0; index < blocks.length - 1; index += 1) {
      const nextConnection = blocks[index].nextConnection
      const previousConnection = blocks[index + 1].previousConnection
      if (nextConnection === null || previousConnection === null) {
        throw new Error('Expected legacy statement connections')
      }
      nextConnection.connect(previousConnection)
    }
    return JSON.stringify(Blockly.serialization.workspaces.save(workspace))
  } finally {
    workspace.dispose()
  }
}

type MutableJson = Record<string, any>

function mutateLegacyBytes(mutate: (value: MutableJson) => void): string {
  const value = JSON.parse(legacyBytes(['进入龙宫'])) as MutableJson
  mutate(value)
  return JSON.stringify(value)
}

function boundedLegacyBytes(blockCount: number, idLength: number): string {
  const blocks = Array.from({ length: blockCount }, (_, index) => {
    const prefix = `legacy-${index}-`
    if (prefix.length > idLength) throw new Error('Requested legacy id length is too short')
    return {
      type: 'xiyou_action',
      id: prefix.padEnd(idLength, 'x'),
      x: index * 2,
      y: index * 3,
      fields: { ACTION: '进入龙宫' },
    }
  })
  return JSON.stringify({ blocks: { languageVersion: 0, blocks } })
}

function setup({
  draft = EMPTY_DRAFT,
  focusBlockId = null,
  onDraftChange = vi.fn(() => ({ status: 'saved' as const })),
  onRun = vi.fn<(result: CompileResult) => void>(),
  onFocusHandled = vi.fn<() => void>(),
  workspace = new Blockly.Workspace(),
  adapter,
}: {
  draft?: WorkspaceDraftV1
  focusBlockId?: string | null
  onDraftChange?: ReturnType<typeof vi.fn<(draft: WorkspaceDraftV1) => { status: 'saved' | 'unsaved' }>>
  onRun?: ReturnType<typeof vi.fn<(result: CompileResult) => void>>
  onFocusHandled?: ReturnType<typeof vi.fn<() => void>>
  workspace?: Blockly.Workspace
  adapter?: BlocklyWorkspaceAdapter
} = {}) {
  const resolvedAdapter: BlocklyWorkspaceAdapter = adapter ?? { create: vi.fn(() => workspace) }
  const view = render(
    <BlocklyWorkspaceAdapterProvider adapter={resolvedAdapter}>
      <BlocklyWorkspace
        missionId="w1-m1"
        draft={draft}
        onDraftChange={onDraftChange}
        onRun={onRun}
        focusBlockId={focusBlockId}
        onFocusHandled={onFocusHandled}
      />
    </BlocklyWorkspaceAdapterProvider>,
  )
  return { workspace, adapter: resolvedAdapter, onDraftChange, onRun, onFocusHandled, ...view }
}

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('BlocklyWorkspace', () => {
  it('adds and connects real Blockly blocks, then submits the compiler result at click time', async () => {
    const { workspace, onRun } = setup()

    fireEvent.click(screen.getByRole('button', { name: '加入：进入龙宫' }))
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }))

    expect(workspace.getTopBlocks(false)).toHaveLength(1)
    expect(workspace.getTopBlocks(false)[0].getNextBlock()?.type).toBe('xiyou_request_weapon')
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('进入龙宫'),
      expect.stringContaining('请求兵器'),
    ])

    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))
    expect(onRun).toHaveBeenCalledWith({
      ok: true,
      trace: [
        expect.objectContaining({ opcode: 'enter_palace' }),
        expect.objectContaining({ opcode: 'request_weapon' }),
      ],
    })
  })

  it('moves and deletes through real workspace commands so the displayed and compiled trace changes', () => {
    const { onRun } = setup()
    fireEvent.click(screen.getByRole('button', { name: '加入：进入龙宫' }))
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }))
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }))

    fireEvent.click(screen.getByRole('button', { name: '上移：试用兵器' }))
    fireEvent.click(screen.getByRole('button', { name: '删除：请求兵器' }))
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))

    expect(onRun).toHaveBeenLastCalledWith({
      ok: true,
      trace: [
        expect.objectContaining({ opcode: 'enter_palace' }),
        expect.objectContaining({ opcode: 'test_weapon' }),
      ],
    })
  })

  it('shows real multi-top blocks and lets a keyboard user delete one into a compilable saved chain', () => {
    const draft: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        { id: 'enter-top', type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 },
        { id: 'request-top', type: 'xiyou_request_weapon', nextId: null, x: 100, y: 0 },
      ],
    }
    const { onRun, onDraftChange, workspace } = setup({ draft })

    expect(screen.getByText(/多个开头/)).toBeInTheDocument()
    expect(screen.getByRole('list', { name: /尚未形成唯一顺序/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))

    expect(onRun).toHaveBeenCalledWith({
      ok: false,
      trace: [],
      diagnostics: [
        { code: 'multiple-top-level', sourceBlockId: 'enter-top', concept: 'program-structure' },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: '删除：请求兵器' }))

    expect(workspace.getBlockById('request-top')).toBeNull()
    expect(screen.getByRole('list')).toHaveTextContent('进入龙宫')
    expect(onDraftChange).toHaveBeenLastCalledWith({
      version: 1,
      blocks: [expect.objectContaining({ id: 'enter-top', nextId: null })],
    })
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))
    expect(onRun).toHaveBeenLastCalledWith({
      ok: true,
      trace: [expect.objectContaining({ sourceBlockId: 'enter-top', opcode: 'enter_palace' })],
    })
  })

  it('reports saved and unsaved draft outcomes while keeping edits in the real workspace', () => {
    const onDraftChange = vi
      .fn<(draft: WorkspaceDraftV1) => { status: 'saved' | 'unsaved' }>()
      .mockReturnValueOnce({ status: 'saved' })
      .mockReturnValue({ status: 'unsaved' })
    const { workspace } = setup({ onDraftChange })

    fireEvent.click(screen.getByRole('button', { name: '加入：进入龙宫' }))
    expect(screen.queryByText(/尚未保存/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }))

    expect(screen.getByText(/尚未保存/)).toBeInTheDocument()
    expect(workspace.getAllBlocks(false)).toHaveLength(2)
    expect(onDraftChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ version: 1, blocks: expect.arrayContaining([
        expect.objectContaining({ type: 'xiyou_request_weapon' }),
      ]) }),
    )
  })

  it('persists a direct real Blockly change without writing a parallel local-storage draft', async () => {
    const setItem = vi.spyOn(localStorage, 'setItem')
    const { workspace, onDraftChange } = setup()

    act(() => {
      workspace.newBlock('xiyou_enter_palace', 'direct-change')
    })

    await waitFor(() => expect(onDraftChange).toHaveBeenCalledWith(
      expect.objectContaining({ blocks: [expect.objectContaining({ id: 'direct-change' })] }),
    ))
    expect(setItem).not.toHaveBeenCalled()
  })

  it('loads the supplied V3 draft and focuses a real requested block before acknowledging it', () => {
    const draft: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        { id: 'enter-focus', type: 'xiyou_enter_palace', nextId: 'request-focus', x: 0, y: 0 },
        { id: 'request-focus', type: 'xiyou_request_weapon', nextId: null, x: 0, y: 50 },
      ],
    }
    const { workspace, onFocusHandled } = setup({ draft, focusBlockId: 'request-focus' })

    expect(workspace.getBlockById('request-focus')).not.toBeNull()
    expect(document.activeElement).toHaveTextContent('请求兵器')
    expect(onFocusHandled).toHaveBeenCalledTimes(1)
  })

  it('falls back to the focusable workspace when the requested block no longer exists', () => {
    const { onFocusHandled } = setup({ focusBlockId: 'missing-block' })

    expect(document.activeElement).toHaveAttribute('aria-label', 'Blockly 积木编辑区')
    expect(onFocusHandled).toHaveBeenCalledTimes(1)
  })

  it('does not handle the same focus request again when only callback identity changes', () => {
    const draft: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        { id: 'stable-focus', type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 },
      ],
    }
    const firstHandled = vi.fn<() => void>()
    const replacementHandled = vi.fn<() => void>()
    const result = setup({ draft, focusBlockId: 'stable-focus', onFocusHandled: firstHandled })

    result.rerender(
      <BlocklyWorkspaceAdapterProvider adapter={result.adapter}>
        <BlocklyWorkspace
          missionId="w1-m1"
          draft={draft}
          onDraftChange={result.onDraftChange}
          onRun={result.onRun}
          focusBlockId="stable-focus"
          onFocusHandled={replacementHandled}
        />
      </BlocklyWorkspaceAdapterProvider>,
    )

    expect(firstHandled).toHaveBeenCalledTimes(1)
    expect(replacementHandled).not.toHaveBeenCalled()
  })

  it('migrates all three exact legacy labels with stable ids and connections, then removes saved bytes', async () => {
    localStorage.setItem(LEGACY_KEY, legacyBytes(['进入龙宫', '请求兵器', '试用兵器']))
    const onDraftChange = vi.fn<(draft: WorkspaceDraftV1) => { status: 'saved' }>(
      () => ({ status: 'saved' }),
    )

    setup({ onDraftChange })

    await waitFor(() => expect(onDraftChange).toHaveBeenCalledTimes(1))
    expect(onDraftChange).toHaveBeenCalledWith({
      version: 1,
      blocks: [
        expect.objectContaining({ id: 'legacy-1', type: 'xiyou_enter_palace', nextId: 'legacy-2' }),
        expect.objectContaining({ id: 'legacy-2', type: 'xiyou_request_weapon', nextId: 'legacy-3' }),
        expect.objectContaining({ id: 'legacy-3', type: 'xiyou_test_weapon', nextId: null }),
      ],
    })
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('accepts a legacy block id with 129 characters', async () => {
    localStorage.setItem(LEGACY_KEY, boundedLegacyBytes(1, 129))
    const onDraftChange = vi.fn<(draft: WorkspaceDraftV1) => { status: 'saved' }>(
      () => ({ status: 'saved' }),
    )

    setup({ onDraftChange })

    await waitFor(() => expect(onDraftChange).toHaveBeenCalledTimes(1))
    expect(onDraftChange.mock.calls[0]![0].blocks[0]?.id).toHaveLength(129)
  })

  it('accepts 257 legacy blocks', async () => {
    localStorage.setItem(LEGACY_KEY, boundedLegacyBytes(257, 24))
    const onDraftChange = vi.fn<(draft: WorkspaceDraftV1) => { status: 'saved' }>(
      () => ({ status: 'saved' }),
    )

    setup({ onDraftChange })

    await waitFor(() => expect(onDraftChange).toHaveBeenCalledTimes(1))
    expect(onDraftChange.mock.calls[0]![0].blocks).toHaveLength(257)
  })

  it('accepts 500 blocks with 256-character ids above the old byte limit and preserves unsaved bytes', async () => {
    const original = boundedLegacyBytes(500, 256)
    expect(new TextEncoder().encode(original).byteLength).toBeGreaterThan(128 * 1024)
    expect(new TextEncoder().encode(original).byteLength).toBeLessThan(
      PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes,
    )
    localStorage.setItem(LEGACY_KEY, original)
    const onDraftChange = vi.fn<(draft: WorkspaceDraftV1) => { status: 'unsaved' }>(
      () => ({ status: 'unsaved' }),
    )

    setup({ onDraftChange })

    await screen.findByText(/尚未保存/)
    expect(onDraftChange).toHaveBeenCalledTimes(1)
    expect(onDraftChange.mock.calls[0]![0].blocks).toHaveLength(500)
    expect(onDraftChange.mock.calls[0]![0].blocks[0]?.id).toHaveLength(256)
    expect(localStorage.getItem(LEGACY_KEY)).toBe(original)
  })

  it.each([
    ['257-character id', boundedLegacyBytes(1, 257)],
    ['501 blocks', boundedLegacyBytes(501, 24)],
  ])('rejects a legacy workspace beyond the shared %s limit', async (_name, original) => {
    localStorage.setItem(LEGACY_KEY, original)
    const onDraftChange = vi.fn(() => ({ status: 'saved' as const }))

    setup({ onDraftChange })

    expect(await screen.findByRole('alert')).toHaveTextContent('旧版积木草稿无法安全迁移')
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(localStorage.getItem(LEGACY_KEY)).toBe(original)
  })

  it('migrates the exact legacy empty workspace bytes and removes them only after saving', async () => {
    localStorage.setItem(LEGACY_KEY, '{}')
    const onDraftChange = vi.fn(() => ({ status: 'saved' as const }))

    setup({ onDraftChange })

    await waitFor(() => expect(onDraftChange).toHaveBeenCalledTimes(1))
    expect(onDraftChange).toHaveBeenCalledWith(EMPTY_DRAFT)
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
    expect(screen.getByText(/指令卷轴还是空的/)).toBeInTheDocument()
  })

  it('keeps exact legacy empty bytes while unsaved and retries the same empty draft', async () => {
    localStorage.setItem(LEGACY_KEY, '{}')
    const onDraftChange = vi
      .fn<(draft: WorkspaceDraftV1) => { status: 'saved' | 'unsaved' }>()
      .mockReturnValueOnce({ status: 'unsaved' })
      .mockReturnValueOnce({ status: 'saved' })

    setup({ onDraftChange })

    await screen.findByText(/尚未保存/)
    expect(onDraftChange).toHaveBeenNthCalledWith(1, EMPTY_DRAFT)
    expect(localStorage.getItem(LEGACY_KEY)).toBe('{}')

    fireEvent.click(screen.getByRole('button', { name: '重试保存' }))

    expect(onDraftChange).toHaveBeenNthCalledWith(2, EMPTY_DRAFT)
    expect(screen.queryByText(/尚未保存/)).not.toBeInTheDocument()
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })

  it('keeps original legacy bytes and shows unsaved when the migrated draft cannot be persisted', async () => {
    const original = legacyBytes(['进入龙宫'])
    localStorage.setItem(LEGACY_KEY, original)
    const onDraftChange = vi.fn(() => ({ status: 'unsaved' as const }))

    setup({ onDraftChange })

    await screen.findByText(/尚未保存/)
    expect(localStorage.getItem(LEGACY_KEY)).toBe(original)
    expect(screen.getByText('进入龙宫')).toBeInTheDocument()
  })

  it.each([
    ['unknown label', () => legacyBytes(['潜入龙宫'])],
    ['malformed bytes', () => '{not-json'],
    ['empty object with unknown keys', () => JSON.stringify({ unexpected: true })],
  ])('preserves %s instead of guessing a migration', async (_name, makeBytes) => {
    const original = makeBytes()
    localStorage.setItem(LEGACY_KEY, original)
    const onDraftChange = vi.fn(() => ({ status: 'saved' as const }))

    setup({ onDraftChange })

    expect(await screen.findByRole('alert')).toHaveTextContent('旧版积木草稿无法安全迁移')
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(localStorage.getItem(LEGACY_KEY)).toBe(original)
  })

  it.each([
    ['missing id', () => mutateLegacyBytes((value) => { delete value.blocks.blocks[0].id })],
    ['duplicate id', () => mutateLegacyBytes((value) => {
      value.blocks.blocks.push(structuredClone(value.blocks.blocks[0]))
    })],
    ['cyclic repeated id', () => mutateLegacyBytes((value) => {
      const root = value.blocks.blocks[0]
      root.next = { block: { type: root.type, id: root.id, fields: root.fields } }
    })],
    ['multiple predecessors', () => mutateLegacyBytes((value) => {
      const root = value.blocks.blocks[0]
      const child = { type: root.type, id: 'shared-child', fields: root.fields }
      root.next = { block: structuredClone(child) }
      value.blocks.blocks.push({
        type: root.type,
        id: 'second-top',
        x: 100,
        y: 100,
        fields: root.fields,
        next: { block: structuredClone(child) },
      })
    })],
    ['unknown root field', () => mutateLegacyBytes((value) => { value.extra = true })],
    ['unknown block field', () => mutateLegacyBytes((value) => {
      value.blocks.blocks[0].extra = true
    })],
    ['unknown block type', () => mutateLegacyBytes((value) => {
      value.blocks.blocks[0].type = 'xiyou_enter_palace'
    })],
    ['malformed next', () => mutateLegacyBytes((value) => {
      value.blocks.blocks[0].next = {}
    })],
    ['unsafe coordinate', () => mutateLegacyBytes((value) => {
      value.blocks.blocks[0].x = Number.MAX_SAFE_INTEGER + 1
    })],
    ['oversized bytes', () => `${' '.repeat(PROGRESS_SCHEMA_LIMITS.maxRawJsonBytes)}${legacyBytes(['进入龙宫'])}`],
  ])('rejects raw legacy %s before save or deletion', async (_name, makeBytes) => {
    const original = makeBytes()
    localStorage.setItem(LEGACY_KEY, original)
    const onDraftChange = vi.fn(() => ({ status: 'saved' as const }))
    const removeItem = vi.spyOn(localStorage, 'removeItem')

    setup({ onDraftChange })

    expect(await screen.findByRole('alert')).toHaveTextContent('旧版积木草稿无法安全迁移')
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
    expect(localStorage.getItem(LEGACY_KEY)).toBe(original)
  })

  it('reads legacy storage before creating the workspace and recovers from a read exception', () => {
    const order: string[] = []
    const workspace = new Blockly.Workspace()
    const dispose = vi.spyOn(workspace, 'dispose')
    const adapter: BlocklyWorkspaceAdapter = {
      create: () => {
        order.push('create')
        return workspace
      },
    }
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      order.push('get')
      throw new Error('storage blocked')
    })

    const view = setup({ workspace, adapter })

    expect(order).toEqual(['get', 'create'])
    expect(screen.getByRole('alert')).toHaveTextContent('无法读取旧版积木草稿')
    expect(workspace.getAllBlocks(false)).toEqual([])
    view.unmount()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('keeps saved status and the original backup when legacy cleanup throws', async () => {
    const original = legacyBytes(['进入龙宫'])
    localStorage.setItem(LEGACY_KEY, original)
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('remove blocked')
    })

    setup({ onDraftChange: vi.fn(() => ({ status: 'saved' as const })) })

    expect(await screen.findByRole('alert')).toHaveTextContent('新草稿已保存但旧备份未清理')
    expect(screen.queryByText(/尚未保存/)).not.toBeInTheDocument()
    expect(localStorage.getItem(LEGACY_KEY)).toBe(original)
  })

  it('retries the unchanged real draft and removes pending legacy bytes after save succeeds', async () => {
    const original = legacyBytes(['进入龙宫'])
    localStorage.setItem(LEGACY_KEY, original)
    const onDraftChange = vi
      .fn<(draft: WorkspaceDraftV1) => { status: 'saved' | 'unsaved' }>()
      .mockReturnValueOnce({ status: 'unsaved' })
      .mockReturnValueOnce({ status: 'saved' })

    setup({ onDraftChange })
    await screen.findByText(/尚未保存/)
    fireEvent.click(screen.getByRole('button', { name: '重试保存' }))

    expect(onDraftChange).toHaveBeenCalledTimes(2)
    expect(onDraftChange.mock.calls[1][0]).toEqual(onDraftChange.mock.calls[0][0])
    expect(screen.queryByText(/尚未保存/)).not.toBeInTheDocument()
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull()
  })

  it('never lets legacy bytes overwrite a non-empty V3 draft', () => {
    const original = legacyBytes(['请求兵器'])
    localStorage.setItem(LEGACY_KEY, original)
    const draft: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        { id: 'v3-enter', type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 },
      ],
    }
    const onDraftChange = vi.fn(() => ({ status: 'saved' as const }))

    setup({ draft, onDraftChange })

    expect(screen.getByText('进入龙宫')).toBeInTheDocument()
    expect(screen.queryByText('请求兵器')).not.toBeInTheDocument()
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(localStorage.getItem(LEGACY_KEY)).toBe(original)
  })

  it('retries an equal cloned incoming draft after a transactional load failure', async () => {
    const workspace = new Blockly.Workspace()
    const realNewBlock = workspace.newBlock.bind(workspace)
    let failIncomingOnce = true
    workspace.newBlock = ((type: string, id?: string) => {
      if (id === 'incoming-retry' && failIncomingOnce) {
        failIncomingOnce = false
        throw new Error('synthetic incoming load failure')
      }
      return realNewBlock(type, id)
    }) as typeof workspace.newBlock
    const incoming: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        { id: 'incoming-retry', type: 'xiyou_enter_palace', nextId: null, x: 20, y: 30 },
      ],
    }
    const result = setup({ workspace })

    result.rerender(
      <BlocklyWorkspaceAdapterProvider adapter={result.adapter}>
        <BlocklyWorkspace
          missionId="w1-m1"
          draft={incoming}
          onDraftChange={result.onDraftChange}
          onRun={result.onRun}
          focusBlockId={null}
          onFocusHandled={result.onFocusHandled}
        />
      </BlocklyWorkspaceAdapterProvider>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('传入的积木草稿无法安全恢复')
    expect(workspace.getAllBlocks(false)).toEqual([])

    result.rerender(
      <BlocklyWorkspaceAdapterProvider adapter={result.adapter}>
        <BlocklyWorkspace
          missionId="w1-m1"
          draft={structuredClone(incoming)}
          onDraftChange={result.onDraftChange}
          onRun={result.onRun}
          focusBlockId={null}
          onFocusHandled={result.onFocusHandled}
        />
      </BlocklyWorkspaceAdapterProvider>,
    )

    await waitFor(() => expect(workspace.getBlockById('incoming-retry')).not.toBeNull())
    expect(screen.queryByText(/传入的积木草稿无法安全恢复/)).not.toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveTextContent('进入龙宫')
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))
    expect(result.onRun).toHaveBeenLastCalledWith({
      ok: true,
      trace: [expect.objectContaining({ sourceBlockId: 'incoming-retry', opcode: 'enter_palace' })],
    })
  })

  it('clears through the real workspace and persists the empty draft', () => {
    const { workspace, onDraftChange } = setup()
    fireEvent.click(screen.getByRole('button', { name: '加入：进入龙宫' }))

    fireEvent.click(screen.getByRole('button', { name: '清空并重新开始' }))

    expect(workspace.getAllBlocks(false)).toHaveLength(0)
    expect(onDraftChange).toHaveBeenLastCalledWith(EMPTY_DRAFT)
  })

  it('removes its real workspace listener and disposes the workspace on unmount', () => {
    const workspace = new Blockly.Workspace()
    const addListener = vi.spyOn(workspace, 'addChangeListener')
    const removeListener = vi.spyOn(workspace, 'removeChangeListener')
    const dispose = vi.spyOn(workspace, 'dispose')
    const adapter: BlocklyWorkspaceAdapter = { create: () => workspace }
    const view = render(
      <BlocklyWorkspaceAdapterProvider adapter={adapter}>
        <BlocklyWorkspace
          missionId="w1-m1"
          draft={EMPTY_DRAFT}
          onDraftChange={() => ({ status: 'saved' })}
          onRun={() => undefined}
          focusBlockId={null}
          onFocusHandled={() => undefined}
        />
      </BlocklyWorkspaceAdapterProvider>,
    )

    expect(addListener).toHaveBeenCalledTimes(1)
    view.unmount()

    expect(removeListener).toHaveBeenCalledWith(addListener.mock.calls[0][0])
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it('lets no-source feedback focus the real Blockly workspace without a fake block request', () => {
    const workspace = new Blockly.Workspace()
    const adapter: BlocklyWorkspaceAdapter = { create: () => workspace }
    const onFocusBlock = vi.fn<(blockId: string) => void>()
    const onFocusWorkspace = vi.fn<() => void>()
    const onFocusHandled = vi.fn<() => void>()
    const diagnostic: BattleDiagnostic = {
      type: 'program-ended-incomplete',
      concept: 'completeness',
      state: 'outside-palace',
      instructionId: null,
      sourceBlockId: null,
      opcode: null,
      messageCode: 'dragon-palace.program-ended-incomplete.outside-palace',
    }

    render(
      <>
        <BlocklyWorkspaceAdapterProvider adapter={adapter}>
          <BlocklyWorkspace
            missionId="w1-m1"
            draft={EMPTY_DRAFT}
            onDraftChange={() => ({ status: 'saved' })}
            onRun={() => undefined}
            focusBlockId={null}
            onFocusHandled={onFocusHandled}
          />
        </BlocklyWorkspaceAdapterProvider>
        <BattleFeedback
          diagnostic={diagnostic}
          occurrenceId={1}
          onFocusBlock={onFocusBlock}
          onFocusWorkspace={() => {
            onFocusWorkspace()
            screen.getByLabelText('Blockly 积木编辑区').focus()
          }}
        />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: '回到编程工作台' }))

    expect(document.activeElement).toBe(screen.getByLabelText('Blockly 积木编辑区'))
    expect(onFocusWorkspace).toHaveBeenCalledTimes(1)
    expect(onFocusBlock).not.toHaveBeenCalled()
    expect(onFocusHandled).not.toHaveBeenCalled()
  })
})
