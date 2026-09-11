export const WEEK_FIVE_STORY_FUNCTIONS = [
  'rescue_monks',
  'record_sanqing',
  'weather',
  'record_weather_sequence',
  'record_meditation',
  'record_guess',
  'record_final_trials',
  'record_later_trials',
  'record_chechi_story',
] as const;
export type WeekFiveStoryFunction = (typeof WEEK_FIVE_STORY_FUNCTIONS)[number];
export const WEEK_FIVE_STORY_MONKS = ['甲', '乙', '丙'] as const;
export type WeekFiveStoryMonk = (typeof WEEK_FIVE_STORY_MONKS)[number];
export const WEEK_FIVE_STORY_WEATHER = ['风', '云', '雷', '雨'] as const;
export type WeekFiveStoryWeather = (typeof WEEK_FIVE_STORY_WEATHER)[number];
export const WEEK_FIVE_STORY_TRIALS = ['坐禅', '隔板猜物', '砍头比试故事', '剖腹比试故事', '油锅比试故事'] as const;
export type WeekFiveStoryTrial = (typeof WEEK_FIVE_STORY_TRIALS)[number];
export type WeekFiveStorySmallFunction = 'record_meditation' | 'record_guess' | 'record_final_trials';

type CallOwner = 'top-level' | WeekFiveStoryFunction;
export type WeekFiveStoryOrchestrationTraceItem =
  | { kind: 'function-defined'; name: WeekFiveStoryFunction; parameter: 'order' | null; line: number; order: number }
  | { kind: 'function-called'; name: WeekFiveStoryFunction; caller: CallOwner; depth: 1 | 2 | 3; call: number; line: number; order: number }
  | { kind: 'function-returned'; name: WeekFiveStoryFunction; caller: CallOwner; depth: 1 | 2 | 3; call: number; line: number; order: number }
  | { kind: 'monks-list-created'; owner: 'rescue_monks'; items: WeekFiveStoryMonk[]; call: number; line: number; order: number }
  | { kind: 'monks-loop-entered'; owner: 'rescue_monks'; variable: 'monk'; iterable: 'monks'; items: WeekFiveStoryMonk[]; call: number; line: number; order: number }
  | { kind: 'monk-action'; owner: 'rescue_monks'; action: 'release' | 'register'; target: WeekFiveStoryMonk; current: WeekFiveStoryMonk | null; iteration: number | null; scope: 'inside' | 'outside'; call: number; line: number; order: number }
  | { kind: 'temple-action'; owner: 'record_sanqing'; action: 'record_arrival' | 'record_names'; call: number; line: number; order: number }
  | { kind: 'parameter-bound'; owner: 'weather'; parameter: 'order'; value: WeekFiveStoryWeather; call: number; line: number; order: number }
  | { kind: 'weather-action'; owner: 'weather'; action: 'record_weather'; value: WeekFiveStoryWeather; source: 'parameter' | 'constant'; call: number; line: number; order: number }
  | { kind: 'trial-action'; owner: WeekFiveStorySmallFunction; action: 'record_trial'; value: WeekFiveStoryTrial; call: number; line: number; order: number };

export type WeekFiveStoryOrchestrationState =
  | 'monk-loop-conflict'
  | 'temple-call-conflict'
  | 'weather-binding-conflict'
  | 'later-call-order-conflict'
  | 'python-structure-invalid'
  | 'story-orchestration-proven';

export type WeekFiveStoryOrchestrationFailureSnapshot = {
  snapshotId: `w5-m5:${Exclude<WeekFiveStoryOrchestrationState, 'python-structure-invalid' | 'story-orchestration-proven'>}`;
  result: Exclude<WeekFiveStoryOrchestrationState, 'python-structure-invalid' | 'story-orchestration-proven'>;
  actualActions: string[];
  sourceSpans: Array<{ line: number; from: number; to: number }>;
};

export interface WeekFiveStoryOrchestrationRunResult {
  state: WeekFiveStoryOrchestrationState;
  completed: boolean;
  failureSnapshots: WeekFiveStoryOrchestrationFailureSnapshot[];
  penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 };
}

const exact = (value: unknown, keys: readonly string[]): value is Record<string, unknown> => !!value
  && typeof value === 'object'
  && Object.getPrototypeOf(value) === Object.prototype
  && Reflect.ownKeys(value).length === keys.length
  && keys.every((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && 'value' in descriptor && descriptor.enumerable;
  });
const dense = (value: unknown, max: number): value is unknown[] => Array.isArray(value)
  && Object.getPrototypeOf(value) === Array.prototype
  && value.length <= max
  && Reflect.ownKeys(value).length === value.length + 1
  && Array.from({ length: value.length }, (_, index) => Object.getOwnPropertyDescriptor(value, String(index))).every((descriptor) => descriptor && 'value' in descriptor && descriptor.enumerable);
const isFunction = (value: unknown): value is WeekFiveStoryFunction => WEEK_FIVE_STORY_FUNCTIONS.includes(value as WeekFiveStoryFunction);
const isMonk = (value: unknown): value is WeekFiveStoryMonk => WEEK_FIVE_STORY_MONKS.includes(value as WeekFiveStoryMonk);
const isWeather = (value: unknown): value is WeekFiveStoryWeather => WEEK_FIVE_STORY_WEATHER.includes(value as WeekFiveStoryWeather);
const isTrial = (value: unknown): value is WeekFiveStoryTrial => WEEK_FIVE_STORY_TRIALS.includes(value as WeekFiveStoryTrial);
const isSmall = (value: unknown): value is WeekFiveStorySmallFunction => ['record_meditation', 'record_guess', 'record_final_trials'].includes(value as string);
const isLine = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 1 && (value as number) <= 64;
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

const labels: Record<WeekFiveStoryFunction, string> = {
  rescue_monks: '解困阶段', record_sanqing: '三清观阶段', weather: '天气记录函数', record_weather_sequence: '天气阶段',
  record_meditation: '坐禅记录组', record_guess: '猜物记录组', record_final_trials: '后三项记录组',
  record_later_trials: '后续比试阶段', record_chechi_story: '故事总编排',
};
const expectedTrials: Record<WeekFiveStorySmallFunction, readonly WeekFiveStoryTrial[]> = {
  record_meditation: ['坐禅'],
  record_guess: ['隔板猜物'],
  record_final_trials: ['砍头比试故事', '剖腹比试故事', '油锅比试故事'],
};

function snapshot(
  result: WeekFiveStoryOrchestrationFailureSnapshot['result'],
  actualActions: string[],
  lines: number[],
): WeekFiveStoryOrchestrationRunResult {
  return {
    state: result,
    completed: false,
    failureSnapshots: [{
      snapshotId: `w5-m5:${result}`,
      result,
      actualActions,
      sourceSpans: [...new Set(lines.length ? lines : [1])].map((line) => ({ line, from: 0, to: 40 })),
    }],
    penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 },
  };
}

export function runWeekFiveStoryOrchestrationTrace(raw: unknown): WeekFiveStoryOrchestrationRunResult {
  const penalty = { livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const };
  const invalid = (): WeekFiveStoryOrchestrationRunResult => ({ state: 'python-structure-invalid', completed: false, failureSnapshots: [], penalty });
  try {
    if (!dense(raw, 96) || raw.length < 10) return invalid();
    const definitions = new Map<WeekFiveStoryFunction, number>();
    let index = 0;
    while (index < raw.length) {
      const event = raw[index];
      if (!exact(event, ['kind', 'name', 'parameter', 'line', 'order']) || event.kind !== 'function-defined') break;
      if (!isFunction(event.name) || definitions.has(event.name) || !isLine(event.line) || event.order !== index + 1) return invalid();
      const parameter = event.name === 'weather' ? 'order' : null;
      if (event.parameter !== parameter) return invalid();
      definitions.set(event.name, event.line);
      index += 1;
    }
    if (definitions.size !== WEEK_FIVE_STORY_FUNCTIONS.length || WEEK_FIVE_STORY_FUNCTIONS.some((name) => !definitions.has(name))) return invalid();

    const calls: Array<{ name: WeekFiveStoryFunction; caller: CallOwner; depth: 1 | 2 | 3; call: number; line: number }> = [];
    const monkLists: Array<{ items: WeekFiveStoryMonk[]; call: number; line: number }> = [];
    const loops: Array<{ items: WeekFiveStoryMonk[]; call: number; line: number }> = [];
    const monkActions: Array<{ action: 'release' | 'register'; target: WeekFiveStoryMonk; current: WeekFiveStoryMonk | null; iteration: number | null; scope: 'inside' | 'outside'; call: number; line: number }> = [];
    const templeActions: Array<{ action: 'record_arrival' | 'record_names'; call: number; line: number }> = [];
    const bindings: Array<{ value: WeekFiveStoryWeather; call: number; line: number }> = [];
    const weatherActions: Array<{ value: WeekFiveStoryWeather; source: 'parameter' | 'constant'; call: number; line: number }> = [];
    const trialActions = new Map<WeekFiveStorySmallFunction, Array<{ value: WeekFiveStoryTrial; call: number; line: number }>>();
    let expectedCall = 0;
    const stack: Array<{ name: WeekFiveStoryFunction; caller: CallOwner; depth: 1 | 2 | 3; call: number; line: number }> = [];

    for (; index < raw.length; index += 1) {
      const event = raw[index];
      if (!event || typeof event !== 'object' || (event as { order?: unknown }).order !== index + 1) return invalid();
      if (exact(event, ['kind', 'name', 'caller', 'depth', 'call', 'line', 'order']) && event.kind === 'function-called') {
        if (!isFunction(event.name) || (event.caller !== 'top-level' && !isFunction(event.caller)) || ![1, 2, 3].includes(event.depth as number) || event.call !== ++expectedCall || !isLine(event.line)) return invalid();
        const activeCaller = stack.at(-1)?.name ?? 'top-level';
        const validDepth = event.caller === activeCaller && (event.depth as number) === stack.length + 1 && (event.caller === 'top-level' ? event.depth === 1
          : event.caller === 'record_chechi_story' ? event.depth === 2 && ['rescue_monks', 'record_sanqing', 'record_weather_sequence', 'record_later_trials'].includes(event.name)
            : event.caller === 'record_weather_sequence' ? event.depth === 3 && event.name === 'weather'
              : event.caller === 'record_later_trials' ? event.depth === 3 && isSmall(event.name)
                : false);
        if (!validDepth) return invalid();
        const called = { name: event.name, caller: event.caller as CallOwner, depth: event.depth as 1 | 2 | 3, call: event.call as number, line: event.line };
        calls.push(called); stack.push(called);
      } else if (exact(event, ['kind', 'name', 'caller', 'depth', 'call', 'line', 'order']) && event.kind === 'function-returned') {
        const active = stack.at(-1);
        if (!active || !isFunction(event.name) || event.name !== active.name || event.caller !== active.caller || event.depth !== active.depth || event.call !== active.call || event.line !== active.line) return invalid();
        stack.pop();
      } else if (exact(event, ['kind', 'owner', 'items', 'call', 'line', 'order']) && event.kind === 'monks-list-created') {
        if (event.owner !== 'rescue_monks' || stack.at(-1)?.name !== 'rescue_monks' || event.call !== stack.at(-1)?.call || !dense(event.items, 5) || !(event.items as unknown[]).every(isMonk) || !isLine(event.line)) return invalid();
        monkLists.push({ items: [...event.items] as WeekFiveStoryMonk[], call: event.call as number, line: event.line });
      } else if (exact(event, ['kind', 'owner', 'variable', 'iterable', 'items', 'call', 'line', 'order']) && event.kind === 'monks-loop-entered') {
        if (event.owner !== 'rescue_monks' || stack.at(-1)?.name !== 'rescue_monks' || event.call !== stack.at(-1)?.call || event.variable !== 'monk' || event.iterable !== 'monks' || !dense(event.items, 5) || !(event.items as unknown[]).every(isMonk) || !isLine(event.line)) return invalid();
        loops.push({ items: [...event.items] as WeekFiveStoryMonk[], call: event.call as number, line: event.line });
      } else if (exact(event, ['kind', 'owner', 'action', 'target', 'current', 'iteration', 'scope', 'call', 'line', 'order']) && event.kind === 'monk-action') {
        if (event.owner !== 'rescue_monks' || stack.at(-1)?.name !== 'rescue_monks' || event.call !== stack.at(-1)?.call || !['release', 'register'].includes(event.action as string) || !isMonk(event.target) || (event.current !== null && !isMonk(event.current)) || (event.iteration !== null && (!Number.isSafeInteger(event.iteration) || (event.iteration as number) < 0 || (event.iteration as number) > 4)) || !['inside', 'outside'].includes(event.scope as string) || !isLine(event.line)) return invalid();
        monkActions.push(event as unknown as typeof monkActions[number]);
      } else if (exact(event, ['kind', 'owner', 'action', 'call', 'line', 'order']) && event.kind === 'temple-action') {
        if (event.owner !== 'record_sanqing' || stack.at(-1)?.name !== 'record_sanqing' || event.call !== stack.at(-1)?.call || !['record_arrival', 'record_names'].includes(event.action as string) || !isLine(event.line)) return invalid();
        templeActions.push({ action: event.action as 'record_arrival' | 'record_names', call: event.call as number, line: event.line });
      } else if (exact(event, ['kind', 'owner', 'parameter', 'value', 'call', 'line', 'order']) && event.kind === 'parameter-bound') {
        if (event.owner !== 'weather' || stack.at(-1)?.name !== 'weather' || event.call !== stack.at(-1)?.call || event.parameter !== 'order' || !isWeather(event.value) || !Number.isSafeInteger(event.call) || !isLine(event.line)) return invalid();
        bindings.push({ value: event.value, call: event.call as number, line: event.line });
      } else if (exact(event, ['kind', 'owner', 'action', 'value', 'source', 'call', 'line', 'order']) && event.kind === 'weather-action') {
        if (event.owner !== 'weather' || stack.at(-1)?.name !== 'weather' || event.call !== stack.at(-1)?.call || event.action !== 'record_weather' || !isWeather(event.value) || !['parameter', 'constant'].includes(event.source as string) || !Number.isSafeInteger(event.call) || !isLine(event.line)) return invalid();
        weatherActions.push({ value: event.value, source: event.source as 'parameter' | 'constant', call: event.call as number, line: event.line });
      } else if (exact(event, ['kind', 'owner', 'action', 'value', 'call', 'line', 'order']) && event.kind === 'trial-action') {
        if (!isSmall(event.owner) || stack.at(-1)?.name !== event.owner || event.call !== stack.at(-1)?.call || event.action !== 'record_trial' || !isTrial(event.value) || !Number.isSafeInteger(event.call) || !isLine(event.line)) return invalid();
        trialActions.set(event.owner, [...(trialActions.get(event.owner) ?? []), { value: event.value, call: event.call as number, line: event.line }]);
      } else return invalid();
    }

    if (stack.length) return invalid();
    const top = calls.filter((call) => call.caller === 'top-level');
    const roots = calls.filter((call) => call.caller === 'record_chechi_story');
    const weatherCalls = calls.filter((call) => call.caller === 'record_weather_sequence');
    const laterCalls = calls.filter((call) => call.caller === 'record_later_trials');
    const list = monkLists[0]?.items ?? [];
    const loop = loops[0]?.items ?? [];
    const monkOrderValid = monkLists.length === 1 && loops.length === 1 && same(list, loop)
      && list.length === 3 && new Set(list).size === 3 && WEEK_FIVE_STORY_MONKS.every((monk) => list.includes(monk));
    const expectedMonkActions = list.flatMap((monk, iteration) => [
      { action: 'release', target: monk, current: monk, iteration, scope: 'inside' },
      { action: 'register', target: monk, current: monk, iteration, scope: 'inside' },
    ]);
    const actualMonkActions = monkActions.map((action) => ({
      action: action.action,
      target: action.target,
      current: action.current,
      iteration: action.iteration,
      scope: action.scope,
    }));
    if (!monkOrderValid || !same(actualMonkActions, expectedMonkActions)) {
      const outsideLines = monkActions.filter((action) => action.scope === 'outside').map((action) => action.line);
      const firstMismatch = monkActions.find((action, actionIndex) => !same(actualMonkActions[actionIndex], expectedMonkActions[actionIndex]));
      return snapshot('monk-loop-conflict', [
        `名单：${list.join('、') || '无'}`,
        `实际：${monkActions.map((action) => `${action.scope === 'inside' ? `第${(action.iteration ?? 0) + 1}轮` : '循环外'}${action.action === 'release' ? '解困' : '登记'}${action.target}`).join(' → ') || '无'}`,
      ], outsideLines.length ? outsideLines : [firstMismatch?.line ?? monkLists[0]?.line ?? definitions.get('rescue_monks')!]);
    }

    const expectedRoot = ['rescue_monks', 'record_sanqing', 'record_weather_sequence', 'record_later_trials'];
    if (!same(top.map((call) => call.name), ['record_chechi_story']) || !same(roots.map((call) => call.name), expectedRoot) || !same(templeActions.map((item) => item.action), ['record_arrival', 'record_names'])) {
      return snapshot('temple-call-conflict', [
        `总编排实际启动：${roots.map((call) => labels[call.name]).join(' → ') || '无'}`,
        `三清观实际记录：${templeActions.map((item) => item.action === 'record_arrival' ? '到达' : '名字').join(' → ') || '无'}`,
      ], roots.map((call) => call.line));
    }

    const expectedWeather = [...WEEK_FIVE_STORY_WEATHER];
    const weatherValid = same(weatherCalls.map((call) => call.name), ['weather', 'weather', 'weather', 'weather'])
      && same(bindings.map((item) => item.value), expectedWeather)
      && same(weatherActions.map((item) => item.value), expectedWeather)
      && weatherActions.every((item) => item.source === 'parameter')
      && bindings.every((item, bindingIndex) => item.call === weatherCalls[bindingIndex]?.call && weatherActions[bindingIndex]?.call === item.call);
    if (!weatherValid) {
      return snapshot('weather-binding-conflict', [
        `参数：${bindings.map((item) => item.value).join('、') || '无'}`,
        `实际记录：${weatherActions.map((item) => `${item.value}${item.source === 'parameter' ? '（来自参数）' : '（固定文字）'}`).join('、') || '无'}`,
      ], weatherActions.map((item) => item.line));
    }

    const trialOwnershipValid = (Object.keys(expectedTrials) as WeekFiveStorySmallFunction[]).every((owner) => same((trialActions.get(owner) ?? []).map((item) => item.value), expectedTrials[owner]));
    const expectedLater = ['record_meditation', 'record_guess', 'record_final_trials'];
    if (!same(laterCalls.map((call) => call.name), expectedLater) || !trialOwnershipValid) {
      return snapshot('later-call-order-conflict', [
        `后续阶段实际启动：${laterCalls.map((call) => labels[call.name]).join(' → ') || '无'}`,
        ...(Object.keys(expectedTrials) as WeekFiveStorySmallFunction[]).map((owner) => `${labels[owner]}实际记录：${(trialActions.get(owner) ?? []).map((item) => item.value).join('、') || '无'}`),
      ], [...laterCalls.map((call) => call.line), ...[...trialActions.values()].flat().map((item) => item.line)]);
    }

    return { state: 'story-orchestration-proven', completed: true, failureSnapshots: [], penalty };
  } catch {
    return invalid();
  }
}
