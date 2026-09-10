import {
  DEFAULT_WEEK_FOUR_LIST_PYTHON,
  parseWeekFourListDraftEnvelope,
  parseWeekFourListPython,
  type WeekFourListPythonRunnable,
} from '../engine/weekFourListPythonGrammar';
import type {
  WeekFourListFailureSnapshot,
  WeekFourListRunResult,
  WeekFourListTraceItem,
} from '../engine/weekFourListContract';

export interface WeekFourListMissionSession {
  kind: 'python-list-loop-v1';
  pythonCode: string;
  lastCanonicalTrace: WeekFourListTraceItem[];
  lastWorkerTrace: WeekFourListTraceItem[];
  lastRun: WeekFourListRunResult | null;
  failureSnapshot: WeekFourListFailureSnapshot | null;
  totalRuns: number;
  listOrderFailures: number;
  loopValueFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  conditionObservationUses: Array<{
    snapshotId: WeekFourListFailureSnapshot['snapshotId'];
    pythonCode: string;
    canonicalTrace: WeekFourListTraceItem[];
    workerTrace: WeekFourListTraceItem[];
    run: WeekFourListRunResult;
    usedAt: string;
  }>;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  firstBlockingConcept: 'list-order' | 'loop-current-item' | 'python-structure' | null;
  lastRunAt: string | null;
  savedAt: string;
}

type WeekFourListRunInput = {
  canonicalTrace: WeekFourListTraceItem[];
  workerTrace: WeekFourListTraceItem[];
  run: WeekFourListRunResult;
};

const UTC_ISO_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function parseIso(value: string): number {
  const parsed = typeof value === 'string' && UTC_ISO_MILLISECONDS.test(value) ? new Date(value) : null;
  if (parsed === null || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error('W4-M4 会话时间必须是标准 UTC ISO。');
  }
  return parsed.getTime();
}

function assertMutationTime(session: WeekFourListMissionSession, now: string): void {
  if (parseIso(now) < parseIso(session.savedAt)) throw new Error('W4-M4 会话时间不得倒退。');
}

function increment(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
    throw new Error('W4-M4 会话计数超出安全范围。');
  }
  return value + 1;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function runnableFor(code: string): WeekFourListPythonRunnable {
  const parsed = parseWeekFourListPython(code);
  if ('state' in parsed) {
    throw new Error('W4-M4 当前 Python 结构无效，不是 runnable 输入。');
  }
  return parsed;
}

export function createWeekFourListSession(now: string): WeekFourListMissionSession {
  parseIso(now);
  parseWeekFourListDraftEnvelope(DEFAULT_WEEK_FOUR_LIST_PYTHON);
  return {
    kind: 'python-list-loop-v1',
    pythonCode: DEFAULT_WEEK_FOUR_LIST_PYTHON,
    lastCanonicalTrace: [],
    lastWorkerTrace: [],
    lastRun: null,
    failureSnapshot: null,
    totalRuns: 0,
    listOrderFailures: 0,
    loopValueFailures: 0,
    validationFailures: 0,
    runnerInfrastructureFailures: 0,
    conditionObservationUses: [],
    usedHintTiers: [],
    firstBlockingConcept: null,
    lastRunAt: null,
    savedAt: now,
  };
}

export function updateWeekFourListCode(
  session: WeekFourListMissionSession,
  code: string,
  now: string,
): WeekFourListMissionSession {
  assertMutationTime(session, now);
  parseWeekFourListDraftEnvelope(code);
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

export function recordWeekFourListRun(
  session: WeekFourListMissionSession,
  input: WeekFourListRunInput,
  now: string,
): WeekFourListMissionSession {
  assertMutationTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  if (!input || !same(input.canonicalTrace, parsed.trace)
    || !same(input.workerTrace, parsed.trace) || !same(input.run, parsed.run)) {
    throw new Error('W4-M4 运行 trace 与结果必须来自当前保存的 Python 输入。');
  }
  const next = structuredClone(session);
  next.lastCanonicalTrace = structuredClone(parsed.trace);
  next.lastWorkerTrace = structuredClone(parsed.trace);
  next.lastRun = structuredClone(parsed.run);
  next.failureSnapshot = structuredClone(parsed.run.failureSnapshots[0] ?? null);
  // A new execution supersedes the observed run, even when its code and trace match.
  next.conditionObservationUses = [];
  next.totalRuns = increment(next.totalRuns);
  const conflict = parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'list-order-conflict');
  const missing = parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'loop-value-conflict');
  if (conflict) next.listOrderFailures = increment(next.listOrderFailures);
  if (missing) next.loopValueFailures = increment(next.loopValueFailures);
  if (next.firstBlockingConcept === null) {
    if (conflict) next.firstBlockingConcept = 'list-order';
    else if (missing) next.firstBlockingConcept = 'loop-current-item';
  }
  next.lastRunAt = now;
  next.savedAt = now;
  return next;
}

export function recordWeekFourListValidationFailure(
  session: WeekFourListMissionSession,
  now: string,
): WeekFourListMissionSession {
  assertMutationTime(session, now);
  const parsed = parseWeekFourListPython(session.pythonCode);
  if (!('state' in parsed)) {
    throw new Error('W4-M4 只有当前结构无效的草稿才能记录验证失败。');
  }
  const next = structuredClone(session);
  next.validationFailures = increment(next.validationFailures);
  if (next.firstBlockingConcept === null) next.firstBlockingConcept = 'python-structure';
  next.savedAt = now;
  return next;
}

export function recordWeekFourListInfrastructureFailure(
  session: WeekFourListMissionSession,
  input: { executionStarted: boolean },
  now: string,
): WeekFourListMissionSession {
  assertMutationTime(session, now);
  if (!input || typeof input.executionStarted !== 'boolean') {
    throw new Error('W4-M4 基础设施失败 executionStarted 记录无效。');
  }
  const next = structuredClone(session);
  next.runnerInfrastructureFailures = increment(next.runnerInfrastructureFailures);
  if (input.executionStarted) next.totalRuns = increment(next.totalRuns);
  next.savedAt = now;
  return next;
}

export function recordWeekFourListObservation(
  session: WeekFourListMissionSession,
  now: string,
): WeekFourListMissionSession {
  assertMutationTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  const snapshot = session.failureSnapshot;
  if (snapshot === null || session.lastRun === null
    || !same(session.lastCanonicalTrace, parsed.trace)
    || !same(session.lastWorkerTrace, parsed.trace)
    || !same(session.lastRun, parsed.run)
    || !parsed.run.failureSnapshots.some((candidate) => candidate.snapshotId === snapshot.snapshotId)) {
    throw new Error('W4-M4 没有与当前代码绑定的有效失败快照。');
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

export function recordWeekFourListHint(
  session: WeekFourListMissionSession,
  tier: 'observe' | 'think' | 'partial',
  now: string,
): WeekFourListMissionSession {
  assertMutationTime(session, now);
  if (tier !== 'observe' && tier !== 'think' && tier !== 'partial') {
    throw new Error('W4-M4 提示层级无效。');
  }
  const next = structuredClone(session);
  if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier);
  next.savedAt = now;
  return next;
}
