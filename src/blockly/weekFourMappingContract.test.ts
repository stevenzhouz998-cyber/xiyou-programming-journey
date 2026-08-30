import { describe, expect, it } from 'vitest';
import { compareWeekFourMappingTraces, traceForField } from './weekFourMappingContract';

describe('W4-M1 dual-track semantic contract', () => {
  it('stops at the first visible semantic mismatch with zero penalty', () => {
    const blockly = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
    const python = traceForField('appearance', { kind: 'python', line: 1, from: 3, to: 13 });
    expect(compareWeekFourMappingTraces(blockly, python)).toMatchObject({
      completed: false,
      finalState: 'mapping-ready',
      failureSnapshot: { cardId: 'canon-mysterious-visitor', blocklyField: 'identity', pythonField: 'appearance' },
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
  });

  it('requires both public cards to match before mapping-proven', () => {
    const blockly = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
    const python = traceForField('identity', { kind: 'python', line: 1, from: 3, to: 11 });
    expect(compareWeekFourMappingTraces(blockly, python)).toMatchObject({
      completed: true,
      finalState: 'mapping-proven',
      cardResults: [
        { cardId: 'canon-mysterious-visitor', branchAction: 'continue-verification' },
        { cardId: 'practice-mountain-traveller', branchAction: 'polite-pass' },
      ],
      failureSnapshot: null,
    });
  });

  it.each([
    (trace: ReturnType<typeof traceForField>) => trace.slice(1),
    (trace: ReturnType<typeof traceForField>) => [...trace].reverse(),
    (trace: ReturnType<typeof traceForField>) => [trace[0]!, trace[0]!],
    (trace: ReturnType<typeof traceForField>) => trace.map((item) => ({ ...item, value: '伪造值' })),
    (trace: ReturnType<typeof traceForField>) => trace.map((item) => ({ ...item, branchAction: 'polite-pass' as const })),
    (trace: ReturnType<typeof traceForField>) => trace.map((item, index) => index === 1 ? { ...item, source: { kind: 'python' as const, line: 1 as const, from: 3, to: 99 } } : item),
  ])('rejects forged or non-canonical trace shape', (forge) => {
    const blockly = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
    const python = traceForField('identity', { kind: 'python', line: 1, from: 3, to: 11 });
    expect(() => compareWeekFourMappingTraces(blockly, forge(python))).toThrow();
  });

  it('requires the stable Blockly condition block as the semantic source', () => {
    const blockly = traceForField('identity', { kind: 'blockly', blockId: 'forged-condition' });
    const python = traceForField('identity', { kind: 'python', line: 1, from: 3, to: 11 });
    expect(() => compareWeekFourMappingTraces(blockly, python)).toThrow(/来源|trace/);
  });
});
