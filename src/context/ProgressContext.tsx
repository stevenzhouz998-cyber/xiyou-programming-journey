import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  completeMission,
  loadProgress,
  saveProgress,
  type CompletionInput,
  type ProgressV1,
} from '../progress/progress';

interface ProgressContextValue {
  progress: ProgressV1;
  complete: (missionId: string, input: CompletionInput) => void;
  replaceProgress: (progress: ProgressV1) => void;
  updateSettings: (settings: Partial<ProgressV1['settings']>) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressV1>(() => loadProgress());

  const commit = (next: ProgressV1) => {
    setProgress(next);
    saveProgress(next);
  };

  const value = useMemo<ProgressContextValue>(() => ({
    progress,
    complete: (missionId, input) => commit(completeMission(progress, missionId, input)),
    replaceProgress: commit,
    updateSettings: (settings) => commit({
      ...progress,
      settings: { ...progress.settings, ...settings },
      savedAt: new Date().toISOString(),
    }),
  }), [progress]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const value = useContext(ProgressContext);
  if (!value) throw new Error('useProgress must be used inside ProgressProvider');
  return value;
}
