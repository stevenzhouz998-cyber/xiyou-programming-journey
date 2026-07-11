import { useState } from 'react';
import { CheckCircle, Play } from '@phosphor-icons/react';
import { commandLabel } from '../engine/commandLabels';

export function AiLab({ commands, onRun }: { commands: string[]; onRun: (sequence: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <section className="ai-lab">
      <div className="ai-notice"><CheckCircle size={22} weight="fill" /><span>这是本地模拟实验，不会连接真实 AI，也不会上传你的输入。</span></div>
      <p className="eyebrow">证据卡 · 按正确顺序选择</p>
      <div className="evidence-grid">
        {[...commands].reverse().map((command) => <button key={command} type="button" className={selected.includes(command) ? 'evidence-card selected' : 'evidence-card'} onClick={() => setSelected((items) => [...items, command])}>{commandLabel(command)}</button>)}
      </div>
      <ol className="selected-evidence">{selected.map((item, index) => <li key={`${item}-${index}`}>{commandLabel(item)}</li>)}</ol>
      <div className="workspace-actions"><button type="button" className="button button-ghost" onClick={() => setSelected([])}>清空重选</button><button type="button" className="button button-primary" onClick={() => onRun(selected)}><Play weight="fill" size={20} />核验答案</button></div>
    </section>
  );
}
