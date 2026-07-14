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

export interface BattleEvent {
  type:
    | 'run-started'
    | 'instruction-accepted'
    | 'instruction-rejected'
    | 'state-changed'
    | 'run-finished'
  state: DragonPalaceState
  instructionId: string | null
  sourceBlockId: string | null
  opcode: BattleOpcode | null
  messageCode: string
}

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

export interface BattleRunResult {
  completed: boolean
  finalState: DragonPalaceState
  events: BattleEvent[]
  diagnostic: BattleDiagnostic | null
  penalty: BattlePenalty
}
