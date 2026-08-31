import {
  DEFAULT_WEEK_FOUR_VARIABLE_PYTHON,
  parseWeekFourVariablePython,
} from '../engine/weekFourVariablePythonGrammar';
import type {
  WeekFourVariableFailureSnapshot,
  WeekFourVariableRunResult,
  WeekFourVariableTraceItem,
} from '../engine/weekFourVariableContract';

export interface WeekFourVariableMissionSession {
  /** Compatibility-only neutral fields used by the shared session support APIs. */
  lastTrace: [];
  runtimeFailures: 0;
  compileFailures: 0;
  pythonCode: string;
  pythonSourceSpan: { line: 2; from: 0; to: 8 | 10 };
  lastCanonicalTrace: WeekFourVariableTraceItem[];
  lastWorkerTrace: WeekFourVariableTraceItem[];
  lastRun: WeekFourVariableRunResult | null;
  failureSnapshot: WeekFourVariableFailureSnapshot | null;
  conditionObservationUses: Array<{ snapshotId: string; usedAt: string; pythonCode: string }>;
  totalRuns: number;
  overwriteFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  conceptFailures: { variableOverwrite: number; programStructure: number; safeExecution: number; completeness: number };
  lastRunAt: string | null;
  savedAt: string;
}

type RunInput = {
  canonicalTrace: WeekFourVariableTraceItem[];
  workerTrace: WeekFourVariableTraceItem[];
  run: WeekFourVariableRunResult;
};

const UTC_ISO_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function parseIso(value: string): Date {
  const parsed = typeof value === 'string' && UTC_ISO_MILLISECONDS.test(value) ? new Date(value) : null;
  if (parsed === null || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new Error('W4-M2 保存时间必须是标准 UTC ISO。');
  }
  return parsed;
}

function assertMutationTime(session: WeekFourVariableMissionSession, now: string): void {
  const nextTime = parseIso(now).getTime();
  const savedTime = parseIso(session.savedAt).getTime();
  if (nextTime < savedTime) throw new Error('W4-M2 会话时间不得倒退。');
}

function increment(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
    throw new Error('W4-M2 计数无效。');
  }
  return value + 1;
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function createWeekFourVariableSession(now: string): WeekFourVariableMissionSession {
  parseIso(now);
  const parsed = parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON);
  return {
    lastTrace: [], runtimeFailures: 0, compileFailures: 0,
    pythonCode: DEFAULT_WEEK_FOUR_VARIABLE_PYTHON, pythonSourceSpan: parsed.sourceSpan,
    lastCanonicalTrace: [], lastWorkerTrace: [], lastRun: null, failureSnapshot: null,
    conditionObservationUses: [], totalRuns: 0, overwriteFailures: 0, validationFailures: 0,
    runnerInfrastructureFailures: 0, usedHintTiers: [],
    conceptFailures: { variableOverwrite: 0, programStructure: 0, safeExecution: 0, completeness: 0 },
    lastRunAt: null, savedAt: now,
  };
}

export function updateWeekFourVariableCode(
  session: WeekFourVariableMissionSession,
  code: string,
  now: string,
): WeekFourVariableMissionSession {
  assertMutationTime(session, now);
  if (code === session.pythonCode) return structuredClone(session);
  const parsed = parseWeekFourVariablePython(code);
  return {
    ...structuredClone(session), pythonCode: code, pythonSourceSpan: parsed.sourceSpan,
    lastCanonicalTrace: [], lastWorkerTrace: [], lastRun: null, failureSnapshot: null,
    lastRunAt: null, savedAt: now,
  };
}

export function recordWeekFourVariableRun(
  session: WeekFourVariableMissionSession,
  value: RunInput,
  now: string,
): WeekFourVariableMissionSession {
  assertMutationTime(session, now);
  const canonical = parseWeekFourVariablePython(session.pythonCode);
  if (!same(value.canonicalTrace, canonical.trace) || !same(value.workerTrace, canonical.trace) || !same(value.run, canonical.run)) {
    throw new Error('W4-M2 运行 trace 与结果必须来自当前保存的 Python 输入。');
  }
  const next = structuredClone(session);
  next.lastCanonicalTrace = structuredClone(canonical.trace);
  next.lastWorkerTrace = structuredClone(canonical.trace);
  next.lastRun = structuredClone(canonical.run);
  next.failureSnapshot = structuredClone(canonical.run.failureSnapshot);
  next.totalRuns = increment(next.totalRuns);
  if (!canonical.run.completed) {
    next.overwriteFailures = increment(next.overwriteFailures);
    next.conceptFailures.variableOverwrite = increment(next.conceptFailures.variableOverwrite);
  }
  next.lastRunAt = now;
  next.savedAt = now;
  return next;
}

export function recordWeekFourVariableValidationFailure(session: WeekFourVariableMissionSession, now: string): WeekFourVariableMissionSession {
  assertMutationTime(session, now);
  const next = structuredClone(session);
  next.validationFailures = increment(next.validationFailures);
  next.conceptFailures.safeExecution = increment(next.conceptFailures.safeExecution);
  next.savedAt = now;
  return next;
}

export function recordWeekFourVariableInfrastructureFailure(
  session: WeekFourVariableMissionSession,
  input: { executionStarted: boolean },
  now: string,
): WeekFourVariableMissionSession {
  assertMutationTime(session, now);
  if (!input || typeof input.executionStarted !== 'boolean') throw new Error('W4-M2 基础设施失败记录无效。');
  const next = structuredClone(session);
  next.runnerInfrastructureFailures = increment(next.runnerInfrastructureFailures);
  if (input.executionStarted) next.totalRuns = increment(next.totalRuns);
  next.savedAt = now;
  return next;
}

export function recordWeekFourVariableObservation(session: WeekFourVariableMissionSession, now: string): WeekFourVariableMissionSession {
  assertMutationTime(session, now);
  if (!session.failureSnapshot) throw new Error('W4-M2 没有已保存的变量覆盖快照。');
  const next = structuredClone(session);
  const snapshot = next.failureSnapshot;
  if (snapshot === null) throw new Error('W4-M2 没有已保存的变量覆盖快照。');
  if (!next.conditionObservationUses.some((use) => use.snapshotId === snapshot.snapshotId)) {
    next.conditionObservationUses.push({ snapshotId: snapshot.snapshotId, usedAt: now, pythonCode: next.pythonCode });
  }
  next.savedAt = now;
  return next;
}

export function recordWeekFourVariableHint(
  session: WeekFourVariableMissionSession,
  tier: 'observe' | 'think' | 'partial',
  now: string,
): WeekFourVariableMissionSession {
  assertMutationTime(session, now);
  const next = structuredClone(session);
  if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier);
  next.savedAt = now;
  return next;
}
