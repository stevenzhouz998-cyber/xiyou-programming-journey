import { traceForField, type WeekFourMappingField, type WeekFourMappingTraceItem } from '../blockly/weekFourMappingContract';

export const DEFAULT_WEEK_FOUR_MAPPING_PYTHON = 'if appearance == "白骨精":\n    continue_verification()\nelse:\n    polite_pass()';
export const SOLVED_WEEK_FOUR_MAPPING_PYTHON = DEFAULT_WEEK_FOUR_MAPPING_PYTHON.replace('appearance', 'identity');
export interface WeekFourMappingPythonParse { field: WeekFourMappingField; sourceSpan: { line: 1; from: number; to: number }; trace: WeekFourMappingTraceItem[]; }

export function parseWeekFourMappingPython(code: string): WeekFourMappingPythonParse {
  if (typeof code !== 'string') throw new Error('W4-M1 Python 必须是文本。');
  const normalized = code.replaceAll('\r\n', '\n');
  const match = /^if (appearance|identity) == "白骨精":\n {4}continue_verification\(\)\nelse:\n {4}polite_pass\(\)$/.exec(normalized);
  if (!match) throw new Error('W4-M1 Python 只允许本关固定的 if/else 对照结构。');
  const field = match[1] as WeekFourMappingField;
  const from = 3;
  return { field, sourceSpan: { line: 1, from, to: from + field.length }, trace: traceForField(field, { kind: 'python', line: 1, from, to: from + field.length }) };
}
