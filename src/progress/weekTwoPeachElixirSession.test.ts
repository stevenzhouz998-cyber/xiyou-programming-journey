import { describe, expect, it } from 'vitest';
import {
  compilePeachElixirDraft,
  createDefaultPeachElixirDraft,
  runPeachElixir,
  type PeachElixirWorkspaceDraftV1,
} from '../blockly/weekTwoPeachElixirContract';
import { createInitialProgress, getWeeklyReport, importProgress, serializeProgress } from './progress';
import { createMissionSession, getSessionSupport, recordRun, updateWorkspaceDraft } from './session';

const NOW = '2026-08-22T15:30:00.000Z';
const LATER = '2026-08-22T15:31:00.000Z';

function correctDraft(): PeachElixirWorkspaceDraftV1 {
  const draft = createDefaultPeachElixirDraft();
  const drink = draft.blocks.find((block) => block.id === 'peach-drink')!;
  const eat = draft.blocks.find((block) => block.id === 'peach-elixir')!;
  const tusita = draft.blocks.find((block) => block.id === 'peach-tusita')!;
  drink.nextId = tusita.id;
  tusita.previousId = drink.id;
  tusita.nextId = eat.id;
  eat.previousId = tusita.id;
  eat.nextId = null;
  return draft;
}

describe('w2-m3 Progress V3 sequence-debugging session', () => {
  it('creates the visible wrong-order draft instead of an empty or hidden-answer session', () => {
    const session = createMissionSession('w2-m3', NOW);
    expect(session).toMatchObject({
      workspace: { missionId: 'w2-m3' },
      lastTrace: [],
      lastRun: null,
      totalRuns: 0,
      savedAt: NOW,
    });
    expect(session.workspace.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'peach-elixir', nextId: 'peach-tusita' }),
    ]));
  });

  it('round-trips workspace, canonical trace and deterministic run by recompiling on import', () => {
    const draft = correctDraft();
    const trace = compilePeachElixirDraft(draft);
    let session = updateWorkspaceDraft(createMissionSession('w2-m3', NOW), draft, NOW);
    session = recordRun(session, runPeachElixir(trace), trace, LATER);
    const progress = createInitialProgress();
    progress.sessions['w2-m3'] = session;

    expect(importProgress(serializeProgress(progress)).sessions['w2-m3']).toEqual(session);
  });

  it('rejects forged connection provenance and forged success evidence', () => {
    const draft = correctDraft();
    const trace = compilePeachElixirDraft(draft);
    let session = updateWorkspaceDraft(createMissionSession('w2-m3', NOW), draft, NOW);
    session = recordRun(session, runPeachElixir(trace), trace, LATER);
    const forgedTrace = structuredClone(session);
    forgedTrace.lastTrace[3].previousBlockId = 'forged-parent';
    const forgedRun = structuredClone(session);
    forgedRun.lastRun!.finalState = 'banquet-visited';

    for (const candidate of [forgedTrace, forgedRun]) {
      const progress = createInitialProgress();
      (progress.sessions as Record<string, unknown>)['w2-m3'] = candidate;
      expect(() => importProgress(serializeProgress(progress))).toThrow(/w2-m3|lastTrace|workspace|重放|运行/);
    }
  });

  it('preserves historical attempts while a visible edit clears stale trace and run evidence', () => {
    const wrongDraft = createDefaultPeachElixirDraft();
    const trace = compilePeachElixirDraft(wrongDraft);
    let session = updateWorkspaceDraft(createMissionSession('w2-m3', NOW), wrongDraft, NOW);
    session = recordRun(session, runPeachElixir(trace), trace, NOW);
    session = updateWorkspaceDraft(session, correctDraft(), LATER);
    expect(session).toMatchObject({ totalRuns: 1, runtimeFailures: 1, lastTrace: [], lastRun: null, lastRunAt: null });
  });

  it('adds sequence-debugging attempts and repeated support needs to the week-two parent report', () => {
    const draft = createDefaultPeachElixirDraft();
    const trace = compilePeachElixirDraft(draft);
    let session = updateWorkspaceDraft(createMissionSession('w2-m3', NOW), draft, NOW);
    session = recordRun(session, runPeachElixir(trace), trace, NOW);
    session = recordRun(session, runPeachElixir(trace), trace, LATER);
    expect(getSessionSupport(session, 'w2-m3')).toContain('顺序调试');
    const progress = createInitialProgress();
    progress.sessions['w2-m3'] = session;
    expect(getWeeklyReport(progress, 2)).toMatchObject({ sessionRuns: 2, sessionAdjustments: 2, needsSupport: ['顺序调试'] });
  });
});
