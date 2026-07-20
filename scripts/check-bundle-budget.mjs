import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { dirname, isAbsolute, join, normalize, relative, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  ENTRY_GZIP_LIMIT,
  GAME_SCENE_RAW_LIMIT,
  HOME_TOTAL_LIMIT,
  PHASER_RAW_LIMIT,
} from './budget-limits.mjs';
export {
  DRAGON_PALACE_COLD_LOAD_MAX_BYTES,
  DRAGON_PALACE_COLD_BYTES,
  FOUR_SEAS_COLD_LOAD_MAX_BYTES,
  FOUR_SEAS_COLD_BYTES,
  RUYI_STAFF_COLD_BYTES,
  RUYI_STAFF_COLD_LOAD_MAX_BYTES,
  DRAGON_PALACE_MEDIA_BYTES,
  ENTRY_GZIP_LIMIT,
  GAME_SCENE_RAW_LIMIT,
  HOME_TOTAL_LIMIT,
  PHASER_RAW_LIMIT,
  SINGLE_RASTER_BYTES,
} from './budget-limits.mjs';

const MODE_ROOTS = ['src/components/BlocklyWorkspace.tsx', 'src/components/RuyiStaffBlocklyWorkspace.tsx', 'src/components/FourSeasRegaliaBlocklyWorkspace.tsx', 'src/components/PythonEditor.tsx', 'src/components/AiLab.tsx', 'src/components/GameScene.tsx', 'src/components/RuyiStaffScene.tsx', 'src/components/FourSeasRegaliaScene.tsx'];
const SCENE_ROOTS = new Set(['src/components/GameScene.tsx', 'src/components/RuyiStaffScene.tsx', 'src/components/FourSeasRegaliaScene.tsx']);
const isPhaserSource = (key, chunk) => chunk.name === 'phaser' || /node_modules[\\/]phaser(?:[\\/]|$)/i.test(`${key} ${chunk.src ?? ''}`);
const isBlocklySource = (key, chunk) => chunk.name === 'blockly-editor' || /node_modules[\\/]blockly(?:[\\/]|$)/i.test(`${key} ${chunk.src ?? ''}`);
const assertSafeFile = (file) => {
  const normalized = normalize(file);
  const portable = file.replaceAll('\\', '/');
  if (isAbsolute(file) || win32.isAbsolute(file) || portable === '..' || portable.startsWith('../') || portable.split('/').includes('..') || normalized === '..') throw new Error(`Bundle budget: unsafe manifest file path ${file}.`);
};

export function assertNoSourceVisualAssets(files) {
  const sourceAsset = files.find((file) => /\.(?:png|avif)$/i.test(file));
  if (sourceAsset) throw new Error(`Bundle budget: non-shipping visual source remains in public: ${sourceAsset}.`);
}

const unwrapExpression = (node) => {
  let current = node;
  while (
    ts.isAwaitExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
  ) current = current.expression;
  return current;
};

const staticPropertyName = (node) => {
  const expression = unwrapExpression(node);
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text;
  if (ts.isElementAccessExpression(expression)) {
    const argument = unwrapExpression(expression.argumentExpression);
    if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) return argument.text;
  }
  return null;
};

const calledPropertyName = (call) => staticPropertyName(call.expression);

const directCall = (node) => {
  const expression = unwrapExpression(node);
  return ts.isCallExpression(expression) ? expression : null;
};

const directIdentifierCall = (node, name) => {
  const call = directCall(node);
  return call !== null && ts.isIdentifier(unwrapExpression(call.expression))
    && unwrapExpression(call.expression).text === name
    ? call
    : null;
};

const directMethodCall = (node, receiverName, methodName) => {
  const call = directCall(node);
  if (call === null || calledPropertyName(call) !== methodName) return null;
  const callee = unwrapExpression(call.expression);
  if (!ts.isPropertyAccessExpression(callee)) return null;
  return ts.isIdentifier(unwrapExpression(callee.expression))
    && unwrapExpression(callee.expression).text === receiverName
    ? call
    : null;
};

const expressionStatementCall = (statement) => (
  ts.isExpressionStatement(statement) ? directCall(statement.expression) : null
);

const propertyName = (property) => {
  if (!property.name || property.name === undefined) return null;
  const name = unwrapExpression(property.name);
  return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
    ? name.text
    : null;
};

const nearestFunctionDeclaration = (node) => {
  let current = node.parent;
  while (current && !ts.isFunctionDeclaration(current)) current = current.parent;
  return current ?? null;
};

const isAsyncFunction = (node) => node.modifiers?.some(
  (modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword,
) === true;

const assignmentOperators = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

const browserContextMethods = new Set([
  'newPage',
  'evaluate',
  'evaluateHandle',
  'addInitScript',
]);

const safeReadCalls = new Set([
  'JSON.parse',
  'JSON.stringify',
  'Object.entries',
  'Object.keys',
  'Object.values',
  'Array.isArray',
  'localStorage.getItem',
  'sessionStorage.getItem',
]);

const qualifiedCallName = (call) => {
  const callee = unwrapExpression(call.expression);
  if (ts.isIdentifier(callee)) return callee.text;
  if (!ts.isPropertyAccessExpression(callee)) return null;
  const receiver = unwrapExpression(callee.expression);
  return ts.isIdentifier(receiver) ? `${receiver.text}.${callee.name.text}` : null;
};

function assertReadOnlyEvaluate(callback) {
  const fail = (detail) => {
    throw new Error(`Four Seas E2E source contract: evaluate write/injection is not provably read-only (${detail}).`);
  };
  const visit = (node) => {
    if (ts.isBinaryExpression(node) && assignmentOperators.has(node.operatorToken.kind)) {
      fail('assignment');
    }
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node))
      && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
    ) fail('update');
    if (ts.isDeleteExpression(node)) fail('delete');
    if (ts.isNewExpression(node)) fail('constructor call');
    if (ts.isCallExpression(node)) {
      const name = qualifiedCallName(node);
      if (name === null || !safeReadCalls.has(name)) fail(`call ${String(name)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
}

function assertHealthyPageFactory(file, factory) {
  if (factory.parent !== file || !isAsyncFunction(factory) || factory.parameters.length !== 1 || !factory.body) {
    throw new Error('Four Seas E2E source contract: newHealthyPage factory must be a top-level function with one context parameter.');
  }
  const parameter = factory.parameters[0].name;
  if (!ts.isIdentifier(parameter) || parameter.text !== 'context') {
    throw new Error('Four Seas E2E source contract: newHealthyPage factory must use the unique context parameter.');
  }
  const statements = factory.body.statements;
  if (statements.length !== 3) {
    throw new Error('Four Seas E2E source contract: newHealthyPage factory must create, attach health, then return.');
  }
  const declarationStatement = statements[0];
  if (
    !ts.isVariableStatement(declarationStatement)
    || !(declarationStatement.declarationList.flags & ts.NodeFlags.Const)
    || declarationStatement.declarationList.declarations.length !== 1
  ) throw new Error('Four Seas E2E source contract: newHealthyPage factory must declare one const page.');
  const declaration = declarationStatement.declarationList.declarations[0];
  if (!ts.isIdentifier(declaration.name) || declaration.name.text !== 'page' || !declaration.initializer) {
    throw new Error('Four Seas E2E source contract: newHealthyPage factory must declare const page.');
  }
  const newPageCall = directMethodCall(declaration.initializer, 'context', 'newPage');
  if (newPageCall === null || newPageCall.arguments.length !== 0 || !ts.isAwaitExpression(declaration.initializer)) {
    throw new Error('Four Seas E2E source contract: newHealthyPage factory must await context.newPage().');
  }
  const healthCall = expressionStatementCall(statements[1]);
  if (
    healthCall === null
    || !ts.isIdentifier(unwrapExpression(healthCall.expression))
    || unwrapExpression(healthCall.expression).text !== 'attachHealth'
    || healthCall.arguments.length !== 1
    || !ts.isIdentifier(unwrapExpression(healthCall.arguments[0]))
    || unwrapExpression(healthCall.arguments[0]).text !== 'page'
  ) throw new Error('Four Seas E2E source contract: newHealthyPage factory must unconditionally attach health before any page use.');
  if (!ts.isReturnStatement(statements[2]) || !statements[2].expression
    || !ts.isIdentifier(unwrapExpression(statements[2].expression))
    || unwrapExpression(statements[2].expression).text !== 'page') {
    throw new Error('Four Seas E2E source contract: newHealthyPage factory must return its healthy page.');
  }
}

function assertPrerequisiteFixture(file, fixture) {
  if (fixture.parent !== file || fixture.parameters.length !== 0 || !fixture.body
    || fixture.body.statements.length !== 1 || !ts.isReturnStatement(fixture.body.statements[0])) {
    throw new Error('Four Seas E2E source contract: prerequisite fixture must be a top-level literal-return helper.');
  }
  const value = fixture.body.statements[0].expression && unwrapExpression(fixture.body.statements[0].expression);
  if (!value || !ts.isObjectLiteralExpression(value)) {
    throw new Error('Four Seas E2E source contract: prerequisite fixture must return an object literal.');
  }
  const assertLiteralFixture = (node) => {
    if (ts.isComputedPropertyName(node) || ts.isSpreadAssignment(node) || ts.isSpreadElement(node)
      || ts.isCallExpression(node) || ts.isNewExpression(node)) {
      throw new Error('Four Seas E2E source contract: prerequisite fixture must not hide computed or indirect state.');
    }
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && node.text === 'w1-m3') {
      throw new Error('Four Seas E2E source contract: prerequisite fixture must not contain w1-m3 state.');
    }
    ts.forEachChild(node, assertLiteralFixture);
  };
  assertLiteralFixture(value);
  const properties = new Map(value.properties.map((property) => [propertyName(property), property]));
  const missionsProperty = properties.get('missions');
  const sessionsProperty = properties.get('sessions');
  if (!missionsProperty || !ts.isPropertyAssignment(missionsProperty)
    || !sessionsProperty || !ts.isPropertyAssignment(sessionsProperty)) {
    throw new Error('Four Seas E2E source contract: prerequisite fixture must declare missions and sessions.');
  }
  const missions = unwrapExpression(missionsProperty.initializer);
  const sessions = unwrapExpression(sessionsProperty.initializer);
  if (!ts.isObjectLiteralExpression(missions) || !ts.isObjectLiteralExpression(sessions)) {
    throw new Error('Four Seas E2E source contract: prerequisite missions and sessions must be object literals.');
  }
  const missionKeys = missions.properties.map(propertyName).sort();
  if (missionKeys.length !== 2 || missionKeys[0] !== 'w1-m1' || missionKeys[1] !== 'w1-m2'
    || sessions.properties.length !== 0) {
    throw new Error('Four Seas E2E source contract: prerequisite fixture may preload only w1-m1/w1-m2 and no sessions.');
  }
}

function assertPrerequisiteInstaller(file, installer) {
  if (installer.parent !== file || !isAsyncFunction(installer) || installer.parameters.length !== 1 || !installer.body
    || !ts.isIdentifier(installer.parameters[0].name) || installer.parameters[0].name.text !== 'page'
    || installer.body.statements.length !== 1 || !ts.isExpressionStatement(installer.body.statements[0])) {
    throw new Error('Four Seas E2E source contract: installFourSeasPrerequisites must be one top-level page helper.');
  }
  const statement = installer.body.statements[0];
  const call = directMethodCall(statement.expression, 'page', 'addInitScript');
  if (call === null || !ts.isAwaitExpression(statement.expression) || call.arguments.length !== 2) {
    throw new Error('Four Seas E2E source contract: prerequisite helper must await one page.addInitScript call.');
  }
  const callback = unwrapExpression(call.arguments[0]);
  const argument = unwrapExpression(call.arguments[1]);
  if (!ts.isArrowFunction(callback) || callback.parameters.length !== 1
    || !ts.isObjectBindingPattern(callback.parameters[0].name)
    || callback.parameters[0].name.elements.map((element) => propertyName(element)).sort().join(',') !== 'key,value'
    || !ts.isBlock(callback.body) || callback.body.statements.length !== 1
    || !ts.isIfStatement(callback.body.statements[0]) || !ts.isObjectLiteralExpression(argument)) {
    throw new Error('Four Seas E2E source contract: prerequisite init callback must use the exact key/value gate.');
  }
  const condition = callback.body.statements[0];
  const comparison = unwrapExpression(condition.expression);
  const thenStatement = ts.isBlock(condition.thenStatement)
    ? condition.thenStatement.statements.length === 1 && condition.thenStatement.statements[0]
    : condition.thenStatement;
  const setCall = thenStatement && expressionStatementCall(thenStatement);
  const getCall = ts.isBinaryExpression(comparison) && directMethodCall(comparison.left, 'localStorage', 'getItem');
  if (!ts.isBinaryExpression(comparison) || comparison.operatorToken.kind !== ts.SyntaxKind.EqualsEqualsEqualsToken
    || getCall === null || getCall.arguments.length !== 1 || !ts.isIdentifier(unwrapExpression(getCall.arguments[0]))
    || unwrapExpression(getCall.arguments[0]).text !== 'key'
    || unwrapExpression(comparison.right).kind !== ts.SyntaxKind.NullKeyword
    || setCall === null || calledPropertyName(setCall) !== 'setItem') {
    throw new Error('Four Seas E2E source contract: prerequisite init must set only an absent storage key.');
  }
  const setCallee = unwrapExpression(setCall.expression);
  const serializedValue = setCall.arguments[1] && directMethodCall(setCall.arguments[1], 'JSON', 'stringify');
  if (!ts.isPropertyAccessExpression(setCallee) || !ts.isIdentifier(setCallee.expression)
    || setCallee.expression.text !== 'localStorage' || setCall.arguments.length !== 2
    || !ts.isIdentifier(unwrapExpression(setCall.arguments[0])) || unwrapExpression(setCall.arguments[0]).text !== 'key'
    || serializedValue === null || serializedValue.arguments.length !== 1
    || !ts.isIdentifier(unwrapExpression(serializedValue.arguments[0])) || unwrapExpression(serializedValue.arguments[0]).text !== 'value') {
    throw new Error('Four Seas E2E source contract: prerequisite init may only serialize its validated value.');
  }
  const argumentProperties = new Map(argument.properties.map((property) => [propertyName(property), property]));
  const keyProperty = argumentProperties.get('key');
  const valueProperty = argumentProperties.get('value');
  if (argument.properties.length !== 2 || !keyProperty || !ts.isPropertyAssignment(keyProperty)
    || !ts.isIdentifier(unwrapExpression(keyProperty.initializer)) || unwrapExpression(keyProperty.initializer).text !== 'CURRENT_KEY'
    || !valueProperty || !ts.isPropertyAssignment(valueProperty)
    || directIdentifierCall(valueProperty.initializer, 'fourSeasPrerequisiteFixture')?.arguments.length !== 0) {
    throw new Error('Four Seas E2E source contract: prerequisite init arguments must use CURRENT_KEY and the validated fixture.');
  }
  return call;
}

function assertStorageFailureHelper(file, helper) {
  if (helper.parent !== file || !isAsyncFunction(helper) || helper.parameters.length !== 2 || !helper.body
    || !ts.isIdentifier(helper.parameters[0].name) || helper.parameters[0].name.text !== 'page'
    || !ts.isIdentifier(helper.parameters[1].name) || helper.parameters[1].name.text !== 'mode'
    || helper.body.statements.length !== 1 || !ts.isExpressionStatement(helper.body.statements[0])) {
    throw new Error('Four Seas E2E source contract: storage failure mode must use one exact top-level helper.');
  }
  const statement = helper.body.statements[0];
  const call = directMethodCall(statement.expression, 'page', 'evaluate');
  if (call === null || !ts.isAwaitExpression(statement.expression) || call.arguments.length !== 2) {
    throw new Error('Four Seas E2E source contract: storage failure helper must await one page.evaluate call.');
  }
  const callback = unwrapExpression(call.arguments[0]);
  const outerMode = unwrapExpression(call.arguments[1]);
  if (!ts.isArrowFunction(callback) || callback.parameters.length !== 1
    || !ts.isIdentifier(callback.parameters[0].name) || callback.parameters[0].name.text !== 'value'
    || !ts.isBlock(callback.body) || callback.body.statements.length !== 1
    || !ts.isIdentifier(outerMode) || outerMode.text !== 'mode') {
    throw new Error('Four Seas E2E source contract: storage failure helper must pass only its mode value.');
  }
  const setCall = expressionStatementCall(callback.body.statements[0]);
  const key = setCall?.arguments[0] && unwrapExpression(setCall.arguments[0]);
  const value = setCall?.arguments[1] && unwrapExpression(setCall.arguments[1]);
  if (setCall === null || directMethodCall(setCall, 'localStorage', 'setItem') !== setCall
    || setCall.arguments.length !== 2 || !key || !ts.isStringLiteral(key)
    || key.text !== 'xiyou-test-storage-mode' || !value || !ts.isIdentifier(value)
    || value.text !== 'value') {
    throw new Error('Four Seas E2E source contract: storage failure helper may write only xiyou-test-storage-mode.');
  }
  return call;
}

function assertMainBeforeEachHealth(file, beforeEachCalls) {
  for (const call of beforeEachCalls) {
    const callback = call.arguments[0] && unwrapExpression(call.arguments[0]);
    if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback)) || !ts.isBlock(callback.body)) {
      throw new Error('Four Seas E2E source contract: beforeEach must use an inspectable inline callback.');
    }
    const statements = callback.body.statements;
    const healthIndex = statements.findIndex((statement) => {
      const healthCall = expressionStatementCall(statement);
      return healthCall !== null && ts.isIdentifier(unwrapExpression(healthCall.expression))
        && unwrapExpression(healthCall.expression).text === 'attachHealth'
        && healthCall.arguments.length === 1 && ts.isIdentifier(unwrapExpression(healthCall.arguments[0]))
        && unwrapExpression(healthCall.arguments[0]).text === 'page';
    });
    const setupIndex = statements.findIndex((statement) => {
      let found = false;
      const visit = (node) => {
        if (ts.isCallExpression(node)) {
          const name = calledPropertyName(node);
          const callee = unwrapExpression(node.expression);
          if (['goto', 'addInitScript'].includes(name)
            || (ts.isIdentifier(callee) && ['installFourSeasPrerequisites', 'newHealthyPage'].includes(callee.text))) found = true;
        }
        if (!found) ts.forEachChild(node, visit);
      };
      visit(statement);
      return found;
    });
    if (healthIndex === -1 || (setupIndex !== -1 && healthIndex > setupIndex)) {
      throw new Error('Four Seas E2E source contract: beforeEach must attach health before navigation or initialization.');
    }
    for (const statement of statements.slice(0, healthIndex)) {
      let callBeforeHealth = false;
      const visit = (node) => {
        if (ts.isCallExpression(node) || ts.isNewExpression(node)) callBeforeHealth = true;
        if (!callBeforeHealth) ts.forEachChild(node, visit);
      };
      visit(statement);
      if (callBeforeHealth) {
        throw new Error('Four Seas E2E source contract: beforeEach may not call page setup before attachHealth(page).');
      }
    }
  }
}

export function assertFourSeasE2ESourceContract(source) {
  const file = ts.createSourceFile(
    'four-seas-regalia-code-battle.spec.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  if (file.parseDiagnostics.length > 0) {
    throw new Error('Four Seas E2E source contract: source must parse before safety inspection.');
  }

  const topLevelFunctions = new Map(file.statements
    .filter((statement) => ts.isFunctionDeclaration(statement) && statement.name)
    .map((statement) => [statement.name.text, statement]));
  const factory = topLevelFunctions.get('newHealthyPage');
  const fixture = topLevelFunctions.get('fourSeasPrerequisiteFixture');
  const installer = topLevelFunctions.get('installFourSeasPrerequisites');
  const storageFailureHelper = topLevelFunctions.get('setFourSeasStorageFailureMode');
  const attachHealth = topLevelFunctions.get('attachHealth');
  const newPageCalls = [];
  const initCalls = [];
  const beforeEachCalls = [];
  const evaluateCalls = [];
  const aliasedMethods = [];

  const visit = (node) => {
    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
      && browserContextMethods.has(staticPropertyName(node))) {
      const directInvocation = ts.isCallExpression(node.parent)
        && unwrapExpression(node.parent.expression) === node;
      if (!directInvocation) aliasedMethods.push(staticPropertyName(node));
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (ts.isObjectBindingPattern(node.name)
        && node.name.elements.some((element) => browserContextMethods.has(propertyName(element)))) aliasedMethods.push('destructured method');
    }
    if (ts.isCallExpression(node)) {
      const method = calledPropertyName(node);
      if (method === 'newPage') newPageCalls.push(node);
      if (method === 'addInitScript') initCalls.push(node);
      if (method === 'beforeEach') beforeEachCalls.push(node);
      if (method === 'evaluate' || method === 'evaluateHandle') {
        evaluateCalls.push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  if (aliasedMethods.length > 0) {
    throw new Error(`Four Seas E2E source contract: browser-context method alias is forbidden (${aliasedMethods[0]}).`);
  }
  if (newPageCalls.length > 0) {
    if (!factory || !attachHealth) {
      throw new Error('Four Seas E2E source contract: pages must be created by the top-level newHealthyPage factory.');
    }
    assertHealthyPageFactory(file, factory);
    if (newPageCalls.length !== 1 || nearestFunctionDeclaration(newPageCalls[0]) !== factory) {
      throw new Error('Four Seas E2E source contract: direct newPage calls outside newHealthyPage are forbidden.');
    }
  } else if (factory) {
    throw new Error('Four Seas E2E source contract: newHealthyPage must contain its one validated newPage call.');
  }
  if (initCalls.length > 0) {
    if (!fixture || !installer) {
      throw new Error('Four Seas E2E source contract: addInitScript is allowed only in the prerequisite fixture helper.');
    }
    assertPrerequisiteFixture(file, fixture);
    const allowedInitCall = assertPrerequisiteInstaller(file, installer);
    if (initCalls.length !== 1 || initCalls[0] !== allowedInitCall) {
      throw new Error('Four Seas E2E source contract: unapproved addInitScript call is forbidden.');
    }
  } else if (fixture || installer) {
    throw new Error('Four Seas E2E source contract: prerequisite fixture helpers must contain one validated addInitScript call.');
  }
  const allowedStorageFailureCall = storageFailureHelper
    ? assertStorageFailureHelper(file, storageFailureHelper)
    : null;
  for (const call of evaluateCalls) {
    if (call === allowedStorageFailureCall) continue;
    const callback = call.arguments[0] && unwrapExpression(call.arguments[0]);
    if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
      throw new Error('Four Seas E2E source contract: evaluate callback must be inline for AST inspection.');
    }
    assertReadOnlyEvaluate(callback);
  }
  assertMainBeforeEachHealth(file, beforeEachCalls);
}

async function listFiles(root, relativeRoot = '') {
  const entries = await readdir(join(root, relativeRoot), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = join(relativeRoot, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, relativePath));
    else files.push(relativePath.replaceAll('\\', '/'));
  }
  return files;
}

function collectClosure(manifest, root, includeDynamic) {
  const keys = new Set();
  const walk = (key) => {
    if (keys.has(key)) return;
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Bundle budget: manifest import ${key} is missing.`);
    keys.add(key);
    for (const dependency of chunk.imports ?? []) walk(dependency);
    if (includeDynamic && (!chunk.isEntry || key === root)) for (const dependency of chunk.dynamicImports ?? []) walk(dependency);
  };
  walk(root);
  return keys;
}

export const collectStaticClosure = (manifest, root) => collectClosure(manifest, root, false);
export const collectRuntimeClosure = (manifest, root) => collectClosure(manifest, root, true);

function assertHealthyManifestGraph(manifest, entryKey) {
  for (const [key, chunk] of Object.entries(manifest)) {
    if (key !== entryKey && (chunk.imports ?? []).includes(entryKey)) {
      throw new Error(`Bundle budget: non-entry chunk ${key} statically imports application entry ${entryKey}.`);
    }
  }

  const visited = new Set();
  const active = new Set();
  const path = [];
  const walk = (key) => {
    if (active.has(key)) {
      const cycleStart = path.indexOf(key);
      throw new Error(`Bundle budget: manifest dependency cycle ${[...path.slice(cycleStart), key].join(' -> ')}.`);
    }
    if (visited.has(key)) return;
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Bundle budget: manifest import ${key} is missing.`);
    active.add(key);
    path.push(key);
    for (const dependency of new Set([...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])])) walk(dependency);
    path.pop();
    active.delete(key);
    visited.add(key);
  };
  for (const key of Object.keys(manifest)) walk(key);
}

export function analyzeManifest(manifest, gzipSizes, rawSizes = {}) {
  const entryKey = Object.keys(manifest).find((key) => key.replaceAll('\\', '/') === 'src/main.tsx' && manifest[key].isEntry)
    ?? Object.keys(manifest).find((key) => manifest[key].isEntry && manifest[key].src === 'index.html');
  if (!entryKey) throw new Error('Bundle budget: src/main.tsx/index.html application entry is missing from the Vite manifest.');
  assertHealthyManifestGraph(manifest, entryKey);
  const visited = collectStaticClosure(manifest, entryKey);
  for (const chunk of Object.values(manifest)) if (chunk.file) assertSafeFile(chunk.file);
  const staticFiles = [...new Set([...visited].map((key) => manifest[key].file).filter((file) => file?.endsWith('.js')))];
  const staticPhaser = [...visited].find((key) => isPhaserSource(key, manifest[key]));
  if (staticPhaser) throw new Error(`Bundle budget: Phaser entered the static entry closure through ${staticPhaser}.`);
  const staticBlockly = [...visited].find((key) => isBlocklySource(key, manifest[key]));
  if (staticBlockly) throw new Error(`Bundle budget: Blockly entered the static entry closure through ${staticBlockly}.`);
  const entryGzipBytes = staticFiles.reduce((sum, file) => {
    if (!Number.isFinite(gzipSizes[file])) throw new Error(`Bundle budget: gzip size missing for ${file}.`);
    return sum + gzipSizes[file];
  }, 0);
  if (entryGzipBytes > ENTRY_GZIP_LIMIT) throw new Error(`Bundle budget: entry is ${(entryGzipBytes / 1024).toFixed(1)} KiB gzip, over 180 KiB.`);
  const closures = {};
  for (const root of MODE_ROOTS) {
    if (!manifest[root]) continue;
    const keys = collectRuntimeClosure(manifest, root);
    const phaser = [...keys].some((key) => isPhaserSource(key, manifest[key]));
    if (!SCENE_ROOTS.has(root) && phaser) throw new Error(`Bundle budget: ${root.split('/').at(-1).replace('.tsx', '')} closure contains Phaser.`);
    const files = [...new Set([...keys].map((key) => manifest[key].file).filter((file) => file?.endsWith('.js')))];
    closures[root] = { files, rawBytes: files.reduce((sum, file) => sum + (rawSizes[file] ?? 0), 0), gzipBytes: files.reduce((sum, file) => sum + (gzipSizes[file] ?? 0), 0) };
    if (SCENE_ROOTS.has(root)) {
      if (!phaser) throw new Error('Bundle budget: 无法识别Phaser预算对象。GameScene运行闭包必须包含manifest name=phaser或node_modules/phaser来源。');
      const oversizedPhaser = [...keys].find((key) => isPhaserSource(key, manifest[key]) && (rawSizes[manifest[key].file] ?? 0) > PHASER_RAW_LIMIT);
      if (oversizedPhaser) throw new Error(`Bundle budget: approved dynamic Phaser chunk exceeds 1600 KiB raw (${manifest[oversizedPhaser].file}).`);
      if (closures[root].rawBytes > GAME_SCENE_RAW_LIMIT) throw new Error(`Bundle budget: ${root.split('/').at(-1).replace('.tsx', '')} closure exceeds 1900 KiB raw.`);
    }
  }
  const dynamic = Object.entries(manifest).filter(([key, chunk]) => !visited.has(key) && chunk.file?.endsWith('.js'));
  for (const [key, chunk] of dynamic) {
    if (isPhaserSource(key, chunk) && (rawSizes[chunk.file] ?? 0) > PHASER_RAW_LIMIT) {
      throw new Error(`Bundle budget: approved dynamic Phaser chunk exceeds 1600 KiB raw (${chunk.file}).`);
    }
  }
  return { entryGzipBytes, staticFiles, closures, dynamic: dynamic.map(([key, chunk]) => ({ key, file: chunk.file, gzipBytes: gzipSizes[chunk.file] ?? 0, rawBytes: rawSizes[chunk.file] ?? 0 })) };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  assertNoSourceVisualAssets(await listFiles(join(root, 'public')));
  const manifestPath = join(root, 'dist', '.vite', 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch (error) { throw new Error(`Bundle budget: cannot read ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`); }
  const files = [...new Set(Object.values(manifest).map((chunk) => chunk.file).filter((file) => file?.endsWith('.js')))];
  const gzipSizes = {};
  const rawSizes = {};
  for (const file of files) {
    const distRoot = resolve(root, 'dist');
    const path = resolve(distRoot, file);
    const within = relative(distRoot, path);
    if (within.startsWith('..') || isAbsolute(within)) throw new Error(`Bundle budget: unsafe manifest file path ${file}.`);
    const bytes = await readFile(path);
    gzipSizes[file] = gzipSync(bytes).byteLength;
    rawSizes[file] = (await stat(path)).size;
  }
  const result = analyzeManifest(manifest, gzipSizes, rawSizes);
  const homeFiles = ['index.html', 'assets/world-map.jpg', 'assets/mentor.jpg', 'assets/young-hero.jpg'];
  const cssFiles = [...new Set(Object.values(manifest).flatMap((chunk) => chunk.css ?? []))];
  const homeStaticBytes = result.entryGzipBytes;
  let homeTotalBytes = homeStaticBytes;
  for (const file of [...homeFiles, ...cssFiles]) homeTotalBytes += (await stat(join(root, 'dist', file))).size;
  if (homeTotalBytes > HOME_TOTAL_LIMIT) throw new Error(`Bundle budget: conservative homepage total is ${(homeTotalBytes / 1024).toFixed(1)} KiB, over 650 KiB.`);
  console.log(`Entry static JS: ${(result.entryGzipBytes / 1024).toFixed(1)} KiB gzip / 180 KiB`);
  console.log(`Conservative homepage total: ${(homeTotalBytes / 1024).toFixed(1)} KiB / 650 KiB`);
  const phaserEntry = Object.entries(manifest).find(([key, chunk]) => isPhaserSource(key, chunk));
  if (phaserEntry) console.log(`Phaser identified by manifest ${phaserEntry[1].name === 'phaser' ? 'name' : 'provenance'}: ${phaserEntry[0]}`);
  for (const [mode, closure] of Object.entries(result.closures)) console.log(`${mode.split('/').at(-1).replace('.tsx', '')} closure: ${(closure.rawBytes / 1024).toFixed(1)} KiB raw, ${(closure.gzipBytes / 1024).toFixed(1)} KiB gzip`);
  console.log('Dynamic JS chunks (not part of homepage entry):');
  for (const chunk of result.dynamic.sort((a, b) => b.rawBytes - a.rawBytes)) console.log(`  ${chunk.file}: ${(chunk.rawBytes / 1024).toFixed(1)} KiB raw, ${(chunk.gzipBytes / 1024).toFixed(1)} KiB gzip${/phaser/i.test(`${chunk.key} ${chunk.file}`) ? ' (approved Phaser ceiling: 1600 KiB raw)' : ''}`);
  console.log('Homepage total-resource target is enforced statically and re-measured in browser QA.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
