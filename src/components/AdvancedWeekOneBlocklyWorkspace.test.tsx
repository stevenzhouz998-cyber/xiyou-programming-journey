import * as Blockly from 'blockly'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AdvancedWeekOneWorkspaceDraftV1 } from '../blockly/advancedWeekOneDraft'
import type { AdvancedWeekOneCompileResult } from '../blockly/advancedWeekOneCompiler'
import {
  AdvancedWeekOneBlocklyWorkspace,
  AdvancedWeekOneBlocklyWorkspaceAdapterProvider,
} from './AdvancedWeekOneBlocklyWorkspace'

const EMPTY: AdvancedWeekOneWorkspaceDraftV1 = { version: 1, missionId: 'w1-m4', blocks: [] }

describe('AdvancedWeekOneBlocklyWorkspace', () => {
  afterEach(() => vi.restoreAllMocks())

  it('turns child-visible buttons into one actual connected Blockly graph and compiles that graph', () => {
    const workspace = new Blockly.Workspace()
    const onRun = vi.fn<(result: AdvancedWeekOneCompileResult) => void>()
    render(<AdvancedWeekOneBlocklyWorkspaceAdapterProvider adapter={{ create: () => workspace }}>
      <AdvancedWeekOneBlocklyWorkspace missionId="w1-m4" draft={EMPTY} onDraftChange={() => ({ status: 'saved' })} onRun={onRun} locked={false} focusBlockId={null} onFocusHandled={() => undefined} />
    </AdvancedWeekOneBlocklyWorkspaceAdapterProvider>)

    for (const label of [
      '加入主程序：打开名册', '加入主程序：查找猴属记录', '加入查找子程序：读取索引',
      '加入查找子程序：匹配猴属', '加入查找子程序：收集有名记录',
      '加入主程序：处理已找到的名号', '加入主程序：核对名册结果',
    ]) fireEvent.click(screen.getByRole('button', { name: label }))
    fireEvent.click(screen.getByRole('button', { name: '执行幽冥勾名指令' }))

    expect(workspace.getTopBlocks(false)).toHaveLength(1)
    expect(onRun).toHaveBeenLastCalledWith(expect.objectContaining({ ok: true, trace: expect.arrayContaining([
      expect.objectContaining({ opcode: 'underworld_open_register', parentBlockId: null }),
      expect.objectContaining({ opcode: 'underworld_read_index', parentBlockId: expect.any(String) }),
    ]) }))
  })

  it('uses the latest draft-save callback once per visible Blockly edit', async () => {
    const workspace = new Blockly.Workspace()
    const first = vi.fn(() => ({ status: 'saved' as const }))
    const second = vi.fn(() => ({ status: 'conflict' as const }))
    const view = render(<AdvancedWeekOneBlocklyWorkspaceAdapterProvider adapter={{ create: () => workspace }}>
      <AdvancedWeekOneBlocklyWorkspace missionId="w1-m4" draft={EMPTY} onDraftChange={first} onRun={() => undefined} locked={false} focusBlockId={null} onFocusHandled={() => undefined} />
    </AdvancedWeekOneBlocklyWorkspaceAdapterProvider>)

    view.rerender(<AdvancedWeekOneBlocklyWorkspaceAdapterProvider adapter={{ create: () => workspace }}>
      <AdvancedWeekOneBlocklyWorkspace missionId="w1-m4" draft={EMPTY} onDraftChange={second} onRun={() => undefined} locked={false} focusBlockId={null} onFocusHandled={() => undefined} />
    </AdvancedWeekOneBlocklyWorkspaceAdapterProvider>)
    fireEvent.click(screen.getByRole('button', { name: '加入主程序：打开名册' }))

    await waitFor(() => expect(second).toHaveBeenCalledTimes(1))
    expect(first).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('其他标签页已经更新')
  })

  it('summarizes only the child-owned groups and counts without revealing missing blocks or order', () => {
    const workspace = new Blockly.Workspace()
    render(<AdvancedWeekOneBlocklyWorkspaceAdapterProvider adapter={{ create: () => workspace }}>
      <AdvancedWeekOneBlocklyWorkspace missionId="w1-m4" draft={EMPTY} onDraftChange={() => ({ status: 'saved' })} onRun={() => undefined} locked={false} focusBlockId={null} onFocusHandled={() => undefined} decompositionView />
    </AdvancedWeekOneBlocklyWorkspaceAdapterProvider>)

    fireEvent.click(screen.getByRole('button', { name: '加入主程序：打开名册' }))
    fireEvent.click(screen.getByRole('button', { name: '加入主程序：查找猴属记录' }))
    fireEvent.click(screen.getByRole('button', { name: '加入查找子程序：读取索引' }))
    fireEvent.click(screen.getByRole('button', { name: '加入查找子程序：匹配猴属' }))

    const view = screen.getByRole('region', { name: '幽冥勾名当前任务拆分图' })
    expect(view).toHaveTextContent('主程序：2 块积木')
    expect(view).toHaveTextContent('查找猴属记录：2 块子任务积木')
    expect(view).not.toHaveTextContent('收集有名记录')
    expect(view).not.toHaveTextContent(/先|后|缺少/)
  })
})
