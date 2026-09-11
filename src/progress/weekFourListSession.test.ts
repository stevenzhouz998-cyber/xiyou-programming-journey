import { describe, expect, it } from 'vitest';
import { formalW4M3Prerequisite } from '../../e2e/support/w4m4Prerequisite';
import { parseProgress, migrateProgress } from './schema';
import { completeMission, createInitialProgress, getWeekFourListAccess, isMissionUnlocked, serializeProgress } from './progress';
import { createWeekFourListSession, recordWeekFourListRun, recordWeekFourListObservation, updateWeekFourListCode, recordWeekFourListValidationFailure } from './weekFourListSession';
import { parseWeekFourListSession } from './weekFourListSessionSchema';
import { parseWeekFourListPython } from '../engine/weekFourListPythonGrammar';
const time = (n: number) => `2026-09-08T10:00:${String(n).padStart(2,'0')}.000Z`;
const solved = 'appearances = ["女子", "老妇", "老翁"]\nfor item in appearances:\n    print(item)';
function run(session = createWeekFourListSession(time(0)), n = 1) {
  const p = parseWeekFourListPython(session.pythonCode); if ('state' in p) throw Error('fixture');
  return recordWeekFourListRun(session, {canonicalTrace:p.trace,workerTrace:p.trace,run:p.run},time(n));
}
describe('W4-M4 durable semantic chain', () => {
  it('saves both independent learning failures and clears observation on repeat and edit', () => {
    const first = run(); expect(first.listOrderFailures).toBe(1); expect(first.loopValueFailures).toBe(1);
    const observed = recordWeekFourListObservation(first,time(2)); expect(parseWeekFourListSession(observed)).toEqual(observed);
    expect(recordWeekFourListObservation(observed,time(3)).conditionObservationUses).toHaveLength(1);
    const repeated = run(observed,4); expect(repeated.conditionObservationUses).toEqual([]); expect(parseWeekFourListSession(repeated)).toEqual(repeated);
    const edited = updateWeekFourListCode(observed,solved,time(5)); expect(edited.lastRun).toBeNull(); expect(edited.conditionObservationUses).toEqual([]);
  });
  it('retains invalid drafts without a Worker result or run increment', () => {
    const invalid = updateWeekFourListCode(createWeekFourListSession(time(0)),'import os',time(1));
    const next = recordWeekFourListValidationFailure(invalid,time(2)); expect(next.totalRuns).toBe(0); expect(parseWeekFourListSession(next)).toEqual(next);
  });
  it('rejects forged trace, work, timestamps, counts and publication without the previous proof', () => {
    const session = run(); const tampered = structuredClone(session); tampered.lastWorkerTrace = []; expect(()=>parseWeekFourListSession(tampered)).toThrow();
    expect(()=>parseWeekFourListSession({...session,totalRuns:0})).toThrow();
    expect(()=>parseWeekFourListSession({...session,savedAt:time(0)})).toThrow();
    expect(()=>completeMission({...createInitialProgress(),sessions:{'w4-m4':run(updateWeekFourListCode(createWeekFourListSession(time(0)),solved,time(1)),2)}},'w4-m4',{stars:3,hintsUsed:0})).toThrow();
  });
  it('atomically publishes the formal work, preserves W4-M1/M2/M3, unlocks M5, and is idempotent', () => {
    const before = parseProgress(formalW4M3Prerequisite());
    const current = {...before, sessions:{...before.sessions,'w4-m4':run(updateWeekFourListCode(createWeekFourListSession(time(0)),solved,time(1)),2)}};
    const completed = completeMission(current,'w4-m4',{stars:3,hintsUsed:0});
    expect(completed.missionCompletionEvidence['w4-m4']?.kind).toBe('formal-v3'); expect(completed.works['w4-m4-list-loop-record']?.run.completed).toBe(true);
    expect(isMissionUnlocked(completed,'w4-m5')).toBe(true); expect(parseProgress(serializeProgress(completed))).toEqual(completed);
    expect(completeMission(completed,'w4-m4',{stars:1,hintsUsed:3})).toBe(completed);
    for (const id of ['w4-m1','w4-m2','w4-m3'] as const) { expect(completed.sessions[id]).toEqual(before.sessions[id]); expect(completed.missions[id]).toEqual(before.missions[id]); expect(completed.missionCompletionEvidence[id]).toEqual(before.missionCompletionEvidence[id]); }
    const forged = structuredClone(completed); forged.works['w4-m4-list-loop-record']!.pythonCode = solved.replace('item)', '"老翁")'); expect(()=>migrateProgress(forged)).toThrow();
  });
  it('migrates revision 10 without fabricating evidence and upgrades only by rerunning', () => {
    const old = parseProgress(formalW4M3Prerequisite()); old.schemaRevision = 10;
    old.missions['w4-m4'] = {status:'completed',stars:2,attempts:1,hintsUsed:1,completedAt:'2026-09-08T00:00:00.000Z'};
    const migrated = migrateProgress(old); expect(migrated.schemaRevision).toBe(17);
    expect(migrated.sessions['w4-m4']).toBeUndefined(); expect(migrated.works['w4-m4-list-loop-record']).toBeUndefined();
    expect(migrated.missionCompletionEvidence['w4-m4']).toMatchObject({kind:'legacy-replay-only',sourceSchemaRevision:10});
    const upgraded = completeMission({...migrated,sessions:{...migrated.sessions,'w4-m4':run(updateWeekFourListCode(createWeekFourListSession(time(0)),solved,time(1)),2)}},'w4-m4',{stars:3,hintsUsed:0});
    expect(upgraded.missions['w4-m4']).toEqual(old.missions['w4-m4']); expect(()=>serializeProgress(upgraded)).not.toThrow();
    expect(()=>migrateProgress({...old,sessions:{...old.sessions,'w4-m4':createWeekFourListSession(time(0))}})).toThrow();
  });
  it('keeps history-only users read-only and fresh users locked', () => {
    const p=createInitialProgress(); expect(getWeekFourListAccess(p).kind).toBe('locked');
    p.schemaRevision=10; p.missions['w4-m4']={status:'completed',stars:1,attempts:1,hintsUsed:0,completedAt:time(0)};
    expect(getWeekFourListAccess(migrateProgress(p))).toEqual({kind:'historical-read-only',completed:true});
  });
});
