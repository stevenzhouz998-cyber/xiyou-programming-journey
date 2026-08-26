import { describe, expect, it } from 'vitest';

const completeDraft = {
  version: 1,
  missionId: 'w2-m1',
  blocks: [
    { id: 'accept', type: 'xiyou_accept_stable_post', nextId: 'repeat', parentBlockId: null, repeatCount: null, x: 0, y: 0 },
    { id: 'repeat', type: 'xiyou_repeat_horse_care', nextId: 'rank', parentBlockId: null, repeatCount: 3, x: 0, y: 50 },
    { id: 'care', type: 'xiyou_care_next_horse', nextId: null, parentBlockId: 'repeat', repeatCount: null, x: 20, y: 70 },
    { id: 'rank', type: 'xiyou_learn_stable_rank', nextId: 'leave', parentBlockId: null, repeatCount: null, x: 0, y: 120 },
    { id: 'leave', type: 'xiyou_leave_heaven', nextId: null, parentBlockId: null, repeatCount: null, x: 0, y: 170 },
  ],
} as const;

describe('week two horse-care neutral contract', () => {
  it('exists as an isolated formal contract', async () => {
    const contract = await import('./weekTwoHorseContract').catch(() => null);

    expect(contract).not.toBeNull();
    expect(contract).toMatchObject({
      compileHorseCareDraft: expect.any(Function),
      runHorseCare: expect.any(Function),
      validateHorseCareDraft: expect.any(Function),
    });
  });

  it('expands one visible repeat block into three executable horse-care iterations', async () => {
    const { compileHorseCareDraft } = await import('./weekTwoHorseContract');
    let trace: unknown = null;

    try {
      trace = (compileHorseCareDraft as unknown as (value: typeof completeDraft) => unknown)(completeDraft);
    } catch {
      // The RED state is represented as a value assertion, not an uncaught test error.
    }

    expect(trace).toMatchObject([
      { sourceBlockId: 'accept', opcode: 'accept_stable_post', iteration: null },
      { sourceBlockId: 'repeat', opcode: 'repeat_horse_care_started', repeatCount: 3 },
      { sourceBlockId: 'care', parentBlockId: 'repeat', opcode: 'care_next_horse', iteration: 1 },
      { sourceBlockId: 'care', parentBlockId: 'repeat', opcode: 'care_next_horse', iteration: 2 },
      { sourceBlockId: 'care', parentBlockId: 'repeat', opcode: 'care_next_horse', iteration: 3 },
      { sourceBlockId: 'repeat', opcode: 'repeat_horse_care_finished', repeatCount: 3 },
      { sourceBlockId: 'rank', opcode: 'learn_stable_rank', iteration: null },
      { sourceBlockId: 'leave', opcode: 'leave_heaven', iteration: null },
    ]);
  });

  it('lets the expanded loop drive three real state changes before leaving heaven', async () => {
    const { compileHorseCareDraft, runHorseCare } = await import('./weekTwoHorseContract');
    const trace = (compileHorseCareDraft as unknown as (value: typeof completeDraft) => unknown)(completeDraft);
    let result: unknown = null;

    try {
      result = (runHorseCare as unknown as (instructions: unknown) => unknown)(trace);
    } catch {
      // The RED state is represented as a value assertion, not an uncaught test error.
    }

    expect(result).toMatchObject({
      completed: true,
      finalState: 'left-heaven',
      caredHorses: 3,
      diagnostic: null,
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
    expect((result as { events: Array<{ type: string; state: string }> }).events
      .filter((event) => event.type === 'horse-cared')
      .map((event) => event.state))
      .toEqual(['horses-cared-1', 'horses-cared-2', 'horses-cared-3']);
  });

  it('saves an unfinished empty loop as a draft but refuses to execute it', async () => {
    const { compileHorseCareDraft, validateHorseCareDraft } = await import('./weekTwoHorseContract');
    const unfinished = {
      version: 1 as const,
      missionId: 'w2-m1' as const,
      blocks: [
        { id: 'accept', type: 'xiyou_accept_stable_post' as const, nextId: 'repeat', parentBlockId: null, repeatCount: null, x: 0, y: 0 },
        { id: 'repeat', type: 'xiyou_repeat_horse_care' as const, nextId: null, parentBlockId: null, repeatCount: 3, x: 0, y: 50 },
      ],
    };

    expect(() => validateHorseCareDraft(unfinished)).not.toThrow();
    expect(() => compileHorseCareDraft(unfinished)).toThrow(/循环体/);
  });
});
