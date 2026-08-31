/* Dedicated W4-M2 Worker: candidate Python is data and only the trusted harness executes it. */
const scope = self as unknown as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<any> | null = null;

const HARNESS = String.raw`
import ast, json, traceback

def validate_and_run(candidate_code):
    normalized = candidate_code.replace("\r\n", "\n")
    DEFAULT_CODE = "appearance = ordinary_eyes()\nappearance = fiery_eye_check()\nseal_record(appearance, identity)"
    SOLVED_CODE = "appearance = ordinary_eyes()\nidentity = fiery_eye_check()\nseal_record(appearance, identity)"
    if normalized not in (DEFAULT_CODE, SOLVED_CODE):
        raise ValueError("只允许精确的三行变量取证文本")
    tree = ast.parse(normalized, mode="exec")
    allowed = (ast.Module, ast.Assign, ast.Name, ast.Store, ast.Load, ast.Call, ast.Expr)
    if any(type(node) not in allowed for node in ast.walk(tree)):
        raise ValueError("检测到未允许的 Python 语法")
    if not isinstance(tree, ast.Module) or len(tree.body) != 3:
        raise ValueError("只允许三条固定语句")
    first, second, third = tree.body
    def exact_assign(statement, target, callback):
        return (isinstance(statement, ast.Assign) and len(statement.targets) == 1
            and isinstance(statement.targets[0], ast.Name) and statement.targets[0].id == target
            and isinstance(statement.value, ast.Call) and isinstance(statement.value.func, ast.Name)
            and statement.value.func.id == callback and not statement.value.args and not statement.value.keywords)
    if not exact_assign(first, "appearance", "ordinary_eyes"):
        raise ValueError("第一行必须记录普通观察")
    if not (isinstance(second, ast.Assign) and len(second.targets) == 1 and isinstance(second.targets[0], ast.Name)
            and second.targets[0].id in ("appearance", "identity") and exact_assign(second, second.targets[0].id, "fiery_eye_check")):
        raise ValueError("第二行必须记录火眼核验")
    if not (isinstance(third, ast.Expr) and isinstance(third.value, ast.Call) and isinstance(third.value.func, ast.Name)
            and third.value.func.id == "seal_record" and len(third.value.args) == 2 and not third.value.keywords
            and all(isinstance(arg, ast.Name) for arg in third.value.args)
            and third.value.args[0].id == "appearance" and third.value.args[1].id == "identity"):
        raise ValueError("第三行必须封存两项事实")
    trace = []
    callback_events = []
    sealed = []
    def record_callback(callback, source, value):
        callback_events.append({"callback": callback, "source": source, "value": value})
        return value
    def ordinary_eyes(): return record_callback("ordinary_eyes", "ordinary-eyes", "送斋女子")
    def fiery_eye_check(): return record_callback("fiery_eye_check", "fiery-eye-check", "白骨精")
    def seal_record(appearance, identity): sealed.append((appearance, identity))
    safe_globals = {"__builtins__": {}, "ordinary_eyes": ordinary_eyes, "fiery_eye_check": fiery_eye_check, "seal_record": seal_record}
    for index, statement in enumerate((first, second)):
        target = statement.targets[0].id
        previous = safe_globals.get(target)
        exec(compile(ast.Module(body=[statement], type_ignores=[]), "<w4-m2>", "exec"), safe_globals, safe_globals)
        value = safe_globals[target]
        if len(callback_events) != 1:
            raise ValueError("每次赋值必须恰好来自一次公开证据调用")
        callback_event = callback_events.pop(0)
        expected_source = {"ordinary_eyes": "ordinary-eyes", "fiery_eye_check": "fiery-eye-check"}[statement.value.func.id]
        if callback_event["callback"] != statement.value.func.id or callback_event["source"] != expected_source or callback_event["value"] != value:
            raise ValueError("证据 callback 与实际赋值不一致")
        trace.append({"kind": "assign", "line": index + 1, "target": target,
            "source": callback_event["source"], "value": callback_event["value"],
            "previousValue": previous, "overwrote": previous is not None,
            "span": {"line": index + 1, "from": 0, "to": len(target)}})
    try:
        exec(compile(ast.Module(body=[third], type_ignores=[]), "<w4-m2>", "exec"), safe_globals, safe_globals)
        trace.append({"kind": "seal", "line": 3, "executed": True, "appearance": sealed[0][0], "identity": sealed[0][1], "missingVariable": None, "span": {"line": 3, "from": 0, "to": 33}})
    except NameError:
        failure_traceback = traceback.format_exc()
        if "identity" in safe_globals or "identity" not in failure_traceback:
            raise
        trace.append({"kind": "seal", "line": 3, "executed": False, "appearance": safe_globals.get("appearance"), "identity": None, "missingVariable": "identity", "span": {"line": 3, "from": 0, "to": 33}})
    return trace

result_json = json.dumps(validate_and_run(candidate_code), ensure_ascii=False)
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

runtime().then(() => scope.postMessage({ type: 'ready' })).catch((error) => scope.postMessage({ type: 'load-error', error: error instanceof Error ? error.message : String(error) }));

scope.onmessage = async (event: MessageEvent<{ type: 'run'; requestId: number; code: string; sourceSpan: { line: 2; from: 0; to: 10 | 8 } }>) => {
  const { requestId, code } = event.data;
  try {
    const pyodide = await runtime();
    pyodide.globals.set('candidate_code', code);
    await pyodide.runPythonAsync(HARNESS);
    const trace = JSON.parse(String(pyodide.globals.get('result_json')));
    scope.postMessage({ type: 'result', requestId, trace });
  } catch (error) {
    scope.postMessage({ type: 'error', requestId, error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
