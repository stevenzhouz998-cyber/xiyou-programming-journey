export type WeekFiveFunctionAction = 'record_arrival' | 'record_names';
export type WeekFiveFunctionTraceItem =
  | { kind: 'function-defined'; name: 'record_sanqing'; order: 1 }
  | { kind: 'function-called'; name: 'record_sanqing'; call: 1 | 2; line: number; order: number }
  | { kind: 'action'; action: WeekFiveFunctionAction; call: 1 | 2 | null; line: number; scope: 'inside' | 'outside'; order: number };
export type WeekFiveFunctionState = 'call-missing' | 'call-conflict' | 'body-conflict' | 'python-structure-invalid' | 'record-proven';
export type WeekFiveFunctionFailureSnapshot = {
  snapshotId: 'w5-m2:call-missing' | 'w5-m2:call-conflict' | 'w5-m2:body-conflict';
  result: 'call-missing' | 'call-conflict' | 'body-conflict';
  actualActions: string[];
  sourceSpans: Array<{ line: number; from: number; to: number }>;
};
export interface WeekFiveFunctionRunResult {
  state: WeekFiveFunctionState;
  completed: boolean;
  failureSnapshots: WeekFiveFunctionFailureSnapshot[];
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
const isLine = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= 8;

export function runWeekFiveFunctionTrace(raw: unknown): WeekFiveFunctionRunResult {
  const invalid: WeekFiveFunctionRunResult = { state: 'python-structure-invalid', completed: false, failureSnapshots: [], penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } };
  try {
    if (!dense(raw, 9) || raw.length === 0) return invalid;
    const first = raw[0];
    if (!exact(first, ['kind', 'name', 'order']) || first.kind !== 'function-defined' || first.name !== 'record_sanqing' || first.order !== 1) return invalid;
    let calls = 0;
    for (let index = 1; index < raw.length; index += 1) {
      const event = raw[index];
      if (exact(event, ['kind', 'name', 'call', 'line', 'order']) && event.kind === 'function-called') {
        calls += 1;
        if (event.name !== 'record_sanqing' || event.call !== calls || calls > 2 || !isLine(event.line) || event.order !== index + 1) return invalid;
        continue;
      }
      if (!exact(event, ['kind', 'action', 'call', 'line', 'scope', 'order']) || event.kind !== 'action'
        || (event.action !== 'record_arrival' && event.action !== 'record_names') || !isLine(event.line)
        || (event.scope !== 'inside' && event.scope !== 'outside') || event.order !== index + 1) return invalid;
      if (event.scope === 'inside') {
        if (event.call !== calls || (event.call !== 1 && event.call !== 2) || index === 1) return invalid;
      } else if (event.call !== null) return invalid;
    }

    const failureSnapshots: WeekFiveFunctionFailureSnapshot[] = [];
    if (calls === 0) failureSnapshots.push({ snapshotId: 'w5-m2:call-missing', result: 'call-missing', actualActions: ['函数已定义，但尚未调用'], sourceSpans: [{ line: 1, from: 0, to: 20 }] });
    else if (calls !== 1) failureSnapshots.push({ snapshotId: 'w5-m2:call-conflict', result: 'call-conflict', actualActions: [`实际调用 ${calls} 次`], sourceSpans: (raw as WeekFiveFunctionTraceItem[]).filter((event) => event.kind === 'function-called').map((event) => ({ line: event.line, from: 0, to: 16 })) });
    const actions = (raw as WeekFiveFunctionTraceItem[]).filter((event): event is Extract<WeekFiveFunctionTraceItem, { kind: 'action' }> => event.kind === 'action');
    const exactBody = actions.length === 2 && actions[0]?.scope === 'inside' && actions[0].call === 1 && actions[0].action === 'record_arrival'
      && actions[1]?.scope === 'inside' && actions[1].call === 1 && actions[1].action === 'record_names';
    if (calls > 0 && !exactBody) failureSnapshots.push({
      snapshotId: 'w5-m2:body-conflict', result: 'body-conflict',
      actualActions: actions.length ? actions.map((event) => `${event.scope === 'inside' ? '函数内' : '函数外'}：${event.action === 'record_arrival' ? '记录夜入三清观' : '记录说明来历'}`) : ['没有执行教学记录'],
      sourceSpans: actions.map((event) => ({ line: event.line, from: event.scope === 'inside' ? 4 : 0, to: event.scope === 'inside' ? 20 : 16 })),
    });
    return { state: failureSnapshots[0]?.result ?? 'record-proven', completed: failureSnapshots.length === 0, failureSnapshots, penalty: invalid.penalty };
  } catch {
    return invalid;
  }
}
