import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_WEEK_FOUR_BRANCH_PYTHON,
  NESTED_WEEK_FOUR_BRANCH_PYTHON,
  parseWeekFourBranchPython,
  SOLVED_WEEK_FOUR_BRANCH_PYTHON,
} from './weekFourBranchPythonGrammar';
import { createWeekFourBranchPythonRuntime, WeekFourBranchRuntimeError } from './weekFourBranchPythonRunner';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { FakeWorker.instances.push(this); }
  emit(data: unknown) { this.onmessage?.({ data } as MessageEvent<unknown>); }
  crash() { this.onerror?.(); }
}

const latestWorker = () => FakeWorker.instances.at(-1)!;
const runnable = (code: string) => {
  const parsed = parseWeekFourBranchPython(code);
  if ('state' in parsed) throw new Error('test fixture must be runnable');
  return parsed;
};
const readyRuntime = async (options: Parameters<typeof createWeekFourBranchPythonRuntime>[0] = {}) => {
  const runtime = createWeekFourBranchPythonRuntime({ ...options, workerFactory: () => new FakeWorker() });
  const ready = runtime.ready();
  latestWorker().emit({ type: 'ready' });
  await ready;
  return runtime;
};

beforeEach(() => { FakeWorker.instances = []; vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('W4-M3 isolated branch Python runtime', () => {
  it.each([DEFAULT_WEEK_FOUR_BRANCH_PYTHON, NESTED_WEEK_FOUR_BRANCH_PYTHON, SOLVED_WEEK_FOUR_BRANCH_PYTHON])('accepts the canonical Worker trace for %s', async (code) => {
    const runtime = await readyRuntime();
    const expected = runnable(code);
    const running = runtime.run(code);
    await Promise.resolve();
    const request = latestWorker().postMessage.mock.calls.at(-1)![0];
    expect(request).toEqual({ type: 'run', requestId: expect.any(Number), code });
    latestWorker().emit({ type: 'result', requestId: request.requestId, trace: structuredClone(expected.trace) });
    await expect(running).resolves.toEqual({ trace: expected.trace, run: expected.run });
  });

  it('prewarms and reports load failure and cold timeout with owned-worker termination', async () => {
    const failed = createWeekFourBranchPythonRuntime({ workerFactory: () => new FakeWorker() });
    const failure = failed.ready();
    latestWorker().emit({ type: 'load-error', error: 'runtime unavailable' });
    await expect(failure).rejects.toMatchObject({ code: 'load-error' } satisfies Partial<WeekFourBranchRuntimeError>);
    expect(latestWorker().terminate).toHaveBeenCalledOnce();

    const timed = createWeekFourBranchPythonRuntime({ coldTimeoutMs: 20, workerFactory: () => new FakeWorker() });
    const timeout = timed.ready();
    const worker = latestWorker();
    const rejected = expect(timeout).rejects.toMatchObject({ code: 'load-timeout' } satisfies Partial<WeekFourBranchRuntimeError>);
    await vi.advanceTimersByTimeAsync(21);
    await rejected;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('creates a fresh generation after load failure and ignores every late message from the failed Worker', async () => {
    const runtime = createWeekFourBranchPythonRuntime({ workerFactory: () => new FakeWorker() });
    const firstReady = runtime.ready();
    const oldWorker = latestWorker();
    oldWorker.emit({ type: 'load-error', error: 'first load failed' });
    await expect(firstReady).rejects.toMatchObject({ code: 'load-error' });

    const secondReady = runtime.ready();
    const newWorker = latestWorker();
    expect(newWorker).not.toBe(oldWorker);
    oldWorker.emit({ type: 'ready' });
    oldWorker.emit({ type: 'result', requestId: 1, trace: runnable(SOLVED_WEEK_FOUR_BRANCH_PYTHON).trace });
    expect(newWorker.postMessage).not.toHaveBeenCalled();
    newWorker.emit({ type: 'ready' });
    await secondReady;

    const running = runtime.run(SOLVED_WEEK_FOUR_BRANCH_PYTHON); await Promise.resolve();
    const request = newWorker.postMessage.mock.calls.at(-1)![0];
    let settled = false; running.finally(() => { settled = true; }).catch(() => undefined);
    oldWorker.emit({ type: 'result', requestId: request.requestId, trace: runnable(SOLVED_WEEK_FOUR_BRANCH_PYTHON).trace });
    await Promise.resolve();
    expect(settled).toBe(false);
    newWorker.emit({ type: 'result', requestId: request.requestId, trace: runnable(SOLVED_WEEK_FOUR_BRANCH_PYTHON).trace });
    await expect(running).resolves.toMatchObject({ run: { state: 'branch-proven', completed: true } });
  });

  it('validates before starting or posting and reserves one cold-start slot', async () => {
    const runtime = createWeekFourBranchPythonRuntime({ workerFactory: () => new FakeWorker() });
    await expect(runtime.run('print(1)')).rejects.toMatchObject({ code: 'validation' } satisfies Partial<WeekFourBranchRuntimeError>);
    expect(FakeWorker.instances).toHaveLength(0);

    const first = runtime.run(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    const firstWorker = latestWorker();
    const second = runtime.run(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    await expect(second).rejects.toMatchObject({ code: 'busy' } satisfies Partial<WeekFourBranchRuntimeError>);
    expect(firstWorker.postMessage).not.toHaveBeenCalled();
    firstWorker.emit({ type: 'ready' });
    await Promise.resolve(); await Promise.resolve();
    expect(firstWorker.postMessage).toHaveBeenCalledOnce();
    runtime.cancel();
    await expect(first).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourBranchRuntimeError>);
  });

  it('times out warm work and cancels both pending and active work', async () => {
    const timed = await readyRuntime({ warmTimeoutMs: 5 });
    const running = timed.run(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    const worker = latestWorker();
    const rejected = expect(running).rejects.toMatchObject({ code: 'timeout' } satisfies Partial<WeekFourBranchRuntimeError>);
    await vi.advanceTimersByTimeAsync(6);
    await rejected;
    expect(worker.terminate).toHaveBeenCalledOnce();

    const pendingRuntime = createWeekFourBranchPythonRuntime({ workerFactory: () => new FakeWorker() });
    const pending = pendingRuntime.run(DEFAULT_WEEK_FOUR_BRANCH_PYTHON);
    const pendingWorker = latestWorker();
    pendingRuntime.cancel();
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourBranchRuntimeError>);
    expect(pendingWorker.terminate).toHaveBeenCalledOnce();
    pendingWorker.emit({ type: 'ready' });
    expect(pendingWorker.postMessage).not.toHaveBeenCalled();

    const activeRuntime = await readyRuntime();
    const active = activeRuntime.run(DEFAULT_WEEK_FOUR_BRANCH_PYTHON); await Promise.resolve();
    activeRuntime.cancel();
    await expect(active).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourBranchRuntimeError>);
  });

  it('preserves same-tick cancellation while a warm run is awaiting its already-ready promise', async () => {
    const runtime = await readyRuntime();
    const warmWorker = latestWorker();
    const running = runtime.run(SOLVED_WEEK_FOUR_BRANCH_PYTHON);
    const cancelled = expect(running).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourBranchRuntimeError>);

    runtime.cancel();

    await cancelled;
    expect(warmWorker.postMessage).not.toHaveBeenCalled();
    expect(warmWorker.terminate).toHaveBeenCalledOnce();

    const nextReady = runtime.ready();
    const nextWorker = latestWorker();
    expect(nextWorker).not.toBe(warmWorker);
    nextWorker.emit({ type: 'ready' });
    await nextReady;
  });

  it('disposes loading and active workers and remains disposed', async () => {
    const loadingRuntime = createWeekFourBranchPythonRuntime({ workerFactory: () => new FakeWorker() });
    const readiness = loadingRuntime.ready();
    const loadingWorker = latestWorker();
    loadingRuntime.dispose();
    await expect(readiness).rejects.toMatchObject({ code: 'disposed' } satisfies Partial<WeekFourBranchRuntimeError>);
    expect(loadingWorker.terminate).toHaveBeenCalledOnce();
    await expect(loadingRuntime.ready()).rejects.toMatchObject({ code: 'disposed' } satisfies Partial<WeekFourBranchRuntimeError>);

    const activeRuntime = await readyRuntime();
    const active = activeRuntime.run(SOLVED_WEEK_FOUR_BRANCH_PYTHON); await Promise.resolve();
    activeRuntime.dispose();
    await expect(active).rejects.toMatchObject({ code: 'disposed' } satisfies Partial<WeekFourBranchRuntimeError>);
  });

  it('ignores wrong request ids, late old workers, and edited-input stale results', async () => {
    const runtime = await readyRuntime();
    const firstWorker = latestWorker();
    const first = runtime.run(DEFAULT_WEEK_FOUR_BRANCH_PYTHON); await Promise.resolve();
    const firstRequest = firstWorker.postMessage.mock.calls.at(-1)![0];
    firstWorker.emit({ type: 'result', requestId: firstRequest.requestId + 1, trace: runnable(DEFAULT_WEEK_FOUR_BRANCH_PYTHON).trace });
    let settled = false; first.finally(() => { settled = true; }).catch(() => undefined);
    await Promise.resolve(); expect(settled).toBe(false);
    runtime.cancel(); await expect(first).rejects.toMatchObject({ code: 'cancelled' });

    const ready = runtime.ready();
    const secondWorker = latestWorker();
    secondWorker.emit({ type: 'ready' }); await ready;
    const second = runtime.run(SOLVED_WEEK_FOUR_BRANCH_PYTHON); await Promise.resolve();
    const secondRequest = secondWorker.postMessage.mock.calls.at(-1)![0];
    firstWorker.emit({ type: 'result', requestId: firstRequest.requestId, trace: runnable(DEFAULT_WEEK_FOUR_BRANCH_PYTHON).trace });
    secondWorker.emit({ type: 'result', requestId: secondRequest.requestId, trace: runnable(DEFAULT_WEEK_FOUR_BRANCH_PYTHON).trace });
    await expect(second).rejects.toMatchObject({ code: 'worker-contract-mismatch' } satisfies Partial<WeekFourBranchRuntimeError>);
  });

  it.each([
    ['native worker error', (worker: FakeWorker, requestId: number) => worker.crash(), 'worker-error'],
    ['malformed message', (worker: FakeWorker, requestId: number) => worker.emit({ type: 'result', requestId, trace: 'not-an-array' }), 'worker-contract-mismatch'],
    ['canonical-looking trace mismatch', (worker: FakeWorker, requestId: number) => {
      const trace = runnable(SOLVED_WEEK_FOUR_BRANCH_PYTHON).trace;
      worker.emit({ type: 'result', requestId, trace: trace.map((event, index) => index === 1 ? { ...event, action: 'polite-help' } : event) });
    }, 'worker-contract-mismatch'],
    ['worker-reported error', (worker: FakeWorker, requestId: number) => worker.emit({ type: 'error', requestId, error: 'denied' }), 'worker-error'],
    ['worker error without request id', (worker: FakeWorker) => worker.emit({ type: 'error', error: 'denied' }), 'worker-contract-mismatch'],
    ['worker error with zero request id', (worker: FakeWorker) => worker.emit({ type: 'error', requestId: 0, error: 'denied' }), 'worker-contract-mismatch'],
    ['worker error with string request id', (worker: FakeWorker) => worker.emit({ type: 'error', requestId: '1', error: 'denied' }), 'worker-contract-mismatch'],
  ] as const)('fails closed on %s', async (_label, emit, code) => {
    const runtime = await readyRuntime();
    const running = runtime.run(SOLVED_WEEK_FOUR_BRANCH_PYTHON); await Promise.resolve();
    const worker = latestWorker();
    const requestId = worker.postMessage.mock.calls.at(-1)![0].requestId;
    emit(worker, requestId);
    await expect(running).rejects.toMatchObject({ code } satisfies Partial<WeekFourBranchRuntimeError>);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('rejects malformed readiness messages instead of trusting unknown data', async () => {
    const runtime = createWeekFourBranchPythonRuntime({ workerFactory: () => new FakeWorker() });
    const ready = runtime.ready();
    const worker = latestWorker();
    worker.emit({ type: 'ready', forged: true });
    await expect(ready).rejects.toMatchObject({ code: 'worker-contract-mismatch' } satisfies Partial<WeekFourBranchRuntimeError>);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});

describe('W4-M3 Worker security contract', () => {
  it('uses only the same-origin pinned runtime and a minimal Python AST/execution surface', () => {
    const source = readFileSync(`${process.cwd()}/src/workers/weekFourBranchPython.worker.ts`, 'utf8');
    expect(source).toContain("new URL('../runtime/pyodide-314.0.2/', self.location.href)");
    expect(source).toContain('runtimeBase.origin !== self.location.origin');
    expect(source).toContain('ast.Module, ast.If, ast.Compare, ast.Eq, ast.Name, ast.Constant, ast.Expr, ast.Call, ast.Load');
    expect(source).toContain('"__builtins__": {}');
    expect(source).toContain('safe_globals =');
    expect(source).not.toMatch(/https?:\/\//);
    expect(source).not.toContain('latest');
    expect(source).not.toContain('eval(');
    expect(source).not.toContain('new Function');
  });

  it('cleans both the JS bridge values and Python harness globals after every run', () => {
    const source = readFileSync(`${process.cwd()}/src/workers/weekFourBranchPython.worker.ts`, 'utf8');
    expect(source).toContain('finally {');
    expect(source).toContain("pyodide.globals.delete('candidate_code')");
    expect(source).toContain("pyodide.globals.delete('result_json')");
    expect(source).toContain('globals().pop(_cleanup_name, None)');
    expect(source).toContain('"validate_and_run"');
    expect(source).toContain('"PUBLIC_CARDS"');
    expect(source).toContain('await pyodide.runPythonAsync(PYTHON_GLOBALS_CLEANUP)');
    expect(source).toContain('const PYTHON_GLOBALS_CLEANUP = String.raw`');
  });
});
