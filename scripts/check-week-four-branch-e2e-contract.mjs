import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

export const W4_M3_TAGS = Object.freeze([
  '@w4-m3-full', '@w4-m3-keyboard', '@w4-m3-mouse', '@w4-m3-touch',
  '@w4-m3-accessibility', '@w4-m3-storage', '@w4-m3-corrupt', '@w4-m3-parent',
  '@w4-m3-work', '@w4-m3-python-security', '@w4-m3-cold', '@w4-m3-runtime-fault',
  '@w4-m3-asset-fault', '@w4-m3-narrow', '@w4-m3-external', '@w4-m3-lazy',
]);
export const REQUIRED_W4_M3_TAGS = Object.freeze([...W4_M3_TAGS]);
// This digest pins the independently reviewed prerequisite construction, including formatting.
// Any update requires reviewing its full formal evidence chain; never refresh it merely to make a test pass.
export const APPROVED_W4_M2_PREREQUISITE_SHA256 = '9e67436dc6f2cc62e984f9ab751531329b85a36b3ea6f5b076b4dd54bbfe9758';
export const FORBIDDEN_W4_M3_PATTERNS = Object.freeze([
  /expectedSequence/, /expectedOutput/,
  /(?:localStorage|sessionStorage)\s*\.\s*setItem\s*\(/,
  /missionCompletionEvidence\s*(?:\.|\[)/,
  /\bpage\s*\.\s*evaluate\s*\((?:[^()]|\([^)]*\))*branch-proven/,
]);

function walk(file, visitor) {
  const visit = (node) => {
    visitor(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function propertyName(node) {
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text;
  return null;
}

function staticKey(node, stringBindings) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticKey(node.left, stringBindings); const right = staticKey(node.right, stringBindings);
    return left === '*' || right === '*' ? '*' : `${left}${right}`;
  }
  if (ts.isIdentifier(node) && stringBindings.has(node.text)) return stringBindings.get(node.text);
  return '*';
}

function accessParts(node, aliases = new Map(), stringBindings = new Map()) {
  if (ts.isIdentifier(node)) return aliases.get(node.text) ?? [node.text];
  if (ts.isPropertyAccessExpression(node)) return [...accessParts(node.expression, aliases, stringBindings), node.name.text];
  if (ts.isElementAccessExpression(node) && node.argumentExpression) return [
    ...accessParts(node.expression, aliases, stringBindings),
    staticKey(node.argumentExpression, stringBindings),
  ];
  if (ts.isCallExpression(node)) return accessParts(node.expression, aliases, stringBindings);
  return [];
}

function buildBindings(file) {
  const aliases = new Map([['progress', ['progress']], ['next', ['next']], ['state', ['state']], ['page', ['page']]]);
  const stringBindings = new Map();
  const valueBindings = new Map();
  const storageAliases = new Set(['localStorage', 'sessionStorage']);
  const evaluateAliases = new Set();
  let changed = true;
  while (changed) {
    changed = false;
    walk(file, (node) => {
      if (!ts.isVariableDeclaration(node) || !node.initializer) return;
      if (ts.isObjectBindingPattern(node.name)) {
        const basePath = accessParts(node.initializer, aliases, stringBindings);
        for (const element of node.name.elements) {
          if (!ts.isIdentifier(element.name)) continue;
          const key = element.propertyName
            ? (ts.isIdentifier(element.propertyName) ? element.propertyName.text : staticKey(element.propertyName, stringBindings))
            : element.name.text;
          const path = [...basePath, key];
          const name = element.name.text;
          if (path.length > 0 && ['progress', 'next', 'state', 'page'].includes(path[0]) && !aliases.has(name)) {
            aliases.set(name, path); changed = true;
          }
          if (path.at(-1) === 'localStorage' || path.at(-1) === 'sessionStorage') {
            if (!storageAliases.has(name)) { storageAliases.add(name); changed = true; }
          }
          if (path.at(-1) === 'evaluate' && !evaluateAliases.has(name)) { evaluateAliases.add(name); changed = true; }
        }
        return;
      }
      if (!ts.isIdentifier(node.name)) return;
      const name = node.name.text;
      if (!valueBindings.has(name)) { valueBindings.set(name, node.initializer); changed = true; }
      if (ts.isStringLiteralLike(node.initializer) && !stringBindings.has(name)) {
        stringBindings.set(name, node.initializer.text); changed = true;
      }
      const path = accessParts(node.initializer, aliases, stringBindings);
      if (path.length > 0 && ['progress', 'next', 'state', 'page'].includes(path[0]) && !aliases.has(name)) {
        aliases.set(name, path); changed = true;
      }
      if ((path.at(-1) === 'localStorage' || path.at(-1) === 'sessionStorage') && !storageAliases.has(name)) {
        storageAliases.add(name); changed = true;
      }
      if (path.at(-1) === 'evaluate' && !evaluateAliases.has(name)) {
        evaluateAliases.add(name); changed = true;
      }
      if (ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression)
        && node.initializer.expression.name.text === 'bind'
        && accessParts(node.initializer.expression.expression, aliases, stringBindings).at(-1) === 'evaluate'
        && !evaluateAliases.has(name)) {
        evaluateAliases.add(name); changed = true;
      }
    });
  }
  return { aliases, stringBindings, valueBindings, storageAliases, evaluateAliases };
}

function lexicalScope(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isBlock(current) || ts.isSourceFile(current) || ts.isFunctionLike(current)) return current;
  }
  return null;
}

function lexicalInitializer(file, use) {
  if (!ts.isIdentifier(use)) return null;
  const candidates = [];
  walk(file, (node) => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || node.name.text !== use.text || !node.initializer) return;
    const scope = lexicalScope(node);
    if (scope && scope.pos <= use.pos && scope.end >= use.end && node.end <= use.pos) candidates.push({ node, scope });
  });
  candidates.sort((left, right) => (right.scope.pos - left.scope.pos) || (right.node.pos - left.node.pos));
  return candidates[0]?.node.initializer ?? null;
}

function lexicalStringValue(file, use) {
  const initializer = lexicalInitializer(file, use);
  return initializer && (ts.isStringLiteralLike(initializer) || ts.isNoSubstitutionTemplateLiteral(initializer)) ? initializer.text : null;
}

function collectTestTitles(file) {
  const titles = [];
  walk(file, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'test') return;
    const title = node.arguments[0];
    if (title && ts.isStringLiteralLike(title)) titles.push(title.text);
  });
  return titles;
}

function assertEvidenceTags(file) {
  const titles = collectTestTitles(file);
  if (new Set(titles).size !== titles.length) throw new Error('w4-m3 source contract: duplicate test titles make evidence tags ambiguous.');
  for (const tag of REQUIRED_W4_M3_TAGS) {
    const exactTag = new RegExp(`(^|\\s)${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`);
    const matches = titles.filter((title) => exactTag.test(title));
    if (matches.length === 0) throw new Error(`w4-m3 source contract: ${tag} must appear in a real test title.`);
    if (matches.length > 1) throw new Error(`w4-m3 source contract: duplicate ${tag} evidence tags are forbidden.`);
  }
}

function assertW4M2Prerequisite(file) {
  const helpers = [];
  walk(file, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'formalW4M2Prerequisite') helpers.push(node);
  });
  if (helpers.length !== 1) throw new Error('w4-m3 source contract: exactly one W4-M2 formal prerequisite helper is required.');
  const helper = helpers[0];
  const helperText = helper.getText(file);
  if (!helperText.includes('w4-m2') || !helperText.includes('formal-v3') || helperText.includes('w4-m3')) {
    throw new Error('w4-m3 source contract: prerequisite helper must seed only formal W4-M2 evidence.');
  }
  const hash = createHash('sha256').update(helperText).digest('hex');
  if (hash !== APPROVED_W4_M2_PREREQUISITE_SHA256) {
    throw new Error('w4-m3 source contract: W4-M2 prerequisite must equal the independently approved canonical SHA-256.');
  }
  const calls = new Set();
  const literals = new Set();
  let handBuiltPublication = false;
  walk(helper, (node) => {
    if (ts.isCallExpression(node)) {
      const name = ts.isIdentifier(node.expression)
        ? node.expression.text
        : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : null;
      if (name) calls.add(name);
    }
    if (ts.isStringLiteralLike(node)) literals.add(node.text);
    if (ts.isBinaryExpression(node)
      && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
      && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const path = accessParts(node.left);
      if (path.includes('missionCompletionEvidence') || path.includes('works')) handBuiltPublication = true;
    }
  });
  const requiredCalls = [
    'createInitialProgress', 'completeMission', 'createMissionSession', 'updateWorkspaceDraft', 'recordRun',
    'createDefaultManorHelpDraft', 'compileManorHelpDraft', 'runManorHelp',
    'compileCuilanBooleanDraft', 'runCuilanBooleanForDraft',
    'createDefaultYunzhanDialogueDraft', 'compileYunzhanDialogueDraft', 'runYunzhanDialogueForDraft',
    'createDefaultBajieJoiningDraft', 'compileBajieJoiningDraft', 'runBajieJoiningForDraft',
    'createSolvedWeekThreeBossDraftForTest', 'compileWeekThreeBossDraft', 'runWeekThreeBossDraft',
    'createWeekFourMappingSession', 'updateWeekFourMappingCode', 'compileWeekFourMappingDraft',
    'parseWeekFourMappingPython', 'compareWeekFourMappingTraces', 'recordWeekFourMappingRun',
    'createWeekFourVariableSession', 'updateWeekFourVariableCode', 'parseWeekFourVariablePython',
    'recordWeekFourVariableRun', 'serializeProgress', 'parseProgress',
  ];
  const requiredMissionIds = ['w3-m1', 'w3-m2', 'w3-m3', 'w3-m4', 'w3-m5', 'w4-m1', 'w4-m2'];
  if (handBuiltPublication || requiredCalls.some((name) => !calls.has(name))
    || requiredMissionIds.some((id) => !literals.has(id))
    || !helperText.includes("checked.missionCompletionEvidence['w4-m2']")
    || !helperText.includes("checked.works['w4-m2-variable-evidence-record']")) {
    throw new Error('w4-m3 source contract: prerequisite must use the complete canonical W3, W4-M1 mapping, W4-M2 variable, work, proof, and parseProgress chain without hand-built publication.');
  }
}

function assertSeedPrerequisite(file) {
  const helpers = functionDeclarations(file, 'seedPrerequisite');
  if (helpers.length !== 1) throw new Error('w4-m3 source contract: exactly one seedPrerequisite helper is required.');
  const helper = helpers[0];
  if (helper.parameters.length !== 1 || !ts.isIdentifier(helper.parameters[0].name)
    || helper.parameters[0].name.text !== 'page') {
    throw new Error('w4-m3 source contract: seedPrerequisite signature must accept only page.');
  }
  const rawDeclarations = [];
  const addInitCalls = [];
  walk(helper, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'raw') rawDeclarations.push(node);
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'page'
      && node.expression.name.text === 'addInitScript') addInitCalls.push(node);
  });
  if (rawDeclarations.length !== 1 || addInitCalls.length !== 1) {
    throw new Error('w4-m3 source contract: seedPrerequisite requires one canonical raw binding and one addInitScript call.');
  }
  const raw = rawDeclarations[0];
  const initializer = raw.initializer;
  if (!initializer || !ts.isCallExpression(initializer)
    || !ts.isPropertyAccessExpression(initializer.expression)
    || !ts.isIdentifier(initializer.expression.expression) || initializer.expression.expression.text !== 'JSON'
    || initializer.expression.name.text !== 'stringify' || initializer.arguments.length !== 1
    || !ts.isCallExpression(initializer.arguments[0])
    || !ts.isIdentifier(initializer.arguments[0].expression)
    || initializer.arguments[0].expression.text !== 'formalW4M2Prerequisite'
    || initializer.arguments[0].arguments.length !== 0) {
    throw new Error('w4-m3 source contract: seedPrerequisite raw must be initialized only by JSON.stringify(formalW4M2Prerequisite()).');
  }
  const addInit = addInitCalls[0];
  if (addInit.arguments.length !== 2 || !ts.isIdentifier(addInit.arguments[1]) || addInit.arguments[1].text !== 'raw') {
    throw new Error('w4-m3 source contract: addInitScript second argument must be the canonical raw binding.');
  }
  const callback = addInit.arguments[0];
  if (!(ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))
    || callback.parameters.length !== 1 || !ts.isIdentifier(callback.parameters[0].name)
    || callback.parameters[0].name.text !== 'raw') {
    throw new Error('w4-m3 source contract: addInitScript callback must accept only the canonical raw binding.');
  }
  const setters = [];
  const getters = [];
  walk(callback, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)
      || node.expression.name.text !== 'call' || !ts.isPropertyAccessExpression(node.expression.expression)) return;
    const target = node.expression.expression;
    const owner = accessParts(target.expression).join('.');
    if (owner !== 'Storage.prototype') return;
    if (target.name.text === 'setItem') setters.push(node);
    if (target.name.text === 'getItem') getters.push(node);
  });
  const storageTarget = (call) => accessParts(call.arguments[0]).join('.') === 'globalThis.localStorage';
  const key = (call) => call.arguments[1] && ts.isStringLiteralLike(call.arguments[1]) ? call.arguments[1].text : null;
  const currentSetter = setters.find((call) => key(call) === 'xiyou-programming-progress-v3');
  const revisionSetter = setters.find((call) => key(call) === 'xiyou-programming-progress-revision-v3');
  const parsedRaw = currentSetter?.arguments[2];
  const currentValueIsRaw = parsedRaw && ts.isCallExpression(parsedRaw)
    && ts.isPropertyAccessExpression(parsedRaw.expression)
    && ts.isIdentifier(parsedRaw.expression.expression) && parsedRaw.expression.expression.text === 'JSON'
    && parsedRaw.expression.name.text === 'parse' && parsedRaw.arguments.length === 1
    && ts.isIdentifier(parsedRaw.arguments[0]) && parsedRaw.arguments[0].text === 'raw';
  if (setters.length !== 2 || getters.length !== 1 || !currentSetter || !revisionSetter
    || !setters.every(storageTarget) || !getters.every(storageTarget)
    || key(getters[0]) !== 'xiyou-programming-progress-v3'
    || !currentValueIsRaw
    || !revisionSetter.arguments[2] || !ts.isStringLiteralLike(revisionSetter.arguments[2])
    || revisionSetter.arguments[2].text !== '0'
    || callback.getText(file).includes('w4-m3')) {
    throw new Error('w4-m3 source contract: seed callback must write only the exact progress and revision keys from canonical raw, with no W4-M3 evidence.');
  }
  const callsites = [];
  walk(file, (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'seedPrerequisite') callsites.push(node);
  });
  if (callsites.length === 0 || callsites.some((call) => call.arguments.length !== 1
    || !ts.isIdentifier(call.arguments[0]) || call.arguments[0].text !== 'page')) {
    throw new Error('w4-m3 source contract: every seedPrerequisite caller must pass only page.');
  }
}

function functionDeclarations(file, name) {
  const values = [];
  walk(file, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) values.push(node);
  });
  return values;
}

function callbackOf(call) {
  const callback = call.arguments.at(-1);
  return callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) ? callback : null;
}

function isTestHook(node, hook) {
  return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
    && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === 'test'
    && node.expression.name.text === hook;
}

function isInside(node, container) {
  return node.pos >= container.pos && node.end <= container.end;
}

function isStaticallyUnreachable(node) {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isIfStatement(parent) && parent.expression.kind === ts.SyntaxKind.FalseKeyword && isInside(node, parent.thenStatement)) return true;
  }
  return false;
}

function hasDirectHealthPush(callback) {
  let found = false;
  walk(callback, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'push') return;
    const receiver = accessParts(node.expression.expression);
    if (!isStaticallyUnreachable(node) && receiver.join('.') === 'healthEvents.get') found = true;
  });
  return found;
}

function taggedTestCallbacks(file) {
  const callbacks = [];
  walk(file, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'test') return;
    const title = node.arguments[0];
    const callback = callbackOf(node);
    if (title && ts.isStringLiteralLike(title) && callback && W4_M3_TAGS.some((tag) => title.text.includes(tag))) callbacks.push(callback);
  });
  return callbacks;
}

function hasReachableNamedCall(callback, name, secondArgument) {
  let found = false;
  walk(callback, (node) => {
    if (!ts.isCallExpression(node) || isStaticallyUnreachable(node)) return;
    const callName = ts.isIdentifier(node.expression) ? node.expression.text : accessParts(node.expression).join('.');
    if (callName !== name) return;
    if (!secondArgument || (ts.isIdentifier(node.arguments[1]) && node.arguments[1].text === secondArgument)) found = true;
  });
  return found;
}

function assertHealthAndFaultEvidence(file) {
  const attach = functionDeclarations(file, 'attachHealth');
  const faultSetup = functionDeclarations(file, 'setW4M3Fault');
  let immutableBinding = false;
  let consoleListenerWrites = 0;
  let beforeEachUsesHealth = false;
  let immutableAfterEach = false;
  const faultUses = new Set();
  walk(file, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'healthEvents'
      && ts.isVariableDeclarationList(node.parent) && (node.parent.flags & ts.NodeFlags.Const)) immutableBinding = true;
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const receiver = accessParts(node.expression.expression);
      if (['clear', 'delete', 'splice', 'filter', 'map'].includes(node.expression.name.text) && receiver.includes('healthEvents')) {
        throw new Error('w4-m3 source contract: browser health collection must remain immutable after collection.');
      }
    }
    if (isTestHook(node, 'beforeEach')) {
      const callback = callbackOf(node);
      if (callback?.getText(file).includes('attachHealth(')) beforeEachUsesHealth = true;
    }
    if (isTestHook(node, 'afterEach')) {
      const callback = callbackOf(node);
      if (callback) {
        walk(callback, (candidate) => {
          if (!ts.isCallExpression(candidate) || !ts.isPropertyAccessExpression(candidate.expression) || candidate.expression.name.text !== 'toEqual') return;
          const expectCall = candidate.expression.expression;
          const empty = candidate.arguments[0];
          if (ts.isCallExpression(expectCall) && ts.isIdentifier(expectCall.expression) && expectCall.expression.text === 'expect'
            && accessParts(expectCall.arguments[0]).join('.') === 'healthEvents.get'
            && ts.isArrayLiteralExpression(empty) && empty.elements.length === 0) immutableAfterEach = true;
        });
      }
    }
  });
  const faultText = faultSetup.length === 1 ? faultSetup[0].getText(file) : '';
  if (attach.length === 1) {
    walk(attach[0], (node) => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'on') return;
      const event = node.arguments[0];
      const callback = node.arguments[1];
      if (ts.isStringLiteralLike(event) && event.text === 'console' && callback
        && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback)) && hasDirectHealthPush(callback)) consoleListenerWrites += 1;
    });
  }
  if (!immutableBinding || !beforeEachUsesHealth || consoleListenerWrites === 0 || !immutableAfterEach || !faultText.includes('page.route')) {
    throw new Error('w4-m3 source contract: health collection must attach real browser listeners, preserve raw events, and assert the same immutable collection.');
  }
  const visibleTags = new Set(['full', 'mouse', 'touch', 'keyboard', 'accessibility', 'narrow', 'parent', 'work']);
  const faultTags = new Map([
    ['corrupt', 'fail-w4-m3-corrupt-current'],
    ['asset-fault', 'fail-w4-m3-assets'], ['lazy', 'fail-w4-m3-lazy'],
  ]);
  const entries = [];
  walk(file, (node) => {
    if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'test') return;
    const title = node.arguments[0]; const callback = callbackOf(node);
    if (title && ts.isStringLiteralLike(title) && callback) entries.push({ title: title.text, callback });
  });
  const hasReachableLocator = (callback) => {
    let locator = false; let assertion = false;
    walk(callback, (node) => {
      if (isStaticallyUnreachable(node) || !ts.isCallExpression(node)) return;
      const name = ts.isIdentifier(node.expression) ? node.expression.text : accessParts(node.expression).join('.');
      if (['page.getByRole', 'page.getByLabel', 'page.getByTestId'].includes(name)) locator = true;
      if (name === 'expect') assertion = true;
    });
    return locator && assertion;
  };
  const hasFaultCall = (callback, name, mode) => {
    let found = false;
    walk(callback, (node) => {
      if (!ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== name || isStaticallyUnreachable(node)) return;
      if (ts.isStringLiteralLike(node.arguments[1]) && node.arguments[1].text === mode) found = true;
    });
    return found;
  };
  for (const { title, callback } of entries) {
    const tag = [...W4_M3_TAGS].find((value) => title.includes(value));
    if (!tag) continue;
    const kind = tag.slice('@w4-m3-'.length);
    if (visibleTags.has(kind)) {
      const text = callback.getText(file);
      const fullChain = text.includes("getByLabel('W4-M3 Python 代码')") && /\.(?:fill|type|press)\(/.test(text)
        && text.includes("getByRole('button', { name: '运行分支' }).click()") && text.includes("getByRole('status', { name: '分支运行结果' })");
      const specific = kind === 'keyboard' ? /keyboard\.(?:type|press)|getByLabel\([^)]*\)\.press/.test(text)
        : kind === 'mouse' ? text.includes("getByRole('button', { name: '使用 else:' }).click()")
            && text.includes("getByRole('button', { name: '缩进 4 空格' }).click()")
          : kind === 'touch' ? text.includes('touchscreen.tap')
            : kind === 'accessibility' ? text.includes('focus()') && text.includes('aria-live')
              : kind === 'parent' ? text.includes('家长周报') && text.includes('第四周分支结构学习摘要')
                : kind === 'work' ? text.includes("getByRole('dialog', { name: '闯关成功' })")
                    && text.includes("works['w4-m3-branch-structure-record']")
                  : kind === 'narrow' ? /scrollWidth|clientWidth|boundingBox/.test(text) : true;
      if (!hasReachableNamedCall(callback, 'page.goto') || !fullChain || !specific
        || hasReachableNamedCall(callback, 'setW4M3Fault') || hasReachableNamedCall(callback, 'clearW4M3Fault')) {
        throw new Error(`w4-m3 source contract: ${tag} full requires its concrete child-input and result chain without a synthetic fault.`);
      }
      continue;
    }
    if (faultTags.has(kind)) {
      const mode = faultTags.get(kind);
      const sameDocumentRecovery = kind !== 'lazy'
        || (callback.getText(file).includes("locator('html').evaluate")
          && callback.getText(file).includes('w4m3DocumentMarker'));
      if (!hasReachableNamedCall(callback, 'page.goto') || !hasReachableLocator(callback)
        || !hasFaultCall(callback, 'setW4M3Fault', mode) || !hasFaultCall(callback, 'clearW4M3Fault', mode)
        || !hasReachableNamedCall(callback, 'page.getByRole') || !sameDocumentRecovery) {
        throw new Error(`w4-m3 source contract: ${tag} requires exact fault setup, visible failure, clear, and retry recovery.`);
      }
      continue;
    }
    if (kind === 'runtime-fault') {
      const exactRuntimeModes = ['fail-w4-m3-runtime-load', 'fail-w4-m3-runtime-timeout'];
      if (!hasReachableNamedCall(callback, 'page.goto') || !hasReachableLocator(callback)
        || exactRuntimeModes.some((mode) => !hasFaultCall(callback, 'setW4M3Fault', mode)
          || !hasFaultCall(callback, 'clearW4M3Fault', mode))) {
        throw new Error('w4-m3 source contract: runtime fault evidence requires exact load and timeout fault setup, visible failure, clear, and retry recovery.');
      }
      continue;
    }
    if (kind === 'storage') {
      const storageModes = ['draft', 'run', 'observation', 'work', 'completion'].map((stage) => `fail-w4-m3-${stage}`);
      const text = callback.getText(file);
      const evidenceMarkers = ['sessions[\'w4-m3\']', 'totalRuns', 'conditionObservationUses', "works['w4-m3-branch-structure-record']", "missionCompletionEvidence['w4-m3']"];
      if (storageModes.some((mode) => !text.includes(`'${mode}'`))
        || ['draft', 'run', 'observation'].some((stage) => !hasFaultCall(callback, 'setW4M3Fault', `fail-w4-m3-${stage}`)
          || !hasFaultCall(callback, 'clearW4M3Fault', `fail-w4-m3-${stage}`))
        || !text.includes('setW4M3Fault') || !text.includes('clearW4M3Fault')
        || evidenceMarkers.some((marker) => !text.includes(marker))) {
        throw new Error('w4-m3 source contract: storage evidence must exercise all five exact draft/run/observation/work/completion fail-and-retry modes.');
      }
      continue;
    }
    if (kind === 'external') {
      const text = callback.getText(file);
      const setAt = text.indexOf("setW4M3Fault(page, 'fail-w4-m3-cas-stale-writer')");
      const conflictAt = text.indexOf('其他标签页已有新的学习进度');
      const consumeAt = text.indexOf("toBe('fail-w4-m3-cas-stale-writer')");
      const clearAt = text.indexOf("clearW4M3Fault(page, 'fail-w4-m3-cas-stale-writer')");
      if (setAt < 0 || conflictAt < setAt || consumeAt < conflictAt || clearAt < consumeAt) {
        throw new Error('w4-m3 source contract: external CAS fault must stay active and be consumed through the real conflict before clear.');
      }
      continue;
    }
    const text = callback.getText(file);
    if (kind === 'cold' && (!text.includes("page.on('response'") || !text.includes('getEntriesByType') || !text.includes('expect('))) {
      throw new Error('w4-m3 source contract: @w4-m3-cold requires response/resource collection and assertions.');
    }
    if (kind === 'python-security' && (!text.includes('new Worker') || !text.includes('postMessage') || !text.includes('expect('))) {
      throw new Error('w4-m3 source contract: @w4-m3-python-security requires a real Worker probe and assertion.');
    }
  }
  const forbiddenFaultIds = new Set(['fail-w4-m3-runtime', 'corrupt-w4-m3-current', 'fail-w4-m3-storage', 'fail-w4-m3-external']);
  walk(file, (node) => {
    if (ts.isStringLiteralLike(node) && forbiddenFaultIds.has(node.text)) {
      throw new Error(`w4-m3 source contract: non-exact fault id ${node.text} is forbidden.`);
    }
  });
  const requiredTimeoutMarkers = [
    'route.fetch()', 'response.text()', 'actualBody', "message.type === 'result'", 'setTimeout',
    'resultDelayMs = 1_100', 'pyodide-314.0.2', 'validate_and_run', 'route.fulfill',
  ];
  if (requiredTimeoutMarkers.some((marker) => !faultText.includes(marker))
    || /self\.postMessage\s*\(\s*\{\s*type\s*:\s*['"]ready['"]/.test(faultText)
    || /self\.onmessage\s*=\s*\(\)\s*=>\s*\{\}/.test(faultText)) {
    throw new Error('w4-m3 source contract: runtime timeout must fetch and inspect the real built Worker then prepend only a result-message delay; synthetic ready/result/onmessage workers are forbidden.');
  }
  const clearText = functionDeclarations(file, 'clearW4M3Fault')[0]?.getText(file) ?? '';
  if (clearText.indexOf('expectedFailures.set(page, new Set())') < clearText.indexOf('page.unroute')) {
    throw new Error('w4-m3 source contract: clearW4M3Fault must unroute before clearing expected browser-health failures.');
  }
}

function assertNoShortcuts(file) {
  const { aliases, stringBindings, valueBindings, storageAliases, evaluateAliases } = buildBindings(file);
  const isW4M3Key = (key) => key === 'w4-m3' || key === 'w4-m3-branch-structure-record' || key === '*';
  const progressContainers = ['missions', 'sessions', 'missionCompletionEvidence', 'works'];
  const progressTarget = (path, container) => {
    const index = path.indexOf(container);
    return index >= 0 && isW4M3Key(path[index + 1]);
  };
  const progressContainer = (path, container) => path.includes(container);
  const keyAtUse = (node) => {
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isIdentifier(node)) return lexicalStringValue(file, node) ?? stringBindings.get(node.text) ?? '*';
    return staticKey(node, stringBindings);
  };
  const accessAtUse = (node, seen = new Set()) => {
    if (ts.isIdentifier(node)) {
      if (!seen.has(node)) {
        seen.add(node);
        const initializer = lexicalInitializer(file, node);
        if (initializer && initializer !== node) return accessAtUse(initializer, seen);
      }
      return aliases.get(node.text) ?? [node.text];
    }
    if (ts.isPropertyAccessExpression(node)) return [...accessAtUse(node.expression), node.name.text];
    if (ts.isElementAccessExpression(node) && node.argumentExpression) return [...accessAtUse(node.expression), keyAtUse(node.argumentExpression)];
    if (ts.isCallExpression(node)) return accessAtUse(node.expression);
    return [];
  };
  const storageSetterAliases = new Set();
  const boundStorageSetterAliases = new Set();
  const definePropertyAliases = new Set();
  const definePropertiesAliases = new Set();
  const reflectSetAliases = new Set();
  const isStorageSetter = (node) => {
    if (ts.isIdentifier(node) && storageSetterAliases.has(node.text)) return true;
    return accessAtUse(node).join('.') === 'Storage.prototype.setItem';
  };
  let setterBindingsChanged = true;
  while (setterBindingsChanged) {
    setterBindingsChanged = false;
    walk(file, (node) => {
      if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer) return;
      const name = node.name.text;
      if (isStorageSetter(node.initializer) && !storageSetterAliases.has(name)) {
        storageSetterAliases.add(name); setterBindingsChanged = true;
      }
      if (ts.isCallExpression(node.initializer) && ts.isPropertyAccessExpression(node.initializer.expression)
        && node.initializer.expression.name.text === 'bind'
        && isStorageSetter(node.initializer.expression.expression)
        && !boundStorageSetterAliases.has(name)) {
        boundStorageSetterAliases.add(name); setterBindingsChanged = true;
      }
      if (ts.isIdentifier(node.initializer) && boundStorageSetterAliases.has(node.initializer.text)
        && !boundStorageSetterAliases.has(name)) {
        boundStorageSetterAliases.add(name); setterBindingsChanged = true;
      }
      const initializerPath = accessAtUse(node.initializer).join('.');
      if (initializerPath === 'Object.defineProperty') definePropertyAliases.add(name);
      if (initializerPath === 'Object.defineProperties') definePropertiesAliases.add(name);
      if (initializerPath === 'Reflect.set') reflectSetAliases.add(name);
    });
  }
  const enclosingFunctionName = (node) => {
    for (let current = node.parent; current; current = current.parent) {
      if (ts.isFunctionDeclaration(current)) return current.name?.text ?? null;
    }
    return null;
  };
  const approvedPrototypeStorageCall = (node) => {
    const owner = enclosingFunctionName(node);
    if (!ts.isPropertyAccessExpression(node.expression) || node.expression.name.text !== 'call') return false;
    const key = node.arguments[1]; const value = node.arguments[2];
    if (owner === 'seedPrerequisite') return true;
    return owner === 'setStorageFaultMode'
      && ts.isIdentifier(key) && key.text === 'key'
      && ts.isIdentifier(value) && value.text === 'value';
  };
  const objectPayloadForged = (node) => ts.isObjectLiteralExpression(node) && node.properties.some((property) => {
    if (ts.isSpreadAssignment(property) || ts.isShorthandPropertyAssignment(property)) return true;
    if (!ts.isPropertyAssignment(property)) return true;
    const key = ts.isComputedPropertyName(property.name) ? '*' : propertyName(property.name) ?? '*';
    return isW4M3Key(stringBindings.get(key) ?? key);
  });
  const containsForgedPayload = (node, seen = new Set()) => {
    if (!node) return false;
    if (ts.isIdentifier(node)) {
      if (seen.has(node.text)) return false;
      seen.add(node.text);
      return containsForgedPayload(valueBindings.get(node.text), seen);
    }
    if (ts.isStringLiteralLike(node)) return ['w4-m3', 'w4-m3-branch-structure-record', ...progressContainers, 'branch-proven'].includes(node.text);
    if (ts.isObjectLiteralExpression(node)) return node.properties.some((property) => {
      if (ts.isSpreadAssignment(property) || ts.isShorthandPropertyAssignment(property)) return true;
      if (!ts.isPropertyAssignment(property)) return true;
      const key = ts.isComputedPropertyName(property.name)
        ? staticKey(property.name.expression, stringBindings)
        : propertyName(property.name) ?? '*';
      return ['w4-m3', 'w4-m3-branch-structure-record', ...progressContainers, 'branch-proven', '*'].includes(key)
        || containsForgedPayload(property.initializer, seen);
    });
    if (ts.isComputedPropertyName(node)) return staticKey(node.expression, stringBindings) === '*'
      || containsForgedPayload(node.expression, seen);
    if (ts.isCallExpression(node)) return node.arguments.some((argument) => containsForgedPayload(argument, seen));
    let forged = false;
    ts.forEachChild(node, (candidate) => { if (containsForgedPayload(candidate, seen)) forged = true; });
    return forged;
  };
  const containsBranchProof = (node) => {
    if (ts.isStringLiteralLike(node)) return node.text === 'branch-proven';
    if (ts.isIdentifier(node)) return stringBindings.get(node.text) === 'branch-proven';
    let found = false;
    walk(node, (candidate) => {
      if (candidate === node) return;
      if (ts.isStringLiteralLike(candidate) && candidate.text === 'branch-proven') found = true;
      if (ts.isIdentifier(candidate) && stringBindings.get(candidate.text) === 'branch-proven') found = true;
    });
    return found;
  };
  walk(file, (node) => {
    if ((ts.isIdentifier(node) || ts.isStringLiteralLike(node)) && ['expectedSequence', 'expectedOutput'].includes(node.text)) {
      throw new Error('w4-m3 source contract: legacy answer shortcuts are forbidden.');
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const parts = accessAtUse(node.left);
      const forgedContainer = progressContainers.find((container) => progressTarget(parts, container));
      if (forgedContainer) throw new Error(`w4-m3 source contract: direct or aliased W4-M3 ${forgedContainer} progress injection is forbidden.`);
    }
    if (!ts.isCallExpression(node)) return;
    if (ts.isIdentifier(node.expression)
      && (definePropertyAliases.has(node.expression.text) || definePropertiesAliases.has(node.expression.text) || reflectSetAliases.has(node.expression.text))) {
      const target = accessAtUse(node.arguments[0]);
      if (progressContainers.some((container) => progressContainer(target, container))) {
        throw new Error('w4-m3 source contract: aliased property definition cannot forge W4-M3 mission, session, evidence, or work progress.');
      }
    }
    if (ts.isIdentifier(node.expression) && boundStorageSetterAliases.has(node.expression.text)) {
      throw new Error('w4-m3 source contract: bound Storage.prototype.setItem browser progress injection is forbidden.');
    }
    if (ts.isIdentifier(node.expression) && evaluateAliases.has(node.expression.text)
      && node.arguments.some((argument) => containsBranchProof(argument))) {
      throw new Error('w4-m3 source contract: indirect browser proof injection is forbidden.');
    }
    if (!ts.isPropertyAccessExpression(node.expression) && !ts.isElementAccessExpression(node.expression)) return;
    const receiver = node.expression.expression;
    const receiverPath = accessAtUse(receiver);
    const method = ts.isPropertyAccessExpression(node.expression)
      ? node.expression.name.text
      : node.expression.argumentExpression ? keyAtUse(node.expression.argumentExpression) : '*';
    if (['call', 'apply', 'bind'].includes(method) && isStorageSetter(receiver)
      && !approvedPrototypeStorageCall(node)) {
      throw new Error('w4-m3 source contract: Storage.prototype.setItem call/apply/bind browser progress injection is forbidden.');
    }
    const browserStorage = storageAliases.has(receiverPath.at(-1)) || ['localStorage', 'sessionStorage'].includes(receiverPath.at(-1));
    if (method === 'setItem' && node.arguments[0]) {
      const storageKey = keyAtUse(node.arguments[0]);
      const payload = node.arguments[1];
      const forgedPayload = containsForgedPayload(payload);
      if (!browserStorage && !forgedPayload && !storageKey.includes('xiyou-programming-progress')) return;
      throw new Error('w4-m3 source contract: direct or aliased W4-M3 browser storage writes are forbidden.');
    }
    if (method === 'assign' && ts.isIdentifier(receiver) && receiver.text === 'Object'
      && progressContainers.some((container) => progressContainer(accessAtUse(node.arguments[0]), container))
      && node.arguments.slice(1).some(objectPayloadForged)) {
      throw new Error('w4-m3 source contract: Object.assign cannot forge W4-M3 mission, session, evidence, or work progress containers.');
    }
    if (['defineProperty', 'defineProperties'].includes(method) && ts.isIdentifier(receiver) && receiver.text === 'Object'
      && progressContainers.some((container) => progressContainer(accessAtUse(node.arguments[0]), container))) {
      throw new Error('w4-m3 source contract: Object property definition cannot forge W4-M3 mission, session, evidence, or work progress.');
    }
    if (method === 'set' && ts.isIdentifier(receiver) && receiver.text === 'Reflect'
      && progressContainers.some((container) => progressContainer(accessAtUse(node.arguments[0]), container))
      && isW4M3Key(keyAtUse(node.arguments[1]))) {
      throw new Error('w4-m3 source contract: Reflect.set cannot forge W4-M3 mission, session, evidence, or work progress containers.');
    }
    if (method === 'evaluate' && node.arguments.some((argument) => containsBranchProof(argument))) {
      throw new Error('w4-m3 source contract: browser proof injection is forbidden.');
    }
  });
}

function projectGrep(project) {
  const grep = project.properties.find((property) => ts.isPropertyAssignment(property) && propertyName(property.name) === 'grep');
  return grep ? grep.initializer.getText() : '';
}

function extractW4M3TagSet(grep) {
  const tags = new Set();
  const prefix = '@w4-m3-';
  let cursor = 0;
  while (cursor < grep.length) {
    const start = grep.indexOf(prefix, cursor);
    if (start < 0) break;
    let index = start + prefix.length;
    if (grep.startsWith('(?:', index)) {
      const end = grep.indexOf(')', index + 3);
      if (end < 0) return null;
      for (const tag of grep.slice(index + 3, end).split('|')) if (tag) tags.add(tag);
      cursor = end + 1;
      continue;
    }
    const tagStart = index;
    while (index < grep.length && /[a-z0-9-]/i.test(grep[index])) index += 1;
    if (index > tagStart) tags.add(grep.slice(tagStart, index));
    cursor = index + 1;
  }
  return tags.size > 0 ? tags : null;
}

function assertFiveProjectCollection(config = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8')) {
  const file = ts.createSourceFile('playwright.config.ts', config, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const projects = new Map();
  walk(file, (node) => {
    if (!ts.isObjectLiteralExpression(node)) return;
    const name = node.properties.find((property) => ts.isPropertyAssignment(property) && propertyName(property.name) === 'name');
    if (!name || !ts.isPropertyAssignment(name) || !ts.isStringLiteralLike(name.initializer)) return;
    projects.set(name.initializer.text, projectGrep(node));
  });
  const expected = [
    ['desktop-chromium-1440x1024', ['full', 'keyboard', 'mouse', 'touch', 'accessibility', 'storage', 'corrupt', 'parent', 'work', 'python-security', 'cold', 'runtime-fault', 'asset-fault', 'narrow', 'external', 'lazy']],
    ['tablet-webkit-768x1024', ['full', 'cold', 'asset-fault', 'runtime-fault']],
    ['mobile-chromium-390x844', ['full', 'touch', 'cold']],
    ['desktop-firefox-1440x1024', ['full', 'keyboard', 'cold']],
    ['narrow-chromium-320x844', ['full', 'touch', 'narrow', 'cold']],
  ];
  for (const [project, tags] of expected) {
    const actual = extractW4M3TagSet(projects.get(project) ?? '');
    if (!actual || actual.size !== tags.length || tags.some((tag) => !actual.has(tag))) {
      throw new Error(`w4-m3 source contract: ${project} must collect the exact W4-M3 tags ${tags.join(', ')}.`);
    }
  }
}

export function assertWeekFourBranchE2ESourceContract(source, { playwrightConfig } = {}) {
  if (typeof source !== 'string') throw new Error('w4-m3 source contract: source must be text.');
  const file = ts.createSourceFile('w4m3.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length) throw new Error('w4-m3 source contract: E2E source must parse.');
  assertEvidenceTags(file);
  assertW4M2Prerequisite(file);
  assertSeedPrerequisite(file);
  assertHealthAndFaultEvidence(file);
  assertNoShortcuts(file);
  assertFiveProjectCollection(playwrightConfig);
}
