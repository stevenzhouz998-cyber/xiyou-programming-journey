import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON, SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON, parseWeekFiveStoryOrchestrationPython } from './weekFiveStoryOrchestrationPythonGrammar';
import { createWeekFiveStoryOrchestrationPythonRuntime } from './weekFiveStoryOrchestrationPythonRunner';

class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { FakeWorker.instances.push(this); }
  emit(data: unknown) { this.onmessage?.({ data } as MessageEvent<unknown>); }
}
const latest = () => FakeWorker.instances.at(-1)!;
const parsed = (code: string) => { const value = parseWeekFiveStoryOrchestrationPython(code); if ('state' in value) throw Error('fixture'); return value; };
const ready = async (options: Parameters<typeof createWeekFiveStoryOrchestrationPythonRuntime>[0] = {}) => {
  const runtime = createWeekFiveStoryOrchestrationPythonRuntime({ ...options, workerFactory: () => new FakeWorker() });
  const promise = runtime.ready(); latest().emit({ type: 'ready' }); await promise; return runtime;
};

beforeEach(() => { FakeWorker.instances = []; vi.useFakeTimers(); });
afterEach(() => vi.useRealTimers());

describe('W5-M5 isolated story orchestration runtime', () => {
  it.each([DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON, SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON])('accepts only the exact current Worker trace', async (code) => {
    const runtime = await ready(); const expected = parsed(code); const running = runtime.run(code); await Promise.resolve();
    const request = latest().postMessage.mock.calls.at(-1)![0]; latest().emit({ type: 'result', requestId: request.requestId, trace: structuredClone(expected.trace) });
    await expect(running).resolves.toEqual({ trace: expected.trace, run: expected.run });
  });

  it('rejects invalid source before Worker creation and fails closed on a forged result', async () => {
    const cold = createWeekFiveStoryOrchestrationPythonRuntime({ workerFactory: () => new FakeWorker() });
    await expect(cold.run('import os')).rejects.toMatchObject({ code: 'validation' }); expect(FakeWorker.instances).toHaveLength(0);
    const runtime = await ready(); const running = runtime.run(SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON); await Promise.resolve();
    const worker = latest(); const request = worker.postMessage.mock.calls.at(-1)![0]; worker.emit({ type: 'result', requestId: request.requestId, trace: parsed(DEFAULT_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON).trace });
    await expect(running).rejects.toMatchObject({ code: 'worker-contract-mismatch' }); expect(worker.terminate).toHaveBeenCalledOnce();
  });

  it('handles load failure, timeout, cancellation, disposal and late generations', async () => {
    const failed = createWeekFiveStoryOrchestrationPythonRuntime({ workerFactory: () => new FakeWorker() }); const failure = failed.ready(); const old = latest(); old.emit({ type: 'load-error' }); await expect(failure).rejects.toMatchObject({ code: 'load-error' });
    const timed = createWeekFiveStoryOrchestrationPythonRuntime({ coldTimeoutMs: 5, workerFactory: () => new FakeWorker() }); const readiness = timed.ready(); const coldWorker = latest(); const rejected = expect(readiness).rejects.toMatchObject({ code: 'load-timeout' }); await vi.advanceTimersByTimeAsync(6); await rejected; expect(coldWorker.terminate).toHaveBeenCalledOnce();
    const warm = await ready({ warmTimeoutMs: 5 }); const warmRun = warm.run(SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON); const warmWorker = latest(); const warmRejected = expect(warmRun).rejects.toMatchObject({ code: 'timeout' }); await vi.advanceTimersByTimeAsync(6); await warmRejected; expect(warmWorker.terminate).toHaveBeenCalledOnce();
    const pending = createWeekFiveStoryOrchestrationPythonRuntime({ workerFactory: () => new FakeWorker() }); const pendingRun = pending.run(SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON); const pendingWorker = latest(); pending.cancel(); await expect(pendingRun).rejects.toMatchObject({ code: 'cancelled' }); pendingWorker.emit({ type: 'ready' }); expect(pendingWorker.postMessage).not.toHaveBeenCalled();
    const active = await ready(); const activeRun = active.run(SOLVED_WEEK_FIVE_STORY_ORCHESTRATION_PYTHON); await Promise.resolve(); const activeWorker = latest(); active.dispose(); await expect(activeRun).rejects.toMatchObject({ code: 'disposed' }); old.emit({ type: 'ready' });
  });
});
