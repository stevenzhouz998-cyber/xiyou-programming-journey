import { expect, test, type Page, type TestInfo } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { DRAGON_PALACE_COLD_LOAD_MAX_BYTES } from '../scripts/budget-limits.mjs'

const CURRENT_KEY = 'xiyou-programming-progress-v3'
const SNAPSHOT_KEY = 'xiyou-programming-progress-snapshot-v3'
const updateEvidence = process.env.XIYOU_UPDATE_EVIDENCE === '1'
const TEST_PARENT_ACCESS = 'access-v1:cf7667b114bf7a735116fc8439f0d17f3213159c48b22be56376521fbbc5cbb1:678bd461a82e086d3332d9c0f72cfae199f75eab78fba024dd8d28acd1702e27'

type SessionEvidence = {
  blockIds: string[]
  trace: Array<{ instructionId: string; sourceBlockId: string; opcode: string }>
  events: Array<{ type: string; messageCode: string; state: string }>
  totalRuns: number
  runtimeFailures: number
}

async function acknowledge(page: Page) {
  await page.goto('./')
  const dialog = page.getByRole('dialog', { name: '你的学习数据保存在这台设备' })
  if (await dialog.isVisible()) {
    await page.getByRole('button', { name: '我知道了' }).click()
    await expect(dialog).toBeHidden()
  }
  const changed = await page.evaluate(({ key, access }) => {
    const raw = localStorage.getItem(key)
    if (!raw) return false
    const progress = JSON.parse(raw)
    if (progress.settings.parentPin !== 'unset') return false
    progress.settings.parentPin = access
    localStorage.setItem(key, JSON.stringify(progress))
    return true
  }, { key: CURRENT_KEY, access: TEST_PARENT_ACCESS })
  if (changed) await page.reload()
  await expect.poll(() => page.evaluate(key => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).settings.parentPin : null
  }, CURRENT_KEY)).toBe(TEST_PARENT_ACCESS)
}

async function openFirstMission(page: Page) {
  await acknowledge(page)
  await page.getByRole('button', { name: /开始第一关：龙宫求兵|继续第1周第1关/ }).click()
  await expect(page).toHaveURL(/#\/mission\/w1-m1$/)
  await expect(page.getByRole('button', { name: '加入：进入龙宫' })).toBeVisible()
  await expect(page.locator('.game-scene')).toHaveAttribute('data-scene-state', 'outside-palace')
}

async function add(page: Page, label: '进入龙宫' | '请求兵器' | '试用兵器') {
  await page.getByRole('button', { name: `加入：${label}` }).click()
}

async function press(page: Page, name: string | RegExp) {
  const button = page.getByRole('button', { name })
  await button.press('Enter')
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))
  expect(overflow).toEqual({ document: 0, body: 0 })
}

async function expectUndistortedScene(page: Page) {
  const dimensions = await page.locator('.game-scene').evaluate((scene) => {
    const canvas = scene.querySelector('canvas')
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Dragon Palace canvas missing')
    const sceneRect = scene.getBoundingClientRect()
    const canvasRect = canvas.getBoundingClientRect()
    return {
      sceneRatio: sceneRect.width / sceneRect.height,
      canvasRatio: canvasRect.width / canvasRect.height,
      scaleX: canvasRect.width / canvas.width,
      scaleY: canvasRect.height / canvas.height,
    }
  })
  expect(Math.abs(dimensions.sceneRatio - 19 / 8)).toBeLessThan(0.02)
  expect(Math.abs(dimensions.canvasRatio - 19 / 8)).toBeLessThan(0.02)
  expect(Math.abs(dimensions.scaleX - dimensions.scaleY)).toBeLessThan(0.02)
}

async function readSessionEvidence(page: Page): Promise<SessionEvidence> {
  return page.evaluate((key) => {
    const progress = JSON.parse(localStorage.getItem(key)!)
    const session = progress.sessions['w1-m1']
    return {
      blockIds: session.workspace.blocks.map((block: { id: string }) => block.id).sort(),
      trace: session.lastTrace,
      events: (session.lastRun?.events ?? []).map((event: { type: string; messageCode: string; state: string }) => ({
        type: event.type,
        messageCode: event.messageCode,
        state: event.state,
      })),
      totalRuns: session.totalRuns,
      runtimeFailures: session.runtimeFailures,
    }
  }, CURRENT_KEY)
}

async function enterParentReport(page: Page) {
  const input = page.getByLabel('家长 PIN')
  await input.click()
  await input.pressSequentially('4826')
  await expect(input).toHaveValue('4826')
  await page.getByRole('button', { name: '进入周报' }).click()
}

async function buildWrongThenCorrect(page: Page, keyboardOnly = false) {
  const activate = keyboardOnly
    ? (name: string | RegExp) => press(page, name)
    : (name: string | RegExp) => page.getByRole('button', { name }).click()
  const program = page.locator('.block-program-list li')

  await activate('加入：请求兵器')
  await expect(program).toHaveCount(1)
  await activate('加入：进入龙宫')
  await expect(program).toHaveCount(2)
  await activate('加入：试用兵器')
  await expect(program).toHaveCount(3)
  await activate('执行战斗指令')
  const feedback = page.getByRole('alert').filter({ hasText: '悟空还在龙宫外' })
  await expect(feedback).toBeFocused()
  await expect(page.locator('.game-scene')).toHaveAttribute('data-scene-state', 'outside-palace')
  await expect(page.locator('.battle-transcript')).toContainText('指令被挡住')

  await activate('回到问题积木')
  await expect(page.locator('.block-program-list li').filter({ hasText: '请求兵器' })).toBeFocused()
  await activate('上移：进入龙宫')
  await activate('删除：试用兵器')
  await activate('加入：试用兵器')
  await expect(page.locator('.block-program-list li').nth(0)).toContainText('进入龙宫')
  await expect(page.locator('.block-program-list li').nth(1)).toContainText('请求兵器')
  await expect(page.locator('.block-program-list li').nth(2)).toContainText('试用兵器')
  await activate('执行战斗指令')
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
  await expect.poll(() => page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw).missions['w1-m1']?.status : undefined
  }, CURRENT_KEY)).toBe('completed')
}

async function captureSuccessfulState(page: Page, testInfo: TestInfo) {
  if (!updateEvidence) return
  const selected: Record<string, number> = {
    'narrow-chromium-320x844': 320,
    'mobile-chromium-390x844': 390,
    'tablet-webkit-768x1024': 768,
    'desktop-chromium-1440x1024': 1440,
  }
  const width = selected[testInfo.project.name]
  if (!width) return
  const target = path.resolve('docs/verification/screenshots', `dragon-palace-${width}.png`)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  await page.screenshot({ path: target, fullPage: true, animations: 'disabled' })
}

async function captureRuntimeState(page: Page, filename: string) {
  if (!updateEvidence) return
  const target = path.resolve('docs/verification/screenshots', filename)
  fs.mkdirSync(path.dirname(target), { recursive: true })
  await page.locator('.game-scene').scrollIntoViewIfNeeded()
  await page.screenshot({ path: target, fullPage: false, animations: 'disabled' })
}

async function installMediaObserver(page: Page) {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    ;(window as Window & { __xiyouMediaPlayCalls?: string[] }).__xiyouMediaPlayCalls = []
    HTMLMediaElement.prototype.play = function () {
      ;(window as Window & { __xiyouMediaPlayCalls?: string[] }).__xiyouMediaPlayCalls?.push(this.currentSrc || this.src)
      return play.call(this)
    }
  })
  const successRequests: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/assets/audio/success.m4a')) successRequests.push(request.url())
  })
  return {
    successRequests,
    playCalls: () => page.evaluate(() => (window as Window & { __xiyouMediaPlayCalls?: string[] }).__xiyouMediaPlayCalls ?? []),
  }
}

test('@full real Blockly wrong program is corrected through visible controls, persists, unlocks, and reaches the PIN report', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await openFirstMission(page)
  await expectUndistortedScene(page)
  await buildWrongThenCorrect(page)
  const beforeRefresh = await readSessionEvidence(page)
  expect(beforeRefresh.totalRuns).toBe(2)
  expect(beforeRefresh.runtimeFailures).toBe(1)
  expect(beforeRefresh.trace.map((item) => item.opcode)).toEqual(['enter_palace', 'request_weapon', 'test_weapon'])
  expect(beforeRefresh.trace.map((item) => item.sourceBlockId).sort()).toEqual(beforeRefresh.blockIds)

  await page.reload()
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeHidden()
  await expect(page.locator('.game-scene')).toHaveAttribute('data-scene-state', 'weapon-tested', { timeout: 15_000 })
  await expect(page.locator('.battle-transcript')).toContainText('战斗结束：试兵完成')
  expect(await readSessionEvidence(page)).toEqual(beforeRefresh)
  await captureSuccessfulState(page, testInfo)
  if (page.viewportSize()?.width === 320) await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: '成长地图' }).first().click()
  await expect(page.getByRole('button', { name: '定海神针' })).toBeEnabled()
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).settings.parentPin, CURRENT_KEY)).toBe(TEST_PARENT_ACCESS)
  await page.getByRole('button', { name: '家长周报' }).click()
  await expect(page.getByText(/运行 2 次 · 调整 1 次/)).toBeHidden()
  await enterParentReport(page)
  await expect(page.getByText('运行 2 次 · 调整 1 次')).toBeVisible()
  const exportStarted = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出进度' }).click()
  const exported = await exportStarted
  const exportedPath = await exported.path()
  expect(exportedPath).not.toBeNull()
  const exportedProgress = JSON.parse(fs.readFileSync(exportedPath!, 'utf8'))
  expect(exportedProgress.sessions['w1-m1'].lastTrace).toEqual(beforeRefresh.trace)
  await page.getByLabel('选择进度文件').setInputFiles(exportedPath!)
  await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible()
  expect(await readSessionEvidence(page)).toEqual(beforeRefresh)
})

test('@narrow real Blockly wrong program reaches success without horizontal overflow', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await openFirstMission(page)
  await expectUndistortedScene(page)
  await buildWrongThenCorrect(page)
  await page.getByRole('button', { name: '回成长地图' }).click()
  await page.getByRole('button', { name: '龙宫求兵' }).click()
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeHidden()
  await expect(page.locator('.game-scene')).toHaveAttribute('data-scene-state', 'weapon-tested', { timeout: 15_000 })
  await expect(page.locator('.battle-transcript')).toContainText('战斗结束：试兵完成')
  await expectNoHorizontalOverflow(page)
  const verticalOrder = await page.locator('.dragon-palace-experience').evaluate((experience) => {
    const top = (selector: string) => {
      const node = experience.querySelector(selector)
      if (!(node instanceof HTMLElement)) throw new Error(`Missing ${selector}`)
      return node.getBoundingClientRect().top
    }
    return [top('.game-scene'), top('.dragon-palace-scene-controls'), top('.dragon-palace-program-region'), top('.dragon-palace-feedback-region')]
  })
  expect(verticalOrder).toEqual([...verticalOrder].sort((left, right) => left - right))
  await captureSuccessfulState(page, testInfo)
})

test('@storage a real Blockly edit stays visible when storage fails and the visible retry persists it', async ({ page }) => {
  await page.addInitScript((currentKey) => {
    const nativeSetItem = Storage.prototype.setItem
    ;(window as Window & { __xiyouFailCurrentWrites?: boolean }).__xiyouFailCurrentWrites = false
    Storage.prototype.setItem = function (key, value) {
      if (key === currentKey && (window as Window & { __xiyouFailCurrentWrites?: boolean }).__xiyouFailCurrentWrites) {
        throw new Error('intentional Task10 storage failure')
      }
      nativeSetItem.call(this, key, value)
    }
  }, CURRENT_KEY)
  await openFirstMission(page)
  await page.evaluate(() => { (window as Window & { __xiyouFailCurrentWrites?: boolean }).__xiyouFailCurrentWrites = true })
  await add(page, '进入龙宫')
  const unsavedDraft = page.locator('.code-workspace .unsaved-session')
  await expect(unsavedDraft).toContainText('尚未保存，请稍后重试。')
  await expect(page.locator('.block-program-list li')).toContainText('进入龙宫')
  await page.evaluate(() => { (window as Window & { __xiyouFailCurrentWrites?: boolean }).__xiyouFailCurrentWrites = false })
  await unsavedDraft.getByRole('button', { name: '重试保存' }).click()
  await expect(unsavedDraft).toBeHidden()
  expect((await readSessionEvidence(page)).blockIds).toHaveLength(1)
})

test('@keyboard keyboard-only visible controls edit the real Blockly workspace and complete the mission', async ({ page }) => {
  test.setTimeout(90_000)
  await openFirstMission(page)
  await buildWrongThenCorrect(page, true)
  const evidence = await readSessionEvidence(page)
  expect(evidence.trace.map((item) => item.opcode)).toEqual(['enter_palace', 'request_weapon', 'test_weapon'])
})

test('@parity reduced motion and pre-execution mute preserve the same event sequence, transcript, and final state', async ({ page }) => {
  test.setTimeout(90_000)
  const media = await installMediaObserver(page)
  await openFirstMission(page)
  await expect(page.getByRole('button', { name: '关闭声音' })).toBeVisible()
  await add(page, '进入龙宫')
  await add(page, '请求兵器')
  await add(page, '试用兵器')
  await page.getByRole('button', { name: '执行战斗指令' }).click()
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
  await expect.poll(async () => (await media.playCalls()).filter((url) => url.includes('/assets/audio/success.m4a')).length).toBeGreaterThan(0)
  expect(media.successRequests.length).toBeGreaterThan(0)
  const standardEvidence = await readSessionEvidence(page)
  const standardTranscript = await page.locator('.battle-transcript').innerText()
  await page.getByRole('button', { name: '回成长地图' }).click()
  await page.getByRole('button', { name: '家长周报' }).click()
  await enterParentReport(page)
  await page.getByRole('button', { name: '清空学习数据' }).click()
  await page.getByLabel('输入“清空”以确认').fill('清空')
  const backupStarted = page.waitForEvent('download')
  await page.getByRole('button', { name: '备份并清空' }).click()
  await backupStarted
  const privacyDialog = page.getByRole('dialog', { name: '你的学习数据保存在这台设备' })
  await expect(privacyDialog).toBeVisible()
  await page.getByRole('button', { name: '我知道了' }).click()
  await expect(privacyDialog).toBeHidden()
  await page.getByRole('button', { name: '成长地图' }).first().click()
  await page.getByRole('button', { name: /开始第一关：龙宫求兵|继续第1周第1关/ }).click()
  await page.getByRole('button', { name: '减弱动画' }).click()
  await page.getByRole('button', { name: '关闭声音' }).click()
  await expect(page.getByTestId('app-shell')).toHaveAttribute('data-reduced-motion', 'true')
  await expect(page.getByRole('button', { name: '开启声音' })).toBeVisible()
  const mutedPlayBaseline = (await media.playCalls()).length
  const mutedRequestBaseline = media.successRequests.length
  await add(page, '进入龙宫')
  await add(page, '请求兵器')
  await add(page, '试用兵器')
  await page.getByRole('button', { name: '执行战斗指令' }).click()
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.game-scene')).toHaveAttribute('data-motion-mode', 'reduced')
  await expect(page.locator('.game-scene')).toHaveAttribute('data-scene-state', 'weapon-tested')
  await expect(page.locator('.battle-transcript')).toHaveText(standardTranscript)
  expect((await media.playCalls()).length).toBe(mutedPlayBaseline)
  expect(media.successRequests.length).toBe(mutedRequestBaseline)
  const mutedEvidence = await readSessionEvidence(page)
  expect(mutedEvidence.trace.map((item) => item.opcode)).toEqual(standardEvidence.trace.map((item) => item.opcode))
  expect(mutedEvidence.events).toEqual(standardEvidence.events)
})

test('@visual visible Blockly programs expose accepted, blocked, and three-weapon Phaser sheet states', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 768, height: 1024 })
  await openFirstMission(page)
  await expectUndistortedScene(page)

  await add(page, '进入龙宫')
  await page.getByRole('button', { name: '执行战斗指令' }).click()
  await expect(page.locator('.game-scene')).toHaveAttribute('data-effect-cell', 'accepted')
  await captureRuntimeState(page, 'dragon-palace-runtime-enter-accepted-768.png')

  await page.getByRole('button', { name: '清空并重新开始' }).click()
  await add(page, '请求兵器')
  await page.getByRole('button', { name: '执行战斗指令' }).click()
  await expect(page.locator('.game-scene')).toHaveAttribute('data-effect-cell', 'blocked')
  await expect(page.locator('.battle-transcript')).toContainText('指令被挡住')
  await page.waitForTimeout(500)
  await captureRuntimeState(page, 'dragon-palace-runtime-request-blocked-768.png')

  await page.getByRole('button', { name: '清空并重新开始' }).click()
  await add(page, '进入龙宫')
  await add(page, '请求兵器')
  await page.getByRole('button', { name: '执行战斗指令' }).click()
  await expect(page.locator('.game-scene')).toHaveAttribute('data-scene-state', 'weapon-requested', { timeout: 15_000 })
  await expect(page.locator('.game-scene')).toHaveAttribute('data-weapon-display', 'all')
  await expect(page.locator('.battle-transcript')).toContainText('龙王展示三件兵器')
  await expect(page.locator('.battle-transcript')).toContainText('战斗结束：程序还缺少后续指令')
  await page.getByRole('button', { name: '重播最近一次' }).click()
  await expect(page.locator('.game-scene')).toHaveAttribute('data-weapon-display', 'hidden')
  await expect(page.locator('.game-scene')).toHaveAttribute('data-weapon-display', 'all')
  await expect(page.locator('.battle-transcript')).toContainText('战斗结束：程序还缺少后续指令')
  await page.waitForTimeout(500)
  await captureRuntimeState(page, 'dragon-palace-runtime-weapons-all-768.png')
})

function recoverySnapshot() {
  return {
    version: 3,
    schemaRevision: 2,
    learnerName: '恢复小行者',
    missions: {},
    settings: { muted: true, reducedMotion: true, reducedMotionOverride: true, parentPin: TEST_PARENT_ACCESS },
    privacy: { localDataNoticeSeen: true },
    recovery: { lastRecoveredAt: null, source: null },
    sessions: {
      'w1-m1': {
        workspace: { version: 1, blocks: [{ id: 'recovered-enter', type: 'xiyou_enter_palace', nextId: null, x: 10, y: 10 }] },
        lastTrace: [],
        lastRun: null,
        totalRuns: 0,
        runtimeFailures: 0,
        compileFailures: 0,
        usedHintTiers: [],
        conceptFailures: { programStructure: 0, sequencePrecondition: 0, completeness: 0 },
        lastRunAt: null,
        savedAt: '2026-07-15T00:00:00.000Z',
      },
    },
    equipment: { version: 1, inventory: {}, equipped: { weapon: null, head: null, body: null, feet: null } },
    savedAt: '2026-07-15T00:00:00.000Z',
  }
}

function corruptRecoveryFixture() {
  const snapshot = recoverySnapshot()
  const corrupt = JSON.stringify({
    ...snapshot,
    sessions: {
      'w1-m1': {
        ...snapshot.sessions['w1-m1'],
        workspace: { version: 1, blocks: [{ id: 'damaged-block', type: 'unknown-placeholder-block', nextId: null, x: 0, y: 0 }] },
      },
    },
  })
  return { snapshot, corrupt }
}

async function openRecoveredCorruptDraft(page: Page, snapshot: ReturnType<typeof recoverySnapshot>, corrupt: string) {
  await page.addInitScript(({ currentKey, snapshotKey, corruptRaw, snapshotRaw }) => {
    localStorage.setItem(currentKey, corruptRaw)
    localStorage.setItem(snapshotKey, snapshotRaw)
  }, { currentKey: CURRENT_KEY, snapshotKey: SNAPSHOT_KEY, corruptRaw: corrupt, snapshotRaw: JSON.stringify(snapshot) })
  await page.goto('./#/mission/w1-m1')
  await expect(page.getByText('学习进度已经安全恢复')).toBeVisible()
  await expect(page.locator('.block-program-list li')).toHaveCount(1)
  await expect(page.locator('.block-program-list li')).toContainText('进入龙宫')
  expect((await readSessionEvidence(page)).blockIds).toEqual(['recovered-enter'])
}

async function completeRecoveredDraft(page: Page) {
  await add(page, '请求兵器')
  await add(page, '试用兵器')
  await page.getByRole('button', { name: '执行战斗指令' }).click()
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
  expect((await readSessionEvidence(page)).trace[0].sourceBlockId).toBe('recovered-enter')
}

test('@corrupt-full corrupt V3 Blockly bytes are preserved, downloaded, recovered with stable IDs, and executable again', async ({ page }) => {
  test.setTimeout(90_000)
  const { snapshot, corrupt } = corruptRecoveryFixture()
  await openRecoveredCorruptDraft(page, snapshot, corrupt)
  await completeRecoveredDraft(page)

  await page.getByRole('button', { name: '回成长地图' }).click()
  await page.getByRole('button', { name: '家长周报' }).click()
  await enterParentReport(page)
  await expect(page.getByRole('button', { name: '下载损坏原文' })).toBeVisible()
  const downloadStarted = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载损坏原文' }).click()
  const download = await downloadStarted
  const downloadedPath = await download.path()
  expect(downloadedPath).not.toBeNull()
  const envelope = fs.readFileSync(downloadedPath!, 'utf8')
  expect(JSON.parse(envelope).current).toBe(corrupt)
})

test('@corrupt-smoke corrupt V3 Blockly bytes recover with stable IDs and execute again', async ({ page }) => {
  test.setTimeout(90_000)
  const { snapshot, corrupt } = corruptRecoveryFixture()
  await openRecoveredCorruptDraft(page, snapshot, corrupt)
  await completeRecoveredDraft(page)
})

test('@cold cold w1-m1 response bodies stay within the fixed 2.5 MiB budget with cache disabled', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.route('**/*', async (route) => {
    const headers = { ...route.request().headers(), 'cache-control': 'no-store', pragma: 'no-cache' }
    await route.continue({ headers })
  })
  const requestFailures: Array<{ url: string; error: string }> = []
  page.on('requestfailed', (request) => {
    const url = new URL(request.url())
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      requestFailures.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown request failure' })
    }
  })
  const bodies: Array<Promise<{ url: string; status: number; bytes: number }>> = []
  page.on('response', (response) => {
    const url = new URL(response.url())
    if (!['http:', 'https:'].includes(url.protocol)) return
    bodies.push((async () => {
      const status = response.status()
      if (status < 200 || status >= 300) return { url: response.url(), status, bytes: 0 }
      const body = await response.body()
      return { url: response.url(), status, bytes: body.byteLength }
    })())
  })
  await page.goto('./#/mission/w1-m1')
  await expect(page.locator('.blockly-host')).toBeVisible()
  await expect(page.locator('.game-scene canvas')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.game-scene')).toHaveAttribute('data-scene-state', 'outside-palace')
  await page.waitForLoadState('networkidle')
  const responses = await Promise.all(bodies)
  expect(requestFailures).toEqual([])
  expect(responses.filter((response) => response.status < 200 || response.status >= 300)).toEqual([])
  const total = responses.reduce((sum, response) => sum + response.bytes, 0)
  console.log(`[dragon-palace-cold-responses] ${testInfo.project.name}: ${JSON.stringify(responses)}`)
  expect(responses.some((response) => response.url.includes('/assets/dragon-palace/background.webp'))).toBe(true)
  expect(responses.some((response) => /\/assets\/phaser-.*\.js/.test(response.url))).toBe(true)
  expect(responses.some((response) => response.url.startsWith('https://static.blockly.com/'))).toBe(true)
  expect(total).toBeLessThanOrEqual(DRAGON_PALACE_COLD_LOAD_MAX_BYTES)
  console.log(`[dragon-palace-cold-bytes] ${testInfo.project.name}: ${total}`)
  await testInfo.attach('dragon-palace-cold-load.json', {
    body: Buffer.from(JSON.stringify({ project: testInfo.project.name, bytes: total, limit: DRAGON_PALACE_COLD_LOAD_MAX_BYTES, responses }, null, 2)),
    contentType: 'application/json',
  })
})
