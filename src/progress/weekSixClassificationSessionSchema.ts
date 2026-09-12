import { runWeekSixClassification } from '../engine/weekSixClassificationContract';
import type { MissionProgress, WeekSixClassificationCompletionEvidence, WeekSixClassificationWorkV1, WeekSixRecordsWorkV1 } from './types';
import type { WeekSixClassificationMissionSession } from './weekSixClassificationSession';
import { hasExactKeys,isLegacyReplayEvidence,isPlainRecord,isSafeCount,isUtcIso,sameData } from '../engine/strictData';

function obj(v:unknown,l:string):Record<string,unknown>{if(!isPlainRecord(v))throw Error('W6-M2 数据无效');return v}
function exact(v:Record<string,unknown>,keys:string[],l:string){if(!hasExactKeys(v,keys))throw Error('W6-M2 数据无效')}
function iso(v:unknown,l:string){if(!isUtcIso(v))throw Error('W6-M2 数据无效');return v}
function count(v:unknown,l:string){if(!isSafeCount(v))throw Error('W6-M2 数据无效');return v}
function validInput(input:unknown,rows:unknown){const run=runWeekSixClassification(input,rows);if(run.state==='source-invalid'||run.state==='input-invalid')throw Error('W6-M2 数据无效');return run}

export function parseWeekSixClassificationSession(value:unknown):WeekSixClassificationMissionSession{
 const s=obj(value,'W6-M2 session');exact(s,['kind','sourceWorkId','sourceVerifiedAt','sourceRows','input','groupingDimension','lastRun','failureSnapshot','totalChecks','incompleteChecks','labelFailures','evidenceFailures','practiceFailures','usedHintTiers','firstBlockingConcept','lastCheckedAt','savedAt'],'W6-M2 session');
 if(s.kind!=='ai-evidence-classification-v1'||s.sourceWorkId!=='w6-m1-structured-records-table'||!['authenticity','passage'].includes(String(s.groupingDimension)))throw Error('W6-M2 数据无效');
 const sourceVerifiedAt=iso(s.sourceVerifiedAt,'sourceVerifiedAt'),savedAt=iso(s.savedAt,'savedAt');if(sourceVerifiedAt>savedAt)throw Error('W6-M2 数据无效');
 const canonical=validInput(s.input,s.sourceRows);const total=count(s.totalChecks,'totalChecks'),inc=count(s.incompleteChecks,'incompleteChecks'),labels=count(s.labelFailures,'labelFailures'),evidence=count(s.evidenceFailures,'evidenceFailures'),practice=count(s.practiceFailures,'practiceFailures');if(inc+labels+evidence+practice>total)throw Error('W6-M2 数据无效');
 if(!Array.isArray(s.usedHintTiers)||s.usedHintTiers.some(v=>!['observe','think','partial'].includes(String(v)))||new Set(s.usedHintTiers).size!==s.usedHintTiers.length)throw Error('W6-M2 数据无效');
 if(![null,'selection','label','evidence','practice'].includes(s.firstBlockingConcept as never))throw Error('W6-M2 数据无效');const none=inc===0&&labels===0&&evidence===0&&practice===0;if((s.firstBlockingConcept===null)!==none||(s.firstBlockingConcept==='selection'&&inc===0)||(s.firstBlockingConcept==='label'&&labels===0)||(s.firstBlockingConcept==='evidence'&&evidence===0)||(s.firstBlockingConcept==='practice'&&practice===0))throw Error('W6-M2 数据无效');
 if(s.lastRun===null){if(s.failureSnapshot!==null||s.lastCheckedAt!==null)throw Error('W6-M2 数据无效');}else{const at=iso(s.lastCheckedAt,'lastCheckedAt');if(at<sourceVerifiedAt||at>savedAt||total<1||!sameData(s.lastRun,canonical)||!sameData(s.failureSnapshot,canonical.failureSnapshots[0]??null))throw Error('W6-M2 数据无效');}
 return structuredClone(s) as unknown as WeekSixClassificationMissionSession;
}

export function parseWeekSixClassificationWork(value:unknown):WeekSixClassificationWorkV1{
 const s=obj(value,'W6-M2 work');exact(s,['kind','workId','missionId','title','sourceWorkId','sourceVerifiedAt','sourceRows','input','run','createdAt','verifiedAt'],'W6-M2 work');const run=validInput(s.input,s.sourceRows);if(s.kind!=='ai-evidence-classification-v1'||s.workId!=='w6-m2-fan-evidence-classification'||s.missionId!=='w6-m2'||s.sourceWorkId!=='w6-m1-structured-records-table'||typeof s.title!=='string'||!s.title||s.title.length>100||!run.completed||run.state!=='classification-proven'||!sameData(s.run,run))throw Error('W6-M2 数据无效');const sourceAt=iso(s.sourceVerifiedAt,'sourceVerifiedAt'),created=iso(s.createdAt,'createdAt'),verified=iso(s.verifiedAt,'verifiedAt');if(sourceAt>created||created>verified)throw Error('W6-M2 数据无效');return structuredClone(s) as unknown as WeekSixClassificationWorkV1;
}

export function parseWeekSixClassificationEvidence(value:unknown,input:{mission:MissionProgress|undefined;formalWeekSixRecords:boolean;session:WeekSixClassificationMissionSession|undefined;work:WeekSixClassificationWorkV1|undefined;sourceWork:WeekSixRecordsWorkV1|undefined}):WeekSixClassificationCompletionEvidence{
 const s=obj(value,'W6-M2 evidence');if(!input.mission)throw Error('W6-M2 数据无效');if(s.kind==='legacy-replay-only'){if(!isLegacyReplayEvidence(s,input.mission,input.work,19))throw Error('W6-M2 数据无效');return structuredClone(s) as WeekSixClassificationCompletionEvidence}
 exact(s,['kind','completedAt','verifiedAt','sourceWorkId','sourceVerifiedAt','sourceRows','input','run','workId'],'W6-M2 formal');const run=validInput(s.input,s.sourceRows),completed=iso(s.completedAt,'completedAt'),verified=iso(s.verifiedAt,'verifiedAt');const session=input.session,work=input.work,source=input.sourceWork;
 if(s.kind!=='formal-v3'||!input.formalWeekSixRecords||!session||!work||!source||s.workId!==work.workId||s.sourceWorkId!==source.workId||s.sourceVerifiedAt!==source.verifiedAt||!sameData(s.sourceRows,source.run.rows)||completed!==input.mission.completedAt||completed>work.createdAt||!run.completed||!sameData(s.run,run)||session.lastCheckedAt===null||session.lastCheckedAt>session.savedAt||session.savedAt>work.createdAt||work.createdAt>verified||work.verifiedAt!==verified||!sameData(session.input,s.input)||!sameData(session.sourceRows,s.sourceRows)||session.sourceVerifiedAt!==s.sourceVerifiedAt||!sameData(session.lastRun,run)||!sameData(work.input,s.input)||!sameData(work.sourceRows,s.sourceRows)||work.sourceVerifiedAt!==s.sourceVerifiedAt||!sameData(work.run,run))throw Error('W6-M2 数据无效');return structuredClone(s) as WeekSixClassificationCompletionEvidence;
}
