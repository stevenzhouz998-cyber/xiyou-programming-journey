import ts from 'typescript';
import { createHash } from 'node:crypto';

export const W3_M4_TAGS = ['@w3-m4-full', '@w3-m4-keyboard', '@w3-m4-mouse', '@w3-m4-touch', '@w3-m4-storage', '@w3-m4-corrupt', '@w3-m4-parent', '@w3-m4-cold', '@w3-m4-asset-fault', '@w3-m4-narrow', '@w3-m4-external', '@w3-m4-lazy'];
const forbidden = /expectedSequence|LegacyMissionBuilder|MissionTools|\beval\s*\(|\bnew Function\b|\bimport\s*\(/;
const unwrap = (node) => {
  let current = node;
  while (ts.isAwaitExpression(current) || ts.isParenthesizedExpression(current) || ts.isAsExpression(current) || ts.isNonNullExpression(current)) current = current.expression;
  return current;
};
function constantStrings(file) {
  const values = new Map();
  const value = (node) => {
    const current = unwrap(node);
    if (ts.isStringLiteralLike(current)) return current.text;
    if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) { const left = value(current.left); const right = value(current.right); return left === null || right === null ? null : left + right; }
    if (ts.isIdentifier(current)) return values.get(current.text) ?? null;
    return null;
  };
  const visit = (node) => { if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) { const literal = value(node.initializer); if (literal !== null) values.set(node.name.text, literal); } ts.forEachChild(node, visit); };
  visit(file); return { values, value };
}
function propertyName(node, constants) {
  const current = unwrap(node);
  if (ts.isPropertyAccessExpression(current)) return current.name.text;
  if (ts.isElementAccessExpression(current)) return current.argumentExpression ? constants.value(current.argumentExpression) : null;
  return null;
}
function callProperty(call, constants) { return propertyName(call.expression, constants); }
function subtreeHas(node, pattern) { let found = false; const visit = (current) => { if (found) return; if (pattern(current)) { found = true; return; } ts.forEachChild(current, visit); }; visit(node); return found; }
const healthArrayMutators = new Set(['splice', 'pop', 'shift', 'push', 'unshift', 'sort', 'reverse', 'fill', 'copyWithin', 'map', 'filter', 'forEach']);
const storageMutators = new Set(['setItem', 'removeItem', 'clear']);
const progressKeys = new Set(['missions', 'sessions', 'missionCompletionEvidence']);
const approvedFaultModes = new Set(['off', 'corrupt-bajie-current', 'fail-bajie-draft', 'fail-bajie-run', 'fail-bajie-observation', 'fail-bajie-completion']);
const APPROVED_W3_M3_PREREQUISITE_SHA256 = 'c3d2357a5a30b31f2a1f545abaa3b211375e73a0428613135e4f8924899ba493';

function assertHealth(source, file, constants) {
  if (!source.includes('attachHealth(page)') || !/test\.afterEach[\s\S]*healthEvents\.get\(page\)[\s\S]*toEqual\(\[\]\)/.test(source)) throw new Error('w3-m4 source contract: missing raw health evidence.');
  const pages = new Set();
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = unwrap(node.initializer); const call = ts.isCallExpression(init) ? init : null;
      if (call && callProperty(call, constants) === 'newPage') {
        if (ts.isElementAccessExpression(unwrap(call.expression))) throw new Error('w3-m4 source contract: computed newPage factories are forbidden.');
        pages.add(node.name.text);
      }
      if (subtreeHas(node.initializer, (current) => ts.isPropertyAccessExpression(current) && propertyName(current, constants) === 'get' && subtreeHas(current.expression, (child) => ts.isIdentifier(child) && child.text === 'healthEvents'))) throw new Error('w3-m4 source contract: healthEvents aliases are forbidden.');
    }
    if (ts.isCallExpression(node) && ts.isCallExpression(unwrap(node.expression)) && false) throw new Error('unreachable');
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(unwrap(node.expression)) && unwrap(node.expression).expression.getText(file) === 'Reflect' && callProperty(node, constants) === 'get' && constants.value(node.arguments[1]) === 'newPage') throw new Error('w3-m4 source contract: computed newPage factories are forbidden.');
    ts.forEachChild(node, visit);
  };
  visit(file);
  for (const name of pages) {
    if (!new RegExp(`attachHealth\\(${name}\\)`).test(source)) throw new Error(`w3-m4 source contract: ${name} lacks attachHealth.`);
    if (!new RegExp(`finally[\\s\\S]*await ${name}\\.close\\(\\)`).test(source)) throw new Error(`w3-m4 source contract: ${name} must finally close.`);
  }
}

function isStorageReceiver(node) { const current = unwrap(node); return ts.isIdentifier(current) && (current.text === 'localStorage' || current.text === 'sessionStorage'); }
function callbackOf(call) { const value = call.arguments[0] && unwrap(call.arguments[0]); return value && (ts.isArrowFunction(value) || ts.isFunctionExpression(value)) ? value : null; }
function hasObjectProperty(object, name, predicate) { const value = unwrap(object); return ts.isObjectLiteralExpression(value) && value.properties.some((property) => ts.isPropertyAssignment(property) && ((ts.isIdentifier(property.name) || ts.isStringLiteralLike(property.name)) ? property.name.text : null) === name && predicate(property.initializer)); }
function isFormalPrerequisiteInit(call, constants) {
  if (callProperty(call, constants) !== 'addInitScript' || call.arguments.length !== 2) return false;
  const options = call.arguments[1];
  return hasObjectProperty(options, 'raw', (node) => { const value = unwrap(node); return ts.isCallExpression(value) && ts.isIdentifier(unwrap(value.expression)) && value.expression.text === 'formalW3M3Prerequisite'; })
    && hasObjectProperty(options, 'current', (node) => ts.isIdentifier(unwrap(node)) && node.text === 'CURRENT_KEY')
    && hasObjectProperty(options, 'revision', (node) => ts.isIdentifier(unwrap(node)) && node.text === 'REVISION_KEY');
}
function isModeFaultHelper(call, constants) {
  if (callProperty(call, constants) !== 'evaluate' || call.arguments.length < 2 || !ts.isIdentifier(unwrap(call.arguments[1])) || unwrap(call.arguments[1]).text !== 'MODE_KEY') return false;
  const callback = callbackOf(call); if (callback === null || callback.parameters.length !== 1 || !ts.isIdentifier(callback.parameters[0].name)) return false;
  const body = callback.body; const expression = ts.isBlock(body) ? (body.statements.length === 1 && ts.isExpressionStatement(body.statements[0]) ? body.statements[0].expression : null) : body;
  const mutation = expression && ts.isCallExpression(unwrap(expression)) ? unwrap(expression) : null;
  if (!mutation || callProperty(mutation, constants) !== 'setItem' || !isStorageReceiver(unwrap(mutation.expression).expression) || mutation.arguments.length !== 2 || !ts.isIdentifier(unwrap(mutation.arguments[0])) || unwrap(mutation.arguments[0]).text !== callback.parameters[0].name.text) return false;
  const mode = constants.value(mutation.arguments[1]); return mode !== null && approvedFaultModes.has(mode);
}
function assertFormalPrerequisiteBody(file, constants) {
  let helper = null; const find = (node) => { if (ts.isFunctionDeclaration(node) && node.name?.text === 'formalW3M3Prerequisite') helper = node; ts.forEachChild(node, find); }; find(file);
  if (!helper?.body) throw new Error('w3-m4 source contract: missing formalW3M3Prerequisite helper.');
  const fail = (detail) => { throw new Error(`w3-m4 source contract: forged W3-M3 prerequisite is forbidden (${detail}).`); };
  if (createHash('sha256').update(helper.getText(file)).digest('hex') !== APPROVED_W3_M3_PREREQUISITE_SHA256) throw new Error('w3-m4 source contract: prerequisite requires explicit prerequisite review.');
  const localValues = new Map(); const progressAliases = new Set(); const staticValue = (node) => { const current = unwrap(node); if (ts.isStringLiteralLike(current)) return current.text; if (ts.isNoSubstitutionTemplateLiteral(current)) return current.text; if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.PlusToken) { const left = staticValue(current.left); const right = staticValue(current.right); return left === null || right === null ? null : left + right; } if (ts.isIdentifier(current)) return localValues.get(current.text) ?? constants.value(current); return null; };
  const protectedProgressBase = (node) => { const current = unwrap(node); if (ts.isIdentifier(current)) return progressAliases.has(current.text); if (!ts.isPropertyAccessExpression(current) && !ts.isElementAccessExpression(current)) return false; const key = propertyName(current, { value: staticValue }); return progressKeys.has(key ?? '') && ts.isIdentifier(unwrap(current.expression)) && current.expression.text === 'progress'; };
  const scan = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) { const value = staticValue(node.initializer); if (value !== null) localValues.set(node.name.text, value); if (protectedProgressBase(node.initializer)) progressAliases.add(node.name.text); if (value === 'w3-m4') fail('computed W3-M4 key'); }
    if (ts.isStringLiteralLike(node) && node.text === 'w3-m4') fail('W3-M4 literal');
    if (ts.isIdentifier(node) && /BajieJoining|W3M4|w3M4/.test(node.text)) fail('Bajie identifier');
    if (ts.isCallExpression(node) && ts.isIdentifier(unwrap(node.expression)) && ['completeMission', 'createMissionSession'].includes(unwrap(node.expression).text) && node.arguments.some((argument) => staticValue(argument) === 'w3-m4')) fail('W3-M4 mission call');
    if (ts.isElementAccessExpression(node) && protectedProgressBase(node.expression)) fail('dynamic progress subscript');
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(unwrap(node.expression)) && unwrap(node.expression).expression.getText(file) === 'Object' && callProperty(node, { value: staticValue }) === 'assign' && node.arguments[0] && protectedProgressBase(node.arguments[0])) fail('Object.assign progress base');
    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) && progressKeys.has(propertyName(node, { value: staticValue }) ?? '') && staticValue(ts.isElementAccessExpression(node) ? node.argumentExpression : node.name) === 'w3-m4') fail('W3-M4 progress access');
    ts.forEachChild(node, scan);
  }; scan(helper.body);
  const returns = []; const collectReturns = (node) => { if (ts.isReturnStatement(node)) returns.push(node); else ts.forEachChild(node, collectReturns); }; collectReturns(helper.body);
  if (returns.length !== 1 || !returns[0].expression) fail('return count');
  const outer = unwrap(returns[0].expression); if (!ts.isCallExpression(outer) || !ts.isIdentifier(unwrap(outer.expression)) || outer.expression.text !== 'serializeProgress' || outer.arguments.length !== 1) fail('return serializer');
  const inner = unwrap(outer.arguments[0]); if (!ts.isCallExpression(inner) || !ts.isIdentifier(unwrap(inner.expression)) || inner.expression.text !== 'completeMission' || staticValue(inner.arguments[1]) !== 'w3-m3') fail('return formal W3-M3 completion');
}
function assertBrowserCallbackSafety(file, constants) {
  const fail = (detail) => { throw new Error(`w3-m4 source contract: browser storage/progress injection is forbidden (${detail}).`); };
  const visit = (node) => {
    if (ts.isCallExpression(node) && ['evaluate', 'addInitScript'].includes(callProperty(node, constants) ?? '')) {
      const callback = callbackOf(node); if (callback) {
        const allowedStorage = isModeFaultHelper(node, constants) || isFormalPrerequisiteInit(node, constants);
        const scan = (current) => {
          if (ts.isCallExpression(current) && storageMutators.has(callProperty(current, constants) ?? '') && isStorageReceiver(unwrap(current.expression).expression)) { if (!allowedStorage) fail('storage mutator'); }
          if (ts.isCallExpression(current) && ((ts.isPropertyAccessExpression(unwrap(current.expression)) && unwrap(current.expression).expression.getText(file) === 'Object' && callProperty(current, constants) === 'assign') || (ts.isPropertyAccessExpression(unwrap(current.expression)) && unwrap(current.expression).expression.getText(file) === 'Reflect' && ['set', 'deleteProperty'].includes(callProperty(current, constants) ?? '')))) fail('Object/Reflect mutator');
          if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.EqualsToken && subtreeHas(current.left, (child) => (ts.isPropertyAccessExpression(child) || ts.isElementAccessExpression(child)) && progressKeys.has(propertyName(child, constants) ?? ''))) fail('progress assignment');
          ts.forEachChild(current, scan);
        };
        scan(callback.body);
      }
    }
    ts.forEachChild(node, visit);
  }; visit(file);
}

function assertHealthImmutability(file, constants) {
  const fail = (detail) => { throw new Error(`w3-m4 source contract: health evidence mutation is forbidden (${detail}).`); };
  const touchesHealth = (node) => subtreeHas(node, (child) => ts.isIdentifier(child) && child.text === 'healthEvents');
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const method = callProperty(node, constants); const callee = unwrap(node.expression); const receiver = (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) ? callee.expression : null;
      if (method && healthArrayMutators.has(method) && receiver && touchesHealth(receiver)) fail(method);
      if (method && ['clear', 'delete', 'set'].includes(method) && receiver && touchesHealth(receiver) && method !== 'set') fail(method);
      if (method && ['assign', 'defineProperty', 'defineProperties', 'setPrototypeOf', 'set', 'deleteProperty'].includes(method) && receiver && ts.isIdentifier(unwrap(receiver)) && ['Object', 'Reflect'].includes(unwrap(receiver).text) && (touchesHealth(node) || node.arguments.some(touchesHealth))) fail(method);
    }
    if (ts.isBinaryExpression(node) && subtreeHas(node.left, touchesHealth)) fail('assignment');
    if (ts.isVariableDeclaration(node) && node.initializer && touchesHealth(node.initializer) && ts.isIdentifier(node.name)) fail('alias');
    ts.forEachChild(node, visit);
  }; visit(file);
}

export function assertWeekThreeBajieJoiningE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w3-m4 source contract: E2E source must be text.');
  for (const tag of W3_M4_TAGS) if (!source.includes(tag)) throw new Error(`w3-m4 source contract: missing ${tag}.`);
  if (forbidden.test(source)) throw new Error('w3-m4 source contract: legacy or dynamic shortcut is forbidden.');
  if (/Object\.assign|healthEvents\.(?:clear|delete|filter)\s*\(/.test(source)) throw new Error('w3-m4 source contract: injection or health mutation shortcut is forbidden.');
  const file = ts.createSourceFile('w3m4.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length) throw new Error('w3-m4 source contract: E2E source must parse.');
  const constants = constantStrings(file);
  assertHealth(source, file, constants);
  assertHealthImmutability(file, constants);
  assertBrowserCallbackSafety(file, constants);
  assertFormalPrerequisiteBody(file, constants);
}
