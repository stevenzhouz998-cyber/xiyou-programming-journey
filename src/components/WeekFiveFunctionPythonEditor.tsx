import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { EditorView } from '@codemirror/view';

export interface WeekFiveFunctionPythonEditorHandle { focusDefinition(): void; focusCall(): void; focusAction(): void }
export interface WeekFiveFunctionPythonEditorProps { code: string; disabled: boolean; onCodeChange(code: string): void; onReady(): void; onError(message: string): void }

export const WeekFiveFunctionPythonEditor = forwardRef<WeekFiveFunctionPythonEditorHandle, WeekFiveFunctionPythonEditorProps>(function WeekFiveFunctionPythonEditor({ code, disabled, onCodeChange, onReady, onError }, ref) {
  const host = useRef<HTMLDivElement | null>(null); const viewRef = useRef<EditorView | null>(null); const current = useRef({ code, disabled, onCodeChange }); const sync = useRef(false); const setEditable = useRef<(value: boolean) => void>(() => {});
  current.current = { code, disabled, onCodeChange };
  useImperativeHandle(ref, () => ({
    focusDefinition: () => { const view = viewRef.current; if (!view) return; view.dispatch({ selection: { anchor: 0 }, scrollIntoView: true }); view.focus(); },
    focusCall: () => { const view = viewRef.current; if (!view) return; const start = Math.max(0, view.state.doc.toString().lastIndexOf('record_sanqing()')); view.dispatch({ selection: { anchor: start }, scrollIntoView: true }); view.focus(); },
    focusAction: () => { const view = viewRef.current; if (!view) return; const start = Math.max(0, view.state.doc.toString().indexOf('record_arrival()')); view.dispatch({ selection: { anchor: start }, scrollIntoView: true }); view.focus(); },
  }), []);
  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const [state, view, { python }] = await Promise.all([import('@codemirror/state'), import('@codemirror/view'), import('@codemirror/lang-python')]);
        if (disposed || !host.current) return;
        const editable = new state.Compartment();
        const editor = new view.EditorView({
          state: state.EditorState.create({ doc: current.current.code, extensions: [python(), view.lineNumbers(), view.EditorView.lineWrapping,
            view.EditorView.contentAttributes.of({ 'aria-label': 'W5-M2 Python 函数代码', 'aria-describedby': 'week-five-function-editor-rules', role: 'textbox', 'aria-multiline': 'true' }),
            editable.of(view.EditorView.editable.of(!current.current.disabled)),
            view.EditorView.updateListener.of((update) => { if (update.docChanged && !sync.current && !current.current.disabled) current.current.onCodeChange(update.state.doc.toString()); }),
          ] }), parent: host.current,
        });
        viewRef.current = editor; setEditable.current = (value) => editor.dispatch({ effects: editable.reconfigure(view.EditorView.editable.of(value)) }); onReady();
      } catch (error) { if (!disposed) onError(error instanceof Error ? error.message : 'Python 编辑器加载失败'); }
    })();
    return () => { disposed = true; viewRef.current?.destroy(); viewRef.current = null; };
  }, []);
  useEffect(() => {
    const view = viewRef.current; if (!view || view.state.doc.toString() === code) return;
    sync.current = true; try { view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } }); } finally { sync.current = false; }
  }, [code]);
  useEffect(() => { setEditable.current(!disabled); }, [disabled]);
  return <section className="week-five-function-python-panel">
    <h3>Python 函数工作台</h3>
    <p id="week-five-function-editor-rules"><code>def</code> 先把两步收进函数；只有运行到 <code>record_sanqing()</code> 才会执行。<code>record_names()</code> 在本关表示“记录说明来历”，不是逐个姓名。参数留到下一关学习。</p>
    <div ref={host} className="week-five-function-codemirror" />
    <div className="week-five-function-controls" aria-label="函数代码快捷调整">
      <button type="button" className="button button-ghost" disabled={disabled} onClick={() => onCodeChange(code.includes('\nrecord_sanqing()') ? code : `${code.replace(/\n+$/u, '')}\n\nrecord_sanqing()`)}>在定义后调用一次</button>
      <button type="button" className="button button-ghost" disabled={disabled} onClick={() => onCodeChange(code.replace(/\n\s*record_sanqing\(\)\s*$/u, ''))}>移除末尾调用</button>
      <button type="button" className="button button-ghost" disabled={disabled} onClick={() => {
        const ordered = '    record_arrival()\n    record_names()'; const reversed = '    record_names()\n    record_arrival()';
        onCodeChange(code.includes(ordered) ? code.replace(ordered, reversed) : code.replace(reversed, ordered));
      }}>交换函数内两步</button>
    </div>
  </section>;
});
