import { lazy, Suspense, useRef, useState } from 'react';
import './AdvancedWeekOneExperience.css';
import './WeekTwoHorseExperience.css';
import { runHorseCare, type HorseCareDiagnostic, type HorseCareEvent, type HorseCareRunResult } from '../blockly/weekTwoHorseContract';
import type { HorseCareCompileResult } from '../blockly/weekTwoHorseCompiler';
import { useProgress } from '../context/ProgressContext';
import { createMissionSession, recordCompileFailure, recordRun, updateWorkspaceDraft } from '../progress/session';
import type { HorseCareMissionSession } from '../progress/types';
import { downloadTextFile } from '../utils/download';

const Workspace = lazy(() => import('./WeekTwoHorseBlocklyWorkspace').then((module) => ({ default: module.WeekTwoHorseBlocklyWorkspace })));
const Scene = lazy(() => import('./WeekTwoHorseScene').then((module) => ({ default: module.WeekTwoHorseScene })));

type LockReason = 'idle' | 'playback' | 'session-pending' | 'session-recovery';
type Recovery = 'none' | 'unsaved' | 'conflict';

export interface WeekTwoHorseExperienceProps {
  reducedMotion: boolean;
  muted: boolean;
  locked?: boolean;
  onComplete: (evidence: { stars: 1 | 2 | 3; hintsUsed: number }) => void | boolean | Promise<boolean>;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: LockReason) => void;
}

function stars(session: HorseCareMissionSession): 1 | 2 | 3 {
  return session.usedHintTiers.length === 0 ? 3 : session.usedHintTiers.length === 1 ? 2 : 1;
}

function message(diagnostic: HorseCareDiagnostic | null): string {
  if (!diagnostic) return '';
  if (diagnostic.concept === 'loop-count') return '御马监今天有三匹天马，请让循环正好执行三次。';
  if (diagnostic.concept === 'completeness') return '程序还没有走完，请检查是否缺少主程序或循环体积木。';
  return '这一顺序暂时不能继续，请从当前任务需要的积木开始调整。';
}

export function WeekTwoHorseExperience({ reducedMotion, muted, locked = false, onComplete, onSessionPersistenceActiveChange, onInteractionLockChange }: WeekTwoHorseExperienceProps) {
  const { progress, updateMissionSession, retrySave, createBackup, reloadExternalProgress } = useProgress();
  const session = progress.sessions['w2-m1'] ?? createMissionSession('w2-m1');
  const [events, setEvents] = useState<HorseCareEvent[]>(session.lastRun?.events ?? []);
  const [result, setResult] = useState<HorseCareRunResult | null>(session.lastRun);
  const [diagnostic, setDiagnostic] = useState<HorseCareDiagnostic | null>(session.lastRun?.diagnostic ?? null);
  const [replayToken, setReplayToken] = useState(0);
  const [recovery, setRecovery] = useState<Recovery>('none');
  const [pending, setPending] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(session.lastRun?.diagnostic?.sourceBlockId ?? null);
  const completedRef = useRef(false);
  const pendingRunRef = useRef<HorseCareRunResult | null>(null);
  const setLock = (next: boolean, reason: LockReason) => {
    onSessionPersistenceActiveChange?.(next);
    onInteractionLockChange?.(next, reason);
  };
  const lockedNow = locked || pending || recovery !== 'none';
  const persist = async (update: (current: HorseCareMissionSession) => HorseCareMissionSession) => {
    setPending(true);
    setLock(true, 'session-pending');
    const saved = await updateMissionSession('w2-m1', update);
    setPending(false);
    if (saved.status === 'saved') {
      setLock(false, 'idle');
      return true;
    }
    setRecovery(saved.status);
    setLock(true, 'session-recovery');
    return false;
  };
  const retry = async () => {
    setPending(true);
    setRecovery('none');
    setLock(true, 'session-pending');
    const saved = await retrySave();
    setPending(false);
    if (saved.status === 'saved') {
      const pendingRun = pendingRunRef.current;
      if (pendingRun) {
        pendingRunRef.current = null;
        setResult(pendingRun);
        setDiagnostic(pendingRun.diagnostic);
        setEligible(pendingRun.completed);
        setEvents(pendingRun.events);
        setFocusBlockId(pendingRun.diagnostic?.sourceBlockId ?? null);
        setReplayToken((token) => token + 1);
        setLock(true, 'playback');
        return;
      }
      setLock(false, 'idle');
      return;
    }
    setRecovery(saved.status === 'conflict' ? 'conflict' : 'unsaved');
    setLock(true, 'session-recovery');
  };
  const run = async (compiled: HorseCareCompileResult) => {
    if (lockedNow) return;
    if (!compiled.ok) {
      const failure: HorseCareDiagnostic = {
        type: 'program-ended-incomplete',
        concept: 'completeness',
        state: 'awaiting-post',
        instructionId: null,
        sourceBlockId: compiled.diagnostics[0]?.sourceBlockId ?? null,
        parentBlockId: null,
        opcode: null,
        iteration: null,
        repeatCount: null,
        messageCode: `horse-care.compile.${compiled.diagnostics[0]?.code ?? 'failed'}`,
      };
      setDiagnostic(failure);
      setResult(null);
      setEvents([]);
      setFocusBlockId(failure.sourceBlockId);
      await persist((current) => recordCompileFailure(current, 'program-structure', new Date().toISOString()));
      return;
    }
    const next = runHorseCare(compiled.trace);
    pendingRunRef.current = next;
    const saved = await persist((current) => recordRun(current, next, compiled.trace, new Date().toISOString()));
    if (!saved) return;
    pendingRunRef.current = null;
    setResult(next);
    setDiagnostic(next.diagnostic);
    setEligible(next.completed);
    setEvents(next.events);
    setFocusBlockId(next.diagnostic?.sourceBlockId ?? null);
    setReplayToken((token) => token + 1);
    setLock(true, 'playback');
  };
  const finishPlayback = async () => {
    setLock(false, 'idle');
    if (!sceneReady || !eligible || !result?.completed || completedRef.current) return;
    completedRef.current = true;
    await onComplete({ stars: stars(session), hintsUsed: session.usedHintTiers.length });
  };

  return <section className="advanced-week-one-experience horse-care-experience">
    <Suspense fallback={<p role="status">弼马温场景加载中，请稍候……</p>}><Scene events={events} replayToken={replayToken} reducedMotion={reducedMotion} muted={muted} onResourceStateChange={setSceneReady} onPlaybackComplete={() => void finishPlayback()} /></Suspense>
    <Suspense fallback={<p role="status">弼马温积木工具加载中，请稍候……</p>}><Workspace draft={session.workspace} locked={lockedNow} onRun={(compiled) => void run(compiled)} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} onDraftChange={(draft) => persist((current) => updateWorkspaceDraft(current, draft, new Date().toISOString())).then((saved) => ({ status: saved ? 'saved' : recovery === 'conflict' ? 'conflict' : 'unsaved' }))} /></Suspense>
    {diagnostic ? <div className="battle-feedback" role="alert">{message(diagnostic)}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-ghost" disabled={lockedNow || !session.lastRun} onClick={() => {
      setEligible(false);
      setEvents(session.lastRun?.events ?? []);
      setReplayToken((token) => token + 1);
      setLock(true, 'playback');
    }}>重播最近一次</button></div>
    {recovery !== 'none' ? <div className="unsaved-session" role="alert"><p>{recovery === 'conflict' ? '本次记录与其他标签页冲突。' : '本次学习记录尚未保存，请重试。'}</p>{recovery === 'unsaved' ? <button type="button" onClick={() => void retry()}>重试保存本次记录</button> : <><button type="button" onClick={() => { const backup = createBackup(); downloadTextFile(backup.filename, backup.contents, backup.mimeType); }}>下载本页备份</button><button type="button" onClick={() => { pendingRunRef.current = null; reloadExternalProgress(); setRecovery('none'); setLock(false, 'idle'); }}>载入其他标签页版本</button></>}</div> : null}
  </section>;
}
