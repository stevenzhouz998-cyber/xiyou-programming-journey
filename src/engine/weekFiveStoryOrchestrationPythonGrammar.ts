import {
  runWeekFiveStoryOrchestrationTrace,
  WEEK_FIVE_STORY_FUNCTIONS,
  WEEK_FIVE_STORY_MONKS,
  WEEK_FIVE_STORY_TRIALS,
  WEEK_FIVE_STORY_WEATHER,
  type WeekFiveStoryFunction,
  type WeekFiveStoryMonk,
  type WeekFiveStoryOrchestrationTraceItem,
  type WeekFiveStorySmallFunction,
  type WeekFiveStoryTrial,
  type WeekFiveStoryWeather,
} from './weekFiveStoryOrchestrationContract';

export const DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON = `def rescue_monks():
    monks = ["甲", "乙", "丙"]
    for monk in monks:
        release(monk)
    register(monk)

def record_sanqing():
    record_arrival()
    record_names()

def weather(order):
    record_weather('风')

def record_weather_sequence():
    weather('风')
    weather('云')
    weather('雷')
    weather('雨')

def record_meditation():
    record_trial('坐禅')

def record_guess():
    record_trial('隔板猜物')

def record_final_trials():
    record_trial('砍头比试故事')
    record_trial('剖腹比试故事')
    record_trial('油锅比试故事')

def record_later_trials():
    record_guess()
    record_meditation()
    record_final_trials()

def record_chechi_story():
    rescue_monks()
    record_weather_sequence()
    record_later_trials()

record_chechi_story()`;

export const SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON = `def rescue_monks():
    monks = ["甲", "乙", "丙"]
    for monk in monks:
        release(monk)
        register(monk)

def record_sanqing():
    record_arrival()
    record_names()

def weather(order):
    record_weather(order)

def record_weather_sequence():
    weather('风')
    weather('云')
    weather('雷')
    weather('雨')

def record_meditation():
    record_trial('坐禅')

def record_guess():
    record_trial('隔板猜物')

def record_final_trials():
    record_trial('砍头比试故事')
    record_trial('剖腹比试故事')
    record_trial('油锅比试故事')

def record_later_trials():
    record_meditation()
    record_guess()
    record_final_trials()

def record_chechi_story():
    rescue_monks()
    record_sanqing()
    record_weather_sequence()
    record_later_trials()

record_chechi_story()`;

export function parseWeekFiveStoryOrchestrationDraftEnvelope(code: unknown): { code: string; normalizedCode: string } {
  if (typeof code !== 'string' || code.length > 2400 || /\r(?!\n)/.test(code) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(code)) {
    throw Error('故事总编排草稿需要是 2400 字以内的普通文本。');
  }
  return { code, normalizedCode: code.replaceAll('\r\n', '\n') };
}

type RescueBody = {
  kind: 'rescue'; items: WeekFiveStoryMonk[]; listLine: number; loopLine: number;
  inside: Array<{ action: 'release' | 'register'; target: 'monk' | WeekFiveStoryMonk; line: number }>;
  outside: Array<{ action: 'release' | 'register'; target: 'monk' | WeekFiveStoryMonk; line: number }>;
};
type TempleBody = { kind: 'temple'; actions: Array<{ action: 'record_arrival' | 'record_names'; line: number }> };
type WeatherBody = { kind: 'weather'; source: 'parameter' | 'constant'; value: 'order' | WeekFiveStoryWeather; line: number };
type CallsBody = { kind: 'calls'; calls: Array<{ name: WeekFiveStoryFunction; argument: WeekFiveStoryWeather | null; line: number }> };
type TrialBody = { kind: 'trial'; actions: Array<{ value: WeekFiveStoryTrial; line: number }> };
type FunctionBody = RescueBody | TempleBody | WeatherBody | CallsBody | TrialBody;
type ParsedFunction = { name: WeekFiveStoryFunction; parameter: 'order' | null; line: number; body: FunctionBody };

export type WeekFiveStoryOrchestrationPythonInvalid = { state: 'python-structure-invalid'; line: number; reason: 'contract' };
export interface WeekFiveStoryOrchestrationPythonRunnable {
  pythonCode: string;
  normalizedCode: string;
  functions: Record<WeekFiveStoryFunction, ParsedFunction>;
  definitionOrder: WeekFiveStoryFunction[];
  topLevelCalls: Array<{ name: WeekFiveStoryFunction; argument: WeekFiveStoryWeather | null; line: number }>;
  trace: WeekFiveStoryOrchestrationTraceItem[];
  run: ReturnType<typeof runWeekFiveStoryOrchestrationTrace>;
}

const parseTarget = (raw: string): 'monk' | WeekFiveStoryMonk | null => {
  if (raw === 'monk') return 'monk';
  const literal = /^(['"])(甲|乙|丙)\1$/.exec(raw);
  return literal ? literal[2] as WeekFiveStoryMonk : null;
};

export function parseWeekFiveStoryOrchestrationPython(code: unknown): WeekFiveStoryOrchestrationPythonRunnable | WeekFiveStoryOrchestrationPythonInvalid {
  const draft = parseWeekFiveStoryOrchestrationDraftEnvelope(code);
  const lines = draft.normalizedCode.split('\n');
  const invalid = (line: number): WeekFiveStoryOrchestrationPythonInvalid => ({ state: 'python-structure-invalid', line: Math.max(1, Math.min(line, 64)), reason: 'contract' });
  if (lines.length > 64) return invalid(64);
  const blocks: Array<{ name: WeekFiveStoryFunction; parameter: 'order' | null; line: number; body: Array<{ text: string; line: number }> }> = [];
  const topLevelCalls: Array<{ name: WeekFiveStoryFunction; argument: WeekFiveStoryWeather | null; line: number }> = [];
  let cursor = 0;
  let topStarted = false;
  while (cursor < lines.length) {
    const text = lines[cursor]!;
    if (text === '') { cursor += 1; continue; }
    const definition = /^def (rescue_monks|record_sanqing|weather|record_weather_sequence|record_meditation|record_guess|record_final_trials|record_later_trials|record_chechi_story)\((order|)\):$/.exec(text);
    if (definition && !topStarted) {
      const name = definition[1] as WeekFiveStoryFunction;
      const parameter = definition[2] === 'order' ? 'order' : null;
      if ((name === 'weather') !== (parameter === 'order')) return invalid(cursor + 1);
      const body: Array<{ text: string; line: number }> = [];
      const start = cursor + 1;
      cursor += 1;
      while (cursor < lines.length) {
        const bodyText = lines[cursor]!;
        if (bodyText === '') { cursor += 1; continue; }
        if (!bodyText.startsWith(' ')) break;
        body.push({ text: bodyText, line: cursor + 1 });
        cursor += 1;
      }
      if (!body.length || blocks.some((block) => block.name === name)) return invalid(start);
      blocks.push({ name, parameter, line: start, body });
      continue;
    }
    topStarted = true;
    const call = /^(rescue_monks|record_sanqing|record_weather_sequence|record_meditation|record_guess|record_final_trials|record_later_trials|record_chechi_story)\(\)$/.exec(text);
    const weatherCall = /^weather\((['"])(风|云|雷|雨)\1\)$/.exec(text);
    if (call) topLevelCalls.push({ name: call[1] as WeekFiveStoryFunction, argument: null, line: cursor + 1 });
    else if (weatherCall) topLevelCalls.push({ name: 'weather', argument: weatherCall[2] as WeekFiveStoryWeather, line: cursor + 1 });
    else return invalid(cursor + 1);
    if (topLevelCalls.length > 3) return invalid(cursor + 1);
    cursor += 1;
  }
  if (blocks.length !== WEEK_FIVE_STORY_FUNCTIONS.length || WEEK_FIVE_STORY_FUNCTIONS.some((name) => !blocks.some((block) => block.name === name))) return invalid(1);

  const functions = {} as Record<WeekFiveStoryFunction, ParsedFunction>;
  for (const block of blocks) {
    let body: FunctionBody | null = null;
    if (block.name === 'rescue_monks') {
      const list = /^    monks = \[(.*)\]$/.exec(block.body[0]?.text ?? '');
      const loop = block.body.findIndex((item) => item.text === '    for monk in monks:');
      if (!list || loop !== 1) return invalid(block.body[0]?.line ?? block.line);
      const literal = /^(?:"([甲乙丙])"|'([甲乙丙])')$/;
      const tokens = list[1]!.trim() === '' ? [] : list[1]!.split(',').map((item) => item.trim());
      if (tokens.length < 1 || tokens.length > 5 || tokens.some((token) => !literal.test(token))) return invalid(block.body[0]!.line);
      const items = tokens.map((token) => { const match = literal.exec(token)!; return (match[1] ?? match[2]) as WeekFiveStoryMonk; });
      const inside: RescueBody['inside'] = [];
      const outside: RescueBody['outside'] = [];
      let outsideStarted = false;
      for (const statement of block.body.slice(2)) {
        const action = /^(        |    )(release|register)\((monk|['"][甲乙丙]['"])\)$/.exec(statement.text);
        if (!action) return invalid(statement.line);
        const target = parseTarget(action[3]!);
        if (!target) return invalid(statement.line);
        if (action[1] === '        ') {
          if (outsideStarted) return invalid(statement.line);
          inside.push({ action: action[2] as 'release' | 'register', target, line: statement.line });
        } else {
          outsideStarted = true;
          outside.push({ action: action[2] as 'release' | 'register', target, line: statement.line });
        }
      }
      if (inside.length < 1 || inside.length > 4 || outside.length > 2) return invalid(block.line);
      body = { kind: 'rescue', items, listLine: block.body[0]!.line, loopLine: block.body[1]!.line, inside, outside };
    } else if (block.name === 'record_sanqing') {
      const actions: TempleBody['actions'] = [];
      for (const statement of block.body) {
        const action = /^    (record_arrival|record_names)\(\)$/.exec(statement.text);
        if (!action) return invalid(statement.line);
        actions.push({ action: action[1] as 'record_arrival' | 'record_names', line: statement.line });
      }
      if (actions.length > 3) return invalid(block.line);
      body = { kind: 'temple', actions };
    } else if (block.name === 'weather') {
      if (block.body.length !== 1) return invalid(block.line);
      const action = /^    record_weather\((order|(['"])(风|云|雷|雨)\2)\)$/.exec(block.body[0]!.text);
      if (!action) return invalid(block.body[0]!.line);
      body = { kind: 'weather', source: action[1] === 'order' ? 'parameter' : 'constant', value: action[1] === 'order' ? 'order' : action[3] as WeekFiveStoryWeather, line: block.body[0]!.line };
    } else if (['record_meditation', 'record_guess', 'record_final_trials'].includes(block.name)) {
      const actions: TrialBody['actions'] = [];
      for (const statement of block.body) {
        const action = /^    record_trial\((['"])(坐禅|隔板猜物|砍头比试故事|剖腹比试故事|油锅比试故事)\1\)$/.exec(statement.text);
        if (!action) return invalid(statement.line);
        actions.push({ value: action[2] as WeekFiveStoryTrial, line: statement.line });
      }
      if (actions.length > 6) return invalid(block.line);
      body = { kind: 'trial', actions };
    } else {
      const allowed = block.name === 'record_weather_sequence' ? ['weather']
        : block.name === 'record_later_trials' ? ['record_meditation', 'record_guess', 'record_final_trials']
          : ['rescue_monks', 'record_sanqing', 'record_weather_sequence', 'record_later_trials'];
      const calls: CallsBody['calls'] = [];
      for (const statement of block.body) {
        const call = /^    (rescue_monks|record_sanqing|record_weather_sequence|record_meditation|record_guess|record_final_trials|record_later_trials)\(\)$/.exec(statement.text);
        const weatherCall = /^    weather\((['"])(风|云|雷|雨)\1\)$/.exec(statement.text);
        const name = call?.[1] ?? (weatherCall ? 'weather' : null);
        if (!name || !allowed.includes(name)) return invalid(statement.line);
        calls.push({ name: name as WeekFiveStoryFunction, argument: weatherCall ? weatherCall[2] as WeekFiveStoryWeather : null, line: statement.line });
      }
      if (calls.length > 6) return invalid(block.line);
      body = { kind: 'calls', calls };
    }
    functions[block.name] = { name: block.name, parameter: block.parameter, line: block.line, body };
  }

  const trace: WeekFiveStoryOrchestrationTraceItem[] = blocks.map((block, index) => ({ kind: 'function-defined', name: block.name, parameter: block.parameter, line: block.line, order: index + 1 }));
  let callNumber = 0;
  const invoke = (name: WeekFiveStoryFunction, caller: 'top-level' | WeekFiveStoryFunction, depth: 1 | 2 | 3, line: number, argument: WeekFiveStoryWeather | null) => {
    callNumber += 1;
    const activeCall = callNumber;
    trace.push({ kind: 'function-called', name, caller, depth, call: activeCall, line, order: trace.length + 1 });
    const body = functions[name].body;
    if (body.kind === 'rescue') {
      trace.push({ kind: 'monks-list-created', owner: 'rescue_monks', items: [...body.items], call: activeCall, line: body.listLine, order: trace.length + 1 });
      trace.push({ kind: 'monks-loop-entered', owner: 'rescue_monks', variable: 'monk', iterable: 'monks', items: [...body.items], call: activeCall, line: body.loopLine, order: trace.length + 1 });
      body.items.forEach((monk, iteration) => body.inside.forEach((action) => trace.push({ kind: 'monk-action', owner: 'rescue_monks', action: action.action, target: action.target === 'monk' ? monk : action.target, current: monk, iteration, scope: 'inside', call: activeCall, line: action.line, order: trace.length + 1 })));
      const current = body.items.at(-1) ?? null;
      body.outside.forEach((action) => { if (action.target === 'monk' && current === null) return; trace.push({ kind: 'monk-action', owner: 'rescue_monks', action: action.action, target: action.target === 'monk' ? current! : action.target, current, iteration: null, scope: 'outside', call: activeCall, line: action.line, order: trace.length + 1 }); });
    } else if (body.kind === 'temple') {
      body.actions.forEach((action) => trace.push({ kind: 'temple-action', owner: 'record_sanqing', action: action.action, call: activeCall, line: action.line, order: trace.length + 1 }));
    } else if (body.kind === 'weather') {
      if (argument === null) return;
      trace.push({ kind: 'parameter-bound', owner: 'weather', parameter: 'order', value: argument, call: activeCall, line, order: trace.length + 1 });
      trace.push({ kind: 'weather-action', owner: 'weather', action: 'record_weather', value: body.source === 'parameter' ? argument : body.value as WeekFiveStoryWeather, source: body.source, call: activeCall, line: body.line, order: trace.length + 1 });
    } else if (body.kind === 'trial') {
      body.actions.forEach((action) => trace.push({ kind: 'trial-action', owner: name as WeekFiveStorySmallFunction, action: 'record_trial', value: action.value, call: activeCall, line: action.line, order: trace.length + 1 }));
    } else {
      body.calls.forEach((call) => invoke(call.name, name, (depth + 1) as 2 | 3, call.line, call.argument));
    }
    trace.push({ kind: 'function-returned', name, caller, depth, call: activeCall, line, order: trace.length + 1 });
  };
  topLevelCalls.forEach((call) => invoke(call.name, 'top-level', 1, call.line, call.argument));
  if (trace.length > 96 || !WEEK_FIVE_STORY_MONKS.length || !WEEK_FIVE_STORY_WEATHER.length || !WEEK_FIVE_STORY_TRIALS.length) return invalid(1);
  const run = runWeekFiveStoryOrchestrationTrace(trace);
  let lastSourceLine = lines.length;
  while (lastSourceLine > 1 && lines[lastSourceLine - 1] === '') lastSourceLine -= 1;
  if (run.state === 'python-structure-invalid') return invalid(topLevelCalls.at(-1)?.line ?? lastSourceLine);
  return { pythonCode: draft.code, normalizedCode: draft.normalizedCode, functions, definitionOrder: blocks.map((block) => block.name), topLevelCalls, trace, run };
}
