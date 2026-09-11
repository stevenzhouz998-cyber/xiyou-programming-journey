import { parseWeekFiveFunctionPython } from '../../src/engine/weekFiveFunctionPythonGrammar';
import { completeMission, serializeProgress } from '../../src/progress/progress';
import { parseProgress } from '../../src/progress/schema';
import { createWeekFiveFunctionSession, recordWeekFiveFunctionRun, updateWeekFiveFunctionCode } from '../../src/progress/weekFiveFunctionSession';
import { formalW5M1Prerequisite } from './w5m2Prerequisite';

export function formalW5M2Prerequisite(): string {
  const progress = parseProgress(formalW5M1Prerequisite());
  let session = updateWeekFiveFunctionCode(createWeekFiveFunctionSession('2026-09-11T00:00:03.000Z'), "def record_sanqing():\n    record_arrival()\n    record_names()\n\nrecord_sanqing()", '2026-09-11T00:00:04.000Z');
  const parsed = parseWeekFiveFunctionPython(session.pythonCode); if ('state' in parsed) throw new Error('W5-M2 prerequisite invalid');
  session = recordWeekFiveFunctionRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, '2026-09-11T00:00:05.000Z');
  progress.sessions['w5-m2'] = session;
  return serializeProgress(completeMission(progress, 'w5-m2', { stars: 3, hintsUsed: 0 }));
}
