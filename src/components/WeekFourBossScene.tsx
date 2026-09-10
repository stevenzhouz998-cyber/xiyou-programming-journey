import {useRef,useState} from 'react';
import {WEEK_FOUR_BOSS_CARDS,WEEK_FOUR_BOSS_ROUNDS,type WeekFourBossState,type WeekFourBossTraceItem} from '../engine/weekFourBossContract';
import {assetUrl} from '../utils/assets';
export interface WeekFourBossSceneProps {state:WeekFourBossState|'ready';cards:typeof WEEK_FOUR_BOSS_CARDS;events:readonly WeekFourBossTraceItem[];muted:boolean;reducedMotion:boolean;showCanonEpilogue:boolean;onAssetsReady():void;onAssetsError(message:string):void}
export function WeekFourBossScene({events,showCanonEpilogue,onAssetsReady,onAssetsError}:WeekFourBossSceneProps){
 const [generation,setGeneration]=useState(0);const [failed,setFailed]=useState(false);const generationRef=useRef(0);const loaded=useRef(false);
 const cardLabel=(id:string)=>{const c=WEEK_FOUR_BOSS_CARDS.find(c=>c.id===id)!;return id==='practice'?'练习老妇':c.appearance;};
 return <section className="week-four-boss-scene" aria-label="白虎岭公开核验卡">
  <img key={generation} className="week-four-boss-backdrop" src={`${assetUrl('/assets/week-four-mapping/white-tiger-ridge-background.webp')}?retry=${generation}`} alt="明亮的白虎岭山间小路" onLoad={()=>{if(generation===generationRef.current&&!loaded.current){loaded.current=true;onAssetsReady();}}} onError={()=>{if(generation===generationRef.current){setFailed(true);onAssetsError('白虎岭场景未加载，请重试。');}}}/>
  {failed?<button type="button" onClick={()=>{loaded.current=false;generationRef.current++;setGeneration(generationRef.current);setFailed(false);}}>重试加载白虎岭场景</button>:null}
  <h3>先看公开证据</h3>
  <p>三次变化来自原著第二十七回。采药人卡仅用于逻辑练习，不是新增故事。</p>
  <dl className="week-four-boss-evidence">{WEEK_FOUR_BOSS_CARDS.map(c=><div key={c.id}><dt>{c.label}</dt><dd>外形：{c.appearance} · 身份：{c.identity}</dd></div>)}</dl>
  <h3>两轮卡片列表 · 运行前全部公开</h3>
  {WEEK_FOUR_BOSS_ROUNDS.map((round,i)=><p key={i}>第{i+1}轮：{round.map(cardLabel).join(' → ')}</p>)}
  <h3>这次程序的核验记录</h3>
  {events.length===0?<p>运行后显示每张卡读入的变量、条件和实际动作。</p>:<div className="week-four-boss-table-scroll"><table><caption>真实 Python 两轮核验</caption><thead><tr><th scope="col">轮次 / 卡片</th><th scope="col">变量 identity</th><th scope="col">条件</th><th scope="col">实际动作</th></tr></thead><tbody>{events.map(row=><tr key={row.order}><th scope="row">{row.round} / {cardLabel(row.cardId)}</th><td>{row.identity}</td><td>{row.condition?'成立':'不成立'}</td><td>{row.action==='keep_observing'?'继续核验':'礼貌帮助'}</td></tr>)}</tbody></table></div>}
  {showCanonEpilogue?<aside aria-label="固定原著尾声"><h3>白虎岭核验报告已保存</h3><p>原著回顾：悟空识破白骨精，唐僧仍误解悟空并写下贬书。这是固定故事回顾，不是你的命令，也不是学习失败的惩罚。</p><p>下一关：第五周第一关已解锁。</p></aside>:null}
 </section>;
}
