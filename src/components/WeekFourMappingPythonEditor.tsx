import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { parseWeekFourMappingPython } from '../engine/weekFourPythonMappingGrammar';

export interface WeekFourMappingPythonEditorProps {
  code: string;
  sourceSpan: { line: 1; from: number; to: number };
  disabled?: boolean;
  onCodeChange(nextCode: string): void;
}
export interface WeekFourMappingPythonEditorHandle { focusField(): void }

export const WeekFourMappingPythonEditor = forwardRef<WeekFourMappingPythonEditorHandle, WeekFourMappingPythonEditorProps>(function WeekFourMappingPythonEditor({ code, sourceSpan, disabled = false, onCodeChange }, ref) {
  const hostRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLSelectElement>(null);
  const viewRef = useRef<{ destroy(): void; dispatch(value: unknown): void } | null>(null);
  const [selected, setSelected] = useState<'appearance' | 'identity'>('appearance');
  const [error, setError] = useState<string | null>(null);
  useImperativeHandle(ref, () => ({ focusField: () => selectorRef.current?.focus() }), []);
  const fieldAtSpan = code.slice(sourceSpan.from, sourceSpan.to);
  const valid = sourceSpan.line === 1 && (fieldAtSpan === 'appearance' || fieldAtSpan === 'identity');
  useEffect(() => {
    if (!valid) { setError('保存的字段位置与 Python 文本不一致。'); return; }
    try { setSelected(parseWeekFourMappingPython(code).field); setError(null); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Python 文本无法恢复。'); }
  }, [code, sourceSpan.from, sourceSpan.to, valid]);
  useEffect(() => {
    let disposed = false;
    if (!hostRef.current || error || navigator.userAgent.includes('jsdom')) return;
    void Promise.all([import('@codemirror/state'), import('@codemirror/view'), import('@codemirror/lang-python')]).then(([state, view, python]) => {
      if (disposed || !hostRef.current) return;
      const editor = new view.EditorView({ state: state.EditorState.create({ doc: code, extensions: [python.python(), state.EditorState.readOnly.of(true)] }), parent: hostRef.current });
      viewRef.current = editor;
    });
    return () => { disposed = true; viewRef.current?.destroy(); viewRef.current = null; };
  }, [code, error]);
  const apply = (field: 'appearance' | 'identity') => {
    if (!valid || disabled) return;
    const current = code.slice(sourceSpan.from, sourceSpan.to);
    if (current !== 'appearance' && current !== 'identity') { setError('保存的字段位置与 Python 文本不一致。'); return; }
    const next = `${code.slice(0, sourceSpan.from)}${field}${code.slice(sourceSpan.to)}`;
    try { parseWeekFourMappingPython(next); setSelected(field); onCodeChange(next); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Python 文本无法恢复。'); }
  };
  return <section className="week-four-mapping-python-panel">
    <header><h3>Python 抄写本</h3><p>只能核对第一行的判断字段。</p></header>
    <div ref={hostRef} className="week-four-mapping-codemirror" aria-label="只读 Python 文本">{navigator.userAgent.includes('jsdom') ? <pre>{code}</pre> : null}</div>
    <label>选择 Python 判断字段
      <select ref={selectorRef} aria-label="选择 Python 判断字段" value={selected} disabled={disabled || Boolean(error)} onChange={(event) => apply(event.target.value as 'appearance' | 'identity')} onKeyDown={(event) => {
        if (event.key === 'End') { event.preventDefault(); event.currentTarget.value = 'identity'; setSelected('identity'); }
        if ((event.key === 'Enter' || event.key === ' ') && !disabled) { event.preventDefault(); apply(selected); }
      }}>
        <option value="appearance">appearance</option><option value="identity">identity</option>
      </select>
    </label>
    {error ? <p role="alert">无法恢复 Python 抄写本：{error}</p> : null}
  </section>;
});
