import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEEK_FOUR_BRANCH_PYTHON,
  INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON,
  NESTED_WEEK_FOUR_BRANCH_PYTHON,
  SOLVED_WEEK_FOUR_BRANCH_PYTHON,
  parseWeekFourBranchPython,
} from '../engine/weekFourBranchPythonGrammar';
import {
  createWeekFourBranchSession,
  recordWeekFourBranchHint,
  recordWeekFourBranchInfrastructureFailure,
  recordWeekFourBranchObservation,
  recordWeekFourBranchRun,
  recordWeekFourBranchValidationFailure,
  updateWeekFourBranchCode,
  type WeekFourBranchMissionSession,
} from './weekFourBranchSession';

const NOW = '2026-08-31T00:00:00.000Z';
const T1 = '2026-08-31T00:00:01.000Z';
const T2 = '2026-08-31T00:00:02.000Z';
const T3 = '2026-08-31T00:00:03.000Z';

function canonical(code: string) {
  const parsed = parseWeekFourBranchPython(code);
  if ('state' in parsed) throw new Error('expected runnable fixture');
  return parsed;
}

function record(code = DEFAULT_WEEK_FOUR_BRANCH_PYTHON, now = T1) {
  const initial = code === DEFAULT_WEEK_FOUR_BRANCH_PYTHON
    ? createWeekFourBranchSession(NOW)
    : updateWeekFourBranchCode(createWeekFourBranchSession(NOW), code, NOW);
  const parsed = canonical(code);
  return recordWeekFourBranchRun(initial, {
    canonicalTrace: parsed.trace,
    workerTrace: parsed.trace,
    run: parsed.run,
  }, now);
}

describe('W4-M3 Python branch session', () => {
  it('creates the exact neutral branch session without mutating its input time', () => {
    const session = createWeekFourBranchSession(NOW);
    expect(session).toEqual({
      kind: 'python-branch-structure-v1',
      pythonCode: DEFAULT_WEEK_FOUR_BRANCH_PYTHON,
      lastCanonicalTrace: [], lastWorkerTrace: [], lastRun: null, failureSnapshot: null,
      totalRuns: 0, branchConflictFailures: 0, branchMissingFailures: 0,
      validationFailures: 0, runnerInfrastructureFailures: 0,
      conditionObservationUses: [], usedHintTiers: [], firstBlockingConcept: null,
      lastRunAt: null, savedAt: NOW,
    });
    expect(() => createWeekFourBranchSession('2026-08-31')).toThrow(/ISO/);
  });

  it('accepts safe partial drafts, clears stale evidence only on real edits, and keeps cumulative history', () => {
    const failed = record();
    const observed = recordWeekFourBranchObservation(failed, T2);
    const partial = updateWeekFourBranchCode(observed, INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON, T3);
    expect(partial).toMatchObject({
      pythonCode: INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON,
      totalRuns: 1,
      branchConflictFailures: 1,
      firstBlockingConcept: 'branch-ownership',
      lastCanonicalTrace: [], lastWorkerTrace: [], lastRun: null, failureSnapshot: null,
      lastRunAt: null,
    });
    expect(partial.conditionObservationUses).toHaveLength(0);
    const same = updateWeekFourBranchCode(partial, partial.pythonCode, '2026-08-31T00:00:04.000Z');
    expect(same).toEqual(partial);
    expect(same).not.toBe(partial);
    expect(() => updateWeekFourBranchCode(partial, 'print("escape")', '2026-08-31T00:00:04.000Z')).toThrow(/草稿|固定|允许/);
  });

  it('replays current runnable code exactly and counts each failure category at most once per run', () => {
    const initial = createWeekFourBranchSession(NOW);
    const parsed = canonical(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    const before = structuredClone(initial);
    const failed = recordWeekFourBranchRun(initial, {
      canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run,
    }, T1);
    expect(initial).toEqual(before);
    expect(failed).toMatchObject({
      totalRuns: 1,
      branchConflictFailures: 1,
      branchMissingFailures: 0,
      failureSnapshot: { snapshotId: 'w4-m3:branch-conflict:canon-old-woman-disguise' },
      firstBlockingConcept: 'branch-ownership',
      lastRunAt: T1,
      savedAt: T1,
    });

    const nested = record(NESTED_WEEK_FOUR_BRANCH_PYTHON);
    expect(nested).toMatchObject({
      totalRuns: 1,
      branchConflictFailures: 1,
      branchMissingFailures: 1,
      firstBlockingConcept: 'else-indentation',
    });

    const solved = record(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    expect(solved).toMatchObject({
      totalRuns: 1,
      branchConflictFailures: 0,
      branchMissingFailures: 0,
      lastRun: { state: 'branch-proven', completed: true },
      failureSnapshot: null,
      firstBlockingConcept: null,
    });
  });

  it('rejects invalid drafts and forged canonical, worker, or run evidence', () => {
    const invalid = updateWeekFourBranchCode(createWeekFourBranchSession(NOW), INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON, NOW);
    const runnable = canonical(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    expect(() => recordWeekFourBranchRun(invalid, {
      canonicalTrace: runnable.trace, workerTrace: runnable.trace, run: runnable.run,
    }, T1)).toThrow(/runnable|可运行|结构/);
    const solved = canonical(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    expect(() => recordWeekFourBranchRun(createWeekFourBranchSession(NOW), {
      canonicalTrace: runnable.trace, workerTrace: solved.trace, run: runnable.run,
    }, T1)).toThrow(/当前|trace|运行/);
    expect(() => recordWeekFourBranchRun(createWeekFourBranchSession(NOW), {
      canonicalTrace: runnable.trace, workerTrace: runnable.trace, run: solved.run,
    }, T1)).toThrow(/当前|trace|运行/);
  });

  it('records validation only for a current invalid draft and never adds a run', () => {
    const invalid = updateWeekFourBranchCode(createWeekFourBranchSession(NOW), INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON, NOW);
    const recorded = recordWeekFourBranchValidationFailure(invalid, T1);
    expect(recorded).toMatchObject({
      totalRuns: 0,
      validationFailures: 1,
      firstBlockingConcept: 'python-structure',
      lastRun: null,
    });
    expect(() => recordWeekFourBranchValidationFailure(createWeekFourBranchSession(NOW), T1)).toThrow(/无效|验证/);
  });

  it('separates runner infrastructure failures from learning failures and execution attempts', () => {
    const initial = createWeekFourBranchSession(NOW);
    const loading = recordWeekFourBranchInfrastructureFailure(initial, { executionStarted: false }, T1);
    const timeout = recordWeekFourBranchInfrastructureFailure(loading, { executionStarted: true }, T2);
    expect(loading).toMatchObject({ totalRuns: 0, runnerInfrastructureFailures: 1, branchConflictFailures: 0, branchMissingFailures: 0 });
    expect(timeout).toMatchObject({ totalRuns: 1, runnerInfrastructureFailures: 2, branchConflictFailures: 0, branchMissingFailures: 0 });
    const invalidInput = { executionStarted: 'yes' } as unknown as { executionStarted: boolean };
    expect(() => recordWeekFourBranchInfrastructureFailure(initial, invalidInput, T1)).toThrow(/基础设施|executionStarted/);
  });

  it('binds one observation to the current failure evidence and deduplicates snapshot use', () => {
    const failed = record();
    const observed = recordWeekFourBranchObservation(failed, T2);
    const duplicate = recordWeekFourBranchObservation(observed, T3);
    expect(observed.conditionObservationUses).toHaveLength(1);
    expect(duplicate.conditionObservationUses).toEqual(observed.conditionObservationUses);
    expect(observed.conditionObservationUses[0]).toMatchObject({
      snapshotId: failed.failureSnapshot!.snapshotId,
      pythonCode: failed.pythonCode,
      canonicalTrace: failed.lastCanonicalTrace,
      workerTrace: failed.lastWorkerTrace,
      run: failed.lastRun,
      usedAt: T2,
    });
    expect(() => recordWeekFourBranchObservation(createWeekFourBranchSession(NOW), T1)).toThrow(/快照|失败/);
  });

  it('invalidates the prior observation when unchanged code creates a new saved run', async () => {
    const { parseWeekFourBranchSession } = await import('./weekFourBranchSessionSchema');
    const observed = recordWeekFourBranchObservation(record(), T2);
    const parsed = canonical(observed.pythonCode);
    const rerun = recordWeekFourBranchRun(observed, {
      canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run,
    }, T3);
    expect(() => parseWeekFourBranchSession(rerun)).not.toThrow();
    expect(rerun.conditionObservationUses).toEqual([]);
    expect(rerun.totalRuns).toBe(2);
    const newObservation = recordWeekFourBranchObservation(rerun, T3);
    expect(parseWeekFourBranchSession(newObservation).conditionObservationUses).toHaveLength(1);
    expect(recordWeekFourBranchObservation(newObservation, T3).conditionObservationUses).toHaveLength(1);
    expect(observed.conditionObservationUses[0].usedAt).toBe(T2);
  });

  it('deduplicates hints, enforces chronology, safe counters, and immutable returns', () => {
    const initial = createWeekFourBranchSession(NOW);
    const hinted = recordWeekFourBranchHint(recordWeekFourBranchHint(initial, 'observe', T1), 'observe', T2);
    expect(hinted.usedHintTiers).toEqual(['observe']);
    expect(initial.usedHintTiers).toEqual([]);
    const invalidTier = 'answer' as unknown as 'observe';
    expect(() => recordWeekFourBranchHint(initial, invalidTier, T1)).toThrow(/提示/);
    expect(() => recordWeekFourBranchHint({ ...initial, savedAt: T2 }, 'think', T1)).toThrow(/倒退|时间/);

    for (const [field, mutate, operation] of [
      ['totalRuns', (s: WeekFourBranchMissionSession) => { s.totalRuns = Number.MAX_SAFE_INTEGER; }, (s: WeekFourBranchMissionSession) => recordWeekFourBranchInfrastructureFailure(s, { executionStarted: true }, T1)],
      ['validationFailures', (s: WeekFourBranchMissionSession) => { s.validationFailures = Number.MAX_SAFE_INTEGER; s.pythonCode = INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON; }, (s: WeekFourBranchMissionSession) => recordWeekFourBranchValidationFailure(s, T1)],
      ['runnerInfrastructureFailures', (s: WeekFourBranchMissionSession) => { s.runnerInfrastructureFailures = Number.MAX_SAFE_INTEGER; }, (s: WeekFourBranchMissionSession) => recordWeekFourBranchInfrastructureFailure(s, { executionStarted: false }, T1)],
    ] as const) {
      const candidate = createWeekFourBranchSession(NOW);
      mutate(candidate);
      expect(() => operation(candidate), field).toThrow(/计数|安全/);
    }
  });
});

describe('W4-M3 exact persistence parsers', () => {
  it('accepts default, nested, solved, and safe-invalid sessions and rejects forged nested data', async () => {
    const schema = await import('./weekFourBranchSessionSchema');
    for (const code of [DEFAULT_WEEK_FOUR_BRANCH_PYTHON, NESTED_WEEK_FOUR_BRANCH_PYTHON, SOLVED_WEEK_FOUR_BRANCH_PYTHON]) {
      const session = record(code);
      expect(schema.parseWeekFourBranchSession(session)).toEqual(session);
    }
    const invalid = recordWeekFourBranchValidationFailure(
      updateWeekFourBranchCode(createWeekFourBranchSession(NOW), INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON, NOW),
      T1,
    );
    expect(schema.parseWeekFourBranchSession(invalid)).toEqual(invalid);
    const forged = structuredClone(record(NESTED_WEEK_FOUR_BRANCH_PYTHON));
    forged.lastWorkerTrace.pop();
    expect(() => schema.parseWeekFourBranchSession(forged)).toThrow(/trace|运行|Python/);
    expect(() => schema.parseWeekFourBranchSession({ ...invalid, extra: true })).toThrow(/未知字段/);
  });

  it('replays observations exactly and rejects malformed drafts, time, and orphan run state', async () => {
    const schema = await import('./weekFourBranchSessionSchema');
    const observed = recordWeekFourBranchObservation(record(), T2);
    expect(schema.parseWeekFourBranchSession(observed)).toEqual(observed);
    const forgedObservation = structuredClone(observed);
    forgedObservation.conditionObservationUses[0].pythonCode = SOLVED_WEEK_FOUR_BRANCH_PYTHON;
    expect(() => schema.parseWeekFourBranchSession(forgedObservation)).toThrow(/观察|快照|代码/);
    expect(() => schema.parseWeekFourBranchSession({ ...observed, savedAt: NOW })).toThrow(/时间/);
    expect(() => schema.parseWeekFourBranchSession({ ...observed, pythonCode: 'print("escape")' })).toThrow(/草稿|Python/);
    const orphan = createWeekFourBranchSession(NOW);
    orphan.lastRunAt = T1;
    expect(() => schema.parseWeekFourBranchSession(orphan)).toThrow(/运行|时间/);
  });

  it.each([
    ['another runnable failure run', () => {
      const current = record(DEFAULT_WEEK_FOUR_BRANCH_PYTHON, T1);
      const nested = recordWeekFourBranchObservation(record(NESTED_WEEK_FOUR_BRANCH_PYTHON, T1), T2);
      current.conditionObservationUses = structuredClone(nested.conditionObservationUses);
      current.savedAt = T2;
      return current;
    }],
    ['an observation before the current run', () => {
      const current = recordWeekFourBranchObservation(record(DEFAULT_WEEK_FOUR_BRANCH_PYTHON, T1), T2);
      current.conditionObservationUses[0].usedAt = NOW;
      return current;
    }],
    ['another runnable Python code', () => {
      const current = recordWeekFourBranchObservation(record(DEFAULT_WEEK_FOUR_BRANCH_PYTHON, T1), T2);
      const nested = canonical(NESTED_WEEK_FOUR_BRANCH_PYTHON);
      Object.assign(current.conditionObservationUses[0], {
        pythonCode: NESTED_WEEK_FOUR_BRANCH_PYTHON,
        canonicalTrace: structuredClone(nested.trace),
        workerTrace: structuredClone(nested.trace),
        run: structuredClone(nested.run),
      });
      return current;
    }],
    ['a non-primary snapshot from the same run', () => {
      const current = recordWeekFourBranchObservation(record(NESTED_WEEK_FOUR_BRANCH_PYTHON, T1), T2);
      const missing = current.lastRun!.failureSnapshots.find((snapshot) => snapshot.result === 'branch-missing');
      if (!missing) throw new Error('expected nested missing snapshot');
      current.conditionObservationUses[0].snapshotId = missing.snapshotId;
      return current;
    }],
  ])('rejects an observation grafted from %s', async (_label, build) => {
    const schema = await import('./weekFourBranchSessionSchema');
    expect(() => schema.parseWeekFourBranchSession(build())).toThrow(/观察|当前|运行|时间|快照|代码/);
  });

  it('accepts only branch-proven exact work and binds formal proof to W4-M2 formal completion', async () => {
    const schema = await import('./weekFourBranchSessionSchema');
    const session = record(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    const work = {
      kind: 'python-branch-structure-v1' as const,
      workId: 'w4-m3-branch-structure-record' as const,
      missionId: 'w4-m3' as const,
      title: '第一次 Python 分支结构记录' as const,
      pythonCode: session.pythonCode,
      canonicalTrace: session.lastCanonicalTrace,
      workerTrace: session.lastWorkerTrace,
      run: session.lastRun!,
      createdAt: T2,
      verifiedAt: T3,
    };
    const proof = {
      kind: 'formal-v3' as const,
      completedAt: T2,
      verifiedAt: T3,
      pythonCode: work.pythonCode,
      canonicalTrace: work.canonicalTrace,
      workerTrace: work.workerTrace,
      run: work.run,
      workId: work.workId,
    };
    const mission = { status: 'completed' as const, stars: 3 as const, attempts: 1, hintsUsed: 0, completedAt: T2 };
    expect(schema.parseWeekFourBranchWork(work)).toEqual(work);
    expect(schema.parseWeekFourBranchEvidence(proof, { mission, formalWeekFourVariable: true, session, work })).toEqual(proof);
    expect(() => schema.parseWeekFourBranchEvidence(proof, { mission, formalWeekFourVariable: false, session, work })).toThrow(/W4-M2|前置|正式/);
    expect(() => schema.parseWeekFourBranchWork({ ...work, run: record().lastRun })).toThrow(/成功|branch-proven|trace/);
    expect(() => schema.parseWeekFourBranchWork({ ...work, verifiedAt: NOW, createdAt: T1 })).toThrow(/时间/);

    const completedBeforeRun = {
      ...proof,
      completedAt: NOW,
      verifiedAt: T3,
    };
    const earlyMission = { ...mission, completedAt: NOW };
    const earlyWork = { ...work, createdAt: NOW };
    expect(() => schema.parseWeekFourBranchEvidence(completedBeforeRun, {
      mission: earlyMission, formalWeekFourVariable: true, session, work: earlyWork,
    })).toThrow(/完成|运行|时间/);
  });

  it('accepts a legacy completion upgraded by a later real run and newly created work', async () => {
    const schema = await import('./weekFourBranchSessionSchema');
    const session = record(SOLVED_WEEK_FOUR_BRANCH_PYTHON, T1);
    const work = {
      kind: 'python-branch-structure-v1' as const,
      workId: 'w4-m3-branch-structure-record' as const,
      missionId: 'w4-m3' as const,
      title: '第一次 Python 分支结构记录',
      pythonCode: session.pythonCode,
      canonicalTrace: session.lastCanonicalTrace,
      workerTrace: session.lastWorkerTrace,
      run: session.lastRun!,
      createdAt: T2,
      verifiedAt: T3,
    };
    const mission = { status: 'completed' as const, stars: 3 as const, attempts: 8, hintsUsed: 2, completedAt: NOW };
    const proof = {
      kind: 'formal-v3' as const,
      completedAt: NOW,
      verifiedAt: T3,
      pythonCode: work.pythonCode,
      canonicalTrace: work.canonicalTrace,
      workerTrace: work.workerTrace,
      run: work.run,
      workId: work.workId,
    };

    expect(schema.parseWeekFourBranchEvidence(proof, {
      mission, formalWeekFourVariable: true, session, work,
    })).toEqual(proof);
  });

  it.each([
    [1, null], [2, 1], [3, 1], [3, 5], [3, 9],
  ])('accepts precise legacy replay provenance version=%s revision=%s', async (sourceVersion, sourceSchemaRevision) => {
    const schema = await import('./weekFourBranchSessionSchema');
    const mission = { status: 'completed' as const, stars: 3 as const, attempts: 1, hintsUsed: 0, completedAt: NOW };
    const evidence = { kind: 'legacy-replay-only' as const, completedAt: NOW, sourceVersion, sourceSchemaRevision };
    expect(schema.parseWeekFourBranchEvidence(evidence, {
      mission, formalWeekFourVariable: false, session: undefined, work: undefined,
    })).toEqual(evidence);
  });

  it.each([
    ['draft', createWeekFourBranchSession(T1)],
    ['invalid draft', updateWeekFourBranchCode(createWeekFourBranchSession(NOW), INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON, T1)],
    ['failed run', record(DEFAULT_WEEK_FOUR_BRANCH_PYTHON, T1)],
    ['successful run', record(SOLVED_WEEK_FOUR_BRANCH_PYTHON, T1)],
    ['observation', recordWeekFourBranchObservation(record(DEFAULT_WEEK_FOUR_BRANCH_PYTHON, T1), T2)],
  ])('allows a valid active W4-M3 %s session beside legacy completion but no work', async (_label, session) => {
    const schema = await import('./weekFourBranchSessionSchema');
    const mission = { status: 'completed' as const, stars: 3 as const, attempts: 4, hintsUsed: 1, completedAt: NOW };
    const evidence = { kind: 'legacy-replay-only' as const, completedAt: NOW, sourceVersion: 3 as const, sourceSchemaRevision: 9 as const };
    expect(schema.parseWeekFourBranchEvidence(evidence, {
      mission, formalWeekFourVariable: true, session, work: undefined,
    })).toEqual(evidence);
    expect(() => schema.parseWeekFourBranchEvidence(evidence, {
      mission, formalWeekFourVariable: true, session,
      work: { workId: 'w4-m3-branch-structure-record' } as never,
    })).toThrow(/作品|work|历史/);
  });

  it('rejects a W4-M3 legacy replay session saved or run before the historical completion', async () => {
    const schema = await import('./weekFourBranchSessionSchema');
    const completedAt = '2026-09-01T00:00:00.000Z';
    const mission = { status: 'completed' as const, stars: 3 as const, attempts: 4, hintsUsed: 1, completedAt };
    const evidence = { kind: 'legacy-replay-only' as const, completedAt, sourceVersion: 3 as const, sourceSchemaRevision: 9 as const };
    expect(() => schema.parseWeekFourBranchEvidence(evidence, {
      mission, formalWeekFourVariable: true, session: record(SOLVED_WEEK_FOUR_BRANCH_PYTHON, T1), work: undefined,
    })).toThrow(/历史完成|时间|completedAt|session/);
  });
});
