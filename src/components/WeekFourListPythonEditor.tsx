import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { parseWeekFourListDraftEnvelope, parseWeekFourListPython } from '../engine/weekFourListPythonGrammar';
export interface WeekFourListPythonEditorHandle { focusConnector(): void; focusAction(): void }
export interface WeekFourListPythonEditorProps { code: string; disabled?: boolean; onCodeChange(code: string): void; onReady?(): void; onError?(message: string): void }
export const WeekFourListPythonEditor = forwardRef<WeekFourListPythonEditorHandle, WeekFourListPythonEditorProps>(function Editor({code, disabled = false, onCodeChange, onReady, onError}, ref) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const current = useRef({code, disabled, onCodeChange, onReady, onError}); current.current = {code, disabled, onCodeChange, onReady, onError};
  const sync = useRef(false);
  const setEditable = useRef<(value: boolean) => void>(() => {});
  const first = useRef<HTMLSelectElement>(null); const action = useRef<HTMLSelectElement>(null);
  const [error, setError] = useState<string | null>(null);
  useImperativeHandle(ref, () => {
    const focusLine = (line: number) => {
      const view = editor.current; if (!view) return;
      const target = view.state.doc.line(Math.min(line, view.state.doc.lines));
      view.dispatch({selection: {anchor: target.from, head: target.to}, scrollIntoView: true}); view.focus();
    };
    return {focusConnector: () => focusLine(1), focusAction: () => focusLine(3)};
  }, []);
  useEffect(() => {
    let disposed = false;
    void Promise.all([import('@codemirror/state'), import('@codemirror/view'), import('@codemirror/lang-python')]).then(([state, view, python]) => {
      if (disposed || !host.current) return;
      const editable = new state.Compartment();
      editor.current = new view.EditorView({parent: host.current, state: state.EditorState.create({doc: current.current.code, extensions: [
        python.python(), view.lineNumbers(), view.EditorView.lineWrapping,
        state.EditorState.transactionFilter.of(tr => {
          if (!tr.docChanged) return tr;
          if (current.current.disabled && !sync.current) return [];
          try { parseWeekFourListDraftEnvelope(tr.newDoc.toString()); return tr; } catch { return []; }
        }),
        view.EditorView.updateListener.of(update => { if (update.docChanged && !sync.current && !current.current.disabled) current.current.onCodeChange(update.state.doc.toString()); }),
        view.EditorView.contentAttributes.of({'aria-label': 'W4-M4 Python 代码', 'aria-describedby': 'week-four-list-editor-rules', role: 'textbox', 'aria-multiline': 'true'}),
        editable.of(view.EditorView.editable.of(!current.current.disabled)),
      ]})});
      setEditable.current = value => editor.current?.dispatch({effects: editable.reconfigure(view.EditorView.editable.of(value))});
      current.current.onReady?.();
    }).catch(() => { if (!disposed) { setError('Python 编辑器暂时无法加载。'); current.current.onError?.('Python 编辑器暂时无法加载。'); } });
    return () => { disposed = true; editor.current?.destroy(); editor.current = null; };
  }, []);
  useEffect(() => { setEditable.current(!disabled); }, [disabled]);
  useEffect(() => {
    const v = editor.current; if (!v || v.state.doc.toString() === code) return;
    sync.current = true; try { v.dispatch({changes: {from: 0, to: v.state.doc.length, insert: code}}); } finally { sync.current = false; }
  }, [code]);
  const parsed = parseWeekFourListPython(code);
  const items = 'state' in parsed ? null : parsed.trace[0];
  const list = items?.kind === 'list-created' ? items.items : null;
  const publish = (next: string) => { if (!disabled && !error) {
    const v = editor.current;
    if (v) v.dispatch({changes: {from: 0, to: v.state.doc.length, insert: next}});
    else onCodeChange(next);
  }};
  const changeItem = (index: number, value: string) => {
    if (!list) return; const next = [...list]; next[index] = value as typeof next[number];
    const lines = code.replaceAll('\r\n', '\n').split('\n'); lines[0] = `appearances = [${next.map(x => JSON.stringify(x)).join(', ')}]`; publish(lines.join('\n'));
  };
  return <section className="week-four-list-python-panel">
    <h3>编写逐项观察程序</h3>
    <p id="week-four-list-editor-rules">列表保存先后顺序。每轮循环取出一个 item，print 把一个值记入观察册。可直接编辑代码；下方选择也会改动同一份代码。</p>
    <div ref={host} className="week-four-list-codemirror" />
    {error ? <p role="alert">{error}</p> : null}
    <div className="week-four-list-controls">
      {list?.map((value, i) => <label key={i}>列表第 {i + 1} 项<select ref={i === 0 ? first : undefined} aria-label={`列表第 ${i+1} 项`} value={value} disabled={disabled || !!error} onChange={e => changeItem(i, e.target.value)}>{['女子','老妇','老翁'].map(x => <option key={x}>{x}</option>)}</select></label>)}
      {list ? <label>每轮记录<select ref={action} aria-label="每轮记录" value={'state' in parsed ? 'item' : parsed.structure === 'current-item' ? 'item' : code.replaceAll('\r\n','\n').split('\n')[2]!.slice(11,-2)} disabled={disabled || !!error} onChange={e => {
        const lines = code.replaceAll('\r\n','\n').split('\n'); lines[2] = `    print(${e.target.value === 'item' ? 'item' : JSON.stringify(e.target.value)})`; publish(lines.join('\n'));
      }}><option value="item">当前项 item</option>{['女子','老妇','老翁'].map(x => <option key={x} value={x}>固定文字“{x}”</option>)}</select></label> : <p>代码还在输入中；完成列表与循环结构后，快捷选择会恢复。</p>}
    </div>
  </section>;
});
