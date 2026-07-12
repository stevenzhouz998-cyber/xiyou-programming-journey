import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  completeMission,
  type CompletionInput,
  type ProgressV2,
} from '../progress/progress';
import {
  loadProgressTransaction,
  saveProgressTransaction,
  type LoadStatus,
} from '../progress/storage';

export interface ProgressContextValue {
  progress: ProgressV2;
  loadStatus: LoadStatus;
  loadPersistence: 'saved' | 'unsaved';
  loadError: string | null;
  corruptDownload: string | null;
  saveStatus: 'idle' | 'saved' | 'unsaved';
  saveError: string | null;
  complete: (missionId: string, input: CompletionInput) => void;
  replaceProgress: (progress: ProgressV2) => void;
  updateSettings: (settings: Partial<ProgressV2['settings']>) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [initialLoad] = useState(() => loadProgressTransaction());
  const [progress, setProgress] = useState<ProgressV2>(initialLoad.progress);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'unsaved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const commit = (next: ProgressV2) => {
    setProgress(next);
    const result = saveProgressTransaction(next);
    setSaveStatus(result.status);
    setSaveError(result.status === 'unsaved' ? result.error : null);
  };

  const value = useMemo<ProgressContextValue>(() => ({
    progress,
    loadStatus: initialLoad.status,
    loadPersistence: initialLoad.persistence,
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
  }), [initialLoad, progress, saveError, saveStatus]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used inside ProgressProvider');
  return value;
}
