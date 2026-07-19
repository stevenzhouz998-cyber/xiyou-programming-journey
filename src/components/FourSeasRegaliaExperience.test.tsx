import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FourSeasBattleEvent } from '../battle/types'
import { ProgressProvider, useProgress } from '../context/ProgressContext'
import { completeMission, createInitialProgress, serializeProgress } from '../progress/progress'
import { CURRENT_PROGRESS_KEY } from '../progress/storage'
import type { CoordinatedSaveResult } from '../progress/storageCoordinator'
import { FourSeasRegaliaExperience } from './FourSeasRegaliaExperience'

const callbacks = vi.hoisted(() => new Map<number, () => void>())
vi.mock('./FourSeasRegaliaScene', () => ({
  FourSeasRegaliaScene: ({ events, replayToken, reducedMotion, onPlaybackComplete }: {
    events: FourSeasBattleEvent[]
    replayToken: number
    reducedMotion: boolean
    onPlaybackComplete?: () => void
  }) => {
    if (onPlaybackComplete) callbacks.set(replayToken, onPlaybackComplete)
    return <section aria-label="受控四海披挂场景" data-replay-token={replayToken} data-reduced-motion={String(reducedMotion)}>
      <output data-testid="regalia-events">{JSON.stringify(events)}</output>
      <button type="button" onClick={onPlaybackComplete}>完成四海披挂场景播放</button>
    </section>
  },
}))

type SaveCoordinator = typeof import('../progress/storageCoordinator').saveProgressCoordinated
type Complete = (evidence: { stars: 1 | 2 | 3; hintsUsed: number }) => void

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

function unlockedProgress() {
  let progress = createInitialProgress()
  progress.privacy.localDataNoticeSeen = true
  progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 })
  return completeMission(progress, 'w1-m2', { stars: 3, hintsUsed: 0 })
}

function renderExperience({
  onComplete = vi.fn<Complete>(),
  save,
  reducedMotion = false,
}: {
  onComplete?: ReturnType<typeof vi.fn<Complete>>
  save?: SaveCoordinator
  reducedMotion?: boolean
} = {}) {
  const loadSaveCoordinator = save
    ? () => Promise.resolve({ saveProgressCoordinated: save } as typeof import('../progress/storageCoordinator'))
    : undefined
  const view = render(<ProgressProvider loadSaveCoordinator={loadSaveCoordinator}>
    <FourSeasRegaliaExperience reducedMotion={reducedMotion} muted onComplete={onComplete} />
  </ProgressProvider>)
  return { ...view, onComplete }
}

async function add(label: string) {
  fireEvent.click(await screen.findByRole('button', { name: label }))
}

async function buildMainAndEquip() {
  await add('加入主任务：向东海龙王请求披挂')
  await add('加入主任务：收齐三海宝物')
  await add('加入主任务：穿戴整副披挂')
  await add('加入主任务：检查披挂是否齐全')
  await add('加入穿戴子任务：戴上凤翅紫金冠')
  await add('加入穿戴子任务：穿上锁子黄金甲')
  await add('加入穿戴子任务：踏上藕丝步云履')
}

async function buildCorrect() {
  await buildMainAndEquip()
  await add('加入收集子任务：收下北海的藕丝步云履')
  await add('加入收集子任务：收下西海的锁子黄金甲')
  await add('加入收集子任务：收下南海的凤翅紫金冠')
}

function token() {
  return Number(screen.getByLabelText('受控四海披挂场景').getAttribute('data-replay-token'))
}

function stored() {
  return JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY) ?? '{}')
}

function HintButtons() {
  const { recordMissionHint } = useProgress()
  return <><button type="button" onClick={() => recordMissionHint('w1-m3', 'observe')}>观察提示</button><button type="button" onClick={() => recordMissionHint('w1-m3', 'think')}>思路提示</button></>
}

describe('FourSeasRegaliaExperience', () => {
  beforeEach(() => {
    callbacks.clear()
    localStorage.clear()
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(unlockedProgress()))
  })

  afterEach(() => vi.restoreAllMocks())

  it('records a compile failure without playback or completion', async () => {
    const { onComplete } = renderExperience()
    fireEvent.click(await screen.findByRole('button', { name: '执行披挂指令' }, { timeout: 5000 }))
    expect(await screen.findByRole('alert')).toHaveTextContent('指令卷轴还是空的')
    await waitFor(() => expect(stored().sessions['w1-m3']).toMatchObject({ compileFailures: 1, totalRuns: 0 }))
    expect(screen.getByTestId('regalia-events')).toHaveTextContent('[]')
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('persists and visibly plays the exact wrong nested trace without completing', async () => {
    const { onComplete } = renderExperience()
    await buildMainAndEquip()
    await add('加入收集子任务：收下南海的凤翅紫金冠')
    await add('加入收集子任务：收下西海的锁子黄金甲')
    await add('加入收集子任务：收下北海的藕丝步云履')
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('北海龙王还没有送来云履')
    await waitFor(() => expect(stored().sessions['w1-m3']).toMatchObject({ totalRuns: 1, runtimeFailures: 1, lastRun: { completed: false } }))
    const wrong = stored().sessions['w1-m3']
    expect(wrong.lastRun.diagnostic.sourceBlockId).toBe(wrong.lastTrace[2].sourceBlockId)
    expect(screen.getByTestId('regalia-events')).toHaveTextContent(wrong.lastRun.diagnostic.sourceBlockId)
    act(() => callbacks.get(token())?.())
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('requires the exact successful session save and playback before completion and ignores duplicates', async () => {
    const pending = deferred<CoordinatedSaveResult>()
    const save = vi.fn<SaveCoordinator>(async (progress) => progress.sessions['w1-m3']?.lastRun
      ? pending.promise
      : { status: 'saved', revision: 1, progress })
    const { onComplete } = renderExperience({ save })
    await buildCorrect()
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))
    const request = token()
    act(() => { callbacks.get(request)?.(); callbacks.get(request)?.() })
    expect(onComplete).not.toHaveBeenCalled()
    await waitFor(() => expect(save.mock.calls.some(([progress]) => progress.sessions['w1-m3']?.lastRun?.completed === true)).toBe(true))
    const exact = save.mock.calls.find(([progress]) => progress.sessions['w1-m3']?.lastRun?.completed === true)![0]
    expect(exact.sessions['w1-m3']?.lastRun?.completed).toBe(true)
    await act(async () => pending.resolve({ status: 'saved', revision: 1, progress: exact }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
  })

  it('bases completion evidence on distinct hint tiers persisted in the w1-m3 session', async () => {
    const onComplete = vi.fn<Complete>()
    render(<ProgressProvider><FourSeasRegaliaExperience reducedMotion muted onComplete={onComplete} /><HintButtons /></ProgressProvider>)
    fireEvent.click(screen.getByRole('button', { name: '观察提示' }))
    fireEvent.click(screen.getByRole('button', { name: '观察提示' }))
    fireEvent.click(screen.getByRole('button', { name: '思路提示' }))
    await waitFor(() => expect(stored().sessions['w1-m3']?.usedHintTiers).toEqual(['observe', 'think']))
    await buildCorrect()
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))
    const request = token()
    act(() => callbacks.get(request)?.())
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ stars: 1, hintsUsed: 2 }))
  })

  it('keeps the current draft and run locked after an unsaved write and releases only through session retry', async () => {
    let failedRun = false
    const save = vi.fn<SaveCoordinator>(async (progress) => {
      if (progress.sessions['w1-m3']?.lastRun && !failedRun) {
        failedRun = true
        return { status: 'unsaved', progress, error: 'disk unavailable' }
      }
      return { status: 'saved', revision: 1, progress }
    })
    const { onComplete } = renderExperience({ save })
    await buildCorrect()
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))
    const request = token()
    act(() => callbacks.get(request)?.())
    expect(await screen.findByText('本关尚未保存，请重试。')).toBeVisible()
    expect(screen.getByRole('button', { name: '执行披挂指令' })).toBeDisabled()
    expect(screen.getByRole('list', { name: '四海披挂程序树' }).querySelectorAll(':scope > li')).toHaveLength(10)
    expect(onComplete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '重试保存本关' }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
  })

  it('fails closed on a CAS conflict and leaves CURRENT as the external version', async () => {
    const external = unlockedProgress()
    external.learnerName = '其他标签页版本'
    const save = vi.fn<SaveCoordinator>(async (progress, expectedRevision) => {
      localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(external))
      return { status: 'conflict', progress, expectedRevision, actualRevision: expectedRevision + 1, error: 'stale tab' }
    })
    const { onComplete } = renderExperience({ save })
    await buildCorrect()
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))
    act(() => callbacks.get(token())?.())
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
    expect(onComplete).not.toHaveBeenCalled()
    expect(stored().learnerName).toBe('其他标签页版本')
    expect(screen.queryByRole('button', { name: '重试保存本关' })).not.toBeInTheDocument()
  })

  it('does not let delayed save or playback callbacks complete after unmount', async () => {
    const pending = deferred<CoordinatedSaveResult>()
    const save = vi.fn<SaveCoordinator>(async (progress) => progress.sessions['w1-m3']?.lastRun
      ? pending.promise
      : { status: 'saved', revision: 1, progress })
    const { onComplete, unmount } = renderExperience({ save })
    await buildCorrect()
    const run = screen.getByRole('button', { name: '执行披挂指令' })
    fireEvent.click(run)
    const current = token()
    await waitFor(() => expect(save.mock.calls.some(([progress]) => progress.sessions['w1-m3']?.lastRun?.completed === true)).toBe(true))
    const exact = save.mock.calls.find(([progress]) => progress.sessions['w1-m3']?.lastRun?.completed === true)?.[0]
    unmount()
    act(() => callbacks.get(current)?.())
    expect(exact).toBeDefined()
    await act(async () => pending.resolve({ status: 'saved', revision: 2, progress: exact! }))
    expect(onComplete).not.toHaveBeenCalled()
  })

  it.each([false, true])('restores and replays a persisted run without reopening success (reduced=%s)', async (reducedMotion) => {
    const { onComplete, unmount } = renderExperience({ reducedMotion })
    await buildCorrect()
    fireEvent.click(screen.getByRole('button', { name: '执行披挂指令' }))
    const request = token()
    act(() => callbacks.get(request)?.())
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce())
    const events = screen.getByTestId('regalia-events').textContent
    unmount()

    const restoredComplete = vi.fn()
    renderExperience({ onComplete: restoredComplete, reducedMotion })
    expect(await screen.findByTestId('regalia-events')).toHaveTextContent('regalia-verified')
    expect(screen.getByTestId('regalia-events').textContent).toBe(events)
    fireEvent.click(screen.getByRole('button', { name: '重播最近一次' }))
    act(() => callbacks.get(token())?.())
    expect(restoredComplete).not.toHaveBeenCalled()
  })

  it('isolates a rejected scene chunk while story and the workspace remain usable with explicit retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reloadPage = vi.fn()
    render(<ProgressProvider><h2>再求披挂的原著故事</h2><FourSeasRegaliaExperience reducedMotion muted onComplete={() => undefined} reloadPage={reloadPage} loaders={{
      scene: () => Promise.reject(new Error('scene chunk failed')),
      workspace: () => Promise.resolve({ default: () => <div>四海披挂编程工作台仍可使用</div> }),
    }} /></ProgressProvider>)
    expect(await screen.findByText('四海披挂场景加载失败')).toBeVisible()
    expect(screen.getByRole('heading', { name: '再求披挂的原著故事' })).toBeVisible()
    expect(screen.getByText('四海披挂编程工作台仍可使用')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }))
    expect(reloadPage).toHaveBeenCalledOnce()
  })

  it('isolates a rejected workspace chunk while story and the scene remain visible with explicit retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const reloadPage = vi.fn()
    render(<ProgressProvider><h2>按原著顺序整理披挂</h2><FourSeasRegaliaExperience reducedMotion muted onComplete={() => undefined} reloadPage={reloadPage} loaders={{
      scene: () => Promise.resolve({ default: () => <div>四海披挂场景仍可观看</div> }),
      workspace: () => Promise.reject(new Error('workspace chunk failed')),
    }} /></ProgressProvider>)
    expect(await screen.findByText('四海披挂编程工作台加载失败')).toBeVisible()
    expect(screen.getByRole('heading', { name: '按原著顺序整理披挂' })).toBeVisible()
    expect(screen.getByText('四海披挂场景仍可观看')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '重新加载页面' }))
    expect(reloadPage).toHaveBeenCalledOnce()
  })
})
