import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as bundleBudget from './check-bundle-budget.mjs';

const { analyzeManifest, assertNoSourceVisualAssets } = bundleBudget;

const base = {
  'src/main.tsx': { file: 'assets/main.js', isEntry: true, imports: ['vendor.js'] },
  'vendor.js': { file: 'assets/vendor.js', imports: [] },
};

test('exports the fixed Dragon Palace cold-load and raster budgets', () => {
  assert.equal(bundleBudget.DRAGON_PALACE_COLD_BYTES, 2.5 * 1024 * 1024);
  assert.equal(bundleBudget.DRAGON_PALACE_MEDIA_BYTES, 1.25 * 1024 * 1024);
  assert.equal(bundleBudget.SINGLE_RASTER_BYTES, 512 * 1024);
});

test('keeps Dragon Palace budgets in one shared module', () => {
  const budgetSource = readFileSync(new URL('./budget-limits.mjs', import.meta.url), 'utf8');
  const bundleSource = readFileSync(new URL('./check-bundle-budget.mjs', import.meta.url), 'utf8');
  const e2eSource = readFileSync(new URL('../e2e/dragon-palace-code-battle.spec.ts', import.meta.url), 'utf8');
  assert.match(budgetSource, /DRAGON_PALACE_COLD_BYTES\s*=\s*2\.5\s*\*\s*1024\s*\*\s*1024/);
  assert.match(bundleSource, /from '\.\/budget-limits\.mjs'/);
  assert.match(e2eSource, /from '\.\.\/scripts\/budget-limits\.mjs'/);
  assert.doesNotMatch(e2eSource, /const COLD_BYTES_LIMIT/);
});

test('requires the browser cold gate to fail closed for every HTTP response', () => {
  const configSource = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
  const e2eSource = readFileSync(new URL('../e2e/dragon-palace-code-battle.spec.ts', import.meta.url), 'utf8');
  assert.match(configSource, /serviceWorkers:\s*'block'/);
  assert.match(e2eSource, /'cache-control':\s*'no-store'/);
  assert.match(e2eSource, /page\.on\('requestfailed'/);
  assert.match(e2eSource, /const status = response\.status\(\)/);
  assert.doesNotMatch(e2eSource, /url\.origin\s*!==/);
});

test('fails an entry static closure over 180 KiB gzip', () => {
  assert.throws(() => analyzeManifest(base, { 'assets/main.js': 100 * 1024, 'assets/vendor.js': 81 * 1024 }), /180 KiB/);
});

test('fails when Phaser appears in the static closure', () => {
  const manifest = { ...base, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['node_modules/phaser/index.js'] }, 'node_modules/phaser/index.js': { file: 'assets/runtime.js', imports: [] } };
  assert.throws(() => analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/runtime.js': 1 }), /Phaser.*static/i);
});

test('allows Phaser as a bounded dynamic chunk', () => {
  const manifest = { ...base, 'src/components/GameScene.tsx': { file: 'assets/scene.js', isDynamicEntry: true, imports: ['phaser-runtime.js'] }, 'phaser-runtime.js': { file: 'assets/phaser.js', name: 'phaser', imports: [] } };
  assert.equal(analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/scene.js': 1, 'assets/phaser.js': 100 }, { 'assets/scene.js': 1, 'assets/phaser.js': 1000 }).entryGzipBytes, 2);
});

test('deduplicates shared static imports', () => {
  const manifest = { ...base, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['a.js', 'b.js'] }, 'a.js': { file: 'assets/a.js', imports: ['shared.js'] }, 'b.js': { file: 'assets/b.js', imports: ['shared.js'] }, 'shared.js': { file: 'assets/shared.js', imports: [] } };
  const result = analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/a.js': 2, 'assets/b.js': 4, 'assets/shared.js': 8 });
  assert.equal(result.entryGzipBytes, 15);
});

test('deduplicates aliases that emit the same file', () => {
  const manifest = { ...base, 'src/main.tsx': { ...base['src/main.tsx'], imports: ['a.js', 'alias.js'] }, 'a.js': { file: 'assets/shared.js', imports: [] }, 'alias.js': { file: 'assets/shared.js', imports: [] } };
  assert.equal(analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/shared.js': 8 }).entryGzipBytes, 9);
});

test('detects Phaser provenance even when output is renamed', () => {
  const manifest = { ...base, 'vendor.js': { file: 'assets/vendor.js', src: 'node_modules/phaser/src/phaser.js', imports: [] } };
  assert.throws(() => analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/vendor.js': 1 }), /Phaser.*static/i);
});

test('rejects unsafe manifest file paths', () => {
  assert.throws(() => analyzeManifest({ ...base, 'vendor.js': { file: '../escape.js', imports: [] } }, { '../escape.js': 1 }), /unsafe/i);
  assert.throws(() => analyzeManifest({ ...base, 'vendor.js': { file: '/tmp/escape.js', imports: [] } }, { '/tmp/escape.js': 1 }), /unsafe/i);
  assert.throws(() => analyzeManifest({ ...base, 'vendor.js': { file: '..\\escape.js', imports: [] } }, { '..\\escape.js': 1 }), /unsafe/i);
});

test('fails an oversized dynamic Phaser source with a renamed output', () => {
  const manifest = { ...base, 'node_modules/phaser/src/phaser.js': { file: 'assets/runtime.js', src: 'node_modules/phaser/src/phaser.js', isDynamicEntry: true } };
  assert.throws(() => analyzeManifest(manifest, { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/runtime.js': 1 }, { 'assets/runtime.js': 1600 * 1024 + 1 }), /1600 KiB/);
});

test('rejects Phaser from non-scene mode closures', () => {
  const manifest = {
    ...base,
    'src/components/BlocklyWorkspace.tsx': { file: 'assets/blockly.js', imports: ['node_modules/phaser/index.js'] },
    'src/components/PythonEditor.tsx': { file: 'assets/python.js', imports: [] },
    'src/components/AiLab.tsx': { file: 'assets/ai.js', imports: [] },
    'src/components/GameScene.tsx': { file: 'assets/scene.js', imports: ['node_modules/phaser/index.js'] },
    'node_modules/phaser/index.js': { file: 'assets/runtime.js', src: 'node_modules/phaser/index.js', imports: [] },
  };
  assert.throws(() => analyzeManifest(manifest, Object.fromEntries(Object.values(manifest).map((chunk) => [chunk.file, 1])), Object.fromEntries(Object.values(manifest).map((chunk) => [chunk.file, 1]))), /BlocklyWorkspace.*Phaser/);
});

test('follows nested dynamic imports and cycles in runtime closures', () => {
  const manifest = {
    ...base,
    'src/components/BlocklyWorkspace.tsx': { file: 'assets/blockly.js', dynamicImports: ['helper.js'] },
    'helper.js': { file: 'assets/helper.js', dynamicImports: ['node_modules/phaser/runtime.js'] },
    'node_modules/phaser/runtime.js': { file: 'assets/renamed.js', src: 'node_modules/phaser/runtime.js', imports: ['helper.js'] },
  };
  const sizes = Object.fromEntries(Object.values(manifest).map((chunk) => [chunk.file, 1]));
  assert.throws(() => analyzeManifest(manifest, sizes, sizes), /BlocklyWorkspace.*Phaser/);
});

test('counts nested GameScene dynamic Phaser and enforces its raw limit', () => {
  const manifest = {
    ...base,
    'src/components/GameScene.tsx': { file: 'assets/scene.js', dynamicImports: ['helper.js'] },
    'helper.js': { file: 'assets/helper.js', dynamicImports: ['node_modules/phaser/runtime.js'] },
    'node_modules/phaser/runtime.js': { file: 'assets/renamed.js', src: 'node_modules/phaser/runtime.js', imports: ['helper.js'] },
  };
  const gzip = Object.fromEntries(Object.values(manifest).map((chunk) => [chunk.file, 1]));
  const raw = { ...gzip, 'assets/renamed.js': 1600 * 1024 + 1 };
  assert.throws(() => analyzeManifest(manifest, gzip, raw), /1600 KiB/);
});

test('identifies real Vite Phaser manifest entries by name', () => {
  const manifest = { ...base, 'src/components/GameScene.tsx': { file: 'assets/scene.js', imports: ['_phaser.js'] }, '_phaser.js': { file: 'assets/vendor-x.js', name: 'phaser', imports: [] } };
  const gzip = { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/scene.js': 1, 'assets/vendor-x.js': 1 };
  assert.throws(() => analyzeManifest(manifest, gzip, { ...gzip, 'assets/vendor-x.js': 99_999_999 }), /1600 KiB/);
});

test('fails when GameScene dependency cannot be identified as Phaser', () => {
  const manifest = { ...base, 'src/components/GameScene.tsx': { file: 'assets/scene.js', imports: ['_vendor.js'] }, '_vendor.js': { file: 'assets/vendor-x.js', imports: [] } };
  const sizes = { 'assets/main.js': 1, 'assets/vendor.js': 1, 'assets/scene.js': 1, 'assets/vendor-x.js': 700_000 };
  assert.throws(() => analyzeManifest(manifest, sizes, sizes), /无法识别Phaser预算对象/);
});

test('rejects non-shipping visual source formats from the public directory', () => {
  assert.throws(() => assertNoSourceVisualAssets(['assets/world-map.jpg', 'assets/world-map.png']), /world-map\.png/);
  assert.throws(() => assertNoSourceVisualAssets(['assets/mentor.avif']), /mentor\.avif/);
  assert.doesNotThrow(() => assertNoSourceVisualAssets(['assets/world-map.jpg', 'assets/audio/welcome.m4a']));
});
