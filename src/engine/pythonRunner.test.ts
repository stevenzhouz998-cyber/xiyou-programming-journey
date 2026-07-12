import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { runPython } from './pythonRunner';

class FakeWorker {
  static latest: FakeWorker;
  onmessage: ((event: MessageEvent<any>) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() { FakeWorker.latest = this; }
  emit(data: object) { this.onmessage?.({ data } as MessageEvent); }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('terminates with a stable error when runtime is not ready in three seconds', async () => {
  const result = runPython("print('ok')");
  await vi.advanceTimersByTimeAsync(3000);
  await expect(result).resolves.toEqual({ output: '', error: '运行环境超过 3 秒未就绪，已安全停止。请检查网络后再试。' });
  expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
});

it('clears the load timer, sends code, and accepts a normal result', async () => {
  const result = runPython("print('ok')");
  await vi.advanceTimersByTimeAsync(2500);
  FakeWorker.latest.emit({ type: 'ready' });
  expect(FakeWorker.latest.postMessage).toHaveBeenCalledWith({ code: "print('ok')" });
  await vi.advanceTimersByTimeAsync(600);
  FakeWorker.latest.emit({ type: 'result', output: 'ok' });
  await expect(result).resolves.toEqual({ output: 'ok' });
  expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
});

it('times out execution three seconds after ready', async () => {
  const result = runPython("print('ok')");
  FakeWorker.latest.emit({ type: 'ready' });
  await vi.advanceTimersByTimeAsync(3000);
  await expect(result).resolves.toEqual({ output: '', error: '运行超过 3 秒，已安全停止。检查循环条件再试一次。' });
});

it('reports worker errors and terminates', async () => {
  const result = runPython("print('ok')");
  FakeWorker.latest.onerror?.();
  await expect(result).resolves.toEqual({ output: '', error: 'Python 运行环境暂时没有准备好，请稍后再试。' });
  expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
});

it('ignores late messages after cleanup', async () => {
  const result = runPython("print('ok')");
  FakeWorker.latest.emit({ type: 'ready' });
  FakeWorker.latest.emit({ type: 'result', output: 'first' });
  await expect(result).resolves.toEqual({ output: 'first' });
  FakeWorker.latest.emit({ type: 'result', output: 'late' });
  await vi.advanceTimersByTimeAsync(4000);
  expect(FakeWorker.latest.terminate).toHaveBeenCalledOnce();
});
