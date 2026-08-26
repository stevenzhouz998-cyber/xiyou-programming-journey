import { describe, expect, it } from 'vitest';
import {
  PEACH_ELIXIR_BLOCK_DEFINITIONS,
  compilePeachElixirDraft,
  createDefaultPeachElixirDraft,
  runPeachElixir,
  validatePeachElixirDraft,
  type PeachElixirInstruction,
  type PeachElixirWorkspaceDraftV1,
} from './weekTwoPeachElixirContract';

const clone = <T,>(value: T): T => structuredClone(value);

function correctDraft(): PeachElixirWorkspaceDraftV1 {
  const draft = createDefaultPeachElixirDraft();
  const drink = draft.blocks.find((block) => block.type === 'xiyou_drink_at_banquet')!;
  const eat = draft.blocks.find((block) => block.type === 'xiyou_eat_golden_elixir')!;
  const tusita = draft.blocks.find((block) => block.type === 'xiyou_stumble_into_tusita')!;
  drink.nextId = tusita.id;
  tusita.previousId = drink.id;
  tusita.nextId = eat.id;
  eat.previousId = tusita.id;
  eat.nextId = null;
  return draft;
}

describe('week-two peach and elixir neutral contract', () => {
  it('starts from one visible wrong-order chain without hiding an answer source', () => {
    const draft = createDefaultPeachElixirDraft();
    expect(draft).toMatchObject({ version: 1, missionId: 'w2-m3' });
    expect(compilePeachElixirDraft(draft).map((item) => item.opcode)).toEqual([
      'guard_peach_garden',
      'learn_peach_banquet',
      'drink_at_banquet',
      'eat_golden_elixir',
      'stumble_into_tusita',
    ]);
    expect(Object.values(PEACH_ELIXIR_BLOCK_DEFINITIONS).map((item) => item.opcode)).toHaveLength(5);
  });

  it('compiles from next connections rather than array order or coordinates', () => {
    const draft = correctDraft();
    draft.blocks.reverse();
    draft.blocks.forEach((block, index) => { block.x = 900 - index * 41; block.y = -700 + index * 73; });
    const trace = compilePeachElixirDraft(draft);
    expect(trace.map((item) => item.opcode)).toEqual([
      'guard_peach_garden',
      'learn_peach_banquet',
      'drink_at_banquet',
      'stumble_into_tusita',
      'eat_golden_elixir',
    ]);
    expect(trace[3]).toMatchObject({
      sourceBlockId: 'peach-tusita',
      previousBlockId: 'peach-drink',
      nextBlockId: 'peach-elixir',
    });
  });

  it.each([
    ['duplicate id', (draft: PeachElixirWorkspaceDraftV1) => { draft.blocks[1].id = draft.blocks[0].id; }],
    ['unknown next', (draft: PeachElixirWorkspaceDraftV1) => { draft.blocks[0].nextId = 'missing'; }],
    ['unknown previous', (draft: PeachElixirWorkspaceDraftV1) => { draft.blocks[1].previousId = 'missing'; }],
    ['non reciprocal link', (draft: PeachElixirWorkspaceDraftV1) => { draft.blocks[1].previousId = null; }],
    ['cycle', (draft: PeachElixirWorkspaceDraftV1) => { draft.blocks[0].previousId = draft.blocks[4].id; draft.blocks[4].nextId = draft.blocks[0].id; }],
    ['non finite coordinate', (draft: PeachElixirWorkspaceDraftV1) => { draft.blocks[0].x = Number.NaN; }],
  ])('rejects %s provenance', (_label, mutate) => {
    const draft = createDefaultPeachElixirDraft();
    mutate(draft);
    expect(() => validatePeachElixirDraft(draft)).toThrow();
  });

  it('rejects duplicate actions and disconnected main chains at compile time while allowing draft editing', () => {
    const draft = correctDraft();
    const duplicate = { ...clone(draft.blocks[0]), id: 'duplicate-garden', previousId: null, nextId: null, x: 600 };
    draft.blocks.push(duplicate);
    expect(() => validatePeachElixirDraft(draft)).not.toThrow();
    expect(() => compilePeachElixirDraft(draft)).toThrow(/一条|重复/);
  });

  it('stops on the first real wrong-order block and records zero punishment', () => {
    const trace = compilePeachElixirDraft(createDefaultPeachElixirDraft());
    const result = runPeachElixir(trace);
    expect(result).toMatchObject({
      completed: false,
      finalState: 'banquet-visited',
      penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
      diagnostic: {
        concept: 'sequence-precondition',
        sourceBlockId: 'peach-elixir',
        opcode: 'eat_golden_elixir',
      },
    });
    expect(result.events.at(-2)).toMatchObject({ type: 'instruction-rejected', sourceBlockId: 'peach-elixir' });
  });

  it('reports each action attempted before its real prerequisite', () => {
    const trace = compilePeachElixirDraft(correctDraft());
    for (const instruction of trace.slice(1)) {
      const result = runPeachElixir([instruction]);
      expect(result.completed).toBe(false);
      expect(result.diagnostic).toMatchObject({ concept: 'sequence-precondition', sourceBlockId: instruction.sourceBlockId });
      expect(result.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
    }
  });

  it('reports an incomplete trace without inventing a source block', () => {
    const trace = compilePeachElixirDraft(correctDraft()).slice(0, 4);
    const result = runPeachElixir(trace);
    expect(result).toMatchObject({ completed: false, finalState: 'tusita-entered' });
    expect(result.diagnostic).toMatchObject({ concept: 'completeness', sourceBlockId: 'peach-tusita' });
  });

  it('completes only the correct visible chain and replays deterministically', () => {
    const trace = compilePeachElixirDraft(correctDraft());
    const first = runPeachElixir(trace);
    const replay = runPeachElixir(clone(trace) as PeachElixirInstruction[]);
    expect(first).toEqual(replay);
    expect(first).toMatchObject({ completed: true, finalState: 'elixir-eaten', diagnostic: null });
    expect(first.events.filter((event) => event.type === 'state-changed')).toHaveLength(5);
  });
});
