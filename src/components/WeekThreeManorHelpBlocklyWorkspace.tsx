import * as Blockly from 'blockly';
import * as zhHans from 'blockly/msg/zh-hans';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MANOR_HELP_BLOCK_LABELS, registerManorHelpBlocks } from '../blockly/weekThreeManorHelpBlocks';
import { compileManorHelpWorkspace, snapshotManorHelpWorkspace, type ManorHelpCompileResult } from '../blockly/weekThreeManorHelpCompiler';
import { validateManorHelpDraft, type ManorHelpBlockType, type ManorHelpWorkspaceDraftV1 } from '../blockly/weekThreeManorHelpContract';

Blockly.setLocale(zhHans as unknown as Record<string, string>);

export type ManorHelpSaveResult = { status: 'saved' | 'unsaved' | 'conflict' };
type WorkspaceSaveState = 'idle' | 'invalid' | ManorHelpSaveResult['status'];

export interface WeekThreeManorHelpBlocklyWorkspaceProps {
  draft: ManorHelpWorkspaceDraftV1;
  locked: boolean;
  focusBlockId: string | null;
  onFocusHandled: () => void;
  onDraftChange: (draft: ManorHelpWorkspaceDraftV1) => Promise<ManorHelpSaveResult>;
  onRun: (result: ManorHelpCompileResult) => void;
}

const actionForBranch = {
  then: 'w3_manor_accept_and_return_notice',
  else: 'w3_manor_continue_journey',
} as const;

const initialize = (block: Blockly.Block) => {
  const visual = block as Blockly.Block & { initSvg?: () => void; render?: () => void };
  visual.initSvg?.();
  visual.render?.();
};
const renderBlocks = (workspace: Blockly.Workspace) => workspace.getAllBlocks(false).forEach((block) => {
  (block as Blockly.Block & { render?: () => void }).render?.();
});
const serializedDraft = (draft: ManorHelpWorkspaceDraftV1) => JSON.stringify(draft);
const activateOnEnter = (event: KeyboardEvent<HTMLButtonElement>) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  event.currentTarget.click();
};

function restoreManorHelpWorkspace(workspace: Blockly.Workspace, draft: ManorHelpWorkspaceDraftV1): void {
  validateManorHelpDraft(draft);
  Blockly.Events.disable();
  try {
    workspace.clear();
    const byId = new Map<string, Blockly.Block>();
    for (const item of draft.blocks) {
      const block = workspace.newBlock(item.type, item.id);
      block.moveBy(item.x, item.y);
      initialize(block);
      byId.set(item.id, block);
    }
    for (const item of draft.blocks) {
      if (item.nextId) byId.get(item.id)?.nextConnection?.connect(byId.get(item.nextId)?.previousConnection!);
    }
    for (const item of draft.blocks) {
      const block = byId.get(item.id);
      if (!block) continue;
      if (item.type === 'w3_manor_if_message' && item.conditionBlockId) {
        block.getInput('CONDITION')?.connection?.connect(byId.get(item.conditionBlockId)?.outputConnection!);
      }
      if (item.parentBlockId && item.previousId === null && item.branch) {
        byId.get(item.parentBlockId)?.getInput(item.branch === 'then' ? 'THEN' : 'ELSE')?.connection?.connect(block.previousConnection!);
      }
    }
    renderBlocks(workspace);
  } finally {
    Blockly.Events.enable();
  }
}

export function WeekThreeManorHelpBlocklyWorkspace({
  draft, locked, focusBlockId, onFocusHandled, onDraftChange, onRun,
}: WeekThreeManorHelpBlocklyWorkspaceProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<Blockly.Workspace | null>(null);
  const applyingRef = useRef(false);
  const aliveRef = useRef(true);
  const onDraftChangeRef = useRef(onDraftChange);
  const restoreErrorRef = useRef<string | null>(null);
  const lastSyncedDraftRef = useRef<string | null>(null);
  const saveInFlightRef = useRef<{ serialized: string; promise: Promise<ManorHelpSaveResult> } | null>(null);
  const saveQueuedRef = useRef(false);
  const focusHandledRef = useRef<string | null>(null);
  const saveStateRef = useRef<WorkspaceSaveState>('idle');
  const [version, setVersion] = useState(0);
  const [saveState, setSaveState] = useState<WorkspaceSaveState>('idle');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  onDraftChangeRef.current = onDraftChange;

  const updateSaveState = (result: ManorHelpSaveResult) => {
    const next = result.status === 'saved' ? 'idle' : result.status;
    saveStateRef.current = next;
    if (aliveRef.current) setSaveState(next);
  };
  const markInvalid = () => {
    saveStateRef.current = 'invalid';
    if (aliveRef.current) setSaveState('invalid');
  };

  const save = async (isExplicitRetry = false): Promise<ManorHelpSaveResult> => {
    if (!isExplicitRetry && saveStateRef.current !== 'idle') return { status: saveStateRef.current === 'invalid' ? 'unsaved' : saveStateRef.current };
    const workspace = workspaceRef.current;
    if (!workspace || restoreErrorRef.current) return { status: 'unsaved' };
    const snapshot = snapshotManorHelpWorkspace(workspace);
    const serialized = serializedDraft(snapshot);
    if (lastSyncedDraftRef.current === serialized) return { status: 'saved' };
    const inFlight = saveInFlightRef.current;
    if (inFlight) {
      if (inFlight.serialized === serialized) return inFlight.promise;
      await inFlight.promise;
      return save();
    }
    const promise = (async () => {
      try {
        const result = await onDraftChangeRef.current(snapshot);
        if (result.status === 'saved') lastSyncedDraftRef.current = serialized;
        updateSaveState(result);
        return result;
      } catch {
        const result: ManorHelpSaveResult = { status: 'unsaved' };
        updateSaveState(result);
        return result;
      }
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
      if (workspaceRef.current && !compileManorHelpWorkspace(workspaceRef.current).ok) {
        // A deleted branch is a real visible learning state, not a storage
        // failure. Keep it local until the child repairs a legal graph.
        markInvalid();
        return;
      }
      if (saveStateRef.current === 'invalid') updateSaveState({ status: 'saved' });
      void save();
    });
  };

  useEffect(() => {
    aliveRef.current = true;
    registerManorHelpBlocks();
    const workspace = navigator.userAgent.includes('jsdom')
      ? new Blockly.Workspace()
      : Blockly.inject(hostRef.current!, { renderer: 'zelos', trashcan: true, sounds: false });
    workspaceRef.current = workspace;
    const changed = (event: Blockly.Events.Abstract) => {
      if (!applyingRef.current && !event.isUiEvent) {
        setVersion((value) => value + 1);
        scheduleSave();
      }
    };
    workspace.addChangeListener(changed);
    return () => {
      aliveRef.current = false;
      workspace.removeChangeListener(changed);
      workspace.dispose();
      workspaceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const incoming = serializedDraft(draft);
    if (lastSyncedDraftRef.current === incoming) return;
    const current = workspace.getAllBlocks(false).length > 0 ? serializedDraft(snapshotManorHelpWorkspace(workspace)) : null;
    if (current !== null && current !== incoming && (current !== lastSyncedDraftRef.current || saveInFlightRef.current !== null)) return;
    applyingRef.current = true;
    try {
      restoreManorHelpWorkspace(workspace, draft);
      lastSyncedDraftRef.current = incoming;
      restoreErrorRef.current = null;
      if (aliveRef.current) {
        setRestoreError(null);
        saveStateRef.current = 'idle';
        setSaveState('idle');
        setVersion((value) => value + 1);
      }
    } catch {
      workspace.clear();
      restoreErrorRef.current = '积木存档无法安全恢复，请重新打开本关后再试。';
      if (aliveRef.current) {
        setRestoreError('积木存档无法安全恢复，请重新打开本关后再试。');
        setVersion((value) => value + 1);
      }
    } finally {
      applyingRef.current = false;
    }
  }, [draft]);

  useEffect(() => {
    if (focusBlockId === null) {
      focusHandledRef.current = null;
      return;
    }
    if (focusHandledRef.current === focusBlockId) return;
    focusHandledRef.current = focusBlockId;
    const block = workspaceRef.current?.getBlockById(focusBlockId) as (Blockly.Block & { select?: () => void; getSvgRoot?: () => SVGElement }) | null;
    block?.select?.();
    block?.getSvgRoot?.()?.focus();
    onFocusHandled();
  }, [focusBlockId, onFocusHandled]);

  const act = (operation: (workspace: Blockly.Workspace) => void) => {
    const workspace = workspaceRef.current;
    if (!workspace || locked || restoreError) return;
    operation(workspace);
    renderBlocks(workspace);
    setVersion((value) => value + 1);
    scheduleSave();
  };

  const replaceCondition = (type: Extract<ManorHelpBlockType, 'w3_manor_condition_explicit_demon_help' | 'w3_manor_condition_mentions_gao_manor'>) => act((workspace) => {
    const ifBlock = workspace.getAllBlocks(false).find((block) => block.type === 'w3_manor_if_message');
    if (!ifBlock) return;
    const old = ifBlock.getInputTargetBlock('CONDITION');
    old?.outputConnection?.disconnect();
    old?.dispose(false);
    const condition = workspace.newBlock(type);
    initialize(condition);
    ifBlock.getInput('CONDITION')?.connection?.connect(condition.outputConnection!);
  });

  const restoreBranch = (branch: 'then' | 'else') => act((workspace) => {
    const ifBlock = workspace.getAllBlocks(false).find((block) => block.type === 'w3_manor_if_message');
    if (!ifBlock) return;
    const input = ifBlock.getInput(branch === 'then' ? 'THEN' : 'ELSE');
    const existing = input?.connection?.targetBlock();
    if (existing?.type === actionForBranch[branch] && !existing.getNextBlock()) return;
    if (existing) {
      existing.previousConnection?.disconnect();
      existing.dispose(true);
    }
    const action = workspace.newBlock(actionForBranch[branch]);
    initialize(action);
    input?.connection?.connect(action.previousConnection!);
  });

  const run = async () => {
    if (locked || restoreError || saveState === 'unsaved' || saveState === 'conflict') return;
    const before = workspaceRef.current;
    if (!before) return;
    const visible = compileManorHelpWorkspace(before);
    if (!visible.ok) {
      onRun(visible);
      return;
    }
    if (saveStateRef.current === 'invalid') updateSaveState({ status: 'saved' });
    const result = await save();
    if (result.status !== 'saved' || !before || workspaceRef.current !== before || lastSyncedDraftRef.current !== serializedDraft(snapshotManorHelpWorkspace(before))) return;
    onRun(compileManorHelpWorkspace(before));
  };

  const blocks = workspaceRef.current?.getAllBlocks(false) ?? [];
  return <section className="advanced-week-one-workspace week-three-manor-help-workspace" aria-label="庄上求助 Blockly 工作区">
    <div className="advanced-week-one-palette" aria-label="庄上求助修复工具">
      {(['w3_manor_condition_mentions_gao_manor', 'w3_manor_condition_explicit_demon_help'] as const).map((type) => <button key={type} type="button" disabled={locked || Boolean(restoreError) || saveState === 'conflict'} onClick={() => replaceCondition(type)} onKeyDown={activateOnEnter}>换成：{MANOR_HELP_BLOCK_LABELS[type]}</button>)}
      <button type="button" disabled={locked || Boolean(restoreError) || saveState === 'conflict'} onClick={() => restoreBranch('then')} onKeyDown={activateOnEnter}>恢复“主动应承”分支</button>
      <button type="button" disabled={locked || Boolean(restoreError) || saveState === 'conflict'} onClick={() => restoreBranch('else')} onKeyDown={activateOnEnter}>恢复“继续问路”分支</button>
    </div>
    <div ref={hostRef} className="advanced-blockly-host" aria-label="庄上求助可连接积木图" />
    <ol key={version} className="advanced-program-tree" aria-label="庄上求助真实积木连接">
      {blocks.map((block) => <li key={block.id}>{MANOR_HELP_BLOCK_LABELS[block.type as ManorHelpBlockType] ?? '积木'}</li>)}
    </ol>
    {restoreError ? <div role="alert">{restoreError}</div> : null}
    {saveState === 'unsaved' || saveState === 'conflict' ? <div role="alert">{saveState === 'conflict' ? '其他标签页已经更新，这次积木更改暂停保存。' : '这次积木更改还没有保存。'}{saveState === 'unsaved' ? <button type="button" onClick={() => void save(true)} onKeyDown={activateOnEnter}>重试保存积木</button> : null}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-primary" disabled={locked || Boolean(restoreError) || saveState === 'unsaved' || saveState === 'conflict'} onClick={() => void run()} onKeyDown={activateOnEnter}>执行两张口信</button></div>
    <div role="status" aria-live="polite">{saveState === 'invalid' ? '积木连接待修复，修复后会保存' : saveState === 'idle' ? '积木已保存' : '积木等待保存'}</div>
  </section>;
}
