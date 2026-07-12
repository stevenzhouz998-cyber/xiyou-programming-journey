import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  completeMission,
  type CompletionInput,
  type ProgressV2,
} from '../progress/progress';
import {
  loadProgressTransaction,
  retrySave as retrySaveTransaction,
  saveProgressTransaction,
  type LoadStatus,
  type SaveResult,
} from '../progress/storage';

export interface ProgressContextValue {
  progress: ProgressV2;
  loadStatus: LoadStatus;
  loadPersistence: 'saved' | 'unsaved';
  loadError: string | null;
  corruptDownload: string | null;
  saveStatus: 'idle' | 'saved' | 'unsaved';
  saveError: string | null;
  complete: (missionId: string, input: CompletionInput) => SaveResult;
  replaceProgress: (progress: ProgressV2) => SaveResult;
  updateSettings: (settings: Partial<ProgressV2['settings']>) => SaveResult;
  acknowledgePrivacy: () => SaveResult;
  retrySave: () => SaveResult;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState(() => loadProgressTransaction());
  const [progress, setProgress] = useState<ProgressV2>(initialLoad.progress);
  const [loadPersistence, setLoadPersistence] = useState<'saved' | 'unsaved'>(initialLoad.persistence);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'unsaved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const commit = (next: ProgressV2) => {
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
    const next: ProgressV2 = {
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

  const value = useMemo<ProgressContextValue>(() => ({
    progress,
    loadStatus: initialLoad.status,
    loadPersistence,
    loadError: initialLoad.error,
    corruptDownload: initialLoad.corruptDownload,
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
  }), [initialLoad, loadPersistence, progress, saveError, saveStatus]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used inside ProgressProvider');
  return value;
}
