export const WEEK_FIVE_WEATHER_ORDERS = ['风', '云', '雷', '雨'] as const;
export type WeekFiveWeatherOrder = (typeof WEEK_FIVE_WEATHER_ORDERS)[number];

export type WeekFiveWeatherTraceItem =
  | { kind: 'function-defined'; name: 'weather'; parameter: 'order'; line: 1; order: 1 }
  | { kind: 'function-called'; name: 'weather'; argument: WeekFiveWeatherOrder; call: number; line: number; order: number }
  | { kind: 'parameter-bound'; parameter: 'order'; value: WeekFiveWeatherOrder; call: number; line: number; order: number }
  | { kind: 'action'; action: 'record_weather'; value: WeekFiveWeatherOrder; source: 'parameter' | 'constant'; call: number; line: number; order: number };

export type WeekFiveWeatherState = 'call-conflict' | 'parameter-unused' | 'python-structure-invalid' | 'weather-proven';
export type WeekFiveWeatherFailureSnapshot = {
  snapshotId: 'w5-m3:call-conflict' | 'w5-m3:parameter-unused';
  result: 'call-conflict' | 'parameter-unused';
  actualActions: string[];
  sourceSpans: Array<{ line: number; from: number; to: number }>;
};
export interface WeekFiveWeatherRunResult {
  state: WeekFiveWeatherState;
  completed: boolean;
  failureSnapshots: WeekFiveWeatherFailureSnapshot[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

const exact = (value: unknown, keys: string[]): value is Record<string, unknown> => !!value
  && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  && Reflect.ownKeys(value).length === keys.length
  && keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && 'value' in descriptor && descriptor.enumerable;
  });
const dense = (value: unknown, max: number): value is unknown[] => Array.isArray(value)
  && Object.getPrototypeOf(value) === Array.prototype && value.length <= max
  && Reflect.ownKeys(value).length === value.length + 1
  && Array.from({ length: value.length }, (_, index) => Object.getOwnPropertyDescriptor(value, String(index)))
    .every((descriptor) => descriptor && 'value' in descriptor && descriptor.enumerable);
const isOrder = (value: unknown): value is WeekFiveWeatherOrder => WEEK_FIVE_WEATHER_ORDERS.includes(value as WeekFiveWeatherOrder);
const isLine = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= 9;

export function runWeekFiveWeatherTrace(raw: unknown): WeekFiveWeatherRunResult {
  const penalty = { livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const };
  const invalid = (): WeekFiveWeatherRunResult => ({ state: 'python-structure-invalid', completed: false, failureSnapshots: [], penalty });
  try {
    if (!dense(raw, 16) || raw.length < 1) return invalid();
    const first = raw[0];
    if (!exact(first, ['kind', 'name', 'parameter', 'line', 'order']) || first.kind !== 'function-defined' || first.name !== 'weather' || first.parameter !== 'order' || first.line !== 1 || first.order !== 1) return invalid();
    const argumentsSeen: WeekFiveWeatherOrder[] = [];
    const valuesSeen: WeekFiveWeatherOrder[] = [];
    const sourcesSeen: Array<'parameter' | 'constant'> = [];
    let cursor = 1;
    let call = 0;
    while (cursor < raw.length) {
      const called = raw[cursor]; const bound = raw[cursor + 1]; const action = raw[cursor + 2]; call += 1;
      if (!exact(called, ['kind', 'name', 'argument', 'call', 'line', 'order']) || called.kind !== 'function-called' || called.name !== 'weather' || !isOrder(called.argument) || called.call !== call || !isLine(called.line) || called.order !== cursor + 1) return invalid();
      if (!exact(bound, ['kind', 'parameter', 'value', 'call', 'line', 'order']) || bound.kind !== 'parameter-bound' || bound.parameter !== 'order' || bound.value !== called.argument || bound.call !== call || bound.line !== called.line || bound.order !== cursor + 2) return invalid();
      if (!exact(action, ['kind', 'action', 'value', 'source', 'call', 'line', 'order']) || action.kind !== 'action' || action.action !== 'record_weather' || !isOrder(action.value) || (action.source !== 'parameter' && action.source !== 'constant') || action.call !== call || action.line !== 2 || action.order !== cursor + 3) return invalid();
      argumentsSeen.push(called.argument); valuesSeen.push(action.value); sourcesSeen.push(action.source); cursor += 3;
    }
    if (call > 5) return invalid();
    const failureSnapshots: WeekFiveWeatherFailureSnapshot[] = [];
    if (JSON.stringify(argumentsSeen) !== JSON.stringify(WEEK_FIVE_WEATHER_ORDERS)) failureSnapshots.push({
      snapshotId: 'w5-m3:call-conflict', result: 'call-conflict',
      actualActions: argumentsSeen.length ? argumentsSeen.map((value, index) => `第 ${index + 1} 次传入 ${value}`) : ['没有调用 weather'],
      sourceSpans: (raw as WeekFiveWeatherTraceItem[]).filter((event) => event.kind === 'function-called').map((event) => ({ line: event.line, from: 0, to: 13 })),
    });
    if (sourcesSeen.some((source) => source !== 'parameter') || valuesSeen.some((value, index) => value !== argumentsSeen[index])) failureSnapshots.push({
      snapshotId: 'w5-m3:parameter-unused', result: 'parameter-unused',
      actualActions: argumentsSeen.map((value, index) => `传入 ${value} → order=${value} → 实际记录 ${valuesSeen[index] ?? '无'}`),
      sourceSpans: [{ line: 2, from: 4, to: 25 }],
    });
    return { state: failureSnapshots[0]?.result ?? 'weather-proven', completed: failureSnapshots.length === 0, failureSnapshots, penalty };
  } catch { return invalid(); }
}
