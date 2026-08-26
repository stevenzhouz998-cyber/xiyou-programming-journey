import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWeekTwoHeavenlyBossE2ESourceContract } from './check-week-two-heavenly-boss-e2e-contract.mjs';

test('requires W2-M5 visible four-step repair, keyboard helpers, storage recovery, raw health capture, and no injected progress', () => {
  const source = `
    test.afterEach(() => expect(healthEvents).toEqual([]))
    page.on('requestfailed', () => {})
    page.on('response', response => response.status())
    type HealthEvent = { kind: 'request'; url: string; detail: string }
    if (localStorage.getItem(currentKey) === null) { localStorage.setItem(currentKey, raw); localStorage.setItem(revisionKey, '0'); }
    test('@boss-full @boss-keyboard @boss-storage @boss-asset-fault @boss-cold @boss-narrow @boss-corrupt @boss-external @boss-parent @boss-lazy', () => {})
    fail-boss-draft fail-boss-session fail-boss-completion
    button.focus(); await page.keyboard.press('Enter')
    增加天马循环次数 交换齐天事件动作 把金丹放到误入兜率宫之后 听见炉头声响并看见光明
    WEEK_TWO_HEAVENLY_BOSS_COLD_LOAD_MAX_BYTES 重试保存本次记录 重试加载场景图片 canon-epilogue elapsedDays
    usedHintTiers hintsUsed: 1 stars: 2
  `;
  assert.doesNotThrow(() => assertWeekTwoHeavenlyBossE2ESourceContract(source));
  assert.throws(() => assertWeekTwoHeavenlyBossE2ESourceContract(source.replace('fail-boss-draft', 'missing-boss-draft')), /fail-boss-draft/i);
  assert.throws(() => assertWeekTwoHeavenlyBossE2ESourceContract(`${source}\npage.evaluate(() => localStorage.setItem('x', JSON.stringify({ missions: { 'w2-m5': {} } })))`), /inject/i);
  assert.throws(() => assertWeekTwoHeavenlyBossE2ESourceContract(source.replace("if (localStorage.getItem(currentKey) === null) {", '')), /null|overwrite/i);
  assert.throws(() => assertWeekTwoHeavenlyBossE2ESourceContract(source.replace('@boss-corrupt', '')), /boss-corrupt/i);
  assert.throws(() => assertWeekTwoHeavenlyBossE2ESourceContract(source.replace('@boss-external', '')), /boss-external/i);
  assert.throws(() => assertWeekTwoHeavenlyBossE2ESourceContract(source.replace('@boss-parent', '')), /boss-parent/i);
  assert.throws(() => assertWeekTwoHeavenlyBossE2ESourceContract(source.replace('@boss-lazy', '')), /boss-lazy/i);
  for (const phrase of ['usedHintTiers', 'hintsUsed: 1', 'stars: 2']) {
    assert.throws(() => assertWeekTwoHeavenlyBossE2ESourceContract(source.replace(phrase, '')), new RegExp(phrase));
  }
});
