import { describe, expect, it } from 'vitest';
import { compileHorseCareDraft, runHorseCare } from '../blockly/weekTwoHorseContract';
import { createInitialProgress, getWeeklyReport, importProgress, serializeProgress } from './progress';
import { createMissionSession, recordRun, updateWorkspaceDraft } from './session';

const NOW = '2026-08-21T01:00:00.000Z';
const draft = {
  version: 1 as const,
  missionId: 'w2-m1' as const,
  blocks: [
    { id: 'accept', type: 'xiyou_accept_stable_post' as const, nextId: 'repeat', parentBlockId: null, repeatCount: null, x: 0, y: 0 },
    { id: 'repeat', type: 'xiyou_repeat_horse_care' as const, nextId: 'rank', parentBlockId: null, repeatCount: 3, x: 0, y: 50 },
    { id: 'care', type: 'xiyou_care_next_horse' as const, nextId: null, parentBlockId: 'repeat', repeatCount: null, x: 20, y: 70 },
    { id: 'rank', type: 'xiyou_learn_stable_rank' as const, nextId: 'leave', parentBlockId: null, repeatCount: null, x: 0, y: 120 },
    { id: 'leave', type: 'xiyou_leave_heaven' as const, nextId: null, parentBlockId: null, repeatCount: null, x: 0, y: 170 },
  ],
};

describe('w2-m1 Progress V3 session', () => {
  it('round-trips the visible draft, canonical trace, run, hints and attempts', () => {
    let reopened: ReturnType<typeof importProgress> | null = null;

    try {
      const trace = compileHorseCareDraft(draft);
      const run = runHorseCare(trace);
      const create = createMissionSession as unknown as (missionId: 'w2-m1', now: string) => any;
      const update = updateWorkspaceDraft as unknown as (session: any, workspace: typeof draft, now: string) => any;
      const record = recordRun as unknown as (session: any, result: typeof run, instructions: typeof trace, now: string) => any;
      const session = record(update(create('w2-m1', NOW), draft, NOW), run, trace, NOW);
      const progress = createInitialProgress();
      (progress.sessions as Record<string, unknown>)['w2-m1'] = session;
      reopened = importProgress(serializeProgress(progress));
    } catch {
      // The RED state is represented as a value assertion, not an uncaught test error.
    }

    expect(reopened?.sessions['w2-m1']).toMatchObject({
      workspace: draft,
      totalRuns: 1,
      runtimeFailures: 0,
      compileFailures: 0,
      lastRun: { completed: true, finalState: 'left-heaven', caredHorses: 3 },
    });
  });

  it('includes formal loop attempts and adjustments in the second-week parent report', () => {
    const shortDraft = {
      ...draft,
      blocks: draft.blocks.map((block) => block.id === 'repeat' ? { ...block, repeatCount: 2 } : block),
    };
    const trace = compileHorseCareDraft(shortDraft);
    const result = runHorseCare(trace);
    let session = updateWorkspaceDraft(createMissionSession('w2-m1', NOW), shortDraft, NOW);
    session = recordRun(session, result, trace, NOW);
    const progress = createInitialProgress();
    progress.sessions['w2-m1'] = session;

    expect(getWeeklyReport(progress, 2)).toMatchObject({
      sessionRuns: 1,
      sessionAdjustments: 1,
      needsSupport: [],
    });
  });

  it('preserves historical attempts when a visible edit clears all stale current-run evidence', () => {
    const trace = compileHorseCareDraft(draft);
    let session = updateWorkspaceDraft(createMissionSession('w2-m1', NOW), draft, NOW);
    session = recordRun(session, runHorseCare(trace), trace, NOW);
    const editedDraft = { ...draft, blocks: draft.blocks.map((block) => block.id === 'repeat' ? { ...block, repeatCount: 2 } : block) };
    session = updateWorkspaceDraft(session, editedDraft, NOW);
    const progress = createInitialProgress();
    progress.sessions['w2-m1'] = session;

    expect(importProgress(serializeProgress(progress)).sessions['w2-m1']).toMatchObject({
      totalRuns: 1,
      lastTrace: [],
      lastRun: null,
      lastRunAt: null,
    });
  });
});
