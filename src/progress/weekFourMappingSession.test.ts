import { describe, expect, it } from 'vitest';
import { traceForField, compareWeekFourMappingTraces } from '../blockly/weekFourMappingContract';
import { SOLVED_WEEK_FOUR_MAPPING_PYTHON, parseWeekFourMappingPython } from '../engine/weekFourPythonMappingGrammar';
import { createWeekFourMappingSession, recordWeekFourMappingInfrastructureFailure, recordWeekFourMappingRun, updateWeekFourMappingCode } from './weekFourMappingSession';
import { createInitialProgress, serializeProgress } from './progress';

const now = '2026-08-30T00:00:00.000Z';
describe('W4-M1 mapping session', () => {
  it('starts from saved Blockly and appearance code, then invalidates evidence after an edit', () => {
    const initial = createWeekFourMappingSession(now);
    expect(initial.pythonCode).toContain('appearance');
    const solved = updateWeekFourMappingCode(initial, SOLVED_WEEK_FOUR_MAPPING_PYTHON, '2026-08-30T00:00:01.000Z');
    const blocklyTrace = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
    const pythonTrace = parseWeekFourMappingPython(SOLVED_WEEK_FOUR_MAPPING_PYTHON).trace;
    const run = compareWeekFourMappingTraces(blocklyTrace, pythonTrace);
    const recorded = recordWeekFourMappingRun(solved, { blocklyTrace, pythonTrace, run }, '2026-08-30T00:00:02.000Z');
    expect(recorded.lastRun?.finalState).toBe('mapping-proven');
    expect(updateWeekFourMappingCode(recorded, recorded.pythonCode.replace('identity', 'appearance'), '2026-08-30T00:00:03.000Z').lastRun).toBeNull();
  });

  it('counts infrastructure failure separately from learning failures', () => {
    const failed = recordWeekFourMappingInfrastructureFailure(createWeekFourMappingSession(now), '2026-08-30T00:00:01.000Z');
    expect(failed.runnerInfrastructureFailures).toBe(1);
    expect(failed.semanticMismatchFailures).toBe(0);
  });

  it('rejects traces that are legal in isolation but do not belong to the current saved inputs', () => {
    const solved = updateWeekFourMappingCode(createWeekFourMappingSession(now), SOLVED_WEEK_FOUR_MAPPING_PYTHON, '2026-08-30T00:00:01.000Z');
    const currentBlockly = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
    const forgedPython = parseWeekFourMappingPython(createWeekFourMappingSession(now).pythonCode).trace;
    const forgedRun = compareWeekFourMappingTraces(currentBlockly, forgedPython);
    expect(() => recordWeekFourMappingRun(solved, { blocklyTrace: currentBlockly, pythonTrace: forgedPython, run: forgedRun }, '2026-08-30T00:00:02.000Z')).toThrow(/当前保存/);
    const forgedBlockly = traceForField('appearance', { kind: 'blockly', blockId: 'mapping-condition' });
    const validPython = parseWeekFourMappingPython(solved.pythonCode).trace;
    expect(() => recordWeekFourMappingRun(solved, { blocklyTrace: forgedBlockly, pythonTrace: validPython, run: compareWeekFourMappingTraces(forgedBlockly, validPython) }, '2026-08-30T00:00:02.000Z')).toThrow(/当前保存/);
  });

  it('keeps two saved mismatch runs schema-valid for warm replay', () => {
    const initial = createWeekFourMappingSession(now);
    const blocklyTrace = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
    const pythonTrace = parseWeekFourMappingPython(initial.pythonCode).trace;
    const first = recordWeekFourMappingRun(initial, { blocklyTrace, pythonTrace, run: compareWeekFourMappingTraces(blocklyTrace, pythonTrace) }, '2026-08-30T00:00:01.000Z');
    const second = recordWeekFourMappingRun(first, { blocklyTrace, pythonTrace, run: compareWeekFourMappingTraces(blocklyTrace, pythonTrace) }, '2026-08-30T00:00:02.000Z');
    const progress = createInitialProgress(); progress.sessions['w4-m1'] = second;
    expect(() => serializeProgress(progress)).not.toThrow();
    expect(second.totalRuns).toBe(2);
  });

  it('keeps formal replay evidence intact when the saved Python text is unchanged', () => {
    const initial = createWeekFourMappingSession(now);
    const solved = updateWeekFourMappingCode(initial, SOLVED_WEEK_FOUR_MAPPING_PYTHON, '2026-08-30T00:00:01.000Z');
    const blocklyTrace = traceForField('identity', { kind: 'blockly', blockId: 'mapping-condition' });
    const pythonTrace = parseWeekFourMappingPython(SOLVED_WEEK_FOUR_MAPPING_PYTHON).trace;
    const recorded = recordWeekFourMappingRun(solved, { blocklyTrace, pythonTrace, run: compareWeekFourMappingTraces(blocklyTrace, pythonTrace) }, '2026-08-30T00:00:02.000Z');

    expect(updateWeekFourMappingCode(recorded, recorded.pythonCode, '2026-08-30T00:00:03.000Z')).toEqual(recorded);
  });
});
