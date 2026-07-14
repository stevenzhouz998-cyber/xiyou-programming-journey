import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
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
  loadProgressTransaction,
  clearProgressTransaction,
  createProgressBackup,
  importProgressTransaction,
  retrySave as retrySaveTransaction,
  saveProgressTransaction,
  type LoadStatus,
  type SaveResult,
  type ImportResult,
  type ProgressBackup,
  type ClearResult,
} from '../progress/storage';

export interface ProgressContextValue {
  progress: ProgressV3;
  loadStatus: LoadStatus;
  loadPersistence: 'idle' | 'saved' | 'unsaved';
  loadError: string | null;
  corruptDownload: string | null;
  corruptError: string | null;
  saveStatus: 'idle' | 'saved' | 'unsaved';
  saveError: string | null;
  complete: (missionId: string, input: CompletionInput) => SaveResult;
  updateMissionSession: (
    missionId: string,
    update: (session: MissionSession) => MissionSession,
  ) => SaveResult;
  recordMissionHint: (
    missionId: string,
    tier: MissionSession['usedHintTiers'][number],
  ) => SaveResult;
  replaceProgress: (progress: ProgressV3) => SaveResult;
  updateSettings: (settings: Partial<ProgressV3['settings']>) => SaveResult;
  acknowledgePrivacy: () => SaveResult;
  retrySave: () => SaveResult;
  importProgressFile: (raw: string) => ImportResult;
  clearProgress: () => ClearResult;
  createBackup: () => ProgressBackup;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState(() => loadProgressTransaction());
  const [progress, setProgress] = useState<ProgressV3>(initialLoad.progress);
  const progressRef = useRef<ProgressV3>(initialLoad.progress);
  const [loadPersistence, setLoadPersistence] = useState<'idle' | 'saved' | 'unsaved'>(initialLoad.persistence);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'unsaved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const commit = (next: ProgressV3) => {
    progressRef.current = next;
    setProgress(next);
    const result = saveProgressTransaction(next);
    setSaveStatus(result.status);
    setSaveError(result.status === 'unsaved' ? result.error : null);
    if (result.status === 'saved') setLoadPersistence('saved');
    return result;
  };

  const retrySave = () => {
    const result = retrySaveTransaction(progressRef.current);
    setSaveStatus(result.status);
    setSaveError(result.status === 'unsaved' ? result.error : null);
    if (result.status === 'saved') setLoadPersistence('saved');
    return result;
  };

  const updateMissionSessionAt = (
    missionId: string,
    update: (session: MissionSession) => MissionSession,
    now: string,
  ) => {
    if (!allMissions.some((mission) => mission.id === missionId)) {
      throw new Error('任务编号无效');
    }
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
    return commit(next);
  };

  const acknowledgePrivacy = () => {
    const next: ProgressV3 = {
      ...progressRef.current,
      privacy: { localDataNoticeSeen: true },
      savedAt: new Date().toISOString(),
    };
    const result = saveProgressTransaction(next);
    setSaveStatus(result.status);
    setSaveError(result.status === 'unsaved' ? result.error : null);
    if (result.status === 'saved') {
      progressRef.current = next;
      setProgress(next);
      setLoadPersistence('saved');
    }
    return result;
  };

  const importProgressFile = (raw: string) => {
    const result = importProgressTransaction(raw);
    if (result.status === 'saved') {
      progressRef.current = result.progress;
      setProgress(result.progress);
      setSaveStatus('saved');
      setSaveError(null);
      setLoadPersistence('saved');
    }
    return result;
  };

  const clearProgress = () => {
    const result = clearProgressTransaction();
    if (result.status === 'cleared') {
      progressRef.current = result.progress;
      setProgress(result.progress);
      setSaveStatus('saved');
      setSaveError(null);
      setLoadPersistence('saved');
    }
    return result;
  };

  const value = useMemo<ProgressContextValue>(() => ({
    progress,
    loadStatus: initialLoad.status,
    loadPersistence,
    loadError: initialLoad.error,
    corruptDownload: initialLoad.corruptDownload,
    corruptError: initialLoad.corruptError,
    saveStatus,
    saveError,
    complete: (missionId, input) => commit(completeMission(progressRef.current, missionId, input)),
    updateMissionSession: (missionId, update) => (
      updateMissionSessionAt(missionId, update, new Date().toISOString())
    ),
    recordMissionHint: (missionId, tier) => {
      const now = new Date().toISOString();
      return updateMissionSessionAt(
        missionId,
        (session) => recordHint(session, tier, now),
        now,
      );
    },
    replaceProgress: commit,
    updateSettings: (settings) => commit({
      ...progressRef.current,
      settings: { ...progressRef.current.settings, ...settings },
      savedAt: new Date().toISOString(),
    }),
    acknowledgePrivacy,
    retrySave,
    importProgressFile,
    clearProgress,
    createBackup: () => createProgressBackup(progressRef.current),
  }), [initialLoad, loadPersistence, progress, saveError, saveStatus]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used inside ProgressProvider');
  return value;
}
