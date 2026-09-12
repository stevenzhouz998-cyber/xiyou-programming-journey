import { describe, expect, it, vi } from 'vitest';
import { formalW5M5Prerequisite } from '../../e2e/support/w6m1Prerequisite';
import { SOLVED_WEEK_SIX_RECORDS_PYTHON, parseWeekSixRecordsPython } from '../engine/weekSixRecordsPythonGrammar';
import { runWeekSixClassification, type WeekSixClassificationInput } from '../engine/weekSixClassificationContract';
import { completeMission, getWeekSixClassificationAccess, getWeekSixPromptAccess, isMissionUnlocked, serializeProgress } from './progress';
import { parseProgress } from './schema';
import { createWeekSixRecordsSession, recordWeekSixRecordsRun, updateWeekSixRecordsCode } from './weekSixRecordsSession';
import { createWeekSixClassificationSession, recordWeekSixClassificationCheck, updateWeekSixClassificationInput } from './weekSixClassificationSession';

const time = (seconds: number) => `2030-01-02T03:04:${String(seconds).padStart(2, '0')}.000Z`;
const solved: WeekSixClassificationInput = { labels: [
  { attempt: '一调', fanAuthenticity: 'false', fanEvidenceId: 'one-not-real', passageOutcome: 'not-passed', passageEvidenceId: 'one-fire-worse' },
  { attempt: '二调', fanAuthenticity: 'genuine', fanEvidenceId: 'two-true-fan', passageOutcome: 'not-passed', passageEvidenceId: 'two-stolen-back' },
  { attempt: '三调', fanAuthenticity: 'genuine', fanEvidenceId: 'three-true-fan', passageOutcome: 'passed', passageEvidenceId: 'three-fire-cleared' },
], practiceAuthenticity: 'insufficient' };

function formalM1() {
  vi.setSystemTime(new Date(time(10)));
  const base = parseProgress(formalW5M5Prerequisite());
  let session = updateWeekSixRecordsCode(createWeekSixRecordsSession(time(1)), SOLVED_WEEK_SIX_RECORDS_PYTHON, time(2));
  const parsed = parseWeekSixRecordsPython(session.pythonCode); if ('state' in parsed) throw Error('fixture');
  session = recordWeekSixRecordsRun(session, { canonicalTrace: parsed.trace, workerTrace: parsed.trace, run: parsed.run }, time(3));
  return completeMission({ ...base, sessions: { ...base.sessions, 'w6-m1': session }, savedAt: time(3) }, 'w6-m1', { stars: 3, hintsUsed: 0 });
}

describe('W6-M2 formal progress', () => {
  it('binds the successful classification to M1 work, preserves predecessors, and unlocks M3 once', () => {
    const m1 = formalM1(); const source = m1.works['w6-m1-structured-records-table']!;
    let session = createWeekSixClassificationSession({ workId: source.workId, verifiedAt: source.verifiedAt, rows: source.run.rows }, time(11));
    session = updateWeekSixClassificationInput(session, solved, time(12));
    session = recordWeekSixClassificationCheck(session, solved, runWeekSixClassification(solved, source.run.rows), time(13));
    vi.setSystemTime(new Date(time(14)));
    const completed = completeMission({ ...m1, sessions: { ...m1.sessions, 'w6-m2': session }, savedAt: time(13) }, 'w6-m2', { stars: 3, hintsUsed: 0 });
    expect(completed).toMatchObject({ schemaRevision: 22, missions: { 'w6-m2': { status: 'completed' } }, missionCompletionEvidence: { 'w6-m2': { kind: 'formal-v3', sourceWorkId: source.workId, workId: 'w6-m2-fan-evidence-classification' } } });
    expect(completed.works['w6-m2-fan-evidence-classification']?.run.completed).toBe(true);
    expect(isMissionUnlocked(completed, 'w6-m3')).toBe(true);
    expect(completed.works['w6-m1-structured-records-table']).toEqual(m1.works['w6-m1-structured-records-table']);
    expect(completed.equipment).toEqual(m1.equipment);
    expect(parseProgress(serializeProgress(completed))).toEqual(completed);
    expect(completeMission(completed, 'w6-m2', { stars: 1, hintsUsed: 3 })).toBe(completed);
  });

  it('migrates an old M2 completion to history without fabricating labels, a run, work, or playable M3 access', () => {
    const m1 = formalM1(); const raw = JSON.parse(serializeProgress(m1)); raw.schemaRevision = 18;
    raw.missions['w6-m2'] = { status: 'completed', stars: 2, attempts: 1, hintsUsed: 0, completedAt: time(9) };
    const migrated = parseProgress(JSON.stringify(raw));
    expect(migrated.schemaRevision).toBe(22);
    expect(migrated.missionCompletionEvidence['w6-m2']).toMatchObject({ kind: 'legacy-replay-only', sourceSchemaRevision: 18 });
    expect(migrated.sessions['w6-m2']).toBeUndefined(); expect(migrated.works['w6-m2-fan-evidence-classification']).toBeUndefined();
    expect(getWeekSixClassificationAccess(migrated)).toEqual({ kind: 'formal', upgradingLegacy: true });
    expect(getWeekSixPromptAccess(migrated)).toEqual({ kind: 'historical-read-only', completed: false });
    expect(isMissionUnlocked(migrated, 'w6-m3')).toBe(true);
  });

  it('rejects a classification session whose copied source no longer matches the M1 work', () => {
    const m1 = formalM1(); const source = m1.works['w6-m1-structured-records-table']!;
    const session = createWeekSixClassificationSession({ workId: source.workId, verifiedAt: source.verifiedAt, rows: source.run.rows }, time(11));
    const forged = structuredClone(session); forged.sourceVerifiedAt = time(9);
    expect(() => parseProgress(JSON.stringify({ ...m1, sessions: { ...m1.sessions, 'w6-m2': forged }, savedAt: time(12) }))).toThrow();
  });
});
