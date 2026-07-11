/// <reference lib="webworker" />

declare const self: DedicatedWorkerGlobalScope;

let pyodidePromise: Promise<any> | null = null;

async function loadRuntime() {
  if (!pyodidePromise) {
    const runtimeUrl = 'https://cdn.jsdelivr.net/pyodide/v314.0.2/full/pyodide.mjs';
    pyodidePromise = import(/* @vite-ignore */ runtimeUrl)
      .then((module) => module.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v314.0.2/full/' }));
  }
  return pyodidePromise;
}

loadRuntime().then(() => self.postMessage({ type: 'ready' })).catch((error) => {
  self.postMessage({ type: 'load-error', error: error instanceof Error ? error.message : String(error) });
});

self.onmessage = async (event: MessageEvent<{ code: string }>) => {
  const pyodide = await loadRuntime();
  const lines: string[] = [];
  pyodide.setStdout({ batched: (value: string) => lines.push(value) });
  pyodide.setStderr({ batched: (value: string) => lines.push(value) });
  try {
    await pyodide.runPythonAsync(event.data.code);
    self.postMessage({ type: 'result', output: lines.join('\n').trim() });
  } catch (error) {
    self.postMessage({ type: 'error', error: error instanceof Error ? error.message : String(error) });
  }
};

export {};
