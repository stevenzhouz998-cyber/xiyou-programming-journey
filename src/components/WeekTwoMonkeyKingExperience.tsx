import { lazy, Suspense, useMemo, useRef, useState, type ComponentType } from 'react';
import './AdvancedWeekOneExperience.css';
import './WeekTwoMonkeyKingExperience.css';
import { runMonkeyKingEvents, type MonkeyKingDiagnostic, type MonkeyKingRunResult, type MonkeyKingRuntimeEvent } from '../blockly/weekTwoMonkeyKingContract';
import type { MonkeyKingCompileResult } from '../blockly/weekTwoMonkeyKingCompiler';
import { useProgress } from '../context/ProgressContext';
import { createMissionSession, recordCompileFailure, recordRun, updateWorkspaceDraft } from '../progress/session';
import type { MonkeyKingMissionSession } from '../progress/types';
import { downloadTextFile } from '../utils/download';
import { LazySectionBoundary } from './LazySectionBoundary';
import type { WeekTwoMonkeyKingBlocklyWorkspace } from './WeekTwoMonkeyKingBlocklyWorkspace';
import type { WeekTwoMonkeyKingScene } from './WeekTwoMonkeyKingScene';

type WorkspaceComponent = typeof WeekTwoMonkeyKingBlocklyWorkspace;
type SceneComponent = typeof WeekTwoMonkeyKingScene;
const defaultWorkspaceLoader = () => import('./WeekTwoMonkeyKingBlocklyWorkspace').then((module) => ({ default: module.WeekTwoMonkeyKingBlocklyWorkspace }));
const defaultSceneLoader = () => import('./WeekTwoMonkeyKingScene').then((module) => ({ default: module.WeekTwoMonkeyKingScene }));

export type WeekTwoMonkeyKingLockReason = 'idle' | 'playback' | 'session-pending' | 'session-recovery';
type Recovery = 'none' | 'unsaved' | 'conflict';

export interface WeekTwoMonkeyKingExperienceProps {
  reducedMotion: boolean;
  muted: boolean;
  locked?: boolean;
  onComplete: (evidence: { stars: 1 | 2 | 3; hintsUsed: number }) => void | boolean | Promise<boolean>;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: WeekTwoMonkeyKingLockReason) => void;
  workspaceLoader?: () => Promise<{ default: ComponentType<Parameters<WorkspaceComponent>[0]> }>;
  sceneLoader?: () => Promise<{ default: ComponentType<Parameters<SceneComponent>[0]> }>;
  reloadPage?: () => void;
}

function stars(session: MonkeyKingMissionSession): 1 | 2 | 3 {
  return session.usedHintTiers.length === 0 ? 3 : session.usedHintTiers.length === 1 ? 2 : 1;
}

function runtimeMessage(diagnostic: MonkeyKingDiagnostic | null): string {
  if (!diagnostic) return '';
  if (diagnostic.concept === 'event-routing') return '这块动作接在了错误的事件帽下，请把它移到会触发它的事件中。';
  if (diagnostic.concept === 'handler-sequence') return '这个事件里的动作顺序还不对，请先完成前一步。';
  return '两个事件都派发了，但处理器里还缺少完成任务的动作。';
}

function compileMessage(result: Extract<MonkeyKingCompileResult, { ok: false }>): string {
  const code = result.diagnostics[0]?.code;
  if (code === 'missing-handler') return '还缺少一个事件帽：两个事件都要有自己的处理器。';
  if (code === 'duplicate-handler') return '同一个事件只能有一个事件帽，请保留一份处理器。';
  if (code === 'empty-handler') return '事件帽下面还没有动作，先连接要执行的积木。';
  if (code === 'orphan-action') return '动作积木必须连接在一个事件帽下面。';
  if (code === 'empty-workspace') return '先添加两个事件帽，再连接它们各自的动作。';
  return '事件程序的连接还不完整，请检查断开的积木。';
}

export function WeekTwoMonkeyKingExperience({ reducedMotion, muted, locked = false, onComplete, onSessionPersistenceActiveChange, onInteractionLockChange, workspaceLoader = defaultWorkspaceLoader, sceneLoader = defaultSceneLoader, reloadPage }: WeekTwoMonkeyKingExperienceProps) {
  const { progress, updateMissionSession, retrySave, createBackup, reloadExternalProgress } = useProgress();
  const session = progress.sessions['w2-m2'] ?? createMissionSession('w2-m2');
  const Workspace = useMemo(() => lazy(workspaceLoader), [workspaceLoader]);
  const Scene = useMemo(() => lazy(sceneLoader), [sceneLoader]);
  const [events, setEvents] = useState<MonkeyKingRuntimeEvent[]>(session.lastRun?.events ?? []);
  const [result, setResult] = useState<MonkeyKingRunResult | null>(session.lastRun);
  const [feedback, setFeedback] = useState(session.lastRun?.diagnostic ? runtimeMessage(session.lastRun.diagnostic) : '');
  const [replayToken, setReplayToken] = useState(0);
  const [recovery, setRecovery] = useState<Recovery>('none');
  const [pending, setPending] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(session.lastRun?.diagnostic?.sourceBlockId ?? null);
  const completedRef = useRef(false);
  const pendingRunRef = useRef<MonkeyKingRunResult | null>(null);
  const setLock = (next: boolean, reason: WeekTwoMonkeyKingLockReason) => { onSessionPersistenceActiveChange?.(next); onInteractionLockChange?.(next, reason); };
  const lockedNow = locked || pending || recovery !== 'none';

  const persist = async (update: (current: MonkeyKingMissionSession) => MonkeyKingMissionSession) => {
    setPending(true);
    setLock(true, 'session-pending');
    const saved = await updateMissionSession('w2-m2', update);
    setPending(false);
    if (saved.status === 'saved') { setLock(false, 'idle'); return saved.status; }
    setRecovery(saved.status);
    setLock(true, 'session-recovery');
    return saved.status;
  };
  const publishRun = (next: MonkeyKingRunResult) => {
    setResult(next);
    setFeedback(runtimeMessage(next.diagnostic));
    setEligible(next.completed);
    setEvents(next.events);
    setFocusBlockId(next.diagnostic?.sourceBlockId ?? null);
    setReplayToken((token) => token + 1);
    setLock(true, 'playback');
  };
  const retry = async () => {
    setPending(true);
    setRecovery('none');
    setLock(true, 'session-pending');
    const saved = await retrySave();
    setPending(false);
    if (saved.status === 'saved') {
      const pendingRun = pendingRunRef.current;
      pendingRunRef.current = null;
      if (pendingRun) publishRun(pendingRun);
      else setLock(false, 'idle');
      return;
    }
    setRecovery(saved.status === 'conflict' ? 'conflict' : 'unsaved');
    setLock(true, 'session-recovery');
  };
  const run = async (compiled: MonkeyKingCompileResult) => {
    if (lockedNow) return;
    if (!compiled.ok) {
      setResult(null);
      setEvents([]);
      setEligible(false);
      setFeedback(compileMessage(compiled));
      setFocusBlockId(compiled.diagnostics[0]?.sourceBlockId ?? null);
      await persist((current) => recordCompileFailure(current, 'program-structure', new Date().toISOString()));
      return;
    }
    const next = runMonkeyKingEvents(compiled.trace);
    pendingRunRef.current = next;
    const saved = await persist((current) => recordRun(current, next, compiled.trace, new Date().toISOString()));
    if (saved !== 'saved') return;
    pendingRunRef.current = null;
    publishRun(next);
  };
  const finishPlayback = async () => {
    setLock(false, 'idle');
    if (!sceneReady || !eligible || !result?.completed || completedRef.current) return;
    completedRef.current = true;
    await onComplete({ stars: stars(session), hintsUsed: session.usedHintTiers.length });
  };

  return <section className="advanced-week-one-experience monkey-king-experience">
    <LazySectionBoundary label="齐天大圣事件场景" reloadPage={reloadPage}><Suspense fallback={<p role="status">齐天大圣场景加载中，请稍候……</p>}><Scene events={events} replayToken={replayToken} reducedMotion={reducedMotion} muted={muted} onResourceStateChange={setSceneReady} onPlaybackComplete={() => void finishPlayback()} /></Suspense></LazySectionBoundary>
    <LazySectionBoundary label="齐天大圣事件积木" reloadPage={reloadPage}><Suspense fallback={<p role="status">齐天大圣积木工具加载中，请稍候……</p>}><Workspace draft={session.workspace} locked={lockedNow} onRun={(compiled) => void run(compiled)} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} onDraftChange={async (draft) => ({ status: await persist((current) => updateWorkspaceDraft(current, draft, new Date().toISOString())) })} /></Suspense></LazySectionBoundary>
    {feedback ? <div className="battle-feedback" role="alert">{feedback}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-ghost" disabled={lockedNow || !session.lastRun} onClick={() => { setEligible(false); setEvents(session.lastRun?.events ?? []); setReplayToken((token) => token + 1); setLock(true, 'playback'); }}>重播最近一次</button></div>
    {recovery !== 'none' ? <div className="unsaved-session" role="alert"><p>{recovery === 'conflict' ? '本次记录与其他标签页冲突。' : '本次学习记录尚未保存，请重试。'}</p>{recovery === 'unsaved' ? <button type="button" onClick={() => void retry()}>重试保存本次记录</button> : <><button type="button" onClick={() => { const backup = createBackup(); downloadTextFile(backup.filename, backup.contents, backup.mimeType); }}>下载本页备份</button><button type="button" onClick={() => { pendingRunRef.current = null; reloadExternalProgress(); setRecovery('none'); setLock(false, 'idle'); }}>载入其他标签页版本</button></>}</div> : null}
  </section>;
}
