import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAssetManifest, verifyAssetManifest } from './check-asset-manifest.mjs';

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
