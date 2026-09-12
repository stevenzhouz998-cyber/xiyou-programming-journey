import {
  parseWeekFiveWeatherDraftEnvelope,
  parseWeekFiveWeatherPython,
  type WeekFiveWeatherPythonRunnable,
} from '../engine/weekFiveWeatherPythonGrammar';
import type {
  WeekFiveWeatherFailureSnapshot,
  WeekFiveWeatherRunResult,
  WeekFiveWeatherTraceItem,
} from '../engine/weekFiveWeatherContract';

export interface WeekFiveWeatherMissionSession {
  kind: 'python-function-parameter-v1';
  pythonCode: string;
  lastCanonicalTrace: WeekFiveWeatherTraceItem[];
  lastWorkerTrace: WeekFiveWeatherTraceItem[];
  lastRun: WeekFiveWeatherRunResult | null;
  failureSnapshot: WeekFiveWeatherFailureSnapshot | null;
  totalRuns: number;
  callFailures: number;
  parameterFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  conditionObservationUses: Array<{
    snapshotId: WeekFiveWeatherFailureSnapshot['snapshotId'];
    pythonCode: string;
    canonicalTrace: WeekFiveWeatherTraceItem[];
    workerTrace: WeekFiveWeatherTraceItem[];
    run: WeekFiveWeatherRunResult;
    usedAt: string;
  }>;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  firstBlockingConcept: 'function-call' | 'function-parameter' | 'python-structure' | null;
  lastRunAt: string | null;
  savedAt: string;
}
export { createWeekFiveWeatherSession } from './weekFiveWeatherSessionFactory';

type RunInput = {
  canonicalTrace: WeekFiveWeatherTraceItem[];
  workerTrace: WeekFiveWeatherTraceItem[];
  run: WeekFiveWeatherRunResult;
};

const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function parseIso(value: string) {
  const parsed = typeof value === 'string' && UTC_ISO.test(value) ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw Error('W5-M3 会话时间必须是标准 UTC ISO。');
  }
  return parsed.getTime();
}

function assertTime(session: WeekFiveWeatherMissionSession, now: string) {
  if (parseIso(now) < parseIso(session.savedAt)) throw Error('W5-M3 会话时间不得倒退。');
}

function increment(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
    throw Error('W5-M3 会话计数超出安全范围。');
  }
  return value + 1;
}

function runnableFor(code: string): WeekFiveWeatherPythonRunnable {
  const parsed = parseWeekFiveWeatherPython(code);
  if ('state' in parsed) throw Error('W5-M3 当前 Python 结构无效。');
  return parsed;
}

export function updateWeekFiveWeatherCode(
  session: WeekFiveWeatherMissionSession,
  code: string,
  now: string,
): WeekFiveWeatherMissionSession {
  assertTime(session, now);
  parseWeekFiveWeatherDraftEnvelope(code);
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

export function recordWeekFiveWeatherRun(
  session: WeekFiveWeatherMissionSession,
  input: RunInput,
  now: string,
): WeekFiveWeatherMissionSession {
  assertTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  if (!input
    || !same(input.canonicalTrace, parsed.trace)
    || !same(input.workerTrace, parsed.trace)
    || !same(input.run, parsed.run)) {
    throw Error('W5-M3 运行 trace 与结果必须来自当前保存的 Python 输入。');
  }
  const next = structuredClone(session);
  next.lastCanonicalTrace = structuredClone(parsed.trace);
  next.lastWorkerTrace = structuredClone(parsed.trace);
  next.lastRun = structuredClone(parsed.run);
  next.failureSnapshot = structuredClone(parsed.run.failureSnapshots[0] ?? null);
  next.conditionObservationUses = [];
  next.totalRuns = increment(next.totalRuns);
  const callFailure = parsed.run.failureSnapshots.some((item) => item.result === 'call-conflict');
  const parameterFailure = parsed.run.failureSnapshots.some((item) => item.result === 'parameter-unused');
  if (callFailure) next.callFailures = increment(next.callFailures);
  if (parameterFailure) next.parameterFailures = increment(next.parameterFailures);
  if (next.firstBlockingConcept === null) {
    next.firstBlockingConcept = callFailure ? 'function-call' : parameterFailure ? 'function-parameter' : null;
  }
  next.lastRunAt = now;
  next.savedAt = now;
  return next;
}

export function recordWeekFiveWeatherValidationFailure(
  session: WeekFiveWeatherMissionSession,
  now: string,
): WeekFiveWeatherMissionSession {
  assertTime(session, now);
  if (!('state' in parseWeekFiveWeatherPython(session.pythonCode))) {
    throw Error('W5-M3 只有当前结构无效的草稿才能记录验证失败。');
  }
  const next = structuredClone(session);
  next.validationFailures = increment(next.validationFailures);
  if (next.firstBlockingConcept === null) next.firstBlockingConcept = 'python-structure';
  next.savedAt = now;
  return next;
}

export function recordWeekFiveWeatherInfrastructureFailure(
  session: WeekFiveWeatherMissionSession,
  input: { executionStarted: boolean },
  now: string,
): WeekFiveWeatherMissionSession {
  assertTime(session, now);
  if (!input || typeof input.executionStarted !== 'boolean') throw Error('W5-M3 基础设施失败记录无效。');
  const next = structuredClone(session);
  next.runnerInfrastructureFailures = increment(next.runnerInfrastructureFailures);
  if (input.executionStarted) next.totalRuns = increment(next.totalRuns);
  next.savedAt = now;
  return next;
}

export function recordWeekFiveWeatherObservation(
  session: WeekFiveWeatherMissionSession,
  now: string,
): WeekFiveWeatherMissionSession {
  assertTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  const snapshot = session.failureSnapshot;
  if (!snapshot
    || !session.lastRun
    || !same(session.lastCanonicalTrace, parsed.trace)
    || !same(session.lastWorkerTrace, parsed.trace)
    || !same(session.lastRun, parsed.run)
    || !parsed.run.failureSnapshots.some((item) => item.snapshotId === snapshot.snapshotId)) {
    throw Error('W5-M3 没有与当前代码绑定的有效失败快照。');
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

export function recordWeekFiveWeatherHint(
  session: WeekFiveWeatherMissionSession,
  tier: 'observe' | 'think' | 'partial',
  now: string,
): WeekFiveWeatherMissionSession {
  assertTime(session, now);
  if (!['observe', 'think', 'partial'].includes(tier)) throw Error('W5-M3 提示层级无效。');
  const next = structuredClone(session);
  if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier);
  next.savedAt = now;
  return next;
}
