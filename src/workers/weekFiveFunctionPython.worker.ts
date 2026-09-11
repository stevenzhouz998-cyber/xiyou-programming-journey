/* Dedicated W5-M2 Worker: candidate Python is data; only this allowlisted harness executes it. */
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<any> | null = null;

const HARNESS = String.raw`
import ast, json, re

def validate_and_run(code):
    if not isinstance(code, str) or len(code) > 512 or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', code):
        raise ValueError('草稿文本无效')
    code = code.replace('\r\n', '\n')
    if len(code.split('\n')) > 8:
        raise ValueError('代码行数超出本关范围')
    tree = ast.parse(code)
    allowed = (ast.Module, ast.FunctionDef, ast.arguments, ast.Expr, ast.Call, ast.Name, ast.Load)
    if any(type(node) not in allowed for node in ast.walk(tree)):
        raise ValueError('不允许的语法')
    if not tree.body or not isinstance(tree.body[0], ast.FunctionDef) or len([node for node in tree.body if isinstance(node, ast.FunctionDef)]) != 1:
        raise ValueError('只允许一个函数定义')
    function = tree.body[0]
    if function.name != 'record_sanqing' or function.decorator_list or function.returns is not None or function.type_comment is not None:
        raise ValueError('函数定义无效')
    args = function.args
    if args.posonlyargs or args.args or args.vararg is not None or args.kwonlyargs or args.kw_defaults or args.kwarg is not None or args.defaults:
        raise ValueError('本关函数不使用参数')
    if len(function.body) < 1 or len(function.body) > 2 or len(tree.body[1:]) > 2:
        raise ValueError('动作数量超出本关范围')

    def validate_call(statement, names):
        if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call): raise ValueError('只允许本关调用')
        call = statement.value
        if not isinstance(call.func, ast.Name) or call.func.id not in names or call.args or call.keywords: raise ValueError('调用无效')
        return call.func.id

    for statement in function.body:
        action = validate_call(statement, ('record_arrival', 'record_names'))
        statement.value.args.extend([ast.Constant(statement.lineno), ast.Constant('inside')])

    transformed = [function]
    for statement in tree.body[1:]:
        name = validate_call(statement, ('record_arrival', 'record_names', 'record_sanqing'))
        if name == 'record_sanqing':
            transformed.extend([
                ast.copy_location(ast.Expr(ast.Call(ast.Name('__function_called__', ast.Load()), [ast.Constant(statement.lineno)], [])), statement),
                statement,
                ast.copy_location(ast.Expr(ast.Call(ast.Name('__function_finished__', ast.Load()), [], [])), statement),
            ])
        else:
            statement.value.args.extend([ast.Constant(statement.lineno), ast.Constant('outside')])
            transformed.append(statement)
    tree.body = transformed
    ast.fix_missing_locations(tree)

    events = [{'kind':'function-defined','name':'record_sanqing','order':1}]
    state = {'call': 0, 'active': None}
    def called(line):
        state['call'] += 1
        state['active'] = state['call']
        events.append({'kind':'function-called','name':'record_sanqing','call':state['call'],'line':line,'order':len(events)+1})
    def finished(): state['active'] = None
    def action(name, line, action_scope):
        events.append({'kind':'action','action':name,'call':state['active'] if action_scope == 'inside' else None,'line':line,'scope':action_scope,'order':len(events)+1})
        if len(events) > 9: raise ValueError('超过安全步数')
    env = {
        '__builtins__': {}, '__function_called__': called, '__function_finished__': finished,
        'record_arrival': lambda line, action_scope: action('record_arrival', line, action_scope),
        'record_names': lambda line, action_scope: action('record_names', line, action_scope),
    }
    exec(compile(tree, '<w5-m2>', 'exec'), env, env)
    return events

result_json = json.dumps(validate_and_run(candidate_code), ensure_ascii=False)
`;
const PYTHON_GLOBALS_CLEANUP = String.raw`
for _cleanup_name in ('ast', 'json', 're', 'validate_and_run', '_cleanup_name'):
    globals().pop(_cleanup_name, None)
`;

async function runtime() {
  if (!runtimePromise) {
    const workerUrl = new URL(self.location.href);
    const marker = workerUrl.pathname.includes('/src/workers/') ? '/src/workers/' : '/assets/';
    const markerIndex = workerUrl.pathname.lastIndexOf(marker);
    if (markerIndex < 0) throw new Error('W5-M2 Worker path does not expose the application base.');
    const runtimeBase = new URL(`${workerUrl.pathname.slice(0, markerIndex + 1)}runtime/pyodide-314.0.2/`, workerUrl.origin);
    if (runtimeBase.origin !== self.location.origin) throw new Error('Pyodide runtime must resolve from this Worker origin.');
    const runtimeModuleUrl = new URL('pyodide.mjs', runtimeBase);
    runtimePromise = import(/* @vite-ignore */ runtimeModuleUrl.href).then((module) => module.loadPyodide({ indexURL: runtimeBase.href }));
  }
  return runtimePromise;
}

runtime().then(() => scope.postMessage({ type: 'ready' }))
  .catch((error) => scope.postMessage({ type: 'load-error', error: error instanceof Error ? error.message : String(error) }));

scope.onmessage = async (event: MessageEvent<unknown>) => {
  const message = event.data;
  if (!message || typeof message !== 'object' || Array.isArray(message)) return;
  const record = message as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== 'code,requestId,type' || record.type !== 'run'
    || !Number.isSafeInteger(record.requestId) || (record.requestId as number) < 1 || typeof record.code !== 'string') return;
  const requestId = record.requestId as number;
  try {
    const pyodide = await runtime();
    let trace: unknown;
    try {
      pyodide.globals.set('candidate_code', record.code);
      await pyodide.runPythonAsync(HARNESS);
      trace = JSON.parse(String(pyodide.globals.get('result_json')));
    } finally {
      try { await pyodide.runPythonAsync(PYTHON_GLOBALS_CLEANUP); }
      finally { try { pyodide.globals.delete('candidate_code'); } finally { pyodide.globals.delete('result_json'); } }
    }
    scope.postMessage({ type: 'result', requestId, trace });
  } catch (error) {
    scope.postMessage({ type: 'error', requestId, error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
