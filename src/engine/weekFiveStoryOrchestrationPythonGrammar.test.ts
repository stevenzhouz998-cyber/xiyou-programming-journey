import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON,
  SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON,
  parseWeekFiveStoryOrchestrationPython,
} from './weekFiveStoryOrchestrationPythonGrammar';
import { runWeekFiveStoryOrchestrationTrace } from './weekFiveStoryOrchestrationContract';

const parse = (code: string) => {
  const value = parseWeekFiveStoryOrchestrationPython(code);
  expect('state' in value).toBe(false);
  if ('state' in value) throw Error('expected runnable story program');
  return value;
};

const FIX_LOOP = (code: string) => code.replace('        release(monk)\n    register(monk)', '        release(monk)\n        register(monk)');
const FIX_TEMPLE = (code: string) => code.replace('    rescue_monks()\n    record_weather_sequence()', '    rescue_monks()\n    record_sanqing()\n    record_weather_sequence()');
const FIX_WEATHER = (code: string) => code.replace("    record_weather('风')", '    record_weather(order)');
const FIX_LATER = (code: string) => code.replace('    record_guess()\n    record_meditation()', '    record_meditation()\n    record_guess()');

describe('W5-M5 story orchestration grammar and contract', () => {
  it('reveals the four default blockers only in the approved order after whole-program reruns', () => {
    expect(parse(DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON).run).toMatchObject({ state: 'monk-loop-conflict', completed: false });
    const loopFixed = FIX_LOOP(DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON);
    expect(parse(loopFixed).run).toMatchObject({ state: 'temple-call-conflict', completed: false });
    const templeFixed = FIX_TEMPLE(loopFixed);
    expect(parse(templeFixed).run).toMatchObject({ state: 'weather-binding-conflict', completed: false });
    const weatherFixed = FIX_WEATHER(templeFixed);
    expect(parse(weatherFixed).run).toMatchObject({ state: 'later-call-order-conflict', completed: false });
    expect(parse(FIX_LATER(weatherFixed)).run).toMatchObject({
      state: 'story-orchestration-proven', completed: true,
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
    expect(FIX_LATER(weatherFixed)).toBe(SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON);
  });

  it('accepts semantically correct noncanonical definition order', () => {
    const solved = SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON;
    const sections = solved.split('\n\n');
    expect(sections).toHaveLength(10);
    const reordered = [...sections.slice(4, 8), ...sections.slice(0, 4), sections[8], sections[9]].join('\n\n');
    expect(parse(reordered).run).toMatchObject({ state: 'story-orchestration-proven', completed: true });
  });

  it.each([
    ['top-level bypass', SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON.replace(/record_chechi_story\(\)$/u, 'rescue_monks()')],
    ['fixed monk target', SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON.replace('register(monk)', 'register("甲")')],
    ['weather call omitted', SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON.replace("    weather('雷')\n", '')],
    ['weather calls reordered', SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON.replace("    weather('风')\n    weather('云')", "    weather('云')\n    weather('风')")],
    ['later call repeated', SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON.replace('    record_guess()\n', '    record_guess()\n    record_guess()\n')],
    ['root stage repeated', SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON.replace('    record_sanqing()\n', '    record_sanqing()\n    record_sanqing()\n')],
  ])('keeps %s as a zero-penalty learning failure', (_label, code) => {
    expect(parse(code).run).toMatchObject({ completed: false, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  });

  it.each([
    'import os',
    'while True:\n    record_chechi_story()',
    'def rescue_monks():\n    return 1',
    'open("x")',
    'record_chechi_story.__call__()',
  ])('rejects unsupported or dangerous structure', (code) => {
    expect(parseWeekFiveStoryOrchestrationPython(code)).toMatchObject({ state: 'python-structure-invalid' });
  });

  it('fails closed when dynamic loop, binding, caller or order evidence is removed or forged', () => {
    const solved = parse(SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON);
    const withoutRegister = solved.trace.filter((event) => event.kind !== 'monk-action' || event.action !== 'register').map((event, index) => ({ ...event, order: index + 1 }));
    expect(runWeekFiveStoryOrchestrationTrace(withoutRegister)).toMatchObject({ state: 'monk-loop-conflict', completed: false });
    const forged = structuredClone(solved.trace);
    const weather = forged.filter((event) => event.kind === 'weather-action')[1];
    if (!weather || weather.kind !== 'weather-action') throw Error('fixture');
    weather.value = '风';
    expect(runWeekFiveStoryOrchestrationTrace(forged)).toMatchObject({ state: 'weather-binding-conflict', completed: false });
    const wrongCaller = structuredClone(solved.trace);
    const temple = wrongCaller.find((event) => event.kind === 'function-called' && event.name === 'record_sanqing');
    if (!temple || temple.kind !== 'function-called') throw Error('fixture');
    temple.caller = 'top-level';
    expect(runWeekFiveStoryOrchestrationTrace(wrongCaller)).toMatchObject({ state: 'python-structure-invalid', completed: false });
  });

  it('rejects an indented loop action that appears after the function has returned to its outer body', () => {
    const unexpectedIndent = SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON.replace(
      '        release(monk)\n        register(monk)',
      '        release(monk)\n    register(monk)\n        register(monk)',
    );
    expect(parseWeekFiveStoryOrchestrationPython(unexpectedIndent)).toMatchObject({ state: 'python-structure-invalid' });
  });
});
