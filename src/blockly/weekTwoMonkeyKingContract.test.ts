import { describe, expect, it } from 'vitest';
import type { MonkeyKingRuntimeEvent, MonkeyKingWorkspaceDraftV1 } from './weekTwoMonkeyKingContract';

const completeDraft: MonkeyKingWorkspaceDraftV1 = {
  version: 1,
  missionId: 'w2-m2',
  blocks: [
    { id: 'return-hat', type: 'xiyou_on_return_flower_fruit', nextId: null, parentBlockId: null, x: 0, y: 0 },
    { id: 'raise-flag', type: 'xiyou_raise_great_sage_flag', nextId: null, parentBlockId: 'return-hat', x: 24, y: 44 },
    { id: 'title-hat', type: 'xiyou_on_heavenly_title', nextId: null, parentBlockId: null, x: 340, y: 0 },
    { id: 'accept-title', type: 'xiyou_accept_great_sage_title', nextId: 'build-home', parentBlockId: 'title-hat', x: 364, y: 44 },
    { id: 'build-home', type: 'xiyou_build_great_sage_residence', nextId: null, parentBlockId: 'title-hat', x: 364, y: 88 },
  ],
};

async function loadContract() {
  const modulePath = './weekTwoMonkeyKingContract';
  return import(/* @vite-ignore */ modulePath).catch(() => null);
}

describe('w2-m2 monkey king event contract', () => {
  it('compiles two visible event handlers into a provenance-rich deterministic trace', async () => {
    const contract = await loadContract();
    expect(contract).not.toBeNull();

    const trace = contract!.compileMonkeyKingDraft(completeDraft);
    expect(trace).toEqual([
      { kind: 'handler', instructionId: 'handler:return-hat', eventId: 'dispatch:return-to-flower-fruit', eventType: 'return-to-flower-fruit', dispatchIndex: 0, handlerBlockId: 'return-hat', sourceBlockId: 'return-hat', parentBlockId: null, opcode: null },
      { kind: 'action', instructionId: 'instruction:raise-flag', eventId: 'dispatch:return-to-flower-fruit', eventType: 'return-to-flower-fruit', dispatchIndex: 0, handlerBlockId: 'return-hat', sourceBlockId: 'raise-flag', parentBlockId: 'return-hat', opcode: 'raise_great_sage_flag' },
      { kind: 'handler', instructionId: 'handler:title-hat', eventId: 'dispatch:heavenly-title-conferred', eventType: 'heavenly-title-conferred', dispatchIndex: 1, handlerBlockId: 'title-hat', sourceBlockId: 'title-hat', parentBlockId: null, opcode: null },
      { kind: 'action', instructionId: 'instruction:accept-title', eventId: 'dispatch:heavenly-title-conferred', eventType: 'heavenly-title-conferred', dispatchIndex: 1, handlerBlockId: 'title-hat', sourceBlockId: 'accept-title', parentBlockId: 'title-hat', opcode: 'accept_great_sage_title' },
      { kind: 'action', instructionId: 'instruction:build-home', eventId: 'dispatch:heavenly-title-conferred', eventType: 'heavenly-title-conferred', dispatchIndex: 1, handlerBlockId: 'title-hat', sourceBlockId: 'build-home', parentBlockId: 'title-hat', opcode: 'build_great_sage_residence' },
    ]);
  });

  it('dispatches the two events in a fixed queue and completes only through matching handlers', async () => {
    const contract = await loadContract();
    expect(contract).not.toBeNull();
    const { compileMonkeyKingDraft, runMonkeyKingEvents } = contract!;
    const result = runMonkeyKingEvents(compileMonkeyKingDraft(completeDraft));

    expect(result).toMatchObject({
      completed: true,
      finalState: 'residence-built',
      diagnostic: null,
      dispatchedEvents: ['return-to-flower-fruit', 'heavenly-title-conferred'],
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
    expect(result.events.filter((event: MonkeyKingRuntimeEvent) => event.type === 'event-dispatched').map((event: MonkeyKingRuntimeEvent) => event.eventType))
      .toEqual(['return-to-flower-fruit', 'heavenly-title-conferred']);
  });

  it('locates an action connected under the wrong event without punishment', async () => {
    const contract = await loadContract();
    expect(contract).not.toBeNull();
    const { compileMonkeyKingDraft, runMonkeyKingEvents } = contract!;
    const wrongEvent = structuredClone(completeDraft);
    wrongEvent.blocks[1].type = 'xiyou_accept_great_sage_title';
    const result = runMonkeyKingEvents(compileMonkeyKingDraft(wrongEvent));

    expect(result).toMatchObject({
      completed: false,
      finalState: 'awaiting-return',
      diagnostic: { concept: 'event-routing', sourceBlockId: 'raise-flag', parentBlockId: 'return-hat', eventType: 'return-to-flower-fruit' },
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
    });
  });

  it('locates the first out-of-order action inside the correct handler', async () => {
    const contract = await loadContract();
    expect(contract).not.toBeNull();
    const { compileMonkeyKingDraft, runMonkeyKingEvents } = contract!;
    const wrongOrder = structuredClone(completeDraft);
    wrongOrder.blocks[3].type = 'xiyou_build_great_sage_residence';
    wrongOrder.blocks[4].type = 'xiyou_accept_great_sage_title';
    const result = runMonkeyKingEvents(compileMonkeyKingDraft(wrongOrder));

    expect(result).toMatchObject({ completed: false, finalState: 'flag-raised' });
    expect(result.diagnostic).toMatchObject({ concept: 'handler-sequence', sourceBlockId: 'accept-title', parentBlockId: 'title-hat' });
  });

  it('saves incomplete handler drafts but refuses to compile missing or empty handlers', async () => {
    const contract = await loadContract();
    expect(contract).not.toBeNull();
    const { compileMonkeyKingDraft, validateMonkeyKingDraft } = contract!;
    const missing = { ...completeDraft, blocks: completeDraft.blocks.slice(0, 2) };
    const empty = { ...completeDraft, blocks: completeDraft.blocks.filter((block) => block.id !== 'raise-flag') };

    expect(() => validateMonkeyKingDraft(missing)).not.toThrow();
    expect(() => compileMonkeyKingDraft(missing)).toThrow(/缺少.*事件帽/);
    expect(() => validateMonkeyKingDraft(empty)).not.toThrow();
    expect(() => compileMonkeyKingDraft(empty)).toThrow(/事件处理器不能为空/);
  });

  it('rejects duplicate event hats and disconnected action roots as non-executable drafts', async () => {
    const contract = await loadContract();
    expect(contract).not.toBeNull();
    const { compileMonkeyKingDraft, validateMonkeyKingDraft } = contract!;
    const duplicate = structuredClone(completeDraft);
    duplicate.blocks.push({ id: 'return-hat-2', type: 'xiyou_on_return_flower_fruit', nextId: null, parentBlockId: null, x: 0, y: 160 });
    const orphan = structuredClone(completeDraft);
    orphan.blocks[1].parentBlockId = null;

    expect(() => validateMonkeyKingDraft(duplicate)).not.toThrow();
    expect(() => compileMonkeyKingDraft(duplicate)).toThrow(/重复.*事件帽/);
    expect(() => validateMonkeyKingDraft(orphan)).not.toThrow();
    expect(() => compileMonkeyKingDraft(orphan)).toThrow(/动作积木必须连接在事件帽下/);
  });
});
