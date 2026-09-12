import { getWeekFourListAccess } from '../progress/progress';
import { getWeekFourBossAccess } from '../progress/progress';
import { getWeekFiveMonksAccess } from '../progress/progress';
import { getWeekFiveFunctionAccess } from '../progress/progress';
import { getWeekFiveWeatherAccess } from '../progress/progress';
import { getWeekFiveDecompositionAccess } from '../progress/progress';
import { getWeekFiveStoryOrchestrationAccess } from '../progress/progress';
import { getWeekSixRecordsAccess } from '../progress/progress';
import { getWeekSixClassificationAccess } from '../progress/progress';
import { getWeekSixPromptAccess } from '../progress/progress';
import { getWeekSixArchiveAccess } from '../progress/progress';
import type { WeekFourListMissionSession } from '../progress/types';
import type { WeekFourBossMissionSession } from '../progress/types';
import type { WeekFiveMonksMissionSession } from '../progress/types';
import type { WeekFiveFunctionMissionSession } from '../progress/types';
import type { WeekFiveWeatherMissionSession } from '../progress/types';
import type { WeekFiveDecompositionMissionSession } from '../progress/types';
import type { WeekFiveStoryOrchestrationMissionSession } from '../progress/types';
import type { WeekSixRecordsMissionSession } from '../progress/types';
import type { WeekSixClassificationMissionSession } from '../progress/types';
import type { WeekSixPromptMissionSession } from '../progress/types';
import type { WeekSixFactCheckMissionSession } from '../progress/types';
import type { WeekSixArchiveMissionSession } from '../progress/types';
import { parseWeekSixRecordsSession } from '../progress/weekSixRecordsSessionSchema';
import { parseWeekSixClassificationSession } from '../progress/weekSixClassificationSessionSchema';
import type { WeekFourListRunResult, WeekFourListTraceItem } from '../engine/weekFourListContract';
import type { WeekFourBossRunResult, WeekFourBossTraceItem } from '../engine/weekFourBossContract';
import type { WeekFiveMonksRunResult, WeekFiveMonksTraceItem } from '../engine/weekFiveMonksContract';
import type { WeekFiveFunctionRunResult, WeekFiveFunctionTraceItem } from '../engine/weekFiveFunctionContract';
import type { WeekFiveWeatherRunResult, WeekFiveWeatherTraceItem } from '../engine/weekFiveWeatherContract';
import type { WeekFiveDecompositionRunResult, WeekFiveDecompositionTraceItem } from '../engine/weekFiveDecompositionContract';
import type { WeekFiveStoryOrchestrationRunResult, WeekFiveStoryOrchestrationTraceItem } from '../engine/weekFiveStoryOrchestrationContract';
import { parseWeekFourListSession } from '../progress/weekFourListSessionSchema';
import { parseWeekFourBossSession } from '../progress/weekFourBossSessionSchema';
import { parseWeekFiveMonksSession } from '../progress/weekFiveMonksSessionSchema';
import { parseWeekFiveFunctionSession } from '../progress/weekFiveFunctionSessionSchema';
import { parseWeekFiveWeatherSession } from '../progress/weekFiveWeatherSessionSchema';
import { parseWeekFiveDecompositionSession } from '../progress/weekFiveDecompositionSessionSchema';
import { parseWeekFiveStoryOrchestrationSession } from '../progress/weekFiveStoryOrchestrationSessionSchema';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  completeMission,
  isMissionUnlocked,
  getWeekFourBranchAccess,
  type CompletionInput,
  type DragonPalaceMissionSession,
  type ExecutableMissionId,
  type FourSeasRegaliaMissionSession,
  type AdvancedWeekOneMissionSession,
  type MissionSession,
  type ProgressV3,
  type RuyiStaffMissionSession,
  type HorseCareMissionSession,
  type MonkeyKingMissionSession,
  type PeachElixirMissionSession,
  type FurnaceConditionMissionSession,
  type HeavenlySignalBossMissionSession,
  type ManorHelpMissionSession,
  type CuilanBooleanMissionSession,
  type YunzhanDialogueMissionSession,
  type BajieJoiningMissionSession,
  type WeekThreeBossMissionSession,
  type WeekFourVariableMissionSession,
  type WeekFourBranchMissionSession,
} from '../progress/progress';
import { migrateProgress } from '../progress/schema';
import { loadedMissionSessionFactory, recordHint } from '../progress/missionHint';
import type { WeekFourMappingMissionSession } from '../progress/weekFourMappingSession';
import type { WeekFourVariableRunResult, WeekFourVariableTraceItem } from '../engine/weekFourVariableContract';
import type { WeekFourBranchRunResult, WeekFourBranchTraceItem } from '../engine/weekFourBranchContract';
import { parseWeekFourBranchSession } from '../progress/weekFourBranchSessionSchema';
import {
  CURRENT_PROGRESS_KEY,
  REVISION_PROGRESS_KEY,
  loadProgressTransaction,
  parseStoredRevision,
  createProgressBackup,
  type LoadStatus,
  type LoadResult,
  type ProgressBackup,
} from '../progress/storage';
import type { CoordinatedSaveResult } from '../progress/storageCoordinator';
import type { CoordinatedClearResult, CoordinatedImportResult } from '../progress/storageCoordinatorParent';
import type { EquipmentItemId, EquipmentSlot } from '../progress/equipment';

export type ProgressSaveStatus = 'idle' | 'pending' | 'saved' | 'unsaved' | 'conflict';
export interface ProgressWriteOptions { legacyWorkspaceKey?: string }
export type EquipmentOperation =
  | { type: 'equip'; slot: EquipmentSlot; itemId: EquipmentItemId }
  | { type: 'unequip'; slot: EquipmentSlot };
type MissionSessionUpdateArgs =
  | [missionId: 'w1-m1', update: (session: DragonPalaceMissionSession) => DragonPalaceMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w1-m2', update: (session: RuyiStaffMissionSession) => RuyiStaffMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w1-m3', update: (session: FourSeasRegaliaMissionSession) => FourSeasRegaliaMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w1-m4' | 'w1-m5', update: (session: AdvancedWeekOneMissionSession) => AdvancedWeekOneMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w2-m1', update: (session: HorseCareMissionSession) => HorseCareMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w2-m2', update: (session: MonkeyKingMissionSession) => MonkeyKingMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w2-m3', update: (session: PeachElixirMissionSession) => PeachElixirMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w2-m4', update: (session: FurnaceConditionMissionSession) => FurnaceConditionMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w2-m5', update: (session: HeavenlySignalBossMissionSession) => HeavenlySignalBossMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w3-m1', update: (session: ManorHelpMissionSession) => ManorHelpMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w3-m2', update: (session: CuilanBooleanMissionSession) => CuilanBooleanMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w3-m3', update: (session: YunzhanDialogueMissionSession) => YunzhanDialogueMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w3-m4', update: (session: BajieJoiningMissionSession) => BajieJoiningMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w3-m5', update: (session: WeekThreeBossMissionSession) => WeekThreeBossMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w4-m1', update: (session: WeekFourMappingMissionSession) => WeekFourMappingMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w4-m2', update: (session: WeekFourVariableMissionSession) => WeekFourVariableMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w4-m3', update: (session: WeekFourBranchMissionSession) => WeekFourBranchMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w4-m4', update: (session: WeekFourListMissionSession) => WeekFourListMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w4-m5', update: (session: WeekFourBossMissionSession) => WeekFourBossMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w5-m1', update: (session: WeekFiveMonksMissionSession) => WeekFiveMonksMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w5-m2', update: (session: WeekFiveFunctionMissionSession) => WeekFiveFunctionMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w5-m3', update: (session: WeekFiveWeatherMissionSession) => WeekFiveWeatherMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w5-m4', update: (session: WeekFiveDecompositionMissionSession) => WeekFiveDecompositionMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w5-m5', update: (session: WeekFiveStoryOrchestrationMissionSession) => WeekFiveStoryOrchestrationMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w6-m1', update: (session: WeekSixRecordsMissionSession) => WeekSixRecordsMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w6-m2', update: (session: WeekSixClassificationMissionSession) => WeekSixClassificationMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w6-m3', update: (session: WeekSixPromptMissionSession) => WeekSixPromptMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w6-m4', update: (session: WeekSixFactCheckMissionSession) => WeekSixFactCheckMissionSession, options?: ProgressWriteOptions]
  | [missionId: 'w6-m5', update: (session: WeekSixArchiveMissionSession) => WeekSixArchiveMissionSession, options?: ProgressWriteOptions];
type MissionSessionUpdateAtArgs =
  | [missionId: 'w1-m1', update: (session: DragonPalaceMissionSession) => DragonPalaceMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w1-m2', update: (session: RuyiStaffMissionSession) => RuyiStaffMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w1-m3', update: (session: FourSeasRegaliaMissionSession) => FourSeasRegaliaMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w1-m4' | 'w1-m5', update: (session: AdvancedWeekOneMissionSession) => AdvancedWeekOneMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w2-m1', update: (session: HorseCareMissionSession) => HorseCareMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w2-m2', update: (session: MonkeyKingMissionSession) => MonkeyKingMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w2-m3', update: (session: PeachElixirMissionSession) => PeachElixirMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w2-m4', update: (session: FurnaceConditionMissionSession) => FurnaceConditionMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w2-m5', update: (session: HeavenlySignalBossMissionSession) => HeavenlySignalBossMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w3-m1', update: (session: ManorHelpMissionSession) => ManorHelpMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w3-m2', update: (session: CuilanBooleanMissionSession) => CuilanBooleanMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w3-m3', update: (session: YunzhanDialogueMissionSession) => YunzhanDialogueMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w3-m4', update: (session: BajieJoiningMissionSession) => BajieJoiningMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w3-m5', update: (session: WeekThreeBossMissionSession) => WeekThreeBossMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w4-m1', update: (session: WeekFourMappingMissionSession) => WeekFourMappingMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w4-m2', update: (session: WeekFourVariableMissionSession) => WeekFourVariableMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w4-m3', update: (session: WeekFourBranchMissionSession) => WeekFourBranchMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w4-m4', update: (session: WeekFourListMissionSession) => WeekFourListMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w4-m5', update: (session: WeekFourBossMissionSession) => WeekFourBossMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w5-m1', update: (session: WeekFiveMonksMissionSession) => WeekFiveMonksMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w5-m2', update: (session: WeekFiveFunctionMissionSession) => WeekFiveFunctionMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w5-m3', update: (session: WeekFiveWeatherMissionSession) => WeekFiveWeatherMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w5-m4', update: (session: WeekFiveDecompositionMissionSession) => WeekFiveDecompositionMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w5-m5', update: (session: WeekFiveStoryOrchestrationMissionSession) => WeekFiveStoryOrchestrationMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w6-m1', update: (session: WeekSixRecordsMissionSession) => WeekSixRecordsMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w6-m2', update: (session: WeekSixClassificationMissionSession) => WeekSixClassificationMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w6-m3', update: (session: WeekSixPromptMissionSession) => WeekSixPromptMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w6-m4', update: (session: WeekSixFactCheckMissionSession) => WeekSixFactCheckMissionSession, now: string, options?: ProgressWriteOptions]
  | [missionId: 'w6-m5', update: (session: WeekSixArchiveMissionSession) => WeekSixArchiveMissionSession, now: string, options?: ProgressWriteOptions];
interface UpdateMissionSession {
  (
    missionId: 'w1-m1',
    update: (session: DragonPalaceMissionSession) => DragonPalaceMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w1-m2',
    update: (session: RuyiStaffMissionSession) => RuyiStaffMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w1-m3',
    update: (session: FourSeasRegaliaMissionSession) => FourSeasRegaliaMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w1-m4' | 'w1-m5',
    update: (session: AdvancedWeekOneMissionSession) => AdvancedWeekOneMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w2-m1',
    update: (session: HorseCareMissionSession) => HorseCareMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w2-m2',
    update: (session: MonkeyKingMissionSession) => MonkeyKingMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w2-m3',
    update: (session: PeachElixirMissionSession) => PeachElixirMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w2-m4',
    update: (session: FurnaceConditionMissionSession) => FurnaceConditionMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w2-m5',
    update: (session: HeavenlySignalBossMissionSession) => HeavenlySignalBossMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w3-m1',
    update: (session: ManorHelpMissionSession) => ManorHelpMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w3-m2',
    update: (session: CuilanBooleanMissionSession) => CuilanBooleanMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w3-m3',
    update: (session: YunzhanDialogueMissionSession) => YunzhanDialogueMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w3-m4',
    update: (session: BajieJoiningMissionSession) => BajieJoiningMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w3-m5',
    update: (session: WeekThreeBossMissionSession) => WeekThreeBossMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w4-m1',
    update: (session: WeekFourMappingMissionSession) => WeekFourMappingMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w4-m2',
    update: (session: WeekFourVariableMissionSession) => WeekFourVariableMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w4-m3',
    update: (session: WeekFourBranchMissionSession) => WeekFourBranchMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w4-m4',
    update: (session: WeekFourListMissionSession) => WeekFourListMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w4-m5',
    update: (session: WeekFourBossMissionSession) => WeekFourBossMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w5-m1',
    update: (session: WeekFiveMonksMissionSession) => WeekFiveMonksMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (
    missionId: 'w5-m2',
    update: (session: WeekFiveFunctionMissionSession) => WeekFiveFunctionMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  (missionId: 'w5-m3', update: (session: WeekFiveWeatherMissionSession) => WeekFiveWeatherMissionSession, options?: ProgressWriteOptions): Promise<CoordinatedSaveResult>;
  (missionId: 'w5-m4', update: (session: WeekFiveDecompositionMissionSession) => WeekFiveDecompositionMissionSession, options?: ProgressWriteOptions): Promise<CoordinatedSaveResult>;
  (missionId:'w6-m1',update:(session:WeekSixRecordsMissionSession)=>WeekSixRecordsMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  (missionId:'w6-m2',update:(session:WeekSixClassificationMissionSession)=>WeekSixClassificationMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  (missionId:'w6-m3',update:(session:WeekSixPromptMissionSession)=>WeekSixPromptMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  (missionId:'w6-m4',update:(session:WeekSixFactCheckMissionSession)=>WeekSixFactCheckMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  (missionId:'w6-m5',update:(session:WeekSixArchiveMissionSession)=>WeekSixArchiveMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
}
type MissionHintTier = MissionSession['usedHintTiers'][number];
interface RecordMissionHint {
  (missionId: ExecutableMissionId, tier: MissionHintTier): Promise<CoordinatedSaveResult>;
}

export interface ProgressContextValue {
  progress: ProgressV3;
  revision: number;
  loadStatus: LoadStatus;
  loadPersistence: 'idle' | 'saved' | 'unsaved';
  loadError: string | null;
  corruptDownload: string | null;
  corruptError: string | null;
  saveStatus: ProgressSaveStatus;
  saveError: string | null;
  saveRetryable: boolean;
  complete: (missionId: string, input: CompletionInput) => Promise<CoordinatedSaveResult>;
  updateMissionSession: UpdateMissionSession;
  saveWeekFourVariableDraft: (code: string) => Promise<CoordinatedSaveResult>;
  saveWeekFourVariableRun: (value: { canonicalTrace: WeekFourVariableTraceItem[]; workerTrace: WeekFourVariableTraceItem[]; run: WeekFourVariableRunResult }) => Promise<CoordinatedSaveResult>;
  saveWeekFourVariableObservation: () => Promise<CoordinatedSaveResult>;
  saveWeekFourVariableInfrastructureFailure: (input: { executionStarted: boolean }) => Promise<CoordinatedSaveResult>;
  saveWeekFourVariableValidationFailure: () => Promise<CoordinatedSaveResult>;
  completeWeekFourVariable: (input: CompletionInput) => Promise<CoordinatedSaveResult>;
  saveWeekFourBranchDraft: (code: string) => Promise<CoordinatedSaveResult>;
  saveWeekFourBranchRun: (value: { canonicalTrace: WeekFourBranchTraceItem[]; workerTrace: WeekFourBranchTraceItem[]; run: WeekFourBranchRunResult }) => Promise<CoordinatedSaveResult>;
  saveWeekFourBranchObservation: () => Promise<CoordinatedSaveResult>;
  saveWeekFourBranchInfrastructureFailure: (input: { executionStarted: boolean }) => Promise<CoordinatedSaveResult>;
  saveWeekFourBranchValidationFailure: () => Promise<CoordinatedSaveResult>;
  completeWeekFourBranch: (input: CompletionInput) => Promise<CoordinatedSaveResult>;
  saveWeekFourListDraft: (code: string) => Promise<CoordinatedSaveResult>;
  saveWeekFourBossDraft: (code: string) => Promise<CoordinatedSaveResult>;
  saveWeekFiveMonksDraft: (code: string) => Promise<CoordinatedSaveResult>;
  saveWeekFiveFunctionDraft: (code: string) => Promise<CoordinatedSaveResult>;
  saveWeekFiveWeatherDraft: (code: string) => Promise<CoordinatedSaveResult>;
  saveWeekFiveDecompositionDraft: (code: string) => Promise<CoordinatedSaveResult>;
  saveWeekFiveStoryOrchestrationDraft: (code: string) => Promise<CoordinatedSaveResult>;
  saveWeekFourListRun: (value: { canonicalTrace: WeekFourListTraceItem[]; workerTrace: WeekFourListTraceItem[]; run: WeekFourListRunResult }) => Promise<CoordinatedSaveResult>;
  saveWeekFourBossRun: (value: { canonicalTrace: WeekFourBossTraceItem[]; workerTrace: WeekFourBossTraceItem[]; run: WeekFourBossRunResult }) => Promise<CoordinatedSaveResult>;
  saveWeekFiveMonksRun: (value: { canonicalTrace: WeekFiveMonksTraceItem[]; workerTrace: WeekFiveMonksTraceItem[]; run: WeekFiveMonksRunResult }) => Promise<CoordinatedSaveResult>;
  saveWeekFiveFunctionRun: (value: { canonicalTrace: WeekFiveFunctionTraceItem[]; workerTrace: WeekFiveFunctionTraceItem[]; run: WeekFiveFunctionRunResult }) => Promise<CoordinatedSaveResult>;
  saveWeekFiveWeatherRun: (value: { canonicalTrace: WeekFiveWeatherTraceItem[]; workerTrace: WeekFiveWeatherTraceItem[]; run: WeekFiveWeatherRunResult }) => Promise<CoordinatedSaveResult>;
  saveWeekFiveDecompositionRun: (value: { canonicalTrace: WeekFiveDecompositionTraceItem[]; workerTrace: WeekFiveDecompositionTraceItem[]; run: WeekFiveDecompositionRunResult }) => Promise<CoordinatedSaveResult>;
  saveWeekFiveStoryOrchestrationRun: (value: { canonicalTrace: WeekFiveStoryOrchestrationTraceItem[]; workerTrace: WeekFiveStoryOrchestrationTraceItem[]; run: WeekFiveStoryOrchestrationRunResult }) => Promise<CoordinatedSaveResult>;
  saveWeekFourListObservation: () => Promise<CoordinatedSaveResult>;
  saveWeekFourBossObservation: () => Promise<CoordinatedSaveResult>;
  saveWeekFiveMonksObservation: () => Promise<CoordinatedSaveResult>;
  saveWeekFiveFunctionObservation: () => Promise<CoordinatedSaveResult>;
  saveWeekFiveWeatherObservation: () => Promise<CoordinatedSaveResult>;
  saveWeekFiveDecompositionObservation: () => Promise<CoordinatedSaveResult>;
  saveWeekFiveStoryOrchestrationObservation: () => Promise<CoordinatedSaveResult>;
  saveWeekFourListInfrastructureFailure: (input: { executionStarted: boolean }) => Promise<CoordinatedSaveResult>;
  saveWeekFourBossInfrastructureFailure: (input: { executionStarted: boolean }) => Promise<CoordinatedSaveResult>;
  saveWeekFiveMonksInfrastructureFailure: (input: { executionStarted: boolean }) => Promise<CoordinatedSaveResult>;
  saveWeekFiveFunctionInfrastructureFailure: (input: { executionStarted: boolean }) => Promise<CoordinatedSaveResult>;
  saveWeekFiveWeatherInfrastructureFailure: (input: { executionStarted: boolean }) => Promise<CoordinatedSaveResult>;
  saveWeekFiveDecompositionInfrastructureFailure: (input: { executionStarted: boolean }) => Promise<CoordinatedSaveResult>;
  saveWeekFiveStoryOrchestrationInfrastructureFailure: (input: { executionStarted: boolean }) => Promise<CoordinatedSaveResult>;
  saveWeekFourListValidationFailure: () => Promise<CoordinatedSaveResult>;
  saveWeekFourBossValidationFailure: () => Promise<CoordinatedSaveResult>;
  saveWeekFiveMonksValidationFailure: () => Promise<CoordinatedSaveResult>;
  saveWeekFiveFunctionValidationFailure: () => Promise<CoordinatedSaveResult>;
  saveWeekFiveWeatherValidationFailure: () => Promise<CoordinatedSaveResult>;
  saveWeekFiveDecompositionValidationFailure: () => Promise<CoordinatedSaveResult>;
  saveWeekFiveStoryOrchestrationValidationFailure: () => Promise<CoordinatedSaveResult>;
  completeWeekFourList: (input: CompletionInput) => Promise<CoordinatedSaveResult>;
  completeWeekFourBoss: (input: CompletionInput) => Promise<CoordinatedSaveResult>;
  completeWeekFiveMonks: (input: CompletionInput) => Promise<CoordinatedSaveResult>;
  completeWeekFiveFunction: (input: CompletionInput) => Promise<CoordinatedSaveResult>;
  completeWeekFiveWeather: (input: CompletionInput) => Promise<CoordinatedSaveResult>;
  completeWeekFiveDecomposition: (input: CompletionInput) => Promise<CoordinatedSaveResult>;
  completeWeekFiveStoryOrchestration: (input: CompletionInput) => Promise<CoordinatedSaveResult>;
  recordMissionHint: RecordMissionHint;
  replaceProgress: (progress: ProgressV3) => Promise<CoordinatedSaveResult>;
  updateSettings: (settings: Partial<ProgressV3['settings']>) => Promise<CoordinatedSaveResult>;
  updateEquipment: (operation: EquipmentOperation) => Promise<CoordinatedSaveResult>;
  commitParentAccess: (parentPin: string) => Promise<CoordinatedSaveResult>;
  acknowledgePrivacy: () => Promise<CoordinatedSaveResult>;
  retrySave: () => Promise<CoordinatedSaveResult>;
  importProgressFile: (raw: string) => Promise<CoordinatedImportResult>;
  clearProgress: () => Promise<CoordinatedClearResult>;
  createBackup: () => ProgressBackup;
  reloadExternalProgress: () => ProgressV3 | null;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);
const PROGRESS_CONFLICT_ERROR = '其他标签页已更新，已暂停保存';
const storageFailure = (error: unknown) => `存储操作无法完成：${error instanceof Error ? error.message : String(error)}`;
const loadDefaultSaveCoordinator = () => import('../progress/storageCoordinator');
const loadDefaultStorageRepair = () => import('../progress/storageRepair');
const loadDefaultParentCoordinator = () => import('../progress/storageCoordinatorParent');
type LoadState = Pick<LoadResult, 'status' | 'persistence' | 'error' | 'corruptDownload' | 'corruptError'>;
const loadStateFrom = (loaded: LoadResult): LoadState => ({
  status: loaded.status,
  persistence: loaded.persistence,
  error: loaded.error,
  corruptDownload: loaded.corruptDownload,
  corruptError: loaded.corruptError,
});

interface ProgressProviderProps {
  children: ReactNode;
  loadSaveCoordinator?: typeof loadDefaultSaveCoordinator;
  loadStorageRepair?: typeof loadDefaultStorageRepair;
  loadParentCoordinator?: typeof loadDefaultParentCoordinator;
}

type FailedSaveResult = Extract<CoordinatedSaveResult, { status: 'unsaved' | 'conflict' }>;
interface UnpublishedTransaction {
  draft: ProgressV3;
  generation: number;
  failure: FailedSaveResult | null;
  completionMissionIds: Set<string>;
}

export function ProgressProvider({
  children,
  loadSaveCoordinator = loadDefaultSaveCoordinator,
  loadStorageRepair = loadDefaultStorageRepair,
  loadParentCoordinator = loadDefaultParentCoordinator,
}: ProgressProviderProps) {
  const [initialLoad] = useState(() => loadProgressTransaction());
  const [progress, setProgress] = useState<ProgressV3>(initialLoad.progress);
  const progressRef = useRef(initialLoad.progress);
  const [revision, setRevision] = useState(initialLoad.revision);
  const revisionRef = useRef(initialLoad.revision);
  const conflictRef = useRef(false);
  const pendingRepairRef = useRef(initialLoad.repair);
  const pendingUnpublishedRef = useRef<UnpublishedTransaction | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [loadState, setLoadState] = useState<LoadState>(() => loadStateFrom(initialLoad));
  const setLoadPersistence = (persistence: LoadState['persistence']) => {
    setLoadState((current) => ({ ...current, persistence }));
  };
  const [saveStatus, setSaveStatus] = useState<ProgressSaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveRetryable, setSaveRetryable] = useState(true);

  const enqueue = <T,>(
    operation: () => Promise<T>,
    failureStatus: 'unsaved' | 'unchanged' = 'unsaved',
    retryable = true,
  ): Promise<T> => {
    const guarded = async () => {
      try {
        return await operation();
      } catch (error) {
        const detail = storageFailure(error);
        conflictRef.current = false;
        setSaveStatus('unsaved');
        setSaveError(detail);
        setSaveRetryable(retryable);
        return { status: failureStatus, progress: progressRef.current, error: detail } as T;
      }
    };
    const run = queueRef.current.then(guarded, guarded);
    queueRef.current = run.then(() => undefined, () => undefined);
    return run;
  };

  const saveCoordinated = async (
    next: ProgressV3,
    expectedRevision: number,
    options: ProgressWriteOptions = {},
  ) => {
    const { saveProgressCoordinated } = await loadSaveCoordinator();
    return saveProgressCoordinated(next, expectedRevision, options);
  };

  const publishRevision = (nextRevision: number) => {
    revisionRef.current = nextRevision;
    setRevision(nextRevision);
  };

  const publishSaved = (next: ProgressV3, nextRevision: number) => {
    progressRef.current = next;
    setProgress(next);
    publishRevision(nextRevision);
    conflictRef.current = false;
    setSaveStatus('saved');
    setSaveError(null);
    setSaveRetryable(true);
    setLoadPersistence('saved');
  };

  const markResult = (
    result: CoordinatedSaveResult,
    draft: ProgressV3,
    publishDraft: boolean,
    retryable = true,
    unpublishedGeneration: number | null = null,
    unpublishedTransaction: UnpublishedTransaction | null = null,
  ) => {
    if (result.status === 'saved') {
      if (unpublishedGeneration !== null) {
        const transaction = pendingUnpublishedRef.current;
        if (!transaction || transaction !== unpublishedTransaction) return result;
        if (transaction.generation !== unpublishedGeneration) {
          publishRevision(result.revision);
          setLoadPersistence('saved');
          return result;
        }
        pendingUnpublishedRef.current = null;
      }
      if (!publishDraft || progressRef.current === draft) publishSaved(result.progress, result.revision);
      else {
        // A newer child edit is already visible. The older durable save may
        // advance CAS, but must never replace that newer in-memory draft.
        publishRevision(result.revision);
        setLoadPersistence('saved');
      }
    }
    else {
      if (unpublishedGeneration !== null) {
        const transaction = pendingUnpublishedRef.current;
        if (transaction && transaction === unpublishedTransaction && transaction.generation >= unpublishedGeneration && !transaction.failure) {
          transaction.failure = result;
        }
      }
      conflictRef.current = result.status === 'conflict';
      setSaveStatus(result.status === 'conflict' ? 'conflict' : 'unsaved');
      setSaveError(result.error);
      setSaveRetryable(result.status === 'conflict' ? false : retryable);
    }
    return result;
  };

  const currentConflict = (next = progressRef.current): CoordinatedSaveResult | null => (
    conflictRef.current
      ? { status: 'conflict', progress: next, expectedRevision: revisionRef.current, actualRevision: revisionRef.current + 1, error: PROGRESS_CONFLICT_ERROR }
      : null
  );

  const workingProgress = () => pendingUnpublishedRef.current?.draft ?? progressRef.current;

  const normalizeSaveFailure = (error: unknown, draft: ProgressV3): FailedSaveResult => ({
    status: 'unsaved',
    progress: draft,
    error: storageFailure(error),
  });

  const commit = (
    next: ProgressV3,
    publishDraft = true,
    options: ProgressWriteOptions = {},
    retryable = true,
    retainUnpublished = false,
    completionMissionId: string | null = null,
  ): Promise<CoordinatedSaveResult> => {
    const existingTransaction = pendingUnpublishedRef.current;
    const unpublishedTransaction = retainUnpublished || existingTransaction
      ? existingTransaction ?? { draft: next, generation: 0, failure: null, completionMissionIds: new Set<string>() }
      : null;
    if (unpublishedTransaction && completionMissionId !== null) unpublishedTransaction.completionMissionIds.add(completionMissionId);
    const unpublishedGeneration = unpublishedTransaction ? unpublishedTransaction.generation + 1 : null;
    if (unpublishedGeneration !== null) {
      unpublishedTransaction!.draft = next;
      unpublishedTransaction!.generation = unpublishedGeneration;
      pendingUnpublishedRef.current = unpublishedTransaction;
      publishDraft = false;
    }
    const blocked = currentConflict(next);
    if (blocked) {
      if (unpublishedGeneration !== null && blocked.status !== 'saved') pendingUnpublishedRef.current!.failure = blocked;
      return Promise.resolve(blocked);
    }
    const heldFailure = pendingUnpublishedRef.current?.failure;
    if (unpublishedGeneration !== null && heldFailure) return Promise.resolve(heldFailure);
    if (publishDraft) {
      progressRef.current = next;
      setProgress(next);
    }
    setSaveStatus('pending');
    setSaveError(null);
    setSaveRetryable(retryable);
    return enqueue(async () => {
      if (unpublishedGeneration !== null) {
        const transaction = pendingUnpublishedRef.current;
        if (!transaction || transaction !== unpublishedTransaction) {
          return { status: 'saved', revision: revisionRef.current, progress: progressRef.current };
        }
        const failure = transaction.failure;
        if (failure) return failure;
      }
      let result: CoordinatedSaveResult;
      try { result = await saveCoordinated(next, revisionRef.current, options); }
      catch (error) { result = normalizeSaveFailure(error, next); }
      return markResult(result, next, publishDraft, retryable, unpublishedGeneration, unpublishedTransaction);
    }, 'unsaved', retryable);
  };

  const runLoadRepair = async (repair: NonNullable<typeof initialLoad.repair>) => {
    const { repairLoadedProgressCoordinated } = await loadStorageRepair();
    const result = await repairLoadedProgressCoordinated(repair);
    if (result.status === 'saved' && pendingRepairRef.current === repair) pendingRepairRef.current = null;
    return markResult(result, repair.progress, true);
  };

  const persistMissionSession = (
    missionId: ExecutableMissionId,
    updated: MissionSession,
    now: string,
    options: ProgressWriteOptions,
  ) => {
    const currentProgress = workingProgress();
    if (missionId === 'w4-m3') {
      if (getWeekFourBranchAccess(currentProgress).kind !== 'formal') {
        throw new Error('W4-M3保存需要W4-M2 formal-v3正式证明');
      }
      const branchSession = parseWeekFourBranchSession(updated);
      return commit({
        ...currentProgress,
        sessions: { ...currentProgress.sessions, 'w4-m3': branchSession },
        savedAt: now,
      }, true, options);
    }
    if (missionId === 'w4-m4') {
      if (getWeekFourListAccess(currentProgress).kind !== 'formal') {
        throw new Error('W4-M4保存需要W4-M3 formal-v3正式证明');
      }
      const branchSession = parseWeekFourListSession(updated);
      return commit({
        ...currentProgress,
        sessions: { ...currentProgress.sessions, 'w4-m4': branchSession },
        savedAt: now,
      }, true, options);
    }
    if (missionId === 'w4-m5') {
      if (getWeekFourBossAccess(currentProgress).kind !== 'formal') {
        throw new Error('W4-M5保存需要W4-M4 formal-v3正式证明');
      }
      const branchSession = parseWeekFourBossSession(updated);
      return commit({
        ...currentProgress,
        sessions: { ...currentProgress.sessions, 'w4-m5': branchSession },
        savedAt: now,
      }, true, options);
    }
    if (missionId === 'w5-m1') {
      if (getWeekFiveMonksAccess(currentProgress).kind !== 'formal') {
        throw new Error('W5-M1保存需要W4-M5 formal-v3正式证明');
      }
      const branchSession = parseWeekFiveMonksSession(updated);
      return commit({
        ...currentProgress,
        sessions: { ...currentProgress.sessions, 'w5-m1': branchSession },
        savedAt: now,
      }, true, options);
    }
    if (missionId === 'w5-m2') {
      if (getWeekFiveFunctionAccess(currentProgress).kind !== 'formal') throw new Error('W5-M2保存需要W5-M1 formal-v3正式证明');
      const functionSession = parseWeekFiveFunctionSession(updated);
      return commit({ ...currentProgress, sessions: { ...currentProgress.sessions, 'w5-m2': functionSession }, savedAt: now }, true, options);
    }
    if (missionId === 'w5-m3') {
      if (getWeekFiveWeatherAccess(currentProgress).kind !== 'formal') throw new Error('W5-M3保存需要W5-M2 formal-v3正式证明');
      const weatherSession = parseWeekFiveWeatherSession(updated);
      return commit({ ...currentProgress, sessions: { ...currentProgress.sessions, 'w5-m3': weatherSession }, savedAt: now }, true, options);
    }
    if (missionId === 'w5-m4') {
      if (getWeekFiveDecompositionAccess(currentProgress).kind !== 'formal') throw new Error('W5-M4保存需要W5-M3 formal-v3正式证明');
      const decompositionSession = parseWeekFiveDecompositionSession(updated);
      return commit({ ...currentProgress, sessions: { ...currentProgress.sessions, 'w5-m4': decompositionSession }, savedAt: now }, true, options);
    }
    if (missionId === 'w5-m5') {
      if (getWeekFiveStoryOrchestrationAccess(currentProgress).kind !== 'formal') throw new Error('W5-M5保存需要W5-M4 formal-v3正式证明');
      const storySession = parseWeekFiveStoryOrchestrationSession(updated);
      return commit({ ...currentProgress, sessions: { ...currentProgress.sessions, 'w5-m5': storySession }, savedAt: now }, true, options);
    }
    if(missionId==='w6-m1'){if(getWeekSixRecordsAccess(currentProgress).kind!=='formal')throw Error('W6-M1保存需要W5-M5 formal-v3正式证明');const recordsSession=parseWeekSixRecordsSession(updated);return commit({...currentProgress,sessions:{...currentProgress.sessions,'w6-m1':recordsSession},savedAt:now},true,options);}
    if(missionId==='w6-m2'){if(getWeekSixClassificationAccess(currentProgress).kind!=='formal')throw Error('W6-M2保存需要W6-M1 formal-v3正式证明');const classification=parseWeekSixClassificationSession(updated),source=currentProgress.works['w6-m1-structured-records-table'];if(!source||classification.sourceWorkId!==source.workId||classification.sourceVerifiedAt!==source.verifiedAt||JSON.stringify(classification.sourceRows)!==JSON.stringify(source.run.rows))throw Error('W6-M2保存来源必须绑定当前W6-M1正式作品');return commit({...currentProgress,sessions:{...currentProgress.sessions,'w6-m2':classification},savedAt:now},true,options);}
    if(missionId==='w6-m3'){if(getWeekSixPromptAccess(currentProgress).kind!=='formal')throw Error('W6-M3保存需要W6-M2 formal-v3正式证明');return commit(migrateProgress({...currentProgress,sessions:{...currentProgress.sessions,'w6-m3':updated},savedAt:now}),true,options);}
    if(missionId==='w6-m4'){if(!isMissionUnlocked(currentProgress,'w6-m4'))throw Error('W6-M4保存需要W6-M3 formal-v3正式证明');return commit(migrateProgress({...currentProgress,sessions:{...currentProgress.sessions,'w6-m4':updated},savedAt:now}),true,options);}
    if(missionId==='w6-m5'){if(getWeekSixArchiveAccess(currentProgress).kind!=='formal')throw Error('W6-M5保存需要W6-M4 formal-v3正式证明');return commit(migrateProgress({...currentProgress,sessions:{...currentProgress.sessions,'w6-m5':updated},savedAt:now}),true,options);}
    const next = migrateProgress({
      ...currentProgress,
      sessions: { ...currentProgress.sessions, [missionId]: updated },
      savedAt: now,
    });
    return commit(next, true, options);
  };

  const updateMissionSessionAt = (...args: MissionSessionUpdateAtArgs) => {
    const [missionId, update, now, options = {}] = args;
    if(!/^w[1-6]-m[1-5]$/.test(missionId))throw Error('任务编号无效');
    if(missionId==='w6-m1'){const currentProgress=workingProgress(),stored=currentProgress.sessions['w6-m1'];if(stored)return persistMissionSession(missionId,update(structuredClone(stored)),now,options);return import('../progress/weekSixRecordsSession').then(({createWeekSixRecordsSession})=>persistMissionSession(missionId,update(createWeekSixRecordsSession(now)),now,options));}
    if(missionId==='w6-m2'){const currentProgress=workingProgress(),source=currentProgress.works['w6-m1-structured-records-table'];if(!source)throw Error('W6-M2需要W6-M1正式作品');const stored=currentProgress.sessions['w6-m2'];if(stored)return persistMissionSession(missionId,update(structuredClone(stored)),now,options);return import('../progress/weekSixClassificationSession').then(({createWeekSixClassificationSession})=>persistMissionSession(missionId,update(createWeekSixClassificationSession({workId:source.workId,verifiedAt:source.verifiedAt,rows:source.run.rows},now)),now,options));}
    if(missionId==='w6-m3'){const currentProgress=workingProgress(),source=currentProgress.works['w6-m2-fan-evidence-classification'];if(!source)throw Error('W6-M3需要W6-M2正式作品');const stored=currentProgress.sessions['w6-m3'];if(stored)return persistMissionSession(missionId,update(structuredClone(stored)),now,options);return import('../progress/weekSixPromptSession').then(({createWeekSixPromptSession})=>persistMissionSession(missionId,update(createWeekSixPromptSession(source,now)),now,options));}
    if(missionId==='w6-m4'){const currentProgress=workingProgress(),source=currentProgress.works['w6-m3-second-attempt-brief'];if(!source)throw Error('W6-M4需要W6-M3正式作品');const stored=currentProgress.sessions['w6-m4'];if(stored)return persistMissionSession(missionId,update(structuredClone(stored)),now,options);return import('../progress/weekSixFactCheckSession').then(({createWeekSixFactCheckSession})=>persistMissionSession(missionId,update(createWeekSixFactCheckSession(source,now)),now,options));}
    if(missionId==='w6-m5'){const currentProgress=workingProgress(),source=currentProgress.works['w6-m4-second-attempt-review'];if(!source)throw Error('W6-M5需要W6-M4正式作品');const stored=currentProgress.sessions['w6-m5'];if(stored)return persistMissionSession(missionId,update(structuredClone(stored)),now,options);return import('../progress/weekSixArchiveSession').then(({createWeekSixArchiveSession})=>persistMissionSession(missionId,update(createWeekSixArchiveSession(source,now)),now,options));}
    const currentProgress = workingProgress();
    const save=(current:MissionSession)=>(persistMissionSession as unknown as (id:ExecutableMissionId,value:MissionSession,at:string,write:ProgressWriteOptions)=>Promise<CoordinatedSaveResult>)(missionId,(update as unknown as (value:MissionSession)=>MissionSession)(current),now,options);
    const stored=currentProgress.sessions[missionId] as MissionSession|undefined;
    if(stored)return save(structuredClone(stored));
    const factory=loadedMissionSessionFactory.value;
    if(factory)return save(factory(missionId,now));
    return import('../progress/session').then(({createMissionSession})=>{const stored=workingProgress().sessions[missionId] as MissionSession|undefined;return save(stored?structuredClone(stored):(createMissionSession as unknown as (id:ExecutableMissionId,at:string)=>MissionSession)(missionId,now))});
  };

  function updateMissionSession(
    missionId: 'w1-m1',
    update: (session: DragonPalaceMissionSession) => DragonPalaceMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w3-m1',
    update: (session: ManorHelpMissionSession) => ManorHelpMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w3-m2',
    update: (session: CuilanBooleanMissionSession) => CuilanBooleanMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w3-m3',
    update: (session: YunzhanDialogueMissionSession) => YunzhanDialogueMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w1-m4' | 'w1-m5',
    update: (session: AdvancedWeekOneMissionSession) => AdvancedWeekOneMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w1-m2',
    update: (session: RuyiStaffMissionSession) => RuyiStaffMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w1-m3',
    update: (session: FourSeasRegaliaMissionSession) => FourSeasRegaliaMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w2-m1',
    update: (session: HorseCareMissionSession) => HorseCareMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w2-m2',
    update: (session: MonkeyKingMissionSession) => MonkeyKingMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w2-m3',
    update: (session: PeachElixirMissionSession) => PeachElixirMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w2-m4',
    update: (session: FurnaceConditionMissionSession) => FurnaceConditionMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w2-m5',
    update: (session: HeavenlySignalBossMissionSession) => HeavenlySignalBossMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w3-m4',
    update: (session: BajieJoiningMissionSession) => BajieJoiningMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w3-m5',
    update: (session: WeekThreeBossMissionSession) => WeekThreeBossMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w4-m1',
    update: (session: WeekFourMappingMissionSession) => WeekFourMappingMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w4-m2',
    update: (session: WeekFourVariableMissionSession) => WeekFourVariableMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w4-m3',
    update: (session: WeekFourBranchMissionSession) => WeekFourBranchMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w4-m4',
    update: (session: WeekFourListMissionSession) => WeekFourListMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w4-m5',
    update: (session: WeekFourBossMissionSession) => WeekFourBossMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w5-m1',
    update: (session: WeekFiveMonksMissionSession) => WeekFiveMonksMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(
    missionId: 'w5-m2',
    update: (session: WeekFiveFunctionMissionSession) => WeekFiveFunctionMissionSession,
    options?: ProgressWriteOptions,
  ): Promise<CoordinatedSaveResult>;
  function updateMissionSession(missionId:'w5-m3',update:(session:WeekFiveWeatherMissionSession)=>WeekFiveWeatherMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  function updateMissionSession(missionId:'w5-m4',update:(session:WeekFiveDecompositionMissionSession)=>WeekFiveDecompositionMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  function updateMissionSession(missionId:'w5-m5',update:(session:WeekFiveStoryOrchestrationMissionSession)=>WeekFiveStoryOrchestrationMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  function updateMissionSession(missionId:'w6-m1',update:(session:WeekSixRecordsMissionSession)=>WeekSixRecordsMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  function updateMissionSession(missionId:'w6-m2',update:(session:WeekSixClassificationMissionSession)=>WeekSixClassificationMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  function updateMissionSession(missionId:'w6-m3',update:(session:WeekSixPromptMissionSession)=>WeekSixPromptMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  function updateMissionSession(missionId:'w6-m4',update:(session:WeekSixFactCheckMissionSession)=>WeekSixFactCheckMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  function updateMissionSession(missionId:'w6-m5',update:(session:WeekSixArchiveMissionSession)=>WeekSixArchiveMissionSession,options?:ProgressWriteOptions):Promise<CoordinatedSaveResult>;
  function updateMissionSession(...args: MissionSessionUpdateArgs) {
    const now = new Date().toISOString();
    return (updateMissionSessionAt as unknown as (id:ExecutableMissionId,update:(session:MissionSession)=>MissionSession,at:string,options?:ProgressWriteOptions)=>Promise<CoordinatedSaveResult>)(args[0],args[1] as unknown as (session:MissionSession)=>MissionSession,now,args[2]);
  }

  const reloadExternalProgress = () => {
    const loaded = loadProgressTransaction();
    if (loaded.status === 'storage-unavailable') {
      setLoadState(loadStateFrom(loaded));
      setSaveStatus('unsaved');
      setSaveError(loaded.error);
      setSaveRetryable(false);
      return null;
    }
    progressRef.current = loaded.progress;
    pendingUnpublishedRef.current = null;
    setProgress(loaded.progress);
    revisionRef.current = loaded.revision;
    setRevision(loaded.revision);
    conflictRef.current = false;
    setSaveStatus('idle');
    setSaveError(null);
    setSaveRetryable(true);
    setLoadState(loadStateFrom(loaded));
    pendingRepairRef.current = loaded.repair;
    if (loaded.repair) {
      setSaveStatus('pending');
      void enqueue(() => runLoadRepair(loaded.repair!));
    }
    return loaded.progress;
  };

  useEffect(() => {
    if (!initialLoad.repair) return;
    setSaveStatus('pending');
    void enqueue(() => runLoadRepair(initialLoad.repair!));
  }, []);

  useEffect(() => {
    const externalWrite = (event: StorageEvent) => {
      if (event.storageArea !== null && event.storageArea !== localStorage) return;
      if (event.key !== REVISION_PROGRESS_KEY && event.key !== CURRENT_PROGRESS_KEY) return;
      let storedRevision: number;
      try {
        storedRevision = parseStoredRevision(localStorage.getItem(REVISION_PROGRESS_KEY));
      } catch (error) {
        setSaveStatus('unsaved');
        setSaveError(error instanceof Error ? error.message : String(error));
        return;
      }
      if (storedRevision === revisionRef.current) return;
      conflictRef.current = true;
      setSaveStatus('conflict');
      setSaveError(PROGRESS_CONFLICT_ERROR);
      setSaveRetryable(false);
      setLoadPersistence('unsaved');
    };
    window.addEventListener('storage', externalWrite);
    return () => window.removeEventListener('storage', externalWrite);
  }, []);

  const value = useMemo<ProgressContextValue>(() => ({
    progress,
    revision,
    loadStatus: loadState.status,
    loadPersistence: loadState.persistence,
    loadError: loadState.error,
    corruptDownload: loadState.corruptDownload,
    corruptError: loadState.corruptError,
    saveStatus,
    saveError,
    saveRetryable,
    complete: (missionId, input) => commit(completeMission(workingProgress(), missionId, input), false, {}, true, true, missionId),
    updateMissionSession,
    saveWeekFourVariableDraft: (code) => import('../progress/weekFourVariableSession').then(({updateWeekFourVariableCode})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m2',(session:WeekFourVariableMissionSession)=>updateWeekFourVariableCode(session,code,now),now);}),
    saveWeekFourVariableRun: (value) => import('../progress/weekFourVariableSession').then(({recordWeekFourVariableRun})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m2',(session:WeekFourVariableMissionSession)=>recordWeekFourVariableRun(session,value,now),now);}),
    saveWeekFourVariableObservation: () => import('../progress/weekFourVariableSession').then(({recordWeekFourVariableObservation})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m2',(session:WeekFourVariableMissionSession)=>recordWeekFourVariableObservation(session,now),now);}),
    saveWeekFourVariableInfrastructureFailure: (input) => import('../progress/weekFourVariableSession').then(({recordWeekFourVariableInfrastructureFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m2',(session:WeekFourVariableMissionSession)=>recordWeekFourVariableInfrastructureFailure(session,input,now),now);}),
    saveWeekFourVariableValidationFailure: () => import('../progress/weekFourVariableSession').then(({recordWeekFourVariableValidationFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m2',(session:WeekFourVariableMissionSession)=>recordWeekFourVariableValidationFailure(session,now),now);}),
    completeWeekFourVariable: (input) => commit(completeMission(workingProgress(), 'w4-m2', input), false, {}, true, true, 'w4-m2'),
    saveWeekFourBranchDraft: (code) => import('../progress/weekFourBranchSession').then(({updateWeekFourBranchCode})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m3',(session:WeekFourBranchMissionSession)=>updateWeekFourBranchCode(session,code,now),now);}),
    saveWeekFourBranchRun: (value) => import('../progress/weekFourBranchSession').then(({recordWeekFourBranchRun})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m3',(session:WeekFourBranchMissionSession)=>recordWeekFourBranchRun(session,value,now),now);}),
    saveWeekFourBranchObservation: () => import('../progress/weekFourBranchSession').then(({recordWeekFourBranchObservation})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m3',(session:WeekFourBranchMissionSession)=>recordWeekFourBranchObservation(session,now),now);}),
    saveWeekFourBranchInfrastructureFailure: (input) => import('../progress/weekFourBranchSession').then(({recordWeekFourBranchInfrastructureFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m3',(session:WeekFourBranchMissionSession)=>recordWeekFourBranchInfrastructureFailure(session,input,now),now);}),
    saveWeekFourBranchValidationFailure: () => import('../progress/weekFourBranchSession').then(({recordWeekFourBranchValidationFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m3',(session:WeekFourBranchMissionSession)=>recordWeekFourBranchValidationFailure(session,now),now);}),
    completeWeekFourBranch: (input) => commit(completeMission(workingProgress(), 'w4-m3', input), false, {}, true, true, 'w4-m3'),
    saveWeekFourListDraft: (code) => import('../progress/weekFourListSession').then(({updateWeekFourListCode})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m4',(session:WeekFourListMissionSession)=>updateWeekFourListCode(session,code,now),now);}),
    saveWeekFourListRun: (value) => import('../progress/weekFourListSession').then(({recordWeekFourListRun})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m4',(session:WeekFourListMissionSession)=>recordWeekFourListRun(session,value,now),now);}),
    saveWeekFourListObservation: () => import('../progress/weekFourListSession').then(({recordWeekFourListObservation})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m4',(session:WeekFourListMissionSession)=>recordWeekFourListObservation(session,now),now);}),
    saveWeekFourListInfrastructureFailure: (input) => import('../progress/weekFourListSession').then(({recordWeekFourListInfrastructureFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m4',(session:WeekFourListMissionSession)=>recordWeekFourListInfrastructureFailure(session,input,now),now);}),
    saveWeekFourListValidationFailure: () => import('../progress/weekFourListSession').then(({recordWeekFourListValidationFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m4',(session:WeekFourListMissionSession)=>recordWeekFourListValidationFailure(session,now),now);}),
    completeWeekFourList: (input) => commit(completeMission(workingProgress(), 'w4-m4', input), false, {}, true, true, 'w4-m4'),
    saveWeekFourBossDraft: (code) => import('../progress/weekFourBossSession').then(({updateWeekFourBossCode})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m5',(session:WeekFourBossMissionSession)=>updateWeekFourBossCode(session,code,now),now);}),
    saveWeekFourBossRun: (value) => import('../progress/weekFourBossSession').then(({recordWeekFourBossRun})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m5',(session:WeekFourBossMissionSession)=>recordWeekFourBossRun(session,value,now),now);}),
    saveWeekFourBossObservation: () => import('../progress/weekFourBossSession').then(({recordWeekFourBossObservation})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m5',(session:WeekFourBossMissionSession)=>recordWeekFourBossObservation(session,now),now);}),
    saveWeekFourBossInfrastructureFailure: (input) => import('../progress/weekFourBossSession').then(({recordWeekFourBossInfrastructureFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m5',(session:WeekFourBossMissionSession)=>recordWeekFourBossInfrastructureFailure(session,input,now),now);}),
    saveWeekFourBossValidationFailure: () => import('../progress/weekFourBossSession').then(({recordWeekFourBossValidationFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w4-m5',(session:WeekFourBossMissionSession)=>recordWeekFourBossValidationFailure(session,now),now);}),
    completeWeekFourBoss: (input) => commit(completeMission(workingProgress(), 'w4-m5', input), false, {}, true, true, 'w4-m5'),
    saveWeekFiveMonksDraft: (code) => import('../progress/weekFiveMonksSession').then(({updateWeekFiveMonksCode})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m1',(session:WeekFiveMonksMissionSession)=>updateWeekFiveMonksCode(session,code,now),now);}),
    saveWeekFiveMonksRun: (value) => import('../progress/weekFiveMonksSession').then(({recordWeekFiveMonksRun})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m1',(session:WeekFiveMonksMissionSession)=>recordWeekFiveMonksRun(session,value,now),now);}),
    saveWeekFiveMonksObservation: () => import('../progress/weekFiveMonksSession').then(({recordWeekFiveMonksObservation})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m1',(session:WeekFiveMonksMissionSession)=>recordWeekFiveMonksObservation(session,now),now);}),
    saveWeekFiveMonksInfrastructureFailure: (input) => import('../progress/weekFiveMonksSession').then(({recordWeekFiveMonksInfrastructureFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m1',(session:WeekFiveMonksMissionSession)=>recordWeekFiveMonksInfrastructureFailure(session,input,now),now);}),
    saveWeekFiveMonksValidationFailure: () => import('../progress/weekFiveMonksSession').then(({recordWeekFiveMonksValidationFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m1',(session:WeekFiveMonksMissionSession)=>recordWeekFiveMonksValidationFailure(session,now),now);}),
    completeWeekFiveMonks: (input) => commit(completeMission(workingProgress(), 'w5-m1', input), false, {}, true, true, 'w5-m1'),
    saveWeekFiveFunctionDraft: (code) => import('../progress/weekFiveFunctionSession').then(({updateWeekFiveFunctionCode})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m2',(session:WeekFiveFunctionMissionSession)=>updateWeekFiveFunctionCode(session,code,now),now);}),
    saveWeekFiveFunctionRun: (value) => import('../progress/weekFiveFunctionSession').then(({recordWeekFiveFunctionRun})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m2',(session:WeekFiveFunctionMissionSession)=>recordWeekFiveFunctionRun(session,value,now),now);}),
    saveWeekFiveFunctionObservation: () => import('../progress/weekFiveFunctionSession').then(({recordWeekFiveFunctionObservation})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m2',(session:WeekFiveFunctionMissionSession)=>recordWeekFiveFunctionObservation(session,now),now);}),
    saveWeekFiveFunctionInfrastructureFailure: (input) => import('../progress/weekFiveFunctionSession').then(({recordWeekFiveFunctionInfrastructureFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m2',(session:WeekFiveFunctionMissionSession)=>recordWeekFiveFunctionInfrastructureFailure(session,input,now),now);}),
    saveWeekFiveFunctionValidationFailure: () => import('../progress/weekFiveFunctionSession').then(({recordWeekFiveFunctionValidationFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m2',(session:WeekFiveFunctionMissionSession)=>recordWeekFiveFunctionValidationFailure(session,now),now);}),
    completeWeekFiveFunction: (input) => commit(completeMission(workingProgress(), 'w5-m2', input), false, {}, true, true, 'w5-m2'),
    saveWeekFiveWeatherDraft: (code) => import('../progress/weekFiveWeatherSession').then(({updateWeekFiveWeatherCode})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m3',(session:WeekFiveWeatherMissionSession)=>updateWeekFiveWeatherCode(session,code,now),now);}),
    saveWeekFiveWeatherRun: (value) => import('../progress/weekFiveWeatherSession').then(({recordWeekFiveWeatherRun})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m3',(session:WeekFiveWeatherMissionSession)=>recordWeekFiveWeatherRun(session,value,now),now);}),
    saveWeekFiveWeatherObservation: () => import('../progress/weekFiveWeatherSession').then(({recordWeekFiveWeatherObservation})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m3',(session:WeekFiveWeatherMissionSession)=>recordWeekFiveWeatherObservation(session,now),now);}),
    saveWeekFiveWeatherInfrastructureFailure: (input) => import('../progress/weekFiveWeatherSession').then(({recordWeekFiveWeatherInfrastructureFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m3',(session:WeekFiveWeatherMissionSession)=>recordWeekFiveWeatherInfrastructureFailure(session,input,now),now);}),
    saveWeekFiveWeatherValidationFailure: () => import('../progress/weekFiveWeatherSession').then(({recordWeekFiveWeatherValidationFailure})=>{const now=new Date().toISOString();return updateMissionSessionAt('w5-m3',(session:WeekFiveWeatherMissionSession)=>recordWeekFiveWeatherValidationFailure(session,now),now);}),
    completeWeekFiveWeather: (input) => commit(completeMission(workingProgress(), 'w5-m3', input), false, {}, true, true, 'w5-m3'),
    saveWeekFiveDecompositionDraft: (code) => {
      return import('../progress/weekFiveDecompositionSession').then(({ updateWeekFiveDecompositionCode }) => {
        const now = new Date().toISOString();
        return updateMissionSessionAt('w5-m4', (session: WeekFiveDecompositionMissionSession) => updateWeekFiveDecompositionCode(session, code, now), now);
      });
    },
    saveWeekFiveDecompositionRun: (value) => {
      return import('../progress/weekFiveDecompositionSession').then(({ recordWeekFiveDecompositionRun }) => {
        const now = new Date().toISOString();
        return updateMissionSessionAt('w5-m4', (session: WeekFiveDecompositionMissionSession) => recordWeekFiveDecompositionRun(session, value, now), now);
      });
    },
    saveWeekFiveDecompositionObservation: () => {
      return import('../progress/weekFiveDecompositionSession').then(({ recordWeekFiveDecompositionObservation }) => {
        const now = new Date().toISOString();
        return updateMissionSessionAt('w5-m4', (session: WeekFiveDecompositionMissionSession) => recordWeekFiveDecompositionObservation(session, now), now);
      });
    },
    saveWeekFiveDecompositionInfrastructureFailure: (input) => {
      return import('../progress/weekFiveDecompositionSession').then(({ recordWeekFiveDecompositionInfrastructureFailure }) => {
        const now = new Date().toISOString();
        return updateMissionSessionAt('w5-m4', (session: WeekFiveDecompositionMissionSession) => recordWeekFiveDecompositionInfrastructureFailure(session, input, now), now);
      });
    },
    saveWeekFiveDecompositionValidationFailure: () => {
      return import('../progress/weekFiveDecompositionSession').then(({ recordWeekFiveDecompositionValidationFailure }) => {
        const now = new Date().toISOString();
        return updateMissionSessionAt('w5-m4', (session: WeekFiveDecompositionMissionSession) => recordWeekFiveDecompositionValidationFailure(session, now), now);
      });
    },
    completeWeekFiveDecomposition: (input) => commit(completeMission(workingProgress(), 'w5-m4', input), false, {}, true, true, 'w5-m4'),
    saveWeekFiveStoryOrchestrationDraft: (code) => {
      return import('../progress/weekFiveStoryOrchestrationSession').then(({ updateWeekFiveStoryOrchestrationCode }) => {
        const now = new Date().toISOString();
        return updateMissionSessionAt('w5-m5', (session: WeekFiveStoryOrchestrationMissionSession) => updateWeekFiveStoryOrchestrationCode(session, code, now), now);
      });
    },
    saveWeekFiveStoryOrchestrationRun: (value) => {
      return import('../progress/weekFiveStoryOrchestrationSession').then(({ recordWeekFiveStoryOrchestrationRun }) => {
        const now = new Date().toISOString();
        return updateMissionSessionAt('w5-m5', (session: WeekFiveStoryOrchestrationMissionSession) => recordWeekFiveStoryOrchestrationRun(session, value, now), now);
      });
    },
    saveWeekFiveStoryOrchestrationObservation: () => {
      return import('../progress/weekFiveStoryOrchestrationSession').then(({ recordWeekFiveStoryOrchestrationObservation }) => {
        const now = new Date().toISOString();
        return updateMissionSessionAt('w5-m5', (session: WeekFiveStoryOrchestrationMissionSession) => recordWeekFiveStoryOrchestrationObservation(session, now), now);
      });
    },
    saveWeekFiveStoryOrchestrationInfrastructureFailure: (input) => {
      return import('../progress/weekFiveStoryOrchestrationSession').then(({ recordWeekFiveStoryOrchestrationInfrastructureFailure }) => {
        const now = new Date().toISOString();
        return updateMissionSessionAt('w5-m5', (session: WeekFiveStoryOrchestrationMissionSession) => recordWeekFiveStoryOrchestrationInfrastructureFailure(session, input, now), now);
      });
    },
    saveWeekFiveStoryOrchestrationValidationFailure: () => {
      return import('../progress/weekFiveStoryOrchestrationSession').then(({ recordWeekFiveStoryOrchestrationValidationFailure }) => {
        const now = new Date().toISOString();
        return updateMissionSessionAt('w5-m5', (session: WeekFiveStoryOrchestrationMissionSession) => recordWeekFiveStoryOrchestrationValidationFailure(session, now), now);
      });
    },
    completeWeekFiveStoryOrchestration: (input) => commit(completeMission(workingProgress(), 'w5-m5', input), false, {}, true, true, 'w5-m5'),
    recordMissionHint: (missionId, tier) => {
      const unpublished = pendingUnpublishedRef.current;
      if (unpublished?.completionMissionIds.has(missionId)) return Promise.resolve(unpublished.failure ?? {
        status: 'unsaved',
        progress: unpublished.draft,
        error: '通关结果仍在等待保存，提示没有记入本次通关。',
      });
      const now = new Date().toISOString();
      if(missionId[1]<'4')return (updateMissionSessionAt as unknown as (id:ExecutableMissionId,update:(session:MissionSession)=>MissionSession,at:string)=>Promise<CoordinatedSaveResult>)(missionId,(session)=>recordHint(session as never,tier,now) as MissionSession,now);
      if (missionId === 'w4-m1') return import('../progress/weekFourMappingSession').then(({recordWeekFourMappingHint})=>{const loadedAt=new Date().toISOString();return updateMissionSessionAt(missionId,(session:WeekFourMappingMissionSession)=>recordWeekFourMappingHint(session,tier,loadedAt),loadedAt);});
      if (missionId === 'w4-m2') return import('../progress/weekFourVariableSession').then(({recordWeekFourVariableHint})=>{const loadedAt=new Date().toISOString();return updateMissionSessionAt(missionId,(session:WeekFourVariableMissionSession)=>recordWeekFourVariableHint(session,tier,loadedAt),loadedAt);});
      if (missionId === 'w4-m3') return import('../progress/weekFourBranchSession').then(({recordWeekFourBranchHint})=>{const loadedAt=new Date().toISOString();return updateMissionSessionAt(missionId,(session:WeekFourBranchMissionSession)=>recordWeekFourBranchHint(session,tier,loadedAt),loadedAt);});
      if (missionId === 'w4-m4') return import('../progress/weekFourListSession').then(({recordWeekFourListHint})=>{const loadedAt=new Date().toISOString();return updateMissionSessionAt(missionId,(session:WeekFourListMissionSession)=>recordWeekFourListHint(session,tier,loadedAt),loadedAt);});
      if (missionId === 'w4-m5') return import('../progress/weekFourBossSession').then(({recordWeekFourBossHint})=>{const loadedAt=new Date().toISOString();return updateMissionSessionAt(missionId,(session:WeekFourBossMissionSession)=>recordWeekFourBossHint(session,tier,loadedAt),loadedAt);});
      if (missionId === 'w5-m1') return import('../progress/weekFiveMonksSession').then(({recordWeekFiveMonksHint})=>{const loadedAt=new Date().toISOString();return updateMissionSessionAt(missionId,(session:WeekFiveMonksMissionSession)=>recordWeekFiveMonksHint(session,tier,loadedAt),loadedAt);});
      if (missionId === 'w5-m2') return import('../progress/weekFiveFunctionSession').then(({recordWeekFiveFunctionHint})=>{const loadedAt=new Date().toISOString();return updateMissionSessionAt(missionId,(session:WeekFiveFunctionMissionSession)=>recordWeekFiveFunctionHint(session,tier,loadedAt),loadedAt);});
      if (missionId === 'w5-m3') return import('../progress/weekFiveWeatherSession').then(({recordWeekFiveWeatherHint})=>{const loadedAt=new Date().toISOString();return updateMissionSessionAt(missionId,(session:WeekFiveWeatherMissionSession)=>recordWeekFiveWeatherHint(session,tier,loadedAt),loadedAt);});
      if (missionId === 'w5-m4') return import('../progress/weekFiveDecompositionSession').then(({ recordWeekFiveDecompositionHint }) => {
        const loadedAt = new Date().toISOString();
        return updateMissionSessionAt(missionId, (session: WeekFiveDecompositionMissionSession) => recordWeekFiveDecompositionHint(session, tier, loadedAt), loadedAt);
      });
      if (missionId === 'w5-m5') return import('../progress/weekFiveStoryOrchestrationSession').then(({ recordWeekFiveStoryOrchestrationHint }) => {
        const loadedAt = new Date().toISOString();
        return updateMissionSessionAt(missionId, (session: WeekFiveStoryOrchestrationMissionSession) => recordWeekFiveStoryOrchestrationHint(session, tier, loadedAt), loadedAt);
      });
      if (missionId === 'w6-m1') return import('../progress/weekSixRecordsSession').then(({ recordWeekSixRecordsHint }) => {
        const loadedAt = new Date().toISOString();
        return updateMissionSessionAt(missionId, (session: WeekSixRecordsMissionSession) => recordWeekSixRecordsHint(session, tier, loadedAt), loadedAt);
      });
      if (missionId === 'w6-m2') return import('../progress/weekSixClassificationSession').then(({ recordWeekSixClassificationHint }) => {
        const loadedAt = new Date().toISOString();
        return updateMissionSessionAt(missionId, (session: WeekSixClassificationMissionSession) => recordWeekSixClassificationHint(session, tier, loadedAt), loadedAt);
      });
      if (missionId === 'w6-m3') return import('../progress/weekSixPromptSession').then(({ recordWeekSixPromptHint }) => {
        const loadedAt = new Date().toISOString();
        return updateMissionSessionAt(missionId, (session: WeekSixPromptMissionSession) => recordWeekSixPromptHint(session, tier, loadedAt), loadedAt);
      });
      if (missionId === 'w6-m4') return import('../progress/weekSixFactCheckSession').then(({ recordWeekSixFactCheckHint }) => {
        const loadedAt = new Date().toISOString();
        return updateMissionSessionAt(missionId, (session: WeekSixFactCheckMissionSession) => recordWeekSixFactCheckHint(session, tier, loadedAt), loadedAt);
      });
      if (missionId === 'w6-m5') return import('../progress/weekSixArchiveSession').then(({ recordWeekSixArchiveHint }) => {
        const loadedAt = new Date().toISOString();
        return updateMissionSessionAt(missionId, (session: WeekSixArchiveMissionSession) => recordWeekSixArchiveHint(session, tier, loadedAt), loadedAt);
      });
      throw new Error('任务编号无效');
    },
    replaceProgress: (next) => commit(next),
    updateSettings: (settings) => {
      const current = workingProgress();
      return commit({
        ...current,
        settings: { ...current.settings, ...settings },
        savedAt: new Date().toISOString(),
      });
    },
    updateEquipment: async (operation) => {
      const { equipItem, unequipItem } = await import('../progress/equipmentOperations');
      const current = workingProgress();
      const equipment = operation.type === 'equip'
        ? equipItem(current.equipment, operation.slot, operation.itemId)
        : unequipItem(current.equipment, operation.slot);
      const now = new Date().toISOString();
      return commit(migrateProgress({ ...current, equipment, savedAt: now }));
    },
    commitParentAccess: (parentPin) => {
      const unpublished = pendingUnpublishedRef.current;
      if (unpublished) return Promise.resolve({
        status: 'unsaved',
        progress: unpublished.draft,
        error: '通关结果仍在等待保存，请先在任务页完成恢复，再修改家长访问凭据。',
      });
      const next = {
        ...progressRef.current,
        settings: { ...progressRef.current.settings, parentPin },
        savedAt: new Date().toISOString(),
      };
      const blocked = currentConflict(next);
      if (blocked) return Promise.resolve(blocked);
      setSaveStatus('pending');
      setSaveError(null);
      setSaveRetryable(false);
      return enqueue(async () => {
        const result = await saveCoordinated(next, revisionRef.current);
        // A credential failure belongs to the recovery-code panel. The generic
        // retry must continue to reference the last published credential.
        return markResult(result, next, false, false);
      }, 'unsaved', false);
    },
    acknowledgePrivacy: () => commit({
      ...progressRef.current,
      privacy: { localDataNoticeSeen: true },
      savedAt: new Date().toISOString(),
    }, false, {}, false),
    retrySave: () => {
      const blocked = currentConflict();
      if (blocked) return Promise.resolve(blocked);
      setSaveStatus('pending');
      setSaveRetryable(true);
      const repair = pendingRepairRef.current;
      if (repair) return enqueue(async () => {
        const repaired = await runLoadRepair(repair);
        if (repaired.status !== 'saved' || progressRef.current === repair.progress) return repaired;
        const draft = progressRef.current;
        return markResult(await saveCoordinated(draft, revisionRef.current), draft, true);
      });
      return enqueue(async () => {
        const transaction = pendingUnpublishedRef.current;
        const draft = transaction?.draft ?? progressRef.current;
        const generation = transaction?.generation ?? null;
        let result: CoordinatedSaveResult;
        try { result = await saveCoordinated(draft, revisionRef.current); }
        catch (error) { result = normalizeSaveFailure(error, draft); }
        return markResult(result, draft, transaction === null, true, generation, transaction);
      });
    },
    importProgressFile: (raw) => {
      if (conflictRef.current) return Promise.resolve(currentConflict() as CoordinatedImportResult);
      setSaveStatus('pending');
      setSaveRetryable(false);
      return enqueue(async () => {
        const { importProgressCoordinated } = await loadParentCoordinator();
        const result = await importProgressCoordinated(raw, revisionRef.current);
        if (result.status === 'saved') {
          pendingUnpublishedRef.current = null;
          pendingRepairRef.current = null;
          publishSaved(result.progress, result.revision);
        }
        else {
          conflictRef.current = result.status === 'conflict';
          setSaveStatus(result.status === 'conflict' ? 'conflict' : 'unsaved');
          setSaveError(result.error);
          setSaveRetryable(false);
        }
        return result;
      }, 'unsaved', false);
    },
    clearProgress: () => {
      if (conflictRef.current) return Promise.resolve(currentConflict() as CoordinatedClearResult);
      setSaveStatus('pending');
      setSaveRetryable(false);
      return enqueue(async () => {
        const { clearProgressCoordinated } = await loadParentCoordinator();
        const result = await clearProgressCoordinated(revisionRef.current);
        if (result.status === 'cleared') {
          pendingUnpublishedRef.current = null;
          pendingRepairRef.current = null;
          publishSaved(result.progress, result.revision);
        }
        else {
          conflictRef.current = result.status === 'conflict';
          setSaveStatus(result.status === 'conflict' ? 'conflict' : 'unsaved');
          setSaveError(result.error);
          setSaveRetryable(false);
        }
        return result;
      }, 'unchanged', false);
    },
    createBackup: () => createProgressBackup(pendingUnpublishedRef.current?.draft ?? progressRef.current),
    reloadExternalProgress,
  }), [
    loadState,
    loadParentCoordinator,
    loadSaveCoordinator,
    loadStorageRepair,
    progress,
    revision,
    saveError,
    saveRetryable,
    saveStatus,
  ]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used inside ProgressProvider');
  return value;
}
