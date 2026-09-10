/* Dedicated W5-M1 Worker: candidate Python is data; only this allowlisted harness executes it. */
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<any> | null = null;

const HARNESS = String.raw`
import ast, json, re

def validate_and_run(code):
    if not isinstance(code, str) or len(code) > 512 or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', code):
        raise ValueError('草稿文本无效')
    code = code.replace('\r\n', '\n')
    lines = code.split('\n')
    literal = r'''(?:"[甲乙丙]"|'[甲乙丙]')'''
    call_pattern = r'(release|register)\((?:monk|' + literal + r')\)'
    if len(lines) != 4 or not re.fullmatch(r'monks = \[.*\]', lines[0]) or lines[1] != 'for monk in monks:' or not re.fullmatch('    ' + call_pattern, lines[2]) or not re.fullmatch(r'(?:    )?' + call_pattern, lines[3]):
        raise ValueError('只允许本关四行名单与循环')
    content = lines[0][9:-1]
    tokens = [] if not content.strip() else [x.strip() for x in content.split(',')]
    if len(tokens) > 5 or any(not re.fullmatch(literal, x) for x in tokens):
        raise ValueError('名单只允许最多五个公开编号')
    tree = ast.parse(code)
    allowed = (ast.Module, ast.Assign, ast.Name, ast.List, ast.Constant, ast.Store, ast.Load, ast.For, ast.Expr, ast.Call)
    if any(type(n) not in allowed for n in ast.walk(tree)):
        raise ValueError('不允许的语法')
    assignment, loop = tree.body[:2]
    if not (isinstance(assignment, ast.Assign) and len(assignment.targets) == 1 and isinstance(assignment.targets[0], ast.Name) and assignment.targets[0].id == 'monks' and isinstance(assignment.value, ast.List) and isinstance(loop, ast.For) and isinstance(loop.target, ast.Name) and loop.target.id == 'monk' and isinstance(loop.iter, ast.Name) and loop.iter.id == 'monks' and not loop.orelse):
        raise ValueError('名单与循环结构无效')
    inside = len(loop.body) == 2
    if (inside and len(tree.body) != 2) or (not inside and (len(tree.body) != 3 or len(loop.body) != 1)):
        raise ValueError('动作数量无效')
    statements = loop.body + ([] if inside else [tree.body[2]])
    for statement in statements:
        if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call): raise ValueError('只允许动作')
        call = statement.value
        if not (isinstance(call.func, ast.Name) and call.func.id in ('release', 'register') and len(call.args) == 1 and not call.keywords): raise ValueError('动作无效')
        arg = call.args[0]
        if not ((isinstance(arg, ast.Name) and arg.id == 'monk') or (isinstance(arg, ast.Constant) and arg.value in ('甲','乙','丙'))): raise ValueError('动作对象无效')
        # Preserve actual Python control flow, attach only public source metadata to callbacks.
        call.args.extend([ast.Constant(statement.lineno), ast.Constant('inside' if statement in loop.body else 'outside')])
    ast.fix_missing_locations(tree)
    events = []
    env = {'__builtins__': {}}
    def action(name, target, line, scope):
        if len(events) >= 10: raise ValueError('超过安全步数')
        index = len(events) // (2 if inside else 1) if scope == 'inside' else None
        events.append({'kind':'action','index':index,'current':env.get('monk'),'target':target,'action':name,'line':line,'scope':scope,'order':len(events)+2})
    env['release'] = lambda target,line,scope: action('release',target,line,scope)
    env['register'] = lambda target,line,scope: action('register',target,line,scope)
    try:
        exec(compile(tree, '<w5-m1>', 'exec'), env, env)
    except NameError:
        if inside or env.get('monks') != []: raise
        events.append({'kind':'python-error','error':'NameError','line':4,'order':len(events)+2})
    return [{'kind':'list-created','items':env['monks'],'order':1}] + events

result_json = json.dumps(validate_and_run(candidate_code), ensure_ascii=False)
`;
const PYTHON_GLOBALS_CLEANUP = String.raw`
for _cleanup_name in ('ast', 'json', 're', 'validate_and_run', '_cleanup_name'):
    globals().pop(_cleanup_name, None)
`;

async function runtime() {
  if (!runtimePromise) {
    const runtimeBase = new URL('../runtime/pyodide-314.0.2/', self.location.href);
    if (runtimeBase.origin !== self.location.origin) throw new Error('Pyodide runtime must resolve from this Worker origin.');
    const runtimeModuleUrl = new URL('pyodide.mjs', runtimeBase);
    runtimePromise = import(/* @vite-ignore */ runtimeModuleUrl.href).then((module) => module.loadPyodide({ indexURL: runtimeBase.href }));
  }
  return runtimePromise;
}

runtime()
  .then(() => scope.postMessage({ type: 'ready' }))
  .catch((error) => scope.postMessage({ type: 'load-error', error: error instanceof Error ? error.message : String(error) }));

scope.onmessage = async (event: MessageEvent<unknown>) => {
  const message = event.data;
  if (!message || typeof message !== 'object' || Array.isArray(message)) return;
  const record = message as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  if (keys.join(',') !== 'code,requestId,type'
    || record.type !== 'run'
    || !Number.isSafeInteger(record.requestId)
    || (record.requestId as number) < 1
    || typeof record.code !== 'string') return;
  const requestId = record.requestId as number;
  try {
    const pyodide = await runtime();
    let trace: unknown;
    try {
      pyodide.globals.set('candidate_code', record.code);
      await pyodide.runPythonAsync(HARNESS);
      trace = JSON.parse(String(pyodide.globals.get('result_json')));
    } finally {
      try {
        await pyodide.runPythonAsync(PYTHON_GLOBALS_CLEANUP);
      } finally {
        try {
          pyodide.globals.delete('candidate_code');
        } finally {
          pyodide.globals.delete('result_json');
        }
      }
    }
    scope.postMessage({ type: 'result', requestId, trace });
  } catch (error) {
    scope.postMessage({ type: 'error', requestId, error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
