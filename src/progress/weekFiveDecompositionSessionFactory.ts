import { DEFAULT_WEEK_FIVE_DECOMPOSITION_PYTHON } from '../engine/weekFiveDecompositionPythonGrammar';
import type { WeekFiveDecompositionMissionSession } from './weekFiveDecompositionSession';

const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function createWeekFiveDecompositionSession(now: string): WeekFiveDecompositionMissionSession {
  if (!UTC.test(now) || new Date(now).toISOString() !== now) throw Error('W5-M4 会话时间必须是标准 UTC ISO。');
  return {
    kind: 'python-problem-decomposition-v1', pythonCode: DEFAULT_WEEK_FIVE_DECOMPOSITION_PYTHON,
    lastCanonicalTrace: [], lastWorkerTrace: [], lastRun: null, failureSnapshot: null,
    totalRuns: 0, coordinatorFailures: 0, ownershipFailures: 0, validationFailures: 0,
    runnerInfrastructureFailures: 0, conditionObservationUses: [], usedHintTiers: [],
    firstBlockingConcept: null, lastRunAt: null, savedAt: now,
  };
}
