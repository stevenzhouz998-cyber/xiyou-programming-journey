import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEEK_FOUR_VARIABLE_PYTHON,
  SOLVED_WEEK_FOUR_VARIABLE_PYTHON,
  parseWeekFourVariablePython,
} from '../engine/weekFourVariablePythonGrammar';
import {
  createWeekFourVariableSession,
  recordWeekFourVariableHint,
  recordWeekFourVariableInfrastructureFailure,
  recordWeekFourVariableObservation,
  recordWeekFourVariableRun,
  recordWeekFourVariableValidationFailure,
  updateWeekFourVariableCode,
} from './weekFourVariableSession';

const NOW = '2026-08-31T00:00:00.000Z';
const LATER = '2026-08-31T00:00:01.000Z';

describe('W4-M2 variable-evidence session', () => {
  it('starts with the approved overwrite code and stores its deterministic failed run', () => {
    const session = createWeekFourVariableSession(NOW);
    const canonical = parseWeekFourVariablePython(session.pythonCode);
    const recorded = recordWeekFourVariableRun(session, {
      canonicalTrace: canonical.trace,
      workerTrace: canonical.trace,
      run: canonical.run,
    }, LATER);

    expect(session).toMatchObject({
      pythonCode: DEFAULT_WEEK_FOUR_VARIABLE_PYTHON,
      lastRun: null,
      totalRuns: 0,
      overwriteFailures: 0,
    });
    expect(recorded).toMatchObject({
      totalRuns: 1,
      overwriteFailures: 1,
      lastRun: { finalState: 'evidence-unsealed' },
      failureSnapshot: { snapshotId: 'w4-m2:appearance-overwritten:identity-missing' },
    });
  });

  it('re-derives canonical evidence from saved code and rejects forged worker results', () => {
    const session = createWeekFourVariableSession(NOW);
    const canonical = parseWeekFourVariablePython(session.pythonCode);
    expect(() => recordWeekFourVariableRun(session, {
      canonicalTrace: canonical.trace,
      workerTrace: parseWeekFourVariablePython(SOLVED_WEEK_FOUR_VARIABLE_PYTHON).trace,
      run: canonical.run,
    }, LATER)).toThrow(/当前保存|trace|运行/);
  });

  it('clears only stale run evidence after an edit and keeps cumulative learning history', () => {
    const canonical = parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON);
    const recorded = recordWeekFourVariableRun(createWeekFourVariableSession(NOW), {
      canonicalTrace: canonical.trace, workerTrace: canonical.trace, run: canonical.run,
    }, LATER);
    const observed = recordWeekFourVariableObservation(recorded, '2026-08-31T00:00:02.000Z');
    const edited = updateWeekFourVariableCode(observed, SOLVED_WEEK_FOUR_VARIABLE_PYTHON, '2026-08-31T00:00:03.000Z');

    expect(edited).toMatchObject({
      totalRuns: 1,
      overwriteFailures: 1,
      lastCanonicalTrace: [],
      lastWorkerTrace: [],
      lastRun: null,
      failureSnapshot: null,
      lastRunAt: null,
      conditionObservationUses: [{ snapshotId: 'w4-m2:appearance-overwritten:identity-missing' }],
    });
  });

  it('counts validation and infrastructure failures without charging learner penalties', () => {
    const initial = createWeekFourVariableSession(NOW);
    const validation = recordWeekFourVariableValidationFailure(initial, LATER);
    const loading = recordWeekFourVariableInfrastructureFailure(validation, { executionStarted: false }, '2026-08-31T00:00:02.000Z');
    const timeout = recordWeekFourVariableInfrastructureFailure(loading, { executionStarted: true }, '2026-08-31T00:00:03.000Z');

    expect(validation).toMatchObject({ totalRuns: 0, validationFailures: 1, runnerInfrastructureFailures: 0 });
    expect(loading).toMatchObject({ totalRuns: 0, validationFailures: 1, runnerInfrastructureFailures: 1 });
    expect(timeout).toMatchObject({ totalRuns: 1, validationFailures: 1, runnerInfrastructureFailures: 2 });
  });

  it('deduplicates observation and hint records and rejects invalid time or counters', () => {
    const canonical = parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON);
    const failed = recordWeekFourVariableRun(createWeekFourVariableSession(NOW), {
      canonicalTrace: canonical.trace, workerTrace: canonical.trace, run: canonical.run,
    }, LATER);
    const observed = recordWeekFourVariableObservation(failed, '2026-08-31T00:00:02.000Z');
    const sameObservation = recordWeekFourVariableObservation(observed, '2026-08-31T00:00:03.000Z');
    const hinted = recordWeekFourVariableHint(recordWeekFourVariableHint(sameObservation, 'observe', '2026-08-31T00:00:04.000Z'), 'observe', '2026-08-31T00:00:05.000Z');

    expect(sameObservation.conditionObservationUses).toHaveLength(1);
    expect(hinted.usedHintTiers).toEqual(['observe']);
    expect(() => createWeekFourVariableSession('not-an-iso-date')).toThrow(/ISO/);
    expect(() => recordWeekFourVariableValidationFailure({ ...failed, validationFailures: Number.MAX_SAFE_INTEGER }, '2026-08-31T00:00:06.000Z')).toThrow(/计数/);
  });

  it('rejects a backdated timestamp at every session mutation boundary', () => {
    const canonical = parseWeekFourVariablePython(DEFAULT_WEEK_FOUR_VARIABLE_PYTHON);
    const failed = recordWeekFourVariableRun(createWeekFourVariableSession(NOW), {
      canonicalTrace: canonical.trace, workerTrace: canonical.trace, run: canonical.run,
    }, LATER);
    const earlier = NOW;

    expect(() => updateWeekFourVariableCode(failed, SOLVED_WEEK_FOUR_VARIABLE_PYTHON, earlier)).toThrow(/倒退|时间/);
    expect(() => recordWeekFourVariableRun(failed, {
      canonicalTrace: canonical.trace, workerTrace: canonical.trace, run: canonical.run,
    }, earlier)).toThrow(/倒退|时间/);
    expect(() => recordWeekFourVariableValidationFailure(failed, earlier)).toThrow(/倒退|时间/);
    expect(() => recordWeekFourVariableInfrastructureFailure(failed, { executionStarted: false }, earlier)).toThrow(/倒退|时间/);
    expect(() => recordWeekFourVariableObservation(failed, earlier)).toThrow(/倒退|时间/);
    expect(() => recordWeekFourVariableHint(failed, 'observe', earlier)).toThrow(/倒退|时间/);
  });
});
