import { useState } from 'react';
import { assetUrl } from '../utils/assets';

export function WeekSixFactCheckScene({onAssetsReady,onAssetsError}:{onAssetsReady():void;onAssetsError(message:string):void}){
 const[generation,setGeneration]=useState(0),[failed,setFailed]=useState(false);
 return <section className="week-six-fact-check-scene" aria-label="本页给出的核验材料">
  <img key={generation} src={`${assetUrl('/assets/week-six-records/flaming-mountain-background.webp')}?fact-check=${generation}`} alt="烈焰映照的火焰山峡谷与远处西行道路" onLoad={()=>{setFailed(false);onAssetsReady()}} onError={()=>{setFailed(true);onAssetsError('火焰山场景未加载，请重试。')}}/>
  {failed?<button type="button" className="button button-ghost" onClick={()=>setGeneration(value=>value+1)}>重试加载火焰山场景</button>:null}
  <h3>本页给出的有限材料</h3>
  <ul><li><strong>第六十回转述：</strong>悟空变作牛魔王模样，取得真扇。</li><li><strong>第六十一回转述：</strong>牛魔王变作八戒模样，骗回真扇。</li><li><strong>M2 正式作品：</strong>二调当次没有完成灭火通行。</li></ul>
  <p className="week-six-fact-check-scope">核验范围只包含上面的转述和 M3 正式作品。它们没有提供具体分钟数，所以只能说“本页材料不足以确认”，不能说整部原著没有时间信息。</p>
 </section>
}
export default WeekSixFactCheckScene;
