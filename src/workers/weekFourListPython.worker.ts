/* Dedicated W4-M4 Worker: candidate Python is data; only this allowlisted harness executes it. */
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<any> | null = null;

const HARNESS = String.raw`
import ast, json, re

def validate_and_run(code):
    if not isinstance(code, str) or len(code) > 512:
        raise ValueError("草稿长度无效")
    lines = code.replace("\r\n", "\n").split("\n")
    literal = r'''(?:"(?:女子|老妇|老翁)"|'(?:女子|老妇|老翁)')'''
    if len(lines) != 3 or not re.fullmatch(r'appearances = \[.*\]', lines[0]) or lines[1] != 'for item in appearances:' or not re.fullmatch(r'    print\((?:item|' + literal + r')\)', lines[2]):
        raise ValueError("仅允许本关列表与循环")
    content = lines[0][15:-1]
    tokens = [] if content.strip() == '' else [x.strip() for x in content.split(',')]
    if len(tokens) > 5 or any(not re.fullmatch(literal, x) for x in tokens):
        raise ValueError("列表只允许最多五个公开外形")
    tree = ast.parse(code.replace("\r\n", "\n"))
    allowed = (ast.Module, ast.Assign, ast.Name, ast.List, ast.Constant, ast.Store, ast.Load, ast.For, ast.Expr, ast.Call)
    if any(type(n) not in allowed for n in ast.walk(tree)) or len(tree.body) != 2:
        raise ValueError("语法不在允许范围")
    assignment, loop = tree.body
    if not (isinstance(assignment, ast.Assign) and len(assignment.targets) == 1 and isinstance(assignment.targets[0], ast.Name) and assignment.targets[0].id == 'appearances' and isinstance(assignment.value, ast.List)
        and isinstance(loop, ast.For) and isinstance(loop.target, ast.Name) and loop.target.id == 'item' and isinstance(loop.iter, ast.Name) and loop.iter.id == 'appearances' and not loop.orelse and len(loop.body) == 1):
        raise ValueError("列表/循环结构无效")
    call = loop.body[0].value
    if not (isinstance(call, ast.Call) and isinstance(call.func, ast.Name) and call.func.id == 'print' and len(call.args) == 1 and not call.keywords):
        raise ValueError("只允许记录一个值")
    events = []
    env = {"__builtins__": {}}
    def record(value):
        if len(events) >= 5: raise ValueError("循环超过安全界限")
        events.append({"kind": "iteration", "index": len(events), "item": env["item"], "recorded": value, "order": len(events) + 2})
    env['print'] = record
    exec(compile(tree, '<w4-m4>', 'exec'), env, env)
    return [{"kind": "list-created", "items": env['appearances'], "order": 1}] + events

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
