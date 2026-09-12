import { describe, expect, it } from 'vitest';
import {
  createEmptyWeekSixPromptInput,
  deriveWeekSixPromptSource,
  runWeekSixPrompt,
  type WeekSixPromptInput,
} from './weekSixPromptContract';
import { WEEK_SIX_RECORD_FACTS } from './weekSixRecordsContract';
import { runWeekSixClassification, type WeekSixClassificationInput } from './weekSixClassificationContract';

const classificationInput: WeekSixClassificationInput = {
  labels: [
    { attempt: '一调', fanAuthenticity: 'false', fanEvidenceId: 'one-not-real', passageOutcome: 'not-passed', passageEvidenceId: 'one-fire-worse' },
    { attempt: '二调', fanAuthenticity: 'genuine', fanEvidenceId: 'two-true-fan', passageOutcome: 'not-passed', passageEvidenceId: 'two-stolen-back' },
    { attempt: '三调', fanAuthenticity: 'genuine', fanEvidenceId: 'three-true-fan', passageOutcome: 'passed', passageEvidenceId: 'three-fire-cleared' },
  ],
  practiceAuthenticity: 'insufficient',
};
const source = deriveWeekSixPromptSource({
  workId: 'w6-m2-fan-evidence-classification',
  verifiedAt: '2026-09-12T03:00:00.000Z',
  sourceVerifiedAt: '2026-09-12T02:00:00.000Z',
  sourceRows: WEEK_SIX_RECORD_FACTS,
  input: classificationInput,
  run: runWeekSixClassification(classificationInput, WEEK_SIX_RECORD_FACTS),
});
const solved = (outputFormat: 'event-table' | 'step-list'): WeekSixPromptInput => ({
  task: 'organize-second-attempt',
  factIds: ['sun-as-bull-gets-fan', 'bull-as-bajie-takes-fan', 'second-not-passed'],
  constraintIds: ['follow-canon', 'no-invention'],
  outputFormat,
});

describe('W6-M3 deterministic prompt brief', () => {
  it('starts with all four prompt fields blank', () => {
    expect(createEmptyWeekSixPromptInput()).toEqual({ task: null, factIds: [], constraintIds: [], outputFormat: null });
  });

  it.each(['event-table', 'step-list'] as const)('accepts a complete brief with %s output', (format) => {
    const result = runWeekSixPrompt(solved(format), source);
    expect(result).toMatchObject({ state: 'prompt-proven', completed: true, output: { format }, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
    expect(JSON.stringify(result.output)).toContain('悟空变作牛魔王模样，取得真扇');
    expect(JSON.stringify(result.output)).toContain('牛魔王变作八戒模样，骗回真扇');
  });

  it('changes the actual simulation representation between table and list', () => {
    const table = runWeekSixPrompt(solved('event-table'), source);
    const list = runWeekSixPrompt(solved('step-list'), source);
    expect(table.output).toHaveProperty('rows');
    expect(table.output).not.toHaveProperty('steps');
    expect(list.output).toHaveProperty('steps');
    expect(list.output).not.toHaveProperty('rows');
  });

  it('faithfully renders selected partial and false facts without secretly completing them', () => {
    const partial = solved('step-list'); partial.factIds = ['sun-as-bull-gets-fan'];
    const result = runWeekSixPrompt(partial, source);
    expect(result.state).toBe('fact-missing');
    expect(JSON.stringify(result.output)).toContain('悟空变作牛魔王');
    expect(JSON.stringify(result.output)).not.toContain('牛魔王变作八戒');
    const wrong = solved('step-list'); wrong.factIds = ['identities-reversed', 'third-attempt-passage'];
    expect(JSON.stringify(runWeekSixPrompt(wrong, source).output)).toContain('牛魔王变作悟空');
  });

  it('reports only the first blocker and rejects rewrite demands, missing fields and invalid IDs', () => {
    const blank = runWeekSixPrompt(createEmptyWeekSixPromptInput(), source);
    expect(blank).toMatchObject({ state: 'task-missing', completed: false });
    expect(blank.failureSnapshots).toHaveLength(1);
    const rewrite = solved('event-table'); rewrite.task = 'rewrite-second-attempt';
    expect(runWeekSixPrompt(rewrite, source).state).toBe('task-conflict');
    const conflict = solved('event-table'); conflict.constraintIds.push('force-second-passage');
    expect(runWeekSixPrompt(conflict, source).state).toBe('constraint-conflict');
    expect(runWeekSixPrompt({ ...solved('event-table'), factIds: ['unknown'] } as never, source).state).toBe('input-invalid');
    expect(runWeekSixPrompt(solved('event-table'), { ...source, classificationRun: { ...source.classificationRun, completed: false } }).state).toBe('source-invalid');
  });
});
