import * as Blockly from 'blockly';
import * as zhHans from 'blockly/msg/zh-hans';
import { useEffect, useRef, useState } from 'react';
import { FURNACE_CONDITION_BLOCK_LABELS, registerFurnaceConditionBlocks } from '../blockly/weekTwoFurnaceConditionBlocks';
import { compileFurnaceConditionWorkspace, snapshotFurnaceConditionWorkspace, type FurnaceConditionCompileResult } from '../blockly/weekTwoFurnaceConditionCompiler';
import type { FurnaceConditionBlockType, FurnaceConditionWorkspaceDraftV1 } from '../blockly/weekTwoFurnaceConditionContract';

Blockly.setLocale(zhHans as unknown as Record<string, string>);

interface Props {
  draft: FurnaceConditionWorkspaceDraftV1;
  locked: boolean;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onDraftChange: (draft: FurnaceConditionWorkspaceDraftV1) => Promise<{ status: 'saved' | 'unsaved' | 'conflict' }> | { status: 'saved' | 'unsaved' | 'conflict' };
  onRun: (result: FurnaceConditionCompileResult) => void;
}
const sensors: FurnaceConditionBlockType[] = ['xiyou_condition_red_eyes', 'xiyou_condition_furnace_open', 'xiyou_condition_smoke_clears'];
const render = (workspace: Blockly.Workspace) => workspace.getAllBlocks(false).forEach((block) => (block as Blockly.Block & { initSvg?: () => void; render?: () => void }).render?.());
const init = (block: Blockly.Block) => { const visual = block as Blockly.Block & { initSvg?: () => void; render?: () => void }; visual.initSvg?.(); visual.render?.(); };

function restore(workspace: Blockly.Workspace, draft: FurnaceConditionWorkspaceDraftV1) {
  Blockly.Events.disable();
  try {
    workspace.clear();
    const blocks = new Map<string, Blockly.Block>();
    for (const item of draft.blocks) { const block = workspace.newBlock(item.type, item.id); block.moveBy(item.x, item.y); init(block); blocks.set(item.id, block); }
    for (const item of draft.blocks) if (item.nextId) blocks.get(item.id)?.nextConnection?.connect(blocks.get(item.nextId)?.previousConnection!);
    for (const item of draft.blocks) {
      if (item.type === 'xiyou_repeat_until_furnace_ready' && item.conditionBlockId) blocks.get(item.id)?.getInput('CONDITION')?.connection?.connect(blocks.get(item.conditionBlockId)?.outputConnection!);
      if (item.parentBlockId && item.previousId === null && item.type !== 'xiyou_condition_red_eyes' && item.type !== 'xiyou_condition_furnace_open' && item.type !== 'xiyou_condition_smoke_clears') blocks.get(item.parentBlockId)?.getInput('CHILDREN')?.connection?.connect(blocks.get(item.id)?.previousConnection!);
    }
    render(workspace);
  } finally { Blockly.Events.enable(); }
}

export function WeekTwoFurnaceConditionBlocklyWorkspace({ draft, locked, focusBlockId, onFocusHandled, onDraftChange, onRun }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const applying = useRef(false);
  const [version, setVersion] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'unsaved' | 'conflict'>('idle');
  const save = async () => {
    const workspace = workspaceRef.current;
    if (!workspace) return { status: 'unsaved' as const };
    const next = snapshotFurnaceConditionWorkspace(workspace);
    const result = await onDraftChange(next);
    setSaveState(result.status === 'saved' ? 'idle' : result.status);
    return result;
  };
  useEffect(() => {
    registerFurnaceConditionBlocks();
    const workspace = navigator.userAgent.includes('jsdom') ? new Blockly.Workspace() : Blockly.inject(host.current!, { trashcan: true, sounds: false, renderer: 'zelos' });
    workspaceRef.current = workspace;
    const changed = (event: Blockly.Events.Abstract) => { if (!applying.current && !event.isUiEvent) { setVersion((value) => value + 1); void save(); } };
    workspace.addChangeListener(changed);
    return () => { workspace.removeChangeListener(changed); workspace.dispose(); workspaceRef.current = null; };
  }, []);
  useEffect(() => { const workspace = workspaceRef.current; if (!workspace) return; applying.current = true; restore(workspace, draft); applying.current = false; setSaveState('idle'); setVersion((value) => value + 1); }, [draft]);
  useEffect(() => { if (!locked) setSaveState('idle'); }, [locked]);
  useEffect(() => { if (!focusBlockId) return; const block = workspaceRef.current?.getBlockById(focusBlockId) as (Blockly.Block & { select?: () => void; getSvgRoot?: () => SVGElement }) | null; block?.select?.(); block?.getSvgRoot?.()?.focus(); onFocusHandled(); }, [focusBlockId, onFocusHandled]);
  const replaceSensor = (type: FurnaceConditionBlockType) => {
    const workspace = workspaceRef.current; if (!workspace) return;
    const loop = workspace.getAllBlocks(false).find((block) => block.type === 'xiyou_repeat_until_furnace_ready'); if (!loop) return;
    const old = loop.getInputTargetBlock('CONDITION'); old?.outputConnection?.disconnect(); old?.dispose(false);
    const sensor = workspace.newBlock(type); init(sensor); loop.getInput('CONDITION')?.connection?.connect(sensor.outputConnection!); render(workspace); setVersion((value) => value + 1); void save();
  };
  const blocks = workspaceRef.current?.getAllBlocks(false) ?? [];
  return <section className="advanced-week-one-workspace furnace-condition-workspace" aria-label="八卦炉 Blockly 循环条件工作区">
    <div className="advanced-week-one-palette" aria-label="八卦炉条件传感器">
      {sensors.map((type) => <button key={type} type="button" disabled={locked} onClick={() => replaceSensor(type)}>换成：{FURNACE_CONDITION_BLOCK_LABELS[type]}</button>)}
    </div>
    <div ref={host} className="advanced-blockly-host" aria-label="八卦炉可连接循环条件图" />
    <ol key={version} className="advanced-program-tree" aria-label="八卦炉真实积木连接"><>{blocks.map((block) => <li key={block.id}>{FURNACE_CONDITION_BLOCK_LABELS[block.type as FurnaceConditionBlockType] ?? block.type}</li>)}</></ol>
    {saveState !== 'idle' ? <div role="alert">{saveState === 'conflict' ? '其他标签页已经更新，这次积木更改暂停保存。' : '这次积木更改还没有保存。'}{saveState === 'unsaved' ? <button type="button" onClick={() => void save()}>重试保存积木</button> : null}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-primary" disabled={locked} onClick={() => void (async () => { const saved = await save(); if (saved.status === 'saved' && workspaceRef.current) onRun(compileFurnaceConditionWorkspace(workspaceRef.current)); })()}>执行八卦炉循环</button></div>
  </section>;
}
