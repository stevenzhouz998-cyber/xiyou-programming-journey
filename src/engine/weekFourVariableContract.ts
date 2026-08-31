export type WeekFourVariableName = 'appearance' | 'identity';
export type WeekFourVariableEvidenceSource = 'ordinary-eyes' | 'fiery-eye-check';
export type WeekFourVariableValue = '送斋女子' | '白骨精';
export type WeekFourVariableState = 'evidence-ready' | 'evidence-unsealed' | 'evidence-sealed';

export const WEEK_FOUR_VARIABLE_EVIDENCE = Object.freeze({
  ordinaryEyes: Object.freeze({ id: 'ordinary-eyes', value: '送斋女子' }),
  fieryEyeCheck: Object.freeze({ id: 'fiery-eye-check', value: '白骨精' }),
} as const);

export type WeekFourVariableTraceItem =
  | {
    kind: 'assign';
    line: 1 | 2;
    target: WeekFourVariableName;
    source: WeekFourVariableEvidenceSource;
    value: WeekFourVariableValue;
    previousValue: WeekFourVariableValue | null;
    overwrote: boolean;
    span: { line: 1 | 2; from: number; to: number };
  }
  | {
    kind: 'seal';
    line: 3;
    executed: boolean;
    appearance: WeekFourVariableValue | null;
    identity: WeekFourVariableValue | null;
    missingVariable: 'identity' | null;
    span: { line: 3; from: 0; to: 33 };
  };

export interface WeekFourVariableFailureSnapshot {
  snapshotId: 'w4-m2:appearance-overwritten:identity-missing';
  overwrittenVariable: 'appearance';
  missingVariable: 'identity';
  firstValue: '送斋女子';
  overwrittenBy: '白骨精';
  causeLine: 2;
  sealLine: 3;
}

export interface WeekFourVariableRunResult {
  completed: boolean;
  finalState: 'evidence-unsealed' | 'evidence-sealed';
  trace: WeekFourVariableTraceItem[];
  sealedRecord: { appearance: '送斋女子'; identity: '白骨精' } | null;
  failureSnapshot: WeekFourVariableFailureSnapshot | null;
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

type ExactRecord = Record<string, unknown>;

const zeroPenalty = Object.freeze({ livesLost: 0, resourcesLost: 0, starsLost: 0 }) as { livesLost: 0; resourcesLost: 0; starsLost: 0 };
const failureSnapshot = Object.freeze({
  snapshotId: 'w4-m2:appearance-overwritten:identity-missing',
  overwrittenVariable: 'appearance',
  missingVariable: 'identity',
  firstValue: '送斋女子',
  overwrittenBy: '白骨精',
  causeLine: 2,
  sealLine: 3,
} as const);

const sameKeys = (value: unknown, keys: readonly string[]): value is ExactRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const actualKeys = Reflect.ownKeys(value);
  const expectedKeys = [...keys].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key) => typeof key !== 'string')) return false;
  const sortedActualKeys = (actualKeys as string[]).sort();
  return sortedActualKeys.every((key, index) => key === expectedKeys[index])
    && expectedKeys.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor !== undefined
        && Object.prototype.hasOwnProperty.call(descriptor, 'value')
        && descriptor.enumerable
        && descriptor.writable
        && descriptor.configurable;
    });
};

const sameSpan = (value: unknown, line: 1 | 2 | 3, to: number): boolean => sameKeys(value, ['line', 'from', 'to'])
  && value.line === line && value.from === 0 && value.to === to;

const isAssignment = (
  value: unknown,
  line: 1 | 2,
  target: WeekFourVariableName,
  source: WeekFourVariableEvidenceSource,
  assigned: WeekFourVariableValue,
  previousValue: WeekFourVariableValue | null,
  overwrote: boolean,
  to: number,
): boolean => sameKeys(value, ['kind', 'line', 'target', 'source', 'value', 'previousValue', 'overwrote', 'span'])
  && value.kind === 'assign'
  && value.line === line
  && value.target === target
  && value.source === source
  && value.value === assigned
  && value.previousValue === previousValue
  && value.overwrote === overwrote
  && sameSpan(value.span, line, to);

const isSeal = (
  value: unknown,
  executed: boolean,
  appearance: WeekFourVariableValue,
  identity: WeekFourVariableValue | null,
  missingVariable: 'identity' | null,
): boolean => sameKeys(value, ['kind', 'line', 'executed', 'appearance', 'identity', 'missingVariable', 'span'])
  && value.kind === 'seal'
  && value.line === 3
  && value.executed === executed
  && value.appearance === appearance
  && value.identity === identity
  && value.missingVariable === missingVariable
  && sameSpan(value.span, 3, 33);

const isOverwrittenTrace = (trace: unknown[]): boolean => trace.length === 3
  && isAssignment(trace[0], 1, 'appearance', 'ordinary-eyes', '送斋女子', null, false, 10)
  && isAssignment(trace[1], 2, 'appearance', 'fiery-eye-check', '白骨精', '送斋女子', true, 10)
  && isSeal(trace[2], false, '白骨精', null, 'identity');

const isSealedTrace = (trace: unknown[]): boolean => trace.length === 3
  && isAssignment(trace[0], 1, 'appearance', 'ordinary-eyes', '送斋女子', null, false, 10)
  && isAssignment(trace[1], 2, 'identity', 'fiery-eye-check', '白骨精', null, false, 8)
  && isSeal(trace[2], true, '送斋女子', '白骨精', null);

export function runWeekFourVariableEvidence(trace: WeekFourVariableTraceItem[]): WeekFourVariableRunResult {
  if (!Array.isArray(trace) || (!isOverwrittenTrace(trace) && !isSealedTrace(trace))) {
    throw new Error('W4-M2 变量取证 trace 必须是三条精确的公开执行事件。');
  }

  if (isOverwrittenTrace(trace)) {
    return {
      completed: false,
      finalState: 'evidence-unsealed',
      trace: structuredClone(trace),
      sealedRecord: null,
      failureSnapshot: structuredClone(failureSnapshot),
      penalty: structuredClone(zeroPenalty),
    };
  }

  return {
    completed: true,
    finalState: 'evidence-sealed',
    trace: structuredClone(trace),
    sealedRecord: { appearance: '送斋女子', identity: '白骨精' },
    failureSnapshot: null,
    penalty: structuredClone(zeroPenalty),
  };
}
