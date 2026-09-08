import { beforeAll, describe, expect, it } from 'vitest';

type BranchRunner = (trace: unknown) => unknown;
type CardId = 'canon-old-woman-disguise' | 'practice-herbalist-elder';
type Action = 'keep-observing' | 'polite-help';
type PoliteStructure = 'default' | 'nested' | 'solved';

let runWeekFourBranchTrace: BranchRunner;
let WEEK_FOUR_BRANCH_CARDS: unknown;

beforeAll(async () => {
  const contract = await import('./weekFourBranchContract') as {
    runWeekFourBranchTrace?: BranchRunner;
    WEEK_FOUR_BRANCH_CARDS?: unknown;
  };
  expect(contract.runWeekFourBranchTrace).toBeTypeOf('function');
  runWeekFourBranchTrace = contract.runWeekFourBranchTrace!;
  WEEK_FOUR_BRANCH_CARDS = contract.WEEK_FOUR_BRANCH_CARDS;
});

const zeroPenalty = { livesLost: 0, resourcesLost: 0, starsLost: 0 };
const condition = (cardId: CardId, value: '白骨精' | '山中采药人', conditionResult: boolean, order: number) => ({ kind: 'condition' as const, cardId, field: 'identity' as const, value, comparedTo: '白骨精' as const, conditionResult, span: { line: 1 as const, from: 3 as const, to: 11 as const }, order });
const politeSpan = (structure: PoliteStructure) => structure === 'default'
  ? { line: 3 as const, from: 0 as const, to: 13 as const }
  : structure === 'nested'
    ? { line: 3 as const, from: 4 as const, to: 17 as const }
    : { line: 4 as const, from: 4 as const, to: 17 as const };
const action = (cardId: CardId, selected: Action, order: number, structure?: PoliteStructure) => ({ kind: 'action' as const, cardId, action: selected, span: selected === 'keep-observing' ? { line: 2 as const, from: 4 as const, to: 20 as const } : politeSpan(structure!), order });
const cardResult = (cardId: CardId, actions: readonly Action[], result: 'single-route' | 'branch-conflict' | 'branch-missing', sceneState: 'old-woman-observed' | 'herbalist-helped' | 'branch-conflict' | 'branch-missing', order: number) => ({ kind: 'card-result' as const, cardId, actions: [...actions], result, sceneState, order });

const defaultTrace = () => [
  condition('canon-old-woman-disguise', '白骨精', true, 1), action('canon-old-woman-disguise', 'keep-observing', 2), action('canon-old-woman-disguise', 'polite-help', 3, 'default'), cardResult('canon-old-woman-disguise', ['keep-observing', 'polite-help'], 'branch-conflict', 'branch-conflict', 4),
  condition('practice-herbalist-elder', '山中采药人', false, 5), action('practice-herbalist-elder', 'polite-help', 6, 'default'), cardResult('practice-herbalist-elder', ['polite-help'], 'single-route', 'herbalist-helped', 7),
];
const nestedTrace = () => [
  condition('canon-old-woman-disguise', '白骨精', true, 1), action('canon-old-woman-disguise', 'keep-observing', 2), action('canon-old-woman-disguise', 'polite-help', 3, 'nested'), cardResult('canon-old-woman-disguise', ['keep-observing', 'polite-help'], 'branch-conflict', 'branch-conflict', 4),
  condition('practice-herbalist-elder', '山中采药人', false, 5), cardResult('practice-herbalist-elder', [], 'branch-missing', 'branch-missing', 6),
];
const solvedTrace = () => [
  condition('canon-old-woman-disguise', '白骨精', true, 1), action('canon-old-woman-disguise', 'keep-observing', 2), cardResult('canon-old-woman-disguise', ['keep-observing'], 'single-route', 'old-woman-observed', 3),
  condition('practice-herbalist-elder', '山中采药人', false, 4), action('practice-herbalist-elder', 'polite-help', 5, 'solved'), cardResult('practice-herbalist-elder', ['polite-help'], 'single-route', 'herbalist-helped', 6),
];
const invalidResult = (trace: unknown[]) => expect(runWeekFourBranchTrace(trace)).toMatchObject({ state: 'python-structure-invalid', completed: false, failureSnapshots: [], penalty: zeroPenalty });
const deepFreeze = <Value>(value: Value): Value => {
  if (value && typeof value === 'object') {
    for (const key of Reflect.ownKeys(value)) deepFreeze(Reflect.get(value, key));
    Object.freeze(value);
  }
  return value;
};

describe('W4-M3 typed branch trace contract', () => {
  it('publishes exactly the two ordered public cards without an answer sequence', () => {
    expect(WEEK_FOUR_BRANCH_CARDS).toEqual([
      { id: 'canon-old-woman-disguise', appearance: '老妇', identity: '白骨精', canon: true },
      { id: 'practice-herbalist-elder', appearance: '老妇', identity: '山中采药人', canon: false },
    ]);
  });

  it('accepts the default unindented trace and records its real conflicting spans', () => {
    expect(runWeekFourBranchTrace(defaultTrace())).toEqual({
      cardResults: [
        { cardId: 'canon-old-woman-disguise', actions: ['keep-observing', 'polite-help'], result: 'branch-conflict', sceneState: 'branch-conflict' },
        { cardId: 'practice-herbalist-elder', actions: ['polite-help'], result: 'single-route', sceneState: 'herbalist-helped' },
      ], state: 'branch-conflict', completed: false,
      failureSnapshots: [{ snapshotId: 'w4-m3:branch-conflict:canon-old-woman-disguise', cardId: 'canon-old-woman-disguise', result: 'branch-conflict', actualActions: ['keep-observing', 'polite-help'], sourceSpans: [{ line: 2, from: 4, to: 20 }, { line: 3, from: 0, to: 13 }] }], penalty: zeroPenalty,
    });
  });

  it('accepts the nested trace and preserves both failure snapshots with nested source spans', () => {
    expect(runWeekFourBranchTrace(nestedTrace())).toEqual({
      cardResults: [
        { cardId: 'canon-old-woman-disguise', actions: ['keep-observing', 'polite-help'], result: 'branch-conflict', sceneState: 'branch-conflict' },
        { cardId: 'practice-herbalist-elder', actions: [], result: 'branch-missing', sceneState: 'branch-missing' },
      ], state: 'branch-conflict', completed: false,
      failureSnapshots: [
        { snapshotId: 'w4-m3:branch-conflict:canon-old-woman-disguise', cardId: 'canon-old-woman-disguise', result: 'branch-conflict', actualActions: ['keep-observing', 'polite-help'], sourceSpans: [{ line: 2, from: 4, to: 20 }, { line: 3, from: 4, to: 17 }] },
        { snapshotId: 'w4-m3:branch-missing:practice-herbalist-elder', cardId: 'practice-herbalist-elder', result: 'branch-missing', actualActions: [], sourceSpans: [] },
      ], penalty: zeroPenalty,
    });
  });

  it('accepts the solved indented trace only when each card keeps one route', () => {
    expect(runWeekFourBranchTrace(solvedTrace())).toEqual({
      cardResults: [
        { cardId: 'canon-old-woman-disguise', actions: ['keep-observing'], result: 'single-route', sceneState: 'old-woman-observed' },
        { cardId: 'practice-herbalist-elder', actions: ['polite-help'], result: 'single-route', sceneState: 'herbalist-helped' },
      ], state: 'branch-proven', completed: true, failureSnapshots: [], penalty: zeroPenalty,
    });
  });

  it('accepts a deep-frozen solved trace without requiring mutable descriptors', () => {
    expect(runWeekFourBranchTrace(deepFreeze(solvedTrace()))).toMatchObject({ state: 'branch-proven', completed: true, penalty: zeroPenalty });
  });

  it('fails closed when a Proxy throws during trace validation', () => {
    const trace = solvedTrace();
    const trappedResult = new Proxy(trace[2]!, {
      getPrototypeOf() { throw new Error('validation trap'); },
    });

    invalidResult([...trace.slice(0, 2), trappedResult, ...trace.slice(3)]);
  });

  it.each([
    ['canon missing and practice conflict', () => [condition('canon-old-woman-disguise', '白骨精', true, 1), cardResult('canon-old-woman-disguise', [], 'branch-missing', 'branch-missing', 2), condition('practice-herbalist-elder', '山中采药人', false, 3), action('practice-herbalist-elder', 'keep-observing', 4), action('practice-herbalist-elder', 'polite-help', 5, 'default'), cardResult('practice-herbalist-elder', ['keep-observing', 'polite-help'], 'branch-conflict', 'branch-conflict', 6)]],
    ['default conflict with a missing practice route', () => [...defaultTrace().slice(0, 5), cardResult('practice-herbalist-elder', [], 'branch-missing', 'branch-missing', 6)]],
    ['both cards conflicting', () => [...defaultTrace().slice(0, 5), action('practice-herbalist-elder', 'keep-observing', 6), action('practice-herbalist-elder', 'polite-help', 7, 'default'), cardResult('practice-herbalist-elder', ['keep-observing', 'polite-help'], 'branch-conflict', 'branch-conflict', 8)]],
    ['a hybrid default canon with solved practice span', () => { const trace = defaultTrace(); return [...trace.slice(0, 5), action('practice-herbalist-elder', 'polite-help', 6, 'solved'), trace[6]!]; }],
  ])('rejects an illegal cross-card combination: %s', (_label, forge) => invalidResult(forge()));

  it.each([
    ['a missing public card', (trace: unknown[]) => trace.slice(0, 3)],
    ['a duplicate public card', (trace: unknown[]) => [...trace.slice(0, 3), ...trace.slice(0, 3)]],
    ['cards in a different order', (trace: unknown[]) => [...trace.slice(3), ...trace.slice(0, 3)]],
    ['appearance used as the condition field', (trace: unknown[]) => [{ ...(trace[0] as Record<string, unknown>), field: 'appearance' }, ...trace.slice(1)]],
    ['the canon identity replaced', (trace: unknown[]) => [{ ...(trace[0] as Record<string, unknown>), value: '山中采药人' }, ...trace.slice(1)]],
    ['the practice identity replaced', (trace: unknown[]) => [...trace.slice(0, 3), { ...(trace[3] as Record<string, unknown>), value: '白骨精' }, ...trace.slice(4)]],
    ['a forged true result', (trace: unknown[]) => [{ ...(trace[0] as Record<string, unknown>), conditionResult: false }, ...trace.slice(1)]],
    ['a forged false result', (trace: unknown[]) => [...trace.slice(0, 3), { ...(trace[3] as Record<string, unknown>), conditionResult: true }, ...trace.slice(4)]],
    ['a different compared value', (trace: unknown[]) => [{ ...(trace[0] as Record<string, unknown>), comparedTo: '山中采药人' }, ...trace.slice(1)]],
    ['the wrong single action for the canon card', (_trace: unknown[]) => [condition('canon-old-woman-disguise', '白骨精', true, 1), action('canon-old-woman-disguise', 'polite-help', 2, 'solved'), cardResult('canon-old-woman-disguise', ['polite-help'], 'single-route', 'herbalist-helped', 3), ...solvedTrace().slice(3)]],
    ['the wrong single action for the practice card', (_trace: unknown[]) => [...solvedTrace().slice(0, 4), action('practice-herbalist-elder', 'keep-observing', 5), cardResult('practice-herbalist-elder', ['keep-observing'], 'single-route', 'old-woman-observed', 6)]],
    ['a repeated action', (_trace: unknown[]) => [condition('canon-old-woman-disguise', '白骨精', true, 1), action('canon-old-woman-disguise', 'keep-observing', 2), action('canon-old-woman-disguise', 'keep-observing', 3), cardResult('canon-old-woman-disguise', ['keep-observing', 'keep-observing'], 'branch-conflict', 'branch-conflict', 4), ...solvedTrace().slice(3)]],
    ['an extra action', (_trace: unknown[]) => [...defaultTrace().slice(0, 3), action('canon-old-woman-disguise', 'keep-observing', 4), cardResult('canon-old-woman-disguise', ['keep-observing', 'polite-help', 'keep-observing'], 'branch-conflict', 'branch-conflict', 5), ...defaultTrace().slice(4).map((event, index) => ({ ...event, order: index + 6 }))]],
    ['an action before its condition', (trace: unknown[]) => [trace[1]!, trace[0]!, ...trace.slice(2)]],
    ['a repeated order', (trace: unknown[]) => [...trace.slice(0, 4), { ...(trace[4] as Record<string, unknown>), order: 4 }, ...trace.slice(5)]],
    ['a skipped order', (trace: unknown[]) => [...trace.slice(0, 4), { ...(trace[4] as Record<string, unknown>), order: 6 }, ...trace.slice(5)]],
    ['a forged condition source span', (trace: unknown[]) => [{ ...(trace[0] as Record<string, unknown>), span: { line: 1, from: 4, to: 12 } }, ...trace.slice(1)]],
    ['a default polite span changed to nested', (trace: unknown[]) => [...trace.slice(0, 2), { ...(trace[2] as Record<string, unknown>), span: politeSpan('nested') }, ...trace.slice(3)]],
    ['a default polite span changed to solved', (trace: unknown[]) => [...trace.slice(0, 2), { ...(trace[2] as Record<string, unknown>), span: politeSpan('solved') }, ...trace.slice(3)]],
    ['a nested polite span changed to default', (_trace: unknown[]) => { const trace = nestedTrace(); return [...trace.slice(0, 2), { ...(trace[2] as Record<string, unknown>), span: politeSpan('default') }, ...trace.slice(3)]; }],
    ['a solved polite span changed to nested', (_trace: unknown[]) => { const trace = solvedTrace(); return [...trace.slice(0, 4), { ...(trace[4] as Record<string, unknown>), span: politeSpan('nested') }, trace[5]!]; }],
    ['a forged card-result action list', (trace: unknown[]) => [...trace.slice(0, 2), { ...(trace[2] as Record<string, unknown>), actions: ['polite-help'] }, ...trace.slice(3)]],
    ['sparse card-result actions', (trace: unknown[]) => {
      const sparseActions = new Array<Action>(1);
      return [...trace.slice(0, 2), { ...(trace[2] as Record<string, unknown>), actions: sparseActions }, ...trace.slice(3)];
    }],
    ['a forged card-result result', (trace: unknown[]) => [...trace.slice(0, 2), { ...(trace[2] as Record<string, unknown>), result: 'branch-conflict', sceneState: 'branch-conflict' }, ...trace.slice(3)]],
    ['a forged card-result scene state', (trace: unknown[]) => [...trace.slice(0, 2), { ...(trace[2] as Record<string, unknown>), sceneState: 'herbalist-helped' }, ...trace.slice(3)]],
    ['a forged card-result order', (trace: unknown[]) => [...trace.slice(0, 2), { ...(trace[2] as Record<string, unknown>), order: 4 }, ...trace.slice(3)]],
    ['an unknown runtime card', (trace: unknown[]) => [{ ...(trace[0] as Record<string, unknown>), cardId: 'forged-card' }, ...trace.slice(1)]],
    ['an unknown runtime action', (trace: unknown[]) => [trace[0]!, { ...(trace[1] as Record<string, unknown>), action: 'solve-for-child' }, ...trace.slice(2)]],
  ])('returns python-structure-invalid for %s', (_label, forge) => invalidResult(forge(solvedTrace() as unknown[])));

  it('does not mutate a real trace and returns deterministic deep-equal results', () => {
    const trace = solvedTrace(); const before = structuredClone(trace);
    const first = runWeekFourBranchTrace(trace); const second = runWeekFourBranchTrace(trace);
    expect(trace).toEqual(before); expect(first).toEqual(second);
  });
});
