import { expect, test, type Page, type TestInfo } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { RUYI_STAFF_COLD_BYTES } from '../scripts/budget-limits.mjs'

const CURRENT_KEY = 'xiyou-programming-progress-v3'
const SNAPSHOT_KEY = 'xiyou-programming-progress-snapshot-v3'
const TEST_PARENT_ACCESS = 'access-v1:cf7667b114bf7a735116fc8439f0d17f3213159c48b22be56376521fbbc5cbb1:678bd461a82e086d3332d9c0f72cfae199f75eab78fba024dd8d28acd1702e27'
const NOW = '2026-07-16T00:00:00.000Z'
const updateEvidence = process.env.XIYOU_UPDATE_EVIDENCE === '1'

type StaffHealthEvent = { kind: 'console' | 'pageerror' | 'requestfailed'; url: string; detail: string }
let staffHealthEvents: StaffHealthEvent[] = []
let allowStaffHealth: (event: StaffHealthEvent) => boolean = () => false

const expectedNavigationAbort = (event: StaffHealthEvent) => event.kind === 'requestfailed' && (
  (event.url.startsWith('https://fonts.gstatic.com/') && /ABORTED|cancelled/i.test(event.detail))
  || (event.url.includes('/assets/audio/') && /ABORTED|cancelled/i.test(event.detail))
  || (event.url === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(event.detail))
)

function isExactInjectedChunkFailure(event: StaffHealthEvent, targetUrl: string | null) {
  if (targetUrl === null) return false
  if (event.kind === 'requestfailed') return event.url === targetUrl
  if (event.kind !== 'console') return false
  if (event.url === targetUrl && event.detail === 'Failed to load resource: the server responded with a status of 503 (Service Unavailable)') return true
  const failure = `Failed to fetch dynamically imported module: ${targetUrl}`
  return event.detail === failure || event.detail === `TypeError: ${failure}`
}

test.beforeEach(async ({ page }) => {
  staffHealthEvents = []
  allowStaffHealth = expectedNavigationAbort
  page.on('console', message => {
    if (message.type() === 'error') staffHealthEvents.push({ kind: 'console', url: message.location().url || page.url(), detail: message.text() })
  })
  page.on('pageerror', error => staffHealthEvents.push({ kind: 'pageerror', url: page.url(), detail: error.message }))
  page.on('requestfailed', request => staffHealthEvents.push({ kind: 'requestfailed', url: request.url(), detail: request.failure()?.errorText ?? 'unknown' }))
})

test.afterEach(() => {
  expect(staffHealthEvents.filter(event => !allowStaffHealth(event)), 'unexpected Ruyi Staff browser health events').toEqual([])
})

function unlockedFixture() {
  return {
    version: 3, schemaRevision: 1, learnerName: '小行者',
    missions: { 'w1-m1': { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW } },
    settings: { muted: false, reducedMotion: false, reducedMotionOverride: false, parentPin: TEST_PARENT_ACCESS },
    privacy: { localDataNoticeSeen: true }, recovery: { lastRecoveredAt: null, source: null }, sessions: {}, savedAt: NOW,
  }
}

async function preloadUnlocked(page: Page) {
  const fixture = unlockedFixture()
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value))
  }, { key: CURRENT_KEY, value: fixture })
}

async function openMission(page: Page) {
  await preloadUnlocked(page)
  await page.goto('./#/mission/w1-m2')
  await expect(page.getByRole('heading', { name: '定海神针', level: 1 })).toBeVisible()
  await expect(page.locator('.ruyi-staff-scene-frame .game-scene canvas')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: '加入：查看三件兵器重量' })).toBeVisible()
}

async function add(page: Page, label: string, keyboard = false) {
  const button = page.getByRole('button', { name: `加入：${label}` })
  if (keyboard) await button.press('Enter')
  else await button.click()
}

async function activate(page: Page, name: string, keyboard = false) {
  const button = page.getByRole('button', { name })
  if (keyboard) await button.press('Enter')
  else await button.click()
}

async function readEvidence(page: Page) {
  return page.evaluate((key) => {
    const progress = JSON.parse(localStorage.getItem(key)!)
    const session = progress.sessions['w1-m2']
    return {
      mission: progress.missions['w1-m2'] ?? null,
      blockIds: session.workspace.blocks.map((block: { id: string }) => block.id).sort(),
      trace: session.lastTrace,
      events: session.lastRun?.events ?? [],
      finalState: session.lastRun?.finalState ?? null,
      totalRuns: session.totalRuns,
      runtimeFailures: session.runtimeFailures,
    }
  }, CURRENT_KEY)
}

async function readFullSession(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w1-m2'], CURRENT_KEY)
}

async function installMediaObserver(page: Page) {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    ;(window as Window & { __xiyouStaffMediaPlayCalls?: string[] }).__xiyouStaffMediaPlayCalls = []
    HTMLMediaElement.prototype.play = function () {
      ;(window as Window & { __xiyouStaffMediaPlayCalls?: string[] }).__xiyouStaffMediaPlayCalls?.push(this.currentSrc || this.src)
      return play.call(this)
    }
  })
  const successRequests: string[] = []
  page.on('request', (request) => { if (request.url().includes('/assets/audio/success.m4a')) successRequests.push(request.url()) })
  return {
    successRequests,
    playCalls: () => page.evaluate(() => (window as Window & { __xiyouStaffMediaPlayCalls?: string[] }).__xiyouStaffMediaPlayCalls ?? []),
  }
}

function normalizeExecution(evidence: Awaited<ReturnType<typeof readEvidence>>) {
  const normalizedIds = new Map<string, string>()
  evidence.trace.forEach((item: { sourceBlockId: string }, index: number) => normalizedIds.set(item.sourceBlockId, `block-${index + 1}`))
  const normalize = (item: { sourceBlockId: string | null; instructionId: string | null }) => {
    const sourceBlockId = item.sourceBlockId === null ? null : normalizedIds.get(item.sourceBlockId) ?? item.sourceBlockId
    return {
      ...item,
      sourceBlockId,
      instructionId: item.instructionId === null || sourceBlockId === null ? null : `instruction:${sourceBlockId}`,
    }
  }
  return {
    trace: evidence.trace.map(normalize),
    events: evidence.events.map(normalize),
    finalState: evidence.finalState,
  }
}

async function completeCorrectProgram(page: Page) {
  await add(page, '查看三件兵器重量')
  await add(page, '选择定海神针（13500斤）')
  await add(page, '缩小定海神针')
  await activate(page, '执行战斗指令')
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))).toEqual({ document: 0, body: 0 })
}

async function expectNarrowWorkspaceUsable(page: Page) {
  await page.locator('.ruyi-staff-workspace .blockly-host').scrollIntoViewIfNeeded()
  const geometry = await page.locator('.ruyi-staff-workspace').evaluate((root, currentKey) => {
    const host = root.querySelector<HTMLElement>('.blockly-host')!.getBoundingClientRect()
    const progress = JSON.parse(localStorage.getItem(currentKey)!)
    const targetIds = new Set<string>(progress.sessions['w1-m2'].workspace.blocks.map((block: { id: string }) => block.id))
    const blocks = [...root.querySelectorAll<SVGGraphicsElement>('.blocklyDraggable[data-id]')].filter((block) => targetIds.has(block.dataset.id!)).map((block) => {
      const rect = block.getBoundingClientRect()
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height }
    })
    return {
      host: { left: host.left, right: host.right, top: host.top, bottom: host.bottom },
      blocks,
    }
  }, CURRENT_KEY)
  expect(geometry.blocks).toHaveLength(3)
  for (const block of geometry.blocks) {
    expect(block.width).toBeGreaterThan(0)
    expect(block.height).toBeGreaterThan(0)
    expect(block.left).toBeGreaterThanOrEqual(geometry.host.left - 1)
    expect(block.right).toBeLessThanOrEqual(geometry.host.right + 1)
    expect(block.top).toBeGreaterThanOrEqual(geometry.host.top - 1)
    expect(block.bottom).toBeLessThanOrEqual(geometry.host.bottom + 1)
  }
  const controls = page.locator('.ruyi-staff-workspace button:visible')
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index)
    await control.scrollIntoViewIfNeeded()
    expect(await control.evaluate((button) => {
      const rect = button.getBoundingClientRect()
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)
      return hit === button || button.contains(hit)
    })).toBe(true)
  }
}

async function wrongThenCorrect(page: Page, keyboard = false) {
  await add(page, '查看三件兵器重量', keyboard)
  await add(page, '选择方天画戟（7200斤）', keyboard)
  await add(page, '缩小定海神针', keyboard)
  await activate(page, '执行战斗指令', keyboard)
  const scene = page.locator('.ruyi-staff-scene-frame .game-scene')
  await expect(scene).toHaveAttribute('data-selected-weapon', 'halberd')
  await expect(scene).toHaveAttribute('data-effect-cell', 'blocked')
  const alert = page.getByRole('alert').filter({ hasText: '7200斤比13500斤轻' })
  await expect(alert).toBeFocused()
  await activate(page, '回到问题积木', keyboard)
  await expect(page.locator('.block-program-list li').filter({ hasText: '选择方天画戟' })).toBeFocused()
  await activate(page, '删除：选择方天画戟（7200斤）', keyboard)
  await add(page, '选择定海神针（13500斤）', keyboard)
  await activate(page, '上移：选择定海神针（13500斤）', keyboard)
  await activate(page, '执行战斗指令', keyboard)
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
}

async function capture(page: Page, testInfo: TestInfo) {
  if (!updateEvidence) return
  const widths: Record<string, number> = {
    'narrow-chromium-320x844': 320,
    'mobile-chromium-390x844': 390,
    'tablet-webkit-768x1024': 768,
    'desktop-chromium-1440x1024': 1440,
  }
  const width = widths[testInfo.project.name]
  if (!width) return
  const target = path.resolve('docs/verification/screenshots', `ruyi-staff-${width}.png`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  await page.screenshot({ path: target, fullPage: true, animations: 'disabled' })
}

test('@staff-full visible wrong choice is corrected in the same Blockly workspace, persists, and unlocks w1-m3', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await openMission(page)
  expect(await page.evaluate((key) => {
    const progress = JSON.parse(localStorage.getItem(key)!)
    return { mission: progress.missions['w1-m2'], session: progress.sessions['w1-m2'] }
  }, CURRENT_KEY)).toEqual({ mission: undefined, session: undefined })
  await wrongThenCorrect(page)
  const before = await readEvidence(page)
  expect(before.trace.map((item: { opcode: string }) => item.opcode)).toEqual(['inspect_weights', 'choose_ruyi_staff', 'shrink_ruyi_staff'])
  expect(before.trace.map((item: { sourceBlockId: string }) => item.sourceBlockId).sort()).toEqual(before.blockIds)
  expect(before.finalState).toBe('ruyi-staff-shrunk')
  expect(before.totalRuns).toBe(2)
  expect(before.runtimeFailures).toBe(1)
  await page.reload()
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeHidden()
  await expect(page.locator('.ruyi-staff-scene-frame .game-scene')).toHaveAttribute('data-scene-state', 'ruyi-staff-shrunk', { timeout: 15_000 })
  expect(await readEvidence(page)).toEqual(before)
  if ((page.viewportSize()?.width ?? 0) <= 390) await expectNarrowWorkspaceUsable(page)
  await capture(page, testInfo)
  await page.getByRole('button', { name: '成长地图' }).first().click()
  await expect(page.getByRole('button', { name: '四海披挂' })).toBeEnabled()
  await expectNoOverflow(page)
  if (page.viewportSize()?.width === 320) {
    await activate(page, '定海神针')
    await expectNoOverflow(page)
    const order = await page.locator('.ruyi-staff-experience').evaluate((root) => {
      const top = (selector: string) => (root.querySelector(selector) as HTMLElement).getBoundingClientRect().top
      return [top('.ruyi-staff-scene-region'), top('.ruyi-staff-program-region'), top('.ruyi-staff-feedback-region')]
    })
    expect(order).toEqual([...order].sort((a, b) => a - b))
    const smallTargets = await page.locator('.ruyi-staff-experience button:visible').evaluateAll((buttons) => buttons.filter((button) => {
      const rect = button.getBoundingClientRect(); return rect.width < 44 || rect.height < 44
    }).map((button) => button.getAttribute('aria-label') ?? button.textContent))
    expect(smallTargets).toEqual([])
  }
})

test('@staff-keyboard keyboard buttons edit the same workspace and complete', async ({ page }) => {
  test.setTimeout(90_000)
  await openMission(page)
  await wrongThenCorrect(page, true)
  expect((await readEvidence(page)).finalState).toBe('ruyi-staff-shrunk')
})

test('@staff-storage failed coordinated draft save stays visible and retry persists it', async ({ page }) => {
  await page.addInitScript((key) => {
    const native = Storage.prototype.setItem
    ;(window as Window & { __failStaffWrites?: boolean }).__failStaffWrites = false
    Storage.prototype.setItem = function (storageKey, value) {
      if (storageKey === key && (window as Window & { __failStaffWrites?: boolean }).__failStaffWrites) throw new Error('intentional staff save failure')
      native.call(this, storageKey, value)
    }
  }, CURRENT_KEY)
  await openMission(page)
  await page.evaluate(() => { (window as Window & { __failStaffWrites?: boolean }).__failStaffWrites = true })
  await add(page, '查看三件兵器重量')
  await expect(page.locator('.block-program-list li')).toContainText('查看三件兵器重量')
  await expect(page.getByRole('button', { name: '重试保存' })).toBeVisible()
  await page.evaluate(() => { (window as Window & { __failStaffWrites?: boolean }).__failStaffWrites = false })
  await activate(page, '重试保存')
  await expect(page.getByRole('button', { name: '重试保存' })).toBeHidden()
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w1-m2']?.workspace.blocks.length ?? 0, CURRENT_KEY)).toBe(1)
})

test('@staff-storage final completion stays unpublished until its exact CURRENT write retries successfully', async ({ page }) => {
  test.setTimeout(90_000)
  await page.addInitScript((key) => {
    const native = Storage.prototype.setItem
    ;(window as Window & { __failStaffCompletionWrite?: boolean }).__failStaffCompletionWrite = false
    Storage.prototype.setItem = function (storageKey, value) {
      if (storageKey === key && (window as Window & { __failStaffCompletionWrite?: boolean }).__failStaffCompletionWrite) {
        const progress = JSON.parse(value)
        if (progress.missions?.['w1-m2']) throw new Error('intentional final w1-m2 CURRENT failure')
      }
      native.call(this, storageKey, value)
    }
  }, CURRENT_KEY)
  const media = await installMediaObserver(page)
  await openMission(page)
  await add(page, '查看三件兵器重量')
  await add(page, '选择定海神针（13500斤）')
  await add(page, '缩小定海神针')
  await page.evaluate(() => { (window as Window & { __failStaffCompletionWrite?: boolean }).__failStaffCompletionWrite = true })
  await activate(page, '执行战斗指令')

  await expect(page.getByText('通关待保存：进度尚未安全写入这台电脑。')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('通关结果正在处理，先不要改动指令卷轴。保存完成后就能继续操作。')).toBeVisible()
  await expect(page.locator('.completion-save-status')).toHaveCount(1)
  await expect(page.getByRole('button', { name: '执行战斗指令' })).toBeDisabled()
  await expect(page.getByRole('button', { name: /^加入：/ })).toHaveCount(5)
  expect(await page.getByRole('button', { name: /^加入：/ }).evaluateAll((buttons) => buttons.every((button) => (button as HTMLButtonElement).disabled))).toBe(true)
  const lockedHost = page.locator('.ruyi-staff-workspace .blockly-host')
  await expect(lockedHost).toHaveAttribute('inert', '')
  await expect(lockedHost).toHaveAttribute('tabindex', '-1')
  const acceptedBlockIds = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w1-m2'].workspace.blocks.map((block: { id: string }) => block.id).sort(), CURRENT_KEY)
  await page.keyboard.press('Delete')
  await page.keyboard.press('Control+V')
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w1-m2'].workspace.blocks.map((block: { id: string }) => block.id).sort(), CURRENT_KEY)).toEqual(acceptedBlockIds)
  await expect(page.locator('.learner-summary small')).toContainText('1/30 关 · 3 星')
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).missions['w1-m2'] ?? null, CURRENT_KEY)).toBeNull()
  await expect.poll(() => media.playCalls()).not.toContainEqual(expect.stringContaining('/assets/audio/success.m4a'))

  const mapPage = await page.context().newPage()
  try {
    await mapPage.goto(new URL('./#/', page.url()).toString())
    await expect(mapPage.getByRole('button', { name: '四海披挂，未解锁' })).toBeDisabled()

    await page.evaluate(() => { (window as Window & { __failStaffCompletionWrite?: boolean }).__failStaffCompletionWrite = false })
    await activate(page, '重试保存通关')
    await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible()
    await expect(page.locator('.learner-summary small')).toContainText('2/30 关 · 6 星')
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).missions['w1-m2']?.status ?? null, CURRENT_KEY)).toBe('completed')
    await expect.poll(async () => (await media.playCalls()).filter((url) => url.includes('/assets/audio/success.m4a')).length).toBe(1)

    await mapPage.reload()
    await expect(mapPage.getByRole('button', { name: '四海披挂' })).toBeEnabled()
  } finally {
    await mapPage.close()
  }
})

test('@staff-storage external one-star completion is loaded read-only and drives the success display', async ({ page }) => {
  test.setTimeout(90_000)
  const media = await installMediaObserver(page)
  await openMission(page)
  await add(page, '查看三件兵器重量')
  await add(page, '选择定海神针（13500斤）')
  await add(page, '缩小定海神针')
  await activate(page, '执行战斗指令')
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).sessions['w1-m2']?.lastRun?.completed ?? false, CURRENT_KEY)).toBe(true)
  const externalRaw = await page.evaluate(({ key, now }) => {
    const progress = JSON.parse(localStorage.getItem(key)!)
    progress.missions['w1-m2'] = { status: 'completed', stars: 1, attempts: 1, hintsUsed: 2, completedAt: now }
    progress.savedAt = now
    const raw = JSON.stringify(progress)
    localStorage.setItem(key, raw)
    localStorage.setItem('xiyou-programming-progress-revision-v3', String(Number(localStorage.getItem('xiyou-programming-progress-revision-v3') ?? '0') + 1))
    return raw
  }, { key: CURRENT_KEY, now: NOW })

  await expect(page.getByRole('button', { name: '载入其他标签页版本' })).toBeVisible({ timeout: 15_000 })
  await activate(page, '载入其他标签页版本')

  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible()
  await expect(page.getByLabel('1颗星')).toBeVisible()
  await expect(page.getByLabel('3颗星')).toBeHidden()
  expect(await page.evaluate((key) => localStorage.getItem(key), CURRENT_KEY)).toBe(externalRaw)
  await expect.poll(async () => (await media.playCalls()).filter((url) => url.includes('/assets/audio/success.m4a')).length).toBe(1)
})

test('@staff-parity independent standard and reduced-muted runs preserve exact execution semantics without muted success media', async ({ page, browser }) => {
  test.setTimeout(90_000)
  const standardMedia = await installMediaObserver(page)
  await openMission(page)
  await expect(page.locator('.ruyi-staff-scene-frame .game-scene')).toHaveAttribute('data-motion-mode', 'standard')
  await expect(page.getByRole('button', { name: '关闭声音' })).toBeVisible()
  await completeCorrectProgram(page)
  await expect.poll(async () => (await standardMedia.playCalls()).filter((url) => url.includes('/assets/audio/success.m4a')).length).toBeGreaterThan(0)
  await expect.poll(() => standardMedia.successRequests.length).toBeGreaterThan(0)
  const standard = normalizeExecution(await readEvidence(page))

  const mutedContext = await browser.newContext({
    baseURL: new URL('./', page.url()).href,
    viewport: page.viewportSize() ?? { width: 1280, height: 720 },
    serviceWorkers: 'block',
  })
  try {
    const mutedPage = await mutedContext.newPage()
    const mutedMedia = await installMediaObserver(mutedPage)
    await openMission(mutedPage)
    await activate(mutedPage, '减弱动画')
    await activate(mutedPage, '关闭声音')
    await expect(mutedPage.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true')
    await expect(mutedPage.getByRole('button', { name: '开启声音' })).toBeVisible()
    await completeCorrectProgram(mutedPage)
    await expect(mutedPage.locator('.ruyi-staff-scene-frame .game-scene')).toHaveAttribute('data-motion-mode', 'reduced')
    expect(await mutedMedia.playCalls()).toEqual([])
    expect(mutedMedia.successRequests).toEqual([])
    expect(normalizeExecution(await readEvidence(mutedPage))).toEqual(standard)
  } finally {
    await mutedContext.close()
  }
})

function recoveredSnapshot() {
  return {
    ...unlockedFixture(),
    sessions: { 'w1-m2': { workspace: { version: 1, blocks: [{ id: 'stable-inspect', type: 'xiyou_inspect_weights', nextId: null, x: 10, y: 10 }] }, lastTrace: [], lastRun: null, totalRuns: 0, runtimeFailures: 0, compileFailures: 0, usedHintTiers: [], conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 }, lastRunAt: null, savedAt: NOW } },
  }
}

test('@staff-corrupt corrupt w1-m2 current bytes are preserved and legal snapshot restores stable IDs', async ({ page }) => {
  const snapshot = recoveredSnapshot()
  const corrupt = JSON.stringify({ ...snapshot, sessions: { 'w1-m2': { ...snapshot.sessions['w1-m2'], workspace: { version: 1, blocks: [{ id: 'broken', type: 'unknown-block', nextId: null, x: 0, y: 0 }] } } } })
  await page.addInitScript(({ current, snapshotKey, corruptRaw, snapshotRaw }) => {
    localStorage.setItem(current, corruptRaw); localStorage.setItem(snapshotKey, snapshotRaw)
  }, { current: CURRENT_KEY, snapshotKey: SNAPSHOT_KEY, corruptRaw: corrupt, snapshotRaw: JSON.stringify(snapshot) })
  await page.goto('./#/mission/w1-m2')
  await expect(page.getByText('学习进度已经安全恢复')).toBeVisible()
  await expect(page.locator('.block-program-list li')).toContainText('查看三件兵器重量')
  expect((await readEvidence(page)).blockIds).toEqual(['stable-inspect'])
  await add(page, '选择定海神针（13500斤）'); await add(page, '缩小定海神针'); await activate(page, '执行战斗指令')
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
  await activate(page, '回成长地图'); await activate(page, '家长周报')
  const pin = page.getByLabel('家长 PIN'); await pin.fill('4826'); await activate(page, '进入周报')
  const downloadStarted = page.waitForEvent('download'); await activate(page, '下载损坏原文')
  const download = await downloadStarted; const file = await download.path(); expect(file).not.toBeNull()
  expect(JSON.parse(fs.readFileSync(file!, 'utf8')).current).toBe(corrupt)
})

test('@staff-cold cold w1-m2 response bodies stay within fixed 2.5 MiB with fail-closed HTTP accounting', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await preloadUnlocked(page)
  await page.route('**/*', async (route) => route.continue({ headers: { ...route.request().headers(), 'cache-control': 'no-store', pragma: 'no-cache' } }))
  const failures: string[] = []; page.on('requestfailed', (request) => failures.push(`${request.url()} ${request.failure()?.errorText ?? 'unknown'}`))
  const bodies: Array<Promise<{ url: string; status: number; bytes: number }>> = []
  page.on('response', (response) => {
    const url = new URL(response.url()); if (!['http:', 'https:'].includes(url.protocol)) return
    bodies.push((async () => { const status = response.status(); if (status < 200 || status >= 300) return { url: response.url(), status, bytes: 0 }; return { url: response.url(), status, bytes: (await response.body()).byteLength } })())
  })
  await page.goto('./#/mission/w1-m2')
  await expect(page.locator('.ruyi-staff-scene-frame .game-scene canvas')).toBeVisible({ timeout: 15_000 }); await page.waitForLoadState('networkidle')
  const responses = await Promise.all(bodies); expect(failures).toEqual([]); expect(responses.filter(({ status }) => status < 200 || status >= 300)).toEqual([])
  expect(responses.some(({ url }) => url.includes('/assets/dragon-palace/background.webp'))).toBe(true)
  expect(responses.some(({ url }) => /\/assets\/phaser-.*\.js/.test(url))).toBe(true)
  const total = responses.reduce((sum, response) => sum + response.bytes, 0)
  console.log(`[ruyi-staff-cold-responses] ${testInfo.project.name}: ${JSON.stringify(responses)}`)
  console.log(`[ruyi-staff-cold-bytes] ${testInfo.project.name}: ${total}`)
  expect(total).toBeLessThanOrEqual(RUYI_STAFF_COLD_BYTES)
})

test('@staff-parent parent report and V3 export-import preserve exact w1-m2 session', async ({ page }) => {
  await openMission(page); await wrongThenCorrect(page); const before = await readFullSession(page)
  await activate(page, '回成长地图'); await activate(page, '家长周报')
  const pin = page.getByLabel('家长 PIN'); await pin.fill('4826'); await activate(page, '进入周报')
  await expect(page.getByText('运行 2 次 · 调整 1 次')).toBeVisible()
  const started = page.waitForEvent('download'); await activate(page, '导出进度'); const download = await started; const file = await download.path(); expect(file).not.toBeNull()
  const exported = JSON.parse(fs.readFileSync(file!, 'utf8')); expect(exported.sessions['w1-m2']).toEqual(before)

  await activate(page, '成长地图'); await activate(page, '定海神针')
  await activate(page, '删除：缩小定海神针')
  await expect.poll(() => readFullSession(page)).not.toEqual(exported.sessions['w1-m2'])
  const changed = await readFullSession(page)
  expect(changed.workspace.blocks).toHaveLength(2)

  await page.getByTestId('mission-background').getByRole('button', { name: '成长地图' }).click(); await activate(page, '家长周报')
  const returnPin = page.getByLabel('家长 PIN'); await returnPin.fill('4826'); await activate(page, '进入周报')
  await page.getByLabel('选择进度文件').setInputFiles(file!); await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible()
  await expect.poll(() => readFullSession(page)).toEqual(exported.sessions['w1-m2'])
})

test('@staff-lazy 503 on w1-m2 experience chunk keeps story and explicit reload', async ({ page }) => {
  await preloadUnlocked(page)
  let targetUrl: string | null = null
  allowStaffHealth = event => expectedNavigationAbort(event) || isExactInjectedChunkFailure(event, targetUrl)
  await page.route(/RuyiStaffExperience-.*\.js/, (route) => { targetUrl = route.request().url(); return route.fulfill({ status: 503, body: 'unavailable' }) })
  await page.goto('./#/mission/w1-m2')
  await expect(page.getByRole('heading', { name: '定海神针', level: 1 })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('定海神针任务加载失败')
  await expect(page.getByRole('button', { name: '重新加载页面' })).toBeVisible()
})

test('@staff-lazy RuyiStaffScene 503 keeps the real Blockly half and local recovery visible', async ({ page }) => {
  await preloadUnlocked(page)
  let targetUrl: string | null = null
  allowStaffHealth = event => expectedNavigationAbort(event) || isExactInjectedChunkFailure(event, targetUrl)
  await page.route(/RuyiStaffScene-.*\.js/, (route) => { targetUrl = route.request().url(); return route.fulfill({ status: 503, body: 'unavailable' }) })
  await page.goto('./#/mission/w1-m2')
  await expect(page.getByRole('heading', { name: '定海神针', level: 1 })).toBeVisible()
  await expect(page.getByText('神珍依悟空心意变小，成为如意金箍棒。')).toBeVisible()
  await expect(page.getByRole('heading', { name: '比较兵器重量并选出金箍棒', level: 2 })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('定海神针场景加载失败')
  await expect(page.getByRole('button', { name: '加入：查看三件兵器重量' })).toBeVisible()
  await expect(page.getByRole('button', { name: '重新加载页面' })).toBeVisible()
})

test('@staff-lazy RuyiStaffBlocklyWorkspace 503 keeps the formal scene and local recovery visible', async ({ page }) => {
  await preloadUnlocked(page)
  let targetUrl: string | null = null
  allowStaffHealth = event => expectedNavigationAbort(event) || isExactInjectedChunkFailure(event, targetUrl)
  await page.route(/RuyiStaffBlocklyWorkspace-.*\.js/, (route) => { targetUrl = route.request().url(); return route.fulfill({ status: 503, body: 'unavailable' }) })
  await page.goto('./#/mission/w1-m2')
  await expect(page.getByRole('heading', { name: '定海神针', level: 1 })).toBeVisible()
  await expect(page.getByText('神珍依悟空心意变小，成为如意金箍棒。')).toBeVisible()
  await expect(page.getByRole('heading', { name: '比较兵器重量并选出金箍棒', level: 2 })).toBeVisible()
  await expect(page.locator('.ruyi-staff-scene-frame .game-scene canvas')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('alert')).toContainText('定海神针编程工作台加载失败')
  await expect(page.getByRole('button', { name: '重新加载页面' })).toBeVisible()
})
