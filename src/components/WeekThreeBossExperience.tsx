import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { compileWeekThreeBossDraft, type WeekThreeBossCompileResult } from '../blockly/weekThreeBossCompiler';
import { publicWeekThreeBossScenario, runWeekThreeBossDraft, type WeekThreeBossRunResult, type WeekThreeBossWorkspaceDraftV1 } from '../blockly/weekThreeBossContract';
import { useProgress } from '../context/ProgressContext';
import { createMissionSession, recordConditionObservationUse, recordRun, recordWeekThreeBossCompileFailure, updateWorkspaceDraft } from '../progress/session';
import type { WeekThreeBossMissionSession } from '../progress/types';
import { downloadTextFile } from '../utils/download';
import { LazySectionBoundary } from './LazySectionBoundary';
import type { WeekThreeBossBlocklyWorkspaceProps } from './WeekThreeBossBlocklyWorkspace';
import type { WeekThreeBossSceneProps } from './WeekThreeBossScene';
import './WeekThreeBossExperience.css';

const defaultWorkspaceLoader = () => import('./WeekThreeBossBlocklyWorkspace').then((module) => ({ default: module.WeekThreeBossBlocklyWorkspace }));
const defaultSceneLoader = () => import('./WeekThreeBossScene').then((module) => ({ default: module.WeekThreeBossScene }));
export interface WeekThreeBossExperienceProps {
  reducedMotion: boolean; muted: boolean; locked?: boolean;
  onComplete: (result: { stars: 1 | 2 | 3; hintsUsed: number }) => void | boolean | Promise<boolean>;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => void;
  workspaceLoader?: () => Promise<{ default: ComponentType<WeekThreeBossBlocklyWorkspaceProps> }>;
  sceneLoader?: () => Promise<{ default: ComponentType<WeekThreeBossSceneProps> }>;
  reloadPage?: () => void;
}
type Operation = 'idle' | 'draft' | 'run-draft' | 'run' | 'compile' | 'observation' | 'playback' | 'completion';
type SaveStatus = 'unsaved' | 'conflict';
type Pending = { kind: 'draft' | 'run-draft'; draft: WeekThreeBossWorkspaceDraftV1; target: WeekThreeBossMissionSession } | { kind: 'run'; result: WeekThreeBossRunResult; trace: WeekThreeBossMissionSession['lastTrace']; target: WeekThreeBossMissionSession } | { kind: 'compile' | 'observation'; target: WeekThreeBossMissionSession } | { kind: 'completion'; evidence: { stars: 1 | 2 | 3; hintsUsed: number } };
const labels = { 'manor-help-specificity': '庄口求助卡的判断过宽，本次没有推进故事。', 'disguise-identity': '后宅伪装把外形当成真实身份，本次没有推进故事。', 'yunzhan-branch': '云栈洞对话进入的分支没有执行这张卡需要的动作。', 'joining-operator': '归队练习卡没有同时满足两个条件，本次没有推进故事。' } as const;
const actionLabels: Record<string, string> = { 'accept-demon-help': '接受降妖请求', 'continue-directions': '继续问路', 'keep-disguise': '保持伪装', 'reveal-wukong-and-chase': '显出悟空并追赶', 'guard-cave': '守住洞口', 'explain-guanyin-origin': '说明观音点化', 'formally-join-team': '正式加入队伍', 'continue-verification': '继续核对' };
const stateLabels: Record<string, string> = { 'manor-request': '庄口求助', 'cuilan-disguise': '后宅伪装', 'yunzhan-dialogue': '云栈洞对话', 'bajie-joining': '八戒归队', 'week-three-recap-complete': '第三周故事回顾完成' };
const conditionLabels: Record<string, string> = { 'mentions-gaolao': '提到高老庄', 'explicit-demon-help': '明确请求降妖帮助', 'appearance-matches-cuilan': '外形与高翠兰相同', 'identity-is-cuilan': '真实身份是高翠兰', 'pilgrimage-explicit': '明确说明唐僧正在西行取经', 'guanyin-precepts': '已蒙观音劝善受戒', 'willing-westward': '明确愿随唐僧西去' };
const pendingText = (pending: Pending, status: SaveStatus) => `${pending.kind === 'draft' ? '草稿待重试' : pending.kind === 'run-draft' || pending.kind === 'run' ? '运行记录待重试' : pending.kind === 'compile' ? '结构检查待重试' : pending.kind === 'observation' ? '观察记录待重试' : '通关待保存'}${status === 'conflict' ? '（其他标签页冲突）' : ''}`;

export function WeekThreeBossExperience({ reducedMotion, muted, locked = false, onComplete, onSessionPersistenceActiveChange, onInteractionLockChange, workspaceLoader = defaultWorkspaceLoader, sceneLoader = defaultSceneLoader, reloadPage }: WeekThreeBossExperienceProps) {
  const context = useProgress(); const Workspace = useMemo(() => lazy(workspaceLoader), [workspaceLoader]); const Scene = useMemo(() => lazy(sceneLoader), [sceneLoader]);
  const initial = useMemo<WeekThreeBossMissionSession>(() => context.progress.sessions['w3-m5'] ?? createMissionSession('w3-m5'), []);
  const [session, setSession] = useState(initial); const [result, setResult] = useState<WeekThreeBossRunResult | null>(initial.lastRun); const [operation, setOperation] = useState<Operation>('idle'); const [pending, setPending] = useState<Pending | null>(null); const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null); const [sceneReady, setSceneReady] = useState(false); const [replayToken, setReplayToken] = useState(0); const [observation, setObservation] = useState(false); const [externalPending, setExternalPending] = useState(false); const [workspaceGeneration, setWorkspaceGeneration] = useState(0); const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const mounted = useRef(true); const sessionRef = useRef(session); const sceneReadyRef = useRef(sceneReady); const ownWrites = useRef(0); const completedToken = useRef<number | null>(null); const replay = useRef(false); const draftSaveActive = useRef(false); const queuedDraft = useRef<WeekThreeBossWorkspaceDraftV1 | null>(null); const draftDrain = useRef<Promise<WeekThreeBossMissionSession | null> | null>(null); const runInFlight = useRef(false); sessionRef.current = session; sceneReadyRef.current = sceneReady;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (context.saveStatus === 'conflict' && ownWrites.current === 0 && operation === 'idle' && pending === null) setExternalPending(true); }, [context.saveStatus, operation, pending]);
  const lockedNow = locked || ['draft', 'run-draft', 'run', 'compile', 'observation', 'playback', 'completion'].includes(operation) || pending !== null || externalPending;
  const setLock = (active: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => { onSessionPersistenceActiveChange?.(active); onInteractionLockChange?.(active, reason); };
  const finish = () => { if (mounted.current) { setOperation('idle'); setPending(null); setSaveStatus(null); } setLock(false, 'idle'); };
  const fail = (value: Pending, status: SaveStatus) => { if (mounted.current) { setOperation('idle'); setPending(value); setSaveStatus(status); } setLock(true, 'session-recovery'); };
  const save = async (update: (current: WeekThreeBossMissionSession) => WeekThreeBossMissionSession) => { ownWrites.current += 1; try { let target: WeekThreeBossMissionSession | null = null; const value = await context.updateMissionSession('w3-m5', (current) => { target = structuredClone(update(current)); return target; }); if (value.status === 'saved') { const next = value.progress.sessions['w3-m5'] ?? createMissionSession('w3-m5'); sessionRef.current = next; if (mounted.current) setSession(next); return { status: 'saved' as const, session: next }; } return { status: value.status as SaveStatus, target: target ?? structuredClone(sessionRef.current) }; } finally { ownWrites.current -= 1; } };
  const publish = (next: WeekThreeBossRunResult, isReplay = false) => { if (!mounted.current) return; setResult(next); setFocusBlockId(next.failure?.sourceBlockId ?? null); setObservation(false); setSceneReady(false); replay.current = isReplay; setReplayToken((value) => value + 1); if (next.completed) { setOperation('playback'); setLock(true, 'playback'); } else finish(); };
  const saveDraft = async (draft: WeekThreeBossWorkspaceDraftV1, running = false) => { if (lockedNow && !running) return { status: 'unsaved' as const }; setOperation(running ? 'run-draft' : 'draft'); setLock(true, 'session-pending'); const saved = await save((current) => updateWorkspaceDraft(current, structuredClone(draft), new Date().toISOString())); if (!mounted.current) return { status: saved.status }; if (saved.status === 'saved') { setResult(saved.session.lastRun); setFocusBlockId(null); setObservation(false); if (!running) finish(); return saved; } fail({ kind: running ? 'run-draft' : 'draft', draft: structuredClone(draft), target: saved.target }, saved.status); return saved; };
  const flushDraftQueue = (): Promise<WeekThreeBossMissionSession | null> => {
    if (draftSaveActive.current) return draftDrain.current ?? Promise.resolve(sessionRef.current);
    draftSaveActive.current = true;
    const draining = (async () => {
      let latestSaved: WeekThreeBossMissionSession | null = null;
      try {
        while (queuedDraft.current && mounted.current) {
          const nextDraft = queuedDraft.current; queuedDraft.current = null;
          setOperation('draft'); setLock(true, 'session-pending');
          const saved = await save((current) => updateWorkspaceDraft(current, structuredClone(nextDraft), new Date().toISOString()));
          if (!mounted.current) return null;
          if (saved.status !== 'saved') {
            fail({ kind: 'draft', draft: structuredClone(queuedDraft.current ?? nextDraft), target: saved.target }, saved.status);
            return null;
          }
          latestSaved = saved.session;
        }
        if (latestSaved && mounted.current) { setSession(latestSaved); setResult(latestSaved.lastRun); setFocusBlockId(null); setObservation(false); }
        finish();
        return latestSaved ?? sessionRef.current;
      } finally { draftSaveActive.current = false; draftDrain.current = null; }
    })();
    draftDrain.current = draining;
    return draining;
  };
  const queueDraft = (draft: WeekThreeBossWorkspaceDraftV1) => { if (locked || pending !== null || externalPending || runInFlight.current) return; queuedDraft.current = structuredClone(draft); void flushDraftQueue(); };
  const runSavedDraft = async (draft: WeekThreeBossWorkspaceDraftV1) => { const compiled = compileWeekThreeBossDraft(draft); if (!compiled.ok) { setFocusBlockId(compiled.diagnostics[0]?.sourceBlockId ?? null); setOperation('compile'); const persisted = await save((current) => recordWeekThreeBossCompileFailure(current, new Date().toISOString())); if (!mounted.current) return; if (persisted.status === 'saved') finish(); else fail({ kind: 'compile', target: persisted.target }, persisted.status); return; } const next = runWeekThreeBossDraft(compiled.draft); setOperation('run'); const persisted = await save((current) => recordRun(current, next, compiled.trace, new Date().toISOString())); if (!mounted.current) return; if (persisted.status === 'saved') publish(next); else fail({ kind: 'run', result: structuredClone(next), trace: structuredClone(compiled.trace), target: persisted.target }, persisted.status); };
  const run = async (submitted: WeekThreeBossCompileResult) => {
    if (locked || pending !== null || externalPending || !['idle', 'draft'].includes(operation) || runInFlight.current) return;
    runInFlight.current = true; setOperation('run-draft'); setLock(true, 'session-pending');
    try {
      const queuedBeforeRun = queuedDraft.current !== null || draftSaveActive.current;
      const drained = queuedBeforeRun ? await flushDraftQueue() : null;
      if (queuedBeforeRun && !drained) return;
      if (!mounted.current) return;
      if (!queuedBeforeRun && !submitted.ok) {
        setFocusBlockId(submitted.diagnostics[0]?.sourceBlockId ?? null); setOperation('compile');
        const persisted = await save((current) => recordWeekThreeBossCompileFailure(current, new Date().toISOString()));
        if (persisted.status === 'saved') finish(); else fail({ kind: 'compile', target: persisted.target }, persisted.status);
        return;
      }
      const finalWorkspace = queuedBeforeRun ? drained!.workspace : null;
      if (!queuedBeforeRun) {
        if (!submitted.ok) return;
        const saved = await saveDraft(structuredClone(submitted.draft), true);
        if (saved.status !== 'saved' || !('session' in saved) || !mounted.current) return;
        await runSavedDraft(saved.session.workspace);
        return;
      }
      await runSavedDraft(finalWorkspace!);
    } finally { runInFlight.current = false; }
  };
  const canObserve = context.progress.abilities.conditionObservation.acquiredAt !== null && context.progress.abilities.conditionObservation.stableUnlockedAt !== null;
  const observe = async () => { const snapshot = sessionRef.current.failureSnapshot; if (!snapshot || !canObserve || lockedNow) return; if (sessionRef.current.conditionObservationUses.some((item) => item.snapshotId === snapshot.snapshotId)) { setObservation(true); return; } setOperation('observation'); setLock(true, 'session-pending'); const persisted = await save((current) => recordConditionObservationUse(current, snapshot.snapshotId, new Date().toISOString())); if (!mounted.current) return; if (persisted.status === 'saved') { setObservation(true); finish(); } else fail({ kind: 'observation', target: persisted.target }, persisted.status); };
  const complete = async () => { if (operation !== 'playback' || !sceneReadyRef.current || !result?.completed || pending || completedToken.current === replayToken) return; if (replay.current) { completedToken.current = replayToken; finish(); return; } const evidence = { stars: (sessionRef.current.usedHintTiers.length === 0 ? 3 : sessionRef.current.usedHintTiers.length === 1 ? 2 : 1) as 1 | 2 | 3, hintsUsed: sessionRef.current.usedHintTiers.length }; setOperation('completion'); try { if ((await onComplete(evidence)) === false) throw new Error('unsaved'); completedToken.current = replayToken; finish(); } catch { if (mounted.current) fail({ kind: 'completion', evidence }, 'unsaved'); } };
  const retry = async () => { if (!pending || operation !== 'idle') return; const value = pending; const persist = async (target: WeekThreeBossMissionSession, op: Operation) => { setOperation(op); setLock(true, 'session-pending'); return save(() => structuredClone(target)); }; if (value.kind === 'draft') { const saved = await persist(value.target, 'draft'); if (saved.status === 'saved') { setResult(saved.session.lastRun); setObservation(false); finish(); } else fail({ ...value, target: saved.target }, saved.status); return; } if (value.kind === 'run-draft') { const saved = await persist(value.target, 'run-draft'); if (saved.status === 'saved') await runSavedDraft(saved.session.workspace); else fail({ ...value, target: saved.target }, saved.status); return; } if (value.kind === 'run') { const saved = await persist(value.target, 'run'); if (saved.status === 'saved') publish(value.result); else fail({ ...value, target: saved.target }, saved.status); return; } if (value.kind === 'compile') { const saved = await persist(value.target, 'compile'); if (saved.status === 'saved') finish(); else fail({ ...value, target: saved.target }, saved.status); return; } if (value.kind === 'observation') { const saved = await persist(value.target, 'observation'); if (saved.status === 'saved') { setObservation(true); finish(); } else fail({ ...value, target: saved.target }, saved.status); return; } const completion = value as Extract<Pending, { kind: 'completion' }>; setOperation('completion'); try { if ((await onComplete(completion.evidence)) === false) throw new Error('unsaved'); completedToken.current = replayToken; finish(); } catch { fail(completion, 'unsaved'); } };
  const reloadExternal = () => { const external = context.reloadExternalProgress?.(); if (!external || !mounted.current) return; const next = external.sessions['w3-m5'] ?? createMissionSession('w3-m5'); setSession(next); setResult(next.lastRun); setObservation(false); setPending(null); setSaveStatus(null); setOperation('idle'); setSceneReady(false); setExternalPending(false); setWorkspaceGeneration((value) => value + 1); setLock(false, 'idle'); };
  const downloadBackup = () => { const backup = context.createBackup?.(); if (backup) downloadTextFile(backup.filename, backup.contents, backup.mimeType); };
  const replaySaved = () => { if (!lockedNow && session.lastRun && session.lastTrace.length > 0) publish(session.lastRun, true); }; const snapshot = context.progress.abilities.conditionObservation.acquiredAt !== null && context.progress.abilities.conditionObservation.stableUnlockedAt !== null ? result?.failure ?? null : null;
  const observedScenario = snapshot ? publicWeekThreeBossScenario(snapshot.scenarioId) : null;
  return <section className="week-three-boss-experience"><header><h2>第三周总试炼：高老庄故事状态机</h2><p>在同一张连接图中修复四处判断，再从头运行整套公开证据卡。</p></header><LazySectionBoundary label="高老庄总试炼场景" reloadPage={reloadPage}><Suspense fallback={<p role="status">故事舞台加载中，请稍候……</p>}><Scene events={result?.trace ?? []} replayToken={replayToken} reducedMotion={reducedMotion} muted={muted} onResourceStateChange={(ready) => { sceneReadyRef.current = ready; setSceneReady(ready); }} onPlaybackComplete={() => void complete()} /></Suspense></LazySectionBoundary><LazySectionBoundary label="高老庄总试炼积木" reloadPage={reloadPage}><Suspense fallback={<p role="status">积木工作区加载中，请稍候……</p>}><Workspace key={workspaceGeneration} draft={session.workspace} locked={lockedNow} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} onDraftChange={queueDraft} onRun={run} /></Suspense></LazySectionBoundary><p>所有失败均不会扣除生命、资源或星级。</p>{result?.failure ? <p role="alert">{labels[result.failure.concept]}</p> : null}{session.lastRun && operation === 'idle' && !pending && !externalPending ? <button type="button" onClick={replaySaved}>重播上次运行</button> : null}{snapshot ? <button type="button" disabled={lockedNow} onClick={() => void observe()}>火眼金睛：观察本次判断</button> : null}{observation && snapshot ? <aside role="status"><p>当前公开卡：{observedScenario?.title ?? '当前运行情境'}。</p>{observedScenario?.kind === 'practice' ? <p>逻辑练习，不改变原著故事。</p> : null}<p>本次判断结果：{snapshot.conditionTruth ? '真' : '假'}；当前检查：{conditionLabels[snapshot.conditionKind] ?? '公开条件'}。</p>{snapshot.operator ? <p>原子判断：{snapshot.atomicConditions.map((item) => `${conditionLabels[item.kind] ?? item.kind}${item.value ? '真' : '假'}`).join('、')}；运算符：{snapshot.operator.toUpperCase()}；组合结果：{snapshot.combinedCondition ? '真' : '假'}。</p> : null}<p>实际分支：{snapshot.actualBranch === 'then' ? '满足条件的分支' : '继续核对的分支'}。</p><p>实际故事动作：{actionLabels[snapshot.action] ?? '未识别动作'}。</p><p>故事状态：{stateLabels[snapshot.stateBefore] ?? '未知'} → {stateLabels[snapshot.stateAfter] ?? '未知'}。</p><p>这张公开卡实际执行了故事动作；请回到积木图继续检查。</p></aside> : null}{externalPending ? <div role="alert">其他标签页已有新的学习进度，当前积木没有自动覆盖。<button type="button" onClick={downloadBackup}>下载当前积木备份</button><button type="button" onClick={reloadExternal}>载入其他标签页进度</button></div> : null}{pending && saveStatus ? <div role="alert">{pendingText(pending, saveStatus)}{saveStatus === 'conflict' ? <><button type="button" onClick={downloadBackup}>下载当前积木备份</button><button type="button" onClick={reloadExternal}>载入其他标签页进度</button></> : <button type="button" onClick={() => void retry()}>重试保存</button>}</div> : null}</section>;
}
