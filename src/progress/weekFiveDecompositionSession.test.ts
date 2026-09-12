import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formalW5M3Prerequisite } from '../../e2e/support/w5m4Prerequisite';
import { DEFAULT_WEEK_FIVE_DECOMPOSITION_PYTHON, SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON, parseWeekFiveDecompositionPython } from '../engine/weekFiveDecompositionPythonGrammar';
import { completeMission, getWeekFiveDecompositionAccess, getWeeklyReport, isMissionUnlocked, serializeProgress } from './progress';
import { migrateProgress, parseProgress } from './schema';
import { createWeekFiveDecompositionSession, recordWeekFiveDecompositionObservation, recordWeekFiveDecompositionRun, recordWeekFiveDecompositionValidationFailure, updateWeekFiveDecompositionCode } from './weekFiveDecompositionSession';
import { parseWeekFiveDecompositionSession } from './weekFiveDecompositionSessionSchema';

const NOW = '2030-01-02T03:04:05.000Z';
function run(session = createWeekFiveDecompositionSession(NOW)) {
  const parsed = parseWeekFiveDecompositionPython(session.pythonCode);
  if ('state' in parsed) throw Error('fixture');
  return recordWeekFiveDecompositionRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, NOW);
}

beforeEach(() => vi.setSystemTime(new Date(NOW)));

describe('W5-M4 durable problem-decomposition chain', () => {
  it('saves ownership first, then coordinator failure, and clears superseded observation after editing', () => {
    const failed = run();
    expect(failed.lastRun).toMatchObject({ state: 'record-ownership-conflict', completed: false });
    expect(failed.firstBlockingConcept).toBe('record-ownership');
    expect(failed.ownershipFailures).toBe(1);
    expect(failed.coordinatorFailures).toBe(1);
    expect(failed.failureSnapshot?.sourceSpans[0]?.line).toBe(3);
    const observed = recordWeekFiveDecompositionObservation(failed, NOW);
    expect(parseWeekFiveDecompositionSession(observed)).toEqual(observed);
    const ownershipFixedCode = DEFAULT_WEEK_FIVE_DECOMPOSITION_PYTHON.replace("    record_trial('隔板猜物')\n\n", '\n');
    const ownershipFixed = run(updateWeekFiveDecompositionCode(observed, ownershipFixedCode, NOW));
    expect(ownershipFixed.lastRun?.state).toBe('coordinator-call-conflict');
    expect(ownershipFixed.conditionObservationUses).toEqual([]);
  });

  it('retains invalid drafts and rejects forged trace, counts, and array-shaped blockers', () => {
    const invalid = recordWeekFiveDecompositionValidationFailure(updateWeekFiveDecompositionCode(createWeekFiveDecompositionSession(NOW), 'import os', NOW), NOW);
    expect(invalid.totalRuns).toBe(0);
    expect(parseWeekFiveDecompositionSession(invalid)).toEqual(invalid);
    const failed = run();
    expect(() => parseWeekFiveDecompositionSession({ ...failed, totalRuns: 0 })).toThrow();
    expect(() => parseWeekFiveDecompositionSession({ ...failed, lastWorkerTrace: [] })).toThrow();
    expect(() => parseWeekFiveDecompositionSession({ ...failed, firstBlockingConcept: ['record-ownership'] })).toThrow(/首次阻塞概念/);
  });

  it('requires formal W5-M3, seals work and proof, preserves prior chain, and unlocks W5-M5', () => {
    const base = parseProgress(formalW5M3Prerequisite());
    expect(getWeekFiveDecompositionAccess(base)).toEqual({ kind: 'formal', upgradingLegacy: false });
    const solved = run(updateWeekFiveDecompositionCode(run(), SOLVED_WEEK_FIVE_DECOMPOSITION_PYTHON, NOW));
    expect(() => completeMission({ ...base, missionCompletionEvidence: {}, sessions: { 'w5-m4': solved } }, 'w5-m4', { stars: 3, hintsUsed: 0 })).toThrow();
    const completed = completeMission({ ...base, sessions: { ...base.sessions, 'w5-m4': solved }, savedAt: NOW }, 'w5-m4', { stars: 3, hintsUsed: 0 });
    expect(completed.schemaRevision).toBe(18);
    expect(completed.missionCompletionEvidence['w5-m4']?.kind).toBe('formal-v3');
    expect(completed.works['w5-m4-problem-decomposition-record']?.run.completed).toBe(true);
    expect(isMissionUnlocked(completed, 'w5-m5')).toBe(true);
    expect(parseProgress(serializeProgress(completed))).toEqual(completed);
    expect(completeMission(completed, 'w5-m4', { stars: 1, hintsUsed: 3 })).toBe(completed);
    for (const id of ['w5-m1', 'w5-m2', 'w5-m3'] as const) {
      expect(completed.sessions[id]).toEqual(base.sessions[id]);
      expect(completed.missionCompletionEvidence[id]).toEqual(base.missionCompletionEvidence[id]);
    }
    expect(getWeeklyReport(completed, 5).weekFiveDecomposition).toMatchObject({ runs: 2, ownershipFailures: 1, coordinatorFailures: 1, workSaved: true, proof: 'formal-v3' });
  });

  it('migrates revision 15 completion only to legacy provenance', () => {
    const current = JSON.parse(formalW5M3Prerequisite());
    current.schemaRevision = 15;
    current.missions['w5-m4'] = { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: NOW };
    const migrated = migrateProgress(current);
    expect(migrated.schemaRevision).toBe(18);
    expect(migrated.missionCompletionEvidence['w5-m4']).toMatchObject({ kind: 'legacy-replay-only', sourceSchemaRevision: 15 });
    expect(migrated.sessions['w5-m4']).toBeUndefined();
    expect(getWeekFiveDecompositionAccess(migrated)).toEqual({ kind: 'formal', upgradingLegacy: true });
  });
});
