import { useEffect, useRef, useState } from 'react';
import { ArrowsCounterClockwise, Play } from '@phosphor-icons/react';
import { commandLabel } from '../engine/commandLabels';

interface Props {
  missionId: string;
  commands: string[];
  onRun: (sequence: string[]) => void;
}

export function LegacyBlocklyWorkspace({ missionId, commands, onRun }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const blocklyRef = useRef<any>(null);
  const [sequence, setSequence] = useState(() => [] as string[]);

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom') || !hostRef.current) return;
    let disposed = false;
    void Promise.all([import('blockly/core'), import('blockly/msg/zh-hans')]).then(([Blockly, zhHans]) => {
      if (disposed || !hostRef.current) return;
      blocklyRef.current = Blockly;
      Blockly.setLocale(zhHans as unknown as Record<string, string>);
      if (!Blockly.Blocks.xiyou_action) {
        Blockly.defineBlocksWithJsonArray([{ type: 'xiyou_action', message0: '%1', args0: [{ type: 'field_input', name: 'ACTION', text: '原著动作' }], previousStatement: null, nextStatement: null, colour: 152, tooltip: '原著事件指令' }]);
      }
      const workspace = Blockly.inject(hostRef.current, {
        toolbox: { kind: 'flyoutToolbox', contents: [{ kind: 'block', type: 'xiyou_action' }] },
        trashcan: true,
        sounds: false,
        renderer: 'zelos',
        theme: Blockly.Theme.defineTheme('xiyou-legacy', {
          name: 'xiyou-legacy',
          base: Blockly.Themes.Classic,
          componentStyles: { workspaceBackgroundColour: '#f7f0df', toolboxBackgroundColour: '#e5d6b6', flyoutBackgroundColour: '#efe4cb' },
          blockStyles: { logic_blocks: { colourPrimary: '#2f735b' } },
        }),
      });
      workspaceRef.current = workspace;
    });
    return () => {
      disposed = true;
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
    };
  }, [missionId]);

  const addCommand = (command: string) => {
    setSequence((current) => [...current, command]);
    const Blockly = blocklyRef.current;
    const workspace = workspaceRef.current;
    if (Blockly && workspace) {
      Blockly.serialization.blocks.append({ type: 'xiyou_action', fields: { ACTION: commandLabel(command) } }, workspace);
    }
  };

  const reset = () => {
    setSequence([]);
    workspaceRef.current?.clear();
  };

  const moveCommand = (index: number, delta: -1 | 1) => setSequence((current) => {
    const target = index + delta;
    if (target < 0 || target >= current.length) return current;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const removeCommand = (index: number) => setSequence((current) => current.filter((_, itemIndex) => itemIndex !== index));

  return (
    <section className="code-workspace" aria-label="图形化编程工作台">
      <div className="command-palette">
        <p className="eyebrow">指令匣 · 点击加入卷轴</p>
        <div className="command-buttons">
          {[...commands].reverse().map((command) => (
            <button type="button" className="command-button" key={command} onClick={() => addCommand(command)}>{commandLabel(command)}</button>
          ))}
        </div>
      </div>
      <div className="blockly-host" ref={hostRef} aria-hidden="true" />
      <div className="command-scroll">
        <span className="eyebrow">当前指令卷轴</span>
        <ol>{sequence.map((command, index) => <li key={`${command}-${index}`}><span>{commandLabel(command)}</span><button type="button" aria-label={`上移：${commandLabel(command)}`} disabled={index === 0} onClick={() => moveCommand(index, -1)}>上移</button><button type="button" aria-label={`下移：${commandLabel(command)}`} disabled={index === sequence.length - 1} onClick={() => moveCommand(index, 1)}>下移</button><button type="button" aria-label={`删除：${commandLabel(command)}`} onClick={() => removeCommand(index)}>删除</button></li>)}</ol>
      </div>
      <div className="workspace-actions">
        <button type="button" className="button button-ghost" onClick={reset}><ArrowsCounterClockwise size={20} />重新排列</button>
        <button type="button" className="button button-primary" onClick={() => onRun(sequence)}><Play weight="fill" size={20} />运行指令</button>
      </div>
    </section>
  );
}
