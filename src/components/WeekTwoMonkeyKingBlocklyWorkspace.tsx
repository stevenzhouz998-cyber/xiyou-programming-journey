import * as Blockly from 'blockly';
import * as zhHans from 'blockly/msg/zh-hans';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { MONKEY_KING_BLOCK_LABELS, registerMonkeyKingBlocks } from '../blockly/weekTwoMonkeyKingBlocks';
import { compileMonkeyKingWorkspace, type MonkeyKingCompileResult } from '../blockly/weekTwoMonkeyKingCompiler';
import type { MonkeyKingBlockType, MonkeyKingEventType, MonkeyKingWorkspaceDraftV1 } from '../blockly/weekTwoMonkeyKingContract';

export interface WeekTwoMonkeyKingBlocklyWorkspaceAdapter { create(host: HTMLDivElement): Blockly.Workspace }

const defaultAdapter: WeekTwoMonkeyKingBlocklyWorkspaceAdapter = {
  create(host) {
    if (navigator.userAgent.includes('jsdom')) return new Blockly.Workspace();
    return Blockly.inject(host, { trashcan: true, sounds: false, renderer: 'zelos' });
  },
};
const AdapterContext = createContext(defaultAdapter);

export function WeekTwoMonkeyKingBlocklyWorkspaceAdapterProvider({ adapter, children }: { adapter: WeekTwoMonkeyKingBlocklyWorkspaceAdapter; children: ReactNode }) {
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>;
}

Blockly.setLocale(zhHans as unknown as Record<string, string>);

interface Props {
  draft: MonkeyKingWorkspaceDraftV1;
  locked: boolean;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onDraftChange: (draft: MonkeyKingWorkspaceDraftV1) => { status: 'saved' | 'unsaved' | 'conflict' } | Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>;
  onRun: (result: MonkeyKingCompileResult) => void;
}

function initialize(block: Blockly.Block) {
  const rendered = block as Blockly.Block & { initSvg?: () => void; render?: () => void };
  rendered.initSvg?.();
  rendered.render?.();
}

function renderBlocks(workspace: Blockly.Workspace) {
  for (const block of workspace.getAllBlocks(false)) (block as Blockly.Block & { render?: () => void }).render?.();
}

function fitWorkspace(workspace: Blockly.Workspace) {
  const visual = workspace as Blockly.WorkspaceSvg;
  if (typeof visual.zoomToFit !== 'function') return;
  window.requestAnimationFrame(() => {
    Blockly.svgResize(visual);
    const width = visual.getParentSvg().parentElement?.clientWidth ?? 1000;
    if (width <= 600) {
      const returnHandler = visual.getAllBlocks(false).find((block) => block.type === 'xiyou_on_return_flower_fruit');
      const titleHandler = visual.getAllBlocks(false).find((block) => block.type === 'xiyou_on_heavenly_title');
      Blockly.Events.disable();
      try {
        if (returnHandler) {
          const point = returnHandler.getRelativeToSurfaceXY();
          returnHandler.moveBy(20 - point.x, 20 - point.y);
        }
        if (titleHandler) {
          const point = titleHandler.getRelativeToSurfaceXY();
          const nextY = returnHandler ? 20 + returnHandler.getHeightWidth().height + 42 : 20;
          titleHandler.moveBy(20 - point.x, nextY - point.y);
        }
      } finally {
        Blockly.Events.enable();
      }
    }
    visual.resizeContents();
    if (visual.getAllBlocks(false).length > 0) visual.zoomToFit();
  });
}

function restore(workspace: Blockly.Workspace, draft: MonkeyKingWorkspaceDraftV1) {
  Blockly.Events.disable();
  try {
    workspace.clear();
    const blocks = new Map<string, Blockly.Block>();
    for (const item of draft.blocks) {
      const block = workspace.newBlock(item.type, item.id);
      block.moveBy(item.x, item.y);
      initialize(block);
      blocks.set(item.id, block);
    }
    for (const item of draft.blocks) {
      if (item.nextId) blocks.get(item.id)?.nextConnection?.connect(blocks.get(item.nextId)?.previousConnection!);
    }
    const predecessors = new Set(draft.blocks.flatMap((item) => item.nextId ? [item.nextId] : []));
    for (const item of draft.blocks) {
      if (!item.parentBlockId || predecessors.has(item.id)) continue;
      blocks.get(item.parentBlockId)?.getInput('HANDLER')?.connection?.connect(blocks.get(item.id)?.previousConnection!);
    }
    renderBlocks(workspace);
  } finally {
    Blockly.Events.enable();
  }
}

const handlerType = (eventType: MonkeyKingEventType): MonkeyKingBlockType => eventType === 'return-to-flower-fruit' ? 'xiyou_on_return_flower_fruit' : 'xiyou_on_heavenly_title';

function appendHandler(workspace: Blockly.Workspace, eventType: MonkeyKingEventType) {
  const block = workspace.newBlock(handlerType(eventType));
  initialize(block);
  block.moveBy(eventType === 'return-to-flower-fruit' ? 20 : 360, 20);
  return block;
}

function appendAction(workspace: Blockly.Workspace, eventType: MonkeyKingEventType, type: Exclude<MonkeyKingBlockType, 'xiyou_on_return_flower_fruit' | 'xiyou_on_heavenly_title'>) {
  const handler = workspace.getAllBlocks(false).find((block) => block.type === handlerType(eventType));
  if (!handler) return null;
  const block = workspace.newBlock(type);
  initialize(block);
  const first = handler.getInputTargetBlock('HANDLER');
  if (!first) handler.getInput('HANDLER')?.connection?.connect(block.previousConnection!);
  else {
    let tail = first;
    while (tail.getNextBlock()) tail = tail.getNextBlock()!;
    tail.nextConnection?.connect(block.previousConnection!);
  }
  return block;
}

function actionChain(handler: Blockly.Block): Blockly.Block[] {
  const result: Blockly.Block[] = [];
  for (let block = handler.getInputTargetBlock('HANDLER'); block; block = block.getNextBlock()) result.push(block);
  return result;
}

function reorder(block: Blockly.Block, delta: -1 | 1) {
  const handler = block.getSurroundParent();
  if (!handler) return;
  const chain = actionChain(handler);
  const index = chain.indexOf(block);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= chain.length) return;
  [chain[index], chain[target]] = [chain[target], chain[index]];
  handler.getInput('HANDLER')?.connection?.disconnect();
  for (const item of chain) if (item.nextConnection?.isConnected()) item.nextConnection.disconnect();
  handler.getInput('HANDLER')?.connection?.connect(chain[0].previousConnection!);
  for (let position = 0; position < chain.length - 1; position += 1) chain[position].nextConnection?.connect(chain[position + 1].previousConnection!);
}

export function WeekTwoMonkeyKingBlocklyWorkspace({ draft, locked, focusBlockId, onFocusHandled, onDraftChange, onRun }: Props) {
  const adapter = useContext(AdapterContext);
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const applyingRef = useRef(false);
  const onDraftChangeRef = useRef(onDraftChange);
  const saveQueuedRef = useRef(false);
  const lastSyncedDraftRef = useRef<string | null>(null);
  const [version, setVersion] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'unsaved' | 'conflict'>('idle');
  onDraftChangeRef.current = onDraftChange;

  const save = async () => {
    const workspace = workspaceRef.current;
    if (!workspace) return { status: 'unsaved' as const };
    const compiled = compileMonkeyKingWorkspace(workspace);
    const nextDraft = compiled.draft ?? { version: 1 as const, missionId: 'w2-m2' as const, blocks: [] };
    const result = await onDraftChangeRef.current(nextDraft);
    if (result.status === 'saved') lastSyncedDraftRef.current = JSON.stringify(nextDraft);
    setSaveState(result.status === 'saved' ? 'idle' : result.status);
    return result;
  };
  const scheduleSave = () => {
    if (saveQueuedRef.current) return;
    saveQueuedRef.current = true;
    queueMicrotask(() => {
      saveQueuedRef.current = false;
      void save();
    });
  };
  const changed = () => {
    renderBlocks(workspaceRef.current!);
    fitWorkspace(workspaceRef.current!);
    setVersion((value) => value + 1);
    scheduleSave();
  };

  useEffect(() => {
    registerMonkeyKingBlocks();
    const workspace = adapter.create(hostRef.current!);
    workspaceRef.current = workspace;
    const listener = (event: Blockly.Events.Abstract) => {
      if (applyingRef.current || event.isUiEvent) return;
      setVersion((value) => value + 1);
      scheduleSave();
    };
    workspace.addChangeListener(listener);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => fitWorkspace(workspace));
    if (resizeObserver && hostRef.current) resizeObserver.observe(hostRef.current);
    return () => {
      resizeObserver?.disconnect();
      workspace.removeChangeListener(listener);
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const incoming = JSON.stringify(draft);
    if (lastSyncedDraftRef.current === incoming) return;
    applyingRef.current = true;
    restore(workspace, draft);
    applyingRef.current = false;
    lastSyncedDraftRef.current = incoming;
    fitWorkspace(workspace);
    setVersion((value) => value + 1);
  }, [draft]);
  useEffect(() => {
    if (!focusBlockId) return;
    const block = workspaceRef.current?.getBlockById(focusBlockId) as (Blockly.Block & { select?: () => void; getSvgRoot?: () => SVGElement }) | null;
    block?.select?.();
    block?.getSvgRoot?.()?.focus();
    onFocusHandled();
  }, [focusBlockId, onFocusHandled]);

  const blocks = workspaceRef.current?.getAllBlocks(false) ?? [];
  const returnHandler = blocks.find((block) => block.type === 'xiyou_on_return_flower_fruit');
  const titleHandler = blocks.find((block) => block.type === 'xiyou_on_heavenly_title');
  const actionOptions: Array<[MonkeyKingEventType, Exclude<MonkeyKingBlockType, 'xiyou_on_return_flower_fruit' | 'xiyou_on_heavenly_title'>]> = [
    ['return-to-flower-fruit', 'xiyou_raise_great_sage_flag'],
    ['return-to-flower-fruit', 'xiyou_accept_great_sage_title'],
    ['return-to-flower-fruit', 'xiyou_build_great_sage_residence'],
    ['heavenly-title-conferred', 'xiyou_raise_great_sage_flag'],
    ['heavenly-title-conferred', 'xiyou_accept_great_sage_title'],
    ['heavenly-title-conferred', 'xiyou_build_great_sage_residence'],
  ];
  const eventLabel = (eventType: MonkeyKingEventType) => eventType === 'return-to-flower-fruit' ? '返回花果山' : '天庭正式授号';

  return <section className="advanced-week-one-workspace monkey-king-workspace" aria-label="齐天大圣 Blockly 事件工作区">
    <div className="advanced-week-one-palette monkey-king-palette" aria-label="齐天大圣积木工具箱">
      <button type="button" disabled={locked || Boolean(returnHandler)} onClick={() => { if (workspaceRef.current) { appendHandler(workspaceRef.current, 'return-to-flower-fruit'); changed(); } }}>添加事件帽：返回花果山</button>
      <button type="button" disabled={locked || Boolean(titleHandler)} onClick={() => { if (workspaceRef.current) { appendHandler(workspaceRef.current, 'heavenly-title-conferred'); changed(); } }}>添加事件帽：天庭正式授号</button>
      {actionOptions.map(([eventType, type]) => <button key={`${eventType}:${type}`} type="button" disabled={locked || !(eventType === 'return-to-flower-fruit' ? returnHandler : titleHandler)} onClick={() => { if (workspaceRef.current && appendAction(workspaceRef.current, eventType, type)) changed(); }}>加入{eventLabel(eventType)}：{MONKEY_KING_BLOCK_LABELS[type]}</button>)}
    </div>
    <div ref={hostRef} className="advanced-blockly-host" aria-label="齐天大圣可连接事件图" />
    <ol key={version} aria-label="齐天大圣事件程序树" className="advanced-program-tree">
      {blocks.map((block) => {
        const parent = block.getSurroundParent();
        const chain = parent ? actionChain(parent) : [];
        const index = chain.indexOf(block);
        return <li key={block.id}><span>{parent ? `${MONKEY_KING_BLOCK_LABELS[parent.type as MonkeyKingBlockType]} → ` : ''}{MONKEY_KING_BLOCK_LABELS[block.type as MonkeyKingBlockType]}</span>{parent ? <><button type="button" disabled={locked || index <= 0} onClick={() => { reorder(block, -1); changed(); }}>上移</button><button type="button" disabled={locked || index < 0 || index >= chain.length - 1} onClick={() => { reorder(block, 1); changed(); }}>下移</button></> : null}<button type="button" disabled={locked} onClick={() => { block.dispose(true); changed(); }}>删除</button></li>;
      })}
    </ol>
    {saveState !== 'idle' ? <div role="alert">{saveState === 'conflict' ? '其他标签页已经更新，这次积木更改暂停保存。' : '这次积木更改还没有保存。'}{saveState === 'unsaved' ? <button type="button" onClick={() => void save()}>重试保存积木</button> : null}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-primary" disabled={locked} onClick={() => void (async () => {
      const saved = await save();
      if (saved.status === 'saved' && workspaceRef.current) onRun(compileMonkeyKingWorkspace(workspaceRef.current));
    })()}>派发两个事件</button></div>
  </section>;
}
