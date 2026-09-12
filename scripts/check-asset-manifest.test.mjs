import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as assetManifestModule from './check-asset-manifest.mjs';
import {
  collectAssetFiles,
  decodeWebpDimensions,
  measureAlphaEdgeMismatch,
  measureLowAlphaResidue,
  parseAssetManifest,
  readWebpDimensions,
  verifyRequiredAdvancedWeekOneInventory,
  verifyRequiredDragonPalaceInventory,
  verifyRequiredWeekTwoHorseInventory,
  verifyRequiredWeekTwoFurnaceInventory,
  verifyRequiredWeekTwoHeavenlyBossInventory,
  verifyRequiredWeekThreeManorHelpInventory,
  verifyRequiredWeekThreeCuilanBooleanInventory,
  verifyRequiredWeekThreeYunzhanDialogueInventory,
  verifyRequiredWeekThreeBajieJoiningInventory,
  verifyRequiredWeekThreeBossInventory,
  verifyRequiredWeekFourMappingInventory,
  verifyRequiredWeekFourVariableInventory,
  verifyRequiredWeekSixRecordsInventory,
  verifyRequiredWeekFiveTempleInventory,
  verifyRequiredWeekFiveWeatherInventory,
  verifyRequiredWeekFiveDecompositionInventory,
  WEEK_FOUR_VARIABLE_REQUIRED_ASSETS,
  WEEK_FOUR_VARIABLE_SCENE_SLOT,
  WEEK_FOUR_SHARED_BACKGROUND_SLOT,
  verifyAssetManifest,
} from './check-asset-manifest.mjs';

test('W5-M2 temple inventory binds one generated background to WeekFiveTempleScene', () => {
  const assetId = 'assets/week-five-temple/sanqing-courtyard-background.webp';
  const manifestRows = [row({ assetId, purpose: 'Sanqing courtyard', promptOrSourceReference: '[Prompt W5M2-001](#prompt-w5m2-001-sanqing-courtyard)', dimensions: '1536x1024', screenSlots: 'w5-m2 WeekFiveTempleScene' })];
  const publicFiles = [file({ path: assetId, width: 1536, height: 1024 })];
  const promptRecords = [promptRecord({ heading: 'Prompt W5M2-001 sanqing courtyard', anchor: '#prompt-w5m2-001-sanqing-courtyard', prompt: "Use case: illustration-story\nStyle/medium: polished bright 3D Chinese children's storybook game" })];
  const source = "import { assetUrl } from '../utils/assets'; export const View=()=> <img src={assetUrl('/assets/week-five-temple/sanqing-courtyard-background.webp')} />;";
  assert.equal(verifyRequiredWeekFiveTempleInventory({ manifestRows, publicFiles, promptRecords, source }).assetCount, 1);
});

test('W5-M3 weather inventory binds one generated background to WeekFiveWeatherScene', () => {
  const assetId = 'assets/week-five-weather/rain-altar-background.webp';
  const manifestRows = [row({ assetId, purpose: 'Chechi rain altar', promptOrSourceReference: '[Prompt W5M3-001](#prompt-w5m3-001-rain-altar-background)', dimensions: '1536x1024', screenSlots: 'w5-m3 WeekFiveWeatherScene' })];
  const publicFiles = [file({ path: assetId, width: 1536, height: 1024 })];
  const promptRecords = [promptRecord({ heading: 'Prompt W5M3-001 rain altar background', anchor: '#prompt-w5m3-001-rain-altar-background', prompt: 'Use case: illustration-story\nStyle/medium: bright-3d-storybook-chechi-rain-altar' })];
  const source = "import { assetUrl } from '../utils/assets'; export const View=()=> <img src={assetUrl('/assets/week-five-weather/rain-altar-background.webp')} />;";
  assert.equal(verifyRequiredWeekFiveWeatherInventory({ manifestRows, publicFiles, promptRecords, source }).assetCount, 1);
  assert.throws(() => verifyRequiredWeekFiveWeatherInventory({ manifestRows, publicFiles, promptRecords, source: `${source}<img />` }), /approved background/i);
});

test('W5-M4/M5 contest courtyard inventory binds one generated background to both approved scenes', () => {
  const assetId = 'assets/week-five-trials/contest-courtyard-background.webp';
  const manifestRows = [row({ assetId, purpose: 'Contest courtyard record book', promptOrSourceReference: '[Prompt W5M4-001](#prompt-w5m4-001-contest-courtyard)', dimensions: '1536x1024', screenSlots: 'w5-m4 WeekFiveDecompositionScene; w5-m5 WeekFiveStoryOrchestrationScene' })];
  const publicFiles = [file({ path: assetId, width: 1536, height: 1024 })];
  const promptRecords = [promptRecord({ heading: 'Prompt W5M4-001 contest courtyard', anchor: '#prompt-w5m4-001-contest-courtyard', prompt: "Use case: illustration-story\nStyle/medium: Bright premium 3D children's Chinese storybook style" })];
  const source = "import { assetUrl } from '../utils/assets'; export const View=()=> <img src={assetUrl('/assets/week-five-trials/contest-courtyard-background.webp')} />;";
  const storySource = source.replace('View', 'StoryView');
  assert.equal(verifyRequiredWeekFiveDecompositionInventory({ manifestRows, publicFiles, promptRecords, source, storySource }).assetCount, 1);
  assert.throws(() => verifyRequiredWeekFiveDecompositionInventory({ manifestRows, publicFiles, promptRecords, source: `${source}<img />`, storySource }), /approved background/i);
  assert.throws(() => verifyRequiredWeekFiveDecompositionInventory({ manifestRows, publicFiles, promptRecords, source, storySource: `${storySource}<img />` }), /approved background/i);
});

const sha = 'a'.repeat(64);
const artDirection = 'commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.';
const advancedArtDirection = "polished 3D children's storybook game";

function row(overrides = {}) {
  return {
    assetId: 'assets/dragon-palace/background.webp',
    sha256: sha,
    purpose: 'Dragon Palace trial hall',
    toolOrSource: 'OpenAI built-in image_gen',
    promptOrSourceReference: '[Prompt DP-001](#prompt-dp-001-background)',
    dimensions: '1600x900',
    licenseProvenance: 'generated in-project with built-in image_gen; provenance verified',
    screenSlots: 'w1-m1 battle scene background',
    qaStatus: 'provenance-verified',
    ...overrides,
  };
}

function file(overrides = {}) {
  return {
    path: 'assets/dragon-palace/background.webp',
    sha256: sha,
    bytes: 100_000,
    width: 1600,
    height: 900,
    ...overrides,
  };
}

function promptRecord(overrides = {}) {
  return {
    heading: 'Prompt DP-001 background',
    anchor: '#prompt-dp-001-background',
    prompt: `Use case: stylized-concept\nStyle/medium: ${artDirection}`,
    ...overrides,
  };
}

function scenario(overrides = {}) {
  return {
    manifestRows: [row()],
    publicFiles: [file()],
    promptRecords: [promptRecord()],
    ...overrides,
  };
}

function numberedScenario(count, bytes = 100_000) {
  const manifestRows = [];
  const publicFiles = [];
  const promptRecords = [];
  for (let index = 1; index <= count; index += 1) {
    const dp = String(index).padStart(3, '0');
    const name = `asset-${index}`;
    const path = `assets/dragon-palace/${name}.webp`;
    manifestRows.push(row({ assetId: path, promptOrSourceReference: `[Prompt DP-${dp}](#prompt-dp-${dp}-${name})`, dimensions: '640x640' }));
    publicFiles.push(file({ path, width: 640, height: 640, bytes }));
    promptRecords.push(promptRecord({ heading: `Prompt DP-${dp} ${name}`, anchor: `#prompt-dp-${dp}-${name}` }));
  }
  return { manifestRows, publicFiles, promptRecords };
}

const exactHeader = '| Asset ID | SHA-256 | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots | QA status |';
const exactDivider = '| --- | --- | --- | --- | --- | --- | --- | --- | --- |';

function webpChunk(type, payload) {
  const chunk = Buffer.alloc(8 + payload.length + (payload.length % 2));
  chunk.write(type, 0, 4, 'ascii');
  chunk.writeUInt32LE(payload.length, 4);
  payload.copy(chunk, 8);
  return chunk;
}

function webp(...chunks) {
  const body = Buffer.concat(chunks);
  const buffer = Buffer.alloc(12 + body.length);
  buffer.write('RIFF', 0, 4, 'ascii');
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WEBP', 8, 4, 'ascii');
  body.copy(buffer, 12);
  return buffer;
}

function vp8x(width, height) {
  const payload = Buffer.alloc(10);
  payload.writeUIntLE(width - 1, 4, 3);
  payload.writeUIntLE(height - 1, 7, 3);
  return webpChunk('VP8X', payload);
}

function vp8(width, height) {
  const payload = Buffer.alloc(10);
  payload.set([0x9d, 0x01, 0x2a], 3);
  payload.writeUInt16LE(width, 6);
  payload.writeUInt16LE(height, 8);
  return webpChunk('VP8 ', payload);
}

test('parses the exact nine-column table and immediately fenced prompt records', () => {
  const markdown = `
# Asset manifest

| Asset ID | SHA-256 | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots | QA status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| assets/dragon-palace/background.webp | ${sha} | Dragon Palace trial hall | OpenAI built-in image_gen | [Prompt DP-001](#prompt-dp-001-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w1-m1 battle scene background | provenance-verified |

## Prompt records

### Prompt DP-001 background

\`\`\`text
Use case: stylized-concept
Style/medium: ${artDirection}
\`\`\`

## Residual risks
`;
  assert.deepEqual(parseAssetManifest(markdown), {
    manifestRows: [row()],
    promptRecords: [promptRecord()],
  });
});

test('rejects a shipping table whose columns are not exact', () => {
  const markdown = `
| Asset ID | SHA-256 | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots |
| --- | --- | --- | --- | --- | --- | --- | --- |
`;
  assert.throws(() => parseAssetManifest(markdown), /exact nine-column/i);
});

test('rejects a second exact shipping asset table anywhere in the manifest', () => {
  const markdown = `
${exactHeader}
${exactDivider}
| assets/dragon-palace/background.webp | ${sha} | first | OpenAI built-in image_gen | [Prompt DP-001](#prompt-dp-001-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | scene | provenance-verified |

## A misleading second shipping table

${exactHeader}
${exactDivider}
| assets/dragon-palace/hidden.webp | ${sha} | hidden | OpenAI built-in image_gen | [Prompt DP-002](#prompt-dp-002-hidden) | 640x640 | generated in-project with built-in image_gen; provenance verified | scene | provenance-verified |
`;
  assert.throws(() => parseAssetManifest(markdown), /exactly one.*shipping asset table|duplicate.*shipping asset table/i);
});

test('requires a complete WebP pixel payload after a VP8X canvas', () => {
  assert.throws(() => readWebpDimensions(webp(vp8x(1600, 900))), /pixel payload|dimensions are missing/i);
  assert.deepEqual(readWebpDimensions(webp(vp8x(1600, 900), vp8(1600, 900))), { width: 1600, height: 900 });
  assert.throws(() => readWebpDimensions(webp(vp8x(1600, 900), vp8(800, 450))), /dimension.*mismatch/i);
});

test('rejects a structurally valid VP8 header that cannot be fully decoded', async () => {
  const headerOnlyFrame = webp(vp8x(32, 32), vp8(32, 32));
  assert.deepEqual(readWebpDimensions(headerOnlyFrame), { width: 32, height: 32 });
  await assert.rejects(() => decodeWebpDimensions(headerOnlyFrame), /decode|decodable|pixel/i);

  const tempRoot = await mkdtemp(join(tmpdir(), 'xiyou-webp-decode-'));
  try {
    await writeFile(join(tempRoot, 'invalid.webp'), headerOnlyFrame);
    await assert.rejects(() => collectAssetFiles(tempRoot), /invalid\.webp.*fully decode/i);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('fully decodes all eight shipping WebP files including the Four Seas regalia pair', async () => {
  const assetRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'dragon-palace');
  const expectedDimensions = new Map([
    ['background.webp', { width: 1600, height: 900 }],
    ['dragon-king.webp', { width: 640, height: 640 }],
    ['effects.webp', { width: 1024, height: 512 }],
    ['regalia.webp', { width: 1024, height: 512 }],
    ['sabre.webp', { width: 256, height: 384 }],
    ['weapons.webp', { width: 1024, height: 512 }],
    ['wukong.webp', { width: 640, height: 640 }],
    ['wukong-regalia.webp', { width: 640, height: 640 }],
  ]);
  for (const [name, expected] of expectedDimensions) {
    const bytes = await readFile(join(assetRoot, name));
    assert.deepEqual(await decodeWebpDimensions(bytes), expected, name);
  }
});

test('requires the exact two approved W2-M5 heavenly signal Boss assets', async () => {
  const source = "const BACKGROUND = '/assets/week-two-heavenly-boss/signal-dispatch-background.webp'; const STATES = '/assets/week-two-heavenly-boss/heavenly-boss-states.webp';";
  assert.doesNotThrow(() => verifyRequiredWeekTwoHeavenlyBossInventory({
    manifestRows: [
      { assetId: 'assets/week-two-heavenly-boss/signal-dispatch-background.webp', screenSlots: 'w2-m5 WeekTwoHeavenlySignalBossScene', qaStatus: 'visual-qa-passed' },
      { assetId: 'assets/week-two-heavenly-boss/heavenly-boss-states.webp', screenSlots: 'w2-m5 WeekTwoHeavenlySignalBossScene', qaStatus: 'visual-qa-passed' },
    ], publicFiles: [
      { path: 'assets/week-two-heavenly-boss/signal-dispatch-background.webp' }, { path: 'assets/week-two-heavenly-boss/heavenly-boss-states.webp' },
    ], promptRecords: [], source,
  }));
});

test('requires the exact two approved W3-M2 Cuilan assets, their source slots, and a clean alpha edge', () => {
  const source = "import { assetUrl } from '../utils/assets'; const background = '/assets/week-three-cuilan/cuilan-disguise-background.webp'; const states = '/assets/week-three-cuilan/cuilan-boolean-states.webp'; const source = (path) => assetUrl(path); <img src={source(background)} /><img src={source(states)} /><div data-state-cell=\"0\" />";
  const rows = [
    { assetId: 'assets/week-three-cuilan/cuilan-disguise-background.webp', screenSlots: 'w3-m2 WeekThreeCuilanBooleanScene', qaStatus: 'visual-qa-passed' },
    { assetId: 'assets/week-three-cuilan/cuilan-boolean-states.webp', screenSlots: 'w3-m2 WeekThreeCuilanBooleanScene', qaStatus: 'visual-qa-passed' },
  ];
  const files = [
    { path: 'assets/week-three-cuilan/cuilan-disguise-background.webp', bytes: 172450, width: 1672, height: 941, hasAlpha: false },
    { path: 'assets/week-three-cuilan/cuilan-boolean-states.webp', bytes: 350002, width: 2500, height: 700, hasAlpha: true, alphaEdgeMismatch: { inspectedPixels: 400, mismatchRatio: 0 } },
  ];
  assert.doesNotThrow(() => verifyRequiredWeekThreeCuilanBooleanInventory({ manifestRows: rows, publicFiles: files, promptRecords: [], source }));
  assert.throws(() => verifyRequiredWeekThreeCuilanBooleanInventory({ manifestRows: rows, publicFiles: [...files, { path: 'assets/week-three-cuilan/extra.webp' }], promptRecords: [], source }), /unexpected|exactly/i);
  assert.throws(() => verifyRequiredWeekThreeCuilanBooleanInventory({ manifestRows: rows, publicFiles: [{ ...files[0] }, { ...files[1], alphaEdgeMismatch: { inspectedPixels: 4, mismatchRatio: 0.05 } }], promptRecords: [], source }), /alpha-edge/i);
});

test('requires the exact two approved W3-M3 Yunzhan assets, visible assetUrl slots, and a clean alpha edge', () => {
  const source = "import { assetUrl } from '../utils/assets'; const assets = ['assets/week-three-yunzhan-dialogue/yunzhan-dialogue-background.webp', 'assets/week-three-yunzhan-dialogue/yunzhan-dialogue-states.webp']; <img src={assetUrl(assets[0])} /><img src={assetUrl(assets[1])} /><div data-state-cell=\"0\" />";
  const rows = [{ assetId: 'assets/week-three-yunzhan-dialogue/yunzhan-dialogue-background.webp', screenSlots: 'w3-m3 WeekThreeYunzhanDialogueScene', qaStatus: 'provenance-verified' }, { assetId: 'assets/week-three-yunzhan-dialogue/yunzhan-dialogue-states.webp', screenSlots: 'w3-m3 WeekThreeYunzhanDialogueScene', qaStatus: 'provenance-verified' }];
  const files = [{ path: rows[0].assetId, bytes: 162000, width: 1672, height: 941, hasAlpha: false }, { path: rows[1].assetId, bytes: 288000, width: 2048, height: 768, hasAlpha: true, alphaEdgeMismatch: { inspectedPixels: 400, mismatchRatio: 0 } }];
  assert.doesNotThrow(() => verifyRequiredWeekThreeYunzhanDialogueInventory({ manifestRows: rows, publicFiles: files, promptRecords: [], source }));
  assert.throws(() => verifyRequiredWeekThreeYunzhanDialogueInventory({ manifestRows: rows, publicFiles: [...files, { path: 'assets/week-three-yunzhan-dialogue/extra.webp' }], promptRecords: [], source }), /exactly|unexpected/i);
});

test('requires the exact W3-M4 Bajie-joining inventory, safe provenance, and two live assetUrl scene slots', () => {
  const background = 'assets/week-three-bajie-joining/bajie-joining-background.webp';
  const states = 'assets/week-three-bajie-joining/bajie-joining-states.webp';
  const source = `import { assetUrl } from '../utils/assets';
    const BACKGROUND = '${background}'; const STATES = '${states}';
    export function WeekThreeBajieJoiningScene() { const source = (path) => assetUrl(path); return <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>; }`;
  const promptSafety = 'polished bright 3D Chinese children\'s storybook game; no text; no pseudo-text; no binding; no ear pulling; no attack; no adult marriage; no humiliating pose.';
  const rows = [
    row({ assetId: background, purpose: 'Bright Gao family courtyard background for Bajie joining', promptOrSourceReference: '[Prompt W3M4-001](#prompt-w3m4-001-bajie-joining-background)', dimensions: '1672x941', screenSlots: 'w3-m4 WeekThreeBajieJoiningScene', qaStatus: 'visual-qa-passed' }),
    row({ assetId: states, purpose: 'Transparent Bajie joining story states', promptOrSourceReference: '[Prompt W3M4-002](#prompt-w3m4-002-bajie-joining-states)', dimensions: '2172x724', screenSlots: 'w3-m4 WeekThreeBajieJoiningScene', qaStatus: 'visual-qa-passed' }),
  ];
  const files = [
    file({ path: background, bytes: 172450, width: 1672, height: 941, hasAlpha: false }),
    file({ path: states, bytes: 350002, width: 2172, height: 724, hasAlpha: true, alphaZeroRgbPixels: 0, webpLossless: true, alphaEdgeMismatch: { inspectedPixels: 400, mismatchRatio: 0 }, lowAlphaResidue: { inspectedPixels: 400, orphanPixels: 0, longLineRuns: 0 } }),
  ];
  const promptRecords = [
    promptRecord({ heading: 'Prompt W3M4-001 bajie joining background', anchor: '#prompt-w3m4-001-bajie-joining-background', prompt: promptSafety }),
    promptRecord({ heading: 'Prompt W3M4-002 bajie joining states', anchor: '#prompt-w3m4-002-bajie-joining-states', prompt: promptSafety }),
  ];
  assert.doesNotThrow(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: files, promptRecords, source, mode: 'verify' }));
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: [...files, { path: 'assets/week-three-bajie-joining/extra.webp' }], promptRecords, source }), /exactly|unexpected/i);
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: [rows[0], { ...rows[1], screenSlots: 'w3-m4 WrongScene' }], publicFiles: files, promptRecords, source }), /screen slots/i);
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: files, promptRecords, source: `${source}\nconst hidden = 'assets/week-three-bajie-joining/extra.webp';` }), /exactly.*two|approved/i);
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows.map((item) => ({ ...item, sha256: '' })), publicFiles: files, promptRecords, source }), /SHA-256/i);
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows.map((item) => ({ ...item, dimensions: '' })), publicFiles: files, promptRecords, source }), /dimensions/i);
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows.map((item) => ({ ...item, qaStatus: 'generated' })), publicFiles: files, promptRecords, source }), /QA status/i);
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: files, promptRecords: promptRecords.slice(0, 1), source }), /prompt.*missing|unreferenced/i);
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: files, promptRecords: promptRecords.map((record) => ({ ...record, prompt: record.prompt.replace('no pseudo-text; ', '') })), source }), /pseudo-text/i);
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: [{ ...files[0], bytes: 512 * 1024 + 1 }, files[1]], promptRecords, source }), /512 KiB/i);
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: [files[0], { ...files[1], alphaEdgeMismatch: { inspectedPixels: 400, mismatchRatio: 0.041 } }], promptRecords, source }), /alpha-edge/i);
});

test('requires the exact two W3-M5 WebP assets, live assetUrl scene slots, and complete provenance', () => {
  const background = 'assets/week-three-boss/week-three-boss-background.webp';
  const states = 'assets/week-three-boss/week-three-boss-states.webp';
  const source = `import { assetUrl } from '../utils/assets';
    const BACKGROUND = '${background}'; const STATES = '${states}';
    export function WeekThreeBossScene() { const source = (path) => assetUrl(path); return <><img src={source(BACKGROUND)} /><span data-frame="0"><img src={source(STATES)} /></span></>; }`;
  const rows = [
    row({ assetId: background, purpose: 'Gao family story-state-machine background', promptOrSourceReference: '[Prompt W3M5-001](#prompt-w3m5-001-week-three-boss-background)', dimensions: '1280x720', screenSlots: 'w3-m5 WeekThreeBossScene', qaStatus: 'visual-qa-passed' }),
    row({ assetId: states, purpose: 'Transparent four-state Gao family story sprites', promptOrSourceReference: '[Prompt W3M5-002](#prompt-w3m5-002-week-three-boss-states)', dimensions: '1024x1024', screenSlots: 'w3-m5 WeekThreeBossScene', qaStatus: 'visual-qa-passed' }),
  ];
  const files = [
    file({ path: background, bytes: 93_974, width: 1280, height: 720 }),
    file({ path: states, bytes: 290_648, width: 1024, height: 1024, hasAlpha: true, alphaEdgeMismatch: { inspectedPixels: 400, mismatchRatio: 0 } }),
  ];
  const promptRecords = [
    promptRecord({ heading: 'Prompt W3M5-001 week-three-boss-background', anchor: '#prompt-w3m5-001-week-three-boss-background', prompt: "Style/medium: polished 3D Chinese children's storybook illustration" }),
    promptRecord({ heading: 'Prompt W3M5-002 week-three-boss-states', anchor: '#prompt-w3m5-002-week-three-boss-states', prompt: "Style/medium: polished bright 3D Chinese children's storybook illustration" }),
  ];
  assert.doesNotThrow(() => verifyRequiredWeekThreeBossInventory({ manifestRows: rows, publicFiles: files, promptRecords, source, mode: 'verify' }));
  assert.throws(() => verifyRequiredWeekThreeBossInventory({ manifestRows: rows, publicFiles: [...files, file({ path: 'assets/week-three-boss/extra.webp' })], promptRecords, source }), /exactly|unexpected/i);
  assert.throws(() => verifyRequiredWeekThreeBossInventory({ manifestRows: rows.map((item) => ({ ...item, screenSlots: 'wrong' })), publicFiles: files, promptRecords, source }), /screen slots/i);
  assert.throws(() => verifyRequiredWeekThreeBossInventory({ manifestRows: rows.map((item) => ({ ...item, qaStatus: 'generated' })), publicFiles: files, promptRecords, source, mode: 'verify' }), /visual-qa-passed/i);
  assert.throws(() => verifyRequiredWeekThreeBossInventory({ manifestRows: rows, publicFiles: [files[0], { ...files[1], bytes: 512 * 1024 + 1 }], promptRecords, source }), /512 KiB/i);
  assert.throws(() => verifyRequiredWeekThreeBossInventory({ manifestRows: rows, publicFiles: files, promptRecords, source: source.replace('assetUrl(path)', "'/not-live.webp'") }), /assetUrl|source/i);
});

test('requires the exact two W4-M1 assets, 1536x512 alpha state cells, and two live scene assetUrl slots', () => {
  const background = 'assets/week-four-mapping/white-tiger-ridge-background.webp';
  const states = 'assets/week-four-mapping/mapping-states.webp';
  const source = `import { assetUrl } from '../utils/assets';
    export function WeekFourMappingScene() { return <><img src={assetUrl('/${background}')} /><img src={assetUrl('/${states}')} /></>; }`;
  const rows = [
    row({ assetId: background, purpose: 'White Tiger Ridge entry background', promptOrSourceReference: '[Prompt W4M1-001](#prompt-w4m1-001-white-tiger-ridge-background)', dimensions: '1280x720', screenSlots: WEEK_FOUR_SHARED_BACKGROUND_SLOT, qaStatus: 'provenance-verified' }),
    row({ assetId: states, purpose: 'Transparent three-cell Blockly to Python mapping state sheet', promptOrSourceReference: '[Prompt W4M1-002](#prompt-w4m1-002-mapping-states)', dimensions: '1536x512', screenSlots: 'w4-m1 WeekFourMappingScene', qaStatus: 'provenance-verified' }),
  ];
  const files = [
    file({ path: background, bytes: 180_000, width: 1280, height: 720, hasAlpha: false }),
    file({ path: states, bytes: 200_000, width: 1536, height: 512, hasAlpha: true }),
  ];
  const prompts = [
    promptRecord({ heading: 'Prompt W4M1-001 white-tiger-ridge-background', anchor: '#prompt-w4m1-001-white-tiger-ridge-background', prompt: "Style/medium: polished bright 3D Chinese children's storybook game environment" }),
    promptRecord({ heading: 'Prompt W4M1-002 mapping-states', anchor: '#prompt-w4m1-002-mapping-states', prompt: "Style/medium: polished bright 3D Chinese children's storybook game props" }),
  ];
  assert.doesNotThrow(() => verifyRequiredWeekFourMappingInventory({ manifestRows: rows, publicFiles: files, promptRecords: prompts, source }));
  assert.throws(() => verifyRequiredWeekFourMappingInventory({ manifestRows: rows, publicFiles: [...files, file({ path: 'assets/week-four-mapping/extra.webp' })], promptRecords: prompts, source }), /exactly|unexpected/i);
  assert.throws(() => verifyRequiredWeekFourMappingInventory({ manifestRows: rows, publicFiles: [files[0], { ...files[1], width: 1535 }], promptRecords: prompts, source }), /1536x512|three equal/i);
  assert.throws(() => verifyRequiredWeekFourMappingInventory({ manifestRows: rows, publicFiles: [files[0], { ...files[1], hasAlpha: false }], promptRecords: prompts, source }), /alpha/i);
  assert.throws(() => verifyRequiredWeekFourMappingInventory({ manifestRows: rows, publicFiles: files, promptRecords: prompts, source: source.replace(`assetUrl('/${states}')`, "'/not-live.webp'") }), /assetUrl|scene/i);
  assert.throws(() => verifyRequiredWeekFourMappingInventory({ manifestRows: rows.map((item) => ({ ...item, screenSlots: 'wrong' })), publicFiles: files, promptRecords: prompts, source }), /screen slots/i);
  assert.throws(() => verifyRequiredWeekFourMappingInventory({ manifestRows: rows, publicFiles: [{ ...files[0], bytes: 512 * 1024 + 1 }, files[1]], promptRecords: prompts, source }), /512 KiB/i);
  assert.throws(() => verifyRequiredWeekFourMappingInventory({ manifestRows: rows, publicFiles: files, promptRecords: prompts, source, mode: 'verify' }), /visual-qa-passed/i);
});

test('rejects W3-M4 scene-slot bypasses that discard, shadow, or dead-code the imported assetUrl binding', () => {
  const background = 'assets/week-three-bajie-joining/bajie-joining-background.webp';
  const states = 'assets/week-three-bajie-joining/bajie-joining-states.webp';
  const prompt = 'polished bright 3D Chinese children\'s storybook game; no text; no pseudo-text; no binding; no ear pulling; no attack; no adult marriage; no humiliating pose.';
  const rows = [
    row({ assetId: background, purpose: 'Background', promptOrSourceReference: '[Prompt W3M4-001](#prompt-w3m4-001-bajie-joining-background)', dimensions: '1672x941', screenSlots: 'w3-m4 WeekThreeBajieJoiningScene', qaStatus: 'visual-qa-passed' }),
    row({ assetId: states, purpose: 'States', promptOrSourceReference: '[Prompt W3M4-002](#prompt-w3m4-002-bajie-joining-states)', dimensions: '2172x724', screenSlots: 'w3-m4 WeekThreeBajieJoiningScene', qaStatus: 'visual-qa-passed' }),
  ];
  const files = [file({ path: background, width: 1672, height: 941 }), file({ path: states, width: 2172, height: 724, hasAlpha: true, alphaZeroRgbPixels: 0, webpLossless: true, alphaEdgeMismatch: { inspectedPixels: 1, mismatchRatio: 0 }, lowAlphaResidue: { inspectedPixels: 1, orphanPixels: 0, longLineRuns: 0 } })];
  const promptRecords = [promptRecord({ heading: 'Prompt W3M4-001 bajie joining background', anchor: '#prompt-w3m4-001-bajie-joining-background', prompt }), promptRecord({ heading: 'Prompt W3M4-002 bajie joining states', anchor: '#prompt-w3m4-002-bajie-joining-states', prompt })];
  const scene = (sourceBody) => `import { assetUrl } from '../utils/assets'; const BACKGROUND = '${background}'; const STATES = '${states}'; export function WeekThreeBajieJoiningScene() { ${sourceBody} }`;
  const verify = (source) => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: files, promptRecords, source, mode: 'verify' });
  assert.throws(() => verify(scene("const source = (path) => { assetUrl(path); return '/not-approved.webp'; }; return <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>;")), /source.*assetUrl|assetUrl.*source/i);
  assert.throws(() => verify(scene("const assetUrl = (path) => '/not-approved.webp'; const source = (path) => assetUrl(path); return <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>;")), /imported.*assetUrl|assetUrl.*binding/i);
  assert.throws(() => verify(scene("const source = (path) => { if (false) return assetUrl(path); /* assetUrl(path) */ return '/not-approved.webp'; }; return <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>;")), /source.*assetUrl|assetUrl.*source/i);
  assert.throws(() => verify(scene("const source = (path) => assetUrl(path); { const source = (path) => '/not-approved.webp'; return <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>; }")), /same.*source|source.*binding/i);
  assert.throws(() => verify(scene("const source = (path) => assetUrl(path); const unused = () => <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>; return <section>无图片</section>;")), /exported.*return|return.*img|exactly two img/i);
  for (const conditionalImages of [
    "false ? <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></> : null",
    "false && <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>",
    "false || <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>",
    "null ?? <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>",
  ]) assert.throws(() => verify(scene(`const source = (path) => assetUrl(path); return <>{${conditionalImages}}</>;`)), /conditional|exactly two img/i);
  for (const nestedFunctionImages of [
    "() => <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>",
    "function () { return <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>; }",
  ]) assert.throws(() => verify(scene(`const source = (path) => assetUrl(path); return <>{${nestedFunctionImages}}</>;`)), /exactly two img/i);
  assert.throws(() => verify(`import { assetUrl } from '../utils/assets'; const BACKGROUND = '${background}'; const STATES = '${states}'; function OtherScene() { const source = (path) => assetUrl(path); return <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>; }`), /exactly one exported WeekThreeBajieJoiningScene/i);
  assert.throws(() => verify(`import { assetUrl } from '../utils/assets'; const BACKGROUND = '${background}'; const STATES = '${states}'; const source = (path) => assetUrl(path); export function WeekThreeBajieJoiningScene() { return <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>; } export function WeekThreeBajieJoiningScene() { return <section />; }`), /exactly one exported WeekThreeBajieJoiningScene/i);
});

test('records W3-M4 alpha-zero handling without treating it as image-safety proof and rejects low-alpha residue', () => {
  const rgba = new Uint8Array(10 * 10 * 4);
  rgba[(5 * 10 + 5) * 4 + 3] = 255;
  rgba[(5 * 10 + 4) * 4 + 3] = 8;
  assert.deepEqual(measureLowAlphaResidue(rgba, 10, 10), { inspectedPixels: 1, orphanPixels: 0, longLineRuns: 0 });
  rgba[3] = 8;
  assert.equal(measureLowAlphaResidue(rgba, 10, 10).orphanPixels, 1);

  const background = 'assets/week-three-bajie-joining/bajie-joining-background.webp';
  const states = 'assets/week-three-bajie-joining/bajie-joining-states.webp';
  const source = `import { assetUrl } from '../utils/assets'; const BACKGROUND = '${background}'; const STATES = '${states}'; export function WeekThreeBajieJoiningScene() { const source = (path) => assetUrl(path); return <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>; }`;
  const prompt = 'polished bright 3D Chinese children\'s storybook game; no text; no pseudo-text; no binding; no ear pulling; no attack; no adult marriage; no humiliating pose.';
  const rows = [row({ assetId: background, purpose: 'Background', promptOrSourceReference: '[Prompt W3M4-001](#prompt-w3m4-001-bajie-joining-background)', dimensions: '1672x941', screenSlots: 'w3-m4 WeekThreeBajieJoiningScene', qaStatus: 'visual-qa-passed' }), row({ assetId: states, purpose: 'States', promptOrSourceReference: '[Prompt W3M4-002](#prompt-w3m4-002-bajie-joining-states)', dimensions: '2172x724', screenSlots: 'w3-m4 WeekThreeBajieJoiningScene', qaStatus: 'visual-qa-passed' })];
  const files = [file({ path: background, width: 1672, height: 941 }), file({ path: states, width: 2172, height: 724, hasAlpha: true, alphaZeroRgbPixels: 0, webpLossless: true, alphaEdgeMismatch: { inspectedPixels: 1, mismatchRatio: 0 }, lowAlphaResidue: { inspectedPixels: 1, orphanPixels: 0, longLineRuns: 0 } })];
  const promptRecords = [promptRecord({ heading: 'Prompt W3M4-001 bajie joining background', anchor: '#prompt-w3m4-001-bajie-joining-background', prompt }), promptRecord({ heading: 'Prompt W3M4-002 bajie joining states', anchor: '#prompt-w3m4-002-bajie-joining-states', prompt })];
  assert.doesNotThrow(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: files, promptRecords, source, mode: 'verify' }));
  assert.doesNotThrow(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: [rows[0], { ...rows[1], dimensions: '1500x500' }], publicFiles: [files[0], { ...files[1], width: 1500, height: 500 }], promptRecords, source, mode: 'verify' }));
  assert.doesNotThrow(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: [files[0], { ...files[1], alphaZeroRgbPixels: 1 }], promptRecords, source }));
  assert.doesNotThrow(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: [files[0], { ...files[1], webpLossless: false, alphaZeroRgbPixels: 1 }], promptRecords, source }));
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: [files[0], { ...files[1], lowAlphaResidue: { inspectedPixels: 80, orphanPixels: 49, longLineRuns: 0 } }], promptRecords, source }), /low-alpha residue/i);
  assert.throws(() => verifyRequiredWeekThreeBajieJoiningInventory({ manifestRows: rows, publicFiles: [files[0], { ...files[1], lowAlphaResidue: { inspectedPixels: 24, orphanPixels: 24, longLineRuns: 1 } }], promptRecords, source }), /low-alpha residue/i);
});

test('traces every approved Dragon Palace raster to a real formal scene slot', async () => {
  const manifestPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'assets', 'asset-manifest.md');
  const parsed = parseAssetManifest(await readFile(manifestPath, 'utf8'));
  const dragonPalaceRows = parsed.manifestRows.filter((row) => row.assetId.startsWith('assets/dragon-palace/'));
  assert.equal(dragonPalaceRows.length, 8);
  for (const manifestRow of dragonPalaceRows) {
    assert.match(manifestRow.screenSlots, /\bw1-m[123]\b/, manifestRow.assetId);
    assert.equal(manifestRow.qaStatus, 'visual-qa-passed');
  }
  const sabre = parsed.manifestRows.find((row) => row.assetId === 'assets/dragon-palace/sabre.webp');
  assert.ok(sabre, 'standalone broad sabre manifest row');
  assert.match(sabre.purpose, /broad.*sabre|\u5927\u634d\u5200/i);
  assert.match(sabre.screenSlots, /w1-m2.*wrong-weapon/i);

  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public', 'assets', 'dragon-palace'));
  const sourceFiles = new Map([
    ['src/components/GameScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'GameScene.tsx'), 'utf8')],
    ['src/components/RuyiStaffScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'RuyiStaffScene.tsx'), 'utf8')],
    ['src/components/FourSeasRegaliaScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'FourSeasRegaliaScene.tsx'), 'utf8')],
  ]);
  assert.doesNotThrow(() => verifyRequiredDragonPalaceInventory({
    manifestRows: parsed.manifestRows,
    publicFiles,
    promptRecords: parsed.promptRecords,
    sourceFiles,
  }));

  for (const [assetId, prompt, dimensions, purpose, slots] of [
    ['assets/dragon-palace/regalia.webp', '[Prompt DP-007](#prompt-dp-007-regalia)', '1024x512', /crown.*armor.*boots/i, /w1-m3.*collected/i],
    ['assets/dragon-palace/wukong-regalia.webp', '[Prompt DP-008](#prompt-dp-008-wukong-regalia)', '640x640', /Wukong.*three.*regalia/i, /w1-m3.*equipped/i],
  ]) {
    const manifestRow = parsed.manifestRows.find((row) => row.assetId === assetId);
    const publicFile = publicFiles.find((file) => file.path === assetId);
    assert.ok(manifestRow, `${assetId} exact manifest row`);
    assert.ok(publicFile, `${assetId} public file`);
    assert.equal(manifestRow.toolOrSource, 'OpenAI built-in image_gen');
    assert.equal(manifestRow.licenseProvenance, 'generated in-project with built-in image_gen; provenance verified');
    assert.equal(manifestRow.promptOrSourceReference, prompt);
    assert.equal(manifestRow.dimensions, dimensions);
    assert.match(manifestRow.purpose, purpose);
    assert.match(manifestRow.screenSlots, slots);
    assert.equal(manifestRow.sha256, publicFile.sha256);
    assert.match(manifestRow.sha256, /^[a-f0-9]{64}$/);
  }
});

test('rejects comments, strings, unused values/functions, dead branches, wrong keys, and wrong arguments as formal preload slots', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const manifestPath = join(sourceRoot, 'docs', 'assets', 'asset-manifest.md');
  const parsed = parseAssetManifest(await readFile(manifestPath, 'utf8'));
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public', 'assets', 'dragon-palace'));
  const sourceFiles = new Map([
    ['src/components/GameScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'GameScene.tsx'), 'utf8')],
    ['src/components/RuyiStaffScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'RuyiStaffScene.tsx'), 'utf8')],
    ['src/components/FourSeasRegaliaScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'FourSeasRegaliaScene.tsx'), 'utf8')],
  ]);
  const exactLoad = "this.load.image('regalia', assetUrl('/assets/dragon-palace/regalia.webp'))";
  const fourSeasSource = sourceFiles.get('src/components/FourSeasRegaliaScene.tsx');
  assert.match(fourSeasSource, new RegExp(exactLoad.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const invalidStatements = new Map([
    ['comment-only', `// ${exactLoad}`],
    ['ordinary string', `const regaliaDescription = "${exactLoad}"`],
    ['unused assetUrl', "const unusedRegalia = assetUrl('/assets/dragon-palace/regalia.webp')"],
    ['uncalled loader function', `const loadRegaliaLater = () => ${exactLoad}`],
    ['dead conditional branch', `if (false) ${exactLoad}`],
    ['nested block', `{ ${exactLoad} }`],
    ['aliased loader', "const loadImage = this.load.image; loadImage('regalia', assetUrl('/assets/dragon-palace/regalia.webp'))"],
    ['computed loader', "this.load['image']('regalia', assetUrl('/assets/dragon-palace/regalia.webp'))"],
    ['wrong loader key', "this.load.image('wrongRegalia', assetUrl('/assets/dragon-palace/regalia.webp'))"],
    ['wrong loader argument', "this.load.image('regalia', '/assets/dragon-palace/regalia.webp')"],
  ]);

  for (const [name, invalidStatement] of invalidStatements) {
    const mutatedSources = new Map(sourceFiles);
    mutatedSources.set(
      'src/components/FourSeasRegaliaScene.tsx',
      fourSeasSource.replace(exactLoad, invalidStatement),
    );
    assert.throws(() => verifyRequiredDragonPalaceInventory({
      manifestRows: parsed.manifestRows,
      publicFiles,
      promptRecords: parsed.promptRecords,
      sourceFiles: mutatedSources,
    }), /preload|scene slot|loader|regalia/i, name);
  }
});

test('binds slots to one configured Phaser Scene and fails closed on duplicate or conflicting loads', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const manifestPath = join(sourceRoot, 'docs', 'assets', 'asset-manifest.md');
  const parsed = parseAssetManifest(await readFile(manifestPath, 'utf8'));
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public', 'assets', 'dragon-palace'));
  const sourceFiles = new Map([
    ['src/components/GameScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'GameScene.tsx'), 'utf8')],
    ['src/components/RuyiStaffScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'RuyiStaffScene.tsx'), 'utf8')],
    ['src/components/FourSeasRegaliaScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'FourSeasRegaliaScene.tsx'), 'utf8')],
  ]);
  const sourcePath = 'src/components/FourSeasRegaliaScene.tsx';
  const source = sourceFiles.get(sourcePath);
  const exactLoad = "this.load.image('regalia', assetUrl('/assets/dragon-palace/regalia.webp'))";
  const classStart = '    class Scene extends Phaser.Scene {';
  const gameStart = '    game = new Phaser.Game({';
  const sceneProperty = '      scene: Scene,';
  for (const needle of [exactLoad, classStart, gameStart, sceneProperty]) assert.match(source, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const variants = new Map([
    ['unselected DeadScene', source
      .replace(exactLoad, '')
      .replace(gameStart, `    if (false) {\n      class DeadScene extends Phaser.Scene {\n        preload() { ${exactLoad} }\n      }\n    }\n${gameStart}`)],
    ['same key conflicting path', source.replace(exactLoad, `${exactLoad}\n        this.load.image('regalia', assetUrl('/assets/dragon-palace/wrong.webp'))`)],
    ['duplicate correct load', source.replace(exactLoad, `${exactLoad}\n        ${exactLoad}`)],
    ['same path different key', source.replace(exactLoad, `${exactLoad}\n        this.load.image('regaliaCopy', assetUrl('/assets/dragon-palace/regalia.webp'))`)],
    ['multiple Phaser.Game configs', source.replace(gameStart, `    const duplicateGame = new Phaser.Game({ scene: Scene })\n${gameStart}`)],
    ['dynamic scene initializer', source.replace(sceneProperty, '      scene: chooseScene(),')],
    ['scene array initializer', source.replace(sceneProperty, '      scene: [Scene],')],
    ['multiple preload methods', source.replace(classStart, `${classStart}\n      preload() {}`)],
    ['multiple bindable Scene classes', source.replace(gameStart, `    class Scene extends Phaser.Scene { preload() {} }\n${gameStart}`)],
    ['no Phaser.Game config', source.replace('new Phaser.Game({', 'new Other.Game({')],
  ]);

  const acceptedInvalidVariants = [];
  for (const [name, mutatedSource] of variants) {
    const mutatedSources = new Map(sourceFiles);
    mutatedSources.set(sourcePath, mutatedSource);
    try {
      verifyRequiredDragonPalaceInventory({
        manifestRows: parsed.manifestRows,
        publicFiles,
        promptRecords: parsed.promptRecords,
        sourceFiles: mutatedSources,
      });
      acceptedInvalidVariants.push(name);
    } catch {
      // Expected: every invalid binding or mapping must fail closed.
    }
  }
  assert.deepEqual(acceptedInvalidVariants, []);

  const ruyiPath = 'src/components/RuyiStaffScene.tsx';
  const ruyiSource = sourceFiles.get(ruyiPath);
  const demandLoad = "scene.load.image('sabre', assetUrl('/assets/dragon-palace/sabre.webp'))";
  const demandBranch = "if (event.opcode === 'choose_sabre') {";
  const inspectBranch = "if (event.state === 'weights-inspected') {";
  for (const mutatedSource of [
    ruyiSource.replace(demandLoad, "scene.load.image('sabre', assetUrl('/assets/dragon-palace/weapons.webp'))"),
    ruyiSource.replace(demandBranch, "if (event.opcode === 'choose_halberd') {"),
    ruyiSource.replace(inspectBranch, "if (event.state === 'ruyi-staff-selected') {"),
    ruyiSource.replace(demandLoad, `${demandLoad}\n          scene.load.image('untracked', assetUrl('/assets/world-map.jpg'))`),
  ]) {
    assert.notEqual(mutatedSource, ruyiSource, 'the demand-load mutation must match the real shipping source');
    const mutatedSources = new Map(sourceFiles);
    mutatedSources.set(ruyiPath, mutatedSource);
    assert.throws(() => verifyRequiredDragonPalaceInventory({
      manifestRows: parsed.manifestRows,
      publicFiles,
      promptRecords: parsed.promptRecords,
      sourceFiles: mutatedSources,
    }), /demand|sabre|unapproved/i);
  }
});

test('binds the configured Scene identifier to its exact lexical TypeScript symbol', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const parsed = parseAssetManifest(await readFile(join(sourceRoot, 'docs', 'assets', 'asset-manifest.md'), 'utf8'));
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public', 'assets', 'dragon-palace'));
  const sourceFiles = new Map([
    ['src/components/GameScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'GameScene.tsx'), 'utf8')],
    ['src/components/RuyiStaffScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'RuyiStaffScene.tsx'), 'utf8')],
    ['src/components/FourSeasRegaliaScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'FourSeasRegaliaScene.tsx'), 'utf8')],
  ]);
  const sourcePath = 'src/components/FourSeasRegaliaScene.tsx';
  const source = sourceFiles.get(sourcePath);
  const classStart = '    class Scene extends Phaser.Scene {';
  const gameStart = '    game = new Phaser.Game({';
  for (const needle of [classStart, gameStart, '      scene: Scene,']) {
    assert.match(source, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  const approvedLoads = [
    "this.load.image('background', assetUrl('/assets/dragon-palace/background.webp'))",
    "this.load.image('wukong', assetUrl('/assets/dragon-palace/wukong.webp'))",
    "this.load.image('wukongRegalia', assetUrl('/assets/dragon-palace/wukong-regalia.webp'))",
    "this.load.image('dragonKing', assetUrl('/assets/dragon-palace/dragon-king.webp'))",
    "this.load.image('regalia', assetUrl('/assets/dragon-palace/regalia.webp'))",
    "this.load.image('effects', assetUrl('/assets/dragon-palace/effects.webp'))",
  ].join('\n          ');
  const deadBlockScene = `    if (false) {\n      class Scene extends Phaser.Scene {\n        preload() {\n          ${approvedLoads}\n        }\n      }\n    }\n`;
  const deadFunctionScene = `    function unusedSceneScope() {\n      class Scene extends Phaser.Scene {\n        preload() {\n          ${approvedLoads}\n        }\n      }\n      return Scene\n    }\n`;
  const variants = new Map([
    ['block shadow cannot validate configured class expression', source
      .replace(classStart, '    class ApprovedScene extends Phaser.Scene {')
      .replace(gameStart, `    const Scene = class extends Phaser.Scene {}\n${deadBlockScene}${gameStart}`)],
    ['block shadow cannot validate configured class alias', source
      .replace(classStart, '    class ApprovedScene extends Phaser.Scene {')
      .replace(gameStart, `    const Scene = ApprovedScene\n${deadBlockScene}${gameStart}`)],
    ['function shadow cannot validate configured class expression', source
      .replace(classStart, '    class ApprovedScene extends Phaser.Scene {')
      .replace(gameStart, `    const Scene = class extends Phaser.Scene {}\n${deadFunctionScene}${gameStart}`)],
  ]);

  const acceptedInvalidVariants = [];
  for (const [name, mutatedSource] of variants) {
    const mutatedSources = new Map(sourceFiles);
    mutatedSources.set(sourcePath, mutatedSource);
    try {
      verifyRequiredDragonPalaceInventory({
        manifestRows: parsed.manifestRows,
        publicFiles,
        promptRecords: parsed.promptRecords,
        sourceFiles: mutatedSources,
      });
      acceptedInvalidVariants.push(name);
    } catch {
      // Expected: only the exact lexical class declaration may own the approved preload.
    }
  }
  assert.deepEqual(acceptedInvalidVariants, []);

  const nestedSameNameSources = new Map(sourceFiles);
  nestedSameNameSources.set(sourcePath, source.replace(gameStart, `${deadBlockScene}${gameStart}`));
  assert.doesNotThrow(() => verifyRequiredDragonPalaceInventory({
    manifestRows: parsed.manifestRows,
    publicFiles,
    promptRecords: parsed.promptRecords,
    sourceFiles: nestedSameNameSources,
  }), 'a nested same-name class must not replace the configured outer Scene symbol');
});

test('requires exact loader imports and rejects every hidden or untracked image load', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const manifestPath = join(sourceRoot, 'docs', 'assets', 'asset-manifest.md');
  const parsed = parseAssetManifest(await readFile(manifestPath, 'utf8'));
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public', 'assets', 'dragon-palace'));
  const sourceFiles = new Map([
    ['src/components/GameScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'GameScene.tsx'), 'utf8')],
    ['src/components/RuyiStaffScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'RuyiStaffScene.tsx'), 'utf8')],
    ['src/components/FourSeasRegaliaScene.tsx', await readFile(join(sourceRoot, 'src', 'components', 'FourSeasRegaliaScene.tsx'), 'utf8')],
  ]);
  const sourcePath = 'src/components/FourSeasRegaliaScene.tsx';
  const source = sourceFiles.get(sourcePath);
  const exactLoad = "this.load.image('regalia', assetUrl('/assets/dragon-palace/regalia.webp'))";
  const assetImport = "import { assetUrl } from '../utils/assets'";
  for (const needle of [exactLoad, assetImport, "import * as Phaser from 'phaser'"]) assert.match(source, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const variants = new Map([
    ['extra ninth direct image', source.replace(exactLoad, `${exactLoad}\n        this.load.image('worldMap', assetUrl('/assets/world-map.jpg'))`)],
    ['computed same-key conflict', source.replace(exactLoad, `${exactLoad}\n        this.load['image']('regalia', assetUrl('/assets/dragon-palace/wrong.webp'))`)],
    ['runtime nested-if conflict', source.replace(exactLoad, `${exactLoad}\n        if (globalThis) { this.load.image('regalia', assetUrl('/assets/dragon-palace/wrong.webp')) }`)],
    ['local assetUrl replacement', source.replace(assetImport, "const assetUrl = () => '/assets/world-map.jpg'")],
    ['wrong assetUrl import source', source.replace(assetImport, "import { assetUrl } from '../utils/wrong-assets'")],
    ['aliased assetUrl import', source.replace(assetImport, "import { assetUrl as assetUrl } from '../utils/assets'")],
    ['extra loader argument', source.replace(exactLoad, "this.load.image('regalia', assetUrl('/assets/dragon-palace/regalia.webp'), 'extra')")],
    ['optional loader access', source.replace(exactLoad, "this.load?.image('regalia', assetUrl('/assets/dragon-palace/regalia.webp'))")],
    ['aliased image loader', source.replace(exactLoad, `${exactLoad}\n        const loadImageLater = this.load.image\n        loadImageLater('regalia', assetUrl('/assets/dragon-palace/wrong.webp'))`)],
    ['wrong Phaser import source', source.replace("import * as Phaser from 'phaser'", "import * as Phaser from 'fake-phaser'")],
  ]);

  const acceptedInvalidVariants = [];
  for (const [name, mutatedSource] of variants) {
    const mutatedSources = new Map(sourceFiles);
    mutatedSources.set(sourcePath, mutatedSource);
    try {
      verifyRequiredDragonPalaceInventory({
        manifestRows: parsed.manifestRows,
        publicFiles,
        promptRecords: parsed.promptRecords,
        sourceFiles: mutatedSources,
      });
      acceptedInvalidVariants.push(name);
    } catch {
      // Expected: imports and every selected preload image load are fail-closed.
    }
  }
  assert.deepEqual(acceptedInvalidVariants, []);
});

test('rejects a Dragon Palace inventory that drops an existing row or lacks the exact Four Seas scene slot', () => {
  const sourceFiles = new Map([
    ['src/components/GameScene.tsx', "assetUrl('/assets/dragon-palace/background.webp') assetUrl('/assets/dragon-palace/wukong.webp') assetUrl('/assets/dragon-palace/dragon-king.webp') assetUrl('/assets/dragon-palace/weapons.webp') assetUrl('/assets/dragon-palace/effects.webp')"],
    ['src/components/RuyiStaffScene.tsx', "assetUrl('/assets/dragon-palace/sabre.webp')"],
    ['src/components/FourSeasRegaliaScene.tsx', "assetUrl('/assets/dragon-palace/regalia.webp')"],
  ]);
  const data = numberedScenario(8);
  data.manifestRows = [
    row({ assetId: 'assets/dragon-palace/background.webp' }),
    ...['wukong', 'dragon-king', 'weapons', 'sabre', 'effects', 'regalia'].map((name, index) => row({
      assetId: `assets/dragon-palace/${name}.webp`,
      promptOrSourceReference: `[Prompt DP-${String(index + 2).padStart(3, '0')}](#prompt-dp-${String(index + 2).padStart(3, '0')}-${name})`,
    })),
  ];
  assert.throws(() => verifyRequiredDragonPalaceInventory({
    manifestRows: data.manifestRows,
    publicFiles: [],
    promptRecords: [],
    sourceFiles,
  }), /wukong-regalia|eight|required/i);
});

test('rejects truncated WebP chunks, RIFF size mismatches, and trailing junk', () => {
  const truncatedChunk = Buffer.alloc(12 + 8 + 3);
  truncatedChunk.write('RIFF', 0, 4, 'ascii');
  truncatedChunk.writeUInt32LE(truncatedChunk.length - 8, 4);
  truncatedChunk.write('WEBP', 8, 4, 'ascii');
  truncatedChunk.write('VP8 ', 12, 4, 'ascii');
  truncatedChunk.writeUInt32LE(10, 16);
  assert.throws(() => readWebpDimensions(truncatedChunk), /truncated.*chunk/i);

  const declaredSizeMismatch = webp(vp8(640, 640));
  declaredSizeMismatch.writeUInt32LE(declaredSizeMismatch.length - 9, 4);
  assert.throws(() => readWebpDimensions(declaredSizeMismatch), /RIFF.*size|declared.*size/i);

  const trailingJunk = Buffer.concat([webp(vp8(640, 640)), Buffer.from([0xde, 0xad])]);
  assert.throws(() => readWebpDimensions(trailingJunk), /RIFF.*size|trailing/i);
});

test('rejects asset symlinks that point outside the asset root or at a real repository image', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'xiyou-asset-gate-'));
  try {
    const assetRoot = join(tempRoot, 'assets');
    const externalAsset = join(tempRoot, 'external.webp');
    await mkdir(assetRoot);
    await writeFile(externalAsset, webp(vp8(32, 32)));
    await symlink(externalAsset, join(assetRoot, 'external-link.webp'));
    await assert.rejects(() => collectAssetFiles(assetRoot), /symbolic link|regular file/i);

    await rm(join(assetRoot, 'external-link.webp'));
    const repositoryImage = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'assets', 'dragon-palace', 'background.webp');
    await symlink(repositoryImage, join(assetRoot, 'repository-link.webp'));
    await assert.rejects(() => collectAssetFiles(assetRoot), /symbolic link|regular file/i);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('requires exact built-in tool and verified provenance declarations', () => {
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ toolOrSource: 'CSS art' })] })), /OpenAI built-in image_gen/);
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ licenseProvenance: 'trust me' })] })), /generated in-project.*provenance verified/i);
});

test('requires prompt records in the pure verifier', () => {
  assert.throws(() => verifyAssetManifest({ manifestRows: [row()], publicFiles: [file()] }), /prompt records.*required/i);
});

test('rejects a missing prompt anchor and non-exact markdown links', () => {
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ promptOrSourceReference: '[Prompt DP-001](#prompt-dp-001-missing)' })] })), /prompt anchor.*missing/i);
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ promptOrSourceReference: '#prompt-dp-001-background' })] })), /exact prompt markdown link/i);
});

test('rejects duplicate prompt headings, anchors, and DP numbers', () => {
  assert.throws(() => verifyAssetManifest(scenario({ promptRecords: [promptRecord(), promptRecord()] })), /duplicate prompt heading/i);
  assert.throws(() => verifyAssetManifest(scenario({ promptRecords: [promptRecord(), promptRecord({ heading: 'Prompt DP-002 alternate' })] })), /duplicate prompt anchor/i);
  assert.throws(() => verifyAssetManifest(scenario({ promptRecords: [promptRecord(), promptRecord({ heading: 'Prompt DP-001 alternate', anchor: '#prompt-dp-001-alternate' })] })), /duplicate prompt DP/i);
});

test('rejects two rows that reuse one prompt record', () => {
  const data = numberedScenario(2);
  data.manifestRows[1].promptOrSourceReference = data.manifestRows[0].promptOrSourceReference;
  assert.throws(() => verifyAssetManifest(data), /duplicate prompt reference/i);
});

test('rejects empty prompts and prompts missing the exact shared art direction', () => {
  assert.throws(() => verifyAssetManifest(scenario({ promptRecords: [promptRecord({ prompt: '' })] })), /prompt text.*non-empty/i);
  assert.throws(() => verifyAssetManifest(scenario({ promptRecords: [promptRecord({ prompt: 'A refined game illustration.' })] })), /shared art direction/i);
});

test('rejects DP labels that do not match their prompt heading', () => {
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ promptOrSourceReference: '[Prompt DP-002](#prompt-dp-001-background)' })] })), /DP label.*heading/i);
});

test('rejects prompt headings without an immediately following fenced text record', () => {
  const markdown = `
| Asset ID | SHA-256 | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots | QA status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| assets/dragon-palace/background.webp | ${sha} | Dragon Palace trial hall | OpenAI built-in image_gen | [Prompt DP-001](#prompt-dp-001-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w1-m1 battle scene background | provenance-verified |

### Prompt DP-001 background

No fence here.
`;
  assert.throws(() => parseAssetManifest(markdown), /fenced text prompt/i);
});

test('rejects missing and extra manifest rows', () => {
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [] })), /missing manifest row/i);
  assert.throws(() => verifyAssetManifest(scenario({ publicFiles: [] })), /extra manifest row/i);
});

test('rejects duplicate stable IDs and normalized path aliases', () => {
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row(), row()] })), /duplicate asset id/i);
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row(), row({ assetId: 'assets/dragon-palace/./background.webp' })] })), /unsafe|normalize|duplicate asset id/i);
});

test('rejects absolute paths and traversal in rows and files', () => {
  for (const assetId of ['/tmp/background.webp', '../background.webp', 'assets/dragon-palace/../../escape.webp', 'C:\\tmp\\background.webp']) {
    assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ assetId })], publicFiles: [file({ path: assetId })] })), /unsafe asset path/i);
  }
});

test('allows one manifest table to validate a bounded Week One advanced asset group', () => {
  const data = scenario({
    manifestRows: [row({
      assetId: 'assets/week-one-advanced/underworld-background.webp',
      promptOrSourceReference: '[Prompt AW1-001](#prompt-aw1-001-underworld-background)',
      dimensions: '1600x900',
      screenSlots: 'w1-m4 AdvancedWeekOneScene underworld background',
    })],
    publicFiles: [file({
      path: 'assets/week-one-advanced/underworld-background.webp',
      width: 1600,
      height: 900,
    })],
    promptRecords: [promptRecord({
      heading: 'Prompt AW1-001 underworld-background',
      anchor: '#prompt-aw1-001-underworld-background',
      prompt: `Use case: stylized-concept\nStyle/medium: ${advancedArtDirection}`,
    })],
  });
  assert.doesNotThrow(() => verifyAssetManifest(data));
});

test('requires the actual advanced Week One art direction without weakening Dragon Palace prompts', () => {
  const advanced = scenario({
    manifestRows: [row({
      assetId: 'assets/week-one-advanced/underworld-background.webp',
      promptOrSourceReference: '[Prompt AW1-001](#prompt-aw1-001-underworld-background)',
      dimensions: '1600x900',
    })],
    publicFiles: [file({ path: 'assets/week-one-advanced/underworld-background.webp', width: 1600, height: 900 })],
    promptRecords: [promptRecord({
      heading: 'Prompt AW1-001 underworld-background',
      anchor: '#prompt-aw1-001-underworld-background',
    })],
  });
  assert.throws(() => verifyAssetManifest(advanced), /shared art direction.*week-one-advanced/i);
  advanced.promptRecords[0].prompt = `Use case: stylized-concept\nStyle/medium: ${advancedArtDirection}`;
  assert.doesNotThrow(() => verifyAssetManifest(advanced));
  assert.throws(() => verifyAssetManifest(scenario({
    promptRecords: [promptRecord({ prompt: `Use case: stylized-concept\nStyle/medium: ${advancedArtDirection}` })],
  })), /shared art direction/i);
});

test('requires all four advanced Week One WebPs and the two live mission-bound image slots', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const publicFiles = await collectAssetFiles(
    join(sourceRoot, 'public', 'assets', 'week-one-advanced'),
    'assets/week-one-advanced',
  );
  const expected = [
    ['underworld-background.webp', '1600x900', 'w1-m4'],
    ['register-states.webp', '2048x1152', 'w1-m4'],
    ['boss-journey-background.webp', '1600x900', 'w1-m5'],
    ['boss-checkpoints.webp', '3072x1152', 'w1-m5'],
  ];
  assert.deepEqual(publicFiles.map((file) => file.path).sort(), expected.map(([name]) => `assets/week-one-advanced/${name}`).sort());
  const manifestRows = expected.map(([name, dimensions, missionId], index) => {
    const promptId = `AW1-${String(index + 1).padStart(3, '0')}`;
    const assetId = `assets/week-one-advanced/${name}`;
    return row({
      assetId,
      sha256: publicFiles.find((file) => file.path === assetId).sha256,
      dimensions,
      purpose: `Formal ${missionId} illustration ${name}`,
      promptOrSourceReference: `[Prompt ${promptId}](#prompt-${promptId.toLowerCase()}-${name.replace('.webp', '')})`,
      screenSlots: `${missionId} AdvancedWeekOneScene ${name}`,
      qaStatus: 'visual-qa-passed',
    });
  });
  const promptRecords = expected.map(([name], index) => {
    const promptId = `AW1-${String(index + 1).padStart(3, '0')}`;
    return promptRecord({
      heading: `Prompt ${promptId} ${name.replace('.webp', '')}`,
      anchor: `#prompt-${promptId.toLowerCase()}-${name.replace('.webp', '')}`,
      prompt: `Use case: stylized-concept\nStyle/medium: ${advancedArtDirection}`,
    });
  });
  const sourcePath = 'src/components/AdvancedWeekOneScene.tsx';
  const source = await readFile(join(sourceRoot, sourcePath), 'utf8');
  const data = { manifestRows, publicFiles, promptRecords, sourcePath, source };
  assert.doesNotThrow(() => verifyRequiredAdvancedWeekOneInventory(data));

  const invalidSources = new Map([
    ['commented binding', source.replace(/  const background = .*\n/, '// background only in a comment\n')],
    ['raw background bypasses base-path resolver', source.replace('src={assetUrl(background)}', 'src={background}')],
    ['unused background value', source.replace('src={assetUrl(background)}', "src={'/assets/week-one-advanced/underworld-background.webp'}")],
    ['dead duplicate literal', source.replace('  const name =', "  if (false) { const hidden = '/assets/week-one-advanced/underworld-background.webp' }\n  const name =")],
    ['dynamic image source', source.replace('src={assetUrl(states)}', 'src={resolveSprite(missionId)}')],
    ['extra image element', source.replace('    <img key={`background-${retry}`}', '    <img src={assetUrl(background)} alt="" />\n    <img key={`background-${retry}`}')],
  ]);
  for (const [name, mutatedSource] of invalidSources) {
    assert.notEqual(mutatedSource, source, `${name} mutation must match shipping source`);
    assert.throws(() => verifyRequiredAdvancedWeekOneInventory({ ...data, source: mutatedSource }), /AdvancedWeekOneScene|image|background|sprite|literal|src/i, name);
  }
  assert.throws(() => verifyRequiredAdvancedWeekOneInventory({
    ...data,
    manifestRows: manifestRows.map((manifestRow, index) => index === 0
      ? { ...manifestRow, screenSlots: 'w1-m5 unrelated component' }
      : manifestRow),
  }), /screen slot|w1-m4|AdvancedWeekOneScene/i);
  assert.throws(() => verifyRequiredAdvancedWeekOneInventory({ ...data, manifestRows: manifestRows.slice(1) }), /four|required|missing/i);
  assert.throws(() => verifyRequiredAdvancedWeekOneInventory({ ...data, publicFiles: [...publicFiles, { ...publicFiles[0], path: 'assets/week-one-advanced/extra.webp' }] }), /four|unexpected|missing manifest/i);
});

test('requires both formal w2-m1 rasters, prompt provenance, dimensions, hashes and live scene slots', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const parsed = parseAssetManifest(await readFile(join(sourceRoot, 'docs', 'assets', 'asset-manifest.md'), 'utf8'));
  const manifestRows = parsed.manifestRows.filter((row) => row.assetId.startsWith('assets/week-two-heaven/'));
  const promptRecords = parsed.promptRecords.filter((record) => record.heading.startsWith('Prompt W2H-'));
  const publicFiles = await collectAssetFiles(
    join(sourceRoot, 'public', 'assets', 'week-two-heaven'),
    'assets/week-two-heaven',
  );
  const source = await readFile(join(sourceRoot, 'src', 'components', 'WeekTwoHorseScene.tsx'), 'utf8');

  assert.deepEqual(manifestRows.map((row) => row.assetId).sort(), [
    'assets/week-two-heaven/horse-care-states.webp',
    'assets/week-two-heaven/stable-background.webp',
  ]);
  assert.equal(manifestRows.every((row) => row.screenSlots.includes('w2-m1 WeekTwoHorseScene')), true);
  assert.match(source, /\/assets\/week-two-heaven\/stable-background\.webp/);
  assert.match(source, /\/assets\/week-two-heaven\/horse-care-states\.webp/);
  assert.doesNotThrow(() => verifyRequiredWeekTwoHorseInventory({ manifestRows, publicFiles, promptRecords, source, mode: 'check' }));
});

test('requires both formal w2-m2 rasters, prompt provenance, dimensions, hashes and live scene slots', async () => {
  const verifierModule = await import('./check-asset-manifest.mjs');
  assert.equal(typeof verifierModule.verifyRequiredWeekTwoMonkeyKingInventory, 'function');
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const parsed = parseAssetManifest(await readFile(join(sourceRoot, 'docs', 'assets', 'asset-manifest.md'), 'utf8'));
  const manifestRows = parsed.manifestRows.filter((row) => row.assetId.startsWith('assets/week-two-great-sage/'));
  const promptRecords = parsed.promptRecords.filter((record) => record.heading.startsWith('Prompt W2M2-'));
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public', 'assets', 'week-two-great-sage'), 'assets/week-two-great-sage');
  const source = await readFile(join(sourceRoot, 'src', 'components', 'WeekTwoMonkeyKingScene.tsx'), 'utf8');

  assert.deepEqual(manifestRows.map((row) => row.assetId).sort(), [
    'assets/week-two-great-sage/flower-fruit-background.webp',
    'assets/week-two-great-sage/great-sage-event-states.webp',
  ]);
  assert.equal(manifestRows.every((row) => row.screenSlots.includes('w2-m2 WeekTwoMonkeyKingScene')), true);
  assert.doesNotThrow(() => verifierModule.verifyRequiredWeekTwoMonkeyKingInventory({ manifestRows, publicFiles, promptRecords, source, mode: 'check' }));
});

test('requires both formal w2-m3 rasters, prompt provenance, dimensions, hashes and live scene slots', async () => {
  const verifierModule = await import('./check-asset-manifest.mjs');
  assert.equal(typeof verifierModule.verifyRequiredWeekTwoPeachElixirInventory, 'function');
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const parsed = parseAssetManifest(await readFile(join(sourceRoot, 'docs', 'assets', 'asset-manifest.md'), 'utf8'));
  const manifestRows = parsed.manifestRows.filter((row) => row.assetId.startsWith('assets/week-two-peach-elixir/'));
  const promptRecords = parsed.promptRecords.filter((record) => record.heading.startsWith('Prompt W2M3-'));
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public', 'assets', 'week-two-peach-elixir'), 'assets/week-two-peach-elixir');
  const source = await readFile(join(sourceRoot, 'src', 'components', 'WeekTwoPeachElixirScene.tsx'), 'utf8');

  assert.deepEqual(manifestRows.map((row) => row.assetId).sort(), [
    'assets/week-two-peach-elixir/heavenly-route-background.webp',
    'assets/week-two-peach-elixir/peach-elixir-states.webp',
  ]);
  assert.equal(manifestRows.every((row) => row.screenSlots.includes('w2-m3 WeekTwoPeachElixirScene')), true);
  assert.doesNotThrow(() => verifierModule.verifyRequiredWeekTwoPeachElixirInventory({ manifestRows, publicFiles, promptRecords, source, mode: 'check' }));
});

test('requires both formal w2-m4 furnace rasters, prompt provenance, and exactly two live scene slots', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const parsed = parseAssetManifest(await readFile(join(sourceRoot, 'docs', 'assets', 'asset-manifest.md'), 'utf8'));
  const manifestRows = parsed.manifestRows.filter((row) => row.assetId.startsWith('assets/week-two-furnace/'));
  const promptRecords = parsed.promptRecords.filter((record) => record.heading.startsWith('Prompt W2M4-'));
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public', 'assets', 'week-two-furnace'), 'assets/week-two-furnace');
  const source = await readFile(join(sourceRoot, 'src', 'components', 'WeekTwoFurnaceConditionScene.tsx'), 'utf8');
  assert.deepEqual(manifestRows.map((row) => row.assetId).sort(), ['assets/week-two-furnace/furnace-condition-states.webp', 'assets/week-two-furnace/furnace-interior-background.webp']);
  assert.doesNotThrow(() => verifyRequiredWeekTwoFurnaceInventory({ manifestRows, publicFiles, promptRecords, source, mode: 'check' }));
});

test('requires both formal w3-m1 manor-help rasters, prompt provenance, and exactly two live scene slots', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const parsed = parseAssetManifest(await readFile(join(sourceRoot, 'docs', 'assets', 'asset-manifest.md'), 'utf8'));
  const manifestRows = parsed.manifestRows.filter((item) => item.assetId.startsWith('assets/week-three-manor-help/'));
  const promptRecords = parsed.promptRecords.filter((record) => record.heading.startsWith('Prompt W3M1-'));
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public', 'assets', 'week-three-manor-help'), 'assets/week-three-manor-help');
  const source = await readFile(join(sourceRoot, 'src', 'components', 'WeekThreeManorHelpScene.tsx'), 'utf8');
  assert.deepEqual(manifestRows.map((item) => item.assetId).sort(), [
    'assets/week-three-manor-help/manor-help-background.webp',
    'assets/week-three-manor-help/manor-message-states.webp',
  ]);
  assert.equal(manifestRows.every((item) => item.screenSlots === 'w3-m1 WeekThreeManorHelpScene'), true);
  assert.doesNotThrow(() => verifyRequiredWeekThreeManorHelpInventory({ manifestRows, publicFiles, promptRecords, source, mode: 'check' }));
});

test('rejects missing, extra, wrong-slot, and hidden-literal W3-M1 assets', () => {
  const paths = [
    'assets/week-three-manor-help/manor-help-background.webp',
    'assets/week-three-manor-help/manor-message-states.webp',
  ];
  const rows = paths.map((assetId, index) => row({
    assetId,
    promptOrSourceReference: `[Prompt W3M1-00${index + 1}](#prompt-w3m1-00${index + 1}-${index === 0 ? 'manor-help-background' : 'manor-message-states'})`,
    dimensions: '1672x941',
    screenSlots: 'w3-m1 WeekThreeManorHelpScene',
  }));
  const records = paths.map((assetId, index) => promptRecord({
    heading: `Prompt W3M1-00${index + 1} ${index === 0 ? 'manor help background' : 'manor message states'}`,
    anchor: `#prompt-w3m1-00${index + 1}-${index === 0 ? 'manor-help-background' : 'manor-message-states'}`,
    prompt: `Style/medium: ${advancedArtDirection}`,
  }));
  const files = paths.map((path) => file({ path, width: 1672, height: 941, hasAlpha: path.endsWith('states.webp'), ...(path.endsWith('states.webp') ? { alphaEdgeMismatch: { inspectedPixels: 1, mismatchedPixels: 0, mismatchRatio: 0 } } : {}) }));
  const source = `import { assetUrl } from '../utils/assets';\nconst BACKGROUND = '/assets/week-three-manor-help/manor-help-background.webp';\nconst STATES = '/assets/week-three-manor-help/manor-message-states.webp';\nconst source = (path) => assetUrl(path);\nexport function WeekThreeManorHelpScene() { return <><img src={source(BACKGROUND)} /><img src={source(STATES)} /></>; }`;
  assert.doesNotThrow(() => verifyRequiredWeekThreeManorHelpInventory({ manifestRows: rows, publicFiles: files, promptRecords: records, source }));
  assert.throws(() => verifyRequiredWeekThreeManorHelpInventory({ manifestRows: rows.slice(0, 1), publicFiles: files.slice(0, 1), promptRecords: records.slice(0, 1), source }), /required|exactly/i);
  assert.throws(() => verifyRequiredWeekThreeManorHelpInventory({ manifestRows: [...rows, row({ assetId: 'assets/week-three-manor-help/extra.webp' })], publicFiles: [...files, file({ path: 'assets/week-three-manor-help/extra.webp' })], promptRecords: records, source }), /exactly|unexpected/i);
  assert.throws(() => verifyRequiredWeekThreeManorHelpInventory({ manifestRows: [rows[0], { ...rows[1], screenSlots: 'wrong' }], publicFiles: files, promptRecords: records, source }), /screen slots/i);
  const contaminatedFiles = files.map((item) => item.path.endsWith('states.webp') ? { ...item, alphaEdgeMismatch: { inspectedPixels: 100, mismatchedPixels: 5, mismatchRatio: 0.05 } } : item);
  assert.throws(() => verifyRequiredWeekThreeManorHelpInventory({ manifestRows: rows, publicFiles: contaminatedFiles, promptRecords: records, source }), /alpha-edge contamination/i);
  assert.throws(() => verifyRequiredWeekThreeManorHelpInventory({ manifestRows: rows, publicFiles: files, promptRecords: records, source: `${source}\nconst extra = '/assets/week-three-manor-help/extra.webp';` }), /exactly.*two/i);
  assert.throws(() => verifyRequiredWeekThreeManorHelpInventory({ manifestRows: rows, publicFiles: files, promptRecords: records, source: source.replace('source(STATES)', 'assetUrl(STATES)') }), /src bindings|assetUrl/i);
});

test('measures transparent-edge contamination without mutating alpha', () => {
  const clean = new Uint8Array([
    210, 90, 40, 255,
    210, 90, 40, 128,
    0, 0, 0, 0,
  ]);
  const contaminated = new Uint8Array(clean);
  contaminated.set([40, 190, 230, 128], 4);
  assert.deepEqual(measureAlphaEdgeMismatch(clean, 3, 1), { inspectedPixels: 1, mismatchedPixels: 0, mismatchRatio: 0 });
  assert.deepEqual(measureAlphaEdgeMismatch(contaminated, 3, 1), { inspectedPixels: 1, mismatchedPixels: 1, mismatchRatio: 1 });
});

test('rejects missing, malformed, and mismatched SHA-256 hashes', () => {
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ sha256: '' })] })), /missing sha-256/i);
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ sha256: 'abc' })] })), /invalid sha-256/i);
  assert.throws(() => verifyAssetManifest(scenario({ publicFiles: [file({ sha256: 'b'.repeat(64) })] })), /hash mismatch/i);
});

test('rejects unsupported finished image formats', () => {
  for (const extension of ['png', 'jpg', 'jpeg', 'svg', 'avif', 'gif']) {
    const path = `assets/dragon-palace/background.${extension}`;
    assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ assetId: path })], publicFiles: [file({ path })] })), /unsupported shipping format/i);
  }
});

test('rejects a raster over 512 KiB', () => {
  assert.throws(() => verifyAssetManifest(scenario({ publicFiles: [file({ bytes: 512 * 1024 + 1 })] })), /512 KiB/i);
});

test('rejects Dragon Palace mission media over 1.25 MiB', () => {
  assert.throws(() => verifyAssetManifest(numberedScenario(3, 450 * 1024)), /1\.25 MiB/i);
});

test('requires exactly the two W4-M2 variable-evidence assets and the shared White Tiger Ridge scene slot', () => {
  const required = [
    'assets/week-four-variables/woman-with-offering.webp',
    'assets/week-four-variables/variable-record-states.webp',
  ];
  assert.deepEqual(WEEK_FOUR_VARIABLE_REQUIRED_ASSETS, required);
  assert.equal(WEEK_FOUR_VARIABLE_SCENE_SLOT, 'w4-m2 WeekFourVariableEvidenceScene');
  assert.equal(WEEK_FOUR_SHARED_BACKGROUND_SLOT, 'w4-m1 WeekFourMappingScene; w4-m2 WeekFourVariableEvidenceScene; w4-m3 WeekFourBranchScene; w4-m4 WeekFourListScene; w4-m5 WeekFourBossScene');
  assert.equal(typeof verifyRequiredWeekFourVariableInventory, 'function');
});

test('reserves the exact two W4-M3 branch assets and extends the shared White Tiger Ridge scene slot', () => {
  const required = [
    'assets/week-four-branches/old-woman-visitor.webp',
    'assets/week-four-branches/branch-route-states.webp',
  ];
  assert.deepEqual(assetManifestModule.WEEK_FOUR_BRANCH_REQUIRED_ASSETS, required);
  assert.equal(assetManifestModule.WEEK_FOUR_BRANCH_SCENE_SLOT, 'w4-m3 WeekFourBranchScene');
  assert.equal(typeof assetManifestModule.verifyRequiredWeekFourBranchInventory, 'function');
  assert.equal(WEEK_FOUR_SHARED_BACKGROUND_SLOT, 'w4-m1 WeekFourMappingScene; w4-m2 WeekFourVariableEvidenceScene; w4-m3 WeekFourBranchScene; w4-m4 WeekFourListScene; w4-m5 WeekFourBossScene');
  const verify = assetManifestModule.verifyRequiredWeekFourBranchInventory;
  if (typeof verify !== 'function') return;
  const promptRows = [
    { id: 'W4M3-001', heading: 'Prompt W4M3-001 old-woman-visitor', anchor: '#prompt-w4m3-001-old-woman-visitor' },
    { id: 'W4M3-002', heading: 'Prompt W4M3-002 branch-route-states', anchor: '#prompt-w4m3-002-branch-route-states' },
  ];
  const rows = required.map((assetId, index) => row({
    assetId,
    promptOrSourceReference: `[Prompt ${promptRows[index].id}](${promptRows[index].anchor})`,
    dimensions: index === 0 ? '1024x1024' : '1536x512',
    screenSlots: 'w4-m3 WeekFourBranchScene',
  }));
  const cleanVisitorMetrics = {
    transparentPixelCount: 866_152,
    partialAlphaPixelCount: 0,
    opaquePixelCount: 182_424,
    alphaEdgeMismatch: { inspectedPixels: 0, mismatchedPixels: 0, mismatchRatio: 0 },
    lowAlphaResidue: { inspectedPixels: 0, orphanPixels: 0, longLineRuns: 0 },
    visibleAlphaBounds: { minX: 357, minY: 76, maxX: 673, maxY: 945, visiblePixelCount: 182_424, padding: { left: 357, top: 76, right: 350, bottom: 78 } },
    outerBorderNonTransparentPixelCount: 0,
    webpLossless: true,
  };
  const cleanStateMetrics = {
    transparentPixelCount: 263_693,
    partialAlphaPixelCount: 521_517,
    opaquePixelCount: 1_222,
    alphaEdgeMismatch: { inspectedPixels: 16_144, mismatchedPixels: 897, mismatchRatio: 0.0556 },
    lowAlphaResidue: { inspectedPixels: 12_589, orphanPixels: 5_076, longLineRuns: 17 },
    visibleAlphaBounds: { minX: 24, minY: 15, maxX: 1513, maxY: 494, visiblePixelCount: 460_000, padding: { left: 24, top: 15, right: 22, bottom: 17 } },
    outerBorderNonTransparentPixelCount: 0,
    cellVisiblePixelCounts: [174_392, 174_208, 174_139],
    separatorNonTransparentPixelCounts: [0, 0, 0, 0],
  };
  const files = [
    file({ path: required[0], width: 1024, height: 1024, hasAlpha: true, bytes: 512 * 1024, ...cleanVisitorMetrics }),
    file({ path: required[1], width: 1536, height: 512, hasAlpha: true, bytes: 512 * 1024, ...cleanStateMetrics }),
  ];
  const safety = 'Constraints: transparent RGBA; no text, logo, watermark, weapon, attack, injury, corpse, skeleton, or horror.';
  const records = [
    promptRecord({ ...promptRows[0], prompt: `Use case: illustration-story\nStyle/medium: polished bright 3D Chinese children's storybook game character.\n${safety}\nProcessing: accepted OpenAI built-in image_gen result exec-11271c73-0f39-4c9c-8767-89297ceb3d2f.png (1254x1254 RGBA). Sharp 0.35.3 aligned alpha-edge RGB to the nearest opaque neighbour within 2px, resized to 880x880, repeated alpha cleanup, made alpha greater than or equal to 96 binary, removed 8-neighbor islands smaller than 16 pixels, added 72px transparent padding, and encoded a lossless WebP. Opaque artwork is unchanged, with no crop, no art redraw, and no chroma key.` }),
    promptRecord({ ...promptRows[1], prompt: `Use case: illustration-story\nStyle/medium: polished bright 3D Chinese children's storybook game props.\nComposition: exact 3:1 transparent sprite.\n${safety}\nProcessing: accepted OpenAI built-in image_gen result exec-3db5b776-fe8f-468b-a6fe-18639f813614.png (2172x724 RGBA, exact 3:1). Sharp 0.35.3 proportionally resized alpha to 1536x512, preserving alpha without crop, redraw, compositing, or chroma key.` }),
  ];
  const source = `import { assetUrl } from '../utils/assets';
export function WeekFourBranchScene() {
  const backgroundUrl = \`${'${'}assetUrl('assets/week-four-mapping/white-tiger-ridge-background.webp')}?retry=0\`;
  const visitorUrl = \`${'${'}assetUrl('${required[0]}')}?retry=0\`;
  const statesUrl = \`${'${'}assetUrl('${required[1]}')}?retry=0\`;
  return <><img src={backgroundUrl} /><img src={visitorUrl} /><div style={{ backgroundImage: \`url("${'${'}statesUrl}")\` }}><img src={statesUrl} hidden /></div></>;
}`;
  const scenario = { manifestRows: rows, publicFiles: files, promptRecords: records, source, sharedBackgroundBytes: 128 * 1024, sharedBackgroundScreenSlots: 'w4-m1 WeekFourMappingScene; w4-m2 WeekFourVariableEvidenceScene; w4-m3 WeekFourBranchScene; w4-m4 WeekFourListScene; w4-m5 WeekFourBossScene' };
  assert.doesNotThrow(() => verify(scenario));
  assert.throws(() => verify({ ...scenario, manifestRows: rows.slice(0, 1), publicFiles: files.slice(0, 1) }), /exactly|required/i);
  assert.throws(() => verify({ ...scenario, manifestRows: [...rows, row({ assetId: 'assets/week-four-branches/extra.webp', screenSlots: 'w4-m3 WeekFourBranchScene' })] }), /exactly|required/i);
  assert.throws(() => verify({ ...scenario, manifestRows: [{ ...rows[0], screenSlots: 'wrong slot' }, rows[1]] }), /screen slots/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [{ ...files[0], width: 1023 }, files[1]] }), /1024x1024/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [files[0], { ...files[1], width: 1535 }] }), /1536x512/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [{ ...files[0], hasAlpha: false }, files[1]] }), /alpha/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [{ ...files[0], transparentPixelCount: 0 }, files[1]] }), /transparent pixels/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [{ ...files[0], transparentPixelCount: 1 }, files[1]] }), /substantial real transparency/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [{ ...files[0], partialAlphaPixelCount: 1, alphaEdgeMismatch: { inspectedPixels: 100, mismatchedPixels: 5, mismatchRatio: 0.05 } }, files[1]] }), /alpha-edge mismatch/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [{ ...files[0], visibleAlphaBounds: { ...files[0].visibleAlphaBounds, padding: { ...files[0].visibleAlphaBounds.padding, top: 47 } } }, files[1]] }), /48px transparent padding/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [{ ...files[0], lowAlphaResidue: { inspectedPixels: 1, orphanPixels: 1, longLineRuns: 0 } }, files[1]] }), /zero low-alpha orphan/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [{ ...files[0], lowAlphaResidue: { inspectedPixels: 24, orphanPixels: 24, longLineRuns: 1 } }, files[1]] }), /zero low-alpha orphan/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [{ ...files[0], webpLossless: false }, files[1]] }), /lossless WebP/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [files[0], { ...files[1], transparentPixelCount: 1 }] }), /substantial real transparency/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [files[0], { ...files[1], alphaEdgeMismatch: { inspectedPixels: 1000, mismatchedPixels: 81, mismatchRatio: 0.081 } }] }), /8% glow allowance/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [files[0], { ...files[1], outerBorderNonTransparentPixelCount: 1 }] }), /outer border/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [files[0], { ...files[1], cellVisiblePixelCounts: [174_392, 0, 174_139] }] }), /all three cells/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [files[0], { ...files[1], separatorNonTransparentPixelCounts: [0, 1, 0, 0] }] }), /no cross-cell artwork/i);
  assert.throws(() => verify({ ...scenario, manifestRows: [{ ...rows[0], promptOrSourceReference: '' }, rows[1]] }), /prompt|provenance/i);
  assert.throws(() => verify({ ...scenario, promptRecords: [promptRecord({ ...promptRows[0], prompt: "Style/medium: polished bright 3D Chinese children's storybook game." }), records[1]] }), /provenance|built-in result|transparent/i);
  assert.throws(() => verify({ ...scenario, publicFiles: [{ ...files[0], bytes: 512 * 1024 + 1 }, files[1]] }), /512 KiB/i);
  assert.throws(() => verify({ ...scenario, sharedBackgroundBytes: 300 * 1024 }), /1\.25 MiB/i);
  assert.throws(() => verify({ ...scenario, sharedBackgroundScreenSlots: 'w4-m1 WeekFourMappingScene; w4-m2 WeekFourVariableEvidenceScene' }), /shared background screen slots/i);
  assert.throws(() => verify({ ...scenario, source: source.replace('<img src={backgroundUrl} />', '<img src={backgroundUrl} hidden />') }), /visible img/i);
  assert.throws(() => verify({ ...scenario, source: source.replace('<img src={visitorUrl} />', '{true && <img src={visitorUrl} />}') }), /visible img/i);
  assert.throws(() => verify({ ...scenario, source: source.replace('backgroundImage:', 'backgroundColor:') }), /backgroundImage/i);
  assert.throws(() => verify({ ...scenario, source: source.replace('backgroundImage:', "'--branch-bg':") }), /CSS custom properties|backgroundImage/i);
  assert.throws(() => verify({ ...scenario, source: source.replace('backgroundImage: \`url("${statesUrl}")\`', "backgroundImage: statesUrl && 'none'") }), /exact.*backgroundImage|single-interpolation|live slot/i);
  assert.throws(() => verify({ ...scenario, source: source.replace('backgroundImage: \`url("${statesUrl}")\`', "backgroundImage: statesUrl ? 'none' : 'none'") }), /exact.*backgroundImage|single-interpolation|live slot/i);
  assert.throws(() => verify({ ...scenario, source: source.replace('backgroundImage: \`url("${statesUrl}")\`', 'backgroundImage: makeUrl(statesUrl)') }), /exact.*backgroundImage|single-interpolation|live slot/i);
  assert.throws(() => verify({ ...scenario, source: source.replace('backgroundImage: \`url("${statesUrl}")\`', "backgroundImage: 'url(' + statesUrl + ')'") }), /exact.*backgroundImage|single-interpolation|live slot/i);
  const aliasSource = source.replace(`const statesUrl =`, 'const stateAlias = statesUrl;\n  const statesUrl =').replace('backgroundImage: \`url("${statesUrl}")\`', 'backgroundImage: \`url("${stateAlias}")\`');
  assert.throws(() => verify({ ...scenario, source: aliasSource }), /backgroundImage|live slot/i);
  const deadSource = source.replace('const backgroundUrl =', 'const deadBackground = () =>').replace('const visitorUrl =', "const backgroundUrl = 'dead';\n  const visitorUrl =");
  assert.throws(() => verify({ ...scenario, source: deadSource }), /bind.*backgroundUrl|top-level const/i);
  assert.throws(() => verify({ ...scenario, source: `${source}\nconst unused = assetUrl('assets/week-four-branches/extra.webp');` }), /exactly three imported assetUrl/i);
  assert.throws(() => verify({ ...scenario, source: source.replace(`assetUrl('${required[1]}')`, `assetUrl('assets/week-four-branches/other.webp')`) }), /exactly three imported assetUrl/i);
  assert.throws(() => verify({ ...scenario, source: source.replace('return <>', 'return <') }), /parse|TypeScript/i);
});

test('W4-M3 visual QA requires a controlled complete evidence index', () => {
  const projects = ['desktop-chromium-1440x1024', 'desktop-firefox-1440x1024', 'tablet-webkit-768x1024', 'mobile-chromium-390x844', 'narrow-chromium-320x844'];
  const link = '../verification/week-four-python-branch-structure-visual-evidence.md';
  const rows = [{ qaStatus: 'visual-qa-passed', purpose: `[Visual evidence](${link})` }];
  const entries = projects.flatMap((project) => ['default', 'proven'].map((state) => ({ project, state, path: `visual-results/week-four-python-branch-st-0c553-rt-parent-summary-and-W4-M4-${project}/w4m3-${state}-${project}.png`, sha256: 'a'.repeat(64), width: Number(project.match(/-(\d+)x/)[1]), height: 4000 })));
  const document = (items) => `# Visual evidence\n\n\`\`\`json\n${JSON.stringify({ capturedAt: '2026-09-01', reviewedAt: '2026-09-08', command: 'npx playwright test e2e/week-four-python-branch-structure.spec.ts', entries: items })}\n\`\`\``;
  const verify = assetManifestModule.verifyWeekFourBranchVisualEvidence;
  assert.equal(typeof verify, 'function');
  assert.doesNotThrow(() => verify(rows, document(entries)));
  assert.throws(() => verify(rows), /evidence index/i);
  assert.throws(() => verify([{ ...rows[0], purpose: 'no link' }], document(entries)), /evidence link/i);
  assert.throws(() => verify(rows, document(entries.map((entry, index) => index ? entry : { ...entry, sha256: 'bad' }))), /hash/i);
  assert.throws(() => verify(rows, document(entries.slice(2))), /ten|10/i);
  assert.throws(() => verify(rows, document(entries.map((entry, index) => index === 0 ? entries[1] : entry))), /duplicate/i);
  assert.throws(() => verify(rows, document(entries.map((entry, index) => index ? entry : { ...entry, width: 1 }))), /dimension/i);
});

test('requires the W4-M3 branch asset inventory to exist before the manifest can claim the scene slot', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const directory = join(sourceRoot, 'public', 'assets', 'week-four-branches');
  let publicFiles;
  try {
    publicFiles = await collectAssetFiles(directory, 'assets/week-four-branches');
  } catch (error) {
    assert.fail(`W4-M3 branch asset directory is required: ${directory} (${error instanceof Error ? error.code ?? error.message : String(error)})`);
  }
  assert.equal(Array.isArray(assetManifestModule.WEEK_FOUR_BRANCH_REQUIRED_ASSETS), true);
  assert.deepEqual(publicFiles.map((file) => file.path).sort(), [...assetManifestModule.WEEK_FOUR_BRANCH_REQUIRED_ASSETS].sort());
  for (const publicFile of publicFiles) {
    assert.equal(publicFile.hasAlpha, true);
    assert.equal(Number.isInteger(publicFile.transparentPixelCount), true);
    assert.equal(publicFile.transparentPixelCount > 0, true);
    assert.equal(publicFile.transparentPixelCount < publicFile.width * publicFile.height, true);
    assert.equal(typeof publicFile.alphaEdgeMismatch?.mismatchRatio, 'number');
    assert.equal(Number.isInteger(publicFile.lowAlphaResidue?.orphanPixels), true);
  }
  const visitor = publicFiles.find((file) => file.path.endsWith('/old-woman-visitor.webp'));
  const states = publicFiles.find((file) => file.path.endsWith('/branch-route-states.webp'));
  assert.deepEqual(visitor.visibleAlphaBounds.padding, { left: 357, top: 76, right: 350, bottom: 78 });
  assert.equal(visitor.partialAlphaPixelCount, 0);
  assert.equal(visitor.alphaEdgeMismatch.mismatchRatio, 0);
  assert.deepEqual(visitor.lowAlphaResidue, { inspectedPixels: 0, orphanPixels: 0, longLineRuns: 0 });
  assert.equal(visitor.webpLossless, true);
  assert.equal(states.alphaEdgeMismatch.mismatchRatio <= 0.08, true);
  assert.equal(states.outerBorderNonTransparentPixelCount, 0);
  assert.equal(states.cellVisiblePixelCounts.every((count) => count > 1000), true);
  assert.deepEqual(states.separatorNonTransparentPixelCounts, [0, 0, 0, 0]);
});

test('requires W4-M2 woman and three-state assets with alpha, exact dimensions, 512 KiB per-file and 1.25 MiB shared-media limits', () => {
  const required = [
    'assets/week-four-variables/woman-with-offering.webp',
    'assets/week-four-variables/variable-record-states.webp',
  ];
  const promptRecordsByAsset = [
    { id: 'W4M2-001', heading: 'Prompt W4M2-001 woman-with-offering', anchor: '#prompt-w4m2-001-woman-with-offering' },
    { id: 'W4M2-002', heading: 'Prompt W4M2-002 variable-record-states', anchor: '#prompt-w4m2-002-variable-record-states' },
  ];
  const rows = required.map((assetId, index) => row({
    assetId,
    promptOrSourceReference: `[Prompt ${promptRecordsByAsset[index].id}](${promptRecordsByAsset[index].anchor})`,
    dimensions: index === 0 ? '1024x1024' : '1536x512',
    screenSlots: 'w4-m2 WeekFourVariableEvidenceScene',
  }));
  const files = [
    file({ path: required[0], width: 1024, height: 1024, hasAlpha: true, transparentPixelCount: 128, bytes: 512 * 1024 }),
    file({ path: required[1], width: 1536, height: 512, hasAlpha: true, transparentPixelCount: 128, bytes: 512 * 1024 }),
  ];
  const records = rows.map((_, index) => promptRecord({ ...promptRecordsByAsset[index], prompt: "Style/medium: polished bright 3D Chinese children's storybook game." }));
  const source = `import { assetUrl } from '../utils/assets';\nexport function WeekFourVariableEvidenceScene() { return <><img src={assetUrl('assets/week-four-mapping/white-tiger-ridge-background.webp')} /><img src={assetUrl('${required[0]}')} /><img src={assetUrl('${required[1]}')} /></>; }`;
  assert.doesNotThrow(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: files, promptRecords: records, source, sharedBackgroundBytes: 128 * 1024 }));
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows.slice(0, 1), publicFiles: files.slice(0, 1), promptRecords: records, source, sharedBackgroundBytes: 128 * 1024 }), /exactly|required/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: [{ ...files[0], hasAlpha: false }, files[1]], promptRecords: records, source, sharedBackgroundBytes: 128 * 1024 }), /alpha/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: [{ ...files[0], transparentPixelCount: 0 }, files[1]], promptRecords: records, source, sharedBackgroundBytes: 128 * 1024 }), /transparent pixels/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: [{ ...files[0], transparentPixelCount: 1024 * 1024 }, files[1]], promptRecords: records, source, sharedBackgroundBytes: 128 * 1024 }), /transparent pixels/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: [{ ...rows[0], sha256: 'b'.repeat(64) }, rows[1]], publicFiles: files, promptRecords: records, source, sharedBackgroundBytes: 128 * 1024 }), /hash mismatch/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: [{ ...files[0], width: 1023 }, files[1]], promptRecords: records, source, sharedBackgroundBytes: 128 * 1024 }), /1024x1024/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: [{ ...files[0], bytes: 512 * 1024 + 1 }, files[1]], promptRecords: records, source, sharedBackgroundBytes: 128 * 1024 }), /512 KiB/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: files, promptRecords: records, source, sharedBackgroundBytes: 300 * 1024 }), /1\.25 MiB/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: [{ ...rows[0], screenSlots: 'wrong slot' }, rows[1]], publicFiles: files, promptRecords: records, source, sharedBackgroundBytes: 128 * 1024 }), /screen slots/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: files, promptRecords: records, source, sharedBackgroundBytes: 128 * 1024, sharedBackgroundScreenSlots: 'w4-m1 WeekFourMappingScene' }), /shared background screen slots/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: files, promptRecords: records, source: `${source}\nconst unused = assetUrl('assets/week-four-variables/unused.webp');`, sharedBackgroundBytes: 128 * 1024 }), /exactly three imported assetUrl/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: files, promptRecords: records, source: source.replace(`assetUrl('${required[1]}')`, `assetUrl('assets/week-four-variables/other.webp')`), sharedBackgroundBytes: 128 * 1024 }), /exactly three imported assetUrl/i);
  assert.throws(() => verifyRequiredWeekFourVariableInventory({ manifestRows: rows, publicFiles: files, promptRecords: records, source: source.replace(`<img src={assetUrl('${required[1]}')} />`, `{/* <img src={assetUrl('${required[1]}')} /> */}`), sharedBackgroundBytes: 128 * 1024 }), /exactly three imported assetUrl/i);
});

test('collects real W4-M2 alpha pixels rather than accepting an opaque alpha-capable container', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public', 'assets', 'week-four-variables'), 'assets/week-four-variables');
  assert.equal(publicFiles.length, 2);
  for (const publicFile of publicFiles) {
    assert.equal(publicFile.hasAlpha, true);
    assert.equal(Number.isInteger(publicFile.transparentPixelCount), true);
    assert.ok(publicFile.transparentPixelCount > 0);
    assert.ok(publicFile.transparentPixelCount < publicFile.width * publicFile.height);
  }
});

test('rejects missing required metadata and dimension mismatches', () => {
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ purpose: '' })] })), /missing purpose/i);
  assert.throws(() => verifyAssetManifest(scenario({ publicFiles: [file({ width: 1599 })] })), /dimension mismatch/i);
});

test('check accepts provenance-verified while verify requires visual QA', () => {
  assert.doesNotThrow(() => verifyAssetManifest(scenario({ mode: 'check' })));
  assert.throws(() => verifyAssetManifest(scenario({ mode: 'verify' })), /visual-qa-passed/i);
  assert.doesNotThrow(() => verifyAssetManifest(scenario({ manifestRows: [row({ qaStatus: 'visual-qa-passed' })], mode: 'verify' })));
});

test('rejects unknown QA states in every mode', () => {
  assert.throws(() => verifyAssetManifest(scenario({ manifestRows: [row({ qaStatus: 'approved' })], mode: 'check' })), /QA status/i);
});


test('W6-M1 scene inventory verifies real background hash, dimensions, provenance, QA and unchanged raster budget', async () => {
  const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { manifestRows, promptRecords } = parseAssetManifest(await readFile(join(sourceRoot, 'docs/assets/asset-manifest.md'), 'utf8'));
  const publicFiles = await collectAssetFiles(join(sourceRoot, 'public/assets/week-six-records'), 'assets/week-six-records');
  const source = await readFile(join(sourceRoot, 'src/components/WeekSixRecordsScene.tsx'), 'utf8');
  const classificationSource = await readFile(join(sourceRoot, 'src/components/WeekSixClassificationScene.tsx'), 'utf8');
  const input = { manifestRows, promptRecords, publicFiles, source, classificationSource, mode: 'verify' };
  const result = verifyRequiredWeekSixRecordsInventory(input);
  assert.equal(result.assetCount, 1);
  assert.equal(result.totalBytes, 179442);
  assert.throws(() => verifyRequiredWeekSixRecordsInventory({ ...input, publicFiles: [] }), /required|exactly/i);
  assert.throws(() => verifyRequiredWeekSixRecordsInventory({ ...input, publicFiles: [{ ...publicFiles[0], sha256: 'b'.repeat(64) }] }), /hash mismatch/i);
  assert.throws(() => verifyRequiredWeekSixRecordsInventory({ ...input, publicFiles: [{ ...publicFiles[0], width: 1024 }] }), /1536x1024/i);
  assert.throws(() => verifyRequiredWeekSixRecordsInventory({ ...input, publicFiles: [{ ...publicFiles[0], bytes: 512 * 1024 + 1 }] }), /512 KiB/i);
  const changeRow = (change) => manifestRows.map((row) => row.assetId.startsWith('assets/week-six-records/') ? { ...row, ...change } : row);
  assert.throws(() => verifyRequiredWeekSixRecordsInventory({ ...input, manifestRows: changeRow({ qaStatus: 'provenance-verified' }) }), /visual-qa-passed/i);
  assert.throws(() => verifyRequiredWeekSixRecordsInventory({ ...input, manifestRows: changeRow({ screenSlots: 'wrong' }) }), /scene slot/i);
  assert.throws(() => verifyRequiredWeekSixRecordsInventory({ ...input, source: source.replace('flaming-mountain-background.webp', 'unapproved.webp') }), /approved background/i);
  assert.throws(() => verifyRequiredWeekSixRecordsInventory({ ...input, classificationSource: '' }), /W6-M2.*approved background/i);
  assert.throws(() => verifyRequiredWeekSixRecordsInventory({ ...input, classificationSource: classificationSource.replace('flaming-mountain-background.webp', 'unapproved.webp') }), /W6-M2.*approved background/i);
  assert.throws(() => verifyRequiredWeekSixRecordsInventory({ ...input, manifestRows: changeRow({ screenSlots: 'w6-m1 WeekSixRecordsScene' }) }), /scene slot/i);
});
