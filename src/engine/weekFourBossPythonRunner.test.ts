const SOLVED_WEEK_FOUR_BOSS_PYTHON = 'for card in cards:\n    identity = read_identity(card)\n    if identity == "白骨精":\n        keep_observing(card)\n    else:\n        polite_help(card)';
const NESTED_WEEK_FOUR_BOSS_PYTHON = SOLVED_WEEK_FOUR_BOSS_PYTHON.replace('read_identity', 'read_appearance');
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_WEEK_FOUR_BOSS_PYTHON,
  parseWeekFourBossPython,
} from './weekFourBossPythonGrammar';
import { createWeekFourBossPythonRuntime, WeekFourBossRuntimeError } from './weekFourBossPythonRunner';

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
  const parsed = parseWeekFourBossPython(code);
  if ('state' in parsed) throw new Error('test fixture must be runnable');
  return parsed;
};
const readyRuntime = async (options: Parameters<typeof createWeekFourBossPythonRuntime>[0] = {}) => {
  const runtime = createWeekFourBossPythonRuntime({ ...options, workerFactory: () => new FakeWorker() });
  const ready = runtime.ready();
  latestWorker().emit({ type: 'ready' });
  await ready;
  return runtime;
};

beforeEach(() => { FakeWorker.instances = []; vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('W4-M5 isolated branch Python runtime', () => {
  it.each([DEFAULT_WEEK_FOUR_BOSS_PYTHON, NESTED_WEEK_FOUR_BOSS_PYTHON, SOLVED_WEEK_FOUR_BOSS_PYTHON])('accepts the canonical Worker trace for %s', async (code) => {
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
    const failed = createWeekFourBossPythonRuntime({ workerFactory: () => new FakeWorker() });
    const failure = failed.ready();
    latestWorker().emit({ type: 'load-error', error: 'runtime unavailable' });
    await expect(failure).rejects.toMatchObject({ code: 'load-error' } satisfies Partial<WeekFourBossRuntimeError>);
    expect(latestWorker().terminate).toHaveBeenCalledOnce();

    const timed = createWeekFourBossPythonRuntime({ coldTimeoutMs: 20, workerFactory: () => new FakeWorker() });
    const timeout = timed.ready();
    const worker = latestWorker();
    const rejected = expect(timeout).rejects.toMatchObject({ code: 'load-timeout' } satisfies Partial<WeekFourBossRuntimeError>);
    await vi.advanceTimersByTimeAsync(21);
    await rejected;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('creates a fresh generation after load failure and ignores every late message from the failed Worker', async () => {
    const runtime = createWeekFourBossPythonRuntime({ workerFactory: () => new FakeWorker() });
    const firstReady = runtime.ready();
    const oldWorker = latestWorker();
    oldWorker.emit({ type: 'load-error', error: 'first load failed' });
    await expect(firstReady).rejects.toMatchObject({ code: 'load-error' });

    const secondReady = runtime.ready();
    const newWorker = latestWorker();
    expect(newWorker).not.toBe(oldWorker);
    oldWorker.emit({ type: 'ready' });
    oldWorker.emit({ type: 'result', requestId: 1, trace: runnable(SOLVED_WEEK_FOUR_BOSS_PYTHON).trace });
    expect(newWorker.postMessage).not.toHaveBeenCalled();
    newWorker.emit({ type: 'ready' });
    await secondReady;

    const running = runtime.run(SOLVED_WEEK_FOUR_BOSS_PYTHON); await Promise.resolve();
    const request = newWorker.postMessage.mock.calls.at(-1)![0];
    let settled = false; running.finally(() => { settled = true; }).catch(() => undefined);
    oldWorker.emit({ type: 'result', requestId: request.requestId, trace: runnable(SOLVED_WEEK_FOUR_BOSS_PYTHON).trace });
    await Promise.resolve();
    expect(settled).toBe(false);
    newWorker.emit({ type: 'result', requestId: request.requestId, trace: runnable(SOLVED_WEEK_FOUR_BOSS_PYTHON).trace });
    await expect(running).resolves.toMatchObject({ run: { state: 'station-proven', completed: true } });
  });

  it('validates before starting or posting and reserves one cold-start slot', async () => {
    const runtime = createWeekFourBossPythonRuntime({ workerFactory: () => new FakeWorker() });
    await expect(runtime.run('print(1)')).rejects.toMatchObject({ code: 'validation' } satisfies Partial<WeekFourBossRuntimeError>);
    expect(FakeWorker.instances).toHaveLength(0);

    const first = runtime.run(SOLVED_WEEK_FOUR_BOSS_PYTHON);
    const firstWorker = latestWorker();
    const second = runtime.run(DEFAULT_WEEK_FOUR_BOSS_PYTHON);
    await expect(second).rejects.toMatchObject({ code: 'busy' } satisfies Partial<WeekFourBossRuntimeError>);
    expect(firstWorker.postMessage).not.toHaveBeenCalled();
    firstWorker.emit({ type: 'ready' });
    await Promise.resolve(); await Promise.resolve();
    expect(firstWorker.postMessage).toHaveBeenCalledOnce();
    runtime.cancel();
    await expect(first).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourBossRuntimeError>);
  });

  it('times out warm work and cancels both pending and active work', async () => {
    const timed = await readyRuntime({ warmTimeoutMs: 5 });
    const running = timed.run(SOLVED_WEEK_FOUR_BOSS_PYTHON);
    const worker = latestWorker();
    const rejected = expect(running).rejects.toMatchObject({ code: 'timeout' } satisfies Partial<WeekFourBossRuntimeError>);
    await vi.advanceTimersByTimeAsync(6);
    await rejected;
    expect(worker.terminate).toHaveBeenCalledOnce();

    const pendingRuntime = createWeekFourBossPythonRuntime({ workerFactory: () => new FakeWorker() });
    const pending = pendingRuntime.run(DEFAULT_WEEK_FOUR_BOSS_PYTHON);
    const pendingWorker = latestWorker();
    pendingRuntime.cancel();
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourBossRuntimeError>);
    expect(pendingWorker.terminate).toHaveBeenCalledOnce();
    pendingWorker.emit({ type: 'ready' });
    expect(pendingWorker.postMessage).not.toHaveBeenCalled();

    const activeRuntime = await readyRuntime();
    const active = activeRuntime.run(DEFAULT_WEEK_FOUR_BOSS_PYTHON); await Promise.resolve();
    activeRuntime.cancel();
    await expect(active).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourBossRuntimeError>);
  });

  it('preserves same-tick cancellation while a warm run is awaiting its already-ready promise', async () => {
    const runtime = await readyRuntime();
    const warmWorker = latestWorker();
    const running = runtime.run(SOLVED_WEEK_FOUR_BOSS_PYTHON);
    const cancelled = expect(running).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourBossRuntimeError>);

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
    const loadingRuntime = createWeekFourBossPythonRuntime({ workerFactory: () => new FakeWorker() });
    const readiness = loadingRuntime.ready();
    const loadingWorker = latestWorker();
    loadingRuntime.dispose();
    await expect(readiness).rejects.toMatchObject({ code: 'disposed' } satisfies Partial<WeekFourBossRuntimeError>);
    expect(loadingWorker.terminate).toHaveBeenCalledOnce();
    await expect(loadingRuntime.ready()).rejects.toMatchObject({ code: 'disposed' } satisfies Partial<WeekFourBossRuntimeError>);

    const activeRuntime = await readyRuntime();
    const active = activeRuntime.run(SOLVED_WEEK_FOUR_BOSS_PYTHON); await Promise.resolve();
    activeRuntime.dispose();
    await expect(active).rejects.toMatchObject({ code: 'disposed' } satisfies Partial<WeekFourBossRuntimeError>);
  });

  it('ignores wrong request ids, late old workers, and edited-input stale results', async () => {
    const runtime = await readyRuntime();
    const firstWorker = latestWorker();
    const first = runtime.run(DEFAULT_WEEK_FOUR_BOSS_PYTHON); await Promise.resolve();
    const firstRequest = firstWorker.postMessage.mock.calls.at(-1)![0];
    firstWorker.emit({ type: 'result', requestId: firstRequest.requestId + 1, trace: runnable(DEFAULT_WEEK_FOUR_BOSS_PYTHON).trace });
    let settled = false; first.finally(() => { settled = true; }).catch(() => undefined);
    await Promise.resolve(); expect(settled).toBe(false);
    runtime.cancel(); await expect(first).rejects.toMatchObject({ code: 'cancelled' });

    const ready = runtime.ready();
    const secondWorker = latestWorker();
    secondWorker.emit({ type: 'ready' }); await ready;
    const second = runtime.run(SOLVED_WEEK_FOUR_BOSS_PYTHON); await Promise.resolve();
    const secondRequest = secondWorker.postMessage.mock.calls.at(-1)![0];
    firstWorker.emit({ type: 'result', requestId: firstRequest.requestId, trace: runnable(DEFAULT_WEEK_FOUR_BOSS_PYTHON).trace });
    secondWorker.emit({ type: 'result', requestId: secondRequest.requestId, trace: runnable(DEFAULT_WEEK_FOUR_BOSS_PYTHON).trace });
    await expect(second).rejects.toMatchObject({ code: 'worker-contract-mismatch' } satisfies Partial<WeekFourBossRuntimeError>);
  });

  it.each([
    ['native worker error', (worker: FakeWorker, requestId: number) => worker.crash(), 'worker-error'],
    ['malformed message', (worker: FakeWorker, requestId: number) => worker.emit({ type: 'result', requestId, trace: 'not-an-array' }), 'worker-contract-mismatch'],
    ['canonical-looking trace mismatch', (worker: FakeWorker, requestId: number) => {
      const trace = runnable(SOLVED_WEEK_FOUR_BOSS_PYTHON).trace;
      worker.emit({ type: 'result', requestId, trace: trace.map((event, index) => index === 1 ? { ...event, action: 'polite-help' } : event) });
    }, 'worker-contract-mismatch'],
    ['worker-reported error', (worker: FakeWorker, requestId: number) => worker.emit({ type: 'error', requestId, error: 'denied' }), 'worker-error'],
    ['worker error without request id', (worker: FakeWorker) => worker.emit({ type: 'error', error: 'denied' }), 'worker-contract-mismatch'],
    ['worker error with zero request id', (worker: FakeWorker) => worker.emit({ type: 'error', requestId: 0, error: 'denied' }), 'worker-contract-mismatch'],
    ['worker error with string request id', (worker: FakeWorker) => worker.emit({ type: 'error', requestId: '1', error: 'denied' }), 'worker-contract-mismatch'],
  ] as const)('fails closed on %s', async (_label, emit, code) => {
    const runtime = await readyRuntime();
    const running = runtime.run(SOLVED_WEEK_FOUR_BOSS_PYTHON); await Promise.resolve();
    const worker = latestWorker();
    const requestId = worker.postMessage.mock.calls.at(-1)![0].requestId;
    emit(worker, requestId);
    await expect(running).rejects.toMatchObject({ code } satisfies Partial<WeekFourBossRuntimeError>);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('rejects malformed readiness messages instead of trusting unknown data', async () => {
    const runtime = createWeekFourBossPythonRuntime({ workerFactory: () => new FakeWorker() });
    const ready = runtime.ready();
    const worker = latestWorker();
    worker.emit({ type: 'ready', forged: true });
    await expect(ready).rejects.toMatchObject({ code: 'worker-contract-mismatch' } satisfies Partial<WeekFourBossRuntimeError>);
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
