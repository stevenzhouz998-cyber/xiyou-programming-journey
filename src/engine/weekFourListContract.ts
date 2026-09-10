export const WEEK_FOUR_LIST_CARDS = Object.freeze(['女子', '老妇', '老翁'] as const);
export type WeekFourListAppearance = typeof WEEK_FOUR_LIST_CARDS[number];
export type WeekFourListTraceItem =
  | { kind: 'list-created'; items: WeekFourListAppearance[]; order: 1 }
  | { kind: 'iteration'; index: number; item: WeekFourListAppearance; recorded: WeekFourListAppearance; order: number };
export type WeekFourListState = 'list-ready' | 'list-order-conflict' | 'loop-value-conflict' | 'python-structure-invalid' | 'list-proven';
export type WeekFourListFailureSnapshot = {
  snapshotId: 'w4-m4:list-order-conflict' | 'w4-m4:loop-value-conflict';
  result: 'list-order-conflict' | 'loop-value-conflict';
  actualActions: WeekFourListAppearance[];
  sourceSpans: Array<{ line: number; from: number; to: number }>;
};
export interface WeekFourListRunResult {
  state: WeekFourListState;
  completed: boolean;
  failureSnapshots: WeekFourListFailureSnapshot[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}
const appearance = (v: unknown): v is WeekFourListAppearance => WEEK_FOUR_LIST_CARDS.some(x => x === v);
const keys = (v: unknown, expected: string[]): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype && Reflect.ownKeys(v).length === expected.length && expected.every(k => {
  const d = Object.getOwnPropertyDescriptor(v, k); return d && 'value' in d && d.enumerable;
});
const denseArray = (v: unknown): v is unknown[] => {
  if (!Array.isArray(v) || Object.getPrototypeOf(v) !== Array.prototype || v.length > 6 || Reflect.ownKeys(v).length !== v.length + 1) return false;
  for (let i = 0; i < v.length; i++) { const d = Object.getOwnPropertyDescriptor(v, String(i)); if (!d || !('value' in d) || !d.enumerable) return false; }
  return true;
};
export function runWeekFourListTrace(raw: unknown): WeekFourListRunResult {
  const invalid: WeekFourListRunResult = { state: 'python-structure-invalid', completed: false, failureSnapshots: [], penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } };
  try {
    if (!denseArray(raw) || raw.length < 1 || raw.length > 6) return invalid;
    const first: unknown = raw[0];
    if (!keys(first, ['kind', 'items', 'order']) || first.kind !== 'list-created' || first.order !== 1 || !denseArray(first.items) || first.items.length > 5 || !first.items.every(appearance) || raw.length !== first.items.length + 1) return invalid;
    const events = raw.slice(1);
    if (!events.every((e: unknown, i) => keys(e, ['kind', 'index', 'item', 'recorded', 'order']) && e.kind === 'iteration' && e.index === i && e.item === (first.items as unknown[])[i] && appearance(e.recorded) && e.order === i + 2)) return invalid;
    const iterations = events as Extract<WeekFourListTraceItem, {kind: 'iteration'}>[];
    // Legal programs either print the current item every time or one fixed literal every time.
    if (!iterations.every(e => e.recorded === e.item) && !iterations.every(e => e.recorded === iterations[0]?.recorded)) return invalid;
    const failures: WeekFourListFailureSnapshot[] = [];
    if (first.items.length !== WEEK_FOUR_LIST_CARDS.length || !first.items.every((x, i) => x === WEEK_FOUR_LIST_CARDS[i])) failures.push({ snapshotId: 'w4-m4:list-order-conflict', result: 'list-order-conflict', actualActions: [...first.items] as WeekFourListAppearance[], sourceSpans: [{line: 1, from: 0, to: 11}] });
    if (iterations.some(e => e.item !== e.recorded)) failures.push({ snapshotId: 'w4-m4:loop-value-conflict', result: 'loop-value-conflict', actualActions: iterations.map(e => e.recorded), sourceSpans: [{line: 3, from: 4, to: 9}] });
    return { state: failures[0]?.result ?? 'list-proven', completed: failures.length === 0, failureSnapshots: failures, penalty: invalid.penalty };
  } catch { return invalid; }
}
