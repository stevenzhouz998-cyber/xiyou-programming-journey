import { parseProgress } from './schema';
import type { ProgressV2 } from './types';

export type { MissionProgress, ProgressDocument, ProgressSettings, ProgressV1, ProgressV2 } from './types';

export const createInitialProgress = (): ProgressV2 => ({
  version: 2,
  schemaRevision: 1,
  learnerName: '小行者',
  missions: {},
  settings: { muted: false, reducedMotion: false, reducedMotionOverride: false, parentPin: '2580' },
  privacy: { localDataNoticeSeen: false },
  recovery: { lastRecoveredAt: null, source: null },
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

function normalizeStars(value: number): 1 | 2 | 3 {
  if (!Number.isFinite(value) || value < 2) return 1;
  return value < 3 ? 2 : 3;
}

function normalizeHints(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function safeCount(base: number, increment: number): number {
  if (!Number.isSafeInteger(base) || base < 0 || !Number.isSafeInteger(increment) || increment < 0) {
    throw new Error('任务进度计数超出安全范围');
  }
  const result = base + increment;
  if (!Number.isSafeInteger(result)) throw new Error('任务进度计数超出安全范围');
  return result;
}

export function completeMission(progress: ProgressV2, missionId: string, input: CompletionInput): ProgressV2 {
  if (!allMissions.some((mission) => mission.id === missionId)) throw new Error('任务编号无效');
  const previous = progress.missions[missionId];
  const stars = normalizeStars(input.stars);
  const attempts = safeCount(previous?.attempts ?? 0, 1);
  const hintsUsed = safeCount(previous?.hintsUsed ?? 0, normalizeHints(input.hintsUsed));
  return {
    ...progress,
    missions: {
      ...progress.missions,
      [missionId]: {
        status: 'completed',
        stars: previous && previous.stars > stars ? previous.stars : stars,
        attempts,
        hintsUsed,
        completedAt: new Date().toISOString(),
      },
    },
    savedAt: new Date().toISOString(),
  };
}

export function isMissionUnlocked(progress: ProgressV2, missionId: string): boolean {
  const index = allMissions.findIndex((mission) => mission.id === missionId);
  if (index < 0) return false;
  if (index === 0) return true;
  return progress.missions[allMissions[index - 1].id]?.status === 'completed';
}

export function getWeeklyReport(progress: ProgressV2, week: number): WeeklyReport {
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

export function serializeProgress(progress: ProgressV2): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(raw: string): ProgressV2 {
  return parseProgress(raw);
}

export const PROGRESS_STORAGE_KEY = 'xiyou-programming-progress-v1';

export function loadProgress(storage: Pick<Storage, 'getItem'> = localStorage): ProgressV2 {
  const raw = storage.getItem(PROGRESS_STORAGE_KEY);
  if (!raw) return createInitialProgress();
  try {
    return importProgress(raw);
  } catch {
    return createInitialProgress();
  }
}

export function saveProgress(progress: ProgressV2, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(PROGRESS_STORAGE_KEY, serializeProgress(progress));
}
