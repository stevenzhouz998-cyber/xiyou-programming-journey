import { lazy, Suspense, useRef, useState } from 'react'
import { runRuyiStaffBattle } from '../battle/ruyiStaff'
import type { RuyiStaffBattleDiagnostic, RuyiStaffBattleEvent, RuyiStaffBattleRunResult } from '../battle/types'
import type { RuyiCompileResult } from '../blockly/ruyiStaffCompiler'
import type { RuyiWorkspaceDraftV1 } from '../blockly/ruyiStaffDraft'
import { useProgress } from '../context/ProgressContext'
import { createMissionSession, recordCompileFailure, recordRun, updateWorkspaceDraft } from '../progress/session'
import { ToolErrorBoundary } from './MissionTools'
import { RuyiStaffFeedback } from './RuyiStaffFeedback'

const RuyiStaffScene = lazy(() => import('./RuyiStaffScene').then((module) => ({ default: module.RuyiStaffScene })))
const RuyiStaffBlocklyWorkspace = lazy(() => import('./RuyiStaffBlocklyWorkspace').then((module) => ({ default: module.RuyiStaffBlocklyWorkspace })))
const MISSION_ID = 'w1-m2' as const
type CompileDiagnostic = Extract<RuyiCompileResult, { ok: false }>['diagnostics'][number]
type Diagnostic = CompileDiagnostic | RuyiStaffBattleDiagnostic
interface Evidence { stars: 1 | 2 | 3; hintsUsed: number }
interface Props { reducedMotion: boolean; muted: boolean; onComplete: (evidence: Evidence) => void }
interface Playback {
  requestId: number; origin: 'empty' | 'restored' | 'run' | 'replay'; events: RuyiStaffBattleEvent[]; result: RuyiStaffBattleRunResult | null;
  eligible: boolean; evidence: Evidence | null
}
function evidence(tiers: readonly string[]): Evidence { const count = new Set(tiers).size; return { stars: count === 0 ? 3 : count === 1 ? 2 : 1, hintsUsed: count } }
function restored(result: RuyiStaffBattleRunResult | null): Playback {
  const snapshot = result ? structuredClone(result) : null
  return { requestId: 0, origin: snapshot ? 'restored' : 'empty', events: snapshot?.events ?? [], result: snapshot, eligible: false, evidence: null }
}

export function RuyiStaffExperience({ reducedMotion, muted, onComplete }: Props) {
  const { progress, saveStatus, retrySave, updateMissionSession } = useProgress()
  const emptyRef = useRef(createMissionSession(MISSION_ID, '1970-01-01T00:00:00.000Z'))
  const session = progress.sessions[MISSION_ID] ?? emptyRef.current
  const [playback, setPlayback] = useState(() => restored(session.lastRun)); const playbackRef = useRef(playback); const sequenceRef = useRef(0)
  const completedRequestsRef = useRef(new Set<number>()); const completeRef = useRef(onComplete); const missionCompletedRef = useRef(Boolean(progress.missions[MISSION_ID]))
  const regionRef = useRef<HTMLDivElement>(null); const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(() => session.lastRun?.diagnostic ?? null)
  const [occurrenceId, setOccurrenceId] = useState(0); const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  completeRef.current = onComplete; missionCompletedRef.current = Boolean(progress.missions[MISSION_ID])
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
    const next: Playback = { requestId: ++sequenceRef.current, origin: 'run', events: snapshot.events, result: snapshot, eligible: result.completed && !missionCompletedRef.current, evidence: result.completed ? evidence(tiers) : null }
    replace(next); updateMissionSession(MISSION_ID, (current) => recordRun(current, result, compiled.trace, now)); setDiagnostic(result.diagnostic)
  }
  const playbackComplete = (requestId: number) => {
    const current = playbackRef.current
    if (current.requestId !== requestId || current.origin !== 'run' || !current.eligible || current.result?.completed !== true || !current.evidence || missionCompletedRef.current || completedRequestsRef.current.has(requestId)) return
    completedRequestsRef.current.add(requestId); playbackRef.current = { ...current, eligible: false }; completeRef.current(current.evidence)
  }
  const replay = () => {
    const result = session.lastRun ?? playbackRef.current.result; if (!result) return; const snapshot = structuredClone(result)
    replace({ requestId: ++sequenceRef.current, origin: 'replay', events: snapshot.events, result: snapshot, eligible: false, evidence: null })
  }
  const focusWorkspace = () => regionRef.current?.querySelector<HTMLElement>('[aria-label="Blockly 积木编辑区"]')?.focus()
  const reloadPage = () => { const url = new URL(window.location.href); url.searchParams.set('tool-retry', String(Date.now())); window.location.replace(url.toString()) }

  return <div className="ruyi-staff-experience">
    <div className="ruyi-staff-scene-region"><ToolErrorBoundary label="定海神针场景" reloadPage={reloadPage}><Suspense fallback={<p role="status">龙宫场景加载中，请稍候……</p>}><RuyiStaffScene events={playback.events} replayToken={playback.requestId} reducedMotion={reducedMotion} muted={muted} onPlaybackComplete={() => playbackComplete(playback.requestId)} /></Suspense></ToolErrorBoundary><div className="dragon-palace-scene-controls"><button type="button" className="button button-ghost" disabled={!session.lastRun && !playback.result} onClick={replay}>重播最近一次</button></div></div>
    <div className="ruyi-staff-program-region" ref={regionRef}><ToolErrorBoundary label="定海神针编程工作台" reloadPage={reloadPage}><Suspense fallback={<p role="status">编程工作台加载中，请稍候……</p>}><RuyiStaffBlocklyWorkspace draft={session.workspace} onDraftChange={saveDraft} onRun={run} focusBlockId={focusBlockId} onFocusHandled={() => setFocusBlockId(null)} /></Suspense></ToolErrorBoundary></div>
    <div className="ruyi-staff-feedback-region"><RuyiStaffFeedback diagnostic={diagnostic} occurrenceId={occurrenceId} onFocusBlock={setFocusBlockId} onFocusWorkspace={focusWorkspace} />
      {saveStatus === 'unsaved' ? <div className="unsaved-session" role="status"><p>本关尚未保存，请重试。</p><button type="button" onClick={retrySave}>重试保存本关</button></div> : null}
    </div>
  </div>
}
