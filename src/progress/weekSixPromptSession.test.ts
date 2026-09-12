import { describe, expect, it } from 'vitest';
import { WEEK_SIX_RECORD_FACTS } from '../engine/weekSixRecordsContract';
import { runWeekSixClassification, type WeekSixClassificationInput } from '../engine/weekSixClassificationContract';
import { deriveWeekSixPromptSource, runWeekSixPrompt, type WeekSixPromptInput } from '../engine/weekSixPromptContract';
import { createWeekSixPromptSession, recordWeekSixPromptHint, recordWeekSixPromptRun, updateWeekSixPromptInput } from './weekSixPromptSession';

const NOW = '2026-09-12T03:00:00.000Z';
const LATER = '2026-09-12T03:01:00.000Z';
const classificationInput: WeekSixClassificationInput = { labels: [
  { attempt: '一调', fanAuthenticity: 'false', fanEvidenceId: 'one-not-real', passageOutcome: 'not-passed', passageEvidenceId: 'one-fire-worse' },
  { attempt: '二调', fanAuthenticity: 'genuine', fanEvidenceId: 'two-true-fan', passageOutcome: 'not-passed', passageEvidenceId: 'two-stolen-back' },
  { attempt: '三调', fanAuthenticity: 'genuine', fanEvidenceId: 'three-true-fan', passageOutcome: 'passed', passageEvidenceId: 'three-fire-cleared' },
], practiceAuthenticity: 'insufficient' };
const classificationRun = runWeekSixClassification(classificationInput, WEEK_SIX_RECORD_FACTS);
const work = { kind:'ai-evidence-classification-v1' as const,workId: 'w6-m2-fan-evidence-classification' as const,missionId:'w6-m2' as const,title:'test',createdAt:NOW, verifiedAt: NOW, sourceWorkId: 'w6-m1-structured-records-table' as const, sourceVerifiedAt: '2026-09-12T02:00:00.000Z', sourceRows: WEEK_SIX_RECORD_FACTS.map(row=>({...row})), input: classificationInput, run: classificationRun };
const solved: WeekSixPromptInput = { task:'organize-second-attempt',factIds:['sun-as-bull-gets-fan','bull-as-bajie-takes-fan','second-not-passed'],constraintIds:['follow-canon','no-invention'],outputFormat:'event-table' };

describe('W6-M3 prompt session', () => {
  it('copies its M2 proof-linked source and persists a blank draft', () => {
    const session = createWeekSixPromptSession(work, NOW);
    expect(session).toMatchObject({ kind:'ai-prompt-brief-v1',sourceWorkId:work.workId,sourceVerifiedAt:NOW,input:{task:null,factIds:[],constraintIds:[],outputFormat:null},lastRun:null,totalRuns:0 });
    expect(session.source).toEqual(deriveWeekSixPromptSource(work));
  });

  it('invalidates stale success when visible input changes', () => {
    let session = updateWeekSixPromptInput(createWeekSixPromptSession(work,NOW),solved,LATER);
    session = recordWeekSixPromptRun(session,solved,runWeekSixPrompt(solved,session.source),LATER);
    const changed={...solved,outputFormat:'step-list' as const};
    const next=updateWeekSixPromptInput(session,changed,'2026-09-12T03:02:00.000Z');
    expect(next.lastRun).toBeNull(); expect(next.failureSnapshot).toBeNull(); expect(next.totalRuns).toBe(1);
  });

  it('records only the first deterministic blocker with zero punishment', () => {
    const initial=createWeekSixPromptSession(work,NOW),run=runWeekSixPrompt(initial.input,initial.source);
    const checked=recordWeekSixPromptRun(initial,initial.input,run,LATER);
    expect(checked).toMatchObject({totalRuns:1,missingFailures:1,firstBlockingConcept:'task',failureSnapshot:{result:'task-missing'}});
    expect(checked.lastRun?.penalty).toEqual({livesLost:0,resourcesLost:0,starsLost:0});
    expect(()=>recordWeekSixPromptRun(initial,solved,run,LATER)).toThrow(/current saved prompt input/i);
  });

  it('records hints without selecting, running or solving', () => {
    const initial=createWeekSixPromptSession(work,NOW),hinted=recordWeekSixPromptHint(initial,'observe',LATER);
    expect(hinted.input).toEqual(initial.input); expect(hinted.lastRun).toBeNull(); expect(hinted.totalRuns).toBe(0); expect(hinted.usedHintTiers).toEqual(['observe']);
  });
});
