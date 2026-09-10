import { describe, expect, it } from 'vitest';
import { parseWeekFourListPython, DEFAULT_WEEK_FOUR_LIST_PYTHON } from './weekFourListPythonGrammar';
const code = (items: string, arg = 'item') => `appearances = [${items}]\nfor item in appearances:\n    print(${arg})`;
describe('W4-M4 list and loop semantic input', () => {
  it('requires both chronological list and current iteration value', () => {
    for (const source of [DEFAULT_WEEK_FOUR_LIST_PYTHON, code('"女子", "老妇", "老翁"', '"老翁"'), code('"老妇", "女子", "老翁"')]) {
      const result = parseWeekFourListPython(source); expect('state' in result).toBe(false);
      if (!('state' in result)) expect(result.run.completed).toBe(false);
    }
    const result = parseWeekFourListPython(code('"女子", "老妇", "老翁"'));
    if ('state' in result) throw Error('must run');
    expect(result.run.completed).toBe(true); expect(result.trace).toHaveLength(4);
  });
  it.each(['', '"女子"', '"女子", "女子", "老翁"', '"女子", "老妇"'])('executes incomplete lists as learning failures: %s', items => {
    const result = parseWeekFourListPython(code(items));
    if ('state' in result) throw Error('must run'); expect(result.run.completed).toBe(false);
  });
  it.each(['import os', 'while True: pass', 'open("x")', 'print(__import__("os"))', 'appearances = ["女子"]\nfor item in appearances:\n    print(item.__class__)'])('rejects unsafe structure: %s', source => {
    expect(parseWeekFourListPython(source)).toHaveProperty('state', 'python-structure-invalid');
  });
});

import { runWeekFourListTrace } from './weekFourListContract';
it('rejects sparse or extra-field Worker traces rather than accepting vacuous array comparisons', () => {
  const sparse = new Array(4); sparse[0] = {kind:'list-created',items:new Array(3),order:1};
  expect(runWeekFourListTrace(sparse).completed).toBe(false);
});
