import { describe, expect, it } from 'vitest';
import { formalW4M4Prerequisite } from '../../e2e/support/w4m5Prerequisite';
import { parseProgress, migrateProgress } from './schema';
import { completeMission, createInitialProgress, getWeekFourBossAccess, isMissionUnlocked, serializeProgress } from './progress';
import { createWeekFourBossSession, recordWeekFourBossRun, recordWeekFourBossObservation, updateWeekFourBossCode, recordWeekFourBossValidationFailure } from './weekFourBossSession';
import { parseWeekFourBossSession } from './weekFourBossSessionSchema';
import { parseWeekFourBossPython } from '../engine/weekFourBossPythonGrammar';
const time = (n: number) => `2026-09-08T10:00:${String(n).padStart(2,'0')}.000Z`;
const solved = 'for card in cards:\n    identity = read_identity(card)\n    if identity == "白骨精":\n        keep_observing(card)\n    else:\n        polite_help(card)';
function run(session = createWeekFourBossSession(time(0)), n = 1) {
  const p = parseWeekFourBossPython(session.pythonCode); if ('state' in p) throw Error('fixture');
  return recordWeekFourBossRun(session, {canonicalTrace:p.trace,workerTrace:p.trace,run:p.run},time(n));
}
describe('W4-M5 durable semantic chain', () => {
  it('saves both independent learning failures and clears observation on repeat and edit', () => {
    const first = run(); expect(first.identityFailures).toBe(1); expect(first.branchFailures).toBe(1);
    const observed = recordWeekFourBossObservation(first,time(2)); expect(parseWeekFourBossSession(observed)).toEqual(observed);
    expect(recordWeekFourBossObservation(observed,time(3)).conditionObservationUses).toHaveLength(1);
    const repeated = run(observed,4); expect(repeated.conditionObservationUses).toEqual([]); expect(parseWeekFourBossSession(repeated)).toEqual(repeated);
    const edited = updateWeekFourBossCode(observed,solved,time(5)); expect(edited.lastRun).toBeNull(); expect(edited.conditionObservationUses).toEqual([]);
  });
  it('retains invalid drafts without a Worker result or run increment', () => {
    const invalid = updateWeekFourBossCode(createWeekFourBossSession(time(0)),'import os',time(1));
    const next = recordWeekFourBossValidationFailure(invalid,time(2)); expect(next.totalRuns).toBe(0); expect(parseWeekFourBossSession(next)).toEqual(next);
  });
  it('rejects forged trace, work, timestamps, counts and publication without the previous proof', () => {
    const session = run(); const tampered = structuredClone(session); tampered.lastWorkerTrace = []; expect(()=>parseWeekFourBossSession(tampered)).toThrow();
    expect(()=>parseWeekFourBossSession({...session,totalRuns:0})).toThrow();
    expect(()=>parseWeekFourBossSession({...session,savedAt:time(0)})).toThrow();
    expect(()=>completeMission({...createInitialProgress(),sessions:{'w4-m5':run(updateWeekFourBossCode(createWeekFourBossSession(time(0)),solved,time(1)),2)}},'w4-m5',{stars:3,hintsUsed:0})).toThrow();
  });
  it('atomically publishes the formal work, preserves W4-M1/M2/M3, unlocks M5, and is idempotent', () => {
    const before = parseProgress(formalW4M4Prerequisite());
    const current = {...before, sessions:{...before.sessions,'w4-m5':run(updateWeekFourBossCode(createWeekFourBossSession(time(0)),solved,time(1)),2)}};
    const completed = completeMission(current,'w4-m5',{stars:3,hintsUsed:0});
    expect(completed.missionCompletionEvidence['w4-m5']?.kind).toBe('formal-v3'); expect(completed.works['w4-m5-verification-report']?.run.completed).toBe(true);
    expect(isMissionUnlocked(completed,'w5-m1')).toBe(true); expect(parseProgress(serializeProgress(completed))).toEqual(completed);
    expect(completeMission(completed,'w4-m5',{stars:1,hintsUsed:3})).toBe(completed);
    for (const id of ['w4-m1','w4-m2','w4-m3','w4-m4'] as const) { expect(completed.sessions[id]).toEqual(before.sessions[id]); expect(completed.missions[id]).toEqual(before.missions[id]); expect(completed.missionCompletionEvidence[id]).toEqual(before.missionCompletionEvidence[id]); }
    const forged = structuredClone(completed); forged.works['w4-m5-verification-report']!.pythonCode = solved.replace('read_identity', 'read_appearance'); expect(()=>migrateProgress(forged)).toThrow();
  });
  it('migrates revision 11 without fabricating evidence and upgrades only by rerunning', () => {
    const old = parseProgress(formalW4M4Prerequisite()); old.schemaRevision = 11;
    old.missions['w4-m5'] = {status:'completed',stars:2,attempts:1,hintsUsed:1,completedAt:'2026-09-08T00:00:00.000Z'};
    const migrated = migrateProgress(old); expect(migrated.schemaRevision).toBe(14);
    expect(migrated.sessions['w4-m5']).toBeUndefined(); expect(migrated.works['w4-m5-verification-report']).toBeUndefined();
    expect(migrated.missionCompletionEvidence['w4-m5']).toMatchObject({kind:'legacy-replay-only',sourceSchemaRevision:11});
    const upgraded = completeMission({...migrated,sessions:{...migrated.sessions,'w4-m5':run(updateWeekFourBossCode(createWeekFourBossSession(time(0)),solved,time(1)),2)}},'w4-m5',{stars:3,hintsUsed:0});
    expect(upgraded.missions['w4-m5']).toEqual(old.missions['w4-m5']); expect(()=>serializeProgress(upgraded)).not.toThrow();
    expect(()=>migrateProgress({...old,sessions:{...old.sessions,'w4-m5':createWeekFourBossSession(time(0))}})).toThrow();
  });
  it('keeps history-only users read-only and fresh users locked', () => {
    const p=createInitialProgress(); expect(getWeekFourBossAccess(p).kind).toBe('locked');
    p.schemaRevision=11; p.missions['w4-m5']={status:'completed',stars:1,attempts:1,hintsUsed:0,completedAt:time(0)};
    expect(getWeekFourBossAccess(migrateProgress(p))).toEqual({kind:'historical-read-only',completed:true});
  });
});
