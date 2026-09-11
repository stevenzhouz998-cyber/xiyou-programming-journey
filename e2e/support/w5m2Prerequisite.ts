import { parseWeekFiveMonksPython } from '../../src/engine/weekFiveMonksPythonGrammar';
import { completeMission, serializeProgress } from '../../src/progress/progress';
import { parseProgress } from '../../src/progress/schema';
import { createWeekFiveMonksSession, recordWeekFiveMonksRun, updateWeekFiveMonksCode } from '../../src/progress/weekFiveMonksSession';
import { formalW4M5Prerequisite } from './w5m1Prerequisite';

export function formalW5M1Prerequisite(): string {
  const progress = parseProgress(formalW4M5Prerequisite());
  let session = updateWeekFiveMonksCode(
    createWeekFiveMonksSession('2026-09-11T00:00:00.000Z'),
    'monks = ["甲", "乙", "丙"]\nfor monk in monks:\n    release(monk)\n    register(monk)',
    '2026-09-11T00:00:01.000Z',
  );
  const parsed = parseWeekFiveMonksPython(session.pythonCode);
  if ('state' in parsed) throw new Error('W5-M1 prerequisite fixture invalid');
  session = recordWeekFiveMonksRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, '2026-09-11T00:00:02.000Z');
  progress.sessions['w5-m1'] = session;
  return serializeProgress(completeMission(progress, 'w5-m1', { stars: 3, hintsUsed: 0 }));
}
