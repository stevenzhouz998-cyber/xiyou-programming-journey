import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  assertWeekFourBranchE2ESourceContract,
  FORBIDDEN_W4_M3_PATTERNS,
  REQUIRED_W4_M3_TAGS,
  W4_M3_TAGS,
} from './check-week-four-branch-e2e-contract.mjs';
import * as branchContract from './check-week-four-branch-e2e-contract.mjs';

const actualSource = readFileSync(new URL('../e2e/week-four-python-branch-structure.spec.ts', import.meta.url), 'utf8');
function declaredFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} missing`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} is not closed`);
}
const prerequisite = declaredFunction(actualSource, 'formalW4M2Prerequisite');
const prerequisiteHash = createHash('sha256').update(prerequisite).digest('hex');
const faultSetupSource = declaredFunction(actualSource, 'setW4M3Fault');
const faultClearSource = declaredFunction(actualSource, 'clearW4M3Fault');
const seedSetupSource = declaredFunction(actualSource, 'seedPrerequisite');
const visibleTags = new Set(['full', 'mouse', 'touch', 'keyboard', 'accessibility', 'narrow', 'parent', 'work']);
const faultModes = {
  storage: 'fail-w4-m3-draft',
  corrupt: 'fail-w4-m3-corrupt-current',
  external: 'fail-w4-m3-cas-stale-writer',
  'runtime-fault': 'fail-w4-m3-runtime-load',
  'asset-fault': 'fail-w4-m3-assets',
  lazy: 'fail-w4-m3-lazy',
};
function evidenceBody(tag) {
  const kind = tag.replace('@w4-m3-', '');
  if (visibleTags.has(kind)) return `
  await page.goto('./#/mission/w4-m3');
  await page.getByLabel('W4-M3 Python 代码').fill('if identity == "白骨精":\\n    print("识破")');
  await page.getByRole('button', { name: '运行分支' }).click();
  await expect(page.getByRole('status', { name: '分支运行结果' })).toBeVisible();
  ${kind === 'mouse' ? "await page.getByRole('button', { name: '使用 else:' }).click(); await page.getByRole('button', { name: '缩进 4 空格' }).click();" : ''}
  ${kind === 'touch' ? "await page.touchscreen.tap(20, 20);" : ''}
  ${kind === 'keyboard' ? "await page.getByLabel('W4-M3 Python 代码').press('Control+Enter');" : ''}
  ${kind === 'accessibility' ? "await page.getByLabel('W4-M3 Python 代码').focus(); await expect(page.getByRole('status', { name: '分支运行结果' })).toHaveAttribute('aria-live', 'polite');" : ''}
  ${kind === 'narrow' ? "const metrics = await page.getByTestId('week-four-branch-layout').evaluate((node) => ({ scrollWidth: node.scrollWidth, clientWidth: node.clientWidth })); expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);" : ''}
  ${kind === 'parent' ? "await page.getByRole('button', { name: '打开家长周报' }).click(); await expect(page.getByRole('region', { name: '第四周分支结构学习摘要' })).toBeVisible();" : ''}
  ${kind === 'work' ? "await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible(); expect(progress.works['w4-m3-branch-structure-record']).toBeDefined();" : ''}`;
  if (kind === 'cold') return `
  const responses = [];
  page.on('response', (response) => responses.push(response.url()));
  await page.goto('./#/mission/w4-m3');
  const resources = await page.evaluate(() => performance.getEntriesByType('resource'));
  expect(responses.length).toBeGreaterThan(0);
  expect(resources.length).toBeGreaterThan(0);`;
  if (kind === 'python-security') return `
  const worker = new Worker(workerUrl, { type: 'module' });
  worker.postMessage({ type: 'run', code: 'import os' });
  await expect(workerResult).resolves.toMatchObject({ type: 'error' });
  worker.terminate();`;
  const mode = faultModes[kind];
  return `
  ${kind === 'lazy' ? "const w4m3DocumentMarker = 'same-document'; await page.locator('html').evaluate((node, marker) => { node.dataset.w4m3DocumentMarker = marker; }, w4m3DocumentMarker);" : ''}
  await setW4M3Fault(page, '${mode}');
  await page.goto('./#/mission/w4-m3');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByText('本次故障已被拦截')).toBeVisible();
  ${kind === 'external' ? "await expect(page.getByRole('alert')).toContainText('其他标签页已有新的学习进度'); expect(activeMode).toBe('fail-w4-m3-cas-stale-writer');" : ''}
  await clearW4M3Fault(page, '${mode}');
  ${kind === 'storage' ? "await setW4M3Fault(page, 'fail-w4-m3-run'); await clearW4M3Fault(page, 'fail-w4-m3-run'); await setW4M3Fault(page, 'fail-w4-m3-observation'); await clearW4M3Fault(page, 'fail-w4-m3-observation'); await setW4M3Fault(page, 'fail-w4-m3-work'); await clearW4M3Fault(page, 'fail-w4-m3-work'); await setW4M3Fault(page, 'fail-w4-m3-completion'); await clearW4M3Fault(page, 'fail-w4-m3-completion');" : ''}
  ${kind === 'storage' ? "expect(progress.sessions['w4-m3'].totalRuns).toBe(1); expect(progress.sessions['w4-m3'].conditionObservationUses).toHaveLength(1); expect(progress.works['w4-m3-branch-structure-record']).toBeDefined(); expect(progress.missionCompletionEvidence['w4-m3']).toBeDefined();" : ''}
  ${kind === 'runtime-fault' ? "await setW4M3Fault(page, 'fail-w4-m3-runtime-timeout'); await clearW4M3Fault(page, 'fail-w4-m3-runtime-timeout');" : ''}
  await page.getByRole('button', { name: '重试运行' }).click();
  await expect(page.getByRole('status', { name: '分支运行结果' })).toBeVisible();
  ${kind === 'lazy' ? "expect(await page.locator('html').evaluate((node) => node.dataset.w4m3DocumentMarker)).toBe(w4m3DocumentMarker);" : ''}`;
}
const evidenceTests = W4_M3_TAGS.map((tag) => `test('${tag} visible child path', async () => {${evidenceBody(tag)}
});`).join('\n');
const safeSource = `${prerequisite}
const W4_M2_FORMAL_PREREQUISITE_SHA256 = '${prerequisiteHash}';
const healthEvents = new Map();
function attachHealth(page) {
  healthEvents.set(page, []);
  page.on('console', (message) => healthEvents.get(page).push(message.text()));
  page.on('pageerror', (error) => healthEvents.get(page).push(error.message));
}
${faultSetupSource}
${faultClearSource}
${seedSetupSource}
test.beforeEach(async ({ page }) => { attachHealth(page); await seedPrerequisite(page); });
test.afterEach(({ page }) => { expect(healthEvents.get(page)).toEqual([]); });
${evidenceTests}`;

test('requires every W4-M3 evidence tag, one W4-M2 prerequisite, a fixed hash, health collection, and fault evidence', () => {
  assert.throws(() => assertWeekFourBranchE2ESourceContract(''), /source must parse|real test title/i);
  assert.doesNotThrow(() => assertWeekFourBranchE2ESourceContract(safeSource));
});

test('exports the reusable forbidden-pattern and required-tag contracts', () => {
  assert.deepEqual(REQUIRED_W4_M3_TAGS, W4_M3_TAGS);
  assert.equal(FORBIDDEN_W4_M3_PATTERNS.some((pattern) => pattern.test('expectedSequence')), true);
  assert.equal(FORBIDDEN_W4_M3_PATTERNS.some((pattern) => pattern.test('expectedOutput')), true);
});

test('rejects direct W4-M3 storage, evidence, work, browser-proof, and legacy-answer shortcuts', () => {
  for (const injected of [
    "localStorage.setItem('w4-m3', 'forged')",
    "progress.missionCompletionEvidence['w4-m3'] = { kind: 'forged' }",
    "progress.works['w4-m3-branch-structure-record'] = { kind: 'forged' }",
    "page.evaluate(() => 'branch-proven')",
    'expectedSequence',
    'expectedOutput',
  ]) {
    assert.throws(
      () => assertWeekFourBranchE2ESourceContract(`${safeSource}\n${injected}`),
      /storage|evidence|work|browser proof|legacy/i,
    );
  }
});

test('rejects alias, dynamic-key, Object.assign, Reflect.set, mission-id, and indirect evaluate proof bypasses', () => {
  for (const injected of [
    "const evidence = progress.missionCompletionEvidence; evidence['w4-m3'] = { kind: 'forged' };",
    "const work = progress.works; work['w4-m3-branch-structure-record'] = { kind: 'forged' };",
    "const storage = localStorage; storage.setItem('w4-m3', 'forged');",
    "const missionId = 'w4-m3'; progress.missionCompletionEvidence[missionId] = { kind: 'forged' };",
    "const recordId = 'w4-m3-branch-structure-record'; Object.assign(progress.works, { [recordId]: { kind: 'forged' } });",
    "const evidence = progress.missionCompletionEvidence; Reflect.set(evidence, 'w4-m3', { kind: 'forged' });",
    "const proof = page.evaluate; proof(() => 'branch-proven');",
  ]) {
    assert.throws(() => assertWeekFourBranchE2ESourceContract(`${safeSource}\n${injected}`), /storage|evidence|work|browser proof/i, injected);
  }
});

test('rejects formal-progress storage payloads, destructured aliases, and bound evaluate proof variables', () => {
  for (const injected of [
    "const storage = localStorage; storage.setItem('xiyou-programming-progress-v3', JSON.stringify({ missionCompletionEvidence: { 'w4-m3': { kind: 'forged' } } }));",
    "const progressKey = 'xiyou-programming-progress-v3'; const payload = JSON.stringify({ 'w4-m3': 'forged' }); storage.setItem(progressKey, payload);",
    "const progressKey = 'xiyou-programming-progress-v3'; const forgedPayload = JSON.stringify({ works: { 'w4-m3-branch-structure-record': {} } }); const payload = forgedPayload; storage.setItem(progressKey, payload);",
    "const { missionCompletionEvidence: evidence } = progress; evidence['w4-m3'] = { kind: 'forged' };",
    "const { works } = progress; works['w4-m3-branch-structure-record'] = { kind: 'forged' };",
    "const { localStorage: storage } = window; storage.setItem('xiyou-programming-progress-v3', JSON.stringify({ works: { 'w4-m3-branch-structure-record': {} } }));",
    "const branchProof = 'branch-proven'; const evaluate = page.evaluate.bind(page); evaluate(() => branchProof);",
  ]) {
    assert.throws(() => assertWeekFourBranchE2ESourceContract(`${safeSource}\n${injected}`), /storage|evidence|work|browser proof/i, injected);
  }
});

test('uses lexical bindings so shadowed mission ids reject only the forged inner scope', () => {
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(`${safeSource}\n{ const missionId = 'w4-m2'; const preview = missionId; }\n{ const missionId = 'w4-m3'; progress.missionCompletionEvidence[missionId] = { kind: 'forged' }; }`),
    /evidence/i,
  );
  assert.doesNotThrow(
    () => assertWeekFourBranchE2ESourceContract(`${safeSource}\n{ const missionId = 'w4-m3'; const preview = missionId; }\n{ const missionId = 'w4-m2'; const benign = { id: missionId }; }`),
  );
});

test('resolves evidence aliases at their lexical use site instead of retaining a global first binding', () => {
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(`${safeSource}\n{ const evidence = progress.preview; const preview = evidence; }\n{ const evidence = progress.missionCompletionEvidence; evidence['w4-m3'] = { kind: 'forged' }; }`),
    /evidence/i,
  );
  assert.doesNotThrow(
    () => assertWeekFourBranchE2ESourceContract(`${safeSource}\n{ const evidence = progress.missionCompletionEvidence; const preview = evidence; }\n{ const evidence = progress.preview; evidence['w4-m2'] = { kind: 'benign' }; }`),
  );
});

test('rejects a heading-only full tag without editor input, exact run, and result assertion', () => {
  const headingOnly = safeSource.replace(
    "  await page.getByLabel('W4-M3 Python 代码').fill('if identity == \"白骨精\":\\n    print(\"识破\")');\n  await page.getByRole('button', { name: '运行分支' }).click();\n  await expect(page.getByRole('status', { name: '分支运行结果' })).toBeVisible();",
    "  await expect(page.getByRole('heading', { name: '分支归位' })).toBeVisible();",
  );
  assert.throws(() => assertWeekFourBranchE2ESourceContract(headingOnly), /full requires/i);
});

test('allows benign cache writes but rejects computed window storage aliases that forge W4-M3', () => {
  assert.doesNotThrow(
    () => assertWeekFourBranchE2ESourceContract(`${safeSource}\nconst benignPayload = JSON.stringify({ draft: true }); cache.setItem('draft-key', benignPayload);`),
  );
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(`${safeSource}\nconst storage = window['local' + 'Storage']; storage.setItem('w4-m3', JSON.stringify({ 'w4-m3': 'forged' }));`),
    /storage/i,
  );
});

test('rejects dead fault constants, inert health helpers, and extra W4-M3 project tags', () => {
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(safeSource.replaceAll("await setW4M3Fault(page, 'fail-w4-m3-assets');", '')),
    /fault/i,
  );
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(safeSource.replace("page.on('console', (message) => healthEvents.get(page).push(message.text()));", '')),
    /health/i,
  );
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(`${safeSource}\nhealthEvents.clear();`),
    /immutable/i,
  );
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(safeSource.replaceAll("await setW4M3Fault(page, 'fail-w4-m3-assets');", "if (false) await setW4M3Fault(page, 'fail-w4-m3-assets');")),
    /fault/i,
  );
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(safeSource.replace("page.on('console', (message) => healthEvents.get(page).push(message.text()));", "page.on('console', () => {});")),
    /health/i,
  );
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(`${safeSource}\nfunction pushLater() { healthEvents.get(page).push('late'); }` .replace("page.on('console', (message) => healthEvents.get(page).push(message.text()));", "page.on('console', () => pushLater());")),
    /health/i,
  );
  const configWithExtra = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8')
    .replace('@w4-m3-(?:full|touch|narrow|cold)', '@w4-m3-(?:full|touch|narrow|cold)|@w4-m3-extra');
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(safeSource, { playwrightConfig: configWithExtra }),
    /exact.*tags/i,
  );
});

test('rejects a shell E2E tag that navigates without child-visible input or an asserted result', () => {
  const shell = safeSource.replace(
    "  await page.getByLabel('W4-M3 Python 代码').fill('if identity == \"白骨精\":\\n    print(\"识破\")');\n  await page.getByRole('button', { name: '运行分支' }).click();\n  await expect(page.getByRole('status', { name: '分支运行结果' })).toBeVisible();",
    '',
  );
  assert.throws(() => assertWeekFourBranchE2ESourceContract(shell), /full requires/i);
});

test('exports narrow legacy and proof-injection patterns for downstream source checks', () => {
  assert.equal(FORBIDDEN_W4_M3_PATTERNS.some((pattern) => pattern.test("localStorage.setItem('xiyou-programming-progress-v3', '{}')")), true);
  assert.equal(FORBIDDEN_W4_M3_PATTERNS.some((pattern) => pattern.test("progress.missionCompletionEvidence['w4-m3'] = {}")), true);
  assert.equal(FORBIDDEN_W4_M3_PATTERNS.some((pattern) => pattern.test("page.evaluate(() => 'branch-proven')")), true);
  assert.equal(FORBIDDEN_W4_M3_PATTERNS.some((pattern) => pattern.test("expect(status).toBe('branch-proven')")), false);
});

test('rejects non-unique tags, non-W4-M2 prerequisites, mutable health evidence, and missing fault words', () => {
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(safeSource.replace("test('@w4-m3-full visible child path', async () => {", "/* @w4-m3-full */\ntest('not a tag', async () => {")),
    /real test title/i,
  );
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(`${safeSource}\ntest('@w4-m3-full duplicate', async () => {});`),
    /duplicate/i,
  );
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(safeSource.replace('formalW4M2Prerequisite', 'formalW4M3Prerequisite')),
    /prerequisite/i,
  );
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(safeSource.replace('toEqual([])', 'toEqual(["hidden error"])')),
    /health/i,
  );
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(safeSource.replaceAll("await setW4M3Fault(page, 'fail-w4-m3-assets');", '')),
    /fault/i,
  );
});

test('requires the lazy recovery evidence to prove the same document survived retry', () => {
  assert.throws(
    () => assertWeekFourBranchE2ESourceContract(safeSource.replaceAll('w4m3DocumentMarker', 'removedDocumentMarker')),
    /same document|lazy/i,
  );
});

test('pins the canonical prerequisite hash independently and validates the real formal construction chain', () => {
  assert.equal(branchContract.APPROVED_W4_M2_PREREQUISITE_SHA256, '9e67436dc6f2cc62e984f9ab751531329b85a36b3ea6f5b076b4dd54bbfe9758');
  assert.doesNotThrow(() => assertWeekFourBranchE2ESourceContract(actualSource));
  const mutated = `${actualSource
    .replace('const checked = parseProgress(serialized);', 'const checked = JSON.parse(serialized);')}
// self-signed hash comment: 9e67436dc6f2cc62e984f9ab751531329b85a36b3ea6f5b076b4dd54bbfe9758`;
  assert.throws(() => assertWeekFourBranchE2ESourceContract(mutated), /approved|canonical|prerequisite/i);
  const naked = actualSource.replace(prerequisite, `function formalW4M2Prerequisite() {
    return JSON.stringify({ missionCompletionEvidence: { 'w4-m2': { kind: 'formal-v3' } } });
  }`);
  assert.throws(() => assertWeekFourBranchE2ESourceContract(naked), /canonical|chain|prerequisite/i);
});

test('rejects prototype setter call apply bind aliases and every W4-M3 progress container write', () => {
  const injections = [
    "Storage.prototype.setItem.call(localStorage, 'xiyou-programming-progress-v3', JSON.stringify({ missions: { 'w4-m3': {} } }));",
    "Storage.prototype.setItem.apply(localStorage, ['xiyou-programming-progress-v3', JSON.stringify({ sessions: { 'w4-m3': {} } })]);",
    "const setter = Storage.prototype.setItem; setter.call(localStorage, 'xiyou-programming-progress-v3', JSON.stringify({ works: { 'w4-m3-branch-structure-record': {} } }));",
    "const boundSetter = Storage.prototype.setItem.bind(localStorage); boundSetter('xiyou-programming-progress-v3', JSON.stringify({ missionCompletionEvidence: { 'w4-m3': {} } }));",
    "await page.evaluate(() => Storage.prototype.setItem.call(localStorage, 'xiyou-programming-progress-v3', JSON.stringify({ missions: { 'w4-m3': {} } })));",
    "progress.missions['w4-m3'] = {};",
    "progress.sessions['w4-m3'] = {};",
    "const missions = progress.missions; const missionId = 'w4-' + 'm3'; missions[missionId] = {};",
    "const sessions = progress.sessions; Reflect.set(sessions, 'w4-m3', {});",
  ];
  for (const injected of injections) {
    assert.throws(() => assertWeekFourBranchE2ESourceContract(`${actualSource}\n${injected}`), /storage|mission|session|injection|progress/i, injected);
  }
});

test('requires exact fault ids and a fetched real Worker result-only delay wrapper', () => {
  for (const forbidden of ['fail-w4-m3-runtime', 'corrupt-w4-m3-current']) {
    assert.equal(actualSource.includes(`'${forbidden}'`), false, forbidden);
  }
  const synthetic = actualSource.replace('const actualBody = await response.text();', "const actualBody = \"self.postMessage({type:'ready'});self.onmessage=()=>{};\"");
  assert.throws(() => assertWeekFourBranchE2ESourceContract(synthetic), /worker|fetch|result|synthetic|timeout/i);
});

test('seals prerequisite setup to one internal canonical raw binding and one-argument callers', () => {
  const canonicalSeedStart = 'async function seedPrerequisite(page: Page) {\n  const raw = JSON.stringify(formalW4M2Prerequisite());';
  assert.equal(actualSource.includes(canonicalSeedStart), true, 'real E2E must own the canonical raw binding');
  assert.doesNotThrow(() => assertWeekFourBranchE2ESourceContract(actualSource));
  const mutations = [
    actualSource.replace('seedPrerequisite(page: Page)', 'seedPrerequisite(page: Page, raw: string)'),
    actualSource.replace('const raw = JSON.stringify(formalW4M2Prerequisite());', 'const raw = formalW4M2Prerequisite();'),
    actualSource.replace('}, raw);', '}, value);'),
    actualSource.replace('JSON.parse(raw)', "JSON.stringify({ missionCompletionEvidence: { 'w4-m3': { kind: 'formal-v3' } } })"),
    `${actualSource}\nseedPrerequisite(page, 'forged');`,
  ];
  for (const mutated of mutations) {
    assert.notEqual(mutated, actualSource);
    assert.throws(() => assertWeekFourBranchE2ESourceContract(mutated), /seed|raw|prerequisite|addInitScript|injection/i);
  }
});

test('rejects constant element access and property-definition aliases across every progress container', () => {
  const injections = [
    "localStorage['set' + 'Item']('xiyou-programming-progress-v3', JSON.stringify({ missions: { 'w4-m3': {} } }));",
    "page['eval' + 'uate'](() => 'branch-proven');",
    "progress['mis' + 'sions']['w4-m3'] = {};",
    "Object.defineProperty(progress.sessions, 'w4-m3', { value: {} });",
    "Object.defineProperties(progress.works, { 'w4-m3-branch-structure-record': { value: {} } });",
    "const define = Object.defineProperty; define(progress.missionCompletionEvidence, 'w4-m3', { value: {} });",
    "const reflectSet = Reflect.set; const sessions = progress.sessions; reflectSet(sessions, 'w4-m3', {});",
  ];
  for (const injected of injections) {
    assert.throws(() => assertWeekFourBranchE2ESourceContract(`${actualSource}\n${injected}`), /storage|browser proof|mission|session|evidence|work|progress|property/i, injected);
  }
});

test('requires exact storage and CAS fault consumption and clears expected failures after unroute', () => {
  for (const forbidden of ["'fail-w4-m3-storage'", "'fail-w4-m3-external'"]) assert.equal(actualSource.includes(forbidden), false, forbidden);
  const exactWrites = ['draft', 'run', 'observation', 'work', 'completion'].map((stage) => `fail-w4-m3-${stage}`);
  for (const mode of [...exactWrites, 'fail-w4-m3-cas-stale-writer']) assert.equal(actualSource.includes(`'${mode}'`), true, mode);
  const missingWrite = actualSource.replaceAll("await setW4M3Fault(page, 'fail-w4-m3-observation');", '');
  assert.throws(() => assertWeekFourBranchE2ESourceContract(missingWrite), /storage|observation|fault/i);
  const earlyCasClear = actualSource.replace(
    "await expect(page.getByRole('alert')).toContainText('其他标签页已有新的学习进度', { timeout: 25_000 });",
    "await clearW4M3Fault(page, 'fail-w4-m3-cas-stale-writer'); await expect(page.getByRole('alert')).toContainText('其他标签页已有新的学习进度', { timeout: 25_000 });",
  );
  assert.throws(() => assertWeekFourBranchE2ESourceContract(earlyCasClear), /CAS|external|clear/i);
  const noExpectedClear = actualSource.replace("  expectedFailures.set(page, new Set());\n  if (mode === 'fail-w4-m3-runtime-timeout')", "  if (mode === 'fail-w4-m3-runtime-timeout')");
  assert.throws(() => assertWeekFourBranchE2ESourceContract(noExpectedClear), /expected|health|clear/i);
});
