const requireText = (source, text, label) => { if (!source.includes(text)) throw new Error(`w2-m5 source contract: missing ${label}.`); };
export function assertWeekTwoHeavenlyBossE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w2-m5 source contract: source must be text.');
  requireText(source, "test.afterEach(() => expect(healthEvents).toEqual([]))", 'raw health assertion');
  requireText(source, "page.on('requestfailed'", 'request failure capture');
  requireText(source, "page.on('response'", 'HTTP response capture');
  requireText(source, 'url: string', 'health-event URL');
  requireText(source, 'localStorage.getItem(currentKey) === null', 'null-guarded prerequisite');
  requireText(source, 'localStorage.setItem(currentKey, raw)', 'current prerequisite write');
  requireText(source, 'localStorage.setItem(revisionKey, \'0\')', 'revision prerequisite write');
  for (const tag of ['@boss-full', '@boss-keyboard', '@boss-storage', '@boss-asset-fault', '@boss-cold', '@boss-narrow', '@boss-corrupt', '@boss-external', '@boss-parent', '@boss-lazy']) requireText(source, tag, tag);
  for (const mode of ['fail-boss-draft', 'fail-boss-session', 'fail-boss-completion']) requireText(source, mode, mode);
  requireText(source, ".focus(); await page.keyboard.press('Enter')", 'keyboard helper activation');
  for (const phrase of ['增加天马循环次数', '交换齐天事件动作', '把金丹放到误入兜率宫之后', '听见炉头声响并看见光明', 'WEEK_TWO_HEAVENLY_BOSS_COLD_LOAD_MAX_BYTES', '重试保存本次记录', '重试加载场景图片', 'canon-epilogue', 'elapsedDays']) requireText(source, phrase, phrase);
  for (const phrase of ['usedHintTiers', 'hintsUsed: 1', 'stars: 2']) requireText(source, phrase, phrase);
  if (/expectedSequence|legacy-mission-tools|sessions\s*:\s*\{\s*['"]w2-m5['"]|missions\s*:\s*\{\s*['"]w2-m5['"]|(?:sessions|missions)\s*\[['"]w2-m5['"]\]\s*=/.test(source)) throw new Error('w2-m5 source contract: legacy or injected W2-M5 progress evidence is forbidden.');
  if (/healthEvents\s*\.\s*filter\s*\(/.test(source)) throw new Error('w2-m5 source contract: health evidence must not be filtered.');
}
