import { useRef, useState } from 'react';
import { type WeekFourListState, type WeekFourListTraceItem } from '../engine/weekFourListContract';
import { assetUrl } from '../utils/assets';
export interface WeekFourListSceneProps {
  state: WeekFourListState | 'ready'; cards: readonly string[]; events: readonly WeekFourListTraceItem[];
  muted: boolean; reducedMotion: boolean; showCanonEpilogue: boolean;
  onAssetsReady(): void; onAssetsError(message: string): void;
}
export function WeekFourListScene({cards, events, showCanonEpilogue, onAssetsReady, onAssetsError}: WeekFourListSceneProps) {
  const [generation,setGeneration] = useState(0); const [failed,setFailed] = useState(false);
  const generationRef = useRef(0); const loaded = useRef(false);
  const rows = events.filter((e): e is Extract<WeekFourListTraceItem, {kind:'iteration'}> => e.kind === 'iteration');
  return <section className="week-four-list-scene" aria-label="三次变化观察册">
    <img key={generation} className="week-four-list-backdrop" src={`${assetUrl('/assets/week-four-mapping/white-tiger-ridge-background.webp')}?retry=${generation}`} alt="明亮的白虎岭山间小路" onLoad={() => { if (generation === generationRef.current && !loaded.current) { loaded.current = true; onAssetsReady(); } }} onError={() => { if (generation === generationRef.current) { setFailed(true); onAssetsError('白虎岭场景未加载，请重试。'); } }} />
    {failed ? <button type="button" onClick={() => { loaded.current = false; generationRef.current += 1; setGeneration(generationRef.current); setFailed(false); }}>重试加载白虎岭场景</button> : null}
    <h3>公开原著参考 · 第二十七回</h3>
    <p>{cards.map((x,i) => `第${i+1}次：${x}`).join(' → ')}。三次外形不同，变化者都是白骨精。</p>
    <h3>这次程序的逐轮记录</h3>
    {events.length === 0 ? <p>运行后，这里会显示每轮取出的 item 和实际记录值。</p> : <>
      <p>程序列表：{events[0]?.kind === 'list-created' && events[0].items.length ? events[0].items.join(' → ') : '空列表，没有循环'}</p>
      <table><caption>真实 Python 循环观察</caption><thead><tr><th scope="col">轮次</th><th scope="col">当前项 item</th><th scope="col">实际记录</th></tr></thead><tbody>{rows.map(row => <tr key={row.index}><th scope="row">{row.index+1}</th><td>{row.item}</td><td>{row.recorded}</td></tr>)}</tbody></table>
    </>}
    {showCanonEpilogue ? <aside aria-label="固定原著尾声"><h3>观察册已保存 · 原著后续</h3><p>悟空识破白骨精。唐僧仍然误解悟空，写下贬书将他逐走。这是原著后续，不是你的命令，也不是学习失败的惩罚。</p><p>下一关：白骨迷踪总试炼已解锁。</p></aside> : null}
  </section>;
}
