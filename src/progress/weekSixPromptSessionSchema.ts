import { deriveWeekSixPromptSource,runWeekSixPrompt } from '../engine/weekSixPromptContract';
import type { MissionProgress,WeekSixClassificationWorkV1,WeekSixPromptCompletionEvidence,WeekSixPromptWorkV1 } from './types';
import type { WeekSixPromptMissionSession } from './weekSixPromptSession';

const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b),keys=(v:Record<string,unknown>,expected:string[])=>Reflect.ownKeys(v).length===expected.length&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&expected.includes(k)),bad=():never=>{throw Error('W6-M3 data invalid')};
function obj(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.getPrototypeOf(v)!==Object.prototype)bad();return v as Record<string,unknown>}
function iso(v:unknown):string{if(typeof v!=='string'||!/^[\d]{4}-[\d]{2}-[\d]{2}T[\d]{2}:[\d]{2}:[\d]{2}\.[\d]{3}Z$/.test(v)||new Date(v).toISOString()!==v)bad();return v as string}
function count(v:unknown){if(!Number.isSafeInteger(v)||(v as number)<0)bad();return v as number}
function valid(input:unknown,source:unknown){const run=runWeekSixPrompt(input,source);if(run.state==='source-invalid'||run.state==='input-invalid')bad();return run}
const seal=(v:Record<string,unknown>,run:unknown)=>[v.sourceWorkId,v.sourceVerifiedAt,v.source,v.input,run];

export function parseWeekSixPromptSession(value:unknown):WeekSixPromptMissionSession{
 const s=obj(value);if(!keys(s,['kind','sourceWorkId','sourceVerifiedAt','source','input','lastRun','failureSnapshot','totalRuns','missingFailures','taskFailures','factFailures','constraintFailures','usedHintTiers','firstBlockingConcept','lastRunAt','savedAt'])||s.kind!=='ai-prompt-brief-v1'||s.sourceWorkId!=='w6-m2-fan-evidence-classification')bad();
 const sourceAt=iso(s.sourceVerifiedAt),savedAt=iso(s.savedAt),source=obj(s.source);if(sourceAt>savedAt||source.classificationVerifiedAt!==sourceAt)bad();const canonical=valid(s.input,source),counts=[s.missingFailures,s.taskFailures,s.factFailures,s.constraintFailures].map(count),total=count(s.totalRuns),failures=counts.reduce((a,b)=>a+b,0),first=s.firstBlockingConcept;
 if(failures>total||!Array.isArray(s.usedHintTiers)||s.usedHintTiers.some(v=>typeof v!=='string'||!['observe','think','partial'].includes(v))||new Set(s.usedHintTiers).size!==s.usedHintTiers.length||![null,'task','facts','constraints','output-format'].includes(first as never)||(first===null)!==(failures===0))bad();
 if(first!==null&&!counts[0]&&!({task:counts[1],facts:counts[2],constraints:counts[3],'output-format':0} as Record<string,number>)[first as string])bad();
 if(s.lastRun===null){if(s.failureSnapshot!==null||s.lastRunAt!==null)bad()}else{const runAt=iso(s.lastRunAt);if(runAt<sourceAt||runAt>savedAt||!total||!same(s.lastRun,canonical)||!same(s.failureSnapshot,canonical.failureSnapshots[0]??null))bad()}
 return structuredClone(s) as unknown as WeekSixPromptMissionSession;
}
export function parseWeekSixPromptWork(value:unknown):WeekSixPromptWorkV1{
 const s=obj(value);if(!keys(s,['kind','workId','missionId','title','sourceWorkId','sourceVerifiedAt','source','input','run','createdAt','verifiedAt']))bad();const run=valid(s.input,s.source),source=obj(s.source),sourceAt=iso(s.sourceVerifiedAt),created=iso(s.createdAt),verified=iso(s.verifiedAt);
 if(s.kind!=='ai-prompt-brief-v1'||s.workId!=='w6-m3-second-attempt-brief'||s.missionId!=='w6-m3'||s.sourceWorkId!=='w6-m2-fan-evidence-classification'||typeof s.title!=='string'||!s.title||s.title.length>100||!run.completed||!same(s.run,run)||source.classificationVerifiedAt!==sourceAt||sourceAt>created||created>verified)bad();return structuredClone(s) as unknown as WeekSixPromptWorkV1;
}
export function parseWeekSixPromptEvidence(value:unknown,input:{mission:MissionProgress|undefined;formalWeekSixClassification:boolean;session:WeekSixPromptMissionSession|undefined;work:WeekSixPromptWorkV1|undefined;sourceWork:WeekSixClassificationWorkV1|undefined}):WeekSixPromptCompletionEvidence{
 const s=obj(value),mission=input.mission;if(!mission)return bad();if(s.kind==='legacy-replay-only'){if(!keys(s,['kind','completedAt','sourceVersion','sourceSchemaRevision'])||!((s.sourceVersion===1&&s.sourceSchemaRevision===null)||(s.sourceVersion===2&&s.sourceSchemaRevision===1)||(s.sourceVersion===3&&Number.isInteger(s.sourceSchemaRevision)&&(s.sourceSchemaRevision as number)>0&&(s.sourceSchemaRevision as number)<20))||s.completedAt!==mission.completedAt||input.work)bad();iso(s.completedAt);return structuredClone(s) as WeekSixPromptCompletionEvidence}
 if(!keys(s,['kind','completedAt','verifiedAt','sourceWorkId','sourceVerifiedAt','source','input','run','workId']))bad();const run=valid(s.input,s.source),completed=iso(s.completedAt),verified=iso(s.verifiedAt),session=input.session,work=input.work,sourceWork=input.sourceWork;
 if(s.kind!=='formal-v3'||!input.formalWeekSixClassification||!session||!work||!sourceWork||!run.completed||!same(s.run,run)||s.workId!==work.workId||s.sourceWorkId!==sourceWork.workId||s.sourceVerifiedAt!==sourceWork.verifiedAt||completed!==mission.completedAt||!same(s.source,deriveWeekSixPromptSource(sourceWork))||!same(seal(s,s.run),seal(session as unknown as Record<string,unknown>,session.lastRun))||!same(seal(s,s.run),seal(work as unknown as Record<string,unknown>,work.run))||session.lastRunAt===null||completed>work.createdAt||session.lastRunAt>session.savedAt||session.savedAt>work.createdAt||work.createdAt>verified||work.verifiedAt!==verified)bad();return structuredClone(s) as WeekSixPromptCompletionEvidence;
}
