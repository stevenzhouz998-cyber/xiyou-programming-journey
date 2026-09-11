import { parseWeekFiveWeatherPython } from '../../src/engine/weekFiveWeatherPythonGrammar';
import { completeMission, serializeProgress } from '../../src/progress/progress';
import { parseProgress } from '../../src/progress/schema';
import { createWeekFiveWeatherSession, recordWeekFiveWeatherRun, updateWeekFiveWeatherCode } from '../../src/progress/weekFiveWeatherSession';
import { formalW5M2Prerequisite } from './w5m3Prerequisite';

export function formalW5M3Prerequisite(): string {
  const progress = parseProgress(formalW5M2Prerequisite());
  const code = "def weather(order):\n    record_weather(order)\n\nweather('风')\nweather('云')\nweather('雷')\nweather('雨')";
  let session = updateWeekFiveWeatherCode(createWeekFiveWeatherSession('2026-09-11T00:00:06.000Z'), code, '2026-09-11T00:00:07.000Z');
  const parsed = parseWeekFiveWeatherPython(code);
  if ('state' in parsed) throw new Error('W5-M3 prerequisite invalid');
  session = recordWeekFiveWeatherRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, '2026-09-11T00:00:08.000Z');
  progress.sessions['w5-m3'] = session;
  return serializeProgress(completeMission(progress, 'w5-m3', { stars: 3, hintsUsed: 0 }));
}
