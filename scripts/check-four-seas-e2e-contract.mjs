import ts from 'typescript';

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

const bindingPropertyName = (element) => {
  if (element.propertyName) {
    const name = unwrapExpression(element.propertyName);
    return ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)
      ? name.text
      : null;
  }
  return propertyName(element);
};

const subtreeContainsIdentifier = (node, name) => {
  let found = false;
  const visit = (current) => {
    if (found) return;
    if (ts.isIdentifier(current) && current.text === name) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
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

function assertReadOnlyEvaluate(callback, locatorElementName = null) {
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
      const locatorGeometryRead = locatorElementName !== null
        && name === `${locatorElementName}.getBoundingClientRect`;
      if (!locatorGeometryRead && (name === null || !safeReadCalls.has(name))) fail(`call ${String(name)}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
}

function assertLocatorGeometryEvaluate(callback) {
  if (callback.parameters.length !== 1 || !ts.isIdentifier(callback.parameters[0].name)) {
    throw new Error('Four Seas E2E source contract: locator geometry evaluate must use one element parameter.');
  }
  assertReadOnlyEvaluate(callback, callback.parameters[0].name.text);
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
    || condition.elseStatement !== undefined
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

const compactNodeText = (node, file) => node.getText(file).replace(/\s+/g, '');

function assertExpectedNavigationAbort(file) {
  const helper = file.statements.find((statement) => (
    ts.isFunctionDeclaration(statement) && statement.name?.text === 'expectedNavigationAbort'
  ));
  if (!helper || helper.parent !== file || helper.parameters.length !== 1
    || !ts.isIdentifier(helper.parameters[0].name) || helper.parameters[0].name.text !== 'event'
    || !helper.body || helper.body.statements.length !== 1
    || !ts.isReturnStatement(helper.body.statements[0]) || !helper.body.statements[0].expression) {
    throw new Error('Four Seas E2E source contract: expectedNavigationAbort must be one pure top-level event predicate.');
  }
  const expectedExpression = "event.kind==='requestfailed'&&((event.url.startsWith('https://fonts.gstatic.com/')&&/ABORTED|cancelled/i.test(event.detail))||(event.url.includes('/assets/audio/')&&/ABORTED|cancelled/i.test(event.detail))||(event.url==='https://static.blockly.com/media/sprites.svg'&&/ABORTED|cancelled/i.test(event.detail)))";
  if (compactNodeText(helper.body.statements[0].expression, file) !== expectedExpression) {
    throw new Error('Four Seas E2E source contract: expectedNavigationAbort must filter only the approved navigation aborts.');
  }
  return helper;
}

function assertUnexpectedHealthFilter(node) {
  const filterCall = directMethodCall(node, 'healthEvents', 'filter');
  if (filterCall === null || filterCall.arguments.length !== 1) {
    throw new Error('Four Seas E2E source contract: afterEach must filter the shared healthEvents exactly once.');
  }
  const predicate = unwrapExpression(filterCall.arguments[0]);
  if (!ts.isArrowFunction(predicate) || predicate.parameters.length !== 1
    || !ts.isIdentifier(predicate.parameters[0].name)) {
    throw new Error('Four Seas E2E source contract: healthEvents filter must use one inspectable event predicate.');
  }
  const eventName = predicate.parameters[0].name.text;
  const body = unwrapExpression(predicate.body);
  const navigationCall = ts.isPrefixUnaryExpression(body)
    && body.operator === ts.SyntaxKind.ExclamationToken
    ? directIdentifierCall(body.operand, 'expectedNavigationAbort')
    : null;
  if (navigationCall === null || navigationCall.arguments.length !== 1
    || !ts.isIdentifier(unwrapExpression(navigationCall.arguments[0]))
    || unwrapExpression(navigationCall.arguments[0]).text !== eventName) {
    throw new Error('Four Seas E2E source contract: healthEvents filter may exclude only expectedNavigationAbort(event).');
  }
  return filterCall;
}

function assertPositiveEmptyExpectation(statement, expectedArgument) {
  const matcher = expressionStatementCall(statement);
  const callee = matcher && unwrapExpression(matcher.expression);
  const expectCall = callee && ts.isPropertyAccessExpression(callee)
    ? directIdentifierCall(callee.expression, 'expect')
    : null;
  if (matcher === null || calledPropertyName(matcher) !== 'toEqual'
    || expectCall === null || expectCall.arguments.length < 1 || expectCall.arguments.length > 2
    || (expectCall.arguments.length === 2 && !ts.isStringLiteral(unwrapExpression(expectCall.arguments[1])))
    || matcher.arguments.length !== 1
    || !ts.isArrayLiteralExpression(unwrapExpression(matcher.arguments[0]))
    || unwrapExpression(matcher.arguments[0]).elements.length !== 0) {
    throw new Error('Four Seas E2E source contract: afterEach must make one unconditional positive empty-array assertion.');
  }
  const actual = unwrapExpression(expectCall.arguments[0]);
  if (typeof expectedArgument === 'string') {
    if (!ts.isIdentifier(actual) || actual.text !== expectedArgument) {
      throw new Error('Four Seas E2E source contract: afterEach must assert the validated unexpected healthEvents value.');
    }
  } else if (actual !== expectedArgument) {
    throw new Error('Four Seas E2E source contract: afterEach must directly assert the validated healthEvents filter.');
  }
}

function assertAfterEachHealth(file, afterEachCalls) {
  if (afterEachCalls.length !== 1) {
    throw new Error('Four Seas E2E source contract: exactly one top-level afterEach health assertion is required.');
  }
  const call = afterEachCalls[0];
  if (!ts.isExpressionStatement(call.parent) || call.parent.parent !== file) {
    throw new Error('Four Seas E2E source contract: afterEach health assertion must be unconditional and top-level.');
  }
  const callback = call.arguments[0] && unwrapExpression(call.arguments[0]);
  if (!callback || !ts.isArrowFunction(callback) || callback.parameters.length !== 0
    || !ts.isBlock(callback.body)) {
    throw new Error('Four Seas E2E source contract: afterEach must use one exact inspectable callback.');
  }
  const statements = callback.body.statements;
  if (statements.length === 1) {
    const matcher = expressionStatementCall(statements[0]);
    const callee = matcher && unwrapExpression(matcher.expression);
    const expectCall = callee && ts.isPropertyAccessExpression(callee)
      ? directIdentifierCall(callee.expression, 'expect')
      : null;
    const filterCall = expectCall?.arguments[0] && assertUnexpectedHealthFilter(expectCall.arguments[0]);
    assertPositiveEmptyExpectation(statements[0], filterCall);
    return callback;
  }
  if (statements.length === 2 && ts.isVariableStatement(statements[0])
    && (statements[0].declarationList.flags & ts.NodeFlags.Const)
    && statements[0].declarationList.declarations.length === 1) {
    const declaration = statements[0].declarationList.declarations[0];
    if (ts.isIdentifier(declaration.name) && declaration.name.text === 'unexpected'
      && declaration.initializer) {
      assertUnexpectedHealthFilter(declaration.initializer);
      assertPositiveEmptyExpectation(statements[1], 'unexpected');
      return callback;
    }
  }
  throw new Error('Four Seas E2E source contract: afterEach health assertion has invalid conditional, reset, or control-flow structure.');
}

function collectNamedIdentifiers(root, name, target) {
  const visit = (node) => {
    if (ts.isIdentifier(node) && node.text === name) target.add(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
}

function assertMainHealthReset(file, beforeEachCalls, allowedHealthReferences) {
  if (beforeEachCalls.length === 0) return;
  if (beforeEachCalls.length !== 1) {
    throw new Error('Four Seas E2E source contract: exactly one main beforeEach health reset is allowed.');
  }
  const call = beforeEachCalls[0];
  const callback = call.arguments[0] && unwrapExpression(call.arguments[0]);
  if (!ts.isExpressionStatement(call.parent) || call.parent.parent !== file
    || !callback || !ts.isArrowFunction(callback) || !ts.isBlock(callback.body)
    || callback.body.statements.length === 0) {
    throw new Error('Four Seas E2E source contract: main beforeEach health reset must be top-level and inspectable.');
  }
  const resetStatement = callback.body.statements[0];
  const reset = ts.isExpressionStatement(resetStatement)
    ? unwrapExpression(resetStatement.expression)
    : null;
  if (!reset || !ts.isBinaryExpression(reset)
    || reset.operatorToken.kind !== ts.SyntaxKind.EqualsToken
    || !ts.isIdentifier(unwrapExpression(reset.left))
    || unwrapExpression(reset.left).text !== 'healthEvents'
    || !ts.isArrayLiteralExpression(unwrapExpression(reset.right))
    || unwrapExpression(reset.right).elements.length !== 0) {
    throw new Error('Four Seas E2E source contract: beforeEach must synchronously reset healthEvents first, before attach, navigation, init, or await.');
  }
  allowedHealthReferences.add(unwrapExpression(reset.left));
}

function assertGlobalHealthReferences(
  file,
  healthDeclaration,
  attachHealth,
  expectedNavigationAbort,
  afterEachCallback,
  beforeEachCalls,
) {
  const allowedHealthReferences = new Set([healthDeclaration.name]);
  const allowedAbortReferences = new Set([expectedNavigationAbort.name]);
  collectNamedIdentifiers(attachHealth.body, 'healthEvents', allowedHealthReferences);
  collectNamedIdentifiers(afterEachCallback.body, 'healthEvents', allowedHealthReferences);
  collectNamedIdentifiers(afterEachCallback.body, 'expectedNavigationAbort', allowedAbortReferences);
  assertMainHealthReset(file, beforeEachCalls, allowedHealthReferences);

  const visit = (node) => {
    if (ts.isIdentifier(node) && node.text === 'healthEvents' && !allowedHealthReferences.has(node)) {
      throw new Error('Four Seas E2E source contract: healthEvents reference is an unapproved mutation, alias, or escape.');
    }
    if (ts.isIdentifier(node) && node.text === 'expectedNavigationAbort' && !allowedAbortReferences.has(node)) {
      throw new Error('Four Seas E2E source contract: expectedNavigationAbort may only be declared and called by the validated afterEach filter.');
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function assertHealthContract(file, attachHealth, afterEachCalls, beforeEachCalls) {
  if (!attachHealth || attachHealth.parent !== file || attachHealth.parameters.length !== 1
    || !attachHealth.body || !ts.isIdentifier(attachHealth.parameters[0].name)
    || attachHealth.parameters[0].name.text !== 'page') {
    throw new Error('Four Seas E2E source contract: attachHealth must be one real top-level page helper.');
  }
  const healthDeclarations = file.statements.flatMap((statement) => (
    ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : []
  )).filter((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'healthEvents');
  const healthDeclaration = healthDeclarations[0];
  if (healthDeclarations.length !== 1 || !healthDeclaration?.initializer
    || !ts.isVariableDeclarationList(healthDeclaration.parent)
    || !(healthDeclaration.parent.flags & ts.NodeFlags.Let)
    || !ts.isArrayLiteralExpression(unwrapExpression(healthDeclaration.initializer))
    || unwrapExpression(healthDeclaration.initializer).elements.length !== 0) {
    throw new Error('Four Seas E2E source contract: healthEvents must be one top-level let initialized to an empty event collection.');
  }
  if (attachHealth.body.statements.length !== 3) {
    throw new Error('Four Seas E2E source contract: attachHealth must register exactly console, pageerror, and requestfailed.');
  }
  const expectedListenerBodies = new Map([
    ['console', "{if(message.type()==='error')healthEvents.push({kind:'console',url:message.location().url||page.url(),detail:message.text()})}"],
    ['pageerror', "healthEvents.push({kind:'pageerror',url:page.url(),detail:error.message})"],
    ['requestfailed', "healthEvents.push({kind:'requestfailed',url:request.url(),detail:request.failure()?.errorText??'unknown'})"],
  ]);
  const expectedParameterNames = new Map([
    ['console', 'message'],
    ['pageerror', 'error'],
    ['requestfailed', 'request'],
  ]);
  const seenEvents = new Set();
  for (const statement of attachHealth.body.statements) {
    const onCall = expressionStatementCall(statement);
    if (onCall === null || directMethodCall(onCall, 'page', 'on') !== onCall
      || onCall.arguments.length !== 2 || !ts.isStringLiteral(unwrapExpression(onCall.arguments[0]))) {
      throw new Error('Four Seas E2E source contract: attachHealth must use unconditional page.on registrations.');
    }
    const eventName = unwrapExpression(onCall.arguments[0]).text;
    const callback = unwrapExpression(onCall.arguments[1]);
    const expectedParameterName = expectedParameterNames.get(eventName);
    if (!expectedParameterName || seenEvents.has(eventName) || !ts.isArrowFunction(callback)
      || callback.parameters.length !== 1 || !ts.isIdentifier(callback.parameters[0].name)
      || callback.parameters[0].name.text !== expectedParameterName
      || compactNodeText(callback.body, file) !== expectedListenerBodies.get(eventName)) {
      throw new Error(`Four Seas E2E source contract: ${eventName} listener must directly push one complete normalized event.`);
    }
    seenEvents.add(eventName);
  }
  if ([...seenEvents].sort().join(',') !== 'console,pageerror,requestfailed') {
    throw new Error('Four Seas E2E source contract: attachHealth must cover console, pageerror, and requestfailed exactly once.');
  }
  const expectedNavigationAbort = assertExpectedNavigationAbort(file);
  const afterEachCallback = assertAfterEachHealth(file, afterEachCalls);
  assertGlobalHealthReferences(
    file,
    healthDeclaration,
    attachHealth,
    expectedNavigationAbort,
    afterEachCallback,
    beforeEachCalls,
  );
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
  const afterEachCalls = [];
  const evaluateCalls = [];
  const aliasedMethods = [];
  const locatorBindings = new Set();

  const visit = (node) => {
    if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node))
      && browserContextMethods.has(staticPropertyName(node))) {
      const directInvocation = ts.isCallExpression(node.parent)
        && unwrapExpression(node.parent.expression) === node;
      if (!directInvocation) aliasedMethods.push(staticPropertyName(node));
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      if (ts.isIdentifier(node.name) && directMethodCall(node.initializer, 'page', 'locator')) {
        locatorBindings.add(node.name.text);
      }
      if (ts.isObjectBindingPattern(node.name)
        && node.name.elements.some((element) => browserContextMethods.has(bindingPropertyName(element)))) aliasedMethods.push('destructured method');
    }
    if (ts.isCallExpression(node)) {
      const callee = unwrapExpression(node.expression);
      if (ts.isElementAccessExpression(callee)) {
        throw new Error('Four Seas E2E source contract: dynamic ElementAccess method calls are forbidden.');
      }
      const qualifiedName = qualifiedCallName(node);
      if (qualifiedName === 'Reflect.get' || qualifiedName === 'Reflect.apply') {
        throw new Error(`Four Seas E2E source contract: dynamic browser access through ${qualifiedName} is forbidden.`);
      }
      const method = calledPropertyName(node);
      if (method === 'newPage') newPageCalls.push(node);
      if (method === 'addInitScript') initCalls.push(node);
      if (method === 'beforeEach') beforeEachCalls.push(node);
      if (method === 'afterEach') afterEachCalls.push(node);
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
    const callee = unwrapExpression(call.expression);
    const receiver = ts.isPropertyAccessExpression(callee) ? unwrapExpression(callee.expression) : null;
    const directLocatorCall = receiver !== null && ts.isCallExpression(receiver)
      && calledPropertyName(receiver) === 'locator';
    const locatorBindingCall = receiver !== null && ts.isIdentifier(receiver)
      && locatorBindings.has(receiver.text);
    if (directLocatorCall || locatorBindingCall) assertLocatorGeometryEvaluate(callback);
    else assertReadOnlyEvaluate(callback);
  }
  if (attachHealth || beforeEachCalls.length > 0 || newPageCalls.length > 0) {
    assertHealthContract(file, attachHealth, afterEachCalls, beforeEachCalls);
  }
  assertMainBeforeEachHealth(file, beforeEachCalls);
}
