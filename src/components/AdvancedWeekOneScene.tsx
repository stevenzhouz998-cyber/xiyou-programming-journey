import { useEffect, useMemo, useState } from 'react'
import type { AdvancedWeekOneEvent } from '../battle/advancedWeekOne'
import type { AdvancedWeekOneMissionId } from '../blockly/advancedWeekOneContract'
import { assetUrl } from '../utils/assets'

const stageFor = (missionId: AdvancedWeekOneMissionId, state: string) => {
  if (missionId === 'w1-m4') {
    if (state === 'underworld-closed') return 0
    if (state === 'underworld-opened' || state === 'underworld-index-read') return 1
    if (state === 'underworld-monkey-kind-matched' || state === 'underworld-named-records-collected') return 2
    return 3
  }
  if (state === 'boss-awaiting-plan') return 0
  if (state === 'boss-planned' || state === 'boss-dragon-checking' || state === 'boss-palace-entered') return 1
  if (state === 'boss-weights-compared' || state === 'boss-staff-selected') return 2
  if (state === 'boss-regalia-checking' || state === 'boss-gifts-split') return 3
  if (state === 'boss-regalia-checked' || state === 'boss-register-checking' || state === 'boss-register-opened') return 4
  return 5
}

const progressCopy = (missionId: AdvancedWeekOneMissionId, stage: number) => {
  if (missionId === 'w1-m4') return ['名册尚未打开', '已打开名册', '正在查找猴属记录', '已处理名号并完成核对'][stage] ?? '继续检查名册'
  return ['等待制定第三回计划', '正在检查龙宫任务', '已完成兵器比较', '正在检查披挂任务', '正在检查名册任务', '第三回因果链已核对'][stage] ?? '继续检查第三回计划'
}

export function AdvancedWeekOneScene({ missionId, events, replayToken, reducedMotion, muted, onPlaybackComplete, onResourceStateChange }: {
  missionId: AdvancedWeekOneMissionId; events: AdvancedWeekOneEvent[]; replayToken: number; reducedMotion: boolean; muted: boolean; onPlaybackComplete?: () => void; onResourceStateChange?: (ready: boolean) => void
}) {
  const state = [...events].reverse().find((event) => event.type === 'state-changed' || event.type === 'instruction-rejected')?.state ?? (missionId === 'w1-m4' ? 'underworld-closed' : 'boss-awaiting-plan')
  const rejected = events.some((event) => event.type === 'instruction-rejected')
  const background = missionId === 'w1-m4' ? '/assets/week-one-advanced/underworld-background.webp' : '/assets/week-one-advanced/boss-journey-background.webp'
  const states = missionId === 'w1-m4' ? '/assets/week-one-advanced/register-states.webp' : '/assets/week-one-advanced/boss-checkpoints.webp'
  const name = missionId === 'w1-m4' ? '幽冥勾名代码执行场景' : '第三回总试炼代码执行场景'
  const [loaded, setLoaded] = useState({ background: false, sprite: false })
  const [failed, setFailed] = useState(false)
  const [retry, setRetry] = useState(0)
  const ready = loaded.background && loaded.sprite && !failed
  const stage = stageFor(missionId, state)
  const grid = missionId === 'w1-m4' ? { columns: 2, rows: 2 } : { columns: 3, rows: 2 }
  const spritePosition = useMemo(() => ({
    width: `${grid.columns * 100}%`, height: `${grid.rows * 100}%`,
    transform: `translate(-${(stage % grid.columns) * (100 / grid.columns)}%, -${Math.floor(stage / grid.columns) * (100 / grid.rows)}%)`,
  }), [grid.columns, grid.rows, stage])
  const succeed = (resource: 'background' | 'sprite') => setLoaded((current) => ({ ...current, [resource]: true }))
  const fail = () => { setFailed(true); onResourceStateChange?.(false) }
  const retryLoad = () => { setLoaded({ background: false, sprite: false }); setFailed(false); setRetry((value) => value + 1); onResourceStateChange?.(false) }
  useEffect(() => { onResourceStateChange?.(ready) }, [onResourceStateChange, ready])
  useEffect(() => {
    if (!ready) return
    const timer = window.setTimeout(() => onPlaybackComplete?.(), reducedMotion ? 0 : 240)
    return () => window.clearTimeout(timer)
  }, [ready, replayToken, reducedMotion, onPlaybackComplete])
  const backgroundAlt = missionId === 'w1-m4' ? '幽冥文书房背景' : '第三回行程图'
  const spriteAlt = missionId === 'w1-m4' ? '幽冥名册状态' : '第三回检查点状态'
  return <section role="img" aria-label={name} className="advanced-week-one-scene" data-scene-state={state} data-background-src={background} data-motion-mode={reducedMotion ? 'reduced' : 'standard'} data-muted={String(muted)} data-scene-ready={String(ready)}>
    <img key={`background-${retry}`} src={assetUrl(background)} srcSet={retry > 0 ? `${assetUrl(background)}?retry=${retry}` : undefined} alt={backgroundAlt} onLoad={() => succeed('background')} onError={fail} />
    <div className="advanced-week-one-sprite-viewport" aria-hidden="true"><img key={`sprite-${retry}`} src={assetUrl(states)} srcSet={retry > 0 ? `${assetUrl(states)}?retry=${retry}` : undefined} alt={spriteAlt} data-sprite-stage={String(stage)} style={spritePosition} onLoad={() => succeed('sprite')} onError={fail} /></div>
    {failed ? <div role="alert">场景图片没有加载成功。<button type="button" onClick={retryLoad}>重试加载场景图片</button></div> : <p role="status">{rejected ? '这一格还不能继续，请调整对应积木。' : `当前进度：${progressCopy(missionId, stage)}`}</p>}
  </section>
}
