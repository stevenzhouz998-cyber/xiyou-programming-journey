import { describe, expect, it, vi } from 'vitest';
import { formalW6M3Completion } from '../../e2e/support/w6m1Prerequisite';
import { runWeekSixFactCheck, type WeekSixFactCheckInput } from '../engine/weekSixFactCheckContract';
import { completeMission, getWeekSixFactCheckAccess, isMissionUnlocked, serializeProgress } from './progress';
import { parseProgress } from './schema';
import { createWeekSixFactCheckSession, recordWeekSixFactCheckRun, updateWeekSixFactCheckInput } from './weekSixFactCheckSession';

const at=(second:number)=>`2030-01-02T04:05:${String(second).padStart(2,'0')}.000Z`;
const solved:WeekSixFactCheckInput={reviews:[
  {statementId:'gained-then-reclaimed',verdict:'supported',evidenceIds:['chapter-60-true-fan','chapter-61-fan-reclaimed'],disposition:'keep-original'},
  {statementId:'gained-therefore-passed',verdict:'conflicting',evidenceIds:['chapter-60-true-fan','chapter-61-fan-reclaimed','m2-second-not-passed'],disposition:'revise-not-passed'},
  {statementId:'exactly-ten-minutes',verdict:'insufficient',evidenceIds:['provided-material-scope'],disposition:'cannot-confirm'},
]};

describe('W6-M4 formal fact-check progress',()=>{
  it('binds M3 source, session, run, work and proof, preserves M3, and unlocks M5',()=>{
    const base=parseProgress(formalW6M3Completion()),source=base.works['w6-m3-second-attempt-brief']!;let session=createWeekSixFactCheckSession(source,at(10));session=updateWeekSixFactCheckInput(session,solved,at(11));session=recordWeekSixFactCheckRun(session,solved,runWeekSixFactCheck(solved,session.source),at(12));vi.setSystemTime(new Date(at(13)));
    const completed=completeMission({...base,sessions:{...base.sessions,'w6-m4':session},savedAt:at(12)},'w6-m4',{stars:3,hintsUsed:0});
    expect(completed).toMatchObject({schemaRevision:22,missions:{'w6-m4':{status:'completed'}},missionCompletionEvidence:{'w6-m4':{kind:'formal-v3',sourceWorkId:source.workId,workId:'w6-m4-second-attempt-review'}}});expect(completed.works['w6-m4-second-attempt-review']?.run.completed).toBe(true);expect(isMissionUnlocked(completed,'w6-m5')).toBe(true);expect(completed.works['w6-m3-second-attempt-brief']).toEqual(source);expect(parseProgress(serializeProgress(completed))).toEqual(completed);expect(completeMission(completed,'w6-m4',{stars:1,hintsUsed:2})).toBe(completed);
  });
  it('migrates revision 20 M4 completion to history without fabricating fact-check data or M5 access',()=>{
    const raw=JSON.parse(formalW6M3Completion());raw.schemaRevision=20;raw.missions['w6-m4']={status:'completed',stars:2,attempts:1,hintsUsed:0,completedAt:at(9)};const migrated=parseProgress(JSON.stringify(raw));expect(migrated.schemaRevision).toBe(22);expect(migrated.missionCompletionEvidence['w6-m4']).toMatchObject({kind:'legacy-replay-only',sourceSchemaRevision:20});expect(migrated.sessions['w6-m4']).toBeUndefined();expect(migrated.works['w6-m4-second-attempt-review']).toBeUndefined();expect(getWeekSixFactCheckAccess(migrated)).toEqual({kind:'formal',upgradingLegacy:true});expect(isMissionUnlocked(migrated,'w6-m5')).toBe(false);
  });
  it('rejects a stale source and a forged successful run',()=>{
    const base=parseProgress(formalW6M3Completion()),source=base.works['w6-m3-second-attempt-brief']!,session=createWeekSixFactCheckSession(source,at(20));const stale=structuredClone(session);stale.source.promptVerifiedAt=at(9);expect(()=>parseProgress(JSON.stringify({...base,sessions:{...base.sessions,'w6-m4':stale},savedAt:at(22)}))).toThrow();const forged=structuredClone(session);forged.lastRun=runWeekSixFactCheck(solved,session.source);forged.lastRunAt=at(21);forged.savedAt=at(21);forged.totalRuns=1;expect(()=>completeMission({...base,sessions:{...base.sessions,'w6-m4':forged},savedAt:at(22)},'w6-m4',{stars:3,hintsUsed:0})).toThrow();
  });
});
