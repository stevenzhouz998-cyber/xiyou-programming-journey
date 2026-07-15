import { describe, expect, it } from 'vitest'
import { runRuyiStaffBattle } from './ruyiStaff'
import type { RuyiStaffInstruction, RuyiStaffOpcode } from './types'
import type {
  BattleInstruction,
  BattleState,
  DragonPalaceInstruction,
  DragonPalaceOpcode,
} from './types'

const sharedDragonState: BattleState = 'outside-palace'
const sharedRuyiState: BattleState = 'awaiting-inspection'
// @ts-expect-error BattleState rejects states outside both mission domains.
const invalidSharedState: BattleState = 'unknown-battle-state'
const dragonOpcode: DragonPalaceOpcode = 'enter_palace'
const sharedRuyiInstruction = {
  instructionId: 'instruction:shared-ruyi',
  sourceBlockId: 'shared-ruyi',
  opcode: 'inspect_weights',
} satisfies BattleInstruction
const dragonInstruction = {
  instructionId: 'instruction:dragon',
  sourceBlockId: 'dragon',
  opcode: dragonOpcode,
} satisfies DragonPalaceInstruction
// @ts-expect-error Dragon Palace instructions cannot carry a Ruyi Staff opcode.
const invalidDragonInstruction = sharedRuyiInstruction satisfies DragonPalaceInstruction
// @ts-expect-error Ruyi Staff instructions cannot carry a Dragon Palace opcode.
const invalidRuyiInstruction = dragonInstruction satisfies RuyiStaffInstruction

void sharedRuyiInstruction
void sharedDragonState
void sharedRuyiState
void invalidSharedState
void dragonInstruction
void invalidDragonInstruction
void invalidRuyiInstruction

const instruction = (
  sourceBlockId: string,
  opcode: RuyiStaffOpcode,
): RuyiStaffInstruction => ({
  instructionId: `instruction:${sourceBlockId}`,
  sourceBlockId,
  opcode,
})

describe('ruyi staff battle domain', () => {
  it('completes only the inspect, choose ruyi staff, then shrink trace', () => {
    const result = runRuyiStaffBattle([
      instruction('inspect', 'inspect_weights'),
      instruction('choose', 'choose_ruyi_staff'),
      instruction('shrink', 'shrink_ruyi_staff'),
    ])

    expect(result.completed).toBe(true)
    expect(result.finalState).toBe('ruyi-staff-shrunk')
    expect(result.diagnostic).toBeNull()
    expect(result.events.filter((event) => event.type === 'state-changed').map((event) => event.state)).toEqual([
      'weights-inspected',
      'ruyi-staff-selected',
      'ruyi-staff-shrunk',
    ])
    expect(result.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 })
  })

  it.each(['choose_sabre', 'choose_halberd'] as const)(
    'models %s after inspection as a rejected wrong weapon selection and stops on it',
    (opcode) => {
      const wrong = instruction(`wrong-${opcode}`, opcode)
      const ignored = instruction('ignored', 'choose_ruyi_staff')
      const result = runRuyiStaffBattle([
        instruction('inspect', 'inspect_weights'),
        wrong,
        ignored,
      ])

      expect(result.completed).toBe(false)
      expect(result.finalState).toBe('wrong-weapon-selected')
      expect(result.diagnostic).toMatchObject({
        type: 'instruction-rejected',
        concept: 'wrong-weapon-selection',
        state: 'wrong-weapon-selected',
        instructionId: wrong.instructionId,
        sourceBlockId: wrong.sourceBlockId,
        opcode,
      })
      expect(result.events).toContainEqual(
        expect.objectContaining({
          type: 'instruction-rejected',
          state: 'wrong-weapon-selected',
          instructionId: wrong.instructionId,
          sourceBlockId: wrong.sourceBlockId,
          opcode,
        }),
      )
      expect(result.events.some((event) => event.instructionId === ignored.instructionId)).toBe(false)
      expect(result.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 })
    },
  )

  it('rejects illegal order on the actual instruction without running later blocks', () => {
    const illegal = instruction('shrink-first', 'shrink_ruyi_staff')
    const result = runRuyiStaffBattle([
      illegal,
      instruction('inspect-later', 'inspect_weights'),
    ])

    expect(result.finalState).toBe('awaiting-inspection')
    expect(result.diagnostic).toMatchObject({
      type: 'instruction-rejected',
      concept: 'sequence-precondition',
      state: 'awaiting-inspection',
      instructionId: illegal.instructionId,
      sourceBlockId: illegal.sourceBlockId,
      opcode: illegal.opcode,
    })
    expect(result.events.some((event) => event.sourceBlockId === 'inspect-later')).toBe(false)
  })

  it('rejects repeats on the repeated real instruction', () => {
    const repeated = instruction('inspect-again', 'inspect_weights')
    const result = runRuyiStaffBattle([
      instruction('inspect', 'inspect_weights'),
      repeated,
    ])

    expect(result.finalState).toBe('weights-inspected')
    expect(result.diagnostic).toMatchObject({
      type: 'instruction-rejected',
      instructionId: repeated.instructionId,
      sourceBlockId: repeated.sourceBlockId,
    })
  })

  it.each([
    {
      name: 'choose before inspect',
      trace: [instruction('choose-first', 'choose_ruyi_staff')],
      finalState: 'awaiting-inspection',
      problemBlockId: 'choose-first',
      problemOpcode: 'choose_ruyi_staff',
    },
    {
      name: 'shrink directly after inspect',
      trace: [
        instruction('inspect', 'inspect_weights'),
        instruction('shrink-too-soon', 'shrink_ruyi_staff'),
      ],
      finalState: 'weights-inspected',
      problemBlockId: 'shrink-too-soon',
      problemOpcode: 'shrink_ruyi_staff',
    },
    {
      name: 'choose again after the correct selection',
      trace: [
        instruction('inspect', 'inspect_weights'),
        instruction('choose-correct', 'choose_ruyi_staff'),
        instruction('choose-again', 'choose_halberd'),
      ],
      finalState: 'ruyi-staff-selected',
      problemBlockId: 'choose-again',
      problemOpcode: 'choose_halberd',
    },
    {
      name: 'repeat shrink after completion',
      trace: [
        instruction('inspect', 'inspect_weights'),
        instruction('choose', 'choose_ruyi_staff'),
        instruction('shrink', 'shrink_ruyi_staff'),
        instruction('shrink-again', 'shrink_ruyi_staff'),
      ],
      finalState: 'ruyi-staff-shrunk',
      problemBlockId: 'shrink-again',
      problemOpcode: 'shrink_ruyi_staff',
    },
  ] as const)(
    'rejects $name once and preserves the problem block provenance',
    ({ trace, finalState, problemBlockId, problemOpcode }) => {
      const result = runRuyiStaffBattle(trace)

      expect(result.completed).toBe(false)
      expect(result.finalState).toBe(finalState)
      expect(result.events.filter((event) => event.type === 'run-started')).toHaveLength(1)
      expect(result.events.filter((event) => event.type === 'run-finished')).toHaveLength(1)
      expect(result.events.filter((event) => event.type === 'instruction-rejected')).toHaveLength(1)
      expect(result.diagnostic).toMatchObject({
        type: 'instruction-rejected',
        concept: 'sequence-precondition',
        instructionId: `instruction:${problemBlockId}`,
        sourceBlockId: problemBlockId,
        opcode: problemOpcode,
      })
      expect(result.events).toContainEqual(
        expect.objectContaining({
          type: 'instruction-rejected',
          instructionId: `instruction:${problemBlockId}`,
          sourceBlockId: problemBlockId,
          opcode: problemOpcode,
        }),
      )
    },
  )

  it('returns program-ended-incomplete with the last accepted source for a valid prefix', () => {
    const result = runRuyiStaffBattle([
      instruction('inspect', 'inspect_weights'),
      instruction('choose', 'choose_ruyi_staff'),
    ])

    expect(result.completed).toBe(false)
    expect(result.finalState).toBe('ruyi-staff-selected')
    expect(result.diagnostic).toMatchObject({
      type: 'program-ended-incomplete',
      concept: 'completeness',
      instructionId: null,
      sourceBlockId: 'choose',
      opcode: null,
    })
  })

  it('does not mutate inputs and returns equal results across repeated runs', () => {
    const trace = [
      instruction('inspect', 'inspect_weights'),
      instruction('wrong', 'choose_sabre'),
    ] as const
    const snapshot = structuredClone(trace)

    const first = runRuyiStaffBattle(trace)
    const second = runRuyiStaffBattle(trace)

    expect(trace).toEqual(snapshot)
    expect(second).toEqual(first)
  })
})
