import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  completeMission,
  type CompletionInput,
  type MissionSession,
  type ProgressV3,
} from '../progress/progress';
import { allMissions } from '../course/course';
import { migrateProgress } from '../progress/schema';
import { createMissionSession, recordHint } from '../progress/session';
import {
  CURRENT_PROGRESS_KEY,
  REVISION_PROGRESS_KEY,
  loadProgressTransaction,
  parseStoredRevision,
  createProgressBackup,
  type LoadStatus,
  type ProgressBackup,
} from '../progress/storage';
import type { CoordinatedSaveResult } from '../progress/storageCoordinator';
import type { CoordinatedClearResult, CoordinatedImportResult } from '../progress/storageCoordinatorParent';

export type ProgressSaveStatus = 'idle' | 'pending' | 'saved' | 'unsaved' | 'conflict';
export interface ProgressWriteOptions { legacyWorkspaceKey?: string }

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
  complete: (missionId: string, input: CompletionInput) => Promise<CoordinatedSaveResult>;
  updateMissionSession: (
    missionId: string,
    update: (session: MissionSession) => MissionSession,
    options?: ProgressWriteOptions,
  ) => Promise<CoordinatedSaveResult>;
  recordMissionHint: (missionId: string, tier: MissionSession['usedHintTiers'][number]) => Promise<CoordinatedSaveResult>;
  replaceProgress: (progress: ProgressV3) => Promise<CoordinatedSaveResult>;
  updateSettings: (settings: Partial<ProgressV3['settings']>) => Promise<CoordinatedSaveResult>;
  commitParentAccess: (parentPin: string) => Promise<CoordinatedSaveResult>;
  acknowledgePrivacy: () => Promise<CoordinatedSaveResult>;
  retrySave: () => Promise<CoordinatedSaveResult>;
  importProgressFile: (raw: string) => Promise<CoordinatedImportResult>;
  clearProgress: () => Promise<CoordinatedClearResult>;
  createBackup: () => ProgressBackup;
  reloadExternalProgress: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);
const PROGRESS_CONFLICT_ERROR = '其他标签页已更新，已暂停保存';

async function saveCoordinated(
  progress: ProgressV3,
  expectedRevision: number,
  options: ProgressWriteOptions = {},
) {
  const { saveProgressCoordinated } = await import('../progress/storageCoordinator');
  return saveProgressCoordinated(progress, expectedRevision, options);
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState(() => loadProgressTransaction());
  const [progress, setProgress] = useState<ProgressV3>(initialLoad.progress);
  const progressRef = useRef(initialLoad.progress);
  const [revision, setRevision] = useState(initialLoad.revision);
  const revisionRef = useRef(initialLoad.revision);
  const conflictRef = useRef(false);
  const pendingRepairRef = useRef(initialLoad.repair);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [loadPersistence, setLoadPersistence] = useState<'idle' | 'saved' | 'unsaved'>(initialLoad.persistence);
  const [saveStatus, setSaveStatus] = useState<ProgressSaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const enqueue = <T,>(operation: () => Promise<T>): Promise<T> => {
    const run = queueRef.current.then(operation, operation);
    queueRef.current = run.then(() => undefined, () => undefined);
    return run;
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
    setLoadPersistence('saved');
  };

  const markResult = (result: CoordinatedSaveResult, draft: ProgressV3, publishDraft: boolean) => {
    if (result.status === 'saved') {
      if (!publishDraft || progressRef.current === draft) publishSaved(result.progress, result.revision);
      else {
        // A newer child edit is already visible. The older durable save may
        // advance CAS, but must never replace that newer in-memory draft.
        publishRevision(result.revision);
        setLoadPersistence('saved');
      }
    }
    else {
      conflictRef.current = result.status === 'conflict';
      setSaveStatus(result.status === 'conflict' ? 'conflict' : 'unsaved');
      setSaveError(result.error);
    }
    return result;
  };

  const currentConflict = (next = progressRef.current): CoordinatedSaveResult | null => (
    conflictRef.current
      ? { status: 'conflict', progress: next, expectedRevision: revisionRef.current, actualRevision: revisionRef.current + 1, error: PROGRESS_CONFLICT_ERROR }
      : null
  );

  const commit = (
    next: ProgressV3,
    publishDraft = true,
    options: ProgressWriteOptions = {},
  ): Promise<CoordinatedSaveResult> => {
    const blocked = currentConflict(next);
    if (blocked) return Promise.resolve(blocked);
    if (publishDraft) {
      progressRef.current = next;
      setProgress(next);
    }
    setSaveStatus('pending');
    setSaveError(null);
    return enqueue(async () => markResult(
      await saveCoordinated(next, revisionRef.current, options),
      next,
      publishDraft,
    ));
  };

  const runLoadRepair = async (repair: NonNullable<typeof initialLoad.repair>) => {
    const { repairLoadedProgressCoordinated } = await import('../progress/storageRepair');
    const result = await repairLoadedProgressCoordinated(repair);
    if (result.status === 'saved' && pendingRepairRef.current === repair) pendingRepairRef.current = null;
    return markResult(result, repair.progress, true);
  };

  const updateMissionSessionAt = (
    missionId: string,
    update: (session: MissionSession) => MissionSession,
    now: string,
    options: ProgressWriteOptions = {},
  ) => {
    if (!allMissions.some((mission) => mission.id === missionId)) throw new Error('任务编号无效');
    const currentProgress = progressRef.current;
    const current = currentProgress.sessions[missionId]
      ? structuredClone(currentProgress.sessions[missionId])
      : createMissionSession(now);
    const updated = update(current);
    const next = migrateProgress({
      ...currentProgress,
      sessions: { ...currentProgress.sessions, [missionId]: updated },
      savedAt: now,
    });
    return commit(next, true, options);
  };

  const reloadExternalProgress = () => {
    const loaded = loadProgressTransaction();
    if (loaded.status === 'storage-unavailable') {
      setSaveStatus('unsaved');
      setSaveError(loaded.error);
      return;
    }
    progressRef.current = loaded.progress;
    setProgress(loaded.progress);
    revisionRef.current = loaded.revision;
    setRevision(loaded.revision);
    conflictRef.current = false;
    setSaveStatus('idle');
    setSaveError(null);
    setLoadPersistence(loaded.persistence);
    pendingRepairRef.current = loaded.repair;
    if (loaded.repair) {
      setSaveStatus('pending');
      void enqueue(() => runLoadRepair(loaded.repair!));
    }
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
      setLoadPersistence('unsaved');
    };
    window.addEventListener('storage', externalWrite);
    return () => window.removeEventListener('storage', externalWrite);
  }, []);

  const value = useMemo<ProgressContextValue>(() => ({
    progress,
    revision,
    loadStatus: initialLoad.status,
    loadPersistence,
    loadError: initialLoad.error,
    corruptDownload: initialLoad.corruptDownload,
    corruptError: initialLoad.corruptError,
    saveStatus,
    saveError,
    complete: (missionId, input) => commit(completeMission(progressRef.current, missionId, input)),
    updateMissionSession: (missionId, update, options) => (
      updateMissionSessionAt(missionId, update, new Date().toISOString(), options)
    ),
    recordMissionHint: (missionId, tier) => {
      const now = new Date().toISOString();
      return updateMissionSessionAt(missionId, (session) => recordHint(session, tier, now), now);
    },
    replaceProgress: (next) => commit(next),
    updateSettings: (settings) => commit({
      ...progressRef.current,
      settings: { ...progressRef.current.settings, ...settings },
      savedAt: new Date().toISOString(),
    }),
    commitParentAccess: (parentPin) => {
      const next = {
        ...progressRef.current,
        settings: { ...progressRef.current.settings, parentPin },
        savedAt: new Date().toISOString(),
      };
      const blocked = currentConflict(next);
      if (blocked) return Promise.resolve(blocked);
      return enqueue(async () => {
        const result = await saveCoordinated(next, revisionRef.current);
        if (result.status === 'saved') publishSaved(next, result.revision);
        else if (result.status === 'conflict') {
          conflictRef.current = true;
          setSaveStatus('conflict');
          setSaveError(result.error);
        }
        else if (result.storageMayHaveChanged) {
          conflictRef.current = false;
          setSaveStatus('unsaved');
          setSaveError(result.error);
        }
        // A credential failure belongs to the recovery-code panel. The generic
        // retry must continue to reference the last published credential.
        return result;
      });
    },
    acknowledgePrivacy: () => commit({
      ...progressRef.current,
      privacy: { localDataNoticeSeen: true },
      savedAt: new Date().toISOString(),
    }, false),
    retrySave: () => {
      const blocked = currentConflict();
      if (blocked) return Promise.resolve(blocked);
      setSaveStatus('pending');
      const repair = pendingRepairRef.current;
      if (repair) return enqueue(async () => {
        const repaired = await runLoadRepair(repair);
        if (repaired.status !== 'saved' || progressRef.current === repair.progress) return repaired;
        const draft = progressRef.current;
        return markResult(await saveCoordinated(draft, revisionRef.current), draft, true);
      });
      const draft = progressRef.current;
      return enqueue(async () => markResult(await saveCoordinated(draft, revisionRef.current), draft, true));
    },
    importProgressFile: (raw) => {
      if (conflictRef.current) return Promise.resolve(currentConflict() as CoordinatedImportResult);
      setSaveStatus('pending');
      return enqueue(async () => {
        const { importProgressCoordinated } = await import('../progress/storageCoordinatorParent');
        const result = await importProgressCoordinated(raw, revisionRef.current);
        if (result.status === 'saved') publishSaved(result.progress, result.revision);
        else if (result.status === 'conflict' || result.status === 'unsaved' || result.status === 'rollback-failed') {
          conflictRef.current = result.status === 'conflict';
          setSaveStatus(result.status === 'conflict' ? 'conflict' : 'unsaved');
          setSaveError(result.error);
        }
        return result;
      });
    },
    clearProgress: () => {
      if (conflictRef.current) return Promise.resolve(currentConflict() as CoordinatedClearResult);
      setSaveStatus('pending');
      return enqueue(async () => {
        const { clearProgressCoordinated } = await import('../progress/storageCoordinatorParent');
        const result = await clearProgressCoordinated(revisionRef.current);
        if (result.status === 'cleared') publishSaved(result.progress, result.revision);
        else {
          conflictRef.current = result.status === 'conflict';
          setSaveStatus(result.status === 'conflict' ? 'conflict' : 'unsaved');
          setSaveError(result.error);
        }
        return result;
      });
    },
    createBackup: () => createProgressBackup(progressRef.current),
    reloadExternalProgress,
  }), [initialLoad, loadPersistence, progress, revision, saveError, saveStatus]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used inside ProgressProvider');
  return value;
}
