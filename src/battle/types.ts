export type DragonPalaceOpcode = 'enter_palace' | 'request_weapon' | 'test_weapon'

export type RuyiStaffOpcode =
  | 'inspect_weights'
  | 'choose_sabre'
  | 'choose_halberd'
  | 'choose_ruyi_staff'
  | 'shrink_ruyi_staff'

export type BattleOpcode = DragonPalaceOpcode | RuyiStaffOpcode

export type RuyiStaffState =
  | 'awaiting-inspection'
  | 'weights-inspected'
  | 'wrong-weapon-selected'
  | 'ruyi-staff-selected'
  | 'ruyi-staff-shrunk'

export type DragonPalaceState =
  | 'outside-palace'
  | 'entered-palace'
  | 'weapon-requested'
  | 'weapon-tested'

export type BattleState = DragonPalaceState | RuyiStaffState

interface MissionBattleInstruction<TOpcode extends BattleOpcode> {
  instructionId: string
  sourceBlockId: string
  opcode: TOpcode
}

export type DragonPalaceInstruction = MissionBattleInstruction<DragonPalaceOpcode>

export type RuyiStaffInstruction = MissionBattleInstruction<RuyiStaffOpcode>

export type BattleInstruction = DragonPalaceInstruction | RuyiStaffInstruction

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
  opcode: DragonPalaceOpcode
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
      opcode: DragonPalaceOpcode
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

interface RuyiStaffEventBase {
  state: RuyiStaffState
  messageCode: string
}

type RuyiStaffLifecycleEvent<T extends 'run-started' | 'run-finished'> =
  RuyiStaffEventBase & {
    type: T
    instructionId: null
    sourceBlockId: null
    opcode: null
  }

type RuyiStaffInstructionEvent<
  T extends 'instruction-accepted' | 'instruction-rejected' | 'state-changed',
> = RuyiStaffEventBase & {
  type: T
  instructionId: string
  sourceBlockId: string
  opcode: RuyiStaffOpcode
}

export type RuyiStaffBattleEvent =
  | RuyiStaffLifecycleEvent<'run-started'>
  | RuyiStaffLifecycleEvent<'run-finished'>
  | RuyiStaffInstructionEvent<'instruction-accepted'>
  | RuyiStaffInstructionEvent<'instruction-rejected'>
  | RuyiStaffInstructionEvent<'state-changed'>

export type RuyiStaffBattleDiagnostic =
  | {
      type: 'instruction-rejected'
      concept: 'sequence-precondition' | 'wrong-weapon-selection'
      state: RuyiStaffState
      instructionId: string
      sourceBlockId: string
      opcode: RuyiStaffOpcode
      messageCode: string
    }
  | {
      type: 'program-ended-incomplete'
      concept: 'completeness'
      state: RuyiStaffState
      instructionId: null
      sourceBlockId: string | null
      opcode: null
      messageCode: string
    }

export type RuyiStaffBattleRunResult = {
  events: RuyiStaffBattleEvent[]
  penalty: BattlePenalty
} &
  (
    | {
        completed: true
        finalState: 'ruyi-staff-shrunk'
        diagnostic: null
      }
    | {
        completed: false
        finalState: RuyiStaffState
        diagnostic: RuyiStaffBattleDiagnostic
      }
  )
