import { createInitialProgress, parseProgress } from './schema';
import type {
  ManorHelpCompletionEvidence,
  ManorHelpMissionSession,
  CuilanBooleanCompletionEvidence,
  CuilanBooleanMissionSession,
  YunzhanDialogueCompletionEvidence,
  YunzhanDialogueMissionSession,
  BajieJoiningCompletionEvidence,
  BajieJoiningMissionSession,
  WeekThreeBossMissionSession,
  WeekThreeBossCompletionEvidence,
  WeekFourMappingCompletionEvidence,
  WeekFourMappingMissionSession,
  WeekFourMappingWorkV1,
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
  BajieJoiningMissionSession,
  WeekThreeBossMissionSession,
  ProgressDocument,
  ProgressSettings,
  LearningAbilitiesV1,
  ManorHelpCompletionEvidence,
  CuilanBooleanCompletionEvidence,
  YunzhanDialogueCompletionEvidence,
  BajieJoiningCompletionEvidence,
  WeekThreeBossCompletionEvidence,
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
import { compileBajieJoiningDraft, runBajieJoiningForDraft } from '../blockly/weekThreeBajieJoiningContract';
import { compileWeekThreeBossDraft } from '../blockly/weekThreeBossCompiler';
import { runWeekThreeBossDraft } from '../blockly/weekThreeBossContract';
import { compileWeekFourMappingDraft } from '../blockly/weekFourMappingDraft';
import { compareWeekFourMappingTraces } from '../blockly/weekFourMappingContract';
import { parseWeekFourMappingPython } from '../engine/weekFourPythonMappingGrammar';

export interface CompletionInput {
  stars: number;
  hintsUsed: number;
}

function formalWeekFourMappingCompletionEvidence(session: WeekFourMappingMissionSession | undefined, completedAt: string, verifiedAt: string): { evidence: Extract<WeekFourMappingCompletionEvidence, { kind: 'formal-v3' }>; work: WeekFourMappingWorkV1 } | null {
  if (!session || !session.lastRun) return null;
  try {
    const blocklyTrace = compileWeekFourMappingDraft(session.workspace).trace;
    const python = parseWeekFourMappingPython(session.pythonCode);
    const run = compareWeekFourMappingTraces(blocklyTrace, python.trace);
    if (!run.completed || JSON.stringify(blocklyTrace) !== JSON.stringify(session.lastBlocklyTrace) || JSON.stringify(python.trace) !== JSON.stringify(session.lastPythonTrace) || JSON.stringify(run) !== JSON.stringify(session.lastRun)) return null;
    const work: WeekFourMappingWorkV1 = { kind: 'blockly-python-mapping-v1', workId: 'w4-m1-first-python-mapping', missionId: 'w4-m1', title: '第一份积木与 Python 对照经卷', workspace: structuredClone(session.workspace), pythonCode: session.pythonCode, blocklyTrace: structuredClone(blocklyTrace), pythonTrace: structuredClone(python.trace), run: structuredClone(run), createdAt: completedAt, verifiedAt };
    return { evidence: { kind: 'formal-v3', completedAt, verifiedAt, workspace: structuredClone(session.workspace), pythonCode: session.pythonCode, blocklyTrace: structuredClone(blocklyTrace), pythonTrace: structuredClone(python.trace), run: structuredClone(run), workId: work.workId }, work };
  } catch { return null; }
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
  bajieJoining?: {
    runs: number;
    booleanCompositionFailures: number;
    observations: number;
    proof: 'formal-v3' | 'legacy-preformal' | 'none';
    completedAt: string | null;
  };
  weekThreeBoss?: {
    runs: number;
    successfulFullRuns: number;
    conceptFailures: { manorHelpSpecificity: number; disguiseIdentity: number; yunzhanBranch: number; joiningOperator: number };
    firstBlocker: string | null;
    observations: number;
    proof: 'formal-v3' | 'legacy-replay-only' | 'none';
  };
  weekFourMapping?: {
    runs: number;
    mappingDifferences: number;
    validationFailures: number;
    infrastructureFailures: number;
    observations: number;
    workSaved: boolean;
    proof: 'formal-v3' | 'legacy-replay-only' | 'none';
    completedAt: string | null;
  };
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

function formalBajieJoiningCompletionEvidence(session: BajieJoiningMissionSession | undefined, completedAt: string, verifiedAt: string): Extract<BajieJoiningCompletionEvidence, { kind: 'formal-v3' }> | null {
  if (!session || session.lastRun === null) return null;
  let trace; try { trace = compileBajieJoiningDraft(session.workspace); } catch { return null; }
  const run = runBajieJoiningForDraft(session.workspace, trace);
  if (!deeplyEqual(session.lastTrace, trace) || !deeplyEqual(session.lastRun, run) || !run.completed || run.finalState !== 'westward-team-departed' || run.failureSnapshot !== null || run.scenarioResults.length !== 3 || !run.scenarioResults.every((scenario) => scenario.passed) || run.penalty.livesLost !== 0 || run.penalty.resourcesLost !== 0 || run.penalty.starsLost !== 0) return null;
  return { kind: 'formal-v3', completedAt, verifiedAt, workspace: structuredClone(session.workspace), trace: structuredClone(trace), run: structuredClone(run) };
}

function formalWeekThreeBossCompletionEvidence(session: WeekThreeBossMissionSession | undefined, completedAt: string, verifiedAt: string): Extract<WeekThreeBossCompletionEvidence, { kind: 'formal-v3' }> | null {
  if (!session || session.lastRun === null) return null;
  const compiled = compileWeekThreeBossDraft(session.workspace); if (!compiled.ok) return null;
  const run = runWeekThreeBossDraft(session.workspace);
  if (!deeplyEqual(session.lastTrace, compiled.trace) || !deeplyEqual(session.lastRun, run) || !run.completed || run.finalState !== 'week-three-recap-complete' || run.failure !== null || run.penalty.livesLost !== 0 || run.penalty.resourcesLost !== 0 || run.penalty.starsLost !== 0) return null;
  return { kind: 'formal-v3', completedAt, verifiedAt, workspace: structuredClone(session.workspace), trace: structuredClone(compiled.trace), run: structuredClone(run) };
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
  const bajieEvidence = missionId === 'w3-m4'
    ? formalBajieJoiningCompletionEvidence(progress.sessions['w3-m4'], previous?.completedAt ?? now, now)
    : null;
  const weekThreeBossEvidence = missionId === 'w3-m5'
    ? formalWeekThreeBossCompletionEvidence(progress.sessions['w3-m5'], previous?.completedAt ?? now, now)
    : null;
  const weekFourMapping = missionId === 'w4-m1'
    ? formalWeekFourMappingCompletionEvidence(progress.sessions['w4-m1'], previous?.completedAt ?? now, now)
    : null;
  if (missionId === 'w3-m5') {
    const previousMission = progress.missions['w3-m4'];
    const previousEvidence = progress.missionCompletionEvidence['w3-m4'];
    if (previousMission?.status !== 'completed' || previousEvidence?.kind !== 'formal-v3') throw new Error('W3-M5完成需要W3-M4已完成且具有formal-v3正式证明');
  }
  if (missionId === 'w4-m1') {
    const prerequisite = progress.missionCompletionEvidence['w3-m5'];
    if (prerequisite?.kind !== 'formal-v3') throw new Error('W4-M1完成需要W3-M5 formal-v3正式证明');
  }
  if (previous) {
    safeCount(previous.attempts, 1);
    safeCount(previous.hintsUsed, normalizedHints);
    const existingEvidence = missionId === 'w3-m1' ? progress.missionCompletionEvidence['w3-m1'] : missionId === 'w3-m2' ? progress.missionCompletionEvidence['w3-m2'] : missionId === 'w3-m3' ? progress.missionCompletionEvidence['w3-m3'] : missionId === 'w3-m4' ? progress.missionCompletionEvidence['w3-m4'] : missionId === 'w3-m5' ? progress.missionCompletionEvidence['w3-m5'] : missionId === 'w4-m1' ? progress.missionCompletionEvidence['w4-m1'] : undefined;
    const upgradeLegacyW3 = missionId === 'w3-m1'
      && existingEvidence?.kind === 'legacy-preformal'
      && formalEvidence !== null;
    const upgradeLegacyCuilan = missionId === 'w3-m2' && existingEvidence?.kind === 'legacy-preformal' && cuilanEvidence !== null;
    const upgradeLegacyYunzhan = missionId === 'w3-m3' && existingEvidence?.kind === 'legacy-preformal' && yunzhanEvidence !== null;
    const upgradeLegacyBajie = missionId === 'w3-m4' && existingEvidence?.kind === 'legacy-preformal' && bajieEvidence !== null;
    const upgradeLegacyBoss = missionId === 'w3-m5' && existingEvidence?.kind === 'legacy-replay-only' && weekThreeBossEvidence !== null;
    const upgradeLegacyW4 = missionId === 'w4-m1' && existingEvidence?.kind === 'legacy-replay-only' && weekFourMapping !== null;
    if (previous.stars >= stars && !upgradeLegacyW3 && !upgradeLegacyCuilan && !upgradeLegacyYunzhan && !upgradeLegacyBajie && !upgradeLegacyBoss && !upgradeLegacyW4) return progress;
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
        : upgradeLegacyBajie ? { ...progress.missionCompletionEvidence, 'w3-m4': bajieEvidence! }
        : upgradeLegacyBoss ? { ...progress.missionCompletionEvidence, 'w3-m5': weekThreeBossEvidence! }
        : upgradeLegacyW4 ? { ...progress.missionCompletionEvidence, 'w4-m1': weekFourMapping!.evidence }
        : progress.missionCompletionEvidence,
      works: upgradeLegacyW4 ? { ...(progress.works ?? {}), [weekFourMapping!.work.workId]: weekFourMapping!.work } : progress.works,
      savedAt: now,
    };
  }
  if (missionId === 'w3-m1' && formalEvidence === null) {
    throw new Error('W3-M1完成需要当前保存workspace的双情境成功运行证据');
  }
  if (missionId === 'w3-m2' && cuilanEvidence === null) throw new Error('W3-M2完成需要当前保存workspace的正式Blockly成功证明');
  if (missionId === 'w3-m3' && yunzhanEvidence === null) throw new Error('W3-M3完成需要当前保存workspace的双轮对话成功证明');
  if (missionId === 'w3-m4' && bajieEvidence === null) throw new Error('W3-M4完成需要当前保存workspace的三张陈述卡成功证明');
  if (missionId === 'w3-m5' && weekThreeBossEvidence === null) throw new Error('W3-M5完成需要当前保存workspace的完整状态机成功证明');
  if (missionId === 'w4-m1' && weekFourMapping === null) throw new Error('W4-M1完成需要当前保存的双轨一致运行和作品证据');
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
      : missionId === 'w3-m4' ? { ...progress.missionCompletionEvidence, 'w3-m4': bajieEvidence! }
      : missionId === 'w3-m5' ? { ...progress.missionCompletionEvidence, 'w3-m5': weekThreeBossEvidence! }
      : missionId === 'w4-m1' ? { ...progress.missionCompletionEvidence, 'w4-m1': weekFourMapping!.evidence }
      : progress.missionCompletionEvidence,
    works: missionId === 'w4-m1' ? { ...(progress.works ?? {}), [weekFourMapping!.work.workId]: weekFourMapping!.work } : progress.works,
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
  if (missionId === 'w3-m5') {
    const evidence = progress.missionCompletionEvidence['w3-m4'];
    return evidence?.kind === 'formal-v3'
      || (progress.missions['w3-m5']?.status === 'completed' && progress.missionCompletionEvidence['w3-m5']?.kind === 'legacy-replay-only');
  }
  if (missionId === 'w4-m1') {
    return progress.missions['w3-m5']?.status === 'completed' && progress.missionCompletionEvidence['w3-m5']?.kind === 'formal-v3';
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
  const bajieJoiningSession = week === 3 ? progress.sessions['w3-m4'] : undefined;
  const weekThreeBossSession = week === 3 ? progress.sessions['w3-m5'] : undefined;
  const weekFourMappingSession = week === 4 ? progress.sessions['w4-m1'] : undefined;
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
    ...(bajieJoiningSession ? getSessionSupport(bajieJoiningSession, 'w3-m4') : []),
    ...(weekThreeBossSession ? getSessionSupport(weekThreeBossSession, 'w3-m5') : []),
  ];
  const sessionRecords = [dragonSession, ruyiSession, fourSeasSession, underworldSession, bossSession, horseCareSession, monkeyKingSession, peachElixirSession, furnaceConditionSession, heavenlyBossSession, manorHelpSession, cuilanBooleanSession, yunzhanDialogueSession, bajieJoiningSession, weekThreeBossSession, weekFourMappingSession].filter(
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
    ...(week !== 3 ? {} : {
      bajieJoining: {
        runs: bajieJoiningSession?.totalRuns ?? 0,
        booleanCompositionFailures: bajieJoiningSession?.conceptFailures.booleanComposition ?? 0,
        observations: bajieJoiningSession?.conditionObservationUses.length ?? 0,
        proof: progress.missionCompletionEvidence['w3-m4']?.kind ?? 'none',
        completedAt: progress.missions['w3-m4']?.completedAt ?? null,
      },
      weekThreeBoss: {
        runs: weekThreeBossSession?.totalRuns ?? 0,
        successfulFullRuns: weekThreeBossSession?.successfulFullRuns ?? 0,
        conceptFailures: weekThreeBossSession?.conceptFailures ?? { manorHelpSpecificity: 0, disguiseIdentity: 0, yunzhanBranch: 0, joiningOperator: 0, programStructure: 0 },
        firstBlocker: weekThreeBossSession?.firstBlockingConcept ?? null,
        observations: weekThreeBossSession?.conditionObservationUses.length ?? 0,
        proof: progress.missionCompletionEvidence['w3-m5']?.kind ?? 'none',
      },
    }),
    ...(week !== 4 ? {} : {
      weekFourMapping: {
        runs: weekFourMappingSession?.totalRuns ?? 0,
        mappingDifferences: weekFourMappingSession?.semanticMismatchFailures ?? 0,
        validationFailures: weekFourMappingSession?.validationFailures ?? 0,
        infrastructureFailures: weekFourMappingSession?.runnerInfrastructureFailures ?? 0,
        observations: weekFourMappingSession?.conditionObservationUses.length ?? 0,
        workSaved: progress.works['w4-m1-first-python-mapping'] !== undefined,
        proof: progress.missionCompletionEvidence['w4-m1']?.kind ?? 'none',
        completedAt: progress.missions['w4-m1']?.completedAt ?? null,
      },
    }),
  };
}

export function serializeProgress(progress: ProgressV3): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(raw: string): ProgressV3 {
  return parseProgress(raw);
}
