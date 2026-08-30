import type {
  BattleRunResult,
  DragonPalaceInstruction,
  FourSeasBattleRunResult,
  FourSeasInstruction,
  RuyiStaffBattleRunResult,
  RuyiStaffInstruction,
} from '../battle/types';
import type { WorkspaceDraftV1 } from '../blockly/draft';
import type { FourSeasWorkspaceDraftV1 } from '../blockly/fourSeasRegaliaDraft';
import type { RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft';
import type { AdvancedWeekOneWorkspaceDraftV1 } from '../blockly/advancedWeekOneDraft';
import type { AdvancedWeekOneInstruction } from '../blockly/advancedWeekOneContract';
import type { AdvancedWeekOneRunResult } from '../battle/advancedWeekOne';
import type { EquipmentEffect, RewardEquipmentStateV1 } from './equipment';
import type {
  HorseCareInstruction,
  HorseCareRunResult,
  HorseCareWorkspaceDraftV1,
} from '../blockly/weekTwoHorseContract';
import type {
  MonkeyKingInstruction,
  MonkeyKingRunResult,
  MonkeyKingWorkspaceDraftV1,
} from '../blockly/weekTwoMonkeyKingContract';
import type {
  PeachElixirInstruction,
  PeachElixirRunResult,
  PeachElixirWorkspaceDraftV1,
} from '../blockly/weekTwoPeachElixirContract';
import type {
  FurnaceConditionInstruction,
  FurnaceConditionRunResult,
  FurnaceConditionWorkspaceDraftV1,
} from '../blockly/weekTwoFurnaceConditionContract';
import type {
  HeavenlySignalBossInstruction,
  HeavenlySignalBossRunResult,
  HeavenlySignalBossWorkspaceDraftV1,
} from '../blockly/weekTwoHeavenlySignalBossContract';
import type {
  ManorHelpFailureSnapshot,
  ManorHelpInstruction,
  ManorHelpRunResult,
  ManorHelpScenarioResult,
  ManorHelpWorkspaceDraftV1,
} from '../blockly/weekThreeManorHelpContract';
import type {
  CuilanBooleanInstruction,
  CuilanBooleanRunResult,
  CuilanBooleanWorkspaceDraftV1,
  CuilanCheckpointResult,
  CuilanFailureSnapshot,
} from '../blockly/weekThreeCuilanBooleanContract';
import type {
  YunzhanDialogueFailureSnapshot,
  YunzhanDialogueInstruction,
  YunzhanDialogueRunResult,
  YunzhanDialogueWorkspaceDraftV1,
} from '../blockly/weekThreeYunzhanDialogueContract';
import type {
  BajieJoiningFailureSnapshot,
  BajieJoiningInstruction,
  BajieJoiningRunResult,
  BajieJoiningScenarioResult,
  BajieJoiningWorkspaceDraftV1,
} from '../blockly/weekThreeBajieJoiningContract';
import type {
  WeekThreeBossFailureSnapshot,
  WeekThreeBossConcept,
  WeekThreeBossInstruction,
  WeekThreeBossRunResult,
  WeekThreeBossWorkspaceDraftV1,
} from '../blockly/weekThreeBossContract';

export interface MissionProgress {
  status: 'completed';
  stars: 1 | 2 | 3;
  attempts: number;
  hintsUsed: number;
  completedAt: string;
}

export interface ProgressSettings {
  muted: boolean;
  reducedMotion: boolean;
  reducedMotionOverride: boolean;
  parentPin: string;
}

export interface LearningAbilitiesV1 {
  conditionObservation: {
    acquiredAt: string | null;
    stableUnlockedAt: string | null;
  };
}

export interface ProgressV1 {
  version: 1;
  learnerName: string;
  missions: Record<string, MissionProgress>;
  settings: Omit<ProgressSettings, 'reducedMotionOverride'>;
  savedAt: string;
}

export interface ProgressV2 {
  version: 2;
  schemaRevision: 1;
  learnerName: string;
  missions: Record<string, MissionProgress>;
  settings: ProgressSettings;
  privacy: { localDataNoticeSeen: boolean };
  recovery: {
    lastRecoveredAt: string | null;
    source: 'snapshot' | 'initial' | null;
  };
  savedAt: string;
}

interface MissionSessionData<TWorkspace, TInstruction, TRun> {
  workspace: TWorkspace;
  lastTrace: TInstruction[];
  lastRun: TRun | null;
  totalRuns: number;
  runtimeFailures: number;
  compileFailures: number;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  conceptFailures: {
    programStructure: number;
    sequencePrecondition: number;
    completeness: number;
  };
  lastRunAt: string | null;
  savedAt: string;
}

export type DragonPalaceMissionSession = MissionSessionData<
  WorkspaceDraftV1,
  DragonPalaceInstruction,
  BattleRunResult
>;

export type RuyiStaffMissionSession = MissionSessionData<
  RuyiWorkspaceDraftV1,
  RuyiStaffInstruction,
  RuyiStaffBattleRunResult
>;

export type FourSeasRegaliaMissionSession = MissionSessionData<
  FourSeasWorkspaceDraftV1,
  FourSeasInstruction,
  FourSeasBattleRunResult
>;

export type AdvancedWeekOneMissionSession = MissionSessionData<
  AdvancedWeekOneWorkspaceDraftV1,
  AdvancedWeekOneInstruction,
  AdvancedWeekOneRunResult
> & { equipmentEffectsUsed: EquipmentEffect[] };

export type HorseCareMissionSession = MissionSessionData<
  HorseCareWorkspaceDraftV1,
  HorseCareInstruction,
  HorseCareRunResult
>;

export type MonkeyKingMissionSession = MissionSessionData<
  MonkeyKingWorkspaceDraftV1,
  MonkeyKingInstruction,
  MonkeyKingRunResult
>;

export type PeachElixirMissionSession = MissionSessionData<
  PeachElixirWorkspaceDraftV1,
  PeachElixirInstruction,
  PeachElixirRunResult
>;

export type FurnaceConditionMissionSession = MissionSessionData<
  FurnaceConditionWorkspaceDraftV1,
  FurnaceConditionInstruction,
  FurnaceConditionRunResult
>;

export interface HeavenlySignalBossMissionSession extends Omit<MissionSessionData<
  HeavenlySignalBossWorkspaceDraftV1,
  HeavenlySignalBossInstruction,
  HeavenlySignalBossRunResult
>, 'conceptFailures'> {
  conceptFailures: {
    programStructure: number;
    loopCount: number;
    eventRouting: number;
    handlerSequence: number;
    sequencePrecondition: number;
    loopCondition: number;
    conditionNeverMet: number;
    completeness: number;
  };
}

export interface ManorHelpMissionSession extends Omit<MissionSessionData<
  ManorHelpWorkspaceDraftV1,
  ManorHelpInstruction,
  ManorHelpRunResult
>, 'conceptFailures'> {
  conceptFailures: {
    programStructure: number;
    conditionSelection: number;
    branchRouting: number;
    completeness: number;
  };
  scenarioResults: ManorHelpScenarioResult[];
  failureSnapshot: ManorHelpFailureSnapshot | null;
  conditionObservationUses: Array<{
    snapshotId: string;
    usedAt: string;
    workspace: ManorHelpWorkspaceDraftV1;
  }>;
}

export interface CuilanBooleanMissionSession extends Omit<MissionSessionData<
  CuilanBooleanWorkspaceDraftV1,
  CuilanBooleanInstruction,
  CuilanBooleanRunResult
>, 'conceptFailures'> {
  conceptFailures: {
    programStructure: number;
    conditionSelection: number;
    branchRouting: number;
    sequencePrecondition: number;
    completeness: number;
  };
  checkpointResults: CuilanCheckpointResult[];
  failureSnapshot: CuilanFailureSnapshot | null;
  conditionObservationUses: Array<{
    snapshotId: string;
    usedAt: string;
    workspace: CuilanBooleanWorkspaceDraftV1;
  }>;
}

export interface YunzhanDialogueMissionSession extends Omit<MissionSessionData<
  YunzhanDialogueWorkspaceDraftV1,
  YunzhanDialogueInstruction,
  YunzhanDialogueRunResult
>, 'conceptFailures'> {
  conceptFailures: { programStructure: number; branchRouting: number; completeness: number };
  roundResults: YunzhanDialogueRunResult['rounds'];
  failureSnapshot: YunzhanDialogueFailureSnapshot | null;
  conditionObservationUses: Array<{ snapshotId: string; usedAt: string; workspace: YunzhanDialogueWorkspaceDraftV1 }>;
}

export interface BajieJoiningMissionSession extends Omit<MissionSessionData<
  BajieJoiningWorkspaceDraftV1,
  BajieJoiningInstruction,
  BajieJoiningRunResult
>, 'conceptFailures'> {
  conceptFailures: { programStructure: number; booleanComposition: number; completeness: number };
  scenarioResults: BajieJoiningScenarioResult[];
  failureSnapshot: BajieJoiningFailureSnapshot | null;
  conditionObservationUses: Array<{ snapshotId: string; usedAt: string; workspace: BajieJoiningWorkspaceDraftV1 }>;
}

/** Saved evidence for the one connected W3-M5 state-machine workspace. */
export interface WeekThreeBossMissionSession extends Omit<MissionSessionData<
  WeekThreeBossWorkspaceDraftV1,
  WeekThreeBossInstruction,
  WeekThreeBossRunResult
>, 'conceptFailures'> {
  successfulFullRuns: number;
  conceptFailures: {
    programStructure: number;
    manorHelpSpecificity: number;
    disguiseIdentity: number;
    yunzhanBranch: number;
    joiningOperator: number;
  };
  failureSnapshot: WeekThreeBossFailureSnapshot | null;
  /** Immutable learning-history fact: the first runtime concept that blocked this Boss. */
  firstBlockingConcept: WeekThreeBossConcept | null;
  conditionObservationUses: Array<{
    snapshotId: string;
    usedAt: string;
    workspace: WeekThreeBossWorkspaceDraftV1;
  }>;
}

export type ManorHelpCompletionEvidence =
  | {
    kind: 'legacy-preformal';
    completedAt: string;
    sourceVersion: 1 | 2 | 3;
    sourceSchemaRevision: null | 1 | 2;
  }
  | {
    kind: 'formal-v3';
    completedAt: string;
    verifiedAt: string;
    workspace: ManorHelpWorkspaceDraftV1;
    trace: ManorHelpInstruction[];
    run: ManorHelpRunResult;
  };

export type CuilanBooleanCompletionEvidence =
  | {
    kind: 'legacy-preformal';
    completedAt: string;
    sourceVersion: 3;
    sourceSchemaRevision: 3;
  }
  | {
    kind: 'formal-v3';
    completedAt: string;
    verifiedAt: string;
    workspace: CuilanBooleanWorkspaceDraftV1;
    trace: CuilanBooleanInstruction[];
    run: CuilanBooleanRunResult;
  };

export type YunzhanDialogueCompletionEvidence =
  | { kind: 'legacy-preformal'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 4 }
  | { kind: 'formal-v3'; completedAt: string; verifiedAt: string; workspace: YunzhanDialogueWorkspaceDraftV1; trace: YunzhanDialogueInstruction[]; run: YunzhanDialogueRunResult };

export type BajieJoiningCompletionEvidence =
  | { kind: 'legacy-preformal'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-preformal'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-preformal'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 }
  | { kind: 'formal-v3'; completedAt: string; verifiedAt: string; workspace: BajieJoiningWorkspaceDraftV1; trace: BajieJoiningInstruction[]; run: BajieJoiningRunResult };

export type BajieLegacyReplayEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 };

export type WeekThreeBossCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 6 }
  | {
    kind: 'formal-v3';
    completedAt: string;
    verifiedAt: string;
    workspace: WeekThreeBossWorkspaceDraftV1;
    trace: WeekThreeBossInstruction[];
    run: WeekThreeBossRunResult;
  };

export interface MissionCompletionEvidenceV1 {
  'w3-m1'?: ManorHelpCompletionEvidence;
  'w3-m2'?: CuilanBooleanCompletionEvidence;
  'w3-m3'?: YunzhanDialogueCompletionEvidence;
  'w3-m4'?: BajieJoiningCompletionEvidence;
  'w3-m5'?: WeekThreeBossCompletionEvidence;
}

export interface MissionSessionById {
  'w1-m1': DragonPalaceMissionSession;
  'w1-m2': RuyiStaffMissionSession;
  'w1-m3': FourSeasRegaliaMissionSession;
  'w1-m4': AdvancedWeekOneMissionSession;
  'w1-m5': AdvancedWeekOneMissionSession;
  'w2-m1': HorseCareMissionSession;
  'w2-m2': MonkeyKingMissionSession;
  'w2-m3': PeachElixirMissionSession;
  'w2-m4': FurnaceConditionMissionSession;
  'w2-m5': HeavenlySignalBossMissionSession;
  'w3-m1': ManorHelpMissionSession;
  'w3-m2': CuilanBooleanMissionSession;
  'w3-m3': YunzhanDialogueMissionSession;
  'w3-m4': BajieJoiningMissionSession;
  'w3-m5': WeekThreeBossMissionSession;
}

export type ExecutableMissionId = keyof MissionSessionById;
export type MissionSession = MissionSessionById[ExecutableMissionId];
export type AnyMissionSession = MissionSession;
export type MissionSessions = { [MissionId in keyof MissionSessionById]?: MissionSessionById[MissionId] };

export interface ProgressV3 {
  version: 3;
  schemaRevision: 3 | 4 | 5 | 6 | 7;
  learnerName: string;
  missions: Record<string, MissionProgress>;
  settings: ProgressSettings;
  privacy: { localDataNoticeSeen: boolean };
  recovery: {
    lastRecoveredAt: string | null;
    source: 'snapshot' | 'initial' | null;
  };
  sessions: MissionSessions;
  equipment: RewardEquipmentStateV1;
  abilities: LearningAbilitiesV1;
  missionCompletionEvidence: MissionCompletionEvidenceV1;
  savedAt: string;
}

export type ProgressDocument = ProgressV1 | ProgressV2 | ProgressV3;
