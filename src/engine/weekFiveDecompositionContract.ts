export const WEEK_FIVE_TRIAL_RECORDS = ['坐禅', '隔板猜物', '砍头比试故事', '剖腹比试故事', '油锅比试故事'] as const;
export type WeekFiveTrialRecord = (typeof WEEK_FIVE_TRIAL_RECORDS)[number];
export const WEEK_FIVE_DECOMPOSITION_FUNCTIONS = ['record_meditation', 'record_guess', 'record_final_trials', 'record_five_trials'] as const;
export type WeekFiveDecompositionFunction = (typeof WEEK_FIVE_DECOMPOSITION_FUNCTIONS)[number];
export type WeekFiveSmallFunction = Exclude<WeekFiveDecompositionFunction, 'record_five_trials'>;

export type WeekFiveDecompositionTraceItem =
  | { kind: 'function-defined'; name: WeekFiveDecompositionFunction; line: number; order: number }
  | { kind: 'action-declared'; action: 'record_trial'; value: WeekFiveTrialRecord; owner: WeekFiveSmallFunction; line: number; order: number }
  | { kind: 'function-called'; name: WeekFiveDecompositionFunction; caller: 'top-level' | WeekFiveDecompositionFunction; depth: 1 | 2; call: number; line: number; order: number }
  | { kind: 'action'; action: 'record_trial'; value: WeekFiveTrialRecord; owner: WeekFiveSmallFunction; depth: 1 | 2; call: number; line: number; order: number };

export type WeekFiveDecompositionState = 'record-ownership-conflict' | 'coordinator-call-conflict' | 'python-structure-invalid' | 'decomposition-proven';
export type WeekFiveDecompositionFailureSnapshot = {
  snapshotId: 'w5-m4:record-ownership-conflict' | 'w5-m4:coordinator-call-conflict';
  result: 'record-ownership-conflict' | 'coordinator-call-conflict';
  actualActions: string[];
  sourceSpans: Array<{ line: number; from: number; to: number }>;
};
export interface WeekFiveDecompositionRunResult {
  state: WeekFiveDecompositionState;
  completed: boolean;
  failureSnapshots: WeekFiveDecompositionFailureSnapshot[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

const exact = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value
  && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  && Reflect.ownKeys(value).length === keys.length
  && keys.every((key) => { const descriptor = Object.getOwnPropertyDescriptor(value, key); return descriptor && 'value' in descriptor && descriptor.enumerable; });
const dense = (value: unknown, max: number): value is unknown[] => Array.isArray(value)
  && Object.getPrototypeOf(value) === Array.prototype && value.length <= max
  && Reflect.ownKeys(value).length === value.length + 1
  && Array.from({ length: value.length }, (_, index) => Object.getOwnPropertyDescriptor(value, String(index))).every((descriptor) => descriptor && 'value' in descriptor && descriptor.enumerable);
const isFunction = (value: unknown): value is WeekFiveDecompositionFunction => WEEK_FIVE_DECOMPOSITION_FUNCTIONS.includes(value as WeekFiveDecompositionFunction);
const isSmallFunction = (value: unknown): value is WeekFiveSmallFunction => isFunction(value) && value !== 'record_five_trials';
const isRecord = (value: unknown): value is WeekFiveTrialRecord => WEEK_FIVE_TRIAL_RECORDS.includes(value as WeekFiveTrialRecord);
const isLine = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= 24;

const expectedByOwner: Record<WeekFiveSmallFunction, readonly WeekFiveTrialRecord[]> = {
  record_meditation: ['坐禅'],
  record_guess: ['隔板猜物'],
  record_final_trials: ['砍头比试故事', '剖腹比试故事', '油锅比试故事'],
};

export function runWeekFiveDecompositionTrace(raw: unknown): WeekFiveDecompositionRunResult {
  const penalty = { livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const };
  const invalid = (): WeekFiveDecompositionRunResult => ({ state: 'python-structure-invalid', completed: false, failureSnapshots: [], penalty });
  try {
    if (!dense(raw, 32) || raw.length < 4) return invalid();
    for (let index = 0; index < WEEK_FIVE_DECOMPOSITION_FUNCTIONS.length; index += 1) {
      const event = raw[index];
      if (!exact(event, ['kind', 'name', 'line', 'order']) || event.kind !== 'function-defined' || event.name !== WEEK_FIVE_DECOMPOSITION_FUNCTIONS[index] || !isLine(event.line) || event.order !== index + 1) return invalid();
    }
    const ownership = new Map<WeekFiveSmallFunction, WeekFiveTrialRecord[]>();
    const ownershipLines = new Map<WeekFiveSmallFunction, number[]>();
    const coordinatorCalls: WeekFiveSmallFunction[] = [];
    const coordinatorLines: number[] = [];
    const topLevelCalls: WeekFiveDecompositionFunction[] = [];
    let activeSmall: { name: WeekFiveSmallFunction; depth: 1 | 2; call: number; nextAction: number } | null = null;
    let coordinatorActive = false;
    const finishActive = () => !activeSmall || activeSmall.nextAction === (ownership.get(activeSmall.name) ?? []).length;
    let call = 0;
    for (let index = 4; index < raw.length; index += 1) {
      const event = raw[index];
      if (exact(event, ['kind', 'action', 'value', 'owner', 'line', 'order']) && event.kind === 'action-declared') {
        if (call !== 0 || event.action !== 'record_trial' || !isRecord(event.value) || !isSmallFunction(event.owner) || !isLine(event.line) || event.order !== index + 1) return invalid();
        ownership.set(event.owner, [...(ownership.get(event.owner) ?? []), event.value]);
        ownershipLines.set(event.owner, [...(ownershipLines.get(event.owner) ?? []), event.line]);
      } else if (exact(event, ['kind', 'name', 'caller', 'depth', 'call', 'line', 'order']) && event.kind === 'function-called') {
        if (!finishActive()) return invalid();
        activeSmall = null;
        if (!isFunction(event.name) || (event.caller !== 'top-level' && !isFunction(event.caller)) || (event.depth !== 1 && event.depth !== 2) || event.call !== ++call || !isLine(event.line) || event.order !== index + 1) return invalid();
        if (event.caller === 'top-level') { if (event.depth !== 1) return invalid(); coordinatorActive = event.name === 'record_five_trials'; topLevelCalls.push(event.name); if (isSmallFunction(event.name)) activeSmall = { name: event.name, depth: 1, call, nextAction: 0 }; }
        else if (event.caller === 'record_five_trials' && isSmallFunction(event.name)) { if (event.depth !== 2 || !coordinatorActive) return invalid(); coordinatorCalls.push(event.name); coordinatorLines.push(event.line); activeSmall = { name: event.name, depth: 2, call, nextAction: 0 }; }
        else return invalid();
      } else if (exact(event, ['kind', 'action', 'value', 'owner', 'depth', 'call', 'line', 'order']) && event.kind === 'action') {
        if (!activeSmall || event.action !== 'record_trial' || !isRecord(event.value) || event.owner !== activeSmall.name || event.depth !== activeSmall.depth || event.call !== activeSmall.call || !isLine(event.line) || event.order !== index + 1) return invalid();
        const declaredValues = ownership.get(activeSmall.name) ?? []; const declaredLines = ownershipLines.get(activeSmall.name) ?? [];
        if (event.value !== declaredValues[activeSmall.nextAction] || event.line !== declaredLines[activeSmall.nextAction]) return invalid();
        activeSmall.nextAction += 1;
      } else return invalid();
    }
    if (!finishActive()) return invalid();
    const failureSnapshots: WeekFiveDecompositionFailureSnapshot[] = [];
    const wrongOwners = (Object.keys(expectedByOwner) as WeekFiveSmallFunction[]).filter((owner) => JSON.stringify(ownership.get(owner) ?? []) !== JSON.stringify(expectedByOwner[owner]));
    const mismatchSpans = (owner: WeekFiveSmallFunction) => {
      const actual = ownership.get(owner) ?? [];
      const expected = expectedByOwner[owner];
      const lines = ownershipLines.get(owner) ?? [];
      const spans = actual.flatMap((value, index) => value === expected[index] ? [] : [{ line: lines[index], from: 4, to: 38 }]);
      if (actual.length < expected.length || spans.length === 0) {
        const definitionIndex = WEEK_FIVE_DECOMPOSITION_FUNCTIONS.indexOf(owner);
        const fallbackLine = lines.at(-1) ?? (raw[definitionIndex] as { line: number }).line;
        spans.push({ line: fallbackLine, from: 4, to: 38 });
      }
      return spans;
    };
    if (wrongOwners.length) failureSnapshots.push({
      snapshotId: 'w5-m4:record-ownership-conflict', result: 'record-ownership-conflict',
      actualActions: wrongOwners.map((owner) => `${owner === 'record_meditation' ? '坐禅记录组' : owner === 'record_guess' ? '猜物记录组' : '后三项记录组'}实际有：${(ownership.get(owner) ?? []).join('、') || '无'}`),
      sourceSpans: wrongOwners.flatMap(mismatchSpans),
    });
    if (JSON.stringify(topLevelCalls) !== JSON.stringify(['record_five_trials']) || JSON.stringify(coordinatorCalls) !== JSON.stringify(['record_meditation', 'record_guess', 'record_final_trials'])) failureSnapshots.push({
      snapshotId: 'w5-m4:coordinator-call-conflict', result: 'coordinator-call-conflict',
      actualActions: [`总记录依次启动：${coordinatorCalls.map((name) => name === 'record_meditation' ? '坐禅记录组' : name === 'record_guess' ? '猜物记录组' : '后三项记录组').join(' → ') || '无'}`, `顶层启动：${topLevelCalls.length === 1 && topLevelCalls[0] === 'record_five_trials' ? '总记录' : '未通过总记录唯一启动'}`],
      sourceSpans: coordinatorLines.map((line) => ({ line, from: 4, to: 30 })),
    });
    return { state: failureSnapshots[0]?.result ?? 'decomposition-proven', completed: failureSnapshots.length === 0, failureSnapshots, penalty };
  } catch { return invalid(); }
}
