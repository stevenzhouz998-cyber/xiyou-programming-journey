import { useEffect, useMemo, useRef, useState } from 'react';
import { compareWeekFourMappingTraces, WEEK_FOUR_MAPPING_CARDS, type WeekFourMappingRunResult, type WeekFourMappingTraceItem } from '../blockly/weekFourMappingContract';
import { useProgress } from '../context/ProgressContext';
import { createWeekFourPythonRuntime, type WeekFourPythonRuntime } from '../engine/weekFourPythonMappingRunner';
import { createMissionSession } from '../progress/session';
import { recordWeekFourMappingInfrastructureFailure, recordWeekFourMappingObservation, recordWeekFourMappingRun, recordWeekFourMappingValidationFailure, updateWeekFourMappingCode, type WeekFourMappingMissionSession } from '../progress/weekFourMappingSession';
import { WeekFourMappingBlocklyWorkspace, type WeekFourMappingBlocklyWorkspaceHandle } from './WeekFourMappingBlocklyWorkspace';
import { WeekFourMappingPythonEditor, type WeekFourMappingPythonEditorHandle } from './WeekFourMappingPythonEditor';
import { WeekFourMappingScene } from './WeekFourMappingScene';
import './WeekFourMappingExperience.css';

export interface WeekFourMappingExperienceProps {
  reducedMotion: boolean;
  muted: boolean;
  locked?: boolean;
  onComplete(evidence: { stars: 1 | 2 | 3; hintsUsed: number }): void | boolean | Promise<boolean>;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => void;
  runtimeFactory?: () => WeekFourPythonRuntime;
}

type Operation = 'idle' | 'saving-draft' | 'running' | 'saving-run' | 'saving-observation' | 'saving-completion';
type PendingPayload =
  | { kind: 'draft'; code: string }
  | { kind: 'run'; blocklyTrace: WeekFourMappingTraceItem[]; pythonTrace: WeekFourMappingTraceItem[]; run: WeekFourMappingRunResult }
  | { kind: 'observation'; snapshotId: string }
  | { kind: 'completion'; run: WeekFourMappingRunResult }
  | { kind: 'infrastructure' };

export function WeekFourMappingExperience({ reducedMotion, muted, locked = false, onComplete, onSessionPersistenceActiveChange, onInteractionLockChange, runtimeFactory = createWeekFourPythonRuntime }: WeekFourMappingExperienceProps) {
  const context = useProgress();
  const initial = useMemo<WeekFourMappingMissionSession>(() => context.progress.sessions['w4-m1'] ?? createMissionSession('w4-m1', new Date().toISOString()), []);
  const [session, setSession] = useState(initial);
  const [operation, setOperation] = useState<Operation>('idle');
  const [pending, setPending] = useState<PendingPayload | null>(null);
  const [message, setMessage] = useState('先保存草稿，再让两种写法依次判断两张公开卡。');
  const [observation, setObservation] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [focusPython, setFocusPython] = useState(false);
  const runtimeRef = useRef<WeekFourPythonRuntime | null>(null);
  const workspaceRef = useRef<WeekFourMappingBlocklyWorkspaceHandle | null>(null);
  const pythonEditorRef = useRef<WeekFourMappingPythonEditorHandle | null>(null);
  const requestRef = useRef(0);
  const completionIssuedRef = useRef(false);
  const runLockRef = useRef(false);
  const mountedRef = useRef(true);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const isCompletedReplay = context.progress.missions['w4-m1']?.status === 'completed'
    && context.progress.missionCompletionEvidence['w4-m1']?.kind === 'formal-v3';
  const externalPending = context.saveStatus === 'conflict';
  const blocked = locked || operation !== 'idle' || pending !== null || externalPending;
  const setLock = (value: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => { onSessionPersistenceActiveChange?.(value); onInteractionLockChange?.(value, reason); };
  const finish = () => { setOperation('idle'); setLock(false, 'idle'); };
  const recover = (payload: PendingPayload, text: string) => { setOperation('idle'); setPending(payload); setMessage(text); setLock(true, 'session-recovery'); };
  useEffect(() => {
    if (isCompletedReplay) return;
    let active = true;
    const runtime = runtimeRef.current ?? runtimeFactory();
    runtimeRef.current = runtime;
    void runtime.ready().catch(() => {
      if (active && runtimeRef.current === runtime) runtimeRef.current = null;
    });
    return () => { active = false; };
  }, [isCompletedReplay, runtimeFactory]);
  useEffect(() => () => { mountedRef.current = false; requestRef.current += 1; runtimeRef.current?.dispose(); setLock(false, 'idle'); }, []);
  const save = async (update: (current: WeekFourMappingMissionSession) => WeekFourMappingMissionSession) => {
    const result = await context.updateMissionSession('w4-m1', update);
    if (result.status !== 'saved') return result;
    const next = result.progress.sessions['w4-m1'];
    if (next && mountedRef.current) setSession(next);
    return result;
  };
  const saveDraft = async (code = sessionRef.current.pythonCode) => {
    setOperation('saving-draft'); setLock(true, 'session-pending');
    const saved = await save((current) => updateWeekFourMappingCode(current, code, new Date().toISOString()));
    if (saved.status !== 'saved') { recover({ kind: 'draft', code }, 'Python 草稿没有保存成功，请重试后再运行。'); return null; }
    return saved.progress.sessions['w4-m1']!;
  };
  const handleCodeChange = async (code: string) => {
    if (blocked || runLockRef.current) return;
    runLockRef.current = true;
    runtimeRef.current?.cancel();
    requestRef.current += 1;
    completionIssuedRef.current = false;
    setObservation(false); setFocusPython(false);
    const saved = await saveDraft(code);
    if (saved) { setPending(null); setMessage('新的 Python 字段已保存；旧对照记录已失效。'); finish(); }
  };
  const run = async (retryingInfrastructure = false) => {
    if (blocked && !retryingInfrastructure) return;
    if (isCompletedReplay) {
      const request = ++requestRef.current;
      setOperation('running'); setMessage('正在重新核验已保存的两张公开卡…');
      try {
        const blocklyTrace = workspaceRef.current?.compile().trace;
        if (!blocklyTrace) throw new Error('Blockly 参考图尚未准备好。');
        runtimeRef.current ??= runtimeFactory();
        await runtimeRef.current.ready();
        const python = await runtimeRef.current.run(sessionRef.current.pythonCode, WEEK_FOUR_MAPPING_CARDS);
        if (!mountedRef.current || request !== requestRef.current) return;
        const replay = compareWeekFourMappingTraces(blocklyTrace, python.trace);
        if (!replay.completed) throw new Error('已保存作品的双轨语义无法重新核验。');
        setMessage('回放核验完成，已保留正式作品和通关证明。');
        finish();
      } catch {
        if (!mountedRef.current || request !== requestRef.current) return;
        setMessage('回放核验暂时不可用，已保存的正式作品和通关证明未被修改。');
        finish();
      }
      return;
    }
    const savedDraft = await saveDraft();
    if (!savedDraft || !mountedRef.current) { runLockRef.current = false; return; }
    const request = ++requestRef.current;
    let blocklyTrace;
    try {
      if (!workspaceRef.current) throw new Error('Blockly 参考图尚未准备好。');
      blocklyTrace = workspaceRef.current.compile().trace;
    }
    catch { recover({ kind: 'draft', code: savedDraft.pythonCode }, 'Blockly 参考图无法编译，不能发布对照结果。'); runLockRef.current = false; return; }
    setOperation('running'); setMessage('正在让两种写法逐卡对照…');
    try {
      runtimeRef.current ??= runtimeFactory();
      await runtimeRef.current.ready();
      const python = await runtimeRef.current.run(savedDraft.pythonCode, WEEK_FOUR_MAPPING_CARDS);
      if (!mountedRef.current || request !== requestRef.current) return;
      const runResult = compareWeekFourMappingTraces(blocklyTrace, python.trace);
      setOperation('saving-run');
      const savedRun = await save((current) => recordWeekFourMappingRun(current, { blocklyTrace, pythonTrace: python.trace, run: runResult }, new Date().toISOString()));
      if (request !== requestRef.current || !mountedRef.current) return;
      if (savedRun.status !== 'saved') { recover({ kind: 'run', blocklyTrace, pythonTrace: python.trace, run: runResult }, '本次对照记录没有保存成功，请重试保存。'); runLockRef.current = false; return; }
      setPending(null); setFocusBlockId(runResult.failureSnapshot ? 'mapping-condition' : null); setFocusPython(Boolean(runResult.failureSnapshot));
      if (!runResult.completed) { setMessage('两种写法在第一张公开卡得出了不同分支；差异已经保存。'); finish(); runLockRef.current = false; return; }
      if (!sceneReady) { setMessage('两张卡已经一致，等待场景资源准备好后再保存通关。'); finish(); runLockRef.current = false; return; }
      await complete(runResult);
    } catch (error) {
      if (!mountedRef.current || request !== requestRef.current) return;
      const text = error instanceof Error ? error.message : 'Python 运行环境不可用。';
      const validation = /只允许|必须是|固定的 if|W4-M1 Python/.test(text);
      const savedFailure = await save((current) => validation ? recordWeekFourMappingValidationFailure(current, new Date().toISOString()) : recordWeekFourMappingInfrastructureFailure(current, new Date().toISOString()));
      if (savedFailure.status === 'saved') recover({ kind: 'infrastructure' }, validation ? 'Python 抄写本被安全检查拒绝，原文已保留。' : 'Python 运行环境暂时不可用，这不算学习错误。');
      else recover({ kind: 'infrastructure' }, '运行状态无法保存，请重试。');
      runLockRef.current = false;
    }
  };
  const complete = async (_run: WeekFourMappingRunResult) => {
    if (!sceneReady || operation === 'saving-completion' || completionIssuedRef.current) return;
    completionIssuedRef.current = true;
    setOperation('saving-completion'); setLock(true, 'session-pending');
    const hintsUsed = sessionRef.current.usedHintTiers.length;
    try {
      if ((await onComplete({ stars: (hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1), hintsUsed })) === false) throw new Error('保存失败');
      setPending(null); setMessage('对照结果和第一份作品已经保存。'); finish();
    } catch { recover({ kind: 'completion', run: _run }, '一致结果尚未原子保存为作品和通关记录，请重试保存。'); }
  };
  useEffect(() => {
    if (sceneReady && session.lastRun?.completed && operation === 'idle' && pending === null && context.progress.missions['w4-m1']?.status !== 'completed') void complete(session.lastRun);
  }, [sceneReady, session.lastRun, operation, pending, context.progress.missions]);
  const observe = async () => {
    if (!sessionRef.current.failureSnapshot || blocked) return;
    setOperation('saving-observation'); setLock(true, 'session-pending');
    const saved = await save((current) => recordWeekFourMappingObservation(current, new Date().toISOString()));
    if (saved.status !== 'saved') { recover({ kind: 'observation', snapshotId: sessionRef.current.failureSnapshot.snapshotId }, '火眼金睛观察没有保存成功，请重试。'); return; }
    setObservation(true); setPending(null); setMessage('火眼金睛只展示这次已经保存的实际判断。'); finish();
  };
  const retry = async () => {
    const payload = pending; if (!payload) return; setPending(null);
    if (payload.kind === 'draft') { const saved = await saveDraft(payload.code); if (saved) { setMessage('Python 草稿已保存。'); finish(); } return; }
    if (payload.kind === 'run') { setOperation('saving-run'); const saved = await save((current) => {
      const alreadyRecorded = current.lastRun !== null
        && JSON.stringify(current.lastBlocklyTrace) === JSON.stringify(payload.blocklyTrace)
        && JSON.stringify(current.lastPythonTrace) === JSON.stringify(payload.pythonTrace)
        && JSON.stringify(current.lastRun) === JSON.stringify(payload.run);
      return alreadyRecorded ? { ...structuredClone(current), savedAt: new Date().toISOString() } : recordWeekFourMappingRun(current, payload, new Date().toISOString());
    }); if (saved.status === 'saved') { setMessage(payload.run.completed ? '两张公开卡已经一致。' : '差异已经保存。'); finish(); } else recover(payload, '本次对照记录没有保存成功，请重试保存。'); return; }
    if (payload.kind === 'observation') { setOperation('saving-observation'); const saved = await save((current) => recordWeekFourMappingObservation(current, new Date().toISOString())); if (saved.status === 'saved') { setObservation(true); finish(); } else recover(payload, '火眼金睛观察没有保存成功，请重试。'); return; }
    if (payload.kind === 'completion') { completionIssuedRef.current = false; await complete(payload.run); return; }
    runLockRef.current = false; void run(true);
  };
  const reloadExternal = () => {
    const external = context.reloadExternalProgress();
    if (!external || !mountedRef.current) return;
    requestRef.current += 1;
    runtimeRef.current?.cancel();
    completionIssuedRef.current = false;
    setSession(external.sessions['w4-m1'] ?? createMissionSession('w4-m1', new Date().toISOString()));
    setPending(null);
    setObservation(false);
    setFocusBlockId(null);
    setFocusPython(false);
    setMessage('已载入其他标签页保存的学习进度。');
    finish();
  };
  const snapshot = session.failureSnapshot;
  const sceneState = session.lastRun?.completed ? 'matched' : snapshot ? 'mismatch' : 'waiting';
  return <section className="week-four-mapping-experience">
    <header><p className="eyebrow">W4-M1 积木变代码</p><h2>同一逻辑，两种写法</h2><p>Blockly 参考图不需要修改；只在 Python 抄写本核对字段。</p></header>
    <div className="week-four-mapping-layout"><WeekFourMappingScene state={sceneState} activeCardId={snapshot?.cardId ?? null} events={session.lastRun?.cardResults ?? []} muted={muted} reducedMotion={reducedMotion} onAssetsReady={() => setSceneReady(true)} onAssetsError={(text) => { setSceneReady(false); setMessage(text); }} />
      <div className="week-four-mapping-workspace"><WeekFourMappingBlocklyWorkspace ref={workspaceRef} draft={session.workspace} focusBlockId={focusBlockId} /><WeekFourMappingPythonEditor ref={pythonEditorRef} code={session.pythonCode} sourceSpan={session.pythonSourceSpan} disabled={blocked} onCodeChange={(code) => void handleCodeChange(code)} /></div>
    </div>
    <section className="week-four-mapping-feedback" aria-live="polite"><p role={pending ? 'alert' : 'status'}>{message}</p><button type="button" className="button button-primary" disabled={blocked} onClick={() => void run()}>对照运行</button>
      {snapshot ? <><button type="button" className="button button-ghost" disabled={blocked} onClick={() => void observe()}>火眼金睛：观察本次判断</button><button type="button" className="button button-ghost" onClick={() => setFocusBlockId('mapping-condition')}>查看问题积木</button><button type="button" className="button button-ghost" onClick={() => { pythonEditorRef.current?.focusField(); setFocusPython(true); }}>查看 Python 行</button></> : null}
      {externalPending ? <div role="alert">其他标签页已有新的学习进度，当前 Python 草稿没有自动覆盖。<button type="button" className="button button-primary" onClick={reloadExternal}>载入其他标签页进度</button></div> : null}
      {pending ? <button type="button" className="button button-primary" onClick={() => void retry()}>重试保存</button> : null}
    </section>
    {observation && snapshot ? <aside className="week-four-mapping-observation" role="status"><h3>火眼金睛：本次已保存的事实</h3><p>公开卡：{snapshot.cardId === 'canon-mysterious-visitor' ? '原著引子' : '逻辑练习'}</p><p>Blockly 读取“真实身份”：{snapshot.blocklyValue}，结果{snapshot.blocklyConditionResult ? '真' : '假'}，进入{snapshot.blocklyBranchAction === 'continue-verification' ? '继续核验' : '礼貌放行'}。</p><p>Python 读取“外形”：{snapshot.pythonValue}，结果{snapshot.pythonConditionResult ? '真' : '假'}，进入{snapshot.pythonBranchAction === 'continue-verification' ? '继续核验' : '礼貌放行'}。</p></aside> : null}
    {focusPython ? <p className="week-four-mapping-python-focus" role="status">问题在 Python 第一行的判断字段。</p> : null}
    <p>学习中的差异不会扣除生命、资源或星级。</p>
  </section>;
}
