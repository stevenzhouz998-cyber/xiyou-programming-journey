import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { completeMission, createInitialProgress } from '../progress/progress'
import type { EquipmentItemId, EquipmentSlot } from '../progress/equipment'
import { equipItem, unequipItem } from '../progress/equipmentOperations'
import type { ProgressContextValue } from '../context/ProgressContext'
import { EquipmentDrawer } from './EquipmentDrawer'

const context = vi.hoisted(() => ({ current: null as ProgressContextValue | null }))

vi.mock('../context/ProgressContext', async (loadOriginal) => {
  const original = await loadOriginal<typeof import('../context/ProgressContext')>()
  return { ...original, useProgress: () => context.current }
})

function earnedProgress() {
  let progress = createInitialProgress()
  progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 })
  progress = completeMission(progress, 'w1-m2', { stars: 3, hintsUsed: 0 })
  return completeMission(progress, 'w1-m3', { stars: 3, hintsUsed: 0 })
}

function installContext(overrides: Partial<ProgressContextValue> = {}) {
  const progress = earnedProgress()
  const updateEquipment = vi.fn(async (operation: { type: 'equip'; slot: EquipmentSlot; itemId: EquipmentItemId } | { type: 'unequip'; slot: EquipmentSlot }) => {
    progress.equipment = operation.type === 'equip'
      ? equipItem(progress.equipment, operation.slot, operation.itemId)
      : unequipItem(progress.equipment, operation.slot)
    return { status: 'saved' as const, revision: 1, progress }
  })
  context.current = {
    progress,
    revision: 0,
    loadStatus: 'normal',
    loadPersistence: 'saved',
    loadError: null,
    corruptDownload: null,
    corruptError: null,
    saveStatus: 'idle',
    saveError: null,
    saveRetryable: false,
    updateEquipment,
    retrySave: vi.fn(async () => ({ status: 'saved' as const, revision: 2, progress })),
    createBackup: vi.fn(() => ({ filename: 'backup.json', contents: '{}', mimeType: 'application/json' })),
    reloadExternalProgress: vi.fn(() => progress),
    ...overrides,
  } as ProgressContextValue
  return { progress, updateEquipment }
}

describe('EquipmentDrawer', () => {
  beforeEach(() => installContext())

  it('shows earned real rewards without currency and equips or removes them with standard buttons', async () => {
    const { progress, updateEquipment } = installContext()
    const { container } = render(<EquipmentDrawer open onClose={vi.fn()} />)

    expect(screen.getByRole('dialog', { name: '装备行囊' })).toBeVisible()
    expect(screen.getByText('如意金箍棒')).toBeVisible()
    expect(screen.getByText('凤翅紫金冠')).toBeVisible()
    expect(screen.queryByText(/金币|灵石|余额/)).not.toBeInTheDocument()
    expect(container.querySelectorAll('img[src="/assets/dragon-palace/weapons.webp"]')).toHaveLength(1)
    expect(container.querySelectorAll('img[src="/assets/dragon-palace/regalia.webp"]')).toHaveLength(3)

    const equip = screen.getByRole('button', { name: '装备如意金箍棒' })
    expect(equip.tagName).toBe('BUTTON')
    expect(equip).toHaveAttribute('aria-pressed', 'false')
    equip.focus()
    fireEvent.click(equip)
    await waitFor(() => expect(updateEquipment).toHaveBeenCalledWith({ type: 'equip', slot: 'weapon', itemId: 'ruyi-staff' }))
    await waitFor(() => expect(screen.getByRole('button', { name: '卸下如意金箍棒' })).toHaveAttribute('aria-pressed', 'true'))
    expect(progress.equipment.equipped.weapon).toBe('ruyi-staff')

    fireEvent.click(screen.getByRole('button', { name: '卸下如意金箍棒' }))
    await waitFor(() => expect(progress.equipment.equipped.weapon).toBeNull())
  })

  it('locks every loadout action while a save is pending', async () => {
    let resolve!: (value: Awaited<ReturnType<ProgressContextValue['updateEquipment']>>) => void
    const pending = new Promise<Awaited<ReturnType<ProgressContextValue['updateEquipment']>>>((done) => { resolve = done })
    const { progress } = installContext({ updateEquipment: vi.fn(() => pending) })
    render(<EquipmentDrawer open onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '装备如意金箍棒' }))
    expect(await screen.findByRole('status')).toHaveTextContent('正在保存装备选择')
    const loadoutButtons = screen.getAllByRole('button').filter((button) => button.hasAttribute('aria-pressed'))
    expect(loadoutButtons).toHaveLength(4)
    for (const button of loadoutButtons) expect(button).toBeDisabled()

    resolve({ status: 'saved', revision: 1, progress })
    await waitFor(() => expect(screen.queryByText('正在保存装备选择')).not.toBeInTheDocument())
  })

  it('offers an in-drawer retry after storage failure', async () => {
    const { progress } = installContext({
      updateEquipment: vi.fn(async () => ({ status: 'unsaved' as const, progress, error: '存储不可用' })),
    })
    render(<EquipmentDrawer open onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '装备如意金箍棒' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('装备选择还没有保存')
    fireEvent.click(screen.getByRole('button', { name: '重试保存装备选择' }))
    await waitFor(() => expect(context.current!.retrySave).toHaveBeenCalledOnce())
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })

  it('offers backup and external reload when another tab wins the CAS race', async () => {
    const { progress } = installContext({
      updateEquipment: vi.fn(async () => ({
        status: 'conflict' as const,
        expectedRevision: 0,
        actualRevision: 1,
        progress,
        error: '其他标签页已更新，已暂停保存',
      })),
    })
    render(<EquipmentDrawer open onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '装备如意金箍棒' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('其他标签页已经更新')
    expect(screen.getByRole('button', { name: '下载本页装备备份' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: '载入其他标签页装备' }))
    expect(context.current!.reloadExternalProgress).toHaveBeenCalledOnce()
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
  })
})
