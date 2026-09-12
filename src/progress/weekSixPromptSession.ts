import { createEmptyWeekSixPromptInput, deriveWeekSixPromptSource, runWeekSixPrompt, type WeekSixPromptFailureSnapshot, type WeekSixPromptInput, type WeekSixPromptRunResult, type WeekSixPromptSource } from '../engine/weekSixPromptContract';
import type { WeekSixClassificationWorkV1 } from './types';

export interface WeekSixPromptMissionSession{
  kind:'ai-prompt-brief-v1';sourceWorkId:'w6-m2-fan-evidence-classification';sourceVerifiedAt:string;source:WeekSixPromptSource;input:WeekSixPromptInput;lastRun:WeekSixPromptRunResult|null;failureSnapshot:WeekSixPromptFailureSnapshot|null;totalRuns:number;missingFailures:number;taskFailures:number;factFailures:number;constraintFailures:number;usedHintTiers:Array<'observe'|'think'|'partial'>;firstBlockingConcept:'task'|'facts'|'constraints'|'output-format'|null;lastRunAt:string|null;savedAt:string;
}
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function time(v:string){if(!UTC.test(v)||new Date(v).toISOString()!==v)throw Error('W6-M3 time must be UTC ISO');}
function after(s:WeekSixPromptMissionSession,now:string){time(now);if(now<s.savedAt)throw Error('W6-M3 session time cannot go backwards');}
function inc(v:number){if(!Number.isSafeInteger(v)||v<0||v===Number.MAX_SAFE_INTEGER)throw Error('W6-M3 counter invalid');return v+1}
export function createWeekSixPromptSession(work:WeekSixClassificationWorkV1,now:string):WeekSixPromptMissionSession{
  time(now);const source=deriveWeekSixPromptSource(work);if(source.classificationVerifiedAt>now)throw Error('W6-M3 source is newer than session');
  return{kind:'ai-prompt-brief-v1',sourceWorkId:work.workId,sourceVerifiedAt:work.verifiedAt,source,input:createEmptyWeekSixPromptInput(),lastRun:null,failureSnapshot:null,totalRuns:0,missingFailures:0,taskFailures:0,factFailures:0,constraintFailures:0,usedHintTiers:[],firstBlockingConcept:null,lastRunAt:null,savedAt:now};
}
export function updateWeekSixPromptInput(session:WeekSixPromptMissionSession,input:WeekSixPromptInput,now:string):WeekSixPromptMissionSession{
  after(session,now);const preview=runWeekSixPrompt(input,session.source);if(preview.state==='source-invalid'||preview.state==='input-invalid')throw Error('W6-M3 prompt input invalid');if(same(input,session.input))return structuredClone(session);
  return{...structuredClone(session),input:structuredClone(input),lastRun:null,failureSnapshot:null,lastRunAt:null,savedAt:now};
}
export function recordWeekSixPromptRun(session:WeekSixPromptMissionSession,input:WeekSixPromptInput,run:WeekSixPromptRunResult,now:string):WeekSixPromptMissionSession{
  after(session,now);if(!same(input,session.input))throw Error('W6-M3 run must use current saved prompt input');const canonical=runWeekSixPrompt(session.input,session.source);if(canonical.state==='source-invalid'||canonical.state==='input-invalid'||!same(run,canonical))throw Error('W6-M3 run must be deterministically recomputed');
  const next=structuredClone(session);next.lastRun=structuredClone(canonical);next.failureSnapshot=structuredClone(canonical.failureSnapshots[0]??null);next.totalRuns=inc(next.totalRuns);next.lastRunAt=now;next.savedAt=now;
  const state=canonical.state,concept=state==='task-missing'||state==='task-conflict'?'task':state==='fact-missing'||state==='fact-conflict'?'facts':state==='constraint-missing'||state==='constraint-conflict'?'constraints':state==='output-format-missing'?'output-format':null;
  if(state.endsWith('-missing'))next.missingFailures=inc(next.missingFailures);else if(concept==='task')next.taskFailures=inc(next.taskFailures);else if(concept==='facts')next.factFailures=inc(next.factFailures);else if(concept==='constraints')next.constraintFailures=inc(next.constraintFailures);
  if(next.firstBlockingConcept===null&&concept!==null)next.firstBlockingConcept=concept;return next;
}
export function recordWeekSixPromptHint(session:WeekSixPromptMissionSession,tier:'observe'|'think'|'partial',now:string):WeekSixPromptMissionSession{after(session,now);if(!['observe','think','partial'].includes(tier))throw Error('W6-M3 hint tier invalid');const next=structuredClone(session);if(!next.usedHintTiers.includes(tier))next.usedHintTiers.push(tier);next.savedAt=now;return next}
