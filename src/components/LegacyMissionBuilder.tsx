import { useState } from 'react';
import { commandLabel } from '../engine/commandLabels';

interface Props {
  missionId: string;
  commands: string[];
  onRun: (sequence: string[]) => void;
}

export function LegacyMissionBuilder({ missionId, commands, onRun }: Props) {
  const [sequence, setSequence] = useState(() => [] as string[]);

  const moveCommand = (index: number, delta: -1 | 1) => setSequence((current) => {
    const target = index + delta;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  return (
    <section className="code-workspace legacy-mission-builder" aria-label="旧版指令序列兼容工具" data-mission-id={missionId}>
      <div className="legacy-tool-notice">
        <h2>兼容指令序列</h2>
        <p>旧版指令序列兼容工具（非正式 Blockly，未完成关卡升级）</p>
      </div>
      <div className="command-palette">
        <p className="eyebrow">可用指令</p>
        <div className="command-buttons">
          {commands.map((command) => (
            <button type="button" className="command-button" key={command} onClick={() => setSequence((current) => [...current, command])}>{commandLabel(command)}</button>
          ))}
        </div>
      </div>
      <div className="command-scroll">
        <span className="eyebrow">当前兼容序列 · 运行时只读取这里</span>
        <ol>{sequence.map((command, index) => <li key={`${command}-${index}`}><span>{commandLabel(command)}</span><button type="button" aria-label={`上移：${commandLabel(command)}`} disabled={index === 0} onClick={() => moveCommand(index, -1)}>上移</button><button type="button" aria-label={`下移：${commandLabel(command)}`} disabled={index === sequence.length - 1} onClick={() => moveCommand(index, 1)}>下移</button><button type="button" aria-label={`删除：${commandLabel(command)}`} onClick={() => setSequence((current) => current.filter((_, itemIndex) => itemIndex !== index))}>删除</button></li>)}</ol>
      </div>
      <div className="workspace-actions">
        <button type="button" className="button button-ghost" onClick={() => setSequence([])}>清空兼容序列</button>
        <button type="button" className="button button-primary" onClick={() => onRun(sequence)}>运行兼容指令</button>
      </div>
    </section>
  );
}
