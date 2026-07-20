import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collectAssetFiles,
  decodeWebpDimensions,
  parseAssetManifest,
  readWebpDimensions,
  verifyRequiredDragonPalaceInventory,
  verifyAssetManifest,
} from './check-asset-manifest.mjs';

const sha = 'a'.repeat(64);
const artDirection = 'commercial children’s learning game, refined Chinese ink-and-color illustration, Journey to the West Dragon Palace, warm jade/cinnabar/gold palette, readable silhouettes, no text, no logo, no emoji, no UI frame.';

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

test('traces every approved Dragon Palace raster to a real formal scene slot', async () => {
  const manifestPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'assets', 'asset-manifest.md');
  const parsed = parseAssetManifest(await readFile(manifestPath, 'utf8'));
  assert.equal(parsed.manifestRows.length, 8);
  for (const manifestRow of parsed.manifestRows) {
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
  for (const mutatedSource of [
    ruyiSource.replace(demandLoad, "scene.load.image('sabre', assetUrl('/assets/dragon-palace/weapons.webp'))"),
    ruyiSource.replace(demandBranch, "if (event.opcode === 'choose_halberd') {"),
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
