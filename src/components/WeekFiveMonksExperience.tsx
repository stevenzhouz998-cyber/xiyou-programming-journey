import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useProgress, type ProgressContextValue } from '../context/ProgressContext';
import { WEEK_FIVE_MONKS_CARDS, type WeekFiveMonksRunResult, type WeekFiveMonksTraceItem } from '../engine/weekFiveMonksContract';
import { parseWeekFiveMonksPython } from '../engine/weekFiveMonksPythonGrammar';
import { createWeekFiveMonksPythonRuntime, WeekFiveMonksRuntimeError, type WeekFiveMonksPythonRuntime } from '../engine/weekFiveMonksPythonRunner';
import { createMissionSession } from '../progress/session';
import type { CoordinatedSaveResult } from '../progress/storageCoordinator';
import type { WeekFiveMonksMissionSession } from '../progress/weekFiveMonksSession';
import { downloadTextFile } from '../utils/download';
import { LazySectionBoundary } from './LazySectionBoundary';
import type { WeekFiveMonksPythonEditorHandle, WeekFiveMonksPythonEditorProps } from './WeekFiveMonksPythonEditor';
import type { WeekFiveMonksSceneProps } from './WeekFiveMonksScene';

import './WeekFiveMonksExperience.css';

const loadWeekFiveMonksPythonEditor = () => import('./WeekFiveMonksPythonEditor').then((module) => ({ default: module.WeekFiveMonksPythonEditor }));
const loadWeekFiveMonksScene = () => import('./WeekFiveMonksScene').then((module) => ({ default: module.WeekFiveMonksScene }));

export interface WeekFiveMonksExperienceProps {
  reducedMotion: boolean;
  muted: boolean;
  locked?: boolean;
  onComplete(evidence: { stars: 1 | 2 | 3; hintsUsed: number }): void | boolean | Promise<boolean>;
  runtimeFactory?: () => WeekFiveMonksPythonRuntime;
  onSessionPersistenceActiveChange?: (active: boolean) => void;
  onInteractionLockChange?: (locked: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => void;
}

type Operation = 'idle' | 'initial-save' | 'draft-save' | 'run' | 'observation' | 'completion';
type PendingStage = 'draft' | 'run' | 'observation' | 'infrastructure' | 'completion' | null;
type CompletionReveal = { stars: 1 | 2 | 3; hintsUsed: number };
type BranchRunInput = { canonicalTrace: WeekFiveMonksTraceItem[]; workerTrace: WeekFiveMonksTraceItem[]; run: WeekFiveMonksRunResult };
type RejectedWrite =
  | { kind: 'draft'; stage: 'draft'; code: string; message: string }
  | { kind: 'run'; stage: 'run'; input: BranchRunInput; message: string }
  | { kind: 'validation'; stage: 'infrastructure'; message: string }
  | { kind: 'infrastructure'; stage: 'infrastructure'; input: { executionStarted: boolean }; message: string }
  | { kind: 'observation'; stage: 'observation'; message: string }
  | { kind: 'completion'; stage: 'completion'; input: { stars: 1 | 2 | 3; hintsUsed: number }; message: string }
  | { kind: 'retry'; stage: Exclude<PendingStage, null>; message: string };
type ContextWrite = () => ReturnType<ProgressContextValue['retrySave']>;
type WriteAttempt = { ok: true; result: CoordinatedSaveResult } | { ok: false };

async function attemptContextWrite(operation: ContextWrite): Promise<WriteAttempt> {
  try { return { ok: true, result: await operation() }; }
  catch { return { ok: false }; }
}

function feedbackFor(run: WeekFiveMonksRunResult): string {
  if (run.state === 'coverage-conflict') return '练习名单有遗漏或重复；当前名单和逐人记录已保存。';
  if (run.state === 'action-conflict') return '有人没有按先后完成两步。请查看每人的实际动作与代码位置。';
  return '每位练习僧众都先解除役使，再登记离开。';
}

export function WeekFiveMonksExperience({
  reducedMotion,
  muted,
  locked = false,
  onComplete,
  runtimeFactory = createWeekFiveMonksPythonRuntime,
  onSessionPersistenceActiveChange,
  onInteractionLockChange,
}: WeekFiveMonksExperienceProps) {
  const context = useProgress();
  const persistedInitial = context.progress.sessions['w5-m1'];
  const initial = useMemo<WeekFiveMonksMissionSession>(() => persistedInitial ?? createMissionSession('w5-m1', new Date().toISOString()), []);
  const [session, setSession] = useState(initial);
  const [editorCode, setEditorCode] = useState(initial.pythonCode);
  const [operation, setOperation] = useState<Operation>(persistedInitial ? 'idle' : 'initial-save');
  const [message, setMessage] = useState(persistedInitial ? (initial.lastRun?.completed ? '解困记录和正式证明已保存；可以重新运行核验。' : initial.lastRun ? feedbackFor(initial.lastRun) : '先运行程序，看看每位是否都完成了两步。') : '正在保存默认 Python 草稿…');
  const [observationVisible, setObservationVisible] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [editorGeneration, setEditorGeneration] = useState(0);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  const [formalCompleted, setFormalCompleted] = useState(context.progress.missionCompletionEvidence['w5-m1']?.kind === 'formal-v3');
  const [pending, setPending] = useState<PendingStage>(null);
  const [recoveryStatus, setRecoveryStatus] = useState<'unsaved' | 'conflict' | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [revealRetry, setRevealRetry] = useState<CompletionReveal | null>(null);
  const sessionRef = useRef(session);
  const editorCodeRef = useRef(editorCode);
  const runtimeRef = useRef<WeekFiveMonksPythonRuntime | null>(null);
  const editorRef = useRef<WeekFiveMonksPythonEditorHandle | null>(null);
  const mountedRef = useRef(true);
  const revisionRef = useRef(0);
  const runActiveRef = useRef(false);
  const draftPersistedRef = useRef(Boolean(persistedInitial));
  const initialSaveStartedRef = useRef(false);
  const feedbackRef = useRef<HTMLParagraphElement | null>(null);
  const assetsReadyRef = useRef(false);
  const completionActiveRef = useRef(false);
  const parentRevealSucceededRef = useRef(false);
  const revealActiveRef = useRef(false);
  const pendingDraftRef = useRef<string | null>(null);
  const pendingRunRef = useRef<{ canonicalTrace: WeekFiveMonksTraceItem[]; workerTrace: WeekFiveMonksTraceItem[]; run: WeekFiveMonksRunResult } | null>(null);
  const pendingInfrastructureRef = useRef<{ validation: boolean; executionStarted: boolean } | null>(null);
  const retryActiveRef = useRef(false);
  const rejectedWriteRef = useRef<RejectedWrite | null>(null);
  sessionRef.current = session;
  editorCodeRef.current = editorCode;

  const Editor = useMemo(() => lazy(loadWeekFiveMonksPythonEditor) as React.ComponentType<WeekFiveMonksPythonEditorProps & React.RefAttributes<WeekFiveMonksPythonEditorHandle>>, [editorGeneration]);
  const Scene = useMemo(() => lazy(loadWeekFiveMonksScene) as React.ComponentType<WeekFiveMonksSceneProps>, []);
  const setLock = (active: boolean, reason: 'idle' | 'playback' | 'session-pending' | 'session-recovery') => {
    onSessionPersistenceActiveChange?.(active);
    onInteractionLockChange?.(active, reason);
  };
  const finish = () => {
    runActiveRef.current = false;
    setOperation('idle');
    setLock(false, 'idle');
  };
  const recover = (stage: Exclude<PendingStage, null>, status: 'unsaved' | 'conflict', text: string) => {
    runActiveRef.current = false;
    setOperation('idle');
    setPending(stage);
    setRecoveryStatus(status);
    setMessage(status === 'conflict' ? '其他标签页已有新的学习进度，当前 Python 没有自动覆盖。' : text);
    setLock(true, 'session-recovery');
  };
  const clearRecovery = () => {
    setPending(null);
    setRecoveryStatus(null);
  };
  const accept = (result: CoordinatedSaveResult, expectedGeneration: number): WeekFiveMonksMissionSession | null => {
    if (!mountedRef.current || expectedGeneration !== revisionRef.current) return null;
    if (result.status !== 'saved') return null;
    const next = result.progress.sessions['w5-m1'];
    if (!next) return null;
    sessionRef.current = next;
    setSession(next);
    draftPersistedRef.current = true;
    return next;
  };
  const recoverRejected = (request: RejectedWrite) => {
    rejectedWriteRef.current = request;
    if (request.kind === 'completion') completionActiveRef.current = false;
    recover(request.stage, 'unsaved', request.message);
  };

  const revealCompletion = async (payload: CompletionReveal, generation: number, successMessage: string): Promise<boolean> => {
    if (revealActiveRef.current || parentRevealSucceededRef.current) return parentRevealSucceededRef.current;
    revealActiveRef.current = true;
    try {
      const revealed = await onComplete(payload);
      if (!mountedRef.current || generation !== revisionRef.current) return false;
      if (revealed !== true) {
        setRevealRetry(payload);
        setMessage('正式作品和证明已保存，页面完成结果暂未显示。');
        finish();
        return false;
      }
      parentRevealSucceededRef.current = true;
      setRevealRetry(null);
      setMessage(successMessage);
      finish();
      return true;
    } catch {
      if (!mountedRef.current || generation !== revisionRef.current) return false;
      setRevealRetry(payload);
      setMessage('正式作品和证明已保存，页面完成结果暂时不可用。');
      finish();
      return false;
    } finally {
      revealActiveRef.current = false;
    }
  };

  const finishFormalCompletion = async (result: CoordinatedSaveResult, generation: number) => {
    if (!mountedRef.current || generation !== revisionRef.current) return;
    const savedMission = result.progress.missions?.['w5-m1'];
    const proof = result.progress.missionCompletionEvidence?.['w5-m1'];
    const savedWork = result.progress.works?.['w5-m1-monks-rescue-record'];
    if (result.status === 'saved' && (savedMission?.status !== 'completed'
      || !Number.isSafeInteger(savedMission.stars) || savedMission.stars! < 1 || savedMission.stars! > 3)) {
      completionActiveRef.current = false;
      clearRecovery();
      setMessage('原子完成响应缺少已保存关卡或星级，本页没有揭示通关。');
      finish();
      return;
    }
    if (result.status !== 'saved' || proof?.kind !== 'formal-v3' || savedWork?.kind !== 'python-monks-loop-v1') {
      completionActiveRef.current = false;
      recover('completion', result.status === 'conflict' ? 'conflict' : 'unsaved', '作品与通关证明尚未原子保存。');
      return;
    }
    setFormalCompleted(true);
    completionActiveRef.current = false;
    clearRecovery();
    await revealCompletion({
      stars: savedMission!.stars as 1 | 2 | 3,
      hintsUsed: sessionRef.current.usedHintTiers.length,
    }, generation, '逐人解困作品与正式证明已原子保存。');
  };

  const completeSolved = async () => {
    if (!assetsReadyRef.current || completionActiveRef.current || formalCompleted || !sessionRef.current.lastRun?.completed) return;
    completionActiveRef.current = true;
    const generation = revisionRef.current;
    setOperation('completion');
    setLock(true, 'session-pending');
    setMessage('正在原子保存作品与通关证明…');
    const hintsUsed = sessionRef.current.usedHintTiers.length;
    const input = { stars: (hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1) as 1 | 2 | 3, hintsUsed };
    const attempt = await attemptContextWrite(() => context.completeWeekFiveMonks(input));
    if (!mountedRef.current || generation !== revisionRef.current) return;
    if (!attempt.ok) {
      recoverRejected({ kind: 'completion', stage: 'completion', input, message: '原子完成保存异常，正式作品和证明未发布。' });
      return;
    }
    rejectedWriteRef.current = null;
    await finishFormalCompletion(attempt.result, generation);
  };

  useEffect(() => {
    mountedRef.current = true;
    const runtime = runtimeFactory();
    runtimeRef.current = runtime;
    let active = true;
    void runtime.ready().then(() => { if (active && mountedRef.current) setRuntimeReady(true); }).catch(() => { if (active && mountedRef.current) setRuntimeReady(false); });
    return () => {
      active = false;
      mountedRef.current = false;
      revisionRef.current += 1;
      runActiveRef.current = false;
      runtime.dispose();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
      if (!draftPersistedRef.current) initialSaveStartedRef.current = false;
      setLock(false, 'idle');
    };
  }, [runtimeFactory]);

  useEffect(() => {
    if (draftPersistedRef.current || initialSaveStartedRef.current) return;
    initialSaveStartedRef.current = true;
    const generation = revisionRef.current;
    setLock(true, 'session-pending');
    void (async () => {
      const attempt = await attemptContextWrite(() => context.saveWeekFiveMonksDraft(initial.pythonCode));
      if (!mountedRef.current || generation !== revisionRef.current) return;
      if (!attempt.ok) {
        pendingDraftRef.current = initial.pythonCode;
        recoverRejected({ kind: 'draft', stage: 'draft', code: initial.pythonCode, message: '默认 Python 草稿保存异常，请重试。' });
        return;
      }
      const result = attempt.result;
      const saved = accept(result, generation);
      if (!saved) {
        pendingDraftRef.current = initial.pythonCode;
        recover('draft', result.status === 'conflict' ? 'conflict' : 'unsaved', '默认 Python 草稿尚未保存，请先重试保存。');
        return;
      }
      setEditorCode(saved.pythonCode);
      setMessage('默认 Python 草稿已安全保存，可以运行解困程序。');
      finish();
    })();
  }, []);

  const edit = async (code: string) => {
    if (locked || pending !== null || (operation !== 'idle' && operation !== 'run' && operation !== 'draft-save')) return;
    const generation = ++revisionRef.current;
    runtimeRef.current?.cancel();
    runActiveRef.current = false;
    setRuntimeReady(false);
    editorCodeRef.current = code;
    setEditorCode(code);
    setObservationVisible(false);
    setOperation('draft-save');
    setLock(true, 'session-pending');
    const attempt = await attemptContextWrite(() => context.saveWeekFiveMonksDraft(code));
    if (!mountedRef.current || generation !== revisionRef.current) return;
    if (!attempt.ok) {
      pendingDraftRef.current = code;
      recoverRejected({ kind: 'draft', stage: 'draft', code, message: '新的 Python 草稿保存异常，当前候选没有发布。' });
      return;
    }
    const result = attempt.result;
    const saved = accept(result, generation);
    if (!saved) {
      pendingDraftRef.current = code;
      recover('draft', result.status === 'conflict' ? 'conflict' : 'unsaved', '新的 Python 草稿尚未保存，页面不会把它当成已保存进度。');
      return;
    }
    pendingDraftRef.current = null;
    clearRecovery();
    setMessage('新的 Python 草稿已保存；旧的循环结果已失效。');
    finish();
  };

  const replay = async () => {
    if (!formalCompleted || locked || operation !== 'idle' || runActiveRef.current) return;
    runActiveRef.current = true;
    const generation = ++revisionRef.current;
    setOperation('run');
    setObservationVisible(false);
    setLock(true, 'playback');
    setMessage('正在用保存的 Python 回放核验正式证明…');
    try {
      const saved = sessionRef.current;
      const mission = context.progress.missions['w5-m1'];
      const prerequisite = context.progress.missionCompletionEvidence['w4-m5'];
      const proof = context.progress.missionCompletionEvidence['w5-m1'];
      const savedWork = context.progress.works['w5-m1-monks-rescue-record'];
      const isIso = (value: unknown): value is string => {
        if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
        const parsedTime = new Date(value);
        return !Number.isNaN(parsedTime.getTime()) && parsedTime.toISOString() === value;
      };
      if (!saved.lastRun?.completed
        || prerequisite?.kind !== 'formal-v3'
        || mission?.status !== 'completed'
        || !Number.isSafeInteger(mission.stars) || mission.stars < 1 || mission.stars > 3
        || !Number.isSafeInteger(mission.attempts) || mission.attempts < 1
        || !Number.isSafeInteger(mission.hintsUsed) || mission.hintsUsed < 0
        || proof?.kind !== 'formal-v3'
        || proof.workId !== 'w5-m1-monks-rescue-record'
        || !savedWork
        || savedWork.kind !== 'python-monks-loop-v1'
        || savedWork.workId !== 'w5-m1-monks-rescue-record'
        || savedWork.missionId !== 'w5-m1'
        || saved.kind !== 'python-monks-loop-v1'
        || saved.failureSnapshot !== null
        || !isIso(mission.completedAt)
        || !isIso(proof.completedAt)
        || !isIso(proof.verifiedAt)
        || !isIso(savedWork.createdAt)
        || !isIso(savedWork.verifiedAt)
        || !isIso(saved.lastRunAt)
        || !isIso(saved.savedAt)
        || proof.completedAt !== mission.completedAt
        || proof.verifiedAt !== savedWork.verifiedAt
        || saved.lastRunAt > saved.savedAt
        || saved.savedAt > savedWork.createdAt
        || mission.completedAt > savedWork.createdAt
        || savedWork.createdAt > savedWork.verifiedAt) throw new Error('formal-record-missing');
      const runtime = runtimeRef.current ?? runtimeFactory();
      runtimeRef.current = runtime;
      await runtime.ready();
      if (!mountedRef.current || generation !== revisionRef.current) return;
      setRuntimeReady(true);
      const worker = await runtime.run(saved.pythonCode);
      if (!mountedRef.current || generation !== revisionRef.current) return;
      const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
      if (!worker.run.completed
        || !same(worker.trace, saved.lastCanonicalTrace)
        || !same(worker.trace, saved.lastWorkerTrace)
        || !same(worker.run, saved.lastRun)
        || proof.pythonCode !== saved.pythonCode
        || !same(proof.canonicalTrace, worker.trace)
        || !same(proof.workerTrace, worker.trace)
        || !same(proof.run, worker.run)
        || savedWork.pythonCode !== proof.pythonCode
        || savedWork.pythonCode !== saved.pythonCode
        || !same(savedWork.canonicalTrace, worker.trace)
        || !same(savedWork.workerTrace, worker.trace)
        || !same(savedWork.run, worker.run)) throw new Error('formal-record-mismatch');
      await revealCompletion({
        stars: mission.stars as 1 | 2 | 3,
        hintsUsed: saved.usedHintTiers.length,
      }, generation, '回放核验完成，正式作品和证明未改动。');
    } catch (error) {
      if (!mountedRef.current || generation !== revisionRef.current) return;
      if (error instanceof WeekFiveMonksRuntimeError && !['validation', 'busy'].includes(error.code)) setRuntimeReady(false);
      setMessage('回放核验暂时不可用，正式作品和证明未改动。');
      finish();
    }
  };

  const run = async () => {
    if (formalCompleted) {
      await replay();
      return;
    }
    if (locked || operation !== 'idle' || runActiveRef.current) return;
    runActiveRef.current = true;
    const generation = ++revisionRef.current;
    setOperation('run');
    setObservationVisible(false);
    setLock(true, 'session-pending');
    setMessage('正在原子保存当前 Python 草稿…');
    const candidate = editorCodeRef.current;
    const draftAttempt = await attemptContextWrite(() => context.saveWeekFiveMonksDraft(candidate));
    if (!mountedRef.current || generation !== revisionRef.current) return;
    if (!draftAttempt.ok) {
      pendingDraftRef.current = candidate;
      recoverRejected({ kind: 'draft', stage: 'draft', code: candidate, message: '运行前 Python 草稿保存异常，本次没有启动 Worker。' });
      return;
    }
    const draftResult = draftAttempt.result;
    const saved = accept(draftResult, generation);
    if (!saved) {
      pendingDraftRef.current = candidate;
      recover('draft', draftResult.status === 'conflict' ? 'conflict' : 'unsaved', 'Python 草稿尚未保存，本次没有启动运行。');
      return;
    }
    setMessage('正在运行刚刚保存的 Python 循环…');
    let parsed;
    try { parsed = parseWeekFiveMonksPython(saved.pythonCode); }
    catch {
      setMessage('保存的 Python 不在本关安全编辑范围内。');
      finish();
      return;
    }
    if ('state' in parsed) {
      const validationAttempt = await attemptContextWrite(() => context.saveWeekFiveMonksValidationFailure());
      if (!mountedRef.current || generation !== revisionRef.current) return;
      if (!validationAttempt.ok) {
        pendingInfrastructureRef.current = { validation: true, executionStarted: false };
        recoverRejected({ kind: 'validation', stage: 'infrastructure', message: '结构失败保存异常，当前原文仍保留。' });
        return;
      }
      const validationResult = validationAttempt.result;
      const validation = accept(validationResult, generation);
      if (!validation) {
        pendingInfrastructureRef.current = { validation: true, executionStarted: false };
        recover('infrastructure', validationResult.status === 'conflict' ? 'conflict' : 'unsaved', 'Python 结构或缩进未通过，但失败状态尚未保存。');
        return;
      }
      pendingInfrastructureRef.current = null;
      clearRecovery();
      if (parsed.line >= 3) editorRef.current?.focusAction();
      else editorRef.current?.focusConnector();
      setMessage('Python 结构或缩进未通过；结构失败和当前原文已保存。');
      finish();
      return;
    }
    try {
      const runtime = runtimeRef.current ?? runtimeFactory();
      runtimeRef.current = runtime;
      await runtime.ready();
      if (!mountedRef.current || generation !== revisionRef.current) return;
      setRuntimeReady(true);
      const worker = await runtime.run(saved.pythonCode);
      if (!mountedRef.current || generation !== revisionRef.current) return;
      const input: BranchRunInput = {
        canonicalTrace: parsed.trace,
        workerTrace: worker.trace,
        run: worker.run,
      };
      const runAttempt = await attemptContextWrite(() => context.saveWeekFiveMonksRun(input));
      if (!mountedRef.current || generation !== revisionRef.current) return;
      if (!runAttempt.ok) {
        pendingRunRef.current = input;
        recoverRejected({ kind: 'run', stage: 'run', input, message: '解困运行结果保存异常，场景没有发布这次结果。' });
        return;
      }
      const runResult = runAttempt.result;
      const savedRun = accept(runResult, generation);
      if (!savedRun) {
        pendingRunRef.current = input;
        recover('run', runResult.status === 'conflict' ? 'conflict' : 'unsaved', '解困运行结果尚未保存，当前场景不会把它当作事实。');
        return;
      }
      pendingRunRef.current = null;
      clearRecovery();
      if (savedRun.lastRun?.completed) {
        if (!assetsReadyRef.current) {
          setMessage('循环已证明，等待场景资源就绪后再封存作品与证明。');
          finish();
          return;
        }
        await completeSolved();
        return;
      }
      setMessage(feedbackFor(savedRun.lastRun!));
      finish();
    } catch (error) {
      if (!mountedRef.current || generation !== revisionRef.current) return;
      const runtimeError = error instanceof WeekFiveMonksRuntimeError ? error : null;
      if (runtimeError?.code === 'cancelled') return;
      if (runtimeError?.code === 'busy') {
        setMessage('Python 运行环境正在执行，请等当前运行结束。');
        finish();
        return;
      }
      setRuntimeReady(false);
      const executionStarted = runtimeError?.code === 'timeout';
      const infrastructureInput = { executionStarted };
      const infrastructureAttempt = await attemptContextWrite(() => context.saveWeekFiveMonksInfrastructureFailure(infrastructureInput));
      if (!mountedRef.current || generation !== revisionRef.current) return;
      if (!infrastructureAttempt.ok) {
        pendingInfrastructureRef.current = { validation: false, executionStarted };
        recoverRejected({ kind: 'infrastructure', stage: 'infrastructure', input: infrastructureInput, message: '运行环境故障保存异常；这不是学习错误。' });
        return;
      }
      const infrastructureResult = infrastructureAttempt.result;
      const infrastructure = accept(infrastructureResult, generation);
      if (!infrastructure) {
        pendingInfrastructureRef.current = { validation: false, executionStarted };
        recover('infrastructure', infrastructureResult.status === 'conflict' ? 'conflict' : 'unsaved', 'Python 运行环境故障尚未保存；这不是学习错误。');
        return;
      }
      pendingInfrastructureRef.current = null;
      clearRecovery();
      setMessage('Python 运行环境故障已保存；这不是学习错误，可以重新运行。');
      finish();
    }
  };

  const observe = async () => {
    if (operation !== 'idle' || !sessionRef.current.failureSnapshot) return;
    setOperation('observation');
    setLock(true, 'session-pending');
    const generation = revisionRef.current;
    const observationAttempt = await attemptContextWrite(() => context.saveWeekFiveMonksObservation());
    if (!mountedRef.current || generation !== revisionRef.current) return;
    if (!observationAttempt.ok) {
      recoverRejected({ kind: 'observation', stage: 'observation', message: '火眼金睛观察保存异常，暂不展示观察内容。' });
      return;
    }
    const observationResult = observationAttempt.result;
    const result = accept(observationResult, generation);
    if (!result) {
      recover('observation', observationResult.status === 'conflict' ? 'conflict' : 'unsaved', '火眼金睛观察尚未保存。');
      return;
    }
    clearRecovery();
    setObservationVisible(true);
    setMessage('火眼金睛只展示已保存的实际记录。');
    finish();
  };

  const retryRejectedWrite = (request: RejectedWrite): Promise<WriteAttempt> => {
    if (request.kind === 'draft') return attemptContextWrite(() => context.saveWeekFiveMonksDraft(request.code));
    if (request.kind === 'run') return attemptContextWrite(() => context.saveWeekFiveMonksRun(request.input));
    if (request.kind === 'validation') return attemptContextWrite(() => context.saveWeekFiveMonksValidationFailure());
    if (request.kind === 'infrastructure') return attemptContextWrite(() => context.saveWeekFiveMonksInfrastructureFailure(request.input));
    if (request.kind === 'observation') return attemptContextWrite(() => context.saveWeekFiveMonksObservation());
    if (request.kind === 'completion') return attemptContextWrite(() => context.completeWeekFiveMonks(request.input));
    return attemptContextWrite(() => context.retrySave());
  };

  const retry = async () => {
    if (!pending || retryActiveRef.current || recoveryStatus === 'conflict') return;
    const stage = pending;
    const generation = revisionRef.current;
    retryActiveRef.current = true;
    setRetrying(true);
    setOperation(stage === 'completion' ? 'completion' : 'draft-save');
    setLock(true, 'session-pending');
    try {
      const rejected = rejectedWriteRef.current;
      const attempt = rejected
        ? await retryRejectedWrite(rejected)
        : await attemptContextWrite(() => context.retrySave());
      if (!mountedRef.current || generation !== revisionRef.current) return;
      if (!attempt.ok) {
        if (!rejected || rejected.kind === 'retry') {
          rejectedWriteRef.current = { kind: 'retry', stage, message: '重试保存异常，恢复操作仍可再试。' };
        }
        recover(stage, 'unsaved', rejectedWriteRef.current?.message ?? '重试保存异常。');
        return;
      }
      rejectedWriteRef.current = null;
      const result = attempt.result;
      if (result.status !== 'saved') {
        recover(stage, result.status === 'conflict' ? 'conflict' : 'unsaved', '本次记录仍未保存，请再试一次。');
        return;
      }
      if (stage === 'completion') {
        await finishFormalCompletion(result, generation);
        return;
      }
      const saved = accept(result, generation);
      if (!saved) {
        recover(stage, 'unsaved', '重试后仍未找到已保存的循环记录。');
        return;
      }
      clearRecovery();
      if (stage === 'draft') {
        pendingDraftRef.current = null;
        setEditorCode(saved.pythonCode);
        setMessage('Python 草稿已保存。');
        finish();
        return;
      }
      if (stage === 'observation') {
        setObservationVisible(true);
        setMessage('火眼金睛只展示已保存的实际记录。');
        finish();
        return;
      }
      if (stage === 'infrastructure') {
        pendingInfrastructureRef.current = null;
        setMessage('Python 运行状态已保存，可以再次运行。');
        finish();
        return;
      }
      pendingRunRef.current = null;
      if (saved.lastRun?.completed && assetsReadyRef.current) {
        finish();
        await completeSolved();
        return;
      }
      setMessage(saved.lastRun ? feedbackFor(saved.lastRun) : '解困运行结果已保存。');
      finish();
    } finally {
      retryActiveRef.current = false;
      if (mountedRef.current) setRetrying(false);
    }
  };

  const retryReveal = async () => {
    if (!revealRetry || revealActiveRef.current || parentRevealSucceededRef.current) return;
    const generation = revisionRef.current;
    setOperation('completion');
    setLock(true, 'playback');
    setMessage('正在重新显示完成结果…');
    await revealCompletion(revealRetry, generation, '完成结果已重新显示。');
  };

  const downloadBackup = () => {
    const backup = context.createBackup();
    downloadTextFile(backup.filename, backup.contents, backup.mimeType);
  };

  const reloadExternal = () => {
    const external = context.reloadExternalProgress();
    if (!external) return;
    revisionRef.current += 1;
    runtimeRef.current?.cancel();
    runActiveRef.current = false;
    completionActiveRef.current = false;
    retryActiveRef.current = false;
    pendingDraftRef.current = null;
    pendingRunRef.current = null;
    pendingInfrastructureRef.current = null;
    const externalSession = external.sessions['w5-m1'];
    const next = externalSession ?? createMissionSession('w5-m1', new Date().toISOString());
    draftPersistedRef.current = Boolean(externalSession);
    sessionRef.current = next;
    setSession(next);
    setEditorCode(next.pythonCode);
    setObservationVisible(false);
    setFormalCompleted(external.missionCompletionEvidence['w5-m1']?.kind === 'formal-v3');
    clearRecovery();
    if (externalSession) {
      setOperation('idle');
      setMessage('已载入其他标签页保存的循环进度。');
      setLock(false, 'idle');
      return;
    }
    const generation = revisionRef.current;
    setOperation('initial-save');
    setMessage('其他标签页没有本关草稿，正在保存新的默认草稿…');
    setLock(true, 'session-pending');
    void (async () => {
      const attempt = await attemptContextWrite(() => context.saveWeekFiveMonksDraft(next.pythonCode));
      if (!mountedRef.current || generation !== revisionRef.current) return;
      if (!attempt.ok) {
        pendingDraftRef.current = next.pythonCode;
        recoverRejected({ kind: 'draft', stage: 'draft', code: next.pythonCode, message: '新的默认 Python 草稿保存异常。' });
        return;
      }
      const saveResult = attempt.result;
      const saved = accept(saveResult, generation);
      if (!saved) {
        pendingDraftRef.current = next.pythonCode;
        recover('draft', saveResult.status === 'conflict' ? 'conflict' : 'unsaved', '新的默认 Python 草稿尚未保存。');
        return;
      }
      setEditorCode(saved.pythonCode);
      setMessage('新的默认 Python 草稿已保存。');
      finish();
    })();
  };

  useEffect(() => {
    if (session.failureSnapshot && operation === 'idle') feedbackRef.current?.focus();
  }, [session.failureSnapshot, operation, message]);

  const blocked = locked || operation !== 'idle' || pending !== null || context.saveStatus === 'conflict';
  const editorDisabled = formalCompleted || locked || pending !== null || context.saveStatus === 'conflict'
    || (operation !== 'idle' && operation !== 'run' && operation !== 'draft-save');
  const displayCurrent = editorCode === session.pythonCode;
  const sceneState = displayCurrent ? (session.lastRun?.state ?? 'ready') : 'ready';
  void onComplete;
  return (
    <section className="week-five-monks-experience" data-reduced-motion={reducedMotion} data-muted={muted} data-assets-ready={assetsReady}>
      <header>
        <p className="eyebrow">W5-M1 逐人解困</p>
        <h2>逐人解困：每个人都不能漏下</h2>
        <p>调整动作与缩进，让同一个循环为每位僧众完成两步。</p>
      </header>
      <div className="week-five-monks-layout">
        <LazySectionBoundary label="逐人解困场景">
          <Suspense fallback={<p role="status">循环场景加载中…</p>}>
            <Scene state={sceneState} cards={WEEK_FIVE_MONKS_CARDS} events={displayCurrent ? session.lastCanonicalTrace : []} muted={muted} reducedMotion={reducedMotion} showCanonEpilogue={formalCompleted} onAssetsReady={() => {
              assetsReadyRef.current = true;
              setAssetsReady(true);
              setSceneError(null);
              if (sessionRef.current.lastRun?.completed && operation === 'idle') void completeSolved();
            }} onAssetsError={(text) => {
              assetsReadyRef.current = false;
              setAssetsReady(false);
              setSceneError(text);
            }} />
          </Suspense>
        </LazySectionBoundary>

        <LazySectionBoundary label="Python 循环编辑器">
          <Suspense fallback={<p role="status">Python 编辑器加载中…</p>}>
            <Editor key={editorGeneration} ref={editorRef} code={editorCode} disabled={editorDisabled} onCodeChange={(code) => void edit(code)} onReady={() => setEditorError(null)} onError={setEditorError} />
          </Suspense>
        </LazySectionBoundary>
        <section className="week-five-monks-preview-feedback" aria-live="polite">
          <p ref={feedbackRef} tabIndex={-1} role={pending ? 'alert' : 'status'} aria-label="解困运行结果">{message}</p>
          <p role="status" aria-label={runtimeReady ? 'Python 运行环境已准备' : 'Python 运行环境加载中'}>{runtimeReady ? 'Python 运行环境已准备' : 'Python 运行环境加载中'}</p>
          <button type="button" className="button button-primary" disabled={blocked} onClick={() => void run()}>运行解困程序</button>
          {session.failureSnapshot && displayCurrent ? <button type="button" className="button button-ghost" disabled={blocked} onClick={() => void observe()}>火眼金睛：观察实际记录</button> : null}
          {editorError ? <button type="button" className="button button-ghost" onClick={() => { setEditorError(null); setEditorGeneration((value) => value + 1); }}>重试加载 Python 编辑器</button> : null}
          {pending && recoveryStatus !== 'conflict' ? <button type="button" className="button button-primary" disabled={retrying} onClick={() => void retry()}>重试保存</button> : null}
          {revealRetry ? <button type="button" className="button button-primary" disabled={revealActiveRef.current} onClick={() => void retryReveal()}>重新显示完成结果</button> : null}
          {recoveryStatus === 'conflict' || context.saveStatus === 'conflict' ? <>
            <button type="button" className="button button-ghost" onClick={downloadBackup}>下载当前 Python 备份</button>
            <button type="button" className="button button-primary" onClick={reloadExternal}>载入其他标签页进度</button>
          </> : null}
          {sceneError ? <p role="alert">{sceneError}</p> : null}
        </section>
      </div>
      {observationVisible && session.failureSnapshot ? <aside role="status" aria-label="已保存的实际记录">
        <h3>火眼金睛：已保存的实际记录</h3>
        <p>当前失败事实：{session.failureSnapshot.actualActions.length === 0 ? '没有项目' : session.failureSnapshot.actualActions.join('、')}。</p>
      </aside> : null}
      <p>学习中的失败不会扣除生命、资源或星级。</p>
    </section>
  );
}

export default WeekFiveMonksExperience;
