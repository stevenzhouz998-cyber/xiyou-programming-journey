/* Dedicated W4-M5 Worker: candidate Python is data; only this allowlisted harness executes it. */
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<any> | null = null;

const HARNESS = String.raw`
import ast, json, re

def validate_and_run(code):
    if not isinstance(code, str) or len(code) > 512: raise ValueError("草稿长度无效")
    code = code.replace("\r\n", "\n")
    lines = code.split("\n")
    patterns = [r'for card in cards:', r'''    identity = (read_identity\(card\)|read_appearance\(card\)|"白骨精"|'白骨精')''', r'''    if identity (==|!=) ("白骨精"|'白骨精'):''', r'        (keep_observing|polite_help)\(card\)', r'    else:', r'        (keep_observing|polite_help)\(card\)']
    if len(lines) != 6 or any(not re.fullmatch(pattern, line) for pattern, line in zip(patterns, lines)): raise ValueError("仅允许公开卡片的核验结构")
    tree = ast.parse(code)
    allowed = (ast.Module, ast.For, ast.Name, ast.Store, ast.Load, ast.Assign, ast.Call, ast.Constant, ast.If, ast.Compare, ast.Eq, ast.NotEq, ast.Expr)
    if any(type(n) not in allowed for n in ast.walk(tree)) or len(tree.body) != 1: raise ValueError("语法不在允许范围")
    loop = tree.body[0]
    if not isinstance(loop, ast.For) or loop.target.id != 'card' or loop.iter.id != 'cards' or loop.orelse or len(loop.body) != 2: raise ValueError("循环结构无效")
    assign, branch = loop.body
    if not isinstance(assign, ast.Assign) or len(assign.targets) != 1 or assign.targets[0].id != 'identity' or not isinstance(branch, ast.If) or len(branch.body) != 1 or len(branch.orelse) != 1: raise ValueError("赋值或分支结构无效")
    cards = {'woman': ('女子','白骨精'), 'elder': ('老妇','白骨精'), 'man': ('老翁','白骨精'), 'practice': ('老妇','采药人')}
    rounds = [['woman','elder','man','practice'], ['practice','man','woman','elder']]
    events = []
    for round_index, queue in enumerate(rounds):
        env = {"__builtins__": {}, "cards": list(queue)}
        env['read_identity'] = lambda card: cards[card][1]
        env['read_appearance'] = lambda card: cards[card][0]
        def record(card, action):
            index = len(events) - round_index * 4
            if index >= 4 or card != queue[index]: raise ValueError("核验超出公开列表")
            value = env['identity']
            condition = (value == '白骨精') if isinstance(branch.test.ops[0], ast.Eq) else (value != '白骨精')
            events.append({"kind":"verification", "round":round_index+1, "index":index, "cardId":card, "identity":value, "condition":condition, "action":action, "order":len(events)+1})
        env['keep_observing'] = lambda card: record(card, 'keep_observing')
        env['polite_help'] = lambda card: record(card, 'polite_help')
        exec(compile(tree, '<w4-m5>', 'exec'), env, env)
    return events

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
