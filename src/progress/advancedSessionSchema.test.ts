import { describe, expect, it } from 'vitest'
import { parseAdvancedWeekOneSession } from './advancedSessionSchema'

const NOW = '2026-08-19T00:00:00.000Z'
const emptySession = (blocks: unknown[]) => ({
  workspace: { version: 1, missionId: 'w1-m4', blocks },
  lastTrace: [], lastRun: null, totalRuns: 0, runtimeFailures: 0, compileFailures: 0,
  usedHintTiers: [], conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
  lastRunAt: null, savedAt: NOW,
})

describe('advanced session schema draft boundary', () => {
  it('accepts a mission-specific, finite, structurally valid incomplete Blockly draft with no trace', () => {
    const result = parseAdvancedWeekOneSession(emptySession([
      { id: 'open', type: 'xiyou_underworld_open_register', nextId: 'find', parentBlockId: null, x: 0, y: 0 },
      { id: 'find', type: 'xiyou_underworld_find_monkey_records', nextId: null, parentBlockId: null, x: 0, y: 48 },
      { id: 'read', type: 'xiyou_underworld_read_index', nextId: null, parentBlockId: 'find', x: 28, y: 96 },
    ]), 'w1-m4')
    expect(result.workspace.blocks).toHaveLength(3)
  })

  it('accepts preserved run counters after a later visible draft edit clears stale run evidence', () => {
    const session = emptySession([
      { id: 'open', type: 'xiyou_underworld_open_register', nextId: null, parentBlockId: null, x: 0, y: 0 },
    ])
    const result = parseAdvancedWeekOneSession({ ...session, totalRuns: 1 }, 'w1-m4')
    expect(result).toMatchObject({ totalRuns: 1, lastTrace: [], lastRun: null, lastRunAt: null })
  })

  it('defaults old advanced sessions to no effect use and rejects forged or duplicate effect evidence', () => {
    expect(parseAdvancedWeekOneSession(emptySession([]), 'w1-m4').equipmentEffectsUsed).toEqual([])
    expect(parseAdvancedWeekOneSession({ ...emptySession([]), equipmentEffectsUsed: ['decomposition-view'] }, 'w1-m4').equipmentEffectsUsed).toEqual(['decomposition-view'])
    expect(() => parseAdvancedWeekOneSession({ ...emptySession([]), equipmentEffectsUsed: ['weight-reference'] }, 'w1-m4')).toThrow(/装备效果/)
    expect(() => parseAdvancedWeekOneSession({ ...emptySession([]), equipmentEffectsUsed: ['decomposition-view', 'decomposition-view'] }, 'w1-m4')).toThrow(/装备效果/)
  })

  it.each([
    ['foreign mission block', (blocks: any[]) => { blocks[0].type = 'xiyou_boss_plan_third_chapter' }],
    ['non-finite coordinate', (blocks: any[]) => { blocks[0].x = Number.POSITIVE_INFINITY }],
    ['empty next id', (blocks: any[]) => { blocks[0].nextId = '' }],
    ['empty parent id', (blocks: any[]) => { blocks[2].parentBlockId = '' }],
    ['duplicate id', (blocks: any[]) => { blocks[1].id = 'open' }],
    ['two top roots', (blocks: any[]) => { blocks[1].nextId = null; blocks[2].parentBlockId = null }],
    ['cycle', (blocks: any[]) => { blocks[1].nextId = 'open' }],
    ['wrong child scope', (blocks: any[]) => { blocks[2].parentBlockId = null }],
  ])('rejects a forged zero-trace draft: %s', (_label, mutate) => {
    const blocks = [
      { id: 'open', type: 'xiyou_underworld_open_register', nextId: 'find', parentBlockId: null, x: 0, y: 0 },
      { id: 'find', type: 'xiyou_underworld_find_monkey_records', nextId: null, parentBlockId: null, x: 0, y: 48 },
      { id: 'read', type: 'xiyou_underworld_read_index', nextId: null, parentBlockId: 'find', x: 28, y: 96 },
    ]
    mutate(blocks)
    expect(() => parseAdvancedWeekOneSession(emptySession(blocks), 'w1-m4')).toThrow(/workspace|积木|图|scope|连接/i)
  })
})
