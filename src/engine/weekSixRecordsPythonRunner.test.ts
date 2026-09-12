import { describe, expect, it } from 'vitest';
import { parseWeekSixRecordsPython, SOLVED_WEEK_SIX_RECORDS_PYTHON } from './weekSixRecordsPythonGrammar';
import { createWeekSixRecordsPythonRuntime, WeekSixRecordsRuntimeError, type WeekSixRecordsWorker } from './weekSixRecordsPythonRunner';

class FakeWorker implements WeekSixRecordsWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: (() => void) | null = null;
  terminated = false;
  messages: unknown[] = [];
  postMessage(message: unknown) { this.messages.push(message); }
  terminate() { this.terminated = true; }
  emit(data: unknown) { this.onmessage?.({ data } as MessageEvent<unknown>); }
}

describe('W6-M1 runtime lifecycle', () => {
  it('cancels while the Python runtime is still loading and rejects promptly', async () => {
    const worker = new FakeWorker(); const runtime = createWeekSixRecordsPythonRuntime({ workerFactory: () => worker, coldTimeoutMs: 10_000 });
    const running = runtime.run(SOLVED_WEEK_SIX_RECORDS_PYTHON); runtime.cancel();
    await expect(running).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekSixRecordsRuntimeError>);
    expect(worker.terminated).toBe(true);
  });

  it('ignores a late ready from a cancelled cold Worker and succeeds with a fresh Worker', async () => {
    const workers = [new FakeWorker(), new FakeWorker()]; let index = 0;
    const runtime = createWeekSixRecordsPythonRuntime({ workerFactory: () => workers[index++]!, coldTimeoutMs: 10_000 });
    const cancelled = runtime.run(SOLVED_WEEK_SIX_RECORDS_PYTHON); runtime.cancel();
    await expect(cancelled).rejects.toMatchObject({ code: 'cancelled' } satisfies Partial<WeekSixRecordsRuntimeError>);
    workers[0].emit({ type: 'ready' });
    const running = runtime.run(SOLVED_WEEK_SIX_RECORDS_PYTHON); workers[1].emit({ type: 'ready' }); await Promise.resolve();
    const parsed = parseWeekSixRecordsPython(SOLVED_WEEK_SIX_RECORDS_PYTHON); expect('state' in parsed).toBe(false);
    workers[1].emit({ type: 'result', requestId: 1, trace: 'state' in parsed ? [] : parsed.trace });
    await expect(running).resolves.toMatchObject({ run: { state: 'records-proven', completed: true } });
    expect(workers[0].terminated).toBe(true);
  });

  it('recreates a Worker after load failure and completes the next run', async () => {
    const workers = [new FakeWorker(), new FakeWorker()]; let index = 0;
    const runtime = createWeekSixRecordsPythonRuntime({ workerFactory: () => workers[index++]!, coldTimeoutMs: 10_000 });
    const failed = runtime.ready(); workers[0].emit({ type: 'load-error', error: 'offline' });
    await expect(failed).rejects.toMatchObject({ code: 'load-error' } satisfies Partial<WeekSixRecordsRuntimeError>);
    const running = runtime.run(SOLVED_WEEK_SIX_RECORDS_PYTHON); workers[1].emit({ type: 'ready' }); await Promise.resolve();
    const parsed = parseWeekSixRecordsPython(SOLVED_WEEK_SIX_RECORDS_PYTHON); expect('state' in parsed).toBe(false);
    workers[1].emit({ type: 'result', requestId: 1, trace: 'state' in parsed ? [] : parsed.trace });
    await expect(running).resolves.toMatchObject({ run: { state: 'records-proven', completed: true } });
  });

  it('rejects an active run immediately when the Worker breaks its message contract', async () => {
    const worker = new FakeWorker(); const runtime = createWeekSixRecordsPythonRuntime({ workerFactory: () => worker, warmTimeoutMs: 10_000 });
    const ready = runtime.ready(); worker.emit({ type: 'ready' }); await ready;
    const running = runtime.run(SOLVED_WEEK_SIX_RECORDS_PYTHON); await Promise.resolve(); worker.emit(null);
    await expect(running).rejects.toMatchObject({ code: 'worker-contract-mismatch' } satisfies Partial<WeekSixRecordsRuntimeError>);
    expect(worker.terminated).toBe(true);
  });
});
