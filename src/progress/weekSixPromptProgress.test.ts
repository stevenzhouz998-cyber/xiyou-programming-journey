import { describe, expect, it, vi } from 'vitest';
import { formalW6M2Completion } from '../../e2e/support/w6m1Prerequisite';
import { runWeekSixPrompt, type WeekSixPromptInput } from '../engine/weekSixPromptContract';
import { completeMission, getWeekSixPromptAccess, isMissionUnlocked, serializeProgress } from './progress';
import { parseProgress } from './schema';
import { createWeekSixPromptSession, recordWeekSixPromptRun, updateWeekSixPromptInput } from './weekSixPromptSession';

const at=(second:number)=>`2030-01-02T03:05:${String(second).padStart(2,'0')}.000Z`;
const solved:WeekSixPromptInput={task:'organize-second-attempt',factIds:['sun-as-bull-gets-fan','bull-as-bajie-takes-fan','second-not-passed'],constraintIds:['follow-canon','no-invention'],outputFormat:'step-list'};

describe('W6-M3 formal prompt progress',()=>{
  it('binds source, session, run and work while preserving M2 and unlocking M4',()=>{
    const base=parseProgress(formalW6M2Completion()),source=base.works['w6-m2-fan-evidence-classification']!;
    let session=createWeekSixPromptSession(source,at(10));session=updateWeekSixPromptInput(session,solved,at(11));session=recordWeekSixPromptRun(session,solved,runWeekSixPrompt(solved,session.source),at(12));vi.setSystemTime(new Date(at(13)));
    const completed=completeMission({...base,sessions:{...base.sessions,'w6-m3':session},savedAt:at(12)},'w6-m3',{stars:3,hintsUsed:0});
    expect(completed).toMatchObject({schemaRevision:22,missions:{'w6-m3':{status:'completed'}},missionCompletionEvidence:{'w6-m3':{kind:'formal-v3',sourceWorkId:source.workId,workId:'w6-m3-second-attempt-brief'}}});
    expect(completed.works['w6-m3-second-attempt-brief']?.run.completed).toBe(true);expect(isMissionUnlocked(completed,'w6-m4')).toBe(true);expect(completed.works['w6-m2-fan-evidence-classification']).toEqual(source);expect(parseProgress(serializeProgress(completed))).toEqual(completed);expect(completeMission(completed,'w6-m3',{stars:1,hintsUsed:2})).toBe(completed);
  });
  it('migrates revision 19 M3 completion to history without fabricating prompt data or M4 access',()=>{
    const raw=JSON.parse(formalW6M2Completion());raw.schemaRevision=19;raw.missions['w6-m3']={status:'completed',stars:2,attempts:1,hintsUsed:0,completedAt:at(9)};
    const migrated=parseProgress(JSON.stringify(raw));expect(migrated.schemaRevision).toBe(22);expect(migrated.missionCompletionEvidence['w6-m3']).toMatchObject({kind:'legacy-replay-only',sourceSchemaRevision:19});expect(migrated.sessions['w6-m3']).toBeUndefined();expect(migrated.works['w6-m3-second-attempt-brief']).toBeUndefined();expect(getWeekSixPromptAccess(migrated)).toEqual({kind:'formal',upgradingLegacy:true});expect(isMissionUnlocked(migrated,'w6-m4')).toBe(false);
  });
  it('rejects a stale session source and a forged successful run',()=>{
    const base=parseProgress(formalW6M2Completion()),source=base.works['w6-m2-fan-evidence-classification']!,session=createWeekSixPromptSession(source,at(20));const stale=structuredClone(session);stale.source.classificationVerifiedAt=at(9);expect(()=>parseProgress(JSON.stringify({...base,sessions:{...base.sessions,'w6-m3':stale},savedAt:at(22)}))).toThrow();
    const forged=structuredClone(session);forged.lastRun=runWeekSixPrompt(solved,session.source);forged.lastRunAt=at(21);forged.savedAt=at(21);forged.totalRuns=1;expect(()=>completeMission({...base,sessions:{...base.sessions,'w6-m3':forged},savedAt:at(22)},'w6-m3',{stars:3,hintsUsed:0})).toThrow();
  });
});
