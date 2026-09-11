import { runWeekFiveWeatherTrace, WEEK_FIVE_WEATHER_ORDERS, type WeekFiveWeatherOrder, type WeekFiveWeatherTraceItem } from './weekFiveWeatherContract';

export const DEFAULT_WEEK_FIVE_WEATHER_PYTHON = "def weather(order):\n    record_weather('风')\n\nweather('风')\nweather('云')\nweather('雷')\nweather('雨')";

export function parseWeekFiveWeatherDraftEnvelope(code: unknown): { code: string; normalizedCode: string } {
  if (typeof code !== 'string' || code.length > 640 || /\r(?!\n)/.test(code) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(code)) throw new Error('祈雨函数草稿需要是 640 字以内的普通文本。');
  return { code, normalizedCode: code.replaceAll('\r\n', '\n') };
}

export type WeekFiveWeatherPythonInvalid = { state: 'python-structure-invalid'; line: number; reason: 'contract' };
export interface WeekFiveWeatherPythonRunnable {
  pythonCode: string;
  normalizedCode: string;
  bodySource: 'parameter' | 'constant';
  bodyValue: 'order' | WeekFiveWeatherOrder;
  callArguments: WeekFiveWeatherOrder[];
  trace: WeekFiveWeatherTraceItem[];
  run: ReturnType<typeof runWeekFiveWeatherTrace>;
}

export function parseWeekFiveWeatherPython(code: unknown): WeekFiveWeatherPythonRunnable | WeekFiveWeatherPythonInvalid {
  const draft = parseWeekFiveWeatherDraftEnvelope(code); const lines = draft.normalizedCode.split('\n');
  const invalid = (line: number): WeekFiveWeatherPythonInvalid => ({ state: 'python-structure-invalid', line, reason: 'contract' });
  if (lines.length > 9 || lines[0] !== 'def weather(order):') return invalid(1);
  const body = /^    record_weather\((order|(['"])(风|云|雷|雨)\2)\)$/.exec(lines[1] ?? '');
  if (!body) return invalid(2);
  const bodySource = body[1] === 'order' ? 'parameter' : 'constant';
  const bodyValue = bodySource === 'parameter' ? 'order' : body[3] as WeekFiveWeatherOrder;
  const calls: Array<{ value: WeekFiveWeatherOrder; line: number }> = [];
  for (let index = 2; index < lines.length; index += 1) {
    const value = lines[index]!; if (value === '') continue;
    const match = /^weather\((['"])(风|云|雷|雨)\1\)$/.exec(value);
    if (!match || calls.length >= 5) return invalid(index + 1);
    calls.push({ value: match[2] as WeekFiveWeatherOrder, line: index + 1 });
  }
  const trace: WeekFiveWeatherTraceItem[] = [{ kind: 'function-defined', name: 'weather', parameter: 'order', line: 1, order: 1 }];
  calls.forEach((statement, index) => {
    const call = index + 1;
    trace.push({ kind: 'function-called', name: 'weather', argument: statement.value, call, line: statement.line, order: trace.length + 1 });
    trace.push({ kind: 'parameter-bound', parameter: 'order', value: statement.value, call, line: statement.line, order: trace.length + 1 });
    trace.push({ kind: 'action', action: 'record_weather', value: bodySource === 'parameter' ? statement.value : bodyValue as WeekFiveWeatherOrder, source: bodySource, call, line: 2, order: trace.length + 1 });
  });
  return { pythonCode: draft.code, normalizedCode: draft.normalizedCode, bodySource, bodyValue, callArguments: calls.map((call) => call.value), trace, run: runWeekFiveWeatherTrace(trace) };
}

export const isWeekFiveWeatherOrder = (value: string): value is WeekFiveWeatherOrder => WEEK_FIVE_WEATHER_ORDERS.includes(value as WeekFiveWeatherOrder);
