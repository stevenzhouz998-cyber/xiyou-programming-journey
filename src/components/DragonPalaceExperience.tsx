import { lazy, Suspense, useRef, useState } from 'react'
import type { BattleDiagnostic } from '../battle/types'
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

function completionEvidence(tiers: readonly string[]): CompletionEvidence {
  const hintsUsed = new Set(tiers).size
  return {
    stars: hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1,
    hintsUsed,
  }
}

export function DragonPalaceExperience({ reducedMotion, muted, onComplete }: Props) {
  const { progress, saveStatus, retrySave, updateMissionSession } = useProgress()
  const emptySessionRef = useRef(createMissionSession(EMPTY_SESSION_TIME))
  const session = progress.sessions[MISSION_ID] ?? emptySessionRef.current
  const pendingCompletionRef = useRef<CompletionEvidence | null>(null)
  const workspaceRegionRef = useRef<HTMLDivElement>(null)
  const [diagnostic, setDiagnostic] = useState<FeedbackDiagnostic | null>(
    () => session.lastRun?.diagnostic ?? null,
  )
  const [occurrenceId, setOccurrenceId] = useState(0)
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null)
  const [replayToken, setReplayToken] = useState(0)

  const saveDraft = (draft: WorkspaceDraftV1) => {
    const now = new Date().toISOString()
    return updateMissionSession(
      MISSION_ID,
      (current) => updateWorkspaceDraft(current, draft, now),
    )
  }

  const run = (compileResult: CompileResult) => {
    setOccurrenceId((value) => value + 1)
    pendingCompletionRef.current = null

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
    const now = new Date().toISOString()
    updateMissionSession(
      MISSION_ID,
      (current) => recordRun(current, result, compileResult.trace, now),
    )
    setDiagnostic(result.diagnostic)
    setReplayToken((value) => value + 1)
    if (result.completed) {
      pendingCompletionRef.current = completionEvidence(session.usedHintTiers)
    }
  }

  const playbackComplete = () => {
    const evidence = pendingCompletionRef.current
    if (evidence === null) return
    pendingCompletionRef.current = null
    onComplete(evidence)
  }

  const focusWorkspace = () => {
    workspaceRegionRef.current
      ?.querySelector<HTMLElement>('[aria-label="Blockly 积木编辑区"]')
      ?.focus()
  }

  return (
    <div className="dragon-palace-experience">
      <div className="dragon-palace-scene-region">
        <Suspense fallback={<p role="status">龙宫场景加载中，请稍候……</p>}>
          <GameScene
            events={session.lastRun?.events ?? []}
            replayToken={replayToken}
            reducedMotion={reducedMotion}
            muted={muted}
            onPlaybackComplete={playbackComplete}
          />
        </Suspense>
        <div className="dragon-palace-scene-controls">
          <button
            type="button"
            className="button button-ghost"
            disabled={session.lastRun === null}
            onClick={() => setReplayToken((value) => value + 1)}
          >
            重播最近一次
          </button>
        </div>
      </div>

      <div className="dragon-palace-program-region" ref={workspaceRegionRef}>
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
