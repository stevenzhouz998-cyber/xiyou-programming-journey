import { SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON, parseWeekFiveDecompositionPython } from '../../src/engine/weekFiveDecompositionPythonGrammar';
import { completeMission, serializeProgress } from '../../src/progress/progress';
import { parseProgress } from '../../src/progress/schema';
import { createWeekFiveDecompositionSession, recordWeekFiveDecompositionRun, updateWeekFiveDecompositionCode } from '../../src/progress/weekFiveDecompositionSession';
import { formalW5M3Prerequisite } from './w5m4Prerequisite';

export function formalW5M4Prerequisite(): string {
  const progress = parseProgress(formalW5M3Prerequisite());
  let session = updateWeekFiveDecompositionCode(createWeekFiveDecompositionSession('2026-09-11T00:00:09.000Z'), SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON, '2026-09-11T00:00:10.000Z');
  const parsed = parseWeekFiveDecompositionPython(session.pythonCode);
  if ('state' in parsed) throw Error('W5-M4 prerequisite invalid');
  session = recordWeekFiveDecompositionRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, '2026-09-11T00:00:11.000Z');
  progress.sessions['w5-m4'] = session;
  progress.savedAt = '2026-09-11T00:00:11.000Z';
  return serializeProgress(completeMission(progress, 'w5-m4', { stars: 3, hintsUsed: 0 }));
}
