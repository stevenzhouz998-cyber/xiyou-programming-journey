import { useEffect, useRef, useState } from 'react';
import { ArrowsCounterClockwise, Play } from '@phosphor-icons/react';
import { commandLabel } from '../engine/commandLabels';

interface Props {
  missionId: string;
  commands: string[];
  onRun: (sequence: string[]) => void;
}

export function BlocklyWorkspace({ missionId, commands, onRun }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<any>(null);
  const blocklyRef = useRef<any>(null);
  const [sequence, setSequence] = useState<string[]>([]);

  useEffect(() => {
    if (navigator.userAgent.includes('jsdom') || !hostRef.current) return;
    let disposed = false;
    void import('blockly').then((Blockly) => {
      if (disposed || !hostRef.current) return;
      blocklyRef.current = Blockly;
      if (!Blockly.Blocks.xiyou_action) {
        Blockly.defineBlocksWithJsonArray([{ type: 'xiyou_action', message0: '%1', args0: [{ type: 'field_input', name: 'ACTION', text: '原著动作' }], previousStatement: null, nextStatement: null, colour: 152, tooltip: '原著事件指令' }]);
      }
      const workspace = Blockly.inject(hostRef.current, {
        toolbox: { kind: 'flyoutToolbox', contents: [{ kind: 'block', type: 'xiyou_action' }] },
        trashcan: true,
        sounds: false,
        renderer: 'zelos',
        theme: Blockly.Theme.defineTheme('xiyou', {
          name: 'xiyou',
          base: Blockly.Themes.Classic,
          componentStyles: { workspaceBackgroundColour: '#f7f0df', toolboxBackgroundColour: '#e5d6b6', flyoutBackgroundColour: '#efe4cb' },
          blockStyles: { logic_blocks: { colourPrimary: '#2f735b' } },
        }),
      });
      workspaceRef.current = workspace;
      const saved = localStorage.getItem(`xiyou-workspace-${missionId}`);
      if (saved) {
        try { Blockly.serialization.workspaces.load(JSON.parse(saved), workspace); } catch { localStorage.removeItem(`xiyou-workspace-${missionId}`); }
      }
      workspace.addChangeListener(() => {
        localStorage.setItem(`xiyou-workspace-${missionId}`, JSON.stringify(Blockly.serialization.workspaces.save(workspace)));
      });
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
        <ol>{sequence.map((command, index) => <li key={`${command}-${index}`}>{commandLabel(command)}</li>)}</ol>
      </div>
      <div className="workspace-actions">
        <button type="button" className="button button-ghost" onClick={reset}><ArrowsCounterClockwise size={20} />重新排列</button>
        <button type="button" className="button button-primary" onClick={() => onRun(sequence)}><Play weight="fill" size={20} />运行指令</button>
      </div>
    </section>
  );
}
