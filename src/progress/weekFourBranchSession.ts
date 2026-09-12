import {
  parseWeekFourBranchDraftEnvelope,
  parseWeekFourBranchPython,
  type WeekFourBranchPythonRunnable,
} from '../engine/weekFourBranchPythonGrammar';
import type {
  WeekFourBranchFailureSnapshot,
  WeekFourBranchRunResult,
  WeekFourBranchTraceItem,
} from '../engine/weekFourBranchContract';

export interface WeekFourBranchMissionSession {
  kind: 'python-branch-structure-v1';
  pythonCode: string;
  lastCanonicalTrace: WeekFourBranchTraceItem[];
  lastWorkerTrace: WeekFourBranchTraceItem[];
  lastRun: WeekFourBranchRunResult | null;
  failureSnapshot: WeekFourBranchFailureSnapshot | null;
  totalRuns: number;
  branchConflictFailures: number;
  branchMissingFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  conditionObservationUses: Array<{
    snapshotId: WeekFourBranchFailureSnapshot['snapshotId'];
    pythonCode: string;
    canonicalTrace: WeekFourBranchTraceItem[];
    workerTrace: WeekFourBranchTraceItem[];
    run: WeekFourBranchRunResult;
    usedAt: string;
  }>;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  firstBlockingConcept: 'branch-ownership' | 'else-indentation' | 'python-structure' | null;
  lastRunAt: string | null;
  savedAt: string;
}
export { createWeekFourBranchSession } from './weekFourBranchSessionFactory';

type WeekFourBranchRunInput = {
  canonicalTrace: WeekFourBranchTraceItem[];
  workerTrace: WeekFourBranchTraceItem[];
  run: WeekFourBranchRunResult;
};

const UTC_ISO_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function parseIso(value: string): number {
  const parsed = typeof value === 'string' && UTC_ISO_MILLISECONDS.test(value) ? new Date(value) : null;
  if (parsed === null || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error('W4-M3 会话时间必须是标准 UTC ISO。');
  }
  return parsed.getTime();
}

function assertMutationTime(session: WeekFourBranchMissionSession, now: string): void {
  if (parseIso(now) < parseIso(session.savedAt)) throw new Error('W4-M3 会话时间不得倒退。');
}

function increment(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
    throw new Error('W4-M3 会话计数超出安全范围。');
  }
  return value + 1;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function runnableFor(code: string): WeekFourBranchPythonRunnable {
  const parsed = parseWeekFourBranchPython(code);
  if ('state' in parsed) {
    throw new Error('W4-M3 当前 Python 结构无效，不是 runnable 输入。');
  }
  return parsed;
}

export function updateWeekFourBranchCode(
  session: WeekFourBranchMissionSession,
  code: string,
  now: string,
): WeekFourBranchMissionSession {
  assertMutationTime(session, now);
  parseWeekFourBranchDraftEnvelope(code);
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

export function recordWeekFourBranchRun(
  session: WeekFourBranchMissionSession,
  input: WeekFourBranchRunInput,
  now: string,
): WeekFourBranchMissionSession {
  assertMutationTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  if (!input || !same(input.canonicalTrace, parsed.trace)
    || !same(input.workerTrace, parsed.trace) || !same(input.run, parsed.run)) {
    throw new Error('W4-M3 运行 trace 与结果必须来自当前保存的 Python 输入。');
  }
  const next = structuredClone(session);
  next.lastCanonicalTrace = structuredClone(parsed.trace);
  next.lastWorkerTrace = structuredClone(parsed.trace);
  next.lastRun = structuredClone(parsed.run);
  next.failureSnapshot = structuredClone(parsed.run.failureSnapshots[0] ?? null);
  // A new execution supersedes the observed run, even when its code and trace match.
  next.conditionObservationUses = [];
  next.totalRuns = increment(next.totalRuns);
  const conflict = parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'branch-conflict');
  const missing = parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'branch-missing');
  if (conflict) next.branchConflictFailures = increment(next.branchConflictFailures);
  if (missing) next.branchMissingFailures = increment(next.branchMissingFailures);
  if (next.firstBlockingConcept === null) {
    if (parsed.structure === 'fallthrough') next.firstBlockingConcept = 'branch-ownership';
    else if (parsed.structure === 'nested') next.firstBlockingConcept = 'else-indentation';
  }
  next.lastRunAt = now;
  next.savedAt = now;
  return next;
}

export function recordWeekFourBranchValidationFailure(
  session: WeekFourBranchMissionSession,
  now: string,
): WeekFourBranchMissionSession {
  assertMutationTime(session, now);
  const parsed = parseWeekFourBranchPython(session.pythonCode);
  if (!('state' in parsed)) {
    throw new Error('W4-M3 只有当前结构无效的草稿才能记录验证失败。');
  }
  const next = structuredClone(session);
  next.validationFailures = increment(next.validationFailures);
  if (next.firstBlockingConcept === null) next.firstBlockingConcept = 'python-structure';
  next.savedAt = now;
  return next;
}

export function recordWeekFourBranchInfrastructureFailure(
  session: WeekFourBranchMissionSession,
  input: { executionStarted: boolean },
  now: string,
): WeekFourBranchMissionSession {
  assertMutationTime(session, now);
  if (!input || typeof input.executionStarted !== 'boolean') {
    throw new Error('W4-M3 基础设施失败 executionStarted 记录无效。');
  }
  const next = structuredClone(session);
  next.runnerInfrastructureFailures = increment(next.runnerInfrastructureFailures);
  if (input.executionStarted) next.totalRuns = increment(next.totalRuns);
  next.savedAt = now;
  return next;
}

export function recordWeekFourBranchObservation(
  session: WeekFourBranchMissionSession,
  now: string,
): WeekFourBranchMissionSession {
  assertMutationTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  const snapshot = session.failureSnapshot;
  if (snapshot === null || session.lastRun === null
    || !same(session.lastCanonicalTrace, parsed.trace)
    || !same(session.lastWorkerTrace, parsed.trace)
    || !same(session.lastRun, parsed.run)
    || !parsed.run.failureSnapshots.some((candidate) => candidate.snapshotId === snapshot.snapshotId)) {
    throw new Error('W4-M3 没有与当前代码绑定的有效失败快照。');
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

export function recordWeekFourBranchHint(
  session: WeekFourBranchMissionSession,
  tier: 'observe' | 'think' | 'partial',
  now: string,
): WeekFourBranchMissionSession {
  assertMutationTime(session, now);
  if (tier !== 'observe' && tier !== 'think' && tier !== 'partial') {
    throw new Error('W4-M3 提示层级无效。');
  }
  const next = structuredClone(session);
  if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier);
  next.savedAt = now;
  return next;
}
