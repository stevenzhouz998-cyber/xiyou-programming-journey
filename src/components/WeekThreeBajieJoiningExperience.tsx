import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { BAJIE_JOINING_SCENARIOS, compileBajieJoiningDraft, runBajieJoiningForDraft, type BajieJoiningConditionKind, type BajieJoiningRunResult, type BajieJoiningWorkspaceDraftV1 } from '../blockly/weekThreeBajieJoiningContract';
import type { BajieJoiningCompileResult } from '../blockly/weekThreeBajieJoiningCompiler';
import { useProgress } from '../context/ProgressContext';
import { createMissionSession, recordCompileFailure, recordConditionObservationUse, recordRun, updateWorkspaceDraft } from '../progress/session';
import type { BajieJoiningMissionSession } from '../progress/types';
import { downloadTextFile } from '../utils/download';
import { LazySectionBoundary } from './LazySectionBoundary';
import type { WeekThreeBajieJoiningBlocklyWorkspaceProps } from './WeekThreeBajieJoiningBlocklyWorkspace';
import type { WeekThreeBajieJoiningSceneProps } from './WeekThreeBajieJoiningScene';
import './WeekThreeBajieJoiningExperience.css';

const defaultWorkspaceLoader = () => import('./WeekThreeBajieJoiningBlocklyWorkspace').then((module) => ({ default: module.WeekThreeBajieJoiningBlocklyWorkspace }));
const defaultSceneLoader = () => import('./WeekThreeBajieJoiningScene').then((module) => ({ default: module.WeekThreeBajieJoiningScene }));

export interface WeekThreeBajieJoiningExperienceProps {
  reducedMotion: boolean;
  muted: boolean;
  locked?: boolean;
  onComplete: (evidence: { stars: 1 | 2 | 3; hintsUsed: number }) => void | boolean | Promise<boolean>;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => void;
  workspaceLoader?: () => Promise<{ default: ComponentType<WeekThreeBajieJoiningBlocklyWorkspaceProps> }>;
  sceneLoader?: () => Promise<{ default: ComponentType<WeekThreeBajieJoiningSceneProps> }>;
  reloadPage?: () => void;
}

type Operation = 'idle' | 'draft' | 'run-draft' | 'run' | 'compile' | 'observation' | 'playback' | 'completion';
type SaveStatus = 'unsaved' | 'conflict';
type PendingPayload =
  | { kind: 'draft'; draft: BajieJoiningWorkspaceDraftV1; targetSession: BajieJoiningMissionSession }
  | { kind: 'run-draft'; draft: BajieJoiningWorkspaceDraftV1; targetSession: BajieJoiningMissionSession }
  | { kind: 'run'; trace: BajieJoiningMissionSession['lastTrace']; run: BajieJoiningRunResult; targetSession: BajieJoiningMissionSession }
  | { kind: 'compile'; targetSession: BajieJoiningMissionSession }
  | { kind: 'observation'; snapshotId: string; targetSession: BajieJoiningMissionSession }
  | { kind: 'completion'; evidence: { stars: 1 | 2 | 3; hintsUsed: number } };

const pendingText = (pending: PendingPayload, status: SaveStatus) => `${pending.kind === 'draft' ? '草稿待重试' : pending.kind === 'run-draft' || pending.kind === 'run' ? '运行记录待重试' : pending.kind === 'compile' ? '结构检查待重试' : pending.kind === 'observation' ? '观察记录待重试' : '通关待保存'}${status === 'conflict' ? '（其他标签页冲突）' : ''}`;

export function WeekThreeBajieJoiningExperience({ reducedMotion, muted, locked = false, onComplete, onSessionPersistenceActiveChange, onInteractionLockChange, workspaceLoader = defaultWorkspaceLoader, sceneLoader = defaultSceneLoader, reloadPage }: WeekThreeBajieJoiningExperienceProps) {
  const context = useProgress();
  const Workspace = useMemo(() => lazy(workspaceLoader), [workspaceLoader]);
  const Scene = useMemo(() => lazy(sceneLoader), [sceneLoader]);
  const initial = useMemo<BajieJoiningMissionSession>(() => context.progress.sessions['w3-m4'] ?? createMissionSession('w3-m4'), []);
  const [session, setSession] = useState(initial);
  const [result, setResult] = useState<BajieJoiningRunResult | null>(initial.lastRun);
  const [operation, setOperation] = useState<Operation>('idle');
  const [pending, setPending] = useState<PendingPayload | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [replayToken, setReplayToken] = useState(0);
  const [observation, setObservation] = useState(false);
  const [isReplay, setIsReplay] = useState(false);
  const [externalPending, setExternalPending] = useState(false);
  const [workspaceGeneration, setWorkspaceGeneration] = useState(0);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const mounted = useRef(true);
  const sessionRef = useRef(session);
  const sceneReadyRef = useRef(sceneReady);
  const ownWriteCount = useRef(0);
  const completedReplayToken = useRef<number | null>(null);
  sessionRef.current = session;
  sceneReadyRef.current = sceneReady;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (context.saveStatus === 'conflict' && ownWriteCount.current === 0 && operation === 'idle' && pending === null) setExternalPending(true); }, [context.saveStatus, operation, pending]);
  const lockedNow = locked || operation !== 'idle' || pending !== null || externalPending;
  const updateLock = (active: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => { onSessionPersistenceActiveChange?.(active); onInteractionLockChange?.(active, reason); };
  const save = async (update: (current: BajieJoiningMissionSession) => BajieJoiningMissionSession) => {
    ownWriteCount.current += 1;
    try {
      let targetSession: BajieJoiningMissionSession | null = null;
      const value = await context.updateMissionSession('w3-m4', (current) => {
        targetSession = structuredClone(update(current));
        return targetSession;
      });
      if (value.status === 'saved') {
        const next = value.progress.sessions['w3-m4'] ?? createMissionSession('w3-m4');
        if (mounted.current) setSession(next);
        return { status: 'saved' as const, session: next };
      }
      return { status: value.status as SaveStatus, targetSession: targetSession ?? structuredClone(sessionRef.current) };
    } finally { ownWriteCount.current -= 1; }
  };
  const finish = () => { if (mounted.current) { setOperation('idle'); setPending(null); setSaveStatus(null); } updateLock(false, 'idle'); };
  const fail = (payload: PendingPayload, status: SaveStatus) => { if (mounted.current) { setOperation('idle'); setPending(payload); setSaveStatus(status); } updateLock(true, 'session-recovery'); };
  const publish = (next: BajieJoiningRunResult, replay = false) => {
    if (!mounted.current) return;
    setResult(next); setFocusBlockId(next.diagnostic?.sourceBlockId ?? next.failureSnapshot?.sourceBlockId ?? null); setObservation(false); setSceneReady(false); setIsReplay(replay); setReplayToken((value) => value + 1);
    if (next.completed) { setOperation('playback'); updateLock(true, 'playback'); } else finish();
  };
  const saveDraft = async (draft: BajieJoiningWorkspaceDraftV1, running = false) => {
    if (lockedNow && !running) return { status: 'unsaved' as const };
    setOperation(running ? 'run-draft' : 'draft'); updateLock(true, 'session-pending');
    const saved = await save((current) => updateWorkspaceDraft(current, structuredClone(draft), new Date().toISOString()));
    if (!mounted.current) return { status: saved.status };
    if (saved.status === 'saved') {
      setResult(saved.session.lastRun); setFocusBlockId(null); setObservation(false); setIsReplay(false);
      if (running) return { status: 'saved' as const, session: saved.session };
      finish(); return { status: 'saved' as const, session: saved.session };
    }
    fail({ kind: running ? 'run-draft' : 'draft', draft: structuredClone(draft), targetSession: saved.targetSession }, saved.status);
    return { status: saved.status };
  };
  const runSavedDraft = async (draft: BajieJoiningWorkspaceDraftV1) => {
    if (!mounted.current) return;
    let trace: BajieJoiningMissionSession['lastTrace'];
    let next: BajieJoiningRunResult;
    try { trace = compileBajieJoiningDraft(draft); next = runBajieJoiningForDraft(draft, trace); }
    catch {
      setOperation('compile');
      const structural = await save((current) => recordCompileFailure(current, 'program-structure', new Date().toISOString()));
      if (!mounted.current) return;
      if (structural.status === 'saved') finish(); else fail({ kind: 'compile', targetSession: structural.targetSession }, structural.status);
      return;
    }
    setOperation('run');
    const persisted = await save((current) => recordRun(current, next, trace, new Date().toISOString()));
    if (!mounted.current) return;
    if (persisted.status === 'saved') publish(next); else fail({ kind: 'run', trace: structuredClone(trace), run: structuredClone(next), targetSession: persisted.targetSession }, persisted.status);
  };
  const runSnapshot = async (draft: BajieJoiningWorkspaceDraftV1) => {
    const saved = await saveDraft(draft, true);
    if (saved.status !== 'saved' || !mounted.current) return;
    await runSavedDraft(draft);
  };
  const run = async (compiled: BajieJoiningCompileResult) => {
    if (lockedNow) return;
    if (!compiled.ok) {
      setFocusBlockId(compiled.diagnostics[0]?.sourceBlockId ?? null);
      setOperation('compile'); updateLock(true, 'session-pending');
      const persisted = await save((current) => recordCompileFailure(current, 'program-structure', new Date().toISOString()));
      if (!mounted.current) return;
      if (persisted.status === 'saved') finish(); else fail({ kind: 'compile', targetSession: persisted.targetSession }, persisted.status);
      return;
    }
    await runSnapshot(structuredClone(compiled.draft));
  };
  const observe = async () => {
    const snapshot = sessionRef.current.failureSnapshot;
    if (!snapshot || lockedNow) return;
    if (sessionRef.current.conditionObservationUses.some((item) => item.snapshotId === snapshot.snapshotId)) { setObservation(true); return; }
    setOperation('observation'); updateLock(true, 'session-pending');
    const persisted = await save((current) => recordConditionObservationUse(current, snapshot.snapshotId, new Date().toISOString()));
    if (!mounted.current) return;
    if (persisted.status === 'saved') { setObservation(true); finish(); } else fail({ kind: 'observation', snapshotId: snapshot.snapshotId, targetSession: persisted.targetSession }, persisted.status);
  };
  const complete = async () => {
    if (operation !== 'playback' || !sceneReadyRef.current || !result?.completed || pending || completedReplayToken.current === replayToken) return;
    if (isReplay) { completedReplayToken.current = replayToken; finish(); return; }
    const evidence = { stars: (sessionRef.current.usedHintTiers.length === 0 ? 3 : sessionRef.current.usedHintTiers.length === 1 ? 2 : 1) as 1 | 2 | 3, hintsUsed: sessionRef.current.usedHintTiers.length };
    setOperation('completion');
    try {
      if ((await onComplete(evidence)) === false) throw new Error('completion unsaved');
      completedReplayToken.current = replayToken;
      finish();
    } catch { if (mounted.current) fail({ kind: 'completion', evidence }, 'unsaved'); }
  };
  const retry = async () => {
    if (!pending || operation !== 'idle') return;
    const value = pending;
    const persistTarget = async (targetSession: BajieJoiningMissionSession, nextOperation: Operation) => {
      setOperation(nextOperation); updateLock(true, 'session-pending');
      return save(() => structuredClone(targetSession));
    };
    if (value.kind === 'draft') {
      const persisted = await persistTarget(value.targetSession, 'draft');
      if (!mounted.current) return;
      if (persisted.status === 'saved') { setResult(persisted.session.lastRun); setFocusBlockId(null); setObservation(false); setIsReplay(false); finish(); }
      else fail({ ...value, targetSession: persisted.targetSession }, persisted.status);
      return;
    }
    if (value.kind === 'run-draft') {
      const persisted = await persistTarget(value.targetSession, 'run-draft');
      if (!mounted.current) return;
      if (persisted.status === 'saved') await runSavedDraft(value.draft);
      else fail({ ...value, targetSession: persisted.targetSession }, persisted.status);
      return;
    }
    if (value.kind === 'run') {
      const persisted = await persistTarget(value.targetSession, 'run');
      if (!mounted.current) return;
      if (persisted.status === 'saved') publish(value.run); else fail({ ...value, targetSession: persisted.targetSession }, persisted.status);
      return;
    }
    if (value.kind === 'compile') {
      const persisted = await persistTarget(value.targetSession, 'compile');
      if (!mounted.current) return;
      if (persisted.status === 'saved') finish(); else fail({ ...value, targetSession: persisted.targetSession }, persisted.status);
      return;
    }
    if (value.kind === 'observation') {
      const persisted = await persistTarget(value.targetSession, 'observation');
      if (!mounted.current) return;
      if (persisted.status === 'saved') { setObservation(true); finish(); } else fail({ ...value, targetSession: persisted.targetSession }, persisted.status);
      return;
    }
    setOperation('completion');
    try { if ((await onComplete(value.evidence)) === false) throw new Error('completion unsaved'); completedReplayToken.current = replayToken; finish(); }
    catch { if (mounted.current) fail(value, 'unsaved'); }
  };
  const reloadExternal = () => {
    const external = context.reloadExternalProgress?.();
    if (!external || !mounted.current) return;
    const next = external.sessions['w3-m4'] ?? createMissionSession('w3-m4');
    setSession(next); setResult(next.lastRun); setObservation(false); setPending(null); setSaveStatus(null); setOperation('idle'); setSceneReady(false); setIsReplay(false); setExternalPending(false); setWorkspaceGeneration((value) => value + 1); updateLock(false, 'idle');
  };
  const downloadBackup = () => { const backup = context.createBackup?.(); if (backup) downloadTextFile(backup.filename, backup.contents, backup.mimeType); };
  const replay = () => { if (lockedNow || !session.lastRun || session.lastTrace.length === 0) return; publish(session.lastRun, true); };
  const feedback = result?.failureSnapshot ? '这张卡没有同时满足两个条件，程序却让它归队了。请检查两个条件的组合方式。' : '';
  const snapshot = session.failureSnapshot;
  const conditionLabel = (kind: BajieJoiningConditionKind) => kind === 'guanyin-precepts' ? '观音劝善受戒' : '明确愿随唐僧西去';

  return <section className="week-three-bajie-joining-experience">
    <header><h2>八戒归队：两个条件要一起核对</h2><p>先用同一张积木图判断三张公开卡，再看故事怎样继续。</p></header>
    <section className="week-three-bajie-joining-cards" aria-label="公开入队陈述卡">
      {BAJIE_JOINING_SCENARIOS.map((scenario) => <article key={scenario.id} className={`week-three-bajie-joining-card ${scenario.cardKind}`}><h3>{scenario.publicTitle}</h3><p>{scenario.publicStatement}</p></article>)}
    </section>
    <LazySectionBoundary label="八戒归队场景" reloadPage={reloadPage}><Suspense fallback={<p role="status">八戒归队场景加载中，请稍候……</p>}><Scene events={result?.completed ? session.lastTrace : []} replayToken={replayToken} reducedMotion={reducedMotion} muted={muted} onResourceStateChange={(ready) => { sceneReadyRef.current = ready; setSceneReady(ready); }} onPlaybackComplete={() => void complete()} /></Suspense></LazySectionBoundary>
    <LazySectionBoundary label="八戒归队积木" reloadPage={reloadPage}><Suspense fallback={<p role="status">八戒归队积木加载中，请稍候……</p>}><Workspace key={workspaceGeneration} draft={session.workspace} locked={lockedNow} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} onDraftChange={(draft) => saveDraft(draft)} onRun={(compiled) => void run(compiled)} /></Suspense></LazySectionBoundary>
    <p>本次错误不会扣除生命、资源或星级。</p>
    {feedback ? <p role="alert">{feedback}</p> : null}
    {session.lastRun && operation === 'idle' && !pending && !externalPending ? <button type="button" onClick={replay}>重播上次运行</button> : null}
    {snapshot ? <button type="button" disabled={lockedNow} onClick={() => void observe()}>火眼金睛：观察本次判断</button> : null}
    {observation && snapshot ? <aside role="status"><p>当前可见 {snapshot.operator.toUpperCase()}</p><p>{conditionLabel(snapshot.leftConditionKind)}：{snapshot.left ? '真' : '假'}；{conditionLabel(snapshot.rightConditionKind)}：{snapshot.right ? '真' : '假'}</p><p>组合结果：{snapshot.combined ? '真' : '假'}</p><p>实际分支：{snapshot.actualBranch === 'then' ? '正式归队' : '继续核对'}；实际动作：{snapshot.actionOpcode === 'formally-join-team' ? '正式归队' : '继续核对入队条件'}。</p><p>{BAJIE_JOINING_SCENARIOS.find((scenario) => scenario.id === snapshot.scenarioId)?.publicStatement}</p></aside> : null}
    {externalPending ? <div role="alert">其他标签页已有新的学习进度，当前积木没有自动覆盖。<button type="button" onClick={downloadBackup}>下载当前积木备份</button><button type="button" onClick={reloadExternal}>载入其他标签页进度</button></div> : null}
    {pending && saveStatus ? <div role="alert">{pendingText(pending, saveStatus)}{saveStatus === 'conflict' ? <><button type="button" onClick={downloadBackup}>下载当前积木备份</button><button type="button" onClick={reloadExternal}>载入其他标签页进度</button></> : <button type="button" onClick={() => void retry()}>重试保存</button>}</div> : null}
  </section>;
}
