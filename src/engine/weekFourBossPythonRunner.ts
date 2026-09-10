import { runWeekFourBossTrace, type WeekFourBossRunResult, type WeekFourBossTraceItem } from './weekFourBossContract';
import { parseWeekFourBossPython } from './weekFourBossPythonGrammar';

export type WeekFourBossRuntimeErrorCode = 'validation' | 'disposed' | 'busy' | 'load-error' | 'load-timeout' | 'timeout' | 'cancelled' | 'worker-error' | 'worker-contract-mismatch';

export class WeekFourBossRuntimeError extends Error {
  constructor(public readonly code: WeekFourBossRuntimeErrorCode, message: string) {
    super(message);
    this.name = 'WeekFourBossRuntimeError';
  }
}

export interface WeekFourBossWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: (() => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface WeekFourBossPythonRun {
  trace: WeekFourBossTraceItem[];
  run: WeekFourBossRunResult;
}

export interface WeekFourBossPythonRuntime {
  ready(): Promise<void>;
  run(code: unknown): Promise<WeekFourBossPythonRun>;
  cancel(): void;
  dispose(): void;
}

type RuntimeOptions = {
  coldTimeoutMs?: number;
  warmTimeoutMs?: number;
  workerFactory?: () => WeekFourBossWorker;
};

type ReadyMessage = { type: 'ready' };
type LoadErrorMessage = { type: 'load-error'; error?: string };
type ErrorMessage = { type: 'error'; requestId?: number; error?: string };
type ResultMessage = { type: 'result'; requestId: number; trace: unknown };
type WorkerMessage = ReadyMessage | LoadErrorMessage | ErrorMessage | ResultMessage;

const exactKeys = (value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== 'string')) return false;
  const strings = keys as string[];
  return required.every((key) => strings.includes(key))
    && strings.every((key) => required.includes(key) || optional.includes(key));
};

const narrowMessage = (value: unknown): WorkerMessage | null => {
  try {
    if (!exactKeys(value, ['type'], ['error', 'requestId', 'trace']) || typeof value.type !== 'string') return null;
    if (value.type === 'ready') return exactKeys(value, ['type']) ? { type: 'ready' } : null;
    if (value.type === 'load-error') {
      if (!exactKeys(value, ['type'], ['error']) || (value.error !== undefined && typeof value.error !== 'string')) return null;
      return value.error === undefined ? { type: 'load-error' } : { type: 'load-error', error: value.error };
    }
    if (value.type === 'error') {
      if (!exactKeys(value, ['type', 'requestId'], ['error'])
        || !Number.isSafeInteger(value.requestId) || (value.requestId as number) < 1
        || (value.error !== undefined && typeof value.error !== 'string')) return null;
      return {
        type: 'error',
        requestId: value.requestId as number,
        ...(value.error === undefined ? {} : { error: value.error }),
      };
    }
    if (value.type === 'result') {
      if (!exactKeys(value, ['type', 'requestId', 'trace']) || !Number.isSafeInteger(value.requestId) || (value.requestId as number) < 1) return null;
      return { type: 'result', requestId: value.requestId as number, trace: value.trace };
    }
    return null;
  } catch {
    return null;
  }
};

const sameValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => sameValue(value, right[index]));
  }
  const leftKeys = Reflect.ownKeys(left);
  const rightKeys = Reflect.ownKeys(right);
  if (leftKeys.length !== rightKeys.length || leftKeys.some((key) => typeof key !== 'string') || rightKeys.some((key) => typeof key !== 'string')) return false;
  const sortedLeft = (leftKeys as string[]).sort();
  const sortedRight = (rightKeys as string[]).sort();
  return sortedLeft.every((key, index) => key === sortedRight[index]
    && sameValue((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
};

export function createWeekFourBossPythonRuntime(options: RuntimeOptions = {}): WeekFourBossPythonRuntime {
  const coldTimeoutMs = options.coldTimeoutMs ?? 20_000;
  const warmTimeoutMs = options.warmTimeoutMs ?? 1_000;
  const workerFactory = options.workerFactory ?? (() => new Worker(new URL('../workers/weekFourBossPython.worker.ts', import.meta.url), { type: 'module' }) as unknown as WeekFourBossWorker);

  type WorkerState = {
    worker: WeekFourBossWorker;
    generation: number;
    readyPromise: Promise<void>;
    resolveReady: () => void;
    rejectReady: (reason: Error) => void;
    readyTimer: ReturnType<typeof setTimeout>;
    status: 'loading' | 'ready' | 'failed';
  };
  type PendingRun = { state: WorkerState; reason: WeekFourBossRuntimeError | null };
  type ActiveRun = {
    id: number;
    state: WorkerState;
    expectedTrace: WeekFourBossTraceItem[];
    expectedRun: WeekFourBossRunResult;
    timer: ReturnType<typeof setTimeout>;
    resolve: (value: WeekFourBossPythonRun) => void;
    reject: (reason: Error) => void;
  };

  let current: WorkerState | null = null;
  let generation = 0;
  let requestId = 0;
  let pending: PendingRun | null = null;
  let active: ActiveRun | null = null;
  let disposed = false;

  const isOwned = (state: WorkerState): boolean => current === state && current.generation === state.generation;
  const terminateOwned = (state: WorkerState, reason?: WeekFourBossRuntimeError): boolean => {
    if (!isOwned(state)) return false;
    current = null;
    clearTimeout(state.readyTimer);
    state.worker.terminate();
    if (state.status === 'loading') {
      state.status = 'failed';
      state.rejectReady(reason ?? new WeekFourBossRuntimeError('worker-error', 'Python Worker 已停止。'));
    }
    return true;
  };
  const rejectActiveOwned = (state: WorkerState, error: WeekFourBossRuntimeError): boolean => {
    if (!active || active.state !== state || !isOwned(state)) return false;
    const running = active;
    active = null;
    clearTimeout(running.timer);
    terminateOwned(state, error);
    running.reject(error);
    return true;
  };
  const failState = (state: WorkerState, error: WeekFourBossRuntimeError) => {
    if (rejectActiveOwned(state, error)) return;
    terminateOwned(state, error);
  };
  const start = (): WorkerState => {
    if (current) return current;
    let worker: WeekFourBossWorker;
    try {
      worker = workerFactory();
    } catch {
      throw new WeekFourBossRuntimeError('worker-error', '无法创建 Python Worker。');
    }
    let resolveReady!: () => void;
    let rejectReady!: (reason: Error) => void;
    const state: WorkerState = {
      worker,
      generation: ++generation,
      readyPromise: new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; }),
      resolveReady,
      rejectReady,
      readyTimer: undefined as unknown as ReturnType<typeof setTimeout>,
      status: 'loading',
    };
    current = state;
    state.readyTimer = setTimeout(() => {
      terminateOwned(state, new WeekFourBossRuntimeError('load-timeout', 'Python 运行环境加载超时。'));
    }, coldTimeoutMs);
    worker.onmessage = (event) => {
      if (!isOwned(state)) return;
      const message = narrowMessage(event.data);
      if (!message) {
        failState(state, new WeekFourBossRuntimeError('worker-contract-mismatch', 'Python Worker 返回了非法消息。'));
        return;
      }
      if (message.type === 'ready') {
        if (state.status !== 'loading') {
          failState(state, new WeekFourBossRuntimeError('worker-contract-mismatch', 'Python Worker 重复报告就绪。'));
          return;
        }
        clearTimeout(state.readyTimer);
        state.status = 'ready';
        state.resolveReady();
        return;
      }
      if (message.type === 'load-error') {
        failState(state, new WeekFourBossRuntimeError('load-error', message.error ?? 'Python 运行环境不可用。'));
        return;
      }
      if (message.type === 'error') {
        if (active?.state === state && active.id === message.requestId) {
          rejectActiveOwned(state, new WeekFourBossRuntimeError('worker-error', message.error ?? 'Python Worker 拒绝本次运行。'));
        }
        return;
      }
      if (!active || active.state !== state || active.id !== message.requestId) return;
      const running = active;
      active = null;
      clearTimeout(running.timer);
      try {
        const canonicalRun = runWeekFourBossTrace(message.trace);
        if (!sameValue(message.trace, running.expectedTrace) || !sameValue(canonicalRun, running.expectedRun)) throw new Error('mismatch');
        running.resolve({ trace: structuredClone(message.trace) as WeekFourBossTraceItem[], run: structuredClone(canonicalRun) });
      } catch {
        terminateOwned(state);
        running.reject(new WeekFourBossRuntimeError('worker-contract-mismatch', 'Python Worker 返回的列表循环轨迹与当前代码合同不一致。'));
      }
    };
    worker.onerror = () => {
      if (!isOwned(state)) return;
      failState(state, new WeekFourBossRuntimeError('worker-error', 'Python Worker 错误。'));
    };
    return state;
  };

  return {
    ready() {
      if (disposed) return Promise.reject(new WeekFourBossRuntimeError('disposed', 'Python runtime 已关闭。'));
      try {
        return start().readyPromise;
      } catch (error) {
        return Promise.reject(error);
      }
    },
    async run(code) {
      if (disposed) throw new WeekFourBossRuntimeError('disposed', 'Python runtime 已关闭。');
      let parsed;
      try {
        parsed = parseWeekFourBossPython(code);
      } catch (error) {
        throw new WeekFourBossRuntimeError('validation', error instanceof Error ? error.message : 'Python 文本无法通过列表循环验证。');
      }
      if ('state' in parsed) throw new WeekFourBossRuntimeError('validation', 'Python 列表循环结构尚未完成。');
      if (active || pending) throw new WeekFourBossRuntimeError('busy', 'Python runtime 正在运行。');

      let state: WorkerState;
      try {
        state = start();
      } catch (error) {
        throw error instanceof WeekFourBossRuntimeError ? error : new WeekFourBossRuntimeError('worker-error', '无法创建 Python Worker。');
      }
      const waiting: PendingRun = { state, reason: null };
      pending = waiting;
      try {
        await state.readyPromise;
      } finally {
        if (pending === waiting) pending = null;
      }
      if (waiting.reason) throw waiting.reason;
      if (disposed) throw new WeekFourBossRuntimeError('disposed', 'Python runtime 已关闭。');
      if (!isOwned(state)) throw new WeekFourBossRuntimeError('worker-error', 'Python Worker 已被新的运行环境替代。');
      if (active || pending) throw new WeekFourBossRuntimeError('busy', 'Python runtime 正在运行。');

      return new Promise<WeekFourBossPythonRun>((resolve, reject) => {
        const id = ++requestId;
        const timer = setTimeout(() => {
          if (!active || active.id !== id || active.state !== state) return;
          const running = active;
          active = null;
          terminateOwned(state);
          running.reject(new WeekFourBossRuntimeError('timeout', 'Python 列表循环运行超时。'));
        }, warmTimeoutMs);
        active = { id, state, expectedTrace: structuredClone(parsed.trace), expectedRun: structuredClone(parsed.run), timer, resolve, reject };
        try {
          state.worker.postMessage({ type: 'run', requestId: id, code: parsed.pythonCode });
        } catch {
          rejectActiveOwned(state, new WeekFourBossRuntimeError('worker-error', 'Python Worker 无法接收本次运行。'));
        }
      });
    },
    cancel() {
      const error = new WeekFourBossRuntimeError('cancelled', 'Python 列表循环运行已取消。');
      if (active) {
        rejectActiveOwned(active.state, error);
        return;
      }
      if (pending) {
        const waiting = pending;
        waiting.reason = error;
        pending = null;
        terminateOwned(waiting.state, error);
      }
    },
    dispose() {
      disposed = true;
      const error = new WeekFourBossRuntimeError('disposed', 'Python runtime 已关闭。');
      if (active) {
        rejectActiveOwned(active.state, error);
        return;
      }
      if (pending) {
        pending.reason = error;
        pending = null;
      }
      if (current) terminateOwned(current, error);
    },
  };
}
