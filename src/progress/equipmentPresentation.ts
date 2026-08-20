import type { EquipmentEffect, EquipmentItemId, RewardEquipmentStateV1 } from './equipment'

export const EQUIPMENT_PRESENTATION: Record<EquipmentItemId, { label: string; effect: EquipmentEffect }> = {
  'ruyi-staff': { label: '如意金箍棒', effect: 'weight-reference' },
  'phoenix-crown': { label: '凤翅紫金冠', effect: 'decomposition-view' },
  'golden-chain-armor': { label: '黄金锁子甲', effect: 'accepted-prefix-playback' },
  'cloud-walking-boots': { label: '藕丝步云履', effect: 'repeat-problem-navigation' },
}

export function activeEquipmentEffects(state: RewardEquipmentStateV1): EquipmentEffect[] {
  return Object.values(state.equipped).flatMap((itemId) => itemId === null ? [] : [EQUIPMENT_PRESENTATION[itemId].effect])
}
