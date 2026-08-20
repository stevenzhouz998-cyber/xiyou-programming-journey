import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import fs from 'node:fs'
import { THIRD_CHAPTER_BOSS_COLD_LOAD_MAX_BYTES, UNDERWORLD_REGISTER_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs'

const CURRENT_KEY = 'xiyou-programming-progress-v3'
const TEST_PARENT_ACCESS = 'access-v1:cf7667b114bf7a735116fc8439f0d17f3213159c48b22be56376521fbbc5cbb1:678bd461a82e086d3332d9c0f72cfae199f75eab78fba024dd8d28acd1702e27'
const NOW = '2026-08-19T00:00:00.000Z'
type MissionId = 'w1-m4' | 'w1-m5'
type HealthEvent = { kind: 'console' | 'pageerror' | 'requestfailed' | 'response'; url: string; detail: string; status?: number }
let healthEvents: HealthEvent[] = []
let activeFaultSignature: ((event: HealthEvent) => boolean) | null = null

function expectedNavigationAbort(event: HealthEvent) {
  return event.kind === 'requestfailed' && (
    (event.url.startsWith('https://fonts.gstatic.com/') && /ABORTED|cancelled/i.test(event.detail))
    || (event.url.includes('/assets/audio/') && /ABORTED|cancelled/i.test(event.detail))
    || (event.url === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(event.detail))
  )
}

function exact503Signature(targetUrl: string) {
  return (event: HealthEvent) => {
    if (event.kind === 'response') return event.url === targetUrl && event.status === 503
    if (event.kind === 'requestfailed') return event.url === targetUrl
    if (event.kind !== 'console' && event.kind !== 'pageerror') return false
    if (event.url === targetUrl && event.detail === 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)') return true
    const failure = `Failed to fetch dynamically imported module: ${targetUrl}`
    return event.detail === failure || event.detail === `TypeError: ${failure}`
      || (event.detail === 'TypeError: Importing a module script failed.'
        && (/\/assets\/(?:app-vendor|index)-/.test(event.url) || event.url.includes('/#/mission/')))
  }
}

function attachHealth(page: Page) {
  const capture = (event: HealthEvent) => { if (!expectedNavigationAbort(event) && !(activeFaultSignature?.(event) ?? false)) healthEvents.push(event) }
  page.on('console', (message) => { if (message.type() === 'error') capture({ kind: 'console', url: message.location().url || page.url(), detail: message.text() }) })
  page.on('pageerror', (error) => capture({ kind: 'pageerror', url: page.url(), detail: error.message }))
  page.on('requestfailed', (request) => capture({ kind: 'requestfailed', url: request.url(), detail: request.failure()?.errorText ?? 'unknown' }))
  page.on('response', (response) => { if (response.status() >= 400) capture({ kind: 'response', url: response.url(), detail: `HTTP ${response.status()}`, status: response.status() }) })
}

async function newHealthyPage(context: BrowserContext) { const page = await context.newPage(); attachHealth(page); return page }
function firstThreePrerequisites() {
  return {
    version: 3, schemaRevision: 2, learnerName: '小行者',
    missions: Object.fromEntries(['w1-m1', 'w1-m2', 'w1-m3'].map((id) => [id, { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW }])),
    settings: { muted: true, reducedMotion: false, reducedMotionOverride: true, parentPin: TEST_PARENT_ACCESS }, privacy: { localDataNoticeSeen: true }, recovery: { lastRecoveredAt: null, source: null }, sessions: {}, equipment: { version: 1, inventory: { 'ruyi-staff': { grantedBy: 'w1-m2', grantedAt: NOW }, 'phoenix-crown': { grantedBy: 'w1-m3', grantedAt: NOW }, 'golden-chain-armor': { grantedBy: 'w1-m3', grantedAt: NOW }, 'cloud-walking-boots': { grantedBy: 'w1-m3', grantedAt: NOW } }, equipped: { weapon: null, head: null, body: null, feet: null } }, savedAt: NOW,
  }
}
async function installFirstThreePrerequisites(page: Page) {
  await page.addInitScript(({ key, value }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value)) }, { key: CURRENT_KEY, value: firstThreePrerequisites() })
}
async function setStorageFaultMode(page: Page, mode: string) { await page.evaluate((value) => localStorage.setItem('xiyou-test-storage-mode', value), mode) }
async function readOnlyMissionEvidence(page: Page, missionId: MissionId) {
  return page.evaluate(({ key, mission }) => {
    const raw = localStorage.getItem(key); const progress = raw ? JSON.parse(raw) : null
    return { raw, mission: progress?.missions?.[mission] ?? null, session: progress?.sessions?.[mission] ?? null }
  }, { key: CURRENT_KEY, mission: missionId })
}
async function readOnlyEquipment(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw).equipment
  }, CURRENT_KEY)
}
async function openMission(page: Page, missionId: MissionId) {
  await page.goto(`./#/mission/${missionId}`)
  await expect(page.getByRole('heading', { name: missionId === 'w1-m4' ? '幽冥勾名' : '第三回总试炼', level: 1 })).toBeVisible()
  await expect(page.locator('.legacy-mission-tools')).toHaveCount(0)
  await expect(page.locator('.advanced-week-one-workspace')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.advanced-blockly-host')).toBeVisible()
}
async function openUnderworld(page: Page) { await openMission(page, 'w1-m4') }
async function add(page: Page, name: string, keyboard = false) {
  const control = page.getByRole('button', { name }); await expect(control).toBeEnabled()
  if (keyboard) { await control.focus(); await control.press('Enter') } else await control.click()
}
async function deleteVisibleProgramBlock(page: Page, label: string, keyboard = false) {
  const control = page.getByRole('listitem').filter({ hasText: label }).getByRole('button', { name: '删除' })
  if (keyboard) { await control.focus(); await control.press('Enter') } else await control.click()
}
async function completeUnderworldWithVisibleCorrection(page: Page, keyboard = false) {
  await add(page, '加入主程序：打开名册', keyboard); await add(page, '加入主程序：处理已找到的名号', keyboard); await add(page, '执行幽冥勾名指令', keyboard)
  await expect(page.getByRole('alert')).toContainText('顺序'); await deleteVisibleProgramBlock(page, '处理已找到的名号', keyboard)
  for (const name of ['加入主程序：查找猴属记录', '加入查找子程序：读取索引', '加入查找子程序：匹配猴属', '加入查找子程序：收集有名记录', '加入主程序：处理已找到的名号', '加入主程序：核对名册结果']) await add(page, name, keyboard)
  await add(page, '执行幽冥勾名指令', keyboard); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 })
}
async function completeBossWithVisibleCorrection(page: Page, keyboard = false) {
  await add(page, '加入主程序：制定第三回计划', keyboard); await add(page, '加入主程序：验证因果链', keyboard); await add(page, '执行第三回总试炼指令', keyboard)
  await expect(page.getByRole('alert')).toContainText('顺序'); await deleteVisibleProgramBlock(page, '验证因果链', keyboard)
  for (const name of ['加入主程序：龙宫检查点', '加入查找子程序：进入龙宫', '加入查找子程序：比较兵器重量', '加入查找子程序：选定可变化的金箍棒', '加入主程序：披挂检查点', '加入查找子程序：拆分三件礼物', '加入查找子程序：验证披挂齐全', '加入主程序：名册检查点', '加入查找子程序：打开名册', '加入查找子程序：查找猴属记录', '加入查找子程序：处理匹配名号', '加入主程序：验证因果链']) await add(page, name, keyboard)
  await add(page, '执行第三回总试炼指令', keyboard); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 30_000 })
}
async function finishUnderworldAndOpenBoss(page: Page, keyboard = false) {
  await completeUnderworldWithVisibleCorrection(page, keyboard)
  const next = page.getByRole('button', { name: '继续下一关' }); if (keyboard) { await next.focus(); await next.press('Enter') } else await next.click()
  await expect(page.getByRole('heading', { name: '第三回总试炼', level: 1 })).toBeVisible()
}
async function expectReplayDoesNotRepublish(page: Page, missionId: MissionId) {
  const before = await readOnlyMissionEvidence(page, missionId); expect(before.mission).toMatchObject({ status: 'completed', attempts: 1 })
  await page.getByRole('button', { name: '重播最近一次' }).click(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0)
  await expect.poll(() => readOnlyMissionEvidence(page, missionId)).toEqual(before)
}
async function expectResponsiveExperience(page: Page, missionId: MissionId) {
  expect(await page.evaluate(() => ({ document: document.documentElement.scrollWidth - document.documentElement.clientWidth, body: document.body.scrollWidth - document.body.clientWidth }))).toEqual({ document: 0, body: 0 })
  const layout = await page.locator('.advanced-week-one-experience').evaluate((root) => {
    const box = (selector: string) => (root.querySelector(selector) as HTMLElement)?.getBoundingClientRect()
    return { scene: box('.advanced-week-one-scene'), workspace: box('.advanced-week-one-workspace'), feedback: box('.battle-feedback') }
  })
  expect(layout.scene).not.toBeNull(); expect(layout.workspace).not.toBeNull(); expect(layout.feedback).not.toBeNull()
  if ((page.viewportSize()?.width ?? 1440) <= 390) { expect(layout.scene!.top).toBeLessThanOrEqual(layout.workspace!.top); expect(layout.workspace!.top).toBeLessThanOrEqual(layout.feedback!.top) }
  const host = page.locator('.advanced-blockly-host'); await host.scrollIntoViewIfNeeded(); const hostBox = await host.boundingBox(); expect(hostBox).not.toBeNull()
  const blockIds = (await readOnlyMissionEvidence(page, missionId)).session?.workspace?.blocks?.map((block: { id: string }) => block.id) ?? []; expect(blockIds.length).toBeGreaterThan(0)
  expect(hostBox?.width ?? 0).toBeGreaterThan(0); expect(hostBox?.height ?? 0).toBeGreaterThan(0)
  const title = missionId === 'w1-m4' ? '幽冥勾名程序树' : '第三回总试炼程序树'
  await expect(page.getByRole('list', { name: title }).getByRole('listitem')).toHaveCount(blockIds.length)
  const controls = page.locator('.advanced-week-one-experience button:visible:not(:disabled)')
  for (let index = 0; index < await controls.count(); index += 1) { const control = controls.nth(index); await control.scrollIntoViewIfNeeded(); const box = await control.boundingBox(); expect(box?.width ?? 0).toBeGreaterThanOrEqual(44); expect(box?.height ?? 0).toBeGreaterThanOrEqual(44); await control.click({ trial: true }) }
}
function normalizeExecution(evidence: Awaited<ReturnType<typeof readOnlyMissionEvidence>>) {
  const ids = new Map<string, string>(); evidence.session.lastTrace.forEach((item: { sourceBlockId: string }, index: number) => ids.set(item.sourceBlockId, `block-${index + 1}`))
  const normalize = (item: { sourceBlockId: string | null; parentBlockId: string | null; instructionId: string | null }) => ({ ...item, sourceBlockId: item.sourceBlockId === null ? null : ids.get(item.sourceBlockId) ?? item.sourceBlockId, parentBlockId: item.parentBlockId === null ? null : ids.get(item.parentBlockId) ?? item.parentBlockId, instructionId: item.instructionId === null || item.sourceBlockId === null ? null : `instruction:${ids.get(item.sourceBlockId) ?? item.sourceBlockId}` })
  return { trace: evidence.session.lastTrace.map(normalize), events: evidence.session.lastRun.events.map(normalize), finalState: evidence.session.lastRun.finalState }
}

test.beforeEach(async ({ page }) => { healthEvents = []; activeFaultSignature = null; attachHealth(page); await installFirstThreePrerequisites(page) })
test.afterEach(() => { expect(healthEvents, 'unexpected underworld/boss browser health events').toEqual([]) })

test('@advanced-full m4 child-visible wrong-delete-readd-success-refresh keeps its same trace and unlocks m5', async ({ page }) => {
  test.setTimeout(120_000); await openUnderworld(page); await completeUnderworldWithVisibleCorrection(page)
  const before = await readOnlyMissionEvidence(page, 'w1-m4'); expect(before.mission).toMatchObject({ status: 'completed', attempts: 1 }); expect(before.session.lastTrace).toHaveLength(7)
  await page.reload(); await expect(page.getByRole('heading', { name: '幽冥勾名', level: 1 })).toBeVisible(); expect(await readOnlyMissionEvidence(page, 'w1-m4')).toEqual(before); await expectReplayDoesNotRepublish(page, 'w1-m4')
  await page.getByRole('button', { name: '成长地图' }).first().click(); await expect(page.getByRole('button', { name: '第三回总试炼' })).toBeEnabled()
})
test('@advanced-full m5 child-visible wrong-delete-readd-success-refresh keeps its same trace and completes week one', async ({ page }) => {
  test.setTimeout(180_000); await openUnderworld(page); await finishUnderworldAndOpenBoss(page); await completeBossWithVisibleCorrection(page)
  const before = await readOnlyMissionEvidence(page, 'w1-m5'); expect(before.mission).toMatchObject({ status: 'completed', attempts: 1 }); expect(before.session.lastTrace).toHaveLength(13)
  await page.reload(); await expect(page.getByRole('heading', { name: '第三回总试炼', level: 1 })).toBeVisible(); expect(await readOnlyMissionEvidence(page, 'w1-m5')).toEqual(before); await expectReplayDoesNotRepublish(page, 'w1-m5')
  await page.getByRole('button', { name: '成长地图' }).first().click(); await expect(page.getByText('5/5')).toBeVisible()
})
test('@advanced-keyboard Chromium and Firefox construct, delete, rerun and unlock both advanced Blockly missions by keyboard', async ({ page }) => {
  test.setTimeout(180_000); await openUnderworld(page); await finishUnderworldAndOpenBoss(page, true); await completeBossWithVisibleCorrection(page, true); expect((await readOnlyMissionEvidence(page, 'w1-m5')).mission).toMatchObject({ status: 'completed' })
})
test('@advanced-narrow 390 and 320 retain complete visible graphs, feedback, geometry and 44px controls for both missions', async ({ page }) => {
  test.setTimeout(180_000); await openUnderworld(page); await add(page, '加入主程序：打开名册'); await add(page, '执行幽冥勾名指令'); await expect(page.getByRole('alert')).toBeVisible(); await expectResponsiveExperience(page, 'w1-m4'); await deleteVisibleProgramBlock(page, '打开名册')
  await finishUnderworldAndOpenBoss(page); await add(page, '加入主程序：制定第三回计划'); await add(page, '执行第三回总试炼指令'); await expect(page.getByRole('alert')).toBeVisible(); await expectResponsiveExperience(page, 'w1-m5')
})
test('@advanced-parity normal and muted reduced-motion executions keep m4 and m5 semantic traces identical', async ({ page, browser }) => {
  test.setTimeout(240_000); await openUnderworld(page); await finishUnderworldAndOpenBoss(page); await completeBossWithVisibleCorrection(page)
  const standard = { m4: normalizeExecution(await readOnlyMissionEvidence(page, 'w1-m4')), m5: normalizeExecution(await readOnlyMissionEvidence(page, 'w1-m5')) }
  const mutedContext = await browser.newContext({ baseURL: 'http://127.0.0.1:4173/xiyou-programming-journey/', viewport: page.viewportSize() ?? { width: 1440, height: 1024 }, serviceWorkers: 'block' })
  try { const mutedPage = await newHealthyPage(mutedContext); await installFirstThreePrerequisites(mutedPage); await openUnderworld(mutedPage); await mutedPage.getByRole('button', { name: '减弱动画' }).click(); await expect(mutedPage.getByRole('button', { name: '开启声音' })).toBeVisible(); await finishUnderworldAndOpenBoss(mutedPage); await completeBossWithVisibleCorrection(mutedPage); await expect(mutedPage.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true'); expect({ m4: normalizeExecution(await readOnlyMissionEvidence(mutedPage, 'w1-m4')), m5: normalizeExecution(await readOnlyMissionEvidence(mutedPage, 'w1-m5')) }).toEqual(standard) } finally { await mutedContext.close() }
})
test('@advanced-storage m4 draft write failure remains uncommitted until its visible retry', async ({ page }) => {
  await openUnderworld(page); const before = await readOnlyMissionEvidence(page, 'w1-m4'); await setStorageFaultMode(page, 'fail-advanced-draft'); await add(page, '加入主程序：打开名册')
  const retry = page.getByRole('button', { name: '重试保存积木' }); await expect(retry).toBeVisible(); expect(await readOnlyMissionEvidence(page, 'w1-m4')).toEqual(before); await setStorageFaultMode(page, 'off'); await retry.click(); await expect.poll(async () => (await readOnlyMissionEvidence(page, 'w1-m4')).session?.workspace.blocks.length ?? 0).toBe(1)
})
test('@advanced-storage equipment write failure stays visible and publishes only after the drawer retry', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: '打开装备行囊' }).click(); const drawer = page.getByRole('dialog', { name: '装备行囊' }); const before = await readOnlyEquipment(page)
  await setStorageFaultMode(page, 'fail-equipment'); await drawer.getByRole('button', { name: '装备如意金箍棒' }).click(); await expect(drawer.getByRole('alert')).toContainText('装备选择还没有保存'); expect(await readOnlyEquipment(page)).toEqual(before)
  await setStorageFaultMode(page, 'off'); await drawer.getByRole('button', { name: '重试保存装备选择' }).click(); await expect(drawer.getByRole('button', { name: '卸下如意金箍棒' })).toBeEnabled(); await expect.poll(async () => (await readOnlyEquipment(page)).equipped.weapon).toBe('ruyi-staff')
})
test('@advanced-storage m4 blocked run write failure has a visible retry and cannot complete early', async ({ page }) => {
  test.setTimeout(120_000); await openUnderworld(page); for (const name of ['加入主程序：打开名册', '加入主程序：查找猴属记录', '加入查找子程序：读取索引', '加入查找子程序：匹配猴属', '加入查找子程序：收集有名记录', '加入主程序：处理已找到的名号']) await add(page, name)
  await expect.poll(async () => (await readOnlyMissionEvidence(page, 'w1-m4')).session?.workspace.blocks.length ?? 0).toBe(6); const before = await readOnlyMissionEvidence(page, 'w1-m4'); await setStorageFaultMode(page, 'fail-advanced-session'); await add(page, '执行幽冥勾名指令'); const retry = page.getByRole('button', { name: '重试保存本次记录' }); await expect(retry).toBeVisible(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0); expect(await readOnlyMissionEvidence(page, 'w1-m4')).toEqual(before); await setStorageFaultMode(page, 'off'); await retry.click(); await expect.poll(async () => (await readOnlyMissionEvidence(page, 'w1-m4')).session?.lastRun?.completed ?? null).toBe(false); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0)
})
test('@advanced-storage m4 completion write stays unpublished until its visible retry', async ({ page }) => {
  test.setTimeout(120_000); await openUnderworld(page); for (const name of ['加入主程序：打开名册', '加入主程序：查找猴属记录', '加入查找子程序：读取索引', '加入查找子程序：匹配猴属', '加入查找子程序：收集有名记录', '加入主程序：处理已找到的名号', '加入主程序：核对名册结果']) await add(page, name)
  await expect.poll(async () => (await readOnlyMissionEvidence(page, 'w1-m4')).session?.workspace.blocks.length ?? 0).toBe(7); await setStorageFaultMode(page, 'fail-advanced-completion'); await add(page, '执行幽冥勾名指令'); const retry = page.getByRole('button', { name: '重试保存通关' }); await expect(retry).toBeVisible({ timeout: 15_000 }); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0); expect((await readOnlyMissionEvidence(page, 'w1-m4')).mission).toBeNull(); await setStorageFaultMode(page, 'off'); await retry.click(); await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
})
test('@advanced-external a real stale tab offers backup and loads the external m4 completion without reviving its own state', async ({ page }) => {
  test.setTimeout(180_000); await openUnderworld(page); await add(page, '加入主程序：打开名册'); const externalPage = await newHealthyPage(page.context())
  try { await installFirstThreePrerequisites(externalPage); await openUnderworld(externalPage); await deleteVisibleProgramBlock(externalPage, '打开名册'); await completeUnderworldWithVisibleCorrection(externalPage); const external = await readOnlyMissionEvidence(externalPage, 'w1-m4'); await expect(page.getByRole('button', { name: '下载本页备份' })).toBeVisible({ timeout: 15_000 }); const downloadStarted = page.waitForEvent('download'); await page.getByRole('button', { name: '下载本页备份' }).click(); expect(await (await downloadStarted).path()).not.toBeNull(); await page.getByRole('button', { name: '载入其他标签页版本' }).click(); await expect.poll(() => readOnlyMissionEvidence(page, 'w1-m4')).toEqual(external) } finally { await externalPage.close() }
})
test('@advanced-external a stale equipment drawer cannot overwrite another tab and reloads the winning loadout', async ({ page }) => {
  await page.goto('./'); await page.getByRole('button', { name: '打开装备行囊' }).click(); const stalePage = await newHealthyPage(page.context())
  try {
    await stalePage.goto('./'); await stalePage.getByRole('button', { name: '打开装备行囊' }).click(); await page.getByRole('dialog', { name: '装备行囊' }).getByRole('button', { name: '装备如意金箍棒' }).click()
    const staleDrawer = stalePage.getByRole('dialog', { name: '装备行囊' }); await expect(staleDrawer.getByRole('alert')).toContainText('其他标签页已经更新装备'); await staleDrawer.getByRole('button', { name: '载入其他标签页装备' }).click(); await expect(staleDrawer.getByRole('button', { name: '卸下如意金箍棒' })).toBeEnabled(); expect((await readOnlyEquipment(stalePage)).equipped.weapon).toBe('ruyi-staff')
  } finally { await stalePage.close() }
})
test('@advanced-corrupt damaged advanced current bytes remain downloadable while m4 recovers its exact session', async ({ page }) => {
  test.setTimeout(180_000); await openUnderworld(page); await completeUnderworldWithVisibleCorrection(page); const before = await readOnlyMissionEvidence(page, 'w1-m4'); const beforeEquipment = await readOnlyEquipment(page); await setStorageFaultMode(page, 'corrupt-advanced-current'); await page.reload(); await expect(page.getByText('学习进度已经安全恢复')).toBeVisible(); await expect.poll(async () => (await readOnlyMissionEvidence(page, 'w1-m4')).session).toEqual(before.session); expect(await readOnlyEquipment(page)).toEqual(beforeEquipment)
  await page.getByRole('button', { name: '成长地图' }).first().click(); await page.getByRole('button', { name: '家长周报' }).click(); await page.getByLabel('家长 PIN').fill('4826'); await page.getByRole('button', { name: '进入周报' }).click(); await expect(page.getByRole('region', { name: '装备与跨关学习工具' })).toContainText('如意金箍棒第二关「定海神针」通关获得'); const downloadStarted = page.waitForEvent('download'); await page.getByRole('button', { name: '下载损坏原文' }).click(); const file = await (await downloadStarted).path(); expect(file).not.toBeNull(); expect(JSON.parse(fs.readFileSync(file!, 'utf8')).current).toBe('{broken advanced current')
})
test('@advanced-parent report includes m4/m5 and file export-import restores the exact completed sessions', async ({ page }) => {
  test.setTimeout(240_000); await openUnderworld(page); await finishUnderworldAndOpenBoss(page); await completeBossWithVisibleCorrection(page); const before = { m4: (await readOnlyMissionEvidence(page, 'w1-m4')).session, m5: (await readOnlyMissionEvidence(page, 'w1-m5')).session }
  await page.getByRole('button', { name: '回成长地图' }).click(); await page.getByRole('button', { name: '家长周报' }).click(); await page.getByLabel('家长 PIN').fill('4826'); await page.getByRole('button', { name: '进入周报' }).click(); await expect(page.getByText('已完成：龙宫求兵、定海神针、四海披挂、幽冥勾名、第三回总试炼')).toBeVisible(); await expect(page.getByText(/运行 .* 次 · 调整 .* 次/)).toBeVisible()
  const downloadStarted = page.waitForEvent('download'); await page.getByRole('button', { name: '导出进度' }).click(); const file = await (await downloadStarted).path(); expect(file).not.toBeNull(); const exported = JSON.parse(fs.readFileSync(file!, 'utf8')); expect({ m4: exported.sessions['w1-m4'], m5: exported.sessions['w1-m5'] }).toEqual(before)
  await page.getByRole('button', { name: '成长地图' }).click(); await page.getByRole('button', { name: '幽冥勾名' }).click(); await deleteVisibleProgramBlock(page, '核对名册结果'); await expect.poll(async () => (await readOnlyMissionEvidence(page, 'w1-m4')).session).not.toEqual(before.m4); await page.getByRole('button', { name: '成长地图' }).first().click(); await page.getByRole('button', { name: '家长周报' }).click(); await page.getByLabel('家长 PIN').fill('4826'); await page.getByRole('button', { name: '进入周报' }).click(); await page.getByLabel('选择进度文件').setInputFiles({ name: 'advanced-week-one.json', mimeType: 'application/json', buffer: fs.readFileSync(file!) }); await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible(); expect({ m4: (await readOnlyMissionEvidence(page, 'w1-m4')).session, m5: (await readOnlyMissionEvidence(page, 'w1-m5')).session }).toEqual(before)
})
test('@advanced-chunk-fault outer AdvancedWeekOneExperience 503 shows retry and cannot complete before real Blockly loads', async ({ page }) => {
  let failures = 0; await page.route(/AdvancedWeekOneExperience-.*\.js/, (route) => { failures += 1; activeFaultSignature = exact503Signature(route.request().url()); return failures === 1 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue() }); await page.goto('./#/mission/w1-m4'); await expect(page.getByRole('alert')).toContainText('幽冥与总试炼任务加载失败'); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0); await page.getByRole('button', { name: '重新加载页面' }).click(); await expect(page.locator('.advanced-week-one-workspace')).toBeVisible({ timeout: 15_000 }); activeFaultSignature = null
})
test('@advanced-chunk-fault inner AdvancedWeekOneScene 503 exposes the route retry and cannot complete early', async ({ page }) => {
  let failures = 0; await page.route(/AdvancedWeekOneScene-.*\.js/, (route) => { failures += 1; activeFaultSignature = exact503Signature(route.request().url()); return failures === 1 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue() }); await page.goto('./#/mission/w1-m4'); await expect(page.getByRole('alert')).toContainText('幽冥与总试炼任务加载失败'); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0); await page.getByRole('button', { name: '重新加载页面' }).click(); await expect(page.locator('.advanced-week-one-scene')).toHaveAttribute('data-scene-ready', 'true', { timeout: 15_000 }); activeFaultSignature = null
})
test('@advanced-chunk-fault inner AdvancedWeekOneBlocklyWorkspace 503 exposes the route retry and cannot complete early', async ({ page }) => {
  let failures = 0; await page.route(/AdvancedWeekOneBlocklyWorkspace-.*\.js/, (route) => { failures += 1; activeFaultSignature = exact503Signature(route.request().url()); return failures === 1 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue() }); await page.goto('./#/mission/w1-m4'); await expect(page.getByRole('alert')).toContainText('幽冥与总试炼任务加载失败'); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0); await page.getByRole('button', { name: '重新加载页面' }).click(); await expect(page.locator('.advanced-week-one-workspace')).toBeVisible({ timeout: 15_000 }); activeFaultSignature = null
})
test('@advanced-asset-fault active scene image 503 offers an exact retry and cannot complete early', async ({ page }) => {
  const target = 'http://127.0.0.1:4173/xiyou-programming-journey/assets/week-one-advanced/register-states.webp'; let attempts = 0; let recover = false; activeFaultSignature = exact503Signature(target); await page.route(target, async (route) => { attempts += 1; if (!recover) await route.fulfill({ status: 503, contentType: 'image/webp', body: 'expected advanced asset failure' }); else await route.continue() }); await openUnderworld(page); await expect.poll(() => attempts).toBeGreaterThanOrEqual(1); await expect(page.getByRole('alert')).toContainText('场景图片没有加载成功'); await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0); recover = true; await page.getByRole('button', { name: '重试加载场景图片' }).click(); await expect(page.locator('.advanced-week-one-scene')).toHaveAttribute('data-scene-ready', 'true', { timeout: 15_000 }); activeFaultSignature = null
})
test('@advanced-cold m4 and m5 cold response bodies are fail-closed, stay within 3MiB, and local production missing asset is 404', async ({ page, browser }, testInfo) => {
  test.setTimeout(180_000)
  for (const mission of [{ id: 'w1-m4' as const, limit: UNDERWORLD_REGISTER_COLD_LOAD_MAX_BYTES }, { id: 'w1-m5' as const, limit: THIRD_CHAPTER_BOSS_COLD_LOAD_MAX_BYTES }]) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173/xiyou-programming-journey/', viewport: page.viewportSize() ?? { width: 1440, height: 1024 }, serviceWorkers: 'block' })
    try {
      const setupPage = await newHealthyPage(context); await installFirstThreePrerequisites(setupPage)
      if (mission.id === 'w1-m5') { await openUnderworld(setupPage); await completeUnderworldWithVisibleCorrection(setupPage) }
      await setupPage.close()
      const coldPage = await newHealthyPage(context); if (mission.id === 'w1-m4') await installFirstThreePrerequisites(coldPage); await coldPage.route('**/*', async (route) => route.continue({ headers: { ...route.request().headers(), 'cache-control': 'no-store', pragma: 'no-cache' } }))
      const failures: string[] = []; coldPage.on('requestfailed', (request) => failures.push(`${request.url()} ${request.failure()?.errorText ?? 'unknown'}`)); const bodies: Array<Promise<{ url: string; status: number; bytes: number }>> = []
      coldPage.on('response', (response) => { const protocol = new URL(response.url()).protocol; if (protocol === 'http:' || protocol === 'https:') bodies.push((async () => ({ url: response.url(), status: response.status(), bytes: (await response.body()).byteLength }))()) })
      await coldPage.goto(`./#/mission/${mission.id}`); await expect(coldPage.locator('.advanced-week-one-workspace')).toBeVisible({ timeout: 15_000 }); await coldPage.waitForLoadState('networkidle'); const responses = await Promise.all(bodies); expect(failures, `${mission.id} request failures`).toEqual([]); expect(responses.filter(({ status }) => status < 200 || status >= 300), `${mission.id} non-2xx response`).toEqual([]); const bytes = responses.reduce((sum, response) => sum + response.bytes, 0); await testInfo.attach(`advanced-cold-${mission.id}.json`, { body: Buffer.from(JSON.stringify({ project: testInfo.project.name, mission, bytes, limit: mission.limit, responses }, null, 2)), contentType: 'application/json' }); expect(bytes, `${mission.id} cold bytes`).toBeLessThanOrEqual(mission.limit); expect((await coldPage.request.get('/xiyou-programming-journey/assets/week-one-advanced/missing-production-asset.webp', { headers: { accept: 'image/webp' } })).status()).toBe(404)
    } finally { await context.close() }
  }
})
