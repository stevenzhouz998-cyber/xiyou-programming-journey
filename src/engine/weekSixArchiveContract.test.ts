import { describe,expect,it } from 'vitest';
import { formalW6M4Completion } from '../../e2e/support/w6m1Prerequisite';
import { parseProgress } from '../progress/schema';
import { parseWeekSixRecordsPython,SOLVED_WEEK_SIX_RECORDS_PYTHON } from './weekSixRecordsPythonGrammar';
import {
  createEmptyWeekSixArchiveInput,
  deriveWeekSixArchiveSource,
  runWeekSixArchive,
  type WeekSixArchiveInput,
} from './weekSixArchiveContract';

const progress=parseProgress(formalW6M4Completion());
const source=deriveWeekSixArchiveSource(progress.works['w6-m4-second-attempt-review']!);
const parsed=parseWeekSixRecordsPython(SOLVED_WEEK_SIX_RECORDS_PYTHON);
if('state' in parsed)throw Error('fixture Python must parse');
const actual={trace:parsed.trace,run:parsed.run};
const solved=():WeekSixArchiveInput=>({
  brief:{scope:'all-three',factIds:['attempt-one','attempt-two','attempt-three'],constraintIds:['provided-only','mark-insufficient'],format:'event-table'},
  reviews:[
    {claimId:'first-and-third',verdict:'supported',evidenceIds:['run-first','run-third'],disposition:'keep-original'},
    {claimId:'second-therefore-passed',verdict:'conflicting',evidenceIds:['run-second','m2-second-not-passed'],disposition:'revise-second-result'},
    {claimId:'exactly-thirty-minutes',verdict:'insufficient',evidenceIds:['provided-material-scope'],disposition:'cannot-confirm'},
  ],
});

describe('W6-M5 integrated archive contract',()=>{
  it('binds the full UTF-16 source instead of collapsing different emoji',()=>{
    const first=structuredClone(progress.works['w6-m4-second-attempt-review']!);first.title='😀';
    const second=structuredClone(first);second.title='😃';
    expect(deriveWeekSixArchiveSource(first).factCheckDigest).not.toBe(deriveWeekSixArchiveSource(second).factCheckDigest);
  });
  it('starts every child-authored brief and review field empty',()=>{
    expect(createEmptyWeekSixArchiveInput()).toEqual({brief:{scope:null,factIds:[],constraintIds:[],format:null},reviews:[
      {claimId:'first-and-third',verdict:null,evidenceIds:[],disposition:null},
      {claimId:'second-therefore-passed',verdict:null,evidenceIds:[],disposition:null},
      {claimId:'exactly-thirty-minutes',verdict:null,evidenceIds:[],disposition:null},
    ]});
  });

  it('uses only the actual current Worker result to build both supported output formats',()=>{
    const table=runWeekSixArchive(SOLVED_WEEK_SIX_RECORDS_PYTHON,actual,solved(),source);
    expect(table).toMatchObject({state:'archive-proven',completed:true,draft:{format:'event-table',rows:parsed.run.rows}});
    const steps=solved();steps.brief.format='step-list';
    steps.brief.factIds.reverse();steps.brief.constraintIds.reverse();
    expect(runWeekSixArchive(SOLVED_WEEK_SIX_RECORDS_PYTHON,actual,steps,source).draft).toMatchObject({format:'step-list',steps:[
      '第1步：一调｜得到假扇，火势更旺','第2步：二调｜取得真扇，随后被骗回','第3步：三调｜最终借得真扇，灭火通行',
    ]});
    const forged=structuredClone(actual);forged.run.rows[1]!.story='偷偷纠正的标准答案';
    expect(runWeekSixArchive(SOLVED_WEEK_SIX_RECORDS_PYTHON,forged,solved(),source).state).toBe('python-worker-stale');
  });

  it('reports the first real blocker without inventing or correcting child input',()=>{
    const blank=runWeekSixArchive(SOLVED_WEEK_SIX_RECORDS_PYTHON,actual,createEmptyWeekSixArchiveInput(),source);
    expect(blank).toMatchObject({state:'scope-missing',completed:false,failureSnapshots:[{field:'scope'}],penalty:{livesLost:0,resourcesLost:0,starsLost:0}});
    const wrong=solved();wrong.brief.factIds=['attempt-one','attempt-three'];
    const result=runWeekSixArchive(SOLVED_WEEK_SIX_RECORDS_PYTHON,actual,wrong,source);
    expect(result.state).toBe('facts-conflict');
    expect(JSON.stringify(result.draft)).not.toContain('取得真扇，随后被骗回');
  });

  it('keeps teacher-authored review separate and accepts only grounded judgment evidence and disposition',()=>{
    const result=runWeekSixArchive(SOLVED_WEEK_SIX_RECORDS_PYTHON,actual,solved(),source);
    expect(result.reviewReport).toMatchObject({authorship:'teacher-authored-practice',rows:[
      {claimId:'first-and-third',verdict:'supported',revision:'一调得到假扇、火势更旺；三调最终借得真扇并灭火通行。'},
      {claimId:'second-therefore-passed',verdict:'conflicting',revision:'二调取得真扇、随后被骗回，所以当次没有完成灭火通行。'},
      {claimId:'exactly-thirty-minutes',verdict:'insufficient'},
    ]});
    const bad=solved();bad.reviews[1]!.evidenceIds=['teacher-says-so'];
    expect(runWeekSixArchive(SOLVED_WEEK_SIX_RECORDS_PYTHON,actual,bad,source).state).toBe('review-evidence-conflict');
    const direct=solved();direct.reviews[1]!.evidenceIds=['m2-second-not-passed'];
    expect(runWeekSixArchive(SOLVED_WEEK_SIX_RECORDS_PYTHON,actual,direct,source).completed).toBe(true);
    const missing=solved();missing.reviews[2]!.disposition=null;
    expect(runWeekSixArchive(SOLVED_WEEK_SIX_RECORDS_PYTHON,actual,missing,source)).toMatchObject({state:'review-disposition-missing',failureSnapshots:[{claimId:'exactly-thirty-minutes'}]});
  });

  it('rejects malformed, unsafe, default-wrong and stale-source runs before downstream choices',()=>{
    expect(runWeekSixArchive('import os',actual,solved(),source).state).toBe('python-structure-invalid');
    const wrong=parseWeekSixRecordsPython(SOLVED_WEEK_SIX_RECORDS_PYTHON.replace('record["经过"]','record["第几调"]'));
    if('state' in wrong)throw Error('default-wrong fixture should still parse');
    expect(runWeekSixArchive(wrong.pythonCode,{trace:wrong.trace,run:wrong.run},solved(),source).state).toBe('python-output-conflict');
    expect(runWeekSixArchive(SOLVED_WEEK_SIX_RECORDS_PYTHON,actual,solved(),{...source,materialVersion:'tampered'} as never).state).toBe('source-invalid');
  });
});
