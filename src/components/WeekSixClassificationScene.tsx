import { useState } from 'react';
import type { WeekSixRecordsRow } from '../engine/weekSixRecordsContract';
import { assetUrl } from '../utils/assets';

export function WeekSixClassificationScene({ rows, onAssetsReady, onAssetsError }:{ rows:WeekSixRecordsRow[];onAssetsReady():void;onAssetsError(message:string):void }) {
  const [generation,setGeneration]=useState(0),[failed,setFailed]=useState(false);
  return <section className="week-six-classification-scene" aria-label="我的三次借扇记录">
    <img key={generation} className="week-six-classification-backdrop" src={`${assetUrl('/assets/week-six-records/flaming-mountain-background.webp')}?classification=${generation}`} alt="烈焰映照的火焰山峡谷与远处西行道路" onLoad={()=>{setFailed(false);onAssetsReady();}} onError={()=>{setFailed(true);onAssetsError('火焰山场景未加载，请重试。');}} />
    {failed?<button type="button" className="button button-ghost" onClick={()=>setGeneration((value)=>value+1)}>重试加载火焰山场景</button>:null}
    <h3>我的三次借扇记录</h3>
    <p>这些内容只读，来自上一关保存的三次借扇记录。</p>
    <div className="week-six-classification-source-cards">{rows.map((row)=><article key={row.attempt}><strong>{row.attempt}</strong><p>{row.story}</p></article>)}</div>
  </section>;
}

export default WeekSixClassificationScene;
