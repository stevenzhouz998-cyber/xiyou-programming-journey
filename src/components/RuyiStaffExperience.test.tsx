import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RuyiStaffBattleEvent } from '../battle/types'
import { ProgressProvider, useProgress } from '../context/ProgressContext'
import { createInitialProgress, serializeProgress } from '../progress/progress'
import { CURRENT_PROGRESS_KEY } from '../progress/storage'
import { RuyiStaffExperience } from './RuyiStaffExperience'

const callbacks = vi.hoisted(() => new Map<number, () => void>())
vi.mock('./RuyiStaffScene', () => ({
  RuyiStaffScene: ({ events, replayToken, onPlaybackComplete }: { events: RuyiStaffBattleEvent[]; replayToken: number; onPlaybackComplete?: () => void }) => {
    if (onPlaybackComplete) callbacks.set(replayToken, onPlaybackComplete)
    return <section aria-label="测试定海神针场景" data-replay-token={replayToken}><output data-testid="ruyi-events">{JSON.stringify(events)}</output><button type="button" onClick={onPlaybackComplete}>完成本次场景播放</button></section>
  },
}))

function HintButtons() {
  const { recordMissionHint } = useProgress()
  return <><button onClick={() => recordMissionHint('w1-m2', 'observe')}>观察</button><button onClick={() => recordMissionHint('w1-m2', 'think')}>思路</button></>
}
function renderExperience(onComplete = vi.fn()) {
  render(<ProgressProvider><RuyiStaffExperience reducedMotion={false} muted={false} onComplete={onComplete} /><HintButtons /></ProgressProvider>)
  return onComplete
}
function stored() { return JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY) ?? '{}') }
function token() { return Number(screen.getByLabelText('\u6d4b\u8bd5\u5b9a\u6d77\u795e\u9488\u573a\u666f').getAttribute('data-replay-token')) }

describe('RuyiStaffExperience', () => {
  beforeEach(() => {
    localStorage.clear(); callbacks.clear()
    const progress = createInitialProgress(); progress.privacy.localDataNoticeSeen = true
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress))
  })

  it('records compile failure without recording a battle run and focuses the workspace', async () => {
    renderExperience()
    fireEvent.click(await screen.findByRole('button', { name: '\u6267\u884c\u6218\u6597\u6307\u4ee4' }, { timeout: 5000 }))
    expect(await screen.findByRole('alert')).toHaveTextContent('\u6307\u4ee4\u5377\u8f74\u8fd8\u662f\u7a7a\u7684')
    await waitFor(() => expect(stored().sessions['w1-m2']).toMatchObject({ compileFailures: 1, totalRuns: 0 }))
    fireEvent.click(screen.getByRole('button', { name: '\u56de\u5230\u7f16\u7a0b\u5de5\u4f5c\u53f0' }))
    expect(screen.getByLabelText('Blockly \u79ef\u6728\u7f16\u8f91\u533a')).toHaveFocus()
  })

  it('runs the visible wrong trace, records its source block and never completes it', async () => {
    const onComplete = renderExperience()
    fireEvent.click(await screen.findByRole('button', { name: '\u52a0\u5165\uff1a\u67e5\u770b\u4e09\u4ef6\u5175\u5668\u91cd\u91cf' }))
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u9009\u62e9\u5927\u634d\u5200\uff083600\u65a4\uff09' }))
    fireEvent.click(screen.getByRole('button', { name: '\u6267\u884c\u6218\u6597\u6307\u4ee4' }))
    expect(await screen.findByText('3600\u65a4\u6bd413500\u65a4\u8f7b\uff0c\u5927\u634d\u5200\u4e0d\u662f\u6700\u91cd\u7684\u5175\u5668\u3002')).toBeVisible()
    await waitFor(() => expect(stored().sessions['w1-m2']).toMatchObject({ totalRuns: 1, runtimeFailures: 1, lastRun: { finalState: 'wrong-weapon-selected' } }))
    const session = stored().sessions['w1-m2']
    expect(session.lastRun.diagnostic.sourceBlockId).toBe(session.lastTrace[1].sourceBlockId)
    act(() => callbacks.get(token())?.())
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('completes once only after the successful current run playback and snapshots hint tiers', async () => {
    const onComplete = renderExperience()
    fireEvent.click(screen.getByRole('button', { name: '\u89c2\u5bdf' }))
    fireEvent.click(screen.getByRole('button', { name: '\u89c2\u5bdf' }))
    fireEvent.click(await screen.findByRole('button', { name: '\u52a0\u5165\uff1a\u67e5\u770b\u4e09\u4ef6\u5175\u5668\u91cd\u91cf' }))
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u9009\u62e9\u5b9a\u6d77\u795e\u9488\uff0813500\u65a4\uff09' }))
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u7f29\u5c0f\u5b9a\u6d77\u795e\u9488' }))
    fireEvent.click(screen.getByRole('button', { name: '\u6267\u884c\u6218\u6597\u6307\u4ee4' }))
    const request = token()
    expect(onComplete).not.toHaveBeenCalled()
    act(() => { callbacks.get(request)?.(); callbacks.get(request)?.() })
    expect(onComplete).toHaveBeenCalledOnce()
    expect(onComplete).toHaveBeenCalledWith({ stars: 2, hintsUsed: 1 })
  })

  it('restores and replays a saved success without completion or a new attempt', async () => {
    const progress = createInitialProgress(); progress.privacy.localDataNoticeSeen = true
    progress.sessions['w1-m2'] = {
      workspace: { version: 1, blocks: [
        { id: 'inspect', type: 'xiyou_inspect_weights', nextId: 'staff', x: 0, y: 0 },
        { id: 'staff', type: 'xiyou_choose_ruyi_staff', nextId: 'shrink', x: 0, y: 48 },
        { id: 'shrink', type: 'xiyou_shrink_ruyi_staff', nextId: null, x: 0, y: 96 },
      ] },
      lastTrace: [
        { instructionId: 'instruction:inspect', sourceBlockId: 'inspect', opcode: 'inspect_weights' },
        { instructionId: 'instruction:staff', sourceBlockId: 'staff', opcode: 'choose_ruyi_staff' },
        { instructionId: 'instruction:shrink', sourceBlockId: 'shrink', opcode: 'shrink_ruyi_staff' },
      ],
      lastRun: null, totalRuns: 1, runtimeFailures: 0, compileFailures: 0, usedHintTiers: [],
      conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 }, lastRunAt: '2026-07-16T00:00:00.000Z', savedAt: '2026-07-16T00:00:00.000Z',
    }
    const { runRuyiStaffBattle } = await import('../battle/ruyiStaff')
    progress.sessions['w1-m2'].lastRun = runRuyiStaffBattle(progress.sessions['w1-m2'].lastTrace)
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress))
    const onComplete = renderExperience()
    act(() => callbacks.get(token())?.())
    fireEvent.click(screen.getByRole('button', { name: '\u91cd\u64ad\u6700\u8fd1\u4e00\u6b21' }))
    act(() => callbacks.get(token())?.())
    expect(onComplete).not.toHaveBeenCalled()
    expect(stored().sessions['w1-m2'].totalRuns).toBe(1)
  })
})
