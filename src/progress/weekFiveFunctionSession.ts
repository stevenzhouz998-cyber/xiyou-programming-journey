import {
  DEFAULT_WEEK_FIVE_FUNCTION_PYTHON,
  parseWeekFiveFunctionDraftEnvelope,
  parseWeekFiveFunctionPython,
  type WeekFiveFunctionPythonRunnable,
} from '../engine/weekFiveFunctionPythonGrammar';
import type { WeekFiveFunctionFailureSnapshot, WeekFiveFunctionRunResult, WeekFiveFunctionTraceItem } from '../engine/weekFiveFunctionContract';

export interface WeekFiveFunctionMissionSession {
  kind: 'python-function-call-v1';
  pythonCode: string;
  lastCanonicalTrace: WeekFiveFunctionTraceItem[];
  lastWorkerTrace: WeekFiveFunctionTraceItem[];
  lastRun: WeekFiveFunctionRunResult | null;
  failureSnapshot: WeekFiveFunctionFailureSnapshot | null;
  totalRuns: number;
  callFailures: number;
  bodyFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  conditionObservationUses: Array<{
    snapshotId: WeekFiveFunctionFailureSnapshot['snapshotId'];
    pythonCode: string;
    canonicalTrace: WeekFiveFunctionTraceItem[];
    workerTrace: WeekFiveFunctionTraceItem[];
    run: WeekFiveFunctionRunResult;
    usedAt: string;
  }>;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  firstBlockingConcept: 'function-call' | 'function-body' | 'python-structure' | null;
  lastRunAt: string | null;
  savedAt: string;
}

type RunInput = { canonicalTrace: WeekFiveFunctionTraceItem[]; workerTrace: WeekFiveFunctionTraceItem[]; run: WeekFiveFunctionRunResult };
const UTC_ISO_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
function parseIso(value: string): number {
  const parsed = typeof value === 'string' && UTC_ISO_MILLISECONDS.test(value) ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) throw new Error('W5-M2 会话时间必须是标准 UTC ISO。');
  return parsed.getTime();
}
function assertTime(session: WeekFiveFunctionMissionSession, now: string): void {
  if (parseIso(now) < parseIso(session.savedAt)) throw new Error('W5-M2 会话时间不得倒退。');
}
function increment(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) throw new Error('W5-M2 会话计数超出安全范围。');
  return value + 1;
}
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);
function runnableFor(code: string): WeekFiveFunctionPythonRunnable {
  const parsed = parseWeekFiveFunctionPython(code);
  if ('state' in parsed) throw new Error('W5-M2 当前 Python 结构无效，不是 runnable 输入。');
  return parsed;
}

export function createWeekFiveFunctionSession(now: string): WeekFiveFunctionMissionSession {
  parseIso(now);
  parseWeekFiveFunctionDraftEnvelope(DEFAULT_WEEK_FIVE_FUNCTION_PYTHON);
  return {
    kind: 'python-function-call-v1', pythonCode: DEFAULT_WEEK_FIVE_FUNCTION_PYTHON,
    lastCanonicalTrace: [], lastWorkerTrace: [], lastRun: null, failureSnapshot: null,
    totalRuns: 0, callFailures: 0, bodyFailures: 0, validationFailures: 0, runnerInfrastructureFailures: 0,
    conditionObservationUses: [], usedHintTiers: [], firstBlockingConcept: null, lastRunAt: null, savedAt: now,
  };
}

export function updateWeekFiveFunctionCode(session: WeekFiveFunctionMissionSession, code: string, now: string): WeekFiveFunctionMissionSession {
  assertTime(session, now);
  parseWeekFiveFunctionDraftEnvelope(code);
  if (code === session.pythonCode) return structuredClone(session);
  return { ...structuredClone(session), pythonCode: code, lastCanonicalTrace: [], lastWorkerTrace: [], lastRun: null, failureSnapshot: null, conditionObservationUses: [], lastRunAt: null, savedAt: now };
}

export function recordWeekFiveFunctionRun(session: WeekFiveFunctionMissionSession, input: RunInput, now: string): WeekFiveFunctionMissionSession {
  assertTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  if (!input || !same(input.canonicalTrace, parsed.trace) || !same(input.workerTrace, parsed.trace) || !same(input.run, parsed.run)) throw new Error('W5-M2 运行 trace 与结果必须来自当前保存的 Python 输入。');
  const next = structuredClone(session);
  next.lastCanonicalTrace = structuredClone(parsed.trace);
  next.lastWorkerTrace = structuredClone(parsed.trace);
  next.lastRun = structuredClone(parsed.run);
  next.failureSnapshot = structuredClone(parsed.run.failureSnapshots[0] ?? null);
  next.conditionObservationUses = [];
  next.totalRuns = increment(next.totalRuns);
  const callFailure = parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'call-missing' || snapshot.result === 'call-conflict');
  const bodyFailure = parsed.run.failureSnapshots.some((snapshot) => snapshot.result === 'body-conflict');
  if (callFailure) next.callFailures = increment(next.callFailures);
  if (bodyFailure) next.bodyFailures = increment(next.bodyFailures);
  if (next.firstBlockingConcept === null) next.firstBlockingConcept = callFailure ? 'function-call' : bodyFailure ? 'function-body' : null;
  next.lastRunAt = now;
  next.savedAt = now;
  return next;
}

export function recordWeekFiveFunctionValidationFailure(session: WeekFiveFunctionMissionSession, now: string): WeekFiveFunctionMissionSession {
  assertTime(session, now);
  if (!('state' in parseWeekFiveFunctionPython(session.pythonCode))) throw new Error('W5-M2 只有当前结构无效的草稿才能记录验证失败。');
  const next = structuredClone(session);
  next.validationFailures = increment(next.validationFailures);
  if (next.firstBlockingConcept === null) next.firstBlockingConcept = 'python-structure';
  next.savedAt = now;
  return next;
}

export function recordWeekFiveFunctionInfrastructureFailure(session: WeekFiveFunctionMissionSession, input: { executionStarted: boolean }, now: string): WeekFiveFunctionMissionSession {
  assertTime(session, now);
  if (!input || typeof input.executionStarted !== 'boolean') throw new Error('W5-M2 基础设施失败记录无效。');
  const next = structuredClone(session);
  next.runnerInfrastructureFailures = increment(next.runnerInfrastructureFailures);
  if (input.executionStarted) next.totalRuns = increment(next.totalRuns);
  next.savedAt = now;
  return next;
}

export function recordWeekFiveFunctionObservation(session: WeekFiveFunctionMissionSession, now: string): WeekFiveFunctionMissionSession {
  assertTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  const snapshot = session.failureSnapshot;
  if (!snapshot || !session.lastRun || !same(session.lastCanonicalTrace, parsed.trace) || !same(session.lastWorkerTrace, parsed.trace)
    || !same(session.lastRun, parsed.run) || !parsed.run.failureSnapshots.some((candidate) => candidate.snapshotId === snapshot.snapshotId)) throw new Error('W5-M2 没有与当前代码绑定的有效失败快照。');
  const next = structuredClone(session);
  if (!next.conditionObservationUses.some((use) => use.snapshotId === snapshot.snapshotId)) next.conditionObservationUses.push({
    snapshotId: snapshot.snapshotId, pythonCode: next.pythonCode, canonicalTrace: structuredClone(parsed.trace),
    workerTrace: structuredClone(parsed.trace), run: structuredClone(parsed.run), usedAt: now,
  });
  next.savedAt = now;
  return next;
}

export function recordWeekFiveFunctionHint(session: WeekFiveFunctionMissionSession, tier: 'observe' | 'think' | 'partial', now: string): WeekFiveFunctionMissionSession {
  assertTime(session, now);
  if (tier !== 'observe' && tier !== 'think' && tier !== 'partial') throw new Error('W5-M2 提示层级无效。');
  const next = structuredClone(session);
  if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier);
  next.savedAt = now;
  return next;
}
