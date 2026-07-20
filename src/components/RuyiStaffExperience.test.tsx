import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode, type ComponentType } from 'react'
import type { RuyiStaffBattleEvent, RuyiStaffInstruction } from '../battle/types'
import { runRuyiStaffBattle } from '../battle/ruyiStaff'
import type { RuyiCompileResult } from '../blockly/ruyiStaffCompiler'
import { ProgressProvider, useProgress } from '../context/ProgressContext'
import { createInitialProgress, serializeProgress } from '../progress/progress'
import { createMissionSession, recordRun } from '../progress/session'
import { CURRENT_PROGRESS_KEY } from '../progress/storage'
import type { CoordinatedSaveResult } from '../progress/storageCoordinator'
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
function ExternalReloadButton() {
  const { reloadExternalProgress } = useProgress()
  return <button type="button" onClick={reloadExternalProgress}>载入测试外部会话</button>
}
function renderExperience(onComplete = vi.fn()) {
  render(<ProgressProvider><RuyiStaffExperience reducedMotion={false} muted={false} onComplete={onComplete} /><HintButtons /></ProgressProvider>)
  return onComplete
}
function stored() { return JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY) ?? '{}') }
function token() { return Number(screen.getByLabelText('\u6d4b\u8bd5\u5b9a\u6d77\u795e\u9488\u573a\u666f').getAttribute('data-replay-token')) }

const successfulTrace: RuyiStaffInstruction[] = [
  { instructionId: 'instruction:inspect', sourceBlockId: 'inspect', opcode: 'inspect_weights' },
  { instructionId: 'instruction:staff', sourceBlockId: 'staff', opcode: 'choose_ruyi_staff' },
  { instructionId: 'instruction:shrink', sourceBlockId: 'shrink', opcode: 'shrink_ruyi_staff' },
]
const successfulCompile: RuyiCompileResult = { ok: true, trace: successfulTrace }
const sabreCompile: RuyiCompileResult = { ok: true, trace: [
  { instructionId: 'instruction:inspect-sabre', sourceBlockId: 'inspect-sabre', opcode: 'inspect_weights' },
  { instructionId: 'instruction:sabre', sourceBlockId: 'sabre', opcode: 'choose_sabre' },
  { instructionId: 'instruction:shrink-sabre', sourceBlockId: 'shrink-sabre', opcode: 'shrink_ruyi_staff' },
] }
function ControlledScene({ events, replayToken, onPlaybackComplete }: { events: RuyiStaffBattleEvent[]; replayToken: number; onPlaybackComplete?: () => void }) {
  return <section aria-label="受控定海神针场景" data-replay-token={replayToken}><output data-testid="controlled-events">{JSON.stringify(events)}</output><button type="button" onClick={onPlaybackComplete}>完成受控播放</button></section>
}
function ControlledWorkspace({ onRun }: { onRun: (result: RuyiCompileResult) => void }) {
  return <button type="button" onClick={() => onRun(successfulCompile)}>运行受控成功程序</button>
}
const controlledLoaders: TestLoaders = {
  scene: () => Promise.resolve({ default: ControlledScene }),
  workspace: () => Promise.resolve({ default: ControlledWorkspace }),
}
interface LockProbeProps {
  locked: boolean
  lockReason?: string
  onRun: (result: RuyiCompileResult) => void
  onDraftChange: (draft: { version: 1; blocks: Array<{ id: string; type: 'xiyou_inspect_weights'; nextId: null; x: number; y: number }> }) => unknown
}
let latestLockProbeProps: LockProbeProps | null = null
function LockProbeWorkspace(props: LockProbeProps) {
  latestLockProbeProps = props
  return <section aria-label="锁定探针工作台" data-locked={String(props.locked)} data-lock-reason={props.lockReason}>
    <button type="button" onClick={() => props.onRun(sabreCompile)}>启动大捍刀运行</button>
    <button type="button" onClick={() => props.onRun(successfulCompile)}>强制再次执行</button>
    <button type="button" onClick={() => props.onDraftChange({ version: 1, blocks: [{ id: 'forced-draft', type: 'xiyou_inspect_weights', nextId: null, x: 0, y: 0 }] })}>强制改写草稿</button>
  </section>
}
const lockProbeLoaders: TestLoaders = {
  scene: () => Promise.resolve({ default: ControlledScene }),
  workspace: () => Promise.resolve({ default: LockProbeWorkspace }),
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}
type SaveCoordinator = typeof import('../progress/storageCoordinator').saveProgressCoordinated
function renderControlledExperience(saveProgressCoordinated: SaveCoordinator, onComplete = vi.fn()) {
  render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated } as unknown as typeof import('../progress/storageCoordinator'))}>
    <RuyiStaffExperience reducedMotion muted onComplete={onComplete} loaders={controlledLoaders} />
  </ProgressProvider>)
  return onComplete
}

type TestLoaders = {
  scene: () => Promise<{ default: ComponentType<any> }>
  workspace: () => Promise<{ default: ComponentType<any> }>
}
const LoadableExperience = RuyiStaffExperience as ComponentType<{
  reducedMotion: boolean
  muted: boolean
  onComplete: () => void
  loaders: TestLoaders
  reloadPage: () => void
}>

describe('RuyiStaffExperience', () => {
  beforeEach(() => {
    localStorage.clear(); callbacks.clear(); latestLockProbeProps = null
    const progress = createInitialProgress(); progress.privacy.localDataNoticeSeen = true
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress))
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('records compile failure without recording a battle run and focuses the workspace', async () => {
    renderExperience()
    fireEvent.click(await screen.findByRole('button', { name: '\u6267\u884c\u6218\u6597\u6307\u4ee4' }, { timeout: 5000 }))
    expect(await screen.findByRole('alert')).toHaveTextContent('\u6307\u4ee4\u5377\u8f74\u8fd8\u662f\u7a7a\u7684')
    await waitFor(() => expect(stored().sessions['w1-m2']).toMatchObject({ compileFailures: 1, totalRuns: 0 }))
    fireEvent.click(screen.getByRole('button', { name: '\u56de\u5230\u7f16\u7a0b\u5de5\u4f5c\u53f0' }))
    expect(screen.getByLabelText('Blockly \u79ef\u6728\u7f16\u8f91\u533a')).toHaveFocus()
  })

  it('corrects one wrong trace in the same real workspace and completes only after playback', async () => {
    const onComplete = renderExperience()
    fireEvent.click(await screen.findByRole('button', { name: '\u52a0\u5165\uff1a\u67e5\u770b\u4e09\u4ef6\u5175\u5668\u91cd\u91cf' }))
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u9009\u62e9\u5927\u634d\u5200\uff083600\u65a4\uff09' }))
    fireEvent.click(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u7f29\u5c0f\u5b9a\u6d77\u795e\u9488' }))
    fireEvent.click(screen.getByRole('button', { name: '\u6267\u884c\u6218\u6597\u6307\u4ee4' }))
    expect(await screen.findByText('3600\u65a4\u6bd413500\u65a4\u8f7b\uff0c\u5927\u634d\u5200\u4e0d\u662f\u6700\u91cd\u7684\u5175\u5668\u3002')).toBeVisible()
    await waitFor(() => expect(stored().sessions['w1-m2']).toMatchObject({ totalRuns: 1, runtimeFailures: 1, lastRun: { finalState: 'wrong-weapon-selected' } }))
    const session = stored().sessions['w1-m2']
    expect(session.lastRun.diagnostic.sourceBlockId).toBe(session.lastTrace[1].sourceBlockId)
    const wrongRequest = token()
    act(() => callbacks.get(wrongRequest)?.())
    expect(onComplete).not.toHaveBeenCalled()

    fireEvent.keyDown(screen.getByRole('button', { name: '\u56de\u5230\u95ee\u9898\u79ef\u6728' }), { key: 'Enter' })
    expect(document.activeElement).toHaveTextContent('\u9009\u62e9\u5927\u634d\u5200\uff083600\u65a4\uff09')
    fireEvent.keyDown(screen.getByRole('button', { name: '\u5220\u9664\uff1a\u9009\u62e9\u5927\u634d\u5200\uff083600\u65a4\uff09' }), { key: 'Enter' })
    fireEvent.keyDown(screen.getByRole('button', { name: '\u52a0\u5165\uff1a\u9009\u62e9\u5b9a\u6d77\u795e\u9488\uff0813500\u65a4\uff09' }), { key: 'Enter' })
    fireEvent.keyDown(screen.getByRole('button', { name: '\u4e0a\u79fb\uff1a\u9009\u62e9\u5b9a\u6d77\u795e\u9488\uff0813500\u65a4\uff09' }), { key: 'Enter' })
    fireEvent.keyDown(screen.getByLabelText('Blockly \u79ef\u6728\u7f16\u8f91\u533a'), { key: 'Enter' })
    const successRequest = token()
    expect(successRequest).toBeGreaterThan(wrongRequest)
    expect(onComplete).not.toHaveBeenCalled()
    act(() => callbacks.get(successRequest)?.())
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
    await waitFor(() => expect(stored().sessions['w1-m2']).toMatchObject({ totalRuns: 2, runtimeFailures: 1, lastRun: { completed: true } }))
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
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
    expect(onComplete).toHaveBeenCalledWith({ stars: 2, hintsUsed: 1 })
  })

  it('waits for the matching run session write before requesting final completion', async () => {
    const pending = deferred<CoordinatedSaveResult>()
    const save = vi.fn<SaveCoordinator>(() => pending.promise)
    const onComplete = renderControlledExperience(save)
    fireEvent.click(await screen.findByRole('button', { name: '运行受控成功程序' }))
    fireEvent.click(screen.getByRole('button', { name: '完成受控播放' }))
    expect(onComplete).not.toHaveBeenCalled()
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
    const savedProgress = save.mock.calls[0][0]
    await act(async () => pending.resolve({ status: 'saved', revision: 1, progress: savedProgress }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
  })

  it('propagates playback ownership to the whole workspace and rejects forced handlers until scene ready or error', async () => {
    const save = vi.fn<SaveCoordinator>(async (progress) => ({ status: 'saved', revision: 1, progress }))
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as unknown as typeof import('../progress/storageCoordinator'))}>
      <RuyiStaffExperience reducedMotion muted onComplete={() => undefined} loaders={lockProbeLoaders} />
    </ProgressProvider>)
    const probe = await screen.findByLabelText('锁定探针工作台')
    fireEvent.click(screen.getByRole('button', { name: '启动大捍刀运行' }))
    await waitFor(() => expect(probe).toHaveAttribute('data-locked', 'true'))
    await waitFor(() => expect(probe).toHaveAttribute('data-lock-reason', 'playback'))
    const beforeForcedHandlers = stored().sessions['w1-m2']

    fireEvent.click(screen.getByRole('button', { name: '强制再次执行' }))
    fireEvent.click(screen.getByRole('button', { name: '强制改写草稿' }))
    expect(stored().sessions['w1-m2']).toEqual(beforeForcedHandlers)
    expect(save).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: '重播最近一次' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '完成受控播放' }))
    await waitFor(() => expect(probe).toHaveAttribute('data-locked', 'false'))
    expect(probe).not.toHaveAttribute('data-lock-reason', 'playback')
  })

  it('keeps the session owner after scene completion and changes the visible owner on recovery', async () => {
    const pending = deferred<CoordinatedSaveResult>()
    const save = vi.fn<SaveCoordinator>(() => pending.promise)
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as unknown as typeof import('../progress/storageCoordinator'))}>
      <RuyiStaffExperience reducedMotion muted onComplete={() => undefined} loaders={lockProbeLoaders} />
    </ProgressProvider>)
    const probe = await screen.findByLabelText('锁定探针工作台')
    fireEvent.click(screen.getByRole('button', { name: '启动大捍刀运行' }))
    await waitFor(() => expect(probe).toHaveAttribute('data-lock-reason', 'session-pending'))
    fireEvent.click(screen.getByRole('button', { name: '完成受控播放' }))
    expect(probe).toHaveAttribute('data-locked', 'true')
    expect(probe).toHaveAttribute('data-lock-reason', 'session-pending')
    const progress = save.mock.calls[0][0]
    await act(async () => pending.resolve({ status: 'unsaved', progress, error: 'intentional recovery' }))
    await waitFor(() => expect(probe).toHaveAttribute('data-lock-reason', 'session-recovery'))
    expect(probe).toHaveAttribute('data-locked', 'true')
  })

  it('releases a durably saved current run under the production StrictMode effect cycle', async () => {
    const save = vi.fn<SaveCoordinator>(async (progress) => ({ status: 'saved', revision: 1, progress }))
    const onComplete = vi.fn()
    render(<StrictMode><ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as unknown as typeof import('../progress/storageCoordinator'))}>
      <RuyiStaffExperience reducedMotion muted onComplete={onComplete} loaders={controlledLoaders} />
    </ProgressProvider></StrictMode>)
    fireEvent.click(await screen.findByRole('button', { name: '运行受控成功程序' }))
    fireEvent.click(screen.getByRole('button', { name: '完成受控播放' }))
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
  })

  it.each(['unsaved', 'conflict'] as const)('does not request final completion when the run session is %s', async (status) => {
    const save = vi.fn<SaveCoordinator>(async (progress, expectedRevision) => status === 'unsaved'
      ? { status, progress, error: 'session disk failure' }
      : { status, progress, expectedRevision, actualRevision: expectedRevision + 1, error: 'session conflict' })
    const onComplete = renderControlledExperience(save)
    fireEvent.click(await screen.findByRole('button', { name: '运行受控成功程序' }))
    fireEvent.click(screen.getByRole('button', { name: '完成受控播放' }))
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
    await act(async () => undefined)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('requests final completion only after retry durably stores the same run session', async () => {
    const save = vi.fn<SaveCoordinator>()
      .mockImplementationOnce(async (progress) => ({ status: 'unsaved', progress, error: 'session disk failure' }))
      .mockImplementationOnce(async (progress) => ({ status: 'saved', revision: 1, progress }))
    const onComplete = renderControlledExperience(save)
    fireEvent.click(await screen.findByRole('button', { name: '运行受控成功程序' }))
    fireEvent.click(screen.getByRole('button', { name: '完成受控播放' }))
    expect(await screen.findByText('本关尚未保存，请重试。')).toBeVisible()
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getAllByText('本关尚未保存，请重试。')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '重试保存本关' }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
    expect(screen.queryByText('本关尚未保存，请重试。')).not.toBeInTheDocument()
  })

  it('latches a durable retry that finishes before playback and releases exactly once afterward', async () => {
    const save = vi.fn<SaveCoordinator>()
      .mockImplementationOnce(async (progress) => ({ status: 'unsaved', progress, error: 'session disk failure' }))
      .mockImplementationOnce(async (progress) => ({ status: 'saved', revision: 1, progress }))
    const onComplete = renderControlledExperience(save)
    fireEvent.click(await screen.findByRole('button', { name: '运行受控成功程序' }))
    expect(await screen.findByRole('button', { name: '重试保存本关' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: '重试保存本关' }))
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2))
    expect(onComplete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '完成受控播放' }))
    fireEvent.click(screen.getByRole('button', { name: '完成受控播放' }))

    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
  })

  it('rejects forced newer runs while the current run owns playback and session persistence', async () => {
    const first = deferred<CoordinatedSaveResult>()
    const save = vi.fn<SaveCoordinator>()
      .mockImplementationOnce(() => first.promise)
    const onComplete = renderControlledExperience(save)
    const runButton = await screen.findByRole('button', { name: '运行受控成功程序' })
    fireEvent.click(runButton)
    fireEvent.click(screen.getByRole('button', { name: '完成受控播放' }))
    fireEvent.click(runButton)
    fireEvent.click(runButton)
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1))
    await act(async () => first.resolve({ status: 'saved', revision: 1, progress: save.mock.calls[0][0] }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
    expect(save).toHaveBeenCalledOnce()
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
    await screen.findByLabelText('\u6d4b\u8bd5\u5b9a\u6d77\u795e\u9488\u573a\u666f')
    act(() => callbacks.get(token())?.())
    fireEvent.click(screen.getByRole('button', { name: '\u91cd\u64ad\u6700\u8fd1\u4e00\u6b21' }))
    act(() => callbacks.get(token())?.())
    expect(onComplete).not.toHaveBeenCalled()
    expect(stored().sessions['w1-m2'].totalRuns).toBe(1)
  })

  it.each([
    {
      name: 'empty',
      trace: [] as RuyiStaffInstruction[],
      expectedEvent: '[]',
      expectedFeedback: null,
      hasReplay: false,
    },
    {
      name: 'error',
      trace: [
        { instructionId: 'instruction:external-inspect', sourceBlockId: 'external-inspect', opcode: 'inspect_weights' },
        { instructionId: 'instruction:external-halberd', sourceBlockId: 'external-halberd', opcode: 'choose_halberd' },
      ] as RuyiStaffInstruction[],
      expectedEvent: 'external-halberd',
      expectedFeedback: '7200斤比13500斤轻，方天画戟不是最重的兵器。',
      hasReplay: true,
    },
    {
      name: 'different trace',
      trace: [
        { instructionId: 'instruction:external-inspect', sourceBlockId: 'external-inspect', opcode: 'inspect_weights' },
        { instructionId: 'instruction:external-staff', sourceBlockId: 'external-staff', opcode: 'choose_ruyi_staff' },
        { instructionId: 'instruction:external-shrink', sourceBlockId: 'external-shrink', opcode: 'shrink_ruyi_staff' },
      ] as RuyiStaffInstruction[],
      expectedEvent: 'external-shrink',
      expectedFeedback: null,
      hasReplay: true,
    },
  ])('atomically restores $name playback and feedback after an external session reload', async ({ trace, expectedEvent, expectedFeedback, hasReplay }) => {
    const initial = createInitialProgress(); initial.privacy.localDataNoticeSeen = true
    initial.sessions['w1-m2'] = recordRun(createMissionSession('w1-m2', '2026-07-16T00:00:00.000Z'), runRuyiStaffBattle(successfulTrace), successfulTrace, '2026-07-16T00:00:00.000Z')
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(initial))
    render(<ProgressProvider><RuyiStaffExperience reducedMotion muted onComplete={() => undefined} /><ExternalReloadButton /></ProgressProvider>)
    await screen.findByLabelText('测试定海神针场景')
    expect(screen.getByTestId('ruyi-events')).toHaveTextContent('instruction:shrink')

    const external = createInitialProgress(); external.privacy.localDataNoticeSeen = true
    external.sessions['w1-m2'] = trace.length === 0
      ? createMissionSession('w1-m2', '2026-07-16T01:00:00.000Z')
      : recordRun(createMissionSession('w1-m2', '2026-07-16T01:00:00.000Z'), runRuyiStaffBattle(trace), trace, '2026-07-16T01:00:00.000Z')
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(external))
    fireEvent.click(screen.getByRole('button', { name: '载入测试外部会话' }))

    await waitFor(() => expect(screen.getByTestId('ruyi-events').textContent).toContain(expectedEvent))
    const replay = screen.getByRole('button', { name: '重播最近一次' })
    expect(replay).toHaveProperty('disabled', true)
    if (hasReplay) {
      act(() => callbacks.get(token())?.())
      await waitFor(() => expect(replay).toHaveProperty('disabled', false))
    }
    if (expectedFeedback === null) {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } else {
      expect(screen.getByText(expectedFeedback)).toBeVisible()
    }
  })

  it('does not let an external reload interrupt a current local run while its save is pending', async () => {
    const pending = deferred<CoordinatedSaveResult>()
    const save = vi.fn<SaveCoordinator>(() => pending.promise)
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as unknown as typeof import('../progress/storageCoordinator'))}>
      <RuyiStaffExperience reducedMotion muted onComplete={() => undefined} loaders={controlledLoaders} />
      <ExternalReloadButton />
    </ProgressProvider>)
    fireEvent.click(await screen.findByRole('button', { name: '运行受控成功程序' }))
    const currentToken = screen.getByLabelText('受控定海神针场景').getAttribute('data-replay-token')
    expect(screen.getByTestId('controlled-events')).toHaveTextContent('instruction:shrink')

    const external = createInitialProgress(); external.privacy.localDataNoticeSeen = true
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(external))
    fireEvent.click(screen.getByRole('button', { name: '载入测试外部会话' }))

    expect(screen.getByLabelText('受控定海神针场景')).toHaveAttribute('data-replay-token', currentToken)
    expect(screen.getByTestId('controlled-events')).toHaveTextContent('instruction:shrink')
  })

  it('isolates a rejected scene lazy chunk, keeps story and workspace visible, and reloads explicitly', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reloadPage = vi.fn()
    render(<ProgressProvider><h2>原著故事仍可阅读</h2><LoadableExperience reducedMotion muted onComplete={() => undefined} reloadPage={reloadPage} loaders={{
      scene: () => Promise.reject(new Error('scene chunk failed')),
      workspace: () => Promise.resolve({ default: () => <div>编程工作台仍可使用</div> }),
    }} /></ProgressProvider>)
    expect(await screen.findByText('定海神针场景加载失败')).toBeVisible()
    expect(screen.getByRole('heading', { name: '原著故事仍可阅读' })).toBeVisible()
    expect(screen.getByText('编程工作台仍可使用')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }))
    expect(reloadPage).toHaveBeenCalledOnce()
  })

  it('isolates a rejected workspace lazy chunk, keeps story and scene visible, and reloads explicitly', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reloadPage = vi.fn()
    render(<ProgressProvider><h2>原著故事仍可阅读</h2><LoadableExperience reducedMotion muted onComplete={() => undefined} reloadPage={reloadPage} loaders={{
      scene: () => Promise.resolve({ default: () => <div>定海神针场景仍可观看</div> }),
      workspace: () => Promise.reject(new Error('workspace chunk failed')),
    }} /></ProgressProvider>)
    expect(await screen.findByText('定海神针编程工作台加载失败')).toBeVisible()
    expect(screen.getByRole('heading', { name: '原著故事仍可阅读' })).toBeVisible()
    expect(screen.getByText('定海神针场景仍可观看')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }))
    expect(reloadPage).toHaveBeenCalledOnce()
  })
})
