import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useProgress } from '../context/ProgressContext';
import { parseWeekSixRecordsPython } from '../engine/weekSixRecordsPythonGrammar';
import { createWeekSixRecordsPythonRuntime, WeekSixRecordsRuntimeError, type WeekSixRecordsPythonRuntime } from '../engine/weekSixRecordsPythonRunner';
import { createWeekSixRecordsSession, recordWeekSixRecordsHint, recordWeekSixRecordsInfrastructureFailure, recordWeekSixRecordsObservation, recordWeekSixRecordsRun, recordWeekSixRecordsValidationFailure, updateWeekSixRecordsCode, type WeekSixRecordsMissionSession } from '../progress/weekSixRecordsSession';
import type { WeekSixRecordsRow } from '../engine/weekSixRecordsContract';
import { downloadTextFile } from '../utils/download';
import { LazySectionBoundary } from './LazySectionBoundary';
import type { WeekSixRecordsPythonEditorHandle } from './WeekSixRecordsPythonEditor';
import './WeekSixRecordsExperience.css';
const Scene = lazy(() => import('./WeekSixRecordsScene').then((module) => ({ default: module.WeekSixRecordsScene })));
const Editor = lazy(() => import('./WeekSixRecordsPythonEditor').then((module) => ({ default: module.WeekSixRecordsPythonEditor })));
type LockReason = 'idle' | 'playback' | 'session-pending' | 'session-recovery';
export interface WeekSixRecordsExperienceProps { runtimeFactory?: () => WeekSixRecordsPythonRuntime; reducedMotion: boolean; muted: boolean; locked: boolean; onComplete(input: { stars: number; hintsUsed: number }): Promise<boolean>; onSessionPersistenceActiveChange(active: boolean): void; onInteractionLockChange(active: boolean, reason: LockReason): void }
type RetryAction = () => Promise<void>;
const hintTextFor = (tier: 'observe' | 'think' | 'partial') => tier === 'observe' ? '对照两列的实际结果，先找第一处重复。' : tier === 'think' ? '同一条 record 有两个字段；表格两列要各读一个字段。' : '只定位 record_attempt 的第二个参数，看看方括号里的字段名。';

export function WeekSixRecordsExperience({ runtimeFactory = createWeekSixRecordsPythonRuntime, reducedMotion, muted, locked, onComplete, onSessionPersistenceActiveChange, onInteractionLockChange }: WeekSixRecordsExperienceProps) {
  const context = useProgress(); const initial = context.progress.sessions['w6-m1'] ?? createWeekSixRecordsSession(new Date().toISOString());
  const [session, setSession] = useState(initial); const sessionRef = useRef(initial); const [code, setCode] = useState(initial.pythonCode); const codeRef = useRef(code);
  const [rows, setRows] = useState<WeekSixRecordsRow[]>(initial.lastRun?.rows ?? []); const [message, setMessage] = useState(initial.lastRun?.completed ? '已载入保存的三次借扇事实表。' : '修改代码后运行，表格会显示实际字段读取结果。');
  const [runtimeState, setRuntimeState] = useState<'loading' | 'ready' | 'unavailable'>('loading'); const [busy, setBusy] = useState(false); const [canCancel, setCanCancel] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false); const assetsReadyRef = useRef(false); const [sceneError, setSceneError] = useState<string | null>(null); const [editorError, setEditorError] = useState<string | null>(null);
  const [observation, setObservation] = useState(false); const [hintText, setHintText] = useState(''); const [retryAction, setRetryAction] = useState<RetryAction | null>(null); const [draftSaving, setDraftSaving] = useState(false);
  const runtime = useRef<WeekSixRecordsPythonRuntime | null>(null); const editor = useRef<WeekSixRecordsPythonEditorHandle | null>(null); const mounted = useRef(true); const initialPersistStarted = useRef(false); const pendingCompletion = useRef(false); const recoveryActive = useRef(false); const formal = context.progress.missionCompletionEvidence['w6-m1']?.kind === 'formal-v3';
  const setLock = (active: boolean, reason: LockReason = 'session-pending') => { setBusy(active); onInteractionLockChange(active, active ? reason : 'idle'); onSessionPersistenceActiveChange(active); };
  const releaseLock = () => { recoveryActive.current = false; setLock(false); };
  const holdRecoveryLock = () => { recoveryActive.current = true; setBusy(false); onInteractionLockChange(true, 'session-recovery'); onSessionPersistenceActiveChange(true); };
  const accept = (next: WeekSixRecordsMissionSession) => { sessionRef.current = next; setSession(next); return next; };
  const apply = async (update: (value: WeekSixRecordsMissionSession, now: string) => WeekSixRecordsMissionSession) => { const now = new Date().toISOString(); const result = await context.updateMissionSession('w6-m1', (current) => update(current, now)); if (result.status !== 'saved') throw Error(result.status); return accept(result.progress.sessions['w6-m1']!); };
  const failWrite = (action: RetryAction, text: string) => { setRetryAction(() => action); setMessage(text); holdRecoveryLock(); };
  const retryPendingSave = async (after?: (saved: WeekSixRecordsMissionSession) => void | Promise<void>) => {
    const result = await context.retrySave();
    if (result.status !== 'saved') throw Error(result.status);
    const saved = result.progress.sessions['w6-m1']; if (!saved) throw Error('W6-M1 session missing after retry');
    accept(saved); await after?.(saved);
  };
  const persistDraft = async (draft: string) => { const saved = await apply((current, now) => updateWeekSixRecordsCode(current, draft, now)); setRetryAction(null); if (codeRef.current === draft) setCode(saved.pythonCode); setMessage('草稿已保存在这台电脑。'); };
  const finishSolved = async () => {
    if (!pendingCompletion.current || formal) return;
    const saved = sessionRef.current; const value = { stars: 3 as const, hintsUsed: saved.usedHintTiers.length };
    setMessage('三行字段读取全部对应，正在保存正式事实表。');
    const revealSavedCompletion = async (result: Awaited<ReturnType<typeof context.retrySave>>) => {
      const proof = result.progress.missionCompletionEvidence['w6-m1']; const work = result.progress.works['w6-m1-structured-records-table']; const persisted = result.progress.sessions['w6-m1'];
      if (result.status !== 'saved' || proof?.kind !== 'formal-v3' || !work || !persisted?.lastRun?.completed || proof.workId !== work.workId) throw Error('W6-M1 completion retry invalid');
      pendingCompletion.current = false; accept(persisted); setRetryAction(null);
      const revealed = await onComplete(value); if (!revealed) setMessage('正式事实表和证明已保存，可再次打开完成画面。');
    };
    let result;
    try { result = await context.complete('w6-m1', value); }
    catch { failWrite(async () => { const retried = await context.retrySave(); await revealSavedCompletion(retried); }, '正式事实表和证明尚未保存，请重试。'); return; }
    if (result.status !== 'saved') { failWrite(async () => { const retried = await context.retrySave(); await revealSavedCompletion(retried); }, result.status === 'conflict' ? '其他标签页已有新进度，请先处理冲突。' : '正式事实表和证明尚未保存，请重试。'); return; }
    const proof = result.progress.missionCompletionEvidence['w6-m1']; const work = result.progress.works['w6-m1-structured-records-table']; const persisted = result.progress.sessions['w6-m1'];
    if (proof?.kind !== 'formal-v3' || !work || !persisted?.lastRun?.completed || proof.workId !== work.workId) { failWrite(finishSolved, '正式事实表校验失败，请重试保存。'); return; }
    await revealSavedCompletion(result);
  };

  useEffect(() => { mounted.current = true; let disposed = false; const value = runtimeFactory(); runtime.current = value; void value.ready().then(() => { if (!disposed) setRuntimeState('ready'); }).catch(() => { if (!disposed) setRuntimeState('unavailable'); }); return () => { disposed = true; mounted.current = false; if (runtime.current === value) runtime.current = null; value.dispose(); onInteractionLockChange(false, 'idle'); onSessionPersistenceActiveChange(false); }; }, [runtimeFactory]);
  useEffect(() => { if (formal || context.progress.sessions['w6-m1'] || initialPersistStarted.current) return; initialPersistStarted.current = true; void apply((current) => current).catch(() => failWrite(() => retryPendingSave(), '初始草稿未保存，请重试。')); }, [formal, context.progress.sessions['w6-m1']]);
  useEffect(() => { codeRef.current = code; }, [code]);
  useEffect(() => { const external = context.progress.sessions['w6-m1']; if (external && external.savedAt > sessionRef.current.savedAt) { accept(external); setCode(external.pythonCode); setRows(external.lastRun?.rows ?? []); } }, [context.progress.sessions['w6-m1']]);
  useEffect(() => { if (formal || retryAction || code === sessionRef.current.pythonCode) return; const timer = window.setTimeout(() => { const draft = code; setDraftSaving(true); void persistDraft(draft).then(() => { if (codeRef.current === draft) setMessage('草稿已自动保存在这台电脑。'); }).catch(() => failWrite(() => retryPendingSave((saved) => { if (codeRef.current === draft) setCode(saved.pythonCode); setMessage('草稿已保存在这台电脑。'); }), '草稿未保存，请重试；刷新不会伪装成已保存。')).finally(() => mounted.current && setDraftSaving(false)); }, 350); return () => window.clearTimeout(timer); }, [code, formal, retryAction]);
  const saveInfrastructureFailure = async (executionStarted: boolean) => { try { await apply((current, now) => recordWeekSixRecordsInfrastructureFailure(current, { executionStarted }, now)); } catch { /* global recovery remains visible */ } };
  const saveValidationFailure = async () => { await apply((current, now) => recordWeekSixRecordsValidationFailure(current, now)); setRows([]); setMessage('当前字典、循环或字段读取结构还不能运行。'); };
  const saveExecution = async (parsed: Exclude<ReturnType<typeof parseWeekSixRecordsPython>, { state: 'python-structure-invalid' }>, actual: Awaited<ReturnType<WeekSixRecordsPythonRuntime['run']>>) => {
    pendingCompletion.current = actual.run.completed;
    const saved = await apply((current, now) => recordWeekSixRecordsRun(current, { canonicalTrace: parsed.trace, workerTrace: actual.trace, run: actual.run }, now));
    setRows(saved.lastRun?.rows ?? []); setObservation(false);
    if (!saved.lastRun?.completed) { setMessage(saved.failureSnapshot?.message ?? '本次运行还没有形成完整事实表。'); return; }
    if (!assetsReadyRef.current) { setMessage('字段读取已通过；火焰山场景准备好后会保存正式事实表。'); return; }
    await finishSolved();
  };
  const run = async () => {
    if (busy || locked || retryAction || draftSaving) return; const candidate = codeRef.current;
    if (!formal && candidate !== sessionRef.current.pythonCode) { setLock(true); try { await persistDraft(candidate); } catch { failWrite(() => retryPendingSave((saved) => { if (codeRef.current === candidate) setCode(saved.pythonCode); setMessage('草稿已保存在这台电脑，请再次运行。'); }), '草稿未保存，请重试后再运行。'); return; } releaseLock(); }
    const parsed = parseWeekSixRecordsPython(candidate);
    if ('state' in parsed) { setLock(true); try { await saveValidationFailure(); setMessage(`第 ${parsed.line} 行的字典、循环或字段读取结构还不能运行。`); releaseLock(); } catch { failWrite(() => retryPendingSave(() => { setRows([]); setMessage(`第 ${parsed.line} 行的字典、循环或字段读取结构还不能运行。`); }), '结构错误记录未保存，请重试。'); } return; }
    setLock(true, formal ? 'playback' : 'session-pending'); setCanCancel(true); let executionStarted = false;
    let actual: Awaited<ReturnType<WeekSixRecordsPythonRuntime['run']>>;
    try { actual = await runtime.current!.run(candidate); executionStarted = true; setRuntimeState('ready'); setRows(actual.run.rows); }
    catch (error) { if (error instanceof WeekSixRecordsRuntimeError && error.code === 'cancelled') setMessage('本次运行已取消；迟到结果不会保存。'); else { executionStarted = error instanceof WeekSixRecordsRuntimeError && ['timeout', 'worker-error', 'worker-contract-mismatch'].includes(error.code); if (!formal) await saveInfrastructureFailure(executionStarted); setRuntimeState('unavailable'); setMessage('Python 运行环境暂不可用，本次没有生成成功证明。'); } if (mounted.current) { setCanCancel(false); releaseLock(); } return; }
    try {
      if (formal) { setMessage('已用保存的可见代码真实重播事实表；正式证明没有被改写。'); return; }
      await saveExecution(parsed, actual);
    } catch { failWrite(() => retryPendingSave(async (saved) => { setRows(saved.lastRun?.rows ?? []); setObservation(false); if (saved.lastRun?.completed) { if (assetsReadyRef.current) await finishSolved(); else setMessage('字段读取已通过；火焰山场景准备好后会保存正式事实表。'); } else setMessage(saved.failureSnapshot?.message ?? '本次运行还没有形成完整事实表。'); }), '本次真实运行已完成，但结果尚未保存；请重试保存。'); }
    finally { if (mounted.current) { setCanCancel(false); if (!recoveryActive.current) releaseLock(); } }
  };
  const observe = async () => { if (!sessionRef.current.failureSnapshot) return; setLock(true); try { await apply((current, now) => recordWeekSixRecordsObservation(current, now)); setObservation(true); setMessage('火眼金睛只展示已保存的实际表格。'); releaseLock(); } catch { failWrite(() => retryPendingSave(() => { setObservation(true); setMessage('火眼金睛只展示已保存的实际表格。'); }), '观察记录未保存，请重试。'); } };
  const showHint = async (tier: 'observe' | 'think' | 'partial') => { setLock(true); try { await apply((current, now) => recordWeekSixRecordsHint(current, tier, now)); setHintText(hintTextFor(tier)); setMessage('提示已保存。'); releaseLock(); } catch { failWrite(() => retryPendingSave(() => { setHintText(hintTextFor(tier)); setMessage('提示已保存。'); }), '提示未保存，暂不展示。'); } };
  const retry = async () => { if (!retryAction) return; setLock(true, 'session-recovery'); try { await retryAction(); setRetryAction(null); releaseLock(); } catch { setMessage('仍未保存，请稍后再试。'); holdRecoveryLock(); } };
  const reloadExternal = () => { const external = context.reloadExternalProgress(); if (!external) return; const next = external.sessions['w6-m1'] ?? createWeekSixRecordsSession(new Date().toISOString()); accept(next); setCode(next.pythonCode); setRows(next.lastRun?.rows ?? []); setRetryAction(null); releaseLock(); setMessage('已载入其他标签页保存的字典记录。'); };
  const disabled = locked || busy || draftSaving || !!retryAction || context.saveStatus === 'conflict';
  return <section className="week-six-records-experience" data-mission="w6-m1" data-reduced-motion={reducedMotion} data-muted={muted} data-assets-ready={assetsReady}>
    <header><p className="eyebrow">W6-M1 三次借扇记录</p><h2>让每条记录按字段生成事实表</h2><p>字典把“第几调”和“经过”放在同一条记录里；循环逐条读取，表格只呈现这次 Python 的实际结果。</p></header>
    <div className="week-six-records-layout">
      <LazySectionBoundary label="火焰山事实现场"><Suspense fallback={<p role="status">火焰山场景加载中…</p>}><Scene rows={rows} onAssetsReady={() => { assetsReadyRef.current = true; setAssetsReady(true); setSceneError(null); void finishSolved(); }} onAssetsError={(text) => { assetsReadyRef.current = false; setAssetsReady(false); setSceneError(text); }} /></Suspense></LazySectionBoundary>
      <LazySectionBoundary label="Python 字典编辑器"><Suspense fallback={<p role="status">Python 字典编辑器加载中…</p>}><Editor ref={editor} code={code} disabled={formal || disabled} onCodeChange={setCode} onReady={() => setEditorError(null)} onError={setEditorError} /></Suspense></LazySectionBoundary>
      <section className="week-six-records-feedback" data-state={retryAction ? 'unsaved' : context.saveStatus} aria-live="polite"><p role={retryAction ? 'alert' : 'status'} aria-label="字典记录运行结果">{message}</p><p role="status" aria-label={runtimeState === 'ready' ? 'Python 运行环境已准备' : runtimeState === 'loading' ? 'Python 运行环境正在准备' : 'Python 运行环境暂不可用'}>{runtimeState === 'ready' ? 'Python 运行环境已准备' : runtimeState === 'loading' ? 'Python 运行环境正在准备' : 'Python 运行环境暂不可用，可再次运行重试'}</p><button type="button" className="button button-primary" disabled={disabled} onClick={() => void run()}>{formal ? '重播已保存事实表' : '运行字段读取代码'}</button>{canCancel ? <button type="button" className="button button-ghost" onClick={() => runtime.current?.cancel()}>取消本次运行</button> : null}{session.failureSnapshot && !formal ? <button type="button" className="button button-ghost" disabled={disabled} onClick={() => void observe()}>火眼金睛：观察实际表格</button> : null}
        {!formal ? <div aria-label="字典分层提示"><button type="button" className="button button-ghost" disabled={disabled} onClick={() => void showHint('observe')}>提示一：先观察</button><button type="button" className="button button-ghost" disabled={disabled} onClick={() => void showHint('think')}>提示二：想字段</button><button type="button" className="button button-ghost" disabled={disabled} onClick={() => void showHint('partial')}>提示三：看一部分</button>{hintText ? <p role="note">{hintText}</p> : null}</div> : null}{retryAction ? <button type="button" className="button button-primary" disabled={busy} onClick={() => void retry()}>重试保存</button> : null}{context.saveStatus === 'conflict' ? <><button type="button" className="button button-ghost" onClick={() => { const backup = context.createBackup(); downloadTextFile(backup.filename, backup.contents, backup.mimeType); }}>下载当前字典备份</button><button type="button" className="button button-primary" onClick={reloadExternal}>载入其他标签页进度</button></> : null}{editorError ? <p role="alert">Python 编辑器加载失败：{editorError}</p> : null}{sceneError ? <p role="alert">{sceneError}</p> : null}</section>
    </div>{observation && session.failureSnapshot ? <aside className="week-six-records-observation" role="status" aria-label="已保存的字典实际执行"><h3>火眼金睛：当前记录表</h3><p>{session.failureSnapshot.message} 表中实际产生：{session.lastRun?.rows.map((row) => `${row.attempt}｜${row.story}`).join('；')}。</p><button type="button" className="button button-ghost" onClick={() => editor.current?.focusLine(session.failureSnapshot?.sourceSpans[0]?.line ?? 1)}>回到出错的字段读取</button></aside> : null}<p>学习中的失败不会扣除生命、资源或星级。</p>
  </section>;
}
export default WeekSixRecordsExperience;
