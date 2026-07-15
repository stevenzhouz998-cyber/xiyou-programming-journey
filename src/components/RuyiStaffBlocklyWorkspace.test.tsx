import * as Blockly from 'blockly'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RuyiCompileResult } from '../blockly/ruyiStaffCompiler'
import type { RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft'
import {
  RuyiStaffBlocklyWorkspace,
  RuyiStaffBlocklyWorkspaceAdapterProvider,
} from './RuyiStaffBlocklyWorkspace'

const EMPTY: RuyiWorkspaceDraftV1 = { version: 1, blocks: [] }
function chainDraft(count: number): RuyiWorkspaceDraftV1 {
  return { version: 1, blocks: Array.from({ length: count }, (_, index) => ({
    id: `block-${index}`,
    type: 'xiyou_inspect_weights' as const,
    nextId: index + 1 < count ? `block-${index + 1}` : null,
    x: 0,
    y: index * 48,
  })) }
}
type DraftSaveResult = { status: 'saved' | 'unsaved' | 'conflict' }
type DraftSaver = (draft: RuyiWorkspaceDraftV1) => DraftSaveResult | Promise<DraftSaveResult>

function setup(draft = EMPTY, onDraftChange: DraftSaver = vi.fn(() => ({ status: 'saved' as const }))) {
  const workspace = new Blockly.Workspace()
  const onRun = vi.fn<(result: RuyiCompileResult) => void>()
  const view = render(
    <RuyiStaffBlocklyWorkspaceAdapterProvider adapter={{ create: () => workspace }}>
      <RuyiStaffBlocklyWorkspace
        draft={draft}
        onDraftChange={onDraftChange}
        onRun={onRun}
        focusBlockId={null}
        onFocusHandled={() => undefined}
      />
    </RuyiStaffBlocklyWorkspaceAdapterProvider>,
  )
  return { workspace, onRun, onDraftChange, view }
}

describe('RuyiStaffBlocklyWorkspace', () => {
  it('offers exactly five mission blocks and compiles the connected real workspace', () => {
    const { workspace, onRun } = setup()
    expect(screen.getAllByRole('button', { name: /^\u52a0\u5165\uff1a/ }).map((button) => button.textContent)).toEqual([
      '\u52a0\u5165\uff1a\u67e5\u770b\u4e09\u4ef6\u5175\u5668\u91cd\u91cf',
      '\u52a0\u5165\uff1a\u9009\u62e9\u5927\u634d\u5200\uff083600\u65a4\uff09',
      '\u52a0\u5165\uff1a\u9009\u62e9\u65b9\u5929\u753b\u621f\uff087200\u65a4\uff09',
      '\u52a0\u5165\uff1a\u9009\u62e9\u5b9a\u6d77\u795e\u9488\uff0813500\u65a4\uff09',
      '\u52a0\u5165\uff1a\u7f29\u5c0f\u5b9a\u6d77\u795e\u9488',
    ])
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u67e5\u770b\u4e09\u4ef6\u5175\u5668\u91cd\u91cf' }))
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u9009\u62e9\u5b9a\u6d77\u795e\u9488\uff0813500\u65a4\uff09' }))
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u7f29\u5c0f\u5b9a\u6d77\u795e\u9488' }))
    expect(workspace.getTopBlocks(false)).toHaveLength(1)
    fireEvent.keyDown(screen.getByLabelText('Blockly \u79ef\u6728\u7f16\u8f91\u533a'), { key: 'Enter' })
    expect(onRun).toHaveBeenCalledWith({ ok: true, trace: [
      expect.objectContaining({ opcode: 'inspect_weights' }),
      expect.objectContaining({ opcode: 'choose_ruyi_staff' }),
      expect.objectContaining({ opcode: 'shrink_ruyi_staff' }),
    ] })
  })

  it('moves, deletes and clears through the same real Blockly workspace', () => {
    const { workspace, onRun } = setup()
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u67e5\u770b\u4e09\u4ef6\u5175\u5668\u91cd\u91cf' }))
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u9009\u62e9\u5927\u634d\u5200\uff083600\u65a4\uff09' }))
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u7f29\u5c0f\u5b9a\u6d77\u795e\u9488' }))
    fireEvent.click(screen.getByRole('button', { name: '\u4e0a\u79fb\uff1a\u7f29\u5c0f\u5b9a\u6d77\u795e\u9488' }))
    fireEvent.click(screen.getByRole('button', { name: '\u5220\u9664\uff1a\u9009\u62e9\u5927\u634d\u5200\uff083600\u65a4\uff09' }))
    fireEvent.click(screen.getByRole('button', { name: '\u6267\u884c\u6218\u6597\u6307\u4ee4' }))
    expect(onRun).toHaveBeenLastCalledWith({ ok: true, trace: [
      expect.objectContaining({ opcode: 'inspect_weights' }),
      expect.objectContaining({ opcode: 'shrink_ruyi_staff' }),
    ] })
    fireEvent.click(screen.getByRole('button', { name: '\u6e05\u7a7a\u5e76\u91cd\u65b0\u5f00\u59cb' }))
    expect(workspace.getAllBlocks(false)).toHaveLength(0)
  })

  it('shows and focuses compile errors for empty, multiple, disconnected and unknown blocks', () => {
    const onFocusHandled = vi.fn()
    const workspace = new Blockly.Workspace()
    const view = render(
      <RuyiStaffBlocklyWorkspaceAdapterProvider adapter={{ create: () => workspace }}>
        <RuyiStaffBlocklyWorkspace draft={EMPTY} onDraftChange={() => ({ status: 'saved' })} onRun={() => undefined} focusBlockId={null} onFocusHandled={onFocusHandled} />
      </RuyiStaffBlocklyWorkspaceAdapterProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '\u6267\u884c\u6218\u6597\u6307\u4ee4' }))
    expect(screen.getByText(/\u6307\u4ee4\u5377\u8f74\u8fd8\u662f\u7a7a\u7684/)).toBeVisible()
    view.unmount()

    const multi: RuyiWorkspaceDraftV1 = { version: 1, blocks: [
      { id: 'one', type: 'xiyou_inspect_weights', nextId: null, x: 0, y: 0 },
      { id: 'two', type: 'xiyou_choose_ruyi_staff', nextId: null, x: 100, y: 0 },
    ] }
    const focused = vi.fn()
    render(
      <RuyiStaffBlocklyWorkspaceAdapterProvider adapter={{ create: () => new Blockly.Workspace() }}>
        <RuyiStaffBlocklyWorkspace draft={multi} onDraftChange={() => ({ status: 'saved' })} onRun={() => undefined} focusBlockId="one" onFocusHandled={focused} />
      </RuyiStaffBlocklyWorkspaceAdapterProvider>,
    )
    expect(screen.getByText(/\u591a\u4e2a\u5f00\u5934/)).toBeVisible()
    expect(document.activeElement).toHaveTextContent('\u67e5\u770b\u4e09\u4ef6\u5175\u5668\u91cd\u91cf')
    expect(focused).toHaveBeenCalledOnce()
  })

  it('keeps one global save authority when two draft saves settle newest-first', async () => {
    let resolveFirst!: (value: { status: 'unsaved' }) => void
    let resolveSecond!: (value: { status: 'saved' }) => void
    const first = new Promise<{ status: 'unsaved' }>((resolve) => { resolveFirst = resolve })
    const second = new Promise<{ status: 'saved' }>((resolve) => { resolveSecond = resolve })
    const onDraftChange = vi.fn()
      .mockReturnValueOnce(first)
      .mockReturnValueOnce(second)
    const { workspace } = setup(EMPTY, onDraftChange)
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u67e5\u770b\u4e09\u4ef6\u5175\u5668\u91cd\u91cf' }))
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u9009\u62e9\u5b9a\u6d77\u795e\u9488\uff0813500\u65a4\uff09' }))
    expect(onDraftChange).toHaveBeenCalledTimes(2)
    await act(async () => resolveSecond({ status: 'saved' }))
    await act(async () => resolveFirst({ status: 'unsaved' }))
    expect(workspace.getAllBlocks(false)).toHaveLength(2)
    expect(screen.queryByText(/\u5c1a\u672a\u4fdd\u5b58/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '\u91cd\u8bd5\u4fdd\u5b58' })).not.toBeInTheDocument()
  })

  it('ignores a pending draft result after the workspace unmounts', async () => {
    let resolveSave!: (value: { status: 'unsaved' }) => void
    const pending = new Promise<{ status: 'unsaved' }>((resolve) => { resolveSave = resolve })
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { view } = setup(EMPTY, () => pending)
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u67e5\u770b\u4e09\u4ef6\u5175\u5668\u91cd\u91cf' }))
    view.unmount()
    await act(async () => resolveSave({ status: 'unsaved' }))
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringMatching(/unmounted|state update/i))
  })

  it('shows and focuses a real disconnected block diagnostic', () => {
    const workspace = new Blockly.Workspace()
    const onRun = vi.fn<(result: RuyiCompileResult) => void>()
    const onFocusHandled = vi.fn()
    const adapter = { create: () => workspace }
    const view = render(
      <RuyiStaffBlocklyWorkspaceAdapterProvider adapter={adapter}>
        <RuyiStaffBlocklyWorkspace draft={EMPTY} onDraftChange={() => ({ status: 'saved' })} onRun={onRun} focusBlockId={null} onFocusHandled={onFocusHandled} />
      </RuyiStaffBlocklyWorkspaceAdapterProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '加入：查看三件兵器重量' }))
    const block = workspace.getTopBlocks(false)[0]
    block.getPreviousBlock = () => block
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))
    expect(onRun).toHaveBeenLastCalledWith({ ok: false, trace: [], diagnostics: [
      { code: 'invalid-connection', sourceBlockId: block.id, concept: 'program-structure' },
    ] })
    expect(screen.getByText(/有连接没有接好/)).toBeVisible()
    view.rerender(
      <RuyiStaffBlocklyWorkspaceAdapterProvider adapter={adapter}>
        <RuyiStaffBlocklyWorkspace draft={EMPTY} onDraftChange={() => ({ status: 'saved' })} onRun={onRun} focusBlockId={block.id} onFocusHandled={onFocusHandled} />
      </RuyiStaffBlocklyWorkspaceAdapterProvider>,
    )
    expect(document.activeElement).toHaveTextContent('查看三件兵器重量')
    expect(onFocusHandled).toHaveBeenCalledOnce()
  })

  it('shows and focuses a real unknown Blockly block diagnostic', async () => {
    if (!Blockly.Blocks.xiyou_unknown_ruyi_test) {
      Blockly.defineBlocksWithJsonArray([{ type: 'xiyou_unknown_ruyi_test', message0: '未知指令', previousStatement: null, nextStatement: null }])
    }
    const workspace = new Blockly.Workspace()
    const onRun = vi.fn<(result: RuyiCompileResult) => void>()
    const onFocusHandled = vi.fn()
    const adapter = { create: () => workspace }
    const view = render(
      <RuyiStaffBlocklyWorkspaceAdapterProvider adapter={adapter}>
        <RuyiStaffBlocklyWorkspace draft={EMPTY} onDraftChange={() => ({ status: 'saved' })} onRun={onRun} focusBlockId={null} onFocusHandled={onFocusHandled} />
      </RuyiStaffBlocklyWorkspaceAdapterProvider>,
    )
    act(() => { workspace.newBlock('xiyou_unknown_ruyi_test', 'unknown-source') })
    await waitFor(() => expect(screen.getByText(/发现无法识别的积木/)).toBeVisible())
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))
    expect(onRun).toHaveBeenLastCalledWith({ ok: false, trace: [], diagnostics: [
      { code: 'unknown-block', sourceBlockId: 'unknown-source', concept: 'program-structure' },
    ] })
    view.rerender(
      <RuyiStaffBlocklyWorkspaceAdapterProvider adapter={adapter}>
        <RuyiStaffBlocklyWorkspace draft={EMPTY} onDraftChange={() => ({ status: 'saved' })} onRun={onRun} focusBlockId="unknown-source" onFocusHandled={onFocusHandled} />
      </RuyiStaffBlocklyWorkspaceAdapterProvider>,
    )
    expect(document.activeElement).toHaveTextContent('无法识别的积木')
    expect(onFocusHandled).toHaveBeenCalledOnce()
  })

  it('uses Enter to add, move, delete and run the same real workspace', () => {
    const { workspace, onRun } = setup()
    fireEvent.keyDown(screen.getByRole('button', { name: '加入：查看三件兵器重量' }), { key: 'Enter' })
    fireEvent.keyDown(screen.getByRole('button', { name: '加入：选择大捍刀（3600斤）' }), { key: 'Enter' })
    fireEvent.keyDown(screen.getByRole('button', { name: '加入：缩小定海神针' }), { key: 'Enter' })
    expect(workspace.getAllBlocks(false)).toHaveLength(3)
    fireEvent.keyDown(screen.getByRole('button', { name: '上移：缩小定海神针' }), { key: 'Enter' })
    fireEvent.keyDown(screen.getByRole('button', { name: '删除：选择大捍刀（3600斤）' }), { key: 'Enter' })
    fireEvent.keyDown(screen.getByLabelText('Blockly 积木编辑区'), { key: 'Enter' })
    expect(onRun).toHaveBeenLastCalledWith({ ok: true, trace: [
      expect.objectContaining({ opcode: 'inspect_weights' }),
      expect.objectContaining({ opcode: 'shrink_ruyi_staff' }),
    ] })
  })

  it('allows block 500, then disables every add button with a child-readable capacity message', async () => {
    const { workspace } = setup(chainDraft(499))
    const addButtons = screen.getAllByRole('button', { name: /^加入：/ })
    expect(addButtons.every((button) => !button.hasAttribute('disabled'))).toBe(true)

    fireEvent.click(addButtons[0])

    await waitFor(() => expect(workspace.getAllBlocks(false)).toHaveLength(500))
    expect(screen.getAllByRole('button', { name: /^加入：/ }).every((button) => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByText('指令卷轴已经装满500块积木。先删除一些积木，才能继续加入。')).toBeVisible()
  })

  it('keeps a 500-block draft movable, deletable and runnable while preventing block 501', async () => {
    const { workspace, onRun } = setup(chainDraft(500))
    const addButton = screen.getByRole('button', { name: '加入：查看三件兵器重量' })
    expect(addButton).toBeDisabled()
    fireEvent.click(addButton)
    expect(workspace.getAllBlocks(false)).toHaveLength(500)

    fireEvent.click(screen.getAllByRole('button', { name: /^上移：/ })[1])
    fireEvent.click(screen.getAllByRole('button', { name: /^删除：/ })[0])
    await waitFor(() => expect(workspace.getAllBlocks(false)).toHaveLength(499))
    expect(addButton).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
  })

  it('rolls back an out-of-band 501st Blockly block before draft persistence', async () => {
    const onDraftChange = vi.fn(() => ({ status: 'saved' as const }))
    const { workspace } = setup(chainDraft(500), onDraftChange)
    onDraftChange.mockClear()

    act(() => { workspace.newBlock('xiyou_inspect_weights', 'overflow-501') })

    await waitFor(() => expect(workspace.getAllBlocks(false)).toHaveLength(500))
    expect(workspace.getBlockById('overflow-501')).toBeNull()
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(screen.getByText('指令卷轴最多放500块积木，刚加入的积木没有保存。')).toBeVisible()
  })

  it('turns a synchronous draft persistence throw into one visible retry that can recover', async () => {
    const onDraftChange = vi.fn()
      .mockImplementationOnce(() => { throw new Error('synchronous persistence failure') })
      .mockReturnValueOnce({ status: 'saved' as const })
    setup(EMPTY, onDraftChange)

    fireEvent.click(screen.getByRole('button', { name: '加入：查看三件兵器重量' }))

    expect(await screen.findByText('这次积木更改还没有保存。')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '重试保存积木' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '重试保存积木' })).not.toBeInTheDocument())
    expect(onDraftChange).toHaveBeenCalledTimes(2)
  })

  it('keeps a synchronous run handoff error visible instead of interrupting the workspace', () => {
    const workspace = new Blockly.Workspace()
    const onRun = vi.fn(() => { throw new Error('run persistence handoff failed') })
    render(
      <RuyiStaffBlocklyWorkspaceAdapterProvider adapter={{ create: () => workspace }}>
        <RuyiStaffBlocklyWorkspace draft={chainDraft(1)} onDraftChange={() => ({ status: 'saved' })} onRun={onRun} focusBlockId={null} onFocusHandled={() => undefined} />
      </RuyiStaffBlocklyWorkspaceAdapterProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))

    expect(screen.getByText('运行结果还没有交给任务保存，请再执行一次。')).toBeVisible()
    expect(workspace.getAllBlocks(false)).toHaveLength(1)
  })
})
