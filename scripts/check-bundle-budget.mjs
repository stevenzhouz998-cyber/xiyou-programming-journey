import { readFile, readdir, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { dirname, isAbsolute, join, normalize, relative, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  ENTRY_GZIP_LIMIT,
  GAME_SCENE_RAW_LIMIT,
  HOME_TOTAL_LIMIT,
  PHASER_RAW_LIMIT,
} from './budget-limits.mjs';
export {
  DRAGON_PALACE_COLD_LOAD_MAX_BYTES,
  DRAGON_PALACE_COLD_BYTES,
  FOUR_SEAS_COLD_LOAD_MAX_BYTES,
  FOUR_SEAS_COLD_BYTES,
  RUYI_STAFF_COLD_BYTES,
  RUYI_STAFF_COLD_LOAD_MAX_BYTES,
  DRAGON_PALACE_MEDIA_BYTES,
  ENTRY_GZIP_LIMIT,
  GAME_SCENE_RAW_LIMIT,
  HOME_TOTAL_LIMIT,
  PHASER_RAW_LIMIT,
  SINGLE_RASTER_BYTES,
} from './budget-limits.mjs';

const MODE_ROOTS = ['src/components/BlocklyWorkspace.tsx', 'src/components/RuyiStaffBlocklyWorkspace.tsx', 'src/components/FourSeasRegaliaBlocklyWorkspace.tsx', 'src/components/PythonEditor.tsx', 'src/components/AiLab.tsx', 'src/components/GameScene.tsx', 'src/components/RuyiStaffScene.tsx', 'src/components/FourSeasRegaliaScene.tsx'];
const SCENE_ROOTS = new Set(['src/components/GameScene.tsx', 'src/components/RuyiStaffScene.tsx', 'src/components/FourSeasRegaliaScene.tsx']);
const isPhaserSource = (key, chunk) => chunk.name === 'phaser' || /node_modules[\\/]phaser(?:[\\/]|$)/i.test(`${key} ${chunk.src ?? ''}`);
const isBlocklySource = (key, chunk) => chunk.name === 'blockly-editor' || /node_modules[\\/]blockly(?:[\\/]|$)/i.test(`${key} ${chunk.src ?? ''}`);
const assertSafeFile = (file) => {
  const normalized = normalize(file);
  const portable = file.replaceAll('\\', '/');
  if (isAbsolute(file) || win32.isAbsolute(file) || portable === '..' || portable.startsWith('../') || portable.split('/').includes('..') || normalized === '..') throw new Error(`Bundle budget: unsafe manifest file path ${file}.`);
};

export function assertNoSourceVisualAssets(files) {
  const sourceAsset = files.find((file) => /\.(?:png|avif)$/i.test(file));
  if (sourceAsset) throw new Error(`Bundle budget: non-shipping visual source remains in public: ${sourceAsset}.`);
}

const unwrapExpression = (node) => {
  let current = node;
  while (
    ts.isAwaitExpression(current)
    || ts.isParenthesizedExpression(current)
    || ts.isAsExpression(current)
    || ts.isTypeAssertionExpression(current)
    || ts.isNonNullExpression(current)
  ) current = current.expression;
  return current;
};

const calledPropertyName = (call) => {
  const callee = unwrapExpression(call.expression);
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  if (ts.isElementAccessExpression(callee)) {
    const argument = unwrapExpression(callee.argumentExpression);
    if (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument)) return argument.text;
  }
  return null;
};

const callReceiver = (call) => {
  const callee = unwrapExpression(call.expression);
  return ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)
    ? callee.expression
    : null;
};

const containsIdentifier = (node, name) => {
  let found = false;
  const visit = (current) => {
    if (found) return;
    if (ts.isIdentifier(current) && current.text === name) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
};

const containsStorageReference = (node) => (
  containsIdentifier(node, 'localStorage') || containsIdentifier(node, 'sessionStorage')
);

const assignmentOperators = new Set([
  ts.SyntaxKind.EqualsToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.AsteriskAsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
  ts.SyntaxKind.PercentEqualsToken,
  ts.SyntaxKind.LessThanLessThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken,
  ts.SyntaxKind.AmpersandEqualsToken,
  ts.SyntaxKind.BarEqualsToken,
  ts.SyntaxKind.CaretEqualsToken,
  ts.SyntaxKind.BarBarEqualsToken,
  ts.SyntaxKind.AmpersandAmpersandEqualsToken,
  ts.SyntaxKind.QuestionQuestionEqualsToken,
]);

const allowedStorageWriteKeys = new Set(['xiyou-test-storage-mode']);

function assertReadOnlyEvaluate(callback) {
  const fail = (detail) => {
    throw new Error(`Four Seas E2E source contract: evaluate write/injection is forbidden (${detail}).`);
  };
  const visit = (node) => {
    if (ts.isBinaryExpression(node) && assignmentOperators.has(node.operatorToken.kind)) {
      if (containsIdentifier(node.left, 'progress')) fail('progress assignment');
      if (containsStorageReference(node.left)) fail('storage assignment');
    }
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node))
      && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)
      && containsIdentifier(node.operand, 'progress')
    ) fail('progress mutation');
    if (ts.isDeleteExpression(node) && containsIdentifier(node.expression, 'progress')) {
      fail('progress delete');
    }
    if (ts.isCallExpression(node)) {
      const method = calledPropertyName(node);
      const receiver = callReceiver(node);
      if (receiver !== null && containsStorageReference(receiver)) {
        if (method === 'setItem') {
          const key = node.arguments[0] && unwrapExpression(node.arguments[0]);
          const keyValue = key && (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key))
            ? key.text
            : null;
          if (keyValue === null || !allowedStorageWriteKeys.has(keyValue)) fail('storage setItem');
        } else if (method !== 'getItem' && method !== 'key') {
          fail(`storage ${String(method)}`);
        }
      }
      if (receiver !== null && containsIdentifier(receiver, 'progress')) {
        fail(`progress method ${String(method)}`);
      }
      const callee = unwrapExpression(node.expression);
      const isMutationUtility = ts.isPropertyAccessExpression(callee)
        && ts.isIdentifier(callee.expression)
        && (
          (callee.expression.text === 'Object' && ['assign', 'defineProperty', 'defineProperties'].includes(callee.name.text))
          || (callee.expression.text === 'Reflect' && ['set', 'deleteProperty', 'defineProperty'].includes(callee.name.text))
        );
      if (
        isMutationUtility
        && node.arguments[0]
        && (containsIdentifier(node.arguments[0], 'progress') || containsStorageReference(node.arguments[0]))
      ) fail(`${callee.expression.text}.${callee.name.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(callback.body);
}

export function assertFourSeasE2ESourceContract(source) {
  const file = ts.createSourceFile(
    'four-seas-regalia-code-battle.spec.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const independentPages = new Set();
  const healthAttachedPages = new Set();

  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const initializer = unwrapExpression(node.initializer);
      if (ts.isCallExpression(initializer) && calledPropertyName(initializer) === 'newPage') {
        independentPages.add(node.name.text);
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = unwrapExpression(node.expression);
      if (
        ts.isIdentifier(callee)
        && callee.text === 'attachHealth'
        && node.arguments.length === 1
        && ts.isIdentifier(unwrapExpression(node.arguments[0]))
      ) healthAttachedPages.add(unwrapExpression(node.arguments[0]).text);

      if (calledPropertyName(node) === 'evaluate') {
        const callback = node.arguments[0] && unwrapExpression(node.arguments[0]);
        if (!callback || (!ts.isArrowFunction(callback) && !ts.isFunctionExpression(callback))) {
          throw new Error('Four Seas E2E source contract: evaluate callback must be inline for AST inspection.');
        }
        assertReadOnlyEvaluate(callback);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  for (const pageName of independentPages) {
    if (!healthAttachedPages.has(pageName)) {
      throw new Error(`Four Seas E2E source contract: independent page ${pageName} is missing health listeners.`);
    }
  }
}

async function listFiles(root, relativeRoot = '') {
  const entries = await readdir(join(root, relativeRoot), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relativePath = join(relativeRoot, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, relativePath));
    else files.push(relativePath.replaceAll('\\', '/'));
  }
  return files;
}

function collectClosure(manifest, root, includeDynamic) {
  const keys = new Set();
  const walk = (key) => {
    if (keys.has(key)) return;
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Bundle budget: manifest import ${key} is missing.`);
    keys.add(key);
    for (const dependency of chunk.imports ?? []) walk(dependency);
    if (includeDynamic && (!chunk.isEntry || key === root)) for (const dependency of chunk.dynamicImports ?? []) walk(dependency);
  };
  walk(root);
  return keys;
}

export const collectStaticClosure = (manifest, root) => collectClosure(manifest, root, false);
export const collectRuntimeClosure = (manifest, root) => collectClosure(manifest, root, true);

function assertHealthyManifestGraph(manifest, entryKey) {
  for (const [key, chunk] of Object.entries(manifest)) {
    if (key !== entryKey && (chunk.imports ?? []).includes(entryKey)) {
      throw new Error(`Bundle budget: non-entry chunk ${key} statically imports application entry ${entryKey}.`);
    }
  }

  const visited = new Set();
  const active = new Set();
  const path = [];
  const walk = (key) => {
    if (active.has(key)) {
      const cycleStart = path.indexOf(key);
      throw new Error(`Bundle budget: manifest dependency cycle ${[...path.slice(cycleStart), key].join(' -> ')}.`);
    }
    if (visited.has(key)) return;
    const chunk = manifest[key];
    if (!chunk) throw new Error(`Bundle budget: manifest import ${key} is missing.`);
    active.add(key);
    path.push(key);
    for (const dependency of new Set([...(chunk.imports ?? []), ...(chunk.dynamicImports ?? [])])) walk(dependency);
    path.pop();
    active.delete(key);
    visited.add(key);
  };
  for (const key of Object.keys(manifest)) walk(key);
}

export function analyzeManifest(manifest, gzipSizes, rawSizes = {}) {
  const entryKey = Object.keys(manifest).find((key) => key.replaceAll('\\', '/') === 'src/main.tsx' && manifest[key].isEntry)
    ?? Object.keys(manifest).find((key) => manifest[key].isEntry && manifest[key].src === 'index.html');
  if (!entryKey) throw new Error('Bundle budget: src/main.tsx/index.html application entry is missing from the Vite manifest.');
  assertHealthyManifestGraph(manifest, entryKey);
  const visited = collectStaticClosure(manifest, entryKey);
  for (const chunk of Object.values(manifest)) if (chunk.file) assertSafeFile(chunk.file);
  const staticFiles = [...new Set([...visited].map((key) => manifest[key].file).filter((file) => file?.endsWith('.js')))];
  const staticPhaser = [...visited].find((key) => isPhaserSource(key, manifest[key]));
  if (staticPhaser) throw new Error(`Bundle budget: Phaser entered the static entry closure through ${staticPhaser}.`);
  const staticBlockly = [...visited].find((key) => isBlocklySource(key, manifest[key]));
  if (staticBlockly) throw new Error(`Bundle budget: Blockly entered the static entry closure through ${staticBlockly}.`);
  const entryGzipBytes = staticFiles.reduce((sum, file) => {
    if (!Number.isFinite(gzipSizes[file])) throw new Error(`Bundle budget: gzip size missing for ${file}.`);
    return sum + gzipSizes[file];
  }, 0);
  if (entryGzipBytes > ENTRY_GZIP_LIMIT) throw new Error(`Bundle budget: entry is ${(entryGzipBytes / 1024).toFixed(1)} KiB gzip, over 180 KiB.`);
  const closures = {};
  for (const root of MODE_ROOTS) {
    if (!manifest[root]) continue;
    const keys = collectRuntimeClosure(manifest, root);
    const phaser = [...keys].some((key) => isPhaserSource(key, manifest[key]));
    if (!SCENE_ROOTS.has(root) && phaser) throw new Error(`Bundle budget: ${root.split('/').at(-1).replace('.tsx', '')} closure contains Phaser.`);
    const files = [...new Set([...keys].map((key) => manifest[key].file).filter((file) => file?.endsWith('.js')))];
    closures[root] = { files, rawBytes: files.reduce((sum, file) => sum + (rawSizes[file] ?? 0), 0), gzipBytes: files.reduce((sum, file) => sum + (gzipSizes[file] ?? 0), 0) };
    if (SCENE_ROOTS.has(root)) {
      if (!phaser) throw new Error('Bundle budget: 无法识别Phaser预算对象。GameScene运行闭包必须包含manifest name=phaser或node_modules/phaser来源。');
      const oversizedPhaser = [...keys].find((key) => isPhaserSource(key, manifest[key]) && (rawSizes[manifest[key].file] ?? 0) > PHASER_RAW_LIMIT);
      if (oversizedPhaser) throw new Error(`Bundle budget: approved dynamic Phaser chunk exceeds 1600 KiB raw (${manifest[oversizedPhaser].file}).`);
      if (closures[root].rawBytes > GAME_SCENE_RAW_LIMIT) throw new Error(`Bundle budget: ${root.split('/').at(-1).replace('.tsx', '')} closure exceeds 1900 KiB raw.`);
    }
  }
  const dynamic = Object.entries(manifest).filter(([key, chunk]) => !visited.has(key) && chunk.file?.endsWith('.js'));
  for (const [key, chunk] of dynamic) {
    if (isPhaserSource(key, chunk) && (rawSizes[chunk.file] ?? 0) > PHASER_RAW_LIMIT) {
      throw new Error(`Bundle budget: approved dynamic Phaser chunk exceeds 1600 KiB raw (${chunk.file}).`);
    }
  }
  return { entryGzipBytes, staticFiles, closures, dynamic: dynamic.map(([key, chunk]) => ({ key, file: chunk.file, gzipBytes: gzipSizes[chunk.file] ?? 0, rawBytes: rawSizes[chunk.file] ?? 0 })) };
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  assertNoSourceVisualAssets(await listFiles(join(root, 'public')));
  const manifestPath = join(root, 'dist', '.vite', 'manifest.json');
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
  catch (error) { throw new Error(`Bundle budget: cannot read ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`); }
  const files = [...new Set(Object.values(manifest).map((chunk) => chunk.file).filter((file) => file?.endsWith('.js')))];
  const gzipSizes = {};
  const rawSizes = {};
  for (const file of files) {
    const distRoot = resolve(root, 'dist');
    const path = resolve(distRoot, file);
    const within = relative(distRoot, path);
    if (within.startsWith('..') || isAbsolute(within)) throw new Error(`Bundle budget: unsafe manifest file path ${file}.`);
    const bytes = await readFile(path);
    gzipSizes[file] = gzipSync(bytes).byteLength;
    rawSizes[file] = (await stat(path)).size;
  }
  const result = analyzeManifest(manifest, gzipSizes, rawSizes);
  const homeFiles = ['index.html', 'assets/world-map.jpg', 'assets/mentor.jpg', 'assets/young-hero.jpg'];
  const cssFiles = [...new Set(Object.values(manifest).flatMap((chunk) => chunk.css ?? []))];
  const homeStaticBytes = result.entryGzipBytes;
  let homeTotalBytes = homeStaticBytes;
  for (const file of [...homeFiles, ...cssFiles]) homeTotalBytes += (await stat(join(root, 'dist', file))).size;
  if (homeTotalBytes > HOME_TOTAL_LIMIT) throw new Error(`Bundle budget: conservative homepage total is ${(homeTotalBytes / 1024).toFixed(1)} KiB, over 650 KiB.`);
  console.log(`Entry static JS: ${(result.entryGzipBytes / 1024).toFixed(1)} KiB gzip / 180 KiB`);
  console.log(`Conservative homepage total: ${(homeTotalBytes / 1024).toFixed(1)} KiB / 650 KiB`);
  const phaserEntry = Object.entries(manifest).find(([key, chunk]) => isPhaserSource(key, chunk));
  if (phaserEntry) console.log(`Phaser identified by manifest ${phaserEntry[1].name === 'phaser' ? 'name' : 'provenance'}: ${phaserEntry[0]}`);
  for (const [mode, closure] of Object.entries(result.closures)) console.log(`${mode.split('/').at(-1).replace('.tsx', '')} closure: ${(closure.rawBytes / 1024).toFixed(1)} KiB raw, ${(closure.gzipBytes / 1024).toFixed(1)} KiB gzip`);
  console.log('Dynamic JS chunks (not part of homepage entry):');
  for (const chunk of result.dynamic.sort((a, b) => b.rawBytes - a.rawBytes)) console.log(`  ${chunk.file}: ${(chunk.rawBytes / 1024).toFixed(1)} KiB raw, ${(chunk.gzipBytes / 1024).toFixed(1)} KiB gzip${/phaser/i.test(`${chunk.key} ${chunk.file}`) ? ' (approved Phaser ceiling: 1600 KiB raw)' : ''}`);
  console.log('Homepage total-resource target is enforced statically and re-measured in browser QA.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
