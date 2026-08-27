import { createInitialProgress, parseProgress } from './schema';
import type {
  ManorHelpCompletionEvidence,
  ManorHelpMissionSession,
  CuilanBooleanCompletionEvidence,
  CuilanBooleanMissionSession,
  YunzhanDialogueCompletionEvidence,
  YunzhanDialogueMissionSession,
  ProgressV3,
} from './types';

export type {
  MissionProgress,
  MissionSession,
  MissionSessionById,
  MissionSessions,
  ExecutableMissionId,
  DragonPalaceMissionSession,
  FourSeasRegaliaMissionSession,
  AdvancedWeekOneMissionSession,
  RuyiStaffMissionSession,
  HorseCareMissionSession,
  MonkeyKingMissionSession,
  PeachElixirMissionSession,
  FurnaceConditionMissionSession,
  HeavenlySignalBossMissionSession,
  ManorHelpMissionSession,
  CuilanBooleanMissionSession,
  YunzhanDialogueMissionSession,
  ProgressDocument,
  ProgressSettings,
  LearningAbilitiesV1,
  ManorHelpCompletionEvidence,
  CuilanBooleanCompletionEvidence,
  YunzhanDialogueCompletionEvidence,
  MissionCompletionEvidenceV1,
  ProgressV1,
  ProgressV2,
  ProgressV3,
} from './types';

export { createInitialProgress } from './schema';

import { allMissionOutlines } from '../course/courseOutline';
import { getSessionSupport } from './session';
import { grantMissionRewards } from './equipment';
import { deriveConditionObservation } from './conditionObservation';
import { compileManorHelpDraft, runManorHelp } from '../blockly/weekThreeManorHelpContract';
import { compileCuilanBooleanDraft, runCuilanBooleanForDraft } from '../blockly/weekThreeCuilanBooleanContract';
import { compileYunzhanDialogueDraft, runYunzhanDialogueForDraft } from '../blockly/weekThreeYunzhanDialogueContract';

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

function deeplyEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => deeplyEqual(item, right[index]));
  }
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) return false;
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(rightRecord, key)
      && deeplyEqual(leftRecord[key], rightRecord[key]));
}

function currentFormalManorHelpRun(
  session: ManorHelpMissionSession | undefined,
): { workspace: ManorHelpMissionSession['workspace']; trace: ManorHelpMissionSession['lastTrace']; run: NonNullable<ManorHelpMissionSession['lastRun']> } | null {
  if (!session || session.lastRun === null) return null;
  let trace: ManorHelpMissionSession['lastTrace'];
  let run: NonNullable<ManorHelpMissionSession['lastRun']>;
  try {
    trace = compileManorHelpDraft(session.workspace);
    run = runManorHelp(trace);
  } catch {
    return null;
  }
  if (!deeplyEqual(session.lastTrace, trace) || !deeplyEqual(session.lastRun, run)) return null;
  if (!run.completed || run.diagnostic !== null || run.failureSnapshot !== null
    || run.scenarioResults.length !== 2 || !run.scenarioResults.every((scenario) => scenario.passed)
    || run.penalty.livesLost !== 0 || run.penalty.resourcesLost !== 0 || run.penalty.starsLost !== 0) return null;
  return { workspace: session.workspace, trace, run };
}

function formalManorHelpCompletionEvidence(
  session: ManorHelpMissionSession | undefined,
  completedAt: string,
  verifiedAt: string,
): Extract<ManorHelpCompletionEvidence, { kind: 'formal-v3' }> | null {
  const formalRun = currentFormalManorHelpRun(session);
  if (!formalRun) return null;
  return {
    kind: 'formal-v3',
    completedAt,
    verifiedAt,
    workspace: structuredClone(formalRun.workspace),
    trace: structuredClone(formalRun.trace),
    run: structuredClone(formalRun.run),
  };
}

function formalCuilanCompletionEvidence(
  session: CuilanBooleanMissionSession | undefined,
  completedAt: string,
  verifiedAt: string,
): Extract<CuilanBooleanCompletionEvidence, { kind: 'formal-v3' }> | null {
  if (!session || session.lastRun === null) return null;
  let trace;
  try { trace = compileCuilanBooleanDraft(session.workspace); } catch { return null; }
  const run = runCuilanBooleanForDraft(session.workspace, trace);
  if (!deeplyEqual(session.lastTrace, trace) || !deeplyEqual(session.lastRun, run)
    || !run.completed || run.finalState !== 'demon-fled' || run.failureSnapshot !== null
    || run.penalty.livesLost !== 0 || run.penalty.resourcesLost !== 0 || run.penalty.starsLost !== 0) return null;
  return { kind: 'formal-v3', completedAt, verifiedAt, workspace: structuredClone(session.workspace), trace: structuredClone(trace), run: structuredClone(run) };
}

function formalYunzhanDialogueCompletionEvidence(session: YunzhanDialogueMissionSession | undefined, completedAt: string, verifiedAt: string): Extract<YunzhanDialogueCompletionEvidence, { kind: 'formal-v3' }> | null {
  if (!session || session.lastRun === null) return null;
  let trace; try { trace = compileYunzhanDialogueDraft(session.workspace); } catch { return null; }
  const run = runYunzhanDialogueForDraft(session.workspace, trace);
  if (!deeplyEqual(session.lastTrace, trace) || !deeplyEqual(session.lastRun, run) || !run.completed || run.finalState !== 'origin-explained' || run.failureSnapshot !== null || run.penalty.livesLost !== 0 || run.penalty.resourcesLost !== 0 || run.penalty.starsLost !== 0) return null;
  return { kind: 'formal-v3', completedAt, verifiedAt, workspace: structuredClone(session.workspace), trace: structuredClone(trace), run: structuredClone(run) };
}

export function completeMission(progress: ProgressV3, missionId: string, input: CompletionInput): ProgressV3 {
  if (!allMissionOutlines.some((mission) => mission.id === missionId)) throw new Error('任务编号无效');
  const previous = progress.missions[missionId];
  const stars = normalizeStars(input.stars);
  const normalizedHints = normalizeHints(input.hintsUsed);
  const now = new Date().toISOString();
  const formalEvidence = missionId === 'w3-m1'
    ? formalManorHelpCompletionEvidence(progress.sessions['w3-m1'], previous?.completedAt ?? now, now)
    : null;
  const cuilanEvidence = missionId === 'w3-m2'
    ? formalCuilanCompletionEvidence(progress.sessions['w3-m2'], previous?.completedAt ?? now, now)
    : null;
  const yunzhanEvidence = missionId === 'w3-m3'
    ? formalYunzhanDialogueCompletionEvidence(progress.sessions['w3-m3'], previous?.completedAt ?? now, now)
    : null;
  if (previous) {
    safeCount(previous.attempts, 1);
    safeCount(previous.hintsUsed, normalizedHints);
    const existingEvidence = missionId === 'w3-m1' ? progress.missionCompletionEvidence['w3-m1'] : missionId === 'w3-m2' ? progress.missionCompletionEvidence['w3-m2'] : missionId === 'w3-m3' ? progress.missionCompletionEvidence['w3-m3'] : undefined;
    const upgradeLegacyW3 = missionId === 'w3-m1'
      && existingEvidence?.kind === 'legacy-preformal'
      && formalEvidence !== null;
    const upgradeLegacyCuilan = missionId === 'w3-m2' && existingEvidence?.kind === 'legacy-preformal' && cuilanEvidence !== null;
    const upgradeLegacyYunzhan = missionId === 'w3-m3' && existingEvidence?.kind === 'legacy-preformal' && yunzhanEvidence !== null;
    if (previous.stars >= stars && !upgradeLegacyW3 && !upgradeLegacyCuilan && !upgradeLegacyYunzhan) return progress;
    const missions = {
      ...progress.missions,
      [missionId]: previous.stars >= stars ? previous : { ...previous, stars },
    };
    return {
      ...progress,
      missions,
      abilities: { conditionObservation: deriveConditionObservation(missions) },
      missionCompletionEvidence: upgradeLegacyW3 ? { ...progress.missionCompletionEvidence, 'w3-m1': formalEvidence! }
        : upgradeLegacyCuilan ? { ...progress.missionCompletionEvidence, 'w3-m2': cuilanEvidence! }
        : upgradeLegacyYunzhan ? { ...progress.missionCompletionEvidence, 'w3-m3': yunzhanEvidence! }
        : progress.missionCompletionEvidence,
      savedAt: now,
    };
  }
  if (missionId === 'w3-m1' && formalEvidence === null) {
    throw new Error('W3-M1完成需要当前保存workspace的双情境成功运行证据');
  }
  if (missionId === 'w3-m2' && cuilanEvidence === null) throw new Error('W3-M2完成需要当前保存workspace的正式Blockly成功证明');
  if (missionId === 'w3-m3' && yunzhanEvidence === null) throw new Error('W3-M3完成需要当前保存workspace的双轮对话成功证明');
  const attempts = safeCount(0, 1);
  const hintsUsed = safeCount(0, normalizedHints);
  const completedAt = now;
  const missions = {
    ...progress.missions,
    [missionId]: {
      status: 'completed' as const,
      stars,
      attempts,
      hintsUsed,
      completedAt,
    },
  };
  return {
    ...progress,
    missions,
    equipment: grantMissionRewards(progress.equipment, missionId, completedAt),
    abilities: { conditionObservation: deriveConditionObservation(missions) },
    missionCompletionEvidence: missionId === 'w3-m1' ? { ...progress.missionCompletionEvidence, 'w3-m1': formalEvidence! }
      : missionId === 'w3-m2' ? { ...progress.missionCompletionEvidence, 'w3-m2': cuilanEvidence! }
      : missionId === 'w3-m3' ? { ...progress.missionCompletionEvidence, 'w3-m3': yunzhanEvidence! }
      : progress.missionCompletionEvidence,
    savedAt: now,
  };
}

export function isMissionUnlocked(progress: ProgressV3, missionId: string): boolean {
  const index = allMissionOutlines.findIndex((mission) => mission.id === missionId);
  if (index < 0) return false;
  if (index === 0) return true;
  if (missionId === 'w3-m3') {
    // A migrated child keeps the historical W3-M2 unlock marker; a new player
    // still needs a saved proof rather than a bare completion flag.
    if (progress.missions['w3-m3']?.status === 'completed') return true;
    const evidence = progress.missionCompletionEvidence['w3-m2'];
    return progress.missions['w3-m2']?.status === 'completed'
      && (evidence?.kind === 'formal-v3' || evidence?.kind === 'legacy-preformal');
  }
  if (missionId === 'w3-m4') {
    const evidence = progress.missionCompletionEvidence['w3-m3'];
    return progress.missions['w3-m3']?.status === 'completed' && evidence?.kind === 'formal-v3';
  }
  return progress.missions[allMissionOutlines[index - 1].id]?.status === 'completed';
}

export function getWeeklyReport(progress: ProgressV3, week: number): WeeklyReport {
  const missions = allMissionOutlines.filter((mission) => mission.week === week);
  const records = missions.flatMap((mission) => progress.missions[mission.id] ? [progress.missions[mission.id]] : []);
  const missionSupport = missions
    .filter((mission) => (progress.missions[mission.id]?.hintsUsed ?? 0) >= 2)
    .map((mission) => mission.knowledge);
  const dragonSession = week === 1 ? progress.sessions['w1-m1'] : undefined;
  const ruyiSession = week === 1 ? progress.sessions['w1-m2'] : undefined;
  const fourSeasSession = week === 1 ? progress.sessions['w1-m3'] : undefined;
  const underworldSession = week === 1 ? progress.sessions['w1-m4'] : undefined;
  const bossSession = week === 1 ? progress.sessions['w1-m5'] : undefined;
  const horseCareSession = week === 2 ? progress.sessions['w2-m1'] : undefined;
  const monkeyKingSession = week === 2 ? progress.sessions['w2-m2'] : undefined;
  const peachElixirSession = week === 2 ? progress.sessions['w2-m3'] : undefined;
  const furnaceConditionSession = week === 2 ? progress.sessions['w2-m4'] : undefined;
  const heavenlyBossSession = week === 2 ? progress.sessions['w2-m5'] : undefined;
  const manorHelpSession = week === 3 ? progress.sessions['w3-m1'] : undefined;
  const cuilanBooleanSession = week === 3 ? progress.sessions['w3-m2'] : undefined;
  const yunzhanDialogueSession = week === 3 ? progress.sessions['w3-m3'] : undefined;
  const sessionSupport = [
    ...(dragonSession ? getSessionSupport(dragonSession, 'w1-m1') : []),
    ...(ruyiSession ? getSessionSupport(ruyiSession, 'w1-m2') : []),
    ...(fourSeasSession ? getSessionSupport(fourSeasSession, 'w1-m3') : []),
    ...(underworldSession ? getSessionSupport(underworldSession, 'w1-m4') : []),
    ...(bossSession ? getSessionSupport(bossSession, 'w1-m5') : []),
    ...(horseCareSession ? getSessionSupport(horseCareSession, 'w2-m1') : []),
    ...(monkeyKingSession ? getSessionSupport(monkeyKingSession, 'w2-m2') : []),
    ...(peachElixirSession ? getSessionSupport(peachElixirSession, 'w2-m3') : []),
    ...(furnaceConditionSession ? getSessionSupport(furnaceConditionSession, 'w2-m4') : []),
    ...(heavenlyBossSession ? getSessionSupport(heavenlyBossSession, 'w2-m5') : []),
    ...(manorHelpSession ? getSessionSupport(manorHelpSession, 'w3-m1') : []),
    ...(cuilanBooleanSession ? getSessionSupport(cuilanBooleanSession, 'w3-m2') : []),
    ...(yunzhanDialogueSession ? getSessionSupport(yunzhanDialogueSession, 'w3-m3') : []),
  ];
  const sessionRecords = [dragonSession, ruyiSession, fourSeasSession, underworldSession, bossSession, horseCareSession, monkeyKingSession, peachElixirSession, furnaceConditionSession, heavenlyBossSession, manorHelpSession, cuilanBooleanSession, yunzhanDialogueSession].filter(
    (session): session is NonNullable<typeof session> => session !== undefined,
  );
  const sessionRuns = sessionRecords.reduce(
    (total, session) => safeCount(total, session.totalRuns),
    0,
  );
  const sessionAdjustments = sessionRecords.reduce(
    (total, session) => safeCount(
      safeCount(total, session.compileFailures),
      session.runtimeFailures,
    ),
    0,
  );
  return {
    week,
    completed: records.length,
    total: missions.length,
    stars: records.reduce((sum, record) => safeCount(sum, record.stars), 0),
    hintsUsed: records.reduce((sum, record) => safeCount(sum, record.hintsUsed), 0),
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
