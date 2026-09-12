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
import type { WeekFourMappingMissionSession } from './weekFourMappingSession';
export type { WeekFourMappingMissionSession } from './weekFourMappingSession';
import type {
  WeekFourVariableFailureSnapshot,
  WeekFourVariableRunResult,
  WeekFourVariableTraceItem,
} from '../engine/weekFourVariableContract';
import type { WeekFourVariableMissionSession } from './weekFourVariableSession';
export type { WeekFourVariableMissionSession } from './weekFourVariableSession';
import type { WeekFourBranchMissionSession } from './weekFourBranchSession';
export type { WeekFourBranchMissionSession } from './weekFourBranchSession';
import type {
  WeekFourBranchRunResult,
  WeekFourBranchTraceItem,
} from '../engine/weekFourBranchContract';

import type { WeekFourListMissionSession } from './weekFourListSession';
export type { WeekFourListMissionSession } from './weekFourListSession';
import type {
  WeekFourListRunResult,
  WeekFourListTraceItem,
} from '../engine/weekFourListContract';
import type { WeekFourBossMissionSession } from './weekFourBossSession';
export type { WeekFourBossMissionSession } from './weekFourBossSession';
import type {
  WeekFourBossRunResult,
  WeekFourBossTraceItem,
} from '../engine/weekFourBossContract';
import type { WeekFiveMonksMissionSession } from './weekFiveMonksSession';
export type { WeekFiveMonksMissionSession } from './weekFiveMonksSession';
import type {
  WeekFiveMonksRunResult,
  WeekFiveMonksTraceItem,
} from '../engine/weekFiveMonksContract';
import type { WeekFiveFunctionMissionSession } from './weekFiveFunctionSession';
export type { WeekFiveFunctionMissionSession } from './weekFiveFunctionSession';
import type { WeekFiveFunctionRunResult, WeekFiveFunctionTraceItem } from '../engine/weekFiveFunctionContract';
import type { WeekFiveWeatherMissionSession } from './weekFiveWeatherSession';
export type { WeekFiveWeatherMissionSession } from './weekFiveWeatherSession';
import type { WeekFiveWeatherRunResult, WeekFiveWeatherTraceItem } from '../engine/weekFiveWeatherContract';
import type { WeekFiveDecompositionMissionSession } from './weekFiveDecompositionSession';
export type { WeekFiveDecompositionMissionSession } from './weekFiveDecompositionSession';
import type { WeekFiveDecompositionRunResult, WeekFiveDecompositionTraceItem } from '../engine/weekFiveDecompositionContract';
import type { WeekFiveStoryOrchestrationMissionSession } from './weekFiveStoryOrchestrationSession';
export type { WeekFiveStoryOrchestrationMissionSession } from './weekFiveStoryOrchestrationSession';
import type { WeekFiveStoryOrchestrationRunResult, WeekFiveStoryOrchestrationTraceItem } from '../engine/weekFiveStoryOrchestrationContract';
import type { WeekSixRecordsMissionSession } from './weekSixRecordsSession';
export type { WeekSixRecordsMissionSession } from './weekSixRecordsSession';
import type { WeekSixRecordsRunResult, WeekSixRecordsTraceItem } from '../engine/weekSixRecordsContract';

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

export type WeekFourMappingCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1 | 2 | 3; sourceSchemaRevision: null | 1 | 2 | 3 | 4 | 5 | 6 | 7 }
  | {
    kind: 'formal-v3'; completedAt: string; verifiedAt: string;
    workspace: import('../blockly/weekFourMappingDraft').WeekFourMappingWorkspaceDraftV1;
    pythonCode: string;
    blocklyTrace: import('../blockly/weekFourMappingContract').WeekFourMappingTraceItem[];
    pythonTrace: import('../blockly/weekFourMappingContract').WeekFourMappingTraceItem[];
    run: import('../blockly/weekFourMappingContract').WeekFourMappingRunResult;
    workId: 'w4-m1-first-python-mapping';
  };

export interface WeekFourMappingWorkV1 {
  kind: 'blockly-python-mapping-v1';
  workId: 'w4-m1-first-python-mapping'; missionId: 'w4-m1'; title: '第一份积木与 Python 对照经卷';
  workspace: import('../blockly/weekFourMappingDraft').WeekFourMappingWorkspaceDraftV1;
  pythonCode: string;
  blocklyTrace: import('../blockly/weekFourMappingContract').WeekFourMappingTraceItem[];
  pythonTrace: import('../blockly/weekFourMappingContract').WeekFourMappingTraceItem[];
  run: import('../blockly/weekFourMappingContract').WeekFourMappingRunResult;
  createdAt: string; verifiedAt: string;
}

export type WeekFourVariableCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }
  | {
    kind: 'formal-v3'; completedAt: string; verifiedAt: string; pythonCode: string;
    canonicalTrace: WeekFourVariableTraceItem[]; workerTrace: WeekFourVariableTraceItem[];
    run: WeekFourVariableRunResult; workId: 'w4-m2-variable-evidence-record';
  };

export interface WeekFourVariableWorkV1 {
  kind: 'python-variable-evidence-v1';
  workId: 'w4-m2-variable-evidence-record';
  missionId: 'w4-m2';
  title: '第一次变化变量取证记录';
  pythonCode: string;
  canonicalTrace: WeekFourVariableTraceItem[];
  workerTrace: WeekFourVariableTraceItem[];
  run: WeekFourVariableRunResult;
  createdAt: string;
  verifiedAt: string;
}

export type WeekFourBranchCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }
  | {
    kind: 'formal-v3'; completedAt: string; verifiedAt: string; pythonCode: string;
    canonicalTrace: WeekFourBranchTraceItem[]; workerTrace: WeekFourBranchTraceItem[];
    run: WeekFourBranchRunResult; workId: 'w4-m3-branch-structure-record';
  };

export interface WeekFourBranchWorkV1 {
  kind: 'python-branch-structure-v1';
  workId: 'w4-m3-branch-structure-record';
  missionId: 'w4-m3';
  title: string;
  pythonCode: string;
  canonicalTrace: WeekFourBranchTraceItem[];
  workerTrace: WeekFourBranchTraceItem[];
  run: WeekFourBranchRunResult;
  createdAt: string;
  verifiedAt: string;
}

export type WeekFourListCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 }
  | {
    kind: 'formal-v3'; completedAt: string; verifiedAt: string; pythonCode: string;
    canonicalTrace: WeekFourListTraceItem[]; workerTrace: WeekFourListTraceItem[];
    run: WeekFourListRunResult; workId: 'w4-m4-list-loop-record';
  };

export interface WeekFourListWorkV1 {
  kind: 'python-list-loop-v1';
  workId: 'w4-m4-list-loop-record';
  missionId: 'w4-m4';
  title: string;
  pythonCode: string;
  canonicalTrace: WeekFourListTraceItem[];
  workerTrace: WeekFourListTraceItem[];
  run: WeekFourListRunResult;
  createdAt: string;
  verifiedAt: string;
}
export type WeekFourBossCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 }
  | {
    kind: 'formal-v3'; completedAt: string; verifiedAt: string; pythonCode: string;
    canonicalTrace: WeekFourBossTraceItem[]; workerTrace: WeekFourBossTraceItem[];
    run: WeekFourBossRunResult; workId: 'w4-m5-verification-report';
  };

export interface WeekFourBossWorkV1 {
  kind: 'python-verification-station-v1';
  workId: 'w4-m5-verification-report';
  missionId: 'w4-m5';
  title: string;
  pythonCode: string;
  canonicalTrace: WeekFourBossTraceItem[];
  workerTrace: WeekFourBossTraceItem[];
  run: WeekFourBossRunResult;
  createdAt: string;
  verifiedAt: string;
}
export type WeekFiveMonksCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 }
  | {
    kind: 'formal-v3'; completedAt: string; verifiedAt: string; pythonCode: string;
    canonicalTrace: WeekFiveMonksTraceItem[]; workerTrace: WeekFiveMonksTraceItem[];
    run: WeekFiveMonksRunResult; workId: 'w5-m1-monks-rescue-record';
  };

export interface WeekFiveMonksWorkV1 {
  kind: 'python-monks-loop-v1';
  workId: 'w5-m1-monks-rescue-record';
  missionId: 'w5-m1';
  title: string;
  pythonCode: string;
  canonicalTrace: WeekFiveMonksTraceItem[];
  workerTrace: WeekFiveMonksTraceItem[];
  run: WeekFiveMonksRunResult;
  createdAt: string;
  verifiedAt: string;
}
export type WeekFiveFunctionCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 }
  | {
    kind: 'formal-v3'; completedAt: string; verifiedAt: string; pythonCode: string;
    canonicalTrace: WeekFiveFunctionTraceItem[]; workerTrace: WeekFiveFunctionTraceItem[];
    run: WeekFiveFunctionRunResult; workId: 'w5-m2-sanqing-function-record';
  };

export interface WeekFiveFunctionWorkV1 {
  kind: 'python-function-call-v1';
  workId: 'w5-m2-sanqing-function-record';
  missionId: 'w5-m2';
  title: string;
  pythonCode: string;
  canonicalTrace: WeekFiveFunctionTraceItem[];
  workerTrace: WeekFiveFunctionTraceItem[];
  run: WeekFiveFunctionRunResult;
  createdAt: string;
  verifiedAt: string;
}

export type WeekFiveWeatherCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 }
  | { kind: 'formal-v3'; completedAt: string; verifiedAt: string; pythonCode: string; canonicalTrace: WeekFiveWeatherTraceItem[]; workerTrace: WeekFiveWeatherTraceItem[]; run: WeekFiveWeatherRunResult; workId: 'w5-m3-weather-parameter-record' };

export interface WeekFiveWeatherWorkV1 {
  kind: 'python-function-parameter-v1'; workId: 'w5-m3-weather-parameter-record'; missionId: 'w5-m3'; title: string; pythonCode: string;
  canonicalTrace: WeekFiveWeatherTraceItem[]; workerTrace: WeekFiveWeatherTraceItem[]; run: WeekFiveWeatherRunResult; createdAt: string; verifiedAt: string;
}

export type WeekFiveDecompositionCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 }
  | { kind: 'formal-v3'; completedAt: string; verifiedAt: string; pythonCode: string; canonicalTrace: WeekFiveDecompositionTraceItem[]; workerTrace: WeekFiveDecompositionTraceItem[]; run: WeekFiveDecompositionRunResult; workId: 'w5-m4-problem-decomposition-record' };

export interface WeekFiveDecompositionWorkV1 {
  kind: 'python-problem-decomposition-v1'; workId: 'w5-m4-problem-decomposition-record'; missionId: 'w5-m4'; title: string; pythonCode: string;
  canonicalTrace: WeekFiveDecompositionTraceItem[]; workerTrace: WeekFiveDecompositionTraceItem[]; run: WeekFiveDecompositionRunResult; createdAt: string; verifiedAt: string;
}

export type WeekFiveStoryOrchestrationCompletionEvidence =
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 1; sourceSchemaRevision: null }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 2; sourceSchemaRevision: 1 }
  | { kind: 'legacy-replay-only'; completedAt: string; sourceVersion: 3; sourceSchemaRevision: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 }
  | { kind: 'formal-v3'; completedAt: string; verifiedAt: string; pythonCode: string; canonicalTrace: WeekFiveStoryOrchestrationTraceItem[]; workerTrace: WeekFiveStoryOrchestrationTraceItem[]; run: WeekFiveStoryOrchestrationRunResult; workId: 'w5-m5-story-orchestration-record' };

export interface WeekFiveStoryOrchestrationWorkV1 {
  kind: 'python-story-orchestration-v1'; workId: 'w5-m5-story-orchestration-record'; missionId: 'w5-m5'; title: string; pythonCode: string;
  canonicalTrace: WeekFiveStoryOrchestrationTraceItem[]; workerTrace: WeekFiveStoryOrchestrationTraceItem[]; run: WeekFiveStoryOrchestrationRunResult; createdAt: string; verifiedAt: string;
}
export type WeekSixRecordsCompletionEvidence =
  | { kind:'legacy-replay-only';completedAt:string;sourceVersion:1;sourceSchemaRevision:null }
  | { kind:'legacy-replay-only';completedAt:string;sourceVersion:2;sourceSchemaRevision:1 }
  | { kind:'legacy-replay-only';completedAt:string;sourceVersion:3;sourceSchemaRevision:1|2|3|4|5|6|7|8|9|10|11|12|13|14|15|16|17 }
  | { kind:'formal-v3';completedAt:string;verifiedAt:string;pythonCode:string;canonicalTrace:WeekSixRecordsTraceItem[];workerTrace:WeekSixRecordsTraceItem[];run:WeekSixRecordsRunResult;workId:'w6-m1-structured-records-table' };
export interface WeekSixRecordsWorkV1 {kind:'python-structured-records-v1';workId:'w6-m1-structured-records-table';missionId:'w6-m1';title:string;pythonCode:string;canonicalTrace:WeekSixRecordsTraceItem[];workerTrace:WeekSixRecordsTraceItem[];run:WeekSixRecordsRunResult;createdAt:string;verifiedAt:string}

export interface MissionCompletionEvidenceV1 {
  'w3-m1'?: ManorHelpCompletionEvidence;
  'w3-m2'?: CuilanBooleanCompletionEvidence;
  'w3-m3'?: YunzhanDialogueCompletionEvidence;
  'w3-m4'?: BajieJoiningCompletionEvidence;
  'w3-m5'?: WeekThreeBossCompletionEvidence;
  'w4-m1'?: WeekFourMappingCompletionEvidence;
  'w4-m2'?: WeekFourVariableCompletionEvidence;
  'w4-m3'?: WeekFourBranchCompletionEvidence;
  'w4-m4'?: WeekFourListCompletionEvidence;
  'w4-m5'?: WeekFourBossCompletionEvidence;
  'w5-m1'?: WeekFiveMonksCompletionEvidence;
  'w5-m2'?: WeekFiveFunctionCompletionEvidence;
  'w5-m3'?: WeekFiveWeatherCompletionEvidence;
  'w5-m4'?: WeekFiveDecompositionCompletionEvidence;
  'w5-m5'?: WeekFiveStoryOrchestrationCompletionEvidence;
  'w6-m1'?: WeekSixRecordsCompletionEvidence;
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
  'w4-m1': WeekFourMappingMissionSession;
  'w4-m2': WeekFourVariableMissionSession;
  'w4-m3': WeekFourBranchMissionSession;
  'w4-m4': WeekFourListMissionSession;
  'w4-m5': WeekFourBossMissionSession;
  'w5-m1': WeekFiveMonksMissionSession;
  'w5-m2': WeekFiveFunctionMissionSession;
  'w5-m3': WeekFiveWeatherMissionSession;
  'w5-m4': WeekFiveDecompositionMissionSession;
  'w5-m5': WeekFiveStoryOrchestrationMissionSession;
  'w6-m1': WeekSixRecordsMissionSession;
}

export type ExecutableMissionId = keyof MissionSessionById;
export type MissionSession = MissionSessionById[ExecutableMissionId];
export type AnyMissionSession = MissionSession;
export type MissionSessions = { [MissionId in keyof MissionSessionById]?: MissionSessionById[MissionId] };

export interface ProgressV3 {
  version: 3;
  schemaRevision: 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;
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
  works: Partial<{
    'w4-m1-first-python-mapping': WeekFourMappingWorkV1;
    'w4-m2-variable-evidence-record': WeekFourVariableWorkV1;
    'w4-m3-branch-structure-record': WeekFourBranchWorkV1;
    'w4-m4-list-loop-record': WeekFourListWorkV1;
    'w4-m5-verification-report': WeekFourBossWorkV1;
    'w5-m1-monks-rescue-record': WeekFiveMonksWorkV1;
    'w5-m2-sanqing-function-record': WeekFiveFunctionWorkV1;
    'w5-m3-weather-parameter-record': WeekFiveWeatherWorkV1;
    'w5-m4-problem-decomposition-record': WeekFiveDecompositionWorkV1;
    'w5-m5-story-orchestration-record': WeekFiveStoryOrchestrationWorkV1;
    'w6-m1-structured-records-table': WeekSixRecordsWorkV1;
  }>;
  savedAt: string;
}

export type ProgressDocument = ProgressV1 | ProgressV2 | ProgressV3;
