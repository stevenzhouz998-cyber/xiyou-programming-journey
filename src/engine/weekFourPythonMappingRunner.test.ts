import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WEEK_FOUR_MAPPING_CARDS } from '../blockly/weekFourMappingContract';
import { SOLVED_WEEK_FOUR_MAPPING_PYTHON } from './weekFourPythonMappingGrammar';
import { createWeekFourPythonRuntime } from './weekFourPythonMappingRunner';

class FakeWorker {
  static latest: FakeWorker;
  onmessage: ((event: MessageEvent<any>) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn(); terminate = vi.fn();
  constructor() { FakeWorker.latest = this; }
  emit(data: object) { this.onmessage?.({ data } as MessageEvent); }
}

beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('Worker', FakeWorker); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('W4-M1 dedicated Python worker runtime', () => {
  it('preheats then returns the two-card structured trace', async () => {
    const runtime = createWeekFourPythonRuntime({ coldTimeoutMs: 20_000, warmTimeoutMs: 1_000 });
    const ready = runtime.ready(); FakeWorker.latest.emit({ type: 'ready' }); await ready;
    const running = runtime.run(SOLVED_WEEK_FOUR_MAPPING_PYTHON, WEEK_FOUR_MAPPING_CARDS);
    await Promise.resolve();
    const request = FakeWorker.latest.postMessage.mock.calls.at(-1)![0].requestId;
    FakeWorker.latest.emit({ type: 'result', requestId: request, trace: [{ cardId: 'canon-mysterious-visitor', field: 'identity', value: '白骨精', conditionResult: true, branchAction: 'continue-verification', finalSceneState: 'verification-continued', source: { kind: 'python', line: 1, from: 3, to: 11 } }, { cardId: 'practice-mountain-traveller', field: 'identity', value: '普通人', conditionResult: false, branchAction: 'polite-pass', finalSceneState: 'traveller-cleared', source: { kind: 'python', line: 1, from: 3, to: 11 } }] });
    await expect(running).resolves.toMatchObject({ trace: [{ cardId: 'canon-mysterious-visitor' }, { cardId: 'practice-mountain-traveller' }] });
    runtime.dispose();
  });

  it('lets an in-flight prewarm settle before terminating its Worker during route disposal', async () => {
    const runtime = createWeekFourPythonRuntime({ coldTimeoutMs: 20_000, warmTimeoutMs: 1_000 });
    const ready = runtime.ready();
    runtime.dispose();
    expect(FakeWorker.latest.terminate).not.toHaveBeenCalled();
    FakeWorker.latest.emit({ type: 'ready' });
    await ready;
    await Promise.resolve();
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
  });

  it('cancels and ignores a late result', async () => {
    const runtime = createWeekFourPythonRuntime({ coldTimeoutMs: 20_000, warmTimeoutMs: 1_000 });
    const ready = runtime.ready(); FakeWorker.latest.emit({ type: 'ready' }); await ready;
    const running = runtime.run(SOLVED_WEEK_FOUR_MAPPING_PYTHON, WEEK_FOUR_MAPPING_CARDS);
    await Promise.resolve();
    runtime.cancel();
    await expect(running).rejects.toThrow(/取消/);
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
  });

  it('rejects an active Worker error immediately and ignores a late error for another request', async () => {
    const runtime = createWeekFourPythonRuntime({ coldTimeoutMs: 20_000, warmTimeoutMs: 1_000 });
    const ready = runtime.ready(); FakeWorker.latest.emit({ type: 'ready' }); await ready;
    const running = runtime.run(SOLVED_WEEK_FOUR_MAPPING_PYTHON, WEEK_FOUR_MAPPING_CARDS);
    await Promise.resolve();
    const requestId = FakeWorker.latest.postMessage.mock.calls.at(-1)![0].requestId;
    FakeWorker.latest.emit({ type: 'error', requestId, error: '受限 Python 拒绝本次运行' });
    await expect(running).rejects.toThrow('受限 Python 拒绝本次运行');
    await vi.advanceTimersByTimeAsync(1_001);
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
    FakeWorker.latest.emit({ type: 'error', requestId: requestId + 1, error: '迟到错误' });
  });

  it('rejects an active native Worker error immediately instead of waiting for the warm timeout', async () => {
    const runtime = createWeekFourPythonRuntime({ coldTimeoutMs: 20_000, warmTimeoutMs: 1_000 });
    const ready = runtime.ready(); FakeWorker.latest.emit({ type: 'ready' }); await ready;
    const running = runtime.run(SOLVED_WEEK_FOUR_MAPPING_PYTHON, WEEK_FOUR_MAPPING_CARDS);
    await Promise.resolve();
    FakeWorker.latest.onerror?.();
    await expect(running).rejects.toThrow('Python Worker 错误。');
    expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
  });
});
