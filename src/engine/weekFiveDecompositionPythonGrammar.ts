import { runWeekFiveDecompositionTrace, WEEK_FIVE_DECOMPOSITION_FUNCTIONS, WEEK_FIVE_TRIAL_RECORDS, type WeekFiveDecompositionFunction, type WeekFiveDecompositionTraceItem, type WeekFiveSmallFunction, type WeekFiveTrialRecord } from './weekFiveDecompositionContract';

export const DEFAULT_WEEK_FIVE_DECOMPOSITION_PYTHON = "def record_meditation():\n    record_trial('坐禅')\n    record_trial('隔板猜物')\n\ndef record_guess():\n    record_trial('隔板猜物')\n\ndef record_final_trials():\n    record_trial('砍头比试故事')\n    record_trial('剖腹比试故事')\n    record_trial('油锅比试故事')\n\ndef record_five_trials():\n    record_meditation()\n    record_final_trials()\n\nrecord_five_trials()";
export const SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON = "def record_meditation():\n    record_trial('坐禅')\n\ndef record_guess():\n    record_trial('隔板猜物')\n\ndef record_final_trials():\n    record_trial('砍头比试故事')\n    record_trial('剖腹比试故事')\n    record_trial('油锅比试故事')\n\ndef record_five_trials():\n    record_meditation()\n    record_guess()\n    record_final_trials()\n\nrecord_five_trials()";

export function parseWeekFiveDecompositionDraftEnvelope(code: unknown): { code: string; normalizedCode: string } {
  if (typeof code !== 'string' || code.length > 1200 || /\r(?!\n)/.test(code) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(code)) throw new Error('问题分解草稿需要是 1200 字以内的普通文本。');
  return { code, normalizedCode: code.replaceAll('\r\n', '\n') };
}

export type WeekFiveDecompositionPythonInvalid = { state: 'python-structure-invalid'; line: number; reason: 'contract' };
type Statement = { kind: 'action'; value: WeekFiveTrialRecord; line: number } | { kind: 'call'; name: WeekFiveDecompositionFunction; line: number };
export interface WeekFiveDecompositionPythonRunnable {
  pythonCode: string;
  normalizedCode: string;
  functions: Record<WeekFiveDecompositionFunction, Statement[]>;
  topLevelCalls: Array<{ name: WeekFiveDecompositionFunction; line: number }>;
  trace: WeekFiveDecompositionTraceItem[];
  run: ReturnType<typeof runWeekFiveDecompositionTrace>;
}

export function parseWeekFiveDecompositionPython(code: unknown): WeekFiveDecompositionPythonRunnable | WeekFiveDecompositionPythonInvalid {
  const draft = parseWeekFiveDecompositionDraftEnvelope(code); const lines = draft.normalizedCode.split('\n');
  const invalid = (line: number): WeekFiveDecompositionPythonInvalid => ({ state: 'python-structure-invalid', line, reason: 'contract' });
  if (lines.length > 24) return invalid(24);
  const functions = {} as Record<WeekFiveDecompositionFunction, Statement[]>;
  const definitionLines = {} as Record<WeekFiveDecompositionFunction, number>;
  let cursor = 0;
  for (const expectedName of WEEK_FIVE_DECOMPOSITION_FUNCTIONS) {
    while (lines[cursor] === '') cursor += 1;
    if (lines[cursor] !== `def ${expectedName}():`) return invalid(cursor + 1);
    definitionLines[expectedName] = cursor + 1; cursor += 1;
    const statements: Statement[] = [];
    while (cursor < lines.length && lines[cursor]!.startsWith('    ')) {
      const text = lines[cursor]!.slice(4);
      const action = /^record_trial\((['"])(坐禅|隔板猜物|砍头比试故事|剖腹比试故事|油锅比试故事)\1\)$/.exec(text);
      const call = /^(record_meditation|record_guess|record_final_trials|record_five_trials)\(\)$/.exec(text);
      if (action) statements.push({ kind: 'action', value: action[2] as WeekFiveTrialRecord, line: cursor + 1 });
      else if (call) statements.push({ kind: 'call', name: call[1] as WeekFiveDecompositionFunction, line: cursor + 1 });
      else return invalid(cursor + 1);
      cursor += 1;
    }
    if (!statements.length || statements.length > 6) return invalid(cursor + 1);
    if (expectedName === 'record_five_trials') { if (statements.some((item) => item.kind !== 'call' || item.name === 'record_five_trials')) return invalid(statements.find((item) => item.kind !== 'call' || item.name === 'record_five_trials')?.line ?? definitionLines[expectedName]); }
    else if (statements.some((item) => item.kind !== 'action')) return invalid(statements.find((item) => item.kind !== 'action')?.line ?? definitionLines[expectedName]);
    functions[expectedName] = statements;
  }
  const topLevelCalls: Array<{ name: WeekFiveDecompositionFunction; line: number }> = [];
  while (cursor < lines.length) {
    const text = lines[cursor]!; if (text === '') { cursor += 1; continue; }
    const call = /^(record_meditation|record_guess|record_final_trials|record_five_trials)\(\)$/.exec(text);
    if (!call || topLevelCalls.length >= 3) return invalid(cursor + 1);
    topLevelCalls.push({ name: call[1] as WeekFiveDecompositionFunction, line: cursor + 1 }); cursor += 1;
  }
  const trace: WeekFiveDecompositionTraceItem[] = WEEK_FIVE_DECOMPOSITION_FUNCTIONS.map((name, index) => ({ kind: 'function-defined', name, line: definitionLines[name], order: index + 1 }));
  for (const name of WEEK_FIVE_DECOMPOSITION_FUNCTIONS) {
    if (name === 'record_five_trials') continue;
    for (const statement of functions[name]) {
      if (statement.kind === 'action') trace.push({ kind: 'action-declared', action: 'record_trial', value: statement.value, owner: name, line: statement.line, order: trace.length + 1 });
    }
  }
  let callNumber = 0;
  const invoke = (name: WeekFiveDecompositionFunction, caller: 'top-level' | WeekFiveDecompositionFunction, depth: 1 | 2, line: number) => {
    callNumber += 1; const currentCall = callNumber;
    trace.push({ kind: 'function-called', name, caller, depth, call: currentCall, line, order: trace.length + 1 });
    if (name === 'record_five_trials') {
      for (const statement of functions[name]) { if (statement.kind !== 'call' || statement.name === 'record_five_trials') continue; invoke(statement.name, name, 2, statement.line); }
    } else {
      for (const statement of functions[name]) { if (statement.kind !== 'action') continue; trace.push({ kind: 'action', action: 'record_trial', value: statement.value, owner: name as WeekFiveSmallFunction, depth, call: currentCall, line: statement.line, order: trace.length + 1 }); }
    }
  };
  topLevelCalls.forEach((statement) => invoke(statement.name, 'top-level', 1, statement.line));
  if (trace.length > 32 || !WEEK_FIVE_TRIAL_RECORDS.every((value) => typeof value === 'string')) return invalid(1);
  return { pythonCode: draft.code, normalizedCode: draft.normalizedCode, functions, topLevelCalls, trace, run: runWeekFiveDecompositionTrace(trace) };
}
