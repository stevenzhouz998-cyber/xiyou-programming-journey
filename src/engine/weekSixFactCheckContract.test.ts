import { describe, expect, it } from 'vitest';
import { formalW6M3Completion } from '../../e2e/support/w6m1Prerequisite';
import { parseProgress } from '../progress/schema';
import {
  createEmptyWeekSixFactCheckInput,
  deriveWeekSixFactCheckSource,
  runWeekSixFactCheck,
  type WeekSixFactCheckEvidenceId,
  type WeekSixFactCheckInput,
} from './weekSixFactCheckContract';

const progress = parseProgress(formalW6M3Completion());
const promptWork = progress.works['w6-m3-second-attempt-brief']!;
const source = deriveWeekSixFactCheckSource(promptWork);
const solved = (): WeekSixFactCheckInput => ({ reviews: [
  { statementId:'gained-then-reclaimed', verdict:'supported', evidenceIds:['chapter-60-true-fan','chapter-61-fan-reclaimed'], disposition:'keep-original' },
  { statementId:'gained-therefore-passed', verdict:'conflicting', evidenceIds:['chapter-60-true-fan','chapter-61-fan-reclaimed','m2-second-not-passed'], disposition:'revise-not-passed' },
  { statementId:'exactly-ten-minutes', verdict:'insufficient', evidenceIds:['provided-material-scope'], disposition:'cannot-confirm' },
] });

describe('W6-M4 deterministic answer review', () => {
  it('starts every statement with blank verdict, evidence and disposition', () => {
    expect(createEmptyWeekSixFactCheckInput()).toEqual({reviews:[
      {statementId:'gained-then-reclaimed',verdict:null,evidenceIds:[],disposition:null},
      {statementId:'gained-therefore-passed',verdict:null,evidenceIds:[],disposition:null},
      {statementId:'exactly-ten-minutes',verdict:null,evidenceIds:[],disposition:null},
    ]});
  });

  it('accepts three evidence-complete judgments and preserves the child-authored handling in the report', () => {
    const result=runWeekSixFactCheck(solved(),source);
    expect(result).toMatchObject({state:'review-proven',completed:true,penalty:{livesLost:0,resourcesLost:0,starsLost:0}});
    expect(result.report).toEqual([
      expect.objectContaining({statementId:'gained-then-reclaimed',originalClaim:'二调取得真扇，后来又被骗回。',verdict:'supported',disposition:'keep-original',revision:'二调取得真扇，后来又被骗回。'}),
      expect.objectContaining({statementId:'gained-therefore-passed',verdict:'conflicting',disposition:'revise-not-passed',revision:'二调取得真扇，后来又被骗回，所以当次没有完成灭火通行。'}),
      expect.objectContaining({statementId:'exactly-ten-minutes',verdict:'insufficient',disposition:'cannot-confirm',revision:'本页给出的材料不足以确认具体分钟数，暂不能确认是否恰好用了十分钟。'}),
    ]);
  });

  it('uses the first actual blocker and never treats insufficient material as proof that a claim is false', () => {
    const blank=runWeekSixFactCheck(createEmptyWeekSixFactCheckInput(),source);
    expect(blank).toMatchObject({state:'verdict-missing',completed:false,failureSnapshots:[{statementId:'gained-then-reclaimed',field:'verdict'}]});
    expect(blank.failureSnapshots).toHaveLength(1);
    const unsupported=solved();unsupported.reviews[2]={...unsupported.reviews[2],verdict:'conflicting',disposition:'mark-false'};
    expect(runWeekSixFactCheck(unsupported,source)).toMatchObject({state:'verdict-conflict',completed:false,failureSnapshots:[{statementId:'exactly-ten-minutes'}]});
    expect(JSON.stringify(runWeekSixFactCheck(unsupported,source).report)).not.toContain('原著没有');
  });

  it('rejects wrong judgment, incomplete or irrelevant evidence, wrong handling, and malformed input', () => {
    const wrongVerdict=solved();wrongVerdict.reviews[0].verdict='conflicting';expect(runWeekSixFactCheck(wrongVerdict,source).state).toBe('verdict-conflict');
    const missingEvidence=solved();missingEvidence.reviews[0].evidenceIds=['chapter-60-true-fan'];expect(runWeekSixFactCheck(missingEvidence,source).state).toBe('evidence-conflict');
    const irrelevant=solved();irrelevant.reviews[1].evidenceIds.push('practice-answer-says-so');expect(runWeekSixFactCheck(irrelevant,source).state).toBe('evidence-conflict');
    const wrongHandling=solved();wrongHandling.reviews[1].disposition='keep-original';expect(runWeekSixFactCheck(wrongHandling,source).state).toBe('disposition-conflict');
    expect(runWeekSixFactCheck({reviews:[]} as never,source).state).toBe('input-invalid');
    expect(runWeekSixFactCheck(solved(),{...source,promptRun:{...source.promptRun,completed:false}}).state).toBe('source-invalid');
  });

  it('treats evidence selection order as irrelevant while blocking extra evidence', () => {
    const reordered=solved();reordered.reviews[0].evidenceIds.reverse();reordered.reviews[1].evidenceIds.reverse();
    expect(runWeekSixFactCheck(reordered,source).completed).toBe(true);
    reordered.reviews[2].evidenceIds.push('chapter-61-fan-reclaimed');
    expect(runWeekSixFactCheck(reordered,source).state).toBe('evidence-conflict');
  });

  it('accepts four sufficient relevant evidence sets for the conflicting inference',()=>{const combinations:WeekSixFactCheckEvidenceId[][]=[
    ['m2-second-not-passed'],
    ['m2-second-not-passed','chapter-60-true-fan'],
    ['m2-second-not-passed','chapter-61-fan-reclaimed'],
    ['m2-second-not-passed','chapter-60-true-fan','chapter-61-fan-reclaimed'],
  ];for(const evidenceIds of combinations){const input=solved();input.reviews[1].evidenceIds=evidenceIds;expect(runWeekSixFactCheck(input,source).completed).toBe(true)}});
});
