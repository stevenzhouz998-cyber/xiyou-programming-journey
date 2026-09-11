import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useProgress, type ProgressContextValue } from '../context/ProgressContext';
import type { WeekFiveStoryOrchestrationRunResult, WeekFiveStoryOrchestrationTraceItem } from '../engine/weekFiveStoryOrchestrationContract';
import { parseWeekFiveStoryOrchestrationPython } from '../engine/weekFiveStoryOrchestrationPythonGrammar';
import { createWeekFiveStoryOrchestrationPythonRuntime, WeekFiveStoryOrchestrationRuntimeError, type WeekFiveStoryOrchestrationPythonRuntime } from '../engine/weekFiveStoryOrchestrationPythonRunner';
import { createMissionSession } from '../progress/session';
import type { CoordinatedSaveResult } from '../progress/storageCoordinator';
import type { WeekFiveStoryOrchestrationMissionSession } from '../progress/weekFiveStoryOrchestrationSession';
import { downloadTextFile } from '../utils/download';
import { LazySectionBoundary } from './LazySectionBoundary';
import type { WeekFiveStoryOrchestrationPythonEditorHandle, WeekFiveStoryOrchestrationPythonEditorProps } from './WeekFiveStoryOrchestrationPythonEditor';
import type { WeekFiveStoryOrchestrationSceneProps } from './WeekFiveStoryOrchestrationScene';
import './WeekFiveStoryOrchestrationExperience.css';

const loadEditor = () => import('./WeekFiveStoryOrchestrationPythonEditor').then((module) => ({ default: module.WeekFiveStoryOrchestrationPythonEditor }));
const loadScene = () => import('./WeekFiveStoryOrchestrationScene').then((module) => ({ default: module.WeekFiveStoryOrchestrationScene }));
export interface WeekFiveStoryOrchestrationExperienceProps {
  reducedMotion: boolean; muted: boolean; locked?: boolean;
  onComplete(evidence: { stars: 1 | 2 | 3; hintsUsed: number }): void | boolean | Promise<boolean>;
  runtimeFactory?: () => WeekFiveStoryOrchestrationPythonRuntime;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => void;
}
type Operation = 'idle' | 'initial-save' | 'draft-save' | 'run' | 'observation' | 'hint' | 'completion';
type Stage = 'draft' | 'run' | 'observation' | 'hint' | 'infrastructure' | 'completion';
type RunInput = { canonicalTrace: WeekFiveStoryOrchestrationTraceItem[]; workerTrace: WeekFiveStoryOrchestrationTraceItem[]; run: WeekFiveStoryOrchestrationRunResult };
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
function feedback(run: WeekFiveStoryOrchestrationRunResult): string {
  if (run.state === 'python-structure-invalid') return 'Python 函数结构不在本关安全范围内；当前运行不会被当作通关。';
  if (run.state === 'monk-loop-conflict') return '当前第一个阻塞在解困阶段：有人没有在自己的循环轮次里完成登记。整份程序的真实运行记录已保存。';
  if (run.state === 'temple-call-conflict') return '解困阶段已通过，当前第一个阻塞在三清观阶段：总编排没有按故事顺序启动完整记录。';
  if (run.state === 'weather-binding-conflict') return '前两个阶段已通过，当前第一个阻塞在天气阶段：实际参数和记录结果没有逐次对应。';
  if (run.state === 'later-call-order-conflict') return '前三个阶段已通过，当前第一个阻塞在后续比试阶段：小函数没有按故事顺序完整启动。';
  return '四个阶段都由总函数真实启动，车迟国故事总编排已证明。';
}
const functionLabel = (name: string) => ({
  'top-level': '程序入口', rescue_monks: '解困阶段', record_sanqing: '三清观阶段', weather: '天气记录函数',
  record_weather_sequence: '天气阶段', record_meditation: '坐禅记录组', record_guess: '猜物记录组',
  record_final_trials: '后三项记录组', record_later_trials: '后续比试阶段', record_chechi_story: '故事总编排',
}[name] ?? name);
function traceText(event: WeekFiveStoryOrchestrationTraceItem): string {
  if (event.kind === 'function-defined') return `第 ${event.line} 行：准备${functionLabel(event.name)}。`;
  if (event.kind === 'function-called') return `第 ${event.line} 行：${functionLabel(event.caller)}启动${functionLabel(event.name)}。`;
  if (event.kind === 'function-returned') return `第 ${event.line} 行：${functionLabel(event.name)}完成并返回。`;
  if (event.kind === 'monks-list-created') return `第 ${event.line} 行：建立僧人名单 ${event.items.join('、')}。`;
  if (event.kind === 'monks-loop-entered') return `第 ${event.line} 行：开始逐人循环，共 ${event.items.length} 轮。`;
  if (event.kind === 'monk-action') return `第 ${event.line} 行：${event.scope === 'inside' ? `第 ${(event.iteration ?? 0) + 1} 轮` : '循环外'}${event.action === 'release' ? '解困' : '登记'}${event.target}。`;
  if (event.kind === 'temple-action') return `第 ${event.line} 行：三清观记录${event.action === 'record_arrival' ? '到达' : '名字'}。`;
  if (event.kind === 'parameter-bound') return `第 ${event.line} 行：参数 order 收到“${event.value}”。`;
  if (event.kind === 'weather-action') return `第 ${event.line} 行：实际记录“${event.value}”，来源是${event.source === 'parameter' ? '参数' : '固定文字'}。`;
  return `第 ${event.line} 行：${functionLabel(event.owner)}实际记录“${event.value}”。`;
}
const hintFor = (tier: 'observe' | 'think' | 'partial') => tier === 'observe'
  ? '先看本次完整运行停在哪个阶段，只处理当前真实阻塞。'
  : tier === 'think' ? '每个阶段都要完成自己已经学过的职责，总函数负责把阶段连接起来。' : '查看编辑器当前定位的行，并对照这一阶段的实际执行记录；修改后要重新运行整份程序。';

export function WeekFiveStoryOrchestrationExperience({ reducedMotion, muted, locked = false, onComplete, runtimeFactory = createWeekFiveStoryOrchestrationPythonRuntime, onSessionPersistenceActiveChange, onInteractionLockChange }: WeekFiveStoryOrchestrationExperienceProps) {
  const context = useProgress(); const persisted = context.progress.sessions['w5-m5'];
  const initial = useMemo<WeekFiveStoryOrchestrationMissionSession>(() => persisted ?? createMissionSession('w5-m5', new Date().toISOString()), []);
  const [session, setSession] = useState(initial); const [editorCode, setEditorCode] = useState(initial.pythonCode);
  const [operation, setOperation] = useState<Operation>(persisted ? 'idle' : 'initial-save');
  const [message, setMessage] = useState(persisted ? (initial.lastRun ? feedback(initial.lastRun) : '先运行完整故事，找出第一个真实阻塞阶段。') : '正在保存默认总编排草稿…');
  const [observationVisible, setObservationVisible] = useState(false); const [traceVisible, setTraceVisible] = useState(false); const [traceStep, setTraceStep] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);
  const [canCancelRun, setCanCancelRun] = useState(false);
  const [runtimeState, setRuntimeState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [editorGeneration, setEditorGeneration] = useState(0); const [editorError, setEditorError] = useState<string | null>(null); const [sceneError, setSceneError] = useState<string | null>(null);
  const [assetsReady, setAssetsReady] = useState(false); const [formalCompleted, setFormalCompleted] = useState(context.progress.missionCompletionEvidence['w5-m5']?.kind === 'formal-v3');
  const [pendingStage, setPendingStage] = useState<Stage | null>(null); const [recovery, setRecovery] = useState<'unsaved' | 'conflict' | null>(null); const [retrying, setRetrying] = useState(false);
  const [revealRetry, setRevealRetry] = useState<{ stars: 1 | 2 | 3; hintsUsed: number } | null>(null);
  const sessionRef = useRef(session); const codeRef = useRef(editorCode); const runtimeRef = useRef<WeekFiveStoryOrchestrationPythonRuntime | null>(null); const editorRef = useRef<WeekFiveStoryOrchestrationPythonEditorHandle | null>(null);
  const mounted = useRef(true); const generation = useRef(0); const active = useRef(false); const cancellableRun = useRef(false); const draftPersisted = useRef(Boolean(persisted)); const initialSaveStarted = useRef(false); const assetsReadyRef = useRef(false); const completionActive = useRef(false); const rejectedWrite = useRef<PendingWrite | null>(null); const feedbackRef = useRef<HTMLParagraphElement | null>(null);
  sessionRef.current = session; codeRef.current = editorCode;
  const Editor = useMemo(() => lazy(loadEditor) as React.ComponentType<WeekFiveStoryOrchestrationPythonEditorProps & React.RefAttributes<WeekFiveStoryOrchestrationPythonEditorHandle>>, [editorGeneration]);
  const Scene = useMemo(() => lazy(loadScene) as React.ComponentType<WeekFiveStoryOrchestrationSceneProps>, []);
  const setLock = (value: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => { onSessionPersistenceActiveChange?.(value); onInteractionLockChange?.(value, reason); };
  const finish = () => { active.current = false; cancellableRun.current = false; setCanCancelRun(false); setOperation('idle'); setLock(false, 'idle'); };
  const recover = (stage: Stage, status: 'unsaved' | 'conflict', text: string) => { active.current = false; setOperation('idle'); setPendingStage(stage); setRecovery(status); setMessage(status === 'conflict' ? '其他标签页已有新的学习进度，当前函数代码没有自动覆盖。' : text); setLock(true, 'session-recovery'); };
  const clearRecovery = () => { rejectedWrite.current = null; setPendingStage(null); setRecovery(null); };
  const accept = (result: CoordinatedSaveResult): WeekFiveStoryOrchestrationMissionSession | null => {
    if (result.status !== 'saved') return null; const saved = result.progress.sessions['w5-m5']; if (!saved) return null;
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
      const saved = await attempt(() => context.saveWeekFiveStoryOrchestrationDraft(code));
      if (!mounted.current || currentGeneration !== generation.current) return;
      if (!saved.ok) { rejectedWrite.current = { kind: 'draft', code, message: '默认函数草稿保存异常。' }; recover('draft', 'unsaved', '默认函数草稿保存异常。'); return; }
      const accepted = accept(saved.result);
      if (!accepted) { rejectedWrite.current = null; recover('draft', saved.result.status === 'conflict' ? 'conflict' : 'unsaved', '默认函数草稿尚未保存。'); return; }
      setEditorCode(accepted.pythonCode); setMessage('默认总编排草稿已保存。先运行完整故事，系统只会显示第一个阻塞阶段。'); finish();
    })();
  }, []);

  const edit = async (code: string) => {
    if (formalCompleted || locked) return; setEditorCode(code); codeRef.current = code; setObservationVisible(false); setTraceVisible(false); setTraceStep(0); generation.current += 1; runtimeRef.current?.cancel(); active.current = false;
    setOperation('draft-save'); setLock(true, 'session-pending'); setMessage('正在保存函数草稿…'); const editGeneration = generation.current;
    const saved = await attempt(() => context.saveWeekFiveStoryOrchestrationDraft(code)); if (!mounted.current || editGeneration !== generation.current) return;
    if (!saved.ok) { rejectedWrite.current = { kind: 'draft', code, message: '函数草稿保存异常。' }; recover('draft', 'unsaved', '函数草稿保存异常。'); return; }
    const accepted = accept(saved.result); if (!accepted) { rejectedWrite.current = null; recover('draft', saved.result.status === 'conflict' ? 'conflict' : 'unsaved', '函数草稿尚未保存。'); return; }
    clearRecovery(); setMessage('函数草稿已保存，可以运行。'); finish();
  };

  const verifyFormalRecords = (progress: ProgressContextValue['progress']) => {
    const saved = progress.sessions['w5-m5']; const mission = progress.missions['w5-m5']; const proof = progress.missionCompletionEvidence['w5-m5']; const work = progress.works['w5-m5-story-orchestration-record'];
    if (!saved || !mission || proof?.kind !== 'formal-v3' || !work || work.kind !== 'python-story-orchestration-v1' || proof.workId !== work.workId) throw new Error('formal-record-missing');
    const parsed = parseWeekFiveStoryOrchestrationPython(saved.pythonCode); if ('state' in parsed || !parsed.run.completed || !same(saved.lastCanonicalTrace, parsed.trace) || !same(saved.lastWorkerTrace, parsed.trace) || !same(saved.lastRun, parsed.run) || !same(proof.run, parsed.run) || !same(work.run, parsed.run) || proof.pythonCode !== saved.pythonCode || work.pythonCode !== saved.pythonCode) throw new Error('formal-record-mismatch');
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
    const saved = await attempt(() => context.completeWeekFiveStoryOrchestration(value)); completionActive.current = false; if (!mounted.current) return;
    if (!saved.ok) { rejectedWrite.current = { kind: 'completion', input: value, message: '正式完成记录保存异常。' }; recover('completion', 'unsaved', '正式完成记录保存异常。'); return; }
    if (saved.result.status !== 'saved') { rejectedWrite.current = null; recover('completion', saved.result.status === 'conflict' ? 'conflict' : 'unsaved', '正式完成记录尚未保存。'); return; }
    const records = verifyFormalRecords(saved.result.progress); setSession(records.saved); sessionRef.current = records.saved; setFormalCompleted(true); clearRecovery(); await reveal(value, '故事总编排作品和正式证明已保存。');
  };

  const replay = async () => {
    if (locked || operation !== 'idle' || active.current) return; active.current = true; const replayGeneration = ++generation.current; setOperation('run'); setLock(true, 'playback'); setMessage('正在真实回放已保存的函数作品…');
    try {
      const records = verifyFormalRecords(context.progress); const runtime = runtimeRef.current ?? runtimeFactory(); runtimeRef.current = runtime; await runtime.ready(); if (!mounted.current || replayGeneration !== generation.current) return; setRuntimeState('ready');
      cancellableRun.current = true; setCanCancelRun(true);
      const worker = await runtime.run(records.saved.pythonCode); cancellableRun.current = false; setCanCancelRun(false); if (!mounted.current || replayGeneration !== generation.current) return;
      if (!worker.run.completed || !same(worker.trace, records.saved.lastWorkerTrace) || !same(worker.run, records.saved.lastRun)) throw new Error('replay-mismatch');
      await reveal({ stars: records.mission.stars as 1 | 2 | 3, hintsUsed: records.saved.usedHintTiers.length }, '回放核验完成，原作品、证明、提示和运行次数未改动。');
    } catch (error) { cancellableRun.current = false; setCanCancelRun(false); if (!mounted.current || replayGeneration !== generation.current) return; if (error instanceof WeekFiveStoryOrchestrationRuntimeError && !['validation', 'busy'].includes(error.code)) setRuntimeState('unavailable'); setMessage('回放核验暂时不可用，正式作品和证明未改动。'); finish(); }
  };

  const run = async () => {
    if (formalCompleted) { await replay(); return; } if (locked || operation !== 'idle' || active.current) return;
    active.current = true; const runGeneration = ++generation.current; setOperation('run'); setObservationVisible(false); setLock(true, 'session-pending'); const candidate = codeRef.current; setMessage('正在原子保存当前函数草稿…');
    const draft = await attempt(() => context.saveWeekFiveStoryOrchestrationDraft(candidate)); if (!mounted.current || runGeneration !== generation.current) return;
    if (!draft.ok) { rejectedWrite.current = { kind: 'draft', code: candidate, message: '运行前函数草稿保存异常，本次没有启动 Worker。' }; recover('draft', 'unsaved', '运行前函数草稿保存异常，本次没有启动 Worker。'); return; }
    const savedDraft = accept(draft.result); if (!savedDraft) { rejectedWrite.current = null; recover('draft', draft.result.status === 'conflict' ? 'conflict' : 'unsaved', '函数草稿尚未保存，本次没有启动 Worker。'); return; }
    const parsed = parseWeekFiveStoryOrchestrationPython(savedDraft.pythonCode);
    if ('state' in parsed) {
      const invalid = await attempt(() => context.saveWeekFiveStoryOrchestrationValidationFailure()); if (!mounted.current || runGeneration !== generation.current) return;
      if (!invalid.ok) { rejectedWrite.current = { kind: 'validation', message: '结构失败保存异常。' }; recover('infrastructure', 'unsaved', '结构失败保存异常，当前原文仍保留。'); return; }
      if (!accept(invalid.result)) { rejectedWrite.current = null; recover('infrastructure', invalid.result.status === 'conflict' ? 'conflict' : 'unsaved', '结构失败尚未保存。'); return; }
      editorRef.current?.focusLine(parsed.line); clearRecovery(); setMessage('Python 函数结构不在本关安全范围内；原文和结构失败已保存。'); finish(); return;
    }
    try {
      const runtime = runtimeRef.current ?? runtimeFactory(); runtimeRef.current = runtime; await runtime.ready(); if (!mounted.current || runGeneration !== generation.current) return; setRuntimeState('ready');
      cancellableRun.current = true; setCanCancelRun(true);
      const worker = await runtime.run(savedDraft.pythonCode); cancellableRun.current = false; setCanCancelRun(false); if (!mounted.current || runGeneration !== generation.current) return;
      const input: RunInput = { canonicalTrace: parsed.trace, workerTrace: worker.trace, run: worker.run };
      const savedRun = await attempt(() => context.saveWeekFiveStoryOrchestrationRun(input)); if (!mounted.current || runGeneration !== generation.current) return;
      if (!savedRun.ok) { rejectedWrite.current = { kind: 'run', input, message: '函数运行结果保存异常，场景没有发布这次结果。' }; recover('run', 'unsaved', '函数运行结果保存异常，场景没有发布这次结果。'); return; }
      const accepted = accept(savedRun.result); if (!accepted) { rejectedWrite.current = null; recover('run', savedRun.result.status === 'conflict' ? 'conflict' : 'unsaved', '函数运行结果尚未保存，场景不会把它当作事实。'); return; }
      clearRecovery(); if (accepted.lastRun?.completed) { if (!assetsReadyRef.current) { setMessage('函数已经证明，等待场景资源就绪后再封存作品。'); finish(); return; } finish(); await completeSolved(); return; }
      setMessage(feedback(accepted.lastRun!));
      const failedLine = accepted.failureSnapshot?.sourceSpans[0]?.line;
      if (failedLine) editorRef.current?.focusLine(failedLine);
      else if (accepted.lastRun?.state === 'temple-call-conflict') editorRef.current?.focusCall();
      else if (accepted.lastRun?.state === 'monk-loop-conflict') editorRef.current?.focusAction();
      finish();
    } catch (error) {
      cancellableRun.current = false; setCanCancelRun(false); if (!mounted.current || runGeneration !== generation.current) return; const runtimeError = error instanceof WeekFiveStoryOrchestrationRuntimeError ? error : null; if (runtimeError?.code === 'cancelled') return;
      if (runtimeError?.code === 'busy') { setMessage('Python 运行环境正在执行。'); finish(); return; } setRuntimeState('unavailable'); const input = { executionStarted: runtimeError?.code === 'timeout' };
      const savedFailure = await attempt(() => context.saveWeekFiveStoryOrchestrationInfrastructureFailure(input)); if (!mounted.current || runGeneration !== generation.current) return;
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
    const saved = await attempt(() => context.saveWeekFiveStoryOrchestrationObservation()); if (!mounted.current) return;
    if (!saved.ok) { rejectedWrite.current = { kind: 'observation', message: '观察保存异常。' }; recover('observation', 'unsaved', '火眼金睛观察保存异常。'); return; }
    if (!accept(saved.result)) { rejectedWrite.current = null; recover('observation', saved.result.status === 'conflict' ? 'conflict' : 'unsaved', '火眼金睛观察尚未保存。'); return; }
    clearRecovery(); setObservationVisible(true); setMessage('火眼金睛只展示已保存的实际执行。'); finish();
  };
  const showHint = async (tier: 'observe' | 'think' | 'partial') => {
    if (formalCompleted || operation !== 'idle' || pendingStage) return;
    setOperation('hint'); setLock(true, 'session-pending');
    const saved = await attempt(() => context.recordMissionHint('w5-m5', tier)); if (!mounted.current) return;
    if (!saved.ok) { rejectedWrite.current = { kind: 'hint', tier, message: '函数提示保存异常。' }; recover('hint', 'unsaved', '函数提示保存异常，暂不展示。'); return; }
    const accepted = accept(saved.result); if (!accepted) { rejectedWrite.current = null; recover('hint', saved.result.status === 'conflict' ? 'conflict' : 'unsaved', '函数提示尚未保存，暂不展示。'); return; }
    clearRecovery(); setHintText(hintFor(tier)); setMessage('提示已保存。'); finish();
  };
  const retry = async () => {
    if (!pendingStage || retrying || recovery === 'conflict') return; const request = rejectedWrite.current; setRetrying(true); setLock(true, 'session-pending');
    const write = request ? (request.kind === 'draft' ? () => context.saveWeekFiveStoryOrchestrationDraft(request.code)
      : request.kind === 'run' ? () => context.saveWeekFiveStoryOrchestrationRun(request.input)
      : request.kind === 'validation' ? () => context.saveWeekFiveStoryOrchestrationValidationFailure()
      : request.kind === 'infrastructure' ? () => context.saveWeekFiveStoryOrchestrationInfrastructureFailure(request.input)
      : request.kind === 'observation' ? () => context.saveWeekFiveStoryOrchestrationObservation()
      : request.kind === 'hint' ? () => context.recordMissionHint('w5-m5', request.tier)
      : () => context.completeWeekFiveStoryOrchestration(request.input)) : () => context.retrySave();
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
    const next = external.sessions['w5-m5'] ?? createMissionSession('w5-m5', new Date().toISOString()); setSession(next); sessionRef.current = next; setEditorCode(next.pythonCode); setObservationVisible(false); setTraceVisible(false); setTraceStep(0); setFormalCompleted(external.missionCompletionEvidence['w5-m5']?.kind === 'formal-v3'); clearRecovery(); setMessage(external.sessions['w5-m5'] ? '已载入其他标签页保存的函数进度。' : '其他标签页没有本关函数草稿。'); finish();
  };
  useEffect(() => { if (session.failureSnapshot && operation === 'idle') feedbackRef.current?.focus(); }, [session.failureSnapshot, operation, message]);
  const blocked = locked || operation !== 'idle' || pendingStage !== null || context.saveStatus === 'conflict'; const editorDisabled = formalCompleted || locked || pendingStage !== null || context.saveStatus === 'conflict' || !['idle', 'run', 'draft-save'].includes(operation); const displayCurrent = editorCode === session.pythonCode;
  return <section className="week-five-function-experience" data-mission="w5-m5" data-reduced-motion={reducedMotion} data-muted={muted} data-assets-ready={assetsReady}>
    <header><p className="eyebrow">W5-M5 车迟国总试炼</p><h2>一个总函数，编排完整故事</h2><p>把解困循环、三清观函数、天气参数和后续小函数连成一次完整运行。每次只会显示最先挡住故事的真实问题。</p></header>
    <div className="week-five-function-layout">
      <LazySectionBoundary label="记录庭院场景"><Suspense fallback={<p role="status">记录庭院场景加载中…</p>}><Scene state={displayCurrent ? (session.lastRun?.state ?? 'ready') : 'ready'} events={displayCurrent ? session.lastCanonicalTrace : []} showCanonEpilogue={formalCompleted} muted={muted} reducedMotion={reducedMotion} onAssetsReady={() => { assetsReadyRef.current = true; setAssetsReady(true); setSceneError(null); if (sessionRef.current.lastRun?.completed && operation === 'idle') void completeSolved(); }} onAssetsError={(text) => { assetsReadyRef.current = false; setAssetsReady(false); setSceneError(text); }} /></Suspense></LazySectionBoundary>
      <LazySectionBoundary label="Python 总编排编辑器"><Suspense fallback={<p role="status">Python 总编排编辑器加载中…</p>}><Editor key={editorGeneration} ref={editorRef} code={editorCode} disabled={editorDisabled} onCodeChange={(code) => void edit(code)} onReady={() => setEditorError(null)} onError={setEditorError} /></Suspense></LazySectionBoundary>
      <section className="week-five-function-feedback" aria-live="polite"><p ref={feedbackRef} tabIndex={-1} role={pendingStage ? 'alert' : 'status'} aria-label="总编排运行结果">{message}</p><p role="status" aria-label={runtimeState === 'ready' ? 'Python 运行环境已准备' : runtimeState === 'loading' ? 'Python 运行环境正在准备' : 'Python 运行环境暂不可用'}>{runtimeState === 'ready' ? 'Python 运行环境已准备' : runtimeState === 'loading' ? 'Python 运行环境正在准备' : 'Python 运行环境暂不可用，可再次运行重试'}</p>
        <button type="button" className="button button-primary" disabled={blocked} onClick={() => void run()}>{formalCompleted ? '真实回放总编排作品' : '运行完整故事'}</button>
        {canCancelRun ? <button type="button" className="button button-ghost" onClick={cancelRun}>取消本次运行</button> : null}
        {displayCurrent && session.lastCanonicalTrace.length ? <button type="button" className="button button-ghost" disabled={blocked} onClick={() => { setTraceVisible(true); setTraceStep(0); }}>逐步查看已保存轨迹</button> : null}
        {session.failureSnapshot && displayCurrent ? <button type="button" className="button button-ghost" disabled={blocked} onClick={() => editorRef.current?.focusLine(session.failureSnapshot!.sourceSpans[0]?.line ?? 1)}>定位本次失败行</button> : null}
        {session.failureSnapshot && displayCurrent ? <button type="button" className="button button-ghost" disabled={blocked} onClick={() => void observe()}>火眼金睛：观察实际执行</button> : null}
        {!formalCompleted ? <div className="week-five-function-hints" aria-label="总编排分层提示"><button type="button" className="button button-ghost" disabled={blocked} onClick={() => void showHint('observe')}>提示一：找当前阶段</button><button type="button" className="button button-ghost" disabled={blocked} onClick={() => void showHint('think')}>提示二：想阶段职责</button><button type="button" className="button button-ghost" disabled={blocked} onClick={() => void showHint('partial')}>提示三：看失败行</button>{hintText ? <p role="note">{hintText}</p> : null}</div> : null}
        {editorError ? <button type="button" className="button button-ghost" onClick={() => { setEditorError(null); setEditorGeneration((value) => value + 1); }}>重试加载 Python 编辑器</button> : null}
        {pendingStage && recovery !== 'conflict' ? <button type="button" className="button button-primary" disabled={retrying} onClick={() => void retry()}>重试保存</button> : null}
        {revealRetry ? <button type="button" className="button button-primary" onClick={() => void reveal(revealRetry, '完成结果已重新显示。')}>重新显示完成结果</button> : null}
        {recovery === 'conflict' || context.saveStatus === 'conflict' ? <><button type="button" className="button button-ghost" onClick={() => { const backup = context.createBackup(); downloadTextFile(backup.filename, backup.contents, backup.mimeType); }}>下载当前函数备份</button><button type="button" className="button button-primary" onClick={reloadExternal}>载入其他标签页进度</button></> : null}
        {sceneError ? <p role="alert">{sceneError}</p> : null}</section>
    </div>
    {traceVisible && displayCurrent && session.lastCanonicalTrace[traceStep] ? <aside className="week-five-function-trace" role="region" aria-label="总编排执行轨迹逐步查看"><h3>已保存的真实完整运行轨迹</h3><p aria-live="polite">步骤 {traceStep + 1} / {session.lastCanonicalTrace.length}：{traceText(session.lastCanonicalTrace[traceStep])}</p><div><button type="button" className="button button-ghost" disabled={traceStep === 0} onClick={() => setTraceStep((value) => Math.max(0, value - 1))}>上一步</button><button type="button" className="button button-ghost" disabled={traceStep >= session.lastCanonicalTrace.length - 1} onClick={() => setTraceStep((value) => Math.min(session.lastCanonicalTrace.length - 1, value + 1))}>下一步</button><button type="button" className="button button-ghost" onClick={() => setTraceVisible(false)}>收起轨迹</button></div></aside> : null}
    {observationVisible && session.failureSnapshot ? <aside className="week-five-function-observation" role="status" aria-label="已保存的故事总编排实际执行"><h3>火眼金睛：当前第一个阻塞</h3><p>{session.failureSnapshot.actualActions.join('；')}。</p></aside> : null}
    <p>学习中的失败不会扣除生命、资源或星级。</p>
  </section>;
}
export default WeekFiveStoryOrchestrationExperience;
