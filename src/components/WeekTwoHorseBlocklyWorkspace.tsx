import * as Blockly from 'blockly';
import * as zhHans from 'blockly/msg/zh-hans';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { HORSE_CARE_BLOCK_LABELS, registerHorseCareBlocks } from '../blockly/weekTwoHorseBlocks';
import { compileHorseCareWorkspace, type HorseCareCompileResult } from '../blockly/weekTwoHorseCompiler';
import { HORSE_CARE_BLOCK_DEFINITIONS, type HorseCareBlockType, type HorseCareWorkspaceDraftV1 } from '../blockly/weekTwoHorseContract';

export interface WeekTwoHorseBlocklyWorkspaceAdapter { create(host: HTMLDivElement): Blockly.Workspace }

const defaultAdapter: WeekTwoHorseBlocklyWorkspaceAdapter = {
  create(host) {
    if (navigator.userAgent.includes('jsdom')) return new Blockly.Workspace();
    return Blockly.inject(host, {
      trashcan: true,
      sounds: false,
      renderer: 'zelos',
    });
  },
};
const AdapterContext = createContext(defaultAdapter);

export function WeekTwoHorseBlocklyWorkspaceAdapterProvider({ adapter, children }: { adapter: WeekTwoHorseBlocklyWorkspaceAdapter; children: ReactNode }) {
  return <AdapterContext.Provider value={adapter}>{children}</AdapterContext.Provider>;
}

Blockly.setLocale(zhHans as unknown as Record<string, string>);

interface Props {
  draft: HorseCareWorkspaceDraftV1;
  locked: boolean;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onDraftChange: (draft: HorseCareWorkspaceDraftV1) => { status: 'saved' | 'unsaved' | 'conflict' } | Promise<{ status: 'saved' | 'unsaved' | 'conflict' }>;
  onRun: (result: HorseCareCompileResult) => void;
}

function initialize(block: Blockly.Block) {
  const rendered = block as Blockly.Block & { initSvg?: () => void; render?: () => void };
  rendered.initSvg?.();
  rendered.render?.();
}

function fitWorkspace(workspace: Blockly.Workspace) {
  const visual = workspace as Blockly.WorkspaceSvg;
  if (typeof visual.zoomToFit !== 'function') return;
  window.requestAnimationFrame(() => {
    Blockly.svgResize(visual);
    visual.resizeContents();
    if (visual.getAllBlocks(false).length > 0) visual.zoomToFit();
    if (visual.getParentSvg().parentElement?.clientWidth && visual.getParentSvg().parentElement!.clientWidth <= 600) {
      visual.scrollX = 0;
      visual.scrollY = 0;
      visual.translate(0, 0);
    }
  });
}

function renderWorkspaceBlocks(workspace: Blockly.Workspace) {
  for (const block of workspace.getAllBlocks(false)) (block as Blockly.Block & { render?: () => void }).render?.();
}

function restore(workspace: Blockly.Workspace, draft: HorseCareWorkspaceDraftV1) {
  Blockly.Events.disable();
  try {
    workspace.clear();
    const blocks = new Map<string, Blockly.Block>();
    for (const item of draft.blocks) {
      const block = workspace.newBlock(item.type, item.id);
      if (item.type === 'xiyou_repeat_horse_care') block.setFieldValue(String(item.repeatCount), 'TIMES');
      block.moveBy(item.x, item.y);
      initialize(block);
      blocks.set(item.id, block);
    }
    for (const item of draft.blocks) {
      if (!item.nextId) continue;
      blocks.get(item.id)?.nextConnection?.connect(blocks.get(item.nextId)?.previousConnection!);
    }
    const predecessors = new Set(draft.blocks.flatMap((item) => item.nextId ? [item.nextId] : []));
    for (const item of draft.blocks) {
      if (!item.parentBlockId || predecessors.has(item.id)) continue;
      blocks.get(item.parentBlockId)?.getInput('CHILDREN')?.connection?.connect(blocks.get(item.id)?.previousConnection!);
    }
    renderWorkspaceBlocks(workspace);
  } finally {
    Blockly.Events.enable();
  }
}

function append(workspace: Blockly.Workspace, type: HorseCareBlockType): Blockly.Block {
  const block = workspace.newBlock(type);
  initialize(block);
  if (type === 'xiyou_care_next_horse') {
    const repeat = workspace.getAllBlocks(false).find((candidate) => candidate.type === 'xiyou_repeat_horse_care');
    const first = repeat?.getInputTargetBlock('CHILDREN') ?? null;
    if (repeat && !first) repeat.getInput('CHILDREN')?.connection?.connect(block.previousConnection!);
    else if (first) {
      let tail = first;
      while (tail.getNextBlock()) tail = tail.getNextBlock()!;
      tail.nextConnection?.connect(block.previousConnection!);
    }
  } else {
    const top = workspace.getTopBlocks(false).find((candidate) => candidate.id !== block.id);
    if (top) {
      let tail = top;
      while (tail.getNextBlock()) tail = tail.getNextBlock()!;
      tail.nextConnection?.connect(block.previousConnection!);
    }
  }
  return block;
}

export function WeekTwoHorseBlocklyWorkspace({ draft, locked, focusBlockId, onFocusHandled, onDraftChange, onRun }: Props) {
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
    const compiled = compileHorseCareWorkspace(workspace);
    const nextDraft = compiled.draft ?? { version: 1 as const, missionId: 'w2-m1' as const, blocks: [] };
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
    queueMicrotask(() => {
      saveQueuedRef.current = false;
      void save();
    });
  };

  useEffect(() => {
    registerHorseCareBlocks();
    const workspace = adapter.create(hostRef.current!);
    workspaceRef.current = workspace;
    const changed = (event: Blockly.Events.Abstract) => {
      if (applyingRef.current || event.isUiEvent) return;
      setVersion((value) => value + 1);
      scheduleSave();
    };
    workspace.addChangeListener(changed);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => fitWorkspace(workspace));
    if (resizeObserver && hostRef.current) resizeObserver.observe(hostRef.current);
    return () => {
      resizeObserver?.disconnect();
      workspace.removeChangeListener(changed);
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
  const hasRepeat = blocks.some((block) => block.type === 'xiyou_repeat_horse_care');
  const actions = Object.keys(HORSE_CARE_BLOCK_DEFINITIONS) as HorseCareBlockType[];
  return <section className="advanced-week-one-workspace horse-care-workspace" aria-label="弼马温 Blockly 工作区">
    <div className="advanced-week-one-palette" aria-label="弼马温积木工具箱">
      {actions.map((type) => {
        const nested = type === 'xiyou_care_next_horse';
        return <button key={type} type="button" disabled={locked || (nested && !hasRepeat)} onClick={() => {
          if (!workspaceRef.current) return;
          append(workspaceRef.current, type);
          renderWorkspaceBlocks(workspaceRef.current);
          fitWorkspace(workspaceRef.current);
          setVersion((value) => value + 1);
          scheduleSave();
        }}>加入{nested ? '循环体' : '主程序'}：{HORSE_CARE_BLOCK_LABELS[type]}</button>;
      })}
    </div>
    <div ref={hostRef} className="advanced-blockly-host" aria-label="弼马温可连接积木图" />
    <ol key={version} aria-label="弼马温程序树" className="advanced-program-tree">
      {blocks.map((block) => <li key={block.id}><span>{HORSE_CARE_BLOCK_LABELS[block.type as HorseCareBlockType]}{block.type === 'xiyou_repeat_horse_care' ? `：${block.getFieldValue('TIMES')} 次` : ''}</span>{block.type === 'xiyou_repeat_horse_care' ? <><button type="button" disabled={locked || Number(block.getFieldValue('TIMES')) <= 1} onClick={() => { block.setFieldValue(String(Number(block.getFieldValue('TIMES')) - 1), 'TIMES'); setVersion((value) => value + 1); scheduleSave(); }}>减少循环次数</button><button type="button" disabled={locked || Number(block.getFieldValue('TIMES')) >= 6} onClick={() => { block.setFieldValue(String(Number(block.getFieldValue('TIMES')) + 1), 'TIMES'); setVersion((value) => value + 1); scheduleSave(); }}>增加循环次数</button></> : null}<button type="button" disabled={locked} onClick={() => { block.dispose(true); setVersion((value) => value + 1); scheduleSave(); }}>删除</button></li>)}
    </ol>
    {saveState !== 'idle' ? <div role="alert">{saveState === 'conflict' ? '其他标签页已经更新，这次积木更改暂停保存。' : '这次积木更改还没有保存。'}{saveState === 'unsaved' ? <button type="button" onClick={() => void save()}>重试保存积木</button> : null}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-primary" disabled={locked} onClick={() => void (async () => {
      const saved = await save();
      if (saved.status === 'saved' && workspaceRef.current) onRun(compileHorseCareWorkspace(workspaceRef.current));
    })()}>执行弼马温循环</button></div>
  </section>;
}
