import { runWeekFiveFunctionTrace, type WeekFiveFunctionAction, type WeekFiveFunctionTraceItem } from './weekFiveFunctionContract';

export const DEFAULT_WEEK_FIVE_FUNCTION_PYTHON = 'def record_sanqing():\n    record_arrival()\n    record_names()';

export function parseWeekFiveFunctionDraftEnvelope(code: unknown): { code: string; normalizedCode: string } {
  if (typeof code !== 'string' || code.length > 512 || /\r(?!\n)/.test(code) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(code)) throw new Error('三清观函数草稿需要是 512 字以内的普通文本。');
  return { code, normalizedCode: code.replaceAll('\r\n', '\n') };
}

export type WeekFiveFunctionPythonInvalid = { state: 'python-structure-invalid'; line: number; reason: 'contract' };
export interface WeekFiveFunctionPythonRunnable {
  pythonCode: string;
  normalizedCode: string;
  bodyActions: WeekFiveFunctionAction[];
  trace: WeekFiveFunctionTraceItem[];
  run: ReturnType<typeof runWeekFiveFunctionTrace>;
}

export function parseWeekFiveFunctionPython(code: unknown): WeekFiveFunctionPythonRunnable | WeekFiveFunctionPythonInvalid {
  const draft = parseWeekFiveFunctionDraftEnvelope(code);
  const lines = draft.normalizedCode.split('\n');
  const invalid = (line: number): WeekFiveFunctionPythonInvalid => ({ state: 'python-structure-invalid', line, reason: 'contract' });
  if (lines.length > 8 || lines[0] !== 'def record_sanqing():') return invalid(1);
  const actionPattern = /^(    |)(record_arrival|record_names)\(\)$/;
  const callPattern = /^record_sanqing\(\)$/;
  const body: Array<{ action: WeekFiveFunctionAction; line: number }> = [];
  const top: Array<{ kind: 'action'; action: WeekFiveFunctionAction; line: number } | { kind: 'call'; line: number }> = [];
  let topStarted = false;
  for (let index = 1; index < lines.length; index += 1) {
    const value = lines[index]!;
    if (value === '') continue;
    const action = actionPattern.exec(value);
    if (action?.[1] === '    ' && !topStarted) {
      body.push({ action: action[2] as WeekFiveFunctionAction, line: index + 1 });
      continue;
    }
    topStarted = true;
    if (action?.[1] === '') top.push({ kind: 'action', action: action[2] as WeekFiveFunctionAction, line: index + 1 });
    else if (callPattern.test(value)) top.push({ kind: 'call', line: index + 1 });
    else return invalid(index + 1);
  }
  if (body.length < 1 || body.length > 2 || top.length > 2) return invalid(Math.min(lines.length, 2));
  const trace: WeekFiveFunctionTraceItem[] = [{ kind: 'function-defined', name: 'record_sanqing', order: 1 }];
  let callCount = 0;
  for (const statement of top) {
    if (statement.kind === 'action') {
      trace.push({ kind: 'action', action: statement.action, call: null, line: statement.line, scope: 'outside', order: trace.length + 1 });
      continue;
    }
    callCount += 1;
    const call = callCount as 1 | 2;
    trace.push({ kind: 'function-called', name: 'record_sanqing', call, line: statement.line, order: trace.length + 1 });
    for (const item of body) trace.push({ kind: 'action', action: item.action, call, line: item.line, scope: 'inside', order: trace.length + 1 });
  }
  return { pythonCode: draft.code, normalizedCode: draft.normalizedCode, bodyActions: body.map((item) => item.action), trace, run: runWeekFiveFunctionTrace(trace) };
}
