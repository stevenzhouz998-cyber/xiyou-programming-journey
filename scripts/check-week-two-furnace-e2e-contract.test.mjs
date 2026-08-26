import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

async function loadContract() {
  const modulePath = './check-week-two-furnace-e2e-contract.mjs';
  return import(modulePath).catch(() => null);
}

test('fails closed when W2-M4 lacks browser-health, recovery, or real-condition coverage', async () => {
  const contract = await loadContract();
  assert.notEqual(contract, null);
  const good = `
    function attachHealth(page) { page.on('requestfailed', () => {}); page.on('response', response => response.status()) }
    test.afterEach(() => expect(healthEvents, 'health').toEqual([]))
    test('@furnace-full @furnace-keyboard @furnace-storage @furnace-asset-fault @furnace-cold', () => {})
    localStorage.setItem(currentKey, raw)
    WEEK_TWO_FURNACE_COLD_LOAD_MAX_BYTES 重试保存本次记录 重试加载场景图片 眼睛变红只说明烟很大 听见炉头声响并看见光明 elapsedDays
    fail-furnace-draft 下载本页备份 载入其他标签页版本
  `;
  assert.doesNotThrow(() => contract.assertWeekTwoFurnaceE2ESourceContract(good));
  assert.throws(() => contract.assertWeekTwoFurnaceE2ESourceContract(good.replace("page.on('requestfailed', () => {});", '')), /requestfailed/i);
  for (const phrase of ['fail-furnace-draft', '下载本页备份', '载入其他标签页版本']) {
    assert.throws(() => contract.assertWeekTwoFurnaceE2ESourceContract(good.replace(phrase, '')), new RegExp(phrase));
  }
  assert.throws(() => contract.assertWeekTwoFurnaceE2ESourceContract(`${good}\npage.evaluate(() => localStorage.setItem('x', JSON.stringify({ sessions: { 'w2-m4': {} } })))`), /inject/i);
});

test('accepts the W2-M4 sources and rejects a legacy W2-M4 fallback', async () => {
  const contract = await loadContract();
  assert.notEqual(contract, null);
  const e2e = readFileSync(new URL('../e2e/week-two-furnace-condition.spec.ts', import.meta.url), 'utf8');
  assert.doesNotThrow(() => contract.assertWeekTwoFurnaceE2ESourceContract(e2e));
  const sources = {
    course: readFileSync(new URL('../src/course/course.ts', import.meta.url), 'utf8'),
    formal: readFileSync(new URL('../src/course/formalCourse.ts', import.meta.url), 'utf8'),
    page: readFileSync(new URL('../src/components/MissionPageContent.tsx', import.meta.url), 'utf8'),
    neutral: readFileSync(new URL('../src/blockly/weekTwoFurnaceConditionContract.ts', import.meta.url), 'utf8'),
  };
  assert.doesNotThrow(() => contract.assertWeekTwoFurnaceProductionSourceContract(sources));
  assert.throws(() => contract.assertWeekTwoFurnaceProductionSourceContract({ ...sources, course: `${sources.course}\nmission('w2-m4', { expectedSequence: [] })` }), /expectedSequence|legacy/i);
});
