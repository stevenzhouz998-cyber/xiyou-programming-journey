import {
  runWeekFourBranchTrace,
  type WeekFourBranchRunResult,
  type WeekFourBranchTraceItem,
  type WeekFourBranchTraceOrder,
} from './weekFourBranchContract';

export const DEFAULT_WEEK_FOUR_BRANCH_PYTHON = 'if identity == "白骨精":\n    keep_observing()\npolite_help()';
export const NESTED_WEEK_FOUR_BRANCH_PYTHON = 'if identity == "白骨精":\n    keep_observing()\n    polite_help()';
export const INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON = 'if identity == "白骨精":\n    keep_observing()\nelse:\npolite_help()';
export const SOLVED_WEEK_FOUR_BRANCH_PYTHON = 'if identity == "白骨精":\n    keep_observing()\nelse:\n    polite_help()';

const CONDITION_LINE = 'if identity == "白骨精":';
const KEEP_LINE = '    keep_observing()';
const MAX_CODE_LENGTH = 160;
const MAX_CONNECTOR_LENGTH = 32;
const MAX_ACTION_INDENT = 32;
const CONNECTOR_PREFIXES = new Set(['', 'e', 'el', 'els', 'else', 'else:']);

export interface WeekFourBranchDraftEnvelope {
  code: string;
  normalizedCode: string;
  lineEnding: 'lf' | 'crlf' | 'mixed';
  connector: string | null;
  connectorSpan: { line: 3; from: 0; to: number } | null;
  actionIndent: number;
  actionIndentSpan: { line: 3 | 4; from: 0; to: number };
}

export type WeekFourBranchPythonInvalid = {
  state: 'python-structure-invalid';
  line: 3 | 4;
  reason: 'incomplete-connector' | 'indentation' | 'contract';
};

export type WeekFourBranchPythonRunnable = {
  structure: 'fallthrough' | 'nested' | 'else';
  pythonCode: string;
  normalizedCode: string;
  trace: WeekFourBranchTraceItem[];
  run: WeekFourBranchRunResult;
  connectorSpan: WeekFourBranchDraftEnvelope['connectorSpan'];
  actionIndentSpan: WeekFourBranchDraftEnvelope['actionIndentSpan'];
};

export type WeekFourBranchPythonParse = WeekFourBranchPythonRunnable | WeekFourBranchPythonInvalid;

const lineEndingFor = (code: string): WeekFourBranchDraftEnvelope['lineEnding'] => {
  const hasCrLf = code.includes('\r\n');
  const hasLf = code.replaceAll('\r\n', '').includes('\n');
  return hasCrLf ? (hasLf ? 'mixed' : 'crlf') : 'lf';
};

export function parseWeekFourBranchDraftEnvelope(code: unknown): WeekFourBranchDraftEnvelope {
  if (typeof code !== 'string') throw new Error('W4-M3 Python 草稿必须是文本。');
  if (code.length > MAX_CODE_LENGTH) throw new Error('W4-M3 Python 草稿超出安全长度。');
  if (/\r(?!\n)/.test(code)) throw new Error('W4-M3 Python 草稿包含非法换行。');

  const normalizedCode = code.replaceAll('\r\n', '\n');
  const lines = normalizedCode.split('\n');
  if (lines.length !== 3 && lines.length !== 4) throw new Error('W4-M3 Python 草稿只允许固定主体和一行连接词。');
  if (lines[0] !== CONDITION_LINE || lines[1] !== KEEP_LINE) throw new Error('W4-M3 Python 草稿的条件与观察行不可改写。');

  const connector = lines.length === 4 ? lines[2]! : null;
  if (connector !== null) {
    if (connector.length > MAX_CONNECTOR_LENGTH) throw new Error('W4-M3 Python 连接词超出安全长度。');
    if (/[\p{Cc}\p{Cf}\u2028\u2029]/u.test(connector)) throw new Error('W4-M3 Python 连接词包含控制或格式字符。');
    if (!CONNECTOR_PREFIXES.has(connector)) throw new Error('W4-M3 Python 连接词必须是 else: 的直接输入前缀。');
  }

  const actionLineNumber = lines.length as 3 | 4;
  const actionLine = lines[actionLineNumber - 1]!;
  const actionMatch = /^( *)polite_help\(\)$/.exec(actionLine);
  if (!actionMatch) throw new Error('W4-M3 Python 草稿的末行只允许固定帮助动作。');
  const actionIndent = actionMatch[1]!.length;
  if (actionIndent > MAX_ACTION_INDENT) throw new Error('W4-M3 Python 动作缩进超出安全长度。');

  return {
    code,
    normalizedCode,
    lineEnding: lineEndingFor(code),
    connector,
    connectorSpan: connector === null ? null : { line: 3, from: 0, to: connector.length },
    actionIndent,
    actionIndentSpan: { line: actionLineNumber, from: 0, to: actionIndent },
  };
}

const traceFor = (structure: WeekFourBranchPythonRunnable['structure']): WeekFourBranchTraceItem[] => {
  const trace: WeekFourBranchTraceItem[] = [];
  const order = (): WeekFourBranchTraceOrder => (trace.length + 1) as WeekFourBranchTraceOrder;
  const politeSpan = structure === 'fallthrough'
    ? { line: 3 as const, from: 0 as const, to: 13 as const }
    : structure === 'nested'
      ? { line: 3 as const, from: 4 as const, to: 17 as const }
      : { line: 4 as const, from: 4 as const, to: 17 as const };

  trace.push({ kind: 'condition', cardId: 'canon-old-woman-disguise', field: 'identity', value: '白骨精', comparedTo: '白骨精', conditionResult: true, span: { line: 1, from: 3, to: 11 }, order: order() });
  trace.push({ kind: 'action', cardId: 'canon-old-woman-disguise', action: 'keep-observing', span: { line: 2, from: 4, to: 20 }, order: order() });
  if (structure !== 'else') trace.push({ kind: 'action', cardId: 'canon-old-woman-disguise', action: 'polite-help', span: politeSpan, order: order() });
  trace.push({
    kind: 'card-result', cardId: 'canon-old-woman-disguise',
    actions: structure === 'else' ? ['keep-observing'] : ['keep-observing', 'polite-help'],
    result: structure === 'else' ? 'single-route' : 'branch-conflict',
    sceneState: structure === 'else' ? 'old-woman-observed' : 'branch-conflict', order: order(),
  });
  trace.push({ kind: 'condition', cardId: 'practice-herbalist-elder', field: 'identity', value: '山中采药人', comparedTo: '白骨精', conditionResult: false, span: { line: 1, from: 3, to: 11 }, order: order() });
  if (structure !== 'nested') trace.push({ kind: 'action', cardId: 'practice-herbalist-elder', action: 'polite-help', span: politeSpan, order: order() });
  trace.push({
    kind: 'card-result', cardId: 'practice-herbalist-elder',
    actions: structure === 'nested' ? [] : ['polite-help'],
    result: structure === 'nested' ? 'branch-missing' : 'single-route',
    sceneState: structure === 'nested' ? 'branch-missing' : 'herbalist-helped', order: order(),
  });
  return trace;
};

const invalidFor = (draft: WeekFourBranchDraftEnvelope): WeekFourBranchPythonInvalid => {
  if (draft.connector !== null && /^(?:e|el|els|else)$/.test(draft.connector)) {
    return { state: 'python-structure-invalid', line: 3, reason: 'incomplete-connector' };
  }
  if (draft.connector === null && draft.actionIndent !== 0 && draft.actionIndent !== 4) {
    return { state: 'python-structure-invalid', line: 3, reason: 'indentation' };
  }
  if (draft.connector === 'else:' && draft.actionIndent !== 4) {
    return { state: 'python-structure-invalid', line: 4, reason: 'indentation' };
  }
  return { state: 'python-structure-invalid', line: 3, reason: 'contract' };
};

export function parseWeekFourBranchPython(code: unknown): WeekFourBranchPythonParse {
  const draft = parseWeekFourBranchDraftEnvelope(code);
  let structure: WeekFourBranchPythonRunnable['structure'] | null = null;
  if (draft.normalizedCode === DEFAULT_WEEK_FOUR_BRANCH_PYTHON) structure = 'fallthrough';
  else if (draft.normalizedCode === NESTED_WEEK_FOUR_BRANCH_PYTHON) structure = 'nested';
  else if (draft.normalizedCode === SOLVED_WEEK_FOUR_BRANCH_PYTHON) structure = 'else';
  if (!structure) return invalidFor(draft);

  const trace = traceFor(structure);
  return {
    structure,
    pythonCode: draft.code,
    normalizedCode: draft.normalizedCode,
    trace,
    run: runWeekFourBranchTrace(trace),
    connectorSpan: draft.connectorSpan,
    actionIndentSpan: draft.actionIndentSpan,
  };
}
