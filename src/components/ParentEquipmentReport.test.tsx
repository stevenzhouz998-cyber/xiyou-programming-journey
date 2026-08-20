import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { completeMission, createInitialProgress } from '../progress/progress'
import { createMissionSession } from '../progress/session'
import { recordEquipmentEffectUse } from '../progress/equipmentEffectSession'
import { equipItem } from '../progress/equipmentOperations'
import { ParentEquipmentReport } from './ParentEquipmentReport'

describe('ParentEquipmentReport', () => {
  it('reports durable rewards, current slots, and child-invoked effects without raw identifiers', () => {
    let progress = createInitialProgress()
    progress = completeMission(progress, 'w1-m1', { stars: 3, hintsUsed: 0 })
    progress = completeMission(progress, 'w1-m2', { stars: 3, hintsUsed: 0 })
    progress = completeMission(progress, 'w1-m3', { stars: 3, hintsUsed: 0 })
    progress.equipment = equipItem(progress.equipment, 'weapon', 'ruyi-staff')
    progress.equipment = equipItem(progress.equipment, 'head', 'phoenix-crown')
    progress.sessions['w1-m4'] = recordEquipmentEffectUse(createMissionSession('w1-m4'), 'decomposition-view', '2026-08-19T01:00:00.000Z')
    progress.sessions['w1-m5'] = recordEquipmentEffectUse(createMissionSession('w1-m5'), 'weight-reference', '2026-08-19T01:05:00.000Z')

    render(<ParentEquipmentReport progress={progress} />)
    const report = screen.getByRole('region', { name: '装备与跨关学习工具' })
    expect(report).toHaveTextContent('如意金箍棒第二关「定海神针」通关获得')
    expect(report).toHaveTextContent('兵器如意金箍棒')
    expect(report).toHaveTextContent('头饰凤翅紫金冠')
    expect(report).toHaveTextContent('第四关「幽冥勾名」查看过任务拆分图')
    expect(report).toHaveTextContent('第五关「第三回总试炼」查看过兵器重量资料')
    expect(report).not.toHaveTextContent(/ruyi-staff|decomposition-view|sourceBlockId|instructionId|parent=/)
    expect(report).not.toHaveTextContent(/金币|余额/)
  })

  it('shows honest empty and unequipped states', () => {
    render(<ParentEquipmentReport progress={createInitialProgress()} />)
    expect(screen.getByText('尚未获得第一周装备奖励')).toBeVisible()
    expect(screen.getAllByText('未装备')).toHaveLength(4)
    expect(screen.getByText('第四、五关尚未使用装备学习工具')).toBeVisible()
  })
})
