const requireText = (source, text, label = text) => {
  if (!source.includes(text)) throw new Error(`w2-m3 source contract: missing ${label}.`);
};

export function assertWeekTwoPeachElixirE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w2-m3 source contract: E2E source must be text.');
  requireText(source, 'function attachHealth', 'raw health collector');
  requireText(source, "page.on('requestfailed'", 'requestfailed capture');
  requireText(source, "page.on('response'", 'response capture');
  requireText(source, 'response.status()', 'HTTP status capture');
  if (!/test\.afterEach\([\s\S]{0,220}expect\(healthEvents[\s\S]{0,160}toEqual\(\[\]\)/.test(source)) throw new Error('w2-m3 source contract: health events must fail closed after every test.');
  if (/healthEvents\s*\.\s*filter\s*\(/.test(source)) throw new Error('w2-m3 source contract: health results must not be filtered before the final assertion.');
  for (const tag of ['@peach-full', '@peach-keyboard', '@peach-external', '@peach-corrupt', '@peach-parent', '@peach-storage', '@peach-cold', '@peach-asset-fault', '@peach-lazy']) requireText(source, tag);
  for (const phrase of ['WEEK_TWO_PEACH_ELIXIR_COLD_LOAD_MAX_BYTES', '重试保存本次记录', '重试保存通关', '载入其他标签页版本', '导出进度', '选择进度文件', '重新加载页面', '重试加载场景图片']) requireText(source, phrase);
  if (/sessions\s*:\s*\{\s*['"]w2-m3['"]|missions\s*:\s*\{\s*['"]w2-m3['"]|(?:sessions|missions)\s*\[['"]w2-m3['"]\]\s*=/.test(source)) {
    throw new Error('w2-m3 source contract: direct w2-m3 progress injection is forbidden.');
  }
}

export function assertWeekTwoPeachElixirProductionSourceContract({ course, formal, page, neutral }) {
  for (const [name, source] of Object.entries({ course, formal, page, neutral })) if (typeof source !== 'string') throw new Error(`w2-m3 source contract: ${name} source must be text.`);
  if (/mission\(\s*['"]w2-m3['"]/.test(course) || /w2-m3[\s\S]{0,280}expectedSequence/.test(course)) throw new Error('w2-m3 source contract: expectedSequence legacy registration is forbidden.');
  if (!/formalMission\(\s*['"]w2-m3['"]/.test(formal)) throw new Error('w2-m3 source contract: formal course registration is missing.');
  if (!/mission\.id\s*===\s*['"]w2-m3['"][\s\S]{0,700}WeekTwoPeachElixirRouteBoundary/.test(page)) throw new Error('w2-m3 source contract: dedicated lazy route is missing.');
  if (/legacySequence\s*\?\?\s*\[\]/.test(page)) throw new Error('w2-m3 source contract: legacy route fallback is forbidden.');
  if (/^\s*import\s/m.test(neutral) || /expectedSequence|LegacyMissionBuilder|MissionTools|\beval\s*\(|new\s+Function/.test(neutral)) throw new Error('w2-m3 source contract: neutral contract must stay zero-UI and free of legacy or dynamic execution.');
  requireText(neutral, 'export function compilePeachElixirDraft');
  requireText(neutral, 'export function runPeachElixir');
  requireText(neutral, 'sourceBlockId');
  requireText(neutral, 'previousBlockId');
  requireText(neutral, 'nextBlockId');
}
