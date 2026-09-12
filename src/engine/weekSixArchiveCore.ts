import { parseWeekSixRecordsPython } from './weekSixRecordsPythonGrammar';
import type { WeekSixRecordsPythonRun } from './weekSixRecordsPythonRunner';
import type { WeekSixFactCheckWorkV1 } from '../progress/types';
import { hasExactKeys,isPlainRecord,isUtcIso,sameData } from './strictData';

export type WeekSixArchiveScope='all-three'|'second-only'|null;
export type WeekSixArchiveFactId='attempt-one'|'attempt-two'|'attempt-three';
export type WeekSixArchiveConstraintId='provided-only'|'mark-insufficient'|'fill-gaps'|'correct-input';
export type WeekSixArchiveFormat='event-table'|'step-list'|null;
export interface WeekSixArchiveBriefInput{scope:WeekSixArchiveScope;factIds:WeekSixArchiveFactId[];constraintIds:WeekSixArchiveConstraintId[];format:WeekSixArchiveFormat}
export type WeekSixArchiveClaimId='first-and-third'|'second-therefore-passed'|'exactly-thirty-minutes';
export type WeekSixArchiveVerdict='supported'|'conflicting'|'insufficient'|null;
export type WeekSixArchiveEvidenceId='run-first'|'run-second'|'run-third'|'m2-second-not-passed'|'provided-material-scope'|'teacher-says-so';
export type WeekSixArchiveDisposition='keep-original'|'revise-second-result'|'cannot-confirm'|'mark-false'|null;
export interface WeekSixArchiveReviewInput{claimId:WeekSixArchiveClaimId;verdict:WeekSixArchiveVerdict;evidenceIds:WeekSixArchiveEvidenceId[];disposition:WeekSixArchiveDisposition}
export interface WeekSixArchiveInput{brief:WeekSixArchiveBriefInput;reviews:WeekSixArchiveReviewInput[]}
export interface WeekSixArchiveSource{kind:'w6-m5-archive-source-v1';materialVersion:'w6-m5-bounded-material-v1';factCheckWorkId:'w6-m4-second-attempt-review';factCheckVerifiedAt:string;factCheckSourceVerifiedAt:string;factCheckDigest:string}
export type WeekSixArchiveState='source-invalid'|'input-invalid'|'python-structure-invalid'|'python-worker-missing'|'python-worker-stale'|'python-output-conflict'|'scope-missing'|'scope-conflict'|'facts-missing'|'facts-conflict'|'constraints-missing'|'constraints-conflict'|'format-missing'|'review-verdict-missing'|'review-evidence-missing'|'review-disposition-missing'|'review-verdict-conflict'|'review-evidence-conflict'|'review-disposition-conflict'|'archive-proven';
export interface WeekSixArchiveFailureSnapshot{snapshotId:string;result:Exclude<WeekSixArchiveState,'archive-proven'>;field:'source'|'python'|'scope'|'facts'|'constraints'|'format'|'verdict'|'evidence'|'disposition';claimId:WeekSixArchiveClaimId|'archive'|'python'}
export interface WeekSixArchiveCoreRunResult{state:WeekSixArchiveState;completed:boolean;failureSnapshots:WeekSixArchiveFailureSnapshot[];penalty:{livesLost:0;resourcesLost:0;starsLost:0}}

export const WEEK_SIX_ARCHIVE_CLAIM_IDS:WeekSixArchiveClaimId[]=['first-and-third','second-therefore-passed','exactly-thirty-minutes'];
export const WEEK_SIX_ARCHIVE_FACT_IDS:WeekSixArchiveFactId[]=['attempt-one','attempt-two','attempt-three'];
const constraints:WeekSixArchiveConstraintId[]=['provided-only','mark-insufficient','fill-gaps','correct-input'];
const evidence:WeekSixArchiveEvidenceId[]=['run-first','run-second','run-third','m2-second-not-passed','provided-material-scope','teacher-says-so'];
const expected:[Exclude<WeekSixArchiveVerdict,null>,string[],Exclude<WeekSixArchiveDisposition,null>][]=[['supported',['run-first,run-third'],'keep-original'],['conflicting',['m2-second-not-passed','m2-second-not-passed,run-second'],'revise-second-result'],['insufficient',['provided-material-scope'],'cannot-confirm']];
const unique=(value:unknown,allowed:readonly string[])=>Array.isArray(value)&&value.length===new Set(value).size&&value.every(item=>typeof item==='string'&&allowed.includes(item));
export function createEmptyWeekSixArchiveInput():WeekSixArchiveInput{return{brief:{scope:null,factIds:[],constraintIds:[],format:null},reviews:WEEK_SIX_ARCHIVE_CLAIM_IDS.map(claimId=>({claimId,verdict:null,evidenceIds:[],disposition:null}))}}
function digest(value:unknown){let a=2166136261,b=2246822519,s=JSON.stringify(value);for(let i=0;i<s.length;i++){const n=s.charCodeAt(i);a=Math.imul(a^n,16777619);b=Math.imul(b^n,3266489917)}return `${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`}
export function deriveWeekSixArchiveSource(work:WeekSixFactCheckWorkV1):WeekSixArchiveSource{if(work?.kind!=='ai-fact-check-report-v1'||work.workId!=='w6-m4-second-attempt-review'||!isUtcIso(work.verifiedAt)||!isUtcIso(work.sourceVerifiedAt))throw Error('W6-M5 source work invalid');return{kind:'w6-m5-archive-source-v1',materialVersion:'w6-m5-bounded-material-v1',factCheckWorkId:work.workId,factCheckVerifiedAt:work.verifiedAt,factCheckSourceVerifiedAt:work.sourceVerifiedAt,factCheckDigest:digest(work)}}
export function isWeekSixArchiveSource(value:unknown):value is WeekSixArchiveSource{return isPlainRecord(value)&&hasExactKeys(value,['kind','materialVersion','factCheckWorkId','factCheckVerifiedAt','factCheckSourceVerifiedAt','factCheckDigest'])&&value.kind==='w6-m5-archive-source-v1'&&value.materialVersion==='w6-m5-bounded-material-v1'&&value.factCheckWorkId==='w6-m4-second-attempt-review'&&isUtcIso(value.factCheckVerifiedAt)&&isUtcIso(value.factCheckSourceVerifiedAt)&&typeof value.factCheckDigest==='string'&&/^[0-9a-f]{16}$/.test(value.factCheckDigest)}

export function parseWeekSixArchiveInput(value:unknown):WeekSixArchiveInput|null{if(!isPlainRecord(value)||!hasExactKeys(value,['brief','reviews'])||!isPlainRecord(value.brief)||!hasExactKeys(value.brief,['scope','factIds','constraintIds','format'])||![null,'all-three','second-only'].includes(value.brief.scope as never)||![null,'event-table','step-list'].includes(value.brief.format as never)||!unique(value.brief.factIds,WEEK_SIX_ARCHIVE_FACT_IDS)||!unique(value.brief.constraintIds,constraints)||!Array.isArray(value.reviews)||value.reviews.length!==3)return null;for(let i=0;i<3;i++){const r=value.reviews[i];if(!isPlainRecord(r)||!hasExactKeys(r,['claimId','verdict','evidenceIds','disposition'])||r.claimId!==WEEK_SIX_ARCHIVE_CLAIM_IDS[i]||![null,'supported','conflicting','insufficient'].includes(r.verdict as never)||![null,'keep-original','revise-second-result','cannot-confirm','mark-false'].includes(r.disposition as never)||!unique(r.evidenceIds,evidence))return null}return structuredClone(value) as unknown as WeekSixArchiveInput}
const penalty={livesLost:0,resourcesLost:0,starsLost:0} as const;
function fail(state:Exclude<WeekSixArchiveState,'archive-proven'>,field:WeekSixArchiveFailureSnapshot['field'],claimId:WeekSixArchiveFailureSnapshot['claimId']):WeekSixArchiveCoreRunResult{return{state,completed:false,failureSnapshots:[{snapshotId:`${claimId}:${state}:${field}`,result:state,field,claimId}],penalty}}
export function runWeekSixArchiveCore(code:unknown,workerValue:unknown,inputValue:unknown,sourceValue:unknown):WeekSixArchiveCoreRunResult{
  if(!isWeekSixArchiveSource(sourceValue))return fail('source-invalid','source','archive');
  const input=parseWeekSixArchiveInput(inputValue);if(!input)return fail('input-invalid','scope','archive');
  let parsed;try{parsed=parseWeekSixRecordsPython(code)}catch{return fail('python-structure-invalid','python','python')}
  if('state'in parsed)return fail('python-structure-invalid','python','python');
  if(!isPlainRecord(workerValue)||!hasExactKeys(workerValue,['trace','run']))return fail('python-worker-missing','python','python');
  const worker=workerValue as unknown as WeekSixRecordsPythonRun;
  if(!sameData(worker.trace,parsed.trace)||!sameData(worker.run,parsed.run))return fail('python-worker-stale','python','python');
  if(!parsed.run.completed)return fail('python-output-conflict','python','python');
  const b=input.brief;
  if(b.scope===null)return fail('scope-missing','scope','archive');if(b.scope!=='all-three')return fail('scope-conflict','scope','archive');
  if(!b.factIds.length)return fail('facts-missing','facts','archive');if(b.factIds.length!==3||!WEEK_SIX_ARCHIVE_FACT_IDS.every(id=>b.factIds.includes(id)))return fail('facts-conflict','facts','archive');
  if(!b.constraintIds.length)return fail('constraints-missing','constraints','archive');if(b.constraintIds.length!==2||!['provided-only','mark-insufficient'].every(id=>b.constraintIds.includes(id as WeekSixArchiveConstraintId)))return fail('constraints-conflict','constraints','archive');
  if(b.format===null)return fail('format-missing','format','archive');
  for(let i=0;i<3;i++){const r=input.reviews[i]!,[verdict,evidenceSets,disposition]=expected[i]!,claim=r.claimId;if(r.verdict===null)return fail('review-verdict-missing','verdict',claim);if(!r.evidenceIds.length)return fail('review-evidence-missing','evidence',claim);if(r.disposition===null)return fail('review-disposition-missing','disposition',claim);if(r.verdict!==verdict)return fail('review-verdict-conflict','verdict',claim);if(!evidenceSets.includes([...r.evidenceIds].sort().join(',')))return fail('review-evidence-conflict','evidence',claim);if(r.disposition!==disposition)return fail('review-disposition-conflict','disposition',claim)}
  return{state:'archive-proven',completed:true,failureSnapshots:[],penalty};
}
