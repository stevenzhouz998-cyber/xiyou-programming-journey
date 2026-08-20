import { expect, test, type BrowserContext, type Page, type TestInfo } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { FOUR_SEAS_COLD_LOAD_MAX_BYTES, DRAGON_PALACE_COLD_LOAD_MAX_BYTES, RUYI_STAFF_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs'

const CURRENT_KEY = 'xiyou-programming-progress-v3'
const NOW = '2026-07-19T00:00:00.000Z'
const TEST_PARENT_ACCESS = 'access-v1:cf7667b114bf7a735116fc8439f0d17f3213159c48b22be56376521fbbc5cbb1:678bd461a82e086d3332d9c0f72cfae199f75eab78fba024dd8d28acd1702e27'
const updateEvidence = process.env.XIYOU_UPDATE_EVIDENCE === '1'

type HealthEvent = { kind: 'console' | 'pageerror' | 'requestfailed' | 'response'; url: string; detail: string; status?: number }
let healthEvents: HealthEvent[] = []
let expectedChunkFailureUrl: string | null = null

function expectedLazyChunkFailure(event: HealthEvent) {
  if (expectedChunkFailureUrl === null) return false
  if (event.kind === 'response') return event.url === expectedChunkFailureUrl && event.status === 503
  if (event.kind === 'requestfailed') return event.url === expectedChunkFailureUrl && /ABORTED|cancelled/i.test(event.detail)
  if (event.kind !== 'console') return false
  if (event.url === expectedChunkFailureUrl && event.detail === 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)') return true
  const failure = `Failed to fetch dynamically imported module: ${expectedChunkFailureUrl}`
  return event.detail === failure || event.detail === `TypeError: ${failure}`
}

function attachHealth(page: Page) {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const event: HealthEvent = { kind: 'console', url: message.location().url || page.url(), detail: message.text() }
      if (!expectedLazyChunkFailure(event)) healthEvents.push(event)
    }
  })
  page.on('pageerror', (error) => healthEvents.push({ kind: 'pageerror', url: page.url(), detail: error.message }))
  page.on('requestfailed', (request) => {
    const event: HealthEvent = { kind: 'requestfailed', url: request.url(), detail: request.failure()?.errorText ?? 'unknown' }
    if (!expectedNavigationAbort(event) && !expectedLazyChunkFailure(event)) healthEvents.push(event)
  })
  page.on('response', (response) => {
    const status = response.status()
    if (status < 400) return
    const event: HealthEvent = { kind: 'response', url: response.url(), detail: `HTTP ${status}`, status }
    if (!expectedLazyChunkFailure(event)) healthEvents.push(event)
  })
}

async function newHealthyPage(context: BrowserContext) {
  const page = await context.newPage()
  attachHealth(page)
  return page
}

function expectedNavigationAbort(event: HealthEvent) {
  return event.kind === 'requestfailed' && (
    (event.url.startsWith('https://fonts.gstatic.com/') && /ABORTED|cancelled/i.test(event.detail))
    || (event.url.includes('/assets/audio/') && /ABORTED|cancelled/i.test(event.detail))
    || (event.url === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(event.detail))
  )
}

function fourSeasPrerequisiteFixture() {
  return {
    version: 3,
    schemaRevision: 2,
    learnerName: '小行者',
    missions: {
      'w1-m1': { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW },
      'w1-m2': { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW },
    },
    settings: { muted: true, reducedMotion: false, reducedMotionOverride: true, parentPin: TEST_PARENT_ACCESS },
    privacy: { localDataNoticeSeen: true },
    recovery: { lastRecoveredAt: null, source: null },
    sessions: {},
    equipment: { version: 1, inventory: { 'ruyi-staff': { grantedBy: 'w1-m2', grantedAt: NOW } }, equipped: { weapon: null, head: null, body: null, feet: null } },
    savedAt: NOW,
  }
}

async function installFourSeasPrerequisites(page: Page) {
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value))
  }, { key: CURRENT_KEY, value: fourSeasPrerequisiteFixture() })
}

async function setFourSeasStorageFailureMode(page: Page, mode: string) {
  await page.evaluate((value) => {
    localStorage.setItem('xiyou-test-storage-mode', value)
  }, mode)
}

test.beforeEach(async ({ page }) => {
  healthEvents = []
  expectedChunkFailureUrl = null
  attachHealth(page)
  await installFourSeasPrerequisites(page)
})

test.afterEach(() => {
  expect(healthEvents, 'unexpected Four Seas browser health events').toEqual([])
})

async function add(page: Page, name: string, keyboard = false) {
  const button = page.getByRole('button', { name })
  await expect(button).toBeEnabled({ timeout: 15_000 })
  if (keyboard) await button.press('Enter')
  else await button.click()
}

async function buildMainAndEquip(page: Page, keyboard = false) {
  await add(page, '加入主任务：向东海龙王请求披挂', keyboard)
  await add(page, '加入主任务：收齐三海宝物', keyboard)
  await add(page, '加入主任务：穿戴整副披挂', keyboard)
  await add(page, '加入主任务：检查披挂是否齐全', keyboard)
  await add(page, '加入穿戴子任务：戴上凤翅紫金冠', keyboard)
  await add(page, '加入穿戴子任务：穿上锁子黄金甲', keyboard)
  await add(page, '加入穿戴子任务：踏上藕丝步云履', keyboard)
}

async function readOnlyW1M3CompletionIdentity(page: Page) {
  // Read-only persistence evidence: this never writes CURRENT or injects completion.
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    const mission = raw ? JSON.parse(raw).missions?.['w1-m3'] : undefined
    return mission ? { attempts: mission.attempts, completedAt: mission.completedAt } : null
  }, CURRENT_KEY)
}

async function readOnlyW1M3Session(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).sessions?.['w1-m3'] ?? null : null
  }, CURRENT_KEY)
}

async function openFourSeas(page: Page) {
  await page.goto('./')
  await page.getByRole('button', { name: '四海披挂' }).click()
  await expect(page.getByRole('heading', { name: '四海披挂', level: 1 })).toBeVisible()
  await expect(page.locator('.legacy-mission-tools')).toHaveCount(0)
  await expect(page.locator('.four-seas-regalia-workspace .blockly-host')).toBeVisible({ timeout: 15_000 })
}

async function captureEvidence(page: Page, testInfo: TestInfo, wrongOrder = false) {
  if (!updateEvidence) return
  const targets: Record<string, string> = {
    'desktop-chromium-1440x1024': 'four-seas-regalia-1440.png',
    'tablet-webkit-768x1024': wrongOrder ? 'four-seas-regalia-wrong-order-768.png' : 'four-seas-regalia-768.png',
    'mobile-chromium-390x844': 'four-seas-regalia-390.png',
    'narrow-chromium-320x844': 'four-seas-regalia-320.png',
  }
  const filename = targets[testInfo.project.name]
  if (!filename || (wrongOrder && testInfo.project.name !== 'tablet-webkit-768x1024')) return
  const target = path.resolve('docs/verification/screenshots', filename)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  await page.screenshot({ path: target, fullPage: true, animations: 'disabled' })
}

async function wrongThenCorrect(page: Page, keyboard = false, testInfo?: TestInfo) {
  await buildMainAndEquip(page, keyboard)
  await add(page, '加入收集子任务：收下南海的凤翅紫金冠', keyboard)
  await add(page, '加入收集子任务：收下西海的锁子黄金甲', keyboard)
  await add(page, '加入收集子任务：收下北海的藕丝步云履', keyboard)
  await add(page, '执行披挂指令', keyboard)
  const alert = page.getByRole('alert').filter({ hasText: '北海龙王还没有送来云履' })
  await expect(alert).toBeFocused()
  await expect(page.locator('.four-seas-regalia-scene-frame .game-scene')).toHaveAttribute('data-effect-cell', 'blocked')
  if (testInfo) await captureEvidence(page, testInfo, true)
  await add(page, '回到问题积木', keyboard)
  await expect(page.locator('.four-seas-program-tree li').filter({ hasText: '收下南海的凤翅紫金冠' })).toBeFocused()
  await add(page, '删除：收下南海的凤翅紫金冠', keyboard)
  await add(page, '加入收集子任务：收下南海的凤翅紫金冠', keyboard)
  await add(page, '上移收集子任务：收下北海的藕丝步云履', keyboard)
  await add(page, '执行披挂指令', keyboard)
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
}

function normalizeSession(session: any) {
  const ids = new Map<string, string>()
  session.lastTrace.forEach((item: { sourceBlockId: string }, index: number) => ids.set(item.sourceBlockId, `block-${index + 1}`))
  const normalize = (item: any) => ({ ...item, sourceBlockId: item.sourceBlockId === null ? null : ids.get(item.sourceBlockId) ?? item.sourceBlockId, parentBlockId: item.parentBlockId === null ? null : ids.get(item.parentBlockId) ?? item.parentBlockId, instructionId: item.instructionId === null || item.sourceBlockId === null ? null : `instruction:${ids.get(item.sourceBlockId) ?? item.sourceBlockId}` })
  return { trace: session.lastTrace.map(normalize), events: session.lastRun.events.map(normalize), finalState: session.lastRun.finalState, diagnostic: session.lastRun.diagnostic }
}

async function expectResponsiveWorkspace(page: Page) {
  expect(await page.evaluate(() => ({ document: document.documentElement.scrollWidth - document.documentElement.clientWidth, body: document.body.scrollWidth - document.body.clientWidth }))).toEqual({ document: 0, body: 0 })
  const sceneBox = await page.locator('.four-seas-regalia-scene-region').boundingBox()
  const programBox = await page.locator('.four-seas-regalia-program-region').boundingBox()
  const feedbackBox = await page.locator('.four-seas-regalia-feedback-region').boundingBox()
  const order = [sceneBox?.y ?? -1, programBox?.y ?? -1, feedbackBox?.y ?? -1]
  expect(order).toEqual([...order].sort((left, right) => left - right))
  const host = page.locator('.four-seas-regalia-workspace .blockly-host')
  await host.scrollIntoViewIfNeeded()
  const hostBox = await host.boundingBox()
  expect(hostBox).not.toBeNull()
  const session = await readOnlyW1M3Session(page)
  const blockIds = session?.workspace?.blocks?.map((block: { id: string }) => block.id) ?? []
  for (const blockId of blockIds) {
    const box = await page.locator(`.four-seas-regalia-workspace .blocklyDraggable[data-id="${blockId}"]`).boundingBox()
    expect(box, `${blockId} must be rendered in the visible Blockly graph`).not.toBeNull()
    if (!box || !hostBox) continue
    expect(box.x, `${blockId} left edge`).toBeGreaterThanOrEqual(hostBox.x - 1)
    expect(box.x + box.width, `${blockId} right edge`).toBeLessThanOrEqual(hostBox.x + hostBox.width + 1)
    expect(box.y, `${blockId} top edge`).toBeGreaterThanOrEqual(hostBox.y - 1)
    expect(box.y + box.height, `${blockId} bottom edge`).toBeLessThanOrEqual(hostBox.y + hostBox.height + 1)
  }
  const controls = page.locator('.four-seas-regalia-experience button:visible:not(:disabled)')
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index)
    await control.scrollIntoViewIfNeeded()
    const box = await control.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    await control.click({ trial: true })
  }
}

test('@regalia-full @visual visible wrong nested order is corrected, persisted, and unlocks w1-m4', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.goto('./')
  await page.getByRole('button', { name: '四海披挂' }).click()
  await expect(page.getByRole('heading', { name: '四海披挂', level: 1 })).toBeVisible()
  await expect(page.locator('.legacy-mission-tools')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '加入主任务：向东海龙王请求披挂' })).toBeVisible()

  await buildMainAndEquip(page)
  await add(page, '加入收集子任务：收下南海的凤翅紫金冠')
  await add(page, '加入收集子任务：收下西海的锁子黄金甲')
  await add(page, '加入收集子任务：收下北海的藕丝步云履')
  await add(page, '执行披挂指令')

  const alert = page.getByRole('alert').filter({ hasText: '北海龙王还没有送来云履' })
  await expect(alert).toBeFocused()
  await expect(page.locator('.four-seas-regalia-scene-frame .game-scene')).toHaveAttribute('data-effect-cell', 'blocked')
  await expectResponsiveWorkspace(page)
  await captureEvidence(page, testInfo, true)
  await alert.getByRole('button', { name: '回到问题积木' }).click()
  const wrongItem = page.locator('.four-seas-program-tree li').filter({ hasText: '收下南海的凤翅紫金冠' })
  await expect(wrongItem).toBeFocused()

  await add(page, '删除：收下南海的凤翅紫金冠')
  await add(page, '加入收集子任务：收下南海的凤翅紫金冠')
  await add(page, '上移收集子任务：收下北海的藕丝步云履')
  await add(page, '执行披挂指令')
  await expect(page.locator('.four-seas-regalia-scene-frame .game-scene')).toHaveAttribute('data-scene-state', 'regalia-verified', { timeout: 15_000 })
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
  const childSteps = page.locator('.execution-provenance')
  await expect(childSteps).toContainText('收下北海的藕丝步云履')
  await expect(childSteps).toContainText('属于「收齐三海宝物」任务组')
  await expect(childSteps).not.toContainText(/parent=|instruction:/)
  const traceBefore = (await readOnlyW1M3Session(page)).lastTrace.map(({ sourceBlockId, parentBlockId }: { sourceBlockId: string; parentBlockId: string | null }) => ({ sourceBlockId, parentBlockId }))
  expect(traceBefore).toHaveLength(10)
  expect(new Set(traceBefore.map(({ sourceBlockId }) => sourceBlockId)).size).toBe(10)
  expect(traceBefore.map(({ parentBlockId }) => parentBlockId)).toEqual([
    null,
    null,
    traceBefore[1].sourceBlockId,
    traceBefore[1].sourceBlockId,
    traceBefore[1].sourceBlockId,
    null,
    traceBefore[5].sourceBlockId,
    traceBefore[5].sourceBlockId,
    traceBefore[5].sourceBlockId,
    null,
  ])
  await page.reload()
  await expect(page.getByRole('heading', { name: '四海披挂', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: '重播最近一次' })).toBeDisabled()
  expect((await readOnlyW1M3Session(page)).lastTrace.map(({ sourceBlockId, parentBlockId }: { sourceBlockId: string; parentBlockId: string | null }) => ({ sourceBlockId, parentBlockId }))).toEqual(traceBefore)
  await expect(page.locator('.execution-provenance')).not.toContainText(/parent=|instruction:/)
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0)

  const scene = page.locator('.four-seas-regalia-scene-frame .game-scene')
  const observeHint = page.getByRole('button', { name: '观察提示' })
  await expect(scene).toHaveAttribute('data-scene-state', 'regalia-verified', { timeout: 15_000 })
  await expect(observeHint).toBeEnabled({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: '重播最近一次' })).toBeEnabled()
  const completionBeforeReplay = await readOnlyW1M3CompletionIdentity(page)
  expect(completionBeforeReplay).toMatchObject({ attempts: 1 })
  expect(completionBeforeReplay?.completedAt).toEqual(expect.any(String))
  await page.getByRole('button', { name: '重播最近一次' }).click()
  await expect(observeHint).toBeDisabled()
  await expect(scene).toHaveAttribute('data-scene-state', 'regalia-verified', { timeout: 15_000 })
  await expect(observeHint).toBeEnabled({ timeout: 15_000 })
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toHaveCount(0)
  expect((await readOnlyW1M3Session(page)).lastTrace.map(({ sourceBlockId, parentBlockId }: { sourceBlockId: string; parentBlockId: string | null }) => ({ sourceBlockId, parentBlockId }))).toEqual(traceBefore)
  expect(await readOnlyW1M3CompletionIdentity(page)).toEqual(completionBeforeReplay)

  await expectResponsiveWorkspace(page)
  await captureEvidence(page, testInfo)

  await page.getByRole('button', { name: '成长地图' }).first().click()
  await expect(page.getByRole('button', { name: '幽冥勾名' })).toBeEnabled()
})

test('@regalia-keyboard keyboard operates nested editing controls through wrong order and completion', async ({ page }) => {
  test.setTimeout(90_000)
  await openFourSeas(page)
  await wrongThenCorrect(page, true)
  await expect(page.locator('.four-seas-regalia-scene-frame .game-scene')).toHaveAttribute('data-scene-state', 'regalia-verified', { timeout: 15_000 })
})

test('@regalia-parity standard unmuted and reduced-motion muted visible runs preserve execution semantics', async ({ page, browser }) => {
  test.setTimeout(120_000)
  await openFourSeas(page)
  await page.getByRole('button', { name: '开启声音' }).click()
  await wrongThenCorrect(page)
  const standard = normalizeSession(await readOnlyW1M3Session(page))
  const mutedContext = await browser.newContext({ baseURL: 'http://127.0.0.1:4173/xiyou-programming-journey/', viewport: page.viewportSize() ?? { width: 1280, height: 720 }, serviceWorkers: 'block' })
  try {
    const mutedPage = await newHealthyPage(mutedContext)
    await installFourSeasPrerequisites(mutedPage)
    await openFourSeas(mutedPage)
    await mutedPage.getByRole('button', { name: '减弱动画' }).click()
    await expect(mutedPage.getByRole('button', { name: '开启声音' })).toBeVisible()
    await wrongThenCorrect(mutedPage)
    await expect(mutedPage.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true')
    expect(normalizeSession(await readOnlyW1M3Session(mutedPage))).toEqual(standard)
  } finally {
    await mutedContext.close()
  }
})

test('@regalia-narrow 320 and 390 keep scene-program-feedback order and usable geometry', async ({ page }) => {
  test.setTimeout(90_000)
  await openFourSeas(page)
  await buildMainAndEquip(page)
  await expectResponsiveWorkspace(page)
})

test('@regalia-storage failed draft write stays visible and retries without polluting the old draft', async ({ page }) => {
  await openFourSeas(page)
  const before = await readOnlyW1M3Session(page)
  await setFourSeasStorageFailureMode(page, 'fail-regalia-draft')
  await add(page, '加入主任务：向东海龙王请求披挂')
  const retry = page.getByRole('button', { name: '重试保存积木' })
  await expect(retry).toBeVisible()
  await expect(retry).toBeFocused()
  expect(await readOnlyW1M3Session(page)).toEqual(before)
  await setFourSeasStorageFailureMode(page, 'off')
  await retry.click()
  await expect(retry).toBeHidden()
  await expect.poll(async () => (await readOnlyW1M3Session(page))?.workspace.blocks.length).toBe(1)
})

test('@regalia-storage failed run write keeps the prior session and visible retry restores the real blocked run', async ({ page }) => {
  await openFourSeas(page)
  await buildMainAndEquip(page)
  await add(page, '加入收集子任务：收下南海的凤翅紫金冠')
  await add(page, '加入收集子任务：收下西海的锁子黄金甲')
  await add(page, '加入收集子任务：收下北海的藕丝步云履')
  await expect.poll(async () => (await readOnlyW1M3Session(page))?.workspace.blocks.length).toBe(10)
  const before = await readOnlyW1M3Session(page)
  await setFourSeasStorageFailureMode(page, 'fail-regalia-session')
  await add(page, '执行披挂指令')
  const retry = page.getByRole('button', { name: '重试保存本关' })
  await expect(retry).toBeVisible({ timeout: 15_000 })
  await expect(retry).toBeFocused()
  expect(await readOnlyW1M3Session(page)).toEqual(before)
  await setFourSeasStorageFailureMode(page, 'off')
  await retry.click()
  await expect(retry).toBeHidden()
  await expect.poll(async () => (await readOnlyW1M3Session(page))?.lastRun?.completed).toBe(false)
})

test('@regalia-storage failed completion write stays unpublished until the visible retry succeeds', async ({ page }) => {
  test.setTimeout(120_000)
  await openFourSeas(page)
  await buildMainAndEquip(page)
  await add(page, '加入收集子任务：收下南海的凤翅紫金冠')
  await add(page, '加入收集子任务：收下西海的锁子黄金甲')
  await add(page, '加入收集子任务：收下北海的藕丝步云履')
  await add(page, '执行披挂指令')
  await add(page, '回到问题积木')
  await add(page, '删除：收下南海的凤翅紫金冠')
  await add(page, '加入收集子任务：收下南海的凤翅紫金冠')
  await add(page, '上移收集子任务：收下北海的藕丝步云履')
  await setFourSeasStorageFailureMode(page, 'fail-regalia-completion')
  await add(page, '执行披挂指令')
  const retry = page.getByRole('button', { name: '重试保存通关' })
  await expect(retry).toBeVisible({ timeout: 15_000 })
  await expect(retry).toBeFocused()
  expect(await readOnlyW1M3CompletionIdentity(page)).toBeNull()
  await setFourSeasStorageFailureMode(page, 'off')
  await retry.click()
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible()
  expect(await readOnlyW1M3CompletionIdentity(page)).toMatchObject({ attempts: 1 })
})

test('@regalia-cold w1-m1 w1-m2 and w1-m3 cold HTTP bodies stay inside fixed fail-closed budgets', async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000)
  const missions = [
    { id: 'w1-m1', limit: DRAGON_PALACE_COLD_LOAD_MAX_BYTES, ready: '.dragon-palace-experience .blockly-host' },
    { id: 'w1-m2', limit: RUYI_STAFF_COLD_LOAD_MAX_BYTES, ready: '.ruyi-staff-experience .blockly-host' },
    { id: 'w1-m3', limit: FOUR_SEAS_COLD_LOAD_MAX_BYTES, ready: '.four-seas-regalia-experience .blockly-host' },
  ]
  for (const mission of missions) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4173/xiyou-programming-journey/', viewport: page.viewportSize() ?? { width: 1280, height: 720 }, serviceWorkers: 'block' })
    try {
      const coldPage = await newHealthyPage(context)
      await installFourSeasPrerequisites(coldPage)
      await coldPage.route('**/*', async (route) => route.continue({ headers: { ...route.request().headers(), 'cache-control': 'no-store', pragma: 'no-cache' } }))
      const failures: string[] = []
      coldPage.on('requestfailed', (request) => failures.push(`${request.url()} ${request.failure()?.errorText ?? 'unknown'}`))
      const bodies: Array<Promise<{ url: string; status: number; bytes: number }>> = []
      coldPage.on('response', (response) => {
        const protocol = new URL(response.url()).protocol
        if (protocol !== 'http:' && protocol !== 'https:') return
        bodies.push((async () => ({ url: response.url(), status: response.status(), bytes: (await response.body()).byteLength }))())
      })
      await coldPage.goto(`./#/mission/${mission.id}`)
      await expect(coldPage.locator(mission.ready)).toBeVisible({ timeout: 15_000 })
      await coldPage.waitForLoadState('networkidle')
      const responses = await Promise.all(bodies)
      expect(failures, `${mission.id} request failures`).toEqual([])
      expect(responses.filter(({ status }) => status < 200 || status >= 300), `${mission.id} redirects or non-2xx`).toEqual([])
      const total = responses.reduce((sum, response) => sum + response.bytes, 0)
      const headroom = mission.limit - total
      console.log(`[four-seas-cold-bytes] ${testInfo.project.name} ${mission.id}: bytes=${total} limit=${mission.limit} headroom=${headroom}`)
      await testInfo.attach(`four-seas-cold-${mission.id}.json`, { body: Buffer.from(JSON.stringify({ project: testInfo.project.name, mission: mission.id, bytes: total, limit: mission.limit, headroom, responses }, null, 2)), contentType: 'application/json' })
      expect.soft(total, `${mission.id} cold bytes`).toBeLessThanOrEqual(mission.limit)
    } finally {
      await context.close()
    }
  }
})

test('@regalia-external a second real page completes w1-m3 once and the first page adopts it without revival', async ({ page }) => {
  test.setTimeout(120_000)
  await openFourSeas(page)
  const externalPage = await newHealthyPage(page.context())
  try {
    await openFourSeas(externalPage)
    await wrongThenCorrect(externalPage)
    await expect.poll(() => readOnlyW1M3CompletionIdentity(page)).toMatchObject({ attempts: 1 })
    const externalCompletion = await readOnlyW1M3CompletionIdentity(externalPage)
    expect(await readOnlyW1M3CompletionIdentity(page)).toEqual(externalCompletion)
    await expect(page.getByRole('alert')).toContainText('其他标签页已更新，已暂停保存')
    await page.getByRole('button', { name: '载入其他标签页版本' }).click()
    await page.getByRole('button', { name: '成长地图' }).first().click()
    await expect(page.getByRole('button', { name: '幽冥勾名' })).toBeEnabled()
    await page.getByRole('button', { name: '四海披挂' }).click()
    await expect(page.locator('.four-seas-regalia-scene-frame .game-scene')).toHaveAttribute('data-scene-state', 'regalia-verified', { timeout: 15_000 })
    await expect(page.getByRole('button', { name: '观察提示' })).toBeEnabled({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: '重播最近一次' })).toBeEnabled()
    expect(await readOnlyW1M3CompletionIdentity(page)).toEqual(externalCompletion)
  } finally {
    await externalPage.close()
  }
})

test('@regalia-parent V3 export and visible Parent import restore the exact nested w1-m3 session', async ({ page }) => {
  test.setTimeout(120_000)
  await openFourSeas(page)
  await wrongThenCorrect(page)
  const before = await readOnlyW1M3Session(page)
  await page.getByRole('button', { name: '回成长地图' }).click()
  await page.getByRole('button', { name: '家长周报' }).click()
  await page.getByLabel('家长 PIN').fill('4826')
  await page.getByRole('button', { name: '进入周报' }).click()
  await expect(page.getByText('已完成：龙宫求兵、定海神针、四海披挂')).toBeVisible()
  const downloadStarted = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出进度' }).click()
  const download = await downloadStarted
  const file = await download.path()
  expect(file).not.toBeNull()
  const exported = JSON.parse(fs.readFileSync(file!, 'utf8'))
  expect(exported.sessions['w1-m3']).toEqual(before)

  await page.getByRole('button', { name: '成长地图' }).click()
  await page.getByRole('button', { name: '四海披挂' }).click()
  await add(page, '删除：戴上凤翅紫金冠')
  await expect.poll(() => readOnlyW1M3Session(page)).not.toEqual(before)
  await page.getByTestId('mission-background').getByRole('button', { name: '成长地图' }).click()
  await page.getByRole('button', { name: '家长周报' }).click()
  await page.getByLabel('家长 PIN').fill('4826')
  await page.getByRole('button', { name: '进入周报' }).click()
  await page.getByLabel('选择进度文件').setInputFiles(file!)
  await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible()
  await expect.poll(() => readOnlyW1M3Session(page)).toEqual(before)
})

test('@regalia-corrupt approved current corruption recovers stable nested IDs and preserves damaged source', async ({ page }) => {
  test.setTimeout(120_000)
  await openFourSeas(page)
  await wrongThenCorrect(page)
  const before = await readOnlyW1M3Session(page)
  await setFourSeasStorageFailureMode(page, 'corrupt-regalia-current')
  await page.reload()
  await expect(page.getByText('学习进度已经安全恢复')).toBeVisible()
  await expect.poll(() => readOnlyW1M3Session(page)).toEqual(before)
  await expect(page.locator('.four-seas-regalia-scene-frame .game-scene')).toHaveAttribute('data-scene-state', 'regalia-verified', { timeout: 15_000 })
  await expect(page.getByRole('button', { name: '重播最近一次' })).toBeEnabled({ timeout: 15_000 })
  await page.getByRole('button', { name: '重播最近一次' }).click()
  await expect(page.locator('.four-seas-regalia-scene-frame .game-scene')).toHaveAttribute('data-scene-state', 'regalia-verified', { timeout: 15_000 })

  await page.getByRole('button', { name: '成长地图' }).first().click()
  await page.getByRole('button', { name: '家长周报' }).click()
  await page.getByLabel('家长 PIN').fill('4826')
  await page.getByRole('button', { name: '进入周报' }).click()
  const downloadStarted = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载损坏原文' }).click()
  const download = await downloadStarted
  const file = await download.path()
  expect(file).not.toBeNull()
  expect(JSON.parse(fs.readFileSync(file!, 'utf8')).current).toBe('{broken w1-m3 current')
})

test('@regalia-lazy outer FourSeasRegaliaExperience 503 keeps story and explicit retry reaches real Blockly', async ({ page }) => {
  let failures = 0
  await page.route(/FourSeasRegaliaExperience-.*\.js/, (route) => {
    failures += 1
    expectedChunkFailureUrl = route.request().url()
    return failures === 1 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue()
  })
  await page.goto('./#/mission/w1-m3')
  await expect(page.getByRole('heading', { name: '四海披挂', level: 1 })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('四海披挂任务加载失败')
  await page.getByRole('button', { name: '重新加载页面' }).click()
  await expect(page.locator('.four-seas-regalia-workspace .blockly-host')).toBeVisible({ timeout: 15_000 })
  await add(page, '加入主任务：向东海龙王请求披挂')
})

test('@regalia-lazy inner FourSeasRegaliaScene 503 keeps real Blockly and retry continues', async ({ page }) => {
  let failures = 0
  await page.route(/FourSeasRegaliaScene-.*\.js/, (route) => {
    failures += 1
    expectedChunkFailureUrl = route.request().url()
    return failures === 1 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue()
  })
  await page.goto('./#/mission/w1-m3')
  await expect(page.getByRole('alert')).toContainText('四海披挂场景加载失败')
  await expect(page.getByRole('button', { name: '加入主任务：向东海龙王请求披挂' })).toBeVisible()
  await page.getByRole('button', { name: '重新加载页面' }).click()
  await expect(page.locator('.four-seas-regalia-scene-frame .game-scene canvas')).toBeVisible({ timeout: 15_000 })
  await add(page, '加入主任务：向东海龙王请求披挂')
})

test('@regalia-lazy inner FourSeasRegaliaBlocklyWorkspace 503 keeps scene and retry continues', async ({ page }) => {
  let failures = 0
  await page.route(/FourSeasRegaliaBlocklyWorkspace-.*\.js/, (route) => {
    failures += 1
    expectedChunkFailureUrl = route.request().url()
    return failures === 1 ? route.fulfill({ status: 503, body: 'unavailable' }) : route.continue()
  })
  await page.goto('./#/mission/w1-m3')
  await expect(page.getByRole('alert')).toContainText('四海披挂编程工作台加载失败')
  await expect(page.locator('.four-seas-regalia-scene-frame .game-scene canvas')).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: '重新加载页面' }).click()
  await expect(page.locator('.four-seas-regalia-workspace .blockly-host')).toBeVisible({ timeout: 15_000 })
  await add(page, '加入主任务：向东海龙王请求披挂')
})
