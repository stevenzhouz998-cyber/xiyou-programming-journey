import type {
  FourSeasBattleDiagnostic,
  FourSeasBattleEvent,
  FourSeasBattleRunResult,
  FourSeasInstruction,
  FourSeasOpcode,
  FourSeasState,
} from './types'
import { FOUR_SEAS_OPCODE_PARENT_SCOPE } from '../blockly/fourSeasRegaliaContract'

const zeroPenalty = { livesLost: 0, resourcesLost: 0, starsLost: 0 } as const

const transitions: Readonly<
  Partial<Record<FourSeasState, Partial<Record<FourSeasOpcode, FourSeasState>>>>
> = {
  'awaiting-request': { request_regalia: 'regalia-requested' },
  'regalia-requested': { collect_gifts: 'collecting-gifts' },
  'collecting-gifts': { receive_cloud_boots: 'cloud-boots-received' },
  'cloud-boots-received': { receive_golden_armor: 'golden-armor-received' },
  'golden-armor-received': { receive_purple_crown: 'all-gifts-received' },
  'all-gifts-received': { equip_regalia: 'equipping-regalia' },
  'equipping-regalia': { wear_crown: 'crown-equipped' },
  'crown-equipped': { wear_armor: 'armor-equipped' },
  'armor-equipped': { wear_boots: 'regalia-equipped' },
  'regalia-equipped': { verify_regalia: 'regalia-verified' },
}

function instructionEvent(
  type: 'instruction-accepted' | 'instruction-rejected' | 'state-changed',
  state: FourSeasState,
  instruction: FourSeasInstruction,
  messageCode: string,
): FourSeasBattleEvent {
  return {
    type,
    state,
    instructionId: instruction.instructionId,
    sourceBlockId: instruction.sourceBlockId,
    parentBlockId: instruction.parentBlockId,
    opcode: instruction.opcode,
    messageCode,
  }
}

function hasCorrectParent(
  instruction: FourSeasInstruction,
  collectBlockId: string | null,
  equipBlockId: string | null,
): boolean {
  const scope = FOUR_SEAS_OPCODE_PARENT_SCOPE[instruction.opcode]
  if (scope === 'collect') {
    return collectBlockId !== null && instruction.parentBlockId === collectBlockId
  }
  if (scope === 'equip') {
    return equipBlockId !== null && instruction.parentBlockId === equipBlockId
  }
  return instruction.parentBlockId === null
}

export function runFourSeasRegalia(
  instructions: readonly FourSeasInstruction[],
): FourSeasBattleRunResult {
  let state: FourSeasState = 'awaiting-request'
  let lastAcceptedSourceBlockId: string | null = null
  let lastAcceptedParentBlockId: string | null = null
  let collectBlockId: string | null = null
  let equipBlockId: string | null = null
  const events: FourSeasBattleEvent[] = [
    {
      type: 'run-started',
      state,
      instructionId: null,
      sourceBlockId: null,
      parentBlockId: null,
      opcode: null,
      messageCode: 'four-seas-regalia.run-started',
    },
  ]

  for (const instruction of instructions) {
    const hasCorrectScope = hasCorrectParent(instruction, collectBlockId, equipBlockId)
    const concept = hasCorrectScope ? 'sequence-precondition' : 'container-scope'
    const nextState: FourSeasState | null = hasCorrectScope
      ? transitions[state]?.[instruction.opcode] ?? null
      : null

    if (nextState === null) {
      const messageCode = `four-seas-regalia.${concept}.${state}.${instruction.opcode}`
      const diagnostic: FourSeasBattleDiagnostic = {
        type: 'instruction-rejected',
        concept,
        state,
        ...instruction,
        messageCode,
      }
      events.push(instructionEvent('instruction-rejected', state, instruction, messageCode))
      events.push({
        type: 'run-finished',
        state,
        instructionId: null,
        sourceBlockId: null,
        parentBlockId: null,
        opcode: null,
        messageCode: 'four-seas-regalia.run-finished.rejected',
      })
      return { completed: false, finalState: state, diagnostic, events, penalty: zeroPenalty }
    }

    events.push(
      instructionEvent(
        'instruction-accepted',
        state,
        instruction,
        'four-seas-regalia.instruction-accepted',
      ),
    )
    state = nextState
    lastAcceptedSourceBlockId = instruction.sourceBlockId
    lastAcceptedParentBlockId = instruction.parentBlockId
    if (instruction.opcode === 'collect_gifts') collectBlockId = instruction.sourceBlockId
    if (instruction.opcode === 'equip_regalia') equipBlockId = instruction.sourceBlockId
    events.push(
      instructionEvent(
        'state-changed',
        state,
        instruction,
        `four-seas-regalia.state-changed.${state}`,
      ),
    )
  }

  events.push({
    type: 'run-finished',
    state,
    instructionId: null,
    sourceBlockId: null,
    parentBlockId: null,
    opcode: null,
    messageCode:
      state === 'regalia-verified'
        ? 'four-seas-regalia.run-finished.completed'
        : 'four-seas-regalia.run-finished.incomplete',
  })

  if (state === 'regalia-verified') {
    return { completed: true, finalState: state, diagnostic: null, events, penalty: zeroPenalty }
  }

  const diagnostic: FourSeasBattleDiagnostic = {
    type: 'program-ended-incomplete',
    concept: 'completeness',
    state,
    instructionId: null,
    sourceBlockId: lastAcceptedSourceBlockId,
    parentBlockId: lastAcceptedParentBlockId,
    opcode: null,
    messageCode: `four-seas-regalia.program-ended-incomplete.${state}`,
  }
  return { completed: false, finalState: state, diagnostic, events, penalty: zeroPenalty }
}
