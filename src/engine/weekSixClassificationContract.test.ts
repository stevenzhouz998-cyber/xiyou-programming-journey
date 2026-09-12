import { describe, expect, it } from 'vitest';
import { WEEK_SIX_RECORD_FACTS } from './weekSixRecordsContract';
import {
  createEmptyWeekSixClassificationInput,
  runWeekSixClassification,
  type WeekSixClassificationInput,
} from './weekSixClassificationContract';

const source = WEEK_SIX_RECORD_FACTS.map((row) => ({ ...row }));
const solved: WeekSixClassificationInput = {
  labels: [
    { attempt: '一调', fanAuthenticity: 'false', fanEvidenceId: 'one-not-real', passageOutcome: 'not-passed', passageEvidenceId: 'one-fire-worse' },
    { attempt: '二调', fanAuthenticity: 'genuine', fanEvidenceId: 'two-true-fan', passageOutcome: 'not-passed', passageEvidenceId: 'two-stolen-back' },
    { attempt: '三调', fanAuthenticity: 'genuine', fanEvidenceId: 'three-true-fan', passageOutcome: 'passed', passageEvidenceId: 'three-fire-cleared' },
  ],
  practiceAuthenticity: 'insufficient',
};

describe('W6-M2 deterministic evidence classification', () => {
  it('starts with every label and evidence selection empty', () => {
    expect(createEmptyWeekSixClassificationInput()).toEqual({
      labels: [
        { attempt: '一调', fanAuthenticity: null, fanEvidenceId: null, passageOutcome: null, passageEvidenceId: null },
        { attempt: '二调', fanAuthenticity: null, fanEvidenceId: null, passageOutcome: null, passageEvidenceId: null },
        { attempt: '三调', fanAuthenticity: null, fanEvidenceId: null, passageOutcome: null, passageEvidenceId: null },
      ],
      practiceAuthenticity: null,
    });
  });

  it('proves only the six supported labels and evidence choices plus an insufficient-material decision', () => {
    expect(runWeekSixClassification(solved, source)).toMatchObject({
      state: 'classification-proven', completed: true, failureSnapshots: [],
      groups: {
        authenticity: { false: ['一调'], genuine: ['二调', '三调'], unlabelled: [] },
        passage: { passed: ['三调'], notPassed: ['一调', '二调'], unlabelled: [] },
      },
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
  });

  it('shows the child labels in groups even when the second attempt is incorrectly marked false', () => {
    const input = structuredClone(solved);
    input.labels[1].fanAuthenticity = 'false';
    const result = runWeekSixClassification(input, source);
    expect(result).toMatchObject({ state: 'label-conflict', completed: false });
    expect(result.groups.authenticity.false).toEqual(['一调', '二调']);
    expect(result.failureSnapshots[0]).toMatchObject({ attempt: '二调', dimension: 'fan-authenticity' });
  });

  it('distinguishes an unrelated evidence choice from a wrong label without revealing the replacement', () => {
    const input = structuredClone(solved);
    input.labels[1].fanEvidenceId = 'two-stolen-back';
    const result = runWeekSixClassification(input, source);
    expect(result).toMatchObject({ state: 'evidence-conflict', completed: false });
    expect(result.failureSnapshots[0]).toMatchObject({ result: 'evidence-conflict', attempt: '二调', dimension: 'fan-authenticity' });
    expect(JSON.stringify(result.failureSnapshots[0])).not.toContain('two-true-fan');
  });

  it('rejects guessing the practice fan and never borrows evidence from another record', () => {
    const input = structuredClone(solved);
    input.practiceAuthenticity = 'genuine';
    expect(runWeekSixClassification(input, source)).toMatchObject({
      state: 'practice-conflict', completed: false,
      failureSnapshots: [{ attempt: '材料练习', dimension: 'practice' }],
    });
  });

  it('rejects missing, duplicate, extra, unknown and damaged source data', () => {
    const missing = structuredClone(solved); missing.labels.pop();
    expect(runWeekSixClassification(missing, source).state).toBe('input-invalid');
    const duplicate = structuredClone(solved); duplicate.labels[2].attempt = '二调';
    expect(runWeekSixClassification(duplicate, source).state).toBe('input-invalid');
    expect(runWeekSixClassification({ ...solved, labels: [...solved.labels, solved.labels[0]] }, source).state).toBe('input-invalid');
    expect(runWeekSixClassification({ ...solved, practiceAuthenticity: 'maybe' }, source).state).toBe('input-invalid');
    expect(runWeekSixClassification(solved, source.slice(0, 2)).state).toBe('source-invalid');
    expect(runWeekSixClassification(solved, source.map((row, index) => index === 1 ? { ...row, story: '二调得假扇' } : row)).state).toBe('source-invalid');
  });
});
