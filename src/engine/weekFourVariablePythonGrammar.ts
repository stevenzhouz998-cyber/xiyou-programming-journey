import {
  runWeekFourVariableEvidence,
  type WeekFourVariableRunResult,
  type WeekFourVariableTraceItem,
} from './weekFourVariableContract';

export const DEFAULT_WEEK_FOUR_VARIABLE_PYTHON = 'appearance = ordinary_eyes()\nappearance = fiery_eye_check()\nseal_record(appearance, identity)';
export const SOLVED_WEEK_FOUR_VARIABLE_PYTHON = DEFAULT_WEEK_FOUR_VARIABLE_PYTHON.replace('\nappearance = fiery_eye_check()', '\nidentity = fiery_eye_check()');

export interface WeekFourVariablePythonParse {
  target: 'appearance' | 'identity';
  sourceSpan: { line: 2; from: 0; to: 10 | 8 };
  trace: WeekFourVariableTraceItem[];
  run: WeekFourVariableRunResult;
}

export function parseWeekFourVariablePython(code: string): WeekFourVariablePythonParse {
  if (typeof code !== 'string') throw new Error('W4-M2 Python 必须是文本。');
  const normalized = code.replaceAll('\r\n', '\n');
  const match = /^appearance = ordinary_eyes\(\)\n(appearance|identity) = fiery_eye_check\(\)\nseal_record\(appearance, identity\)$/.exec(normalized);
  if (!match) throw new Error('W4-M2 Python 只允许三条固定的变量取证语句。');

  const target = match[1] as 'appearance' | 'identity';
  const secondValue = '白骨精' as const;
  const trace: WeekFourVariableTraceItem[] = [
    { kind: 'assign', line: 1, target: 'appearance', source: 'ordinary-eyes', value: '送斋女子', previousValue: null, overwrote: false, span: { line: 1, from: 0, to: 10 } },
    target === 'appearance'
      ? { kind: 'assign', line: 2, target, source: 'fiery-eye-check', value: secondValue, previousValue: '送斋女子', overwrote: true, span: { line: 2, from: 0, to: 10 } }
      : { kind: 'assign', line: 2, target, source: 'fiery-eye-check', value: secondValue, previousValue: null, overwrote: false, span: { line: 2, from: 0, to: 8 } },
    target === 'appearance'
      ? { kind: 'seal', line: 3, executed: false, appearance: secondValue, identity: null, missingVariable: 'identity', span: { line: 3, from: 0, to: 33 } }
      : { kind: 'seal', line: 3, executed: true, appearance: '送斋女子', identity: secondValue, missingVariable: null, span: { line: 3, from: 0, to: 33 } },
  ];
  const run = runWeekFourVariableEvidence(trace);
  return { target, sourceSpan: { line: 2, from: 0, to: target.length as 10 | 8 }, trace, run };
}
