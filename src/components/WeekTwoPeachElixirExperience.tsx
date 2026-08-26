import { lazy, Suspense, useMemo, useRef, useState, type ComponentType } from 'react';
import './AdvancedWeekOneExperience.css';
import './WeekTwoPeachElixirExperience.css';
import { runPeachElixir, type PeachElixirDiagnostic, type PeachElixirRunResult, type PeachElixirRuntimeEvent } from '../blockly/weekTwoPeachElixirContract';
import type { PeachElixirCompileResult } from '../blockly/weekTwoPeachElixirCompiler';
import { useProgress } from '../context/ProgressContext';
import { createMissionSession, recordCompileFailure, recordRun, updateWorkspaceDraft } from '../progress/session';
import type { PeachElixirMissionSession } from '../progress/types';
import { downloadTextFile } from '../utils/download';
import { LazySectionBoundary } from './LazySectionBoundary';
import type { WeekTwoPeachElixirBlocklyWorkspace } from './WeekTwoPeachElixirBlocklyWorkspace';
import type { WeekTwoPeachElixirScene } from './WeekTwoPeachElixirScene';

type WorkspaceComponent = typeof WeekTwoPeachElixirBlocklyWorkspace;
type SceneComponent = typeof WeekTwoPeachElixirScene;
const defaultWorkspaceLoader = () => import('./WeekTwoPeachElixirBlocklyWorkspace').then((module) => ({ default: module.WeekTwoPeachElixirBlocklyWorkspace }));
const defaultSceneLoader = () => import('./WeekTwoPeachElixirScene').then((module) => ({ default: module.WeekTwoPeachElixirScene }));
export type WeekTwoPeachElixirLockReason = 'idle' | 'playback' | 'session-pending' | 'session-recovery';
type Recovery = 'none' | 'unsaved' | 'conflict';
export interface WeekTwoPeachElixirExperienceProps {
  reducedMotion: boolean;
  muted: boolean;
  locked?: boolean;
  onComplete: (evidence: { stars: 1 | 2 | 3; hintsUsed: number }) => void | boolean | Promise<boolean>;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: WeekTwoPeachElixirLockReason) => void;
  workspaceLoader?: () => Promise<{ default: ComponentType<Parameters<WorkspaceComponent>[0]> }>;
  sceneLoader?: () => Promise<{ default: ComponentType<Parameters<SceneComponent>[0]> }>;
  reloadPage?: () => void;
}
const stars = (session: PeachElixirMissionSession): 1 | 2 | 3 => session.usedHintTiers.length === 0 ? 3 : session.usedHintTiers.length === 1 ? 2 : 1;
function runtimeMessage(diagnostic: PeachElixirDiagnostic | null): string {
  if (!diagnostic) return '';
  if (diagnostic.opcode === 'eat_golden_elixir') return '这块金丹积木跑得太早了：悟空还没有误入兜率宫。';
  if (diagnostic.concept === 'sequence-precondition') return '这一步出现得太早了，请看看它前面缺少哪段原著经过。';
  return '故事还没有走到金丹结尾，请检查是否漏掉了一块积木。';
}
function compileMessage(result: Extract<PeachElixirCompileResult, { ok: false }>): string {
  const code = result.diagnostics[0]?.code;
  if (code === 'missing-action') return '故事少了一块积木，请把缺少的原著步骤恢复后再运行。';
  if (code === 'duplicate-action') return '同一个故事步骤出现了两次，请保留一块。';
  if (code === 'multiple-main-chain') return '故事积木断成了多段，请把它们连接成一条主链。';
  if (code === 'empty-workspace') return '工作区里还没有故事积木。';
  return '积木连接还不完整，请检查断开的真实积木。';
}

export function WeekTwoPeachElixirExperience({ reducedMotion, muted, locked = false, onComplete, onSessionPersistenceActiveChange, onInteractionLockChange, workspaceLoader = defaultWorkspaceLoader, sceneLoader = defaultSceneLoader, reloadPage }: WeekTwoPeachElixirExperienceProps) {
  const { progress, updateMissionSession, retrySave, createBackup, reloadExternalProgress } = useProgress();
  const session = progress.sessions['w2-m3'] ?? createMissionSession('w2-m3');
  const Workspace = useMemo(() => lazy(workspaceLoader), [workspaceLoader]);
  const Scene = useMemo(() => lazy(sceneLoader), [sceneLoader]);
  const [events, setEvents] = useState<PeachElixirRuntimeEvent[]>(session.lastRun?.events ?? []);
  const [result, setResult] = useState<PeachElixirRunResult | null>(session.lastRun);
  const [feedback, setFeedback] = useState(session.lastRun?.diagnostic ? runtimeMessage(session.lastRun.diagnostic) : '');
  const [replayToken, setReplayToken] = useState(0);
  const [recovery, setRecovery] = useState<Recovery>('none');
  const [pending, setPending] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(session.lastRun?.diagnostic?.sourceBlockId ?? null);
  const completedRef = useRef(false);
  const pendingRunRef = useRef<PeachElixirRunResult | null>(null);
  const setLock = (next: boolean, reason: WeekTwoPeachElixirLockReason) => { onSessionPersistenceActiveChange?.(next); onInteractionLockChange?.(next, reason); };
  const lockedNow = locked || pending || recovery !== 'none';
  const persist = async (update: (current: PeachElixirMissionSession) => PeachElixirMissionSession) => {
    setPending(true); setLock(true, 'session-pending');
    const saved = await updateMissionSession('w2-m3', update);
    setPending(false);
    if (saved.status === 'saved') { setLock(false, 'idle'); return saved.status; }
    setRecovery(saved.status); setLock(true, 'session-recovery'); return saved.status;
  };
  const publishRun = (next: PeachElixirRunResult) => {
    setResult(next); setFeedback(runtimeMessage(next.diagnostic)); setEligible(next.completed); setEvents(next.events); setFocusBlockId(next.diagnostic?.sourceBlockId ?? null); setReplayToken((token) => token + 1); setLock(true, 'playback');
  };
  const retry = async () => {
    setPending(true); setRecovery('none'); setLock(true, 'session-pending');
    const saved = await retrySave(); setPending(false);
    if (saved.status === 'saved') { const next = pendingRunRef.current; pendingRunRef.current = null; if (next) publishRun(next); else setLock(false, 'idle'); return; }
    setRecovery(saved.status === 'conflict' ? 'conflict' : 'unsaved'); setLock(true, 'session-recovery');
  };
  const run = async (compiled: PeachElixirCompileResult) => {
    if (lockedNow) return;
    if (!compiled.ok) {
      setResult(null); setEvents([]); setEligible(false); setFeedback(compileMessage(compiled)); setFocusBlockId(compiled.diagnostics[0]?.sourceBlockId ?? null);
      await persist((current) => recordCompileFailure(current, 'program-structure', new Date().toISOString()));
      return;
    }
    const next = runPeachElixir(compiled.trace); pendingRunRef.current = next;
    const saved = await persist((current) => recordRun(current, next, compiled.trace, new Date().toISOString()));
    if (saved !== 'saved') return;
    pendingRunRef.current = null; publishRun(next);
  };
  const finishPlayback = async () => {
    setLock(false, 'idle');
    if (!sceneReady || !eligible || !result?.completed || completedRef.current) return;
    completedRef.current = true;
    await onComplete({ stars: stars(session), hintsUsed: session.usedHintTiers.length });
  };
  return <section className="advanced-week-one-experience peach-elixir-experience">
    <LazySectionBoundary label="蟠桃与金丹调试场景" reloadPage={reloadPage}><Suspense fallback={<p role="status">蟠桃与金丹场景加载中，请稍候……</p>}><Scene events={events} replayToken={replayToken} reducedMotion={reducedMotion} muted={muted} onResourceStateChange={setSceneReady} onPlaybackComplete={() => void finishPlayback()} /></Suspense></LazySectionBoundary>
    <LazySectionBoundary label="蟠桃与金丹调试积木" reloadPage={reloadPage}><Suspense fallback={<p role="status">蟠桃与金丹积木加载中，请稍候……</p>}><Workspace draft={session.workspace} locked={lockedNow} onRun={(compiled) => void run(compiled)} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} onDraftChange={async (draft) => ({ status: await persist((current) => updateWorkspaceDraft(current, draft, new Date().toISOString())) })} /></Suspense></LazySectionBoundary>
    {feedback ? <div className="battle-feedback" role="alert">{feedback}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-ghost" disabled={lockedNow || !session.lastRun} onClick={() => { setEligible(false); setEvents(session.lastRun?.events ?? []); setReplayToken((token) => token + 1); setLock(true, 'playback'); }}>重播最近一次</button></div>
    {recovery !== 'none' ? <div className="unsaved-session" role="alert"><p>{recovery === 'conflict' ? '本次记录与其他标签页冲突。' : '本次学习记录尚未保存，请重试。'}</p>{recovery === 'unsaved' ? <button type="button" onClick={() => void retry()}>重试保存本次记录</button> : <><button type="button" onClick={() => { const backup = createBackup(); downloadTextFile(backup.filename, backup.contents, backup.mimeType); }}>下载本页备份</button><button type="button" onClick={() => { pendingRunRef.current = null; reloadExternalProgress(); setRecovery('none'); setLock(false, 'idle'); }}>载入其他标签页版本</button></>}</div> : null}
  </section>;
}
