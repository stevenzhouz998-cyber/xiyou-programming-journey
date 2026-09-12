import {
  parseWeekFiveDecompositionDraftEnvelope,
  parseWeekFiveDecompositionPython,
  type WeekFiveDecompositionPythonRunnable,
} from '../engine/weekFiveDecompositionPythonGrammar';
import type {
  WeekFiveDecompositionFailureSnapshot,
  WeekFiveDecompositionRunResult,
  WeekFiveDecompositionTraceItem,
} from '../engine/weekFiveDecompositionContract';

export interface WeekFiveDecompositionMissionSession {
  kind: 'python-problem-decomposition-v1';
  pythonCode: string;
  lastCanonicalTrace: WeekFiveDecompositionTraceItem[];
  lastWorkerTrace: WeekFiveDecompositionTraceItem[];
  lastRun: WeekFiveDecompositionRunResult | null;
  failureSnapshot: WeekFiveDecompositionFailureSnapshot | null;
  totalRuns: number;
  coordinatorFailures: number;
  ownershipFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  conditionObservationUses: Array<{
    snapshotId: WeekFiveDecompositionFailureSnapshot['snapshotId'];
    pythonCode: string;
    canonicalTrace: WeekFiveDecompositionTraceItem[];
    workerTrace: WeekFiveDecompositionTraceItem[];
    run: WeekFiveDecompositionRunResult;
    usedAt: string;
  }>;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  firstBlockingConcept: 'function-coordination' | 'record-ownership' | 'python-structure' | null;
  lastRunAt: string | null;
  savedAt: string;
}
export { createWeekFiveDecompositionSession } from './weekFiveDecompositionSessionFactory';

type RunInput = {
  canonicalTrace: WeekFiveDecompositionTraceItem[];
  workerTrace: WeekFiveDecompositionTraceItem[];
  run: WeekFiveDecompositionRunResult;
};

const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function parseIso(value: string) {
  const parsed = typeof value === 'string' && UTC_ISO.test(value) ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw Error('W5-M4 会话时间必须是标准 UTC ISO。');
  }
  return parsed.getTime();
}

function assertTime(session: WeekFiveDecompositionMissionSession, now: string) {
  if (parseIso(now) < parseIso(session.savedAt)) throw Error('W5-M4 会话时间不得倒退。');
}

function increment(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
    throw Error('W5-M4 会话计数超出安全范围。');
  }
  return value + 1;
}

function runnableFor(code: string): WeekFiveDecompositionPythonRunnable {
  const parsed = parseWeekFiveDecompositionPython(code);
  if ('state' in parsed) throw Error('W5-M4 当前 Python 结构无效。');
  return parsed;
}

export function updateWeekFiveDecompositionCode(
  session: WeekFiveDecompositionMissionSession,
  code: string,
  now: string,
): WeekFiveDecompositionMissionSession {
  assertTime(session, now);
  parseWeekFiveDecompositionDraftEnvelope(code);
  if (code === session.pythonCode) return structuredClone(session);
  return {
    ...structuredClone(session),
    pythonCode: code,
    lastCanonicalTrace: [],
    lastWorkerTrace: [],
    lastRun: null,
    failureSnapshot: null,
    conditionObservationUses: [],
    lastRunAt: null,
    savedAt: now,
  };
}

export function recordWeekFiveDecompositionRun(
  session: WeekFiveDecompositionMissionSession,
  input: RunInput,
  now: string,
): WeekFiveDecompositionMissionSession {
  assertTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  if (!input
    || !same(input.canonicalTrace, parsed.trace)
    || !same(input.workerTrace, parsed.trace)
    || !same(input.run, parsed.run)) {
    throw Error('W5-M4 运行 trace 与结果必须来自当前保存的 Python 输入。');
  }
  const next = structuredClone(session);
  next.lastCanonicalTrace = structuredClone(parsed.trace);
  next.lastWorkerTrace = structuredClone(parsed.trace);
  next.lastRun = structuredClone(parsed.run);
  next.failureSnapshot = structuredClone(parsed.run.failureSnapshots[0] ?? null);
  next.conditionObservationUses = [];
  next.totalRuns = increment(next.totalRuns);
  const coordinatorFailure = parsed.run.failureSnapshots.some((item) => item.result === 'coordinator-call-conflict');
  const ownershipFailure = parsed.run.failureSnapshots.some((item) => item.result === 'record-ownership-conflict');
  if (coordinatorFailure) next.coordinatorFailures = increment(next.coordinatorFailures);
  if (ownershipFailure) next.ownershipFailures = increment(next.ownershipFailures);
  if (next.firstBlockingConcept === null) {
    next.firstBlockingConcept = parsed.run.failureSnapshots[0]?.result === 'record-ownership-conflict'
      ? 'record-ownership'
      : parsed.run.failureSnapshots[0]?.result === 'coordinator-call-conflict'
        ? 'function-coordination'
        : null;
  }
  next.lastRunAt = now;
  next.savedAt = now;
  return next;
}

export function recordWeekFiveDecompositionValidationFailure(
  session: WeekFiveDecompositionMissionSession,
  now: string,
): WeekFiveDecompositionMissionSession {
  assertTime(session, now);
  if (!('state' in parseWeekFiveDecompositionPython(session.pythonCode))) {
    throw Error('W5-M4 只有当前结构无效的草稿才能记录验证失败。');
  }
  const next = structuredClone(session);
  next.validationFailures = increment(next.validationFailures);
  if (next.firstBlockingConcept === null) next.firstBlockingConcept = 'python-structure';
  next.savedAt = now;
  return next;
}

export function recordWeekFiveDecompositionInfrastructureFailure(
  session: WeekFiveDecompositionMissionSession,
  input: { executionStarted: boolean },
  now: string,
): WeekFiveDecompositionMissionSession {
  assertTime(session, now);
  if (!input || typeof input.executionStarted !== 'boolean') throw Error('W5-M4 基础设施失败记录无效。');
  const next = structuredClone(session);
  next.runnerInfrastructureFailures = increment(next.runnerInfrastructureFailures);
  if (input.executionStarted) next.totalRuns = increment(next.totalRuns);
  next.savedAt = now;
  return next;
}

export function recordWeekFiveDecompositionObservation(
  session: WeekFiveDecompositionMissionSession,
  now: string,
): WeekFiveDecompositionMissionSession {
  assertTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  const snapshot = session.failureSnapshot;
  if (!snapshot
    || !session.lastRun
    || !same(session.lastCanonicalTrace, parsed.trace)
    || !same(session.lastWorkerTrace, parsed.trace)
    || !same(session.lastRun, parsed.run)
    || !parsed.run.failureSnapshots.some((item) => item.snapshotId === snapshot.snapshotId)) {
    throw Error('W5-M4 没有与当前代码绑定的有效失败快照。');
  }
  const next = structuredClone(session);
  if (!next.conditionObservationUses.some((use) => use.snapshotId === snapshot.snapshotId)) {
    next.conditionObservationUses.push({
      snapshotId: snapshot.snapshotId,
      pythonCode: next.pythonCode,
      canonicalTrace: structuredClone(parsed.trace),
      workerTrace: structuredClone(parsed.trace),
      run: structuredClone(parsed.run),
      usedAt: now,
    });
  }
  next.savedAt = now;
  return next;
}

export function recordWeekFiveDecompositionHint(
  session: WeekFiveDecompositionMissionSession,
  tier: 'observe' | 'think' | 'partial',
  now: string,
): WeekFiveDecompositionMissionSession {
  assertTime(session, now);
  if (!['observe', 'think', 'partial'].includes(tier)) throw Error('W5-M4 提示层级无效。');
  const next = structuredClone(session);
  if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier);
  next.savedAt = now;
  return next;
}
