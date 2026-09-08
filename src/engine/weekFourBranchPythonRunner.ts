import { runWeekFourBranchTrace, type WeekFourBranchRunResult, type WeekFourBranchTraceItem } from './weekFourBranchContract';
import { parseWeekFourBranchPython } from './weekFourBranchPythonGrammar';

export type WeekFourBranchRuntimeErrorCode = 'validation' | 'disposed' | 'busy' | 'load-error' | 'load-timeout' | 'timeout' | 'cancelled' | 'worker-error' | 'worker-contract-mismatch';

export class WeekFourBranchRuntimeError extends Error {
  constructor(public readonly code: WeekFourBranchRuntimeErrorCode, message: string) {
    super(message);
    this.name = 'WeekFourBranchRuntimeError';
  }
}

export interface WeekFourBranchWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: (() => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

export interface WeekFourBranchPythonRun {
  trace: WeekFourBranchTraceItem[];
  run: WeekFourBranchRunResult;
}

export interface WeekFourBranchPythonRuntime {
  ready(): Promise<void>;
  run(code: unknown): Promise<WeekFourBranchPythonRun>;
  cancel(): void;
  dispose(): void;
}

type RuntimeOptions = {
  coldTimeoutMs?: number;
  warmTimeoutMs?: number;
  workerFactory?: () => WeekFourBranchWorker;
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

export function createWeekFourBranchPythonRuntime(options: RuntimeOptions = {}): WeekFourBranchPythonRuntime {
  const coldTimeoutMs = options.coldTimeoutMs ?? 20_000;
  const warmTimeoutMs = options.warmTimeoutMs ?? 1_000;
  const workerFactory = options.workerFactory ?? (() => new Worker(new URL('../workers/weekFourBranchPython.worker.ts', import.meta.url), { type: 'module' }) as unknown as WeekFourBranchWorker);

  type WorkerState = {
    worker: WeekFourBranchWorker;
    generation: number;
    readyPromise: Promise<void>;
    resolveReady: () => void;
    rejectReady: (reason: Error) => void;
    readyTimer: ReturnType<typeof setTimeout>;
    status: 'loading' | 'ready' | 'failed';
  };
  type PendingRun = { state: WorkerState; reason: WeekFourBranchRuntimeError | null };
  type ActiveRun = {
    id: number;
    state: WorkerState;
    expectedTrace: WeekFourBranchTraceItem[];
    expectedRun: WeekFourBranchRunResult;
    timer: ReturnType<typeof setTimeout>;
    resolve: (value: WeekFourBranchPythonRun) => void;
    reject: (reason: Error) => void;
  };

  let current: WorkerState | null = null;
  let generation = 0;
  let requestId = 0;
  let pending: PendingRun | null = null;
  let active: ActiveRun | null = null;
  let disposed = false;

  const isOwned = (state: WorkerState): boolean => current === state && current.generation === state.generation;
  const terminateOwned = (state: WorkerState, reason?: WeekFourBranchRuntimeError): boolean => {
    if (!isOwned(state)) return false;
    current = null;
    clearTimeout(state.readyTimer);
    state.worker.terminate();
    if (state.status === 'loading') {
      state.status = 'failed';
      state.rejectReady(reason ?? new WeekFourBranchRuntimeError('worker-error', 'Python Worker 已停止。'));
    }
    return true;
  };
  const rejectActiveOwned = (state: WorkerState, error: WeekFourBranchRuntimeError): boolean => {
    if (!active || active.state !== state || !isOwned(state)) return false;
    const running = active;
    active = null;
    clearTimeout(running.timer);
    terminateOwned(state, error);
    running.reject(error);
    return true;
  };
  const failState = (state: WorkerState, error: WeekFourBranchRuntimeError) => {
    if (rejectActiveOwned(state, error)) return;
    terminateOwned(state, error);
  };
  const start = (): WorkerState => {
    if (current) return current;
    let worker: WeekFourBranchWorker;
    try {
      worker = workerFactory();
    } catch {
      throw new WeekFourBranchRuntimeError('worker-error', '无法创建 Python Worker。');
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
      terminateOwned(state, new WeekFourBranchRuntimeError('load-timeout', 'Python 运行环境加载超时。'));
    }, coldTimeoutMs);
    worker.onmessage = (event) => {
      if (!isOwned(state)) return;
      const message = narrowMessage(event.data);
      if (!message) {
        failState(state, new WeekFourBranchRuntimeError('worker-contract-mismatch', 'Python Worker 返回了非法消息。'));
        return;
      }
      if (message.type === 'ready') {
        if (state.status !== 'loading') {
          failState(state, new WeekFourBranchRuntimeError('worker-contract-mismatch', 'Python Worker 重复报告就绪。'));
          return;
        }
        clearTimeout(state.readyTimer);
        state.status = 'ready';
        state.resolveReady();
        return;
      }
      if (message.type === 'load-error') {
        failState(state, new WeekFourBranchRuntimeError('load-error', message.error ?? 'Python 运行环境不可用。'));
        return;
      }
      if (message.type === 'error') {
        if (active?.state === state && active.id === message.requestId) {
          rejectActiveOwned(state, new WeekFourBranchRuntimeError('worker-error', message.error ?? 'Python Worker 拒绝本次运行。'));
        }
        return;
      }
      if (!active || active.state !== state || active.id !== message.requestId) return;
      const running = active;
      active = null;
      clearTimeout(running.timer);
      try {
        const canonicalRun = runWeekFourBranchTrace(message.trace);
        if (!sameValue(message.trace, running.expectedTrace) || !sameValue(canonicalRun, running.expectedRun)) throw new Error('mismatch');
        running.resolve({ trace: structuredClone(message.trace) as WeekFourBranchTraceItem[], run: structuredClone(canonicalRun) });
      } catch {
        terminateOwned(state);
        running.reject(new WeekFourBranchRuntimeError('worker-contract-mismatch', 'Python Worker 返回的分支轨迹与当前代码合同不一致。'));
      }
    };
    worker.onerror = () => {
      if (!isOwned(state)) return;
      failState(state, new WeekFourBranchRuntimeError('worker-error', 'Python Worker 错误。'));
    };
    return state;
  };

  return {
    ready() {
      if (disposed) return Promise.reject(new WeekFourBranchRuntimeError('disposed', 'Python runtime 已关闭。'));
      try {
        return start().readyPromise;
      } catch (error) {
        return Promise.reject(error);
      }
    },
    async run(code) {
      if (disposed) throw new WeekFourBranchRuntimeError('disposed', 'Python runtime 已关闭。');
      let parsed;
      try {
        parsed = parseWeekFourBranchPython(code);
      } catch (error) {
        throw new WeekFourBranchRuntimeError('validation', error instanceof Error ? error.message : 'Python 文本无法通过分支验证。');
      }
      if ('state' in parsed) throw new WeekFourBranchRuntimeError('validation', 'Python 分支结构尚未完成。');
      if (active || pending) throw new WeekFourBranchRuntimeError('busy', 'Python runtime 正在运行。');

      let state: WorkerState;
      try {
        state = start();
      } catch (error) {
        throw error instanceof WeekFourBranchRuntimeError ? error : new WeekFourBranchRuntimeError('worker-error', '无法创建 Python Worker。');
      }
      const waiting: PendingRun = { state, reason: null };
      pending = waiting;
      try {
        await state.readyPromise;
      } finally {
        if (pending === waiting) pending = null;
      }
      if (waiting.reason) throw waiting.reason;
      if (disposed) throw new WeekFourBranchRuntimeError('disposed', 'Python runtime 已关闭。');
      if (!isOwned(state)) throw new WeekFourBranchRuntimeError('worker-error', 'Python Worker 已被新的运行环境替代。');
      if (active || pending) throw new WeekFourBranchRuntimeError('busy', 'Python runtime 正在运行。');

      return new Promise<WeekFourBranchPythonRun>((resolve, reject) => {
        const id = ++requestId;
        const timer = setTimeout(() => {
          if (!active || active.id !== id || active.state !== state) return;
          const running = active;
          active = null;
          terminateOwned(state);
          running.reject(new WeekFourBranchRuntimeError('timeout', 'Python 分支运行超时。'));
        }, warmTimeoutMs);
        active = { id, state, expectedTrace: structuredClone(parsed.trace), expectedRun: structuredClone(parsed.run), timer, resolve, reject };
        try {
          state.worker.postMessage({ type: 'run', requestId: id, code: parsed.pythonCode });
        } catch {
          rejectActiveOwned(state, new WeekFourBranchRuntimeError('worker-error', 'Python Worker 无法接收本次运行。'));
        }
      });
    },
    cancel() {
      const error = new WeekFourBranchRuntimeError('cancelled', 'Python 分支运行已取消。');
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
      const error = new WeekFourBranchRuntimeError('disposed', 'Python runtime 已关闭。');
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
