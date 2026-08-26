import { lazy, Suspense, useRef, useState } from 'react';
import './AdvancedWeekOneExperience.css';
import { runFurnaceCondition, type FurnaceConditionDiagnostic, type FurnaceConditionRunResult, type FurnaceConditionRuntimeEvent } from '../blockly/weekTwoFurnaceConditionContract';
import type { FurnaceConditionCompileResult } from '../blockly/weekTwoFurnaceConditionCompiler';
import { useProgress } from '../context/ProgressContext';
import { createMissionSession, recordCompileFailure, recordRun, updateWorkspaceDraft } from '../progress/session';
import type { FurnaceConditionMissionSession } from '../progress/types';
import { downloadTextFile } from '../utils/download';

const Workspace = lazy(() => import('./WeekTwoFurnaceConditionBlocklyWorkspace').then((module) => ({ default: module.WeekTwoFurnaceConditionBlocklyWorkspace })));
const Scene = lazy(() => import('./WeekTwoFurnaceConditionScene').then((module) => ({ default: module.WeekTwoFurnaceConditionScene })));
type LockReason = 'idle' | 'playback' | 'session-pending' | 'session-recovery';
type Recovery = 'none' | 'unsaved' | 'conflict';
export interface WeekTwoFurnaceConditionExperienceProps {
  reducedMotion: boolean; muted: boolean; locked?: boolean;
  onComplete: (evidence: { stars: 1 | 2 | 3; hintsUsed: number }) => void | boolean | Promise<boolean>;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: LockReason) => void;
}
const stars = (session: FurnaceConditionMissionSession): 1 | 2 | 3 => session.usedHintTiers.length === 0 ? 3 : session.usedHintTiers.length === 1 ? 2 : 1;
function message(diagnostic: FurnaceConditionDiagnostic | null) {
  if (!diagnostic) return '';
  if (diagnostic.concept === 'loop-condition') return '眼睛变红只说明烟很大，炉门还没有打开。换一个真正表示可以脱身的条件。';
  if (diagnostic.concept === 'condition-never-met') return '这个条件一直没有发生，循环已安全停下。想想悟空听到和看到了什么才跳出炉门。';
  return '积木连接还不完整，请检查循环条件和每轮执行的积木。';
}
export function WeekTwoFurnaceConditionExperience({ reducedMotion, muted, locked = false, onComplete, onSessionPersistenceActiveChange, onInteractionLockChange }: WeekTwoFurnaceConditionExperienceProps) {
  const { progress, updateMissionSession, retrySave, createBackup, reloadExternalProgress } = useProgress();
  const session = progress.sessions['w2-m4'] ?? createMissionSession('w2-m4');
  const [events, setEvents] = useState<FurnaceConditionRuntimeEvent[]>(session.lastRun?.events ?? []);
  const [result, setResult] = useState<FurnaceConditionRunResult | null>(session.lastRun);
  const [feedback, setFeedback] = useState(message(session.lastRun?.diagnostic ?? null));
  const [focusBlockId, setFocusBlockId] = useState<string | null>(session.lastRun?.diagnostic?.sourceBlockId ?? null);
  const [pending, setPending] = useState(false); const [recovery, setRecovery] = useState<Recovery>('none'); const [eligible, setEligible] = useState(false); const [sceneReady, setSceneReady] = useState(false); const [replayToken, setReplayToken] = useState(0);
  const pendingRun = useRef<FurnaceConditionRunResult | null>(null); const completed = useRef(false);
  const setLock = (next: boolean, reason: LockReason) => { onSessionPersistenceActiveChange?.(next); onInteractionLockChange?.(next, reason); };
  const persist = async (update: (current: FurnaceConditionMissionSession) => FurnaceConditionMissionSession) => { setPending(true); setLock(true, 'session-pending'); const saved = await updateMissionSession('w2-m4', update); setPending(false); if (saved.status === 'saved') { setLock(false, 'idle'); return true; } setRecovery(saved.status); setLock(true, 'session-recovery'); return false; };
  const publish = (next: FurnaceConditionRunResult) => { setResult(next); setEvents(next.events); setFeedback(message(next.diagnostic)); setFocusBlockId(next.diagnostic?.sourceBlockId ?? null); setEligible(next.completed); setReplayToken((token) => token + 1); setLock(true, 'playback'); };
  const run = async (compiled: FurnaceConditionCompileResult) => {
    if (locked || pending || recovery !== 'none') return;
    if (!compiled.ok) { setFeedback('积木连接还不完整，请检查循环条件和每轮执行的积木。'); setFocusBlockId(compiled.diagnostics[0]?.sourceBlockId ?? null); await persist((current) => recordCompileFailure(current, 'program-structure', new Date().toISOString())); return; }
    const next = runFurnaceCondition(compiled.trace); pendingRun.current = next;
    if (!await persist((current) => recordRun(current, next, compiled.trace, new Date().toISOString()))) return;
    pendingRun.current = null; publish(next);
  };
  const finish = async () => { setLock(false, 'idle'); if (!sceneReady || !eligible || !result?.completed || completed.current) return; completed.current = true; await onComplete({ stars: stars(session), hintsUsed: session.usedHintTiers.length }); };
  const retry = async () => {
    setPending(true);
    setRecovery('none');
    setLock(true, 'session-pending');
    const saved = await retrySave();
    setPending(false);
    if (saved.status === 'saved') {
      const next = pendingRun.current;
      pendingRun.current = null;
      if (next) publish(next);
      else setLock(false, 'idle');
      return;
    }
    setRecovery(saved.status === 'conflict' ? 'conflict' : 'unsaved');
    setLock(true, 'session-recovery');
  };
  const lockedNow = locked || pending || recovery !== 'none';
  return <section className="advanced-week-one-experience furnace-condition-experience">
    <Suspense fallback={<p role="status">八卦炉场景加载中，请稍候……</p>}><Scene events={events} replayToken={replayToken} reducedMotion={reducedMotion} muted={muted} onResourceStateChange={setSceneReady} onPlaybackComplete={() => void finish()} /></Suspense>
    <Suspense fallback={<p role="status">八卦炉积木加载中，请稍候……</p>}><Workspace draft={session.workspace} locked={lockedNow} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} onRun={(compiled) => void run(compiled)} onDraftChange={async (draft) => ({ status: await persist((current) => updateWorkspaceDraft(current, draft, new Date().toISOString())) ? 'saved' : recovery === 'conflict' ? 'conflict' : 'unsaved' })} /></Suspense>
    {feedback ? <div role="alert" className="battle-feedback">{feedback}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-ghost" disabled={lockedNow || !session.lastRun} onClick={() => { setEligible(false); setEvents(session.lastRun?.events ?? []); setReplayToken((token) => token + 1); setLock(true, 'playback'); }}>重播最近一次</button></div>
    {recovery !== 'none' ? <div role="alert" className="unsaved-session"><p>{recovery === 'conflict' ? '本次记录与其他标签页冲突。' : '本次学习记录尚未保存，请重试。'}</p>{recovery === 'unsaved' ? <button type="button" onClick={() => void retry()}>重试保存本次记录</button> : <><button type="button" onClick={() => { const backup = createBackup(); downloadTextFile(backup.filename, backup.contents, backup.mimeType); }}>下载本页备份</button><button type="button" onClick={() => { pendingRun.current = null; reloadExternalProgress(); setRecovery('none'); setLock(false, 'idle'); }}>载入其他标签页版本</button></>}</div> : null}
  </section>;
}
