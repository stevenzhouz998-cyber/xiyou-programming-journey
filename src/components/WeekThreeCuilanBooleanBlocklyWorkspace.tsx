import * as Blockly from 'blockly';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CUILAN_BOOLEAN_BLOCK_LABELS, registerCuilanBooleanBlocks } from '../blockly/weekThreeCuilanBooleanBlocks';
import { compileCuilanBooleanWorkspace, restoreCuilanBooleanWorkspace, serializeCuilanBooleanWorkspace, type CuilanBooleanCompileResult } from '../blockly/weekThreeCuilanBooleanCompiler';
import type { CuilanBooleanWorkspaceDraftV1 } from '../blockly/weekThreeCuilanBooleanContract';

export type CuilanBooleanSaveResult = { status: 'saved' | 'unsaved' | 'conflict' };
export interface WeekThreeCuilanBooleanBlocklyWorkspaceProps {
  draft: CuilanBooleanWorkspaceDraftV1;
  locked: boolean;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onDraftChange: (draft: CuilanBooleanWorkspaceDraftV1) => Promise<CuilanBooleanSaveResult>;
  onRun: (result: CuilanBooleanCompileResult) => void;
}

const serial = (draft: CuilanBooleanWorkspaceDraftV1) => JSON.stringify(draft);
const keyboardClick = (event: KeyboardEvent<HTMLButtonElement>) => {
  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click(); }
};
const renderCuilanBlocks = (workspace: Blockly.Workspace) => {
  for (const block of workspace.getAllBlocks(false)) (block as Blockly.Block & { initSvg?: () => void }).initSvg?.();
  for (const block of workspace.getTopBlocks(false)) (block as Blockly.Block & { render?: () => void }).render?.();
};
const restoreVisibleCuilanWorkspace = (workspace: Blockly.Workspace, draft: CuilanBooleanWorkspaceDraftV1) => {
  Blockly.Events.disable();
  try { restoreCuilanBooleanWorkspace(workspace, draft); renderCuilanBlocks(workspace); }
  finally { Blockly.Events.enable(); }
};

export function WeekThreeCuilanBooleanBlocklyWorkspace({ draft, locked, focusBlockId, onFocusHandled, onDraftChange, onRun }: WeekThreeCuilanBooleanBlocklyWorkspaceProps) {
  const host = useRef<HTMLDivElement>(null); const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const applying = useRef(false); const alive = useRef(true); const last = useRef<string | null>(null); const inFlight = useRef<Promise<CuilanBooleanSaveResult> | null>(null); const queued = useRef(false); const onDraftRef = useRef(onDraftChange);
  const [saveState, setSaveState] = useState<'idle' | 'invalid' | 'unsaved' | 'conflict'>('idle');
  onDraftRef.current = onDraftChange;
  const save = async () => {
    const workspace = workspaceRef.current; if (!workspace) return { status: 'unsaved' as const };
    const compiled = compileCuilanBooleanWorkspace(workspace);
    if (!compiled.ok) { if (alive.current) setSaveState('invalid'); return { status: 'unsaved' as const }; }
    const snapshot = compiled.draft; const value = serial(snapshot);
    if (last.current === value) return { status: 'saved' as const };
    if (inFlight.current) { queued.current = true; return inFlight.current; }
    const request = onDraftRef.current(snapshot).catch(() => ({ status: 'unsaved' as const }));
    inFlight.current = request;
    const result = await request;
    if (inFlight.current === request) inFlight.current = null;
    if (result.status === 'saved') last.current = value;
    if (alive.current) setSaveState(result.status === 'saved' ? 'idle' : result.status);
    if (queued.current) { queued.current = false; void save(); }
    return result;
  };
  useEffect(() => {
    alive.current = true; registerCuilanBooleanBlocks();
    const workspace = navigator.userAgent.includes('jsdom') ? new Blockly.Workspace() : Blockly.inject(host.current!, { renderer: 'zelos', trashcan: true, sounds: false });
    workspaceRef.current = workspace;
    const changed = (event: Blockly.Events.Abstract) => { if (!applying.current && !event.isUiEvent) { void save(); } };
    workspace.addChangeListener(changed);
    return () => { alive.current = false; workspace.removeChangeListener(changed); workspace.dispose(); workspaceRef.current = null; };
  }, []);
  useEffect(() => {
    const workspace = workspaceRef.current; if (!workspace) return;
    const incoming = serial(draft); if (incoming === last.current) return;
    applying.current = true;
    try { restoreVisibleCuilanWorkspace(workspace, draft); last.current = incoming; if (alive.current) setSaveState('idle'); }
    catch { if (alive.current) setSaveState('invalid'); }
    finally { applying.current = false; }
  }, [draft]);
  useEffect(() => {
    if (!focusBlockId) return;
    const block = workspaceRef.current?.getBlockById(focusBlockId) as (Blockly.Block & { select?: () => void }) | null;
    block?.select?.(); onFocusHandled();
  }, [focusBlockId, onFocusHandled]);
  const setIdentity = () => {
    const workspace = workspaceRef.current; if (!workspace || locked) return;
    const gate = workspace.getBlockById('cuilan-identity-if'); const old = workspace.getBlockById('cuilan-identity-condition');
    old?.dispose(); const next = workspace.newBlock('w3_cuilan_condition_identity_is_cuilan', 'cuilan-identity-condition');
    gate?.getInput('CONDITION')?.connection?.connect(next.outputConnection!); renderCuilanBlocks(workspace);
  };
  const setAppearance = () => {
    const workspace = workspaceRef.current; if (!workspace || locked) return;
    const gate = workspace.getBlockById('cuilan-identity-if'); const old = workspace.getBlockById('cuilan-identity-condition');
    old?.dispose(); const next = workspace.newBlock('w3_cuilan_condition_appearance_matches', 'cuilan-identity-condition');
    gate?.getInput('CONDITION')?.connection?.connect(next.outputConnection!); renderCuilanBlocks(workspace);
  };
  const restore = () => { const workspace = workspaceRef.current; if (!workspace || locked) return; applying.current = true; try { restoreVisibleCuilanWorkspace(workspace, draft); setSaveState('idle'); } finally { applying.current = false; } };
  return <section className="advanced-week-one-workspace" aria-label="变化高翠兰 Blockly 工作区">
    <div className="advanced-week-one-palette"><button type="button" disabled={locked} onClick={setIdentity} onKeyDown={keyboardClick}>第二道条件换成：真实身份是高翠兰</button><button type="button" disabled={locked} onClick={setAppearance} onKeyDown={keyboardClick}>第二道条件恢复：外形和高翠兰相同</button><button type="button" disabled={locked} onClick={restore} onKeyDown={keyboardClick}>恢复已保存积木</button></div>
    <div ref={host} className="advanced-blockly-host" aria-label="变化高翠兰可连接积木图" />
    <p aria-live="polite">{saveState === 'invalid' ? '积木连接待修复，修复后会保存' : saveState === 'unsaved' ? '积木尚未保存，可稍后重试。' : saveState === 'conflict' ? '其他标签页已更新，当前积木等待处理。' : ''}</p>
    <div className="workspace-actions"><button type="button" disabled={locked} onClick={() => onRun(workspaceRef.current ? compileCuilanBooleanWorkspace(workspaceRef.current) : { ok: false, draft: null, trace: [], diagnostics: [{ code: 'empty-workspace', sourceBlockId: null, concept: 'program-structure' }] })}>执行双闸门指令</button></div>
    <small>{CUILAN_BOOLEAN_BLOCK_LABELS.w3_cuilan_if_identity_reveal}</small>
  </section>;
}
