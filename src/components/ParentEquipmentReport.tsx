import type { ProgressV3 } from '../progress/types'
import { EQUIPMENT_CATALOGUE, type EquipmentEffect, type EquipmentItemId, type EquipmentSlot } from '../progress/equipment'
import { EQUIPMENT_PRESENTATION } from '../progress/equipmentPresentation'
import './ParentEquipmentReport.css'

const itemOrder: EquipmentItemId[] = ['ruyi-staff', 'phoenix-crown', 'golden-chain-armor', 'cloud-walking-boots']
const slotOrder: EquipmentSlot[] = ['weapon', 'head', 'body', 'feet']
const slotLabels: Record<EquipmentSlot, string> = { weapon: '兵器', head: '头饰', body: '护甲', feet: '靴子' }
const grantLabels = {
  'w1-m2': '第二关「定海神针」通关获得',
  'w1-m3': '第三关「四海披挂」通关获得',
} as const
const missionLabels = { 'w1-m4': '第四关「幽冥勾名」', 'w1-m5': '第五关「第三回总试炼」' } as const
const effectLabels: Record<EquipmentEffect, string> = {
  'weight-reference': '查看过兵器重量资料',
  'decomposition-view': '查看过任务拆分图',
  'accepted-prefix-playback': '回看过已走通步骤',
  'repeat-problem-navigation': '再次定位过问题积木',
}

export function ParentEquipmentReport({ progress }: { progress: ProgressV3 }) {
  const owned = itemOrder.filter((itemId) => progress.equipment.inventory[itemId] !== undefined)
  const uses = (['w1-m4', 'w1-m5'] as const).flatMap((missionId) => (
    (progress.sessions[missionId]?.equipmentEffectsUsed ?? []).map((effect) => ({ missionId, effect }))
  ))
  const conditionObservation = progress.abilities.conditionObservation
  const manorSession = progress.sessions['w3-m1']
  const cuilanSession = progress.sessions['w3-m2']
  const allObservationUses = [...(manorSession?.conditionObservationUses ?? []), ...(cuilanSession?.conditionObservationUses ?? [])]
  const observationUses = new Map(allObservationUses.map((use) => [use.snapshotId, use])).size
  const latestObservationUse = [...allObservationUses]
    .sort((left, right) => right.usedAt.localeCompare(left.usedAt))[0]
  const latestObservationTime = latestObservationUse
    ? new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(new Date(latestObservationUse.usedAt))
    : null
  const abilityStatus = conditionObservation.acquiredAt === null
    ? '未获得'
    : conditionObservation.stableUnlockedAt === null
      ? '已获得待稳定'
      : '已稳定'
  const completionEvidence = progress.missionCompletionEvidence['w3-m1']
  const cuilanEvidence = progress.missionCompletionEvidence['w3-m2']
  return <><section className="parent-equipment-report" role="region" aria-label="装备与跨关学习工具">
    <div className="parent-equipment-heading"><span className="eyebrow">真实通关奖励</span><h2>装备与跨关学习工具</h2><p>这里只记录已安全保存的获得、装备和主动使用证据。</p></div>
    <div className="parent-equipment-columns">
      <article><h3>已获得奖励</h3>{owned.length ? <ul>{owned.map((itemId) => {
        const item = EQUIPMENT_CATALOGUE[itemId]
        return <li key={itemId}>{`${EQUIPMENT_PRESENTATION[itemId].label}${grantLabels[item.grantedBy]}`}</li>
      })}</ul> : <p>尚未获得第一周装备奖励</p>}</article>
      <article><h3>当前装备栏</h3><dl>{slotOrder.map((slot) => {
        const itemId = progress.equipment.equipped[slot]
        return <div key={slot}><dt>{slotLabels[slot]}</dt><dd>{itemId ? EQUIPMENT_PRESENTATION[itemId].label : '未装备'}</dd></div>
      })}</dl></article>
      <article><h3>后续关卡主动使用</h3>{uses.length ? <ul>{uses.map(({ missionId, effect }) => <li key={`${missionId}-${effect}`}>{`${missionLabels[missionId]}${effectLabels[effect]}`}</li>)}</ul> : <p>第四、五关尚未使用装备学习工具</p>}</article>
    </div>
  </section>
  <section className="parent-equipment-report" role="region" aria-label="火眼金睛学习能力">
    <div className="parent-equipment-heading"><span className="eyebrow">条件学习能力</span><h2>火眼金睛学习能力</h2></div>
    <p>{abilityStatus}</p>
    <p>{`主动观察 ${observationUses} 次`}</p>
    {latestObservationTime ? <p>{`最近使用：${latestObservationTime}`}</p> : null}
    {completionEvidence?.kind === 'formal-v3' ? <p>庄上求助正式 Blockly 证明已保存</p> : null}
    {completionEvidence?.kind === 'legacy-preformal' ? <p>历史兼容完成记录，尚非正式 Blockly 证明</p> : null}
    {cuilanEvidence?.kind === 'formal-v3' ? <p>变化高翠兰正式 Blockly 证明已保存</p> : null}
    {cuilanEvidence?.kind === 'legacy-preformal' ? <p>变化高翠兰历史兼容完成记录，尚非正式 Blockly 证明</p> : null}
  </section></>
}

export default ParentEquipmentReport
