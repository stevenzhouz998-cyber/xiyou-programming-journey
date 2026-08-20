import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import './AdvancedWeekOneExperience.css'
import { runAdvancedWeekOne, type AdvancedWeekOneDiagnostic, type AdvancedWeekOneEvent, type AdvancedWeekOneRunResult } from '../battle/advancedWeekOne'
import type { AdvancedWeekOneCompileResult } from '../blockly/advancedWeekOneCompiler'
import type { AdvancedWeekOneMissionId } from '../blockly/advancedWeekOneContract'
import { useProgress } from '../context/ProgressContext'
import { createMissionSession, recordCompileFailure, recordRun, updateWorkspaceDraft } from '../progress/session'
import { recordEquipmentEffectUse } from '../progress/equipmentEffectSession'
import type { AdvancedWeekOneMissionSession } from '../progress/types'
import type { EquipmentEffect } from '../progress/equipment'
import { activeEquipmentEffects } from '../progress/equipmentPresentation'
import { downloadTextFile } from '../utils/download'

const Workspace = lazy(() => import('./AdvancedWeekOneBlocklyWorkspace').then((module) => ({ default: module.AdvancedWeekOneBlocklyWorkspace })))
const Scene = lazy(() => import('./AdvancedWeekOneScene').then((module) => ({ default: module.AdvancedWeekOneScene })))

export type AdvancedWeekOneInteractionLockReason = 'idle' | 'playback' | 'session-pending' | 'session-recovery'
export interface AdvancedWeekOneExperienceProps {
  missionId: AdvancedWeekOneMissionId
  reducedMotion: boolean
  muted: boolean
  locked?: boolean
  onComplete: (evidence: { stars: 1 | 2 | 3; hintsUsed: number }) => void | boolean | Promise<boolean>
  onSessionPersistenceActiveChange?: (active: boolean) => void
  onInteractionLockChange?: (locked: boolean, reason: AdvancedWeekOneInteractionLockReason) => void
  reloadPage?: () => void
}

type Recovery = 'none' | 'unsaved' | 'conflict'
function stars(session: AdvancedWeekOneMissionSession): 1 | 2 | 3 { return session.usedHintTiers.length === 0 ? 3 : session.usedHintTiers.length === 1 ? 2 : 1 }
function message(diagnostic: AdvancedWeekOneDiagnostic | null) {
  if (!diagnostic) return ''
  if (diagnostic.concept === 'completeness') return '程序还没有走完，请检查少了哪一步。'
  if (diagnostic.concept === 'container-scope') return '这块积木需要放进对应的任务容器。'
  return '这一顺序暂时不能继续，请从当前状态需要的步骤开始调整。'
}

export function AdvancedWeekOneExperience({ missionId, reducedMotion, muted, locked = false, onComplete, onSessionPersistenceActiveChange, onInteractionLockChange }: AdvancedWeekOneExperienceProps) {
  const { progress, updateMissionSession, retrySave, createBackup, reloadExternalProgress } = useProgress()
  const session = (progress.sessions[missionId] ?? createMissionSession(missionId)) as AdvancedWeekOneMissionSession
  const [events, setEvents] = useState<AdvancedWeekOneEvent[]>(session.lastRun?.events ?? [])
  const [result, setResult] = useState<AdvancedWeekOneRunResult | null>(session.lastRun)
  const [diagnostic, setDiagnostic] = useState<AdvancedWeekOneDiagnostic | null>(session.lastRun?.diagnostic ?? null)
  const [replayToken, setReplayToken] = useState(0)
  const [recovery, setRecovery] = useState<Recovery>('none')
  const [pending, setPending] = useState(false)
  const [eligible, setEligible] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [weightReferenceOpen, setWeightReferenceOpen] = useState(false)
  const [decompositionView, setDecompositionView] = useState(false)
  const [focusBlockId, setFocusBlockId] = useState<string | null>(session.lastRun?.diagnostic?.sourceBlockId ?? null)
  const [problemBlockId, setProblemBlockId] = useState<string | null>(session.lastRun?.diagnostic?.sourceBlockId ?? null)
  const completedRef = useRef(false)
  const effects = useMemo(() => new Set(activeEquipmentEffects(progress.equipment)), [progress.equipment])
  useEffect(() => { void import('#advanced-storage-fault-adapter').then(({ activateAdvancedStorageFaults }) => activateAdvancedStorageFaults()) }, [])
  const setLock = (next: boolean, reason: AdvancedWeekOneInteractionLockReason) => { onSessionPersistenceActiveChange?.(next); onInteractionLockChange?.(next, reason) }
  const lockedNow = locked || pending || recovery !== 'none'
  const persist = async (update: (current: AdvancedWeekOneMissionSession) => AdvancedWeekOneMissionSession) => {
    setPending(true); setLock(true, 'session-pending')
    const saved = await updateMissionSession(missionId, update)
    setPending(false)
    if (saved.status === 'saved') { setLock(false, 'idle'); return true }
    setRecovery(saved.status); setLock(true, 'session-recovery'); return false
  }
  const retry = async () => {
    setPending(true); setRecovery('none'); setLock(true, 'session-pending')
    const saved = await retrySave()
    setPending(false)
    if (saved.status === 'saved') { setLock(false, 'idle'); return }
    setRecovery(saved.status === 'conflict' ? 'conflict' : 'unsaved'); setLock(true, 'session-recovery')
  }
  const run = async (compiled: AdvancedWeekOneCompileResult) => {
    if (lockedNow) return
    if (!compiled.ok) {
      const failure: AdvancedWeekOneDiagnostic = { type: 'program-ended-incomplete', concept: 'completeness', state: missionId === 'w1-m4' ? 'underworld-closed' : 'boss-awaiting-plan', instructionId: null, sourceBlockId: compiled.diagnostics[0]?.sourceBlockId ?? null, parentBlockId: null, opcode: null, messageCode: `advanced-week-one.compile.${compiled.diagnostics[0]?.code ?? 'failed'}` }
      setDiagnostic(failure); setResult(null); setEvents([]); setProblemBlockId(failure.sourceBlockId); setFocusBlockId(failure.sourceBlockId)
      await persist((current) => recordCompileFailure(current, 'program-structure', new Date().toISOString()))
      return
    }
    const next = runAdvancedWeekOne(missionId, compiled.trace)
    const saved = await persist((current) => recordRun(current, next, compiled.trace, new Date().toISOString()))
    if (saved) {
      setResult(next); setDiagnostic(next.diagnostic); setEligible(next.completed); setEvents(next.events); setProblemBlockId(next.diagnostic?.sourceBlockId ?? null); setFocusBlockId(next.diagnostic?.sourceBlockId ?? null)
      setReplayToken((token) => token + 1); setLock(true, 'playback')
    }
  }
  const finishPlayback = async () => {
    setLock(false, 'idle')
    if (!sceneReady || !eligible || !result?.completed || completedRef.current) return
    completedRef.current = true
    await onComplete({ stars: stars(session), hintsUsed: session.usedHintTiers.length })
  }
  const useEffectAction = async (effect: EquipmentEffect, action: () => void) => {
    if (!effects.has(effect) || lockedNow) return
    const saved = await persist((current) => recordEquipmentEffectUse(current, effect, new Date().toISOString()))
    if (saved) action()
  }
  const rejectedIndex = result?.events.findIndex((event) => event.type === 'instruction-rejected') ?? -1
  const acceptedPrefix = rejectedIndex > 0 ? result!.events.slice(0, rejectedIndex) : []
  const hasAcceptedPrefix = acceptedPrefix.some((event) => event.type === 'instruction-accepted')
  useEffect(() => {
    if (!effects.has('weight-reference')) setWeightReferenceOpen(false)
    if (!effects.has('decomposition-view')) setDecompositionView(false)
  }, [effects])
  const title = missionId === 'w1-m4' ? '幽冥勾名' : '第三回总试炼'
  return <section className="advanced-week-one-experience">
    <Suspense fallback={<p role="status">{title}场景加载中，请稍候……</p>}><Scene missionId={missionId} events={events} replayToken={replayToken} reducedMotion={reducedMotion} muted={muted} onResourceStateChange={setSceneReady} onPlaybackComplete={() => void finishPlayback()} /></Suspense>
    <div className="equipment-effect-tools" aria-label="已装备学习工具">
      {missionId === 'w1-m5' && effects.has('weight-reference') ? <button type="button" disabled={lockedNow} aria-expanded={weightReferenceOpen} onClick={() => weightReferenceOpen ? setWeightReferenceOpen(false) : void useEffectAction('weight-reference', () => setWeightReferenceOpen(true))}>{weightReferenceOpen ? '收起重量资料' : '查看重量资料'}</button> : null}
      {effects.has('decomposition-view') ? <button type="button" disabled={lockedNow} aria-pressed={decompositionView} onClick={() => decompositionView ? setDecompositionView(false) : void useEffectAction('decomposition-view', () => setDecompositionView(true))}>{decompositionView ? '返回普通视图' : '查看任务拆分图'}</button> : null}
      {effects.has('accepted-prefix-playback') && !result?.completed && hasAcceptedPrefix ? <button type="button" disabled={lockedNow} onClick={() => void useEffectAction('accepted-prefix-playback', () => { setEligible(false); setEvents(acceptedPrefix); setReplayToken((token) => token + 1); setLock(true, 'playback') })}>回看已走通步骤</button> : null}
      {effects.has('repeat-problem-navigation') && problemBlockId ? <button type="button" disabled={lockedNow} onClick={() => void useEffectAction('repeat-problem-navigation', () => setFocusBlockId(problemBlockId))}>再次定位问题积木</button> : null}
    </div>
    {weightReferenceOpen ? <section className="equipment-weight-reference" role="region" aria-label="三件兵器重量资料"><p>只提供已学过的事实，选哪块积木由你决定。</p><dl><div><dt>大捍刀</dt><dd>3600斤</dd></div><div><dt>方天画戟</dt><dd>7200斤</dd></div><div><dt>定海神针</dt><dd>13500斤</dd></div></dl></section> : null}
    <Suspense fallback={<p role="status">{title}积木工具加载中，请稍候……</p>}><Workspace missionId={missionId} draft={session.workspace} locked={lockedNow} onRun={(compiled) => void run(compiled)} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} decompositionView={decompositionView} onDraftChange={(draft) => persist((current) => updateWorkspaceDraft(current, draft, new Date().toISOString())).then((saved) => ({ status: saved ? 'saved' : recovery === 'conflict' ? 'conflict' : 'unsaved' }))} /></Suspense>
    {diagnostic ? <div className="battle-feedback" role="alert">{message(diagnostic)}</div> : null}
    <div className="workspace-actions"><button type="button" className="button button-ghost" disabled={lockedNow || !session.lastRun} onClick={() => { setEligible(false); setEvents(session.lastRun?.events ?? []); setReplayToken((token) => token + 1); setLock(true, 'playback') }}>重播最近一次</button></div>
    {recovery !== 'none' ? <div className="unsaved-session" role="alert"><p>{recovery === 'conflict' ? '本次记录与其他标签页冲突。' : '本次学习记录尚未保存，请重试。'}</p>{recovery === 'unsaved' ? <button type="button" onClick={() => void retry()}>重试保存本次记录</button> : <><button type="button" onClick={() => { const backup = createBackup(); downloadTextFile(backup.filename, backup.contents, backup.mimeType) }}>下载本页备份</button><button type="button" onClick={() => { reloadExternalProgress(); setRecovery('none'); setLock(false, 'idle') }}>载入其他标签页版本</button></>}</div> : null}
  </section>
}
