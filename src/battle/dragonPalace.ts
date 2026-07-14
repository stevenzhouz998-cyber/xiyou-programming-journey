import type {
  BattleDiagnostic,
  BattleEvent,
  BattleInstruction,
  BattleOpcode,
  BattleRunResult,
  DragonPalaceState,
} from './types'

function transition(
  currentState: DragonPalaceState,
  opcode: BattleOpcode,
): DragonPalaceState | null {
  if (currentState === 'outside-palace' && opcode === 'enter_palace') {
    return 'entered-palace'
  }
  if (currentState === 'entered-palace' && opcode === 'request_weapon') {
    return 'weapon-requested'
  }
  if (currentState === 'weapon-requested' && opcode === 'test_weapon') {
    return 'weapon-tested'
  }
  return null
}

function instructionEvent(
  type: 'instruction-accepted' | 'instruction-rejected' | 'state-changed',
  state: DragonPalaceState,
  instruction: BattleInstruction,
  messageCode: string,
): BattleEvent {
  return {
    type,
    state,
    instructionId: instruction.instructionId,
    sourceBlockId: instruction.sourceBlockId,
    opcode: instruction.opcode,
    messageCode,
  }
}

export function runDragonPalaceBattle(
  instructions: readonly BattleInstruction[],
): BattleRunResult {
  let state: DragonPalaceState = 'outside-palace'
  let lastValidSourceBlockId: string | null = null
  const events: BattleEvent[] = [
    {
      type: 'run-started',
      state,
      instructionId: null,
      sourceBlockId: null,
      opcode: null,
      messageCode: 'dragon-palace.run-started',
    },
  ]

  for (const instruction of instructions) {
    const nextState = transition(state, instruction.opcode)

    if (nextState === null) {
      const messageCode = `dragon-palace.sequence-precondition.${state}.${instruction.opcode}`
      const diagnostic: BattleDiagnostic = {
        type: 'instruction-rejected',
        concept: 'sequence-precondition',
        state,
        instructionId: instruction.instructionId,
        sourceBlockId: instruction.sourceBlockId,
        opcode: instruction.opcode,
        messageCode,
      }

      events.push(instructionEvent('instruction-rejected', state, instruction, messageCode))
      events.push({
        type: 'run-finished',
        state,
        instructionId: null,
        sourceBlockId: null,
        opcode: null,
        messageCode: 'dragon-palace.run-finished.rejected',
      })

      return {
        completed: false,
        finalState: state,
        events,
        diagnostic,
        penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
      }
    }

    events.push(
      instructionEvent(
        'instruction-accepted',
        state,
        instruction,
        'dragon-palace.instruction-accepted',
      ),
    )
    state = nextState
    lastValidSourceBlockId = instruction.sourceBlockId
    events.push(
      instructionEvent(
        'state-changed',
        state,
        instruction,
        `dragon-palace.state-changed.${state}`,
      ),
    )
  }

  const completed = state === 'weapon-tested'
  const diagnostic: BattleDiagnostic | null = completed
    ? null
    : {
        type: 'program-ended-incomplete',
        concept: 'completeness',
        state,
        instructionId: null,
        sourceBlockId: lastValidSourceBlockId,
        opcode: null,
        messageCode: `dragon-palace.program-ended-incomplete.${state}`,
      }

  events.push({
    type: 'run-finished',
    state,
    instructionId: null,
    sourceBlockId: null,
    opcode: null,
    messageCode: completed
      ? 'dragon-palace.run-finished.completed'
      : 'dragon-palace.run-finished.incomplete',
  })

  return {
    completed,
    finalState: state,
    events,
    diagnostic,
    penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
  }
}
