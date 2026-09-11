import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useProgress, type ProgressContextValue } from '../context/ProgressContext';
import type { WeekFiveWeatherRunResult, WeekFiveWeatherTraceItem } from '../engine/weekFiveWeatherContract';
import { parseWeekFiveWeatherPython } from '../engine/weekFiveWeatherPythonGrammar';
import { createWeekFiveWeatherPythonRuntime, WeekFiveWeatherRuntimeError, type WeekFiveWeatherPythonRuntime } from '../engine/weekFiveWeatherPythonRunner';
import { createMissionSession } from '../progress/session';
import type { CoordinatedSaveResult } from '../progress/storageCoordinator';
import type { WeekFiveWeatherMissionSession } from '../progress/weekFiveWeatherSession';
import { downloadTextFile } from '../utils/download';
import { LazySectionBoundary } from './LazySectionBoundary';
import type { WeekFiveWeatherPythonEditorHandle, WeekFiveWeatherPythonEditorProps } from './WeekFiveWeatherPythonEditor';
import type { WeekFiveWeatherSceneProps } from './WeekFiveWeatherScene';
import './WeekFiveWeatherExperience.css';

const loadEditor = () => import('./WeekFiveWeatherPythonEditor').then((module) => ({ default: module.WeekFiveWeatherPythonEditor }));
const loadScene = () => import('./WeekFiveWeatherScene').then((module) => ({ default: module.WeekFiveWeatherScene }));
export interface WeekFiveWeatherExperienceProps {
  reducedMotion: boolean; muted: boolean; locked?: boolean;
  onComplete(evidence: { stars: 1 | 2 | 3; hintsUsed: number }): void | boolean | Promise<boolean>;
  runtimeFactory?: () => WeekFiveWeatherPythonRuntime;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => void;
}
type Operation = 'idle' | 'initial-save' | 'draft-save' | 'run' | 'observation' | 'hint' | 'completion';
type Stage = 'draft' | 'run' | 'observation' | 'hint' | 'infrastructure' | 'completion';
type RunInput = { canonicalTrace: WeekFiveWeatherTraceItem[]; workerTrace: WeekFiveWeatherTraceItem[]; run: WeekFiveWeatherRunResult };
type PendingWrite =
  | { kind: 'draft'; code: string; message: string }
  | { kind: 'run'; input: RunInput; message: string }
  | { kind: 'validation'; message: string }
  | { kind: 'infrastructure'; input: { executionStarted: boolean }; message: string }
  | { kind: 'observation'; message: string }
  | { kind: 'hint'; tier: 'observe' | 'think' | 'partial'; message: string }
  | { kind: 'completion'; input: { stars: 1 | 2 | 3; hintsUsed: number }; message: string };
type ContextWrite = () => ReturnType<ProgressContextValue['retrySave']>;
async function attempt(write: ContextWrite): Promise<{ ok: true; result: CoordinatedSaveResult } | { ok: false }> { try { return { ok: true, result: await write() }; } catch { return { ok: false }; } }
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
function feedback(run: WeekFiveWeatherRunResult): string {
  if (run.state === 'call-conflict') return '四次调用需要依次传入风、云、雷、雨；本次真实传入顺序已保存。';
  if (run.state === 'parameter-unused') return '参数 order 已接到每次传入值，但函数体没有用它；实际记录仍停在函数体写死的固定值。';
  return '四次调用依次绑定 order，函数体用参数完成了风、云、雷、雨四次真实记录。';
}
function traceText(event: WeekFiveWeatherTraceItem): string {
  if (event.kind === 'function-defined') return '第 1 行：定义 weather(order)，等待调用传入值。';
  if (event.kind === 'function-called') return `第 ${event.line} 行：第 ${event.call} 次调用 weather，传入“${event.argument}”。`;
  if (event.kind === 'parameter-bound') return `第 ${event.line} 行：参数 order 绑定为“${event.value}”。`;
  return `第 ${event.line} 行：函数体${event.source === 'parameter' ? '读取参数' : '使用固定值'}，实际记录“${event.value}”。`;
}
const hintFor = (tier: 'observe' | 'think' | 'partial') => tier === 'observe'
  ? '先比较“本次传入”和“实际记录”：为什么传入会变，记录却没变？'
  : tier === 'think' ? '每次 weather(...) 都会把括号里的值交给参数 order；函数体需要读取 order。' : '只改函数体第 2 行，把当前固定值换成参数 order。';

export function WeekFiveWeatherExperience({ reducedMotion, muted, locked = false, onComplete, runtimeFactory = createWeekFiveWeatherPythonRuntime, onSessionPersistenceActiveChange, onInteractionLockChange }: WeekFiveWeatherExperienceProps) {
  const context = useProgress(); const persisted = context.progress.sessions['w5-m3'];
  const initial = useMemo<WeekFiveWeatherMissionSession>(() => persisted ?? createMissionSession('w5-m3', new Date().toISOString()), []);
  const [session, setSession] = useState(initial); const [editorCode, setEditorCode] = useState(initial.pythonCode);
  const [operation, setOperation] = useState<Operation>(persisted ? 'idle' : 'initial-save');
  const [message, setMessage] = useState(persisted ? (initial.lastRun ? feedback(initial.lastRun) : '先运行默认代码，观察传入值和实际记录的关系。') : '正在保存默认参数草稿…');
  const [observationVisible, setObservationVisible] = useState(false); const [traceVisible, setTraceVisible] = useState(false); const [traceStep, setTraceStep] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [canCancelRun, setCanCancelRun] = useState(false);
  const [runtimeState, setRuntimeState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [editorGeneration, setEditorGeneration] = useState(0); const [editorError, setEditorError] = useState<string | null>(null); const [sceneError, setSceneError] = useState<string | null>(null);
  const [assetsReady, setAssetsReady] = useState(false); const [formalCompleted, setFormalCompleted] = useState(context.progress.missionCompletionEvidence['w5-m3']?.kind === 'formal-v3');
  const [pendingStage, setPendingStage] = useState<Stage | null>(null); const [recovery, setRecovery] = useState<'unsaved' | 'conflict' | null>(null); const [retrying, setRetrying] = useState(false);
  const [revealRetry, setRevealRetry] = useState<{ stars: 1 | 2 | 3; hintsUsed: number } | null>(null);
  const sessionRef = useRef(session); const codeRef = useRef(editorCode); const runtimeRef = useRef<WeekFiveWeatherPythonRuntime | null>(null); const editorRef = useRef<WeekFiveWeatherPythonEditorHandle | null>(null);
  const mounted = useRef(true); const generation = useRef(0); const active = useRef(false); const cancellableRun = useRef(false); const draftPersisted = useRef(Boolean(persisted)); const initialSaveStarted = useRef(false); const assetsReadyRef = useRef(false); const completionActive = useRef(false); const rejectedWrite = useRef<PendingWrite | null>(null); const feedbackRef = useRef<HTMLParagraphElement | null>(null);
  sessionRef.current = session; codeRef.current = editorCode;
  const Editor = useMemo(() => lazy(loadEditor) as React.ComponentType<WeekFiveWeatherPythonEditorProps & React.RefAttributes<WeekFiveWeatherPythonEditorHandle>>, [editorGeneration]);
  const Scene = useMemo(() => lazy(loadScene) as React.ComponentType<WeekFiveWeatherSceneProps>, []);
  const setLock = (value: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => { onSessionPersistenceActiveChange?.(value); onInteractionLockChange?.(value, reason); };
  const finish = () => { active.current = false; cancellableRun.current = false; setCanCancelRun(false); setOperation('idle'); setLock(false, 'idle'); };
  const recover = (stage: Stage, status: 'unsaved' | 'conflict', text: string) => { active.current = false; setOperation('idle'); setPendingStage(stage); setRecovery(status); setMessage(status === 'conflict' ? '其他标签页已有新的学习进度，当前函数代码没有自动覆盖。' : text); setLock(true, 'session-recovery'); };
  const clearRecovery = () => { rejectedWrite.current = null; setPendingStage(null); setRecovery(null); };
  const accept = (result: CoordinatedSaveResult): WeekFiveWeatherMissionSession | null => {
    if (result.status !== 'saved') return null; const saved = result.progress.sessions['w5-m3']; if (!saved) return null;
    setSession(saved); sessionRef.current = saved; draftPersisted.current = true; return saved;
  };

  useEffect(() => {
    mounted.current = true;
    const runtime = runtimeFactory();
    runtimeRef.current = runtime;
    let effectActive = true;
    setRuntimeState('loading');
    void runtime.ready().then(() => {
      if (effectActive && mounted.current) setRuntimeState('ready');
    }).catch(() => {
      if (effectActive && mounted.current) setRuntimeState('unavailable');
    });
    return () => {
      effectActive = false;
      mounted.current = false;
      generation.current += 1;
      active.current = false;
      runtime.dispose();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
      if (!draftPersisted.current) initialSaveStarted.current = false;
      setLock(false, 'idle');
    };
  }, [runtimeFactory]);
  useEffect(() => {
    if (persisted || initialSaveStarted.current) return; initialSaveStarted.current = true; setLock(true, 'session-pending');
    const code = initial.pythonCode; const currentGeneration = generation.current;
    void (async () => {
      const saved = await attempt(() => context.saveWeekFiveWeatherDraft(code));
      if (!mounted.current || currentGeneration !== generation.current) return;
      if (!saved.ok) { rejectedWrite.current = { kind: 'draft', code, message: '默认函数草稿保存异常。' }; recover('draft', 'unsaved', '默认函数草稿保存异常。'); return; }
      const accepted = accept(saved.result);
      if (!accepted) { rejectedWrite.current = null; recover('draft', saved.result.status === 'conflict' ? 'conflict' : 'unsaved', '默认函数草稿尚未保存。'); return; }
      setEditorCode(accepted.pythonCode); setMessage('默认参数草稿已保存。先运行看看固定值会怎样影响四次调用。'); finish();
    })();
  }, []);

  const edit = async (code: string) => {
    if (formalCompleted || locked) return; setEditorCode(code); codeRef.current = code; setObservationVisible(false); setTraceVisible(false); setTraceStep(0); generation.current += 1; runtimeRef.current?.cancel(); active.current = false;
    setOperation('draft-save'); setLock(true, 'session-pending'); setMessage('正在保存函数草稿…'); const editGeneration = generation.current;
    const saved = await attempt(() => context.saveWeekFiveWeatherDraft(code)); if (!mounted.current || editGeneration !== generation.current) return;
    if (!saved.ok) { rejectedWrite.current = { kind: 'draft', code, message: '函数草稿保存异常。' }; recover('draft', 'unsaved', '函数草稿保存异常。'); return; }
    const accepted = accept(saved.result); if (!accepted) { rejectedWrite.current = null; recover('draft', saved.result.status === 'conflict' ? 'conflict' : 'unsaved', '函数草稿尚未保存。'); return; }
    clearRecovery(); setMessage('函数草稿已保存，可以运行。'); finish();
  };

  const verifyFormalRecords = (progress: ProgressContextValue['progress']) => {
    const saved = progress.sessions['w5-m3']; const mission = progress.missions['w5-m3']; const proof = progress.missionCompletionEvidence['w5-m3']; const work = progress.works['w5-m3-weather-parameter-record'];
    if (!saved || !mission || proof?.kind !== 'formal-v3' || !work || work.kind !== 'python-function-parameter-v1' || proof.workId !== work.workId) throw new Error('formal-record-missing');
    const parsed = parseWeekFiveWeatherPython(saved.pythonCode); if ('state' in parsed || !parsed.run.completed || !same(saved.lastCanonicalTrace, parsed.trace) || !same(saved.lastWorkerTrace, parsed.trace) || !same(saved.lastRun, parsed.run) || !same(proof.run, parsed.run) || !same(work.run, parsed.run) || proof.pythonCode !== saved.pythonCode || work.pythonCode !== saved.pythonCode) throw new Error('formal-record-mismatch');
    return { saved, mission, proof, work };
  };
  const reveal = async (value: { stars: 1 | 2 | 3; hintsUsed: number }, text: string) => {
    try { const shown = await onComplete(value); if (shown === false) { setRevealRetry(value); setMessage('正式记录已保存，但完成画面暂未显示。'); finish(); return; } setRevealRetry(null); setMessage(text); finish(); }
    catch { setRevealRetry(value); setMessage('正式记录已保存，但完成画面暂未显示。'); finish(); }
  };
  const completeSolved = async () => {
    if (completionActive.current || formalCompleted || !assetsReadyRef.current || !sessionRef.current.lastRun?.completed) return;
    completionActive.current = true; active.current = true; setOperation('completion'); setLock(true, 'session-pending'); setMessage('正在封存函数作品和正式证明…');
    const value = { stars: Math.max(1, 3 - sessionRef.current.usedHintTiers.length) as 1 | 2 | 3, hintsUsed: sessionRef.current.usedHintTiers.length };
    const saved = await attempt(() => context.completeWeekFiveWeather(value)); completionActive.current = false; if (!mounted.current) return;
    if (!saved.ok) { rejectedWrite.current = { kind: 'completion', input: value, message: '正式完成记录保存异常。' }; recover('completion', 'unsaved', '正式完成记录保存异常。'); return; }
    if (saved.result.status !== 'saved') { rejectedWrite.current = null; recover('completion', saved.result.status === 'conflict' ? 'conflict' : 'unsaved', '正式完成记录尚未保存。'); return; }
    const records = verifyFormalRecords(saved.result.progress); setSession(records.saved); sessionRef.current = records.saved; setFormalCompleted(true); clearRecovery(); await reveal(value, '祈雨参数作品和正式证明已保存。');
  };

  const replay = async () => {
    if (locked || operation !== 'idle' || active.current) return; active.current = true; const replayGeneration = ++generation.current; setOperation('run'); setLock(true, 'playback'); setMessage('正在真实回放已保存的函数作品…');
    try {
      const records = verifyFormalRecords(context.progress); const runtime = runtimeRef.current ?? runtimeFactory(); runtimeRef.current = runtime; await runtime.ready(); if (!mounted.current || replayGeneration !== generation.current) return; setRuntimeState('ready');
      cancellableRun.current = true; setCanCancelRun(true);
      const worker = await runtime.run(records.saved.pythonCode); cancellableRun.current = false; setCanCancelRun(false); if (!mounted.current || replayGeneration !== generation.current) return;
      if (!worker.run.completed || !same(worker.trace, records.saved.lastWorkerTrace) || !same(worker.run, records.saved.lastRun)) throw new Error('replay-mismatch');
      await reveal({ stars: records.mission.stars as 1 | 2 | 3, hintsUsed: records.saved.usedHintTiers.length }, '回放核验完成，原作品、证明、提示和运行次数未改动。');
    } catch (error) { cancellableRun.current = false; setCanCancelRun(false); if (!mounted.current || replayGeneration !== generation.current) return; if (error instanceof WeekFiveWeatherRuntimeError && !['validation', 'busy'].includes(error.code)) setRuntimeState('unavailable'); setMessage('回放核验暂时不可用，正式作品和证明未改动。'); finish(); }
  };

  const run = async () => {
    if (formalCompleted) { await replay(); return; } if (locked || operation !== 'idle' || active.current) return;
    active.current = true; const runGeneration = ++generation.current; setOperation('run'); setObservationVisible(false); setLock(true, 'session-pending'); const candidate = codeRef.current; setMessage('正在原子保存当前函数草稿…');
    const draft = await attempt(() => context.saveWeekFiveWeatherDraft(candidate)); if (!mounted.current || runGeneration !== generation.current) return;
    if (!draft.ok) { rejectedWrite.current = { kind: 'draft', code: candidate, message: '运行前函数草稿保存异常，本次没有启动 Worker。' }; recover('draft', 'unsaved', '运行前函数草稿保存异常，本次没有启动 Worker。'); return; }
    const savedDraft = accept(draft.result); if (!savedDraft) { rejectedWrite.current = null; recover('draft', draft.result.status === 'conflict' ? 'conflict' : 'unsaved', '函数草稿尚未保存，本次没有启动 Worker。'); return; }
    const parsed = parseWeekFiveWeatherPython(savedDraft.pythonCode);
    if ('state' in parsed) {
      const invalid = await attempt(() => context.saveWeekFiveWeatherValidationFailure()); if (!mounted.current || runGeneration !== generation.current) return;
      if (!invalid.ok) { rejectedWrite.current = { kind: 'validation', message: '结构失败保存异常。' }; recover('infrastructure', 'unsaved', '结构失败保存异常，当前原文仍保留。'); return; }
      if (!accept(invalid.result)) { rejectedWrite.current = null; recover('infrastructure', invalid.result.status === 'conflict' ? 'conflict' : 'unsaved', '结构失败尚未保存。'); return; }
      if (parsed.line === 1) editorRef.current?.focusDefinition(); else editorRef.current?.focusAction(); clearRecovery(); setMessage('Python 函数结构不在本关安全范围内；原文和结构失败已保存。'); finish(); return;
    }
    try {
      const runtime = runtimeRef.current ?? runtimeFactory(); runtimeRef.current = runtime; await runtime.ready(); if (!mounted.current || runGeneration !== generation.current) return; setRuntimeState('ready');
      cancellableRun.current = true; setCanCancelRun(true);
      const worker = await runtime.run(savedDraft.pythonCode); cancellableRun.current = false; setCanCancelRun(false); if (!mounted.current || runGeneration !== generation.current) return;
      const input: RunInput = { canonicalTrace: parsed.trace, workerTrace: worker.trace, run: worker.run };
      const savedRun = await attempt(() => context.saveWeekFiveWeatherRun(input)); if (!mounted.current || runGeneration !== generation.current) return;
      if (!savedRun.ok) { rejectedWrite.current = { kind: 'run', input, message: '函数运行结果保存异常，场景没有发布这次结果。' }; recover('run', 'unsaved', '函数运行结果保存异常，场景没有发布这次结果。'); return; }
      const accepted = accept(savedRun.result); if (!accepted) { rejectedWrite.current = null; recover('run', savedRun.result.status === 'conflict' ? 'conflict' : 'unsaved', '函数运行结果尚未保存，场景不会把它当作事实。'); return; }
      clearRecovery(); if (accepted.lastRun?.completed) { if (!assetsReadyRef.current) { setMessage('函数已经证明，等待场景资源就绪后再封存作品。'); finish(); return; } finish(); await completeSolved(); return; }
      setMessage(feedback(accepted.lastRun!)); if (accepted.lastRun?.state === 'call-conflict') editorRef.current?.focusCall(); else if (accepted.lastRun?.state === 'parameter-unused') editorRef.current?.focusAction(); finish();
    } catch (error) {
      cancellableRun.current = false; setCanCancelRun(false); if (!mounted.current || runGeneration !== generation.current) return; const runtimeError = error instanceof WeekFiveWeatherRuntimeError ? error : null; if (runtimeError?.code === 'cancelled') return;
      if (runtimeError?.code === 'busy') { setMessage('Python 运行环境正在执行。'); finish(); return; } setRuntimeState('unavailable'); const input = { executionStarted: runtimeError?.code === 'timeout' };
      const savedFailure = await attempt(() => context.saveWeekFiveWeatherInfrastructureFailure(input)); if (!mounted.current || runGeneration !== generation.current) return;
      if (!savedFailure.ok) { rejectedWrite.current = { kind: 'infrastructure', input, message: '运行环境故障保存异常。' }; recover('infrastructure', 'unsaved', '运行环境故障保存异常；这不是学习错误。'); return; }
      if (!accept(savedFailure.result)) { rejectedWrite.current = null; recover('infrastructure', savedFailure.result.status === 'conflict' ? 'conflict' : 'unsaved', '运行环境故障尚未保存；这不是学习错误。'); return; }
      clearRecovery(); setMessage('Python 运行环境故障已保存；这不是学习错误，可以重新运行。'); finish();
    }
  };
  const cancelRun = () => {
    if (operation !== 'run' || pendingStage || !cancellableRun.current) return;
    generation.current += 1;
    runtimeRef.current?.cancel();
    active.current = false; cancellableRun.current = false; setCanCancelRun(false);
    setOperation('idle');
    setRuntimeState('loading');
    setMessage('本次运行已取消；迟到的运行结果不会保存。');
    setLock(false, 'idle');
    const runtime = runtimeRef.current;
    if (runtime) void runtime.ready().then(() => {
      if (mounted.current && runtimeRef.current === runtime) setRuntimeState('ready');
    }).catch(() => {
      if (mounted.current && runtimeRef.current === runtime) setRuntimeState('unavailable');
    });
  };

  const observe = async () => {
    if (operation !== 'idle' || !sessionRef.current.failureSnapshot) return; setOperation('observation'); setLock(true, 'session-pending');
    const saved = await attempt(() => context.saveWeekFiveWeatherObservation()); if (!mounted.current) return;
    if (!saved.ok) { rejectedWrite.current = { kind: 'observation', message: '观察保存异常。' }; recover('observation', 'unsaved', '火眼金睛观察保存异常。'); return; }
    if (!accept(saved.result)) { rejectedWrite.current = null; recover('observation', saved.result.status === 'conflict' ? 'conflict' : 'unsaved', '火眼金睛观察尚未保存。'); return; }
    clearRecovery(); setObservationVisible(true); setMessage('火眼金睛只展示已保存的实际执行。'); finish();
  };
  const showHint = async (tier: 'observe' | 'think' | 'partial') => {
    if (formalCompleted || operation !== 'idle' || pendingStage) return;
    setOperation('hint'); setLock(true, 'session-pending');
    const saved = await attempt(() => context.recordMissionHint('w5-m3', tier)); if (!mounted.current) return;
    if (!saved.ok) { rejectedWrite.current = { kind: 'hint', tier, message: '函数提示保存异常。' }; recover('hint', 'unsaved', '函数提示保存异常，暂不展示。'); return; }
    const accepted = accept(saved.result); if (!accepted) { rejectedWrite.current = null; recover('hint', saved.result.status === 'conflict' ? 'conflict' : 'unsaved', '函数提示尚未保存，暂不展示。'); return; }
    clearRecovery(); setHintText(hintFor(tier)); setMessage('提示已保存。'); finish();
  };
  const retry = async () => {
    if (!pendingStage || retrying || recovery === 'conflict') return; const request = rejectedWrite.current; setRetrying(true); setLock(true, 'session-pending');
    const write = request ? (request.kind === 'draft' ? () => context.saveWeekFiveWeatherDraft(request.code)
      : request.kind === 'run' ? () => context.saveWeekFiveWeatherRun(request.input)
      : request.kind === 'validation' ? () => context.saveWeekFiveWeatherValidationFailure()
      : request.kind === 'infrastructure' ? () => context.saveWeekFiveWeatherInfrastructureFailure(request.input)
      : request.kind === 'observation' ? () => context.saveWeekFiveWeatherObservation()
      : request.kind === 'hint' ? () => context.recordMissionHint('w5-m3', request.tier)
      : () => context.completeWeekFiveWeather(request.input)) : () => context.retrySave();
    const saved = await attempt(write); if (!mounted.current) return;
    if (saved.ok) rejectedWrite.current = null;
    if (!saved.ok || saved.result.status !== 'saved') { setRetrying(false); recover(pendingStage, saved.ok && saved.result.status === 'conflict' ? 'conflict' : 'unsaved', request?.message ?? '本次记录仍未保存，请再试一次。'); return; }
    if (pendingStage === 'completion') { const records = verifyFormalRecords(saved.result.progress); const value = request?.kind === 'completion' ? request.input : { stars: records.mission.stars as 1 | 2 | 3, hintsUsed: records.saved.usedHintTiers.length }; setSession(records.saved); sessionRef.current = records.saved; setFormalCompleted(true); clearRecovery(); setRetrying(false); await reveal(value, '正式作品和证明已保存。'); return; }
    const accepted = accept(saved.result); clearRecovery(); setRetrying(false);
    if (pendingStage === 'run' && accepted?.lastRun?.completed && assetsReadyRef.current) { finish(); await completeSolved(); return; }
    if (pendingStage === 'observation') setObservationVisible(true);
    if (pendingStage === 'hint') { const tier = request?.kind === 'hint' ? request.tier : accepted?.usedHintTiers.at(-1); if (tier) setHintText(hintFor(tier)); }
    setMessage(accepted?.lastRun ? feedback(accepted.lastRun) : '记录已保存。'); finish();
  };
  const reloadExternal = () => {
    const external = context.reloadExternalProgress(); if (!external) return; generation.current += 1; runtimeRef.current?.cancel(); active.current = false; completionActive.current = false; rejectedWrite.current = null;
    const next = external.sessions['w5-m3'] ?? createMissionSession('w5-m3', new Date().toISOString()); setSession(next); sessionRef.current = next; setEditorCode(next.pythonCode); setObservationVisible(false); setTraceVisible(false); setTraceStep(0); setFormalCompleted(external.missionCompletionEvidence['w5-m3']?.kind === 'formal-v3'); clearRecovery(); setMessage(external.sessions['w5-m3'] ? '已载入其他标签页保存的函数进度。' : '其他标签页没有本关函数草稿。'); finish();
  };
  useEffect(() => { if (session.failureSnapshot && operation === 'idle') feedbackRef.current?.focus(); }, [session.failureSnapshot, operation, message]);
  const blocked = locked || operation !== 'idle' || pendingStage !== null || context.saveStatus === 'conflict'; const editorDisabled = formalCompleted || locked || pendingStage !== null || context.saveStatus === 'conflict' || !['idle', 'run', 'draft-save'].includes(operation); const displayCurrent = editorCode === session.pythonCode;
  return <section className="week-five-function-experience" data-mission="w5-m3" data-reduced-motion={reducedMotion} data-muted={muted} data-assets-ready={assetsReady}>
    <header><p className="eyebrow">W5-M3 祈雨赌胜</p><h2>参数让同一个函数接住不同号令</h2><p>四次调用传入风、云、雷、雨；让函数体读取 order，观察传入值怎样决定实际记录。</p></header>
    <div className="week-five-function-layout">
      <LazySectionBoundary label="祈雨坛场景"><Suspense fallback={<p role="status">祈雨坛场景加载中…</p>}><Scene state={displayCurrent ? (session.lastRun?.state ?? 'ready') : 'ready'} events={displayCurrent ? session.lastCanonicalTrace : []} showCanonEpilogue={formalCompleted} muted={muted} reducedMotion={reducedMotion} onAssetsReady={() => { assetsReadyRef.current = true; setAssetsReady(true); setSceneError(null); if (sessionRef.current.lastRun?.completed && operation === 'idle') void completeSolved(); }} onAssetsError={(text) => { assetsReadyRef.current = false; setAssetsReady(false); setSceneError(text); }} /></Suspense></LazySectionBoundary>
      <LazySectionBoundary label="Python 参数编辑器"><Suspense fallback={<p role="status">Python 参数编辑器加载中…</p>}><Editor key={editorGeneration} ref={editorRef} code={editorCode} disabled={editorDisabled} onCodeChange={(code) => void edit(code)} onReady={() => setEditorError(null)} onError={setEditorError} /></Suspense></LazySectionBoundary>
      <section className="week-five-function-feedback" aria-live="polite"><p ref={feedbackRef} tabIndex={-1} role={pendingStage ? 'alert' : 'status'} aria-label="参数运行结果">{message}</p><p role="status" aria-label={runtimeState === 'ready' ? 'Python 运行环境已准备' : runtimeState === 'loading' ? 'Python 运行环境正在准备' : 'Python 运行环境暂不可用'}>{runtimeState === 'ready' ? 'Python 运行环境已准备' : runtimeState === 'loading' ? 'Python 运行环境正在准备' : 'Python 运行环境暂不可用，可再次运行重试'}</p>
        <button type="button" className="button button-primary" disabled={blocked} onClick={() => void run()}>{formalCompleted ? '真实回放参数作品' : '运行祈雨参数代码'}</button>
        {canCancelRun ? <button type="button" className="button button-ghost" onClick={cancelRun}>取消本次运行</button> : null}
        {displayCurrent && session.lastCanonicalTrace.length ? <button type="button" className="button button-ghost" disabled={blocked} onClick={() => { setTraceVisible(true); setTraceStep(0); }}>逐步查看已保存轨迹</button> : null}
        {session.failureSnapshot && displayCurrent ? <button type="button" className="button button-ghost" disabled={blocked} onClick={() => void observe()}>火眼金睛：观察实际执行</button> : null}
        {!formalCompleted ? <div className="week-five-function-hints" aria-label="参数分层提示"><button type="button" className="button button-ghost" disabled={blocked} onClick={() => void showHint('observe')}>提示一：先观察</button><button type="button" className="button button-ghost" disabled={blocked} onClick={() => void showHint('think')}>提示二：想参数</button><button type="button" className="button button-ghost" disabled={blocked} onClick={() => void showHint('partial')}>提示三：看一部分</button>{hintText ? <p role="note">{hintText}</p> : null}</div> : null}
        {editorError ? <button type="button" className="button button-ghost" onClick={() => { setEditorError(null); setEditorGeneration((value) => value + 1); }}>重试加载 Python 编辑器</button> : null}
        {pendingStage && recovery !== 'conflict' ? <button type="button" className="button button-primary" disabled={retrying} onClick={() => void retry()}>重试保存</button> : null}
        {revealRetry ? <button type="button" className="button button-primary" onClick={() => void reveal(revealRetry, '完成结果已重新显示。')}>重新显示完成结果</button> : null}
        {recovery === 'conflict' || context.saveStatus === 'conflict' ? <><button type="button" className="button button-ghost" onClick={() => { const backup = context.createBackup(); downloadTextFile(backup.filename, backup.contents, backup.mimeType); }}>下载当前函数备份</button><button type="button" className="button button-primary" onClick={reloadExternal}>载入其他标签页进度</button></> : null}
        {sceneError ? <p role="alert">{sceneError}</p> : null}</section>
    </div>
    {traceVisible && displayCurrent && session.lastCanonicalTrace[traceStep] ? <aside className="week-five-function-trace" role="region" aria-label="参数执行轨迹逐步查看"><h3>已保存的真实参数轨迹</h3><p aria-live="polite">步骤 {traceStep + 1} / {session.lastCanonicalTrace.length}：{traceText(session.lastCanonicalTrace[traceStep])}</p><div><button type="button" className="button button-ghost" disabled={traceStep === 0} onClick={() => setTraceStep((value) => Math.max(0, value - 1))}>上一步</button><button type="button" className="button button-ghost" disabled={traceStep >= session.lastCanonicalTrace.length - 1} onClick={() => setTraceStep((value) => Math.min(session.lastCanonicalTrace.length - 1, value + 1))}>下一步</button><button type="button" className="button button-ghost" onClick={() => setTraceVisible(false)}>收起轨迹</button></div></aside> : null}
    {observationVisible && session.failureSnapshot ? <aside className="week-five-function-observation" role="status" aria-label="已保存的参数实际执行"><h3>火眼金睛：传入、绑定与实际记录</h3><p>{session.failureSnapshot.actualActions.join('；')}。</p></aside> : null}
    <p>学习中的失败不会扣除生命、资源或星级。</p>
  </section>;
}
export default WeekFiveWeatherExperience;
