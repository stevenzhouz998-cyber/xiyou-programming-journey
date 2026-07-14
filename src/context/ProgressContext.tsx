import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  completeMission,
  type CompletionInput,
  type ProgressV3,
} from '../progress/progress';
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
  const [loadPersistence, setLoadPersistence] = useState<'idle' | 'saved' | 'unsaved'>(initialLoad.persistence);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'unsaved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const commit = (next: ProgressV3) => {
    setProgress(next);
    const result = saveProgressTransaction(next);
    setSaveStatus(result.status);
    setSaveError(result.status === 'unsaved' ? result.error : null);
    if (result.status === 'saved') setLoadPersistence('saved');
    return result;
  };

  const retrySave = () => {
    const result = retrySaveTransaction(progress);
    setSaveStatus(result.status);
    setSaveError(result.status === 'unsaved' ? result.error : null);
    if (result.status === 'saved') setLoadPersistence('saved');
    return result;
  };

  const acknowledgePrivacy = () => {
    const next: ProgressV3 = {
      ...progress,
      privacy: { localDataNoticeSeen: true },
      savedAt: new Date().toISOString(),
    };
    const result = saveProgressTransaction(next);
    setSaveStatus(result.status);
    setSaveError(result.status === 'unsaved' ? result.error : null);
    if (result.status === 'saved') {
      setProgress(next);
      setLoadPersistence('saved');
    }
    return result;
  };

  const importProgressFile = (raw: string) => {
    const result = importProgressTransaction(raw);
    if (result.status === 'saved') {
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
    complete: (missionId, input) => commit(completeMission(progress, missionId, input)),
    replaceProgress: commit,
    updateSettings: (settings) => commit({
      ...progress,
      settings: { ...progress.settings, ...settings },
      savedAt: new Date().toISOString(),
    }),
    acknowledgePrivacy,
    retrySave,
    importProgressFile,
    clearProgress,
    createBackup: () => createProgressBackup(progress),
  }), [initialLoad, loadPersistence, progress, saveError, saveStatus]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used inside ProgressProvider');
  return value;
}
