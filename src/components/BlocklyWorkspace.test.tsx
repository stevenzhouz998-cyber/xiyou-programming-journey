import * as Blockly from 'blockly'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CompileResult } from '../blockly/compiler'
import type { WorkspaceDraftV1 } from '../blockly/draft'
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

function setup({
  draft = EMPTY_DRAFT,
  focusBlockId = null,
  onDraftChange = vi.fn(() => ({ status: 'saved' as const })),
  onRun = vi.fn<(result: CompileResult) => void>(),
  onFocusHandled = vi.fn<() => void>(),
}: {
  draft?: WorkspaceDraftV1
  focusBlockId?: string | null
  onDraftChange?: ReturnType<typeof vi.fn<(draft: WorkspaceDraftV1) => { status: 'saved' | 'unsaved' }>>
  onRun?: ReturnType<typeof vi.fn<(result: CompileResult) => void>>
  onFocusHandled?: ReturnType<typeof vi.fn<() => void>>
} = {}) {
  const workspace = new Blockly.Workspace()
  const adapter: BlocklyWorkspaceAdapter = { create: vi.fn(() => workspace) }
  const view = render(
    <BlocklyWorkspaceAdapterProvider adapter={adapter}>
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
  return { workspace, adapter, onDraftChange, onRun, onFocusHandled, ...view }
}

afterEach(() => localStorage.clear())

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

  it('submits an honest multiple-top-level compile failure and does not invent an ordered program', () => {
    const draft: WorkspaceDraftV1 = {
      version: 1,
      blocks: [
        { id: 'enter-top', type: 'xiyou_enter_palace', nextId: null, x: 0, y: 0 },
        { id: 'request-top', type: 'xiyou_request_weapon', nextId: null, x: 100, y: 0 },
      ],
    }
    const { onRun } = setup({ draft })

    expect(screen.getByText(/多个开头/)).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))

    expect(onRun).toHaveBeenCalledWith({
      ok: false,
      trace: [],
      diagnostics: [
        { code: 'multiple-top-level', sourceBlockId: 'enter-top', concept: 'program-structure' },
      ],
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
    const onDraftChange = vi.fn(() => ({ status: 'saved' as const }))

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
  ])('preserves %s instead of guessing a migration', async (_name, makeBytes) => {
    const original = makeBytes()
    localStorage.setItem(LEGACY_KEY, original)
    const onDraftChange = vi.fn(() => ({ status: 'saved' as const }))

    setup({ onDraftChange })

    expect(await screen.findByRole('alert')).toHaveTextContent('旧版积木草稿无法安全迁移')
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(localStorage.getItem(LEGACY_KEY)).toBe(original)
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
})
