import { describe, expect, it } from 'vitest'
import {
  EQUIPMENT_CATALOGUE,
  grantMissionRewards,
  initialEquipment,
} from './equipment'
import { equipItem, unequipItem } from './equipmentOperations'
import { activeEquipmentEffects, EQUIPMENT_PRESENTATION } from './equipmentPresentation'

const NOW = '2026-08-19T00:00:00.000Z'
const LATER = '2026-08-20T00:00:00.000Z'

describe('first-week reward equipment', () => {
  it('defines four canon items with one exact slot, effect, and granting mission', () => {
    expect(EQUIPMENT_CATALOGUE).toEqual({
      'ruyi-staff': { slot: 'weapon', grantedBy: 'w1-m2' },
      'phoenix-crown': { slot: 'head', grantedBy: 'w1-m3' },
      'golden-chain-armor': { slot: 'body', grantedBy: 'w1-m3' },
      'cloud-walking-boots': { slot: 'feet', grantedBy: 'w1-m3' },
    })
    expect(EQUIPMENT_PRESENTATION['ruyi-staff']).toEqual({ label: '如意金箍棒', effect: 'weight-reference' })
  })

  it('grants mission rewards once and retains the original grant timestamp', () => {
    const staff = grantMissionRewards(initialEquipment(), 'w1-m2', NOW)
    expect(staff.inventory).toEqual({ 'ruyi-staff': { grantedBy: 'w1-m2', grantedAt: NOW } })
    const replay = grantMissionRewards(staff, 'w1-m2', LATER)
    expect(replay).toEqual(staff)

    const regalia = grantMissionRewards(replay, 'w1-m3', LATER)
    expect(Object.keys(regalia.inventory)).toEqual([
      'ruyi-staff', 'phoenix-crown', 'golden-chain-armor', 'cloud-walking-boots',
    ])
    expect(regalia.inventory['phoenix-crown']).toEqual({ grantedBy: 'w1-m3', grantedAt: LATER })
  })

  it('equips owned items only in their exact slots and removes effects after unequip', () => {
    const owned = grantMissionRewards(
      grantMissionRewards(initialEquipment(), 'w1-m2', NOW),
      'w1-m3',
      NOW,
    )
    const equipped = equipItem(equipItem(owned, 'weapon', 'ruyi-staff'), 'head', 'phoenix-crown')
    expect(equipped.equipped).toMatchObject({ weapon: 'ruyi-staff', head: 'phoenix-crown' })
    expect(activeEquipmentEffects(equipped)).toEqual(['weight-reference', 'decomposition-view'])

    const unequipped = unequipItem(equipped, 'weapon')
    expect(unequipped.equipped.weapon).toBeNull()
    expect(activeEquipmentEffects(unequipped)).toEqual(['decomposition-view'])
    expect(equipped.equipped.weapon).toBe('ruyi-staff')
  })

  it('fails closed for unowned items and wrong slots without mutating input', () => {
    const empty = initialEquipment()
    expect(() => equipItem(empty, 'weapon', 'ruyi-staff')).toThrow(/未获得/)
    expect(empty).toEqual(initialEquipment())

    const owned = grantMissionRewards(empty, 'w1-m2', NOW)
    expect(() => equipItem(owned, 'head', 'ruyi-staff')).toThrow(/栏位/)
    expect(owned.equipped).toEqual({ weapon: null, head: null, body: null, feet: null })
  })
})
