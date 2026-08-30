import { parseWeekFourMappingPython } from './weekFourPythonMappingGrammar';
import type { WeekFourMappingCard, WeekFourMappingTraceItem } from '../blockly/weekFourMappingContract';

type RuntimeOptions = { coldTimeoutMs?: number; warmTimeoutMs?: number };
type WorkerMessage = { type: 'ready' } | { type: 'load-error'; error?: string } | { type: 'error'; requestId?: number; error?: string } | { type: 'result'; requestId: number; trace: WeekFourMappingTraceItem[] };
export interface WeekFourPythonRun { trace: WeekFourMappingTraceItem[]; }
export interface WeekFourPythonRuntime { ready(): Promise<void>; run(code: string, cards: readonly WeekFourMappingCard[]): Promise<WeekFourPythonRun>; cancel(): void; dispose(): void; }

export function createWeekFourPythonRuntime(options: RuntimeOptions = {}): WeekFourPythonRuntime {
  const coldTimeoutMs = options.coldTimeoutMs ?? 20_000; const warmTimeoutMs = options.warmTimeoutMs ?? 1_000;
  let worker: Worker | null = null; let readyPromise: Promise<void> | null = null; let requestId = 0; let active: { id: number; reject: (reason: Error) => void; timer: number } | null = null; let disposed = false;
  const terminate = () => { if (worker) worker.terminate(); worker = null; readyPromise = null; };
  const start = () => {
    if (worker) return worker;
    const next = new Worker(new URL('../workers/weekFourPythonMapping.worker.ts', import.meta.url), { type: 'module' }); worker = next;
    readyPromise = new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => { terminate(); reject(new Error('Python 运行环境加载超时。')); }, coldTimeoutMs);
      const rejectActive = (error: Error) => {
        if (!active) return false;
        window.clearTimeout(active.timer);
        const current = active;
        active = null;
        terminate();
        current.reject(error);
        return true;
      };
      next.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;
        if (message.type === 'ready') { window.clearTimeout(timer); resolve(); return; }
        if (message.type === 'load-error') { window.clearTimeout(timer); terminate(); reject(new Error(message.error ?? 'Python 运行环境不可用。')); return; }
        if (message.type === 'error') {
          if (active && message.requestId === active.id) rejectActive(new Error(message.error ?? 'Python Worker 拒绝本次运行。'));
          return;
        }
        if (message.type === 'result' && active?.id === message.requestId) { window.clearTimeout(active.timer); const current = active; active = null; try { const parsed = parseWeekFourMappingPython((next as unknown as { __w4Code?: string }).__w4Code ?? ''); if (JSON.stringify(parsed.trace.map(({ source: _source, ...item }) => item)) !== JSON.stringify(message.trace.map(({ source: _source, ...item }) => item))) throw new Error('worker-contract-mismatch'); (current as unknown as { resolve?: (value: WeekFourPythonRun) => void }).resolve?.({ trace: message.trace }); } catch (error) { current.reject(error instanceof Error ? error : new Error('worker-contract-mismatch')); } }
      };
      next.onerror = () => {
        const error = new Error('Python Worker 错误。');
        if (rejectActive(error)) return;
        window.clearTimeout(timer);
        terminate();
        reject(error);
      };
    });
    return next;
  };
  return {
    ready() { if (disposed) return Promise.reject(new Error('Python runtime 已关闭。')); start(); return readyPromise!; },
    async run(code, cards) {
      if (disposed) throw new Error('Python runtime 已关闭。');
      if (active) throw new Error('Python runtime 正在运行。');
      const next = start(); await readyPromise!; const parsed = parseWeekFourMappingPython(code); (next as unknown as { __w4Code?: string }).__w4Code = code;
      return new Promise<WeekFourPythonRun>((resolve, reject) => { const id = ++requestId; const timer = window.setTimeout(() => { if (active?.id === id) { active = null; terminate(); reject(new Error('Python 对照运行超时。')); } }, warmTimeoutMs); active = { id, reject, timer } as typeof active & { resolve: typeof resolve }; (active as unknown as { resolve: typeof resolve }).resolve = resolve; next.postMessage({ type: 'run', requestId: id, code, cards: structuredClone(cards), sourceSpan: parsed.sourceSpan }); });
    },
    cancel() { if (active) { window.clearTimeout(active.timer); const current = active; active = null; terminate(); current.reject(new Error('Python 对照运行已取消。')); } },
    dispose() { disposed = true; if (active) { this.cancel(); return; } if (readyPromise) { void readyPromise.then(() => terminate(), () => terminate()); return; } terminate(); },
  };
}
