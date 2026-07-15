import type {
  RuyiStaffBattleDiagnostic,
  RuyiStaffBattleEvent,
  RuyiStaffBattleRunResult,
  RuyiStaffInstruction,
  RuyiStaffOpcode,
  RuyiStaffState,
} from './types'

const zeroPenalty = { livesLost: 0, resourcesLost: 0, starsLost: 0 } as const

function transition(
  state: RuyiStaffState,
  opcode: RuyiStaffOpcode,
): RuyiStaffState | null {
  if (state === 'awaiting-inspection' && opcode === 'inspect_weights') {
    return 'weights-inspected'
  }
  if (state === 'weights-inspected' && opcode === 'choose_ruyi_staff') {
    return 'ruyi-staff-selected'
  }
  if (state === 'ruyi-staff-selected' && opcode === 'shrink_ruyi_staff') {
    return 'ruyi-staff-shrunk'
  }
  return null
}

function instructionEvent(
  type: 'instruction-accepted' | 'instruction-rejected' | 'state-changed',
  state: RuyiStaffState,
  instruction: RuyiStaffInstruction,
  messageCode: string,
): RuyiStaffBattleEvent {
  return {
    type,
    state,
    instructionId: instruction.instructionId,
    sourceBlockId: instruction.sourceBlockId,
    opcode: instruction.opcode,
    messageCode,
  }
}

export function runRuyiStaffBattle(
  instructions: readonly RuyiStaffInstruction[],
): RuyiStaffBattleRunResult {
  let state: RuyiStaffState = 'awaiting-inspection'
  let lastAcceptedSourceBlockId: string | null = null
  const events: RuyiStaffBattleEvent[] = [
    {
      type: 'run-started',
      state,
      instructionId: null,
      sourceBlockId: null,
      opcode: null,
      messageCode: 'ruyi-staff.run-started',
    },
  ]

  for (const instruction of instructions) {
    if (
      state === 'weights-inspected'
      && (instruction.opcode === 'choose_sabre' || instruction.opcode === 'choose_halberd')
    ) {
      state = 'wrong-weapon-selected'
      const messageCode = `ruyi-staff.wrong-weapon-selected.${instruction.opcode}`
      const diagnostic: RuyiStaffBattleDiagnostic = {
        type: 'instruction-rejected',
        concept: 'wrong-weapon-selection',
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
        messageCode: 'ruyi-staff.run-finished.wrong-weapon-selected',
      })
      return {
        completed: false,
        finalState: state,
        diagnostic,
        events,
        penalty: zeroPenalty,
      }
    }

    const nextState = transition(state, instruction.opcode)
    if (nextState === null) {
      const messageCode = `ruyi-staff.sequence-precondition.${state}.${instruction.opcode}`
      const diagnostic: RuyiStaffBattleDiagnostic = {
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
        messageCode: 'ruyi-staff.run-finished.rejected',
      })
      return {
        completed: false,
        finalState: state,
        diagnostic,
        events,
        penalty: zeroPenalty,
      }
    }

    events.push(
      instructionEvent(
        'instruction-accepted',
        state,
        instruction,
        'ruyi-staff.instruction-accepted',
      ),
    )
    state = nextState
    lastAcceptedSourceBlockId = instruction.sourceBlockId
    events.push(
      instructionEvent(
        'state-changed',
        state,
        instruction,
        `ruyi-staff.state-changed.${state}`,
      ),
    )
  }

  if (state === 'ruyi-staff-shrunk') {
    events.push({
      type: 'run-finished',
      state,
      instructionId: null,
      sourceBlockId: null,
      opcode: null,
      messageCode: 'ruyi-staff.run-finished.completed',
    })
    return {
      completed: true,
      finalState: state,
      diagnostic: null,
      events,
      penalty: zeroPenalty,
    }
  }

  const diagnostic: RuyiStaffBattleDiagnostic = {
    type: 'program-ended-incomplete',
    concept: 'completeness',
    state,
    instructionId: null,
    sourceBlockId: lastAcceptedSourceBlockId,
    opcode: null,
    messageCode: `ruyi-staff.program-ended-incomplete.${state}`,
  }
  events.push({
    type: 'run-finished',
    state,
    instructionId: null,
    sourceBlockId: null,
    opcode: null,
    messageCode: 'ruyi-staff.run-finished.incomplete',
  })
  return {
    completed: false,
    finalState: state,
    diagnostic,
    events,
    penalty: zeroPenalty,
  }
}
