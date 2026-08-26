import { describe, expect, it } from 'vitest';
import { compileMonkeyKingDraft, runMonkeyKingEvents } from '../blockly/weekTwoMonkeyKingContract';
import type { MonkeyKingWorkspaceDraftV1 } from '../blockly/weekTwoMonkeyKingContract';
import { createInitialProgress, getWeeklyReport, importProgress, serializeProgress } from './progress';
import { createMissionSession, recordRun, updateWorkspaceDraft } from './session';

const NOW = '2026-08-22T12:00:00.000Z';
const draft: MonkeyKingWorkspaceDraftV1 = {
  version: 1 as const,
  missionId: 'w2-m2' as const,
  blocks: [
    { id: 'return-hat', type: 'xiyou_on_return_flower_fruit' as const, nextId: null, parentBlockId: null, x: 0, y: 0 },
    { id: 'raise-flag', type: 'xiyou_raise_great_sage_flag' as const, nextId: null, parentBlockId: 'return-hat', x: 20, y: 50 },
    { id: 'title-hat', type: 'xiyou_on_heavenly_title' as const, nextId: null, parentBlockId: null, x: 320, y: 0 },
    { id: 'accept-title', type: 'xiyou_accept_great_sage_title' as const, nextId: 'build-home', parentBlockId: 'title-hat', x: 340, y: 50 },
    { id: 'build-home', type: 'xiyou_build_great_sage_residence' as const, nextId: null, parentBlockId: 'title-hat', x: 340, y: 100 },
  ],
};

const create = createMissionSession as unknown as (missionId: 'w2-m2', now: string) => any;
const update = updateWorkspaceDraft as unknown as (session: any, workspace: MonkeyKingWorkspaceDraftV1, now: string) => any;
const record = recordRun as unknown as (session: any, result: ReturnType<typeof runMonkeyKingEvents>, trace: ReturnType<typeof compileMonkeyKingDraft>, now: string) => any;

function completedSession() {
  const trace = compileMonkeyKingDraft(draft);
  return record(update(create('w2-m2', NOW), draft, NOW), runMonkeyKingEvents(trace), trace, NOW);
}

describe('w2-m2 Progress V3 event session', () => {
  it('round-trips workspace, event trace and deterministic run by recompiling on import', () => {
    let reopened: ReturnType<typeof importProgress> | null = null;
    try {
      const progress = createInitialProgress();
      (progress.sessions as Record<string, unknown>)['w2-m2'] = completedSession();
      reopened = importProgress(serializeProgress(progress));
    } catch {
      // Expected RED until w2-m2 is a registered executable session.
    }

    expect(reopened?.sessions['w2-m2']).toMatchObject({
      workspace: draft,
      totalRuns: 1,
      runtimeFailures: 0,
      lastRun: { completed: true, finalState: 'residence-built', dispatchedEvents: ['return-to-flower-fruit', 'heavenly-title-conferred'] },
    });
  });

  it('rejects forged event provenance even when the forged run claims success', () => {
    const progress = createInitialProgress();
    const session = completedSession();
    session.lastTrace[1].eventType = 'heavenly-title-conferred';
    (progress.sessions as Record<string, unknown>)['w2-m2'] = session;

    expect(() => importProgress(serializeProgress(progress))).toThrow(/lastTrace|workspace|事件|任务/);
  });

  it('preserves attempts while a visible edit clears stale trace and run evidence', () => {
    const session = completedSession();
    const edited = { ...draft, blocks: draft.blocks.filter((block) => block.id !== 'build-home').map((block) => block.id === 'accept-title' ? { ...block, nextId: null } : block) };
    const progress = createInitialProgress();
    (progress.sessions as Record<string, unknown>)['w2-m2'] = update(session, edited, NOW);

    const reopened = importProgress(serializeProgress(progress));
    expect(reopened.sessions['w2-m2']).toMatchObject({ totalRuns: 1, lastTrace: [], lastRun: null, lastRunAt: null });
  });

  it('adds event-trigger attempts and failures to the week-two parent report', () => {
    const wrong = structuredClone(draft);
    wrong.blocks[3].type = 'xiyou_build_great_sage_residence';
    wrong.blocks[4].type = 'xiyou_accept_great_sage_title';
    const trace = compileMonkeyKingDraft(wrong);
    const failed = record(update(create('w2-m2', NOW), wrong, NOW), runMonkeyKingEvents(trace), trace, NOW);
    const progress = createInitialProgress();
    (progress.sessions as Record<string, unknown>)['w2-m2'] = failed;

    expect(getWeeklyReport(progress, 2)).toMatchObject({ sessionRuns: 1, sessionAdjustments: 1 });
  });
});
