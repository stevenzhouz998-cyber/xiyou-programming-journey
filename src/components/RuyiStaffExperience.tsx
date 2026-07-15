import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { runRuyiStaffBattle } from '../battle/ruyiStaff'
import type { RuyiStaffBattleDiagnostic, RuyiStaffBattleEvent, RuyiStaffBattleRunResult } from '../battle/types'
import type { RuyiCompileResult } from '../blockly/ruyiStaffCompiler'
import type { RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft'
import { useProgress } from '../context/ProgressContext'
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
interface Props {
  reducedMotion: boolean
  muted: boolean
  onComplete: (evidence: Evidence) => void | boolean | Promise<boolean>
  onSessionPersistenceActiveChange?: (active: boolean) => void
  loaders?: RuyiStaffExperienceLoaders
  reloadPage?: () => void
}
interface Playback {
  requestId: number; origin: 'empty' | 'restored' | 'run' | 'replay'; events: RuyiStaffBattleEvent[]; result: RuyiStaffBattleRunResult | null;
  eligible: boolean; evidence: Evidence | null; runAt: string | null; sessionSave: Promise<CoordinatedSaveResult> | null
}
function evidence(tiers: readonly string[]): Evidence { const count = new Set(tiers).size; return { stars: count === 0 ? 3 : count === 1 ? 2 : 1, hintsUsed: count } }
function restored(result: RuyiStaffBattleRunResult | null): Playback {
  const snapshot = result ? structuredClone(result) : null
  return { requestId: 0, origin: snapshot ? 'restored' : 'empty', events: snapshot?.events ?? [], result: snapshot, eligible: false, evidence: null, runAt: null, sessionSave: null }
}
function reloadExperiencePage() { const url = new URL(window.location.href); url.searchParams.set('tool-retry', String(Date.now())); window.location.replace(url.toString()) }
function activateButtonOnEnter(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.key !== 'Enter' || !(event.target instanceof HTMLButtonElement) || event.target.disabled) return
  event.preventDefault()
  event.target.click()
}

export function RuyiStaffExperience({ reducedMotion, muted, onComplete, onSessionPersistenceActiveChange = () => undefined, loaders = defaultLoaders, reloadPage = reloadExperiencePage }: Props) {
  const RuyiStaffScene = useMemo(() => lazy(loaders.scene), [loaders.scene])
  const RuyiStaffBlocklyWorkspace = useMemo(() => lazy(loaders.workspace), [loaders.workspace])
  const { progress, saveStatus, retrySave, updateMissionSession } = useProgress()
  const emptyRef = useRef(createMissionSession(MISSION_ID, '1970-01-01T00:00:00.000Z'))
  const session = progress.sessions[MISSION_ID] ?? emptyRef.current
  const [playback, setPlayback] = useState(() => restored(session.lastRun)); const playbackRef = useRef(playback); const sequenceRef = useRef(0)
  const completedRequestsRef = useRef(new Set<number>()); const finishedPlaybackRef = useRef(new Set<number>()); const checkingSaveRef = useRef(new Set<number>()); const mountedRef = useRef(true)
  const sessionDurableRef = useRef(new Map<number, CoordinatedSaveResult>())
  const completionHandedOffRequestRef = useRef<number | null>(null); const [completionHandedOffRequestId, setCompletionHandedOffRequestId] = useState<number | null>(null)
  const completeRef = useRef(onComplete); const sessionPersistenceRef = useRef(onSessionPersistenceActiveChange); const missionCompletedRef = useRef(Boolean(progress.missions[MISSION_ID]))
  const regionRef = useRef<HTMLDivElement>(null); const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(() => session.lastRun?.diagnostic ?? null)
  const [occurrenceId, setOccurrenceId] = useState(0); const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  completeRef.current = onComplete; sessionPersistenceRef.current = onSessionPersistenceActiveChange; missionCompletedRef.current = Boolean(progress.missions[MISSION_ID])
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; sessionPersistenceRef.current(false) }
  }, [])
  const replace = (next: Playback) => { playbackRef.current = next; setPlayback(next) }
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
    const next: Playback = { requestId: ++sequenceRef.current, origin: 'run', events: snapshot.events, result: snapshot, eligible: result.completed && !missionCompletedRef.current, evidence: result.completed ? evidence(tiers) : null, runAt: now, sessionSave }
    replace(next); setDiagnostic(result.diagnostic); checkSessionSave(next.requestId, sessionSave)
  }
  const maybeReleaseCompletion = (requestId: number) => {
    const current = playbackRef.current
    const saved = sessionDurableRef.current.get(requestId)
    if (!mountedRef.current || !saved || saved.status !== 'saved' || current.requestId !== requestId || current.origin !== 'run' || !current.eligible || current.result?.completed !== true || !current.evidence || !current.runAt || saved.progress.sessions[MISSION_ID]?.lastRunAt !== current.runAt || !finishedPlaybackRef.current.has(requestId) || missionCompletedRef.current || completedRequestsRef.current.has(requestId)) return
    completedRequestsRef.current.add(requestId); completionHandedOffRequestRef.current = requestId; setCompletionHandedOffRequestId(requestId); playbackRef.current = { ...current, eligible: false }
    sessionPersistenceRef.current(false)
    void completeRef.current(current.evidence)
  }
  const recordSessionSave = (requestId: number, saved: CoordinatedSaveResult) => {
    const current = playbackRef.current
    if (!mountedRef.current || completedRequestsRef.current.has(requestId) || current.requestId !== requestId || current.origin !== 'run') return
    if (saved.status === 'conflict') { sessionPersistenceRef.current(false); return }
    if (saved.status !== 'saved' || !current.runAt || saved.progress.sessions[MISSION_ID]?.lastRunAt !== current.runAt) return
    sessionDurableRef.current.set(requestId, saved)
    if (!current.eligible || current.result?.completed !== true) sessionPersistenceRef.current(false)
    maybeReleaseCompletion(requestId)
  }
  const checkSessionSave = (requestId: number, pending: Promise<CoordinatedSaveResult>) => {
    if (checkingSaveRef.current.has(requestId)) return
    checkingSaveRef.current.add(requestId)
    void pending.then((saved) => recordSessionSave(requestId, saved)).finally(() => checkingSaveRef.current.delete(requestId))
  }
  const playbackComplete = (requestId: number) => {
    const current = playbackRef.current
    if (current.requestId !== requestId || current.origin !== 'run' || !current.eligible || current.result?.completed !== true || !current.evidence || missionCompletedRef.current || completedRequestsRef.current.has(requestId)) return
    finishedPlaybackRef.current.add(requestId)
    maybeReleaseCompletion(requestId)
    if (current.sessionSave && !sessionDurableRef.current.has(requestId)) checkSessionSave(requestId, current.sessionSave)
  }
  const replay = () => {
    const result = session.lastRun ?? playbackRef.current.result; if (!result) return; const snapshot = structuredClone(result)
    replace({ requestId: ++sequenceRef.current, origin: 'replay', events: snapshot.events, result: snapshot, eligible: false, evidence: null, runAt: session.lastRunAt, sessionSave: null })
  }
  const retrySessionSave = async () => {
    const current = playbackRef.current
    if (current.origin !== 'run' || current.sessionSave === null || completionHandedOffRequestRef.current === current.requestId) return
    const requestId = current.requestId
    const saved = await retrySave()
    recordSessionSave(requestId, saved)
  }
  const focusWorkspace = () => regionRef.current?.querySelector<HTMLElement>('[aria-label="Blockly 积木编辑区"]')?.focus()
  const sessionRetryActive = playback.origin === 'run' && playback.sessionSave !== null && completionHandedOffRequestId !== playback.requestId
  return <div className="ruyi-staff-experience" onKeyDown={activateButtonOnEnter}>
    <div className="ruyi-staff-scene-region"><ToolErrorBoundary label="定海神针场景" reloadPage={reloadPage}><Suspense fallback={<p role="status">龙宫场景加载中，请稍候……</p>}><RuyiStaffScene events={playback.events} replayToken={playback.requestId} reducedMotion={reducedMotion} muted={muted} onPlaybackComplete={() => playbackComplete(playback.requestId)} /></Suspense></ToolErrorBoundary><div className="dragon-palace-scene-controls"><button type="button" className="button button-ghost" disabled={!session.lastRun && !playback.result} onClick={replay}>重播最近一次</button></div></div>
    <div className="ruyi-staff-program-region" ref={regionRef}><ToolErrorBoundary label="定海神针编程工作台" reloadPage={reloadPage}><Suspense fallback={<p role="status">编程工作台加载中，请稍候……</p>}><RuyiStaffBlocklyWorkspace draft={session.workspace} onDraftChange={saveDraft} onRun={run} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} /></Suspense></ToolErrorBoundary></div>
    <div className="ruyi-staff-feedback-region"><RuyiStaffFeedback diagnostic={diagnostic} occurrenceId={occurrenceId} onFocusBlock={setFocusBlockId} onFocusWorkspace={focusWorkspace} />
      {sessionRetryActive && saveStatus === 'unsaved' ? <div className="unsaved-session" role="status"><p>本关尚未保存，请重试。</p><button type="button" onClick={retrySessionSave}>重试保存本关</button></div> : null}
    </div>
  </div>
}
