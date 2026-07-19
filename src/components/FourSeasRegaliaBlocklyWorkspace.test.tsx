import * as Blockly from 'blockly'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  FOUR_SEAS_BLOCK_LABELS,
  type FourSeasBlockType,
} from '../blockly/fourSeasRegaliaBlocks'
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

function oneBlockDraft(id: string): FourSeasWorkspaceDraftV1 {
  return {
    version: 1,
    blocks: [{
      id,
      type: 'xiyou_request_regalia',
      nextId: null,
      parentBlockId: null,
      x: 0,
      y: 0,
    }],
  }
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

  it('uses the registered Blockly catalogue as the only player-facing block label source', () => {
    expect(FOUR_SEAS_BLOCK_LABELS).toEqual({
      xiyou_request_regalia: '向东海龙王请求披挂',
      xiyou_collect_gifts: '收齐三海宝物',
      xiyou_receive_cloud_boots: '收下北海的藕丝步云履',
      xiyou_receive_golden_armor: '收下西海的锁子黄金甲',
      xiyou_receive_purple_crown: '收下南海的凤翅紫金冠',
      xiyou_equip_regalia: '穿戴整副披挂',
      xiyou_wear_crown: '戴上凤翅紫金冠',
      xiyou_wear_armor: '穿上锁子黄金甲',
      xiyou_wear_boots: '踏上藕丝步云履',
      xiyou_verify_regalia: '检查披挂是否齐全',
    })
    const { workspace } = setup(FULL)
    const tree = screen.getByRole('list', { name: '四海披挂程序树' })
    for (const block of workspace.getAllBlocks(false)) {
      const type = block.type as FourSeasBlockType
      expect(block.toString()).toContain(FOUR_SEAS_BLOCK_LABELS[type])
      expect(block.getTooltip()).toBe(FOUR_SEAS_BLOCK_LABELS[type])
      expect(tree).toHaveTextContent(FOUR_SEAS_BLOCK_LABELS[type])
    }
    for (const label of Object.values(FOUR_SEAS_BLOCK_LABELS)) {
      expect(screen.getByRole('button', { name: new RegExp(`^\u52a0\u5165.*：${label}$`) })).toBeVisible()
    }
    expect(tree).toHaveTextContent('踏上藕丝步云履')
    expect(tree).not.toHaveTextContent('穿上藕丝步云履')
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

  it.each(['saved', 'unsaved', 'conflict'] as const)(
    'invalidates an old pending %s result after a different external draft applies',
    async (status) => {
      let settleOld!: (value: SaveResult) => void
      const oldSave = new Promise<SaveResult>((resolve) => { settleOld = resolve })
      const onDraftChange = vi.fn(() => oldSave)
      const { workspace, renderWorkspace, view } = setup(EMPTY, onDraftChange)

      fireEvent.click(screen.getByRole('button', { name: '加入主任务：向东海龙王请求披挂' }))
      expect(onDraftChange).toHaveBeenCalledOnce()
      view.rerender(renderWorkspace(oneBlockDraft('external-current')))
      expect(workspace.getAllBlocks(false).map(({ id }) => id)).toEqual(['external-current'])

      await act(async () => settleOld({ status }))
      expect(screen.queryByText('这次积木更改还没有保存。')).not.toBeInTheDocument()
      expect(screen.queryByText('其他标签页已经更新，这次积木更改暂停保存。')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '重试保存积木' })).not.toBeInTheDocument()
      expect(workspace.getAllBlocks(false).map(({ id }) => id)).toEqual(['external-current'])
    },
  )

  it('keeps the current save alive when its exact local draft is echoed through props', async () => {
    let settle!: (value: SaveResult) => void
    const pending = new Promise<SaveResult>((resolve) => { settle = resolve })
    const onDraftChange = vi.fn<Saver>(() => pending)
    const { renderWorkspace, view } = setup(EMPTY, onDraftChange)
    fireEvent.click(screen.getByRole('button', { name: '加入主任务：向东海龙王请求披挂' }))
    const localEcho = structuredClone(onDraftChange.mock.calls[0][0])
    view.rerender(renderWorkspace(localEcho))

    await act(async () => settle({ status: 'unsaved' }))
    expect(screen.getByText('这次积木更改还没有保存。')).toBeVisible()
    expect(screen.getByRole('button', { name: '重试保存积木' })).toBeEnabled()
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

  it('recovers the accepted graph after incoming apply and ordinary rollback both fail', async () => {
    const { workspace, renderWorkspace, view } = setup(FULL)
    const acceptedIds = workspace.getAllBlocks(false).map(({ id }) => id).sort()
    const realNewBlock = workspace.newBlock.bind(workspace)
    let failAcceptedOnce = true
    workspace.newBlock = ((type: string, id?: string) => {
      if (id === 'incoming-apply') throw new Error('incoming apply failed')
      if (id === 'armor-gift' && failAcceptedOnce) {
        failAcceptedOnce = false
        throw new Error('ordinary rollback failed')
      }
      return realNewBlock(type, id)
    }) as typeof workspace.newBlock

    view.rerender(renderWorkspace(oneBlockDraft('incoming-apply')))

    expect(await screen.findByText('外部草稿载入中断，已恢复到上一份安全草稿。')).toBeVisible()
    expect(workspace.getAllBlocks(false).map(({ id }) => id).sort()).toEqual(acceptedIds)
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeEnabled()
    expect(screen.getByLabelText('Blockly 积木编辑区')).not.toHaveAttribute('inert')
  })

  it('fails closed when aggregate rollback and accepted recovery fail, then unlocks for a legal external draft', async () => {
    const { workspace, renderWorkspace, view, onRun, onDraftChange } = setup(FULL)
    const realNewBlock = workspace.newBlock.bind(workspace)
    workspace.newBlock = ((type: string, id?: string) => {
      if (id === 'incoming-broken' || id === 'armor-gift') throw new Error(`cannot create ${String(id)}`)
      return realNewBlock(type, id)
    }) as typeof workspace.newBlock

    view.rerender(renderWorkspace(oneBlockDraft('incoming-broken')))

    expect(await screen.findByText('工作区可能已改变，现在不可执行。请重新载入一份合法草稿。')).toBeVisible()
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /^加入/ }).every((button) => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByLabelText('Blockly 积木编辑区')).toHaveAttribute('inert')
    fireEvent.keyDown(screen.getByLabelText('Blockly 积木编辑区'), { key: 'Enter' })
    expect(onRun).not.toHaveBeenCalled()
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('list', { name: '四海披挂程序树' })).not.toBeInTheDocument()

    let native!: Blockly.Block
    act(() => { native = workspace.newBlock('xiyou_request_regalia', 'native-after-failure') })
    await waitFor(() => expect(screen.getByRole('list', { name: '四海披挂程序树' })).toHaveTextContent('向东海龙王请求披挂'))
    expect(native.isMovable()).toBe(false)
    expect(native.isDeletable()).toBe(false)
    expect(native.isEditable()).toBe(false)

    act(() => native.moveBy(16, 12))
    await waitFor(() => expect(workspace.getBlockById('native-after-failure')?.getRelativeToSurfaceXY()).toMatchObject({ x: 16, y: 12 }))
    expect(screen.getByRole('list', { name: '四海披挂程序树' })).toHaveTextContent('向东海龙王请求披挂')

    act(() => workspace.getBlockById('native-after-failure')!.dispose(false))
    await waitFor(() => expect(screen.queryByRole('list', { name: '四海披挂程序树' })).not.toBeInTheDocument())
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(onRun).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /^加入/ }).every((button) => button.hasAttribute('disabled'))).toBe(true)
    expect(screen.getByLabelText('Blockly 积木编辑区')).toHaveAttribute('inert')

    workspace.newBlock = realNewBlock
    view.rerender(renderWorkspace(oneBlockDraft('external-recovered'), true))
    await waitFor(() => expect(workspace.getAllBlocks(false).map(({ id }) => id)).toEqual(['external-recovered']))
    expect(screen.queryByText('工作区可能已改变，现在不可执行。请重新载入一份合法草稿。')).not.toBeInTheDocument()
    expect(screen.getByRole('list', { name: '四海披挂程序树' })).toHaveTextContent('向东海龙王请求披挂')
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeDisabled()
    expect(screen.getByLabelText('Blockly 积木编辑区')).toHaveAttribute('inert')

    view.rerender(renderWorkspace(oneBlockDraft('external-recovered'), false))
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeEnabled()
    expect(screen.getByLabelText('Blockly 积木编辑区')).not.toHaveAttribute('inert')
    expect(onDraftChange).not.toHaveBeenCalled()
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

  it.each([320, 390])('fits both nested scopes in a real %ipx host through every lifecycle edge', async (width) => {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(),
      removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })))
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(260)
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(width)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(260)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, right: width, bottom: 260, left: 0,
      width, height: 260, toJSON: () => ({}),
    })
    const hide = vi.fn()
    const setAutoClose = vi.fn()
    let workspace!: Blockly.WorkspaceSvg
    let resizeContents!: ReturnType<typeof vi.spyOn>
    let zoomToFit!: ReturnType<typeof vi.spyOn>
    let translate!: ReturnType<typeof vi.spyOn>
    const adapter = { create: (host: HTMLDivElement) => {
      workspace = Blockly.inject(host, { sounds: false })
      vi.spyOn(workspace, 'isMovable').mockReturnValue(true)
      vi.spyOn(workspace, 'getFlyout').mockReturnValue({
        autoClose: false,
        setAutoClose,
        hide,
        getWidth: () => 0,
        getHeight: () => 0,
        isVisible: () => false,
      } as never)
      resizeContents = vi.spyOn(workspace, 'resizeContents')
      zoomToFit = vi.spyOn(workspace, 'zoomToFit')
      translate = vi.spyOn(workspace, 'translate')
      return workspace
    } }
    const renderWorkspace = (draft: FourSeasWorkspaceDraftV1, locked = false) => (
      <FourSeasRegaliaBlocklyWorkspaceAdapterProvider adapter={adapter}>
        <FourSeasRegaliaBlocklyWorkspace draft={draft} onDraftChange={() => ({ status: 'saved' })} onRun={() => undefined} focusBlockId={null} onFocusHandled={() => undefined} locked={locked} />
      </FourSeasRegaliaBlocklyWorkspaceAdapterProvider>
    )
    const view = render(renderWorkspace(FULL))
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 60)))
    expect(screen.getByLabelText('Blockly 积木编辑区').getBoundingClientRect()).toMatchObject({ width, height: 260 })
    expect(setAutoClose).toHaveBeenCalledWith(true)
    expect(hide).toHaveBeenCalled()
    expect(resizeContents).toHaveBeenCalled()
    expect(zoomToFit).toHaveBeenCalled()
    expect(translate).toHaveBeenCalledWith(0, 0)
    const firstFitResize = (resizeContents.mock.invocationCallOrder as number[]).find(
      (order: number) => order > setAutoClose.mock.invocationCallOrder[0],
    )
    expect(firstFitResize).toBeDefined()
    expect(hide.mock.invocationCallOrder[0]).toBeLessThan(firstFitResize!)
    expect(workspace.getBlockById('collect')?.getInputTargetBlock('GIFTS')).not.toBeNull()
    expect(workspace.getBlockById('equip')?.getInputTargetBlock('GEAR')).not.toBeNull()
    expect(screen.getByRole('list', { name: '四海披挂程序树' })).toHaveTextContent('收集子任务')
    expect(screen.getByRole('list', { name: '四海披挂程序树' })).toHaveTextContent('穿戴子任务')

    resizeContents.mockClear(); zoomToFit.mockClear(); translate.mockClear(); hide.mockClear()
    act(() => {
      window.dispatchEvent(new Event('resize'))
      window.dispatchEvent(new Event('orientationchange'))
    })
    expect(resizeContents.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(zoomToFit.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(hide).toHaveBeenCalledTimes(2)

    resizeContents.mockClear(); zoomToFit.mockClear()
    const restored = structuredClone(FULL)
    restored.blocks = restored.blocks.map((block) => ({ ...block, x: block.x + 3 }))
    view.rerender(renderWorkspace(restored))
    await act(async () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve())))
    expect(resizeContents).toHaveBeenCalled()
    expect(zoomToFit).toHaveBeenCalled()

    view.rerender(renderWorkspace(restored, true))
    resizeContents.mockClear(); zoomToFit.mockClear()
    act(() => window.dispatchEvent(new Event('orientationchange')))
    expect(resizeContents).not.toHaveBeenCalled()
    view.rerender(renderWorkspace(restored, false))
    expect(resizeContents).toHaveBeenCalled()
    expect(zoomToFit).toHaveBeenCalled()

    resizeContents.mockClear(); zoomToFit.mockClear(); hide.mockClear()
    view.unmount()
    const resizeCallsAfterDispose = resizeContents.mock.calls.length
    const zoomCallsAfterDispose = zoomToFit.mock.calls.length
    const hideCallsAfterDispose = hide.mock.calls.length
    act(() => {
      window.dispatchEvent(new Event('resize'))
      window.dispatchEvent(new Event('orientationchange'))
    })
    await act(async () => new Promise((resolve) => window.setTimeout(resolve, 60)))
    expect(resizeContents).toHaveBeenCalledTimes(resizeCallsAfterDispose)
    expect(zoomToFit).toHaveBeenCalledTimes(zoomCallsAfterDispose)
    expect(hide).toHaveBeenCalledTimes(hideCallsAfterDispose)
  })
})
