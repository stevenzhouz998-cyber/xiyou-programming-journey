import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { runRuyiStaffBattle } from '../battle/ruyiStaff'
import type { RuyiStaffBattleDiagnostic, RuyiStaffBattleEvent, RuyiStaffBattleRunResult, RuyiStaffInstruction } from '../battle/types'
import type { RuyiCompileResult } from '../blockly/ruyiStaffCompiler'
import type { RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft'
import { useProgress } from '../context/ProgressContext'
import type { RuyiStaffMissionSession } from '../progress/progress'
import { createMissionSession, recordCompileFailure, recordRun, updateWorkspaceDraft } from '../progress/session'
import type { CoordinatedSaveResult } from '../progress/storageCoordinator'
import { ToolErrorBoundary } from './ToolErrorBoundary'
import { RuyiStaffFeedback } from './RuyiStaffFeedback'

export interface RuyiStaffExperienceLoaders {
  scene: () => Promise<{ default: ComponentType<any> }>
  workspace: () => Promise<{ default: ComponentType<any> }>
}
const defaultLoaders: RuyiStaffExperienceLoaders = {
  scene: () => import('./RuyiStaffScene').then((module) => ({ default: module.RuyiStaffScene })),
  workspace: () => import('./RuyiStaffBlocklyWorkspace').then((module) => ({ default: module.RuyiStaffBlocklyWorkspace })),
}
const MISSION_ID = 'w1-m2' as const
type CompileDiagnostic = Extract<RuyiCompileResult, { ok: false }>['diagnostics'][number]
type Diagnostic = CompileDiagnostic | RuyiStaffBattleDiagnostic
interface Evidence { stars: 1 | 2 | 3; hintsUsed: number }
export type RuyiHintLockReason = 'idle' | 'playback' | 'session-pending' | 'session-recovery'
interface Props {
  reducedMotion: boolean
  muted: boolean
  locked?: boolean
  onComplete: (evidence: Evidence) => void | boolean | Promise<boolean>
  onSessionPersistenceActiveChange?: (active: boolean) => void
  onInteractionLockChange?: (locked: boolean, reason: RuyiHintLockReason) => void
  loaders?: RuyiStaffExperienceLoaders
  reloadPage?: () => void
}
interface Playback {
  requestId: number; origin: 'empty' | 'restored' | 'run' | 'replay'; events: RuyiStaffBattleEvent[]; result: RuyiStaffBattleRunResult | null;
  eligible: boolean; evidence: Evidence | null; runAt: string | null; sessionSave: Promise<CoordinatedSaveResult> | null; sessionIdentity: string | null
}
interface DurableRunIdentity { requestId: number; runAt: string }
function evidence(tiers: readonly string[]): Evidence { const count = new Set(tiers).size; return { stars: count === 0 ? 3 : count === 1 ? 2 : 1, hintsUsed: count } }
function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return item
    return Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)))
  })
}
function sessionIdentity(session: RuyiStaffMissionSession): string {
  return stableJson({ lastTrace: session.lastTrace, lastRun: session.lastRun, lastRunAt: session.lastRunAt })
}
function runIdentity(trace: RuyiStaffInstruction[], result: RuyiStaffBattleRunResult, runAt: string): string {
  return stableJson({ lastTrace: trace, lastRun: result, lastRunAt: runAt })
}
function restored(session: RuyiStaffMissionSession): Playback {
  const snapshot = session.lastRun ? structuredClone(session.lastRun) : null
  return { requestId: 0, origin: snapshot ? 'restored' : 'empty', events: snapshot?.events ?? [], result: snapshot, eligible: false, evidence: null, runAt: session.lastRunAt, sessionSave: null, sessionIdentity: sessionIdentity(session) }
}
function reloadExperiencePage() { const url = new URL(window.location.href); url.searchParams.set('tool-retry', String(Date.now())); window.location.replace(url.toString()) }
function activateButtonOnEnter(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== 'Enter' || !(event.target instanceof HTMLButtonElement) || event.target.disabled) return
  event.preventDefault()
  event.target.click()
}

export function RuyiStaffExperience({ reducedMotion, muted, locked = false, onComplete, onSessionPersistenceActiveChange = () => undefined, onInteractionLockChange = () => undefined, loaders = defaultLoaders, reloadPage = reloadExperiencePage }: Props) {
  const RuyiStaffScene = useMemo(() => lazy(loaders.scene), [loaders.scene])
  const RuyiStaffBlocklyWorkspace = useMemo(() => lazy(loaders.workspace), [loaders.workspace])
  const { progress, saveStatus, retrySave, updateMissionSession } = useProgress()
  const emptyRef = useRef(createMissionSession(MISSION_ID, '1970-01-01T00:00:00.000Z'))
  const session = progress.sessions[MISSION_ID] ?? emptyRef.current
  const [playback, setPlayback] = useState(() => restored(session)); const playbackRef = useRef(playback); const sequenceRef = useRef(0)
  const completedRequestRef = useRef<number | null>(null); const finishedPlaybackRequestRef = useRef<number | null>(null); const checkingSaveRef = useRef(new Set<number>()); const mountedRef = useRef(true)
  const durableRunRef = useRef<DurableRunIdentity | null>(null)
  const completionHandedOffRequestRef = useRef<number | null>(null); const [completionHandedOffRequestId, setCompletionHandedOffRequestId] = useState<number | null>(null)
  const completeRef = useRef(onComplete); const sessionPersistenceRef = useRef(onSessionPersistenceActiveChange); const missionCompletedRef = useRef(Boolean(progress.missions[MISSION_ID]))
  const interactionLockCallbackRef = useRef(onInteractionLockChange); const interactionLockedRef = useRef(false); const interactionLockReasonRef = useRef<RuyiHintLockReason>('idle')
  const sessionLockStatusRef = useRef<{ requestId: number; status: 'pending' | 'saved' | 'recovery' } | null>(null); const playbackFinishedRequestRef = useRef<number | null>(null)
  const regionRef = useRef<HTMLDivElement>(null); const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(() => session.lastRun?.diagnostic ?? null)
  const [interactionLocked, setInteractionLockedState] = useState(false)
  const [occurrenceId, setOccurrenceId] = useState(0); const [focusBlockId, setFocusBlockId] = useState<string | null>(null); const [sessionSyncTick, setSessionSyncTick] = useState(0)
  const currentSessionIdentity = sessionIdentity(session); const syncedSessionIdentityRef = useRef(currentSessionIdentity)
  completeRef.current = onComplete; sessionPersistenceRef.current = onSessionPersistenceActiveChange; interactionLockCallbackRef.current = onInteractionLockChange; missionCompletedRef.current = Boolean(progress.missions[MISSION_ID])
  const setInteractionLocked = (active: boolean, reason: RuyiHintLockReason = active ? 'playback' : 'idle') => {
    if (interactionLockedRef.current === active && interactionLockReasonRef.current === reason) return
    interactionLockedRef.current = active
    interactionLockReasonRef.current = reason
    if (mountedRef.current) setInteractionLockedState(active)
    interactionLockCallbackRef.current(active, reason)
  }
  useEffect(() => {
    mountedRef.current = true
    if (playbackRef.current.events.length > 0) setInteractionLocked(true)
    return () => { mountedRef.current = false; durableRunRef.current = null; finishedPlaybackRequestRef.current = null; completedRequestRef.current = null; sessionPersistenceRef.current(false); setInteractionLocked(false) }
  }, [])
  const wasCompletionLockedRef = useRef(locked)
  useEffect(() => {
    if (wasCompletionLockedRef.current && !locked) setInteractionLocked(false)
    wasCompletionLockedRef.current = locked
  }, [locked])
  const replace = (next: Playback, lockReason: RuyiHintLockReason = next.events.length > 0 ? 'playback' : 'idle') => {
    if (playbackRef.current.requestId !== next.requestId) {
      durableRunRef.current = null
      finishedPlaybackRequestRef.current = null
      playbackFinishedRequestRef.current = null
      completedRequestRef.current = null
    }
    playbackRef.current = next; setPlayback(next); setInteractionLocked(next.events.length > 0, lockReason)
  }
  useEffect(() => {
    if (currentSessionIdentity === syncedSessionIdentityRef.current) return
    const current = playbackRef.current
    if (current.origin === 'run' && current.sessionIdentity === currentSessionIdentity) {
      syncedSessionIdentityRef.current = currentSessionIdentity
      return
    }
    if (current.origin === 'run' && checkingSaveRef.current.has(current.requestId)) return
    const next = restored(session); next.requestId = ++sequenceRef.current
    syncedSessionIdentityRef.current = currentSessionIdentity
    replace(next); setDiagnostic(session.lastRun?.diagnostic ?? null); setOccurrenceId((value) => value + 1); setFocusBlockId(null)
  }, [currentSessionIdentity, sessionSyncTick])
  const invalidate = () => { if (playbackRef.current.eligible) playbackRef.current = { ...playbackRef.current, eligible: false } }
  const saveDraft = (draft: RuyiWorkspaceDraftV1) => updateMissionSession(MISSION_ID, (current) => updateWorkspaceDraft(current, draft, new Date().toISOString()))
  const run = (compiled: RuyiCompileResult) => {
    setOccurrenceId((value) => value + 1); invalidate()
    if (!compiled.ok) {
      const primary = compiled.diagnostics[0]; setDiagnostic(primary)
      updateMissionSession(MISSION_ID, (current) => recordCompileFailure(current, 'program-structure', new Date().toISOString()))
      return
    }
    const result = runRuyiStaffBattle(compiled.trace); const snapshot = structuredClone(result); const now = new Date().toISOString(); const tiers = [...session.usedHintTiers]
    sessionPersistenceRef.current(true)
    const sessionSave = updateMissionSession(MISSION_ID, (current) => recordRun(current, result, compiled.trace, now))
    const next: Playback = { requestId: ++sequenceRef.current, origin: 'run', events: snapshot.events, result: snapshot, eligible: result.completed && !missionCompletedRef.current, evidence: result.completed ? evidence(tiers) : null, runAt: now, sessionSave, sessionIdentity: runIdentity(compiled.trace, result, now) }
    sessionLockStatusRef.current = { requestId: next.requestId, status: 'pending' }
    replace(next, 'session-pending'); setDiagnostic(result.diagnostic); checkSessionSave(next.requestId, sessionSave)
  }
  const maybeReleaseCompletion = (requestId: number) => {
    const current = playbackRef.current
    const durable = durableRunRef.current
    if (!mountedRef.current || !durable || durable.requestId !== requestId || current.requestId !== requestId || current.origin !== 'run' || !current.eligible || current.result?.completed !== true || !current.evidence || !current.runAt || durable.runAt !== current.runAt || finishedPlaybackRequestRef.current !== requestId || missionCompletedRef.current || completedRequestRef.current === requestId) return
    completedRequestRef.current = requestId; durableRunRef.current = null; finishedPlaybackRequestRef.current = null; completionHandedOffRequestRef.current = requestId; setCompletionHandedOffRequestId(requestId); playbackRef.current = { ...current, eligible: false }
    sessionPersistenceRef.current(false)
    void completeRef.current(current.evidence)
  }
  const recordSessionSave = (requestId: number, saved: CoordinatedSaveResult) => {
    const current = playbackRef.current
    if (!mountedRef.current || completedRequestRef.current === requestId || current.requestId !== requestId || current.origin !== 'run') return
    if (saved.status !== 'saved') {
      sessionLockStatusRef.current = { requestId, status: 'recovery' }
      setInteractionLocked(true, 'session-recovery')
      if (saved.status === 'conflict') sessionPersistenceRef.current(false)
      return
    }
    if (!current.runAt || saved.progress.sessions[MISSION_ID]?.lastRunAt !== current.runAt) return
    sessionLockStatusRef.current = { requestId, status: 'saved' }
    if (playbackFinishedRequestRef.current !== requestId) setInteractionLocked(true, 'playback')
    if (!current.eligible || current.result?.completed !== true) {
      if (playbackFinishedRequestRef.current === requestId) setInteractionLocked(false)
      durableRunRef.current = null; sessionPersistenceRef.current(false); return
    }
    durableRunRef.current = { requestId, runAt: current.runAt }
    maybeReleaseCompletion(requestId)
  }
  const checkSessionSave = (requestId: number, pending: Promise<CoordinatedSaveResult>) => {
    if (checkingSaveRef.current.has(requestId)) return
    checkingSaveRef.current.add(requestId)
    void pending.then((saved) => recordSessionSave(requestId, saved)).finally(() => {
      checkingSaveRef.current.delete(requestId)
      if (mountedRef.current) setSessionSyncTick((value) => value + 1)
    })
  }
  const playbackComplete = (requestId: number) => {
    const current = playbackRef.current
    if (current.requestId !== requestId) return
    playbackFinishedRequestRef.current = requestId
    if (current.origin !== 'run') { setInteractionLocked(false); return }
    const sessionStatus = sessionLockStatusRef.current?.requestId === requestId ? sessionLockStatusRef.current.status : undefined
    if (sessionStatus === 'pending') setInteractionLocked(true, 'session-pending')
    if (sessionStatus === 'recovery') setInteractionLocked(true, 'session-recovery')
    if (current.result?.completed !== true) {
      if (sessionStatus === 'saved' || sessionStatus === undefined) setInteractionLocked(false)
      return
    }
    if (!current.eligible || !current.evidence || missionCompletedRef.current || completedRequestRef.current === requestId) {
      if (sessionStatus === 'saved' || sessionStatus === undefined) setInteractionLocked(false)
      return
    }
    finishedPlaybackRequestRef.current = requestId
    maybeReleaseCompletion(requestId)
    if (current.sessionSave && durableRunRef.current?.requestId !== requestId) checkSessionSave(requestId, current.sessionSave)
  }
  const replay = () => {
    const result = session.lastRun ?? playbackRef.current.result; if (!result) return; const snapshot = structuredClone(result)
    replace({ requestId: ++sequenceRef.current, origin: 'replay', events: snapshot.events, result: snapshot, eligible: false, evidence: null, runAt: session.lastRunAt, sessionSave: null, sessionIdentity: sessionIdentity(session) })
  }
  const retrySessionSave = async () => {
    const current = playbackRef.current
    if (current.origin !== 'run' || current.sessionSave === null || completionHandedOffRequestRef.current === current.requestId) return
    const requestId = current.requestId
    sessionLockStatusRef.current = { requestId, status: 'pending' }; setInteractionLocked(true, 'session-pending')
    const saved = await retrySave()
    recordSessionSave(requestId, saved)
  }
  const focusWorkspace = () => regionRef.current?.querySelector<HTMLElement>('[aria-label="Blockly 积木编辑区"]')?.focus()
  const sessionRetryActive = playback.origin === 'run' && playback.sessionSave !== null && completionHandedOffRequestId !== playback.requestId
  return <div className="ruyi-staff-experience" onKeyDown={activateButtonOnEnter}>
    <div className="ruyi-staff-scene-region"><ToolErrorBoundary label="定海神针场景" reloadPage={reloadPage}><Suspense fallback={<p role="status">龙宫场景加载中，请稍候……</p>}><RuyiStaffScene events={playback.events} replayToken={playback.requestId} reducedMotion={reducedMotion} muted={muted} onPlaybackComplete={() => playbackComplete(playback.requestId)} /></Suspense></ToolErrorBoundary><div className="dragon-palace-scene-controls"><button type="button" className="button button-ghost" disabled={interactionLocked || (!session.lastRun && !playback.result)} onClick={replay}>重播最近一次</button></div></div>
    <div className="ruyi-staff-program-region" ref={regionRef}><ToolErrorBoundary label="定海神针编程工作台" reloadPage={reloadPage}><Suspense fallback={<p role="status">编程工作台加载中，请稍候……</p>}><RuyiStaffBlocklyWorkspace draft={session.workspace} onDraftChange={saveDraft} onRun={run} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} saveRecoverySuperseded={sessionRetryActive} locked={locked} /></Suspense></ToolErrorBoundary></div>
    <div className="ruyi-staff-feedback-region"><RuyiStaffFeedback diagnostic={diagnostic} occurrenceId={occurrenceId} onFocusBlock={setFocusBlockId} onFocusWorkspace={focusWorkspace} />
      {sessionRetryActive && saveStatus === 'unsaved' ? <div className="unsaved-session" role="status"><p>本关尚未保存，请重试。</p><button type="button" onClick={retrySessionSave}>重试保存本关</button></div> : null}
    </div>
  </div>
}
