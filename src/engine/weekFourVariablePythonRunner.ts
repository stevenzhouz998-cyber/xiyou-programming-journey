import { parseWeekFourVariablePython } from './weekFourVariablePythonGrammar';
import { runWeekFourVariableEvidence, type WeekFourVariableRunResult, type WeekFourVariableTraceItem } from './weekFourVariableContract';

export type WeekFourVariableRuntimeErrorCode = 'validation' | 'disposed' | 'busy' | 'load-error' | 'load-timeout' | 'timeout' | 'cancelled' | 'worker-error' | 'worker-contract-mismatch';

export class WeekFourVariableRuntimeError extends Error {
  constructor(public readonly code: WeekFourVariableRuntimeErrorCode, message: string) {
    super(message);
    this.name = 'WeekFourVariableRuntimeError';
  }
}

export interface WeekFourVariableWorker {
  onmessage: ((event: MessageEvent<WeekFourVariableWorkerMessage>) => void) | null;
  onerror: (() => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
}

type WeekFourVariableWorkerMessage =
  | { type: 'ready' }
  | { type: 'load-error'; error?: string }
  | { type: 'error'; requestId?: number; error?: string }
  | { type: 'result'; requestId: number; trace: WeekFourVariableTraceItem[] };

type RuntimeOptions = {
  coldTimeoutMs?: number;
  warmTimeoutMs?: number;
  workerFactory?: () => WeekFourVariableWorker;
};

export interface WeekFourVariablePythonRun {
  trace: WeekFourVariableTraceItem[];
  run: WeekFourVariableRunResult;
}

export interface WeekFourVariablePythonRuntime {
  ready(): Promise<void>;
  run(code: string): Promise<WeekFourVariablePythonRun>;
  cancel(): void;
  dispose(): void;
}

const sameValue = (left: unknown, right: unknown): boolean => {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) return Array.isArray(left) && Array.isArray(right) && left.length === right.length && left.every((value, index) => sameValue(value, right[index]));
  const leftKeys = Object.keys(left as Record<string, unknown>).sort();
  const rightKeys = Object.keys(right as Record<string, unknown>).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && sameValue((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]));
};

export function createWeekFourVariablePythonRuntime(options: RuntimeOptions = {}): WeekFourVariablePythonRuntime {
  const coldTimeoutMs = options.coldTimeoutMs ?? 20_000;
  const warmTimeoutMs = options.warmTimeoutMs ?? 1_000;
  const workerFactory = options.workerFactory ?? (() => new Worker(new URL('../workers/weekFourVariablePython.worker.ts', import.meta.url), { type: 'module' }) as unknown as WeekFourVariableWorker);
  type WorkerState = {
    worker: WeekFourVariableWorker;
    generation: number;
    readyPromise: Promise<void>;
    resolveReady: () => void;
    rejectReady: (reason: Error) => void;
    readyTimer: ReturnType<typeof setTimeout>;
    readyStatus: 'loading' | 'ready' | 'failed';
  };
  type ActiveRun = { id: number; state: WorkerState; code: string; expectedTrace: WeekFourVariableTraceItem[]; timer: ReturnType<typeof setTimeout>; resolve: (value: WeekFourVariablePythonRun) => void; reject: (reason: Error) => void };
  type PendingRun = { state: WorkerState };
  let current: WorkerState | null = null;
  let requestId = 0;
  let generation = 0;
  let disposed = false;
  let active: ActiveRun | null = null;
  let pendingRun: PendingRun | null = null;

  const isCurrent = (state: WorkerState): boolean => current?.worker === state.worker && current.generation === state.generation;
  const terminateOwned = (state: WorkerState, reason?: WeekFourVariableRuntimeError): boolean => {
    if (!isCurrent(state)) return false;
    current = null;
    clearTimeout(state.readyTimer);
    state.worker.terminate();
    if (state.readyStatus === 'loading') {
      state.readyStatus = 'failed';
      state.rejectReady(reason ?? new WeekFourVariableRuntimeError('worker-error', 'Python Worker 已停止。'));
    }
    return true;
  };
  const rejectActiveOwned = (state: WorkerState, error: WeekFourVariableRuntimeError): boolean => {
    if (!active || active.state !== state || !isCurrent(state)) return false;
    const currentActive = active;
    active = null;
    clearTimeout(currentActive.timer);
    terminateOwned(state, error);
    currentActive.reject(error);
    return true;
  };
  const start = (): WorkerState => {
    if (current) return current;
    const worker = workerFactory();
    let resolveReady!: () => void;
    let rejectReady!: (reason: Error) => void;
    const state: WorkerState = {
      worker,
      generation: ++generation,
      readyPromise: new Promise<void>((resolve, reject) => { resolveReady = resolve; rejectReady = reject; }),
      resolveReady,
      rejectReady,
      readyTimer: undefined as unknown as ReturnType<typeof setTimeout>,
      readyStatus: 'loading',
    };
    current = state;
    state.readyTimer = setTimeout(() => {
      terminateOwned(state, new WeekFourVariableRuntimeError('load-timeout', 'Python 运行环境加载超时。'));
    }, coldTimeoutMs);
    worker.onmessage = (event) => {
        if (!isCurrent(state)) return;
        const message = event.data;
        if (message.type === 'ready') {
          clearTimeout(state.readyTimer);
          state.readyStatus = 'ready';
          state.resolveReady();
          return;
        }
        if (message.type === 'load-error') {
          terminateOwned(state, new WeekFourVariableRuntimeError('load-error', message.error ?? 'Python 运行环境不可用。'));
          return;
        }
        if (message.type === 'error' && active?.state === state && active.id === message.requestId) {
          rejectActiveOwned(state, new WeekFourVariableRuntimeError('worker-error', message.error ?? 'Python Worker 拒绝本次运行。'));
          return;
        }
        if (message.type !== 'result' || active?.state !== state || active.id !== message.requestId) return;
        const currentActive = active;
        active = null;
        clearTimeout(currentActive.timer);
        try {
          const run = runWeekFourVariableEvidence(message.trace);
          if (!sameValue(message.trace, currentActive.expectedTrace)) throw new Error(`worker trace differs from request ${currentActive.id}: ${currentActive.code}`);
          currentActive.resolve({ trace: structuredClone(message.trace), run });
        } catch {
          terminateOwned(state);
          currentActive.reject(new WeekFourVariableRuntimeError('worker-contract-mismatch', 'Python Worker 返回的变量取证与保存的代码合同不一致。'));
        }
      };
    worker.onerror = () => {
      if (!isCurrent(state)) return;
        const error = new WeekFourVariableRuntimeError('worker-error', 'Python Worker 错误。');
      if (rejectActiveOwned(state, error)) return;
      terminateOwned(state, error);
    };
    return state;
  };

  return {
    ready() {
      if (disposed) return Promise.reject(new WeekFourVariableRuntimeError('disposed', 'Python runtime 已关闭。'));
      return start().readyPromise;
    },
    async run(code) {
      if (disposed) throw new WeekFourVariableRuntimeError('disposed', 'Python runtime 已关闭。');
      let parsed;
      try {
        parsed = parseWeekFourVariablePython(code);
      } catch (error) {
        throw new WeekFourVariableRuntimeError('validation', error instanceof Error ? error.message : 'Python 文本无法通过变量取证验证。');
      }
      if (active || pendingRun) throw new WeekFourVariableRuntimeError('busy', 'Python runtime 正在运行。');
      const state = start();
      const waiting: PendingRun = { state };
      pendingRun = waiting;
      try {
        await state.readyPromise;
      } finally {
        if (pendingRun === waiting) pendingRun = null;
      }
      if (disposed) throw new WeekFourVariableRuntimeError('disposed', 'Python runtime 已关闭。');
      if (!isCurrent(state)) throw new WeekFourVariableRuntimeError('worker-error', 'Python Worker 已被新的运行环境替代。');
      if (active || pendingRun) throw new WeekFourVariableRuntimeError('busy', 'Python runtime 正在运行。');
      return new Promise<WeekFourVariablePythonRun>((resolve, reject) => {
        const id = ++requestId;
        const timer = setTimeout(() => {
          if (active?.id !== id || active.state !== state) return;
          const currentActive = active;
          active = null;
          terminateOwned(state);
          currentActive.reject(new WeekFourVariableRuntimeError('timeout', 'Python 变量取证运行超时。'));
        }, warmTimeoutMs);
        active = { id, state, code, expectedTrace: structuredClone(parsed.trace), timer, resolve, reject };
        try {
          state.worker.postMessage({ type: 'run', requestId: id, code, sourceSpan: parsed.sourceSpan });
        } catch {
          rejectActiveOwned(state, new WeekFourVariableRuntimeError('worker-error', 'Python Worker 无法接收本次运行。'));
        }
      });
    },
    cancel() {
      const error = new WeekFourVariableRuntimeError('cancelled', 'Python 变量取证运行已取消。');
      if (active) {
        rejectActiveOwned(active.state, error);
        return;
      }
      if (pendingRun) {
        const waiting = pendingRun;
        pendingRun = null;
        terminateOwned(waiting.state, error);
      }
    },
    dispose() {
      disposed = true;
      if (active) {
        const currentActive = active;
        rejectActiveOwned(currentActive.state, new WeekFourVariableRuntimeError('disposed', 'Python runtime 已关闭。'));
        return;
      }
      if (pendingRun) pendingRun = null;
      if (current) {
        terminateOwned(current, new WeekFourVariableRuntimeError('disposed', 'Python runtime 已关闭。'));
      }
    },
  };
}
