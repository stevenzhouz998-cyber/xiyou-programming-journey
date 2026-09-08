export type WeekFourBranchCardId = 'canon-old-woman-disguise' | 'practice-herbalist-elder';
export type WeekFourBranchAction = 'keep-observing' | 'polite-help';
export type WeekFourBranchState = 'branch-ready' | 'branch-conflict' | 'branch-missing' | 'python-structure-invalid' | 'branch-proven';
export type WeekFourBranchTraceOrder = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type WeekFourBranchConditionSpan = { line: 1; from: 3; to: 11 };
export type WeekFourBranchKeepObservingSpan = { line: 2; from: 4; to: 20 };
export type WeekFourBranchPoliteHelpSpan = { line: 3; from: 0; to: 13 } | { line: 3; from: 4; to: 17 } | { line: 4; from: 4; to: 17 };
export type WeekFourBranchActionSpan = WeekFourBranchKeepObservingSpan | WeekFourBranchPoliteHelpSpan;
export type WeekFourBranchSceneState = 'old-woman-observed' | 'herbalist-helped' | 'branch-conflict' | 'branch-missing';
export type WeekFourBranchCardResult = 'single-route' | 'branch-conflict' | 'branch-missing';

export type WeekFourBranchCard =
  | { readonly id: 'canon-old-woman-disguise'; readonly appearance: '老妇'; readonly identity: '白骨精'; readonly canon: true }
  | { readonly id: 'practice-herbalist-elder'; readonly appearance: '老妇'; readonly identity: '山中采药人'; readonly canon: false };

export const WEEK_FOUR_BRANCH_CARDS = Object.freeze([
  Object.freeze({ id: 'canon-old-woman-disguise', appearance: '老妇', identity: '白骨精', canon: true }),
  Object.freeze({ id: 'practice-herbalist-elder', appearance: '老妇', identity: '山中采药人', canon: false }),
] as const satisfies readonly WeekFourBranchCard[]);

export type WeekFourBranchTraceItem =
  | {
    kind: 'condition';
    cardId: WeekFourBranchCardId;
    field: 'identity';
    value: '白骨精' | '山中采药人';
    comparedTo: '白骨精';
    conditionResult: boolean;
    span: WeekFourBranchConditionSpan;
    order: WeekFourBranchTraceOrder;
  }
  | {
    kind: 'action';
    cardId: WeekFourBranchCardId;
    action: WeekFourBranchAction;
    span: WeekFourBranchActionSpan;
    order: WeekFourBranchTraceOrder;
  }
  | {
    kind: 'card-result';
    cardId: WeekFourBranchCardId;
    actions: WeekFourBranchAction[];
    result: WeekFourBranchCardResult;
    sceneState: WeekFourBranchSceneState;
    order: WeekFourBranchTraceOrder;
  };

export type WeekFourBranchCardRunResult<CardId extends WeekFourBranchCardId = WeekFourBranchCardId> = {
  cardId: CardId;
  actions: WeekFourBranchAction[];
  result: WeekFourBranchCardResult;
  sceneState: WeekFourBranchSceneState;
};

export type WeekFourBranchFailureSnapshot =
  | {
    snapshotId: 'w4-m3:branch-conflict:canon-old-woman-disguise';
    cardId: 'canon-old-woman-disguise';
    result: 'branch-conflict';
    actualActions: ['keep-observing', 'polite-help'];
    sourceSpans: [WeekFourBranchKeepObservingSpan, WeekFourBranchPoliteHelpSpan];
  }
  | {
    snapshotId: 'w4-m3:branch-missing:practice-herbalist-elder';
    cardId: 'practice-herbalist-elder';
    result: 'branch-missing';
    actualActions: [];
    sourceSpans: [];
  };

export interface WeekFourBranchRunResult {
  cardResults: [
    WeekFourBranchCardRunResult<'canon-old-woman-disguise'>,
    WeekFourBranchCardRunResult<'practice-herbalist-elder'>,
  ];
  state: WeekFourBranchState;
  completed: boolean;
  failureSnapshots: WeekFourBranchFailureSnapshot[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

type ExactRecord = Record<string, unknown>;
type ParsedAction = { action: WeekFourBranchAction; span: WeekFourBranchActionSpan };
type ParsedCard<CardId extends WeekFourBranchCardId = WeekFourBranchCardId> = { result: WeekFourBranchCardRunResult<CardId>; actions: ParsedAction[] };

const zeroPenalty = Object.freeze({ livesLost: 0, resourcesLost: 0, starsLost: 0 }) as { livesLost: 0; resourcesLost: 0; starsLost: 0 };

const sameKeys = (value: unknown, keys: readonly string[]): value is ExactRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const actualKeys = Reflect.ownKeys(value);
  const expectedKeys = [...keys].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((key) => typeof key !== 'string')) return false;
  const sortedActualKeys = (actualKeys as string[]).sort();
  return sortedActualKeys.every((key, index) => key === expectedKeys[index])
    && expectedKeys.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor !== undefined
        && Object.prototype.hasOwnProperty.call(descriptor, 'value')
        && descriptor.enumerable;
    });
};

const isTraceOrder = (value: unknown): value is WeekFourBranchTraceOrder => typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 8;
const isConditionSpan = (value: unknown): value is WeekFourBranchConditionSpan => sameKeys(value, ['line', 'from', 'to']) && value.line === 1 && value.from === 3 && value.to === 11;
const isKeepObservingSpan = (value: unknown): value is WeekFourBranchKeepObservingSpan => sameKeys(value, ['line', 'from', 'to']) && value.line === 2 && value.from === 4 && value.to === 20;
const isPoliteHelpSpan = (value: unknown): value is WeekFourBranchPoliteHelpSpan => sameKeys(value, ['line', 'from', 'to'])
  && ((value.line === 3 && value.from === 0 && value.to === 13)
    || (value.line === 3 && value.from === 4 && value.to === 17)
    || (value.line === 4 && value.from === 4 && value.to === 17));
const isActionSpan = (value: unknown, action: WeekFourBranchAction): value is WeekFourBranchActionSpan => sameKeys(value, ['line', 'from', 'to'])
  && (action === 'keep-observing'
    ? isKeepObservingSpan(value)
    : isPoliteHelpSpan(value));

const isActionEvent = (value: unknown): value is ExactRecord => sameKeys(value, ['kind', 'cardId', 'action', 'span', 'order']) && value.kind === 'action';

const sameActions = (actual: unknown, expected: readonly WeekFourBranchAction[]): actual is WeekFourBranchAction[] => {
  if (!Array.isArray(actual) || Object.getPrototypeOf(actual) !== Array.prototype || actual.length !== expected.length) return false;
  const ownKeys = Reflect.ownKeys(actual);
  if (ownKeys.length !== expected.length + 1 || !ownKeys.includes('length')) return false;
  return expected.every((action, index) => {
    const key = String(index);
    const descriptor = Object.getOwnPropertyDescriptor(actual, key);
    return ownKeys.includes(key)
      && descriptor !== undefined
      && Object.prototype.hasOwnProperty.call(descriptor, 'value')
      && descriptor.enumerable
      && descriptor.value === action;
  });
};

const expectedSingleRoute = (conditionResult: boolean): { action: WeekFourBranchAction; sceneState: WeekFourBranchSceneState } => conditionResult
  ? { action: 'keep-observing', sceneState: 'old-woman-observed' }
  : { action: 'polite-help', sceneState: 'herbalist-helped' };

const inferCardResult = (conditionResult: boolean, actions: readonly WeekFourBranchAction[]): Omit<WeekFourBranchCardRunResult, 'cardId'> | null => {
  if (actions.length === 0) return { actions: [], result: 'branch-missing', sceneState: 'branch-missing' };
  if (actions.length === 2 && actions[0] === 'keep-observing' && actions[1] === 'polite-help') {
    return { actions: ['keep-observing', 'polite-help'], result: 'branch-conflict', sceneState: 'branch-conflict' };
  }
  const expected = expectedSingleRoute(conditionResult);
  if (actions.length === 1 && actions[0] === expected.action) return { actions: [expected.action], result: 'single-route', sceneState: expected.sceneState };
  return null;
};

type WeekFourBranchStructure = 'default' | 'nested' | 'solved';

const hasActionAt = (actions: readonly ParsedAction[], index: number, action: WeekFourBranchAction, line: number, from: number, to: number): boolean => {
  const candidate = actions[index];
  return candidate !== undefined
    && candidate.action === action
    && candidate.span.line === line
    && candidate.span.from === from
    && candidate.span.to === to;
};

const structureFor = (canon: ParsedCard, practice: ParsedCard): WeekFourBranchStructure | null => {
  const defaultStructure = canon.actions.length === 2
    && hasActionAt(canon.actions, 0, 'keep-observing', 2, 4, 20)
    && hasActionAt(canon.actions, 1, 'polite-help', 3, 0, 13)
    && practice.actions.length === 1
    && hasActionAt(practice.actions, 0, 'polite-help', 3, 0, 13);
  if (defaultStructure) return 'default';

  const nestedStructure = canon.actions.length === 2
    && hasActionAt(canon.actions, 0, 'keep-observing', 2, 4, 20)
    && hasActionAt(canon.actions, 1, 'polite-help', 3, 4, 17)
    && practice.actions.length === 0;
  if (nestedStructure) return 'nested';

  const solvedStructure = canon.actions.length === 1
    && hasActionAt(canon.actions, 0, 'keep-observing', 2, 4, 20)
    && practice.actions.length === 1
    && hasActionAt(practice.actions, 0, 'polite-help', 4, 4, 17);
  return solvedStructure ? 'solved' : null;
};

const conflictSourceSpans = (actions: readonly ParsedAction[]): [WeekFourBranchKeepObservingSpan, WeekFourBranchPoliteHelpSpan] | null => {
  const keep = actions[0];
  const polite = actions[1];
  if (!keep || !polite || keep.action !== 'keep-observing' || polite.action !== 'polite-help' || !isKeepObservingSpan(keep.span) || !isPoliteHelpSpan(polite.span)) return null;
  return [structuredClone(keep.span), structuredClone(polite.span)];
};

const invalidResult = (): WeekFourBranchRunResult => ({
  cardResults: [
    { cardId: 'canon-old-woman-disguise', actions: [], result: 'branch-missing', sceneState: 'branch-missing' },
    { cardId: 'practice-herbalist-elder', actions: [], result: 'branch-missing', sceneState: 'branch-missing' },
  ],
  state: 'python-structure-invalid',
  completed: false,
  failureSnapshots: [],
  penalty: structuredClone(zeroPenalty),
});

const readCard = <CardId extends WeekFourBranchCardId>(
  trace: readonly unknown[],
  start: number,
  expectedCard: Extract<WeekFourBranchCard, { id: CardId }>,
): { parsed: ParsedCard<CardId>; next: number } | null => {
  let index = start;
  const expectedOrder = (): WeekFourBranchTraceOrder => (index + 1) as WeekFourBranchTraceOrder;
  const candidate = trace[index];
  if (!sameKeys(candidate, ['kind', 'cardId', 'field', 'value', 'comparedTo', 'conditionResult', 'span', 'order'])
    || candidate.kind !== 'condition'
    || candidate.cardId !== expectedCard.id
    || candidate.field !== 'identity'
    || candidate.value !== expectedCard.identity
    || candidate.comparedTo !== '白骨精'
    || candidate.conditionResult !== (expectedCard.identity === '白骨精')
    || !isConditionSpan(candidate.span)
    || !isTraceOrder(candidate.order)
    || candidate.order !== expectedOrder()) return null;

  const conditionResult = candidate.conditionResult;
  index += 1;
  const actions: ParsedAction[] = [];
  while (true) {
    const event = trace[index];
    if (!isActionEvent(event)) break;
    const selected = event.action;
    if (event.cardId !== expectedCard.id
      || (selected !== 'keep-observing' && selected !== 'polite-help')
      || !isActionSpan(event.span, selected)
      || !isTraceOrder(event.order)
      || event.order !== expectedOrder()) return null;
    actions.push({ action: selected, span: structuredClone(event.span) });
    index += 1;
  }

  const inferred = inferCardResult(conditionResult, actions.map(({ action }) => action));
  const resultEvent = trace[index];
  if (!inferred
    || !sameKeys(resultEvent, ['kind', 'cardId', 'actions', 'result', 'sceneState', 'order'])
    || resultEvent.kind !== 'card-result'
    || resultEvent.cardId !== expectedCard.id
    || !sameActions(resultEvent.actions, inferred.actions)
    || resultEvent.result !== inferred.result
    || resultEvent.sceneState !== inferred.sceneState
    || !isTraceOrder(resultEvent.order)
    || resultEvent.order !== expectedOrder()) return null;

  return {
    parsed: {
      result: { cardId: expectedCard.id, ...inferred },
      actions,
    },
    next: index + 1,
  };
};

type ValidatedWeekFourBranchTrace = {
  canon: ParsedCard<'canon-old-woman-disguise'>;
  practice: ParsedCard<'practice-herbalist-elder'>;
  structure: WeekFourBranchStructure;
};

const validateWeekFourBranchTrace = (trace: unknown): ValidatedWeekFourBranchTrace | null => {
  if (!Array.isArray(trace)) return null;
  const canon = readCard(trace, 0, WEEK_FOUR_BRANCH_CARDS[0]);
  if (!canon) return null;
  const practice = readCard(trace, canon.next, WEEK_FOUR_BRANCH_CARDS[1]);
  if (!practice || practice.next !== trace.length) return null;
  const structure = structureFor(canon.parsed, practice.parsed);
  if (!structure) return null;
  return { canon: canon.parsed, practice: practice.parsed, structure };
};

const validateAtRuntimeBoundary = (trace: unknown): ValidatedWeekFourBranchTrace | null => {
  try {
    return validateWeekFourBranchTrace(trace);
  } catch {
    return null;
  }
};

export function runWeekFourBranchTrace(trace: unknown): WeekFourBranchRunResult {
  const validated = validateAtRuntimeBoundary(trace);
  if (!validated) return invalidResult();
  const { canon, practice, structure } = validated;

  const cardResults: WeekFourBranchRunResult['cardResults'] = [
    structuredClone(canon.result),
    structuredClone(practice.result),
  ];
  const failureSnapshots: WeekFourBranchFailureSnapshot[] = [];
  if (structure !== 'solved') {
    const sourceSpans = conflictSourceSpans(canon.actions);
    if (!sourceSpans) return invalidResult();
    failureSnapshots.push({
      snapshotId: 'w4-m3:branch-conflict:canon-old-woman-disguise',
      cardId: 'canon-old-woman-disguise',
      result: 'branch-conflict',
      actualActions: ['keep-observing', 'polite-help'],
      sourceSpans,
    });
  }
  if (structure === 'nested') {
    failureSnapshots.push({
      snapshotId: 'w4-m3:branch-missing:practice-herbalist-elder',
      cardId: 'practice-herbalist-elder',
      result: 'branch-missing',
      actualActions: [],
      sourceSpans: [],
    });
  }

  const state: WeekFourBranchState = structure === 'solved' ? 'branch-proven' : 'branch-conflict';
  return {
    cardResults,
    state,
    completed: state === 'branch-proven',
    failureSnapshots,
    penalty: structuredClone(zeroPenalty),
  };
}
