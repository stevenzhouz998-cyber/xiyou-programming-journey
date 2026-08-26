import { describe, expect, it } from 'vitest';
import { compileFurnaceConditionDraft, createDefaultFurnaceConditionDraft, runFurnaceCondition } from '../blockly/weekTwoFurnaceConditionContract';
import { createMissionSession, recordRun, updateWorkspaceDraft } from './session';
import { parseFurnaceConditionSession } from './furnaceConditionSessionSchema';
import { createInitialProgress, getWeeklyReport, importProgress, serializeProgress } from './progress';

const now = '2026-08-23T00:00:00.000Z';

describe('W2-M4 furnace condition session', () => {
  it('starts with the visible wrong condition and clears stale run evidence after a correction', () => {
    const session = createMissionSession('w2-m4', now);
    expect(session.workspace).toEqual(createDefaultFurnaceConditionDraft());
    const trace = compileFurnaceConditionDraft(session.workspace);
    const savedRun = recordRun(session, runFurnaceCondition(trace), trace, now);
    const corrected = structuredClone(session.workspace);
    const condition = corrected.blocks.find((block) => block.id === 'smoke-red-eyes')!;
    condition.id = 'furnace-open';
    condition.type = 'xiyou_condition_furnace_open';
    corrected.blocks.find((block) => block.id === 'repeat-until-open')!.conditionBlockId = 'furnace-open';

    expect(updateWorkspaceDraft(savedRun, corrected, now)).toMatchObject({ workspace: corrected, lastTrace: [], lastRun: null });
  });

  it('rejects persisted evidence forged with a different condition source block', () => {
    const draft = createDefaultFurnaceConditionDraft();
    const trace = compileFurnaceConditionDraft(draft);
    const session = recordRun(
      updateWorkspaceDraft(createMissionSession('w2-m4', now), draft, now),
      runFurnaceCondition(trace),
      trace,
      now,
    );
    const forged = structuredClone(session);
    forged.lastTrace[2].conditionSourceBlockId = 'forged-condition';

    expect(() => parseFurnaceConditionSession(forged)).toThrow(/lastTrace|条件|重放/);
  });

  it('rejects a forged cumulative story-day value even when the run otherwise looks valid', () => {
    const draft = createDefaultFurnaceConditionDraft();
    const trace = compileFurnaceConditionDraft(draft);
    const session = recordRun(createMissionSession('w2-m4', now), runFurnaceCondition(trace), trace, now);
    const forged = structuredClone(session);
    forged.lastTrace.find((item) => item.opcode === 'wait_seven_days')!.elapsedDays = 999;

    expect(() => parseFurnaceConditionSession(forged)).toThrow(/lastTrace|重放/);
  });

  it('recompiles and replays the correct visible condition graph on import', () => {
    const draft = createDefaultFurnaceConditionDraft();
    const condition = draft.blocks.find((block) => block.id === 'smoke-red-eyes')!;
    condition.id = 'furnace-open';
    condition.type = 'xiyou_condition_furnace_open';
    draft.blocks.find((block) => block.id === 'repeat-until-open')!.conditionBlockId = condition.id;
    const trace = compileFurnaceConditionDraft(draft);
    const session = recordRun(
      updateWorkspaceDraft(createMissionSession('w2-m4', now), draft, now),
      runFurnaceCondition(trace),
      trace,
      now,
    );
    const progress = createInitialProgress();
    (progress.sessions as Record<string, unknown>)['w2-m4'] = session;

    expect(importProgress(serializeProgress(progress)).sessions['w2-m4']).toEqual(session);
  });

  it('counts condition-debugging attempts in the second-week parent report', () => {
    const draft = createDefaultFurnaceConditionDraft();
    const trace = compileFurnaceConditionDraft(draft);
    let session = recordRun(createMissionSession('w2-m4', now), runFurnaceCondition(trace), trace, now);
    session = recordRun(session, runFurnaceCondition(trace), trace, '2026-08-23T00:00:01.000Z');
    const progress = createInitialProgress();
    (progress.sessions as Record<string, unknown>)['w2-m4'] = session;

    expect(getWeeklyReport(progress, 2)).toMatchObject({
      sessionRuns: 2,
      sessionAdjustments: 2,
      needsSupport: ['循环结束条件'],
    });
  });
});
