import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { parseWeekFiveMonksDraftEnvelope, parseWeekFiveMonksPython } from '../engine/weekFiveMonksPythonGrammar';
export interface WeekFiveMonksPythonEditorHandle { focusConnector(): void; focusAction(): void }
export interface WeekFiveMonksPythonEditorProps { code: string; disabled?: boolean; onCodeChange(code: string): void; onReady?(): void; onError?(message: string): void }
export const WeekFiveMonksPythonEditor = forwardRef<WeekFiveMonksPythonEditorHandle, WeekFiveMonksPythonEditorProps>(function Editor({code, disabled = false, onCodeChange, onReady, onError}, ref) {
  const host = useRef<HTMLDivElement>(null);
  const editor = useRef<EditorView | null>(null);
  const current = useRef({code, disabled, onCodeChange, onReady, onError}); current.current = {code, disabled, onCodeChange, onReady, onError};
  const sync = useRef(false);
  const setEditable = useRef<(value: boolean) => void>(() => {});

  const [error, setError] = useState<string | null>(null);
  useImperativeHandle(ref, () => {
    const focusLine = (line: number) => {
      const view = editor.current; if (!view) return;
      const target = view.state.doc.line(Math.min(line, view.state.doc.lines));
      view.dispatch({selection: {anchor: target.from, head: target.to}, scrollIntoView: true}); view.focus();
    };
    return {focusConnector: () => focusLine(1), focusAction: () => focusLine(4)};
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
          try { parseWeekFiveMonksDraftEnvelope(tr.newDoc.toString()); return tr; } catch { return []; }
        }),
        view.EditorView.updateListener.of(update => { if (update.docChanged && !sync.current && !current.current.disabled) current.current.onCodeChange(update.state.doc.toString()); }),
        view.EditorView.contentAttributes.of({'aria-label': 'W5-M1 Python 代码', 'aria-describedby': 'week-five-monks-editor-rules', role: 'textbox', 'aria-multiline': 'true'}),
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
  const lines = code.replaceAll('\r\n','\n').split('\n');
  const parsed = parseWeekFiveMonksPython(code);
  const publish = (index: number, text: string) => {
    if (disabled || error) return;
    const next = [...lines]; next[index] = text;
    const v = editor.current;
    if (v) v.dispatch({changes: {from: 0, to: v.state.doc.length, insert: next.join('\n')}});
    else onCodeChange(next.join('\n'));
  };
  return <section className="week-five-monks-python-panel">
    <h3>编写逐人解困程序</h3>
    <p id="week-five-monks-editor-rules">monks 是练习名单，monk 是当前僧众。release 解除役使，register 登记离开。缩进属于循环的语句会逐人重复。可以直接编辑代码；快捷控件修改同一份代码。</p>
    <div ref={host} className="week-five-monks-codemirror" />
    {error ? <p role="alert">{error}</p> : null}
    <div className="week-five-monks-controls">
      {[2,3].map((line,i)=><label key={line}>{i===0?'第一条动作':'第二条动作'}<select aria-label={i===0?'第一条动作':'第二条动作'} disabled={disabled || !!error || 'state' in parsed} value={lines[line]?.trim().startsWith('register')?'register':'release'} onChange={e=>publish(line,lines[line]!.replace(/release|register/,e.target.value))}><option value="release">解除役使 release</option><option value="register">登记离开 register</option></select></label>)}
      <label>末行动作的位置<select aria-label="末行动作的位置" disabled={disabled || !!error || 'state' in parsed} value={lines[3]?.startsWith('    ')?'inside':'outside'} onChange={e=>publish(3,(e.target.value==='inside'?'    ':'')+lines[3]!.trim())}><option value="outside">循环外</option><option value="inside">循环内</option></select></label>
      {'state' in parsed ? <p>代码正在输入中。恢复四行名单与循环后，快捷控件可用。</p>:null}
    </div>
  </section>;
});
