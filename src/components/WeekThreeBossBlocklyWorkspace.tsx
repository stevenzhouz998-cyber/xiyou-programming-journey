import * as Blockly from 'blockly';
import { useEffect, useRef, useState } from 'react';
import { compileWeekThreeBossWorkspace, restoreWeekThreeBossWorkspace } from '../blockly/weekThreeBossWorkspaceCompiler';
import type { WeekThreeBossCompileResult } from '../blockly/weekThreeBossCompiler';
import { registerWeekThreeBossBlocks, WEEK_THREE_BOSS_TOOLBOX } from '../blockly/weekThreeBossBlocks';
import type { WeekThreeBossWorkspaceDraftV1 } from '../blockly/weekThreeBossContract';

export interface WeekThreeBossBlocklyWorkspaceProps {
  draft: WeekThreeBossWorkspaceDraftV1;
  locked?: boolean;
  focusBlockId?: string | null;
  onFocusHandled?: () => void;
  onDraftChange: (draft: WeekThreeBossWorkspaceDraftV1) => void | Promise<unknown>;
  onRun: (result: WeekThreeBossCompileResult) => void | Promise<unknown>;
}

export function WeekThreeBossBlocklyWorkspace({ draft, locked = false, focusBlockId = null, onFocusHandled, onDraftChange, onRun }: WeekThreeBossBlocklyWorkspaceProps) {
  const host = useRef<HTMLDivElement>(null); const workspace = useRef<Blockly.Workspace | null>(null); const restoring = useRef(false); const running = useRef(false); const [message, setMessage] = useState('');
  useEffect(() => { registerWeekThreeBossBlocks(); const current = navigator.userAgent.includes('jsdom') ? new Blockly.Workspace() : Blockly.inject(host.current!, { renderer: 'zelos', trashcan: false, sounds: false, toolbox: WEEK_THREE_BOSS_TOOLBOX }); workspace.current = current; const changed = (event: Blockly.Events.Abstract) => { if (restoring.current || event.isUiEvent) return; const compiled = compileWeekThreeBossWorkspace(current); if (compiled.ok) onDraftChange(compiled.draft); else setMessage('积木图连接还没有整理好。'); }; current.addChangeListener(changed); return () => { current.dispose(); workspace.current = null; }; }, []);
  useEffect(() => { if (!workspace.current) return; restoring.current = true; Blockly.Events.disable(); try { const restored = restoreWeekThreeBossWorkspace(workspace.current, draft); setMessage(restored.ok ? '' : '保存的积木图无法安全恢复。'); } catch { setMessage('保存的积木图无法安全恢复。'); } finally { Blockly.Events.enable(); restoring.current = false; } }, [draft]);
  useEffect(() => { if (!focusBlockId || !workspace.current) return; (workspace.current.getBlockById(focusBlockId) as unknown as { select?: () => void } | null)?.select?.(); onFocusHandled?.(); }, [focusBlockId, onFocusHandled]);
  // The visible helper is an accessibility fallback for touch and keyboard users. It only
  // creates a normal toolbox candidate and connects it to the same Blockly input.
  const replaceConditionFromToolbox = (slot: 'manor' | 'cuilan', candidate: 1 | 2) => {
    const current = workspace.current; if (!current || locked) return;
    const target = slot === 'manor' ? 'manor-if' : 'cuilan-identity-if';
    const toolboxCandidate = slot === 'manor'
      ? (candidate === 1 ? 'w3_boss_condition_mentions_gaolao' : 'w3_boss_condition_explicit_demon_help')
      : (candidate === 1 ? 'w3_boss_condition_appearance_matches_cuilan' : 'w3_boss_condition_identity_is_cuilan');
    const input = current.getBlockById(target)?.getInput('CONDITION'); const old = input?.connection?.targetBlock();
    if (!input?.connection || !old) return;
    old.unplug(false); old.dispose(false);
    const next = current.newBlock(toolboxCandidate); const rendered = next as unknown as { initSvg?: () => void; render?: () => void }; rendered.initSvg?.(); rendered.render?.(); input.connection.connect(next.outputConnection!);
    setMessage('候选条件已经连接到积木图。');
  };
  const swapYunzhanBranches = () => {
    const current = workspace.current; if (!current || locked) return;
    const block = current.getBlockById('yunzhan-if'); const thenInput = block?.getInput('THEN'); const elseInput = block?.getInput('ELSE');
    const thenBlock = thenInput?.connection?.targetBlock(); const elseBlock = elseInput?.connection?.targetBlock();
    if (!thenInput?.connection || !elseInput?.connection || !thenBlock?.previousConnection || !elseBlock?.previousConnection) return;
    thenBlock.unplug(false); elseBlock.unplug(false);
    thenInput.connection.connect(elseBlock.previousConnection); elseInput.connection.connect(thenBlock.previousConnection);
    setMessage('两个分支已经在积木图中交换。');
  };
  const selectBossOperator = () => {
    const field = workspace.current?.getBlockById('joining-combine')?.getField('OPERATOR');
    if (!field || locked) return;
    field.setValue(field.getValue() === 'and' ? 'or' : 'and');
    setMessage('归队组合方式已经在积木图中切换。');
  };
  const run = async () => { if (!workspace.current || locked || running.current) return; running.current = true; const compiled = compileWeekThreeBossWorkspace(workspace.current); if (!compiled.ok) setMessage('积木图连接还没有整理好。'); else setMessage(''); try { await onRun(compiled); } finally { running.current = false; } };
  return <section className="week-three-boss-workspace"><div ref={host} className="advanced-blockly-host" tabIndex={0} aria-label="第三周总试炼 Blockly 工作区" aria-disabled={locked} /><div className="week-three-boss-workspace-assist" aria-label="连接积木操作辅助"><p>拖动不方便时，可用这些候选与交换操作；它们会直接改变上面的同一张积木图。</p><fieldset disabled={locked}><legend>庄口条件候选</legend><button type="button" onClick={() => replaceConditionFromToolbox('manor', 1)}>候选一</button><button type="button" onClick={() => replaceConditionFromToolbox('manor', 2)}>候选二</button></fieldset><fieldset disabled={locked}><legend>后宅条件候选</legend><button type="button" onClick={() => replaceConditionFromToolbox('cuilan', 1)}>候选一</button><button type="button" onClick={() => replaceConditionFromToolbox('cuilan', 2)}>候选二</button></fieldset><button type="button" disabled={locked} onClick={swapYunzhanBranches}>交换云栈洞两个分支</button><button type="button" disabled={locked} onClick={selectBossOperator}>切换归队组合方式</button></div><p role="status">{message}</p><button className="button button-primary" type="button" disabled={locked} onClick={run}>运行整套试炼</button></section>;
}
