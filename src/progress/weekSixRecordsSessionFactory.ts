import { DEFAULT_WEEK_SIX_RECORDS_PYTHON } from '../engine/weekSixRecordsDefaults';
import type { WeekSixRecordsMissionSession } from './weekSixRecordsSession';

const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function createWeekSixRecordsSession(now: string): WeekSixRecordsMissionSession {
  if (!UTC.test(now) || new Date(now).toISOString() !== now) {
    throw Error('W6-M1 会话时间必须是标准 UTC ISO。');
  }
  return {
    kind: 'python-structured-records-v1',
    pythonCode: DEFAULT_WEEK_SIX_RECORDS_PYTHON,
    lastCanonicalTrace: [],
    lastWorkerTrace: [],
    lastRun: null,
    failureSnapshot: null,
    totalRuns: 0,
    recordFailures: 0,
    fieldFailures: 0,
    validationFailures: 0,
    runnerInfrastructureFailures: 0,
    conditionObservationUses: [],
    usedHintTiers: [],
    firstBlockingConcept: null,
    lastRunAt: null,
    savedAt: now,
  };
}
