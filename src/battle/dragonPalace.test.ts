import { describe, expect, it } from 'vitest'
import { runDragonPalaceBattle } from './dragonPalace'
import type { BattleInstruction } from './types'

function instruction(
  instructionId: string,
  sourceBlockId: string,
  opcode: BattleInstruction['opcode'],
): BattleInstruction {
  return { instructionId, sourceBlockId, opcode }
}

describe('dragon palace battle engine', () => {
  it('ends a valid prefix as incomplete at entered-palace', () => {
    const result = runDragonPalaceBattle([
      instruction('instruction-1', 'block-1', 'enter_palace'),
    ])

    expect(result.completed).toBe(false)
    expect(result.finalState).toBe('entered-palace')
    expect(result.diagnostic).toMatchObject({
      type: 'program-ended-incomplete',
      concept: 'completeness',
      instructionId: null,
      sourceBlockId: 'block-1',
    })
  })

  it('completes only after all three real instructions reach weapon-tested', () => {
    const result = runDragonPalaceBattle([
      instruction('instruction-1', 'block-1', 'enter_palace'),
      instruction('instruction-2', 'block-2', 'request_weapon'),
      instruction('instruction-3', 'block-3', 'test_weapon'),
    ])

    expect(result.completed).toBe(true)
    expect(result.finalState).toBe('weapon-tested')
    expect(result.diagnostic).toBeNull()
    expect(result.events.map((event) => event.state)).toEqual([
      'outside-palace',
      'outside-palace',
      'entered-palace',
      'entered-palace',
      'weapon-requested',
      'weapon-requested',
      'weapon-tested',
      'weapon-tested',
    ])
  })

  it('reports different events and diagnostics for different wrong traces of equal length', () => {
    const requestFirst = runDragonPalaceBattle([
      instruction('request-first', 'request-block', 'request_weapon'),
    ])
    const testFirst = runDragonPalaceBattle([
      instruction('test-first', 'test-block', 'test_weapon'),
    ])

    expect(requestFirst.events).not.toEqual(testFirst.events)
    expect(requestFirst.diagnostic).not.toEqual(testFirst.diagnostic)
    expect(requestFirst.diagnostic).toMatchObject({
      type: 'instruction-rejected',
      concept: 'sequence-precondition',
      instructionId: 'request-first',
      sourceBlockId: 'request-block',
      opcode: 'request_weapon',
    })
    expect(testFirst.diagnostic).toMatchObject({
      type: 'instruction-rejected',
      concept: 'sequence-precondition',
      instructionId: 'test-first',
      sourceBlockId: 'test-block',
      opcode: 'test_weapon',
    })
  })

  it('rejects a repeated instruction and stops at the state reached before it', () => {
    const result = runDragonPalaceBattle([
      instruction('enter-1', 'enter-block-1', 'enter_palace'),
      instruction('enter-2', 'enter-block-2', 'enter_palace'),
      instruction('request-after-rejection', 'request-block', 'request_weapon'),
    ])

    expect(result.completed).toBe(false)
    expect(result.finalState).toBe('entered-palace')
    expect(result.diagnostic).toMatchObject({
      type: 'instruction-rejected',
      concept: 'sequence-precondition',
      instructionId: 'enter-2',
      sourceBlockId: 'enter-block-2',
      opcode: 'enter_palace',
    })
    expect(result.events.some((event) => event.instructionId === 'request-after-rejection')).toBe(false)
  })

  it('handles the same instruction according to the current state', () => {
    const outsideResult = runDragonPalaceBattle([
      instruction('request-outside', 'outside-block', 'request_weapon'),
    ])
    const enteredResult = runDragonPalaceBattle([
      instruction('enter', 'enter-block', 'enter_palace'),
      instruction('request-entered', 'entered-block', 'request_weapon'),
    ])

    expect(outsideResult.finalState).toBe('outside-palace')
    expect(outsideResult.diagnostic?.type).toBe('instruction-rejected')
    expect(enteredResult.finalState).toBe('weapon-requested')
    expect(enteredResult.diagnostic?.type).toBe('program-ended-incomplete')
    expect(
      enteredResult.events.some(
        (event) => event.type === 'instruction-accepted' && event.opcode === 'request_weapon',
      ),
    ).toBe(true)
  })

  it('retains instruction, block, and opcode provenance on every actual-instruction event', () => {
    const actualInstruction = instruction('instruction-7', 'block-42', 'enter_palace')
    const result = runDragonPalaceBattle([actualInstruction])
    const actualInstructionEvents = result.events.filter((event) => event.opcode !== null)

    expect(actualInstructionEvents.length).toBeGreaterThan(0)
    for (const event of actualInstructionEvents) {
      expect(event).toMatchObject(actualInstruction)
    }
  })

  it('does not fabricate provenance when an empty program ends incomplete', () => {
    const result = runDragonPalaceBattle([])

    expect(result.completed).toBe(false)
    expect(result.finalState).toBe('outside-palace')
    expect(result.diagnostic).toMatchObject({
      type: 'program-ended-incomplete',
      concept: 'completeness',
      instructionId: null,
      sourceBlockId: null,
      opcode: null,
    })
  })

  it('never penalizes incomplete or rejected programs', () => {
    const incomplete = runDragonPalaceBattle([
      instruction('enter', 'enter-block', 'enter_palace'),
    ])
    const rejected = runDragonPalaceBattle([
      instruction('wrong', 'wrong-block', 'test_weapon'),
    ])

    expect(incomplete.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 })
    expect(rejected.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 })
  })

  it('does not mutate the caller input', () => {
    const trace = [
      instruction('instruction-1', 'block-1', 'enter_palace'),
      instruction('instruction-2', 'block-2', 'request_weapon'),
    ]
    const snapshot = structuredClone(trace)

    runDragonPalaceBattle(trace)

    expect(trace).toEqual(snapshot)
  })
})
