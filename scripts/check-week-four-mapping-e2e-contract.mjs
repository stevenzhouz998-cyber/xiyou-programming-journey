import ts from 'typescript';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const W4_M1_TAGS = Object.freeze([
  '@w4-m1-full', '@w4-m1-keyboard', '@w4-m1-mouse', '@w4-m1-touch',
  '@w4-m1-storage', '@w4-m1-corrupt', '@w4-m1-parent', '@w4-m1-work',
  '@w4-m1-python-security', '@w4-m1-cold', '@w4-m1-asset-fault',
  '@w4-m1-narrow', '@w4-m1-external', '@w4-m1-lazy', '@w4-m1-runtime-fault',
]);

const FORBIDDEN = /expectedSequence|expectedOutput|LegacyMissionBuilder|MissionTools|healthEvents(?:\.get\([^)]*\))?\.(?:clear|delete|filter|splice|pop|shift)\s*\(|\btest\.skip\b|\.skip\s*\(/;
const DIRECT_W4_WRITE = /(?:\bprogress\b|\bnext\b|\bstate\b)\s*\.\s*(?:missions|sessions|missionCompletionEvidence|works)\s*\[\s*['\"]w4-m1(?:-first-python-mapping)?['\"]\s*\]\s*=/;
const DIRECT_W4_STORAGE_WRITE = /(?:localStorage|sessionStorage)\.setItem\([^)]*['\"](?:w4-m1|xiyou-programming-progress)[^)]*/;

function functionText(file, name) {
  let value = null;
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) value = node.getText(file);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return value;
}

function assertInlineEvaluateCallbacks(file) {
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.name.text === 'evaluate') {
      const callback = node.arguments[0];
      if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
        throw new Error('w4-m1 source contract: browser evaluate callbacks must be inline and reviewable.');
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function assertNoDynamicCode(file) {
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'eval') {
      throw new Error('w4-m1 source contract: dynamic code execution is forbidden.');
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
      throw new Error('w4-m1 source contract: dynamic code execution is forbidden.');
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}

function testText(file, tag) {
  let value = null;
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'test') {
      const title = node.arguments[0];
      const callback = node.arguments.at(-1);
      if (title && ts.isStringLiteralLike(title) && title.text.includes(tag)
        && callback && (ts.isArrowFunction(callback) || ts.isFunctionExpression(callback))) value = node.getText(file);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return value;
}

function assertSecurityProbe(file) {
  const probe = testText(file, '@w4-m1-python-security');
  if (!probe) throw new Error('w4-m1 source contract: missing Python security probe.');
  if (/\binputs\.map\s*\(/.test(probe) || /\brejected\s*:\s*true\b/.test(probe)) {
    throw new Error('w4-m1 source contract: security probe must not synthesize rejected results.');
  }
  const requirements = [
    [/performance\.getEntriesByType\(\s*['"]resource['"]\s*\)/, 'discover the built Worker resource'],
    [/new\s+Worker\(\s*workerUrl\s*,\s*\{\s*type\s*:\s*['"]module['"]\s*\}\s*\)/, 'start the built module Worker'],
    [/event\.data\?\.type\s*===\s*['"]ready['"]/, 'wait for Worker ready'],
    [/worker\.postMessage\(\s*\{[\s\S]*?type\s*:\s*['"]run['"][\s\S]*?requestId[\s\S]*?cards[\s\S]*?sourceSpan/, 'send every malicious run with request id, cards, and source span'],
    [/event\.data\?\.type\s*===\s*['"]error['"]|message\.type\s*===\s*['"]error['"]/, 'assert Worker error responses'],
    [/event\.data\.requestId\s*===\s*requestId|message\.requestId\s*===\s*requestId/, 'bind errors to their request id'],
    [/worker\.terminate\(\)/, 'terminate the probe Worker'],
    [/const\s+before\s*=\s*await\s+page\.evaluate[\s\S]*?localStorage\.getItem[\s\S]*?toEqual\(before\)/, 'preserve current and revision bytes'],
  ];
  for (const [pattern, detail] of requirements) {
    if (!pattern.test(probe)) throw new Error(`w4-m1 source contract: security probe must ${detail}.`);
  }
}

function assertColdProbe(file) {
  const probe = testText(file, '@w4-m1-cold');
  if (!probe) throw new Error('w4-m1 source contract: missing desktop cold probe.');
  if (!/response\.body\(\)/.test(probe) || !/Promise\.all\(transfer\.map/.test(probe)) {
    throw new Error('w4-m1 source contract: cold probe must read every successful response body.');
  }
  if (!/totalLocalBytes\s*=\s*measured\.filter[\s\S]*?\.reduce\(/.test(probe)
    || !/totalPyodideBytes\s*=\s*pyodideResponses\.reduce\(/.test(probe)
    || !/expect\(totalLocalBytes\)\.toBeLessThanOrEqual\(WEEK_FOUR_MAPPING_COLD_LOAD_MAX_BYTES\)/.test(probe)
    || !/expect\(totalPyodideBytes\)\.toBeLessThanOrEqual\(PYTHON_RUNTIME_TRANSFER_MAX_BYTES\)/.test(probe)) {
    throw new Error('w4-m1 source contract: cold probe must sum local and Pyodide response bytes against both budgets.');
  }
  if (/pyodideResponses\.(?:every|forEach)\([^)]*PYTHON_RUNTIME_TRANSFER_MAX_BYTES/.test(probe)) {
    throw new Error('w4-m1 source contract: cold probe must not replace the Pyodide total budget with per-response checks.');
  }
  const sameOriginRuntimeRequirements = [
    "const applicationRoot = new URL('./', page.url()); const runtimeRoot = new URL('runtime/pyodide-314.0.2/', applicationRoot);",
    'responseUrl.origin === runtimeRoot.origin',
    'responseUrl.pathname.startsWith(runtimeRoot.pathname)',
    "expect(runtimeRoot.pathname).toBe('/xiyou-programming-journey/runtime/pyodide-314.0.2/');",
    'expect(pyodideResponses).toHaveLength(5)',
  ];
  if (!sameOriginRuntimeRequirements.every((requirement) => probe.includes(requirement))) {
    throw new Error('w4-m1 source contract: cold probe must accept only fixed same-origin runtime paths beneath the deployed Vite base.');
  }
  if (!/coldMs/.test(probe) || !/warmMs/.test(probe) || !/totalLocalBytes/.test(probe) || !/totalPyodideBytes/.test(probe)) {
    throw new Error('w4-m1 source contract: cold probe must attach named local, Pyodide, cold, and warm metrics.');
  }
}

function assertStorageRetryProbes(file) {
  const requirements = {
    draft: ['draftAfterRetry', "pythonCode).toContain('appearance')", 'lastRun).toBeNull()'],
    run: ['runAfterRetry', 'lastRun?.completed).toBe(false)', 'failureSnapshot).not.toBeNull()', "expect(runAfterRetry.sessions['w4-m1']?.totalRuns).toBe(1)"],
    observation: ['observationBefore', 'observationAfterRetry', 'conditionObservationUses).toHaveLength(1)', 'toEqual(observationBefore.sessions', 'toBe(observationBefore.sessions'],
    work: ['workBeforeRetry', "missionCompletionEvidence['w4-m1']).toBeUndefined()", "works['w4-m1-first-python-mapping']).toBeUndefined()", "missionCompletionEvidence['w4-m1']?.kind).toBe('formal-v3')", "works['w4-m1-first-python-mapping']).toBeDefined()"],
    completion: ['completionBeforeRetry', "missionCompletionEvidence['w4-m1']).toBeUndefined()", "works['w4-m1-first-python-mapping']).toBeUndefined()", "missionCompletionEvidence['w4-m1']?.kind).toBe('formal-v3')", "works['w4-m1-first-python-mapping']).toBeDefined()"],
  };
  for (const [mode, markers] of Object.entries(requirements)) {
    const probe = testText(file, `@w4-m1-storage ${mode}`);
    if (!probe || !markers.every((marker) => probe.includes(marker))) {
      throw new Error(`w4-m1 source contract: storage retry ${mode} requires explicit post-retry state assertions.`);
    }
  }
}

function assertRuntimeFailureRecovery(file) {
  const probe = testText(file, '@w4-m1-runtime-fault');
  const markers = [
    'pyodide\\.mjs', 'status: 503', 'Python 运行环境暂时不可用，这不算学习错误。',
    "expect(runtimeFailure.sessions['w4-m1']?.runnerInfrastructureFailures).toBe(1)", 'totalRuns).toBe(0)',
    "missionCompletionEvidence['w4-m1']).toBeUndefined()", "works['w4-m1-first-python-mapping']).toBeUndefined()",
    '重试保存', '两种写法在第一张公开卡得出了不同分支；差异已经保存。', 'totalRuns).toBe(1)',
  ];
  if (!probe || !markers.every((marker) => probe.includes(marker))) {
    throw new Error('w4-m1 source contract: runtime failure recovery requires a deterministic Pyodide 503, saved infrastructure fact, and real retry mismatch.');
  }
}

function assertFiveProjectCollection() {
  const config = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
  const expectedProjects = [
    ['desktop-chromium-1440x1024', '@w4-m1-(?:full|keyboard|mouse|touch|storage|corrupt|parent|work|python-security|cold'],
    ['tablet-webkit-768x1024', '@w4-m1-full'],
    ['mobile-chromium-390x844', '@w4-m1-full', '@w4-m1-touch'],
    ['desktop-firefox-1440x1024', '@w4-m1-full', '@w4-m1-keyboard'],
    ['narrow-chromium-320x844', '@w4-m1-full', '@w4-m1-touch', '@w4-m1-narrow'],
  ];
  for (const [project, ...tags] of expectedProjects) {
    const start = config.indexOf(`name: '${project}'`);
    const end = start < 0 ? -1 : config.indexOf("\n    },", start);
    const segment = start < 0 ? '' : config.slice(start, end < 0 ? undefined : end);
    if (!tags.every((tag) => segment.includes(tag))) {
      throw new Error(`w4-m1 source contract: ${project} must collect ${tags.join(', ')}.`);
    }
  }
  for (const project of ['tablet-webkit-768x1024', 'mobile-chromium-390x844', 'desktop-firefox-1440x1024', 'narrow-chromium-320x844']) {
    const start = config.indexOf(`name: '${project}'`);
    const end = start < 0 ? -1 : config.indexOf("\n    },", start);
    const segment = start < 0 ? '' : config.slice(start, end < 0 ? undefined : end);
    if (segment.includes('@w4-m1-cold')) throw new Error(`w4-m1 source contract: ${project} must not run the desktop-only cold probe.`);
  }
}

export function assertWeekFourMappingE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w4-m1 source contract: source must be text.');
  for (const tag of W4_M1_TAGS) if (!source.includes(tag)) throw new Error(`w4-m1 source contract: missing ${tag}.`);
  if (FORBIDDEN.test(source)) throw new Error('w4-m1 source contract: forbidden legacy, dynamic-code, skip, or health shortcut.');
  if (/\binputs\.map\s*\(|\brejected\s*:\s*true\b/.test(source)) {
    throw new Error('w4-m1 source contract: security probe must not synthesize rejected results.');
  }
  if (DIRECT_W4_WRITE.test(source) || DIRECT_W4_STORAGE_WRITE.test(source)) throw new Error('w4-m1 source contract: direct W4 progress injection is forbidden.');
  const file = ts.createSourceFile('w4m1.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  if (file.parseDiagnostics.length) throw new Error('w4-m1 source contract: E2E source must parse.');
  const helper = functionText(file, 'formalW3M5Prerequisite');
  if (!helper || /w4-m1|WeekFourMapping|\bworks\b|missionCompletionEvidence/i.test(helper)) {
    throw new Error('w4-m1 source contract: prerequisite helper must create only the formal W3-M5 state.');
  }
  const helperHash = createHash('sha256').update(helper).digest('hex');
  if (!source.includes(`W3_M5_FORMAL_PREREQUISITE_SHA256 = '${helperHash}'`)) {
    throw new Error('w4-m1 source contract: prerequisite helper requires a fixed SHA-256 review marker.');
  }
  if (!source.includes('attachHealth(page)') || !/test\.afterEach[\s\S]*healthEvents\.get\(page\)[\s\S]*toEqual\(\[\]\)/.test(source)) {
    throw new Error('w4-m1 source contract: missing immutable raw browser-health collection.');
  }
  assertNoDynamicCode(file);
  assertInlineEvaluateCallbacks(file);
  assertSecurityProbe(file);
  assertColdProbe(file);
  assertStorageRetryProbes(file);
  assertRuntimeFailureRecovery(file);
  assertFiveProjectCollection();
}
