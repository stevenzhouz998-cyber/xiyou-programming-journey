import { runWeekFourListTrace, type WeekFourListAppearance, type WeekFourListTraceItem } from './weekFourListContract';
export const DEFAULT_WEEK_FOUR_LIST_PYTHON = 'appearances = ["老妇", "女子", "老翁"]\nfor item in appearances:\n    print("老翁")';
export function parseWeekFourListDraftEnvelope(code: unknown): { code: string; normalizedCode: string } {
  if (typeof code !== 'string' || code.length > 512 || /\r(?!\n)/.test(code) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(code)) throw Error('观察册草稿需要是 512 字以内的普通文本。');
  return { code, normalizedCode: code.replaceAll('\r\n', '\n') };
}
export type WeekFourListPythonInvalid = { state: 'python-structure-invalid'; line: number; reason: 'contract' };
export function parseWeekFourListPython(code: unknown): WeekFourListPythonRunnable | WeekFourListPythonInvalid {
  const draft = parseWeekFourListDraftEnvelope(code);
  const invalid = (line: number): WeekFourListPythonInvalid => ({ state: 'python-structure-invalid', line, reason: 'contract' });
  const lines = draft.normalizedCode.split('\n');
  if (lines.length !== 3) return invalid(1);
  const list = /^appearances = \[(.*)\]$/.exec(lines[0]!);
  if (!list) return invalid(1);
  const literal = /^(?:"(女子|老妇|老翁)"|'(女子|老妇|老翁)')$/;
  const tokens = list[1]!.trim() === '' ? [] : list[1]!.split(',').map(x => x.trim());
  if (tokens.length > 5 || tokens.some(x => !literal.test(x))) return invalid(1);
  const items = tokens.map(x => { const m = literal.exec(x)!; return (m[1] ?? m[2]) as WeekFourListAppearance; });
  if (lines[1] !== 'for item in appearances:') return invalid(2);
  const print = /^    print\((.*)\)$/.exec(lines[2]!);
  if (!print || (print[1] !== 'item' && !literal.test(print[1]!))) return invalid(3);
  const arg = print[1]!;
  const value = arg === 'item' ? null : (literal.exec(arg)![1] ?? literal.exec(arg)![2]) as WeekFourListAppearance;
  const trace: WeekFourListTraceItem[] = [{kind: 'list-created', items, order: 1}, ...items.map((item, index) => ({kind: 'iteration' as const, index, item, recorded: value ?? item, order: index + 2}))];
  return { pythonCode: draft.code, normalizedCode: draft.normalizedCode, structure: value === null ? 'current-item' : 'literal', trace, run: runWeekFourListTrace(trace) };
}
export interface WeekFourListPythonRunnable {
  pythonCode: string; normalizedCode: string; structure: 'current-item' | 'literal';
  trace: WeekFourListTraceItem[]; run: ReturnType<typeof runWeekFourListTrace>;
}
