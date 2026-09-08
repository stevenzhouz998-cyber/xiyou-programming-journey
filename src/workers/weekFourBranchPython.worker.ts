/* Dedicated W4-M3 Worker: candidate Python is data; only this allowlisted harness executes it. */
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<any> | null = null;

const HARNESS = String.raw`
import ast, json

DEFAULT_CODE = 'if identity == "白骨精":\n    keep_observing()\npolite_help()'
NESTED_CODE = 'if identity == "白骨精":\n    keep_observing()\n    polite_help()'
SOLVED_CODE = 'if identity == "白骨精":\n    keep_observing()\nelse:\n    polite_help()'
PUBLIC_CARDS = (
    ("canon-old-woman-disguise", "白骨精"),
    ("practice-herbalist-elder", "山中采药人"),
)

def exact_action(statement, action_name):
    return (isinstance(statement, ast.Expr)
        and isinstance(statement.value, ast.Call)
        and isinstance(statement.value.func, ast.Name)
        and statement.value.func.id == action_name
        and not statement.value.args
        and not statement.value.keywords)

def validate_tree(candidate_code):
    normalized = candidate_code.replace("\r\n", "\n")
    if normalized not in (DEFAULT_CODE, NESTED_CODE, SOLVED_CODE):
        raise ValueError("只允许本关三种完整分支结构")
    tree = ast.parse(normalized, mode="exec")
    allowed = (ast.Module, ast.If, ast.Compare, ast.Eq, ast.Name, ast.Constant, ast.Expr, ast.Call, ast.Load)
    if any(type(node) not in allowed for node in ast.walk(tree)):
        raise ValueError("检测到未允许的 Python 语法")
    if not isinstance(tree, ast.Module) or len(tree.body) not in (1, 2):
        raise ValueError("分支主体结构不符合本关合同")
    branch = tree.body[0]
    if not isinstance(branch, ast.If):
        raise ValueError("第一条语句必须是条件分支")
    test = branch.test
    if not (isinstance(test, ast.Compare)
        and isinstance(test.left, ast.Name) and test.left.id == "identity"
        and len(test.ops) == 1 and isinstance(test.ops[0], ast.Eq)
        and len(test.comparators) == 1 and isinstance(test.comparators[0], ast.Constant)
        and test.comparators[0].value == "白骨精"):
        raise ValueError("条件必须核对 identity 与白骨精")
    if not branch.body or not exact_action(branch.body[0], "keep_observing"):
        raise ValueError("观察动作必须属于 if 主体")

    if normalized == DEFAULT_CODE:
        valid_ownership = (len(tree.body) == 2 and len(branch.body) == 1 and not branch.orelse
            and exact_action(tree.body[1], "polite_help"))
        structure = "fallthrough"
    elif normalized == NESTED_CODE:
        valid_ownership = (len(tree.body) == 1 and len(branch.body) == 2 and not branch.orelse
            and exact_action(branch.body[1], "polite_help"))
        structure = "nested"
    else:
        valid_ownership = (len(tree.body) == 1 and len(branch.body) == 1 and len(branch.orelse) == 1
            and exact_action(branch.orelse[0], "polite_help"))
        structure = "else"
    if not valid_ownership:
        raise ValueError("动作与 if/else 的归属不符合已保存代码")
    return normalized, tree, structure

def validate_and_run(candidate_code):
    normalized, tree, structure = validate_tree(candidate_code)
    polite_span = ({"line": 3, "from": 0, "to": 13} if structure == "fallthrough"
        else {"line": 3, "from": 4, "to": 17} if structure == "nested"
        else {"line": 4, "from": 4, "to": 17})
    trace = []
    order = 0
    for card_id, identity_value in PUBLIC_CARDS:
        callback_events = []
        def keep_observing():
            callback_events.append("keep-observing")
        def polite_help():
            callback_events.append("polite-help")
        safe_globals = {
            "__builtins__": {},
            "identity": identity_value,
            "keep_observing": keep_observing,
            "polite_help": polite_help,
        }
        exec(compile(tree, "<w4-m3>", "exec"), safe_globals, safe_globals)
        condition_result = safe_globals["identity"] == "白骨精"
        order += 1
        trace.append({"kind": "condition", "cardId": card_id, "field": "identity",
            "value": identity_value, "comparedTo": "白骨精", "conditionResult": condition_result,
            "span": {"line": 1, "from": 3, "to": 11}, "order": order})
        for action in callback_events:
            order += 1
            action_span = ({"line": 2, "from": 4, "to": 20} if action == "keep-observing" else polite_span)
            trace.append({"kind": "action", "cardId": card_id, "action": action,
                "span": action_span, "order": order})
        if callback_events == ["keep-observing", "polite-help"]:
            result, scene_state = "branch-conflict", "branch-conflict"
        elif callback_events == []:
            result, scene_state = "branch-missing", "branch-missing"
        elif callback_events == ["keep-observing"] and condition_result:
            result, scene_state = "single-route", "old-woman-observed"
        elif callback_events == ["polite-help"] and not condition_result:
            result, scene_state = "single-route", "herbalist-helped"
        else:
            raise ValueError("真实执行动作与公开卡片不一致")
        order += 1
        trace.append({"kind": "card-result", "cardId": card_id, "actions": callback_events,
            "result": result, "sceneState": scene_state, "order": order})
    return trace

result_json = json.dumps(validate_and_run(candidate_code), ensure_ascii=False)
for _cleanup_name in (
    "ast", "json", "DEFAULT_CODE", "NESTED_CODE", "SOLVED_CODE", "PUBLIC_CARDS",
    "exact_action", "validate_tree", "validate_and_run", "_cleanup_name"
):
    globals().pop(_cleanup_name, None)
`;

const PYTHON_GLOBALS_CLEANUP = String.raw`
for _cleanup_name in (
    "ast", "json", "DEFAULT_CODE", "NESTED_CODE", "SOLVED_CODE", "PUBLIC_CARDS",
    "exact_action", "validate_tree", "validate_and_run", "_cleanup_name"
):
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
