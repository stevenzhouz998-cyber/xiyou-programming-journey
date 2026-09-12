import { describe, expect, it } from 'vitest';
import { WEEK_SIX_RECORD_FACTS } from '../engine/weekSixRecordsContract';
import { runWeekSixClassification, type WeekSixClassificationInput } from '../engine/weekSixClassificationContract';
import { createWeekSixClassificationSession, recordWeekSixClassificationCheck, recordWeekSixClassificationHint, updateWeekSixClassificationGrouping, updateWeekSixClassificationInput } from './weekSixClassificationSession';

const NOW = '2026-09-12T02:00:00.000Z';
const LATER = '2026-09-12T02:01:00.000Z';
const sourceRows = WEEK_SIX_RECORD_FACTS.map((row) => ({ ...row }));
const source = { workId: 'w6-m1-structured-records-table' as const, verifiedAt: NOW, rows: sourceRows };
const solved: WeekSixClassificationInput = { labels: [
  { attempt: '一调', fanAuthenticity: 'false', fanEvidenceId: 'one-not-real', passageOutcome: 'not-passed', passageEvidenceId: 'one-fire-worse' },
  { attempt: '二调', fanAuthenticity: 'genuine', fanEvidenceId: 'two-true-fan', passageOutcome: 'not-passed', passageEvidenceId: 'two-stolen-back' },
  { attempt: '三调', fanAuthenticity: 'genuine', fanEvidenceId: 'three-true-fan', passageOutcome: 'passed', passageEvidenceId: 'three-fire-cleared' },
], practiceAuthenticity: 'insufficient' };

describe('W6-M2 classification session', () => {
  it('copies the M1 work rows and starts with a blank persisted draft', () => {
    const session = createWeekSixClassificationSession(source, NOW);
    expect(session).toMatchObject({ kind: 'ai-evidence-classification-v1', sourceWorkId: source.workId, sourceVerifiedAt: NOW, sourceRows, totalChecks: 0, lastRun: null, groupingDimension: 'authenticity' });
    expect(session.sourceRows).not.toBe(source.rows);
    expect(session.input.labels.every((item) => item.fanAuthenticity === null && item.passageOutcome === null)).toBe(true);
  });

  it('invalidates stale run evidence when a label changes but preserves the read-only source', () => {
    const initial = createWeekSixClassificationSession(source, NOW);
    const checked = recordWeekSixClassificationCheck(updateWeekSixClassificationInput(initial, solved, LATER), solved, runWeekSixClassification(solved, sourceRows), LATER);
    const draft = structuredClone(solved); draft.labels[1].fanAuthenticity = 'false';
    const changed = updateWeekSixClassificationInput(checked, draft, '2026-09-12T02:02:00.000Z');
    expect(changed.lastRun).toBeNull(); expect(changed.failureSnapshot).toBeNull();
    expect(changed.sourceRows).toEqual(sourceRows); expect(changed.totalChecks).toBe(1);
  });

  it('records the deterministic first blocker and counts one saved check once', () => {
    const initial = createWeekSixClassificationSession(source, NOW);
    const run = runWeekSixClassification(initial.input, sourceRows);
    const checked = recordWeekSixClassificationCheck(initial, initial.input, run, LATER);
    expect(checked).toMatchObject({ totalChecks: 1, incompleteChecks: 1, firstBlockingConcept: 'selection', failureSnapshot: { result: 'selection-incomplete' } });
    expect(checked.lastRun?.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
    expect(() => recordWeekSixClassificationCheck(initial, solved, run, LATER)).toThrow(/当前保存的分类输入/);
  });

  it('persists grouping and hint choices without changing answers or rerunning', () => {
    const initial = createWeekSixClassificationSession(source, NOW);
    const grouped = updateWeekSixClassificationGrouping(initial, 'passage', LATER);
    const hinted = recordWeekSixClassificationHint(grouped, 'observe', LATER);
    expect(hinted.groupingDimension).toBe('passage'); expect(hinted.input).toEqual(initial.input);
    expect(hinted.totalChecks).toBe(0); expect(hinted.usedHintTiers).toEqual(['observe']);
  });
});
