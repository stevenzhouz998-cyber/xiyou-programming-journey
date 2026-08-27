import ts from 'typescript';

const TAGS = ['@w3-m2-full', '@w3-m2-keyboard', '@w3-m2-storage', '@w3-m2-corrupt', '@w3-m2-parent', '@w3-m2-cold', '@w3-m2-asset-fault', '@w3-m2-narrow', '@w3-m2-external', '@w3-m2-lazy'];
const REQUIRED = ['火眼金睛·条件观察', 'WEEK_THREE_CUILAN_COLD_LOAD_MAX_BYTES', 'attachHealth', 'healthEvents', 'page.addInitScript', 'expectedFailureUrl !== null && (value === expectedFailureUrl || value.includes(expectedFailureUrl))', '选择进度文件', '减弱动画', '关闭声音', '下载损坏原文'];
const MUTATORS = new Set(['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin', 'set', 'add', 'delete', 'clear', 'filter']);
const parse = (source) => ts.createSourceFile('w3.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const walk = (node, fn) => { fn(node); ts.forEachChild(node, (child) => walk(child, fn)); };
const unwrap = (node) => ts.isParenthesizedExpression(node) ? unwrap(node.expression) : node;
const root = (node) => { const value = unwrap(node); return ts.isPropertyAccessExpression(value) || ts.isElementAccessExpression(value) ? root(value.expression) : value; };
const healthGet = (node) => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'get' && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'healthEvents';
const dynamicOrReflective = (node) => {
  if (!ts.isCallExpression(node)) return false;
  if (ts.isIdentifier(node.expression) && ['eval', 'Function'].includes(node.expression.text)) return true;
  if (ts.isIdentifier(node.expression) && ['setTimeout', 'setInterval'].includes(node.expression.text) && ts.isStringLiteral(node.arguments[0])) return true;
  if (!ts.isPropertyAccessExpression(node.expression)) return false;
  const owner = node.expression.expression; const method = node.expression.name.text;
  return MUTATORS.has(method) || (ts.isIdentifier(owner) && ['Object', 'Reflect'].includes(owner.text) && ['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf', 'set', 'deleteProperty'].includes(method));
};
const globalForbidden = (node) => {
  if (!ts.isCallExpression(node)) return false;
  if (ts.isIdentifier(node.expression) && ['eval', 'Function'].includes(node.expression.text)) return true;
  if (ts.isIdentifier(node.expression) && ['setTimeout', 'setInterval'].includes(node.expression.text) && ts.isStringLiteral(node.arguments[0])) return true;
  return ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && ['Object', 'Reflect'].includes(node.expression.expression.text) && ['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf', 'set', 'deleteProperty'].includes(node.expression.name.text);
};
const hasW3 = (node) => { let yes = false; walk(node, (child) => { if (ts.isStringLiteral(child) && child.text === 'w3-m2') yes = true; }); return yes; };
const hasMutation = (node) => { let yes = false; walk(node, (child) => { if ((ts.isBinaryExpression(child) && ts.isAssignmentOperator(child.operatorToken.kind)) || ts.isPrefixUnaryExpression(child) || ts.isPostfixUnaryExpression(child) || ts.isDeleteExpression?.(child) || dynamicOrReflective(child)) yes = true; }); return yes; };

function checkW3Callbacks(file) {
  walk(file, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || !['evaluate', 'addInitScript'].includes(node.expression.name.text)) return;
    const first = node.arguments[0];
    if (!first || (!ts.isArrowFunction(first) && !ts.isFunctionExpression(first))) throw new Error('w3-m2 source contract: forbidden non-inline browser callback.');
    for (const arg of node.arguments) if ((ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) && hasW3(arg.body) && hasMutation(arg.body)) throw new Error('w3-m2 source contract: hidden W3-M2 browser-state mutation is forbidden.');
    if (hasW3(first.body)) walk(first.body, (child) => { if (ts.isCallExpression(child) && ts.isPropertyAccessExpression(child.expression) && ['setItem', 'removeItem', 'clear'].includes(child.expression.name.text) && (ts.isIdentifier(child.expression.expression) && ['localStorage', 'sessionStorage'].includes(child.expression.expression.text))) throw new Error('w3-m2 source contract: forbidden W3-M2 browser storage write.'); });
  });
}
function checkHealth(file) {
  const tainted = new Set(); let changed = true;
  while (changed) {
    changed = false;
    walk(file, (node) => {
      if (!ts.isVariableDeclaration(node) || !node.initializer) return;
      const value = unwrap(node.initializer);
      const isTainted = healthGet(value) || (ts.isIdentifier(value) && tainted.has(value.text));
      if (ts.isIdentifier(node.name) && isTainted && !tainted.has(node.name.text)) { tainted.add(node.name.text); changed = true; }
      if (ts.isObjectBindingPattern(node.name) && isTainted) for (const element of node.name.elements) if (ts.isIdentifier(element.name) && !tainted.has(element.name.text)) { tainted.add(element.name.text); changed = true; }
      const destructuresHealth = ts.isArrayBindingPattern(node.name) && ts.isArrayLiteralExpression(value) && value.elements.some((item) => healthGet(unwrap(item)));
      if (destructuresHealth) for (const element of node.name.elements) if (ts.isBindingElement(element) && ts.isIdentifier(element.name) && !tainted.has(element.name.text)) { tainted.add(element.name.text); changed = true; }
    });
  }
  const target = (node) => { let found = false; walk(node, (child) => { if (healthGet(child)) found = true; }); const value = unwrap(node); const base = root(value); return found || (ts.isIdentifier(base) && (base.text === 'healthEvents' || tainted.has(base.text))); };
  walk(file, (node) => {
    if (ts.isBinaryExpression(node) && ts.isAssignmentOperator(node.operatorToken.kind) && target(node.left)) throw new Error('w3-m2 source contract: health events must remain raw.');
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && target(node.operand)) throw new Error('w3-m2 source contract: health events must remain raw.');
    if (ts.isDeleteExpression?.(node) && target(node.expression)) throw new Error('w3-m2 source contract: health events must remain raw.');
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && MUTATORS.has(node.expression.name.text) && !(ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'healthEvents' && node.expression.name.text === 'set') && target(node.expression.expression)) throw new Error('w3-m2 source contract: health events must remain raw.');
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ['call', 'apply'].includes(node.expression.name.text) && target(node.expression.expression)) throw new Error('w3-m2 source contract: health events must remain raw.');
  });
}
export function assertWeekThreeCuilanE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w3-m2 source contract: E2E source must be text.');
  for (const required of [...TAGS, ...REQUIRED]) if (!source.includes(required)) throw new Error(`w3-m2 source contract: missing ${required}.`);
  if (/expectedSequence|LegacyMissionBuilder|MissionTools/.test(source)) throw new Error('w3-m2 source contract: legacy shortcut is forbidden.');
  const file = parse(source); checkW3Callbacks(file); checkHealth(file);
  walk(file, (node) => { if (globalForbidden(node)) throw new Error('w3-m2 source contract: dynamic execution or monkeypatch is forbidden.'); });
  if (/Array\.prototype\.(?:pop|push|shift|unshift|splice|sort|reverse|fill|copyWithin)/.test(source)) throw new Error('w3-m2 source contract: Array prototype mutators are forbidden in E2E.');
  if (!/test\.afterEach\(async \(\{ page \}\) => \{\s*expect\(healthEvents\.get\(page\), 'unexpected W3-M2 browser health events'\)\.toEqual\(\[\]\);\s*\}\)/.test(source)) throw new Error('w3-m2 source contract: every fixture page must assert raw empty health events.');
  if (!/context\.newPage\(\);\s*attachHealth\(stale\);[\s\S]{0,1200}finally\s*\{\s*try\s*\{\s*expect\(healthEvents\.get\(stale\), 'unexpected W3-M2 stale-page browser health events'\)\.toEqual\(\[\]\);\s*\}\s*finally\s*\{\s*await stale\.close\(\);/.test(source)) throw new Error('w3-m2 source contract: every context.newPage must attach, raw-audit, and close in nested finally.');
}
