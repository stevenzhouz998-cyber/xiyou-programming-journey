import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

async function loadContract() {
  const modulePath = './check-week-two-peach-elixir-e2e-contract.mjs';
  return import(modulePath).catch(() => null);
}

test('fails closed on direct w2-m3 evidence injection and missing raw browser health capture', async () => {
  const contract = await loadContract();
  assert.notEqual(contract, null);
  const good = `
    function attachHealth(page) { page.on('requestfailed', () => {}); page.on('response', response => response.status()) }
    test.afterEach(() => expect(healthEvents, 'health').toEqual([]))
    test('@peach-full @peach-keyboard @peach-external @peach-corrupt @peach-parent @peach-storage @peach-cold @peach-asset-fault @peach-lazy', () => {})
    localStorage.setItem(currentKey, raw)
    WEEK_TWO_PEACH_ELIXIR_COLD_LOAD_MAX_BYTES 重试保存本次记录 重试保存通关 载入其他标签页版本 导出进度 选择进度文件 重新加载页面 重试加载场景图片
  `;
  assert.doesNotThrow(() => contract.assertWeekTwoPeachElixirE2ESourceContract(good));
  assert.throws(() => contract.assertWeekTwoPeachElixirE2ESourceContract(`${good}\npage.evaluate(() => localStorage.setItem('x', JSON.stringify({ sessions: { 'w2-m3': {} } })))`), /inject/i);
  assert.throws(() => contract.assertWeekTwoPeachElixirE2ESourceContract(good.replace("page.on('requestfailed', () => {});", '')), /requestfailed/i);
});

test('accepts the real w2-m3 E2E source and rejects a production legacy fallback', async () => {
  const contract = await loadContract();
  assert.notEqual(contract, null);
  const e2e = readFileSync(new URL('../e2e/week-two-peach-elixir-debug.spec.ts', import.meta.url), 'utf8');
  assert.doesNotThrow(() => contract.assertWeekTwoPeachElixirE2ESourceContract(e2e));
  const sources = {
    course: readFileSync(new URL('../src/course/course.ts', import.meta.url), 'utf8'),
    formal: readFileSync(new URL('../src/course/formalCourse.ts', import.meta.url), 'utf8'),
    page: readFileSync(new URL('../src/components/MissionPageContent.tsx', import.meta.url), 'utf8'),
    neutral: readFileSync(new URL('../src/blockly/weekTwoPeachElixirContract.ts', import.meta.url), 'utf8'),
  };
  assert.doesNotThrow(() => contract.assertWeekTwoPeachElixirProductionSourceContract(sources));
  assert.throws(() => contract.assertWeekTwoPeachElixirProductionSourceContract({ ...sources, course: `${sources.course}\nmission('w2-m3', { expectedSequence: [] })` }), /expectedSequence|legacy/i);
});
