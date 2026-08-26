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

export interface MissionCompletionEvidenceV1 {
  'w3-m1'?: ManorHelpCompletionEvidence;
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
}

export type ExecutableMissionId = keyof MissionSessionById;
export type MissionSession = MissionSessionById[ExecutableMissionId];
export type MissionSessions = { [MissionId in ExecutableMissionId]?: MissionSessionById[MissionId] };

export interface ProgressV3 {
  version: 3;
  schemaRevision: 3;
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
