import { describe, expect, it } from 'vitest';
import {
  compileFurnaceConditionDraft,
  createDefaultFurnaceConditionDraft,
  runFurnaceCondition,
  validateFurnaceConditionDraft,
} from './weekTwoFurnaceConditionContract';

describe('week two furnace condition contract', () => {
  it('makes the visible red-eyes condition exit too early and identifies that condition block', () => {
    const draft = createDefaultFurnaceConditionDraft();
    const trace = compileFurnaceConditionDraft(draft);
    const result = runFurnaceCondition(trace);

    expect(trace.filter((item) => item.opcode === 'condition_checked')).toHaveLength(2);
    expect(result).toMatchObject({
      completed: false,
      finalState: 'furnace-waiting',
      elapsedDays: 7,
      completedRounds: 1,
      diagnostic: { concept: 'loop-condition', sourceBlockId: 'smoke-red-eyes' },
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
  });

  it('runs seven real seven-day rounds when the connected furnace-open condition is used', () => {
    const draft = createDefaultFurnaceConditionDraft();
    const condition = draft.blocks.find((block) => block.id === 'smoke-red-eyes')!;
    condition.id = 'furnace-open';
    condition.type = 'xiyou_condition_furnace_open';
    const loop = draft.blocks.find((block) => block.type === 'xiyou_repeat_until_furnace_ready')!;
    loop.conditionBlockId = 'furnace-open';
    const trace = compileFurnaceConditionDraft(draft);

    expect(draft.blocks.find((block) => block.id === 'shelter-xun')).toMatchObject({ previousId: 'enter-furnace' });
    expect(trace.find((item) => item.opcode === 'wait_seven_days' && item.iteration === 1)).toMatchObject({ elapsedDays: 7 });
    expect(trace.at(-1)).toMatchObject({ opcode: 'kick_furnace', elapsedDays: 49 });
    expect(trace.filter((item) => item.opcode === 'condition_checked')).toHaveLength(8);
    expect(runFurnaceCondition(trace)).toMatchObject({
      completed: true,
      finalState: 'furnace-toppled',
      elapsedDays: 49,
      completedRounds: 7,
      diagnostic: null,
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
  });

  it('stops a never-true condition at the deterministic safety boundary without punishment', () => {
    const draft = createDefaultFurnaceConditionDraft();
    const condition = draft.blocks.find((block) => block.id === 'smoke-red-eyes')!;
    condition.id = 'smoke-clears';
    condition.type = 'xiyou_condition_smoke_clears';
    const loop = draft.blocks.find((block) => block.type === 'xiyou_repeat_until_furnace_ready')!;
    loop.conditionBlockId = 'smoke-clears';

    const result = runFurnaceCondition(compileFurnaceConditionDraft(draft));
    expect(result).toMatchObject({
      completed: false,
      finalState: 'furnace-open',
      elapsedDays: 49,
      completedRounds: 7,
      diagnostic: { concept: 'condition-never-met', sourceBlockId: 'smoke-clears' },
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
  });

  it('rejects a condition detached from its visible repeat-until input', () => {
    const draft = createDefaultFurnaceConditionDraft();
    const loop = draft.blocks.find((block) => block.type === 'xiyou_repeat_until_furnace_ready')!;
    loop.conditionBlockId = null;

    expect(() => validateFurnaceConditionDraft(draft)).toThrow(/条件/);
  });
});
