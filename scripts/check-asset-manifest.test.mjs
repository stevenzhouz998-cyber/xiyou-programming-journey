import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAssetManifest, verifyAssetManifest } from './check-asset-manifest.mjs';

const sha = 'a'.repeat(64);

function row(overrides = {}) {
  return {
    assetId: 'assets/dragon-palace/background.webp',
    sha256: sha,
    purpose: 'Dragon Palace trial hall',
    toolOrSource: 'OpenAI built-in image_gen',
    promptOrSourceReference: '#prompt-background',
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

test('parses the exact nine-column shipping asset table', () => {
  const markdown = `
# Asset manifest

| Asset ID | SHA-256 | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots | QA status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| assets/dragon-palace/background.webp | ${sha} | Dragon Palace trial hall | OpenAI built-in image_gen | [background](#prompt-background) | 1600x900 | generated in-project with built-in image_gen; provenance verified | w1-m1 battle scene background | provenance-verified |

## Residual risks

| Asset | Risk |
| --- | --- |
| assets/world-map.jpg | Original prompt missing |
`;
  assert.deepEqual(parseAssetManifest(markdown), [row({ promptOrSourceReference: '[background](#prompt-background)' })]);
});

test('rejects a shipping table whose columns are not exact', () => {
  const markdown = `
| Asset ID | SHA-256 | Purpose | Tool or source | Prompt or source reference | Dimensions | License/provenance | Screen slots |
| --- | --- | --- | --- | --- | --- | --- | --- |
`;
  assert.throws(() => parseAssetManifest(markdown), /exact nine-column/i);
});

test('rejects missing and extra manifest rows', () => {
  assert.throws(() => verifyAssetManifest({ manifestRows: [], publicFiles: [file()] }), /missing manifest row/i);
  assert.throws(() => verifyAssetManifest({ manifestRows: [row()], publicFiles: [] }), /extra manifest row/i);
});

test('rejects duplicate stable IDs and normalized path aliases', () => {
  assert.throws(() => verifyAssetManifest({ manifestRows: [row(), row()], publicFiles: [file()] }), /duplicate asset id/i);
  assert.throws(() => verifyAssetManifest({
    manifestRows: [row(), row({ assetId: 'assets/dragon-palace/./background.webp' })],
    publicFiles: [file()],
  }), /unsafe|normalize|duplicate asset id/i);
});

test('rejects absolute paths and traversal in rows and files', () => {
  for (const assetId of ['/tmp/background.webp', '../background.webp', 'assets/dragon-palace/../../escape.webp', 'C:\\tmp\\background.webp']) {
    assert.throws(() => verifyAssetManifest({ manifestRows: [row({ assetId })], publicFiles: [file({ path: assetId })] }), /unsafe asset path/i);
  }
});

test('rejects missing, malformed, and mismatched SHA-256 hashes', () => {
  assert.throws(() => verifyAssetManifest({ manifestRows: [row({ sha256: '' })], publicFiles: [file()] }), /missing sha-256/i);
  assert.throws(() => verifyAssetManifest({ manifestRows: [row({ sha256: 'abc' })], publicFiles: [file()] }), /invalid sha-256/i);
  assert.throws(() => verifyAssetManifest({ manifestRows: [row()], publicFiles: [file({ sha256: 'b'.repeat(64) })] }), /hash mismatch/i);
});

test('rejects unsupported finished image formats', () => {
  for (const extension of ['png', 'jpg', 'jpeg', 'svg', 'avif', 'gif']) {
    const path = `assets/dragon-palace/background.${extension}`;
    assert.throws(() => verifyAssetManifest({
      manifestRows: [row({ assetId: path })],
      publicFiles: [file({ path })],
    }), /unsupported shipping format/i);
  }
});

test('rejects a raster over 512 KiB', () => {
  assert.throws(() => verifyAssetManifest({ manifestRows: [row()], publicFiles: [file({ bytes: 512 * 1024 + 1 })] }), /512 KiB/i);
});

test('rejects Dragon Palace mission media over 1.25 MiB', () => {
  const rows = [];
  const files = [];
  for (let index = 0; index < 3; index += 1) {
    const path = `assets/dragon-palace/asset-${index}.webp`;
    rows.push(row({ assetId: path, dimensions: '640x640' }));
    files.push(file({ path, width: 640, height: 640, bytes: 450 * 1024 }));
  }
  assert.throws(() => verifyAssetManifest({ manifestRows: rows, publicFiles: files }), /1\.25 MiB/i);
});

test('rejects missing required metadata and dimension mismatches', () => {
  assert.throws(() => verifyAssetManifest({ manifestRows: [row({ purpose: '' })], publicFiles: [file()] }), /missing purpose/i);
  assert.throws(() => verifyAssetManifest({ manifestRows: [row()], publicFiles: [file({ width: 1599 })] }), /dimension mismatch/i);
});

test('check accepts provenance-verified while verify requires visual QA', () => {
  assert.doesNotThrow(() => verifyAssetManifest({ manifestRows: [row()], publicFiles: [file()], mode: 'check' }));
  assert.throws(() => verifyAssetManifest({ manifestRows: [row()], publicFiles: [file()], mode: 'verify' }), /visual-qa-passed/i);
  assert.doesNotThrow(() => verifyAssetManifest({ manifestRows: [row({ qaStatus: 'visual-qa-passed' })], publicFiles: [file()], mode: 'verify' }));
});

test('rejects unknown QA states in every mode', () => {
  assert.throws(() => verifyAssetManifest({ manifestRows: [row({ qaStatus: 'approved' })], publicFiles: [file()], mode: 'check' }), /QA status/i);
});
