const REQUIRED_TAGS = [
  '@w3-m1-full',
  '@w3-m1-keyboard',
  '@w3-m1-storage',
  '@w3-m1-corrupt',
  '@w3-m1-parent',
  '@w3-m1-cold',
  '@w3-m1-asset-fault',
  '@w3-m1-narrow',
  '@w3-m1-external',
  '@w3-m1-lazy',
];

const REQUIRED_PHRASES = [
  '火眼金睛·条件观察',
  '练习情境·不改变原著',
  'WEEK_THREE_MANOR_HELP_COLD_LOAD_MAX_BYTES',
  'attachHealth',
  'healthEvents',
  'page.addInitScript',
  'expectedFailureUrl !== null && (urlOrDetail === expectedFailureUrl || urlOrDetail.includes(expectedFailureUrl))',
  "https://static.blockly.com/media/sprites.svg",
  '/ABORTED|cancelled/i',
  'testInfo.outputPath',
  'page.screenshot({ path, fullPage: true })',
];

const MISSION_OR_SESSION_ROOT = String.raw`(?:(?:[A-Za-z_$][\w$]*\.)?(?:sessions|missions)|[A-Za-z_$][\w$]*\s*\[\s*['"](?:sessions|missions)['"]\s*\])`;
const W3_MISSION_OR_SESSION_ENTRY = String.raw`${MISSION_OR_SESSION_ROOT}\s*\[\s*['"]w3-m1['"]\s*\]`;
const FORBIDDEN_LEGACY_OR_INJECTED_SUCCESS = new RegExp([
  'expectedSequence|LegacyMissionBuilder|MissionTools',
  String.raw`(?:sessions|missions)\s*:\s*\{\s*['"]w3-m1['"]`,
  String.raw`${W3_MISSION_OR_SESSION_ENTRY}\s*(?:=|(?:\.\s*[A-Za-z_$][\w$]*|\[\s*['"][^'"]+['"]\s*\])\s*=)`,
  String.raw`${MISSION_OR_SESSION_ROOT}\s*=\s*\{\s*['"]w3-m1['"]`,
  String.raw`Object\.assign\(\s*${MISSION_OR_SESSION_ROOT}\s*,\s*\{\s*['"]w3-m1['"]`,
  String.raw`Object\.assign\(\s*${W3_MISSION_OR_SESSION_ENTRY}\s*,`,
].join('|'));

const FORBIDDEN_HEALTH_OR_HIDDEN_W3_SHORTCUT = new RegExp([
  String.raw`healthEvents\s*=\s*\[`,
  String.raw`healthEvents(?:\?\.)?\.filter\s*\(`,
  String.raw`healthEvents(?:\?\.)?\.length\s*=`,
  String.raw`healthEvents(?:\?\.)?\.(?:splice|clear)\s*\(`,
  String.raw`(?:page\.evaluate|page\.addInitScript)[\s\S]{0,900}(?:sessions|missions|missionCompletionEvidence)\s*(?:\[\s*['"]w3-m1['"]\s*\])?\s*=`,
  String.raw`(?:page\.evaluate|page\.addInitScript)[\s\S]{0,900}\[\s*['"]w3-m1['"]\s*\]\s*=`,
  String.raw`/503\|Failed/`,
  String.raw`hostname\s*===`,
  String.raw`response\.status\(\)\s*===\s*503`,
].join('|'));

export function assertWeekThreeManorHelpE2ESourceContract(source) {
  if (typeof source !== 'string') throw new Error('w3-m1 source contract: E2E source must be text.');
  for (const required of [...REQUIRED_TAGS, ...REQUIRED_PHRASES]) {
    if (!source.includes(required)) throw new Error(`w3-m1 source contract: missing ${required}.`);
  }
  if (FORBIDDEN_LEGACY_OR_INJECTED_SUCCESS.test(source)) {
    throw new Error('w3-m1 source contract: legacy or direct w3-m1 success injection is forbidden.');
  }
  if (!/test\.afterEach\(async \(\{ page \}\) => \{\s*expect\(healthEvents\.get\(page\), 'unexpected W3-M1 browser health events'\)\.toEqual\(\[\]\);\s*\}\)/.test(source)) {
    throw new Error('w3-m1 source contract: every browser test must assert raw empty healthEvents afterEach.');
  }
  if (FORBIDDEN_HEALTH_OR_HIDDEN_W3_SHORTCUT.test(source)) {
    throw new Error('w3-m1 source contract: filtered health checks or hidden W3 state writes are forbidden.');
  }
}
