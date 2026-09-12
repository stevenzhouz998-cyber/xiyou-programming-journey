import { runWeekSixPrompt, type WeekSixPromptInput, type WeekSixPromptRunResult, type WeekSixPromptSource } from './weekSixPromptContract';
import type { WeekSixPromptWorkV1 } from '../progress/types';
import { hasExactKeys,isPlainRecord,isUtcIso,sameData } from './strictData';

export type WeekSixFactCheckStatementId='gained-then-reclaimed'|'gained-therefore-passed'|'exactly-ten-minutes';
export type WeekSixFactCheckVerdict='supported'|'conflicting'|'insufficient'|null;
export type WeekSixFactCheckEvidenceId='chapter-60-true-fan'|'chapter-61-fan-reclaimed'|'m2-second-not-passed'|'provided-material-scope'|'practice-answer-says-so'|'third-attempt-cleared-fire';
export type WeekSixFactCheckDisposition='keep-original'|'revise-not-passed'|'cannot-confirm'|'mark-false'|null;
export interface WeekSixFactCheckReview{statementId:WeekSixFactCheckStatementId;verdict:WeekSixFactCheckVerdict;evidenceIds:WeekSixFactCheckEvidenceId[];disposition:WeekSixFactCheckDisposition}
export interface WeekSixFactCheckInput{reviews:WeekSixFactCheckReview[]}
export interface WeekSixFactCheckSource{kind:'w6-m4-review-source-v1';materialVersion:'w6-m4-bounded-material-v1';promptWorkId:'w6-m3-second-attempt-brief';promptVerifiedAt:string;promptSourceVerifiedAt:string;promptSource:WeekSixPromptSource;promptInput:WeekSixPromptInput;promptRun:WeekSixPromptRunResult}
export type WeekSixFactCheckState='source-invalid'|'input-invalid'|'verdict-missing'|'evidence-missing'|'disposition-missing'|'verdict-conflict'|'evidence-conflict'|'disposition-conflict'|'review-proven';
export interface WeekSixFactCheckFailureSnapshot{snapshotId:string;result:Exclude<WeekSixFactCheckState,'review-proven'>;statementId:WeekSixFactCheckStatementId|'source'|'input';field:'source'|'input'|'verdict'|'evidence'|'disposition'}
export interface WeekSixFactCheckReportRow{statementId:WeekSixFactCheckStatementId;originalClaim:string;verdict:WeekSixFactCheckVerdict;evidence:Array<{id:WeekSixFactCheckEvidenceId;text:string}>;disposition:WeekSixFactCheckDisposition;revision:string|null}
export interface WeekSixFactCheckRunResult{state:WeekSixFactCheckState;completed:boolean;report:WeekSixFactCheckReportRow[];failureSnapshots:WeekSixFactCheckFailureSnapshot[];penalty:{livesLost:0;resourcesLost:0;starsLost:0}}

export const WEEK_SIX_FACT_CHECK_STATEMENTS:ReadonlyArray<{id:WeekSixFactCheckStatementId;text:string}>=[
 {id:'gained-then-reclaimed',text:'二调取得真扇，后来又被骗回。'},
 {id:'gained-therefore-passed',text:'二调取得真扇，所以当次已经灭火通行。'},
 {id:'exactly-ten-minutes',text:'二调取扇过程恰好用了十分钟。'},
] as const;
export const WEEK_SIX_FACT_CHECK_EVIDENCE:ReadonlyArray<{id:WeekSixFactCheckEvidenceId;text:string;source:string}>=[
 {id:'chapter-60-true-fan',text:'第六十回转述：悟空变作牛魔王模样，取得真扇。',source:'《西游记》第六十回转述'},
 {id:'chapter-61-fan-reclaimed',text:'第六十一回转述：牛魔王变作八戒模样，骗回真扇。',source:'《西游记》第六十一回转述'},
 {id:'m2-second-not-passed',text:'M2 正式作品：二调当次没有完成灭火通行。',source:'W6-M2 正式分类作品（由 M3 来源保留）'},
 {id:'provided-material-scope',text:'本页核查范围：M3 正式作品与本页给出的第六十至六十一回有限转述均未提供具体分钟数。',source:'本页给出的有限材料范围'},
 {id:'practice-answer-says-so',text:'待核验回答里这样写了。',source:'待核验回答自身'},
 {id:'third-attempt-cleared-fire',text:'三调最终借得真扇并灭火通行。',source:'三调材料'},
] as const;

const IDS=WEEK_SIX_FACT_CHECK_STATEMENTS.map(item=>item.id),EVIDENCE_IDS=new Set(WEEK_SIX_FACT_CHECK_EVIDENCE.map(item=>item.id));
const EXPECTED:Record<WeekSixFactCheckStatementId,{verdict:Exclude<WeekSixFactCheckVerdict,null>;requiredEvidenceIds:WeekSixFactCheckEvidenceId[];allowedEvidenceIds:WeekSixFactCheckEvidenceId[];disposition:Exclude<WeekSixFactCheckDisposition,null>}>= {
 'gained-then-reclaimed':{verdict:'supported',requiredEvidenceIds:['chapter-60-true-fan','chapter-61-fan-reclaimed'],allowedEvidenceIds:['chapter-60-true-fan','chapter-61-fan-reclaimed'],disposition:'keep-original'},
 'gained-therefore-passed':{verdict:'conflicting',requiredEvidenceIds:['m2-second-not-passed'],allowedEvidenceIds:['chapter-60-true-fan','chapter-61-fan-reclaimed','m2-second-not-passed'],disposition:'revise-not-passed'},
 'exactly-ten-minutes':{verdict:'insufficient',requiredEvidenceIds:['provided-material-scope'],allowedEvidenceIds:['provided-material-scope'],disposition:'cannot-confirm'},
};
const REVISIONS:Record<Exclude<WeekSixFactCheckDisposition,null>,string>={
 'keep-original':'二调取得真扇，后来又被骗回。',
 'revise-not-passed':'二调取得真扇，后来又被骗回，所以当次没有完成灭火通行。',
 'cannot-confirm':'本页给出的材料不足以确认具体分钟数，暂不能确认是否恰好用了十分钟。',
 'mark-false':'二调取扇过程不是十分钟。',
};
const evidenceFits=(selected:readonly WeekSixFactCheckEvidenceId[],expected:(typeof EXPECTED)[WeekSixFactCheckStatementId])=>expected.requiredEvidenceIds.every(id=>selected.includes(id))&&selected.every(id=>expected.allowedEvidenceIds.includes(id));

export function createEmptyWeekSixFactCheckInput():WeekSixFactCheckInput{return{reviews:IDS.map(statementId=>({statementId,verdict:null,evidenceIds:[],disposition:null}))}}
export function deriveWeekSixFactCheckSource(work:WeekSixPromptWorkV1):WeekSixFactCheckSource{
 if(!isUtcIso(work.verifiedAt)||!isUtcIso(work.sourceVerifiedAt)||work.sourceVerifiedAt>work.verifiedAt)throw Error('W6-M4 source work invalid');const run=runWeekSixPrompt(work.input,work.source);if(!run.completed||!sameData(run,work.run))throw Error('W6-M4 source work invalid');
 return{kind:'w6-m4-review-source-v1',materialVersion:'w6-m4-bounded-material-v1',promptWorkId:work.workId,promptVerifiedAt:work.verifiedAt,promptSourceVerifiedAt:work.sourceVerifiedAt,promptSource:structuredClone(work.source),promptInput:structuredClone(work.input),promptRun:structuredClone(run)};
}
function validSource(value:unknown):value is WeekSixFactCheckSource{
 if(!isPlainRecord(value)||!hasExactKeys(value,['kind','materialVersion','promptWorkId','promptVerifiedAt','promptSourceVerifiedAt','promptSource','promptInput','promptRun'])||value.kind!=='w6-m4-review-source-v1'||value.materialVersion!=='w6-m4-bounded-material-v1'||value.promptWorkId!=='w6-m3-second-attempt-brief'||!isUtcIso(value.promptVerifiedAt)||!isUtcIso(value.promptSourceVerifiedAt)||value.promptSourceVerifiedAt>value.promptVerifiedAt)return false;
 try{const run=runWeekSixPrompt(value.promptInput,value.promptSource);return run.completed&&sameData(run,value.promptRun)}catch{return false}
}
function parsedInput(value:unknown):WeekSixFactCheckInput|null{
 if(!isPlainRecord(value)||!hasExactKeys(value,['reviews'])||!Array.isArray(value.reviews)||value.reviews.length!==IDS.length)return null;
 for(let index=0;index<IDS.length;index++){const review=value.reviews[index];if(!isPlainRecord(review)||!hasExactKeys(review,['statementId','verdict','evidenceIds','disposition'])||review.statementId!==IDS[index]||![null,'supported','conflicting','insufficient'].includes(review.verdict as never)||![null,'keep-original','revise-not-passed','cannot-confirm','mark-false'].includes(review.disposition as never)||!Array.isArray(review.evidenceIds)||review.evidenceIds.some(id=>typeof id!=='string'||!EVIDENCE_IDS.has(id as WeekSixFactCheckEvidenceId))||new Set(review.evidenceIds).size!==review.evidenceIds.length)return null}
 return structuredClone(value) as unknown as WeekSixFactCheckInput;
}
function report(input:WeekSixFactCheckInput):WeekSixFactCheckReportRow[]{return input.reviews.map(review=>{const originalClaim=WEEK_SIX_FACT_CHECK_STATEMENTS.find(item=>item.id===review.statementId)!.text;return{statementId:review.statementId,originalClaim,verdict:review.verdict,evidence:WEEK_SIX_FACT_CHECK_EVIDENCE.filter(item=>review.evidenceIds.includes(item.id)).map(item=>({...item})),disposition:review.disposition,revision:review.disposition==='keep-original'?originalClaim:review.disposition?REVISIONS[review.disposition]:null}})}
const penalty={livesLost:0,resourcesLost:0,starsLost:0} as const;
function fail(state:Exclude<WeekSixFactCheckState,'review-proven'>,statementId:WeekSixFactCheckFailureSnapshot['statementId'],field:WeekSixFactCheckFailureSnapshot['field'],value:WeekSixFactCheckReportRow[]):WeekSixFactCheckRunResult{return{state,completed:false,report:value,failureSnapshots:[{snapshotId:`${statementId}:${state}:${field}`,result:state,statementId,field}],penalty}}
export function runWeekSixFactCheck(inputValue:unknown,sourceValue:unknown):WeekSixFactCheckRunResult{
 const blank=report(createEmptyWeekSixFactCheckInput());if(!validSource(sourceValue))return fail('source-invalid','source','source',blank);const input=parsedInput(inputValue);if(!input)return fail('input-invalid','input','input',blank);const value=report(input);
 for(const review of input.reviews){const expected=EXPECTED[review.statementId];if(review.verdict===null)return fail('verdict-missing',review.statementId,'verdict',value);if(review.evidenceIds.length===0)return fail('evidence-missing',review.statementId,'evidence',value);if(review.disposition===null)return fail('disposition-missing',review.statementId,'disposition',value);if(review.verdict!==expected.verdict)return fail('verdict-conflict',review.statementId,'verdict',value);if(!evidenceFits(review.evidenceIds,expected))return fail('evidence-conflict',review.statementId,'evidence',value);if(review.disposition!==expected.disposition)return fail('disposition-conflict',review.statementId,'disposition',value)}
 return{state:'review-proven',completed:true,report:value,failureSnapshots:[],penalty};
}
