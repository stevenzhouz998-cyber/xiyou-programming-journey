import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

async function loadContract() {
  const modulePath = './check-week-two-monkey-king-e2e-contract.mjs';
  return import(modulePath).catch(() => null);
}

test('fails closed on direct w2-m2 evidence injection and missing raw browser health capture', async () => {
  const contract = await loadContract();
  assert.notEqual(contract, null);
  const good = `
    function attachHealth(page) { page.on('requestfailed', () => {}); page.on('response', response => response.status()) }
    test.afterEach(() => expect(healthEvents, 'health').toEqual([]))
    test('@monkey-full @monkey-keyboard @monkey-external @monkey-corrupt @monkey-parent @monkey-storage @monkey-cold @monkey-asset-fault @monkey-lazy', () => {})
    localStorage.setItem(currentKey, raw)
    WEEK_TWO_MONKEY_KING_COLD_LOAD_MAX_BYTES 重试保存本次记录 重试保存通关 载入其他标签页版本 导出进度 选择进度文件 重新加载页面 重试加载场景图片
  `;
  assert.doesNotThrow(() => contract.assertWeekTwoMonkeyKingE2ESourceContract(good));
  assert.throws(() => contract.assertWeekTwoMonkeyKingE2ESourceContract(`${good}\npage.evaluate(() => localStorage.setItem('x', JSON.stringify({ sessions: { 'w2-m2': {} } })))`), /inject/i);
  assert.throws(() => contract.assertWeekTwoMonkeyKingE2ESourceContract(good.replace("page.on('requestfailed', () => {});", '')), /requestfailed/i);
});

test('accepts the real w2-m2 E2E source and rejects a production legacy fallback', async () => {
  const contract = await loadContract();
  assert.notEqual(contract, null);
  const e2e = readFileSync(new URL('../e2e/week-two-monkey-king-events.spec.ts', import.meta.url), 'utf8');
  assert.doesNotThrow(() => contract.assertWeekTwoMonkeyKingE2ESourceContract(e2e));
  const sources = {
    course: readFileSync(new URL('../src/course/course.ts', import.meta.url), 'utf8'),
    formal: readFileSync(new URL('../src/course/formalCourse.ts', import.meta.url), 'utf8'),
    page: readFileSync(new URL('../src/components/MissionPageContent.tsx', import.meta.url), 'utf8'),
    neutral: readFileSync(new URL('../src/blockly/weekTwoMonkeyKingContract.ts', import.meta.url), 'utf8'),
  };
  assert.doesNotThrow(() => contract.assertWeekTwoMonkeyKingProductionSourceContract(sources));
  assert.throws(() => contract.assertWeekTwoMonkeyKingProductionSourceContract({ ...sources, course: `${sources.course}\nmission('w2-m2', { expectedSequence: [] })` }), /expectedSequence|legacy/i);
});
