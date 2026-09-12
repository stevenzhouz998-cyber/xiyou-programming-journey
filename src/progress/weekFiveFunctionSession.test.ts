import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formalW4M5Prerequisite } from '../../e2e/support/w5m1Prerequisite';
import { DEFAULT_WEEK_FIVE_MONKS_PYTHON, parseWeekFiveMonksPython } from '../engine/weekFiveMonksPythonGrammar';
import { DEFAULT_WEEK_FIVE_FUNCTION_PYTHON, parseWeekFiveFunctionPython } from '../engine/weekFiveFunctionPythonGrammar';
import { completeMission, getWeekFiveFunctionAccess, isMissionUnlocked, serializeProgress } from './progress';
import { getWeeklyReport } from './weeklyReport';
import { parseProgress, migrateProgress } from './schema';
import { createWeekFiveMonksSession, recordWeekFiveMonksRun, updateWeekFiveMonksCode } from './weekFiveMonksSession';
import { createWeekFiveFunctionSession, recordWeekFiveFunctionObservation, recordWeekFiveFunctionRun, recordWeekFiveFunctionValidationFailure, updateWeekFiveFunctionCode } from './weekFiveFunctionSession';
import { parseWeekFiveFunctionSession } from './weekFiveFunctionSessionSchema';

const NOW = '2030-01-02T03:04:05.000Z';
const SOLVED_MONKS = DEFAULT_WEEK_FIVE_MONKS_PYTHON.replace('\nregister', '\n    register');
const SOLVED_FUNCTION = `${DEFAULT_WEEK_FIVE_FUNCTION_PYTHON}\n\nrecord_sanqing()`;
function withW5M1() {
  const base = parseProgress(formalW4M5Prerequisite());
  let session = createWeekFiveMonksSession(NOW); session = updateWeekFiveMonksCode(session, SOLVED_MONKS, NOW);
  const parsed = parseWeekFiveMonksPython(session.pythonCode); if ('state' in parsed) throw new Error('fixture');
  session = recordWeekFiveMonksRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, NOW);
  return completeMission({ ...base, sessions: { ...base.sessions, 'w5-m1': session }, savedAt: NOW }, 'w5-m1', { stars: 3, hintsUsed: 0 });
}
function run(session = createWeekFiveFunctionSession(NOW)) { const parsed = parseWeekFiveFunctionPython(session.pythonCode); if ('state' in parsed) throw new Error('fixture'); return recordWeekFiveFunctionRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, NOW); }
beforeEach(() => vi.setSystemTime(new Date(NOW)));

describe('W5-M2 durable function chain', () => {
  it('saves a real missing-call failure and clears stale run/observation after editing', () => {
    const failed = run(); expect(failed.lastRun).toMatchObject({ state: 'call-missing', completed: false }); expect(failed.callFailures).toBe(1);
    const observed = recordWeekFiveFunctionObservation(failed, NOW); expect(parseWeekFiveFunctionSession(observed)).toEqual(observed);
    const edited = updateWeekFiveFunctionCode(observed, SOLVED_FUNCTION, NOW); expect(edited.lastRun).toBeNull(); expect(edited.lastCanonicalTrace).toEqual([]); expect(edited.conditionObservationUses).toEqual([]);
  });

  it('retains invalid drafts without inventing a run and rejects forged trace/count/prototype data', () => {
    const invalid = recordWeekFiveFunctionValidationFailure(updateWeekFiveFunctionCode(createWeekFiveFunctionSession(NOW), 'import os', NOW), NOW);
    expect(invalid.totalRuns).toBe(0); expect(parseWeekFiveFunctionSession(invalid)).toEqual(invalid);
    const failed = run(); expect(() => parseWeekFiveFunctionSession({ ...failed, totalRuns: 0 })).toThrow(); expect(() => parseWeekFiveFunctionSession({ ...failed, lastWorkerTrace: [] })).toThrow();
    const forged = structuredClone(failed) as any; Object.setPrototypeOf(forged.lastCanonicalTrace, null); expect(() => parseWeekFiveFunctionSession(forged)).toThrow();
  });

  it('requires formal W5-M1, atomically seals work/proof, survives round-trip and unlocks W5-M3', () => {
    const base = withW5M1(); expect(getWeekFiveFunctionAccess(base)).toEqual({ kind: 'formal', upgradingLegacy: false });
    const solved = run(updateWeekFiveFunctionCode(run(), SOLVED_FUNCTION, NOW));
    expect(() => completeMission({ ...parseProgress(formalW4M5Prerequisite()), sessions: { 'w5-m2': solved } }, 'w5-m2', { stars: 3, hintsUsed: 0 })).toThrow();
    const completed = completeMission({ ...base, sessions: { ...base.sessions, 'w5-m2': solved }, savedAt: NOW }, 'w5-m2', { stars: 3, hintsUsed: 0 });
    expect(completed.schemaRevision).toBe(20); expect(completed.missionCompletionEvidence['w5-m2']?.kind).toBe('formal-v3'); expect(completed.works['w5-m2-sanqing-function-record']?.run.completed).toBe(true);
    expect(isMissionUnlocked(completed, 'w5-m3')).toBe(true); expect(parseProgress(serializeProgress(completed))).toEqual(completed); expect(completeMission(completed, 'w5-m2', { stars: 1, hintsUsed: 3 })).toBe(completed);
    expect(getWeeklyReport(completed, 5).weekFiveFunction).toMatchObject({ runs: 2, callFailures: 1, workSaved: true, proof: 'formal-v3' });
  });

  it('migrates revision 13 without damaging formal W5-M1 or fabricating W5-M2 evidence', () => {
    const current = withW5M1(); const old = JSON.parse(serializeProgress(current)); old.schemaRevision = 13;
    const migrated = migrateProgress(old); expect(migrated.schemaRevision).toBe(20); expect(migrated.missionCompletionEvidence['w5-m1']).toEqual(current.missionCompletionEvidence['w5-m1']); expect(migrated.sessions['w5-m2']).toBeUndefined();
    old.missions['w5-m2'] = { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: NOW };
    const legacy = migrateProgress(old); expect(legacy.missionCompletionEvidence['w5-m2']).toMatchObject({ kind: 'legacy-replay-only', sourceSchemaRevision: 13 }); expect(getWeekFiveFunctionAccess(legacy)).toMatchObject({ kind: 'formal', upgradingLegacy: true });
  });
});
