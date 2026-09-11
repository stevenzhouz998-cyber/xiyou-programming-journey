/* Dedicated W5-M4 Worker: candidate Python is data; only this allowlisted harness executes it. */
type W5M4Request = { type: 'run'; requestId: number; code: string };
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<any> | null = null;
const FUNCTIONS = ['record_meditation', 'record_guess', 'record_final_trials', 'record_five_trials'];
const SMALL = ['record_meditation', 'record_guess', 'record_final_trials'];
const RECORDS = ['坐禅', '隔板猜物', '砍头比试故事', '剖腹比试故事', '油锅比试故事'];
const HARNESS = String.raw`
import ast, json, sys
code = candidate_code
tree = ast.parse(code, mode='exec')
functions = ['record_meditation', 'record_guess', 'record_final_trials', 'record_five_trials']
small = set(functions[:3])
records = {'坐禅', '隔板猜物', '砍头比试故事', '剖腹比试故事', '油锅比试故事'}
allowed = (ast.Module, ast.FunctionDef, ast.arguments, ast.Expr, ast.Call, ast.Name, ast.Load, ast.Constant)
if any(type(node) not in allowed for node in ast.walk(tree)):
    raise ValueError('不允许的语法')
if len(code) > 1200 or len(code.replace('\r\n', '\n').split('\n')) > 24:
    raise ValueError('草稿范围无效')
if len(tree.body) < 4 or [getattr(node, 'name', None) for node in tree.body[:4]] != functions:
    raise ValueError('函数定义顺序无效')
defs = tree.body[:4]
top = tree.body[4:]
if any(not isinstance(node, ast.FunctionDef) for node in defs):
    raise ValueError('函数定义无效')
if len(top) > 3:
    raise ValueError('顶层调用过多')

def direct_call(statement):
    if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call):
        raise ValueError('只允许直接调用')
    call = statement.value
    if not isinstance(call.func, ast.Name) or call.args or call.keywords:
        raise ValueError('调用结构无效')
    return call.func.id

trace = []
order = 0
for expected, node in zip(functions, defs):
    if node.name != expected or node.decorator_list or node.returns is not None or node.type_comment is not None or getattr(node, 'type_params', []):
        raise ValueError('函数定义无效')
    if node.args.posonlyargs or node.args.args or node.args.vararg or node.args.kwonlyargs or node.args.kwarg or node.args.defaults or node.args.kw_defaults:
        raise ValueError('本关只使用无参函数')
    if not 1 <= len(node.body) <= 6:
        raise ValueError('函数体长度无效')
    order += 1
    trace.append({'kind':'function-defined','name':expected,'line':node.lineno,'order':order})

for node in defs[:3]:
    for statement in node.body:
        if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call):
            raise ValueError('小函数只允许故事记录')
        call = statement.value
        if not isinstance(call.func, ast.Name) or call.func.id != 'record_trial' or len(call.args) != 1 or call.keywords:
            raise ValueError('记录结构无效')
        value_node = call.args[0]
        if not isinstance(value_node, ast.Constant) or type(value_node.value) is not str or value_node.value not in records:
            raise ValueError('记录值无效')
        order += 1
        trace.append({'kind':'action-declared','action':'record_trial','value':value_node.value,'owner':node.name,'line':statement.lineno,'order':order})

for statement in defs[3].body:
    name = direct_call(statement)
    if name not in small:
        raise ValueError('总函数只能调用三个小函数')
for statement in top:
    if direct_call(statement) not in functions:
        raise ValueError('顶层调用无效')

stack = []
call_number = 0
def record_trial(value):
    if type(value) is not str or value not in records or not stack:
        raise ValueError('运行记录无效')
    owner, active_call, depth = stack[-1]
    if owner not in small:
        raise ValueError('记录必须属于小函数')
    global order
    order += 1
    trace.append({'kind':'action','action':'record_trial','value':value,'owner':owner,'depth':depth,'call':active_call,'line':sys._getframe(1).f_lineno,'order':order})

env = {'record_trial': record_trial, '__builtins__': {}}
definitions = ast.Module(body=defs, type_ignores=[])
exec(compile(definitions, '<w5-m4>', 'exec'), env, env)
originals = {name: env[name] for name in functions}
def make_wrapper(name, original):
    def wrapped():
        global call_number, order
        caller = stack[-1][0] if stack else 'top-level'
        depth = len(stack) + 1
        if depth > 2 or (caller != 'top-level' and caller != 'record_five_trials'):
            raise ValueError('调用层级无效')
        call_number += 1
        active_call = call_number
        order += 1
        trace.append({'kind':'function-called','name':name,'caller':caller,'depth':depth,'call':active_call,'line':sys._getframe(1).f_lineno,'order':order})
        stack.append((name, active_call, depth))
        try:
            original()
        finally:
            stack.pop()
    return wrapped
for name in functions:
    env[name] = make_wrapper(name, originals[name])
calls = ast.Module(body=top, type_ignores=[])
exec(compile(calls, '<w5-m4>', 'exec'), env, env)
if len(trace) > 32:
    raise ValueError('运行轨迹过长')
json.dumps(trace, ensure_ascii=False, separators=(',', ':'))
`;
const PYTHON_GLOBALS_CLEANUP = String.raw`
for _cleanup_name in ('ast','json','sys','code','tree','functions','small','records','allowed','defs','top','direct_call','trace','order','expected','node','statement','call','value_node','stack','call_number','record_trial','env','definitions','originals','make_wrapper','name','calls','_cleanup_name'):
    globals().pop(_cleanup_name, None)
`;

async function runtime() {
  if (!runtimePromise) {
    const workerUrl = new URL(self.location.href);
    const marker = workerUrl.pathname.includes('/src/workers/') ? '/src/workers/' : '/assets/';
    const markerIndex = workerUrl.pathname.lastIndexOf(marker);
    if (markerIndex < 0) throw new Error('W5-M4 Worker path does not expose the application base.');
    const runtimeBase = new URL(workerUrl.pathname.slice(0, markerIndex + 1) + 'runtime/pyodide-314.0.2/', workerUrl.origin);
    if (runtimeBase.origin !== self.location.origin) throw new Error('Pyodide runtime must resolve from this Worker origin.');
    const runtimeModuleUrl = new URL('pyodide.mjs', runtimeBase);
    runtimePromise = import(/* @vite-ignore */ runtimeModuleUrl.href).then((module) => module.loadPyodide({ indexURL: runtimeBase.href }));
  }
  return runtimePromise;
}

runtime().then(() => scope.postMessage({ type: 'ready' })).catch((error) => scope.postMessage({ type: 'load-error', error: error instanceof Error ? error.message : 'load failed' }));
scope.onmessage = async (event: MessageEvent<unknown>) => {
  const message = event.data as Partial<W5M4Request>;
  if (!message || message.type !== 'run' || !Number.isSafeInteger(message.requestId) || (message.requestId as number) <= 0 || typeof message.code !== 'string') return;
  try {
    if (message.code.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(message.code)) throw new Error('invalid source');
    if (!FUNCTIONS.every((name) => message.code!.includes('def ' + name + '():')) || !SMALL.length || !RECORDS.length) throw new Error('invalid contract');
    const pyodide = await runtime();
    pyodide.globals.set('candidate_code', message.code);
    try {
      const encoded = await pyodide.runPythonAsync(HARNESS);
      if (typeof encoded !== 'string') throw new Error('invalid result');
      scope.postMessage({ type: 'result', requestId: message.requestId, trace: JSON.parse(encoded) });
    } finally {
      try { await pyodide.runPythonAsync(PYTHON_GLOBALS_CLEANUP); } finally { pyodide.globals.delete('candidate_code'); }
    }
  } catch (error) {
    scope.postMessage({ type: 'error', requestId: message.requestId, error: error instanceof Error ? error.message : 'run failed' });
  }
};
export {};
