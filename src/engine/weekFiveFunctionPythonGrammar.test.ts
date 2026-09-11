import { describe, expect, it } from 'vitest';
import { DEFAULT_WEEK_FIVE_FUNCTION_PYTHON, parseWeekFiveFunctionPython } from './weekFiveFunctionPythonGrammar';

describe('W5-M2 function grammar', () => {
  it('keeps the correct definition inert until one real call executes both steps', () => {
    const idle = parseWeekFiveFunctionPython(DEFAULT_WEEK_FIVE_FUNCTION_PYTHON);
    expect('state' in idle ? idle : idle.run).toMatchObject({ state: 'call-missing', completed: false });

    const called = parseWeekFiveFunctionPython(`${DEFAULT_WEEK_FIVE_FUNCTION_PYTHON}\nrecord_sanqing()`);
    expect('state' in called).toBe(false);
    if ('state' in called) return;
    expect(called.trace).toEqual([
      { kind: 'function-defined', name: 'record_sanqing', order: 1 },
      { kind: 'function-called', name: 'record_sanqing', call: 1, line: 4, order: 2 },
      { kind: 'action', action: 'record_arrival', call: 1, line: 2, scope: 'inside', order: 3 },
      { kind: 'action', action: 'record_names', call: 1, line: 3, scope: 'inside', order: 4 },
    ]);
    expect(called.run).toMatchObject({ state: 'record-proven', completed: true, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  });

  it.each([
    ['duplicate call', `${DEFAULT_WEEK_FIVE_FUNCTION_PYTHON}\nrecord_sanqing()\nrecord_sanqing()`, 'call-conflict'],
    ['missing step', 'def record_sanqing():\n    record_arrival()\nrecord_sanqing()', 'body-conflict'],
    ['reversed steps', 'def record_sanqing():\n    record_names()\n    record_arrival()\nrecord_sanqing()', 'body-conflict'],
    ['outside step', 'def record_sanqing():\n    record_arrival()\nrecord_names()\nrecord_sanqing()', 'body-conflict'],
  ])('executes %s as a learning failure', (_label, code, state) => {
    const parsed = parseWeekFiveFunctionPython(code);
    expect('state' in parsed).toBe(false);
    if ('state' in parsed) return;
    expect(parsed.run).toMatchObject({ state, completed: false, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  });

  it.each([
    'def record_sanqing(name):\n    record_arrival()\n    record_names()\nrecord_sanqing("悟空")',
    'import os\ndef record_sanqing():\n    record_arrival()\n    record_names()',
    'def record_sanqing():\n    print("done")\n    record_names()\nrecord_sanqing()',
    'def record_sanqing():\n    while True:\n        record_arrival()\n    record_names()',
  ])('rejects unsupported Python structure', (code) => {
    expect(parseWeekFiveFunctionPython(code)).toMatchObject({ state: 'python-structure-invalid' });
  });
});
