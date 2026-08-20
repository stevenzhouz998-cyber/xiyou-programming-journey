import { EQUIPMENT_CATALOGUE, type EquipmentItemId, type EquipmentSlot, type RewardEquipmentStateV1 } from './equipment'

const clone = (state: RewardEquipmentStateV1): RewardEquipmentStateV1 => ({ version: 1, inventory: { ...state.inventory }, equipped: { ...state.equipped } })

export function equipItem(state: RewardEquipmentStateV1, slot: EquipmentSlot, itemId: EquipmentItemId): RewardEquipmentStateV1 {
  if (!state.inventory[itemId]) throw new Error('未获得装备')
  if (EQUIPMENT_CATALOGUE[itemId].slot !== slot) throw new Error('栏位不匹配')
  if (state.equipped[slot] === itemId) return state
  const next = clone(state); next.equipped[slot] = itemId; return next
}

export function unequipItem(state: RewardEquipmentStateV1, slot: EquipmentSlot): RewardEquipmentStateV1 {
  if (!['weapon', 'head', 'body', 'feet'].includes(slot)) throw new Error('栏位无效')
  if (state.equipped[slot] === null) return state
  const next = clone(state); next.equipped[slot] = null; return next
}
