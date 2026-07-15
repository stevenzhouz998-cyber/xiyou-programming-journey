import { createInitialProgress, parseProgress } from './schema';
import type { ProgressV3 } from './types';

export type {
  MissionProgress,
  MissionSession,
  MissionSessionById,
  MissionSessions,
  ExecutableMissionId,
  DragonPalaceMissionSession,
  RuyiStaffMissionSession,
  ProgressDocument,
  ProgressSettings,
  ProgressV1,
  ProgressV2,
  ProgressV3,
} from './types';

export { createInitialProgress } from './schema';

import { allMissions } from '../course/course';
import { getSessionSupport } from './session';

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
  sessionRuns: number;
  sessionAdjustments: number;
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

export function completeMission(progress: ProgressV3, missionId: string, input: CompletionInput): ProgressV3 {
  if (!allMissions.some((mission) => mission.id === missionId)) throw new Error('任务编号无效');
  const previous = progress.missions[missionId];
  const stars = normalizeStars(input.stars);
  const normalizedHints = normalizeHints(input.hintsUsed);
  if (previous) {
    safeCount(previous.attempts, 1);
    safeCount(previous.hintsUsed, normalizedHints);
    if (previous.stars >= stars) return progress;
    return {
      ...progress,
      missions: {
        ...progress.missions,
        [missionId]: { ...previous, stars },
      },
      savedAt: new Date().toISOString(),
    };
  }
  const attempts = safeCount(0, 1);
  const hintsUsed = safeCount(0, normalizedHints);
  return {
    ...progress,
    missions: {
      ...progress.missions,
      [missionId]: {
        status: 'completed',
        stars,
        attempts,
        hintsUsed,
        completedAt: new Date().toISOString(),
      },
    },
    savedAt: new Date().toISOString(),
  };
}

export function isMissionUnlocked(progress: ProgressV3, missionId: string): boolean {
  const index = allMissions.findIndex((mission) => mission.id === missionId);
  if (index < 0) return false;
  if (index === 0) return true;
  return progress.missions[allMissions[index - 1].id]?.status === 'completed';
}

export function getWeeklyReport(progress: ProgressV3, week: number): WeeklyReport {
  const missions = allMissions.filter((mission) => mission.week === week);
  const records = missions.flatMap((mission) => progress.missions[mission.id] ? [progress.missions[mission.id]] : []);
  const missionSupport = missions
    .filter((mission) => (progress.missions[mission.id]?.hintsUsed ?? 0) >= 2)
    .map((mission) => mission.knowledge);
  const dragonSession = week === 1 ? progress.sessions['w1-m1'] : undefined;
  const ruyiSession = week === 1 ? progress.sessions['w1-m2'] : undefined;
  const sessionSupport = [
    ...(dragonSession ? getSessionSupport(dragonSession, 'w1-m1') : []),
    ...(ruyiSession ? getSessionSupport(ruyiSession, 'w1-m2') : []),
  ];
  const sessionRuns = safeCount(
    dragonSession?.totalRuns ?? 0,
    ruyiSession?.totalRuns ?? 0,
  );
  const sessionAdjustments = safeCount(
    safeCount(
      safeCount(
        dragonSession?.compileFailures ?? 0,
        dragonSession?.runtimeFailures ?? 0,
      ),
      ruyiSession?.compileFailures ?? 0,
    ),
    ruyiSession?.runtimeFailures ?? 0,
  );
  return {
    week,
    completed: records.length,
    total: missions.length,
    stars: records.reduce((sum, record) => sum + record.stars, 0),
    hintsUsed: records.reduce((sum, record) => sum + record.hintsUsed, 0),
    sessionRuns,
    sessionAdjustments,
    needsSupport: [...new Set([...missionSupport, ...sessionSupport])],
  };
}

export function serializeProgress(progress: ProgressV3): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(raw: string): ProgressV3 {
  return parseProgress(raw);
}
