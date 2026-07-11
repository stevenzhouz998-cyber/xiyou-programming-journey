import { useEffect, useRef, useState } from 'react';
import { Play, SpinnerGap } from '@phosphor-icons/react';
import { runPython } from '../engine/pythonRunner';

interface Props {
  starterCode: string;
  expectedOutput: string;
  onPass: () => void;
}

export function PythonEditor({ starterCode, expectedOutput, onPass }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<any>(null);
  const [code, setCode] = useState(starterCode);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let disposed = false;
    if (!hostRef.current || navigator.userAgent.includes('jsdom')) return;
    void Promise.all([import('@codemirror/state'), import('@codemirror/view'), import('@codemirror/lang-python')]).then(([stateModule, viewModule, pythonModule]) => {
      if (disposed || !hostRef.current) return;
      const state = stateModule.EditorState.create({
        doc: starterCode,
        extensions: [pythonModule.python(), viewModule.EditorView.lineWrapping, viewModule.EditorView.updateListener.of((update) => { if (update.docChanged) setCode(update.state.doc.toString()); })],
      });
      viewRef.current = new viewModule.EditorView({ state, parent: hostRef.current });
    });
    return () => { disposed = true; viewRef.current?.destroy(); };
  }, [starterCode]);

  const execute = async () => {
    setRunning(true);
    const result = await runPython(code);
    setRunning(false);
    if (result.error) { setOutput(result.error); return; }
    setOutput(result.output);
    if (result.output.trim() === expectedOutput.trim()) onPass();
  };

  return (
    <section className="python-workspace">
      <p className="eyebrow">Python 经卷</p>
      <div className="code-editor" ref={hostRef}>
        <textarea aria-label="Python 代码" value={code} onChange={(event) => setCode(event.target.value)} />
      </div>
      <div className="console"><span>运行结果</span><pre>{output || '点击运行，看看代码会说什么。'}</pre></div>
      <button type="button" className="button button-primary" onClick={execute} disabled={running}>{running ? <SpinnerGap className="spin" size={20} /> : <Play weight="fill" size={20} />}{running ? '正在唤醒 Python…' : '运行 Python'}</button>
    </section>
  );
}
