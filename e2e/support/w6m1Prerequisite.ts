import { SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON, parseWeekFiveStoryOrchestrationPython } from '../../src/engine/weekFiveStoryOrchestrationPythonGrammar';
import { completeMission, serializeProgress } from '../../src/progress/progress';
import { parseProgress } from '../../src/progress/schema';
import { createWeekFiveStoryOrchestrationSession, recordWeekFiveStoryOrchestrationRun, updateWeekFiveStoryOrchestrationCode } from '../../src/progress/weekFiveStoryOrchestrationSession';
import { formalW5M4Prerequisite } from './w5m5Prerequisite';
import { SOLVED_WEEK_SIX_RECORDS_PYTHON, parseWeekSixRecordsPython } from '../../src/engine/weekSixRecordsPythonGrammar';
import { createWeekSixRecordsSession, recordWeekSixRecordsRun, updateWeekSixRecordsCode } from '../../src/progress/weekSixRecordsSession';
import { runWeekSixClassification, type WeekSixClassificationInput } from '../../src/engine/weekSixClassificationContract';
import { createWeekSixClassificationSession, recordWeekSixClassificationCheck, updateWeekSixClassificationInput } from '../../src/progress/weekSixClassificationSession';

export function formalW5M5Prerequisite(): string {
  const progress = parseProgress(formalW5M4Prerequisite());
  let session = updateWeekFiveStoryOrchestrationCode(
    createWeekFiveStoryOrchestrationSession('2026-09-11T00:00:12.000Z'),
    SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON,
    '2026-09-11T00:00:13.000Z',
  );
  const parsed = parseWeekFiveStoryOrchestrationPython(session.pythonCode);
  if ('state' in parsed) throw Error('W5-M5 prerequisite invalid');
  session = recordWeekFiveStoryOrchestrationRun(
    session,
    { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run },
    '2026-09-11T00:00:14.000Z',
  );
  progress.sessions['w5-m5'] = session;
  progress.savedAt = '2026-09-11T00:00:14.000Z';
  return serializeProgress(completeMission(progress, 'w5-m5', { stars: 3, hintsUsed: 0 }));
}

export function formalW6M1Completion(): string {
  const progress = parseProgress(formalW5M5Prerequisite());
  const now = new Date().toISOString();
  let session = updateWeekSixRecordsCode(createWeekSixRecordsSession(now), SOLVED_WEEK_SIX_RECORDS_PYTHON, now);
  const parsed = parseWeekSixRecordsPython(session.pythonCode);
  if ('state' in parsed) throw Error('W6-M1 completion fixture invalid');
  session = recordWeekSixRecordsRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, now);
  progress.sessions['w6-m1'] = session; progress.savedAt = now;
  return serializeProgress(completeMission(progress, 'w6-m1', { stars: 3, hintsUsed: 0 }));
}

export function formalW6M2Completion(): string {
  const progress = parseProgress(formalW6M1Completion());
  const source = progress.works['w6-m1-structured-records-table'];
  if (!source) throw Error('W6-M2 source fixture invalid');
  const now = new Date().toISOString();
  const input: WeekSixClassificationInput = {
    labels: [
      { attempt: '一调', fanAuthenticity: 'false', fanEvidenceId: 'one-not-real', passageOutcome: 'not-passed', passageEvidenceId: 'one-fire-worse' },
      { attempt: '二调', fanAuthenticity: 'genuine', fanEvidenceId: 'two-true-fan', passageOutcome: 'not-passed', passageEvidenceId: 'two-stolen-back' },
      { attempt: '三调', fanAuthenticity: 'genuine', fanEvidenceId: 'three-true-fan', passageOutcome: 'passed', passageEvidenceId: 'three-fire-cleared' },
    ],
    practiceAuthenticity: 'insufficient',
  };
  let session = createWeekSixClassificationSession({ workId: source.workId, verifiedAt: source.verifiedAt, rows: source.run.rows }, now);
  session = updateWeekSixClassificationInput(session, input, now);
  session = recordWeekSixClassificationCheck(session, input, runWeekSixClassification(input, source.run.rows), now);
  progress.sessions['w6-m2'] = session; progress.savedAt = now;
  return serializeProgress(completeMission(progress, 'w6-m2', { stars: 3, hintsUsed: 0 }));
}
