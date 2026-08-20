import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'

const CURRENT_KEY = 'xiyou-programming-progress-v3'
type HealthEvent = { kind: 'console' | 'pageerror' | 'requestfailed' | 'response'; url: string; detail: string; status?: number }
let healthEvents: HealthEvent[] = []

function expectedNavigationAbort(event: HealthEvent) {
  return event.kind === 'requestfailed' && (
    (event.url.startsWith('https://fonts.gstatic.com/') && /ABORTED|cancelled/i.test(event.detail))
    || (event.url.includes('/assets/audio/') && /ABORTED|cancelled/i.test(event.detail))
    || (event.url === 'https://static.blockly.com/media/sprites.svg' && /ABORTED|cancelled/i.test(event.detail))
  )
}

function attachHealth(page: Page) {
  const capture = (event: HealthEvent) => { if (!expectedNavigationAbort(event)) healthEvents.push(event) }
  page.on('console', (message) => { if (message.type() === 'error') capture({ kind: 'console', url: message.location().url || page.url(), detail: message.text() }) })
  page.on('pageerror', (error) => capture({ kind: 'pageerror', url: page.url(), detail: error.message }))
  page.on('requestfailed', (request) => capture({ kind: 'requestfailed', url: request.url(), detail: request.failure()?.errorText ?? 'unknown' }))
  page.on('response', (response) => { if (response.status() >= 400) capture({ kind: 'response', url: response.url(), detail: `HTTP ${response.status()}`, status: response.status() }) })
}

async function activate(page: Page, name: string | RegExp, keyboard: boolean) {
  const button = page.getByRole('button', { name, exact: typeof name === 'string' }).first()
  await expect(button).toBeEnabled()
  if (keyboard) { await button.focus(); await button.press('Enter') } else await button.click()
}

async function continueNext(page: Page, keyboard: boolean) {
  await activate(page, '继续下一关', keyboard)
}

async function readProgress(page: Page) {
  return page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  }, CURRENT_KEY)
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => ({
    document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    body: document.body.scrollWidth - document.body.clientWidth,
  }))).toEqual({ document: 0, body: 0 })
}

async function deleteAdvanced(page: Page, label: string, keyboard: boolean) {
  const button = page.getByRole('listitem').filter({ hasText: label }).getByRole('button', { name: '删除' })
  await expect(button).toBeEnabled()
  if (keyboard) { await button.focus(); await button.press('Enter') } else await button.click()
}

async function completeM1(page: Page, keyboard: boolean) {
  await activate(page, '加入：请求兵器', keyboard)
  await activate(page, '加入：进入龙宫', keyboard)
  await activate(page, '加入：试用兵器', keyboard)
  await activate(page, '执行战斗指令', keyboard)
  await expect(page.getByRole('alert').filter({ hasText: '悟空还在龙宫外' })).toBeVisible()
  await activate(page, '上移：进入龙宫', keyboard)
  await activate(page, '删除：试用兵器', keyboard)
  await activate(page, '加入：试用兵器', keyboard)
  await activate(page, '执行战斗指令', keyboard)
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
}

async function completeM2(page: Page, keyboard: boolean) {
  await activate(page, '加入：查看三件兵器重量', keyboard)
  await activate(page, '加入：选择方天画戟（7200斤）', keyboard)
  await activate(page, '加入：缩小定海神针', keyboard)
  await activate(page, '执行战斗指令', keyboard)
  await expect(page.getByRole('alert').filter({ hasText: '7200斤比13500斤轻' })).toBeVisible()
  await activate(page, '删除：选择方天画戟（7200斤）', keyboard)
  await activate(page, '加入：选择定海神针（13500斤）', keyboard)
  await activate(page, '上移：选择定海神针（13500斤）', keyboard)
  await activate(page, '执行战斗指令', keyboard)
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
}

async function completeM3(page: Page, keyboard: boolean) {
  for (const name of [
    '加入主任务：向东海龙王请求披挂', '加入主任务：收齐三海宝物', '加入主任务：穿戴整副披挂', '加入主任务：检查披挂是否齐全',
    '加入穿戴子任务：戴上凤翅紫金冠', '加入穿戴子任务：穿上锁子黄金甲', '加入穿戴子任务：踏上藕丝步云履',
    '加入收集子任务：收下南海的凤翅紫金冠', '加入收集子任务：收下西海的锁子黄金甲', '加入收集子任务：收下北海的藕丝步云履',
  ]) await activate(page, name, keyboard)
  await activate(page, '执行披挂指令', keyboard)
  await expect(page.getByRole('alert').filter({ hasText: '北海龙王还没有送来云履' })).toBeVisible()
  await activate(page, '删除：收下南海的凤翅紫金冠', keyboard)
  await activate(page, '加入收集子任务：收下南海的凤翅紫金冠', keyboard)
  await activate(page, '上移收集子任务：收下北海的藕丝步云履', keyboard)
  await activate(page, '执行披挂指令', keyboard)
  const childSteps = page.locator('.execution-provenance')
  await expect(childSteps).toBeAttached()
  await expect(childSteps).not.toContainText(/parent=|instruction:/)
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
}

async function equipAll(page: Page, keyboard: boolean) {
  await activate(page, '打开装备行囊', keyboard)
  const drawer = page.getByRole('dialog', { name: '装备行囊' })
  await expect(drawer).toBeVisible()
  for (const item of ['如意金箍棒', '凤翅紫金冠', '黄金锁子甲', '藕丝步云履']) await activate(page, `装备${item}`, keyboard)
  const targets = drawer.getByRole('button')
  for (let index = 0; index < await targets.count(); index += 1) {
    const box = await targets.nth(index).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  await activate(page, '关闭', keyboard)
}

async function completeM4(page: Page, keyboard: boolean) {
  await activate(page, '查看任务拆分图', keyboard)
  await expect(page.getByRole('region', { name: '幽冥勾名当前任务拆分图' })).toBeVisible()
  await activate(page, '返回普通视图', keyboard)
  await activate(page, '加入主程序：打开名册', keyboard)
  await activate(page, '加入主程序：处理已找到的名号', keyboard)
  await activate(page, '执行幽冥勾名指令', keyboard)
  await expect(page.getByRole('alert')).toContainText('顺序')
  await expect(page.getByRole('button', { name: '回看已走通步骤' })).toBeEnabled({ timeout: 15_000 })
  await activate(page, '回看已走通步骤', keyboard)
  await expect(page.getByRole('button', { name: '再次定位问题积木' })).toBeEnabled({ timeout: 15_000 })
  await activate(page, '再次定位问题积木', keyboard)
  await deleteAdvanced(page, '处理已找到的名号', keyboard)
  for (const name of ['加入主程序：查找猴属记录', '加入查找子程序：读取索引', '加入查找子程序：匹配猴属', '加入查找子程序：收集有名记录', '加入主程序：处理已找到的名号', '加入主程序：核对名册结果']) await activate(page, name, keyboard)
  await activate(page, '执行幽冥勾名指令', keyboard)
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
}

async function completeM5(page: Page, keyboard: boolean) {
  await activate(page, '查看重量资料', keyboard)
  await expect(page.getByRole('region', { name: '三件兵器重量资料' })).toContainText('定海神针13500斤')
  await activate(page, '收起重量资料', keyboard)
  await activate(page, '加入主程序：制定第三回计划', keyboard)
  await activate(page, '加入主程序：验证因果链', keyboard)
  await activate(page, '执行第三回总试炼指令', keyboard)
  await expect(page.getByRole('alert')).toContainText('顺序')
  await deleteAdvanced(page, '验证因果链', keyboard)
  for (const name of ['加入主程序：龙宫检查点', '加入查找子程序：进入龙宫', '加入查找子程序：比较兵器重量', '加入查找子程序：选定可变化的金箍棒', '加入主程序：披挂检查点', '加入查找子程序：拆分三件礼物', '加入查找子程序：验证披挂齐全', '加入主程序：名册检查点', '加入查找子程序：打开名册', '加入查找子程序：查找猴属记录', '加入查找子程序：处理匹配名号', '加入主程序：验证因果链']) await activate(page, name, keyboard)
  await activate(page, '执行第三回总试炼指令', keyboard)
  await expect(page.getByRole('dialog', { name: '闯关成功' })).toBeVisible({ timeout: 15_000 })
}

async function setupParentAndExport(page: Page, keyboard: boolean) {
  await activate(page, '家长周报', keyboard)
  await page.getByLabel('设置 4 位家长 PIN').fill('4826')
  await page.getByLabel('确认家长 PIN').fill('4826')
  await activate(page, '创建家长 PIN', keyboard)
  await page.getByLabel('我已安全保存恢复码').check()
  await activate(page, '确认已保存并进入', keyboard)
  await expect(page.getByRole('region', { name: '装备与跨关学习工具' })).toContainText('第五关「第三回总试炼」查看过兵器重量资料')
  const started = page.waitForEvent('download')
  await activate(page, '导出进度', keyboard)
  const file = await started
  const filePath = await file.path()
  expect(filePath).not.toBeNull()
  return filePath!
}

test.beforeEach(async ({ page }) => { healthEvents = []; attachHealth(page) })
test.afterEach(() => { expect(healthEvents, 'unexpected unified week-one browser health events').toEqual([]) })

test('@week-one-system visible five-mission path grants, equips, uses, removes, exports and restores the real first-week loop', async ({ page }, testInfo) => {
  test.setTimeout(360_000)
  const keyboard = testInfo.project.name === 'desktop-chromium-1440x1024' || testInfo.project.name === 'desktop-firefox-1440x1024'
  await page.goto('./')
  await activate(page, '我知道了', keyboard)
  await activate(page, '减弱动画', keyboard)
  await activate(page, '关闭声音', keyboard)
  await activate(page, /开始第一关：龙宫求兵|继续第1周第1关/, keyboard)
  await completeM1(page, keyboard); await continueNext(page, keyboard)
  await completeM2(page, keyboard)
  expect((await readProgress(page)).equipment.inventory['ruyi-staff']).toMatchObject({ grantedBy: 'w1-m2' })
  await continueNext(page, keyboard)
  await completeM3(page, keyboard)
  const afterM3 = await readProgress(page)
  expect(Object.keys(afterM3.equipment.inventory).sort()).toEqual(['cloud-walking-boots', 'golden-chain-armor', 'phoenix-crown', 'ruyi-staff'])
  await activate(page, '回成长地图', keyboard)
  await equipAll(page, keyboard)
  await activate(page, '幽冥勾名', keyboard)
  await completeM4(page, keyboard)
  const beforeRefresh = await readProgress(page)
  await page.reload()
  await expect(page.getByRole('heading', { name: '幽冥勾名', level: 1 })).toBeVisible()
  expect((await readProgress(page)).sessions['w1-m4']).toEqual(beforeRefresh.sessions['w1-m4'])
  await activate(page, '成长地图', keyboard)
  await activate(page, '第三回总试炼', keyboard)
  await completeM5(page, keyboard)
  const completeWeek = await readProgress(page)
  expect(Object.keys(completeWeek.missions).filter((id) => /^w1-m[1-5]$/.test(id))).toHaveLength(5)
  expect(completeWeek.sessions['w1-m4'].equipmentEffectsUsed.sort()).toEqual(['accepted-prefix-playback', 'decomposition-view', 'repeat-problem-navigation'])
  expect(completeWeek.sessions['w1-m5'].equipmentEffectsUsed).toContain('weight-reference')
  await activate(page, '回成长地图', keyboard)
  const exportedPath = await setupParentAndExport(page, keyboard)
  const exported = JSON.parse(fs.readFileSync(exportedPath, 'utf8'))
  expect(exported.equipment).toEqual(completeWeek.equipment)
  await activate(page, '成长地图', keyboard)
  await activate(page, '打开装备行囊', keyboard)
  for (const item of ['如意金箍棒', '凤翅紫金冠', '黄金锁子甲', '藕丝步云履']) await activate(page, `卸下${item}`, keyboard)
  await activate(page, '关闭', keyboard)
  await activate(page, '第三回总试炼', keyboard)
  await expect(page.getByRole('button', { name: '查看重量资料' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '查看任务拆分图' })).toHaveCount(0)
  await deleteAdvanced(page, '验证因果链', keyboard)
  await activate(page, '加入查找子程序：处理匹配名号', keyboard)
  await activate(page, '执行第三回总试炼指令', keyboard)
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('button', { name: '回看已走通步骤' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '再次定位问题积木' })).toHaveCount(0)
  await activate(page, '成长地图', keyboard)
  await activate(page, '家长周报', keyboard)
  await page.getByLabel('家长 PIN').fill('4826')
  await activate(page, '进入周报', keyboard)
  await page.getByLabel('选择进度文件').setInputFiles(exportedPath)
  await expect(page.getByText('导入成功：来源版本 V3。')).toBeVisible()
  expect((await readProgress(page)).equipment).toEqual(exported.equipment)
  await activate(page, '成长地图', keyboard)
  await page.reload()
  await activate(page, '打开装备行囊', keyboard)
  for (const item of ['如意金箍棒', '凤翅紫金冠', '黄金锁子甲', '藕丝步云履']) await expect(page.getByRole('button', { name: `卸下${item}` })).toBeEnabled()
  await expectNoOverflow(page)
  await testInfo.attach('week-one-system-loop.json', { body: Buffer.from(JSON.stringify({ project: testInfo.project.name, missions: Object.keys(exported.missions).filter((id) => /^w1-m[1-5]$/.test(id)), equipment: exported.equipment, effectUses: { m4: exported.sessions['w1-m4'].equipmentEffectsUsed, m5: exported.sessions['w1-m5'].equipmentEffectsUsed } }, null, 2)), contentType: 'application/json' })
  await testInfo.attach('week-one-equipment-drawer.png', { body: await page.screenshot({ fullPage: true, animations: 'disabled' }), contentType: 'image/png' })
})
