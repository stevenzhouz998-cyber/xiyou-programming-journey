import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { EditorView } from '@codemirror/view';
import { DEFAULT_WEEK_FIVE_DECOMPOSITION_PYTHON } from '../engine/weekFiveDecompositionPythonGrammar';

export interface WeekFiveDecompositionPythonEditorHandle {
  focusDefinition(): void;
  focusCall(): void;
  focusAction(): void;
  focusLine(line: number): void;
}

export interface WeekFiveDecompositionPythonEditorProps {
  code: string;
  disabled: boolean;
  onCodeChange(code: string): void;
  onReady(): void;
  onError(message: string): void;
}

export const WeekFiveDecompositionPythonEditor = forwardRef<
  WeekFiveDecompositionPythonEditorHandle,
  WeekFiveDecompositionPythonEditorProps
>(function WeekFiveDecompositionPythonEditor({ code, disabled, onCodeChange, onReady, onError }, ref) {
  const host = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const current = useRef({ code, disabled, onCodeChange });
  const sync = useRef(false);
  const setEditable = useRef<(value: boolean) => void>(() => {});
  current.current = { code, disabled, onCodeChange };

  const focus = (needle: string, last = false) => {
    const view = viewRef.current;
    if (!view) return;
    const text = view.state.doc.toString();
    const start = Math.max(0, last ? text.lastIndexOf(needle) : text.indexOf(needle));
    view.dispatch({ selection: { anchor: start }, scrollIntoView: true });
    view.focus();
  };

  useImperativeHandle(ref, () => ({
    focusDefinition: () => focus('def record_meditation'),
    focusCall: () => focus('def record_five_trials'),
    focusAction: () => focus("record_trial('隔板猜物')"),
    focusLine: (line) => {
      const view = viewRef.current;
      if (!view) return;
      const bounded = Math.max(1, Math.min(line, view.state.doc.lines));
      const start = view.state.doc.line(bounded).from;
      view.dispatch({ selection: { anchor: start }, scrollIntoView: true });
      view.focus();
    },
  }), []);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const [state, view, { python }] = await Promise.all([
          import('@codemirror/state'),
          import('@codemirror/view'),
          import('@codemirror/lang-python'),
        ]);
        if (disposed || !host.current) return;
        const editable = new state.Compartment();
        const editor = new view.EditorView({
          state: state.EditorState.create({
            doc: current.current.code,
            extensions: [
              python(),
              view.lineNumbers(),
              view.EditorView.lineWrapping,
              view.EditorView.contentAttributes.of({
                'aria-label': 'W5-M4 Python 问题分解代码',
                'aria-describedby': 'week-five-decomposition-editor-rules',
                role: 'textbox',
                'aria-multiline': 'true',
              }),
              editable.of(view.EditorView.editable.of(!current.current.disabled)),
              view.EditorView.updateListener.of((update) => {
                if (update.docChanged && !sync.current && !current.current.disabled) {
                  current.current.onCodeChange(update.state.doc.toString());
                }
              }),
            ],
          }),
          parent: host.current,
        });
        viewRef.current = editor;
        setEditable.current = (value) => editor.dispatch({
          effects: editable.reconfigure(view.EditorView.editable.of(value)),
        });
        onReady();
      } catch (error) {
        if (!disposed) onError(error instanceof Error ? error.message : 'Python 编辑器加载失败');
      }
    })();
    return () => {
      disposed = true;
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.doc.toString() === code) return;
    sync.current = true;
    try {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
    } finally {
      sync.current = false;
    }
  }, [code]);

  useEffect(() => {
    setEditable.current(!disabled);
  }, [disabled]);

  return (
    <section className="week-five-function-python-panel">
      <h3>Python 问题分解工作台</h3>
      <p id="week-five-decomposition-editor-rules">
        三个小函数各管一组故事记录；总函数只负责按顺序启动三组。本关不需要 <code>return</code>。
      </p>
      <div ref={host} className="week-five-function-codemirror" />
      <div className="week-five-function-controls" aria-label="问题分解代码快捷调整">
        <button
          type="button"
          className="button button-ghost"
          disabled={disabled}
          onClick={() => focus("record_trial('隔板猜物')")}
        >
          定位记录归属
        </button>
        <button
          type="button"
          className="button button-ghost"
          disabled={disabled}
          onClick={() => onCodeChange(DEFAULT_WEEK_FIVE_DECOMPOSITION_PYTHON)}
        >
          恢复默认代码
        </button>
        <button
          type="button"
          className="button button-ghost"
          disabled={disabled}
          onClick={() => focus('def record_five_trials')}
        >
          定位总记录
        </button>
      </div>
    </section>
  );
});
