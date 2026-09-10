import { useRef, useState } from 'react';
import { type WeekFiveMonksState, type WeekFiveMonksTraceItem } from '../engine/weekFiveMonksContract';
import { assetUrl } from '../utils/assets';
export interface WeekFiveMonksSceneProps {
 state: WeekFiveMonksState | 'ready'; cards: readonly string[]; events: readonly WeekFiveMonksTraceItem[];
 muted: boolean; reducedMotion: boolean; showCanonEpilogue: boolean;
 onAssetsReady(): void; onAssetsError(message: string): void;
}
export function WeekFiveMonksScene({cards,events,showCanonEpilogue,onAssetsReady,onAssetsError}:WeekFiveMonksSceneProps) {
 const [generation,setGeneration]=useState(0),[failed,setFailed]=useState(false);
 const generationRef=useRef(0),loaded=useRef(false);
 return <section className="week-five-monks-scene" aria-label="逐人解困现场">
  <img key={generation} className="week-five-monks-backdrop" src={`${assetUrl('/assets/week-five-monks/chechi-rescue-background.webp')}?retry=${generation}`} alt="车迟国城门外，悟空与三位僧众在明亮的小路上" onLoad={()=>{if(generation===generationRef.current&&!loaded.current){loaded.current=true;onAssetsReady();}}} onError={()=>{if(generation===generationRef.current){setFailed(true);onAssetsError('车迟国场景未加载，请重试。');}}}/>
  {failed?<button type="button" onClick={()=>{loaded.current=false;generationRef.current++;setGeneration(generationRef.current);setFailed(false);}}>重试加载车迟国场景</button>:null}
  <h3>让每位僧众都完成两步</h3>
  <p>公开练习名单：{cards.map(m=>`僧众${m}`).join('、')}。每位都要先解除役使，再登记离开。</p>
  <p className="week-five-monks-practice-note">教学抽象：三位编号与登记流程用于学习循环，不是原著人数、姓名或具体情节。插画展示故事背景，下面的状态来自你的程序。</p>
  <RescueTrace key={JSON.stringify(events)} events={events} cards={cards}/>
  {showCanonEpilogue?<aside aria-label="固定原著尾声"><h3>僧众解困记录已保存</h3><p>原著回顾：第四十四回中，悟空帮助车迟国受役僧众离开。故事接下来进入三清观。这是固定故事回顾，学习失败不会改变原著结局。</p><p>下一关：三清观已解锁。</p></aside>:null}
 </section>;
}
function RescueTrace({events,cards}:{events:readonly WeekFiveMonksTraceItem[];cards:readonly string[]}) {
 const rows=events.filter((e):e is Extract<WeekFiveMonksTraceItem,{kind:'action'}>=>e.kind==='action');
 const [step,setStep]=useState<number|null>(null);
 const active=step===null?null:rows[step];
 const shown=step===null?rows:rows.slice(0,step+1);
 return <>
  <h3>程序实际执行的结果</h3>
  {events.length===0?<p>运行后可以逐步查看：当前轮到谁，动作对谁执行了几次。</p>:<>
   <p>程序名单：{events[0]?.kind==='list-created' ? events[0].items.join('、')||'空名单': ''}</p>
   {events.some(e=>e.kind==='python-error')?<p role="status">名单为空，循环没有建立 monk；循环外读取它产生了真实 NameError。请先检查名单。</p>:null}
   <table><caption>{step===null?'本次运行 · 每位的实际状态':'已保存运行 · 逐步查看'}</caption><thead><tr><th scope="col">练习僧众</th><th scope="col">解除役使</th><th scope="col">登记离开</th></tr></thead><tbody>{cards.map(m=>{
    const actions=shown.filter(e=>e.target===m);const released=actions.filter(e=>e.action==='release').length,registered=actions.filter(e=>e.action==='register').length;
    return <tr key={m} data-current={active?.current===m}><th scope="row">僧众{m}{active?.current===m?' · 当前':''}</th><td>{released?`${released} 次`:'未执行'}</td><td>{registered?`${registered} 次`:'未执行'}</td></tr>;
   })}</tbody></table>
   {rows.length?<div className="week-five-monks-playback"><button type="button" onClick={()=>setStep(step===null?0:Math.min(rows.length-1,step+1))} disabled={step===rows.length-1}>{step===null?'逐步查看本次执行':'查看下一步'}</button><button type="button" onClick={()=>setStep(null)} disabled={step===null}>查看全部结果</button>
    <p aria-live="polite">{active?`第 ${step!+1} 步 · 代码第 ${active.line} 行 · ${active.scope==='inside'?'循环内':'循环外'}：${active.current?`monk 是僧众${active.current}`:'没有当前僧众'}，对僧众${active.target}${active.action==='release'?'解除役使':'登记离开'}。`:'下方按实际顺序展示每条执行记录。'}</p>
   </div>:null}
   <ol aria-label="实际动作顺序">{rows.map((e,i)=><li key={e.order} aria-current={i===step?'step':undefined}>第 {e.line} 行 · {e.scope==='inside'?`第 ${e.index!+1} 轮`:'循环外'} · 僧众{e.target}：{e.action==='release'?'解除役使':'登记离开'}</li>)}</ol>
  </>}
 </>;
}
