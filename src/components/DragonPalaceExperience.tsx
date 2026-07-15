import { lazy, Suspense, useRef, useState } from 'react'
import type { BattleDiagnostic, BattleEvent, BattleRunResult } from '../battle/types'
import { runDragonPalaceBattle } from '../battle/dragonPalace'
import type { CompileDiagnostic, CompileResult } from '../blockly/compiler'
import type { WorkspaceDraftV1 } from '../blockly/draft'
import { useProgress } from '../context/ProgressContext'
import {
  createMissionSession,
  recordCompileFailure,
  recordRun,
  updateWorkspaceDraft,
} from '../progress/session'
import { BattleFeedback } from './BattleFeedback'
import { ToolErrorBoundary } from './ToolErrorBoundary'

const GameScene = lazy(() => import('./GameScene').then((module) => ({ default: module.GameScene })))
const BlocklyWorkspace = lazy(() => import('./BlocklyWorkspace').then((module) => ({ default: module.BlocklyWorkspace })))

const MISSION_ID = 'w1-m1' as const
const EMPTY_SESSION_TIME = '1970-01-01T00:00:00.000Z'

type FeedbackDiagnostic = CompileDiagnostic | BattleDiagnostic

interface CompletionEvidence {
  stars: 1 | 2 | 3
  hintsUsed: number
}

interface Props {
  reducedMotion: boolean
  muted: boolean
  onComplete: (evidence: CompletionEvidence) => void
}

interface PlaybackRequest {
  readonly requestId: number
  readonly origin: 'empty' | 'restored' | 'run' | 'replay'
  readonly events: BattleEvent[]
  readonly result: BattleRunResult | null
  readonly hintTiers: string[]
  readonly runAt: string | null
  readonly eligibleForCompletion: boolean
  readonly evidence: CompletionEvidence | null
}

function completionEvidence(tiers: readonly string[]): CompletionEvidence {
  const hintsUsed = new Set(tiers).size
  return {
    stars: hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1,
    hintsUsed,
  }
}

function restoredRequest(
  result: BattleRunResult | null,
  hintTiers: readonly string[],
  runAt: string | null,
): PlaybackRequest {
  const snapshot = result === null ? null : structuredClone(result)
  return {
    requestId: 0,
    origin: snapshot === null ? 'empty' : 'restored',
    events: snapshot?.events ?? [],
    result: snapshot,
    hintTiers: [...hintTiers],
    runAt,
    eligibleForCompletion: false,
    evidence: null,
  }
}

export function DragonPalaceExperience({ reducedMotion, muted, onComplete }: Props) {
  const { progress, saveStatus, retrySave, updateMissionSession } = useProgress()
  const emptySessionRef = useRef(createMissionSession(EMPTY_SESSION_TIME))
  const session = progress.sessions[MISSION_ID] ?? emptySessionRef.current
  const [playbackRequest, setPlaybackRequest] = useState<PlaybackRequest>(
    () => restoredRequest(session.lastRun, session.usedHintTiers, session.lastRunAt),
  )
  const requestSequenceRef = useRef(playbackRequest.requestId)
  const currentRequestRef = useRef(playbackRequest)
  const consumedRequestsRef = useRef(new Set<number>())
  const onCompleteRef = useRef(onComplete)
  const missionCompletedRef = useRef(Boolean(progress.missions[MISSION_ID]))
  const workspaceRegionRef = useRef<HTMLDivElement>(null)
  const [diagnostic, setDiagnostic] = useState<FeedbackDiagnostic | null>(
    () => session.lastRun?.diagnostic ?? null,
  )
  const [occurrenceId, setOccurrenceId] = useState(0)
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  onCompleteRef.current = onComplete
  missionCompletedRef.current = Boolean(progress.missions[MISSION_ID])

  const replacePlaybackRequest = (request: PlaybackRequest) => {
    currentRequestRef.current = request
    setPlaybackRequest(request)
  }

  const invalidateCurrentCompletion = () => {
    const current = currentRequestRef.current
    if (!current.eligibleForCompletion) return
    currentRequestRef.current = { ...current, eligibleForCompletion: false }
  }

  const saveDraft = (draft: WorkspaceDraftV1, options?: { legacyWorkspaceKey?: string }) => {
    const now = new Date().toISOString()
    return updateMissionSession(
      MISSION_ID,
      (current) => updateWorkspaceDraft(current, draft, now),
      options,
    )
  }

  const run = (compileResult: CompileResult) => {
    setOccurrenceId((value) => value + 1)
    invalidateCurrentCompletion()

    if (!compileResult.ok) {
      const primary = compileResult.diagnostics[0]
      setDiagnostic(primary)
      const now = new Date().toISOString()
      updateMissionSession(
        MISSION_ID,
        (current) => recordCompileFailure(current, 'program-structure', now),
      )
      return
    }

    const result = runDragonPalaceBattle(compileResult.trace)
    const resultSnapshot = structuredClone(result)
    const now = new Date().toISOString()
    const hintTiers = [...session.usedHintTiers]
    const request: PlaybackRequest = {
      requestId: ++requestSequenceRef.current,
      origin: 'run',
      events: resultSnapshot.events,
      result: resultSnapshot,
      hintTiers,
      runAt: now,
      eligibleForCompletion: result.completed && !missionCompletedRef.current,
      evidence: result.completed ? completionEvidence(hintTiers) : null,
    }
    replacePlaybackRequest(request)
    updateMissionSession(
      MISSION_ID,
      (current) => recordRun(current, result, compileResult.trace, now),
    )
    setDiagnostic(result.diagnostic)
  }

  const playbackComplete = (requestId: number) => {
    const current = currentRequestRef.current
    if (
      current.requestId !== requestId
      || current.origin !== 'run'
      || !current.eligibleForCompletion
      || current.result?.completed !== true
      || current.evidence === null
      || missionCompletedRef.current
      || consumedRequestsRef.current.has(requestId)
    ) return
    consumedRequestsRef.current.add(requestId)
    currentRequestRef.current = { ...current, eligibleForCompletion: false }
    onCompleteRef.current(current.evidence)
  }

  const replayLastRun = () => {
    const result = session.lastRun ?? currentRequestRef.current.result
    if (result === null) return
    const resultSnapshot = structuredClone(result)
    replacePlaybackRequest({
      requestId: ++requestSequenceRef.current,
      origin: 'replay',
      events: resultSnapshot.events,
      result: resultSnapshot,
      hintTiers: [...session.usedHintTiers],
      runAt: session.lastRunAt,
      eligibleForCompletion: false,
      evidence: null,
    })
  }

  const focusWorkspace = () => {
    workspaceRegionRef.current
      ?.querySelector<HTMLElement>('[aria-label="Blockly 积木编辑区"]')
      ?.focus()
  }

  const reloadPage = () => {
    const url = new URL(window.location.href)
    url.searchParams.set('tool-retry', String(Date.now()))
    window.location.replace(url.toString())
  }

  return (
    <div className="dragon-palace-experience">
      <div className="dragon-palace-scene-region">
        <ToolErrorBoundary label="龙宫场景" reloadPage={reloadPage}>
          <Suspense fallback={<p role="status">龙宫场景加载中，请稍候……</p>}>
            <GameScene
              events={playbackRequest.events}
              replayToken={playbackRequest.requestId}
              reducedMotion={reducedMotion}
              muted={muted}
              onPlaybackComplete={() => playbackComplete(playbackRequest.requestId)}
            />
          </Suspense>
        </ToolErrorBoundary>
        <div className="dragon-palace-scene-controls">
          <button
            type="button"
            className="button button-ghost"
            disabled={session.lastRun === null && playbackRequest.result === null}
            onClick={replayLastRun}
          >
            重播最近一次
          </button>
        </div>
      </div>

      <div className="dragon-palace-program-region" ref={workspaceRegionRef}>
        <ToolErrorBoundary label="任务工具" reloadPage={reloadPage}>
          <Suspense fallback={<p role="status">编程工作台加载中，请稍候……</p>}>
            <BlocklyWorkspace
              missionId={MISSION_ID}
              draft={session.workspace}
              onDraftChange={saveDraft}
              onRun={run}
              focusBlockId={focusBlockId}
              onFocusHandled={() => setFocusBlockId(null)}
            />
          </Suspense>
        </ToolErrorBoundary>
      </div>

      <div className="dragon-palace-feedback-region">
        <BattleFeedback
          diagnostic={diagnostic}
          occurrenceId={occurrenceId}
          onFocusBlock={setFocusBlockId}
          onFocusWorkspace={focusWorkspace}
        />
        {diagnostic !== null && 'code' in diagnostic && diagnostic.sourceBlockId === null ? (
          <button type="button" className="button button-ghost" onClick={focusWorkspace}>
            回到编程工作台
          </button>
        ) : null}
        {saveStatus === 'unsaved' ? (
          <div className="unsaved-session" role="status">
            <p>本关尚未保存，请重试。</p>
            <button type="button" onClick={retrySave}>重试保存本关</button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
