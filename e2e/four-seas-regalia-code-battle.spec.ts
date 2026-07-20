import { expect, test, type Page } from '@playwright/test'

const CURRENT_KEY = 'xiyou-programming-progress-v3'
const NOW = '2026-07-19T00:00:00.000Z'
const TEST_PARENT_ACCESS = 'access-v1:cf7667b114bf7a735116fc8439f0d17f3213159c48b22be56376521fbbc5cbb1:678bd461a82e086d3332d9c0f72cfae199f75eab78fba024dd8d28acd1702e27'

type HealthEvent = { kind: 'console' | 'pageerror' | 'requestfailed'; url: string; detail: string }
let healthEvents: HealthEvent[] = []

function attachHealth(page: Page) {
  page.on('console', (message) => {
    if (message.type() === 'error') healthEvents.push({ kind: 'console', url: message.location().url || page.url(), detail: message.text() })
  })
  page.on('pageerror', (error) => healthEvents.push({ kind: 'pageerror', url: page.url(), detail: error.message }))
  page.on('requestfailed', (request) => {
    const event: HealthEvent = { kind: 'requestfailed', url: request.url(), detail: request.failure()?.errorText ?? 'unknown' }
    if (!expectedNavigationAbort(event)) healthEvents.push(event)
  })
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
    schemaRevision: 1,
    learnerName: '小行者',
    missions: {
      'w1-m1': { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW },
      'w1-m2': { status: 'completed', stars: 3, attempts: 1, hintsUsed: 0, completedAt: NOW },
    },
    settings: { muted: true, reducedMotion: false, reducedMotionOverride: true, parentPin: TEST_PARENT_ACCESS },
    privacy: { localDataNoticeSeen: true },
    recovery: { lastRecoveredAt: null, source: null },
    sessions: {},
    savedAt: NOW,
  }
}

async function installFourSeasPrerequisites(page: Page) {
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value))
  }, { key: CURRENT_KEY, value: fourSeasPrerequisiteFixture() })
}

test.beforeEach(async ({ page }) => {
  healthEvents = []
  attachHealth(page)
  await installFourSeasPrerequisites(page)
})

test.afterEach(() => {
  expect(healthEvents, 'unexpected Four Seas browser health events').toEqual([])
})

async function add(page: Page, name: string) {
  await page.getByRole('button', { name }).click()
}

async function buildMainAndEquip(page: Page) {
  await add(page, '加入主任务：向东海龙王请求披挂')
  await add(page, '加入主任务：收齐三海宝物')
  await add(page, '加入主任务：穿戴整副披挂')
  await add(page, '加入主任务：检查披挂是否齐全')
  await add(page, '加入穿戴子任务：戴上凤翅紫金冠')
  await add(page, '加入穿戴子任务：穿上锁子黄金甲')
  await add(page, '加入穿戴子任务：踏上藕丝步云履')
}

async function visibleTracePairs(page: Page) {
  const items = page.getByRole('region', { name: '本次执行来源' }).locator('li')
  const pairs: Array<{ sourceBlockId: string; parentBlockId: string | null }> = []
  for (let index = 0; index < await items.count(); index += 1) {
    const item = items.nth(index)
    const sourceBlockId = await item.locator('code').textContent()
    const parentText = await item.locator('span').textContent()
    if (sourceBlockId !== null && parentText !== null) {
      pairs.push({
        sourceBlockId,
        parentBlockId: parentText === 'parent=top' ? null : parentText.replace(/^parent=/, ''),
      })
    }
  }
  return pairs
}

async function readOnlyW1M3CompletionIdentity(page: Page) {
  // Read-only persistence evidence: this never writes CURRENT or injects completion.
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    const mission = raw ? JSON.parse(raw).missions?.['w1-m3'] : undefined
    return mission ? { attempts: mission.attempts, completedAt: mission.completedAt } : null
  }, CURRENT_KEY)
}

test('@regalia-full visible wrong nested order is corrected, persisted, and unlocks w1-m4', async ({ page }) => {
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
  await alert.getByRole('button', { name: '回到问题积木' }).click()
  const wrongItem = page.locator('.four-seas-program-tree li').filter({ hasText: '收下南海的凤翅紫金冠' })
  await expect(wrongItem).toBeFocused()

  await add(page, '删除：收下南海的凤翅紫金冠')
  await add(page, '加入收集子任务：收下南海的凤翅紫金冠')
  await add(page, '上移收集子任务：收下北海的藕丝步云履')
  await add(page, '执行披挂指令')
  await expect(page.getByRole('region', { name: '本次执行来源' })).toContainText('parent=')
  const traceBefore = await visibleTracePairs(page)
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
  await expect(page.locator('.four-seas-regalia-scene-frame .game-scene')).toHaveAttribute('data-scene-state', 'regalia-verified', { timeout: 15_000 })
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })

  await page.reload()
  await expect(page.getByRole('heading', { name: '四海披挂', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: '重播最近一次' })).toBeDisabled()
  expect(await visibleTracePairs(page)).toEqual(traceBefore)
  await expect(page.getByRole('region', { name: '本次执行来源' })).toContainText('parent=')
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
  expect(await visibleTracePairs(page)).toEqual(traceBefore)
  expect(await readOnlyW1M3CompletionIdentity(page)).toEqual(completionBeforeReplay)

  await page.getByRole('button', { name: '成长地图' }).first().click()
  await expect(page.getByRole('button', { name: '幽冥勾名' })).toBeEnabled()
})
