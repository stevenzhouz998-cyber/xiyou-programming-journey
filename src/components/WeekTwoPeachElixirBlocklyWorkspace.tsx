import * as Blockly from 'blockly';
import * as zhHans from 'blockly/msg/zh-hans';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { PEACH_ELIXIR_BLOCK_LABELS, registerPeachElixirBlocks } from '../blockly/weekTwoPeachElixirBlocks';
import { compilePeachElixirWorkspace, snapshotPeachElixirWorkspace, type PeachElixirCompileResult } from '../blockly/weekTwoPeachElixirCompiler';
import type { PeachElixirBlockType, PeachElixirWorkspaceDraftV1 } from '../blockly/weekTwoPeachElixirContract';

export interface WeekTwoPeachElixirBlocklyWorkspaceAdapter { create(host: HTMLDivElement): Blockly.Workspace }
const defaultAdapter: WeekTwoPeachElixirBlocklyWorkspaceAdapter = {
  create(host) {
    if (navigator.userAgent.includes('jsdom')) return new Blockly.Workspace();
    return Blockly.inject(host, { trashcan: true, sounds: false, renderer: 'zelos' });
  },
};
const AdapterContext = createContext(defaultAdapter);
export function WeekTwoPeachElixirBlocklyWorkspaceAdapterProvider({ adapter, children }: { adapter: WeekTwoPeachElixirBlocklyWorkspaceAdapter; children: ReactNode }) {
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>;
}
Blockly.setLocale(zhHans as unknown as Record<string, string>);

interface Props {
  draft: PeachElixirWorkspaceDraftV1;
  locked: boolean;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onDraftChange: (draft: PeachElixirWorkspaceDraftV1) => { status: 'saved' | 'unsaved' | 'conflict' } | Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>;
  onRun: (result: PeachElixirCompileResult) => void;
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
    visual.resizeContents();
    if (visual.getAllBlocks(false).length > 0) visual.zoomToFit();
  });
}
function restore(workspace: Blockly.Workspace, draft: PeachElixirWorkspaceDraftV1) {
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
    renderBlocks(workspace);
  } finally {
    Blockly.Events.enable();
  }
}
function programOrder(workspace: Blockly.Workspace): Blockly.Block[] {
  const all = workspace.getAllBlocks(false);
  const roots = all.filter((block) => block.getPreviousBlock() === null).sort((left, right) => left.id.localeCompare(right.id));
  const ordered: Blockly.Block[] = [];
  const seen = new Set<string>();
  for (const root of roots) {
    for (let current: Blockly.Block | null = root; current; current = current.getNextBlock()) {
      if (seen.has(current.id)) break;
      seen.add(current.id);
      ordered.push(current);
    }
  }
  return [...ordered, ...all.filter((block) => !seen.has(block.id)).sort((left, right) => left.id.localeCompare(right.id))];
}
function reconnect(workspace: Blockly.Workspace, desired: Blockly.Block[]) {
  Blockly.Events.disable();
  try {
    for (const block of workspace.getAllBlocks(false)) {
      if (block.previousConnection?.isConnected()) block.previousConnection.disconnect();
      if (block.nextConnection?.isConnected()) block.nextConnection.disconnect();
    }
    for (let index = 0; index < desired.length - 1; index += 1) desired[index].nextConnection!.connect(desired[index + 1].previousConnection!);
    renderBlocks(workspace);
  } finally {
    Blockly.Events.enable();
  }
}

export function WeekTwoPeachElixirBlocklyWorkspace({ draft, locked, focusBlockId, onFocusHandled, onDraftChange, onRun }: Props) {
  const adapter = useContext(AdapterContext);
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const applyingRef = useRef(false);
  const onDraftChangeRef = useRef(onDraftChange);
  const saveQueuedRef = useRef(false);
  const saveInFlightRef = useRef<{ serialized: string; promise: Promise<{ status: 'saved' | 'unsaved' | 'conflict' }> } | null>(null);
  const lastSyncedDraftRef = useRef<string | null>(null);
  const [version, setVersion] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'unsaved' | 'conflict'>('idle');
  onDraftChangeRef.current = onDraftChange;

  const save = async () => {
    const workspace = workspaceRef.current;
    if (!workspace) return { status: 'unsaved' as const };
    const nextDraft = snapshotPeachElixirWorkspace(workspace);
    const serialized = JSON.stringify(nextDraft);
    if (lastSyncedDraftRef.current === serialized) return { status: 'saved' as const };
    const inFlight = saveInFlightRef.current;
    if (inFlight) {
      if (inFlight.serialized === serialized) return inFlight.promise;
      await inFlight.promise;
      return save();
    }
    const promise = (async () => {
      const result = await onDraftChangeRef.current(nextDraft);
      if (result.status === 'saved') lastSyncedDraftRef.current = serialized;
      setSaveState(result.status === 'saved' ? 'idle' : result.status);
      return result;
    })();
    saveInFlightRef.current = { serialized, promise };
    try {
      return await promise;
    } finally {
      if (saveInFlightRef.current?.promise === promise) saveInFlightRef.current = null;
    }
  };
  const scheduleSave = () => {
    if (saveQueuedRef.current) return;
    saveQueuedRef.current = true;
    queueMicrotask(() => { saveQueuedRef.current = false; void save(); });
  };
  const changed = () => {
    const workspace = workspaceRef.current!;
    renderBlocks(workspace);
    fitWorkspace(workspace);
    setVersion((value) => value + 1);
    scheduleSave();
  };

  useEffect(() => {
    registerPeachElixirBlocks();
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
    return () => { resizeObserver?.disconnect(); workspace.removeChangeListener(listener); workspace.dispose(); workspaceRef.current = null; };
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

  const workspace = workspaceRef.current;
  const blocks = workspace ? programOrder(workspace) : [];
  const move = (block: Blockly.Block, delta: -1 | 1) => {
    if (!workspace) return;
    const chain = programOrder(workspace);
    const index = chain.indexOf(block);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= chain.length) return;
    [chain[index], chain[target]] = [chain[target], chain[index]];
    reconnect(workspace, chain);
    changed();
  };

  return <section className="advanced-week-one-workspace peach-elixir-workspace" aria-label="蟠桃与金丹 Blockly 顺序调试工作区">
    <div ref={hostRef} className="advanced-blockly-host" aria-label="蟠桃与金丹可连接调试图" />
    <ol key={version} aria-label="当前故事积木顺序" className="advanced-program-tree">
      {blocks.map((block, index) => {
        const label = PEACH_ELIXIR_BLOCK_LABELS[block.type as PeachElixirBlockType];
        return <li key={block.id}><span>{index + 1}. {label}</span><button type="button" aria-label={`将 ${label} 上移一步`} disabled={locked || index === 0} onClick={() => move(block, -1)}>上移</button><button type="button" aria-label={`将 ${label} 下移一步`} disabled={locked || index === blocks.length - 1} onClick={() => move(block, 1)}>下移</button><button type="button" aria-label={`删除 ${label}`} disabled={locked} onClick={() => { block.dispose(true); changed(); }}>删除</button></li>;
      })}
    </ol>
    {saveState !== 'idle' ? <div role="alert">{saveState === 'conflict' ? '其他标签页已经更新，这次积木更改暂停保存。' : '这次积木更改还没有保存。'}{saveState === 'unsaved' ? <button type="button" onClick={() => void save()}>重试保存积木</button> : null}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-primary" disabled={locked} onClick={() => void (async () => { const saved = await save(); if (saved.status === 'saved' && workspaceRef.current) onRun(compilePeachElixirWorkspace(workspaceRef.current)); })()}>运行调试后的故事</button></div>
  </section>;
}
