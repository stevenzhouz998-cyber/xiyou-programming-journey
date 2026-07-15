import { expect, test, type Page, type TestInfo } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { RUYI_STAFF_COLD_BYTES } from '../scripts/budget-limits.mjs'

const CURRENT_KEY = 'xiyou-programming-progress-v3'
const SNAPSHOT_KEY = 'xiyou-programming-progress-snapshot-v3'
const TEST_PARENT_ACCESS = 'access-v1:cf7667b114bf7a735116fc8439f0d17f3213159c48b22be56376521fbbc5cbb1:678bd461a82e086d3332d9c0f72cfae199f75eab78fba024dd8d28acd1702e27'
const NOW = '2026-07-16T00:00:00.000Z'
const updateEvidence = process.env.XIYOU_UPDATE_EVIDENCE === '1'

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
  await expect(page.locator('.ruyi-staff-scene-frame .game-scene')).toHaveAttribute('data-selected-weapon', 'halberd')
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

test('@staff-parity reduced motion and mute preserve the executable trace without success media', async ({ page }) => {
  const successRequests: string[] = []
  page.on('request', (request) => { if (request.url().includes('/assets/audio/success.m4a')) successRequests.push(request.url()) })
  await openMission(page)
  await activate(page, '减弱动画')
  await activate(page, '关闭声音')
  await add(page, '查看三件兵器重量')
  await add(page, '选择定海神针（13500斤）')
  await add(page, '缩小定海神针')
  await activate(page, '执行战斗指令')
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.ruyi-staff-scene-frame .game-scene')).toHaveAttribute('data-motion-mode', 'reduced')
  expect((await readEvidence(page)).trace.map((item: { opcode: string }) => item.opcode)).toEqual(['inspect_weights', 'choose_ruyi_staff', 'shrink_ruyi_staff'])
  expect(successRequests).toEqual([])
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
  await openMission(page); await wrongThenCorrect(page); const before = await readEvidence(page)
  await activate(page, '回成长地图'); await activate(page, '家长周报')
  const pin = page.getByLabel('家长 PIN'); await pin.fill('4826'); await activate(page, '进入周报')
  await expect(page.getByText('运行 2 次 · 调整 1 次')).toBeVisible()
  const started = page.waitForEvent('download'); await activate(page, '导出进度'); const download = await started; const file = await download.path(); expect(file).not.toBeNull()
  const exported = JSON.parse(fs.readFileSync(file!, 'utf8')); expect(exported.sessions['w1-m2'].lastTrace).toEqual(before.trace)
  await page.getByLabel('选择进度文件').setInputFiles(file!); await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible()
})

test('@staff-lazy 503 on w1-m2 experience chunk keeps story and explicit reload', async ({ page }) => {
  await preloadUnlocked(page)
  await page.route(/RuyiStaffExperience-.*\.js/, (route) => route.fulfill({ status: 503, body: 'unavailable' }))
  await page.goto('./#/mission/w1-m2')
  await expect(page.getByRole('heading', { name: '定海神针', level: 1 })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('定海神针任务加载失败')
  await expect(page.getByRole('button', { name: '重新加载页面' })).toBeVisible()
})
