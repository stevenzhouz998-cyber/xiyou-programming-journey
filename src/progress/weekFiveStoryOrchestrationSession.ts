import {
  parseWeekFiveStoryOrchestrationDraftEnvelope,
  parseWeekFiveStoryOrchestrationPython,
  type WeekFiveStoryOrchestrationPythonRunnable,
} from '../engine/weekFiveStoryOrchestrationPythonGrammar';
import type {
  WeekFiveStoryOrchestrationFailureSnapshot,
  WeekFiveStoryOrchestrationRunResult,
  WeekFiveStoryOrchestrationTraceItem,
} from '../engine/weekFiveStoryOrchestrationContract';

export interface WeekFiveStoryOrchestrationMissionSession {
  kind: 'python-story-orchestration-v1';
  pythonCode: string;
  lastCanonicalTrace: WeekFiveStoryOrchestrationTraceItem[];
  lastWorkerTrace: WeekFiveStoryOrchestrationTraceItem[];
  lastRun: WeekFiveStoryOrchestrationRunResult | null;
  failureSnapshot: WeekFiveStoryOrchestrationFailureSnapshot | null;
  totalRuns: number;
  monkLoopFailures: number;
  templeCallFailures: number;
  weatherBindingFailures: number;
  laterCallOrderFailures: number;
  validationFailures: number;
  runnerInfrastructureFailures: number;
  conditionObservationUses: Array<{
    snapshotId: WeekFiveStoryOrchestrationFailureSnapshot['snapshotId'];
    pythonCode: string;
    canonicalTrace: WeekFiveStoryOrchestrationTraceItem[];
    workerTrace: WeekFiveStoryOrchestrationTraceItem[];
    run: WeekFiveStoryOrchestrationRunResult;
    usedAt: string;
  }>;
  usedHintTiers: Array<'observe' | 'think' | 'partial'>;
  firstBlockingConcept: 'loop-scope' | 'function-call' | 'parameter-binding' | 'problem-decomposition' | 'python-structure' | null;
  lastRunAt: string | null;
  savedAt: string;
}
export { createWeekFiveStoryOrchestrationSession } from './weekFiveStoryOrchestrationSessionFactory';

type RunInput = {
  canonicalTrace: WeekFiveStoryOrchestrationTraceItem[];
  workerTrace: WeekFiveStoryOrchestrationTraceItem[];
  run: WeekFiveStoryOrchestrationRunResult;
};

const UTC_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

function parseIso(value: string) {
  const parsed = typeof value === 'string' && UTC_ISO.test(value) ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw Error('W5-M5数据无效');
  }
  return parsed.getTime();
}

function assertTime(session: WeekFiveStoryOrchestrationMissionSession, now: string) {
  if (parseIso(now) < parseIso(session.savedAt)) throw Error('W5-M5数据无效');
}

function increment(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value === Number.MAX_SAFE_INTEGER) {
    throw Error('W5-M5数据无效');
  }
  return value + 1;
}

function runnableFor(code: string): WeekFiveStoryOrchestrationPythonRunnable {
  const parsed = parseWeekFiveStoryOrchestrationPython(code);
  if ('state' in parsed) throw Error('W5-M5数据无效');
  return parsed;
}

export function updateWeekFiveStoryOrchestrationCode(
  session: WeekFiveStoryOrchestrationMissionSession,
  code: string,
  now: string,
): WeekFiveStoryOrchestrationMissionSession {
  assertTime(session, now);
  parseWeekFiveStoryOrchestrationDraftEnvelope(code);
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

export function recordWeekFiveStoryOrchestrationRun(
  session: WeekFiveStoryOrchestrationMissionSession,
  input: RunInput,
  now: string,
): WeekFiveStoryOrchestrationMissionSession {
  assertTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  if (!input
    || !same(input.canonicalTrace, parsed.trace)
    || !same(input.workerTrace, parsed.trace)
    || !same(input.run, parsed.run)) {
    throw Error('W5-M5数据无效');
  }
  const next = structuredClone(session);
  next.lastCanonicalTrace = structuredClone(parsed.trace);
  next.lastWorkerTrace = structuredClone(parsed.trace);
  next.lastRun = structuredClone(parsed.run);
  next.failureSnapshot = structuredClone(parsed.run.failureSnapshots[0] ?? null);
  next.conditionObservationUses = [];
  next.totalRuns = increment(next.totalRuns);
  const blocker = parsed.run.failureSnapshots[0]?.result;
  if (blocker === 'monk-loop-conflict') next.monkLoopFailures = increment(next.monkLoopFailures);
  if (blocker === 'temple-call-conflict') next.templeCallFailures = increment(next.templeCallFailures);
  if (blocker === 'weather-binding-conflict') next.weatherBindingFailures = increment(next.weatherBindingFailures);
  if (blocker === 'later-call-order-conflict') next.laterCallOrderFailures = increment(next.laterCallOrderFailures);
  if (next.firstBlockingConcept === null) {
    next.firstBlockingConcept = blocker === 'monk-loop-conflict' ? 'loop-scope'
      : blocker === 'temple-call-conflict' ? 'function-call'
        : blocker === 'weather-binding-conflict' ? 'parameter-binding'
          : blocker === 'later-call-order-conflict' ? 'problem-decomposition'
            : null;
  }
  next.lastRunAt = now;
  next.savedAt = now;
  return next;
}

export function recordWeekFiveStoryOrchestrationValidationFailure(
  session: WeekFiveStoryOrchestrationMissionSession,
  now: string,
): WeekFiveStoryOrchestrationMissionSession {
  assertTime(session, now);
  if (!('state' in parseWeekFiveStoryOrchestrationPython(session.pythonCode))) {
    throw Error('W5-M5数据无效');
  }
  const next = structuredClone(session);
  next.validationFailures = increment(next.validationFailures);
  if (next.firstBlockingConcept === null) next.firstBlockingConcept = 'python-structure';
  next.savedAt = now;
  return next;
}

export function recordWeekFiveStoryOrchestrationInfrastructureFailure(
  session: WeekFiveStoryOrchestrationMissionSession,
  input: { executionStarted: boolean },
  now: string,
): WeekFiveStoryOrchestrationMissionSession {
  assertTime(session, now);
  if (!input || typeof input.executionStarted !== 'boolean') throw Error('W5-M5数据无效');
  const next = structuredClone(session);
  next.runnerInfrastructureFailures = increment(next.runnerInfrastructureFailures);
  if (input.executionStarted) next.totalRuns = increment(next.totalRuns);
  next.savedAt = now;
  return next;
}

export function recordWeekFiveStoryOrchestrationObservation(
  session: WeekFiveStoryOrchestrationMissionSession,
  now: string,
): WeekFiveStoryOrchestrationMissionSession {
  assertTime(session, now);
  const parsed = runnableFor(session.pythonCode);
  const snapshot = session.failureSnapshot;
  if (!snapshot
    || !session.lastRun
    || !same(session.lastCanonicalTrace, parsed.trace)
    || !same(session.lastWorkerTrace, parsed.trace)
    || !same(session.lastRun, parsed.run)
    || !parsed.run.failureSnapshots.some((item) => item.snapshotId === snapshot.snapshotId)) {
    throw Error('W5-M5数据无效');
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

export function recordWeekFiveStoryOrchestrationHint(
  session: WeekFiveStoryOrchestrationMissionSession,
  tier: 'observe' | 'think' | 'partial',
  now: string,
): WeekFiveStoryOrchestrationMissionSession {
  assertTime(session, now);
  if (!['observe', 'think', 'partial'].includes(tier)) throw Error('W5-M5数据无效');
  const next = structuredClone(session);
  if (!next.usedHintTiers.includes(tier)) next.usedHintTiers.push(tier);
  next.savedAt = now;
  return next;
}
