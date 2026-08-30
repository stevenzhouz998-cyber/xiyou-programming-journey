import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  PYODIDE_RUNTIME_FILES,
  assertPyodideRuntimeInventory,
  assertWeekFourPyodideRuntimeSourceContract,
} from './check-python-runtime.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const workerSource = () => readFileSync(new URL('../src/workers/weekFourPythonMapping.worker.ts', import.meta.url), 'utf8');

test('requires the fixed five-file Pyodide 314.0.2 inventory and provenance in the public runtime directory', async () => {
  assert.deepEqual(PYODIDE_RUNTIME_FILES, [
    'pyodide.mjs',
    'pyodide.asm.mjs',
    'pyodide.asm.wasm',
    'python_stdlib.zip',
    'pyodide-lock.json',
    'LICENSE',
    'SOURCE.md',
  ]);
  await assertPyodideRuntimeInventory(root);
});

test('verifies the same fixed runtime manifest after Vite copies it to the build output', async () => {
  await assertPyodideRuntimeInventory(fileURLToPath(new URL('../dist', import.meta.url)), {
    runtimeDirectory: 'runtime/pyodide-314.0.2',
  });
});

test('requires the W4 Worker to load only the same-origin fixed Pyodide runtime', () => {
  assert.throws(
    () => assertWeekFourPyodideRuntimeSourceContract("const url = 'https://cdn.jsdelivr.net/pyodide/v314.0.2/full/pyodide.mjs';"),
    /same-origin|cdn|https/i,
  );
  assert.throws(
    () => assertWeekFourPyodideRuntimeSourceContract(`
      const runtimeBase = new URL('/runtime/pyodide-314.0.2/', self.location.href);
      if (runtimeBase.origin !== self.location.origin) throw new Error('origin');
      const runtimeModuleUrl = new URL('pyodide.mjs', runtimeBase);
      loadPyodide({ indexURL: runtimeBase.href });
    `),
    /relative|base/i,
  );
  assert.doesNotThrow(() => assertWeekFourPyodideRuntimeSourceContract(workerSource()));
});
