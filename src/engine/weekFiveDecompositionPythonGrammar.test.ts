import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEEK_FIVE_DECOMPOSITION_PYTHON,
  SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON,
  parseWeekFiveDecompositionPython,
} from './weekFiveDecompositionPythonGrammar';
import { runWeekFiveDecompositionTrace } from './weekFiveDecompositionContract';

const parse = (code: string) => {
  const value = parseWeekFiveDecompositionPython(code);
  expect('state' in value).toBe(false);
  if ('state' in value) throw new Error('expected runnable program');
  return value;
};

describe('W5-M4 problem decomposition grammar and contract', () => {
  it('fails the default all-text-correct program first on ownership, then exposes the missing coordinator call', () => {
    const first = parse(DEFAULT_WEEK_FIVE_DECOMPOSITION_PYTHON);
    expect(first.trace.filter((event) => event.kind === 'action').map((event) => event.value)).toEqual([
      '坐禅', '隔板猜物', '砍头比试故事', '剖腹比试故事', '油锅比试故事',
    ]);
    expect(first.run).toMatchObject({ state: 'record-ownership-conflict', completed: false, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
    expect(first.run.failureSnapshots[0]?.sourceSpans[0]?.line).toBe(3);
    const ownershipFixed = DEFAULT_WEEK_FIVE_DECOMPOSITION_PYTHON.replace("    record_trial('隔板猜物')\n\n", '\n');
    expect(parse(ownershipFixed).run).toMatchObject({ state: 'coordinator-call-conflict', completed: false });
    expect(parse(SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON).run).toMatchObject({ state: 'decomposition-proven', completed: true });
  });

  it('points an ownership failure at the mismatched final-trials action line', () => {
    const wrongFinal = SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON.replace("    record_trial('油锅比试故事')", "    record_trial('坐禅')");
    const result = parse(wrongFinal).run;
    expect(result.state).toBe('record-ownership-conflict');
    expect(result.failureSnapshots[0]?.sourceSpans[0]?.line).toBe(10);
  });

  it.each([
    ['top-level bypass', SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON.replace(/record_five_trials\(\)$/u, 'record_meditation()')],
    ['repeated small call', SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON.replace('    record_guess()', '    record_guess()\n    record_guess()')],
    ['reordered small calls', SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON.replace('    record_meditation()\n    record_guess()', '    record_guess()\n    record_meditation()')],
    ['wrong owner', SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON.replace("    record_trial('坐禅')", "    record_trial('隔板猜物')")],
  ])('keeps %s as a zero-penalty learning failure', (_label, code) => {
    expect(parse(code).run).toMatchObject({ completed: false, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  });

  it.each([
    'import os',
    'def record_meditation():\n    return 1',
    'def record_meditation(name):\n    record_trial(name)',
    'while True:\n    record_five_trials()',
    'open("x")',
    'record_trial.__call__("坐禅")',
  ])('rejects unsupported or dangerous structure', (code) => {
    expect(parseWeekFiveDecompositionPython(code)).toMatchObject({ state: 'python-structure-invalid' });
  });

  it('fails closed when dynamic action evidence is missing or forged', () => {
    const solved = parse(SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON);
    const withoutActions = solved.trace.filter((event) => event.kind !== 'action').map((event, index) => ({ ...event, order: index + 1 }));
    expect(runWeekFiveDecompositionTrace(withoutActions)).toMatchObject({ state: 'python-structure-invalid', completed: false });
    const forged = structuredClone(solved.trace);
    const action = forged.find((event) => event.kind === 'action');
    if (!action || action.kind !== 'action') throw new Error('fixture');
    action.value = '隔板猜物';
    expect(runWeekFiveDecompositionTrace(forged)).toMatchObject({ state: 'python-structure-invalid', completed: false });
    const lateRoot = structuredClone(solved.trace);
    const rootIndex = lateRoot.findIndex((event) => event.kind === 'function-called' && event.name === 'record_five_trials');
    const [root] = lateRoot.splice(rootIndex, 1);
    lateRoot.push(root!);
    lateRoot.forEach((event, index) => { event.order = index + 1; if (event.kind === 'function-called') event.call = lateRoot.slice(0, index + 1).filter((item) => item.kind === 'function-called').length; if (event.kind === 'action') event.call = lateRoot.slice(0, index).filter((item) => item.kind === 'function-called').length; });
    expect(runWeekFiveDecompositionTrace(lateRoot)).toMatchObject({ state: 'python-structure-invalid', completed: false });
  });
});
