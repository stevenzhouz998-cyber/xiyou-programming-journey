export type BattleOpcode = 'enter_palace' | 'request_weapon' | 'test_weapon'

export type DragonPalaceState =
  | 'outside-palace'
  | 'entered-palace'
  | 'weapon-requested'
  | 'weapon-tested'

export interface BattleInstruction {
  instructionId: string
  sourceBlockId: string
  opcode: BattleOpcode
}

interface BattleEventBase {
  state: DragonPalaceState
  messageCode: string
}

type BattleLifecycleEvent<T extends 'run-started' | 'run-finished'> = BattleEventBase & {
  type: T
  instructionId: null
  sourceBlockId: null
  opcode: null
}

type BattleInstructionEvent<
  T extends 'instruction-accepted' | 'instruction-rejected' | 'state-changed',
> = BattleEventBase & {
  type: T
  instructionId: string
  sourceBlockId: string
  opcode: BattleOpcode
}

export type BattleEvent =
  | BattleLifecycleEvent<'run-started'>
  | BattleLifecycleEvent<'run-finished'>
  | BattleInstructionEvent<'instruction-accepted'>
  | BattleInstructionEvent<'instruction-rejected'>
  | BattleInstructionEvent<'state-changed'>

export type BattleDiagnostic =
  | {
      type: 'instruction-rejected'
      concept: 'sequence-precondition'
      state: DragonPalaceState
      instructionId: string
      sourceBlockId: string
      opcode: BattleOpcode
      messageCode: string
    }
  | {
      type: 'program-ended-incomplete'
      concept: 'completeness'
      state: DragonPalaceState
      instructionId: null
      sourceBlockId: string | null
      opcode: null
      messageCode: string
    }

export interface BattlePenalty {
  livesLost: 0
  resourcesLost: 0
  starsLost: 0
}

interface BattleRunResultBase {
  events: BattleEvent[]
  penalty: BattlePenalty
}

export type BattleRunResult = BattleRunResultBase &
  (
    | {
        completed: true
        finalState: 'weapon-tested'
        diagnostic: null
      }
    | {
        completed: false
        finalState: DragonPalaceState
        diagnostic: BattleDiagnostic
      }
  )
