import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SOLVED_WEEK_FOUR_VARIABLE_PYTHON } from './weekFourVariablePythonGrammar';
import { createWeekFourVariablePythonRuntime, WeekFourVariableRuntimeError } from './weekFourVariablePythonRunner';

class FakeWorker {
  static latest: FakeWorker;
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<any>) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { FakeWorker.latest = this; FakeWorker.instances.push(this); }
  emit(data: object) { this.onmessage?.({ data } as MessageEvent); }
}

const sealedTrace = [
  { kind: 'assign', line: 1, target: 'appearance', source: 'ordinary-eyes', value: '送斋女子', previousValue: null, overwrote: false, span: { line: 1, from: 0, to: 10 } },
  { kind: 'assign', line: 2, target: 'identity', source: 'fiery-eye-check', value: '白骨精', previousValue: null, overwrote: false, span: { line: 2, from: 0, to: 8 } },
  { kind: 'seal', line: 3, executed: true, appearance: '送斋女子', identity: '白骨精', missingVariable: null, span: { line: 3, from: 0, to: 33 } },
];

beforeEach(() => { FakeWorker.instances = []; vi.useFakeTimers(); vi.stubGlobal('Worker', FakeWorker); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('W4-M2 isolated variable Python runtime', () => {
  it('prewarms then posts only parsed code and the editable source span', async () => {
    const runtime = createWeekFourVariablePythonRuntime({ coldTimeoutMs: 20_000, warmTimeoutMs: 1_000 });
    const ready = runtime.ready();
    FakeWorker.latest.emit({ type: 'ready' });
    await ready;

    const running = runtime.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);
    await Promise.resolve();
    const requestId = FakeWorker.latest.postMessage.mock.calls.at(-1)![0].requestId;
    expect(FakeWorker.latest.postMessage).toHaveBeenLastCalledWith({ type: 'run', requestId, code: SOLVED_WEEK_FOUR_VARIABLE_PYTHON, sourceSpan: { line: 2, from: 0, to: 8 } });
    FakeWorker.latest.emit({ type: 'result', requestId, trace: sealedTrace });

    await expect(running).resolves.toMatchObject({ run: { completed: true, finalState: 'evidence-sealed' }, trace: sealedTrace });
  });

  it('fails closed when the Worker trace is not both canonical and byte-for-byte equivalent to grammar', async () => {
    const runtime = createWeekFourVariablePythonRuntime();
    const ready = runtime.ready(); FakeWorker.latest.emit({ type: 'ready' }); await ready;
    const running = runtime.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON); await Promise.resolve();
    const requestId = FakeWorker.latest.postMessage.mock.calls.at(-1)![0].requestId;
    FakeWorker.latest.emit({ type: 'result', requestId, trace: [{ ...sealedTrace[0], value: '白骨精' }, sealedTrace[1], sealedTrace[2]] });

    await expect(running).rejects.toMatchObject({ code: 'worker-contract-mismatch' } satisfies Partial<WeekFourVariableRuntimeError>);
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
  });

  it('rejects parse errors before posting, rejects duplicate work, and ignores late replies', async () => {
    const runtime = createWeekFourVariablePythonRuntime();
    const ready = runtime.ready(); FakeWorker.latest.emit({ type: 'ready' }); await ready;
    await expect(runtime.run('print(1)')).rejects.toThrow();
    expect(FakeWorker.latest.postMessage).not.toHaveBeenCalled();

    const running = runtime.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON); await Promise.resolve();
    const requestId = FakeWorker.latest.postMessage.mock.calls.at(-1)![0].requestId;
    await expect(runtime.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON)).rejects.toMatchObject({ code: 'busy' } satisfies Partial<WeekFourVariableRuntimeError>);
    runtime.cancel();
    await expect(running).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourVariableRuntimeError>);
    FakeWorker.latest.emit({ type: 'result', requestId, trace: sealedTrace });
  });

  it('allows only one run to leave the cold-start queue', async () => {
    const runtime = createWeekFourVariablePythonRuntime();
    const first = runtime.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);
    const second = runtime.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);

    FakeWorker.latest.emit({ type: 'ready' });
    await Promise.resolve();
    await Promise.resolve();

    expect(FakeWorker.latest.postMessage).toHaveBeenCalledTimes(1);
    runtime.cancel();
    await expect(first).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourVariableRuntimeError>);
    await expect(second).rejects.toMatchObject({ code: 'busy' } satisfies Partial<WeekFourVariableRuntimeError>);
  });

  it('terminates a Worker that never reaches ready at the 20 second cold-start boundary', async () => {
    const runtime = createWeekFourVariablePythonRuntime({ coldTimeoutMs: 20_000 });
    const ready = runtime.ready();
    const timeoutExpectation = expect(ready).rejects.toMatchObject({ code: 'load-timeout' } satisfies Partial<WeekFourVariableRuntimeError>);

    await vi.advanceTimersByTimeAsync(20_001);

    await timeoutExpectation;
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
  });

  it('cancels a run still waiting for cold readiness and ignores its late ready event', async () => {
    const runtime = createWeekFourVariablePythonRuntime();
    const pending = runtime.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);
    const cancelled = expect(pending).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourVariableRuntimeError>);
    const loadingWorker = FakeWorker.latest;

    runtime.cancel();
    expect(loadingWorker.terminate).toHaveBeenCalledOnce();
    await cancelled;
    loadingWorker.emit({ type: 'ready' });
    await Promise.resolve();
    expect(loadingWorker.postMessage).not.toHaveBeenCalled();
  });

  it('ignores old Worker load errors and native errors after a newer generation starts', async () => {
    const runtime = createWeekFourVariablePythonRuntime();
    const first = runtime.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);
    const firstCancelled = expect(first).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekFourVariableRuntimeError>);
    const oldWorker = FakeWorker.latest;
    runtime.cancel();
    await firstCancelled;

    const newerReady = runtime.ready();
    const newerWorker = FakeWorker.latest;
    expect(newerWorker).not.toBe(oldWorker);
    oldWorker.emit({ type: 'load-error', error: 'late old load error' });
    oldWorker.onerror?.();
    expect(newerWorker.terminate).not.toHaveBeenCalled();
    newerWorker.emit({ type: 'ready' });
    await newerReady;
  });

  it('disposes a loading Worker immediately and rejects loading readiness as disposed', async () => {
    const runtime = createWeekFourVariablePythonRuntime();
    const ready = runtime.ready();
    const loadingWorker = FakeWorker.latest;
    const disposed = expect(ready).rejects.toMatchObject({ code: 'disposed' } satisfies Partial<WeekFourVariableRuntimeError>);

    runtime.dispose();
    expect(loadingWorker.terminate).toHaveBeenCalledOnce();
    await disposed;
    loadingWorker.emit({ type: 'ready' });
    expect(loadingWorker.postMessage).not.toHaveBeenCalled();
  });

  it('handles load errors, warm timeout, native errors and disposal without accepting stale runs', async () => {
    const loadFailed = createWeekFourVariablePythonRuntime();
    const ready = loadFailed.ready(); FakeWorker.latest.emit({ type: 'load-error', error: 'runtime unavailable' });
    await expect(ready).rejects.toMatchObject({ code: 'load-error' } satisfies Partial<WeekFourVariableRuntimeError>);

    const timed = createWeekFourVariablePythonRuntime({ warmTimeoutMs: 1 });
    const timedReady = timed.ready(); FakeWorker.latest.emit({ type: 'ready' }); await timedReady;
    const running = timed.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON);
    const timeoutExpectation = expect(running).rejects.toMatchObject({ code: 'timeout' } satisfies Partial<WeekFourVariableRuntimeError>);
    await vi.advanceTimersByTimeAsync(2);
    await timeoutExpectation;

    const crashed = createWeekFourVariablePythonRuntime();
    const crashedReady = crashed.ready(); FakeWorker.latest.emit({ type: 'ready' }); await crashedReady;
    const native = crashed.run(SOLVED_WEEK_FOUR_VARIABLE_PYTHON); await Promise.resolve(); FakeWorker.latest.onerror?.();
    await expect(native).rejects.toMatchObject({ code: 'worker-error' } satisfies Partial<WeekFourVariableRuntimeError>);

    const disposed = createWeekFourVariablePythonRuntime();
    const disposeReady = disposed.ready(); const disposal = expect(disposeReady).rejects.toMatchObject({ code: 'disposed' } satisfies Partial<WeekFourVariableRuntimeError>);
    disposed.dispose(); FakeWorker.latest.emit({ type: 'ready' }); await disposal;
    await expect(disposed.ready()).rejects.toMatchObject({ code: 'disposed' } satisfies Partial<WeekFourVariableRuntimeError>);
  });
});
