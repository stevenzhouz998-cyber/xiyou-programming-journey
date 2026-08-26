import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import './AdvancedWeekOneExperience.css';
import './WeekTwoHorseExperience.css';
import './WeekThreeManorHelpExperience.css';
import { runManorHelp, type ManorHelpDiagnostic, type ManorHelpFailureSnapshot, type ManorHelpRunResult, type ManorHelpRuntimeEvent } from '../blockly/weekThreeManorHelpContract';
import type { ManorHelpCompileResult } from '../blockly/weekThreeManorHelpCompiler';
import { useProgress } from '../context/ProgressContext';
import { createMissionSession, recordCompileFailure, recordConditionObservationUse, recordRun, updateWorkspaceDraft } from '../progress/session';
import type { ManorHelpMissionSession } from '../progress/types';
import { downloadTextFile } from '../utils/download';
import { LazySectionBoundary } from './LazySectionBoundary';
import type { WeekThreeManorHelpBlocklyWorkspace } from './WeekThreeManorHelpBlocklyWorkspace';
import type { WeekThreeManorHelpScene } from './WeekThreeManorHelpScene';

type WorkspaceComponent = typeof WeekThreeManorHelpBlocklyWorkspace;
type SceneComponent = typeof WeekThreeManorHelpScene;
const defaultWorkspaceLoader = () => import('./WeekThreeManorHelpBlocklyWorkspace').then((module) => ({ default: module.WeekThreeManorHelpBlocklyWorkspace }));
const defaultSceneLoader = () => import('./WeekThreeManorHelpScene').then((module) => ({ default: module.WeekThreeManorHelpScene }));
export type WeekThreeManorHelpLockReason = 'idle' | 'playback' | 'session-pending' | 'session-recovery';
type Recovery = 'none' | 'unsaved' | 'conflict';
type Operation = 'idle' | 'draft' | 'run' | 'observation' | 'retry' | 'playback' | 'completing' | 'recovery';

export interface WeekThreeManorHelpExperienceProps {
  reducedMotion: boolean;
  muted: boolean;
  locked?: boolean;
  onComplete: (evidence: { stars: 1 | 2 | 3; hintsUsed: number }) => void | boolean | Promise<boolean>;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: WeekThreeManorHelpLockReason) => void;
  workspaceLoader?: () => Promise<{ default: ComponentType<Parameters<WorkspaceComponent>[0]> }>;
  sceneLoader?: () => Promise<{ default: ComponentType<Parameters<SceneComponent>[0]> }>;
  reloadPage?: () => void;
}

const stars = (session: ManorHelpMissionSession): 1 | 2 | 3 => session.usedHintTiers.length === 0 ? 3 : session.usedHintTiers.length === 1 ? 2 : 1;
const noPenalty = '本次错误不会扣除生命、资源或星级。';

function runFeedback(diagnostic: ManorHelpDiagnostic | null): string {
  if (!diagnostic) return '';
  if (diagnostic.concept === 'condition-selection') return '这封练习口信提到高老庄，却没有请求降妖帮助，所以不该主动应承。';
  if (diagnostic.concept === 'branch-routing') return '这张口信已经进入分支，但接下来的行动还没有接对。';
  return '积木连接还不完整，请检查收到口信后的条件和两个分支。';
}

function compileFeedback(result: Extract<ManorHelpCompileResult, { ok: false }>): string {
  const code = result.diagnostics[0]?.code;
  if (code === 'missing-condition') return '条件积木还没有接上，请先检查口信。';
  if (code === 'missing-then' || code === 'missing-else') return '两个分支都要有行动积木，先把缺少的分支补上。';
  return '积木连接还不完整，请检查收到口信后的条件和两个分支。';
}

function observationEvidence(snapshot: ManorHelpFailureSnapshot): string {
  return snapshot.evidenceTextKey === 'manor-help.canon.explicit-demon-help'
    ? '高才明确说正在寻找能降妖、解除庄上困扰的法师。'
    : '这封练习口信只介绍高老庄的位置和道路，没有提出求助。';
}

function branchLabel(branch: ManorHelpFailureSnapshot['branch']): string {
  return branch === 'then' ? '主动应承' : '继续问路';
}

export function WeekThreeManorHelpExperience({
  reducedMotion,
  muted,
  locked = false,
  onComplete,
  onSessionPersistenceActiveChange,
  onInteractionLockChange,
  workspaceLoader = defaultWorkspaceLoader,
  sceneLoader = defaultSceneLoader,
  reloadPage,
}: WeekThreeManorHelpExperienceProps) {
  const { progress, updateMissionSession, retrySave, createBackup, reloadExternalProgress } = useProgress();
  const initialSession = useMemo<ManorHelpMissionSession>(
    () => progress.sessions['w3-m1'] ?? createMissionSession('w3-m1'),
    [],
  );
  const [persistedSession, setPersistedSession] = useState<ManorHelpMissionSession>(initialSession);
  const Workspace = useMemo(() => lazy(workspaceLoader), [workspaceLoader]);
  const Scene = useMemo(() => lazy(sceneLoader), [sceneLoader]);
  const [events, setEvents] = useState<ManorHelpRuntimeEvent[]>(initialSession.lastRun?.events ?? []);
  const [result, setResult] = useState<ManorHelpRunResult | null>(initialSession.lastRun);
  const [feedback, setFeedback] = useState(runFeedback(initialSession.lastRun?.diagnostic ?? null));
  const [focusBlockId, setFocusBlockId] = useState<string | null>(initialSession.lastRun?.diagnostic?.sourceBlockId ?? null);
  const [pending, setPending] = useState(false);
  const [recovery, setRecovery] = useState<Recovery>('none');
  const [playback, setPlayback] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [eligible, setEligible] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [workspaceGeneration, setWorkspaceGeneration] = useState(0);
  const [replayToken, setReplayToken] = useState(0);
  const [observation, setObservation] = useState<ManorHelpFailureSnapshot | null>(null);
  const pendingRun = useRef<ManorHelpRunResult | null>(null);
  const pendingObservation = useRef<ManorHelpFailureSnapshot | null>(null);
  const completed = useRef(false);
  const playbackRef = useRef(false);
  const operationRef = useRef<Operation>('idle');

  useEffect(() => {
    const external = progress.sessions['w3-m1'];
    if (external && operationRef.current === 'idle' && !pending && recovery === 'none' && external !== persistedSession) {
      setPersistedSession(external);
    }
  }, [pending, persistedSession, progress.sessions, recovery]);

  const setLock = (next: boolean, reason: WeekThreeManorHelpLockReason) => {
    onSessionPersistenceActiveChange?.(next);
    onInteractionLockChange?.(next, reason);
  };
  const persist = async (update: (current: ManorHelpMissionSession) => ManorHelpMissionSession) => {
    setPending(true);
    setLock(true, 'session-pending');
    try {
      const saved = await updateMissionSession('w3-m1', update);
      if (saved.status === 'saved') {
        setPersistedSession(saved.progress.sessions['w3-m1'] ?? createMissionSession('w3-m1'));
        return saved;
      }
      setRecovery(saved.status);
      operationRef.current = 'recovery';
      setLock(true, 'session-recovery');
      return saved;
    } catch (error) {
      const failed = { status: 'unsaved' as const, progress, error: error instanceof Error ? error.message : String(error) };
      setRecovery('unsaved');
      operationRef.current = 'recovery';
      setLock(true, 'session-recovery');
      return failed;
    } finally {
      setPending(false);
    }
  };
  const publishRun = (next: ManorHelpRunResult) => {
    setResult(next);
    setEvents(next.events);
    setFeedback(runFeedback(next.diagnostic));
    setFocusBlockId(next.diagnostic?.sourceBlockId ?? null);
    setEligible(next.completed);
    setReplayToken((token) => token + 1);
    playbackRef.current = true;
    operationRef.current = 'playback';
    setPlayback(true);
    setLock(true, 'playback');
  };
  const clearPublishedRun = () => {
    setResult(null);
    setEvents([]);
    setFeedback('');
    setFocusBlockId(null);
    setEligible(false);
    setObservation(null);
  };
  const run = async (compiled: ManorHelpCompileResult) => {
    if (locked || operationRef.current !== 'idle') return;
    operationRef.current = 'run';
    if (!compiled.ok) {
      const saved = await persist((current) => recordCompileFailure(current, 'program-structure', new Date().toISOString()));
      if (saved.status === 'saved') {
        setFeedback(compileFeedback(compiled));
        setFocusBlockId(compiled.diagnostics[0]?.sourceBlockId ?? null);
        operationRef.current = 'idle';
        setLock(false, 'idle');
      }
      return;
    }
    const next = runManorHelp(compiled.trace);
    pendingRun.current = next;
    const saved = await persist((current) => recordRun(current, next, compiled.trace, new Date().toISOString()));
    if (saved.status !== 'saved') return;
    pendingRun.current = null;
    publishRun(next);
  };
  const saveDraft = async (draft: ManorHelpMissionSession['workspace']) => {
    if (operationRef.current !== 'idle') return { status: recovery === 'conflict' ? 'conflict' as const : 'unsaved' as const };
    operationRef.current = 'draft';
    let invalidated = false;
    const saved = await persist((current) => {
      const next = updateWorkspaceDraft(current, draft, new Date().toISOString());
      invalidated = current.lastRun !== null && next.lastRun === null;
      return next;
    });
    if (saved.status === 'saved') {
      if (invalidated) clearPublishedRun();
      operationRef.current = 'idle';
      setLock(false, 'idle');
    }
    return { status: saved.status };
  };
  const useObservation = async () => {
    const snapshot = persistedSession.failureSnapshot;
    const stable = progress.abilities.conditionObservation.acquiredAt !== null
      && progress.abilities.conditionObservation.stableUnlockedAt !== null;
    if (!stable || snapshot === null || locked || operationRef.current !== 'idle') return;
    if (observation?.snapshotId === snapshot.snapshotId) return;
    operationRef.current = 'observation';
    pendingObservation.current = snapshot;
    const saved = await persist((current) => recordConditionObservationUse(current, snapshot.snapshotId, new Date().toISOString()));
    if (saved.status !== 'saved') return;
    pendingObservation.current = null;
    setObservation(snapshot);
    operationRef.current = 'idle';
    setLock(false, 'idle');
  };
  const finish = async () => {
    if (operationRef.current !== 'playback') return;
    // A run may finish while a recoverable scene asset is still loading. Keep the
    // saved run pending so the visible image retry can complete the same playback.
    if (!sceneReady) return;
    if (!eligible || !result?.completed || completed.current) {
      playbackRef.current = false;
      operationRef.current = 'idle';
      setPlayback(false);
      setLock(false, 'idle');
      return;
    }
    completed.current = true;
    operationRef.current = 'completing';
    setCompleting(true);
    let accepted = false;
    try {
      accepted = (await onComplete({ stars: stars(persistedSession), hintsUsed: persistedSession.usedHintTiers.length })) !== false;
    } catch {
      accepted = false;
    } finally {
      if (!accepted) completed.current = false;
      operationRef.current = 'idle';
      playbackRef.current = false;
      setCompleting(false);
      setPlayback(false);
      setLock(false, 'idle');
    }
  };
  useEffect(() => {
    if (sceneReady && operationRef.current === 'playback') void finish();
  }, [sceneReady]);
  const retry = async () => {
    if (operationRef.current !== 'recovery') return;
    operationRef.current = 'retry';
    setPending(true);
    setRecovery('none');
    setLock(true, 'session-pending');
    const saved = await retrySave();
    setPending(false);
    if (saved.status === 'saved') {
      setPersistedSession(saved.progress.sessions['w3-m1'] ?? createMissionSession('w3-m1'));
      const nextRun = pendingRun.current;
      const nextObservation = pendingObservation.current;
      pendingRun.current = null;
      pendingObservation.current = null;
      if (nextRun) publishRun(nextRun);
      else if (nextObservation) {
        setObservation(nextObservation);
        operationRef.current = 'idle';
        setLock(false, 'idle');
      } else {
        operationRef.current = 'idle';
        setLock(false, 'idle');
      }
      return;
    }
    setRecovery(saved.status === 'conflict' ? 'conflict' : 'unsaved');
    operationRef.current = 'recovery';
    setLock(true, 'session-recovery');
  };
  const loadExternal = () => {
    pendingRun.current = null;
    pendingObservation.current = null;
    operationRef.current = 'idle';
    playbackRef.current = false;
    const external = reloadExternalProgress();
    const externalSession = external?.sessions['w3-m1'] ?? createMissionSession('w3-m1');
    setPersistedSession(externalSession);
    setResult(externalSession.lastRun);
    setEvents(externalSession.lastRun?.events ?? []);
    setFeedback(runFeedback(externalSession.lastRun?.diagnostic ?? null));
    setFocusBlockId(externalSession.lastRun?.diagnostic?.sourceBlockId ?? null);
    setObservation(null);
    setEligible(false);
    setPlayback(false);
    setCompleting(false);
    setRecovery('none');
    // The visible Blockly graph can have unsaved local edits. An explicit choice
    // to load the other tab must rebuild that graph from the winning saved draft.
    setWorkspaceGeneration((generation) => generation + 1);
    setLock(false, 'idle');
  };
  const stableAbility = progress.abilities.conditionObservation.acquiredAt !== null
    && progress.abilities.conditionObservation.stableUnlockedAt !== null;
  const fireEyeAvailable = stableAbility && persistedSession.failureSnapshot !== null;
  const lockedNow = locked || pending || playback || completing || recovery !== 'none';

  return <section className="advanced-week-one-experience week-three-manor-help-experience">
    <LazySectionBoundary label="庄上求助场景" reloadPage={reloadPage}><Suspense fallback={<p role="status">庄上求助场景加载中，请稍候……</p>}><Scene events={events} replayToken={replayToken} reducedMotion={reducedMotion} muted={muted} onResourceStateChange={setSceneReady} onPlaybackComplete={() => void finish()} /></Suspense></LazySectionBoundary>
    <LazySectionBoundary label="庄上求助积木" reloadPage={reloadPage}><Suspense fallback={<p role="status">庄上求助积木加载中，请稍候……</p>}><Workspace key={workspaceGeneration} draft={persistedSession.workspace} locked={lockedNow} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} onRun={(compiled) => void run(compiled)} onDraftChange={saveDraft} /></Suspense></LazySectionBoundary>
    <section className="week-three-manor-help-messages" aria-label="双情境口信">
      <article><h3>原著情境</h3><p>高才奉高太公之命，正在寻找能降妖、解除庄上困扰的法师。</p></article>
      <article><h3>练习情境·不改变原著</h3><p>庄客只介绍高老庄的位置和道路，没有请求帮助。</p></article>
    </section>
    {feedback ? <div className="battle-feedback" role="alert">{feedback}</div> : null}
    <p className="week-three-manor-help-no-penalty">{noPenalty}</p>
    {fireEyeAvailable ? <div className="week-three-manor-help-observation-action"><button type="button" className="button button-ghost" disabled={lockedNow} onClick={() => void useObservation()}>火眼金睛·条件观察</button></div> : null}
    {observation ? <section className="week-three-manor-help-observation" role="region" aria-label="条件观察结果"><p>{observation.conditionLabel}</p><p>{observation.observedValue ? '真' : '假'}</p><p>{observationEvidence(observation)}</p><p>{branchLabel(observation.branch)}</p></section> : null}
    <div className="workspace-actions"><button type="button" className="button button-ghost" disabled={lockedNow || !persistedSession.lastRun} onClick={() => { if (operationRef.current !== 'idle') return; setEligible(false); setObservation(null); setEvents(persistedSession.lastRun?.events ?? []); setReplayToken((token) => token + 1); playbackRef.current = true; operationRef.current = 'playback'; setPlayback(true); setLock(true, 'playback'); }}>重播最近一次</button></div>
    {recovery !== 'none' ? <div className="unsaved-session" role="alert"><p>{recovery === 'conflict' ? '本次记录与其他标签页冲突。' : '本次学习记录尚未保存，请重试。'}</p>{recovery === 'unsaved' ? <button type="button" onClick={() => void retry()}>重试保存本次记录</button> : <><button type="button" onClick={() => { const backup = createBackup(); downloadTextFile(backup.filename, backup.contents, backup.mimeType); }}>下载本页备份</button><button type="button" onClick={loadExternal}>载入其他标签页版本</button></>}</div> : null}
  </section>;
}
