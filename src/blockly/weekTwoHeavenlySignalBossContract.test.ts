import { describe, expect, it } from 'vitest';
import {
  compileHeavenlySignalBossDraft,
  createDefaultHeavenlySignalBossDraft,
  runHeavenlySignalBoss,
  validateHeavenlySignalBossDraft,
} from './weekTwoHeavenlySignalBossContract';

function changed(mutator: (draft: ReturnType<typeof createDefaultHeavenlySignalBossDraft>) => void) {
  const draft = structuredClone(createDefaultHeavenlySignalBossDraft());
  mutator(draft);
  return draft;
}

function connect(draft: ReturnType<typeof createDefaultHeavenlySignalBossDraft>, firstId: string, secondId: string | null) {
  const first = draft.blocks.find((block) => block.id === firstId)!;
  if (first.nextId) draft.blocks.find((block) => block.id === first.nextId)!.previousId = null;
  if (secondId) {
    const second = draft.blocks.find((block) => block.id === secondId)!;
    if (second.previousId) draft.blocks.find((block) => block.id === second.previousId)!.nextId = null;
  }
  first.nextId = secondId;
  if (secondId) draft.blocks.find((block) => block.id === secondId)!.previousId = firstId;
}

function correctDraft() {
  return changed((draft) => {
    draft.blocks.find((block) => block.id === 'stable-repeat')!.repeatCount = 3;
    const acceptTitle = draft.blocks.find((block) => block.id === 'accept-title')!;
    const raiseFlag = draft.blocks.find((block) => block.id === 'raise-flag')!;
    acceptTitle.handlerBlockId = 'title-handler';
    acceptTitle.parentBlockId = 'title-handler';
    raiseFlag.handlerBlockId = 'return-handler';
    raiseFlag.parentBlockId = 'return-handler';
    connect(draft, 'raise-flag', null);
    connect(draft, 'accept-title', 'build-residence');
    connect(draft, 'drink-banquet', 'stumble-tusita');
    connect(draft, 'stumble-tusita', 'eat-elixir');
    const redEyes = draft.blocks.find((block) => block.id === 'red-eyes')!;
    redEyes.id = 'furnace-open-signal';
    redEyes.type = 'xiyou_boss_condition_furnace_open';
    draft.blocks.find((block) => block.id === 'furnace-loop')!.conditionBlockId = redEyes.id;
  });
}

describe('W2-M5 heavenly signal boss contract', () => {
  it('starts from the four visible bugs in one composite Blockly draft', () => {
    const draft = createDefaultHeavenlySignalBossDraft();
    expect(draft.blocks.find((block) => block.id === 'stable-repeat')?.repeatCount).toBe(2);
    expect(draft.blocks.find((block) => block.id === 'accept-title')?.handlerBlockId).toBe('return-handler');
    expect(draft.blocks.find((block) => block.id === 'raise-flag')?.handlerBlockId).toBe('title-handler');
    expect(draft.blocks.find((block) => block.id === 'eat-elixir')?.nextId).toBe('stumble-tusita');
    expect(draft.blocks.find((block) => block.id === 'furnace-loop')?.conditionBlockId).toBe('red-eyes');
  });

  it('rejects malformed event hats, graph connections, and detached conditions', () => {
    expect(() => validateHeavenlySignalBossDraft(changed((draft) => {
      draft.blocks.splice(draft.blocks.findIndex((block) => block.id === 'furnace-handler'), 1);
    }))).toThrow(/事件帽/);
    expect(() => validateHeavenlySignalBossDraft(changed((draft) => {
      draft.blocks.push({ ...draft.blocks.find((block) => block.id === 'stable-handler')!, id: 'duplicate-stable-handler' });
    }))).toThrow(/重复/);
    expect(() => validateHeavenlySignalBossDraft(changed((draft) => {
      const action = draft.blocks.find((block) => block.id === 'raise-flag')!;
      action.parentBlockId = 'stable-repeat';
    }))).toThrow(/跨容器/);
    expect(() => validateHeavenlySignalBossDraft(changed((draft) => {
      draft.blocks.find((block) => block.id === 'accept-post')!.nextId = 'stable-repeat';
      draft.blocks.find((block) => block.id === 'stable-repeat')!.previousId = null;
    }))).toThrow(/互惠|连接/);
    expect(() => validateHeavenlySignalBossDraft(changed((draft) => {
      draft.blocks.find((block) => block.id === 'furnace-loop')!.conditionBlockId = null;
    }))).toThrow(/条件/);
  });

  it('rejects orphan actions, loops, and condition sockets instead of only counting their global types', () => {
    const disconnect = (draft: ReturnType<typeof createDefaultHeavenlySignalBossDraft>, id: string) => {
      const block = draft.blocks.find((item) => item.id === id)!;
      const previous = block.previousId ? draft.blocks.find((item) => item.id === block.previousId)! : null;
      const next = block.nextId ? draft.blocks.find((item) => item.id === block.nextId)! : null;
      if (previous) previous.nextId = block.nextId;
      if (next) next.previousId = block.previousId;
      block.parentBlockId = null; block.previousId = null; block.nextId = null;
    };
    expect(() => compileHeavenlySignalBossDraft(changed((draft) => disconnect(draft, 'leave-heaven')))).toThrow(/孤立|容器|完整/);
    expect(() => compileHeavenlySignalBossDraft(changed((draft) => disconnect(draft, 'stable-repeat')))).toThrow(/孤立|容器|完整/);
    expect(() => compileHeavenlySignalBossDraft(changed((draft) => {
      const sensor = draft.blocks.find((block) => block.id === 'red-eyes')!;
      draft.blocks.push({ ...sensor, id: 'orphan-furnace-sensor', conditionBlockId: null });
    }))).toThrow(/孤立|条件|完整/);
  });

  it('diagnoses only the first real blocker as each visible repair reaches it', () => {
    const defaultDraft = createDefaultHeavenlySignalBossDraft();
    expect(runHeavenlySignalBoss(compileHeavenlySignalBossDraft(defaultDraft)).diagnostic).toMatchObject({ concept: 'loop-count', sourceBlockId: 'stable-repeat' });

    const loopFixed = changed((draft) => { draft.blocks.find((block) => block.id === 'stable-repeat')!.repeatCount = 3; });
    expect(runHeavenlySignalBoss(compileHeavenlySignalBossDraft(loopFixed)).diagnostic).toMatchObject({ concept: 'event-routing', sourceBlockId: 'accept-title' });

    const routingFixed = changed((draft) => {
      draft.blocks.find((block) => block.id === 'stable-repeat')!.repeatCount = 3;
      const acceptTitle = draft.blocks.find((block) => block.id === 'accept-title')!;
      const raiseFlag = draft.blocks.find((block) => block.id === 'raise-flag')!;
      acceptTitle.handlerBlockId = 'title-handler'; acceptTitle.parentBlockId = 'title-handler';
      raiseFlag.handlerBlockId = 'return-handler'; raiseFlag.parentBlockId = 'return-handler';
      connect(draft, 'raise-flag', null); connect(draft, 'accept-title', 'build-residence');
    });
    expect(runHeavenlySignalBoss(compileHeavenlySignalBossDraft(routingFixed)).diagnostic).toMatchObject({ concept: 'sequence-precondition', sourceBlockId: 'eat-elixir' });

    const sequenceFixed = correctDraft();
    const open = sequenceFixed.blocks.find((block) => block.id === 'furnace-open-signal')!;
    open.id = 'red-eyes'; open.type = 'xiyou_boss_condition_red_eyes';
    sequenceFixed.blocks.find((block) => block.id === 'furnace-loop')!.conditionBlockId = 'red-eyes';
    expect(runHeavenlySignalBoss(compileHeavenlySignalBossDraft(sequenceFixed)).diagnostic).toMatchObject({ concept: 'loop-condition', sourceBlockId: 'red-eyes' });
  });

  it('runs the correct visible graph through three horses, five signals, seven rounds, and forty-nine days', () => {
    const trace = compileHeavenlySignalBossDraft(correctDraft());
    const result = runHeavenlySignalBoss(trace);
    expect(result).toMatchObject({
      completed: true,
      finalState: 'escaped',
      caredHorses: 3,
      furnaceRounds: 7,
      elapsedDays: 49,
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
    expect(trace.filter((item) => item.kind === 'event-dispatch').map((item) => item.eventType)).toEqual([
      'stable-duty', 'returned-flower-fruit', 'heavenly-title', 'peach-message', 'furnace-refining',
    ]);
    expect(trace.some((item) => (item as { kind: string }).kind === 'canon-epilogue')).toBe(false);
    expect(result.events.at(-1)).toMatchObject({ type: 'canon-epilogue', sourceBlockId: null });
  });

  it('rejects the wrong repeat counts, safely stops a never-true furnace condition, and replays deterministically', () => {
    for (const count of [1, 2, 4]) {
      const draft = correctDraft();
      draft.blocks.find((block) => block.id === 'stable-repeat')!.repeatCount = count;
      expect(runHeavenlySignalBoss(compileHeavenlySignalBossDraft(draft)).diagnostic).toMatchObject({ concept: 'loop-count', sourceBlockId: 'stable-repeat' });
    }
    const never = correctDraft();
    const condition = never.blocks.find((block) => block.id === 'furnace-open-signal')!;
    condition.id = 'smoke-clears'; condition.type = 'xiyou_boss_condition_smoke_clears';
    never.blocks.find((block) => block.id === 'furnace-loop')!.conditionBlockId = condition.id;
    const trace = compileHeavenlySignalBossDraft(never);
    const first = runHeavenlySignalBoss(trace);
    expect(first).toMatchObject({ completed: false, elapsedDays: 49, furnaceRounds: 7, diagnostic: { concept: 'condition-never-met', sourceBlockId: 'smoke-clears' } });
    expect(runHeavenlySignalBoss(trace)).toEqual(first);
  });

  it('derives every furnace condition outcome from the visible condition block type, never its random Blockly id', () => {
    const withCondition = (type: 'xiyou_boss_condition_red_eyes' | 'xiyou_boss_condition_furnace_open' | 'xiyou_boss_condition_smoke_clears') => {
      const draft = correctDraft();
      const sensor = draft.blocks.find((block) => block.id === 'furnace-open-signal')!;
      sensor.id = 'blockly-random-91z'; sensor.type = type;
      draft.blocks.find((block) => block.id === 'furnace-loop')!.conditionBlockId = sensor.id;
      return runHeavenlySignalBoss(compileHeavenlySignalBossDraft(draft));
    };
    expect(withCondition('xiyou_boss_condition_red_eyes')).toMatchObject({ diagnostic: { concept: 'loop-condition', sourceBlockId: 'blockly-random-91z' } });
    expect(withCondition('xiyou_boss_condition_smoke_clears')).toMatchObject({ diagnostic: { concept: 'condition-never-met', sourceBlockId: 'blockly-random-91z' }, furnaceRounds: 7, elapsedDays: 49 });
    expect(withCondition('xiyou_boss_condition_furnace_open')).toMatchObject({ completed: true, furnaceRounds: 7, elapsedDays: 49 });
  });
});
