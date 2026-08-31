import { describe, expect, it } from 'vitest';
import {
  runWeekFourVariableEvidence,
  type WeekFourVariableTraceItem,
} from './weekFourVariableContract';

const overwrittenTrace = (): WeekFourVariableTraceItem[] => [
  { kind: 'assign', line: 1, target: 'appearance', source: 'ordinary-eyes', value: '送斋女子', previousValue: null, overwrote: false, span: { line: 1, from: 0, to: 10 } },
  { kind: 'assign', line: 2, target: 'appearance', source: 'fiery-eye-check', value: '白骨精', previousValue: '送斋女子', overwrote: true, span: { line: 2, from: 0, to: 10 } },
  { kind: 'seal', line: 3, executed: false, appearance: '白骨精', identity: null, missingVariable: 'identity', span: { line: 3, from: 0, to: 33 } },
];

const sealedTrace = (): WeekFourVariableTraceItem[] => [
  { kind: 'assign', line: 1, target: 'appearance', source: 'ordinary-eyes', value: '送斋女子', previousValue: null, overwrote: false, span: { line: 1, from: 0, to: 10 } },
  { kind: 'assign', line: 2, target: 'identity', source: 'fiery-eye-check', value: '白骨精', previousValue: null, overwrote: false, span: { line: 2, from: 0, to: 8 } },
  { kind: 'seal', line: 3, executed: true, appearance: '送斋女子', identity: '白骨精', missingVariable: null, span: { line: 3, from: 0, to: 33 } },
];

describe('W4-M2 variable evidence contract', () => {
  it('turns the real missing identity NameError into a saved learning failure', () => {
    const trace = overwrittenTrace();

    expect(runWeekFourVariableEvidence(trace)).toEqual({
      completed: false,
      finalState: 'evidence-unsealed',
      trace,
      sealedRecord: null,
      failureSnapshot: {
        snapshotId: 'w4-m2:appearance-overwritten:identity-missing',
        overwrittenVariable: 'appearance',
        missingVariable: 'identity',
        firstValue: '送斋女子',
        overwrittenBy: '白骨精',
        causeLine: 2,
        sealLine: 3,
      },
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
  });

  it('seals the two public facts only when both variables were really assigned', () => {
    const trace = sealedTrace();

    expect(runWeekFourVariableEvidence(trace)).toEqual({
      completed: true,
      finalState: 'evidence-sealed',
      trace,
      sealedRecord: { appearance: '送斋女子', identity: '白骨精' },
      failureSnapshot: null,
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
  });

  it.each([
    ['missing assignment', (trace: WeekFourVariableTraceItem[]) => trace.slice(1)],
    ['swapped assignments', (trace: WeekFourVariableTraceItem[]) => [trace[1]!, trace[0]!, trace[2]!]],
    ['wrong public source', (trace: WeekFourVariableTraceItem[]) => [{ ...trace[0]!, source: 'fiery-eye-check' as const }, trace[1]!, trace[2]!]],
    ['wrong public value', (trace: WeekFourVariableTraceItem[]) => [{ ...trace[0]!, value: '白骨精' as const }, trace[1]!, trace[2]!]],
    ['wrong prior value', (trace: WeekFourVariableTraceItem[]) => [trace[0]!, { ...trace[1]!, previousValue: null }, trace[2]!]],
    ['forged overwrite flag', (trace: WeekFourVariableTraceItem[]) => [trace[0]!, { ...trace[1]!, overwrote: false }, trace[2]!]],
    ['wrong assignment span', (trace: WeekFourVariableTraceItem[]) => [{ ...trace[0]!, span: { line: 1 as const, from: 1, to: 10 } }, trace[1]!, trace[2]!]],
    ['wrong seal span', (trace: WeekFourVariableTraceItem[]) => [trace[0]!, trace[1]!, { ...trace[2]!, span: { line: 3 as const, from: 0 as const, to: 32 as const } }]],
    ['failed seal marked executed', (trace: WeekFourVariableTraceItem[]) => [trace[0]!, trace[1]!, { ...trace[2]!, executed: true }]],
    ['wrong missing variable', (trace: WeekFourVariableTraceItem[]) => [trace[0]!, trace[1]!, { ...trace[2]!, missingVariable: null }]],
    ['extra event', (trace: WeekFourVariableTraceItem[]) => [...trace, trace[2]!]],
  ])('rejects a %s trace forgery', (_label, forge) => {
    expect(() => runWeekFourVariableEvidence(forge(overwrittenTrace()) as WeekFourVariableTraceItem[])).toThrow();
  });

  it.each([
    ['successful seal marked unexecuted', (trace: WeekFourVariableTraceItem[]) => [trace[0]!, trace[1]!, { ...trace[2]!, executed: false }]],
    ['successful seal with a missing identity', (trace: WeekFourVariableTraceItem[]) => [trace[0]!, trace[1]!, { ...trace[2]!, identity: null, missingVariable: 'identity' }]],
    ['successful seal with forged evidence', (trace: WeekFourVariableTraceItem[]) => [trace[0]!, trace[1]!, { ...trace[2]!, appearance: '白骨精' }]],
  ])('rejects a %s trace forgery', (_label, forge) => {
    expect(() => runWeekFourVariableEvidence(forge(sealedTrace()) as WeekFourVariableTraceItem[])).toThrow();
  });

  it('does not accept extra fields as forged penalty or sealed record evidence', () => {
    const trace = sealedTrace().map((item) => ({ ...item }));
    (trace[2] as Record<string, unknown>).sealedRecord = { appearance: '伪造', identity: '伪造' };
    (trace[2] as Record<string, unknown>).penalty = { livesLost: 1, resourcesLost: 1, starsLost: 1 };

    expect(() => runWeekFourVariableEvidence(trace as WeekFourVariableTraceItem[])).toThrow();
  });

  it.each([
    ['a custom prototype', () => {
      const item = Object.assign(Object.create({ forged: true }), sealedTrace()[0]);
      return [item, ...sealedTrace().slice(1)];
    }],
    ['a non-enumerable extra field', () => {
      const trace = sealedTrace();
      Object.defineProperty(trace[1]!, 'forged', { value: true, enumerable: false, writable: true, configurable: true });
      return trace;
    }],
    ['a custom prototype on a nested span', () => {
      const trace = sealedTrace();
      trace[1]!.span = Object.assign(Object.create({ forged: true }), trace[1]!.span);
      return trace;
    }],
    ['a symbol field', () => {
      const trace = sealedTrace();
      Object.defineProperty(trace[2]!, Symbol('forged'), { value: true, enumerable: true, writable: true, configurable: true });
      return trace;
    }],
    ['a getter that changes the public value', () => {
      const trace = sealedTrace();
      let reads = 0;
      Object.defineProperty(trace[0]!, 'value', {
        enumerable: true,
        configurable: true,
        get: () => ++reads === 1 ? '送斋女子' : '白骨精',
      });
      return trace;
    }],
  ])('rejects %s instead of reading a forged trace object', (_label, forge) => {
    expect(() => runWeekFourVariableEvidence(forge() as WeekFourVariableTraceItem[])).toThrow();
  });

  it('deeply isolates the canonical result from later input and returned-trace changes', () => {
    const input = sealedTrace();
    const result = runWeekFourVariableEvidence(input);

    input[0]!.span.to = 999;
    expect(result.trace[0]!.span.to).toBe(10);

    result.trace[1]!.span.to = 999;
    expect(input[1]!.span.to).toBe(8);
  });

  it('returns the same immutable canonical result for repeated real traces', () => {
    const first = runWeekFourVariableEvidence(sealedTrace());
    const second = runWeekFourVariableEvidence(sealedTrace());

    expect(first).toEqual(second);
    expect(first.trace).not.toBe(second.trace);
    expect(first.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
  });
});
