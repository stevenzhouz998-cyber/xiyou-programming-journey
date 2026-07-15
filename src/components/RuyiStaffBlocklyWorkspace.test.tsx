import * as Blockly from 'blockly'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { RuyiCompileResult } from '../blockly/ruyiStaffCompiler'
import type { RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft'
import {
  RuyiStaffBlocklyWorkspace,
  RuyiStaffBlocklyWorkspaceAdapterProvider,
} from './RuyiStaffBlocklyWorkspace'

const EMPTY: RuyiWorkspaceDraftV1 = { version: 1, blocks: [] }

function setup(draft = EMPTY, onDraftChange = vi.fn(() => ({ status: 'saved' as const }))) {
  const workspace = new Blockly.Workspace()
  const onRun = vi.fn<(result: RuyiCompileResult) => void>()
  render(
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
  return { workspace, onRun, onDraftChange }
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

  it('keeps a visible edit after a failed save and retries the identical draft', async () => {
    const onDraftChange = vi.fn()
      .mockReturnValueOnce({ status: 'unsaved' as const })
      .mockReturnValueOnce({ status: 'saved' as const })
    const { workspace } = setup(EMPTY, onDraftChange)
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u67e5\u770b\u4e09\u4ef6\u5175\u5668\u91cd\u91cf' }))
    expect(screen.getByText(/\u5c1a\u672a\u4fdd\u5b58/)).toBeVisible()
    expect(workspace.getAllBlocks(false)).toHaveLength(1)
    const failedDraft = onDraftChange.mock.calls[0][0]
    fireEvent.click(screen.getByRole('button', { name: '\u91cd\u8bd5\u4fdd\u5b58' }))
    await waitFor(() => expect(onDraftChange).toHaveBeenCalledTimes(2))
    expect(onDraftChange.mock.calls[1][0]).toEqual(failedDraft)
  })
})
