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

export interface MissionSessionById {
  'w1-m1': DragonPalaceMissionSession;
  'w1-m2': RuyiStaffMissionSession;
  'w1-m3': FourSeasRegaliaMissionSession;
  'w1-m4': AdvancedWeekOneMissionSession;
  'w1-m5': AdvancedWeekOneMissionSession;
}

export type ExecutableMissionId = keyof MissionSessionById;
export type MissionSession = MissionSessionById[ExecutableMissionId];
export type MissionSessions = { [MissionId in ExecutableMissionId]?: MissionSessionById[MissionId] };

export interface ProgressV3 {
  version: 3;
  schemaRevision: 2;
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
  savedAt: string;
}

export type ProgressDocument = ProgressV1 | ProgressV2 | ProgressV3;
