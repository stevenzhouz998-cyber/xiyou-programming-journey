import { useEffect, useRef, useState } from 'react'
import { useProgress } from '../context/ProgressContext'
import {
  EQUIPMENT_CATALOGUE,
  type EquipmentItemId,
  type EquipmentSlot,
} from '../progress/equipment'
import { EQUIPMENT_PRESENTATION } from '../progress/equipmentPresentation'
import { assetUrl } from '../utils/assets'
import { downloadTextFile } from '../utils/download'
import { activateEquipmentStorageFaults } from '#equipment-storage-fault-adapter'
import './EquipmentDrawer.css'

activateEquipmentStorageFaults()

interface EquipmentDrawerProps {
  open: boolean
  onClose: () => void
}

type Recovery = 'none' | 'unsaved' | 'conflict'

const itemOrder: EquipmentItemId[] = [
  'ruyi-staff',
  'phoenix-crown',
  'golden-chain-armor',
  'cloud-walking-boots',
]

const itemDetails: Record<EquipmentItemId, {
  slotLabel: string
  effectCopy: string
  sourceCopy: string
  image: string
  crop: string
}> = {
  'ruyi-staff': {
    slotLabel: '兵器',
    effectCopy: '装备后，可在后续试炼查看重量资料，但不会替你改积木。',
    sourceCopy: '完成第二关「定海神针」获得',
    image: '/assets/dragon-palace/weapons.webp',
    crop: 'equipment-crop-third',
  },
  'phoenix-crown': {
    slotLabel: '头饰',
    effectCopy: '装备后，可展开任务拆分图，帮你看清大任务和小任务。',
    sourceCopy: '完成第三关「四海披挂」获得',
    image: '/assets/dragon-palace/regalia.webp',
    crop: 'equipment-crop-first',
  },
  'golden-chain-armor': {
    slotLabel: '护甲',
    effectCopy: '装备后，可重播本次已通过的指令前半段，便于定位问题。',
    sourceCopy: '完成第三关「四海披挂」获得',
    image: '/assets/dragon-palace/regalia.webp',
    crop: 'equipment-crop-second',
  },
  'cloud-walking-boots': {
    slotLabel: '靴子',
    effectCopy: '装备后，修改后可快速回到上次出错的检查点。',
    sourceCopy: '完成第三关「四海披挂」获得',
    image: '/assets/dragon-palace/regalia.webp',
    crop: 'equipment-crop-third',
  },
}

export function EquipmentDrawer({ open, onClose }: EquipmentDrawerProps) {
  const {
    progress,
    saveStatus,
    updateEquipment,
    retrySave,
    createBackup,
    reloadExternalProgress,
  } = useProgress()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [pending, setPending] = useState(false)
  const [recovery, setRecovery] = useState<Recovery>('none')

  useEffect(() => {
    if (!open) return undefined
    closeRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  useEffect(() => {
    if (!open) return
    if (saveStatus === 'conflict') setRecovery('conflict')
  }, [open, saveStatus])

  if (!open) return null

  const changeEquipment = async (slot: EquipmentSlot, itemId: EquipmentItemId, equipped: boolean) => {
    setPending(true)
    setRecovery('none')
    try {
      const result = await updateEquipment(equipped
        ? { type: 'unequip', slot }
        : { type: 'equip', slot, itemId })
      if (result.status === 'unsaved') setRecovery('unsaved')
      if (result.status === 'conflict') setRecovery('conflict')
    } catch {
      setRecovery('unsaved')
    } finally {
      setPending(false)
    }
  }

  const retry = async () => {
    setPending(true)
    const result = await retrySave()
    setPending(false)
    setRecovery(result.status === 'saved' ? 'none' : result.status)
  }

  return <div className="equipment-drawer-layer">
    <button className="equipment-drawer-scrim" type="button" aria-label="关闭装备行囊" onClick={onClose} />
    <section className="equipment-drawer" role="dialog" aria-modal="true" aria-labelledby="equipment-drawer-title">
      <header>
        <div>
          <span className="eyebrow">通关奖励 · 跨关生效</span>
          <h2 id="equipment-drawer-title">装备行囊</h2>
          <p>只能装备真正通关获得的宝物。随时可以卸下，学习进度不会丢失。</p>
        </div>
        <button ref={closeRef} className="equipment-close" type="button" onClick={onClose}>关闭</button>
      </header>

      {pending ? <p className="equipment-save-status" role="status">正在保存装备选择……</p> : null}
      {recovery !== 'none' ? <div className="equipment-recovery" role="alert">
        <strong>{recovery === 'conflict' ? '其他标签页已经更新装备' : '装备选择还没有保存'}</strong>
        <p>{recovery === 'conflict' ? '为了不覆盖新进度，本页已暂停写入。' : '请保留本页，等存储恢复后重试。'}</p>
        {recovery === 'unsaved'
          ? <button type="button" disabled={pending} onClick={() => void retry()}>重试保存装备选择</button>
          : <div className="equipment-recovery-actions">
            <button type="button" onClick={() => {
              const backup = createBackup()
              downloadTextFile(backup.filename, backup.contents, backup.mimeType)
            }}>下载本页装备备份</button>
            <button type="button" onClick={() => {
              reloadExternalProgress()
              setRecovery('none')
            }}>载入其他标签页装备</button>
          </div>}
      </div> : null}

      <div className="equipment-grid" aria-label="四个装备栏位">
        {itemOrder.map((itemId) => {
          const item = EQUIPMENT_CATALOGUE[itemId]
          const presentation = EQUIPMENT_PRESENTATION[itemId]
          const detail = itemDetails[itemId]
          const owned = progress.equipment.inventory[itemId] !== undefined
          const equipped = progress.equipment.equipped[item.slot] === itemId
          return <article className={`equipment-card${owned ? '' : ' equipment-card-locked'}`} key={itemId}>
            <div className="equipment-art" aria-hidden="true">
              <img className={detail.crop} src={assetUrl(detail.image)} alt="" />
            </div>
            <div className="equipment-card-copy">
              <span>{detail.slotLabel}</span>
              <h3>{presentation.label}</h3>
              <p>{detail.effectCopy}</p>
              <small>{detail.sourceCopy}</small>
            </div>
            <button
              type="button"
              aria-pressed={equipped}
              disabled={!owned || pending}
              onClick={() => void changeEquipment(item.slot, itemId, equipped)}
            >{owned ? `${equipped ? '卸下' : '装备'}${presentation.label}` : '尚未获得'}</button>
          </article>
        })}
      </div>
    </section>
  </div>
}

export default EquipmentDrawer
