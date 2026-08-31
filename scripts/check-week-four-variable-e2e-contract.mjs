import ts from 'typescript';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const W4_M2_TAGS = Object.freeze([
  '@w4-m2-full', '@w4-m2-keyboard', '@w4-m2-mouse', '@w4-m2-touch',
  '@w4-m2-accessibility', '@w4-m2-storage', '@w4-m2-corrupt', '@w4-m2-parent', '@w4-m2-clear',
  '@w4-m2-work', '@w4-m2-python-security', '@w4-m2-cold', '@w4-m2-runtime-fault',
  '@w4-m2-asset-fault', '@w4-m2-narrow', '@w4-m2-external', '@w4-m2-lazy',
]);

const FORBIDDEN = /expectedSequence|expectedOutput|starterCode|LegacyMissionBuilder|MissionTools|healthEvents(?:\.get\([^)]*\))?\.(?:clear|delete|filter|splice|pop|shift)\s*\(|\btest\.skip\b|\.skip\s*\(/;
const DIRECT_W4_M2_WRITE = /(?:\bprogress\b|\bnext\b|\bstate\b)\s*\.\s*(?:missions|sessions|missionCompletionEvidence|works)\s*\[\s*['"](?:w4-m2|w4-m2-variable-evidence-record)['"]\s*\]\s*=/;
const DIRECT_W4_M2_STORAGE_WRITE = /(?:localStorage|sessionStorage)\.setItem\([^)]*['"](?:w4-m2|xiyou-programming-progress)[^)]*/;

function functionText(file, name) {
  let value = null;
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) value = node.getText(file);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return value;
}

function testTexts(file, tag) {
  const values = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'test') {
      const title = node.arguments[0];
      const callback = node.arguments.at(-1);
      if (title && ts.isStringLiteralLike(title) && title.text.includes(tag)
        && callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) values.push(node.getText(file));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return values;
}

function collectTestTitles(file) {
  const titles = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'test') {
      const title = node.arguments[0];
      if (title && ts.isStringLiteralLike(title)) titles.push(title.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return titles;
}

function assertRealEvidenceTags(file) {
  const titles = collectTestTitles(file);
  if (new Set(titles).size !== titles.length) throw new Error('w4-m2 source contract: duplicate test titles make evidence tags ambiguous.');
  for (const tag of W4_M2_TAGS) {
    const exactTag = new RegExp(`(^|\\s)${tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`);
    if (!titles.some((title) => exactTag.test(title))) throw new Error(`w4-m2 source contract: ${tag} must appear in a real test title, never only a comment.`);
  }
}

function assertNoDynamicCode(file) {
  const visit = (node) => {
    if ((ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'eval')
      || (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function')) {
      throw new Error('w4-m2 source contract: dynamic code execution is forbidden.');
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function staticPropertyKey(node, stringBindings) {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isIdentifier(node) && stringBindings.has(node.text)) return stringBindings.get(node.text);
  return '*';
}

function accessPath(node, aliases, stringBindings) {
  if (ts.isIdentifier(node)) return aliases.get(node.text) ?? [node.text];
  if (ts.isPropertyAccessExpression(node)) return [...accessPath(node.expression, aliases, stringBindings), node.name.text];
  if (ts.isElementAccessExpression(node) && node.argumentExpression) {
    return [...accessPath(node.expression, aliases, stringBindings), staticPropertyKey(node.argumentExpression, stringBindings)];
  }
  return [];
}

function isW4M2ProgressPath(path) {
  const containers = new Set(['missions', 'sessions', 'missionCompletionEvidence', 'works']);
  const containerIndex = path.findIndex((part) => containers.has(part));
  if (containerIndex < 0) return false;
  const key = path[containerIndex + 1];
  return key === 'w4-m2' || key === 'w4-m2-variable-evidence-record' || key === '*';
}

function isProgressContainerPath(path) {
  return path.some((part) => ['missions', 'sessions', 'missionCompletionEvidence', 'works'].includes(part));
}

function isStorageReference(node) {
  if (ts.isIdentifier(node)) return node.text === 'localStorage' || node.text === 'sessionStorage';
  if (ts.isPropertyAccessExpression(node)) return ts.isIdentifier(node.expression)
    && ['window', 'globalThis'].includes(node.expression.text)
    && ['localStorage', 'sessionStorage'].includes(node.name.text);
  return ts.isElementAccessExpression(node)
    && ts.isIdentifier(node.expression)
    && ['window', 'globalThis'].includes(node.expression.text)
    && node.argumentExpression && ts.isStringLiteralLike(node.argumentExpression)
    && ['localStorage', 'sessionStorage'].includes(node.argumentExpression.text);
}

function objectPayloadHasW4M2OrDynamicKey(node, stringBindings) {
  if (!ts.isObjectLiteralExpression(node)) return false;
  return node.properties.some((property) => {
    if (!ts.isPropertyAssignment(property) && !ts.isShorthandPropertyAssignment(property) && !ts.isSpreadAssignment(property)) return true;
    if (ts.isSpreadAssignment(property) || ts.isShorthandPropertyAssignment(property)) return true;
    if (ts.isComputedPropertyName(property.name)) return true;
    const key = ts.isIdentifier(property.name) ? property.name.text : ts.isStringLiteralLike(property.name) ? property.name.text : '*';
    return key === 'w4-m2' || key === 'w4-m2-variable-evidence-record' || stringBindings.get(key) === 'w4-m2' || stringBindings.get(key) === 'w4-m2-variable-evidence-record';
  });
}

function assertNoDirectW4M2Injection(file) {
  const aliases = new Map([['progress', ['progress']], ['next', ['next']], ['state', ['state']]]);
  const stringBindings = new Map();
  const storageAliases = new Set(['localStorage', 'sessionStorage']);
  let changed = true;
  while (changed) {
    changed = false;
    const visitBindings = (node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        if (ts.isStringLiteralLike(node.initializer) && !stringBindings.has(node.name.text)) {
          stringBindings.set(node.name.text, node.initializer.text); changed = true;
        }
        const path = accessPath(node.initializer, aliases, stringBindings);
        if ((path.length > 0 && ['progress', 'next', 'state'].includes(path[0])) && !aliases.has(node.name.text)) {
          aliases.set(node.name.text, path);
          changed = true;
        }
        if ((isStorageReference(node.initializer) || (ts.isIdentifier(node.initializer) && storageAliases.has(node.initializer.text))) && !storageAliases.has(node.name.text)) {
          storageAliases.add(node.name.text); changed = true;
        }
      }
      ts.forEachChild(node, visitBindings);
    };
    visitBindings(file);
  }
  const rejectPath = (node) => {
    if (isW4M2ProgressPath(accessPath(node, aliases, stringBindings))) throw new Error('w4-m2 source contract: direct W4-M2 progress injection is forbidden.');
  };
  const isAllowedStorageSeed = (node) => {
    let initScriptCall = null;
    let beforeEachCall = null;
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isFunctionDeclaration(parent) && parent.name?.text === 'setW4M2StorageFaultMode') return true;
      if (ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression)
        && parent.expression.name.text === 'addInitScript') initScriptCall = parent;
      if (ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression)
        && ts.isIdentifier(parent.expression.expression) && parent.expression.expression.text === 'test'
        && parent.expression.name.text === 'beforeEach') beforeEachCall = parent;
    }
    if (!initScriptCall || !beforeEachCall) return false;
    const source = initScriptCall.getText(file);
    const beforeEachSource = beforeEachCall.getText(file);
    const exactSeed = 'page.addInitScript(({current,revision,value:raw})=>{if(Storage.prototype.getItem.call(globalThis.localStorage,current)===null){Storage.prototype.setItem.call(globalThis.localStorage,current,raw);Storage.prototype.setItem.call(globalThis.localStorage,revision,"0",);}},{current:CURRENT_KEY,revision:REVISION_KEY,value},)';
    return source.replace(/\s+/g, '') === exactSeed
      && /const\s+value\s*=\s*formalW4M1Prerequisite\(\)\s*;/.test(beforeEachSource)
      && beforeEachSource.indexOf('const value = formalW4M1Prerequisite()') < beforeEachSource.indexOf('.addInitScript(');
  };
  const visit = (node) => {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment
      && node.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const targetPath = accessPath(node.left, aliases, stringBindings);
      rejectPath(node.left);
      if (isProgressContainerPath(targetPath) && objectPayloadHasW4M2OrDynamicKey(node.right, stringBindings)) {
        throw new Error('w4-m2 source contract: assignment cannot inject W4-M2 or dynamic records into a progress container.');
      }
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const receiver = node.expression.expression;
      const method = node.expression.name.text;
      if (method === 'assign' && ts.isIdentifier(receiver) && receiver.text === 'Object' && node.arguments[0]) {
        const targetPath = accessPath(node.arguments[0], aliases, stringBindings);
        rejectPath(node.arguments[0]);
        if (isProgressContainerPath(targetPath) && node.arguments.slice(1).some((argument) => objectPayloadHasW4M2OrDynamicKey(argument, stringBindings))) {
          throw new Error('w4-m2 source contract: Object.assign cannot inject W4-M2 or dynamic records into a progress container alias.');
        }
      }
      if (['setItem', 'removeItem', 'clear'].includes(method) && (isStorageReference(receiver) || (ts.isIdentifier(receiver) && storageAliases.has(receiver.text)))) {
        throw new Error('w4-m2 source contract: direct browser-storage writes are forbidden.');
      }
      if (method === 'call' && ts.isPropertyAccessExpression(receiver)
        && receiver.name.text === 'setItem'
        && ts.isPropertyAccessExpression(receiver.expression)
        && ts.isIdentifier(receiver.expression.expression)
        && receiver.expression.expression.text === 'Storage'
        && receiver.expression.name.text === 'prototype'
        && !isAllowedStorageSeed(node)) {
        throw new Error(`w4-m2 source contract: Storage.prototype.setItem.call cannot inject browser progress (${node.getText(file)}).`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function assertInlineEvaluateCallbacks(file) {
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'evaluate') {
      const callback = node.arguments[0];
      if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
        throw new Error('w4-m2 source contract: browser evaluate callbacks must be inline and reviewable.');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function assertSecurityProbe(file) {
  const [probe] = testTexts(file, '@w4-m2-python-security');
  if (/\binputs\.map\s*\(|\brejected\s*:\s*true\b/.test(probe ?? '')) throw new Error('w4-m2 source contract: security probe must not synthesize rejected results.');
  const requirements = [
    [/performance\s*\.\s*getEntriesByType\(\s*['"]resource['"]\s*\)/, 'discover the built Worker resource'],
    [/new\s+Worker\(\s*workerUrl\s*,\s*\{\s*type\s*:\s*['"]module['"]\s*\}\s*\)/, 'start the built module Worker'],
    [/event\.data\?\.type\s*===\s*['"]ready['"]/, 'wait for Worker ready'],
    [/for\s*\(\s*const\s*\{\s*label\s*,\s*code\s*\}\s*of\s*inputs\s*\)/, 'send each malicious input through a real Worker request'],
    [/let\s+nextRequestId\s*=\s*1\s*;/, 'initialize an incrementing request-id counter'],
    [/const\s+requestId\s*=\s*nextRequestId\+\+\s*;/, 'allocate an incrementing request id for every malicious input'],
    [/requestIds\.push\(requestId\)/, 'record every malicious request id'],
    [/expect\(new\s+Set\(probe\.requestIds\)\.size\)\.toBe\(probe\.results\.length\)|expect\(new\s+Set\(requestIds\)\.size\)\.toBe\(inputs\.length\)/, 'prove all malicious request ids are unique'],
    [/worker\.postMessage\(\s*\{[\s\S]*?type\s*:\s*['"]run['"][\s\S]*?requestId[\s\S]*?code/, 'bind every malicious run to a request id'],
    [/event\.data\?\.requestId\s*===\s*requestId|event\.data\.requestId\s*===\s*requestId/, 'bind Worker responses to their request id'],
    [/message\?\.type\s*===\s*['"]error['"]|message\.type\s*===\s*['"]error['"]|item\.type\s*===\s*['"]error['"]/, 'require Worker errors instead of synthetic rejection'],
    [/Promise\.race\(/, 'allow an actual timeout outcome for an infinite loop'],
    [/worker\.terminate\(\)/, 'terminate the probe Worker'],
    [/const\s+before\s*=\s*await\s+page\.evaluate[\s\S]*?const\s+after\s*=\s*await\s+page\.evaluate[\s\S]*?expect\(after\)\.toEqual\(before\)/, 'preserve current and revision bytes deeply'],
  ];
  const requiredCases = [
    'syntax error', 'import os', 'open(', 'from js import fetch', 'window.location',
    'identity.__class__', 'identity[0]', 'eval(', '__import__', 'unknown_name()', 'while True: pass',
  ];
  if (!probe || !requiredCases.every((value) => probe.includes(value))) {
    throw new Error('w4-m2 source contract: security probe must send syntax, import, file, browser-network, attribute, subscript, eval, dunder, unknown-call, and infinite-loop inputs.');
  }
  if (!probe || !requirements.every(([pattern]) => pattern.test(probe))) {
    throw new Error(`w4-m2 source contract: security probe must ${requirements.find(([pattern]) => !probe || !pattern.test(probe))?.[1] ?? 'be present'}.`);
  }
}

function assertColdProbe(file) {
  const [probe] = testTexts(file, '@w4-m2-cold');
  if (/const\s+(?:coldMs|warmMs)\s*=\s*\d/.test(probe ?? '')) throw new Error('w4-m2 source contract: cold and warm timings must not use fixed numeric values.');
  const requirements = [
    [/(?:page|context)\.on\(\s*['"]response['"]/, 'collect real Playwright Response events'],
    [/const\s+chromiumProject\s*=\s*testInfo\.project\.name\.includes\(\s*['"]chromium['"]\s*\)/, 'detect engines that support a Chromium CDP throttle'],
    [/chromiumProject\s*\?\s*await\s+context\.newCDPSession\(page\)\s*:\s*null/, 'create a CDP throttle only on compatible Chromium projects'],
    [/client\.send\(\s*['"]Network\.enable['"]\s*\)/, 'enable CDP network controls'],
    [/client\.send\(\s*['"]Network\.emulateNetworkConditions['"][\s\S]*?downloadThroughput\s*:\s*1_250_000/, 'apply the fixed 10 Mbps network throttle'],
    [/client\.send\(\s*['"]Emulation\.setCPUThrottlingRate['"][\s\S]*?rate\s*:\s*4/, 'apply the fixed 4x CPU throttle'],
    [/response\.body\(\)/, 'read every successful response body'],
    [/const\s+expectedRuntimeFiles\s*=\s*\[[\s\S]*?['"]pyodide\.mjs['"][\s\S]*?['"]pyodide\.asm\.mjs['"][\s\S]*?['"]pyodide\.asm\.wasm['"][\s\S]*?['"]python_stdlib\.zip['"][\s\S]*?['"]pyodide-lock\.json['"][\s\S]*?\]/, 'enumerate the fixed five-file runtime inventory'],
    [/responseUrl\.origin\s*===\s*runtimeRoot\.origin/, 'require same-origin runtime responses'],
    [/responseUrl\.pathname\.startsWith\(runtimeRoot\.pathname\)/, 'require only fixed runtime paths'],
    [/expect\(runtimeRoot\.pathname\)\.toBe\(\s*['"]\/xiyou-programming-journey\/runtime\/pyodide-314\.0\.2\/['"]\s*,?\s*\)/, 'lock the deployed Vite runtime base path'],
    [/expect\(pyodideResponses\)\.toHaveLength\(5\)/, 'require all five runtime responses'],
    [/new\s+Set\(\s*pyodideResponses\.map/, 'require the five runtime response URLs to be distinct'],
    [/collectRuntimeClosure\(/, 'derive the complete local W4-M2 lazy closure from the built manifest'],
    [/['"]src\/components\/WeekFourVariableEvidenceExperience\.tsx['"]/, 'bind the local closure to the W4-M2 route root'],
    [/weekFourVariableWorkerBytes/, 'include the built W4-M2 Worker in local cold bytes'],
    [/localManifestBytes/, 'measure every file in the conservative manifest closure'],
    [/observedLocalBytes/, 'record actual browser-loaded local bytes separately'],
    [/response\.status\(\)\s*>=\s*200\s*&&\s*response\.status\(\)\s*<\s*400/, 'accept only successful local closure responses'],
    [/requiredObservedLocalFiles[\s\S]*?WeekFourVariableEvidenceExperience-[\s\S]*?codemirror-editor-/, 'require the real route and editor responses'],
    [/totalLocalBytes\s*=\s*localManifestBytes\s*\+\s*weekFourVariableWorkerBytes/, 'sum the complete manifest closure and Worker bytes'],
    [/totalPyodideBytes\s*=\s*pyodideMeasurements\.reduce\(/, 'sum all Pyodide response bytes'],
    [/const\s+navigationStart\s*=\s*performance\.now\(\)/, 'start timing before navigation'],
    [/await\s+page\.goto\(\s*['"]\.\/\#\/mission\/w4-m2['"]\s*\)/, 'navigate to the real W4-M2 hash route'],
    [/getByRole\(\s*['"]heading['"]\s*,\s*\{\s*name\s*:\s*['"]两只证据匣，别让变量被覆盖['"]\s*\}\s*\)/, 'wait for the W4-M2 heading'],
    [/getByLabel\(\s*['"]W4-M2 Python 代码['"]\s*\)/, 'wait for the real W4-M2 editor'],
    [/getByRole\(\s*['"]status['"]\s*,\s*\{\s*name\s*:\s*['"]Python 运行环境已准备['"]\s*\}\s*\)/, 'wait for the accessible Python runtime-ready status'],
    [/const\s+workerReadyAt\s*=\s*performance\.now\(\)/, 'record real Worker-ready time'],
    [/const\s+firstResultAt\s*=\s*performance\.now\(\)/, 'record the first real Worker result time'],
    [/const\s+warmResultAt\s*=\s*performance\.now\(\)/, 'record the second warm-run result time'],
    [/getByRole\(\s*['"]button['"]\s*,\s*\{\s*name\s*:\s*['"]运行取证['"]\s*\}\s*\)\.click\(\)/, 'operate the visible run button'],
    [/getByText\(\s*['"]外形匣被覆盖，身份匣为空；这个失败事实已经保存。['"]\s*\)/, 'wait for the visible Chinese saved first-run feedback'],
    [/getByTestId\(\s*['"]variable-state-unsealed['"]\s*\)[\s\S]*?data-state-cell/, 'wait for the rendered unsealed scene state cell'],
    [/getByRole\(\s*['"]combobox['"]\s*,\s*\{\s*name\s*:\s*['"]第二次核验写入哪个变量['"]\s*\}\s*\)\s*\.selectOption\(\s*['"]identity['"]\s*\)/, 'make the visible identity edit before the warm run'],
    [/getByRole\(\s*['"]dialog['"]\s*,\s*\{\s*name\s*:\s*['"]闯关成功['"]\s*\}\s*\)/, 'wait for the visible Chinese sealed warm-run dialog'],
    [/getByTestId\(\s*['"]variable-state-sealed['"]\s*\)[\s\S]*?data-state-cell/, 'wait for the rendered sealed scene state cell'],
    [/coldMs\s*=\s*firstResultAt\s*-\s*navigationStart/, 'derive cold timing from real timestamps'],
    [/warmMs\s*=\s*warmResultAt\s*-\s*firstResultAt/, 'derive warm timing from real timestamps'],
    [/expect\(totalLocalBytes\)\s*\.toBeLessThanOrEqual\(\s*WEEK_FOUR_VARIABLE_COLD_LOAD_MAX_BYTES\s*,?\s*\)/, 'enforce the 3 MiB local closure budget'],
    [/expect\(totalPyodideBytes\)\s*\.toBeLessThanOrEqual\(\s*PYTHON_RUNTIME_TRANSFER_MAX_BYTES\s*,?\s*\)/, 'enforce the 15 MiB aggregate runtime budget'],
    [/testInfo\.attach\(\s*['"]w4m2-cold-metrics\.json['"]\s*,/, 'attach the named cold metrics JSON'],
    [/JSON\.stringify\(\s*\{[\s\S]*?totalLocalBytes[\s\S]*?totalPyodideBytes[\s\S]*?workerReadyMs[\s\S]*?coldMs[\s\S]*?warmMs[\s\S]*?\}\s*\)/, 'serialize every measured cold metric'],
    [/contentType\s*:\s*['"]application\/json['"]/, 'declare the cold metrics attachment as JSON'],
    [/coldMs/, 'record cold timing'],
    [/warmMs/, 'record warm timing'],
    [/20_000|20000/, 'assert the 20-second cold bound'],
    [/1_000|1000/, 'assert the 1-second warm bound'],
  ];
  if (!probe || !requirements.every(([pattern]) => pattern.test(probe))) {
    throw new Error(`w4-m2 source contract: cold probe must ${requirements.find(([pattern]) => !probe || !pattern.test(probe))?.[1] ?? 'be present'}.`);
  }
  const responseListenerAt = [probe.indexOf('page.on('), probe.indexOf('context.on(')]
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0] ?? -1;
  const navigationAt = probe.indexOf('./#/mission/w4-m2');
  const pageReadyAt = probe.indexOf('两只证据匣，别让变量被覆盖');
  const editorReadyAt = probe.indexOf('W4-M2 Python 代码');
  const runtimeReadyAt = probe.indexOf('Python 运行环境已准备');
  const readyAt = probe.indexOf('const workerReadyAt = performance.now()');
  const firstFeedbackAt = probe.indexOf('外形匣被覆盖，身份匣为空；这个失败事实已经保存。');
  const firstStateAt = probe.indexOf('variable-state-unsealed');
  const firstResultAt = probe.indexOf('const firstResultAt = performance.now()');
  const sealedFeedbackAt = probe.indexOf('闯关成功');
  const sealedStateAt = probe.indexOf('variable-state-sealed');
  const warmResultAt = probe.indexOf('const warmResultAt = performance.now()');
  const firstRunAt = probe.indexOf('运行取证');
  const runOperations = probe.match(/getByRole\(\s*['"]button['"]\s*,\s*\{\s*name\s*:\s*['"]运行取证['"]\s*\}\s*\)\.click\(\)/g) ?? [];
  if (responseListenerAt < 0 || navigationAt < responseListenerAt || pageReadyAt < navigationAt
    || editorReadyAt < pageReadyAt || runtimeReadyAt < editorReadyAt || readyAt < runtimeReadyAt
    || firstRunAt < readyAt || firstFeedbackAt < firstRunAt || firstStateAt < firstFeedbackAt || firstResultAt < firstStateAt || sealedFeedbackAt < firstResultAt
    || sealedStateAt < sealedFeedbackAt || warmResultAt < sealedStateAt || runOperations.length < 2) {
    throw new Error('w4-m2 source contract: cold probe must attach response capture before W4-M2 navigation and wait for page, editor, runtime-ready, saved first-run, and sealed warm-run states before timing each milestone.');
  }
}

function assertPostRetryProbes(file) {
  const storageRequirements = {
    draft: ['fail-w4-m2-draft', 'draftBefore', 'draftAfterRetry', 'pythonCode', 'lastRun', 'toBeNull', 'missionCompletionEvidence', 'toBeUndefined'],
    run: ['fail-w4-m2-run', 'runBefore', 'runAfterRetry', 'pythonCode', 'lastRun', 'overwriteFailures', 'totalRuns).toBe(1)', 'missionCompletionEvidence', 'toBeUndefined'],
    observation: ['fail-w4-m2-observation', 'observationBefore', 'observationAfterRetry', 'conditionObservationUses', 'toHaveLength(0)', 'toHaveLength(1)', 'pythonCode', 'lastRun', 'observationBefore.sessions["w4-m2"]?.lastRun'],
    work: ['fail-w4-m2-work', 'workBeforeRetry', 'workAfterRetry', "works['w4-m2-variable-evidence-record']", "missionCompletionEvidence['w4-m2']", 'toBeUndefined', 'w4-m3'],
    completion: ['fail-w4-m2-completion', 'completionBeforeRetry', 'completionAfterRetry', "works['w4-m2-variable-evidence-record']", "missionCompletionEvidence['w4-m2']", 'toBeUndefined', 'w4-m3'],
  };
  for (const [mode, markers] of Object.entries(storageRequirements)) {
    const [probe] = testTexts(file, `@w4-m2-storage ${mode}`);
    const setMode = new RegExp(`set(?:W4M2)?StorageFaultMode\\(\\s*['"]fail-w4-m2-${mode}['"]\\s*\\)`);
    const disableMode = /set(?:W4M2)?StorageFaultMode\(\s*['"]off['"]\s*\)/;
    const independentRetry = /getByRole\(\s*['"]button['"]\s*,\s*\{\s*name\s*:\s*['"]重试[^'"]*['"](?:\s*,\s*exact\s*:\s*true)?\s*\}\s*\)\.click\(\)/;
    const normalizedProbe = probe?.replaceAll('"', "'").replace(/\s+/g, ' ') ?? '';
    const normalizedMarkers = markers.map((marker) => marker.replaceAll('"', "'").replace(/\s+/g, ' '));
    if (!probe || !normalizedMarkers.every((marker) => normalizedProbe.includes(marker)) || !setMode.test(probe)
      || !disableMode.test(probe) || !independentRetry.test(probe) || /await\s+fault\s*\(/.test(probe)) {
      throw new Error(`w4-m2 source contract: storage retry ${mode} requires explicit fault enable, fault disable, independent retry, and fail-closed/post-retry fields.`);
    }
  }
  const faultRequirements = [
    ['@w4-m2-runtime-fault load', ['fail-w4-m2-runtime-load', 'runnerInfrastructureFailures', 'totalRuns).toBe(0)', 'evidence-unsealed', 'totalRuns).toBe(1)', 'overwriteFailures).toBe(1)', 'missions["w4-m2"]', 'w4-m2-variable-evidence-record', '这一关还没有解锁']],
    ['@w4-m2-runtime-fault timeout', ['fail-w4-m2-runtime-timeout', 'runnerInfrastructureFailures', 'totalRuns).toBe(1)', 'evidence-unsealed', 'totalRuns).toBe(2)', 'overwriteFailures).toBe(1)', 'missions["w4-m2"]', 'w4-m2-variable-evidence-record', '这一关还没有解锁']],
    ['@w4-m2-asset-fault', ['fail-w4-m2-assets', 'lastRun?.finalState', 'evidence-sealed', 'workerRunCount', 'formal-v3', 'totalRuns).toBe(workerRunCount)', 'runnerInfrastructureFailures', 'overwriteFailures', 'attempts).toBe(1)']],
    ['@w4-m2-lazy', ['WeekFourVariableEvidenceExperience-', 'lastRun?.finalState', 'evidence-sealed', 'workerRunCount', 'formal-v3', 'totalRuns).toBe(workerRunCount)', 'runnerInfrastructureFailures', 'overwriteFailures', 'attempts).toBe(1)']],
    ['@w4-m2-corrupt current', ['corrupt-w4-variable-current', 'corruptBytes', 'downloadedBytes', 'lastLegalSnapshot', 'recoveredCurrent', 'lastCanonicalTrace', 'lastWorkerTrace', 'w4-m2-variable-evidence-record', 'replayBefore', '{broken w4-m2 current']],
  ];
  for (const [tag, markers] of faultRequirements) {
    const [probe] = testTexts(file, tag);
    if (!probe || !markers.every((marker) => probe.includes(marker))) throw new Error(`w4-m2 source contract: ${tag} requires exact fail-closed and post-retry assertions.`);
  }
}

function assertAccessibilityProbe(file) {
  const [probe] = testTexts(file, '@w4-m2-accessibility');
  const normalized = probe?.replaceAll('"', "'").replace(/\s+/g, ' ') ?? '';
  const markers = [
    "getByRole('textbox', { name: 'W4-M2 Python 代码' })",
    "getByRole('combobox'",
    "getByRole('button'",
    "getByRole('status'",
    "getByRole('alert'",
    "getByRole('dialog'",
    "aria-live",
    'toBeFocused',
    "press('Enter')",
    "press(' ')",
  ];
  if (!probe || !markers.every((marker) => normalized.includes(marker))) {
    throw new Error('w4-m2 source contract: accessibility probe must verify named editor/selector/button/status/alert/dialog roles, live updates, focus order, and keyboard activation.');
  }
}

function assertClearAndRealCasProbes(file) {
  const [clear] = testTexts(file, '@w4-m2-clear');
  const clearMarkers = ['清空学习数据', '输入“清空”以确认', '备份并清空', 'download', 'clearBefore', 'clearBackupBytes', 'JSON.parse(clearBackupBytes)', 'toEqual(clearBefore)', 'sessions["w4-m2"]', 'w4-m2-variable-evidence-record', 'missionCompletionEvidence["w4-m2"]', 'missions["w4-m2"]', 'createInitialProgress().settings', 'createInitialProgress().privacy', '这一关还没有解锁'];
  if (!clear || !clearMarkers.every((marker) => clear.includes(marker))) throw new Error('w4-m2 source contract: clear probe must visibly back up, clear every W4-M2 record, restore exact initial settings/privacy, and relock W4-M3.');
  const [cas] = testTexts(file, '@w4-m2-external');
  const casMarkers = ['stale.route', 'await run(stale)', 'await chooseIdentity(page)', 'currentRevision', 'currentCode', '其他标签页已有新的学习进度', '载入其他标签页进度'];
  if (!cas || cas.includes('fail-w4-m2-cas-stale-writer') || !casMarkers.every((marker) => cas.includes(marker))) throw new Error('w4-m2 source contract: CAS probe must use two real pages, delay only the stale real runtime, reject its old write, and explicitly load the newer revision.');
}

function assertFiveProjectCollection() {
  const config = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
  const expectedProjects = [
    ['desktop-chromium-1440x1024', '@w4-m2-(?:full|keyboard|mouse|touch|accessibility|storage|corrupt|parent|work|python-security|cold|runtime-fault|asset-fault|narrow|external|lazy)'],
    ['tablet-webkit-768x1024', '@w4-m2-(?:full|cold|asset-fault|runtime-fault)'],
    ['mobile-chromium-390x844', '@w4-m2-(?:full|touch|cold)'],
    ['desktop-firefox-1440x1024', '@w4-m2-(?:full|keyboard|cold)'],
    ['narrow-chromium-320x844', '@w4-m2-(?:full|touch|narrow|cold)'],
  ];
  for (const [project, ...tags] of expectedProjects) {
    const start = config.indexOf(`name: '${project}'`);
    const end = start < 0 ? -1 : config.indexOf('\n    },', start);
    const segment = start < 0 ? '' : config.slice(start, end < 0 ? undefined : end);
    if (!tags.every((tag) => segment.includes(tag))) throw new Error(`w4-m2 source contract: ${project} must collect ${tags.join(', ')}.`);
  }
}

export function assertWeekFourVariableE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w4-m2 source contract: source must be text.');
  if (FORBIDDEN.test(source)) throw new Error('w4-m2 source contract: forbidden legacy, dynamic-code, skip, or health shortcut.');
  const file = ts.createSourceFile('w4m2.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length) throw new Error('w4-m2 source contract: E2E source must parse.');
  assertRealEvidenceTags(file);
  assertNoDirectW4M2Injection(file);
  const helper = functionText(file, 'formalW4M1Prerequisite');
  if (!helper || /w4-m2|WeekFourVariable|\bworks\b|missionCompletionEvidence/i.test(helper)) throw new Error('w4-m2 source contract: prerequisite helper must create only the formal W4-M1 state.');
  const helperHash = createHash('sha256').update(helper).digest('hex');
  if (!source.includes(`W4_M1_FORMAL_PREREQUISITE_SHA256 = '${helperHash}'`)) throw new Error('w4-m2 source contract: prerequisite helper requires a fixed SHA-256 review marker.');
  if (!source.includes('attachHealth(page)') || !/test\.afterEach[\s\S]*healthEvents\.get\(page\)[\s\S]*toEqual\(\[\]\)/.test(source)) throw new Error('w4-m2 source contract: missing immutable raw browser-health collection.');
  assertNoDynamicCode(file);
  assertInlineEvaluateCallbacks(file);
  assertSecurityProbe(file);
  assertColdProbe(file);
  assertAccessibilityProbe(file);
  assertPostRetryProbes(file);
  assertClearAndRealCasProbes(file);
  assertFiveProjectCollection();
}
