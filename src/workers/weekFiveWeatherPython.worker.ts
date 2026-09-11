/* Dedicated W5-M3 Worker: candidate Python is data; only this allowlisted harness executes it. */
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<any> | null = null;
const HARNESS = String.raw`
import ast, json, re

def validate_and_run(code):
    if not isinstance(code, str) or len(code) > 640 or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', code): raise ValueError('草稿文本无效')
    code = code.replace('\r\n', '\n')
    if len(code.split('\n')) > 9: raise ValueError('代码行数超出本关范围')
    tree = ast.parse(code)
    allowed = (ast.Module, ast.FunctionDef, ast.arguments, ast.arg, ast.Expr, ast.Call, ast.Name, ast.Load, ast.Constant)
    if any(type(node) not in allowed for node in ast.walk(tree)): raise ValueError('不允许的语法')
    if not tree.body or not isinstance(tree.body[0], ast.FunctionDef) or len([node for node in tree.body if isinstance(node, ast.FunctionDef)]) != 1: raise ValueError('只允许一个函数定义')
    function = tree.body[0]; args = function.args
    if function.name != 'weather' or function.decorator_list or function.returns is not None or function.type_comment is not None: raise ValueError('函数定义无效')
    if args.posonlyargs or len(args.args) != 1 or args.args[0].arg != 'order' or args.args[0].annotation is not None or args.vararg is not None or args.kwonlyargs or args.kw_defaults or args.kwarg is not None or args.defaults: raise ValueError('参数必须是 order')
    if len(function.body) != 1 or len(tree.body[1:]) > 5: raise ValueError('调用数量超出本关范围')
    action_statement = function.body[0]
    if not isinstance(action_statement, ast.Expr) or not isinstance(action_statement.value, ast.Call): raise ValueError('函数体无效')
    action_call = action_statement.value
    if not isinstance(action_call.func, ast.Name) or action_call.func.id != 'record_weather' or len(action_call.args) != 1 or action_call.keywords: raise ValueError('记录调用无效')
    body_arg = action_call.args[0]
    if isinstance(body_arg, ast.Name) and body_arg.id == 'order': source = 'parameter'
    elif isinstance(body_arg, ast.Constant) and body_arg.value in ('风','云','雷','雨'): source = 'constant'
    else: raise ValueError('记录值无效')
    action_call.args.extend([ast.Constant(action_statement.lineno), ast.Constant(source)])
    transformed = [function]
    for statement in tree.body[1:]:
        if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call): raise ValueError('只允许直接调用')
        call = statement.value
        if not isinstance(call.func, ast.Name) or call.func.id != 'weather' or len(call.args) != 1 or call.keywords or not isinstance(call.args[0], ast.Constant) or call.args[0].value not in ('风','云','雷','雨'): raise ValueError('weather 调用无效')
        transformed.extend([ast.copy_location(ast.Expr(ast.Call(ast.Name('__weather_called__', ast.Load()), [ast.Constant(call.args[0].value), ast.Constant(statement.lineno)], [])), statement), statement, ast.copy_location(ast.Expr(ast.Call(ast.Name('__weather_finished__', ast.Load()), [], [])), statement)])
    tree.body = transformed; ast.fix_missing_locations(tree)
    events = [{'kind':'function-defined','name':'weather','parameter':'order','line':1,'order':1}]
    state = {'call':0, 'active':None}
    def called(value, line):
        state['call'] += 1; state['active'] = state['call']
        events.append({'kind':'function-called','name':'weather','argument':value,'call':state['call'],'line':line,'order':len(events)+1})
        events.append({'kind':'parameter-bound','parameter':'order','value':value,'call':state['call'],'line':line,'order':len(events)+1})
    def finished(): state['active'] = None
    def record(value, line, value_source):
        if state['active'] is None or value not in ('风','云','雷','雨'): raise ValueError('运行轨迹无效')
        events.append({'kind':'action','action':'record_weather','value':value,'source':value_source,'call':state['active'],'line':line,'order':len(events)+1})
        if len(events) > 16: raise ValueError('超过安全步数')
    env = {'__builtins__':{}, '__weather_called__':called, '__weather_finished__':finished, 'record_weather':record}
    exec(compile(tree, '<w5-m3>', 'exec'), env, env)
    return events

result_json = json.dumps(validate_and_run(candidate_code), ensure_ascii=False)
`;
const PYTHON_GLOBALS_CLEANUP = String.raw`
for _cleanup_name in ('ast','json','re','validate_and_run','_cleanup_name'):
    globals().pop(_cleanup_name, None)
`;
async function runtime() {
  if (!runtimePromise) {
    const workerUrl = new URL(self.location.href); const marker = workerUrl.pathname.includes('/src/workers/') ? '/src/workers/' : '/assets/'; const markerIndex = workerUrl.pathname.lastIndexOf(marker);
    if (markerIndex < 0) throw new Error('W5-M3 Worker path does not expose the application base.');
    const runtimeBase = new URL(`${workerUrl.pathname.slice(0, markerIndex + 1)}runtime/pyodide-314.0.2/`, workerUrl.origin);
    if (runtimeBase.origin !== self.location.origin) throw new Error('Pyodide runtime must resolve from this Worker origin.');
    const runtimeModuleUrl = new URL('pyodide.mjs', runtimeBase); runtimePromise = import(/* @vite-ignore */ runtimeModuleUrl.href).then((module) => module.loadPyodide({ indexURL: runtimeBase.href }));
  }
  return runtimePromise;
}
runtime().then(() => scope.postMessage({ type: 'ready' })).catch((error) => scope.postMessage({ type: 'load-error', error: error instanceof Error ? error.message : String(error) }));
scope.onmessage = async (event: MessageEvent<unknown>) => {
  const message = event.data; if (!message || typeof message !== 'object' || Array.isArray(message)) return; const record = message as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'code,requestId,type' || record.type !== 'run' || !Number.isSafeInteger(record.requestId) || (record.requestId as number) < 1 || typeof record.code !== 'string') return;
  const requestId = record.requestId as number;
  try {
    const pyodide = await runtime(); let trace: unknown;
    try { pyodide.globals.set('candidate_code', record.code); await pyodide.runPythonAsync(HARNESS); trace = JSON.parse(String(pyodide.globals.get('result_json'))); }
    finally { try { await pyodide.runPythonAsync(PYTHON_GLOBALS_CLEANUP); } finally { try { pyodide.globals.delete('candidate_code'); } finally { pyodide.globals.delete('result_json'); } } }
    scope.postMessage({ type: 'result', requestId, trace });
  } catch (error) { scope.postMessage({ type: 'error', requestId, error: error instanceof Error ? error.message : String(error) }); }
};
export {};
