export const EQUIPMENT_CATALOGUE = {
  'ruyi-staff': { slot: 'weapon', grantedBy: 'w1-m2' },
  'phoenix-crown': { slot: 'head', grantedBy: 'w1-m3' },
  'golden-chain-armor': { slot: 'body', grantedBy: 'w1-m3' },
  'cloud-walking-boots': { slot: 'feet', grantedBy: 'w1-m3' },
} as const

export type EquipmentItemId = keyof typeof EQUIPMENT_CATALOGUE
export type EquipmentSlot = typeof EQUIPMENT_CATALOGUE[EquipmentItemId]['slot']
export type EquipmentEffect = 'weight-reference' | 'decomposition-view' | 'accepted-prefix-playback' | 'repeat-problem-navigation'
export type RewardMissionId = typeof EQUIPMENT_CATALOGUE[EquipmentItemId]['grantedBy']

export interface RewardEquipmentStateV1 {
  version: 1
  inventory: Partial<Record<EquipmentItemId, { grantedBy: RewardMissionId; grantedAt: string }>>
  equipped: Record<EquipmentSlot, EquipmentItemId | null>
}

const items = Object.keys(EQUIPMENT_CATALOGUE) as EquipmentItemId[]

export function initialEquipment(): RewardEquipmentStateV1 {
  return { version: 1, inventory: {}, equipped: { weapon: null, head: null, body: null, feet: null } }
}

function cloneEquipment(state: RewardEquipmentStateV1): RewardEquipmentStateV1 {
  return { version: 1, inventory: { ...state.inventory }, equipped: { ...state.equipped } }
}

export function grantMissionRewards(
  state: RewardEquipmentStateV1,
  missionId: string,
  grantedAt: string,
): RewardEquipmentStateV1 {
  const grantedItems = items.filter((itemId) => EQUIPMENT_CATALOGUE[itemId].grantedBy === missionId)
  if (grantedItems.length === 0 || grantedItems.every((itemId) => state.inventory[itemId])) return state
  const next = cloneEquipment(state)
  for (const itemId of grantedItems) {
    if (!next.inventory[itemId]) next.inventory[itemId] = { grantedBy: EQUIPMENT_CATALOGUE[itemId].grantedBy, grantedAt }
  }
  return next
}
