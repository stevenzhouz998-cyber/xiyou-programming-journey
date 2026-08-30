import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  completeMission,
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
} from '../progress/progress';
import { migrateProgress } from '../progress/schema';
import { createMissionSession, recordHint } from '../progress/session';
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
  | [missionId: 'w3-m5', update: (session: WeekThreeBossMissionSession) => WeekThreeBossMissionSession, options?: ProgressWriteOptions];
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
  | [missionId: 'w3-m5', update: (session: WeekThreeBossMissionSession) => WeekThreeBossMissionSession, now: string, options?: ProgressWriteOptions];
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
}
type MissionHintTier = MissionSession['usedHintTiers'][number];
interface RecordMissionHint {
  (missionId: 'w1-m1', tier: MissionHintTier): Promise<CoordinatedSaveResult>;
  (missionId: 'w1-m2', tier: MissionHintTier): Promise<CoordinatedSaveResult>;
  (missionId: 'w1-m3', tier: MissionHintTier): Promise<CoordinatedSaveResult>;
  (missionId: 'w1-m4' | 'w1-m5', tier: MissionHintTier): Promise<CoordinatedSaveResult>;
  (missionId: 'w2-m1', tier: MissionHintTier): Promise<CoordinatedSaveResult>;
  (missionId: 'w2-m2', tier: MissionHintTier): Promise<CoordinatedSaveResult>;
  (missionId: 'w2-m3', tier: MissionHintTier): Promise<CoordinatedSaveResult>;
  (missionId: 'w3-m4', tier: MissionHintTier): Promise<CoordinatedSaveResult>;
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
    const next = migrateProgress({
      ...currentProgress,
      sessions: { ...currentProgress.sessions, [missionId]: updated },
      savedAt: now,
    });
    return commit(next, true, options);
  };

  const updateMissionSessionAt = (...args: MissionSessionUpdateAtArgs) => {
    const [missionId, update, now, options = {}] = args;
    if (missionId === 'w1-m1') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w1-m1']
        ? structuredClone(currentProgress.sessions['w1-m1'])
        : createMissionSession('w1-m1', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w1-m2') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w1-m2']
        ? structuredClone(currentProgress.sessions['w1-m2'])
        : createMissionSession('w1-m2', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w1-m3') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w1-m3']
        ? structuredClone(currentProgress.sessions['w1-m3'])
        : createMissionSession('w1-m3', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w1-m4') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w1-m4'] ? structuredClone(currentProgress.sessions['w1-m4']) : createMissionSession('w1-m4', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w2-m1') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w2-m1'] ? structuredClone(currentProgress.sessions['w2-m1']) : createMissionSession('w2-m1', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w2-m2') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w2-m2'] ? structuredClone(currentProgress.sessions['w2-m2']) : createMissionSession('w2-m2', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w2-m3') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w2-m3'] ? structuredClone(currentProgress.sessions['w2-m3']) : createMissionSession('w2-m3', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w2-m4') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w2-m4'] ? structuredClone(currentProgress.sessions['w2-m4']) : createMissionSession('w2-m4', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w2-m5') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w2-m5'] ? structuredClone(currentProgress.sessions['w2-m5']) : createMissionSession('w2-m5', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w3-m1') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w3-m1'] ? structuredClone(currentProgress.sessions['w3-m1']) : createMissionSession('w3-m1', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w3-m2') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w3-m2'] ? structuredClone(currentProgress.sessions['w3-m2']) : createMissionSession('w3-m2', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w3-m3') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w3-m3'] ? structuredClone(currentProgress.sessions['w3-m3']) : createMissionSession('w3-m3', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w3-m4') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w3-m4'] ? structuredClone(currentProgress.sessions['w3-m4']) : createMissionSession('w3-m4', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    if (missionId === 'w3-m5') {
      const currentProgress = workingProgress();
      const current = currentProgress.sessions['w3-m5'] ? structuredClone(currentProgress.sessions['w3-m5']) : createMissionSession('w3-m5', now);
      return persistMissionSession(missionId, update(current), now, options);
    }
    const currentProgress = workingProgress();
    const current = currentProgress.sessions['w1-m5'] ? structuredClone(currentProgress.sessions['w1-m5']) : createMissionSession('w1-m5', now);
    return persistMissionSession(missionId, update(current), now, options);
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
  function updateMissionSession(...args: MissionSessionUpdateArgs) {
    const now = new Date().toISOString();
    if (args[0] === 'w1-m1') {
      return updateMissionSessionAt(args[0], args[1], now, args[2]);
    }
    if (args[0] === 'w1-m2') {
      return updateMissionSessionAt(args[0], args[1], now, args[2]);
    }
    if (args[0] === 'w1-m3') {
      return updateMissionSessionAt(args[0], args[1], now, args[2]);
    }
    if (args[0] === 'w1-m4') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w1-m5') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w2-m1') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w2-m2') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w2-m3') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w2-m4') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w2-m5') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w3-m1') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w3-m2') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w3-m3') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w3-m4') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    if (args[0] === 'w3-m5') return updateMissionSessionAt(args[0], args[1], now, args[2]);
    throw new Error('任务编号无效');
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
    recordMissionHint: (missionId, tier) => {
      const unpublished = pendingUnpublishedRef.current;
      if (unpublished?.completionMissionIds.has(missionId)) return Promise.resolve(unpublished.failure ?? {
        status: 'unsaved',
        progress: unpublished.draft,
        error: '通关结果仍在等待保存，提示没有记入本次通关。',
      });
      const now = new Date().toISOString();
      if (missionId === 'w1-m1') {
        return updateMissionSessionAt(
          missionId,
          (session: DragonPalaceMissionSession) => recordHint(session, tier, now),
          now,
        );
      }
      if (missionId === 'w1-m2') {
        return updateMissionSessionAt(
          missionId,
          (session: RuyiStaffMissionSession) => recordHint(session, tier, now),
          now,
        );
      }
      if (missionId === 'w1-m3') return updateMissionSessionAt(missionId, (session: FourSeasRegaliaMissionSession) => recordHint(session, tier, now), now);
      if (missionId === 'w2-m1') return updateMissionSessionAt(missionId, (session: HorseCareMissionSession) => recordHint(session, tier, now), now);
      if (missionId === 'w2-m2') return updateMissionSessionAt(missionId, (session: MonkeyKingMissionSession) => recordHint(session, tier, now), now);
      if (missionId === 'w2-m3') return updateMissionSessionAt(missionId, (session: PeachElixirMissionSession) => recordHint(session, tier, now), now);
      if (missionId === 'w2-m4') return updateMissionSessionAt(missionId, (session: FurnaceConditionMissionSession) => recordHint(session, tier, now), now);
      if (missionId === 'w2-m5') return updateMissionSessionAt(missionId, (session: HeavenlySignalBossMissionSession) => recordHint(session, tier, now), now);
      if (missionId === 'w3-m1') return updateMissionSessionAt(missionId, (session: ManorHelpMissionSession) => recordHint(session, tier, now), now);
      if (missionId === 'w3-m2') return updateMissionSessionAt(missionId, (session: CuilanBooleanMissionSession) => recordHint(session, tier, now), now);
      if (missionId === 'w3-m3') return updateMissionSessionAt(missionId, (session: YunzhanDialogueMissionSession) => recordHint(session, tier, now), now);
      if (missionId === 'w3-m4') return updateMissionSessionAt(missionId, (session: BajieJoiningMissionSession) => recordHint(session, tier, now), now);
      if (missionId === 'w3-m5') return updateMissionSessionAt(missionId, (session: WeekThreeBossMissionSession) => recordHint(session, tier, now), now);
      return updateMissionSessionAt(missionId, (session: AdvancedWeekOneMissionSession) => recordHint(session, tier, now), now);
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
