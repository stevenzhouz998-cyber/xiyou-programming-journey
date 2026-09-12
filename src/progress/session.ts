import { createWeekFourListSession } from './weekFourListSessionFactory';
import type { WeekFourListMissionSession } from './weekFourListSession';
import { createWeekFourBossSession } from './weekFourBossSessionFactory';
import type { WeekFourBossMissionSession } from './weekFourBossSession';
import { createWeekFiveMonksSession } from './weekFiveMonksSessionFactory';
import type { WeekFiveMonksMissionSession } from './weekFiveMonksSession';
import { createWeekFiveFunctionSession } from './weekFiveFunctionSessionFactory';
import type { WeekFiveFunctionMissionSession } from './weekFiveFunctionSession';
import { createWeekFiveWeatherSession } from './weekFiveWeatherSessionFactory';
import type { WeekFiveWeatherMissionSession } from './weekFiveWeatherSession';
import { createWeekFiveDecompositionSession } from './weekFiveDecompositionSessionFactory';
import type { WeekFiveDecompositionMissionSession } from './weekFiveDecompositionSession';
import { createWeekFiveStoryOrchestrationSession } from './weekFiveStoryOrchestrationSessionFactory';
import type { WeekFiveStoryOrchestrationMissionSession } from './weekFiveStoryOrchestrationSession';
import { createWeekSixRecordsSession } from './weekSixRecordsSessionFactory';
import type { WeekSixRecordsMissionSession } from './weekSixRecordsSession';
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
import {
  createDefaultPeachElixirDraft,
  type PeachElixirInstruction,
  type PeachElixirRunResult,
  type PeachElixirWorkspaceDraftV1,
} from '../blockly/weekTwoPeachElixirContract';
import {
  createDefaultFurnaceConditionDraft,
  type FurnaceConditionInstruction,
  type FurnaceConditionRunResult,
  type FurnaceConditionWorkspaceDraftV1,
} from '../blockly/weekTwoFurnaceConditionContract';
import {
  compileHeavenlySignalBossDraft,
  createDefaultHeavenlySignalBossDraft,
  type HeavenlySignalBossInstruction,
  type HeavenlySignalBossRunResult,
  type HeavenlySignalBossWorkspaceDraftV1,
} from '../blockly/weekTwoHeavenlySignalBossContract';
import {
  compileManorHelpDraft,
  createDefaultManorHelpDraft,
  runManorHelp,
  type ManorHelpInstruction,
  type ManorHelpRunResult,
  type ManorHelpWorkspaceDraftV1,
} from '../blockly/weekThreeManorHelpContract';
import {
  compileCuilanBooleanDraft,
  createDefaultCuilanBooleanDraft,
  runCuilanBooleanForDraft,
  type CuilanBooleanInstruction,
  type CuilanBooleanRunResult,
  type CuilanBooleanWorkspaceDraftV1,
} from '../blockly/weekThreeCuilanBooleanContract';
import {
  compileYunzhanDialogueDraft,
  createDefaultYunzhanDialogueDraft,
  runYunzhanDialogueForDraft,
  type YunzhanDialogueInstruction,
  type YunzhanDialogueRunResult,
  type YunzhanDialogueWorkspaceDraftV1,
} from '../blockly/weekThreeYunzhanDialogueContract';
import {
  compileBajieJoiningDraft,
  createDefaultBajieJoiningDraft,
  runBajieJoiningForDraft,
  type BajieJoiningInstruction,
  type BajieJoiningRunResult,
  type BajieJoiningWorkspaceDraftV1,
} from '../blockly/weekThreeBajieJoiningContract';
import {
  compileWeekThreeBossDraft,
} from '../blockly/weekThreeBossCompiler';
import {
  createDefaultWeekThreeBossDraft,
  runWeekThreeBossDraft,
  type WeekThreeBossInstruction,
  type WeekThreeBossRunResult,
  type WeekThreeBossWorkspaceDraftV1,
} from '../blockly/weekThreeBossContract';
import { createWeekFourMappingSession } from './weekFourMappingSessionFactory';
import type { WeekFourMappingMissionSession } from './weekFourMappingSession';
import { createWeekFourVariableSession } from './weekFourVariableSessionFactory';
import type { WeekFourVariableMissionSession } from './weekFourVariableSession';
import { createWeekFourBranchSession } from './weekFourBranchSessionFactory';
import type { WeekFourBranchMissionSession } from './weekFourBranchSession';
import type {
  DragonPalaceMissionSession,
  ExecutableMissionId,
  FourSeasRegaliaMissionSession,
  MissionSession,
  MissionSessionById,
  RuyiStaffMissionSession,
  AdvancedWeekOneMissionSession,
  HorseCareMissionSession,
  MonkeyKingMissionSession,
  PeachElixirMissionSession,
  FurnaceConditionMissionSession,
  HeavenlySignalBossMissionSession,
  ManorHelpMissionSession,
  CuilanBooleanMissionSession,
  YunzhanDialogueMissionSession,
  BajieJoiningMissionSession,
  WeekThreeBossMissionSession,
  WeekSixClassificationMissionSession,
  WeekSixPromptMissionSession,
} from './types';
import { isExecutableMissionId } from './executableMissionIds';
import { loadedMissionSessionFactory } from './missionHint';

type HintTier = MissionSession['usedHintTiers'][number];
export type WorkspaceMissionSession = Exclude<MissionSession, WeekFourVariableMissionSession | WeekFourBranchMissionSession | WeekFourListMissionSession | WeekFourBossMissionSession | WeekFiveMonksMissionSession | WeekFiveFunctionMissionSession | WeekFiveWeatherMissionSession | WeekFiveDecompositionMissionSession | WeekFiveStoryOrchestrationMissionSession | WeekSixRecordsMissionSession | WeekSixClassificationMissionSession | WeekSixPromptMissionSession | import('./weekSixFactCheckSession').WeekSixFactCheckMissionSession | import('./weekSixArchiveSession').WeekSixArchiveMissionSession>;
type CompileFailureMissionSession = Exclude<MissionSession, WeekFourBranchMissionSession | WeekFourListMissionSession | WeekFourBossMissionSession | WeekFiveMonksMissionSession | WeekFiveFunctionMissionSession | WeekFiveWeatherMissionSession | WeekFiveDecompositionMissionSession | WeekFiveStoryOrchestrationMissionSession | WeekSixRecordsMissionSession | WeekSixClassificationMissionSession | WeekSixPromptMissionSession>;

function assertCanonicalIso(now: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(now)) {
    throw new Error('会话时间必须是有效ISO UTC日期');
  }
  const parsed = new Date(now);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== now) {
    throw new Error('会话时间必须是有效ISO UTC日期');
  }
}

function increment(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
    throw new Error('会话计数超出安全范围');
  }
  return value + 1;
}

function cloneSession<TSession extends MissionSession>(session: TSession): TSession {
  return structuredClone(session);
}

export function createMissionSession<TMissionId extends keyof MissionSessionById>(
  missionId: TMissionId,
): MissionSessionById[TMissionId];
export function createMissionSession(now: string): DragonPalaceMissionSession;
export function createMissionSession(
  missionId: 'w1-m1',
  now: string,
): DragonPalaceMissionSession;
export function createMissionSession(
  missionId: 'w1-m2',
  now: string,
): RuyiStaffMissionSession;
export function createMissionSession(
  missionId: 'w1-m3',
  now: string,
): FourSeasRegaliaMissionSession;
export function createMissionSession(missionId: 'w1-m4', now: string): AdvancedWeekOneMissionSession;
export function createMissionSession(missionId: 'w1-m5', now: string): AdvancedWeekOneMissionSession;
export function createMissionSession(missionId: 'w2-m1', now: string): HorseCareMissionSession;
export function createMissionSession(missionId: 'w2-m2', now: string): MonkeyKingMissionSession;
export function createMissionSession(missionId: 'w2-m3', now: string): PeachElixirMissionSession;
export function createMissionSession(missionId: 'w2-m4', now: string): FurnaceConditionMissionSession;
export function createMissionSession(missionId: 'w2-m5', now: string): HeavenlySignalBossMissionSession;
export function createMissionSession(missionId: 'w3-m1', now: string): ManorHelpMissionSession;
export function createMissionSession(missionId: 'w3-m4', now: string): BajieJoiningMissionSession;
export function createMissionSession(missionId: 'w3-m5', now: string): WeekThreeBossMissionSession;
export function createMissionSession(missionId: 'w3-m3', now: string): YunzhanDialogueMissionSession;
export function createMissionSession(missionId: 'w4-m1', now: string): WeekFourMappingMissionSession;
export function createMissionSession(missionId: 'w4-m2', now: string): WeekFourVariableMissionSession;
export function createMissionSession(missionId: 'w5-m4', now: string): WeekFiveDecompositionMissionSession;
export function createMissionSession(missionId: 'w5-m5', now: string): WeekFiveStoryOrchestrationMissionSession;
export function createMissionSession(missionId: 'w6-m1', now: string): WeekSixRecordsMissionSession;
export function createMissionSession<TMissionId extends keyof MissionSessionById>(
  missionId: TMissionId,
  now: string,
): MissionSessionById[TMissionId];
export function createMissionSession(missionId: 'w3-m2', now: string): CuilanBooleanMissionSession;
export function createMissionSession(
  missionIdOrNow: keyof MissionSessionById | string,
  suppliedNow?: string,
): MissionSession {
  const missionIdOnly = suppliedNow === undefined && isExecutableMissionId(missionIdOrNow);
  const now = suppliedNow ?? (missionIdOnly ? new Date(0).toISOString() : missionIdOrNow);
  if (suppliedNow !== undefined && !isExecutableMissionId(missionIdOrNow)) {
    throw new Error('任务编号无效');
  }
  assertCanonicalIso(now);
  if (missionIdOrNow === 'w4-m1') return createWeekFourMappingSession(now);
  if (missionIdOrNow === 'w4-m2') return createWeekFourVariableSession(now);
  if (missionIdOrNow === 'w4-m3') return createWeekFourBranchSession(now);
  if (missionIdOrNow === 'w4-m4') return createWeekFourListSession(now);
  if (missionIdOrNow === 'w4-m5') return createWeekFourBossSession(now);
  if (missionIdOrNow === 'w5-m1') return createWeekFiveMonksSession(now);
  if (missionIdOrNow === 'w5-m2') return createWeekFiveFunctionSession(now);
  if (missionIdOrNow === 'w5-m3') return createWeekFiveWeatherSession(now);
  if (missionIdOrNow === 'w5-m4') return createWeekFiveDecompositionSession(now);
  if (missionIdOrNow === 'w5-m5') return createWeekFiveStoryOrchestrationSession(now);
  if (missionIdOrNow === 'w6-m1') return createWeekSixRecordsSession(now);
  if (missionIdOrNow === 'w6-m2') throw new Error('W6-M2 会话必须绑定 W6-M1 正式作品后创建');
  if (missionIdOrNow === 'w6-m3') throw new Error('W6-M3 会话必须绑定 W6-M2 正式作品后创建');
  const session = {
    workspace: missionIdOrNow === 'w3-m5'
      ? createDefaultWeekThreeBossDraft()
      : missionIdOrNow === 'w3-m4'
      ? createDefaultBajieJoiningDraft()
      : missionIdOrNow === 'w3-m3'
      ? createDefaultYunzhanDialogueDraft()
      : missionIdOrNow === 'w3-m2'
      ? createDefaultCuilanBooleanDraft()
      : missionIdOrNow === 'w3-m1'
      ? createDefaultManorHelpDraft()
      : missionIdOrNow === 'w2-m5'
      ? createDefaultHeavenlySignalBossDraft()
      : missionIdOrNow === 'w2-m4'
      ? createDefaultFurnaceConditionDraft()
      : missionIdOrNow === 'w2-m3'
      ? createDefaultPeachElixirDraft()
      : missionIdOrNow === 'w1-m4' || missionIdOrNow === 'w1-m5' || missionIdOrNow === 'w2-m1' || missionIdOrNow === 'w2-m2'
        ? { version: 1, missionId: missionIdOrNow, blocks: [] }
      : { version: 1, blocks: [] },
    lastTrace: [],
    lastRun: null,
    totalRuns: 0,
    ...(missionIdOrNow === 'w3-m5' ? { successfulFullRuns: 0 } : {}),
    runtimeFailures: 0,
    compileFailures: 0,
    usedHintTiers: [],
    conceptFailures: missionIdOrNow === 'w3-m5'
      ? { programStructure: 0, manorHelpSpecificity: 0, disguiseIdentity: 0, yunzhanBranch: 0, joiningOperator: 0 }
      : missionIdOrNow === 'w3-m4'
      ? { programStructure: 0, booleanComposition: 0, completeness: 0 }
      : missionIdOrNow === 'w3-m3'
      ? { programStructure: 0, branchRouting: 0, completeness: 0 }
      : missionIdOrNow === 'w3-m2'
      ? { programStructure: 0, conditionSelection: 0, branchRouting: 0, sequencePrecondition: 0, completeness: 0 }
      : missionIdOrNow === 'w3-m1'
      ? { programStructure: 0, conditionSelection: 0, branchRouting: 0, completeness: 0 }
      : missionIdOrNow === 'w2-m5'
      ? { programStructure: 0, loopCount: 0, eventRouting: 0, handlerSequence: 0, sequencePrecondition: 0, loopCondition: 0, conditionNeverMet: 0, completeness: 0 }
      : { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
    lastRunAt: null,
    savedAt: now,
  } as MissionSession;
  if (missionIdOrNow === 'w1-m4' || missionIdOrNow === 'w1-m5') {
    Object.assign(session, { equipmentEffectsUsed: [] });
  }
  if (missionIdOrNow === 'w3-m1') {
    Object.assign(session, { scenarioResults: [], failureSnapshot: null, conditionObservationUses: [] });
  }
  if (missionIdOrNow === 'w3-m2') {
    Object.assign(session, { checkpointResults: [], failureSnapshot: null, conditionObservationUses: [] });
  }
  if (missionIdOrNow === 'w3-m3') {
    Object.assign(session, { roundResults: [], failureSnapshot: null, conditionObservationUses: [] });
  }
  if (missionIdOrNow === 'w3-m4') {
    Object.assign(session, { scenarioResults: [], failureSnapshot: null, conditionObservationUses: [] });
  }
  if (missionIdOrNow === 'w3-m5') {
    Object.assign(session, { failureSnapshot: null, firstBlockingConcept: null, conditionObservationUses: [] });
  }
  return session as MissionSessionById[keyof MissionSessionById];
}

export function recordHint<TSession extends MissionSession>(session:TSession,tier:HintTier,now:string):TSession{
  assertCanonicalIso(now);const next=cloneSession(session);if(!next.usedHintTiers.includes(tier))next.usedHintTiers.push(tier);next.savedAt=now;return next;
}

loadedMissionSessionFactory.value=(missionId,now)=>createMissionSession(missionId,now);
