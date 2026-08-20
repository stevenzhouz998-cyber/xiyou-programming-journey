import type { EquipmentEffect } from './equipment'
import type { AdvancedWeekOneMissionSession } from './types'

const effects: EquipmentEffect[] = ['weight-reference', 'decomposition-view', 'accepted-prefix-playback', 'repeat-problem-navigation']

export function recordEquipmentEffectUse(session: AdvancedWeekOneMissionSession, effect: EquipmentEffect, now: string): AdvancedWeekOneMissionSession {
  if (!effects.includes(effect)) throw new Error('装备效果无效')
  if (Number.isNaN(new Date(now).getTime()) || new Date(now).toISOString() !== now) throw new Error('时间无效')
  const next = structuredClone(session)
  if (!next.equipmentEffectsUsed.includes(effect)) next.equipmentEffectsUsed.push(effect)
  next.savedAt = now
  return next
}
