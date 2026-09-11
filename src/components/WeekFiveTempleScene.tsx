import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../utils/assets';
import type { WeekFiveFunctionState, WeekFiveFunctionTraceItem } from '../engine/weekFiveFunctionContract';

export interface WeekFiveTempleSceneProps { state: WeekFiveFunctionState | 'ready'; events: WeekFiveFunctionTraceItem[]; showCanonEpilogue: boolean; muted: boolean; reducedMotion: boolean; onAssetsReady(): void; onAssetsError(message: string): void }
export function WeekFiveTempleScene({ state, events, showCanonEpilogue, onAssetsReady, onAssetsError }: WeekFiveTempleSceneProps) {
  const [generation, setGeneration] = useState(0); const [failed, setFailed] = useState(false); const loaded = useRef(false); const generationRef = useRef(0);
  useEffect(() => { generationRef.current = generation; loaded.current = false; }, [generation]);
  const actions = events.filter((event): event is Extract<WeekFiveFunctionTraceItem, { kind: 'action' }> => event.kind === 'action');
  const calls = events.filter((event) => event.kind === 'function-called').length;
  return <section className="week-five-temple-scene" aria-label="三清观函数记录现场" data-state={state}>
    <img key={generation} className="week-five-temple-backdrop" src={`${assetUrl('/assets/week-five-temple/sanqing-courtyard-background.webp')}?retry=${generation}`} alt="月夜下灯火明亮的三清观庭院" onLoad={() => { if (generation === generationRef.current && !loaded.current) { loaded.current = true; setFailed(false); onAssetsReady(); } }} onError={() => { if (generation === generationRef.current) { setFailed(true); onAssetsError('三清观场景未加载，请重试。'); } }} />
    {failed ? <button type="button" onClick={() => setGeneration((value) => value + 1)}>重试加载三清观场景</button> : null}
    <p className="week-five-function-practice-note">教学回顾抽象：两条记录帮助练习函数，不是原著里的登记手续，也不要求编写破坏或战斗。</p>
    <dl className="week-five-function-evidence">
      <div><dt>函数准备</dt><dd>{events.some((event) => event.kind === 'function-defined') ? 'record_sanqing 已定义' : '等待运行'}</dd></div>
      <div><dt>实际调用</dt><dd>{calls} 次</dd></div>
      <div><dt>执行记录</dt><dd>{actions.length ? actions.map((event) => event.action === 'record_arrival' ? '夜入三清观' : '说明来历').join(' → ') : '尚未执行函数体'}</dd></div>
    </dl>
    {showCanonEpilogue ? <aside className="week-five-temple-epilogue"><h3>固定原著回顾</h3><p>悟空、八戒、沙僧夜入三清观，悟空随后说明他们是西行取经的僧众。故事接着进入车迟国祈雨比试。</p><p>这是第四十四回夜入与第四十五回说明来历的教学摘录，不由孩子代码生成。</p></aside> : null}
  </section>;
}
