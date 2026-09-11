import { describe, expect, it } from 'vitest';
import { DEFAULT_WEEK_FIVE_WEATHER_PYTHON, parseWeekFiveWeatherPython } from './weekFiveWeatherPythonGrammar';

const SOLVED = DEFAULT_WEEK_FIVE_WEATHER_PYTHON.replace("record_weather('风')", 'record_weather(order)');

describe('W5-M3 parameter grammar and contract', () => {
  it('records each real binding and action, and succeeds only when the function body uses order', () => {
    const defaultRun = parseWeekFiveWeatherPython(DEFAULT_WEEK_FIVE_WEATHER_PYTHON);
    expect('state' in defaultRun).toBe(false); if ('state' in defaultRun) return;
    expect(defaultRun.run).toMatchObject({ state: 'parameter-unused', completed: false, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
    expect(defaultRun.trace.filter((event) => event.kind === 'parameter-bound').map((event) => event.value)).toEqual(['风', '云', '雷', '雨']);
    expect(defaultRun.trace.filter((event) => event.kind === 'action').map((event) => event.value)).toEqual(['风', '风', '风', '风']);
    const solved = parseWeekFiveWeatherPython(SOLVED); expect('state' in solved).toBe(false); if ('state' in solved) return;
    expect(solved.run).toMatchObject({ state: 'weather-proven', completed: true });
    expect(solved.trace.filter((event) => event.kind === 'action').map((event) => event.value)).toEqual(['风', '云', '雷', '雨']);
  });

  it.each([
    ['omitted', SOLVED.replace("\nweather('雨')", '')],
    ['repeated', SOLVED.replace("weather('雨')", "weather('雷')")],
    ['reordered', SOLVED.replace("weather('风')\nweather('云')", "weather('云')\nweather('风')")],
  ])('keeps %s calls as zero-penalty learning failures', (_label, code) => {
    const parsed = parseWeekFiveWeatherPython(code); expect('state' in parsed).toBe(false); if ('state' in parsed) return;
    expect(parsed.run).toMatchObject({ state: 'call-conflict', completed: false, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  });

  it.each([
    'def weather():\n    record_weather(order)',
    'def weather(order, extra):\n    record_weather(order)',
    'import os\ndef weather(order):\n    record_weather(order)',
    'def weather(order):\n    open("x")',
    'def weather(order):\n    weather(order)',
    'def weather(order):\n    record_weather(order.upper())',
    'def weather(order):\n    record_weather(order)\nwhile True:\n    weather("风")',
  ])('rejects unsupported or dangerous structure', (code) => expect(parseWeekFiveWeatherPython(code)).toMatchObject({ state: 'python-structure-invalid' }));
});
