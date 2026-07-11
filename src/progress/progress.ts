export interface ProgressV1 {
  version: 1;
  learnerName: string;
  missions: Record<string, {
    status: 'completed';
    stars: number;
    attempts: number;
    hintsUsed: number;
    completedAt: string;
  }>;
  settings: {
    muted: boolean;
    reducedMotion: boolean;
    parentPin: string;
  };
  savedAt: string;
}

export const createInitialProgress = (): ProgressV1 => ({
  version: 1,
  learnerName: '小行者',
  missions: {},
  settings: { muted: false, reducedMotion: false, parentPin: '2580' },
  savedAt: new Date(0).toISOString(),
});

import { allMissions } from '../course/course';

export interface CompletionInput {
  stars: number;
  hintsUsed: number;
}

export interface WeeklyReport {
  week: number;
  completed: number;
  total: number;
  stars: number;
  hintsUsed: number;
  needsSupport: string[];
}

export function completeMission(progress: ProgressV1, missionId: string, input: CompletionInput): ProgressV1 {
  const previous = progress.missions[missionId];
  return {
    ...progress,
    missions: {
      ...progress.missions,
      [missionId]: {
        status: 'completed',
        stars: Math.max(previous?.stars ?? 0, Math.min(3, Math.max(1, input.stars))),
        attempts: (previous?.attempts ?? 0) + 1,
        hintsUsed: (previous?.hintsUsed ?? 0) + Math.max(0, input.hintsUsed),
        completedAt: new Date().toISOString(),
      },
    },
    savedAt: new Date().toISOString(),
  };
}

export function isMissionUnlocked(progress: ProgressV1, missionId: string): boolean {
  const index = allMissions.findIndex((mission) => mission.id === missionId);
  if (index < 0) return false;
  if (index === 0) return true;
  return progress.missions[allMissions[index - 1].id]?.status === 'completed';
}

export function getWeeklyReport(progress: ProgressV1, week: number): WeeklyReport {
  const missions = allMissions.filter((mission) => mission.week === week);
  const records = missions.flatMap((mission) => progress.missions[mission.id] ? [progress.missions[mission.id]] : []);
  return {
    week,
    completed: records.length,
    total: missions.length,
    stars: records.reduce((sum, record) => sum + record.stars, 0),
    hintsUsed: records.reduce((sum, record) => sum + record.hintsUsed, 0),
    needsSupport: missions
      .filter((mission) => (progress.missions[mission.id]?.hintsUsed ?? 0) >= 2)
      .map((mission) => mission.knowledge),
  };
}

export function serializeProgress(progress: ProgressV1): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(raw: string): ProgressV1 {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('进度文件无法读取');
  }
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1) {
    throw new Error('进度版本不受支持');
  }
  const candidate = value as Partial<ProgressV1>;
  if (!candidate.missions || !candidate.settings || typeof candidate.learnerName !== 'string') {
    throw new Error('进度文件内容不完整');
  }
  return candidate as ProgressV1;
}

export const PROGRESS_STORAGE_KEY = 'xiyou-programming-progress-v1';

export function loadProgress(storage: Pick<Storage, 'getItem'> = localStorage): ProgressV1 {
  const raw = storage.getItem(PROGRESS_STORAGE_KEY);
  if (!raw) return createInitialProgress();
  try {
    return importProgress(raw);
  } catch {
    return createInitialProgress();
  }
}

export function saveProgress(progress: ProgressV1, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(PROGRESS_STORAGE_KEY, serializeProgress(progress));
}
