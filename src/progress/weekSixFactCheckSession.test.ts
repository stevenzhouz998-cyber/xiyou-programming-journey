import { describe, expect, it } from 'vitest';
import { formalW6M3Completion } from '../../e2e/support/w6m1Prerequisite';
import { runWeekSixFactCheck, type WeekSixFactCheckInput } from '../engine/weekSixFactCheckContract';
import { parseProgress } from './schema';
import { createWeekSixFactCheckSession, recordWeekSixFactCheckHint, recordWeekSixFactCheckRun, updateWeekSixFactCheckInput } from './weekSixFactCheckSession';

const NOW='2030-09-12T04:00:00.000Z',LATER='2030-09-12T04:01:00.000Z';
const work=parseProgress(formalW6M3Completion()).works['w6-m3-second-attempt-brief']!;
const solved:WeekSixFactCheckInput={reviews:[
  {statementId:'gained-then-reclaimed',verdict:'supported',evidenceIds:['chapter-60-true-fan','chapter-61-fan-reclaimed'],disposition:'keep-original'},
  {statementId:'gained-therefore-passed',verdict:'conflicting',evidenceIds:['chapter-60-true-fan','chapter-61-fan-reclaimed','m2-second-not-passed'],disposition:'revise-not-passed'},
  {statementId:'exactly-ten-minutes',verdict:'insufficient',evidenceIds:['provided-material-scope'],disposition:'cannot-confirm'},
]};

describe('W6-M4 fact-check session',()=>{
  it('copies a proof-linked M3 work and persists a completely blank review',()=>{
    expect(createWeekSixFactCheckSession(work,NOW)).toMatchObject({kind:'ai-fact-check-report-v1',sourceWorkId:work.workId,input:{reviews:[{verdict:null,evidenceIds:[],disposition:null},{verdict:null,evidenceIds:[],disposition:null},{verdict:null,evidenceIds:[],disposition:null}]},lastRun:null,totalRuns:0});
  });
  it('invalidates stale success after any visible choice changes',()=>{
    let session=updateWeekSixFactCheckInput(createWeekSixFactCheckSession(work,NOW),solved,LATER);session=recordWeekSixFactCheckRun(session,solved,runWeekSixFactCheck(solved,session.source),LATER);
    const changed=structuredClone(solved);changed.reviews[0].disposition=null;const next=updateWeekSixFactCheckInput(session,changed,'2030-09-12T04:02:00.000Z');expect(next.lastRun).toBeNull();expect(next.failureSnapshot).toBeNull();expect(next.totalRuns).toBe(1);
  });
  it('records only the first deterministic zero-penalty blocker',()=>{
    const initial=createWeekSixFactCheckSession(work,NOW),run=runWeekSixFactCheck(initial.input,initial.source),checked=recordWeekSixFactCheckRun(initial,initial.input,run,LATER);
    expect(checked).toMatchObject({totalRuns:1,missingFailures:1,firstBlockingConcept:'verdict',failureSnapshot:{statementId:'gained-then-reclaimed',field:'verdict'}});expect(checked.lastRun?.penalty).toEqual({livesLost:0,resourcesLost:0,starsLost:0});
  });
  it('records hints without selecting, running, or correcting',()=>{
    const initial=createWeekSixFactCheckSession(work,NOW),hinted=recordWeekSixFactCheckHint(initial,'observe',LATER);expect(hinted.input).toEqual(initial.input);expect(hinted.lastRun).toBeNull();expect(hinted.totalRuns).toBe(0);expect(hinted.usedHintTiers).toEqual(['observe']);
  });
});
