import { inspectPython } from './validation';

export interface PythonRunResult {
  output: string;
  error?: string;
}

export function runPython(code: string, timeoutMs = 3000): Promise<PythonRunResult> {
  const validationErrors = inspectPython(code);
  if (validationErrors.length > 0) return Promise.resolve({ output: '', error: validationErrors.join('；') });

  return new Promise((resolve) => {
    const worker = new Worker(new URL('../workers/python.worker.ts', import.meta.url), { type: 'module' });
    let timer: number | undefined;
    const finish = (result: PythonRunResult) => {
      if (timer) window.clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    worker.onmessage = (event: MessageEvent<{ type: string; output?: string; error?: string }>) => {
      if (event.data.type === 'ready') {
        timer = window.setTimeout(() => finish({ output: '', error: '运行超过 3 秒，已安全停止。检查循环条件再试一次。' }), timeoutMs);
        worker.postMessage({ code });
      } else if (event.data.type === 'result') {
        finish({ output: event.data.output ?? '' });
      } else if (event.data.type === 'error' || event.data.type === 'load-error') {
        finish({ output: '', error: event.data.error ?? 'Python 运行失败' });
      }
    };
    worker.onerror = () => finish({ output: '', error: 'Python 运行环境暂时没有准备好，请稍后再试。' });
  });
}
