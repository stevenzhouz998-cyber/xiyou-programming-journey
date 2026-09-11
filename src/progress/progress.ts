import { parseWeekFourListPython } from '../engine/weekFourListPythonGrammar';
import { parseWeekFourBossPython } from '../engine/weekFourBossPythonGrammar';
import { parseWeekFiveMonksPython } from '../engine/weekFiveMonksPythonGrammar';
import { parseWeekFiveFunctionPython } from '../engine/weekFiveFunctionPythonGrammar';
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
  WeekFourVariableCompletionEvidence,
  WeekFourVariableMissionSession,
  WeekFourVariableWorkV1,
  WeekFourBranchCompletionEvidence,
  WeekFourListCompletionEvidence,
  WeekFourBossCompletionEvidence,
  WeekFiveMonksCompletionEvidence,
  WeekFiveFunctionCompletionEvidence,
  WeekFourBranchMissionSession,
  WeekFourListMissionSession,
  WeekFourBossMissionSession,
  WeekFiveMonksMissionSession,
  WeekFiveFunctionMissionSession,
  WeekFourBranchWorkV1,
  WeekFourListWorkV1,
  WeekFourBossWorkV1,
  WeekFiveMonksWorkV1,
  WeekFiveFunctionWorkV1,
  ProgressV3,
} from './types';

export type {
  MissionProgress,
  MissionSession,
  AnyMissionSession,
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
  WeekFourMappingCompletionEvidence,
  WeekFourMappingMissionSession,
  WeekFourMappingWorkV1,
  WeekFourVariableCompletionEvidence,
  WeekFourVariableMissionSession,
  WeekFourVariableWorkV1,
  WeekFourBranchCompletionEvidence,
  WeekFourListCompletionEvidence,
  WeekFourBossCompletionEvidence,
  WeekFourBranchMissionSession,
  WeekFourListMissionSession,
  WeekFourBossMissionSession,
  WeekFourBranchWorkV1,
  WeekFourListWorkV1,
  WeekFourBossWorkV1,
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
import { parseWeekFourVariablePython } from '../engine/weekFourVariablePythonGrammar';
import { parseWeekFourBranchPython } from '../engine/weekFourBranchPythonGrammar';

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

function formalWeekFourVariableCompletionEvidence(
  session: WeekFourVariableMissionSession | undefined,
  completedAt: string,
  verifiedAt: string,
): { evidence: Extract<WeekFourVariableCompletionEvidence, { kind: 'formal-v3' }>; work: WeekFourVariableWorkV1 } | null {
  if (!session || session.lastRun === null || session.lastRunAt === null) return null;
  try {
    const parsed = parseWeekFourVariablePython(session.pythonCode);
    if (!parsed.run.completed || parsed.run.finalState !== 'evidence-sealed' || parsed.run.failureSnapshot !== null || session.failureSnapshot !== null
      || !deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      || !deeplyEqual(session.lastWorkerTrace, parsed.trace)
      || !deeplyEqual(session.lastRun, parsed.run)) return null;
    const work: WeekFourVariableWorkV1 = {
      kind: 'python-variable-evidence-v1', workId: 'w4-m2-variable-evidence-record', missionId: 'w4-m2',
      title: '第一次变化变量取证记录', pythonCode: session.pythonCode,
      canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run),
      createdAt: completedAt, verifiedAt,
    };
    return {
      evidence: {
        kind: 'formal-v3', completedAt, verifiedAt, pythonCode: session.pythonCode,
        canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run),
        workId: work.workId,
      },
      work,
    };
  } catch { return null; }
}

function hasValidFormalWeekFourVariableCompletion(progress: ProgressV3): boolean {
  const mission = progress.missions['w4-m2'];
  const evidence = progress.missionCompletionEvidence['w4-m2'];
  const session = progress.sessions['w4-m2'];
  const work = progress.works['w4-m2-variable-evidence-record'];
  if (!hasValidCompletedMission(mission) || evidence?.kind !== 'formal-v3' || !session || !work
    || evidence.completedAt !== mission.completedAt || evidence.workId !== work.workId
    || evidence.verifiedAt !== work.verifiedAt || work.kind !== 'python-variable-evidence-v1'
    || work.missionId !== 'w4-m2' || !isCanonicalIso(evidence.verifiedAt)
    || !isCanonicalIso(work.createdAt) || !isCanonicalIso(work.verifiedAt)
    || work.createdAt < mission.completedAt || work.verifiedAt < work.createdAt
    || session.lastRunAt === null || !isCanonicalIso(session.lastRunAt) || !isCanonicalIso(session.savedAt)
    || session.lastRunAt > session.savedAt || session.savedAt > evidence.verifiedAt) return false;
  try {
    const parsed = parseWeekFourVariablePython(session.pythonCode);
    return parsed.run.completed && parsed.run.finalState === 'evidence-sealed'
      && parsed.run.failureSnapshot === null && session.failureSnapshot === null
      && work.pythonCode === session.pythonCode && evidence.pythonCode === session.pythonCode
      && deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      && deeplyEqual(session.lastWorkerTrace, parsed.trace)
      && deeplyEqual(session.lastRun, parsed.run)
      && deeplyEqual(work.canonicalTrace, parsed.trace)
      && deeplyEqual(work.workerTrace, parsed.trace)
      && deeplyEqual(work.run, parsed.run)
      && deeplyEqual(evidence.canonicalTrace, parsed.trace)
      && deeplyEqual(evidence.workerTrace, parsed.trace)
      && deeplyEqual(evidence.run, parsed.run);
  } catch { return false; }
}

function formalWeekFourBranchCompletionEvidence(
  session: WeekFourBranchMissionSession | undefined,
  completedAt: string,
  workCreatedAt: string,
  verifiedAt: string,
): { evidence: Extract<WeekFourBranchCompletionEvidence, { kind: 'formal-v3' }>; work: WeekFourBranchWorkV1 } | null {
  if (!session || session.lastRun === null || session.lastRunAt === null) return null;
  try {
    const parsed = parseWeekFourBranchPython(session.pythonCode);
    if ('state' in parsed || !parsed.run.completed || parsed.run.state !== 'branch-proven'
      || parsed.run.failureSnapshots.length !== 0 || session.failureSnapshot !== null
      || !deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      || !deeplyEqual(session.lastWorkerTrace, parsed.trace)
      || !deeplyEqual(session.lastRun, parsed.run)) return null;
    const work: WeekFourBranchWorkV1 = {
      kind: 'python-branch-structure-v1', workId: 'w4-m3-branch-structure-record', missionId: 'w4-m3',
      title: '分支归位证明记录', pythonCode: session.pythonCode,
      canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run),
      createdAt: workCreatedAt, verifiedAt,
    };
    return {
      evidence: {
        kind: 'formal-v3', completedAt, verifiedAt, pythonCode: session.pythonCode,
        canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace),
        run: structuredClone(parsed.run), workId: work.workId,
      },
      work,
    };
  } catch { return null; }
}

function hasValidFormalWeekFourBranchCompletion(progress: ProgressV3): boolean {
  const mission = progress.missions['w4-m3'];
  const evidence = progress.missionCompletionEvidence['w4-m3'];
  const session = progress.sessions['w4-m3'];
  const work = progress.works['w4-m3-branch-structure-record'];
  if (!hasValidFormalWeekFourVariableCompletion(progress) || !hasValidCompletedMission(mission)
    || evidence?.kind !== 'formal-v3' || !session || !work
    || evidence.completedAt !== mission.completedAt || evidence.workId !== work.workId
    || evidence.verifiedAt !== work.verifiedAt || work.kind !== 'python-branch-structure-v1'
    || work.missionId !== 'w4-m3' || !isCanonicalIso(evidence.verifiedAt)
    || !isCanonicalIso(work.createdAt) || !isCanonicalIso(work.verifiedAt)
    || work.createdAt < mission.completedAt || work.verifiedAt < work.createdAt || session.lastRunAt === null
    || !isCanonicalIso(session.lastRunAt) || !isCanonicalIso(session.savedAt)
    || session.lastRunAt > session.savedAt || session.savedAt > work.createdAt) return false;
  try {
    const parsed = parseWeekFourBranchPython(session.pythonCode);
    return !('state' in parsed) && parsed.run.completed && parsed.run.state === 'branch-proven'
      && parsed.run.failureSnapshots.length === 0 && session.failureSnapshot === null
      && work.pythonCode === session.pythonCode && evidence.pythonCode === session.pythonCode
      && deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      && deeplyEqual(session.lastWorkerTrace, parsed.trace)
      && deeplyEqual(session.lastRun, parsed.run)
      && deeplyEqual(work.canonicalTrace, parsed.trace)
      && deeplyEqual(work.workerTrace, parsed.trace)
      && deeplyEqual(work.run, parsed.run)
      && deeplyEqual(evidence.canonicalTrace, parsed.trace)
      && deeplyEqual(evidence.workerTrace, parsed.trace)
      && deeplyEqual(evidence.run, parsed.run);
  } catch { return false; }
}

function formalWeekFourListCompletionEvidence(
  session: WeekFourListMissionSession | undefined,
  completedAt: string,
  workCreatedAt: string,
  verifiedAt: string,
): { evidence: Extract<WeekFourListCompletionEvidence, { kind: 'formal-v3' }>; work: WeekFourListWorkV1 } | null {
  if (!session || session.lastRun === null || session.lastRunAt === null) return null;
  try {
    const parsed = parseWeekFourListPython(session.pythonCode);
    if ('state' in parsed || !parsed.run.completed || parsed.run.state !== 'list-proven'
      || parsed.run.failureSnapshots.length !== 0 || session.failureSnapshot !== null
      || !deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      || !deeplyEqual(session.lastWorkerTrace, parsed.trace)
      || !deeplyEqual(session.lastRun, parsed.run)) return null;
    const work: WeekFourListWorkV1 = {
      kind: 'python-list-loop-v1', workId: 'w4-m4-list-loop-record', missionId: 'w4-m4',
      title: '三次变化逐项观察册', pythonCode: session.pythonCode,
      canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run),
      createdAt: workCreatedAt, verifiedAt,
    };
    return {
      evidence: {
        kind: 'formal-v3', completedAt, verifiedAt, pythonCode: session.pythonCode,
        canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace),
        run: structuredClone(parsed.run), workId: work.workId,
      },
      work,
    };
  } catch { return null; }
}
function formalWeekFourBossCompletionEvidence(
  session: WeekFourBossMissionSession | undefined,
  completedAt: string,
  workCreatedAt: string,
  verifiedAt: string,
): { evidence: Extract<WeekFourBossCompletionEvidence, { kind: 'formal-v3' }>; work: WeekFourBossWorkV1 } | null {
  if (!session || session.lastRun === null || session.lastRunAt === null) return null;
  try {
    const parsed = parseWeekFourBossPython(session.pythonCode);
    if ('state' in parsed || !parsed.run.completed || parsed.run.state !== 'station-proven'
      || parsed.run.failureSnapshots.length !== 0 || session.failureSnapshot !== null
      || !deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      || !deeplyEqual(session.lastWorkerTrace, parsed.trace)
      || !deeplyEqual(session.lastRun, parsed.run)) return null;
    const work: WeekFourBossWorkV1 = {
      kind: 'python-verification-station-v1', workId: 'w4-m5-verification-report', missionId: 'w4-m5',
      title: '白虎岭核验报告', pythonCode: session.pythonCode,
      canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run),
      createdAt: workCreatedAt, verifiedAt,
    };
    return {
      evidence: {
        kind: 'formal-v3', completedAt, verifiedAt, pythonCode: session.pythonCode,
        canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace),
        run: structuredClone(parsed.run), workId: work.workId,
      },
      work,
    };
  } catch { return null; }
}
function formalWeekFiveMonksCompletionEvidence(
  session: WeekFiveMonksMissionSession | undefined,
  completedAt: string,
  workCreatedAt: string,
  verifiedAt: string,
): { evidence: Extract<WeekFiveMonksCompletionEvidence, { kind: 'formal-v3' }>; work: WeekFiveMonksWorkV1 } | null {
  if (!session || session.lastRun === null || session.lastRunAt === null) return null;
  try {
    const parsed = parseWeekFiveMonksPython(session.pythonCode);
    if ('state' in parsed || !parsed.run.completed || parsed.run.state !== 'rescue-proven'
      || parsed.run.failureSnapshots.length !== 0 || session.failureSnapshot !== null
      || !deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      || !deeplyEqual(session.lastWorkerTrace, parsed.trace)
      || !deeplyEqual(session.lastRun, parsed.run)) return null;
    const work: WeekFiveMonksWorkV1 = {
      kind: 'python-monks-loop-v1', workId: 'w5-m1-monks-rescue-record', missionId: 'w5-m1',
      title: '僧众解困记录', pythonCode: session.pythonCode,
      canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run),
      createdAt: workCreatedAt, verifiedAt,
    };
    return {
      evidence: {
        kind: 'formal-v3', completedAt, verifiedAt, pythonCode: session.pythonCode,
        canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace),
        run: structuredClone(parsed.run), workId: work.workId,
      },
      work,
    };
  } catch { return null; }
}
function formalWeekFiveFunctionCompletionEvidence(
  session: WeekFiveFunctionMissionSession | undefined,
  completedAt: string,
  workCreatedAt: string,
  verifiedAt: string,
): { evidence: Extract<WeekFiveFunctionCompletionEvidence, { kind: 'formal-v3' }>; work: WeekFiveFunctionWorkV1 } | null {
  if (!session || session.lastRun === null || session.lastRunAt === null) return null;
  try {
    const parsed = parseWeekFiveFunctionPython(session.pythonCode);
    if ('state' in parsed || !parsed.run.completed || parsed.run.state !== 'record-proven'
      || parsed.run.failureSnapshots.length !== 0 || session.failureSnapshot !== null
      || !deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      || !deeplyEqual(session.lastWorkerTrace, parsed.trace)
      || !deeplyEqual(session.lastRun, parsed.run)) return null;
    const work: WeekFiveFunctionWorkV1 = {
      kind: 'python-function-call-v1', workId: 'w5-m2-sanqing-function-record', missionId: 'w5-m2',
      title: '三清观函数记录', pythonCode: session.pythonCode,
      canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run),
      createdAt: workCreatedAt, verifiedAt,
    };
    return {
      evidence: {
        kind: 'formal-v3', completedAt, verifiedAt, pythonCode: session.pythonCode,
        canonicalTrace: structuredClone(parsed.trace), workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run), workId: work.workId,
      },
      work,
    };
  } catch { return null; }
}

function hasValidFormalWeekFourListCompletion(progress: ProgressV3): boolean {
  const mission = progress.missions['w4-m4'];
  const evidence = progress.missionCompletionEvidence['w4-m4'];
  const session = progress.sessions['w4-m4'];
  const work = progress.works['w4-m4-list-loop-record'];
  if (!hasValidFormalWeekFourBranchCompletion(progress) || !hasValidCompletedMission(mission)
    || evidence?.kind !== 'formal-v3' || !session || !work
    || evidence.completedAt !== mission.completedAt || evidence.workId !== work.workId
    || evidence.verifiedAt !== work.verifiedAt || work.kind !== 'python-list-loop-v1'
    || work.missionId !== 'w4-m4' || !isCanonicalIso(evidence.verifiedAt)
    || !isCanonicalIso(work.createdAt) || !isCanonicalIso(work.verifiedAt)
    || work.createdAt < mission.completedAt || work.verifiedAt < work.createdAt || session.lastRunAt === null
    || !isCanonicalIso(session.lastRunAt) || !isCanonicalIso(session.savedAt)
    || session.lastRunAt > session.savedAt || session.savedAt > work.createdAt) return false;
  try {
    const parsed = parseWeekFourListPython(session.pythonCode);
    return !('state' in parsed) && parsed.run.completed && parsed.run.state === 'list-proven'
      && parsed.run.failureSnapshots.length === 0 && session.failureSnapshot === null
      && work.pythonCode === session.pythonCode && evidence.pythonCode === session.pythonCode
      && deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      && deeplyEqual(session.lastWorkerTrace, parsed.trace)
      && deeplyEqual(session.lastRun, parsed.run)
      && deeplyEqual(work.canonicalTrace, parsed.trace)
      && deeplyEqual(work.workerTrace, parsed.trace)
      && deeplyEqual(work.run, parsed.run)
      && deeplyEqual(evidence.canonicalTrace, parsed.trace)
      && deeplyEqual(evidence.workerTrace, parsed.trace)
      && deeplyEqual(evidence.run, parsed.run);
  } catch { return false; }
}
function hasValidFormalWeekFourBossCompletion(progress: ProgressV3): boolean {
  const mission = progress.missions['w4-m5'];
  const evidence = progress.missionCompletionEvidence['w4-m5'];
  const session = progress.sessions['w4-m5'];
  const work = progress.works['w4-m5-verification-report'];
  if (!hasValidFormalWeekFourListCompletion(progress) || !hasValidCompletedMission(mission)
    || evidence?.kind !== 'formal-v3' || !session || !work
    || evidence.completedAt !== mission.completedAt || evidence.workId !== work.workId
    || evidence.verifiedAt !== work.verifiedAt || work.kind !== 'python-verification-station-v1'
    || work.missionId !== 'w4-m5' || !isCanonicalIso(evidence.verifiedAt)
    || !isCanonicalIso(work.createdAt) || !isCanonicalIso(work.verifiedAt)
    || work.createdAt < mission.completedAt || work.verifiedAt < work.createdAt || session.lastRunAt === null
    || !isCanonicalIso(session.lastRunAt) || !isCanonicalIso(session.savedAt)
    || session.lastRunAt > session.savedAt || session.savedAt > work.createdAt) return false;
  try {
    const parsed = parseWeekFourBossPython(session.pythonCode);
    return !('state' in parsed) && parsed.run.completed && parsed.run.state === 'station-proven'
      && parsed.run.failureSnapshots.length === 0 && session.failureSnapshot === null
      && work.pythonCode === session.pythonCode && evidence.pythonCode === session.pythonCode
      && deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      && deeplyEqual(session.lastWorkerTrace, parsed.trace)
      && deeplyEqual(session.lastRun, parsed.run)
      && deeplyEqual(work.canonicalTrace, parsed.trace)
      && deeplyEqual(work.workerTrace, parsed.trace)
      && deeplyEqual(work.run, parsed.run)
      && deeplyEqual(evidence.canonicalTrace, parsed.trace)
      && deeplyEqual(evidence.workerTrace, parsed.trace)
      && deeplyEqual(evidence.run, parsed.run);
  } catch { return false; }
}
function hasValidFormalWeekFiveMonksCompletion(progress: ProgressV3): boolean {
  const mission = progress.missions['w5-m1'];
  const evidence = progress.missionCompletionEvidence['w5-m1'];
  const session = progress.sessions['w5-m1'];
  const work = progress.works['w5-m1-monks-rescue-record'];
  if (!hasValidFormalWeekFourBossCompletion(progress) || !hasValidCompletedMission(mission)
    || evidence?.kind !== 'formal-v3' || !session || !work
    || evidence.completedAt !== mission.completedAt || evidence.workId !== work.workId
    || evidence.verifiedAt !== work.verifiedAt || work.kind !== 'python-monks-loop-v1'
    || work.missionId !== 'w5-m1' || !isCanonicalIso(evidence.verifiedAt)
    || !isCanonicalIso(work.createdAt) || !isCanonicalIso(work.verifiedAt)
    || work.createdAt < mission.completedAt || work.verifiedAt < work.createdAt || session.lastRunAt === null
    || !isCanonicalIso(session.lastRunAt) || !isCanonicalIso(session.savedAt)
    || session.lastRunAt > session.savedAt || session.savedAt > work.createdAt) return false;
  try {
    const parsed = parseWeekFiveMonksPython(session.pythonCode);
    return !('state' in parsed) && parsed.run.completed && parsed.run.state === 'rescue-proven'
      && parsed.run.failureSnapshots.length === 0 && session.failureSnapshot === null
      && work.pythonCode === session.pythonCode && evidence.pythonCode === session.pythonCode
      && deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      && deeplyEqual(session.lastWorkerTrace, parsed.trace)
      && deeplyEqual(session.lastRun, parsed.run)
      && deeplyEqual(work.canonicalTrace, parsed.trace)
      && deeplyEqual(work.workerTrace, parsed.trace)
      && deeplyEqual(work.run, parsed.run)
      && deeplyEqual(evidence.canonicalTrace, parsed.trace)
      && deeplyEqual(evidence.workerTrace, parsed.trace)
      && deeplyEqual(evidence.run, parsed.run);
  } catch { return false; }
}
function hasValidFormalWeekFiveFunctionCompletion(progress: ProgressV3): boolean {
  const mission = progress.missions['w5-m2']; const evidence = progress.missionCompletionEvidence['w5-m2'];
  const session = progress.sessions['w5-m2']; const work = progress.works['w5-m2-sanqing-function-record'];
  if (!hasValidFormalWeekFiveMonksCompletion(progress) || !hasValidCompletedMission(mission) || evidence?.kind !== 'formal-v3' || !session || !work
    || evidence.completedAt !== mission.completedAt || evidence.workId !== work.workId || evidence.verifiedAt !== work.verifiedAt
    || work.kind !== 'python-function-call-v1' || work.missionId !== 'w5-m2' || !isCanonicalIso(evidence.verifiedAt)
    || !isCanonicalIso(work.createdAt) || !isCanonicalIso(work.verifiedAt) || work.createdAt < mission.completedAt || work.verifiedAt < work.createdAt
    || session.lastRunAt === null || !isCanonicalIso(session.lastRunAt) || !isCanonicalIso(session.savedAt) || session.lastRunAt > session.savedAt || session.savedAt > work.createdAt) return false;
  try {
    const parsed = parseWeekFiveFunctionPython(session.pythonCode);
    return !('state' in parsed) && parsed.run.completed && parsed.run.state === 'record-proven' && parsed.run.failureSnapshots.length === 0 && session.failureSnapshot === null
      && work.pythonCode === session.pythonCode && evidence.pythonCode === session.pythonCode
      && deeplyEqual(session.lastCanonicalTrace, parsed.trace) && deeplyEqual(session.lastWorkerTrace, parsed.trace) && deeplyEqual(session.lastRun, parsed.run)
      && deeplyEqual(work.canonicalTrace, parsed.trace) && deeplyEqual(work.workerTrace, parsed.trace) && deeplyEqual(work.run, parsed.run)
      && deeplyEqual(evidence.canonicalTrace, parsed.trace) && deeplyEqual(evidence.workerTrace, parsed.trace) && deeplyEqual(evidence.run, parsed.run);
  } catch { return false; }
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
  weekFourVariables?: {
    runs: number;
    overwriteFailures: number;
    validationFailures: number;
    infrastructureFailures: number;
    observations: number;
    workSaved: boolean;
    proof: 'formal-v3' | 'legacy-replay-only' | 'none';
    completedAt: string | null;
  };
  weekFourBranches?: {
    runs: number;
    conflicts: number;
    missing: number;
    validation: number;
    infrastructure: number;
    observations: number;
    workSaved: boolean;
    proof: 'formal-v3' | 'legacy-replay-only' | 'none';
    completedAt: string | null;
  };
  weekFiveFunction?: {
    runs: number;
    callFailures: number;
    bodyFailures: number;
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

function isCanonicalIso(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function hasValidCompletedMission(mission: ProgressV3['missions'][string] | undefined): mission is NonNullable<typeof mission> {
  return mission?.status === 'completed'
    && Number.isSafeInteger(mission.stars) && mission.stars >= 1 && mission.stars <= 3
    && Number.isSafeInteger(mission.attempts) && mission.attempts >= 1
    && Number.isSafeInteger(mission.hintsUsed) && mission.hintsUsed >= 0
    && isCanonicalIso(mission.completedAt);
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

export function completeWeekFourBranchProgress(progress: ProgressV3, input: CompletionInput): ProgressV3 {
  const previous = progress.missions['w4-m3'];
  const existingEvidence = progress.missionCompletionEvidence['w4-m3'];
  if (existingEvidence?.kind === 'formal-v3') {
    if (hasValidFormalWeekFourBranchCompletion(progress)) return progress;
    throw new Error('W4-M3现有formal-v3证明与当前前置、session、作品或运行不一致');
  }
  if (!hasValidFormalWeekFourVariableCompletion(progress)) {
    throw new Error('W4-M3完成需要W4-M2 formal-v3正式证明');
  }
  if (previous && existingEvidence?.kind !== 'legacy-replay-only') {
    throw new Error('W4-M3历史完成缺少可升级的来源证明');
  }
  const now = new Date().toISOString();
  const completion = formalWeekFourBranchCompletionEvidence(
    progress.sessions['w4-m3'], previous?.completedAt ?? now, now, now,
  );
  if (completion === null) {
    throw new Error('W4-M3完成需要当前保存session的branch-proven成功运行');
  }
  const mission = previous ?? {
    status: 'completed' as const,
    stars: normalizeStars(input.stars),
    attempts: safeCount(0, 1),
    hintsUsed: safeCount(0, normalizeHints(input.hintsUsed)),
    completedAt: now,
  };
  return {
    ...progress,
    missions: { ...progress.missions, 'w4-m3': mission },
    missionCompletionEvidence: { ...progress.missionCompletionEvidence, 'w4-m3': completion.evidence },
    works: { ...progress.works, [completion.work.workId]: completion.work },
    equipment: progress.equipment,
    abilities: progress.abilities,
    savedAt: now,
  };
}

export function completeWeekFourListProgress(progress: ProgressV3, input: CompletionInput): ProgressV3 {
  const previous = progress.missions['w4-m4'];
  const existingEvidence = progress.missionCompletionEvidence['w4-m4'];
  if (existingEvidence?.kind === 'formal-v3') {
    if (hasValidFormalWeekFourListCompletion(progress)) return progress;
    throw new Error('W4-M4现有formal-v3证明与当前前置、session、作品或运行不一致');
  }
  if (!hasValidFormalWeekFourBranchCompletion(progress)) {
    throw new Error('W4-M4完成需要W4-M3 formal-v3正式证明');
  }
  if (previous && existingEvidence?.kind !== 'legacy-replay-only') {
    throw new Error('W4-M4历史完成缺少可升级的来源证明');
  }
  const now = new Date().toISOString();
  const completion = formalWeekFourListCompletionEvidence(
    progress.sessions['w4-m4'], previous?.completedAt ?? now, now, now,
  );
  if (completion === null) {
    throw new Error('W4-M4完成需要当前保存session的list-proven成功运行');
  }
  const mission = previous ?? {
    status: 'completed' as const,
    stars: normalizeStars(input.stars),
    attempts: safeCount(0, 1),
    hintsUsed: safeCount(0, normalizeHints(input.hintsUsed)),
    completedAt: now,
  };
  return {
    ...progress,
    missions: { ...progress.missions, 'w4-m4': mission },
    missionCompletionEvidence: { ...progress.missionCompletionEvidence, 'w4-m4': completion.evidence },
    works: { ...progress.works, [completion.work.workId]: completion.work },
    equipment: progress.equipment,
    abilities: progress.abilities,
    savedAt: now,
  };
}
export function completeWeekFourBossProgress(progress: ProgressV3, input: CompletionInput): ProgressV3 {
  const previous = progress.missions['w4-m5'];
  const existingEvidence = progress.missionCompletionEvidence['w4-m5'];
  if (existingEvidence?.kind === 'formal-v3') {
    if (hasValidFormalWeekFourBossCompletion(progress)) return progress;
    throw new Error('W4-M5现有formal-v3证明与当前前置、session、作品或运行不一致');
  }
  if (!hasValidFormalWeekFourListCompletion(progress)) {
    throw new Error('W4-M5完成需要W4-M4 formal-v3正式证明');
  }
  if (previous && existingEvidence?.kind !== 'legacy-replay-only') {
    throw new Error('W4-M5历史完成缺少可升级的来源证明');
  }
  const now = new Date().toISOString();
  const completion = formalWeekFourBossCompletionEvidence(
    progress.sessions['w4-m5'], previous?.completedAt ?? now, now, now,
  );
  if (completion === null) {
    throw new Error('W4-M5完成需要当前保存session的station-proven成功运行');
  }
  const mission = previous ?? {
    status: 'completed' as const,
    stars: normalizeStars(input.stars),
    attempts: safeCount(0, 1),
    hintsUsed: safeCount(0, normalizeHints(input.hintsUsed)),
    completedAt: now,
  };
  return {
    ...progress,
    missions: { ...progress.missions, 'w4-m5': mission },
    missionCompletionEvidence: { ...progress.missionCompletionEvidence, 'w4-m5': completion.evidence },
    works: { ...progress.works, [completion.work.workId]: completion.work },
    equipment: progress.equipment,
    abilities: progress.abilities,
    savedAt: now,
  };
}
export function completeWeekFiveMonksProgress(progress: ProgressV3, input: CompletionInput): ProgressV3 {
  const previous = progress.missions['w5-m1'];
  const existingEvidence = progress.missionCompletionEvidence['w5-m1'];
  if (existingEvidence?.kind === 'formal-v3') {
    if (hasValidFormalWeekFiveMonksCompletion(progress)) return progress;
    throw new Error('W5-M1现有formal-v3证明与当前前置、session、作品或运行不一致');
  }
  if (!hasValidFormalWeekFourBossCompletion(progress)) {
    throw new Error('W5-M1完成需要W4-M5 formal-v3正式证明');
  }
  if (previous && existingEvidence?.kind !== 'legacy-replay-only') {
    throw new Error('W5-M1历史完成缺少可升级的来源证明');
  }
  const now = new Date().toISOString();
  const completion = formalWeekFiveMonksCompletionEvidence(
    progress.sessions['w5-m1'], previous?.completedAt ?? now, now, now,
  );
  if (completion === null) {
    throw new Error('W5-M1完成需要当前保存session的rescue-proven成功运行');
  }
  const mission = previous ?? {
    status: 'completed' as const,
    stars: normalizeStars(input.stars),
    attempts: safeCount(0, 1),
    hintsUsed: safeCount(0, normalizeHints(input.hintsUsed)),
    completedAt: now,
  };
  return {
    ...progress,
    missions: { ...progress.missions, 'w5-m1': mission },
    missionCompletionEvidence: { ...progress.missionCompletionEvidence, 'w5-m1': completion.evidence },
    works: { ...progress.works, [completion.work.workId]: completion.work },
    equipment: progress.equipment,
    abilities: progress.abilities,
    savedAt: now,
  };
}
export function completeWeekFiveFunctionProgress(progress: ProgressV3, input: CompletionInput): ProgressV3 {
  const previous = progress.missions['w5-m2']; const existingEvidence = progress.missionCompletionEvidence['w5-m2'];
  if (existingEvidence?.kind === 'formal-v3') {
    if (hasValidFormalWeekFiveFunctionCompletion(progress)) return progress;
    throw new Error('W5-M2现有formal-v3证明与当前前置、session、作品或运行不一致');
  }
  if (!hasValidFormalWeekFiveMonksCompletion(progress)) throw new Error('W5-M2完成需要W5-M1 formal-v3正式证明');
  if (previous && existingEvidence?.kind !== 'legacy-replay-only') throw new Error('W5-M2历史完成缺少可升级的来源证明');
  const now = new Date().toISOString();
  const completion = formalWeekFiveFunctionCompletionEvidence(progress.sessions['w5-m2'], previous?.completedAt ?? now, now, now);
  if (!completion) throw new Error('W5-M2完成需要当前保存session的record-proven成功运行');
  const mission = previous ?? { status: 'completed' as const, stars: normalizeStars(input.stars), attempts: safeCount(0, 1), hintsUsed: safeCount(0, normalizeHints(input.hintsUsed)), completedAt: now };
  return {
    ...progress,
    missions: { ...progress.missions, 'w5-m2': mission },
    missionCompletionEvidence: { ...progress.missionCompletionEvidence, 'w5-m2': completion.evidence },
    works: { ...progress.works, [completion.work.workId]: completion.work },
    equipment: progress.equipment, abilities: progress.abilities, savedAt: now,
  };
}

export function completeMission(progress: ProgressV3, missionId: string, input: CompletionInput): ProgressV3 {
  if (!allMissionOutlines.some((mission) => mission.id === missionId)) throw new Error('任务编号无效');
  if (missionId === 'w4-m3') return completeWeekFourBranchProgress(progress, input);
  if (missionId === 'w4-m4') return completeWeekFourListProgress(progress, input);
  if (missionId === 'w4-m5') return completeWeekFourBossProgress(progress, input);
  if (missionId === 'w5-m1') return completeWeekFiveMonksProgress(progress, input);
  if (missionId === 'w5-m2') return completeWeekFiveFunctionProgress(progress, input);
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
  const weekFourVariables = missionId === 'w4-m2'
    ? formalWeekFourVariableCompletionEvidence(progress.sessions['w4-m2'], previous?.completedAt ?? now, now)
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
  if (missionId === 'w4-m2' && progress.missionCompletionEvidence['w4-m1']?.kind !== 'formal-v3') {
    throw new Error('W4-M2完成需要W4-M1 formal-v3正式证明');
  }
  if (previous) {
    safeCount(previous.attempts, 1);
    safeCount(previous.hintsUsed, normalizedHints);
    const existingEvidence = missionId === 'w3-m1' ? progress.missionCompletionEvidence['w3-m1'] : missionId === 'w3-m2' ? progress.missionCompletionEvidence['w3-m2'] : missionId === 'w3-m3' ? progress.missionCompletionEvidence['w3-m3'] : missionId === 'w3-m4' ? progress.missionCompletionEvidence['w3-m4'] : missionId === 'w3-m5' ? progress.missionCompletionEvidence['w3-m5'] : missionId === 'w4-m1' ? progress.missionCompletionEvidence['w4-m1'] : missionId === 'w4-m2' ? progress.missionCompletionEvidence['w4-m2'] : undefined;
    const upgradeLegacyW3 = missionId === 'w3-m1'
      && existingEvidence?.kind === 'legacy-preformal'
      && formalEvidence !== null;
    const upgradeLegacyCuilan = missionId === 'w3-m2' && existingEvidence?.kind === 'legacy-preformal' && cuilanEvidence !== null;
    const upgradeLegacyYunzhan = missionId === 'w3-m3' && existingEvidence?.kind === 'legacy-preformal' && yunzhanEvidence !== null;
    const upgradeLegacyBajie = missionId === 'w3-m4' && existingEvidence?.kind === 'legacy-preformal' && bajieEvidence !== null;
    const upgradeLegacyBoss = missionId === 'w3-m5' && existingEvidence?.kind === 'legacy-replay-only' && weekThreeBossEvidence !== null;
    const upgradeLegacyW4 = missionId === 'w4-m1' && existingEvidence?.kind === 'legacy-replay-only' && weekFourMapping !== null;
    const upgradeLegacyW4Variables = missionId === 'w4-m2' && existingEvidence?.kind === 'legacy-replay-only' && weekFourVariables !== null;
    if (previous.stars >= stars && !upgradeLegacyW3 && !upgradeLegacyCuilan && !upgradeLegacyYunzhan && !upgradeLegacyBajie && !upgradeLegacyBoss && !upgradeLegacyW4 && !upgradeLegacyW4Variables) return progress;
    const missions = {
      ...progress.missions,
      [missionId]: upgradeLegacyW4Variables || previous.stars >= stars ? previous : { ...previous, stars },
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
        : upgradeLegacyW4Variables ? { ...progress.missionCompletionEvidence, 'w4-m2': weekFourVariables!.evidence }
        : progress.missionCompletionEvidence,
      works: upgradeLegacyW4 ? { ...(progress.works ?? {}), [weekFourMapping!.work.workId]: weekFourMapping!.work }
        : upgradeLegacyW4Variables ? { ...(progress.works ?? {}), [weekFourVariables!.work.workId]: weekFourVariables!.work }
          : progress.works,
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
  if (missionId === 'w4-m2' && weekFourVariables === null) throw new Error('W4-M2完成需要当前保存Python的封存成功运行和作品证据');
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
    equipment: missionId === 'w4-m2' ? progress.equipment : grantMissionRewards(progress.equipment, missionId, completedAt),
    abilities: { conditionObservation: deriveConditionObservation(missions) },
    missionCompletionEvidence: missionId === 'w3-m1' ? { ...progress.missionCompletionEvidence, 'w3-m1': formalEvidence! }
      : missionId === 'w3-m2' ? { ...progress.missionCompletionEvidence, 'w3-m2': cuilanEvidence! }
      : missionId === 'w3-m3' ? { ...progress.missionCompletionEvidence, 'w3-m3': yunzhanEvidence! }
      : missionId === 'w3-m4' ? { ...progress.missionCompletionEvidence, 'w3-m4': bajieEvidence! }
      : missionId === 'w3-m5' ? { ...progress.missionCompletionEvidence, 'w3-m5': weekThreeBossEvidence! }
      : missionId === 'w4-m1' ? { ...progress.missionCompletionEvidence, 'w4-m1': weekFourMapping!.evidence }
      : missionId === 'w4-m2' ? { ...progress.missionCompletionEvidence, 'w4-m2': weekFourVariables!.evidence }
      : progress.missionCompletionEvidence,
    works: missionId === 'w4-m1' ? { ...(progress.works ?? {}), [weekFourMapping!.work.workId]: weekFourMapping!.work }
      : missionId === 'w4-m2' ? { ...(progress.works ?? {}), [weekFourVariables!.work.workId]: weekFourVariables!.work }
        : progress.works,
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
  if (missionId === 'w4-m2') {
    return progress.missionCompletionEvidence['w4-m1']?.kind === 'formal-v3'
      || (progress.missions['w4-m2']?.status === 'completed' && progress.missionCompletionEvidence['w4-m2']?.kind === 'legacy-replay-only');
  }
  if (missionId === 'w4-m3') {
    return getWeekFourBranchAccess(progress).kind !== 'locked';
  }
  if (missionId === 'w4-m4') return getWeekFourListAccess(progress).kind !== 'locked';
  if (missionId === 'w4-m5') return getWeekFourBossAccess(progress).kind !== 'locked';
  if (missionId === 'w5-m1') return getWeekFiveMonksAccess(progress).kind !== 'locked';
  if (missionId === 'w5-m2') return getWeekFiveFunctionAccess(progress).kind !== 'locked';
  if (missionId === 'w5-m3') return hasValidFormalWeekFiveFunctionCompletion(progress) || progress.missionCompletionEvidence['w5-m2']?.kind === 'legacy-replay-only' || progress.missions['w5-m3']?.status === 'completed';
  return progress.missions[allMissionOutlines[index - 1].id]?.status === 'completed';
}

export type WeekFourVariableAccess =
  | { kind: 'locked' }
  | { kind: 'historical-read-only' }
  | { kind: 'formal'; upgradingLegacy: boolean };

export function getWeekFourVariableAccess(progress: ProgressV3): WeekFourVariableAccess {
  const evidence = progress.missionCompletionEvidence['w4-m2'];
  if (progress.missionCompletionEvidence['w4-m1']?.kind === 'formal-v3') {
    return { kind: 'formal', upgradingLegacy: evidence?.kind === 'legacy-replay-only' };
  }
  if (progress.missions['w4-m2']?.status === 'completed' && evidence?.kind === 'legacy-replay-only') {
    return { kind: 'historical-read-only' };
  }
  return { kind: 'locked' };
}

export type WeekFourBranchAccess =
  | { kind: 'locked' }
  | { kind: 'historical-read-only'; completed: boolean }
  | { kind: 'formal'; upgradingLegacy: boolean };

export function getWeekFourBranchAccess(progress: ProgressV3): WeekFourBranchAccess {
  const branchEvidence = progress.missionCompletionEvidence['w4-m3'];
  if (hasValidFormalWeekFourVariableCompletion(progress)) {
    return { kind: 'formal', upgradingLegacy: branchEvidence?.kind === 'legacy-replay-only' };
  }
  const variableEvidence = progress.missionCompletionEvidence['w4-m2'];
  if (progress.missions['w4-m2']?.status === 'completed' && variableEvidence?.kind === 'legacy-replay-only') {
    return {
      kind: 'historical-read-only',
      completed: progress.missions['w4-m3']?.status === 'completed'
        && branchEvidence?.kind === 'legacy-replay-only',
    };
  }
  return { kind: 'locked' };
}

export type WeekFourListAccess =
  | { kind: 'locked' }
  | { kind: 'historical-read-only'; completed: boolean }
  | { kind: 'formal'; upgradingLegacy: boolean };

export function getWeekFourListAccess(progress: ProgressV3): WeekFourListAccess {
  const branchEvidence = progress.missionCompletionEvidence['w4-m4'];
  if (hasValidFormalWeekFourBranchCompletion(progress)) {
    return { kind: 'formal', upgradingLegacy: branchEvidence?.kind === 'legacy-replay-only' };
  }
  const variableEvidence = progress.missionCompletionEvidence['w4-m3'];
  if ((progress.missions['w4-m3']?.status === 'completed' && variableEvidence?.kind === 'legacy-replay-only') || branchEvidence?.kind === 'legacy-replay-only') {
    return {
      kind: 'historical-read-only',
      completed: progress.missions['w4-m4']?.status === 'completed'
        && branchEvidence?.kind === 'legacy-replay-only',
    };
  }
  return { kind: 'locked' };
}
export type WeekFourBossAccess =
  | { kind: 'locked' }
  | { kind: 'historical-read-only'; completed: boolean }
  | { kind: 'formal'; upgradingLegacy: boolean };

export function getWeekFourBossAccess(progress: ProgressV3): WeekFourBossAccess {
  const branchEvidence = progress.missionCompletionEvidence['w4-m5'];
  if (hasValidFormalWeekFourListCompletion(progress)) {
    return { kind: 'formal', upgradingLegacy: branchEvidence?.kind === 'legacy-replay-only' };
  }
  const variableEvidence = progress.missionCompletionEvidence['w4-m4'];
  if ((progress.missions['w4-m4']?.status === 'completed' && variableEvidence?.kind === 'legacy-replay-only') || branchEvidence?.kind === 'legacy-replay-only') {
    return {
      kind: 'historical-read-only',
      completed: progress.missions['w4-m5']?.status === 'completed'
        && branchEvidence?.kind === 'legacy-replay-only',
    };
  }
  return { kind: 'locked' };
}
export type WeekFiveMonksAccess =
  | { kind: 'locked' }
  | { kind: 'historical-read-only'; completed: boolean }
  | { kind: 'formal'; upgradingLegacy: boolean };

export function getWeekFiveMonksAccess(progress: ProgressV3): WeekFiveMonksAccess {
  const branchEvidence = progress.missionCompletionEvidence['w5-m1'];
  if (hasValidFormalWeekFourBossCompletion(progress)) {
    return { kind: 'formal', upgradingLegacy: branchEvidence?.kind === 'legacy-replay-only' };
  }
  const variableEvidence = progress.missionCompletionEvidence['w4-m5'];
  if ((progress.missions['w4-m5']?.status === 'completed' && variableEvidence?.kind === 'legacy-replay-only') || branchEvidence?.kind === 'legacy-replay-only') {
    return {
      kind: 'historical-read-only',
      completed: progress.missions['w5-m1']?.status === 'completed'
        && branchEvidence?.kind === 'legacy-replay-only',
    };
  }
  return { kind: 'locked' };
}
export type WeekFiveFunctionAccess =
  | { kind: 'locked' }
  | { kind: 'historical-read-only'; completed: boolean }
  | { kind: 'formal'; upgradingLegacy: boolean };

export function getWeekFiveFunctionAccess(progress: ProgressV3): WeekFiveFunctionAccess {
  const evidence = progress.missionCompletionEvidence['w5-m2'];
  if (hasValidFormalWeekFiveMonksCompletion(progress)) return { kind: 'formal', upgradingLegacy: evidence?.kind === 'legacy-replay-only' };
  const prerequisite = progress.missionCompletionEvidence['w5-m1'];
  if ((progress.missions['w5-m1']?.status === 'completed' && prerequisite?.kind === 'legacy-replay-only') || evidence?.kind === 'legacy-replay-only') {
    return { kind: 'historical-read-only', completed: progress.missions['w5-m2']?.status === 'completed' && evidence?.kind === 'legacy-replay-only' };
  }
  return { kind: 'locked' };
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
  const weekFourVariableSession = week === 4 ? progress.sessions['w4-m2'] : undefined;
  const weekFourBranchSession = week === 4 ? progress.sessions['w4-m3'] : undefined;
  const weekFourBossSession = week === 4 ? progress.sessions['w4-m5'] : undefined;
  const weekFiveMonksSession = week === 5 ? progress.sessions['w5-m1'] : undefined;
  const weekFiveFunctionSession = week === 5 ? progress.sessions['w5-m2'] : undefined;
  const weekFourListSession = week === 4 ? progress.sessions['w4-m4'] : undefined;
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
  const sessionRecords = [dragonSession, ruyiSession, fourSeasSession, underworldSession, bossSession, horseCareSession, monkeyKingSession, peachElixirSession, furnaceConditionSession, heavenlyBossSession, manorHelpSession, cuilanBooleanSession, yunzhanDialogueSession, bajieJoiningSession, weekThreeBossSession, weekFourMappingSession, weekFourVariableSession].filter(
    (session): session is NonNullable<typeof session> => session !== undefined,
  );
  const sessionRuns = safeCount(sessionRecords.reduce(
    (total, session) => safeCount(total, session.totalRuns),
    0,
  ), safeCount(weekFourBranchSession?.totalRuns ?? 0, weekFourListSession?.totalRuns ?? 0));
  const sessionAdjustments = safeCount(sessionRecords.reduce(
    (total, session) => safeCount(
      safeCount(total, session.compileFailures),
      session.runtimeFailures,
    ),
    0,
  ), weekFourBranchSession ? safeCount(
    safeCount(weekFourBranchSession.branchConflictFailures, weekFourBranchSession.branchMissingFailures),
    weekFourBranchSession.validationFailures,
  ) : 0);
  return {
    week,
    completed: records.length,
    total: missions.length,
    stars: records.reduce((sum, record) => safeCount(sum, record.stars), 0),
    hintsUsed: records.reduce((sum, record) => safeCount(sum, record.hintsUsed), 0),
    sessionRuns: safeCount(safeCount(safeCount(sessionRuns, weekFourBossSession?.totalRuns ?? 0), weekFiveMonksSession?.totalRuns ?? 0), weekFiveFunctionSession?.totalRuns ?? 0),
    sessionAdjustments: safeCount(safeCount(safeCount(safeCount(sessionAdjustments, weekFiveMonksSession ? safeCount(safeCount(weekFiveMonksSession.coverageFailures, weekFiveMonksSession.actionFailures), weekFiveMonksSession.validationFailures) : 0), weekFourBossSession ? safeCount(safeCount(weekFourBossSession.identityFailures, weekFourBossSession.branchFailures), weekFourBossSession.validationFailures) : 0), weekFourListSession ? safeCount(safeCount(weekFourListSession.listOrderFailures, weekFourListSession.loopValueFailures), weekFourListSession.validationFailures) : 0), weekFiveFunctionSession ? safeCount(safeCount(weekFiveFunctionSession.callFailures, weekFiveFunctionSession.bodyFailures), weekFiveFunctionSession.validationFailures) : 0),
    needsSupport: [...new Set([...missionSupport, ...sessionSupport, ...(weekFiveFunctionSession?.firstBlockingConcept ? [weekFiveFunctionSession.firstBlockingConcept] : [])])],
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
      weekFourVariables: {
        runs: weekFourVariableSession?.totalRuns ?? 0,
        overwriteFailures: weekFourVariableSession?.overwriteFailures ?? 0,
        validationFailures: weekFourVariableSession?.validationFailures ?? 0,
        infrastructureFailures: weekFourVariableSession?.runnerInfrastructureFailures ?? 0,
        observations: weekFourVariableSession?.conditionObservationUses.length ?? 0,
        workSaved: progress.works['w4-m2-variable-evidence-record'] !== undefined,
        proof: progress.missionCompletionEvidence['w4-m2']?.kind ?? 'none',
        completedAt: progress.missions['w4-m2']?.completedAt ?? null,
      },
      weekFourBranches: {
        runs: weekFourBranchSession?.totalRuns ?? 0,
        conflicts: weekFourBranchSession?.branchConflictFailures ?? 0,
        missing: weekFourBranchSession?.branchMissingFailures ?? 0,
        validation: weekFourBranchSession?.validationFailures ?? 0,
        infrastructure: weekFourBranchSession?.runnerInfrastructureFailures ?? 0,
        observations: weekFourBranchSession?.conditionObservationUses.length ?? 0,
        workSaved: progress.works['w4-m3-branch-structure-record'] !== undefined,
        proof: progress.missionCompletionEvidence['w4-m3']?.kind ?? 'none',
        completedAt: progress.missions['w4-m3']?.completedAt ?? null,
      },
    }),
    ...(week !== 5 ? {} : {
      weekFiveFunction: {
        runs: weekFiveFunctionSession?.totalRuns ?? 0,
        callFailures: weekFiveFunctionSession?.callFailures ?? 0,
        bodyFailures: weekFiveFunctionSession?.bodyFailures ?? 0,
        validationFailures: weekFiveFunctionSession?.validationFailures ?? 0,
        infrastructureFailures: weekFiveFunctionSession?.runnerInfrastructureFailures ?? 0,
        observations: weekFiveFunctionSession?.conditionObservationUses.length ?? 0,
        workSaved: progress.works['w5-m2-sanqing-function-record'] !== undefined,
        proof: progress.missionCompletionEvidence['w5-m2']?.kind ?? 'none',
        completedAt: progress.missions['w5-m2']?.completedAt ?? null,
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
