import * as Blockly from 'blockly';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { BAJIE_JOINING_BLOCK_LABELS, registerBajieJoiningBlocks } from '../blockly/weekThreeBajieJoiningBlocks';
import { compileBajieJoiningWorkspace, restoreBajieJoiningWorkspace, type BajieJoiningCompileResult } from '../blockly/weekThreeBajieJoiningCompiler';
import type { BajieJoiningWorkspaceDraftV1 } from '../blockly/weekThreeBajieJoiningContract';

export type BajieJoiningSaveResult = { status: 'saved' | 'unsaved' | 'conflict' };
export interface WeekThreeBajieJoiningBlocklyWorkspaceProps {
  draft: BajieJoiningWorkspaceDraftV1;
  locked: boolean;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onDraftChange: (draft: BajieJoiningWorkspaceDraftV1) => Promise<BajieJoiningSaveResult>;
  onRun: (result: BajieJoiningCompileResult) => void;
}

const serial = (draft: BajieJoiningWorkspaceDraftV1) => JSON.stringify(draft);
const renderWorkspace = (workspace: Blockly.Workspace) => {
  for (const block of workspace.getAllBlocks(false)) (block as Blockly.Block & { initSvg?: () => void }).initSvg?.();
  for (const block of workspace.getTopBlocks(false)) (block as Blockly.Block & { render?: () => void }).render?.();
};
const restoreVisibleWorkspace = (workspace: Blockly.Workspace, draft: BajieJoiningWorkspaceDraftV1) => {
  Blockly.Events.disable();
  try { restoreBajieJoiningWorkspace(workspace, draft); renderWorkspace(workspace); }
  finally { Blockly.Events.enable(); }
};
const structuralMessage = (result: BajieJoiningCompileResult) => result.ok ? '' : result.diagnostics[0]?.code === 'missing-boolean-input'
  ? '两个条件都要放进组合积木里，再试一次。'
  : '积木连接还没有整理好，先检查组合积木。';
type PendingSnapshot = { draft: BajieJoiningWorkspaceDraftV1; serial: string };
const fitWorkspace = (workspace: Blockly.Workspace, host: HTMLElement | null) => {
  const visual = workspace as Blockly.WorkspaceSvg & {
    getBlocksBoundingBox(): { getWidth(): number };
    setScale(scale: number): void;
    scrollX: number;
    scrollY: number;
    translate(x: number, y: number): void;
  };
  if (typeof visual.zoomToFit !== 'function') return;
  window.requestAnimationFrame(() => {
    const hostWidth = host?.getBoundingClientRect().width || host?.clientWidth || 0;
    const narrow = hostWidth > 0 && hostWidth <= 600;
    if (narrow) {
      const root = visual.getTopBlocks(false)[0];
      if (root) {
        Blockly.Events.disable();
        try {
          const point = root.getRelativeToSurfaceXY();
          root.moveBy(12 - point.x, 10 - point.y);
        } finally { Blockly.Events.enable(); }
      }
    }
    Blockly.svgResize(visual);
    visual.resizeContents();
    if (visual.getAllBlocks(false).length) visual.zoomToFit();
    if (narrow) {
      const available = Math.max(0, hostWidth - 24);
      const rendered = visual.getBlocksBoundingBox().getWidth() * visual.scale;
      if (available > 0 && rendered > available) visual.setScale(visual.scale * available / rendered);
      visual.scrollX = 0;
      visual.scrollY = 0;
      visual.translate(0, 0);
    }
  });
};

export function WeekThreeBajieJoiningBlocklyWorkspace({ draft, locked, focusBlockId, onFocusHandled, onDraftChange, onRun }: WeekThreeBajieJoiningBlocklyWorkspaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const applyingRef = useRef(false);
  const aliveRef = useRef(true);
  const syncedDraftRef = useRef<string | null>(null);
  const localDraftRef = useRef<string | null>(null);
  const inFlightRef = useRef<Promise<BajieJoiningSaveResult> | null>(null);
  const queuedRef = useRef<PendingSnapshot | null>(null);
  const onDraftChangeRef = useRef(onDraftChange);
  const [message, setMessage] = useState('');
  onDraftChangeRef.current = onDraftChange;

  const focusBlock = (id: string | null) => {
    const block = id ? workspaceRef.current?.getBlockById(id) as (Blockly.Block & { select?: () => void; getSvgRoot?: () => SVGElement }) | null : null;
    block?.select?.();
    block?.getSvgRoot?.()?.focus();
  };
  const persistSnapshot = async ({ draft: snapshot, serial: value }: PendingSnapshot): Promise<BajieJoiningSaveResult> => {
    if (value === syncedDraftRef.current) return { status: 'saved' };
    localDraftRef.current = value;
    if (inFlightRef.current) {
      queuedRef.current = { draft: structuredClone(snapshot), serial: value };
      return inFlightRef.current;
    }
    const request = onDraftChangeRef.current(snapshot).catch(() => ({ status: 'unsaved' as const }));
    inFlightRef.current = request;
    const result = await request;
    if (inFlightRef.current === request) inFlightRef.current = null;
    const queued = queuedRef.current;
    if (queued && queued.serial !== value) {
      queuedRef.current = null;
      return persistSnapshot(queued);
    }
    if (result.status === 'saved') syncedDraftRef.current = value;
    if (aliveRef.current) setMessage(result.status === 'saved' ? '' : result.status === 'conflict' ? '其他标签页已经更新，当前积木等待处理。' : '积木尚未保存，可稍后重试。');
    return result;
  };
  const saveVisibleDraft = async (): Promise<BajieJoiningSaveResult> => {
    const workspace = workspaceRef.current;
    if (!workspace) return { status: 'unsaved' };
    const compiled = compileBajieJoiningWorkspace(workspace);
    if (!compiled.ok) {
      if (aliveRef.current) setMessage(structuralMessage(compiled));
      focusBlock(compiled.diagnostics[0]?.sourceBlockId ?? null);
      return { status: 'unsaved' };
    }
    const snapshot = compiled.draft;
    const value = serial(snapshot);
    if (value === syncedDraftRef.current) return { status: 'saved' };
    return persistSnapshot({ draft: structuredClone(snapshot), serial: value });
  };

  useEffect(() => {
    aliveRef.current = true;
    registerBajieJoiningBlocks();
    const workspace = navigator.userAgent.includes('jsdom') ? new Blockly.Workspace() : Blockly.inject(hostRef.current!, { renderer: 'zelos', trashcan: false, sounds: false });
    workspaceRef.current = workspace;
    const changed = (event: Blockly.Events.Abstract) => { if (!applyingRef.current && !event.isUiEvent) void saveVisibleDraft(); };
    workspace.addChangeListener(changed);
    const observer = typeof ResizeObserver === 'undefined' || !hostRef.current ? null : new ResizeObserver(() => fitWorkspace(workspace, hostRef.current));
    if (hostRef.current) observer?.observe(hostRef.current);
    return () => { aliveRef.current = false; observer?.disconnect(); workspace.removeChangeListener(changed); workspace.dispose(); workspaceRef.current = null; };
  }, []);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const incoming = serial(draft);
    if (incoming === syncedDraftRef.current) return;
    if (localDraftRef.current !== null && incoming !== localDraftRef.current) return;
    applyingRef.current = true;
    try { restoreVisibleWorkspace(workspace, draft); fitWorkspace(workspace, hostRef.current); syncedDraftRef.current = incoming; localDraftRef.current = incoming; if (aliveRef.current) setMessage(''); }
    catch { if (aliveRef.current) setMessage('已保存的积木无法安全恢复。'); }
    finally { applyingRef.current = false; }
  }, [draft]);

  useEffect(() => {
    if (!focusBlockId) return;
    focusBlock(focusBlockId);
    onFocusHandled();
  }, [focusBlockId, onFocusHandled]);

  const swapSensors = () => {
    const workspace = workspaceRef.current;
    const operation = workspace?.getBlockById('bajie-boolean-operation');
    const left = operation?.getInputTargetBlock('LEFT');
    const right = operation?.getInputTargetBlock('RIGHT');
    if (!workspace || !operation || !left || !right || locked) return;
    left.outputConnection?.disconnect();
    right.outputConnection?.disconnect();
    operation.getInput('LEFT')?.connection?.connect(right.outputConnection!);
    operation.getInput('RIGHT')?.connection?.connect(left.outputConnection!);
    renderWorkspace(workspace);
    fitWorkspace(workspace, hostRef.current);
    void saveVisibleDraft();
  };
  const recoverSavedDraft = () => {
    const workspace = workspaceRef.current;
    if (!workspace || locked) return;
    applyingRef.current = true;
    try { restoreVisibleWorkspace(workspace, draft); fitWorkspace(workspace, hostRef.current); syncedDraftRef.current = serial(draft); localDraftRef.current = serial(draft); setMessage(''); }
    catch { setMessage('已保存的积木无法安全恢复。'); }
    finally { applyingRef.current = false; }
  };
  const editSelectedOperator = (event: KeyboardEvent<HTMLDivElement>) => {
    if (locked || (event.key !== 'Enter' && event.key !== ' ')) return;
    const operation = workspaceRef.current?.getBlockById('bajie-boolean-operation');
    if (!operation) return;
    event.preventDefault();
    operation.setFieldValue(operation.getFieldValue('OPERATOR') === 'and' ? 'or' : 'and', 'OPERATOR');
  };
  const run = () => {
    const result: BajieJoiningCompileResult = workspaceRef.current ? compileBajieJoiningWorkspace(workspaceRef.current) : { ok: false, draft: null, trace: [], diagnostics: [{ code: 'empty-workspace', sourceBlockId: null, concept: 'program-structure' }] };
    if (!result.ok) { setMessage(structuralMessage(result)); focusBlock(result.diagnostics[0]?.sourceBlockId ?? null); }
    onRun(result);
  };

  return <section className="advanced-week-one-workspace" aria-label="八戒归队 Blockly 工作区">
    <div className="advanced-week-one-palette" aria-label="八戒归队积木操作">
      <button className="button button-ghost" type="button" disabled={locked} onClick={swapSensors}>交换两个条件的位置</button>
      <button className="button button-ghost" type="button" disabled={locked} onClick={recoverSavedDraft}>恢复已保存积木</button>
    </div>
    <div ref={hostRef} tabIndex={0} onKeyDown={editSelectedOperator} className="advanced-blockly-host" aria-label="八戒归队可连接积木图" />
    <p role="status" aria-live="polite">{message}</p>
    <div className="workspace-actions"><button className="button button-primary" type="button" disabled={locked} onClick={run}>执行入队判断</button></div>
    <small>{BAJIE_JOINING_BLOCK_LABELS.w3_bajie_boolean_operation}</small>
  </section>;
}
