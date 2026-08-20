import { registerAdvancedStorageFaultHandler } from '#storage-fault-adapter'
import type { ProgressV3 } from '../../src/progress/types'

const canonical = (value: unknown): string => Array.isArray(value)
  ? `[${value.map(canonical).join(',')}]`
  : value !== null && typeof value === 'object'
    ? `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(',')}}`
    : JSON.stringify(value)

export function activateEquipmentStorageFaults(): void {
  registerAdvancedStorageFaultHandler(({ storage, progress }) => {
    if (storage.getItem('xiyou-test-storage-mode') !== 'fail-equipment') return null
    let previous: ProgressV3
    try { const raw = storage.getItem('xiyou-programming-progress-v3'); if (raw === null) return null; previous = JSON.parse(raw) as ProgressV3 } catch { return null }
    const expected = structuredClone(previous)
    expected.equipment = structuredClone(progress.equipment)
    expected.savedAt = progress.savedAt
    return canonical(expected) === canonical(progress) ? 'equipment storage fault' : null
  })
}
