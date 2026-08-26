import { describe, expect, it } from 'vitest';
import {
  compileManorHelpDraft,
  createDefaultManorHelpDraft,
  runManorHelp,
} from '../blockly/weekThreeManorHelpContract';
import { completeMission, createInitialProgress, importProgress, serializeProgress } from './progress';
import { parseManorHelpSession } from './manorHelpSessionSchema';
import {
  createMissionSession,
  recordCompileFailure,
  recordConditionObservationUse,
  recordRun,
  updateWorkspaceDraft,
} from './session';

const NOW = '2026-08-26T00:00:00.000Z';
const LATER = '2026-08-26T00:01:00.000Z';

function correctDraft() {
  const draft = createDefaultManorHelpDraft();
  draft.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help';
  return draft;
}

function failedSession() {
  const trace = compileManorHelpDraft(createDefaultManorHelpDraft());
  return recordRun(createMissionSession('w3-m1', NOW), runManorHelp(trace), trace, NOW);
}

describe('W3-M1 manor help session', () => {
  it('creates the dedicated default session with no run evidence', () => {
    expect(createMissionSession('w3-m1', NOW)).toMatchObject({
      workspace: createDefaultManorHelpDraft(),
      lastTrace: [], lastRun: null, scenarioResults: [], failureSnapshot: null,
      totalRuns: 0, runtimeFailures: 0, compileFailures: 0,
      conceptFailures: { programStructure: 0, conditionSelection: 0, branchRouting: 0, completeness: 0 },
      conditionObservationUses: [], lastRunAt: null, savedAt: NOW,
    });
  });

  it('records the default failed run as replayable failure evidence in exactly one bucket', () => {
    const session = failedSession();
    expect(session).toMatchObject({
      totalRuns: 1, runtimeFailures: 1, compileFailures: 0,
      conceptFailures: { programStructure: 0, conditionSelection: 1, branchRouting: 0, completeness: 0 },
      scenarioResults: [{ scenarioId: 'canon-gaocai-help', passed: true }, { scenarioId: 'practice-manor-directions', passed: false }],
      failureSnapshot: { scenarioId: 'practice-manor-directions', observedValue: true, branch: 'then' },
      lastRunAt: NOW,
    });
    expect(parseManorHelpSession(session)).toEqual(session);
  });

  it('records a correct two-scenario success without runtime failure increments', () => {
    const draft = correctDraft();
    const trace = compileManorHelpDraft(draft);
    const session = recordRun(updateWorkspaceDraft(createMissionSession('w3-m1', NOW), draft, NOW), runManorHelp(trace), trace, LATER);
    expect(session).toMatchObject({ totalRuns: 1, runtimeFailures: 0, scenarioResults: [{ passed: true }, { passed: true }], failureSnapshot: null });
    expect(parseManorHelpSession(session)).toEqual(session);
  });

  it('records only canonical condition-selection or branch-routing failures and rejects forged traces', () => {
    const branchDraft = correctDraft();
    branchDraft.blocks.find((block) => block.id === 'manor-then')!.type = 'w3_manor_continue_journey';
    branchDraft.blocks.find((block) => block.id === 'manor-else')!.type = 'w3_manor_accept_and_return_notice';
    const trace = compileManorHelpDraft(branchDraft);
    const run = runManorHelp(trace);
    const session = recordRun(updateWorkspaceDraft(createMissionSession('w3-m1', NOW), branchDraft, NOW), run, trace, LATER);
    expect(session.conceptFailures).toEqual({ programStructure: 0, conditionSelection: 0, branchRouting: 1, completeness: 0 });
    expect(() => recordRun(createMissionSession('w3-m1', NOW), runManorHelp([]), [], NOW)).toThrow(/确定性编译/);
  });

  it('invalidates stale run evidence after a semantic edit but preserves cumulative audit history', () => {
    const observed = recordConditionObservationUse(failedSession(), failedSession().failureSnapshot!.snapshotId, LATER);
    const edited = updateWorkspaceDraft(observed, correctDraft(), '2026-08-26T00:02:00.000Z');
    expect(edited).toMatchObject({ totalRuns: 1, runtimeFailures: 1, lastTrace: [], lastRun: null, scenarioResults: [], failureSnapshot: null, lastRunAt: null });
    expect(edited.conditionObservationUses).toEqual(observed.conditionObservationUses);
    expect(edited.conditionObservationUses[0]!.workspace).toEqual(createDefaultManorHelpDraft());
    expect(edited.conditionObservationUses[0]!.workspace).not.toEqual(edited.workspace);
    expect(parseManorHelpSession(edited)).toEqual(edited);
  });

  it('preserves fresh run evidence when an equivalent draft recompiles to the same trace', () => {
    const recorded = failedSession();
    const layoutOnly = structuredClone(createDefaultManorHelpDraft());
    layoutOnly.blocks.reverse();
    layoutOnly.blocks.forEach((block, index) => { block.x += index * 7; block.y += index * 11; });
    const updated = updateWorkspaceDraft(recorded, layoutOnly, LATER);
    expect(updated).toMatchObject({ lastTrace: recorded.lastTrace, lastRun: recorded.lastRun, scenarioResults: recorded.scenarioResults, failureSnapshot: recorded.failureSnapshot, lastRunAt: NOW, savedAt: LATER });
  });

  it('counts compiler failures as program structure failures', () => {
    const session = recordCompileFailure(createMissionSession('w3-m1', NOW), 'program-structure', LATER);
    expect(session).toMatchObject({ compileFailures: 1, conceptFailures: { programStructure: 1 } });
    expect(parseManorHelpSession(session)).toEqual(session);
  });

  it('allows a compile-only adjustment without a runtime run', () => {
    const session = recordCompileFailure(createMissionSession('w3-m1', NOW), 'program-structure', LATER);
    expect(session).toMatchObject({ totalRuns: 0, runtimeFailures: 0, compileFailures: 1, conceptFailures: { programStructure: 1 } });
    expect(parseManorHelpSession(session)).toEqual(session);
  });

  it('requires scenario results to be an empty array for zero and edited-cleared evidence states', () => {
    const zero = createMissionSession('w3-m1', NOW);
    for (const scenarioResults of ['forged', null, {}, [{ scenarioId: 'forged' }]]) {
      const forged = structuredClone(zero) as unknown as { scenarioResults: unknown };
      forged.scenarioResults = scenarioResults;
      expect(() => parseManorHelpSession(forged)).toThrow(/scenarioResults|运行证据/);
    }
    expect(parseManorHelpSession(zero)).toEqual(zero);
    expect(parseManorHelpSession(recordCompileFailure(createMissionSession('w3-m1', NOW), 'program-structure', LATER)))
      .toMatchObject({ totalRuns: 0, scenarioResults: [] });
    expect(parseManorHelpSession(updateWorkspaceDraft(failedSession(), correctDraft(), LATER)))
      .toMatchObject({ totalRuns: 1, lastTrace: [], scenarioResults: [] });
  });

  it('rejects runtime failure counters that exceed actual runtime executions', () => {
    const zeroRuns = createMissionSession('w3-m1', NOW);
    zeroRuns.runtimeFailures = 1;
    zeroRuns.conceptFailures.conditionSelection = 1;
    expect(() => parseManorHelpSession(zeroRuns)).toThrow(/运行失败|累计失败/);

    const oneRun = failedSession();
    oneRun.runtimeFailures = 2;
    oneRun.conceptFailures.conditionSelection = 2;
    expect(() => parseManorHelpSession(oneRun)).toThrow(/运行失败|累计失败/);
  });

  it('records one immutable canonical observation use per current failure snapshot', () => {
    const session = failedSession();
    const snapshotId = session.failureSnapshot!.snapshotId;
    const once = recordConditionObservationUse(session, snapshotId, LATER);
    const twice = recordConditionObservationUse(once, snapshotId, '2026-08-26T00:02:00.000Z');
    expect(once.conditionObservationUses).toEqual([{
      snapshotId,
      usedAt: LATER,
      workspace: createDefaultManorHelpDraft(),
    }]);
    session.workspace.blocks[0]!.x = 999;
    expect(once.conditionObservationUses[0]!.workspace.blocks[0]!.x).not.toBe(999);
    expect(twice).toEqual(once);
    expect(() => recordConditionObservationUse(session, 'wrong', LATER)).toThrow(/快照/);
    expect(() => recordConditionObservationUse(session, snapshotId, '2026-08-26')).toThrow(/ISO/);
  });

  it('round-trips an imported W3-M1 session through the current V3 schema', () => {
    const progress = createInitialProgress();
    progress.sessions['w3-m1'] = failedSession();
    expect(importProgress(serializeProgress(progress)).sessions['w3-m1']).toEqual(progress.sessions['w3-m1']);
  });

  it('replays each observation lineage independently after a current workspace edit and rejects forged audit entries', () => {
    const observed = recordConditionObservationUse(failedSession(), failedSession().failureSnapshot!.snapshotId, LATER);
    const edited = updateWorkspaceDraft(observed, correctDraft(), '2026-08-26T00:02:00.000Z');
    expect(parseManorHelpSession(edited)).toEqual(edited);

    const mutations: Array<(value: typeof edited) => void> = [
      (value) => { delete (value.conditionObservationUses[0] as Partial<typeof value.conditionObservationUses[number]>).workspace; },
      (value) => { (value.conditionObservationUses[0] as any).workspace = null; },
      (value) => { value.conditionObservationUses[0]!.workspace = correctDraft(); },
      (value) => { value.conditionObservationUses[0]!.snapshotId = 'forged'; },
      (value) => { value.conditionObservationUses.push(structuredClone(value.conditionObservationUses[0]!)); },
    ];
    for (const mutate of mutations) {
      const forged = structuredClone(edited);
      mutate(forged);
      expect(() => parseManorHelpSession(forged)).toThrow();
    }
  });

  it('rejects forged workspace, trace, replay output, snapshot, audit use, counters, and timestamps', () => {
    const valid = failedSession();
    const mutations: Array<(value: typeof valid) => void> = [
      (value) => { value.workspace.blocks[0].nextId = 'forged'; },
      (value) => { value.lastTrace[0].sourceBlockId = 'forged'; },
      (value) => { value.lastRun!.scenarioResults[1].passed = true; },
      (value) => { value.scenarioResults[1].passed = true; },
      (value) => { value.failureSnapshot!.evidenceCode = 'forged'; },
      (value) => { value.conditionObservationUses = [{ snapshotId: value.failureSnapshot!.snapshotId, usedAt: 'not-a-date', workspace: structuredClone(value.workspace) }]; },
      (value) => { value.conditionObservationUses = [{ snapshotId: 'old', usedAt: NOW, workspace: structuredClone(value.workspace) }, { snapshotId: 'old', usedAt: LATER, workspace: structuredClone(value.workspace) }]; },
      (value) => { value.conceptFailures.conditionSelection = 0; },
      (value) => { value.savedAt = 'not-a-date'; },
    ];
    for (const mutate of mutations) {
      const forged = structuredClone(valid);
      mutate(forged);
      expect(() => parseManorHelpSession(forged)).toThrow();
    }
  });

  it('rejects partial evidence but keeps root-level formal completion proof after a later current edit', () => {
    const run = failedSession();
    const partial = structuredClone(run); partial.lastRun = null;
    expect(() => parseManorHelpSession(partial)).toThrow(/证据/);
    const edited = updateWorkspaceDraft(run, correctDraft(), LATER);
    expect(parseManorHelpSession(edited)).toEqual(edited);
    const draft = correctDraft();
    const trace = compileManorHelpDraft(draft);
    const progress = createInitialProgress();
    progress.sessions['w3-m1'] = recordRun(
      updateWorkspaceDraft(createMissionSession('w3-m1', NOW), draft, NOW),
      runManorHelp(trace),
      trace,
      NOW,
    );
    const completed = completeMission(progress, 'w3-m1', { stars: 3, hintsUsed: 0 });
    const proof = structuredClone((completed as any).missionCompletionEvidence['w3-m1']);
    const laterEdit = { ...completed, sessions: { ...completed.sessions, 'w3-m1': edited } };
    expect(importProgress(serializeProgress(laterEdit)).missionCompletionEvidence['w3-m1']).toEqual(proof);
  });
});
