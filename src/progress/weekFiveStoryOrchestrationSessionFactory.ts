import { DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON } from '../engine/weekFiveStoryOrchestrationPythonGrammar';
import type { WeekFiveStoryOrchestrationMissionSession } from './weekFiveStoryOrchestrationSession';

const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export function createWeekFiveStoryOrchestrationSession(now: string): WeekFiveStoryOrchestrationMissionSession {
  if (!UTC.test(now) || new Date(now).toISOString() !== now) throw Error('W5-M5数据无效');
  return {
    kind: 'python-story-orchestration-v1', pythonCode: DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON,
    lastCanonicalTrace: [], lastWorkerTrace: [], lastRun: null, failureSnapshot: null,
    totalRuns: 0, monkLoopFailures: 0, templeCallFailures: 0, weatherBindingFailures: 0,
    laterCallOrderFailures: 0, validationFailures: 0, runnerInfrastructureFailures: 0,
    conditionObservationUses: [], usedHintTiers: [], firstBlockingConcept: null,
    lastRunAt: null, savedAt: now,
  };
}
