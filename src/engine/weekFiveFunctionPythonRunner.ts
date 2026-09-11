import { runWeekFiveFunctionTrace, type WeekFiveFunctionRunResult, type WeekFiveFunctionTraceItem } from './weekFiveFunctionContract';
import { parseWeekFiveFunctionPython } from './weekFiveFunctionPythonGrammar';

export type WeekFiveFunctionRuntimeErrorCode = 'validation' | 'disposed' | 'busy' | 'load-error' | 'load-timeout' | 'timeout' | 'cancelled' | 'worker-error' | 'worker-contract-mismatch';
export class WeekFiveFunctionRuntimeError extends Error {
  constructor(public readonly code: WeekFiveFunctionRuntimeErrorCode, message: string) { super(message); this.name = 'WeekFiveFunctionRuntimeError'; }
}
export interface WeekFiveFunctionWorker { onmessage: ((event: MessageEvent<unknown>) => void) | null; onerror: (() => void) | null; postMessage(message: unknown): void; terminate(): void }
export interface WeekFiveFunctionPythonRun { trace: WeekFiveFunctionTraceItem[]; run: WeekFiveFunctionRunResult }
export interface WeekFiveFunctionPythonRuntime { ready(): Promise<void>; run(code: unknown): Promise<WeekFiveFunctionPythonRun>; cancel(): void; dispose(): void }
type RuntimeOptions = { coldTimeoutMs?: number; warmTimeoutMs?: number; workerFactory?: () => WeekFiveFunctionWorker };
type WorkerState = { worker: WeekFiveFunctionWorker; generation: number; readyPromise: Promise<void>; resolveReady: () => void; rejectReady: (reason: Error) => void; readyTimer: ReturnType<typeof setTimeout>; status: 'loading' | 'ready' | 'failed' };
type PendingRun = { state: WorkerState; reason: WeekFiveFunctionRuntimeError | null };
type ActiveRun = { id: number; state: WorkerState; expectedTrace: WeekFiveFunctionTraceItem[]; expectedRun: WeekFiveFunctionRunResult; timer: ReturnType<typeof setTimeout>; resolve: (value: WeekFiveFunctionPythonRun) => void; reject: (reason: Error) => void };

const exactKeys = (value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Reflect.ownKeys(value);
  return keys.every((key) => typeof key === 'string') && required.every((key) => keys.includes(key)) && (keys as string[]).every((key) => required.includes(key) || optional.includes(key));
};
type WorkerMessage = { type: 'ready' } | { type: 'load-error'; error?: string } | { type: 'error'; requestId: number; error?: string } | { type: 'result'; requestId: number; trace: unknown };
function narrowMessage(value: unknown): WorkerMessage | null {
  if (!exactKeys(value, ['type'], ['error', 'requestId', 'trace']) || typeof value.type !== 'string') return null;
  if (value.type === 'ready') return exactKeys(value, ['type']) ? { type: 'ready' } : null;
  if (value.type === 'load-error') return exactKeys(value, ['type'], ['error']) && (value.error === undefined || typeof value.error === 'string') ? { type: 'load-error', ...(value.error === undefined ? {} : { error: value.error }) } : null;
  if (value.type === 'error') return exactKeys(value, ['type', 'requestId'], ['error']) && Number.isSafeInteger(value.requestId) && (value.requestId as number) > 0 && (value.error === undefined || typeof value.error === 'string') ? { type: 'error', requestId: value.requestId as number, ...(value.error === undefined ? {} : { error: value.error }) } : null;
  if (value.type === 'result') return exactKeys(value, ['type', 'requestId', 'trace']) && Number.isSafeInteger(value.requestId) && (value.requestId as number) > 0 ? { type: 'result', requestId: value.requestId as number, trace: value.trace } : null;
  return null;
}
const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

export function createWeekFiveFunctionPythonRuntime(options: RuntimeOptions = {}): WeekFiveFunctionPythonRuntime {
  const coldTimeoutMs = options.coldTimeoutMs ?? 20_000;
  const warmTimeoutMs = options.warmTimeoutMs ?? 1_000;
  const workerFactory = options.workerFactory ?? (() => new Worker(new URL('../workers/weekFiveFunctionPython.worker.ts', import.meta.url), { type: 'module' }) as unknown as WeekFiveFunctionWorker);
  let current: WorkerState | null = null; let generation = 0; let requestId = 0; let pending: PendingRun | null = null; let active: ActiveRun | null = null; let disposed = false;
  const isOwned = (state: WorkerState) => current === state && current.generation === state.generation;
  const terminateOwned = (state: WorkerState, reason?: WeekFiveFunctionRuntimeError) => {
    if (!isOwned(state)) return false;
    current = null; clearTimeout(state.readyTimer); state.worker.terminate();
    if (state.status === 'loading') { state.status = 'failed'; state.rejectReady(reason ?? new WeekFiveFunctionRuntimeError('worker-error', 'Python Worker 已停止。')); }
    return true;
  };
  const rejectActive = (state: WorkerState, error: WeekFiveFunctionRuntimeError) => {
    if (!active || active.state !== state || !isOwned(state)) return false;
    const running = active; active = null; clearTimeout(running.timer); terminateOwned(state, error); running.reject(error); return true;
  };
  const fail = (state: WorkerState, error: WeekFiveFunctionRuntimeError) => { if (!rejectActive(state, error)) terminateOwned(state, error); };
  const start = (): WorkerState => {
    if (current) return current;
    let worker: WeekFiveFunctionWorker;
    try { worker = workerFactory(); } catch { throw new WeekFiveFunctionRuntimeError('worker-error', '无法创建 Python Worker。'); }
    let resolveReady!: () => void; let rejectReady!: (reason: Error) => void;
    const state: WorkerState = { worker, generation: ++generation, readyPromise: new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; }), resolveReady, rejectReady, readyTimer: undefined as unknown as ReturnType<typeof setTimeout>, status: 'loading' };
    current = state;
    state.readyTimer = setTimeout(() => terminateOwned(state, new WeekFiveFunctionRuntimeError('load-timeout', 'Python 运行环境加载超时。')), coldTimeoutMs);
    worker.onmessage = (event) => {
      if (!isOwned(state)) return;
      const message = narrowMessage(event.data);
      if (!message) { fail(state, new WeekFiveFunctionRuntimeError('worker-contract-mismatch', 'Python Worker 返回了非法消息。')); return; }
      if (message.type === 'ready') {
        if (state.status !== 'loading') { fail(state, new WeekFiveFunctionRuntimeError('worker-contract-mismatch', 'Python Worker 重复报告就绪。')); return; }
        clearTimeout(state.readyTimer); state.status = 'ready'; state.resolveReady(); return;
      }
      if (message.type === 'load-error') { fail(state, new WeekFiveFunctionRuntimeError('load-error', message.error ?? 'Python 运行环境不可用。')); return; }
      if (message.type === 'error') { if (active?.state === state && active.id === message.requestId) rejectActive(state, new WeekFiveFunctionRuntimeError('worker-error', message.error ?? 'Python Worker 拒绝本次运行。')); return; }
      if (!active || active.state !== state || active.id !== message.requestId) return;
      const running = active; active = null; clearTimeout(running.timer);
      const canonical = runWeekFiveFunctionTrace(message.trace);
      if (!same(message.trace, running.expectedTrace) || !same(canonical, running.expectedRun)) { terminateOwned(state); running.reject(new WeekFiveFunctionRuntimeError('worker-contract-mismatch', 'Python Worker 返回的函数轨迹与当前代码合同不一致。')); return; }
      running.resolve({ trace: structuredClone(message.trace) as WeekFiveFunctionTraceItem[], run: structuredClone(canonical) });
    };
    worker.onerror = () => { if (isOwned(state)) fail(state, new WeekFiveFunctionRuntimeError('worker-error', 'Python Worker 错误。')); };
    return state;
  };
  return {
    ready() { if (disposed) return Promise.reject(new WeekFiveFunctionRuntimeError('disposed', 'Python runtime 已关闭。')); try { return start().readyPromise; } catch (error) { return Promise.reject(error); } },
    async run(code) {
      if (disposed) throw new WeekFiveFunctionRuntimeError('disposed', 'Python runtime 已关闭。');
      let parsed;
      try { parsed = parseWeekFiveFunctionPython(code); } catch (error) { throw new WeekFiveFunctionRuntimeError('validation', error instanceof Error ? error.message : 'Python 文本无法验证。'); }
      if ('state' in parsed) throw new WeekFiveFunctionRuntimeError('validation', 'Python 函数结构尚未完成。');
      if (active || pending) throw new WeekFiveFunctionRuntimeError('busy', 'Python runtime 正在运行。');
      const state = start(); const waiting: PendingRun = { state, reason: null }; pending = waiting;
      try { await state.readyPromise; } finally { if (pending === waiting) pending = null; }
      if (waiting.reason) throw waiting.reason;
      if (disposed) throw new WeekFiveFunctionRuntimeError('disposed', 'Python runtime 已关闭。');
      if (!isOwned(state)) throw new WeekFiveFunctionRuntimeError('worker-error', 'Python Worker 已被替代。');
      if (active || pending) throw new WeekFiveFunctionRuntimeError('busy', 'Python runtime 正在运行。');
      return new Promise<WeekFiveFunctionPythonRun>((resolve, reject) => {
        const id = ++requestId;
        const timer = setTimeout(() => { if (!active || active.id !== id || active.state !== state) return; const running = active; active = null; terminateOwned(state); running.reject(new WeekFiveFunctionRuntimeError('timeout', 'Python 函数运行超时。')); }, warmTimeoutMs);
        active = { id, state, expectedTrace: structuredClone(parsed.trace), expectedRun: structuredClone(parsed.run), timer, resolve, reject };
        try { state.worker.postMessage({ type: 'run', requestId: id, code: parsed.pythonCode }); } catch { rejectActive(state, new WeekFiveFunctionRuntimeError('worker-error', 'Python Worker 无法接收本次运行。')); }
      });
    },
    cancel() { const error = new WeekFiveFunctionRuntimeError('cancelled', 'Python 函数运行已取消。'); if (active) { rejectActive(active.state, error); return; } if (pending) { const waiting = pending; waiting.reason = error; pending = null; terminateOwned(waiting.state, error); } },
    dispose() { disposed = true; const error = new WeekFiveFunctionRuntimeError('disposed', 'Python runtime 已关闭。'); if (active) { rejectActive(active.state, error); return; } if (pending) { pending.reason = error; pending = null; } if (current) terminateOwned(current, error); },
  };
}
