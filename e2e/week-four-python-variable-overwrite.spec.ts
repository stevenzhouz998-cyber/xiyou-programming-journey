import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import {
  completeMission,
  createInitialProgress,
  serializeProgress,
} from "../src/progress/progress";
import { parseProgress } from "../src/progress/schema";
import {
  createMissionSession,
  recordRun,
  updateWorkspaceDraft,
} from "../src/progress/session";
import {
  createDefaultManorHelpDraft,
  compileManorHelpDraft,
  runManorHelp,
} from "../src/blockly/weekThreeManorHelpContract";
import {
  compileCuilanBooleanDraft,
  runCuilanBooleanForDraft,
} from "../src/blockly/weekThreeCuilanBooleanContract";
import {
  createDefaultYunzhanDialogueDraft,
  compileYunzhanDialogueDraft,
  runYunzhanDialogueForDraft,
} from "../src/blockly/weekThreeYunzhanDialogueContract";
import {
  createDefaultBajieJoiningDraft,
  compileBajieJoiningDraft,
  runBajieJoiningForDraft,
} from "../src/blockly/weekThreeBajieJoiningContract";
import { compileWeekThreeBossDraft } from "../src/blockly/weekThreeBossCompiler";
import { runWeekThreeBossDraft } from "../src/blockly/weekThreeBossContract";
import { createSolvedWeekThreeBossDraftForTest } from "../src/blockly/weekThreeBossTestHelpers";
import { compileWeekFourMappingDraft } from "../src/blockly/weekFourMappingDraft";
import { compareWeekFourMappingTraces } from "../src/blockly/weekFourMappingContract";
import {
  parseWeekFourMappingPython,
  SOLVED_WEEK_FOUR_MAPPING_PYTHON,
} from "../src/engine/weekFourPythonMappingGrammar";
import {
  createWeekFourMappingSession,
  recordWeekFourMappingRun,
  updateWeekFourMappingCode,
} from "../src/progress/weekFourMappingSession";
import {
  WEEK_FOUR_VARIABLE_COLD_LOAD_MAX_BYTES,
  PYTHON_RUNTIME_TRANSFER_MAX_BYTES,
} from "../scripts/budget-limits.mjs";
import { collectRuntimeClosure } from "../scripts/check-bundle-budget.mjs";

const CURRENT_KEY = "xiyou-programming-progress-v3";
const REVISION_KEY = "xiyou-programming-progress-revision-v3";
type HealthEvent = { kind: string; url: string; detail: string };
const healthEvents = new WeakMap<Page, HealthEvent[]>();
let expectedFailureUrl: string | null = null;
let faultPage: Page | null = null;

function formalW3M5PrerequisiteProgress() {
  let progress = createInitialProgress();
  progress = { ...progress, privacy: { localDataNoticeSeen: true } };
  for (const id of [
    "w1-m1",
    "w1-m2",
    "w1-m3",
    "w1-m4",
    "w1-m5",
    "w2-m1",
    "w2-m2",
    "w2-m3",
    "w2-m4",
    "w2-m5",
  ] as const)
    progress = completeMission(progress, id, { stars: 3, hintsUsed: 0 });
  const manor = createDefaultManorHelpDraft();
  manor.blocks.find((block) => block.id === "manor-condition")!.type =
    "w3_manor_condition_explicit_demon_help";
  const manorTrace = compileManorHelpDraft(manor);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      "w3-m1": recordRun(
        updateWorkspaceDraft(
          createMissionSession("w3-m1"),
          manor,
          "2026-08-30T00:00:00.000Z",
        ),
        runManorHelp(manorTrace),
        manorTrace,
        "2026-08-30T00:00:01.000Z",
      ),
    },
  };
  progress = completeMission(progress, "w3-m1", { stars: 3, hintsUsed: 0 });
  const cuilan = createMissionSession("w3-m2");
  const cuilanDraft = structuredClone(cuilan.workspace);
  cuilanDraft.blocks.find(
    (block) => block.id === "cuilan-identity-condition",
  )!.type = "w3_cuilan_condition_identity_is_cuilan";
  const cuilanTrace = compileCuilanBooleanDraft(cuilanDraft);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      "w3-m2": recordRun(
        updateWorkspaceDraft(cuilan, cuilanDraft, "2026-08-30T00:00:02.000Z"),
        runCuilanBooleanForDraft(cuilanDraft, cuilanTrace),
        cuilanTrace,
        "2026-08-30T00:00:03.000Z",
      ),
    },
  };
  progress = completeMission(progress, "w3-m2", { stars: 3, hintsUsed: 0 });
  const yunzhan = createDefaultYunzhanDialogueDraft();
  yunzhan.blocks.find((block) => block.id === "yunzhan-condition")!.type =
    "w3_yunzhan_condition_pilgrimage_explicit";
  yunzhan.blocks.find((block) => block.id === "yunzhan-then-action")!.type =
    "w3_yunzhan_explain_guanyin_origin";
  yunzhan.blocks.find((block) => block.id === "yunzhan-else-action")!.type =
    "w3_yunzhan_guard_cave";
  const yunzhanTrace = compileYunzhanDialogueDraft(yunzhan);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      "w3-m3": recordRun(
        updateWorkspaceDraft(
          createMissionSession("w3-m3"),
          yunzhan,
          "2026-08-30T00:00:04.000Z",
        ),
        runYunzhanDialogueForDraft(yunzhan, yunzhanTrace),
        yunzhanTrace,
        "2026-08-30T00:00:05.000Z",
      ),
    },
  };
  progress = completeMission(progress, "w3-m3", { stars: 3, hintsUsed: 0 });
  const bajie = createDefaultBajieJoiningDraft();
  bajie.blocks.find(
    (block) => block.id === "bajie-boolean-operation",
  )!.operator = "and";
  const bajieTrace = compileBajieJoiningDraft(bajie);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      "w3-m4": recordRun(
        updateWorkspaceDraft(
          createMissionSession("w3-m4", "2026-08-30T00:00:05.000Z"),
          bajie,
          "2026-08-30T00:00:06.000Z",
        ),
        runBajieJoiningForDraft(bajie, bajieTrace),
        bajieTrace,
        "2026-08-30T00:00:07.000Z",
      ),
    },
  };
  progress = completeMission(progress, "w3-m4", { stars: 3, hintsUsed: 0 });
  const boss = createSolvedWeekThreeBossDraftForTest();
  const bossTrace = compileWeekThreeBossDraft(boss);
  progress = {
    ...progress,
    sessions: {
      ...progress.sessions,
      "w3-m5": recordRun(
        updateWorkspaceDraft(
          createMissionSession("w3-m5"),
          boss,
          "2026-08-30T00:00:08.000Z",
        ),
        runWeekThreeBossDraft(boss),
        bossTrace.ok ? bossTrace.trace : [],
        "2026-08-30T00:00:09.000Z",
      ),
    },
  };
  return completeMission(progress, "w3-m5", { stars: 3, hintsUsed: 0 });
}

function formalW4M1Prerequisite() {
  let progress = formalW3M5PrerequisiteProgress();
  const draft = updateWeekFourMappingCode(
    createWeekFourMappingSession("2026-08-30T00:00:10.000Z"),
    SOLVED_WEEK_FOUR_MAPPING_PYTHON,
    "2026-08-30T00:00:11.000Z",
  );
  const blocklyTrace = compileWeekFourMappingDraft(draft.workspace).trace;
  const python = parseWeekFourMappingPython(SOLVED_WEEK_FOUR_MAPPING_PYTHON);
  const run = compareWeekFourMappingTraces(blocklyTrace, python.trace);
  const session = recordWeekFourMappingRun(
    draft,
    { blocklyTrace, pythonTrace: python.trace, run },
    "2026-08-30T00:00:12.000Z",
  );
  progress = {
    ...progress,
    sessions: { ...progress.sessions, "w4-m1": session },
  };
  const serialized = serializeProgress(
    completeMission(progress, "w4-m1", { stars: 3, hintsUsed: 0 }),
  );
  parseProgress(serialized);
  return serialized;
}
const W4_M1_FORMAL_PREREQUISITE_SHA256 = 'b30a8feaf3aed7e80b4600adbe3f94b01047089f8158e3a7c100874a4c08c97f';

function expectedFailure(value: string) {
  return (
    expectedFailureUrl !== null &&
    (value === expectedFailureUrl || value.includes(expectedFailureUrl))
  );
}
function attachHealth(page: Page) {
  const events: HealthEvent[] = [];
  healthEvents.set(page, events);
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !expectedFailure(message.location().url) &&
      !expectedFailure(message.text())
    )
      events.push({
        kind: "console",
        url: message.location().url || page.url(),
        detail: message.text(),
      });
  });
  page.on("pageerror", (error) =>
    events.push({ kind: "pageerror", url: page.url(), detail: error.message }),
  );
  page.on("requestfailed", (request) => {
    if (!expectedFailure(request.url()))
      events.push({
        kind: "requestfailed",
        url: request.url(),
        detail: request.failure()?.errorText ?? "",
      });
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !expectedFailure(response.url()))
      events.push({
        kind: "response",
        url: response.url(),
        detail: `HTTP ${response.status()}`,
      });
  });
}
async function stored(page: Page) {
  return page.evaluate(
    (key) =>
      JSON.parse(Storage.prototype.getItem.call(globalThis.localStorage, key)!),
    CURRENT_KEY,
  );
}
async function setW4M2StorageFaultMode(page: Page, mode: string) {
  await page.evaluate(
    ([key, value]) =>
      Storage.prototype.setItem.call(globalThis.localStorage, key, value),
    ["xiyou-test-storage-mode", mode],
  );
}
async function setStorageFaultMode(mode: string) {
  if (!faultPage) throw new Error("fault page is unavailable");
  await setW4M2StorageFaultMode(faultPage, mode);
}
async function gotoVariables(page: Page) {
  await page.goto("./#/mission/w4-m2");
  await expect(
    page
      .locator(".week-four-variable-evidence-experience")
      .getByRole("heading", { name: "两只证据匣，别让变量被覆盖" }),
  ).toBeVisible();
  await expect(page.getByLabel("W4-M2 Python 代码")).toBeVisible();
}
async function waitReady(page: Page) {
  await expect(
    page.getByRole("status", { name: "Python 运行环境已准备" }),
  ).toBeVisible({ timeout: 40_000 });
}
async function run(page: Page) {
  await page.getByRole("button", { name: "运行取证", exact: true }).click();
}
async function chooseIdentity(page: Page) {
  await page
    .getByRole("combobox", { name: "第二次核验写入哪个变量" })
    .selectOption("identity");
  await expect
    .poll(async () => (await stored(page)).sessions["w4-m2"]?.pythonCode)
    .toContain("identity");
}
async function openParent(page: Page) {
  await page.goto("./#/parent");
  const acknowledge = page.getByRole("button", { name: "我知道了", exact: true });
  if (await acknowledge.isVisible()) {
    await acknowledge.click();
    await expect
      .poll(async () => (await stored(page)).privacy.localDataNoticeSeen)
      .toBe(true);
  }
  const login = page.getByLabel("家长 PIN", { exact: true });
  const setup = page.getByLabel("设置 4 位家长 PIN", { exact: true });
  const report = page.getByRole("button", { name: "导出进度", exact: true });
  await expect(login.or(setup).or(report)).toBeVisible();
  if (await report.isVisible()) return;
  if (await login.isVisible()) {
    await login.fill("4826");
    await page.getByRole("button", { name: "进入周报", exact: true }).click();
    await expect(report).toBeVisible();
    return;
  }
  await setup.fill("4826");
  const confirm = page.getByLabel("确认家长 PIN", { exact: true });
  await confirm.fill("4826");
  await expect.poll(async () => {
    if (await setup.inputValue() !== "4826") await setup.fill("4826");
    if (await confirm.inputValue() !== "4826") await confirm.fill("4826");
    return [await setup.inputValue(), await confirm.inputValue()];
  }).toEqual(["4826", "4826"]);
  await page.getByRole("button", { name: "创建家长 PIN", exact: true }).click();
  await page.getByLabel("我已安全保存恢复码").check();
  await page
    .getByRole("button", { name: "确认已保存并进入", exact: true })
    .click();
  await expect(report).toBeVisible();
}
async function attach(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}-${testInfo.project.name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(`${name}-${testInfo.project.name}.png`, {
    path,
    contentType: "image/png",
  });
}

test.describe("W4-M2 Python 变量覆盖真实浏览器证据", () => {
  test.beforeEach(async ({ page }) => {
    expectedFailureUrl = null;
    faultPage = page;
    attachHealth(page);
    const value = formalW4M1Prerequisite();
    await page.addInitScript(
      ({ current, revision, value: raw }) => {
        if (
          Storage.prototype.getItem.call(globalThis.localStorage, current) ===
          null
        ) {
          Storage.prototype.setItem.call(globalThis.localStorage, current, raw);
          Storage.prototype.setItem.call(
            globalThis.localStorage,
            revision,
            "0",
          );
        }
      },
      { current: CURRENT_KEY, revision: REVISION_KEY, value },
    );
  });
  test.afterEach(async ({ page }) => {
    expect(
      healthEvents.get(page),
      "unexpected W4-M2 browser health events",
    ).toEqual([]);
  });

  test("@w4-m2-full @w4-m2-work @w4-m2-parent visible overwrite, immutable observation, identity repair, sealed proof, refresh, export-import, parent summary, and W4-M3", async ({
    page,
  }, testInfo) => {
    testInfo.setTimeout(120_000);
    await gotoVariables(page);
    await waitReady(page);
    const beforeReview = await stored(page);
    await page.getByText("\u56de\u770b W4-M1 \u5bf9\u7167\u4f5c\u54c1", { exact: true }).click();
    const review = page.getByRole("region", { name: "W4-M1 \u53ea\u8bfb\u5bf9\u7167\u4f5c\u54c1" });
    await expect(review).toBeVisible();
    await expect(review.getByRole("button")).toHaveCount(0);
    await expect(review.getByLabel("W4-M1 Python \u53ea\u8bfb\u4f5c\u54c1")).toContainText(
      'if identity == "白骨精":',
    );
    expect(await stored(page)).toEqual(beforeReview);
    await attach(page, testInfo, "w4m2-default");
    await run(page);
    await expect(
      page.getByText("外形匣被覆盖，身份匣为空；这个失败事实已经保存。"),
    ).toBeVisible({ timeout: 25_000 });
    const unsealed = await stored(page);
    expect(unsealed.sessions["w4-m2"]?.lastRun?.finalState).toBe(
      "evidence-unsealed",
    );
    await page
      .getByRole("button", { name: "火眼金睛：观察本次覆盖", exact: true })
      .click();
    await expect(page.getByText("火眼金睛：已保存的变量事实")).toBeVisible();
    const observed = await stored(page);
    expect(observed.sessions["w4-m2"]?.pythonCode).toBe(
      unsealed.sessions["w4-m2"]?.pythonCode,
    );
    expect(observed.sessions["w4-m2"]?.lastRun).toEqual(
      unsealed.sessions["w4-m2"]?.lastRun,
    );
    await chooseIdentity(page);
    await run(page);
    await expect(page.getByRole("dialog", { name: "闯关成功" })).toBeVisible({
      timeout: 25_000,
    });
    await attach(page, testInfo, "w4m2-sealed");
    const sealed = await stored(page);
    expect(sealed.missionCompletionEvidence["w4-m2"]?.kind).toBe("formal-v3");
    expect(sealed.works["w4-m2-variable-evidence-record"]?.run.finalState).toBe(
      "evidence-sealed",
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "两只证据匣，别让变量被覆盖" }),
    ).toBeVisible();
    const replayBefore = await stored(page);
    await run(page);
    await expect(
      page.getByText("回放核验完成，已保留正式作品和通关证明。"),
    ).toBeVisible({ timeout: 25_000 });
    expect(await stored(page)).toEqual(replayBefore);
    await openParent(page);
    const parentSummary = page.getByRole("region", {
      name: "第四周变量学习摘要",
    });
    await expect(parentSummary).toContainText("运行");
    await expect(parentSummary).toContainText("变量覆盖 1 次");
    await expect(parentSummary).toContainText("正式变量证明");
    await expect(parentSummary).toContainText("作品");
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出进度", exact: true }).click();
    const path = await (await download).path();
    expect(path).not.toBeNull();
    const exportedBytes = readFileSync(path!);
    const exportedProgress = JSON.parse(exportedBytes.toString("utf8"));
    await page.getByRole("button", { name: "清空学习数据", exact: true }).click();
    await page.getByLabel("输入“清空”以确认").fill("清空");
    const clearBackup = page.waitForEvent("download");
    await page.getByRole("button", { name: "备份并清空", exact: true }).click();
    await clearBackup;
    await expect.poll(async () => await stored(page)).toEqual(createInitialProgress());
    await openParent(page);
    await page
      .getByLabel("选择进度文件")
      .setInputFiles({
        name: "w4-m2-progress.json",
        mimeType: "application/json",
        buffer: exportedBytes,
      });
      await expect.poll(async () => await stored(page)).toEqual(exportedProgress);
      await openParent(page);
      const importedProgress = await stored(page);
      expect(importedProgress).toEqual(exportedProgress);
      expect(importedProgress.sessions["w4-m2"]?.pythonCode).toBe(
        sealed.sessions["w4-m2"]?.pythonCode,
      );
      expect(importedProgress.sessions["w4-m2"]?.lastRun).toEqual(
        sealed.sessions["w4-m2"]?.lastRun,
      );
      expect(importedProgress.sessions["w4-m2"]?.lastCanonicalTrace).toEqual(
        sealed.sessions["w4-m2"]?.lastCanonicalTrace,
      );
      expect(importedProgress.sessions["w4-m2"]?.lastWorkerTrace).toEqual(
        sealed.sessions["w4-m2"]?.lastWorkerTrace,
      );
      expect(importedProgress.works["w4-m2-variable-evidence-record"]).toEqual(
        sealed.works["w4-m2-variable-evidence-record"],
      );
      expect(importedProgress.missionCompletionEvidence["w4-m2"]).toEqual(
        sealed.missionCompletionEvidence["w4-m2"],
      );
      expect(importedProgress.missions["w4-m2"]?.attempts).toBe(1);
      await page.goto("./#/mission/w4-m2");
      await waitReady(page);
      const importedBeforeReplay = await stored(page);
      await run(page);
      await expect(
        page.getByText("回放核验完成，已保留正式作品和通关证明。"),
      ).toBeVisible({ timeout: 25_000 });
      expect(await stored(page)).toEqual(importedBeforeReplay);
      await page.goto("./#/mission/w4-m3");
      await expect(page.getByText("老妇外形，条件不变")).toBeVisible();
  });
  test("@w4-m2-keyboard @w4-m2-accessibility keyboard selects the visible identity field and keeps focus feedback usable", async ({
    page,
  }) => {
    await gotoVariables(page);
    await waitReady(page);
    await expect(page.getByLabel("白虎岭变量取证舞台")).toBeVisible();
    await expect(page.getByRole("region", { name: "公开证据卡" })).toBeVisible();
    await expect(page.getByRole("region", { name: "证据匣状态" })).toBeVisible();
    const feedback = page.locator(".week-four-variable-feedback");
    await expect(feedback).toHaveAttribute("aria-live", "polite");
    await expect(page.getByRole("textbox", { name: "W4-M2 Python 代码" })).toBeVisible();
    await expect(page.getByRole("status", { name: "Python 运行环境已准备" })).toBeVisible();
    const selector = page.getByRole("combobox", {
      name: "第二次核验写入哪个变量",
    });
    await selector.focus();
    await selector.press("Tab");
    await expect(page.getByRole("button", { name: "写入 appearance" })).toBeFocused();
    await page.keyboard.press("Tab");
    const field = page.getByRole("button", {
      name: "写入 identity",
      exact: true,
    });
    await expect(field).toBeFocused();
    await setStorageFaultMode("fail-w4-m2-draft");
    await field.press(" ");
    const saveAlert = page.getByRole("alert", {
      name: /新的 Python 草稿没有保存成功/,
    });
    await expect(saveAlert).toBeVisible();
    await setStorageFaultMode("off");
    const retryDraft = page.getByRole("button", { name: "重试保存", exact: true });
    await retryDraft.focus();
    await retryDraft.press("Enter");
    await expect
      .poll(async () => (await stored(page)).sessions["w4-m2"]?.pythonCode)
      .toContain("identity");
    await page.getByRole("button", { name: "写入 appearance", exact: true }).focus();
    await page.keyboard.press("Enter");
    await run(page);
    await expect(
      page.getByRole("status").filter({ hasText: "外形匣被覆盖，身份匣为空" }),
    ).toBeFocused({ timeout: 25_000 });
    await page.getByRole("button", { name: "查看问题代码行" }).press("Enter");
    await expect(selector).toBeFocused();
    await selector.selectOption("identity");
    await run(page);
    await expect(page.getByRole("dialog", { name: "闯关成功" })).toBeVisible({
      timeout: 25_000,
    });
  });
  test("@w4-m2-mouse mouse selects the visible identity field", async ({
    page,
  }) => {
    await gotoVariables(page);
    await chooseIdentity(page);
  });
  test("@w4-m2-touch touch reaches the visible identity field without a hidden answer state", async ({
    page,
  }) => {
    await gotoVariables(page);
    const field = page.getByRole("combobox", {
      name: "第二次核验写入哪个变量",
    });
    try {
      await field.tap();
    } catch {
      await field.click();
    }
    await field.selectOption("identity");
    await expect
      .poll(async () => (await stored(page)).sessions["w4-m2"]?.pythonCode)
      .toContain("identity");
  });

  test("@w4-m2-storage draft storage retry keeps the exact saved draft fail-closed then post-retry", async ({
    page,
  }) => {
    await gotoVariables(page);
    await expect.poll(async () => (await stored(page)).sessions["w4-m2"]).toBeDefined();
    await expect(page.getByText("已建立并保存本次变量取证草稿。")).toBeVisible();
    const draftBefore = await stored(page);
    await setStorageFaultMode("fail-w4-m2-draft");
    await page
      .getByRole("combobox", { name: "第二次核验写入哪个变量" })
      .selectOption("identity");
    await expect(page.getByRole("button", { name: "重试保存", exact: true })).toBeVisible({
      timeout: 25_000,
    });
    expect(
      (await stored(page)).missionCompletionEvidence["w4-m2"],
    ).toBeUndefined();
    await setStorageFaultMode("off");
    await page.getByRole("button", { name: "重试保存", exact: true }).click();
    await expect
      .poll(async () => (await stored(page)).sessions["w4-m2"]?.pythonCode)
      .toContain("identity = fiery_eye_check()");
    const draftAfterRetry = await stored(page);
    expect(draftAfterRetry.sessions["w4-m2"]?.pythonCode).not.toBe(
      draftBefore.sessions["w4-m2"]?.pythonCode,
    );
    expect(draftAfterRetry.sessions["w4-m2"]?.pythonCode).toContain("identity");
    expect(draftAfterRetry.sessions["w4-m2"]?.lastRun).toBeNull();
    expect(draftAfterRetry.sessions["w4-m2"]?.lastRun).toBeNull();
  });
  test("@w4-m2-storage run storage retry saves the real unsealed result once", async ({
    page,
  }) => {
    await gotoVariables(page);
    await setStorageFaultMode("fail-w4-m2-run");
    await run(page);
    await expect(page.getByRole("button", { name: "重试保存", exact: true })).toBeVisible({
      timeout: 25_000,
    });
    const runBefore = await stored(page);
    expect(runBefore.missionCompletionEvidence["w4-m2"]).toBeUndefined();
    await setStorageFaultMode("off");
    await page.getByRole("button", { name: "重试保存", exact: true }).click();
    await expect
      .poll(async () => (await stored(page)).sessions["w4-m2"]?.lastRun)
      .not.toBeNull();
    await expect
      .poll(async () => (await stored(page)).sessions["w4-m2"]?.totalRuns)
      .toBe(1);
    const runAfterRetry = await stored(page);
    expect(runAfterRetry.sessions["w4-m2"]?.pythonCode).toBe(
      runBefore.sessions["w4-m2"]?.pythonCode,
    );
    expect(runAfterRetry.sessions["w4-m2"]?.lastRun).toBeDefined();
    expect(runAfterRetry.sessions["w4-m2"]?.overwriteFailures).toBe(1);
    expect(runAfterRetry.sessions["w4-m2"]?.totalRuns).toBe(1);
  });
  test("@w4-m2-storage observation storage retry preserves code and saved run", async ({
    page,
  }) => {
    await gotoVariables(page);
    await run(page);
    await expect(
      page.getByText("外形匣被覆盖，身份匣为空；这个失败事实已经保存。"),
    ).toBeVisible({ timeout: 25_000 });
    const observationBefore = await stored(page);
    const observationUses =
      observationBefore.sessions["w4-m2"]?.conditionObservationUses;
    expect(observationUses).toHaveLength(0);
    await setStorageFaultMode("fail-w4-m2-observation");
    await page
      .getByRole("button", { name: "火眼金睛：观察本次覆盖", exact: true })
      .click();
    await expect(page.getByRole("button", { name: "重试保存" })).toBeVisible();
    await setStorageFaultMode("off");
    await page.getByRole("button", { name: "重试保存" }).click();
    await expect
      .poll(
        async () =>
          (await stored(page)).sessions["w4-m2"]?.conditionObservationUses,
      )
      .toHaveLength(1);
    const observationAfterRetry = await stored(page);
    expect(
      observationAfterRetry.sessions["w4-m2"]?.conditionObservationUses,
    ).toHaveLength(1);
    expect(observationAfterRetry.sessions["w4-m2"]?.pythonCode).toEqual(
      observationBefore.sessions["w4-m2"]?.pythonCode,
    );
    expect(observationAfterRetry.sessions["w4-m2"]?.lastRun).toEqual(
      observationBefore.sessions["w4-m2"]?.lastRun,
    );
  });
  test("@w4-m2-storage work storage retry atomically publishes work and proof, then unlocks W4-M3", async ({
    page,
  }) => {
    await gotoVariables(page);
    await setStorageFaultMode("fail-w4-m2-work");
    await chooseIdentity(page);
    await run(page);
    await expect(page.getByRole("button", { name: "重试保存通关", exact: true })).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByRole("button", { name: "重试保存", exact: true })).toHaveCount(0);
    const workBeforeRetry = await stored(page);
    expect(
      workBeforeRetry.works["w4-m2-variable-evidence-record"],
    ).toBeUndefined();
    expect(workBeforeRetry.missionCompletionEvidence["w4-m2"]).toBeUndefined();
    await setStorageFaultMode("off");
    await page.getByRole("button", { name: "重试保存通关", exact: true }).click();
    await expect
      .poll(
        async () =>
          (await stored(page)).works["w4-m2-variable-evidence-record"],
      )
      .toBeDefined();
    const workAfterRetry = await stored(page);
    expect(
      workAfterRetry.works["w4-m2-variable-evidence-record"],
    ).toBeDefined();
    expect(workAfterRetry.missionCompletionEvidence["w4-m2"]).toBeDefined();
    expect(workAfterRetry.missions["w4-m3"]).toBeUndefined();
    await page.goto("./#/mission/w4-m3");
    await expect(page.getByText("老妇外形，条件不变")).toBeVisible();
  });
  test("@w4-m2-storage completion storage retry atomically publishes proof and W4-M3", async ({
    page,
  }) => {
    await gotoVariables(page);
    await setStorageFaultMode("fail-w4-m2-completion");
    await chooseIdentity(page);
    await run(page);
    await expect(page.getByRole("button", { name: "重试保存通关", exact: true })).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByRole("button", { name: "重试保存", exact: true })).toHaveCount(0);
    const completionBeforeRetry = await stored(page);
    expect(
      completionBeforeRetry.works["w4-m2-variable-evidence-record"],
    ).toBeUndefined();
    expect(
      completionBeforeRetry.missionCompletionEvidence["w4-m2"],
    ).toBeUndefined();
    await setStorageFaultMode("off");
    await page.getByRole("button", { name: "重试保存通关", exact: true }).click();
    await expect
      .poll(async () => (await stored(page)).missionCompletionEvidence["w4-m2"])
      .toBeDefined();
    const completionAfterRetry = await stored(page);
    expect(
      completionAfterRetry.missionCompletionEvidence["w4-m2"],
    ).toBeDefined();
    expect(completionAfterRetry.missions["w4-m3"]).toBeUndefined();
    await page.goto("./#/mission/w4-m3");
    await expect(page.getByText("老妇外形，条件不变")).toBeVisible();
  });

  test("@w4-m2-external @w4-m2-corrupt cas explicit cross-tab reload preserves the externalCodeBackup and currentRevision", async ({
    page,
    context,
  }) => {
    await gotoVariables(page);
    const stale = await context.newPage();
    attachHealth(stale);
    try {
      let runtimeRequestStarted = false;
      let releaseRuntime!: () => void;
      const runtimeRelease = new Promise<void>((resolve) => {
        releaseRuntime = resolve;
      });
      await stale.route(/pyodide\.mjs(?:\?.*)?$/, async (route) => {
        runtimeRequestStarted = true;
        await runtimeRelease;
        await route.continue();
      });
      await gotoVariables(stale);
      const staleCode = await stale.getByRole("textbox").innerText();
      await run(stale);
      await expect(
        stale.getByText("正在运行已保存的 Python 取证…"),
      ).toBeVisible();
      await expect.poll(() => runtimeRequestStarted).toBe(true);
      await chooseIdentity(page);
      const currentRevision = await page.evaluate(
        (key) => Storage.prototype.getItem.call(globalThis.localStorage, key),
        REVISION_KEY,
      );
      releaseRuntime();
      const conflict = stale.getByRole("alert").filter({
        hasText: "其他标签页已有新的学习进度",
      });
      await expect(conflict).toBeVisible();
      const currentCode = (await stored(page)).sessions["w4-m2"]?.pythonCode;
      expect(staleCode).toContain("appearance = fiery_eye_check()");
      expect(currentCode).toContain("identity = fiery_eye_check()");
      expect(currentRevision).not.toBeNull();
      await stale
        .getByRole("button", { name: "载入其他标签页进度", exact: true })
        .click();
      await expect(stale.getByRole("textbox")).toContainText(
        "identity = fiery_eye_check()",
      );
      expect(
        await stale.evaluate(
          (key) => Storage.prototype.getItem.call(globalThis.localStorage, key),
          REVISION_KEY,
        ),
      ).toBe(currentRevision);
    } finally {
      expect(healthEvents.get(stale)).toEqual([]);
      await stale.close();
    }
  });
  test("@w4-m2-corrupt current corrupt bytes retain a download and legal snapshot", async ({
    page,
  }) => {
    await gotoVariables(page);
    await chooseIdentity(page);
    await run(page);
    await expect(page.getByRole("dialog", { name: "闯关成功" })).toBeVisible({
      timeout: 25_000,
    });
    const completed = await stored(page);
    await openParent(page);
    await page.getByRole("button", { name: "关闭声音", exact: true }).click();
    await expect.poll(async () => (await stored(page)).settings.muted).toBe(true);
    await page.getByRole("button", { name: "开启声音", exact: true }).click();
    await expect.poll(async () => (await stored(page)).settings.muted).toBe(false);
    await expect
      .poll(async () => {
        const raw = await page.evaluate(
          (key) => Storage.prototype.getItem.call(globalThis.localStorage, key),
          "xiyou-programming-progress-snapshot-v3",
        );
        return raw === null
          ? undefined
          : JSON.parse(raw).works["w4-m2-variable-evidence-record"];
      })
      .toBeDefined();
    const lastLegalSnapshot = await page.evaluate(
      (key) => Storage.prototype.getItem.call(globalThis.localStorage, key),
      "xiyou-programming-progress-snapshot-v3",
    );
    expect(lastLegalSnapshot).not.toBeNull();
    const legal = JSON.parse(lastLegalSnapshot!);
    expect(legal.sessions["w4-m2"]).toEqual(completed.sessions["w4-m2"]);
    expect(legal.works["w4-m2-variable-evidence-record"]).toEqual(
      completed.works["w4-m2-variable-evidence-record"],
    );
    await setStorageFaultMode("corrupt-w4-variable-current");
    await page.reload();
    await expect(page.getByText("学习进度已经安全恢复")).toBeVisible();
    const recoveredCurrent = await page.evaluate(
      (key) => Storage.prototype.getItem.call(globalThis.localStorage, key),
      CURRENT_KEY,
    );
    const corruptBytes = await page.evaluate(
      (key) => Storage.prototype.getItem.call(globalThis.localStorage, key),
      "xiyou-programming-progress-corrupt-v3",
    );
    expect(recoveredCurrent).not.toBeNull();
    expect(corruptBytes).not.toBeNull();
    const recovered = JSON.parse(recoveredCurrent!);
    expect(recovered.schemaRevision).toBe(9);
    expect(recovered.recovery).toMatchObject({ source: "snapshot" });
    expect(recovered.sessions["w4-m2"].lastCanonicalTrace).toEqual(
      legal.sessions["w4-m2"].lastCanonicalTrace,
    );
    expect(recovered.sessions["w4-m2"].lastWorkerTrace).toEqual(
      legal.sessions["w4-m2"].lastWorkerTrace,
    );
    expect(recovered.works["w4-m2-variable-evidence-record"]).toEqual(
      legal.works["w4-m2-variable-evidence-record"],
    );
    expect(recovered.missionCompletionEvidence["w4-m2"]).toEqual(
      legal.missionCompletionEvidence["w4-m2"],
    );
    await openParent(page);
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "下载损坏原文", exact: true })
      .click();
    const downloaded = await download;
    expect(downloaded.suggestedFilename()).toContain("corrupt");
    const downloadedPath = await downloaded.path();
    expect(downloadedPath).not.toBeNull();
    const downloadedBytes = readFileSync(downloadedPath!, "utf8");
    expect(downloadedBytes).toBe(corruptBytes);
    expect(JSON.parse(downloadedBytes).current).toBe("{broken w4-m2 current");
    await page.goto("./#/mission/w4-m2");
    const replayBefore = await stored(page);
    await run(page);
    await expect(
      page.getByText("回放核验完成，已保留正式作品和通关证明。"),
    ).toBeVisible({ timeout: 25_000 });
    expect(await stored(page)).toEqual(replayBefore);
  });

  test("@w4-m2-parent @w4-m2-clear clear downloads a backup, removes W4-M2 data, and relocks W4-M3", async ({
    page,
  }) => {
    await gotoVariables(page);
    await waitReady(page);
    await chooseIdentity(page);
    await run(page);
    await expect(page.getByRole("dialog", { name: "闯关成功" })).toBeVisible({
      timeout: 25_000,
    });
    await openParent(page);
    const clearBefore = await stored(page);
    await page.getByRole("button", { name: "清空学习数据", exact: true }).click();
    await page.getByLabel("输入“清空”以确认").fill("清空");
    const backup = page.waitForEvent("download");
    await page.getByRole("button", { name: "备份并清空", exact: true }).click();
    const clearBackup = await backup;
    expect(clearBackup.suggestedFilename()).toMatch(/\.json$/);
    const clearBackupPath = await clearBackup.path();
    expect(clearBackupPath).not.toBeNull();
    const clearBackupBytes = readFileSync(clearBackupPath!, "utf8");
    expect(JSON.parse(clearBackupBytes)).toEqual(clearBefore);
    await expect
      .poll(async () => (await stored(page)).sessions["w4-m2"])
      .toBeUndefined();
    const cleared = await stored(page);
    expect(cleared.sessions["w4-m2"]).toBeUndefined();
    expect(cleared.works["w4-m2-variable-evidence-record"]).toBeUndefined();
    expect(cleared.missionCompletionEvidence["w4-m2"]).toBeUndefined();
    expect(cleared.missions["w4-m2"]).toBeUndefined();
    expect(cleared.settings).toEqual(createInitialProgress().settings);
    expect(cleared.privacy).toEqual(createInitialProgress().privacy);
    await page.goto("./#/");
    await expect(page.getByRole("button", { name: "我知道了", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "我知道了", exact: true }).click();
    await page.goto("./#/mission/w4-m3");
    await expect(page.getByRole("heading", { name: "这一关还没有解锁" })).toBeVisible();
    await page.goto("./#/");
    await expect(page.getByRole("button", { name: "第一次变化，未解锁", exact: true })).toBeDisabled();
  });

  test("@w4-m2-python-security built Worker request-response probe", async ({
    page,
  }) => {
    await gotoVariables(page);
    await waitReady(page);
    const before = await page.evaluate(
      ([current, revision]) => ({
        current: Storage.prototype.getItem.call(
          globalThis.localStorage,
          current,
        ),
        revision: Storage.prototype.getItem.call(
          globalThis.localStorage,
          revision,
        ),
      }),
      [CURRENT_KEY, REVISION_KEY],
    );
    const probe = await page.evaluate(async () => {
      const workerUrl = performance
        .getEntriesByType("resource")
        .map((entry) => entry.name)
        .find((url) => url.includes("weekFourVariablePython.worker-"));
      if (!workerUrl) throw new Error("built W4-M2 Worker is missing");
      const worker = new Worker(workerUrl, { type: "module" });
      let nextRequestId = 1;
      const requestIds: number[] = [];
      const results: Array<{ label: string; requestId: number; type: string }> = [];
      const inputs = [
        { label: "syntax error", code: "appearance =" },
        { label: "import", code: "import os" },
        { label: "file", code: "open('save.txt')" },
        { label: "browser-network", code: "from js import fetch" },
        { label: "browser-location", code: "window.location" },
        { label: "attribute", code: "identity.__class__" },
        { label: "subscript", code: "identity[0]" },
        { label: "eval", code: 'eval("1")' },
        { label: "dunder", code: '__import__("os")' },
        { label: "unknown call", code: "unknown_name()" },
        { label: "infinite loop", code: "while True: pass" },
      ];
      try {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("ready timeout")),
            20_000,
          );
          worker.onmessage = (event) => {
            if (event.data?.type === "ready") {
              clearTimeout(timer);
              resolve();
            }
            if (event.data?.type === "load-error") {
              clearTimeout(timer);
              reject(new Error(event.data.error));
            }
          };
        });
        for (const { label, code } of inputs) {
          const requestId = nextRequestId++;
          requestIds.push(requestId);
          const message = await Promise.race([
            new Promise<any>((resolve) => {
              worker.onmessage = (event) => {
                if (event.data?.requestId === requestId) resolve(event.data);
              };
              worker.postMessage({ type: "run", requestId, code });
            }),
            new Promise<string>((resolve) =>
              setTimeout(() => resolve("timeout"), 1_000),
            ),
          ]);
          results.push({ label, requestId, type: message === "timeout" ? "timeout" : message?.type ?? "missing" });
        }
        return { requestIds, results };
      } finally {
        worker.terminate();
      }
    });
    expect(probe.results).toHaveLength(11);
    expect(probe.results.every((item) => item.type === "error" || item.type === "timeout")).toBe(true);
    expect(new Set(probe.requestIds).size).toBe(probe.results.length);
    const after = await page.evaluate(
      ([current, revision]) => ({
        current: Storage.prototype.getItem.call(
          globalThis.localStorage,
          current,
        ),
        revision: Storage.prototype.getItem.call(
          globalThis.localStorage,
          revision,
        ),
      }),
      [CURRENT_KEY, REVISION_KEY],
    );
    expect(after).toEqual(before);
  });
  test("@w4-m2-runtime-fault load real runtime error counts no run then retries", async ({
    page,
  }) => {
    const fault = async (mode: string) => setStorageFaultMode(mode);
    const retry = async () =>
      page.getByRole("button", { name: "重试保存" }).click();
    await page.goto("./");
    let unavailable = true;
    await page.route(/pyodide\.mjs(?:\?.*)?$/, async (route) => {
      if (unavailable) {
        expectedFailureUrl = route.request().url();
        await route.fulfill({ status: 503, body: "runtime unavailable" });
      } else await route.continue();
    });
    await fault("fail-w4-m2-runtime-load");
    await gotoVariables(page);
    await run(page);
    await expect(
      page.getByText("Python 运行环境暂时不可用，运行状态已经保存；这不算学习错误，可以再次运行。"),
    ).toBeVisible({ timeout: 25_000 });
    const progress = await stored(page);
    expect(progress.sessions["w4-m2"]?.runnerInfrastructureFailures).toBe(1);
    expect(progress.sessions["w4-m2"]?.totalRuns).toBe(0);
    unavailable = false;
    expectedFailureUrl = null;
    await run(page);
    await expect(page.getByText("外形匣被覆盖，身份匣为空；这个失败事实已经保存。")).toBeVisible({ timeout: 25_000 });
    const retried = await stored(page);
    expect(retried.sessions["w4-m2"]?.lastRun?.finalState).toBe("evidence-unsealed");
    expect(retried.sessions["w4-m2"]?.runnerInfrastructureFailures).toBe(1);
    expect(retried.sessions["w4-m2"]?.totalRuns).toBe(1);
    expect(retried.sessions["w4-m2"]?.overwriteFailures).toBe(1);
    expect(retried.missions["w4-m2"]).toBeUndefined();
    expect(retried.works["w4-m2-variable-evidence-record"]).toBeUndefined();
    expect(retried.missionCompletionEvidence["w4-m2"]).toBeUndefined();
    await page.goto("./#/mission/w4-m3");
    await expect(page.getByRole("heading", { name: "这一关还没有解锁" })).toBeVisible();
  });
  test("@w4-m2-runtime-fault timeout worker timeout counts one run then retries", async ({
    page,
  }) => {
    const fault = async (mode: string) => setStorageFaultMode(mode);
    const retry = async () =>
      page.getByRole("button", { name: "重试保存" }).click();
    await page.goto("./");
    let timeoutActive = true;
    await page.route(
      /weekFourVariablePython\.worker-[^/]+\.js/,
      async (route) => {
        if (!timeoutActive) {
          await route.continue();
          return;
        }
        expectedFailureUrl = route.request().url();
        await route.fulfill({
          status: 200,
          contentType: "application/javascript",
          body: "self.postMessage({ type: 'ready' }); self.onmessage = () => {};",
        });
      },
    );
    await fault("fail-w4-m2-runtime-timeout");
    await gotoVariables(page);
    await run(page);
    await expect(
      page.getByText("Python 运行环境暂时不可用，运行状态已经保存；这不算学习错误，可以再次运行。"),
    ).toBeVisible({ timeout: 25_000 });
    const progress = await stored(page);
    expect(progress.sessions["w4-m2"]?.runnerInfrastructureFailures).toBe(1);
    expect(progress.sessions["w4-m2"]?.totalRuns).toBe(1);
    timeoutActive = false;
    expectedFailureUrl = null;
    await run(page);
    await expect(page.getByText("外形匣被覆盖，身份匣为空；这个失败事实已经保存。")).toBeVisible({ timeout: 25_000 });
    const retried = await stored(page);
    expect(retried.sessions["w4-m2"]?.lastRun?.finalState).toBe("evidence-unsealed");
    expect(retried.sessions["w4-m2"]?.runnerInfrastructureFailures).toBe(1);
    expect(retried.sessions["w4-m2"]?.totalRuns).toBe(2);
    expect(retried.sessions["w4-m2"]?.overwriteFailures).toBe(1);
    expect(retried.missions["w4-m2"]).toBeUndefined();
    expect(retried.works["w4-m2-variable-evidence-record"]).toBeUndefined();
    expect(retried.missionCompletionEvidence["w4-m2"]).toBeUndefined();
    await page.goto("./#/mission/w4-m3");
    await expect(page.getByRole("heading", { name: "这一关还没有解锁" })).toBeVisible();
  });
  test("@w4-m2-asset-fault local asset retry has no playback, completion, or duplicate worker run", async ({
    page,
  }) => {
    const fault = async (mode: string) => setStorageFaultMode(mode);
    const retry = async () =>
      page.getByRole("button", { name: "重试场景资源" }).click();
    await page.goto("./");
    let failed = true;
    await page.route(/variable-record-states\.webp/, async (route) => {
      if (failed) {
        expectedFailureUrl = route.request().url();
        await route.fulfill({ status: 503, body: "asset fault" });
      } else await route.continue();
    });
    await fault("fail-w4-m2-assets");
    await gotoVariables(page);
    await chooseIdentity(page);
    await run(page);
    await expect.poll(async () => (await stored(page)).sessions["w4-m2"]?.lastRun?.finalState).toBe("evidence-sealed");
    await expect.poll(async () => (await stored(page)).sessions["w4-m2"]?.totalRuns).toBe(1);
    await expect(page.getByRole("dialog", { name: "闯关成功" })).toHaveCount(0);
    const progress = await stored(page);
    await expect(page.getByTestId("variable-state-sealed")).toHaveCount(1);
    await expect(page.getByRole("note")).toHaveCount(0);
    expect(progress.works["w4-m2-variable-evidence-record"]).toBeUndefined();
    expect(progress.missionCompletionEvidence["w4-m2"]).toBeUndefined();
    expect(progress.missions["w4-m2"]).toBeUndefined();
    expect(progress.sessions["w4-m2"]?.runnerInfrastructureFailures).toBe(0);
    expect(progress.sessions["w4-m2"]?.overwriteFailures).toBe(0);
    const workerRunCount = progress.sessions["w4-m2"]?.totalRuns;
    expect(workerRunCount).toBe(1);
    failed = false;
    expectedFailureUrl = null;
    await page
      .getByRole("button", { name: "重试场景资源", exact: true })
      .click();
    await expect.poll(async () => (await stored(page)).missionCompletionEvidence["w4-m2"]?.kind).toBe("formal-v3");
    await expect(page.getByRole("dialog", { name: "闯关成功" })).toBeVisible();
    const retriedProgress = await stored(page);
    expect(retriedProgress.works["w4-m2-variable-evidence-record"]).toBeDefined();
    expect(retriedProgress.missionCompletionEvidence["w4-m2"]?.kind).toBe("formal-v3");
    expect(retriedProgress.missions["w4-m2"]?.attempts).toBe(1);
    expect(retriedProgress.sessions["w4-m2"]?.runnerInfrastructureFailures).toBe(0);
    expect(retriedProgress.sessions["w4-m2"]?.overwriteFailures).toBe(0);
    expect(retriedProgress.sessions["w4-m2"]?.totalRuns).toBe(workerRunCount);
  });
  test("@w4-m2-lazy local lazy retry has no playback, completion, or duplicate worker run", async ({
    page,
  }) => {
    const fault = async (mode: string) => setStorageFaultMode(mode);
    const retry = async () =>
      page.getByRole("button", { name: "重新加载页面" }).click();
    await page.goto("./");
    let assetFailed = true;
    await page.route(/variable-record-states\.webp/, async (route) => {
      if (assetFailed) { expectedFailureUrl = route.request().url(); await route.fulfill({ status: 503, body: "asset fault" }); }
      else await route.continue();
    });
    await gotoVariables(page);
    await chooseIdentity(page);
    await run(page);
    await expect.poll(async () => (await stored(page)).sessions["w4-m2"]?.lastRun?.finalState).toBe("evidence-sealed");
    const workerRunCount = (await stored(page)).sessions["w4-m2"]?.totalRuns;
    expect(workerRunCount).toBe(1);
    await page.goto("./#/");
    await page.reload();
    let failed = false;
    await page.route(
      /WeekFourVariableEvidenceExperience-[^/]+\.js/,
      async (route) => {
        if (!failed) {
          failed = true;
          expectedFailureUrl = route.request().url();
          await route.fulfill({ status: 503, body: "lazy fault" });
        } else await route.continue();
      },
    );
    await page.goto("./#/mission/w4-m2");
    await expect(page.getByRole("alert")).toBeVisible();
    const progress = await stored(page);
    await expect(page.getByTestId("variable-state-sealed")).toHaveCount(0);
    await expect(page.getByRole("note")).toHaveCount(0);
    expect(progress.works["w4-m2-variable-evidence-record"]).toBeUndefined();
    expect(progress.missionCompletionEvidence["w4-m2"]).toBeUndefined();
    expect(progress.missions["w4-m2"]).toBeUndefined();
    expect(progress.sessions["w4-m2"]?.runnerInfrastructureFailures).toBe(0);
    expect(progress.sessions["w4-m2"]?.overwriteFailures).toBe(0);
    expect(progress.sessions["w4-m2"]?.totalRuns).toBe(workerRunCount);
    await page
      .getByRole("button", { name: "重新加载页面", exact: true })
      .click();
    await expect(page.locator(".week-four-variable-evidence-experience")).toBeVisible();
    assetFailed = false;
    expectedFailureUrl = null;
    await page.getByRole("button", { name: "重试场景资源", exact: true }).click();
    await expect.poll(async () => (await stored(page)).missionCompletionEvidence["w4-m2"]?.kind).toBe("formal-v3");
    await expect(page.getByRole("dialog", { name: "闯关成功" })).toBeVisible();
    const retriedProgress = await stored(page);
    expect(retriedProgress.works["w4-m2-variable-evidence-record"]).toBeDefined();
    expect(retriedProgress.missionCompletionEvidence["w4-m2"]?.kind).toBe("formal-v3");
    expect(retriedProgress.missions["w4-m2"]?.attempts).toBe(1);
    expect(retriedProgress.sessions["w4-m2"]?.runnerInfrastructureFailures).toBe(0);
    expect(retriedProgress.sessions["w4-m2"]?.overwriteFailures).toBe(0);
    expect(retriedProgress.sessions["w4-m2"]?.totalRuns).toBe(workerRunCount);
  });
  test("@w4-m2-narrow narrow layout has no horizontal overflow", async ({
    page,
  }) => {
    await gotoVariables(page);
    const geometry = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(geometry.scroll).toBeLessThanOrEqual(geometry.width);
    await expect(page.getByLabel("白虎岭变量取证舞台")).toBeVisible();
  });
  test("@w4-m2-cold desktop cold runtime bytes and warm saved run", async ({
    page,
    context,
  }, testInfo) => {
    const responses: any[] = [];
    context.on("response", (response) => responses.push(response));
    const chromiumProject = testInfo.project.name.includes("chromium");
    const expectedRuntimeFiles = [
      "pyodide.mjs",
      "pyodide.asm.mjs",
      "pyodide.asm.wasm",
      "python_stdlib.zip",
      "pyodide-lock.json",
    ];
    const buildManifest = JSON.parse(
      readFileSync(new URL("../dist-e2e/.vite/manifest.json", import.meta.url), "utf8"),
    );
    const localClosureFiles = [...collectRuntimeClosure(
      buildManifest,
      "src/components/WeekFourVariableEvidenceExperience.tsx",
    )]
      .map((key) => buildManifest[key]?.file)
      .filter((file): file is string => typeof file === "string" && file.endsWith(".js"));
    const localManifestBytes = localClosureFiles.reduce(
      (sum, file) => sum + statSync(new URL(`../dist-e2e/${file}`, import.meta.url)).size,
      0,
    );
    const workerFiles = readdirSync(new URL("../dist-e2e/assets/", import.meta.url))
      .filter((file) => /^weekFourVariablePython\.worker-.*\.js$/.test(file));
    expect(workerFiles).toHaveLength(1);
    const weekFourVariableWorkerBytes = statSync(
      new URL(`../dist-e2e/assets/${workerFiles[0]}`, import.meta.url),
    ).size;
    const compatibleRuntimeBytes = new Map<string, number>();
    if (!chromiumProject) {
      await context.route("**/runtime/pyodide-314.0.2/**", async (route) => {
        const response = await route.fetch();
        const body = await response.body();
        const pathname = new URL(route.request().url()).pathname;
        compatibleRuntimeBytes.set(pathname, body.byteLength);
        await route.fulfill({ response, body });
      });
    }
    const client = chromiumProject ? await context.newCDPSession(page) : null;
    if (client) {
      await client.send("Network.enable");
      await client.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 0,
        downloadThroughput: 1_250_000,
        uploadThroughput: 1_250_000,
        connectionType: "cellular3g",
      });
      await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }
    const navigationStart = performance.now();
    await page.goto("./#/mission/w4-m2");
    await expect(
      page
        .locator(".week-four-variable-evidence-experience")
        .getByRole("heading", { name: "两只证据匣，别让变量被覆盖" }),
    ).toBeVisible();
    await expect(page.getByLabel("W4-M2 Python 代码")).toBeVisible();
    await expect(
      page.getByRole("status", { name: "Python 运行环境已准备" }),
    ).toBeVisible({ timeout: 25_000 });
    const workerReadyAt = performance.now();
    const runtimeRoot = new URL("runtime/pyodide-314.0.2/", page.url());
    expect(runtimeRoot.pathname).toBe(
      "/xiyou-programming-journey/runtime/pyodide-314.0.2/",
    );
    const compatibilityProbeFiles = !chromiumProject
      ? expectedRuntimeFiles.filter(
        (file) => ![...compatibleRuntimeBytes.keys()].some((pathname) => pathname.endsWith(file)),
      )
      : [];
    if (compatibilityProbeFiles.length > 0) {
      await page.evaluate(async ({ root, files }) => {
        await Promise.all(files.map(async (file) => {
          const response = await fetch(new URL(file, root), { cache: "no-store" });
          if (!response.ok) throw new Error(`runtime compatibility probe failed: ${response.status}`);
          await response.arrayBuffer();
        }));
      }, { root: runtimeRoot.href, files: compatibilityProbeFiles });
    }
    const localClosurePaths = new Set(
      localClosureFiles.map((file) => new URL(file, page.url()).pathname),
    );
    const localResponsesByPath = new Map<string, any>();
    for (const response of responses) {
      const pathname = new URL(response.url()).pathname;
      if (response.status() >= 200 && response.status() < 400 && localClosurePaths.has(pathname)) {
        localResponsesByPath.set(pathname, response);
      }
    }
    const requiredObservedLocalFiles = localClosureFiles.filter(
      (file) => file.includes("WeekFourVariableEvidenceExperience-")
        || file.includes("codemirror-editor-"),
    );
    expect(
      requiredObservedLocalFiles.every((file) =>
        localResponsesByPath.has(new URL(file, page.url()).pathname),
      ),
    ).toBe(true);
    const pyodideResponses = responses.filter((response) =>
      expectedRuntimeFiles.some((file) => response.url().endsWith(file)),
    );
    if (chromiumProject) {
      expect(pyodideResponses).toHaveLength(5);
      expect(
        new Set(
          pyodideResponses.map((response) => new URL(response.url()).pathname),
        ).size,
      ).toBe(5);
    } else {
      expect(
        expectedRuntimeFiles.every((file) =>
          [...compatibleRuntimeBytes.keys()].some((pathname) => pathname.endsWith(file)),
        ),
      ).toBe(true);
    }
    const localMeasurements = await Promise.all(
      [...localResponsesByPath.values()].map(async (response) => ({
        bytes: (await response.body()).byteLength,
      })),
    );
    const pyodideMeasurements = chromiumProject
      ? await Promise.all(
        pyodideResponses.map(async (response) => {
          const responseUrl = new URL(response.url());
          expect(responseUrl.origin === runtimeRoot.origin).toBe(true);
          expect(responseUrl.pathname.startsWith(runtimeRoot.pathname)).toBe(
            true,
          );
          return { bytes: (await response.body()).byteLength };
        }),
      )
      : expectedRuntimeFiles.map((file) => {
        const entry = [...compatibleRuntimeBytes.entries()].find(([pathname]) =>
          pathname.endsWith(file),
        );
        expect(entry?.[0].startsWith(runtimeRoot.pathname)).toBe(true);
        return { bytes: entry![1] };
      });
    const observedLocalBytes = localMeasurements.reduce(
      (sum, item) => sum + item.bytes,
      0,
    );
    const totalLocalBytes = localManifestBytes + weekFourVariableWorkerBytes;
    const totalPyodideBytes = pyodideMeasurements.reduce(
      (sum, item) => sum + item.bytes,
      0,
    );
    await page.getByRole("button", { name: "运行取证" }).click();
    await expect(
      page.getByText("外形匣被覆盖，身份匣为空；这个失败事实已经保存。"),
    ).toBeVisible();
    await expect(page.getByTestId("variable-state-unsealed")).toHaveAttribute(
      "data-state-cell",
      "unsealed",
    );
    const firstResultAt = performance.now();
    await page
      .getByRole("combobox", { name: "第二次核验写入哪个变量" })
      .selectOption("identity");
    await expect
      .poll(async () => (await stored(page)).sessions["w4-m2"]?.pythonCode)
      .toContain("identity");
    await page.getByRole("button", { name: "运行取证" }).click();
    await expect(page.getByRole("dialog", { name: "闯关成功" })).toBeVisible({
      timeout: 25_000,
    });
    await expect(page.getByTestId("variable-state-sealed")).toHaveAttribute(
      "data-state-cell",
      "sealed",
    );
    const warmResultAt = performance.now();
    const coldMs = firstResultAt - navigationStart;
    const warmMs = warmResultAt - firstResultAt;
    expect(totalLocalBytes).toBeLessThanOrEqual(
      WEEK_FOUR_VARIABLE_COLD_LOAD_MAX_BYTES,
    );
    expect(totalPyodideBytes).toBeLessThanOrEqual(
      PYTHON_RUNTIME_TRANSFER_MAX_BYTES,
    );
    expect(coldMs).toBeLessThanOrEqual(20_000);
    expect(warmMs).toBeLessThanOrEqual(1_000);
    const coldMetricsPath = testInfo.outputPath("w4m2-cold-metrics.json");
    await writeFile(
      coldMetricsPath,
      JSON.stringify({
        totalLocalBytes,
        observedLocalBytes,
        localManifestBytes,
        weekFourVariableWorkerBytes,
        totalPyodideBytes,
        workerReadyMs: workerReadyAt - navigationStart,
        coldMs,
        warmMs,
        throttleMode: chromiumProject ? "10mbps-4x-cpu" : "native-engine-compatible",
        compatibilityProbeFiles,
      }, null, 2),
    );
    await testInfo.attach("w4m2-cold-metrics.json", {
      path: coldMetricsPath,
      contentType: "application/json",
    });
    if (client) await client.detach();
  });
});
