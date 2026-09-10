import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { parseWeekFourBossDraftEnvelope, parseWeekFourBossPython } from '../engine/weekFourBossPythonGrammar';
export interface WeekFourBossPythonEditorHandle { focusConnector(): void; focusAction(): void }
export interface WeekFourBossPythonEditorProps { code: string; disabled?: boolean; onCodeChange(code: string): void; onReady?(): void; onError?(message: string): void }
export const WeekFourBossPythonEditor = forwardRef<WeekFourBossPythonEditorHandle, WeekFourBossPythonEditorProps>(function Editor({code, disabled = false, onCodeChange, onReady, onError}, ref) {
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
    return {focusConnector: () => focusLine(2), focusAction: () => focusLine(4)};
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
          try { parseWeekFourBossDraftEnvelope(tr.newDoc.toString()); return tr; } catch { return []; }
        }),
        view.EditorView.updateListener.of(update => { if (update.docChanged && !sync.current && !current.current.disabled) current.current.onCodeChange(update.state.doc.toString()); }),
        view.EditorView.contentAttributes.of({'aria-label': 'W4-M5 Python 代码', 'aria-describedby': 'week-four-boss-editor-rules', role: 'textbox', 'aria-multiline': 'true'}),
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
  const parsed = parseWeekFourBossPython(code);
  const publish = (next: string) => { if (!disabled && !error) {
    const v = editor.current;
    if (v) v.dispatch({changes: {from: 0, to: v.state.doc.length, insert: next}});
    else onCodeChange(next);
  }};
  const lines = code.replaceAll('\r\n','\n').split('\n');
  const changeLine = (index:number, value:string) => { const next=[...lines];next[index]=value;publish(next.join('\n')); };
  const actionLabels = {keep_observing:'继续核验', polite_help:'礼貌帮助'};
  return <section className="week-four-boss-python-panel">
    <h3>编写身份核验程序</h3>
    <p id="week-four-boss-editor-rules">cards 是本轮公开卡片列表，for 逐张取出 card。read_identity 读取身份，read_appearance 读取外形；两个动作分别记录“继续核验”和“礼貌帮助”。这些工具由核验站提供。</p>
    <div ref={host} className="week-four-boss-codemirror" />
    {error ? <p role="alert">{error}</p> : null}
    <div className="week-four-boss-controls">
      {'state' in parsed ? <p>代码还在输入中；完成六行核验结构后，快捷选择会恢复。</p> : <>
       <label>身份变量来源<select aria-label="身份变量来源" value={parsed.structure} disabled={disabled||!!error} onChange={e=>changeLine(1,`    identity = ${e.target.value==='identity'?'read_identity(card)':e.target.value==='appearance'?'read_appearance(card)':'"白骨精"'}`)}><option value="identity">读取当前卡片身份</option><option value="appearance">读取当前卡片外形</option><option value="literal">固定文字“白骨精”</option></select></label>
       <label>判断条件<select aria-label="判断条件" value={lines[2]!.includes('!=')?'!=':'=='} disabled={disabled||!!error} onChange={e=>changeLine(2,`    if identity ${e.target.value} "白骨精":`)}><option value="==">身份等于白骨精</option><option value="!=">身份不等于白骨精</option></select></label>
       {[3,5].map(index=><label key={index}>{index===3?'条件成立时':'否则'}<select aria-label={index===3?'条件成立时':'否则'} value={lines[index]!.includes('keep_observing')?'keep_observing':'polite_help'} disabled={disabled||!!error} onChange={e=>changeLine(index,`        ${e.target.value}(card)`)}>{Object.entries(actionLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>)}
      </>}
    </div>
  </section>;
});
