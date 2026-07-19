import * as Blockly from 'blockly'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  compileFourSeasRegaliaWorkspace,
  type FourSeasCompileResult,
} from '../blockly/fourSeasRegaliaCompiler'
import type { FourSeasWorkspaceDraftV1 } from '../blockly/fourSeasRegaliaDraft'
import {
  FourSeasRegaliaBlocklyWorkspace,
  FourSeasRegaliaBlocklyWorkspaceAdapterProvider,
} from './FourSeasRegaliaBlocklyWorkspace'

const EMPTY: FourSeasWorkspaceDraftV1 = { version: 1, blocks: [] }
const FULL: FourSeasWorkspaceDraftV1 = {
  version: 1,
  blocks: [
    { id: 'armor-gift', type: 'xiyou_receive_golden_armor', nextId: 'crown-gift', parentBlockId: 'collect', x: 20, y: 80 },
    { id: 'armor-wear', type: 'xiyou_wear_armor', nextId: 'boots-wear', parentBlockId: 'equip', x: 20, y: 180 },
    { id: 'boots-gift', type: 'xiyou_receive_cloud_boots', nextId: 'armor-gift', parentBlockId: 'collect', x: 20, y: 60 },
    { id: 'boots-wear', type: 'xiyou_wear_boots', nextId: null, parentBlockId: 'equip', x: 20, y: 200 },
    { id: 'collect', type: 'xiyou_collect_gifts', nextId: 'equip', parentBlockId: null, x: 10, y: 40 },
    { id: 'crown-gift', type: 'xiyou_receive_purple_crown', nextId: null, parentBlockId: 'collect', x: 20, y: 100 },
    { id: 'crown-wear', type: 'xiyou_wear_crown', nextId: 'armor-wear', parentBlockId: 'equip', x: 20, y: 160 },
    { id: 'equip', type: 'xiyou_equip_regalia', nextId: 'verify', parentBlockId: null, x: 10, y: 140 },
    { id: 'request', type: 'xiyou_request_regalia', nextId: 'collect', parentBlockId: null, x: 10, y: 10 },
    { id: 'verify', type: 'xiyou_verify_regalia', nextId: null, parentBlockId: null, x: 10, y: 240 },
  ],
}

type SaveResult = { status: 'saved' | 'unsaved' | 'conflict' }
type Saver = (draft: FourSeasWorkspaceDraftV1) => SaveResult | Promise<SaveResult>

function setup(
  draft: FourSeasWorkspaceDraftV1 = EMPTY,
  onDraftChange: Saver = vi.fn(() => ({ status: 'saved' as const })),
  locked = false,
) {
  const workspace = new Blockly.Workspace()
  const onRun = vi.fn<(result: FourSeasCompileResult) => void>()
  const adapter = { create: () => workspace }
  const renderWorkspace = (
    nextDraft: FourSeasWorkspaceDraftV1 = draft,
    nextLocked = locked,
    focusBlockId: string | null = null,
    onFocusHandled: () => void = () => undefined,
  ) => (
    <FourSeasRegaliaBlocklyWorkspaceAdapterProvider adapter={adapter}>
      <FourSeasRegaliaBlocklyWorkspace
        draft={nextDraft}
        onDraftChange={onDraftChange}
        onRun={onRun}
        focusBlockId={focusBlockId}
        onFocusHandled={onFocusHandled}
        locked={nextLocked}
      />
    </FourSeasRegaliaBlocklyWorkspaceAdapterProvider>
  )
  const view = render(renderWorkspace())
  return { workspace, onRun, onDraftChange, renderWorkspace, view }
}

function addFullProgram() {
  for (const name of [
    '加入主任务：向东海龙王请求披挂',
    '加入主任务：收齐三海宝物',
    '加入主任务：穿戴整副披挂',
    '加入主任务：检查披挂是否齐全',
    '加入收集子任务：收下北海的藕丝步云履',
    '加入收集子任务：收下西海的锁子黄金甲',
    '加入收集子任务：收下南海的凤翅紫金冠',
    '加入穿戴子任务：戴上凤翅紫金冠',
    '加入穿戴子任务：穿上锁子黄金甲',
    '加入穿戴子任务：踏上藕丝步云履',
  ]) fireEvent.click(screen.getByRole('button', { name }))
}

function traceFromLastRun(onRun: ReturnType<typeof vi.fn>): Extract<FourSeasCompileResult, { ok: true }>['trace'] {
  const result = onRun.mock.calls.at(-1)?.[0] as FourSeasCompileResult
  if (!result?.ok) throw new Error(`expected a successful compile: ${JSON.stringify(result)}`)
  return result.trace
}

describe('FourSeasRegaliaBlocklyWorkspace', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('builds the visible nested program in one real Blockly graph and runs the exact compiler trace', () => {
    const { workspace, onRun } = setup()
    addFullProgram()
    expect(workspace.getTopBlocks(false)).toHaveLength(1)
    expect(workspace.getBlockById(workspace.getTopBlocks(false)[0].id)).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))

    const trace = traceFromLastRun(onRun)
    expect(trace.map(({ opcode }) => opcode)).toEqual([
      'request_regalia', 'collect_gifts', 'receive_cloud_boots', 'receive_golden_armor',
      'receive_purple_crown', 'equip_regalia', 'wear_crown', 'wear_armor', 'wear_boots',
      'verify_regalia',
    ])
    const collect = trace.find(({ opcode }) => opcode === 'collect_gifts')!
    const equip = trace.find(({ opcode }) => opcode === 'equip_regalia')!
    expect(trace.filter(({ opcode }) => opcode.startsWith('receive_')).every(({ parentBlockId }) => parentBlockId === collect.sourceBlockId)).toBe(true)
    expect(trace.filter(({ opcode }) => opcode.startsWith('wear_')).every(({ parentBlockId }) => parentBlockId === equip.sourceBlockId)).toBe(true)
    expect(trace.every(({ instructionId, sourceBlockId }) => instructionId === `instruction:${sourceBlockId}`)).toBe(true)
    expect(onRun).toHaveBeenLastCalledWith(compileFourSeasRegaliaWorkspace(workspace))
  })

  it('preserves a wrong visible gift order instead of silently correcting it', () => {
    const { onRun } = setup()
    for (const name of [
      '加入主任务：向东海龙王请求披挂',
      '加入主任务：收齐三海宝物',
      '加入主任务：穿戴整副披挂',
      '加入主任务：检查披挂是否齐全',
      '加入收集子任务：收下南海的凤翅紫金冠',
      '加入收集子任务：收下西海的锁子黄金甲',
      '加入收集子任务：收下北海的藕丝步云履',
      '加入穿戴子任务：戴上凤翅紫金冠',
    ]) fireEvent.click(screen.getByRole('button', { name }))
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))
    expect(traceFromLastRun(onRun).filter(({ opcode }) => opcode.startsWith('receive_')).map(({ opcode }) => opcode)).toEqual([
      'receive_purple_crown', 'receive_golden_armor', 'receive_cloud_boots',
    ])
  })

  it('moves within one real child scope and recompiles the changed connections', () => {
    const { workspace, onRun } = setup(FULL)
    fireEvent.click(screen.getByRole('button', { name: '上移收集子任务：收下西海的锁子黄金甲' }))
    expect(workspace.getBlockById('collect')?.getInputTargetBlock('GIFTS')?.id).toBe('armor-gift')
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))
    expect(traceFromLastRun(onRun).filter(({ parentBlockId }) => parentBlockId === 'collect').map(({ sourceBlockId }) => sourceBlockId)).toEqual([
      'armor-gift', 'boots-gift', 'crown-gift',
    ])
  })

  it('moves a child across containers and exposes the new real parentBlockId', () => {
    const { workspace, onRun } = setup(FULL)
    fireEvent.click(screen.getByRole('button', { name: '移到穿戴任务组：收下南海的凤翅紫金冠' }))
    expect(workspace.getBlockById('crown-gift')?.getSurroundParent()?.id).toBe('equip')
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))
    expect(traceFromLastRun(onRun).find(({ sourceBlockId }) => sourceBlockId === 'crown-gift')?.parentBlockId).toBe('equip')
  })

  it('derives one tree summary after direct Blockly change, helper delete, and clear', async () => {
    const { workspace } = setup(FULL)
    expect(screen.getByRole('list', { name: '四海披挂程序树' })).toHaveTextContent('收集子任务')
    act(() => workspace.getBlockById('crown-gift')!.dispose(false))
    await waitFor(() => expect(screen.queryByText('收下南海的凤翅紫金冠')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '删除：穿上锁子黄金甲' }))
    expect(workspace.getBlockById('armor-wear')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '清空并重新开始' }))
    expect(workspace.getAllBlocks(false)).toHaveLength(0)
    expect(screen.queryByRole('list', { name: '四海披挂程序树' })).not.toBeInTheDocument()
  })

  it('retains a visible edit after save rejection and retries the same draft', async () => {
    const onDraftChange = vi.fn()
      .mockResolvedValueOnce({ status: 'unsaved' as const })
      .mockResolvedValueOnce({ status: 'saved' as const })
    const { workspace } = setup(EMPTY, onDraftChange)
    fireEvent.click(screen.getByRole('button', { name: '加入主任务：向东海龙王请求披挂' }))
    expect(await screen.findByText('这次积木更改还没有保存。')).toBeVisible()
    expect(workspace.getAllBlocks(false)).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '重试保存积木' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: '重试保存积木' })).not.toBeInTheDocument())
    expect(onDraftChange.mock.calls[1][0]).toEqual(onDraftChange.mock.calls[0][0])
  })

  it('ignores stale save results and exposes a current conflict', async () => {
    let resolveFirst!: (value: SaveResult) => void
    let resolveSecond!: (value: SaveResult) => void
    const first = new Promise<SaveResult>((resolve) => { resolveFirst = resolve })
    const second = new Promise<SaveResult>((resolve) => { resolveSecond = resolve })
    const onDraftChange = vi.fn().mockReturnValueOnce(first).mockReturnValueOnce(second)
    setup(EMPTY, onDraftChange)
    fireEvent.click(screen.getByRole('button', { name: '加入主任务：向东海龙王请求披挂' }))
    fireEvent.click(screen.getByRole('button', { name: '加入主任务：检查披挂是否齐全' }))
    await act(async () => resolveSecond({ status: 'conflict' }))
    await act(async () => resolveFirst({ status: 'saved' }))
    expect(screen.getByText('其他标签页已经更新，这次积木更改暂停保存。')).toBeVisible()
  })

  it('leaves the current graph unchanged when an incoming draft is corrupt', async () => {
    const { workspace, renderWorkspace, view } = setup(FULL)
    const before = workspace.getAllBlocks(false).map(({ id }) => id).sort()
    const corrupt = {
      version: 1,
      blocks: [{ ...FULL.blocks[0], parentBlockId: 'missing-container' }],
    } as FourSeasWorkspaceDraftV1
    view.rerender(renderWorkspace(corrupt))
    expect(await screen.findByText('传入的积木草稿无法安全恢复，当前工作区保持不变。')).toBeVisible()
    expect(workspace.getAllBlocks(false).map(({ id }) => id).sort()).toEqual(before)
  })

  it('locks helpers and atomically restores the accepted graph after a native mutation', async () => {
    const { workspace, renderWorkspace, view, onRun } = setup(FULL)
    view.rerender(renderWorkspace(FULL, true))
    expect(screen.getByText('通关结果正在处理，先不要改动指令卷轴。保存完成后就能继续操作。')).toBeVisible()
    expect(screen.getAllByRole('button', { name: /^加入/ }).every((button) => button.hasAttribute('disabled'))).toBe(true)
    act(() => {
      workspace.getBlockById('armor-gift')!.dispose(false)
      workspace.newBlock('xiyou_wear_crown', 'locked-paste')
    })
    await waitFor(() => expect(workspace.getBlockById('armor-gift')).not.toBeNull())
    expect(workspace.getBlockById('locked-paste')).toBeNull()
    fireEvent.keyDown(screen.getByLabelText('Blockly 积木编辑区'), { key: 'Enter' })
    expect(onRun).not.toHaveBeenCalled()
  })

  it('focuses the exact block summary, falls back to the workspace, and handles Enter controls', () => {
    const handled = vi.fn()
    const { workspace, renderWorkspace, view, onRun } = setup(FULL)
    view.rerender(renderWorkspace(FULL, false, 'armor-gift', handled))
    expect(document.activeElement).toHaveTextContent('收下西海的锁子黄金甲')
    expect(handled).toHaveBeenCalledOnce()
    fireEvent.keyDown(screen.getByRole('button', { name: '上移收集子任务：收下西海的锁子黄金甲' }), { key: 'Enter' })
    expect(workspace.getBlockById('collect')?.getInputTargetBlock('GIFTS')?.id).toBe('armor-gift')
    fireEvent.keyDown(screen.getByLabelText('Blockly 积木编辑区'), { key: 'Enter' })
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))

    view.rerender(renderWorkspace(FULL, false, 'missing', handled))
    expect(screen.getByLabelText('Blockly 积木编辑区')).toHaveFocus()
  })

  it('disables every add helper at capacity while leaving delete and run available', () => {
    const full: FourSeasWorkspaceDraftV1 = {
      version: 1,
      blocks: Array.from({ length: 500 }, (_, index) => ({
        id: `block-${index}`,
        type: 'xiyou_request_regalia' as const,
        nextId: index === 499 ? null : `block-${index + 1}`,
        parentBlockId: null,
        x: 0,
        y: index,
      })),
    }
    const { workspace, onRun } = setup(full)
    expect(screen.getAllByRole('button', { name: /^加入/ }).every((button) => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByText('指令卷轴已经装满500块积木。先删除一些积木，才能继续加入。')).toBeVisible()
    fireEvent.click(screen.getAllByRole('button', { name: /^删除：/ })[0])
    expect(workspace.getAllBlocks(false)).toHaveLength(499)
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))
    expect(onRun).toHaveBeenCalledWith(expect.objectContaining({ ok: true }))
  }, 20_000)

  it('closes delayed flyouts and fits the real nested graph after a narrow restore and resize', async () => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query === '(max-width: 600px)', media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(),
      removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })))
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(800)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, right: 800, bottom: 600, left: 0,
      width: 800, height: 600, toJSON: () => ({}),
    })
    const hide = vi.fn()
    const setAutoClose = vi.fn()
    let workspace!: Blockly.WorkspaceSvg
    let resizeContents!: ReturnType<typeof vi.spyOn>
    let zoomToFit!: ReturnType<typeof vi.spyOn>
    let translate!: ReturnType<typeof vi.spyOn>
    const adapter = { create: (host: HTMLDivElement) => {
      workspace = Blockly.inject(host, { sounds: false })
      vi.spyOn(workspace, 'getFlyout').mockReturnValue({
        autoClose: false,
        setAutoClose,
        hide,
        getWidth: () => 0,
        getHeight: () => 0,
      } as never)
      resizeContents = vi.spyOn(workspace, 'resizeContents')
      zoomToFit = vi.spyOn(workspace, 'zoomToFit')
      translate = vi.spyOn(workspace, 'translate')
      return workspace
    } }
    const view = render(
      <FourSeasRegaliaBlocklyWorkspaceAdapterProvider adapter={adapter}>
        <FourSeasRegaliaBlocklyWorkspace draft={FULL} onDraftChange={() => ({ status: 'saved' })} onRun={() => undefined} focusBlockId={null} onFocusHandled={() => undefined} />
      </FourSeasRegaliaBlocklyWorkspaceAdapterProvider>,
    )
    act(() => window.dispatchEvent(new Event('resize')))
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 60)))
    expect(setAutoClose).toHaveBeenCalledWith(true)
    expect(hide).toHaveBeenCalled()
    expect(resizeContents).toHaveBeenCalled()
    expect(zoomToFit).toHaveBeenCalled()
    expect(translate).toHaveBeenCalledWith(0, 0)
    expect(workspace.getBlockById('collect')?.getInputTargetBlock('GIFTS')).not.toBeNull()
    expect(workspace.getBlockById('equip')?.getInputTargetBlock('GEAR')).not.toBeNull()
    view.unmount()
  })
})
