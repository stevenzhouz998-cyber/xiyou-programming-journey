import {describe,expect,it} from 'vitest';
import {formalW4M5Prerequisite} from '../../e2e/support/w5m1Prerequisite';
import {parseProgress,migrateProgress} from './schema';
import {completeMission,createInitialProgress,getWeekFiveMonksAccess,isMissionUnlocked,serializeProgress,getWeeklyReport} from './progress';
import {createWeekFiveMonksSession,recordWeekFiveMonksRun,recordWeekFiveMonksObservation,updateWeekFiveMonksCode,recordWeekFiveMonksValidationFailure} from './weekFiveMonksSession';
import {parseWeekFiveMonksSession} from './weekFiveMonksSessionSchema';
import {DEFAULT_WEEK_FIVE_MONKS_PYTHON,parseWeekFiveMonksPython} from '../engine/weekFiveMonksPythonGrammar';
const time=(n:number)=>`2026-09-10T10:00:${String(n).padStart(2,'0')}.000Z`;
const solved=DEFAULT_WEEK_FIVE_MONKS_PYTHON.replace('\nregister','\n    register');
function run(session=createWeekFiveMonksSession(time(0)),n=1){const p=parseWeekFiveMonksPython(session.pythonCode);if('state'in p)throw Error('fixture');return recordWeekFiveMonksRun(session,{canonicalTrace:p.trace,workerTrace:p.trace,run:p.run},time(n));}
describe('W5-M1 durable rescue chain',()=>{
 it('saves actual failure and observation, clears superseded evidence on repeat/edit',()=>{const first=run();expect(first.coverageFailures).toBe(0);expect(first.actionFailures).toBe(1);const obs=recordWeekFiveMonksObservation(first,time(2));expect(parseWeekFiveMonksSession(obs)).toEqual(obs);expect(recordWeekFiveMonksObservation(obs,time(3)).conditionObservationUses).toHaveLength(1);expect(run(obs,4).conditionObservationUses).toEqual([]);expect(updateWeekFiveMonksCode(obs,solved,time(5)).lastRun).toBeNull();});
 it('retains invalid drafts without fabricated execution',()=>{const x=recordWeekFiveMonksValidationFailure(updateWeekFiveMonksCode(createWeekFiveMonksSession(time(0)),'import os',time(1)),time(2));expect(x.totalRuns).toBe(0);expect(parseWeekFiveMonksSession(x)).toEqual(x);});
 it('rejects tampered trace, counts, clocks, orphan proof and premature next unlock',()=>{const x=run();expect(()=>parseWeekFiveMonksSession({...x,lastWorkerTrace:[]})).toThrow();expect(()=>parseWeekFiveMonksSession({...x,totalRuns:0})).toThrow();expect(()=>parseWeekFiveMonksSession({...x,savedAt:time(0)})).toThrow();expect(()=>completeMission({...createInitialProgress(),sessions:{'w5-m1':run(updateWeekFiveMonksCode(createWeekFiveMonksSession(time(0)),solved,time(1)),2)}},'w5-m1',{stars:3,hintsUsed:0})).toThrow();expect(isMissionUnlocked(parseProgress(formalW4M5Prerequisite()),'w5-m2')).toBe(false);});
 it('atomically seals work/proof, preserves all earlier records, counts week five, unlocks M2 and replays idempotently',()=>{
  const before=parseProgress(formalW4M5Prerequisite());const session=run(updateWeekFiveMonksCode(run(),solved,time(2)),3);const p=completeMission({...before,sessions:{...before.sessions,'w5-m1':session}},'w5-m1',{stars:3,hintsUsed:0});
  expect(p.schemaRevision).toBe(19);expect(p.missionCompletionEvidence['w5-m1']?.kind).toBe('formal-v3');expect(p.works['w5-m1-monks-rescue-record']?.run.completed).toBe(true);expect(isMissionUnlocked(p,'w5-m2')).toBe(true);expect(parseProgress(serializeProgress(p))).toEqual(p);expect(completeMission(p,'w5-m1',{stars:1,hintsUsed:3})).toBe(p);for(const id of ['w4-m1','w4-m2','w4-m3','w4-m4','w4-m5'] as const){expect(p.sessions[id]).toEqual(before.sessions[id]);expect(p.missionCompletionEvidence[id]).toEqual(before.missionCompletionEvidence[id]);}expect(getWeeklyReport(p,5).sessionRuns).toBe(2);
  const forged=structuredClone(p);forged.works['w5-m1-monks-rescue-record']!.workerTrace=[];expect(()=>parseProgress(serializeProgress(forged))).toThrow();
 });
 it.each([1,2,3,4,5,6,7,8,9,10,11,12])('legacy revision %s never invents a session or proof; real replay upgrades',rev=>{
  const old=JSON.parse(serializeProgress(createInitialProgress()));old.schemaRevision=rev;old.missions['w5-m1']={status:'completed',stars:2,attempts:3,hintsUsed:1,completedAt:time(0)};if(rev<8)delete old.works;if(rev===1)delete old.equipment;if(rev<3){delete old.abilities;delete old.missionCompletionEvidence;}
  const p=migrateProgress(old);expect(p.missionCompletionEvidence['w5-m1']?.kind).toBe('legacy-replay-only');expect(p.sessions['w5-m1']).toBeUndefined();expect(getWeekFiveMonksAccess(p).kind).toBe('historical-read-only');expect(isMissionUnlocked(p,'w5-m2')).toBe(true);
  const prior=parseProgress(formalW4M5Prerequisite());prior.missions['w5-m1']=p.missions['w5-m1']!;prior.missionCompletionEvidence['w5-m1']=p.missionCompletionEvidence['w5-m1'];prior.sessions['w5-m1']=run(updateWeekFiveMonksCode(createWeekFiveMonksSession(time(1)),solved,time(2)),3);const upgraded=completeMission(prior,'w5-m1',{stars:3,hintsUsed:0});expect(upgraded.missions['w5-m1']).toEqual(p.missions['w5-m1']);expect(parseProgress(serializeProgress(upgraded))).toEqual(upgraded);
 });
});
