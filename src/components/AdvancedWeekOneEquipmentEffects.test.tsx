import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProgressProvider } from '../context/ProgressContext'
import { completeMission, createInitialProgress, serializeProgress } from '../progress/progress'
import { createMissionSession } from '../progress/session'
import type { EquipmentItemId } from '../progress/equipment'
import { equipItem } from '../progress/equipmentOperations'
import { CURRENT_PROGRESS_KEY } from '../progress/storage'
import type { AdvancedWeekOneInstruction } from '../blockly/advancedWeekOneContract'
import { AdvancedWeekOneExperience } from './AdvancedWeekOneExperience'

vi.mock('./AdvancedWeekOneScene', () => ({
  AdvancedWeekOneScene: ({ events }: { events: Array<{ type: string }> }) => <output data-testid="effect-scene-events">{events.map((event) => event.type).join(',')}</output>,
}))

vi.mock('./AdvancedWeekOneBlocklyWorkspace', () => ({
  AdvancedWeekOneBlocklyWorkspace: (props: {
    missionId: 'w1-m4' | 'w1-m5'
    onRun: (result: { ok: true; trace: AdvancedWeekOneInstruction[] }) => void
    focusBlockId: string | null
    onFocusHandled: () => void
    decompositionView?: boolean
  }) => {
    const trace: AdvancedWeekOneInstruction[] = props.missionId === 'w1-m4'
      ? [
        { instructionId: 'instruction:open', sourceBlockId: 'open', parentBlockId: null, opcode: 'underworld_open_register' },
        { instructionId: 'instruction:wrong', sourceBlockId: 'wrong', parentBlockId: null, opcode: 'underworld_handle_names' },
      ]
      : [
        { instructionId: 'instruction:plan', sourceBlockId: 'plan', parentBlockId: null, opcode: 'boss_plan_third_chapter' },
        { instructionId: 'instruction:wrong', sourceBlockId: 'wrong', parentBlockId: null, opcode: 'boss_verify_causal_chain' },
      ]
    return <section>
      <button type="button" onClick={() => props.onRun({ ok: true, trace })}>执行测试错误程序</button>
      <output data-testid="effect-focus">{props.focusBlockId ?? '无定位'}</output>
      <output data-testid="effect-decomposition">{props.decompositionView ? '分组视图已打开' : '普通视图'}</output>
      <button type="button" onClick={props.onFocusHandled}>标记定位完成</button>
    </section>
  },
}))

function saveProgress(missionId: 'w1-m4' | 'w1-m5', equipped: EquipmentItemId[] = []) {
  let progress = createInitialProgress()
  for (const id of ['w1-m1', 'w1-m2', 'w1-m3'] as const) progress = completeMission(progress, id, { stars: 3, hintsUsed: 0 })
  if (missionId === 'w1-m5') progress = completeMission(progress, 'w1-m4', { stars: 3, hintsUsed: 0 })
  for (const itemId of equipped) {
    const slot = itemId === 'ruyi-staff' ? 'weapon' : itemId === 'phoenix-crown' ? 'head' : itemId === 'golden-chain-armor' ? 'body' : 'feet'
    progress.equipment = equipItem(progress.equipment, slot, itemId)
  }
  const session = createMissionSession(missionId)
  session.workspace.blocks = missionId === 'w1-m4'
    ? [
      { id: 'open', type: 'xiyou_underworld_open_register', nextId: 'wrong', parentBlockId: null, x: 0, y: 0 },
      { id: 'wrong', type: 'xiyou_underworld_handle_names', nextId: null, parentBlockId: null, x: 0, y: 48 },
    ]
    : [
      { id: 'plan', type: 'xiyou_boss_plan_third_chapter', nextId: 'wrong', parentBlockId: null, x: 0, y: 0 },
      { id: 'wrong', type: 'xiyou_boss_verify_causal_chain', nextId: null, parentBlockId: null, x: 0, y: 48 },
    ]
  progress.sessions[missionId] = session
  localStorage.setItem(CURRENT_PROGRESS_KEY, serializeProgress(progress))
}

describe('Advanced Week One equipment effects', () => {
  beforeEach(() => localStorage.clear())

  it('shows the staff weight facts only in m5 while equipped and records the manual use', async () => {
    saveProgress('w1-m5', ['ruyi-staff'])
    const before = JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m5'].workspace
    const equippedView = render(<ProgressProvider><AdvancedWeekOneExperience missionId="w1-m5" reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>)

    fireEvent.click(await screen.findByRole('button', { name: '查看重量资料' }))
    expect(await screen.findByRole('region', { name: '三件兵器重量资料' })).toHaveTextContent('大捍刀3600斤')
    expect(screen.getByRole('region', { name: '三件兵器重量资料' })).toHaveTextContent('方天画戟7200斤')
    expect(screen.getByRole('region', { name: '三件兵器重量资料' })).toHaveTextContent('定海神针13500斤')
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m5'].equipmentEffectsUsed).toContain('weight-reference'))
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m5'].workspace).toEqual(before)

    equippedView.unmount()
    saveProgress('w1-m5')
    render(<ProgressProvider><AdvancedWeekOneExperience missionId="w1-m5" reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>)
    expect(screen.queryByRole('button', { name: '查看重量资料' })).not.toBeInTheDocument()
  })

  it('does not expose an effect whose use evidence failed to save', async () => {
    saveProgress('w1-m5', ['ruyi-staff'])
    render(<ProgressProvider loadSaveCoordinator={() => Promise.reject(new Error('存储不可用'))}><AdvancedWeekOneExperience missionId="w1-m5" reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>)

    fireEvent.click(await screen.findByRole('button', { name: '查看重量资料' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('本次学习记录尚未保存')
    expect(screen.queryByRole('region', { name: '三件兵器重量资料' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m5'].equipmentEffectsUsed).toEqual([])
  })

  it('switches to the child-owned decomposition view only while the crown is equipped', async () => {
    saveProgress('w1-m4', ['phoenix-crown'])
    const equippedView = render(<ProgressProvider><AdvancedWeekOneExperience missionId="w1-m4" reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>)
    fireEvent.click(await screen.findByRole('button', { name: '查看任务拆分图' }))
    expect(await screen.findByTestId('effect-decomposition')).toHaveTextContent('分组视图已打开')
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m4'].equipmentEffectsUsed).toContain('decomposition-view'))

    equippedView.unmount()
    saveProgress('w1-m4')
    render(<ProgressProvider><AdvancedWeekOneExperience missionId="w1-m4" reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>)
    expect(screen.queryByRole('button', { name: '查看任务拆分图' })).not.toBeInTheDocument()
  })

  it('replays only the already accepted event prefix after an error while armor is equipped', async () => {
    saveProgress('w1-m4', ['golden-chain-armor'])
    const equippedView = render(<ProgressProvider><AdvancedWeekOneExperience missionId="w1-m4" reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>)
    fireEvent.click(await screen.findByRole('button', { name: '执行测试错误程序' }))
    expect(await screen.findByRole('button', { name: '回看已走通步骤' })).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: '回看已走通步骤' }))
    await waitFor(() => expect(screen.getByTestId('effect-scene-events')).toHaveTextContent('run-started,instruction-accepted,state-changed'))
    expect(screen.getByTestId('effect-scene-events')).not.toHaveTextContent('instruction-rejected')
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m4'].equipmentEffectsUsed).toContain('accepted-prefix-playback'))

    equippedView.unmount()
    saveProgress('w1-m4')
    render(<ProgressProvider><AdvancedWeekOneExperience missionId="w1-m4" reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>)
    fireEvent.click(await screen.findByRole('button', { name: '执行测试错误程序' }))
    expect(screen.queryByRole('button', { name: '回看已走通步骤' })).not.toBeInTheDocument()
  })

  it('retains a repeated problem-location action after baseline focus only while boots are equipped', async () => {
    saveProgress('w1-m4', ['cloud-walking-boots'])
    const equippedView = render(<ProgressProvider><AdvancedWeekOneExperience missionId="w1-m4" reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>)
    fireEvent.click(await screen.findByRole('button', { name: '执行测试错误程序' }))
    await waitFor(() => expect(screen.getByTestId('effect-focus')).toHaveTextContent('wrong'))
    fireEvent.click(screen.getByRole('button', { name: '标记定位完成' }))
    expect(screen.getByTestId('effect-focus')).toHaveTextContent('无定位')
    fireEvent.click(screen.getByRole('button', { name: '再次定位问题积木' }))
    await waitFor(() => expect(screen.getByTestId('effect-focus')).toHaveTextContent('wrong'))
    await waitFor(() => expect(JSON.parse(localStorage.getItem(CURRENT_PROGRESS_KEY)!).sessions['w1-m4'].equipmentEffectsUsed).toContain('repeat-problem-navigation'))

    equippedView.unmount()
    saveProgress('w1-m4')
    render(<ProgressProvider><AdvancedWeekOneExperience missionId="w1-m4" reducedMotion muted onComplete={vi.fn()} /></ProgressProvider>)
    fireEvent.click(await screen.findByRole('button', { name: '执行测试错误程序' }))
    expect(screen.queryByRole('button', { name: '再次定位问题积木' })).not.toBeInTheDocument()
  })
})
