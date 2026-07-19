import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { runFourSeasRegalia } from '../battle/fourSeasRegalia'
import type { FourSeasBattleDiagnostic, FourSeasBattleEvent, FourSeasBattleRunResult, FourSeasInstruction } from '../battle/types'
import type { FourSeasCompileResult } from '../blockly/fourSeasRegaliaCompiler'
import type { FourSeasWorkspaceDraftV1 } from '../blockly/fourSeasRegaliaDraft'
import { useProgress } from '../context/ProgressContext'
import type { FourSeasRegaliaMissionSession } from '../progress/types'
import { createMissionSession, recordCompileFailure, recordRun, updateWorkspaceDraft } from '../progress/session'
import type { CoordinatedSaveResult } from '../progress/storageCoordinator'
import { FourSeasRegaliaFeedback } from './FourSeasRegaliaFeedback'
import { ToolErrorBoundary } from './ToolErrorBoundary'

const MISSION_ID = 'w1-m3' as const

export interface FourSeasRegaliaExperienceLoaders {
  scene: () => Promise<{ default: ComponentType<any> }>
  workspace: () => Promise<{ default: ComponentType<any> }>
}

const defaultLoaders: FourSeasRegaliaExperienceLoaders = {
  scene: () => import('./FourSeasRegaliaScene').then((module) => ({ default: module.FourSeasRegaliaScene })),
  workspace: () => import('./FourSeasRegaliaBlocklyWorkspace').then((module) => ({ default: module.FourSeasRegaliaBlocklyWorkspace })),
}

type CompileDiagnostic = Extract<FourSeasCompileResult, { ok: false }>['diagnostics'][number]
type Diagnostic = CompileDiagnostic | FourSeasBattleDiagnostic
interface Evidence { stars: 1 | 2 | 3; hintsUsed: number }
export type FourSeasHintLockReason = 'idle' | 'playback' | 'session-pending' | 'session-recovery'

export interface FourSeasRegaliaExperienceProps {
  reducedMotion: boolean
  muted: boolean
  locked?: boolean
  onComplete: (evidence: Evidence) => void | boolean | Promise<boolean>
  onSessionPersistenceActiveChange?: (active: boolean) => void
  onInteractionLockChange?: (locked: boolean, reason: FourSeasHintLockReason) => void
  loaders?: FourSeasRegaliaExperienceLoaders
  reloadPage?: () => void
}

interface Playback {
  requestId: number
  origin: 'empty' | 'restored' | 'run' | 'replay'
  events: FourSeasBattleEvent[]
  trace: FourSeasInstruction[]
  result: FourSeasBattleRunResult | null
  eligible: boolean
  evidence: Evidence | null
  runAt: string | null
  sessionSave: Promise<CoordinatedSaveResult> | null
  sessionIdentity: string | null
}

interface DurableRunIdentity { requestId: number; identity: string }

function completionEvidence(tiers: readonly string[]): Evidence {
  const count = new Set(tiers).size
  return { stars: count === 0 ? 3 : count === 1 ? 2 : 1, hintsUsed: count }
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, item) => {
    if (item === null || typeof item !== 'object' || Array.isArray(item)) return item
    return Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)))
  })
}

function sessionIdentity(session: FourSeasRegaliaMissionSession): string {
  return stableJson({ lastTrace: session.lastTrace, lastRun: session.lastRun, lastRunAt: session.lastRunAt })
}

function runIdentity(trace: FourSeasInstruction[], result: FourSeasBattleRunResult, runAt: string): string {
  return stableJson({ lastTrace: trace, lastRun: result, lastRunAt: runAt })
}

function restored(session: FourSeasRegaliaMissionSession): Playback {
  const result = session.lastRun ? structuredClone(session.lastRun) : null
  return {
    requestId: 0,
    origin: result ? 'restored' : 'empty',
    events: result?.events ?? [],
    trace: structuredClone(session.lastTrace),
    result,
    eligible: false,
    evidence: null,
    runAt: session.lastRunAt,
    sessionSave: null,
    sessionIdentity: sessionIdentity(session),
  }
}

function reloadExperiencePage() {
  const url = new URL(window.location.href)
  url.searchParams.set('tool-retry', String(Date.now()))
  window.location.replace(url.toString())
}

function activateButtonOnEnter(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== 'Enter' || !(event.target instanceof HTMLButtonElement) || event.target.disabled) return
  event.preventDefault()
  event.target.click()
}

export function FourSeasRegaliaExperience({
  reducedMotion,
  muted,
  locked = false,
  onComplete,
  onSessionPersistenceActiveChange = () => undefined,
  onInteractionLockChange = () => undefined,
  loaders = defaultLoaders,
  reloadPage = reloadExperiencePage,
}: FourSeasRegaliaExperienceProps) {
  const FourSeasRegaliaScene = useMemo(() => lazy(loaders.scene), [loaders.scene])
  const FourSeasRegaliaBlocklyWorkspace = useMemo(() => lazy(loaders.workspace), [loaders.workspace])
  const { progress, saveStatus, retrySave, updateMissionSession } = useProgress()
  const emptyRef = useRef(createMissionSession(MISSION_ID, '1970-01-01T00:00:00.000Z'))
  const session = progress.sessions[MISSION_ID] ?? emptyRef.current
  const [playback, setPlayback] = useState(() => restored(session))
  const playbackRef = useRef(playback)
  const sequenceRef = useRef(0)
  const mountedRef = useRef(true)
  const completionRequestedRef = useRef<number | null>(null)
  const playbackFinishedRef = useRef<number | null>(null)
  const sessionStatusRef = useRef<{ requestId: number; status: 'pending' | 'saved' | 'recovery' } | null>(null)
  const durableRunRef = useRef<DurableRunIdentity | null>(null)
  const checkingSaveRef = useRef(new Set<number>())
  const completionHandedOffRef = useRef<number | null>(null)
  const [completionHandedOffRequest, setCompletionHandedOffRequest] = useState<number | null>(null)
  const completeRef = useRef(onComplete)
  const sessionPersistenceRef = useRef(onSessionPersistenceActiveChange)
  const interactionCallbackRef = useRef(onInteractionLockChange)
  const missionCompletedRef = useRef(Boolean(progress.missions[MISSION_ID]))
  const interactionLockedRef = useRef(false)
  const interactionReasonRef = useRef<FourSeasHintLockReason>('idle')
  const [interactionLocked, setInteractionLockedState] = useState(false)
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(() => session.lastRun?.diagnostic ?? null)
  const [occurrenceId, setOccurrenceId] = useState(0)
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  const [syncTick, setSyncTick] = useState(0)
  const regionRef = useRef<HTMLDivElement>(null)
  const currentSessionIdentity = sessionIdentity(session)
  const syncedSessionIdentityRef = useRef(currentSessionIdentity)

  completeRef.current = onComplete
  sessionPersistenceRef.current = onSessionPersistenceActiveChange
  interactionCallbackRef.current = onInteractionLockChange
  missionCompletedRef.current = Boolean(progress.missions[MISSION_ID])

  const setInteractionLocked = (active: boolean, reason: FourSeasHintLockReason = active ? 'playback' : 'idle') => {
    if (interactionLockedRef.current === active && interactionReasonRef.current === reason) return
    interactionLockedRef.current = active
    interactionReasonRef.current = reason
    setInteractionLockedState(active)
    interactionCallbackRef.current(active, reason)
  }

  const replace = (next: Playback, reason: FourSeasHintLockReason = next.events.length > 0 ? 'playback' : 'idle') => {
    if (playbackRef.current.requestId !== next.requestId) {
      durableRunRef.current = null
      playbackFinishedRef.current = null
      completionRequestedRef.current = null
    }
    playbackRef.current = next
    setPlayback(next)
    setInteractionLocked(next.events.length > 0, reason)
  }

  useEffect(() => {
    mountedRef.current = true
    if (playbackRef.current.events.length > 0) setInteractionLocked(true)
    return () => {
      mountedRef.current = false
      durableRunRef.current = null
      playbackFinishedRef.current = null
      completionRequestedRef.current = null
      sessionPersistenceRef.current(false)
      interactionCallbackRef.current(false, 'idle')
    }
  }, [])

  const wasCompletionLockedRef = useRef(locked)
  useEffect(() => {
    if (wasCompletionLockedRef.current && !locked && sessionStatusRef.current?.status === 'saved') setInteractionLocked(false)
    wasCompletionLockedRef.current = locked
  }, [locked])

  useEffect(() => {
    if (currentSessionIdentity === syncedSessionIdentityRef.current) return
    const current = playbackRef.current
    if (current.origin === 'run' && current.sessionIdentity === currentSessionIdentity) {
      syncedSessionIdentityRef.current = currentSessionIdentity
      return
    }
    if (current.origin === 'run' && checkingSaveRef.current.has(current.requestId)) return
    const next = restored(session)
    next.requestId = ++sequenceRef.current
    syncedSessionIdentityRef.current = currentSessionIdentity
    replace(next)
    setDiagnostic(session.lastRun?.diagnostic ?? null)
    setOccurrenceId((value) => value + 1)
    setFocusBlockId(null)
  }, [currentSessionIdentity, syncTick])

  const invalidateCompletion = () => {
    if (playbackRef.current.eligible) playbackRef.current = { ...playbackRef.current, eligible: false }
  }

  const saveDraft = (draft: FourSeasWorkspaceDraftV1) => {
    invalidateCompletion()
    return updateMissionSession(MISSION_ID, (current) => updateWorkspaceDraft(current, draft, new Date().toISOString()))
  }

  const maybeReleaseCompletion = (requestId: number) => {
    const current = playbackRef.current
    const durable = durableRunRef.current
    if (!mountedRef.current || current.requestId !== requestId || current.origin !== 'run'
      || !current.eligible || current.result?.completed !== true || current.evidence === null
      || current.sessionIdentity === null || durable?.requestId !== requestId
      || durable.identity !== current.sessionIdentity || playbackFinishedRef.current !== requestId
      || missionCompletedRef.current || completionRequestedRef.current === requestId) return
    completionRequestedRef.current = requestId
    completionHandedOffRef.current = requestId
    setCompletionHandedOffRequest(requestId)
    playbackRef.current = { ...current, eligible: false }
    durableRunRef.current = null
    sessionPersistenceRef.current(false)
    void completeRef.current(current.evidence)
  }

  const recordSessionSave = (requestId: number, saved: CoordinatedSaveResult) => {
    const current = playbackRef.current
    if (!mountedRef.current || current.requestId !== requestId || current.origin !== 'run' || completionRequestedRef.current === requestId) return
    if (saved.status !== 'saved') {
      sessionStatusRef.current = { requestId, status: 'recovery' }
      setInteractionLocked(true, 'session-recovery')
      if (saved.status === 'conflict') sessionPersistenceRef.current(false)
      return
    }
    const savedSession = saved.progress.sessions[MISSION_ID]
    if (savedSession === undefined || current.sessionIdentity === null || sessionIdentity(savedSession) !== current.sessionIdentity) return
    sessionStatusRef.current = { requestId, status: 'saved' }
    syncedSessionIdentityRef.current = current.sessionIdentity
    if (current.result?.completed !== true || !current.eligible) {
      durableRunRef.current = null
      sessionPersistenceRef.current(false)
      if (playbackFinishedRef.current === requestId) setInteractionLocked(false)
      return
    }
    durableRunRef.current = { requestId, identity: current.sessionIdentity }
    if (playbackFinishedRef.current !== requestId) setInteractionLocked(true, 'playback')
    maybeReleaseCompletion(requestId)
  }

  const checkSessionSave = (requestId: number, pending: Promise<CoordinatedSaveResult>) => {
    if (checkingSaveRef.current.has(requestId)) return
    checkingSaveRef.current.add(requestId)
    void pending.then((saved) => recordSessionSave(requestId, saved)).finally(() => {
      checkingSaveRef.current.delete(requestId)
      if (mountedRef.current) setSyncTick((value) => value + 1)
    })
  }

  const run = (compiled: FourSeasCompileResult) => {
    setOccurrenceId((value) => value + 1)
    invalidateCompletion()
    if (!compiled.ok) {
      setDiagnostic(compiled.diagnostics[0])
      void updateMissionSession(MISSION_ID, (current) => recordCompileFailure(current, 'program-structure', new Date().toISOString()))
      return
    }
    const result = runFourSeasRegalia(compiled.trace)
    const resultSnapshot = structuredClone(result)
    const traceSnapshot = structuredClone(compiled.trace)
    const now = new Date().toISOString()
    const identity = runIdentity(traceSnapshot, resultSnapshot, now)
    sessionPersistenceRef.current(true)
    const sessionSave = updateMissionSession(MISSION_ID, (current) => recordRun(current, resultSnapshot, traceSnapshot, now))
    const next: Playback = {
      requestId: ++sequenceRef.current,
      origin: 'run',
      events: resultSnapshot.events,
      trace: traceSnapshot,
      result: resultSnapshot,
      eligible: resultSnapshot.completed && !missionCompletedRef.current,
      evidence: resultSnapshot.completed ? completionEvidence(session.usedHintTiers) : null,
      runAt: now,
      sessionSave,
      sessionIdentity: identity,
    }
    sessionStatusRef.current = { requestId: next.requestId, status: 'pending' }
    replace(next, 'session-pending')
    setDiagnostic(resultSnapshot.diagnostic)
    checkSessionSave(next.requestId, sessionSave)
  }

  const playbackComplete = (requestId: number) => {
    const current = playbackRef.current
    if (!mountedRef.current || current.requestId !== requestId) return
    playbackFinishedRef.current = requestId
    if (current.origin !== 'run') { setInteractionLocked(false); return }
    const status = sessionStatusRef.current?.requestId === requestId ? sessionStatusRef.current.status : undefined
    if (status === 'pending') setInteractionLocked(true, 'session-pending')
    if (status === 'recovery') setInteractionLocked(true, 'session-recovery')
    if (current.result?.completed !== true || !current.eligible || current.evidence === null || missionCompletedRef.current) {
      if (status === 'saved' || status === undefined) setInteractionLocked(false)
      return
    }
    maybeReleaseCompletion(requestId)
    if (current.sessionSave && durableRunRef.current?.requestId !== requestId) checkSessionSave(requestId, current.sessionSave)
  }

  const replay = () => {
    const result = session.lastRun ?? playbackRef.current.result
    const trace = session.lastRun ? session.lastTrace : playbackRef.current.trace
    if (result === null) return
    replace({
      requestId: ++sequenceRef.current,
      origin: 'replay',
      events: structuredClone(result.events),
      trace: structuredClone(trace),
      result: structuredClone(result),
      eligible: false,
      evidence: null,
      runAt: session.lastRunAt,
      sessionSave: null,
      sessionIdentity: sessionIdentity(session),
    })
  }

  const retrySessionSave = async () => {
    const current = playbackRef.current
    if (current.origin !== 'run' || current.sessionSave === null || completionHandedOffRef.current === current.requestId) return
    const requestId = current.requestId
    sessionStatusRef.current = { requestId, status: 'pending' }
    setInteractionLocked(true, 'session-pending')
    recordSessionSave(requestId, await retrySave())
  }

  const focusWorkspace = () => regionRef.current?.querySelector<HTMLElement>('[aria-label="Blockly 积木编辑区"]')?.focus()
  const sessionRetryActive = playback.origin === 'run' && playback.sessionSave !== null && completionHandedOffRequest !== playback.requestId

  return <div className="four-seas-regalia-experience" onKeyDown={activateButtonOnEnter}>
    <div className="four-seas-regalia-scene-region">
      <ToolErrorBoundary label="四海披挂场景" reloadPage={reloadPage}>
        <Suspense fallback={<p role="status">四海披挂场景加载中，请稍候……</p>}>
          <FourSeasRegaliaScene events={playback.events} replayToken={playback.requestId} reducedMotion={reducedMotion} muted={muted} onPlaybackComplete={() => playbackComplete(playback.requestId)} />
        </Suspense>
      </ToolErrorBoundary>
      <div className="dragon-palace-scene-controls"><button type="button" className="button button-ghost" disabled={!session.lastRun && !playback.result} onClick={replay}>重播最近一次</button></div>
    </div>
    <div className="four-seas-regalia-program-region" ref={regionRef}>
      <ToolErrorBoundary label="四海披挂编程工作台" reloadPage={reloadPage}>
        <Suspense fallback={<p role="status">四海披挂编程工作台加载中，请稍候……</p>}>
          <FourSeasRegaliaBlocklyWorkspace draft={session.workspace} onDraftChange={saveDraft} onRun={run} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} saveRecoverySuperseded={sessionRetryActive} locked={locked || interactionLocked} />
        </Suspense>
      </ToolErrorBoundary>
    </div>
    <div className="four-seas-regalia-feedback-region">
      <FourSeasRegaliaFeedback diagnostic={diagnostic} occurrenceId={occurrenceId} onFocusBlock={setFocusBlockId} onFocusWorkspace={focusWorkspace} />
      {playback.trace.length > 0 ? <section className="execution-provenance" aria-label="本次执行来源"><details open><summary>本次指令的真实积木来源</summary><ol>{playback.trace.map((instruction) => <li key={instruction.instructionId}><code>{instruction.sourceBlockId}</code> <span>parent={instruction.parentBlockId ?? 'top'}</span></li>)}</ol></details></section> : null}
      {sessionRetryActive && saveStatus === 'unsaved' ? <div className="unsaved-session" role="status"><p>本关尚未保存，请重试。</p><button type="button" onClick={retrySessionSave}>重试保存本关</button></div> : null}
    </div>
  </div>
}
