import { runWeekSixClassification, type WeekSixClassificationInput, type WeekSixClassificationRunResult } from './weekSixClassificationContract';
import type { WeekSixRecordsRow } from './weekSixRecordsContract';

export type WeekSixPromptTask = 'organize-second-attempt' | 'rewrite-second-attempt' | null;
export type WeekSixPromptFactId = 'sun-as-bull-gets-fan' | 'bull-as-bajie-takes-fan' | 'second-not-passed' | 'identities-reversed' | 'third-attempt-passage';
export type WeekSixPromptConstraintId = 'follow-canon' | 'no-invention' | 'force-second-passage';
export type WeekSixPromptOutputFormat = 'event-table' | 'step-list' | null;

export interface WeekSixPromptInput {
  task: WeekSixPromptTask;
  factIds: WeekSixPromptFactId[];
  constraintIds: WeekSixPromptConstraintId[];
  outputFormat: WeekSixPromptOutputFormat;
}

export interface WeekSixPromptSource {
  kind: 'w6-m3-prompt-source-v1';
  classificationWorkId: 'w6-m2-fan-evidence-classification';
  classificationVerifiedAt: string;
  classificationSourceVerifiedAt: string;
  classificationRows: WeekSixRecordsRow[];
  classificationInput: WeekSixClassificationInput;
  classificationRun: WeekSixClassificationRunResult;
}

export type WeekSixPromptState = 'source-invalid' | 'input-invalid' | 'task-missing' | 'fact-missing' | 'constraint-missing' | 'output-format-missing' | 'task-conflict' | 'fact-conflict' | 'constraint-conflict' | 'prompt-proven';
export interface WeekSixPromptFailureSnapshot { snapshotId: string; result: Exclude<WeekSixPromptState,'prompt-proven'>; field: 'source'|'input'|'task'|'facts'|'constraints'|'output-format' }
export interface WeekSixPromptBrief { task: string | null; facts: string[]; constraints: string[]; outputFormat: WeekSixPromptOutputFormat }
export type WeekSixPromptOutput = { format:'event-table';rows:Array<{order:number;event:string}> } | {format:'step-list';steps:Array<{order:number;text:string}>} | null;
export interface WeekSixPromptRunResult { state:WeekSixPromptState;completed:boolean;brief:WeekSixPromptBrief;output:WeekSixPromptOutput;failureSnapshots:WeekSixPromptFailureSnapshot[];penalty:{livesLost:0;resourcesLost:0;starsLost:0} }

const TASKS:Record<Exclude<WeekSixPromptTask,null>,string>={
  'organize-second-attempt':'按原著整理二调芭蕉扇的经过',
  'rewrite-second-attempt':'改写二调结局，让师徒当次通行',
};
export const WEEK_SIX_PROMPT_FACT_OPTIONS:ReadonlyArray<{id:WeekSixPromptFactId;text:string}>=[
  {id:'sun-as-bull-gets-fan',text:'悟空变作牛魔王模样，取得真扇'},
  {id:'bull-as-bajie-takes-fan',text:'牛魔王变作八戒模样，骗回真扇'},
  {id:'second-not-passed',text:'二调这次没有完成灭火通行'},
  {id:'identities-reversed',text:'牛魔王变作悟空取得真扇'},
  {id:'third-attempt-passage',text:'二调取扇后灭火通行'},
] as const;
const CONSTRAINTS:Record<WeekSixPromptConstraintId,string>={
  'follow-canon':'只按原著和已给材料整理','no-invention':'材料不足时明说不足，不编造','force-second-passage':'无论材料如何，改写为二调已通行',
};
const FACT_IDS=new Set(WEEK_SIX_PROMPT_FACT_OPTIONS.map(({id})=>id)),CONSTRAINT_IDS=new Set(Object.keys(CONSTRAINTS));
const REQUIRED_FACTS:WeekSixPromptFactId[]=['sun-as-bull-gets-fan','bull-as-bajie-takes-fan','second-not-passed'];
const REQUIRED_CONSTRAINTS:WeekSixPromptConstraintId[]=['follow-canon','no-invention'];
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const iso=(v:string)=>UTC.test(v)&&new Date(v).toISOString()===v;
const plain=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype;
const exact=(v:Record<string,unknown>,keys:string[])=>Reflect.ownKeys(v).length===keys.length&&Reflect.ownKeys(v).every(k=>typeof k==='string'&&keys.includes(k));

export function createEmptyWeekSixPromptInput():WeekSixPromptInput{return{task:null,factIds:[],constraintIds:[],outputFormat:null}}

export function deriveWeekSixPromptSource(work:{workId:'w6-m2-fan-evidence-classification';verifiedAt:string;sourceVerifiedAt:string;sourceRows:ReadonlyArray<WeekSixRecordsRow>;input:WeekSixClassificationInput;run:WeekSixClassificationRunResult}):WeekSixPromptSource{
  if(!iso(work.verifiedAt)||!iso(work.sourceVerifiedAt)||work.sourceVerifiedAt>work.verifiedAt){throw Error('W6-M3 source work invalid');}
  const rows=work.sourceRows.map(row=>({...row}));const run=runWeekSixClassification(work.input,rows);
  if(!run.completed||!same(run,work.run))throw Error('W6-M3 source work invalid');
  return{kind:'w6-m3-prompt-source-v1',classificationWorkId:work.workId,classificationVerifiedAt:work.verifiedAt,classificationSourceVerifiedAt:work.sourceVerifiedAt,classificationRows:rows,classificationInput:structuredClone(work.input),classificationRun:structuredClone(run)};
}

function validSource(v:unknown):v is WeekSixPromptSource{
  if(!plain(v)||!exact(v,['kind','classificationWorkId','classificationVerifiedAt','classificationSourceVerifiedAt','classificationRows','classificationInput','classificationRun'])||v.kind!=='w6-m3-prompt-source-v1'||v.classificationWorkId!=='w6-m2-fan-evidence-classification'||typeof v.classificationVerifiedAt!=='string'||typeof v.classificationSourceVerifiedAt!=='string'||!iso(v.classificationVerifiedAt)||!iso(v.classificationSourceVerifiedAt)||v.classificationSourceVerifiedAt>v.classificationVerifiedAt)return false;
  const run=runWeekSixClassification(v.classificationInput,v.classificationRows);return run.completed&&same(run,v.classificationRun);
}
function parsedInput(v:unknown):WeekSixPromptInput|null{
  if(!plain(v)||!exact(v,['task','factIds','constraintIds','outputFormat'])||![null,'organize-second-attempt','rewrite-second-attempt'].includes(v.task as never)||![null,'event-table','step-list'].includes(v.outputFormat as never)||!Array.isArray(v.factIds)||!Array.isArray(v.constraintIds))return null;
  if(v.factIds.some(id=>typeof id!=='string'||!FACT_IDS.has(id as WeekSixPromptFactId))||new Set(v.factIds).size!==v.factIds.length||v.constraintIds.some(id=>typeof id!=='string'||!CONSTRAINT_IDS.has(id))||new Set(v.constraintIds).size!==v.constraintIds.length)return null;
  return structuredClone(v) as unknown as WeekSixPromptInput;
}
function compose(input:WeekSixPromptInput):{brief:WeekSixPromptBrief;output:WeekSixPromptOutput}{
  const facts=WEEK_SIX_PROMPT_FACT_OPTIONS.filter(o=>input.factIds.includes(o.id)).map(o=>o.text),constraints=Object.entries(CONSTRAINTS).filter(([id])=>input.constraintIds.includes(id as WeekSixPromptConstraintId)).map(([,text])=>text);
  const brief={task:input.task?TASKS[input.task]:null,facts,constraints,outputFormat:input.outputFormat};
  const output=input.outputFormat==='event-table'?{format:'event-table' as const,rows:facts.map((event,i)=>({order:i+1,event}))}:input.outputFormat==='step-list'?{format:'step-list' as const,steps:facts.map((text,i)=>({order:i+1,text}))}:null;
  return{brief,output};
}
const penalty={livesLost:0,resourcesLost:0,starsLost:0} as const;
function fail(state:Exclude<WeekSixPromptState,'prompt-proven'>,field:WeekSixPromptFailureSnapshot['field'],brief:WeekSixPromptBrief,output:WeekSixPromptOutput):WeekSixPromptRunResult{return{state,completed:false,brief,output,failureSnapshots:[{snapshotId:`${state}:${field}`,result:state,field}],penalty}}
export function runWeekSixPrompt(inputValue:unknown,sourceValue:unknown):WeekSixPromptRunResult{
  const empty=compose(createEmptyWeekSixPromptInput());if(!validSource(sourceValue))return fail('source-invalid','source',empty.brief,empty.output);
  const input=parsedInput(inputValue);if(!input)return fail('input-invalid','input',empty.brief,empty.output);
  const {brief,output}=compose(input);
  if(input.task===null)return fail('task-missing','task',brief,output);
  if(input.factIds.length===0||REQUIRED_FACTS.some(id=>!input.factIds.includes(id)))return input.factIds.some(id=>!REQUIRED_FACTS.includes(id))?fail('fact-conflict','facts',brief,output):fail('fact-missing','facts',brief,output);
  if(REQUIRED_CONSTRAINTS.some(id=>!input.constraintIds.includes(id)))return fail('constraint-missing','constraints',brief,output);
  if(input.outputFormat===null)return fail('output-format-missing','output-format',brief,output);
  if(input.task!=='organize-second-attempt')return fail('task-conflict','task',brief,output);
  if(input.factIds.some(id=>!REQUIRED_FACTS.includes(id)))return fail('fact-conflict','facts',brief,output);
  if(input.constraintIds.includes('force-second-passage'))return fail('constraint-conflict','constraints',brief,output);
  return{state:'prompt-proven',completed:true,brief,output,failureSnapshots:[],penalty};
}
