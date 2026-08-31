import { useEffect, useMemo, useRef, useState } from 'react';
import { useProgress } from '../context/ProgressContext';
import { createWeekFourVariablePythonRuntime, WeekFourVariableRuntimeError, type WeekFourVariablePythonRuntime } from '../engine/weekFourVariablePythonRunner';
import type { WeekFourVariableRunResult, WeekFourVariableTraceItem } from '../engine/weekFourVariableContract';
import { createMissionSession } from '../progress/session';
import type { WeekFourVariableMissionSession } from '../progress/weekFourVariableSession';
import type { WeekFourMappingWorkV1 } from '../progress/types';
import { WeekFourMappingWorkReview } from './WeekFourMappingWorkReview';
import { WeekFourVariableEvidencePythonEditor, type WeekFourVariableEvidencePythonEditorHandle } from './WeekFourVariableEvidencePythonEditor';
import { WeekFourVariableEvidenceScene } from './WeekFourVariableEvidenceScene';
import './WeekFourVariableEvidenceExperience.css';

export interface WeekFourVariableEvidenceExperienceProps {
  reducedMotion: boolean;
  muted: boolean;
  locked?: boolean;
  work?: WeekFourMappingWorkV1;
  onComplete(evidence: { stars: 1 | 2 | 3; hintsUsed: number }): void | boolean | Promise<boolean>;
  runtimeFactory?: () => WeekFourVariablePythonRuntime;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => void;
}

type Pending = 'draft' | 'run' | 'observation' | 'infrastructure' | null;

export function WeekFourVariableEvidenceExperience({ reducedMotion, muted, locked = false, work, onComplete, runtimeFactory = createWeekFourVariablePythonRuntime, onSessionPersistenceActiveChange, onInteractionLockChange }: WeekFourVariableEvidenceExperienceProps) {
  const context = useProgress();
  const initial = useMemo<WeekFourVariableMissionSession>(() => context.progress.sessions['w4-m2'] ?? createMissionSession('w4-m2', new Date().toISOString()), []);
  const [session, setSession] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending>(null);
  const [message, setMessage] = useState('先保存 Python 草稿，再运行两次公开取证。');
  const [assetsReady, setAssetsReady] = useState(false);
  const [observation, setObservation] = useState(false);
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const runtimeRef = useRef<WeekFourVariablePythonRuntime | null>(null);
  const draftPersistedRef = useRef(context.progress.sessions['w4-m2'] !== undefined);
  const editorRef = useRef<WeekFourVariableEvidencePythonEditorHandle | null>(null);
  const feedbackRef = useRef<HTMLParagraphElement | null>(null);
  const pendingRunRef = useRef<{ canonicalTrace: WeekFourVariableTraceItem[]; workerTrace: WeekFourVariableTraceItem[]; run: WeekFourVariableRunResult } | null>(null);
  const pendingDraftRef = useRef<string | null>(null);
  const pendingInfrastructureRef = useRef<{ validation: boolean; executionStarted: boolean } | null>(null);
  const revisionRef = useRef(0);
  const runActiveRef = useRef(false);
  const observationActiveRef = useRef(false);
  const retryActiveRef = useRef(false);
  const mountedRef = useRef(true);
  const [retrying, setRetrying] = useState(false);
  const initialSaveRef = useRef(!context.progress.sessions['w4-m2']);
  const completionRef = useRef(false);
  const completionHandoffRef = useRef(false);
  const completionParentLockObservedRef = useRef(false);
  const lockedRef = useRef(locked);
  lockedRef.current = locked;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const completed = context.progress.missions['w4-m2']?.status === 'completed' && context.progress.missionCompletionEvidence['w4-m2']?.kind === 'formal-v3';
  const blocked = locked || busy || pending !== null || context.saveStatus === 'conflict';
  const setLock = (active: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => { onSessionPersistenceActiveChange?.(active); onInteractionLockChange?.(active, reason); };
  const settle = () => { runActiveRef.current = false; setBusy(false); setLock(false, 'idle'); };
  const recover = (kind: Exclude<Pending, null>, text: string) => { runActiveRef.current = false; setBusy(false); setPending(kind); setMessage(text); setLock(true, 'session-recovery'); };
  const accept = (result: any): WeekFourVariableMissionSession | null => {
    if (result.status !== 'saved') return null;
    const next = result.progress.sessions['w4-m2'] as WeekFourVariableMissionSession | undefined;
    if (next && mountedRef.current) { sessionRef.current = next; setSession(next); }
    return next ?? null;
  };
  const saveDraft = async (code = sessionRef.current.pythonCode) => {
    if (draftPersistedRef.current && code === sessionRef.current.pythonCode) return sessionRef.current;
    const saved = accept(await context.saveWeekFourVariableDraft(code));
    if (saved) draftPersistedRef.current = true;
    return saved;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; revisionRef.current += 1; retryActiveRef.current = false; runtimeRef.current?.dispose(); setLock(false, 'idle'); };
  }, []);
  useEffect(() => {
    if (!initialSaveRef.current) return;
    initialSaveRef.current = false;
    void saveDraft(initial.pythonCode).then((next) => {
      if (!mountedRef.current) return;
      if (next) setMessage('已建立并保存本次变量取证草稿。');
    });
  }, []);
  useEffect(() => {
    let active = true;
    runtimeRef.current ??= runtimeFactory();
    void runtimeRef.current.ready().then(() => { if (active) setRuntimeReady(true); }).catch(() => { if (active) setRuntimeReady(false); });
    return () => { active = false; };
  }, [runtimeFactory]);
  useEffect(() => {
    if (!completionHandoffRef.current) return;
    if (locked) {
      completionParentLockObservedRef.current = true;
      return;
    }
    if (!completionParentLockObservedRef.current) return;
    const externalSession = context.progress.sessions['w4-m2'];
    const external = externalSession ?? createMissionSession('w4-m2', new Date().toISOString());
    draftPersistedRef.current = externalSession !== undefined;
    observationActiveRef.current = false;
    sessionRef.current = external;
    setSession(external);
    completionRef.current = false;
    completionHandoffRef.current = false;
    completionParentLockObservedRef.current = false;
    pendingRunRef.current = null;
    pendingDraftRef.current = null;
    pendingInfrastructureRef.current = null;
    setPending(null);
    setObservation(false);
  }, [locked, context.progress.sessions]);

  const complete = async () => {
    if (!assetsReady || completionRef.current || completed || !sessionRef.current.lastRun?.completed) return;
    const generation = revisionRef.current;
    completionRef.current = true; setBusy(true); setLock(true, 'session-pending');
    const hintsUsed = sessionRef.current.usedHintTiers.length;
    const result = await onComplete({ stars: hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1, hintsUsed });
    if (!mountedRef.current || generation !== revisionRef.current) return;
    if (result === false) {
      completionHandoffRef.current = true;
      if (lockedRef.current) completionParentLockObservedRef.current = true;
      runActiveRef.current = false;
      setBusy(false);
      setPending(null);
      setMessage('封存成功已经保存，但作品与通关证明暂未原子保存。请使用页面的“重试保存通关”恢复。');
      return;
    }
    setPending(null); setMessage('两只证据匣已封存，正在显示通关结果。'); settle();
  };

  const run = async () => {
    if (blocked || completed || runActiveRef.current) return;
    runActiveRef.current = true;
    const revision = ++revisionRef.current;
    setBusy(true); setLock(true, 'session-pending'); setMessage('正在保存本次 Python 草稿…');
    const savedDraft = await saveDraft();
    if (!mountedRef.current || revision !== revisionRef.current) return;
    if (!savedDraft) { recover('draft', 'Python 草稿没有保存成功，请重试后再运行。'); return; }
    setMessage('正在运行已保存的 Python 取证…');
    try {
      runtimeRef.current ??= runtimeFactory();
      await runtimeRef.current.ready();
      setRuntimeReady(true);
      const worker = await runtimeRef.current.run(savedDraft.pythonCode);
      if (!mountedRef.current || revision !== revisionRef.current) return;
      const runInput = { canonicalTrace: worker.trace, workerTrace: worker.trace, run: worker.run };
      pendingRunRef.current = runInput;
      const runSave = await context.saveWeekFourVariableRun(runInput);
      const savedRun = accept(runSave);
      if (!mountedRef.current || revision !== revisionRef.current) return;
      if (!savedRun) { recover('run', runSave.status === 'conflict' ? '其他标签页已有新的学习进度，当前取证没有自动覆盖。' : '本次取证结果没有保存成功，请重试保存。'); return; }
      pendingRunRef.current = null;
      setPending(null);
      if (!worker.run.completed) { setMessage('外形匣被覆盖，身份匣为空；这个失败事实已经保存。'); settle(); return; }
      if (!assetsReady) { setMessage('变量取证已封存，等待场景资源准备好后再保存通关。'); settle(); return; }
      await complete();
    } catch (error) {
      if (!mountedRef.current || revision !== revisionRef.current) return;
      const runtimeError = error instanceof WeekFourVariableRuntimeError ? error : null;
      const validation = runtimeError?.code === 'validation';
      const executionStarted = runtimeError?.code === 'timeout';
      if (!runtimeError || !['validation', 'busy'].includes(runtimeError.code)) setRuntimeReady(false);
      const result = validation ? await context.saveWeekFourVariableValidationFailure() : await context.saveWeekFourVariableInfrastructureFailure({ executionStarted });
      if (!mountedRef.current || revision !== revisionRef.current) return;
      if (result.status === 'saved' && accept(result)) {
        pendingInfrastructureRef.current = null;
        setPending(null);
        setMessage(validation
          ? 'Python 结构未通过安全检查，失败计数和原文已经保存；请修正后再次运行。'
          : 'Python 运行环境暂时不可用，运行状态已经保存；这不算学习错误，可以再次运行。');
        settle();
        return;
      }
      pendingInfrastructureRef.current = { validation, executionStarted };
      recover('infrastructure', validation
        ? 'Python 结构未通过安全检查，但失败状态尚未保存，请重试保存。'
        : 'Python 运行环境暂时不可用，且运行状态尚未保存；这不算学习错误。');
    }
  };

  const replay = async () => {
    if (!completed || blocked || runActiveRef.current) return;
    const revision = ++revisionRef.current;
    runActiveRef.current = true; setBusy(true); setLock(true, 'playback'); setMessage('正在回放已保存的变量取证…');
    try {
      const saved = sessionRef.current;
      const proof = context.progress.missionCompletionEvidence['w4-m2'];
      const work = context.progress.works['w4-m2-variable-evidence-record'];
      if (!saved.lastRun?.completed || proof?.kind !== 'formal-v3' || !work) throw new Error('saved-proof-missing');
      runtimeRef.current ??= runtimeFactory();
      await runtimeRef.current.ready();
      setRuntimeReady(true);
      const worker = await runtimeRef.current.run(saved.pythonCode);
      if (!mountedRef.current || revision !== revisionRef.current) return;
      const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
      if (!worker.run.completed
        || !same(worker.trace, saved.lastCanonicalTrace) || !same(worker.trace, saved.lastWorkerTrace) || !same(worker.run, saved.lastRun)
        || proof.pythonCode !== saved.pythonCode || !same(proof.canonicalTrace, worker.trace) || !same(proof.workerTrace, worker.trace) || !same(proof.run, worker.run)
        || work.pythonCode !== saved.pythonCode || !same(work.canonicalTrace, worker.trace) || !same(work.workerTrace, worker.trace) || !same(work.run, worker.run)) throw new Error('saved-proof-mismatch');
      setMessage('回放核验完成，已保留正式作品和通关证明。'); settle();
    } catch (error) {
      if (!mountedRef.current || revision !== revisionRef.current) return;
      if (error instanceof WeekFourVariableRuntimeError && !['validation', 'busy'].includes(error.code)) setRuntimeReady(false);
      setMessage('已保存作品的回放核验暂时不可用，正式作品和通关证明未被修改。'); settle();
    }
  };

  const edit = async (code: string) => {
    if (completed || locked || pending !== null || context.saveStatus === 'conflict') return;
    revisionRef.current += 1;
    if (runActiveRef.current) setRuntimeReady(false);
    runtimeRef.current?.cancel(); runActiveRef.current = false; pendingRunRef.current = null; completionRef.current = false; setObservation(false); setBusy(true); setLock(true, 'session-pending');
    const generation = revisionRef.current;
    const saved = await saveDraft(code);
    if (!mountedRef.current || generation !== revisionRef.current) return;
    if (!saved) { pendingDraftRef.current = code; recover('draft', '新的 Python 草稿没有保存成功，请重试。'); return; }
    pendingDraftRef.current = null;
    setPending(null); setMessage('新的 Python 草稿已保存；旧取证结果已失效。'); settle();
  };

  const saveObservation = async () => {
    if (!sessionRef.current.failureSnapshot || observationActiveRef.current) return;
    observationActiveRef.current = true;
    const generation = revisionRef.current;
    setBusy(true); setLock(true, 'session-pending');
    const result = await context.saveWeekFourVariableObservation();
    if (!mountedRef.current || generation !== revisionRef.current) return;
    observationActiveRef.current = false;
    if (!accept(result)) { recover('observation', '火眼金睛观察没有保存成功，请重试。'); return; }
    setObservation(true); setPending(null); setMessage('火眼金睛只展示已保存的变量覆盖事实。'); settle();
  };
  const observe = async () => { if (!blocked) await saveObservation(); };
  const retry = async () => {
    if (retryActiveRef.current) return;
    const kind = pending; if (!kind) return;
    retryActiveRef.current = true; setRetrying(true); setPending(null);
    try {
    if (kind === 'draft') { setBusy(true); const saved = await saveDraft(pendingDraftRef.current ?? sessionRef.current.pythonCode); if (!mountedRef.current) return; if (saved) { pendingDraftRef.current = null; setMessage('Python 草稿已保存。'); settle(); } else recover('draft', 'Python 草稿没有保存成功，请重试。'); return; }
    if (kind === 'observation') { await saveObservation(); return; }
    if (kind === 'run') {
      const runInput = pendingRunRef.current;
      if (!runInput) { recover('run', '本次取证结果已失效，请重新运行。'); return; }
      setBusy(true); setLock(true, 'session-pending');
      const saved = accept(await context.retrySave());
      if (!mountedRef.current) return;
      if (!saved) { recover('run', '本次取证结果没有保存成功，请重试保存。'); return; }
      pendingRunRef.current = null; setMessage(runInput.run.completed ? '变量取证结果已保存。' : '外形匣被覆盖，身份匣为空；这个失败事实已经保存。');
      if (runInput.run.completed && assetsReady) { await complete(); return; }
      settle(); return;
    }
    const pendingInfrastructure = pendingInfrastructureRef.current;
    if (!pendingInfrastructure) { recover('infrastructure', '运行状态已失效，请再次运行。'); return; }
    setBusy(true); setLock(true, 'session-pending');
    const saved = accept(await context.retrySave());
    if (!mountedRef.current) return;
    if (saved) { pendingInfrastructureRef.current = null; setMessage('运行环境状态已保存；请再次运行。'); settle(); } else recover('infrastructure', '运行状态无法保存，请重试。');
    } finally {
      retryActiveRef.current = false;
      if (mountedRef.current) setRetrying(false);
    }
  };
  const reloadExternal = () => {
    const external = context.reloadExternalProgress();
    if (!external) return;
    revisionRef.current += 1;
    if (runActiveRef.current) setRuntimeReady(false);
    runtimeRef.current?.cancel(); runActiveRef.current = false; pendingRunRef.current = null; completionRef.current = false; completionHandoffRef.current = false; completionParentLockObservedRef.current = false; pendingInfrastructureRef.current = null;
    const externalSession = external.sessions['w4-m2'];
    const next = externalSession ?? createMissionSession('w4-m2', new Date().toISOString());
    draftPersistedRef.current = externalSession !== undefined;
    observationActiveRef.current = false;
    sessionRef.current = next;
    setSession(next);
    setPending(null); setObservation(false); setMessage('已载入其他标签页保存的变量取证进度。'); settle();
  };
  useEffect(() => { if (assetsReady && session.lastRun?.completed && !completed && !pending && !busy) void complete(); }, [assetsReady, session.lastRun, completed, pending, busy]);
  useEffect(() => {
    if (session.failureSnapshot && !busy && pending === null) feedbackRef.current?.focus();
  }, [session.failureSnapshot, busy, pending, message]);

  const state = session.lastRun?.completed ? 'sealed' : session.failureSnapshot ? 'unsealed' : 'ready';
  return <section className="week-four-variable-evidence-experience">
    <header><p className="eyebrow">W4-M2 变量取证</p><h2>两只证据匣，别让变量被覆盖</h2><p>普通观察与火眼核验分别写入自己的变量；火眼不显示任何可照抄的身份答案。</p></header>
    <div className="week-four-variable-layout"><WeekFourVariableEvidenceScene state={state} events={session.lastCanonicalTrace} muted={muted} reducedMotion={reducedMotion} showCanonEpilogue={completed} onAssetsReady={() => setAssetsReady(true)} onAssetsError={(text) => { setAssetsReady(false); setMessage(text); }} /><WeekFourMappingWorkReview work={work} /><WeekFourVariableEvidencePythonEditor key={editorGeneration} ref={editorRef} code={session.pythonCode} sourceSpan={session.pythonSourceSpan} disabled={blocked || completed} onCodeChange={(code) => void edit(code)} onReady={() => setEditorError(null)} onError={setEditorError} /></div>
    <section className="week-four-variable-feedback" aria-live="polite"><p ref={feedbackRef} tabIndex={-1} role={pending ? 'alert' : 'status'} aria-label={pending ? message : undefined}>{message}</p>{runtimeReady ? <p role="status" aria-label="Python 运行环境已准备">Python 运行环境已准备</p> : <p role="status" aria-label="Python 运行环境加载中">Python 运行环境加载中</p>}<button type="button" className="button button-primary" disabled={blocked} onClick={() => void (completed ? replay() : run())}>运行取证</button>{session.failureSnapshot ? <><button type="button" className="button button-ghost" disabled={blocked} onClick={() => void observe()}>火眼金睛：观察本次覆盖</button><button type="button" className="button button-ghost" onClick={() => editorRef.current?.focusField()}>查看问题代码行</button></> : null}{editorError ? <button type="button" className="button button-ghost" onClick={() => { setEditorError(null); setEditorGeneration((generation) => generation + 1); }}>重试加载 Python 编辑器</button> : null}{context.saveStatus === 'conflict' && !completionRef.current ? <button type="button" className="button button-primary" onClick={reloadExternal}>载入其他标签页进度</button> : null}{pending ? <button type="button" className="button button-primary" disabled={retrying} onClick={() => void retry()}>重试保存</button> : null}</section>
    {observation && session.failureSnapshot ? <aside className="week-four-variable-observation" role="status"><h3>火眼金睛：已保存的变量事实</h3><p>第二次核验写入了已有的外形匣，因此先前记录被覆盖；身份匣没有独立写入。</p><p>请检查第二行写入的变量名称。</p></aside> : null}
    <p>学习中的失败不会扣除生命、资源或星级。</p>
  </section>;
}
