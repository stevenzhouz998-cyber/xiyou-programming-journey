/* Dedicated W5-M5 Worker: candidate Python is data; only this allowlisted harness executes it. */
type W5M5Request = { type: 'run'; requestId: number; code: string };
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<any> | null = null;
const FUNCTIONS = ['rescue_monks', 'record_sanqing', 'weather', 'record_weather_sequence', 'record_meditation', 'record_guess', 'record_final_trials', 'record_later_trials', 'record_chechi_story'];
const HARNESS = String.raw`
import ast, json, sys
code = candidate_code
tree = ast.parse(code, mode='exec')
functions = ['rescue_monks', 'record_sanqing', 'weather', 'record_weather_sequence', 'record_meditation', 'record_guess', 'record_final_trials', 'record_later_trials', 'record_chechi_story']
function_set = set(functions)
small = {'record_meditation', 'record_guess', 'record_final_trials'}
monks_allowed = {'甲', '乙', '丙'}
weather_allowed = {'风', '云', '雷', '雨'}
trials_allowed = {'坐禅', '隔板猜物', '砍头比试故事', '剖腹比试故事', '油锅比试故事'}
allowed_nodes = (ast.Module, ast.FunctionDef, ast.arguments, ast.arg, ast.Assign, ast.Name, ast.Store, ast.Load, ast.List, ast.Constant, ast.For, ast.Expr, ast.Call)
if any(type(node) not in allowed_nodes for node in ast.walk(tree)):
    raise ValueError('不允许的语法')
if len(code) > 2400 or len(code.replace('\r\n', '\n').split('\n')) > 64:
    raise ValueError('草稿范围无效')
defs = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
top = [node for node in tree.body if not isinstance(node, ast.FunctionDef)]
if len(defs) != 9 or len({node.name for node in defs}) != 9 or {node.name for node in defs} != function_set or len(top) > 3:
    raise ValueError('函数集合无效')
if tree.body[:len(defs)] != defs:
    raise ValueError('所有定义必须在顶层运行前完成')

def direct_call(statement, allowed_names, argument=False):
    if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call):
        raise ValueError('只允许直接调用')
    call = statement.value
    if not isinstance(call.func, ast.Name) or call.func.id not in allowed_names or call.keywords:
        raise ValueError('调用结构无效')
    if argument:
        if len(call.args) != 1 or not isinstance(call.args[0], ast.Constant) or type(call.args[0].value) is not str or call.args[0].value not in weather_allowed:
            raise ValueError('天气调用参数无效')
        return call.func.id, call.args[0].value
    if call.args:
        raise ValueError('本调用不接收参数')
    return call.func.id, None

definitions = {}
definition_order = []
for node in defs:
    if node.decorator_list or node.returns is not None or node.type_comment is not None or getattr(node, 'type_params', []):
        raise ValueError('函数定义无效')
    expected_args = ['order'] if node.name == 'weather' else []
    if node.args.posonlyargs or [arg.arg for arg in node.args.args] != expected_args or any(arg.annotation is not None or arg.type_comment is not None for arg in node.args.args) or node.args.vararg or node.args.kwonlyargs or node.args.kwarg or node.args.defaults or node.args.kw_defaults:
        raise ValueError('函数参数无效')
    definitions[node.name] = node
    definition_order.append(node.name)

rescue = definitions['rescue_monks']
if len(rescue.body) < 2 or len(rescue.body) > 4:
    raise ValueError('解困函数结构无效')
assignment = rescue.body[0]
loop_node = rescue.body[1]
if not isinstance(assignment, ast.Assign) or len(assignment.targets) != 1 or not isinstance(assignment.targets[0], ast.Name) or assignment.targets[0].id != 'monks' or not isinstance(assignment.value, ast.List):
    raise ValueError('僧人名单无效')
monk_items = []
for item in assignment.value.elts:
    if not isinstance(item, ast.Constant) or type(item.value) is not str or item.value not in monks_allowed:
        raise ValueError('僧人名单值无效')
    monk_items.append(item.value)
if not 1 <= len(monk_items) <= 5:
    raise ValueError('僧人名单过长')
if not isinstance(loop_node, ast.For) or not isinstance(loop_node.target, ast.Name) or loop_node.target.id != 'monk' or not isinstance(loop_node.iter, ast.Name) or loop_node.iter.id != 'monks' or loop_node.orelse or not 1 <= len(loop_node.body) <= 4:
    raise ValueError('解困循环无效')
def validate_monk_action(statement):
    if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call) or not isinstance(statement.value.func, ast.Name) or statement.value.func.id not in {'release', 'register'} or statement.value.keywords:
        raise ValueError('解困调用结构无效')
    target = statement.value.args
    if len(target) != 1 or not ((isinstance(target[0], ast.Name) and target[0].id == 'monk') or (isinstance(target[0], ast.Constant) and type(target[0].value) is str and target[0].value in monks_allowed)):
        raise ValueError('解困目标无效')
    return statement.value.func.id
for statement in loop_node.body:
    validate_monk_action(statement)
for statement in rescue.body[2:]:
    validate_monk_action(statement)

temple = definitions['record_sanqing']
if not 1 <= len(temple.body) <= 3:
    raise ValueError('三清观函数无效')
for statement in temple.body:
    direct_call(statement, {'record_arrival', 'record_names'})

weather_def = definitions['weather']
if len(weather_def.body) != 1:
    raise ValueError('天气函数无效')
weather_statement = weather_def.body[0]
if not isinstance(weather_statement, ast.Expr) or not isinstance(weather_statement.value, ast.Call) or not isinstance(weather_statement.value.func, ast.Name) or weather_statement.value.func.id != 'record_weather' or weather_statement.value.keywords or len(weather_statement.value.args) != 1:
    raise ValueError('天气记录结构无效')
weather_value_node = weather_statement.value.args[0]
weather_source = 'parameter' if isinstance(weather_value_node, ast.Name) and weather_value_node.id == 'order' else 'constant'
if weather_source == 'constant' and (not isinstance(weather_value_node, ast.Constant) or type(weather_value_node.value) is not str or weather_value_node.value not in weather_allowed):
    raise ValueError('天气记录值无效')

weather_sequence = definitions['record_weather_sequence']
if not 1 <= len(weather_sequence.body) <= 6:
    raise ValueError('天气阶段无效')
for statement in weather_sequence.body:
    direct_call(statement, {'weather'}, True)

for name in small:
    node = definitions[name]
    if not 1 <= len(node.body) <= 6:
        raise ValueError('后续记录组无效')
    for statement in node.body:
        if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call) or not isinstance(statement.value.func, ast.Name) or statement.value.func.id != 'record_trial' or statement.value.keywords or len(statement.value.args) != 1:
            raise ValueError('后续记录结构无效')
        value_node = statement.value.args[0]
        if not isinstance(value_node, ast.Constant) or type(value_node.value) is not str or value_node.value not in trials_allowed:
            raise ValueError('后续记录值无效')

later = definitions['record_later_trials']
if not 1 <= len(later.body) <= 6:
    raise ValueError('后续阶段无效')
for statement in later.body:
    direct_call(statement, small)

root = definitions['record_chechi_story']
root_allowed = {'rescue_monks', 'record_sanqing', 'record_weather_sequence', 'record_later_trials'}
if not 1 <= len(root.body) <= 6:
    raise ValueError('总编排无效')
for statement in root.body:
    direct_call(statement, root_allowed)
for statement in top:
    if isinstance(statement, ast.Expr) and isinstance(statement.value, ast.Call) and isinstance(statement.value.func, ast.Name) and statement.value.func.id == 'weather':
        direct_call(statement, {'weather'}, True)
    else:
        direct_call(statement, function_set - {'weather'})

trace = []
order_number = 0
for name in definition_order:
    node = definitions[name]
    order_number += 1
    trace.append({'kind':'function-defined','name':name,'parameter':'order' if name == 'weather' else None,'line':node.lineno,'order':order_number})

stack = []
call_number = 0
rescue_inside_count = 0
def append_event(event):
    global order_number
    order_number += 1
    event['order'] = order_number
    trace.append(event)

def monk_action(action, target):
    if type(target) is not str or target not in monks_allowed or not stack or stack[-1][0] != 'rescue_monks':
        raise ValueError('解困运行记录无效')
    frame = sys._getframe(2)
    line = frame.f_lineno
    inside_lines = {statement.lineno for statement in loop_node.body}
    inside = line in inside_lines
    current = frame.f_locals.get('monk')
    global rescue_inside_count
    iteration = rescue_inside_count // len(loop_node.body) if inside else None
    if inside:
        rescue_inside_count += 1
    append_event({'kind':'monk-action','owner':'rescue_monks','action':action,'target':target,'current':current if current in monks_allowed else None,'iteration':iteration,'scope':'inside' if inside else 'outside','call':stack[-1][1],'line':line})
def release(target):
    monk_action('release', target)
def register(target):
    monk_action('register', target)

def record_arrival():
    if not stack or stack[-1][0] != 'record_sanqing':
        raise ValueError('三清观记录归属无效')
    append_event({'kind':'temple-action','owner':'record_sanqing','action':'record_arrival','call':stack[-1][1],'line':sys._getframe(1).f_lineno})
def record_names():
    if not stack or stack[-1][0] != 'record_sanqing':
        raise ValueError('三清观记录归属无效')
    append_event({'kind':'temple-action','owner':'record_sanqing','action':'record_names','call':stack[-1][1],'line':sys._getframe(1).f_lineno})
def record_weather(value):
    if type(value) is not str or value not in weather_allowed or not stack or stack[-1][0] != 'weather':
        raise ValueError('天气记录归属无效')
    active_call = stack[-1][1]
    append_event({'kind':'weather-action','owner':'weather','action':'record_weather','value':value,'source':weather_source,'call':active_call,'line':sys._getframe(1).f_lineno})
def record_trial(value):
    if type(value) is not str or value not in trials_allowed or not stack or stack[-1][0] not in small:
        raise ValueError('后续记录归属无效')
    owner, active_call, _depth = stack[-1]
    append_event({'kind':'trial-action','owner':owner,'action':'record_trial','value':value,'call':active_call,'line':sys._getframe(1).f_lineno})

env = {'release':release,'register':register,'record_arrival':record_arrival,'record_names':record_names,'record_weather':record_weather,'record_trial':record_trial,'__builtins__':{}}
definition_module = ast.Module(body=defs, type_ignores=[])
exec(compile(definition_module, '<w5-m5>', 'exec'), env, env)
originals = {name:env[name] for name in functions}
def make_wrapper(name, original):
    def wrapped(*args):
        global call_number, rescue_inside_count
        caller = stack[-1][0] if stack else 'top-level'
        depth = len(stack) + 1
        call_number += 1
        active_call = call_number
        append_event({'kind':'function-called','name':name,'caller':caller,'depth':depth,'call':active_call,'line':sys._getframe(1).f_lineno})
        if name == 'weather':
            if len(args) != 1 or type(args[0]) is not str or args[0] not in weather_allowed:
                raise ValueError('天气参数无效')
            append_event({'kind':'parameter-bound','owner':'weather','parameter':'order','value':args[0],'call':active_call,'line':sys._getframe(1).f_lineno})
        elif args:
            raise ValueError('无参函数收到参数')
        if name == 'rescue_monks':
            rescue_inside_count = 0
            append_event({'kind':'monks-list-created','owner':'rescue_monks','items':list(monk_items),'call':active_call,'line':assignment.lineno})
            append_event({'kind':'monks-loop-entered','owner':'rescue_monks','variable':'monk','iterable':'monks','items':list(monk_items),'call':active_call,'line':loop_node.lineno})
        stack.append((name, active_call, depth))
        try:
            return original(*args)
        finally:
            append_event({'kind':'function-returned','name':name,'caller':caller,'depth':depth,'call':active_call,'line':sys._getframe(1).f_lineno})
            stack.pop()
    return wrapped
for name in functions:
    env[name] = make_wrapper(name, originals[name])
call_module = ast.Module(body=top, type_ignores=[])
exec(compile(call_module, '<w5-m5>', 'exec'), env, env)
if len(trace) > 96:
    raise ValueError('运行轨迹过长')
json.dumps(trace, ensure_ascii=False, separators=(',', ':'))
`;
const PYTHON_GLOBALS_CLEANUP = String.raw`
for _cleanup_name in ('ast','json','sys','code','tree','functions','function_set','small','monks_allowed','weather_allowed','trials_allowed','allowed_nodes','defs','top','direct_call','definitions','definition_order','node','expected_args','rescue','assignment','loop_node','monk_items','item','validate_monk_action','statement','temple','weather_def','weather_statement','weather_value_node','weather_source','weather_sequence','name','later','root','root_allowed','trace','order_number','stack','call_number','rescue_inside_count','append_event','monk_action','release','register','record_arrival','record_names','record_weather','record_trial','env','definition_module','originals','make_wrapper','call_module','_cleanup_name'):
    globals().pop(_cleanup_name, None)
`;

async function runtime() {
  if (!runtimePromise) {
    const workerUrl = new URL(self.location.href);
    const marker = workerUrl.pathname.includes('/src/workers/') ? '/src/workers/' : '/assets/';
    const markerIndex = workerUrl.pathname.lastIndexOf(marker);
    if (markerIndex < 0) throw Error('W5-M5 Worker path does not expose the application base.');
    const runtimeBase = new URL(`${workerUrl.pathname.slice(0, markerIndex + 1)}runtime/pyodide-314.0.2/`, workerUrl.origin);
    if (runtimeBase.origin !== self.location.origin) throw Error('Pyodide runtime must resolve from this Worker origin.');
    const runtimeModuleUrl = new URL('pyodide.mjs', runtimeBase);
    runtimePromise = import(/* @vite-ignore */ runtimeModuleUrl.href).then((module) => module.loadPyodide({ indexURL: runtimeBase.href }));
  }
  return runtimePromise;
}

runtime().then(() => scope.postMessage({ type: 'ready' })).catch((error) => scope.postMessage({ type: 'load-error', error: error instanceof Error ? error.message : 'load failed' }));
scope.onmessage = async (event: MessageEvent<unknown>) => {
  const message = event.data as Partial<W5M5Request>;
  if (!message || message.type !== 'run' || !Number.isSafeInteger(message.requestId) || (message.requestId as number) <= 0 || typeof message.code !== 'string') return;
  try {
    if (message.code.length > 2400 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(message.code)) throw Error('invalid source');
    if (!FUNCTIONS.every((name) => message.code!.includes(`def ${name}(`))) throw Error('invalid contract');
    const pyodide = await runtime();
    pyodide.globals.set('candidate_code', message.code);
    try {
      const encoded = await pyodide.runPythonAsync(HARNESS);
      if (typeof encoded !== 'string') throw Error('invalid result');
      scope.postMessage({ type: 'result', requestId: message.requestId, trace: JSON.parse(encoded) });
    } finally {
      try { await pyodide.runPythonAsync(PYTHON_GLOBALS_CLEANUP); } finally { pyodide.globals.delete('candidate_code'); }
    }
  } catch (error) {
    scope.postMessage({ type: 'error', requestId: message.requestId, error: error instanceof Error ? error.message : 'run failed' });
  }
};
export {};
