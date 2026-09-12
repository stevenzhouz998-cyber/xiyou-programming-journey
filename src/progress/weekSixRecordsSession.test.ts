import { describe, expect, it, vi } from 'vitest';
import { formalW5M5Prerequisite } from '../../e2e/support/w6m1Prerequisite';
import { DEFAULT_WEEK_SIX_RECORDS_PYTHON, SOLVED_WEEK_SIX_RECORDS_PYTHON, parseWeekSixRecordsPython } from '../engine/weekSixRecordsPythonGrammar';
import { completeMission, getWeekSixRecordsAccess, isMissionUnlocked, serializeProgress } from './progress';
import { getWeeklyReport } from './weeklyReport';
import { parseProgress } from './schema';
import { createWeekSixRecordsSession, recordWeekSixRecordsObservation, recordWeekSixRecordsRun, recordWeekSixRecordsValidationFailure, updateWeekSixRecordsCode } from './weekSixRecordsSession';
import { parseWeekSixRecordsSession } from './weekSixRecordsSessionSchema';

const time = (seconds: number) => `2030-01-02T03:04:${String(seconds).padStart(2, '0')}.000Z`;
function run(code: string, seconds: number) {
  let session = updateWeekSixRecordsCode(createWeekSixRecordsSession(time(0)), code, time(seconds - 1));
  const parsed = parseWeekSixRecordsPython(code);
  if ('state' in parsed) throw Error('fixture');
  session = recordWeekSixRecordsRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, time(seconds));
  return session;
}

describe('W6-M1 durable structured records', () => {
  it('records actual wrong-field rows, zero penalties, and clears stale evidence after editing', () => {
    let session = run(DEFAULT_WEEK_SIX_RECORDS_PYTHON, 2);
    expect(session.lastRun).toMatchObject({ state: 'field-read-conflict', completed: false, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
    expect(session.lastRun?.rows.map((row) => row.story)).toEqual(['一调', '二调', '三调']);
    session = recordWeekSixRecordsObservation(session, time(3));
    expect(session.conditionObservationUses).toHaveLength(1);
    session = updateWeekSixRecordsCode(session, SOLVED_WEEK_SIX_RECORDS_PYTHON, time(4));
    expect(session.lastRun).toBeNull();
    expect(session.conditionObservationUses).toEqual([]);
    expect(parseWeekSixRecordsSession(session)).toEqual(session);
  });

  it('retains invalid drafts without counting a Worker run and rejects forged traces', () => {
    const invalid = recordWeekSixRecordsValidationFailure(updateWeekSixRecordsCode(createWeekSixRecordsSession(time(0)), 'import os', time(1)), time(2));
    expect(invalid).toMatchObject({ totalRuns: 0, validationFailures: 1, firstBlockingConcept: 'python-structure' });
    expect(parseWeekSixRecordsSession(invalid)).toEqual(invalid);
    const failed = run(DEFAULT_WEEK_SIX_RECORDS_PYTHON, 2);
    expect(() => parseWeekSixRecordsSession({ ...failed, lastWorkerTrace: [] })).toThrow();
    expect(() => parseWeekSixRecordsSession({ ...failed, totalRuns: 0 })).toThrow();
  });

  it('requires W5-M5 proof, seals the work, unlocks M2 and reports learning without an answer', () => {
    vi.setSystemTime(new Date(time(10)));
    const base = parseProgress(formalW5M5Prerequisite());
    expect(getWeekSixRecordsAccess(base)).toEqual({ kind: 'formal', upgradingLegacy: false });
    const session = run(SOLVED_WEEK_SIX_RECORDS_PYTHON, 8);
    const completed = completeMission({ ...base, sessions: { ...base.sessions, 'w6-m1': session }, savedAt: time(8) }, 'w6-m1', { stars: 3, hintsUsed: 0 });
    expect(completed.schemaRevision).toBe(20);
    expect(completed.missionCompletionEvidence['w6-m1']?.kind).toBe('formal-v3');
    expect(completed.works['w6-m1-structured-records-table']?.run.completed).toBe(true);
    expect(isMissionUnlocked(completed, 'w6-m2')).toBe(true);
    expect(parseProgress(serializeProgress(completed))).toEqual(completed);
    expect(completeMission(completed, 'w6-m1', { stars: 1, hintsUsed: 3 })).toBe(completed);
    expect(getWeeklyReport(completed, 6).weekSixRecords).toMatchObject({ runs: 1, fieldFailures: 0, workSaved: true, proof: 'formal-v3' });
  });
});
