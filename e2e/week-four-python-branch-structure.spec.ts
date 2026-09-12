import { expect, test, type Browser, type Page, type Route, type TestInfo } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { completeMission, createInitialProgress, serializeProgress } from '../src/progress/progress';
import { parseProgress } from '../src/progress/schema';
import { createMissionSession } from '../src/progress/session';
import { recordRun, updateWorkspaceDraft } from '../src/progress/legacyWorkspaceSessionMutations';
import {
  createDefaultManorHelpDraft,
  compileManorHelpDraft,
  runManorHelp,
} from '../src/blockly/weekThreeManorHelpContract';
import {
  compileCuilanBooleanDraft,
  runCuilanBooleanForDraft,
} from '../src/blockly/weekThreeCuilanBooleanContract';
import {
  createDefaultYunzhanDialogueDraft,
  compileYunzhanDialogueDraft,
  runYunzhanDialogueForDraft,
} from '../src/blockly/weekThreeYunzhanDialogueContract';
import {
  createDefaultBajieJoiningDraft,
  compileBajieJoiningDraft,
  runBajieJoiningForDraft,
} from '../src/blockly/weekThreeBajieJoiningContract';
import { compileWeekThreeBossDraft } from '../src/blockly/weekThreeBossCompiler';
import { runWeekThreeBossDraft } from '../src/blockly/weekThreeBossContract';
import { createSolvedWeekThreeBossDraftForTest } from '../src/blockly/weekThreeBossTestHelpers';
import {
  createWeekFourVariableSession,
  recordWeekFourVariableRun,
  updateWeekFourVariableCode,
} from '../src/progress/weekFourVariableSession';
import {
  parseWeekFourVariablePython,
  SOLVED_WEEK_FOUR_VARIABLE_PYTHON,
} from '../src/engine/weekFourVariablePythonGrammar';
import { compileWeekFourMappingDraft } from '../src/blockly/weekFourMappingDraft';
import { compareWeekFourMappingTraces } from '../src/blockly/weekFourMappingContract';
import {
  parseWeekFourMappingPython,
  SOLVED_WEEK_FOUR_MAPPING_PYTHON,
} from '../src/engine/weekFourPythonMappingGrammar';
import {
  createWeekFourMappingSession,
  recordWeekFourMappingRun,
  updateWeekFourMappingCode,
} from '../src/progress/weekFourMappingSession';
import {
  DEFAULT_WEEK_FOUR_BRANCH_PYTHON,
  INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON,
  NESTED_WEEK_FOUR_BRANCH_PYTHON,
  SOLVED_WEEK_FOUR_BRANCH_PYTHON,
} from '../src/engine/weekFourBranchPythonGrammar';
import { PYTHON_RUNTIME_TRANSFER_MAX_BYTES } from '../scripts/budget-limits.mjs';
import {
  collectRuntimeClosure,
  WEEK_FOUR_BRANCH_MAX_LAZY_BYTES,
} from '../scripts/check-bundle-budget.mjs';

const CURRENT_KEY = 'xiyou-programming-progress-v3';
const REVISION_KEY = 'xiyou-programming-progress-revision-v3';
const SNAPSHOT_KEY = 'xiyou-programming-progress-snapshot-v3';
const CORRUPT_KEY = 'xiyou-programming-progress-corrupt-v3';
const MODE_KEY = 'xiyou-test-storage-mode';

type HealthEvent = { kind: 'console' | 'pageerror' | 'requestfailed' | 'response'; url: string; detail: string };
type SourceFaultMode =
  | 'fail-w4-m3-draft'
  | 'fail-w4-m3-run'
  | 'fail-w4-m3-observation'
  | 'fail-w4-m3-work'
  | 'fail-w4-m3-completion'
  | 'fail-w4-m3-corrupt-current'
  | 'fail-w4-m3-cas-stale-writer'
  | 'fail-w4-m3-runtime-load'
  | 'fail-w4-m3-runtime-timeout'
  | 'fail-w4-m3-assets'
  | 'fail-w4-m3-lazy';
type FaultRegistration = { matcher: string | RegExp; handler: (route: Route) => Promise<void> };
type RuntimeFaultEvidence = { workerUrl: string; actualBodyBytes: number; hasPyodideRuntime: boolean; hasAstHarness: boolean; resultDelayMs: number };

const healthEvents = new WeakMap<Page, HealthEvent[]>();
const expectedFailures = new WeakMap<Page, Set<string>>();
const faultRegistrations = new WeakMap<Page, FaultRegistration[]>();
const runtimeFaultEvidence = new WeakMap<Page, RuntimeFaultEvidence>();

function formalW4M2Prerequisite() {
  let progress = createInitialProgress();
  progress = { ...progress, privacy: { localDataNoticeSeen: true } };
  for (const id of [
    'w1-m1', 'w1-m2', 'w1-m3', 'w1-m4', 'w1-m5',
    'w2-m1', 'w2-m2', 'w2-m3', 'w2-m4', 'w2-m5',
  ] as const) progress = completeMission(progress, id, { stars: 3, hintsUsed: 0 });

  const manor = createDefaultManorHelpDraft();
  manor.blocks.find((block) => block.id === 'manor-condition')!.type = 'w3_manor_condition_explicit_demon_help';
  const manorTrace = compileManorHelpDraft(manor);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      'w3-m1': recordRun(
        updateWorkspaceDraft(createMissionSession('w3-m1'), manor, '2026-09-01T00:00:00.000Z'),
        runManorHelp(manorTrace),
        manorTrace,
        '2026-09-01T00:00:01.000Z',
      ),
    },
  };
  progress = completeMission(progress, 'w3-m1', { stars: 3, hintsUsed: 0 });

  const cuilan = createMissionSession('w3-m2');
  const cuilanDraft = structuredClone(cuilan.workspace);
  cuilanDraft.blocks.find((block) => block.id === 'cuilan-identity-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
  const cuilanTrace = compileCuilanBooleanDraft(cuilanDraft);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      'w3-m2': recordRun(
        updateWorkspaceDraft(cuilan, cuilanDraft, '2026-09-01T00:00:02.000Z'),
        runCuilanBooleanForDraft(cuilanDraft, cuilanTrace),
        cuilanTrace,
        '2026-09-01T00:00:03.000Z',
      ),
    },
  };
  progress = completeMission(progress, 'w3-m2', { stars: 3, hintsUsed: 0 });

  const yunzhan = createDefaultYunzhanDialogueDraft();
  yunzhan.blocks.find((block) => block.id === 'yunzhan-condition')!.type = 'w3_yunzhan_condition_pilgrimage_explicit';
  yunzhan.blocks.find((block) => block.id === 'yunzhan-then-action')!.type = 'w3_yunzhan_explain_guanyin_origin';
  yunzhan.blocks.find((block) => block.id === 'yunzhan-else-action')!.type = 'w3_yunzhan_guard_cave';
  const yunzhanTrace = compileYunzhanDialogueDraft(yunzhan);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      'w3-m3': recordRun(
        updateWorkspaceDraft(createMissionSession('w3-m3'), yunzhan, '2026-09-01T00:00:04.000Z'),
        runYunzhanDialogueForDraft(yunzhan, yunzhanTrace),
        yunzhanTrace,
        '2026-09-01T00:00:05.000Z',
      ),
    },
  };
  progress = completeMission(progress, 'w3-m3', { stars: 3, hintsUsed: 0 });

  const bajie = createDefaultBajieJoiningDraft();
  bajie.blocks.find((block) => block.id === 'bajie-boolean-operation')!.operator = 'and';
  const bajieTrace = compileBajieJoiningDraft(bajie);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      'w3-m4': recordRun(
        updateWorkspaceDraft(createMissionSession('w3-m4'), bajie, '2026-09-01T00:00:06.000Z'),
        runBajieJoiningForDraft(bajie, bajieTrace),
        bajieTrace,
        '2026-09-01T00:00:07.000Z',
      ),
    },
  };
  progress = completeMission(progress, 'w3-m4', { stars: 3, hintsUsed: 0 });

  const boss = createSolvedWeekThreeBossDraftForTest();
  const bossCompiled = compileWeekThreeBossDraft(boss);
  if (!bossCompiled.ok) throw new Error('formal W3-M5 prerequisite did not compile');
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      'w3-m5': recordRun(
        updateWorkspaceDraft(createMissionSession('w3-m5'), boss, '2026-09-01T00:00:08.000Z'),
        runWeekThreeBossDraft(boss),
        bossCompiled.trace,
        '2026-09-01T00:00:09.000Z',
      ),
    },
  };
  progress = completeMission(progress, 'w3-m5', { stars: 3, hintsUsed: 0 });

  let mappingSession = updateWeekFourMappingCode(
    createWeekFourMappingSession('2026-09-01T00:00:10.000Z'),
    SOLVED_WEEK_FOUR_MAPPING_PYTHON,
    '2026-09-01T00:00:11.000Z',
  );
  const blocklyTrace = compileWeekFourMappingDraft(mappingSession.workspace).trace;
  const pythonTrace = parseWeekFourMappingPython(mappingSession.pythonCode).trace;
  const mappingRun = compareWeekFourMappingTraces(blocklyTrace, pythonTrace);
  mappingSession = recordWeekFourMappingRun(mappingSession, {
    blocklyTrace,
    pythonTrace,
    run: mappingRun,
  }, '2026-09-01T00:00:12.000Z');
  progress.sessions['w4-m1'] = mappingSession;
  progress = completeMission(progress, 'w4-m1', { stars: 3, hintsUsed: 0 });
  let session = updateWeekFourVariableCode(
    createWeekFourVariableSession('2026-09-01T00:00:13.000Z'),
    SOLVED_WEEK_FOUR_VARIABLE_PYTHON,
    '2026-09-01T00:00:14.000Z',
  );
  const parsed = parseWeekFourVariablePython(session.pythonCode);
  session = recordWeekFourVariableRun(session, {
    canonicalTrace: parsed.trace,
    workerTrace: parsed.trace,
    run: parsed.run,
  }, '2026-09-01T00:00:15.000Z');
  progress.sessions['w4-m2'] = session;
  progress = completeMission(progress, 'w4-m2', { stars: 3, hintsUsed: 0 });
  const serialized = serializeProgress(progress);
  const checked = parseProgress(serialized);
  if (checked.missionCompletionEvidence['w4-m2']?.kind !== 'formal-v3'
    || checked.works['w4-m2-variable-evidence-record']?.run.finalState !== 'evidence-sealed') {
    throw new Error('formal W4-M2 prerequisite is incomplete');
  }
  return serialized;
}
function isExpectedFailure(page: Page, value: string): boolean {
  return [...(expectedFailures.get(page) ?? [])].some((part) => value.includes(part));
}

function attachHealth(page: Page) {
  const events: HealthEvent[] = [];
  healthEvents.set(page, events);
  expectedFailures.set(page, new Set());
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const url = message.location().url || page.url();
    if (!isExpectedFailure(page, url) && !isExpectedFailure(page, message.text())) {
      healthEvents.get(page)?.push({ kind: 'console', url, detail: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    if (!isExpectedFailure(page, error.message)) {
      healthEvents.get(page)?.push({ kind: 'pageerror', url: page.url(), detail: error.message });
    }
  });
  page.on('requestfailed', (request) => {
    if (!isExpectedFailure(page, request.url())) {
      healthEvents.get(page)?.push({
        kind: 'requestfailed',
        url: request.url(),
        detail: request.failure()?.errorText ?? '',
      });
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400 && !isExpectedFailure(page, response.url())) {
      healthEvents.get(page)?.push({ kind: 'response', url: response.url(), detail: `HTTP ${response.status()}` });
    }
  });
}

function allowExpectedFailure(page: Page, fragment: string) {
  expectedFailures.get(page)?.add(fragment);
}

async function setStorageFaultMode(page: Page, mode: string) {
  await page.evaluate(([key, value]) => {
    Storage.prototype.setItem.call(globalThis.localStorage, key, value);
  }, [MODE_KEY, mode]);
}

async function registerFaultRoute(
  page: Page,
  matcher: string | RegExp,
  body: string,
  contentType = 'text/plain',
) {
  const handler = async (route: Route) => {
    allowExpectedFailure(page, route.request().url());
    await route.fulfill({ status: 503, contentType, body });
  };
  const entries = faultRegistrations.get(page) ?? [];
  entries.push({ matcher, handler });
  faultRegistrations.set(page, entries);
  await page.route(matcher, handler);
}

async function setW4M3Fault(page: Page, mode: SourceFaultMode) {
  if (['fail-w4-m3-draft', 'fail-w4-m3-run', 'fail-w4-m3-observation', 'fail-w4-m3-work', 'fail-w4-m3-completion', 'fail-w4-m3-cas-stale-writer'].includes(mode)) {
    await setStorageFaultMode(page, mode);
    return;
  }
  if (mode === 'fail-w4-m3-corrupt-current') {
    await setStorageFaultMode(page, 'fail-w4-m3-corrupt-current');
    return;
  }
  if (mode === 'fail-w4-m3-runtime-load') {
    await registerFaultRoute(page, /pyodide\.mjs(?:\?.*)?$/, 'runtime unavailable');
    return;
  }
  if (mode === 'fail-w4-m3-runtime-timeout') {
    const matcher = /weekFourBranchPython\.worker-[^/]+\.js/;
    const handler = async (route: Route) => {
      const response = await route.fetch();
      const actualBody = await response.text();
      const resultDelayMs = 1_100;
      runtimeFaultEvidence.set(page, {
        workerUrl: route.request().url(),
        actualBodyBytes: new TextEncoder().encode(actualBody).byteLength,
        hasPyodideRuntime: actualBody.includes('pyodide-314.0.2') && actualBody.includes('candidate_code'),
        hasAstHarness: actualBody.includes('import ast, json') && actualBody.includes('validate_and_run'),
        resultDelayMs,
      });
      const resultOnlyDelay = `
const __w4m3ActualPostMessage = self.postMessage.bind(self);
self.postMessage = (message, ...rest) => {
  const forward = () => __w4m3ActualPostMessage(message, ...rest);
  if (message && message.type === 'result') {
    setTimeout(forward, ${resultDelayMs});
    return;
  }
  forward();
};
`;
      await route.fulfill({ response, body: `${resultOnlyDelay}\n${actualBody}`, contentType: 'application/javascript' });
    };
    const entries = faultRegistrations.get(page) ?? [];
    entries.push({ matcher, handler });
    faultRegistrations.set(page, entries);
    await page.route(matcher, handler);
    return;
  }
  if (mode === 'fail-w4-m3-assets') {
    await registerFaultRoute(page, /old-woman-visitor\.webp(?:\?.*)?$/, 'asset unavailable');
    return;
  }
  const matcher = /WeekFourBranchExperience-[^/]+\.js(?:\?.*)?$/;
  let failed = false;
  const handler = async (route: Route) => {
    if (failed) {
      await route.continue();
      return;
    }
    failed = true;
    allowExpectedFailure(page, route.request().url());
    await route.fulfill({ status: 503, contentType: 'application/javascript', body: 'lazy chunk unavailable' });
  };
  faultRegistrations.set(page, [{ matcher, handler }]);
  await page.route(matcher, handler);
}

async function clearW4M3Fault(page: Page, mode: SourceFaultMode) {
  await setStorageFaultMode(page, 'off');
  for (const registration of faultRegistrations.get(page) ?? []) {
    await page.unroute(registration.matcher, registration.handler);
  }
  faultRegistrations.delete(page);
  expectedFailures.set(page, new Set());
  if (mode === 'fail-w4-m3-runtime-timeout') {
    const matcher = /weekFourBranchPython\.worker-[^/]+\.js/;
    const restoreActualWorker = async (route: Route) => {
      const response = await route.fetch();
      const actualBody = await response.text();
      await route.fulfill({ response, body: actualBody, contentType: 'application/javascript' });
    };
    faultRegistrations.set(page, [{ matcher, handler: restoreActualWorker }]);
    await page.route(matcher, restoreActualWorker);
  }
}

async function seedPrerequisite(page: Page) {
  const raw = JSON.stringify(formalW4M2Prerequisite());
  await page.addInitScript((raw) => {
    if (Storage.prototype.getItem.call(globalThis.localStorage, 'xiyou-programming-progress-v3') !== null) return;
    Storage.prototype.setItem.call(globalThis.localStorage, 'xiyou-programming-progress-v3', JSON.parse(raw));
    Storage.prototype.setItem.call(globalThis.localStorage, 'xiyou-programming-progress-revision-v3', '0');
  }, raw);
}

async function stored(page: Page): Promise<any> {
  return page.evaluate((key) => {
    const raw = Storage.prototype.getItem.call(globalThis.localStorage, key);
    return raw === null ? null : JSON.parse(raw);
  }, CURRENT_KEY);
}

async function storageBytes(page: Page) {
  return page.evaluate(([current, revision]) => ({
    current: Storage.prototype.getItem.call(globalThis.localStorage, current),
    revision: Storage.prototype.getItem.call(globalThis.localStorage, revision),
  }), [CURRENT_KEY, REVISION_KEY]);
}

async function gotoBranches(page: Page) {
  await page.goto('./#/mission/w4-m3');
  await expect(page.getByRole('heading', { name: '同样的外形，一次只走一条路线' })).toBeVisible();
  await expect(page.getByLabel('W4-M3 Python 代码')).toBeVisible();
  await expect(page.getByRole('button', { name: '运行分支' })).toBeEnabled({ timeout: 25_000 });
}

async function waitReady(page: Page) {
  await expect(page.getByRole('status', { name: 'Python 运行环境已准备' })).toBeVisible({ timeout: 25_000 });
}

async function chooseElse(page: Page) {
  const button = page.getByRole('button', { name: '使用 else:' });
  await expect(button).toBeEnabled();
  await button.click();
  await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.pythonCode).toContain('\nelse:\n');
}

async function chooseIndent(page: Page) {
  const button = page.getByRole('button', { name: '缩进 4 空格' });
  await expect(button).toBeEnabled();
  await button.click();
  await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.pythonCode).toContain('\n    polite_help()');
}

async function solveWithControls(page: Page) {
  const code = (await stored(page)).sessions['w4-m3']?.pythonCode as string;
  if (!code.includes('\nelse:\n')) await chooseElse(page);
  if (!(await stored(page)).sessions['w4-m3']?.pythonCode.endsWith('\n    polite_help()')) await chooseIndent(page);
}

async function runBranch(page: Page) {
  await page.getByRole('button', { name: '运行分支' }).click();
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}-${testInfo.project.name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(`${name}-${testInfo.project.name}.png`, { path, contentType: 'image/png' });
}

async function openParent(page: Page) {
  await page.goto('./#/parent');
  const acknowledge = page.getByRole('button', { name: '我知道了', exact: true });
  if (await acknowledge.isVisible()) await acknowledge.click();
  const report = page.getByRole('button', { name: '导出进度', exact: true });
  const login = page.getByLabel('家长 PIN', { exact: true });
  const setup = page.getByLabel('设置 4 位家长 PIN', { exact: true });
  await expect(report.or(login).or(setup)).toBeVisible();
  if (await report.isVisible()) return;
  if (await login.isVisible()) {
    await login.fill('4826');
    await page.getByRole('button', { name: '进入周报', exact: true }).click();
    await expect(report).toBeVisible();
    return;
  }
  await setup.fill('4826');
  const confirm = page.getByLabel('确认家长 PIN', { exact: true });
  await confirm.fill('4826');
  await expect.poll(async () => {
    if (await setup.inputValue() !== '4826') await setup.fill('4826');
    if (await confirm.inputValue() !== '4826') await confirm.fill('4826');
    return [await setup.inputValue(), await confirm.inputValue()];
  }).toEqual(['4826', '4826']);
  await page.getByRole('button', { name: '创建家长 PIN', exact: true }).click();
  await page.getByLabel('我已安全保存恢复码').check();
  await page.getByRole('button', { name: '确认已保存并进入', exact: true }).click();
  await expect(report).toBeVisible();
}

async function newPrerequisitePage(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  attachHealth(page);
  await seedPrerequisite(page);
  return { context, page };
}

test.describe('W4-M3 Python 分支结构真实浏览器证据', () => {
  test.beforeEach(async ({ page }) => {
    attachHealth(page);
    await seedPrerequisite(page);
  });

  test.afterEach(async ({ page }) => {
    expect(healthEvents.get(page), 'unexpected W4-M3 browser health events').toEqual([]);
  });

  test('@w4-m3-full visible conflict, nested missing, invalid structure, proven work, replay, export-import, parent summary, and W4-M4', async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000);
    await page.goto('./#/mission/w4-m3');
    await expect(page.getByLabel('W4-M3 Python 代码')).toBeVisible();
    await page.getByLabel('W4-M3 Python 代码').press('End');
    await waitReady(page);
    const beforeReview = await stored(page);
    await page.getByText('回看上一关变量取证', { exact: true }).click();
    const review = page.getByRole('region', { name: 'W4-M2 只读取证摘要' });
    await expect(review).toBeVisible();
    await expect(review.getByRole('button')).toHaveCount(0);
    await expect(review).not.toContainText(/identity|appearance|fiery_eye_check|seal_record/);
    expect(await stored(page)).toEqual(beforeReview);
    await attachScreenshot(page, testInfo, 'w4m3-default');

    await page.getByRole('button', { name: '运行分支' }).click();
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('两条路线同时发生', { timeout: 25_000 });
    const conflict = await stored(page);
    expect(conflict.sessions['w4-m3']?.lastRun?.state).toBe('branch-conflict');
    expect(conflict.sessions['w4-m3']?.branchConflictFailures).toBe(1);
    expect(conflict.sessions['w4-m3']?.branchMissingFailures).toBe(0);
    await attachScreenshot(page, testInfo, 'w4m3-conflict');
    await page.getByRole('button', { name: '火眼金睛：观察实际路线' }).click();
    await expect(page.getByRole('status', { name: '已保存的实际路线' })).toBeVisible();
    const observed = await stored(page);
    expect(observed.sessions['w4-m3'].pythonCode).toBe(conflict.sessions['w4-m3'].pythonCode);
    expect(observed.sessions['w4-m3'].lastRun).toEqual(conflict.sessions['w4-m3'].lastRun);

    await runBranch(page);
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('两条路线同时发生');
    await expect(page.getByRole('status', { name: '已保存的实际路线' })).toHaveCount(0);
    const repeated = await stored(page);
    expect(repeated.sessions['w4-m3'].totalRuns).toBe(2);
    expect(repeated.sessions['w4-m3'].conditionObservationUses).toEqual([]);
    await page.getByRole('button', { name: '火眼金睛：观察实际路线' }).click();
    await expect(page.getByRole('status', { name: '已保存的实际路线' })).toBeVisible();
    expect((await stored(page)).sessions['w4-m3'].conditionObservationUses).toHaveLength(1);

    await chooseIndent(page);
    await runBranch(page);
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('原著卡路线冲突，练习卡没有路线', { timeout: 25_000 });
    const nested = await stored(page);
    expect(nested.sessions['w4-m3'].pythonCode).toBe(NESTED_WEEK_FOUR_BRANCH_PYTHON);
    expect(nested.sessions['w4-m3'].branchConflictFailures).toBe(3);
    expect(nested.sessions['w4-m3'].branchMissingFailures).toBe(1);

    await chooseElse(page);
    await page.getByRole('button', { name: '置于条件外' }).click();
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.pythonCode).toBe(INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON);
    const invalidBefore = await stored(page);
    await runBranch(page);
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('Python 结构或缩进未通过', { timeout: 25_000 });
    const invalidAfter = await stored(page);
    expect(invalidAfter.sessions['w4-m3'].validationFailures).toBe(invalidBefore.sessions['w4-m3'].validationFailures + 1);
    expect(invalidAfter.sessions['w4-m3'].totalRuns).toBe(invalidBefore.sessions['w4-m3'].totalRuns);
    await expect(page.getByRole('combobox', { name: '礼貌帮助缩进' })).toBeFocused();

    await attachScreenshot(page, testInfo, 'w4m3-invalid');

    await chooseIndent(page);
    await runBranch(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    const completed = await stored(page);
    expect(completed.sessions['w4-m3'].pythonCode).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    expect(completed.sessions['w4-m3'].lastRun.completed).toBe(true);
    expect(completed.missions['w4-m3']?.attempts).toBe(1);
    expect(completed.missionCompletionEvidence['w4-m3']?.kind).toBe('formal-v3');
    expect(completed.works['w4-m3-branch-structure-record']?.run.completed).toBe(true);

    await page.reload();
    await expect(page.getByRole('heading', { name: '同样的外形，一次只走一条路线' })).toBeVisible();
    await waitReady(page);
    await expect(page.getByRole('note')).toContainText('孙悟空安全地再次核验');
    await attachScreenshot(page, testInfo, 'w4m3-proven');
    const replayBefore = await stored(page);
    await runBranch(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    expect(await stored(page)).toEqual(replayBefore);

    await openParent(page);
    const summary = page.getByRole('region', { name: '第四周分支结构学习摘要' });
    await expect(summary).toContainText('已运行 4 次');
    await expect(summary).toContainText('分支同时执行 3 次');
    await expect(summary).toContainText('分支没有执行 1 次');
    await expect(summary).toContainText('正式分支结构证明与作品已保存');
    await expect(summary).not.toContainText(/identity|else:|pythonCode|trace|snapshotId|白骨精/);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出进度', exact: true }).click();
    const exportedPath = await (await download).path();
    expect(exportedPath).not.toBeNull();
    const exportedBytes = readFileSync(exportedPath!);
    const exported = JSON.parse(exportedBytes.toString('utf8'));
    await page.getByRole('button', { name: '清空学习数据', exact: true }).click();
    await page.getByLabel('输入“清空”以确认').fill('清空');
    const clearBackup = page.waitForEvent('download');
    await page.getByRole('button', { name: '备份并清空', exact: true }).click();
    await clearBackup;
    await expect.poll(async () => await stored(page)).toEqual(createInitialProgress());
    await openParent(page);
    await page.getByLabel('选择进度文件').setInputFiles({
      name: 'w4-m3-progress.json',
      mimeType: 'application/json',
      buffer: exportedBytes,
    });
    await expect.poll(async () => await stored(page)).toEqual(exported);
    await page.goto('./#/mission/w4-m3');
    const importedBeforeReplay = await stored(page);
    await runBranch(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    expect(await stored(page)).toEqual(importedBeforeReplay);
    await page.goto('./#/mission/w4-m4');
    await expect(page.getByRole('heading', { name: '第三次变化' })).toBeVisible();
  });

  test('@w4-m3-keyboard direct else input and Tab indentation complete the pure-keyboard route with focus feedback', async ({ page }) => {
    await page.goto('./#/mission/w4-m3');
    const editor = page.getByLabel('W4-M3 Python 代码');
    await editor.press('ControlOrMeta+A');
    await page.keyboard.insertText(INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON);
    await page.keyboard.press('End');
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.pythonCode).toBe(INVALID_ELSE_WEEK_FOUR_BRANCH_PYTHON);
    await editor.press('End');
    await editor.press('Tab');
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.pythonCode).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    await expect(page.getByRole('status', { name: '分支运行结果' })).toBeVisible();
    await page.getByRole('button', { name: '运行分支' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
  });

  test('@w4-m3-mouse mouse controls change connector and indentation before the visible run', async ({ page }) => {
    await page.goto('./#/mission/w4-m3');
    await page.getByLabel('W4-M3 Python 代码').press('End');
    await page.getByRole('button', { name: '使用 else:' }).click();
    await page.getByRole('button', { name: '缩进 4 空格' }).click();
    await expect(page.getByRole('status', { name: '分支运行结果' })).toBeVisible();
    await page.getByRole('button', { name: '运行分支' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    expect((await stored(page)).sessions['w4-m3'].pythonCode).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
  });

  test('@w4-m3-touch touchscreen taps both visible controls and completes without hidden state', async ({ page }) => {
    await page.goto('./#/mission/w4-m3');
    await page.getByLabel('W4-M3 Python 代码').press('End');
    const connector = page.getByRole('button', { name: '使用 else:' });
    await expect(connector).toBeEnabled();
    await connector.scrollIntoViewIfNeeded();
    const connectorBox = await connector.boundingBox();
    expect(connectorBox).not.toBeNull();
    await page.touchscreen.tap(connectorBox!.x + connectorBox!.width / 2, connectorBox!.y + connectorBox!.height / 2);
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.pythonCode).toContain('\nelse:\n');
    const indent = page.getByRole('button', { name: '缩进 4 空格' });
    await expect(indent).toBeEnabled();
    await indent.scrollIntoViewIfNeeded();
    const indentBox = await indent.boundingBox();
    expect(indentBox).not.toBeNull();
    await page.touchscreen.tap(indentBox!.x + indentBox!.width / 2, indentBox!.y + indentBox!.height / 2);
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.pythonCode).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    await expect(page.getByRole('status', { name: '分支运行结果' })).toBeVisible();
    await page.getByRole('button', { name: '运行分支' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    expect((await stored(page)).missionCompletionEvidence['w4-m3']?.kind).toBe('formal-v3');
  });

  test('@w4-m3-accessibility named regions, live result, focused error, modal focus trap, and pure keyboard path work', async ({ page }) => {
    await page.goto('./#/mission/w4-m3');
    const editor = page.getByLabel('W4-M3 Python 代码');
    await editor.focus();
    await editor.press('End');
    await expect(page.getByLabel('白虎岭分支核验舞台')).toBeVisible();
    await expect(page.getByRole('region', { name: '公开分支核验卡' })).toBeVisible();
    await expect(page.locator('.week-four-branch-preview-feedback')).toHaveAttribute('aria-live', 'polite');
    await page.getByRole('button', { name: '使用 else:' }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '运行分支' }).click();
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('Python 结构或缩进未通过', { timeout: 25_000 });
    await expect(page.getByRole('combobox', { name: '礼貌帮助缩进' })).toBeFocused();
    await page.getByRole('button', { name: '缩进 4 空格' }).focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.pythonCode).toBe(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    const runButton = page.getByRole('button', { name: '运行分支' });
    await expect(runButton).toBeEnabled();
    await runButton.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', { name: '闯关成功' });
    await expect(dialog).toBeVisible({ timeout: 25_000 });
    await expect(dialog.getByRole('button', { name: '继续下一关' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: '回成长地图' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: '继续下一关' })).toBeFocused();
  });

  test('@w4-m3-narrow responsive layout preserves DOM order, 44px targets, and no horizontal overflow', async ({ page }) => {
    await page.goto('./#/mission/w4-m3');
    await page.getByLabel('W4-M3 Python 代码').press('End');
    await page.getByRole('button', { name: '缩进 4 空格' }).click();
    await expect(page.getByRole('status', { name: '分支运行结果' })).toBeVisible();
    await page.getByRole('button', { name: '运行分支' }).click();
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('原著卡路线冲突', { timeout: 25_000 });
    const metrics = await page.locator('.week-four-branch-layout').evaluate((node) => ({
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    const geometry = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width);
    const order = await page.locator('.week-four-branch-layout > *').evaluateAll((nodes) => nodes.map((node) => node.className));
    expect(order.slice(0, 4).join(' ')).toMatch(/scene[\s\S]*work-review[\s\S]*python-panel[\s\S]*preview-feedback/);
    for (const button of await page.locator('.week-four-branch-experience button:visible').all()) {
      const box = await button.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
  });

  test('@w4-m3-parent parent report summarizes real saved branch learning without answer leakage', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('./#/mission/w4-m3');
    await page.getByLabel('W4-M3 Python 代码').press('End');
    await page.getByRole('button', { name: '使用 else:' }).click();
    await page.getByRole('button', { name: '缩进 4 空格' }).click();
    await expect(page.getByRole('status', { name: '分支运行结果' })).toBeVisible();
    await page.getByRole('button', { name: '运行分支' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    await openParent(page);
    await expect(page.getByRole('heading', { name: '家长周报' })).toBeVisible();
    const report = page.getByRole('region', { name: '第四周分支结构学习摘要' });
    await expect(report).toContainText('正式分支结构证明与作品已保存');
    await expect(report).not.toContainText(/identity|else:|pythonCode|source|trace|workId|snapshotId|cardId|白骨精/);

    const clearBefore = await stored(page);
    await page.getByRole('button', { name: '清空学习数据', exact: true }).click();
    await page.getByLabel('输入“清空”以确认').fill('清空');
    const backup = page.waitForEvent('download');
    await page.getByRole('button', { name: '备份并清空', exact: true }).click();
    const backupPath = await (await backup).path();
    expect(backupPath).not.toBeNull();
    expect(JSON.parse(readFileSync(backupPath!, 'utf8'))).toEqual(clearBefore);
    await expect.poll(async () => await stored(page)).toEqual(createInitialProgress());
    const cleared = await stored(page);
    expect(cleared.sessions['w4-m3']).toBeUndefined();
    expect(cleared.works['w4-m3-branch-structure-record']).toBeUndefined();
    expect(cleared.missionCompletionEvidence['w4-m3']).toBeUndefined();
    expect(cleared.missions['w4-m3']).toBeUndefined();
    expect(cleared.schemaRevision).toBe(19);
    expect(cleared.settings).toEqual(createInitialProgress().settings);
    expect(cleared.privacy).toEqual(createInitialProgress().privacy);
    await page.goto('./#/mission/w4-m3');
    await page.getByRole('button', { name: '我知道了', exact: true }).click();
    await expect(page.getByRole('heading', { name: '先完成上一关的正式验证' })).toBeVisible();

    await openParent(page);
    await page.getByLabel('选择进度文件').setInputFiles({
      name: 'formal-w4-m2-prerequisite.json',
      mimeType: 'application/json',
      buffer: Buffer.from(formalW4M2Prerequisite()),
    });
    await expect.poll(async () => (await stored(page)).missionCompletionEvidence['w4-m2']?.kind).toBe('formal-v3');
    await page.goto('./#/mission/w4-m3');
    await expect(page.getByRole('heading', { name: '同样的外形，一次只走一条路线' })).toBeVisible();
    const newFormal = await stored(page);
    expect(newFormal.sessions['w4-m3'].pythonCode).toBe(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    expect(newFormal.missions['w4-m3']).toBeUndefined();
    expect(newFormal.missionCompletionEvidence['w4-m3']).toBeUndefined();
    expect(newFormal.works['w4-m3-branch-structure-record']).toBeUndefined();

    const legacyCompletedAt = '2026-08-31T23:59:00.000Z';
    const legacyBase = JSON.parse(formalW4M2Prerequisite());
    const legacyRaw = JSON.stringify({
      ...legacyBase,
      schemaRevision: 9,
      missions: {
        ...legacyBase.missions,
        'w4-m3': {
          status: 'completed', stars: 2, attempts: 7, hintsUsed: 3, completedAt: legacyCompletedAt,
        },
      },
    });
    const migratedLegacy = parseProgress(legacyRaw);
    expect(migratedLegacy.missionCompletionEvidence['w4-m3']).toMatchObject({
      kind: 'legacy-replay-only', sourceVersion: 3, sourceSchemaRevision: 9,
    });
    await openParent(page);
    await page.getByLabel('选择进度文件').setInputFiles({
      name: 'legacy-w4-m3-revision-9.json',
      mimeType: 'application/json',
      buffer: Buffer.from(legacyRaw),
    });
    await expect.poll(async () => (await stored(page)).missionCompletionEvidence['w4-m3']?.kind).toBe('legacy-replay-only');
    await gotoBranches(page);
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']).toBeDefined();
    await solveWithControls(page);
    await runBranch(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    const upgraded = await stored(page);
    expect(upgraded.missions['w4-m3']).toEqual({
      status: 'completed', stars: 2, attempts: 7, hintsUsed: 3, completedAt: legacyCompletedAt,
    });
    expect(upgraded.missionCompletionEvidence['w4-m3']?.kind).toBe('formal-v3');
    expect(upgraded.works['w4-m3-branch-structure-record']).toBeDefined();
  });

  test('@w4-m3-work one visible solved run atomically saves current code, work, proof, mission, and timestamps', async ({ page }) => {
    await page.goto('./#/mission/w4-m3');
    await page.getByLabel('W4-M3 Python 代码').press('End');
    await page.getByRole('button', { name: '使用 else:' }).click();
    await page.getByRole('button', { name: '缩进 4 空格' }).click();
    await page.getByRole('button', { name: '运行分支' }).click();
    await expect(page.getByRole('status', { name: '分支运行结果' })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible();
    const progress = await stored(page);
    const work = progress.works['w4-m3-branch-structure-record'];
    const proof = progress.missionCompletionEvidence['w4-m3'];
    const mission = progress.missions['w4-m3'];
    expect(work.pythonCode).toBe(progress.sessions['w4-m3'].pythonCode);
    expect(work.run).toEqual(progress.sessions['w4-m3'].lastRun);
    expect(proof.run).toEqual(work.run);
    expect(proof.completedAt).toBe(mission.completedAt);
    expect(proof.verifiedAt).toBe(work.verifiedAt);
    expect(Date.parse(progress.sessions['w4-m3'].lastRunAt)).toBeLessThanOrEqual(Date.parse(work.createdAt));
    expect(JSON.stringify(work)).not.toMatch(/expected|answer|solution/i);
  });

  test('@w4-m3-storage five exact write faults fail closed and retry the same candidate without duplicate Worker runs', async ({ page, browser }) => {
    test.setTimeout(120_000);
    await page.goto('./');
    await setW4M3Fault(page, 'fail-w4-m3-draft');
    await page.goto('./#/mission/w4-m3');
    await expect(page.getByRole('alert')).toBeVisible();
    const pristine = await stored(page);
    expect(pristine.sessions['w4-m3']).toBeUndefined();
    await clearW4M3Fault(page, 'fail-w4-m3-draft');
    await page.getByRole('button', { name: '重试保存' }).click();
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.pythonCode).toBe(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);

    await chooseIndent(page);
    await setW4M3Fault(page, 'fail-w4-m3-run');
    await runBranch(page);
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 25_000 });
    const failedRun = await stored(page);
    expect(failedRun.sessions['w4-m3'].totalRuns).toBe(0);
    await clearW4M3Fault(page, 'fail-w4-m3-run');
    await page.getByRole('button', { name: '重试保存' }).click();
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.totalRuns).toBe(1);
    const savedRun = await stored(page);
    expect(savedRun.sessions['w4-m3'].pythonCode).toBe(NESTED_WEEK_FOUR_BRANCH_PYTHON);
    expect(savedRun.sessions['w4-m3'].branchMissingFailures).toBe(1);

    await setW4M3Fault(page, 'fail-w4-m3-observation');
    await page.getByRole('button', { name: '火眼金睛：观察实际路线' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await clearW4M3Fault(page, 'fail-w4-m3-observation');
    await page.getByRole('button', { name: '重试保存' }).click();
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.conditionObservationUses).toHaveLength(1);
    const afterObservation = await stored(page);
    expect(afterObservation.sessions['w4-m3'].pythonCode).toBe(savedRun.sessions['w4-m3'].pythonCode);
    expect(afterObservation.sessions['w4-m3'].lastRun).toEqual(savedRun.sessions['w4-m3'].lastRun);

    for (const mode of ['fail-w4-m3-work', 'fail-w4-m3-completion'] as const) {
      const fresh = await newPrerequisitePage(browser);
      try {
        await gotoBranches(fresh.page);
        await solveWithControls(fresh.page);
        await setW4M3Fault(fresh.page, mode);
        await runBranch(fresh.page);
        await expect(fresh.page.getByRole('alert')).toBeVisible({ timeout: 25_000 });
        const beforeRetry = await stored(fresh.page);
        expect(beforeRetry.sessions['w4-m3'].totalRuns).toBe(1);
        expect(beforeRetry.works['w4-m3-branch-structure-record']).toBeUndefined();
        expect(beforeRetry.missionCompletionEvidence['w4-m3']).toBeUndefined();
        expect(beforeRetry.missions['w4-m3']).toBeUndefined();
        await clearW4M3Fault(fresh.page, mode);
        await fresh.page.getByRole('button', { name: '重试保存' }).click();
        await expect.poll(async () => (await stored(fresh.page)).missionCompletionEvidence['w4-m3']?.kind).toBe('formal-v3');
        const afterRetry = await stored(fresh.page);
        expect(afterRetry.sessions['w4-m3'].totalRuns).toBe(1);
        expect(afterRetry.works['w4-m3-branch-structure-record']).toBeDefined();
      } finally {
        expect(healthEvents.get(fresh.page)).toEqual([]);
        await fresh.context.close();
      }
    }
  });

  test('@w4-m3-external stale tab keeps its backup and explicitly loads the newer revision', async ({ page, context }) => {
    await page.goto('./');
    await setW4M3Fault(page, 'fail-w4-m3-cas-stale-writer');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let workerStarted = false;
    await page.route(/weekFourBranchPython\.worker-[^/]+\.js/, async (route) => {
      workerStarted = true;
      await gate;
      await route.continue();
    });
    await page.goto('./#/mission/w4-m3');
    await expect(page.getByRole('heading', { name: '同样的外形，一次只走一条路线' })).toBeVisible();
    await expect(page.getByRole('button', { name: '运行分支' })).toBeEnabled({ timeout: 25_000 });
    let writer: Page | null = null;
    try {
      const staleCode = await page.getByLabel('W4-M3 Python 代码').innerText();
      await page.getByRole('button', { name: '运行分支' }).click();
      await expect.poll(() => workerStarted).toBe(true);
      writer = await context.newPage();
      attachHealth(writer);
      await gotoBranches(writer);
      await chooseIndent(writer);
      const currentRevision = await writer.evaluate((key) => Storage.prototype.getItem.call(globalThis.localStorage, key), REVISION_KEY);
      release();
      await expect(page.getByRole('alert')).toContainText('其他标签页已有新的学习进度', { timeout: 25_000 });
      expect(await page.evaluate((key) => Storage.prototype.getItem.call(globalThis.localStorage, key), MODE_KEY)).toBe('fail-w4-m3-cas-stale-writer');
      await clearW4M3Fault(page, 'fail-w4-m3-cas-stale-writer');
      const backupDownload = page.waitForEvent('download');
      await page.getByRole('button', { name: '下载当前 Python 备份' }).click();
      const backupPath = await (await backupDownload).path();
      expect(backupPath).not.toBeNull();
      const backupProgress = JSON.parse(readFileSync(backupPath!, 'utf8'));
      expect(backupProgress.sessions['w4-m3'].pythonCode).toBe(staleCode.trim());
      await page.getByRole('button', { name: '载入其他标签页进度' }).click();
      await expect(page.getByLabel('W4-M3 Python 代码')).toContainText('    polite_help()');
      expect(await page.evaluate((key) => Storage.prototype.getItem.call(globalThis.localStorage, key), REVISION_KEY)).toBe(currentRevision);
    } finally {
      release();
      if (writer) {
        expect(healthEvents.get(writer)).toEqual([]);
        await writer.close();
      }
    }
  });

  test('@w4-m3-corrupt corrupt current bytes download byte-identically, restore snapshot, replay, and malformed import preserves current', async ({ page }) => {
    await gotoBranches(page);
    await solveWithControls(page);
    await runBranch(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    const completed = await stored(page);
    await openParent(page);
    await page.getByRole('button', { name: '关闭声音' }).click();
    await page.getByRole('button', { name: '开启声音' }).click();
    const legalSnapshot = await page.evaluate((key) => Storage.prototype.getItem.call(globalThis.localStorage, key), SNAPSHOT_KEY);
    expect(legalSnapshot).not.toBeNull();
    await setW4M3Fault(page, 'fail-w4-m3-corrupt-current');
    await page.reload();
    await expect(page.getByText('学习进度已经安全恢复')).toBeVisible();
    await clearW4M3Fault(page, 'fail-w4-m3-corrupt-current');
    const corruptBytes = await page.evaluate((key) => Storage.prototype.getItem.call(globalThis.localStorage, key), CORRUPT_KEY);
    expect(corruptBytes).not.toBeNull();
    const recovered = await stored(page);
    expect(recovered.schemaRevision).toBe(19);
    expect(recovered.recovery).toMatchObject({ source: 'snapshot' });
    expect(recovered.sessions['w4-m3'].lastRun).toEqual(completed.sessions['w4-m3'].lastRun);
    expect(recovered.works['w4-m3-branch-structure-record']).toEqual(completed.works['w4-m3-branch-structure-record']);
    await openParent(page);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '下载损坏原文' }).click();
    const downloadedPath = await (await download).path();
    expect(downloadedPath).not.toBeNull();
    expect(readFileSync(downloadedPath!, 'utf8')).toBe(corruptBytes);
    expect(JSON.parse(corruptBytes!).current).toBe('{broken w4-m3 current');
    const currentBeforeMalformed = await page.evaluate((key) => Storage.prototype.getItem.call(globalThis.localStorage, key), CURRENT_KEY);
    await page.getByLabel('选择进度文件').setInputFiles({ name: 'malformed.json', mimeType: 'application/json', buffer: Buffer.from('{bad') });
    await expect(page.getByRole('alert').filter({ hasText: '导入失败' })).toBeVisible();
    expect(await page.evaluate((key) => Storage.prototype.getItem.call(globalThis.localStorage, key), CURRENT_KEY)).toBe(currentBeforeMalformed);
    await page.goto('./#/mission/w4-m3');
    const replayBefore = await storageBytes(page);
    await runBranch(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    expect(await storageBytes(page)).toEqual(replayBefore);
  });

  test('@w4-m3-python-security built Worker rejects every disallowed request without mutating storage bytes', async ({ page }) => {
    await gotoBranches(page);
    await waitReady(page);
    const before = await storageBytes(page);
    const probe = await page.evaluate(async () => {
      const workerUrl = performance.getEntriesByType('resource').map((entry) => entry.name)
        .find((url) => url.includes('weekFourBranchPython.worker-'));
      if (!workerUrl) throw new Error('built W4-M3 Worker is missing');
      const worker = new Worker(workerUrl, { type: 'module' });
      const inputs = [
        ['syntax', 'if identity =='], ['import', 'import os'], ['open', "open('save.txt')"],
        ['js', 'from js import fetch'], ['attribute', 'identity.__class__'], ['subscript', 'identity[0]'],
        ['eval', 'eval("1")'], ['dunder', '__import__("os")'], ['assignment', 'identity = "x"'],
        ['while', 'while True: pass'], ['for', 'for x in []: pass'], ['def', 'def f(): pass'],
        ['try', 'try:\n    pass\nexcept:\n    pass'], ['unknown-action', 'unknown_action()'],
        ['infinite-loop', 'while True:\n    continue'],
      ] as const;
      const results: Array<{ label: string; requestId: number; type: string }> = [];
      try {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('worker ready timeout')), 20_000);
          worker.onmessage = (event) => {
            if (event.data?.type === 'ready') { clearTimeout(timer); resolve(); }
            if (event.data?.type === 'load-error') { clearTimeout(timer); reject(new Error(event.data.error)); }
          };
        });
        let requestId = 0;
        for (const [label, code] of inputs) {
          requestId += 1;
          const response = await Promise.race([
            new Promise<any>((resolve) => {
              worker.onmessage = (event) => {
                if (event.data?.requestId === requestId) resolve(event.data);
              };
              worker.postMessage({ type: 'run', requestId, code });
            }),
            new Promise<string>((resolve) => setTimeout(() => resolve('timeout'), 1_100)),
          ]);
          results.push({ label, requestId, type: response === 'timeout' ? 'timeout' : response?.type ?? 'missing' });
        }
      } finally {
        worker.terminate();
      }
      return results;
    });
    expect(probe).toHaveLength(15);
    expect(probe.every((result) => result.type === 'error' || result.type === 'timeout')).toBe(true);
    expect(new Set(probe.map((result) => result.requestId)).size).toBe(probe.length);
    expect(await storageBytes(page)).toEqual(before);
  });

  test('@w4-m3-runtime-fault real load and timeout failures count exact starts and retry the same saved candidate', async ({ page }) => {
    const workerRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('weekFourBranchPython.worker-')) workerRequests.push(request.url());
    });
    await setW4M3Fault(page, 'fail-w4-m3-runtime-load');
    await page.goto('./#/mission/w4-m3');
    await page.getByRole('button', { name: '运行分支' }).click();
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('Python 运行环境故障已保存', { timeout: 25_000 });
    const loadFailed = await stored(page);
    expect(loadFailed.sessions['w4-m3'].runnerInfrastructureFailures).toBe(1);
    expect(loadFailed.sessions['w4-m3'].totalRuns).toBe(0);
    await clearW4M3Fault(page, 'fail-w4-m3-runtime-load');
    await runBranch(page);
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('两条路线同时发生', { timeout: 25_000 });
    const recovered = await stored(page);
    expect(recovered.sessions['w4-m3'].runnerInfrastructureFailures).toBe(1);
    expect(recovered.sessions['w4-m3'].totalRuns).toBe(1);
    expect(recovered.sessions['w4-m3'].pythonCode).toBe(loadFailed.sessions['w4-m3'].pythonCode);

    await page.goto('./');
    await setW4M3Fault(page, 'fail-w4-m3-runtime-timeout');
    await page.goto('./#/mission/w4-m3');
    await expect(page.getByRole('button', { name: '运行分支' })).toBeEnabled({ timeout: 25_000 });
    await runBranch(page);
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('Python 运行环境故障已保存', { timeout: 25_000 });
    const timedOut = await stored(page);
    expect(timedOut.sessions['w4-m3'].runnerInfrastructureFailures).toBe(2);
    expect(timedOut.sessions['w4-m3'].totalRuns).toBe(2);
    const timeoutEvidence = runtimeFaultEvidence.get(page);
    expect(timeoutEvidence).toMatchObject({
      hasPyodideRuntime: true,
      hasAstHarness: true,
      resultDelayMs: 1_100,
    });
    expect(timeoutEvidence?.workerUrl).toMatch(/weekFourBranchPython\.worker-[^/]+\.js/);
    expect(timeoutEvidence?.actualBodyBytes ?? 0).toBeGreaterThan(1_000);
    const timeoutWorkerRequests = workerRequests.length;
    expect(timeoutWorkerRequests).toBeGreaterThan(0);
    await clearW4M3Fault(page, 'fail-w4-m3-runtime-timeout');
    await runBranch(page);
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('两条路线同时发生', { timeout: 25_000 });
    const retried = await stored(page);
    expect(retried.sessions['w4-m3'].runnerInfrastructureFailures).toBe(2);
    expect(retried.sessions['w4-m3'].totalRuns).toBe(3);
    expect(retried.sessions['w4-m3'].pythonCode).toBe(timedOut.sessions['w4-m3'].pythonCode);
    expect(workerRequests.length).toBeGreaterThan(timeoutWorkerRequests);
  });

  test('@w4-m3-asset-fault failed local scene asset blocks completion, same URL retry succeeds, no duplicate Worker, and local 404 is real', async ({ page, request }) => {
    await setW4M3Fault(page, 'fail-w4-m3-assets');
    await page.goto('./#/mission/w4-m3');
    await expect(page.getByRole('heading', { name: '同样的外形，一次只走一条路线' })).toBeVisible();
    await expect(page.getByRole('button', { name: '运行分支' })).toBeEnabled({ timeout: 25_000 });
    await solveWithControls(page);
    await runBranch(page);
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.lastRun?.completed).toBe(true);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0);
    const beforeRetry = await stored(page);
    expect(beforeRetry.sessions['w4-m3'].totalRuns).toBe(1);
    expect(beforeRetry.missionCompletionEvidence['w4-m3']).toBeUndefined();
    const missing = await request.get('/xiyou-programming-journey/assets/week-four-branches/not-found.webp', {
      headers: { accept: 'image/webp' },
    });
    expect(missing.status()).toBe(404);
    await clearW4M3Fault(page, 'fail-w4-m3-assets');
    await page.getByRole('button', { name: '重试场景资源' }).click();
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    const afterRetry = await stored(page);
    expect(afterRetry.sessions['w4-m3'].totalRuns).toBe(1);
    expect(afterRetry.missionCompletionEvidence['w4-m3']?.kind).toBe('formal-v3');
  });

  test('@w4-m3-lazy alternate-URL lazy chunk retry restores the same document before any Worker or completion', async ({ page }) => {
    await page.goto('./');
    const w4m3DocumentMarker = 'w4-m3-same-document-recovery';
    await page.locator('html').evaluate((node, marker) => {
      node.dataset.w4m3DocumentMarker = marker;
    }, w4m3DocumentMarker);
    await setW4M3Fault(page, 'fail-w4-m3-lazy');
    await page.goto('./#/mission/w4-m3');
    await expect(page.getByRole('alert')).toContainText('分支归位体验加载失败');
    const failed = await stored(page);
    expect(failed.sessions['w4-m3']).toBeUndefined();
    expect(failed.missionCompletionEvidence['w4-m3']).toBeUndefined();
    await clearW4M3Fault(page, 'fail-w4-m3-lazy');
    await page.getByRole('button', { name: '重新加载页面' }).click();
    await expect(page.getByRole('heading', { name: '同样的外形，一次只走一条路线' })).toBeVisible();
    expect(await page.locator('html').evaluate((node) => node.dataset.w4m3DocumentMarker)).toBe(w4m3DocumentMarker);
    expectedFailures.set(page, new Set());
    await solveWithControls(page);
    await runBranch(page);
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 25_000 });
    expect((await stored(page)).sessions['w4-m3'].totalRuns).toBe(1);
  });

  test('@w4-m3-cold cold closure, built Worker, five local Pyodide files, ready/first result, and warm result meet named budgets', async ({ page, context }, testInfo) => {
    testInfo.setTimeout(60_000);
    const responses: any[] = [];
    page.on('response', (response) => responses.push(response));
    const chromiumProject = testInfo.project.name.includes('chromium');
    const runtimeFiles = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];
    const manifest = JSON.parse(readFileSync(new URL('../dist-e2e/.vite/manifest.json', import.meta.url), 'utf8'));
    const closureFiles = [...collectRuntimeClosure(manifest, 'src/components/WeekFourBranchExperience.tsx')]
      .map((key) => manifest[key]?.file)
      .filter((file): file is string => typeof file === 'string' && file.endsWith('.js'));
    const closureBytes = closureFiles.reduce((sum, file) => sum + statSync(new URL(`../dist-e2e/${file}`, import.meta.url)).size, 0);
    const workerFiles = readdirSync(new URL('../dist-e2e/assets/', import.meta.url)).filter((file) => /^weekFourBranchPython\.worker-.*\.js$/.test(file));
    expect(workerFiles).toHaveLength(1);
    const workerBytes = statSync(new URL(`../dist-e2e/assets/${workerFiles[0]}`, import.meta.url)).size;
    const compatibleBytes = new Map<string, number>();
    if (!chromiumProject) {
      await context.route('**/runtime/pyodide-314.0.2/**', async (route) => {
        const response = await route.fetch();
        const body = await response.body();
        compatibleBytes.set(new URL(route.request().url()).pathname, body.byteLength);
        await route.fulfill({ response, body });
      });
    }
    const client = chromiumProject ? await context.newCDPSession(page) : null;
    if (client) {
      await client.send('Network.enable');
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: 1_250_000,
        uploadThroughput: 1_250_000,
        connectionType: 'cellular3g',
      });
      await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    const startedAt = performance.now();
    await page.goto('./#/mission/w4-m3');
    await expect(page.getByRole('heading', { name: '同样的外形，一次只走一条路线' })).toBeVisible();
    await waitReady(page);
    const readyAt = performance.now();
    const resources = await page.evaluate(() => performance.getEntriesByType('resource').map((entry) => entry.name));
    expect(resources.some((url) => url.includes('weekFourBranchPython.worker-'))).toBe(true);
    const runtimeRoot = new URL('runtime/pyodide-314.0.2/', page.url());
    const missingCompatibilityFiles = chromiumProject ? [] : runtimeFiles.filter((file) =>
      ![...compatibleBytes.keys()].some((pathname) => pathname.endsWith(file)));
    if (missingCompatibilityFiles.length) {
      await page.evaluate(async ({ root, files }) => {
        await Promise.all(files.map(async (file) => {
          const response = await fetch(new URL(file, root), { cache: 'no-store' });
          if (!response.ok) throw new Error(`runtime compatibility probe failed: ${response.status}`);
          await response.arrayBuffer();
        }));
      }, { root: runtimeRoot.href, files: missingCompatibilityFiles });
    }
    await runBranch(page);
    await expect(page.getByRole('status', { name: '分支运行结果' })).toContainText('两条路线同时发生', { timeout: 25_000 });
    const firstResultAt = performance.now();
    await runBranch(page);
    await expect.poll(async () => (await stored(page)).sessions['w4-m3']?.totalRuns).toBe(2);
    const warmResultAt = performance.now();
    const localPaths = new Set(closureFiles.map((file) => new URL(file, page.url()).pathname));
    const localResponses = responses.filter((response) => localPaths.has(new URL(response.url()).pathname));
    const runtimeResponses = responses.filter((response) => runtimeFiles.some((file) => response.url().endsWith(file)));
    const localObservedBytes = (await Promise.all(localResponses.map(async (response) => (await response.body()).byteLength)))
      .reduce((sum, bytes) => sum + bytes, 0);
    const runtimeBytes = chromiumProject
      ? (await Promise.all(runtimeResponses.map(async (response) => (await response.body()).byteLength))).reduce((sum, bytes) => sum + bytes, 0)
      : runtimeFiles.reduce((sum, file) => sum + ([...compatibleBytes.entries()].find(([pathname]) => pathname.endsWith(file))?.[1] ?? 0), 0);
    if (chromiumProject) expect(new Set(runtimeResponses.map((response) => new URL(response.url()).pathname)).size).toBe(5);
    else expect(runtimeFiles.every((file) => [...compatibleBytes.keys()].some((pathname) => pathname.endsWith(file)))).toBe(true);
    expect(closureBytes + workerBytes).toBeLessThanOrEqual(WEEK_FOUR_BRANCH_MAX_LAZY_BYTES);
    expect(runtimeBytes).toBeLessThanOrEqual(PYTHON_RUNTIME_TRANSFER_MAX_BYTES);
    expect(firstResultAt - startedAt).toBeLessThanOrEqual(20_000);
    expect(warmResultAt - firstResultAt).toBeLessThanOrEqual(1_000);
    const metricsPath = testInfo.outputPath(`w4m3-cold-metrics-${testInfo.project.name}.json`);
    await writeFile(metricsPath, JSON.stringify({
      project: testInfo.project.name,
      closureBytes,
      workerBytes,
      localObservedBytes,
      runtimeBytes,
      readyMs: readyAt - startedAt,
      firstResultMs: firstResultAt - startedAt,
      warmResultMs: warmResultAt - firstResultAt,
      throttleMode: chromiumProject ? '10mbps-4x-cpu-cdp' : 'native-engine-compatible-no-cdp',
      missingCompatibilityFiles,
    }, null, 2));
    await testInfo.attach(`w4m3-cold-metrics-${testInfo.project.name}.json`, { path: metricsPath, contentType: 'application/json' });
    if (client) await client.detach();
  });
});
