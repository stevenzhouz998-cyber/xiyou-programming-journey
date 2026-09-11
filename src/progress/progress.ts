import { parseWeekFourListPython } from '../engine/weekFourListPythonGrammar';
import { parseWeekFourBossPython } from '../engine/weekFourBossPythonGrammar';
import { parseWeekFiveMonksPython } from '../engine/weekFiveMonksPythonGrammar';
import { parseWeekFiveFunctionPython } from '../engine/weekFiveFunctionPythonGrammar';
import { parseWeekFiveWeatherPython } from '../engine/weekFiveWeatherPythonGrammar';
import { parseWeekFiveDecompositionPython } from '../engine/weekFiveDecompositionPythonGrammar';
import { parseWeekFiveStoryOrchestrationPython } from '../engine/weekFiveStoryOrchestrationPythonGrammar';
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
  WeekFiveWeatherCompletionEvidence,
  WeekFiveDecompositionCompletionEvidence,
  WeekFiveStoryOrchestrationCompletionEvidence,
  WeekFourBranchMissionSession,
  WeekFourListMissionSession,
  WeekFourBossMissionSession,
  WeekFiveMonksMissionSession,
  WeekFiveFunctionMissionSession,
  WeekFiveWeatherMissionSession,
  WeekFiveDecompositionMissionSession,
  WeekFiveStoryOrchestrationMissionSession,
  WeekFourBranchWorkV1,
  WeekFourListWorkV1,
  WeekFourBossWorkV1,
  WeekFiveMonksWorkV1,
  WeekFiveFunctionWorkV1,
  WeekFiveWeatherWorkV1,
  WeekFiveDecompositionWorkV1,
  WeekFiveStoryOrchestrationWorkV1,
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
import { safeCount } from './safeCount';
export { getWeeklyReport } from './weeklyReport';
export type { WeeklyReport } from './weeklyReport';
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
function formalWeekFiveWeatherCompletionEvidence(
  session: WeekFiveWeatherMissionSession | undefined,
  completedAt: string,
  workCreatedAt: string,
  verifiedAt: string,
): { evidence: Extract<WeekFiveWeatherCompletionEvidence, { kind: 'formal-v3' }>; work: WeekFiveWeatherWorkV1 } | null {
  if (!session || session.lastRun === null || session.lastRunAt === null) return null;
  try {
    const parsed = parseWeekFiveWeatherPython(session.pythonCode);
    if ('state' in parsed
      || !parsed.run.completed
      || parsed.run.state !== 'weather-proven'
      || parsed.run.failureSnapshots.length !== 0
      || session.failureSnapshot !== null
      || !deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      || !deeplyEqual(session.lastWorkerTrace, parsed.trace)
      || !deeplyEqual(session.lastRun, parsed.run)) return null;
    const work: WeekFiveWeatherWorkV1 = {
      kind: 'python-function-parameter-v1',
      workId: 'w5-m3-weather-parameter-record',
      missionId: 'w5-m3',
      title: '祈雨参数记录',
      pythonCode: session.pythonCode,
      canonicalTrace: structuredClone(parsed.trace),
      workerTrace: structuredClone(parsed.trace),
      run: structuredClone(parsed.run),
      createdAt: workCreatedAt,
      verifiedAt,
    };
    return {
      evidence: {
        kind: 'formal-v3',
        completedAt,
        verifiedAt,
        pythonCode: session.pythonCode,
        canonicalTrace: structuredClone(parsed.trace),
        workerTrace: structuredClone(parsed.trace),
        run: structuredClone(parsed.run),
        workId: work.workId,
      },
      work,
    };
  } catch {
    return null;
  }
}
function formalWeekFiveDecompositionCompletionEvidence(
  session: WeekFiveDecompositionMissionSession | undefined,
  completedAt: string,
  workCreatedAt: string,
  verifiedAt: string,
): { evidence: Extract<WeekFiveDecompositionCompletionEvidence, { kind: 'formal-v3' }>; work: WeekFiveDecompositionWorkV1 } | null {
  if (!session || session.lastRun === null || session.lastRunAt === null) return null;
  try {
    const parsed = parseWeekFiveDecompositionPython(session.pythonCode);
    if ('state' in parsed || !parsed.run.completed || parsed.run.state !== 'decomposition-proven'
      || parsed.run.failureSnapshots.length !== 0 || session.failureSnapshot !== null
      || !deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      || !deeplyEqual(session.lastWorkerTrace, parsed.trace)
      || !deeplyEqual(session.lastRun, parsed.run)) return null;
    const work: WeekFiveDecompositionWorkV1 = {
      kind: 'python-problem-decomposition-v1', workId: 'w5-m4-problem-decomposition-record', missionId: 'w5-m4',
      title: '后续比试问题分解记录', pythonCode: session.pythonCode,
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

function formalWeekFiveStoryOrchestrationCompletionEvidence(
  session: WeekFiveStoryOrchestrationMissionSession | undefined,
  completedAt: string,
  workCreatedAt: string,
  verifiedAt: string,
): { evidence: Extract<WeekFiveStoryOrchestrationCompletionEvidence, { kind: 'formal-v3' }>; work: WeekFiveStoryOrchestrationWorkV1 } | null {
  if (!session || session.lastRun === null || session.lastRunAt === null) return null;
  try {
    const parsed = parseWeekFiveStoryOrchestrationPython(session.pythonCode);
    if ('state' in parsed || !parsed.run.completed || parsed.run.state !== 'story-orchestration-proven'
      || parsed.run.failureSnapshots.length !== 0 || session.failureSnapshot !== null
      || !deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      || !deeplyEqual(session.lastWorkerTrace, parsed.trace)
      || !deeplyEqual(session.lastRun, parsed.run)) return null;
    const work: WeekFiveStoryOrchestrationWorkV1 = {
      kind: 'python-story-orchestration-v1', workId: 'w5-m5-story-orchestration-record', missionId: 'w5-m5',
      title: '车迟国故事总编排记录', pythonCode: session.pythonCode,
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
function hasValidFormalWeekFiveWeatherCompletion(progress: ProgressV3): boolean {
  const mission = progress.missions['w5-m3'];
  const evidence = progress.missionCompletionEvidence['w5-m3'];
  const session = progress.sessions['w5-m3'];
  const work = progress.works['w5-m3-weather-parameter-record'];
  if (!hasValidFormalWeekFiveFunctionCompletion(progress)
    || !hasValidCompletedMission(mission)
    || evidence?.kind !== 'formal-v3'
    || !session
    || !work
    || evidence.completedAt !== mission.completedAt
    || evidence.workId !== work.workId
    || evidence.verifiedAt !== work.verifiedAt
    || work.kind !== 'python-function-parameter-v1'
    || work.missionId !== 'w5-m3'
    || !isCanonicalIso(evidence.verifiedAt)
    || !isCanonicalIso(work.createdAt)
    || !isCanonicalIso(work.verifiedAt)
    || work.createdAt < mission.completedAt
    || work.verifiedAt < work.createdAt
    || session.lastRunAt === null
    || !isCanonicalIso(session.lastRunAt)
    || !isCanonicalIso(session.savedAt)
    || session.lastRunAt > session.savedAt
    || session.savedAt > work.createdAt) return false;
  try {
    const parsed = parseWeekFiveWeatherPython(session.pythonCode);
    return !('state' in parsed)
      && parsed.run.completed
      && parsed.run.state === 'weather-proven'
      && parsed.run.failureSnapshots.length === 0
      && session.failureSnapshot === null
      && work.pythonCode === session.pythonCode
      && evidence.pythonCode === session.pythonCode
      && deeplyEqual(session.lastCanonicalTrace, parsed.trace)
      && deeplyEqual(session.lastWorkerTrace, parsed.trace)
      && deeplyEqual(session.lastRun, parsed.run)
      && deeplyEqual(work.canonicalTrace, parsed.trace)
      && deeplyEqual(work.workerTrace, parsed.trace)
      && deeplyEqual(work.run, parsed.run)
      && deeplyEqual(evidence.canonicalTrace, parsed.trace)
      && deeplyEqual(evidence.workerTrace, parsed.trace)
      && deeplyEqual(evidence.run, parsed.run);
  } catch {
    return false;
  }
}
function hasValidFormalWeekFiveDecompositionCompletion(progress: ProgressV3): boolean {
  const mission = progress.missions['w5-m4']; const evidence = progress.missionCompletionEvidence['w5-m4'];
  const session = progress.sessions['w5-m4']; const work = progress.works['w5-m4-problem-decomposition-record'];
  if (!hasValidFormalWeekFiveWeatherCompletion(progress) || !hasValidCompletedMission(mission) || evidence?.kind !== 'formal-v3' || !session || !work
    || evidence.completedAt !== mission.completedAt || evidence.workId !== work.workId || evidence.verifiedAt !== work.verifiedAt
    || work.kind !== 'python-problem-decomposition-v1' || work.missionId !== 'w5-m4' || !isCanonicalIso(evidence.verifiedAt)
    || !isCanonicalIso(work.createdAt) || !isCanonicalIso(work.verifiedAt) || work.createdAt < mission.completedAt || work.verifiedAt < work.createdAt
    || session.lastRunAt === null || !isCanonicalIso(session.lastRunAt) || !isCanonicalIso(session.savedAt) || session.lastRunAt > session.savedAt || session.savedAt > work.createdAt) return false;
  try {
    const parsed = parseWeekFiveDecompositionPython(session.pythonCode);
    return !('state' in parsed) && parsed.run.completed && parsed.run.state === 'decomposition-proven' && parsed.run.failureSnapshots.length === 0 && session.failureSnapshot === null
      && work.pythonCode === session.pythonCode && evidence.pythonCode === session.pythonCode
      && deeplyEqual(session.lastCanonicalTrace, parsed.trace) && deeplyEqual(session.lastWorkerTrace, parsed.trace) && deeplyEqual(session.lastRun, parsed.run)
      && deeplyEqual(work.canonicalTrace, parsed.trace) && deeplyEqual(work.workerTrace, parsed.trace) && deeplyEqual(work.run, parsed.run)
      && deeplyEqual(evidence.canonicalTrace, parsed.trace) && deeplyEqual(evidence.workerTrace, parsed.trace) && deeplyEqual(evidence.run, parsed.run);
  } catch { return false; }
}

function hasValidFormalWeekFiveStoryOrchestrationCompletion(progress: ProgressV3): boolean {
  const mission = progress.missions['w5-m5']; const evidence = progress.missionCompletionEvidence['w5-m5'];
  const session = progress.sessions['w5-m5']; const work = progress.works['w5-m5-story-orchestration-record'];
  if (!hasValidFormalWeekFiveDecompositionCompletion(progress) || !hasValidCompletedMission(mission) || evidence?.kind !== 'formal-v3' || !session || !work
    || evidence.completedAt !== mission.completedAt || evidence.workId !== work.workId || evidence.verifiedAt !== work.verifiedAt
    || work.kind !== 'python-story-orchestration-v1' || work.missionId !== 'w5-m5' || !isCanonicalIso(evidence.verifiedAt)
    || !isCanonicalIso(work.createdAt) || !isCanonicalIso(work.verifiedAt) || work.createdAt < mission.completedAt || work.verifiedAt < work.createdAt
    || session.lastRunAt === null || !isCanonicalIso(session.lastRunAt) || !isCanonicalIso(session.savedAt) || session.lastRunAt > session.savedAt || session.savedAt > work.createdAt) return false;
  try {
    const parsed = parseWeekFiveStoryOrchestrationPython(session.pythonCode);
    return !('state' in parsed) && parsed.run.completed && parsed.run.state === 'story-orchestration-proven' && parsed.run.failureSnapshots.length === 0 && session.failureSnapshot === null
      && work.pythonCode === session.pythonCode && evidence.pythonCode === session.pythonCode
      && deeplyEqual(session.lastCanonicalTrace, parsed.trace) && deeplyEqual(session.lastWorkerTrace, parsed.trace) && deeplyEqual(session.lastRun, parsed.run)
      && deeplyEqual(work.canonicalTrace, parsed.trace) && deeplyEqual(work.workerTrace, parsed.trace) && deeplyEqual(work.run, parsed.run)
      && deeplyEqual(evidence.canonicalTrace, parsed.trace) && deeplyEqual(evidence.workerTrace, parsed.trace) && deeplyEqual(evidence.run, parsed.run);
  } catch { return false; }
}

function normalizeStars(value: number): 1 | 2 | 3 {
  if (!Number.isFinite(value) || value < 2) return 1;
  return value < 3 ? 2 : 3;
}

function normalizeHints(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
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
export function completeWeekFiveWeatherProgress(progress: ProgressV3, input: CompletionInput): ProgressV3 {
  const previous = progress.missions['w5-m3'];
  const existing = progress.missionCompletionEvidence['w5-m3'];
  if (existing?.kind === 'formal-v3') {
    if (hasValidFormalWeekFiveWeatherCompletion(progress)) return progress;
    throw Error('W5-M3现有formal-v3证明与当前前置、session、作品或运行不一致');
  }
  if (!hasValidFormalWeekFiveFunctionCompletion(progress)) {
    throw Error('W5-M3完成需要W5-M2 formal-v3正式证明');
  }
  if (previous && existing?.kind !== 'legacy-replay-only') {
    throw Error('W5-M3历史完成缺少可升级来源证明');
  }
  const now = new Date().toISOString();
  const completion = formalWeekFiveWeatherCompletionEvidence(
    progress.sessions['w5-m3'],
    previous?.completedAt ?? now,
    now,
    now,
  );
  if (!completion) throw Error('W5-M3完成需要当前保存session的weather-proven成功运行');
  const mission = previous ?? {
    status: 'completed' as const,
    stars: normalizeStars(input.stars),
    attempts: safeCount(0, 1),
    hintsUsed: safeCount(0, normalizeHints(input.hintsUsed)),
    completedAt: now,
  };
  return {
    ...progress,
    missions: { ...progress.missions, 'w5-m3': mission },
    missionCompletionEvidence: { ...progress.missionCompletionEvidence, 'w5-m3': completion.evidence },
    works: { ...progress.works, [completion.work.workId]: completion.work },
    equipment: progress.equipment,
    abilities: progress.abilities,
    savedAt: now,
  };
}
export function completeWeekFiveDecompositionProgress(progress: ProgressV3, input: CompletionInput): ProgressV3 {
  const previous = progress.missions['w5-m4']; const existing = progress.missionCompletionEvidence['w5-m4'];
  if (existing?.kind === 'formal-v3') {
    if (hasValidFormalWeekFiveDecompositionCompletion(progress)) return progress;
    throw Error('W5-M4现有formal-v3证明与当前前置、session、作品或运行不一致');
  }
  if (!hasValidFormalWeekFiveWeatherCompletion(progress)) throw Error('W5-M4完成需要W5-M3 formal-v3正式证明');
  if (previous && existing?.kind !== 'legacy-replay-only') throw Error('W5-M4历史完成缺少可升级来源证明');
  const now = new Date().toISOString();
  const completion = formalWeekFiveDecompositionCompletionEvidence(progress.sessions['w5-m4'], previous?.completedAt ?? now, now, now);
  if (!completion) throw Error('W5-M4完成需要当前保存session的decomposition-proven成功运行');
  const mission = previous ?? { status: 'completed' as const, stars: normalizeStars(input.stars), attempts: safeCount(0, 1), hintsUsed: safeCount(0, normalizeHints(input.hintsUsed)), completedAt: now };
  return {
    ...progress,
    missions: { ...progress.missions, 'w5-m4': mission },
    missionCompletionEvidence: { ...progress.missionCompletionEvidence, 'w5-m4': completion.evidence },
    works: { ...progress.works, [completion.work.workId]: completion.work },
    equipment: progress.equipment, abilities: progress.abilities, savedAt: now,
  };
}

export function completeWeekFiveStoryOrchestrationProgress(progress: ProgressV3, input: CompletionInput): ProgressV3 {
  const previous = progress.missions['w5-m5']; const existing = progress.missionCompletionEvidence['w5-m5'];
  if (existing?.kind === 'formal-v3') {
    if (hasValidFormalWeekFiveStoryOrchestrationCompletion(progress)) return progress;
    throw Error('W5-M5现有formal-v3证明与当前前置、session、作品或运行不一致');
  }
  if (!hasValidFormalWeekFiveDecompositionCompletion(progress)) throw Error('W5-M5完成需要W5-M4 formal-v3正式证明');
  if (previous && existing?.kind !== 'legacy-replay-only') throw Error('W5-M5历史完成缺少可升级来源证明');
  const now = new Date().toISOString();
  const completion = formalWeekFiveStoryOrchestrationCompletionEvidence(progress.sessions['w5-m5'], previous?.completedAt ?? now, now, now);
  if (!completion) throw Error('W5-M5完成需要当前保存session的story-orchestration-proven成功运行');
  const mission = previous ?? { status: 'completed' as const, stars: normalizeStars(input.stars), attempts: safeCount(0, 1), hintsUsed: safeCount(0, normalizeHints(input.hintsUsed)), completedAt: now };
  return {
    ...progress,
    missions: { ...progress.missions, 'w5-m5': mission },
    missionCompletionEvidence: { ...progress.missionCompletionEvidence, 'w5-m5': completion.evidence },
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
  if (missionId === 'w5-m3') return completeWeekFiveWeatherProgress(progress, input);
  if (missionId === 'w5-m4') return completeWeekFiveDecompositionProgress(progress, input);
  if (missionId === 'w5-m5') return completeWeekFiveStoryOrchestrationProgress(progress, input);
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
  if (missionId === 'w5-m3') return getWeekFiveWeatherAccess(progress).kind !== 'locked';
  if (missionId === 'w5-m4') return getWeekFiveDecompositionAccess(progress).kind !== 'locked';
  if (missionId === 'w5-m5') return getWeekFiveStoryOrchestrationAccess(progress).kind !== 'locked';
  if (missionId === 'w6-m1') return hasValidFormalWeekFiveStoryOrchestrationCompletion(progress);
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
export type WeekFiveWeatherAccess =
  | { kind: 'locked' }
  | { kind: 'historical-read-only'; completed: boolean }
  | { kind: 'formal'; upgradingLegacy: boolean };

export function getWeekFiveWeatherAccess(progress: ProgressV3): WeekFiveWeatherAccess {
  const evidence = progress.missionCompletionEvidence['w5-m3'];
  if (hasValidFormalWeekFiveFunctionCompletion(progress)) {
    return { kind: 'formal', upgradingLegacy: evidence?.kind === 'legacy-replay-only' };
  }
  const prerequisite = progress.missionCompletionEvidence['w5-m2'];
  if ((progress.missions['w5-m2']?.status === 'completed' && prerequisite?.kind === 'legacy-replay-only')
    || evidence?.kind === 'legacy-replay-only') {
    return {
      kind: 'historical-read-only',
      completed: progress.missions['w5-m3']?.status === 'completed' && evidence?.kind === 'legacy-replay-only',
    };
  }
  return { kind: 'locked' };
}
export type WeekFiveDecompositionAccess =
  | { kind: 'locked' }
  | { kind: 'historical-read-only'; completed: boolean }
  | { kind: 'formal'; upgradingLegacy: boolean };

export function getWeekFiveDecompositionAccess(progress: ProgressV3): WeekFiveDecompositionAccess {
  const evidence = progress.missionCompletionEvidence['w5-m4'];
  if (hasValidFormalWeekFiveWeatherCompletion(progress)) return { kind: 'formal', upgradingLegacy: evidence?.kind === 'legacy-replay-only' };
  const prerequisite = progress.missionCompletionEvidence['w5-m3'];
  if ((progress.missions['w5-m3']?.status === 'completed' && prerequisite?.kind === 'legacy-replay-only') || evidence?.kind === 'legacy-replay-only') {
    return { kind: 'historical-read-only', completed: progress.missions['w5-m4']?.status === 'completed' && evidence?.kind === 'legacy-replay-only' };
  }
  return { kind: 'locked' };
}

export type WeekFiveStoryOrchestrationAccess =
  | { kind: 'locked' }
  | { kind: 'historical-read-only'; completed: boolean }
  | { kind: 'formal'; upgradingLegacy: boolean };

export function getWeekFiveStoryOrchestrationAccess(progress: ProgressV3): WeekFiveStoryOrchestrationAccess {
  const evidence = progress.missionCompletionEvidence['w5-m5'];
  if (hasValidFormalWeekFiveDecompositionCompletion(progress)) return { kind: 'formal', upgradingLegacy: evidence?.kind === 'legacy-replay-only' };
  const prerequisite = progress.missionCompletionEvidence['w5-m4'];
  if ((progress.missions['w5-m4']?.status === 'completed' && prerequisite?.kind === 'legacy-replay-only') || evidence?.kind === 'legacy-replay-only') {
    return { kind: 'historical-read-only', completed: progress.missions['w5-m5']?.status === 'completed' && evidence?.kind === 'legacy-replay-only' };
  }
  return { kind: 'locked' };
}

export function serializeProgress(progress: ProgressV3): string {
  return JSON.stringify(progress, null, 2);
}

export function importProgress(raw: string): ProgressV3 {
  return parseProgress(raw);
}
