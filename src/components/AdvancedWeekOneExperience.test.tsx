import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { completeMission, createInitialProgress, serializeProgress } from '../progress/progress'
import { createMissionSession, updateWorkspaceDraft } from '../progress/session'
import { CURRENT_PROGRESS_KEY } from '../progress/storage'
import { ProgressProvider } from '../context/ProgressContext'
import { AdvancedWeekOneExperience } from './AdvancedWeekOneExperience'

function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>((done) => { resolve = done }), resolve } }

async function loadScene() {
  fireEvent.load(await screen.findByAltText('幽冥文书房背景'))
  fireEvent.load(screen.getByAltText('幽冥名册状态'))
}

const completeDraft = {
  version: 1 as const, missionId: 'w1-m4' as const,
  blocks: [
    { id: 'open', type: 'xiyou_underworld_open_register' as const, nextId: 'find', parentBlockId: null, x: 0, y: 0 },
    { id: 'find', type: 'xiyou_underworld_find_monkey_records' as const, nextId: 'handle', parentBlockId: null, x: 0, y: 50 },
    { id: 'read', type: 'xiyou_underworld_read_index' as const, nextId: 'match', parentBlockId: 'find', x: 20, y: 70 },
    { id: 'match', type: 'xiyou_underworld_match_monkey_kind' as const, nextId: 'collect', parentBlockId: 'find', x: 20, y: 90 },
    { id: 'collect', type: 'xiyou_underworld_collect_named_records' as const, nextId: null, parentBlockId: 'find', x: 20, y: 110 },
    { id: 'handle', type: 'xiyou_underworld_handle_names' as const, nextId: 'verify', parentBlockId: null, x: 0, y: 130 },
    { id: 'verify', type: 'xiyou_underworld_verify_register' as const, nextId: null, parentBlockId: null, x: 0, y: 150 },
  ],
}

beforeEach(() => {
  localStorage.clear()
  let progress = createInitialProgress()
  progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 })
  progress = completeMission(progress, 'w1-m2', { stars: 3, hintsUsed: 0 })
  progress = completeMission(progress, 'w1-m3', { stars: 3, hintsUsed: 0 })
  progress.sessions['w1-m4'] = updateWorkspaceDraft(createMissionSession('w1-m4'), completeDraft, new Date(0).toISOString())
  localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress))
})

describe('AdvancedWeekOneExperience', () => {
  it('records the compiled visible trace before completing and replays without a second completion', async () => {
    const onComplete = vi.fn()
    render(<ProgressProvider><AdvancedWeekOneExperience missionId="w1-m4" reducedMotion muted onComplete={onComplete} /></ProgressProvider>)
    await loadScene()
    fireEvent.click(await screen.findByRole('button', { name: '执行幽冥勾名指令' }))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m4']).toMatchObject({ totalRuns: 1, lastRun: { completed: true } }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: '重播最近一次' }))
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
  })

  it('does not play or complete a successful trace before its run record becomes durable', async () => {
    const pending = deferred<any>()
    const save = vi.fn<(progress: any) => Promise<any>>(() => pending.promise)
    const onComplete = vi.fn()
    render(<ProgressProvider loadSaveCoordinator={() => Promise.resolve({ saveProgressCoordinated: save } as any)}><AdvancedWeekOneExperience missionId="w1-m4" reducedMotion muted onComplete={onComplete} /></ProgressProvider>)
    await loadScene()
    fireEvent.click(await screen.findByRole('button', { name: '执行幽冥勾名指令' }))
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
    expect(onComplete).not.toHaveBeenCalled()
    const progress = save.mock.calls[0][0]
    pending.resolve({ status: 'saved', revision: 1, progress })
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
  })
})
