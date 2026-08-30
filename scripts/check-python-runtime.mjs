import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const PYODIDE_RUNTIME_VERSION = '314.0.2';
export const PYODIDE_RUNTIME_DIRECTORY = `public/runtime/pyodide-${PYODIDE_RUNTIME_VERSION}`;
export const PYODIDE_RUNTIME_FILES = Object.freeze([
  'pyodide.mjs',
  'pyodide.asm.mjs',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
  'LICENSE',
  'SOURCE.md',
]);

export const PYODIDE_CORE_MANIFEST = Object.freeze({
  'pyodide.mjs': Object.freeze({ bytes: 17_880, sha256: '955d2088bbb7fc79a73c4802aca2370c1d95bfdfaffa4121e0faebda2b0ea3f9' }),
  'pyodide.asm.mjs': Object.freeze({ bytes: 1_250_259, sha256: 'c7eccdfeb7a8419d61f910f0685b45cd5610b7ff5bbe844c3c1050ee6623b641' }),
  'pyodide.asm.wasm': Object.freeze({ bytes: 9_609_998, sha256: 'f7a8a169e513791e18fa0790fb69d6f2656b779e9012ba57e03e973f0df0b39f' }),
  'python_stdlib.zip': Object.freeze({ bytes: 2_552_456, sha256: '101a9c94ca6304c1478c89b7b595136b9a51b4289bdc5b467d86db553efee9b3' }),
  'pyodide-lock.json': Object.freeze({ bytes: 113_804, sha256: 'c963d22858f6bcb8f41586a2142f03905ab370c88ea22a86a2736e95fac2a8f3' }),
});

export const PYODIDE_CORE_MAX_BYTES = 15 * 1024 * 1024;
const OFFICIAL_RUNTIME_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_RUNTIME_VERSION}/full/`;
const OFFICIAL_SOURCE_TAG_URL = `https://github.com/pyodide/pyodide/tree/${PYODIDE_RUNTIME_VERSION}`;
const OFFICIAL_LICENSE_URL = `https://raw.githubusercontent.com/pyodide/pyodide/${PYODIDE_RUNTIME_VERSION}/LICENSE`;

function safeRuntimeDirectory(root, runtimeDirectory) {
  const rootPath = resolve(root);
  const runtimePath = resolve(rootPath, runtimeDirectory);
  const fromRoot = relative(rootPath, runtimePath);
  if (!fromRoot || fromRoot === '..' || fromRoot.startsWith('../') || fromRoot.split('/').includes('..')) {
    throw new Error('Pyodide runtime: unsafe runtime directory traversal.');
  }
  return runtimePath;
}

function manifestCoreBytes() {
  return Object.values(PYODIDE_CORE_MANIFEST).reduce((total, entry) => total + entry.bytes, 0);
}

function sourceRecordRequirements() {
  return [
    `Version: ${PYODIDE_RUNTIME_VERSION}`,
    'Download date: 2026-08-30',
    'Modification status: No modifications. Third-party files are byte-for-byte copies of the verified downloads.',
    ...Object.keys(PYODIDE_CORE_MANIFEST).map((file) => `${OFFICIAL_RUNTIME_BASE}${file}`),
    OFFICIAL_SOURCE_TAG_URL,
    OFFICIAL_LICENSE_URL,
  ];
}

export async function assertPyodideRuntimeInventory(root, { runtimeDirectory = PYODIDE_RUNTIME_DIRECTORY } = {}) {
  const runtimePath = safeRuntimeDirectory(root, runtimeDirectory);
  const directory = await lstat(runtimePath).catch(() => null);
  if (!directory || !directory.isDirectory() || directory.isSymbolicLink()) {
    throw new Error(`Pyodide runtime: ${runtimeDirectory} must be a real directory.`);
  }
  const entries = await readdir(runtimePath, { withFileTypes: true });
  const names = entries.map((entry) => entry.name).sort();
  const expected = [...PYODIDE_RUNTIME_FILES].sort();
  if (names.join('\n') !== expected.join('\n')) {
    throw new Error(`Pyodide runtime: inventory must contain exactly ${expected.join(', ')}; received ${names.join(', ')}.`);
  }
  for (const entry of entries) {
    if (!entry.isFile() || entry.isSymbolicLink()) throw new Error(`Pyodide runtime: ${entry.name} must be a regular file, never a symlink or directory.`);
    const filePath = resolve(runtimePath, entry.name);
    if (dirname(filePath) !== runtimePath) throw new Error(`Pyodide runtime: unsafe file traversal for ${entry.name}.`);
    const file = await lstat(filePath);
    if (!file.isFile() || file.isSymbolicLink()) throw new Error(`Pyodide runtime: ${entry.name} must be a non-symlink regular file.`);
  }
  for (const [name, expectedEntry] of Object.entries(PYODIDE_CORE_MANIFEST)) {
    const bytes = await readFile(resolve(runtimePath, name));
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (bytes.byteLength !== expectedEntry.bytes || digest !== expectedEntry.sha256) {
      throw new Error(`Pyodide runtime: ${name} does not match the fixed ${PYODIDE_RUNTIME_VERSION} byte/hash manifest.`);
    }
  }
  if (manifestCoreBytes() > PYODIDE_CORE_MAX_BYTES) throw new Error(`Pyodide runtime: core bytes exceed ${PYODIDE_CORE_MAX_BYTES}.`);
  const license = await readFile(resolve(runtimePath, 'LICENSE'), 'utf8');
  if (!license.includes('Mozilla Public License Version 2.0') || !license.includes('Source Code Form')) {
    throw new Error('Pyodide runtime: LICENSE must contain the MPL-2.0 text.');
  }
  const source = await readFile(resolve(runtimePath, 'SOURCE.md'), 'utf8');
  for (const requirement of sourceRecordRequirements()) {
    if (!source.includes(requirement)) throw new Error(`Pyodide runtime: SOURCE.md is missing required provenance: ${requirement}.`);
  }
  if (/\b(?:latest|dev)\b|\{\{|\$\{|\.\.[\\/]/i.test(source)) {
    throw new Error('Pyodide runtime: SOURCE.md must not use dynamic latest/dev references or traversal.');
  }
  return Object.freeze({ coreBytes: manifestCoreBytes(), runtimePath });
}

export function assertWeekFourPyodideRuntimeSourceContract(source) {
  if (typeof source !== 'string') throw new Error('Pyodide worker: source must be text.');
  if (/cdn\.jsdelivr|https:\/\//i.test(source)) throw new Error('Pyodide worker: CDN or https runtime URLs are forbidden; use the same-origin runtime directory.');
  if (/\b(?:latest|dev)\b/i.test(source)) throw new Error('Pyodide worker: runtime version must be fixed at 314.0.2.');
  if (source.includes("new URL('/runtime/pyodide-314.0.2/', self.location.href)")) {
    throw new Error('Pyodide worker: runtime base must resolve relatively from the Worker asset so the Vite base path is preserved.');
  }
  const base = "new URL('../runtime/pyodide-314.0.2/', self.location.href)";
  if (!source.includes(base) || !source.includes("new URL('pyodide.mjs', runtimeBase)") || !source.includes('indexURL: runtimeBase.href')) {
    throw new Error('Pyodide worker: pyodide.mjs and indexURL must use the fixed same-origin 314.0.2 runtime base.');
  }
  if (!source.includes('runtimeBase.origin !== self.location.origin')) {
    throw new Error('Pyodide worker: runtime base must prove same-origin resolution against the current Worker URL.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const result = await assertPyodideRuntimeInventory(root);
  const worker = await readFile(resolve(root, 'src/workers/weekFourPythonMapping.worker.ts'), 'utf8');
  assertWeekFourPyodideRuntimeSourceContract(worker);
  process.stdout.write(`Pyodide runtime: ${result.coreBytes} verified bytes.\n`);
}
