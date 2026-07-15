import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { BattleEvent, BattleInstruction } from '../battle/types'
import { runDragonPalaceBattle } from '../battle/dragonPalace'
import { ProgressProvider, useProgress } from '../context/ProgressContext'
import { createInitialProgress, serializeProgress } from '../progress/progress'
import { CURRENT_PROGRESS_KEY } from '../progress/storage'
import { DragonPalaceExperience } from './DragonPalaceExperience'

const playbackCallbacks = vi.hoisted(() => new Map<number, () => void>())
const playbackEventReferences = vi.hoisted(() => new Map<number, BattleEvent[][]>())

vi.mock('./GameScene', () => ({
  GameScene: ({
    events,
    replayToken,
    onPlaybackComplete,
  }: {
    events: BattleEvent[]
    replayToken: number
    onPlaybackComplete?: () => void
  }) => {
    if (onPlaybackComplete) playbackCallbacks.set(replayToken, onPlaybackComplete)
    const references = playbackEventReferences.get(replayToken) ?? []
    if (references.at(-1) !== events) references.push(events)
    playbackEventReferences.set(replayToken, references)
    return <section aria-label="测试龙宫场景" data-replay-token={replayToken}>
      <output data-testid="scene-events">{JSON.stringify(events)}</output>
      <button type="button" onClick={onPlaybackComplete}>{`完成场景播放 ${replayToken}`}</button>
    </section>
  },
}))

const originalStorage = localStorage

function storedProgress() {
  const raw = localStorage.getItem(CURRENT_PROGRESS_KEY)
  return raw === null ? null : JSON.parse(raw)
}

async function waitForStoredSession() {
  let session: NonNullable<ReturnType<typeof storedProgress>>['sessions'][string] | undefined
  await waitFor(() => {
    session = storedProgress()?.sessions['w1-m1']
    expect(session).toBeDefined()
  }, { timeout: 5000 })
  return session!
}

function SessionHintControls() {
  const { recordMissionHint } = useProgress()
  return <>
    <button type="button" onClick={() => recordMissionHint('w1-m1', 'observe')}>测试观察提示</button>
    <button type="button" onClick={() => recordMissionHint('w1-m1', 'think')}>测试思路提示</button>
  </>
}

function renderExperience(onComplete = vi.fn()) {
  render(
    <ProgressProvider>
      <DragonPalaceExperience
        reducedMotion={false}
        muted={false}
        onComplete={onComplete}
      />
      <SessionHintControls />
    </ProgressProvider>,
  )
  return onComplete
}

function currentRequestId(): number {
  return Number(screen.getByLabelText('测试龙宫场景').getAttribute('data-replay-token'))
}

function finishRequest(requestId: number) {
  act(() => playbackCallbacks.get(requestId)?.())
}

describe('DragonPalaceExperience', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', { value: originalStorage, configurable: true })
    Object.defineProperty(window, 'localStorage', { value: originalStorage, configurable: true })
    localStorage.clear()
    playbackCallbacks.clear()
    playbackEventReferences.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(globalThis, 'localStorage', { value: originalStorage, configurable: true })
    Object.defineProperty(window, 'localStorage', { value: originalStorage, configurable: true })
  })

  it('records an explicit compile failure without pretending the engine ran', async () => {
    renderExperience()

    fireEvent.click(await screen.findByRole('button', { name: '执行战斗指令' }, { timeout: 5000 }))

    expect(await screen.findByRole('alert')).toHaveTextContent('指令卷轴还是空的')
    expect(await waitForStoredSession()).toMatchObject({
      compileFailures: 1,
      totalRuns: 0,
      runtimeFailures: 0,
      conceptFailures: { programStructure: 1 },
    })
    fireEvent.click(screen.getByRole('button', { name: '回到编程工作台' }))
    expect(screen.getByLabelText('Blockly 积木编辑区')).toHaveFocus()
  })

  it('runs the real wrong Blockly trace, then completes only after corrected event playback', async () => {
    const onComplete = renderExperience()
    fireEvent.click(await screen.findByRole('button', { name: '加入：请求兵器' }))
    fireEvent.click(screen.getByRole('button', { name: '加入：进入龙宫' }))
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }))

    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))

    expect(await screen.findByText('悟空还在龙宫外，龙王还听不到请求。请观察悟空现在在哪里。')).toBeVisible()
    expect(onComplete).not.toHaveBeenCalled()
    const failedSession = await waitForStoredSession()
    expect(failedSession).toMatchObject({
      totalRuns: 1,
      runtimeFailures: 1,
      lastRun: {
        completed: false,
        finalState: 'outside-palace',
        penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
      },
    })
    expect(failedSession.lastRun.diagnostic).toMatchObject({
      instructionId: failedSession.lastTrace[0].instructionId,
      sourceBlockId: failedSession.lastTrace[0].sourceBlockId,
    })
    expect(failedSession.lastRun.events).toContainEqual(expect.objectContaining({
      type: 'instruction-rejected',
      instructionId: failedSession.lastTrace[0].instructionId,
      sourceBlockId: failedSession.lastTrace[0].sourceBlockId,
    }))

    fireEvent.click(screen.getByRole('button', { name: '上移：进入龙宫' }))
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))

    expect(onComplete).not.toHaveBeenCalled()
    await waitFor(() => expect(storedProgress()?.sessions['w1-m1']).toMatchObject({
      totalRuns: 2,
      runtimeFailures: 1,
      lastRun: { completed: true, finalState: 'weapon-tested' },
    }), { timeout: 5000 })
    finishRequest(currentRequestId())
    expect(onComplete).toHaveBeenCalledWith({ stars: 3, hintsUsed: 0 })
  })

  it('keeps one playback request stable while draft and hint session writes clone progress', async () => {
    const onComplete = renderExperience()
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }))
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }))
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }))
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))
    const requestId = currentRequestId()
    const callbackCount = playbackCallbacks.size

    fireEvent.click(screen.getByRole('button', { name: '上移：试用兵器' }))
    fireEvent.click(screen.getByRole('button', { name: '测试观察提示' }))
    fireEvent.click(screen.getByRole('button', { name: '测试观察提示' }))

    expect(currentRequestId()).toBe(requestId)
    expect(playbackCallbacks.size).toBe(callbackCount)
    expect(playbackEventReferences.get(requestId)).toHaveLength(1)
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('ignores late and duplicate callbacks and uses the winning run hint snapshot', async () => {
    const onComplete = renderExperience()
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }))
    fireEvent.click(screen.getByRole('button', { name: '加入：请求兵器' }))
    fireEvent.click(screen.getByRole('button', { name: '加入：试用兵器' }))
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))
    const requestA = currentRequestId()

    fireEvent.click(screen.getByRole('button', { name: '测试观察提示' }))
    fireEvent.click(screen.getByRole('button', { name: '测试思路提示' }))
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))
    const requestB = currentRequestId()
    expect(requestB).toBeGreaterThan(requestA)

    finishRequest(requestA)
    expect(onComplete).not.toHaveBeenCalled()
    finishRequest(requestB)
    finishRequest(requestB)

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith({ stars: 1, hintsUsed: 2 })
    await waitFor(() => expect(storedProgress()?.sessions['w1-m1']).toMatchObject({ totalRuns: 2 }), { timeout: 5000 })
  })

  it('stores incomplete evidence without invented instruction ids and returns to the last real block', async () => {
    renderExperience()
    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }))
    fireEvent.click(screen.getByRole('button', { name: '执行战斗指令' }))

    expect(await screen.findByText(/最后一块积木之后还缺一步/)).toBeVisible()
    const session = await waitForStoredSession()
    expect(session).toMatchObject({
      totalRuns: 1,
      runtimeFailures: 1,
      conceptFailures: { completeness: 1 },
      lastRun: {
        completed: false,
        diagnostic: {
          type: 'program-ended-incomplete',
          instructionId: null,
          sourceBlockId: session.lastTrace[0].sourceBlockId,
        },
      },
    })
    fireEvent.click(screen.getByRole('button', { name: '回到问题积木' }))
    expect(document.activeElement).toHaveTextContent('进入龙宫')
  })

  it('restores the saved ids and final scene without recounting or completing on refresh', async () => {
    const draft = {
      version: 1 as const,
      blocks: [
        { id: 'saved-enter', type: 'xiyou_enter_palace' as const, nextId: 'saved-request', x: 0, y: 0 },
        { id: 'saved-request', type: 'xiyou_request_weapon' as const, nextId: 'saved-test', x: 0, y: 48 },
        { id: 'saved-test', type: 'xiyou_test_weapon' as const, nextId: null, x: 0, y: 96 },
      ],
    }
    const trace: BattleInstruction[] = draft.blocks.map((block) => ({
      instructionId: `instruction:${block.id}`,
      sourceBlockId: block.id,
      opcode: block.type === 'xiyou_enter_palace'
        ? 'enter_palace'
        : block.type === 'xiyou_request_weapon' ? 'request_weapon' : 'test_weapon',
    }))
    const progress = createInitialProgress()
    progress.privacy.localDataNoticeSeen = true
    progress.sessions['w1-m1'] = {
      workspace: draft,
      lastTrace: trace,
      lastRun: runDragonPalaceBattle(trace),
      totalRuns: 1,
      runtimeFailures: 0,
      compileFailures: 0,
      usedHintTiers: [],
      conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
      lastRunAt: '2026-07-15T06:00:00.000Z',
      savedAt: '2026-07-15T06:00:00.000Z',
    }
    progress.savedAt = '2026-07-15T06:00:00.000Z'
    localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress))
    const onComplete = renderExperience()

    expect(await screen.findByText('进入龙宫')).toBeVisible()
    expect(screen.getByTestId('scene-events')).toHaveTextContent('dragon-palace.run-finished.completed')
    finishRequest(currentRequestId())
    expect(onComplete).not.toHaveBeenCalled()
    expect(await waitForStoredSession()).toMatchObject({ totalRuns: 1 })

    fireEvent.click(screen.getByRole('button', { name: '重播最近一次' }))
    expect(screen.getByLabelText('测试龙宫场景')).toHaveAttribute('data-replay-token', '1')
    finishRequest(currentRequestId())
    expect(onComplete).not.toHaveBeenCalled()
    expect((await waitForStoredSession())).toMatchObject({ totalRuns: 1 })
  })

  it('keeps unsaved edits in memory and retries the same transactional session', async () => {
    const values = new Map<string, string>()
    let failWrites = true
    const storage: Storage = {
      get length() { return values.size },
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      removeItem: (key) => { values.delete(key) },
      setItem: (key, value) => {
        if (failWrites) throw new Error('磁盘暂不可用')
        values.set(key, value)
      },
    }
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
    Object.defineProperty(window, 'localStorage', { value: storage, configurable: true })
    renderExperience()

    fireEvent.click(await screen.findByRole('button', { name: '加入：进入龙宫' }))
    expect(await screen.findByText('本关尚未保存，请重试。')).toBeVisible()
    expect(screen.getByText('进入龙宫')).toBeVisible()
    expect(localStorage.getItem(CURRENT_PROGRESS_KEY)).toBeNull()

    failWrites = false
    fireEvent.click(screen.getByRole('button', { name: '重试保存本关' }))
    await waitFor(() => expect(screen.queryByText('本关尚未保存，请重试。')).not.toBeInTheDocument())
    expect((await waitForStoredSession()).workspace.blocks[0]).toMatchObject({
      type: 'xiyou_enter_palace',
    })
  })
})
