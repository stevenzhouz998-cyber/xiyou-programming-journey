import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_WEEK_FIVE_FUNCTION_PYTHON, parseWeekFiveFunctionPython } from './weekFiveFunctionPythonGrammar';
import { createWeekFiveFunctionPythonRuntime, WeekFiveFunctionRuntimeError } from './weekFiveFunctionPythonRunner';

const SOLVED = `${DEFAULT_WEEK_FIVE_FUNCTION_PYTHON}\n\nrecord_sanqing()`;
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn(); terminate = vi.fn();
  constructor() { FakeWorker.instances.push(this); }
  emit(data: unknown) { this.onmessage?.({ data } as MessageEvent<unknown>); }
  crash() { this.onerror?.(); }
}
const latest = () => FakeWorker.instances.at(-1)!;
const parsed = (code: string) => { const value = parseWeekFiveFunctionPython(code); if ('state' in value) throw new Error('fixture'); return value; };
const readyRuntime = async (options: Parameters<typeof createWeekFiveFunctionPythonRuntime>[0] = {}) => {
  const runtime = createWeekFiveFunctionPythonRuntime({ ...options, workerFactory: () => new FakeWorker() });
  const ready = runtime.ready(); latest().emit({ type: 'ready' }); await ready; return runtime;
};
beforeEach(() => { FakeWorker.instances = []; vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());

describe('W5-M2 isolated Python runtime', () => {
  it.each([DEFAULT_WEEK_FIVE_FUNCTION_PYTHON, SOLVED, `${SOLVED}\nrecord_sanqing()`])('accepts only the exact current Worker trace', async (code) => {
    const runtime = await readyRuntime(); const expected = parsed(code); const running = runtime.run(code); await Promise.resolve();
    const request = latest().postMessage.mock.calls.at(-1)![0];
    latest().emit({ type: 'result', requestId: request.requestId, trace: structuredClone(expected.trace) });
    await expect(running).resolves.toEqual({ trace: expected.trace, run: expected.run });
  });

  it('rejects structure before Worker creation and fails closed on forged results', async () => {
    const cold = createWeekFiveFunctionPythonRuntime({ workerFactory: () => new FakeWorker() });
    await expect(cold.run('import os')).rejects.toMatchObject({ code: 'validation' } satisfies Partial<WeekFiveFunctionRuntimeError>);
    expect(FakeWorker.instances).toHaveLength(0);
    const runtime = await readyRuntime(); const running = runtime.run(SOLVED); await Promise.resolve(); const worker = latest(); const request = worker.postMessage.mock.calls.at(-1)![0];
    worker.emit({ type: 'result', requestId: request.requestId, trace: parsed(DEFAULT_WEEK_FIVE_FUNCTION_PYTHON).trace });
    await expect(running).rejects.toMatchObject({ code: 'worker-contract-mismatch' }); expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('handles load failure, cold timeout, warm timeout, cancellation, disposal and late generations', async () => {
    const failed = createWeekFiveFunctionPythonRuntime({ workerFactory: () => new FakeWorker() }); const failure = failed.ready(); const old = latest(); old.emit({ type: 'load-error' }); await expect(failure).rejects.toMatchObject({ code: 'load-error' });
    const timed = createWeekFiveFunctionPythonRuntime({ coldTimeoutMs: 5, workerFactory: () => new FakeWorker() }); const readiness = timed.ready(); const coldWorker = latest(); const coldRejected = expect(readiness).rejects.toMatchObject({ code: 'load-timeout' }); await vi.advanceTimersByTimeAsync(6); await coldRejected; expect(coldWorker.terminate).toHaveBeenCalledOnce();
    const warm = await readyRuntime({ warmTimeoutMs: 5 }); const warmRun = warm.run(SOLVED); const warmWorker = latest(); const warmRejected = expect(warmRun).rejects.toMatchObject({ code: 'timeout' }); await vi.advanceTimersByTimeAsync(6); await warmRejected; expect(warmWorker.terminate).toHaveBeenCalledOnce();
    const pending = createWeekFiveFunctionPythonRuntime({ workerFactory: () => new FakeWorker() }); const pendingRun = pending.run(SOLVED); const pendingWorker = latest(); pending.cancel(); await expect(pendingRun).rejects.toMatchObject({ code: 'cancelled' }); pendingWorker.emit({ type: 'ready' }); expect(pendingWorker.postMessage).not.toHaveBeenCalled();
    const active = await readyRuntime(); const activeRun = active.run(SOLVED); await Promise.resolve(); const activeWorker = latest(); active.dispose(); await expect(activeRun).rejects.toMatchObject({ code: 'disposed' }); expect(activeWorker.terminate).toHaveBeenCalledOnce();
    old.emit({ type: 'ready' }); old.emit({ type: 'result', requestId: 1, trace: parsed(SOLVED).trace });
  });

  it.each([
    ['worker crash', (worker: FakeWorker, id: number) => worker.crash(), 'worker-error'],
    ['malformed', (worker: FakeWorker, id: number) => worker.emit({ type: 'result', requestId: id, trace: Object.create(null) }), 'worker-contract-mismatch'],
    ['bad readiness', (worker: FakeWorker, id: number) => worker.emit({ type: 'ready', extra: true }), 'worker-contract-mismatch'],
  ] as const)('fails closed on %s', async (_label, emit, code) => {
    const runtime = await readyRuntime(); const running = runtime.run(SOLVED); await Promise.resolve(); const worker = latest(); const id = worker.postMessage.mock.calls.at(-1)![0].requestId; emit(worker, id); await expect(running).rejects.toMatchObject({ code }); expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
