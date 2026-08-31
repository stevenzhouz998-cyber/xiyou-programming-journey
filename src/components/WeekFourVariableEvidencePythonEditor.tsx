import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { parseWeekFourVariablePython } from '../engine/weekFourVariablePythonGrammar';

export interface WeekFourVariableEvidencePythonEditorHandle { focusField(): void; }
export interface WeekFourVariableEvidencePythonEditorProps {
  code: string;
  sourceSpan: { line: 2; from: number; to: number };
  disabled?: boolean;
  onCodeChange(code: string): void;
  onReady?(): void;
  onError?(message: string): void;
}

type CodeMirrorView = {
  state: { doc: { length: number; toString(): string } };
  dispatch(spec: { changes?: { from: number; to: number; insert: string }; effects?: unknown }): void;
  destroy(): void;
};
type EditorController = { view: CodeMirrorView; setDisabled(disabled: boolean): void; };

function sourceMatchesCode(code: string, sourceSpan: WeekFourVariableEvidencePythonEditorProps['sourceSpan']): boolean {
  try {
    const parsed = parseWeekFourVariablePython(code);
    return parsed.sourceSpan.line === sourceSpan.line && parsed.sourceSpan.from === sourceSpan.from && parsed.sourceSpan.to === sourceSpan.to;
  } catch { return false; }
}

function documentOffsets(code: string, sourceSpan: WeekFourVariableEvidencePythonEditorProps['sourceSpan']) {
  const lineTwoStart = code.indexOf('\n') + 1;
  return { from: lineTwoStart + sourceSpan.from, to: lineTwoStart + sourceSpan.to };
}

export const WeekFourVariableEvidencePythonEditor = forwardRef<WeekFourVariableEvidencePythonEditorHandle, WeekFourVariableEvidencePythonEditorProps>(function WeekFourVariableEvidencePythonEditor(
  { code, sourceSpan, disabled = false, onCodeChange, onReady, onError }, ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLSelectElement>(null);
  const controllerRef = useRef<EditorController | null>(null);
  const callbacksRef = useRef({ onCodeChange, onReady, onError });
  const codeRef = useRef(code);
  const sourceSpanRef = useRef(sourceSpan);
  const disabledRef = useRef(disabled);
  const syncingExternalCodeRef = useRef(false);
  const reportedValidationErrorRef = useRef<string | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [editorMounted, setEditorMounted] = useState(false);
  const valid = sourceMatchesCode(code, sourceSpan);
  const validationError = valid ? null : '保存的第二行变量位置与 Python 文本不一致。';
  const error = validationError ?? runtimeError;

  callbacksRef.current = { onCodeChange, onReady, onError };
  codeRef.current = code;
  sourceSpanRef.current = sourceSpan;
  disabledRef.current = disabled;
  useImperativeHandle(ref, () => ({ focusField: () => selectorRef.current?.focus() }), []);

  useEffect(() => {
    if (!validationError) { reportedValidationErrorRef.current = null; return; }
    if (reportedValidationErrorRef.current === validationError) return;
    reportedValidationErrorRef.current = validationError;
    callbacksRef.current.onError?.(validationError);
  }, [validationError]);

  useEffect(() => {
    let disposed = false;
    if (!valid || !hostRef.current || controllerRef.current) return;
    void Promise.all([import('@codemirror/state'), import('@codemirror/view'), import('@codemirror/lang-python')]).then(([state, view, python]) => {
      if (disposed || !hostRef.current || !sourceMatchesCode(codeRef.current, sourceSpanRef.current)) return;
      const editable = new state.Compartment();
      const transactionFilter = state.EditorState.transactionFilter.of((transaction: any) => {
        if (!transaction.docChanged) return transaction;
        try { parseWeekFourVariablePython(transaction.newDoc.toString()); return transaction; }
        catch { return []; }
      });
      const updateListener = view.EditorView.updateListener.of((update: any) => {
        if (update.docChanged && !syncingExternalCodeRef.current) callbacksRef.current.onCodeChange(update.state.doc.toString());
      });
      const editor = new view.EditorView({
        state: state.EditorState.create({ doc: codeRef.current, extensions: [python.python(), transactionFilter, updateListener, view.EditorView.contentAttributes.of({ 'aria-label': 'W4-M2 Python 代码' }), editable.of(view.EditorView.editable.of(!disabledRef.current))] }),
        parent: hostRef.current,
      });
      const typedView = editor as unknown as CodeMirrorView;
      controllerRef.current = {
        view: typedView,
        setDisabled(nextDisabled) { typedView.dispatch({ effects: editable.reconfigure(view.EditorView.editable.of(!nextDisabled)) }); },
      };
      setEditorMounted(true);
      callbacksRef.current.onReady?.();
    }).catch((reason: unknown) => {
      if (disposed) return;
      const message = reason instanceof Error ? reason.message : 'Python 编辑器无法加载。';
      setRuntimeError(message);
      callbacksRef.current.onError?.(message);
    });
    return () => { disposed = true; controllerRef.current?.view.destroy(); controllerRef.current = null; setEditorMounted(false); };
  }, [valid]);

  useEffect(() => { controllerRef.current?.setDisabled(disabled); }, [disabled]);
  useEffect(() => {
    const controller = controllerRef.current;
    if (!valid || !controller || controller.view.state.doc.toString() === code) return;
    syncingExternalCodeRef.current = true;
    try { controller.view.dispatch({ changes: { from: 0, to: controller.view.state.doc.length, insert: code } }); }
    finally { syncingExternalCodeRef.current = false; }
  }, [code, valid]);

  const apply = (target: 'appearance' | 'identity') => {
    if (disabled || !valid || error) return;
    const offsets = documentOffsets(code, sourceSpan);
    const current = code.slice(offsets.from, offsets.to);
    if (current !== 'appearance' && current !== 'identity') return;
    const next = `${code.slice(0, offsets.from)}${target}${code.slice(offsets.to)}`;
    if (!sourceMatchesCode(next, target === 'identity' ? { line: 2, from: 0, to: 8 } : { line: 2, from: 0, to: 10 })) return;
    const controller = controllerRef.current;
    if (controller) { controller.view.dispatch({ changes: { from: offsets.from, to: offsets.to, insert: target } }); return; }
    callbacksRef.current.onCodeChange(next);
  };

  const target = valid ? parseWeekFourVariablePython(code).target : 'appearance';
  return <section className="week-four-variable-python-panel">
    <header><h3>变量取证 Python</h3><p>只能改第二行写入的证据匣名称。</p></header>
    <div ref={hostRef} className="week-four-variable-codemirror">{typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom') && !editorMounted ? <pre>{code}</pre> : null}</div>
    <label>第二次核验写入哪个变量
      <select ref={selectorRef} aria-label="第二次核验写入哪个变量" value={target} disabled={disabled || Boolean(error)} onChange={(event) => apply(event.target.value as 'appearance' | 'identity')} onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) { event.preventDefault(); apply(event.currentTarget.value === 'identity' ? 'identity' : 'appearance'); }
      }}><option value="appearance">appearance</option><option value="identity">identity</option></select>
    </label>
    <div role="group" aria-label="键盘选择第二次核验变量">{(['appearance', 'identity'] as const).map((value) => <button key={value} type="button" disabled={disabled || Boolean(error)} aria-pressed={target === value} onClick={() => apply(value)} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); apply(value); }
    }}>写入 {value}</button>)}</div>
    {error ? <p role="alert">无法恢复变量取证 Python：{error}</p> : null}
  </section>;
});
