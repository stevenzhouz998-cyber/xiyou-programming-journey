import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { assertAdvancedHelpSourceContract, assertAdvancedWeekOneE2ESourceContract, assertWeekOneSystemE2ESourceContract } from './check-advanced-week-one-e2e-contract.mjs'

test('forbids direct advanced progress injection while requiring raw browser health capture', () => {
  const good = `function attachHealth(page) {}\ntest.afterEach(() => { expect(healthEvents, 'health').toEqual([]) })\nawait page.addInitScript(() => localStorage.setItem('x', 'm1 prerequisite'))\ntest('@advanced-full @advanced-storage @advanced-keyboard @advanced-parity @advanced-external @advanced-corrupt @advanced-cold @advanced-parent @advanced-chunk-fault @advanced-asset-fault @advanced-narrow', () => {})\n重试保存积木 重试保存本次记录 重试保存通关 载入其他标签页版本 下载损坏原文 导出进度 选择进度文件 UNDERWORLD_REGISTER_COLD_LOAD_MAX_BYTES THIRD_CHAPTER_BOSS_COLD_LOAD_MAX_BYTES AdvancedWeekOneExperience AdvancedWeekOneScene AdvancedWeekOneBlocklyWorkspace`
  assert.doesNotThrow(() => assertAdvancedWeekOneE2ESourceContract(good))
  assert.throws(() => assertAdvancedWeekOneE2ESourceContract(`function attachHealth(page) {}\ntest.afterEach(() => { expect(healthEvents).toEqual([]) })\nawait page.evaluate(() => localStorage.setItem('x', JSON.stringify({ sessions: { 'w1-m4': {} } })))`), /inject/)
  assert.doesNotThrow(() => assertAdvancedWeekOneE2ESourceContract(fs.readFileSync(new URL('../e2e/underworld-boss-code-battle.spec.ts', import.meta.url), 'utf8')))
})

test('keeps help read-only and checks the shipped component', () => {
  assert.doesNotThrow(() => assertAdvancedHelpSourceContract(`function HintPanel() { return <button onClick={() => setOpen(true)}>提示</button> }`))
  assert.throws(() => assertAdvancedHelpSourceContract(`function HintPanel() { runAdvancedWeekOne(); return null }`), /help/)
  assert.doesNotThrow(() => assertAdvancedHelpSourceContract(fs.readFileSync(new URL('../src/components/MissionPageContent.tsx', import.meta.url), 'utf8')))
})

test('requires a real initial-state five-project week-one loop and rejects hidden browser writes', () => {
  const source = fs.readFileSync(new URL('../e2e/week-one-system-loop.spec.ts', import.meta.url), 'utf8')
  const config = fs.readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8')
  assert.doesNotThrow(() => assertWeekOneSystemE2ESourceContract(source, config))
  assert.throws(() => assertWeekOneSystemE2ESourceContract(`${source}\nawait page.addInitScript(() => {})`, config), /initial progress/)
  assert.throws(() => assertWeekOneSystemE2ESourceContract(`${source}\nawait page.evaluate(() => localStorage.setItem('x', 'forged'))`, config), /read-only/)
  assert.throws(() => assertWeekOneSystemE2ESourceContract(`${source}\nawait page.evaluate(() => { window.progress = {} })`, config), /assign/)
  assert.throws(() => assertWeekOneSystemE2ESourceContract(source, config.replace('@week-one-system', '@missing')), /five approved/)
})
