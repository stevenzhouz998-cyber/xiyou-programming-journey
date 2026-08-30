/* Dedicated W4-M1 Worker. Child code is data; only this trusted harness is executed by Pyodide. */
type Card = { id: string; appearance: string; identity: string };
const scope = self as DedicatedWorkerGlobalScope;
let runtimePromise: Promise<any> | null = null;
const HARNESS = `
import ast, json
def validate_and_run(candidate_code, appearance, identity):
    tree = ast.parse(candidate_code, mode="exec")
    if not isinstance(tree, ast.Module) or len(tree.body) != 1 or not isinstance(tree.body[0], ast.If):
        raise ValueError("只允许一个 if/else 判断")
    statement = tree.body[0]
    if len(statement.body) != 1 or len(statement.orelse) != 1:
        raise ValueError("每个分支必须只有一个动作")
    comparison = statement.test
    if not isinstance(comparison, ast.Compare) or len(comparison.ops) != 1 or not isinstance(comparison.ops[0], ast.Eq) or len(comparison.comparators) != 1:
        raise ValueError("只允许 == 判断")
    if not isinstance(comparison.left, ast.Name) or comparison.left.id not in ("appearance", "identity"):
        raise ValueError("判断字段不在白名单内")
    if not isinstance(comparison.comparators[0], ast.Constant) or comparison.comparators[0].value != "白骨精":
        raise ValueError("比较常量不在白名单内")
    expected = ("continue_verification", "polite_pass")
    for node, name in zip((statement.body[0], statement.orelse[0]), expected):
        if not isinstance(node, ast.Expr) or not isinstance(node.value, ast.Call) or node.value.args or node.value.keywords or not isinstance(node.value.func, ast.Name) or node.value.func.id != name:
            raise ValueError("分支动作不在白名单内")
    allowed = (ast.Module, ast.If, ast.Compare, ast.Name, ast.Load, ast.Eq, ast.Constant, ast.Expr, ast.Call)
    if any(type(node) not in allowed for node in ast.walk(tree)):
        raise ValueError("检测到未允许的 Python 语法")
    actions = []
    def continue_verification(): actions.append("continue-verification")
    def polite_pass(): actions.append("polite-pass")
    safe_globals = {"__builtins__": {}, "appearance": appearance, "identity": identity, "continue_verification": continue_verification, "polite_pass": polite_pass}
    exec(compile(tree, "<w4-m1>", "exec"), safe_globals, safe_globals)
    if len(actions) != 1: raise ValueError("每张卡必须只执行一个分支动作")
    field = comparison.left.id
    value = safe_globals[field]
    result = value == "白骨精"
    return {"field": field, "value": value, "conditionResult": result, "branchAction": actions[0], "finalSceneState": "verification-continued" if result else "traveller-cleared"}
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
scope.onmessage = async (event: MessageEvent<{ type: 'run'; requestId: number; code: string; cards: Card[]; sourceSpan: { line: 1; from: number; to: number } }>) => {
  const { requestId, code, cards, sourceSpan } = event.data;
  try {
    const pyodide = await runtime();
    pyodide.globals.set('candidate_code', code);
    pyodide.globals.set('w4_cards', JSON.stringify(cards));
    const raw = await pyodide.runPythonAsync(`${HARNESS}\njson.dumps([validate_and_run(candidate_code, card['appearance'], card['identity']) for card in json.loads(w4_cards)])`);
    const results = JSON.parse(String(raw)) as Array<{ field: 'appearance' | 'identity'; value: string; conditionResult: boolean; branchAction: string; finalSceneState: string }>;
    scope.postMessage({ type: 'result', requestId, trace: results.map((result, index) => ({ cardId: cards[index]!.id, ...result, source: { kind: 'python', line: 1, from: sourceSpan.from, to: sourceSpan.to } })) });
  } catch (error) { scope.postMessage({ type: 'error', requestId, error: error instanceof Error ? error.message : String(error) }); }
};
