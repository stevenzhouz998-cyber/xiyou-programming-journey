import { useState } from 'react';
import { assetUrl } from '../utils/assets';

export function WeekSixPromptScene({onAssetsReady,onAssetsError}:{onAssetsReady():void;onAssetsError(message:string):void}){
 const[generation,setGeneration]=useState(0),[failed,setFailed]=useState(false);
 return <section className="week-six-prompt-scene" aria-label="二调芭蕉扇公开材料">
  <img key={generation} src={`${assetUrl('/assets/week-six-records/flaming-mountain-background.webp')}?prompt=${generation}`} alt="烈焰映照的火焰山峡谷与远处西行道路" onLoad={()=>{setFailed(false);onAssetsReady();}} onError={()=>{setFailed(true);onAssetsError('火焰山场景未加载，请重试。');}}/>
  {failed?<button type="button" className="button button-ghost" onClick={()=>setGeneration(value=>value+1)}>重试加载火焰山场景</button>:null}
  <h3>二调公开材料</h3><p>上一关的正式分类作品已确认：二调取得真扇，但当次未完成灭火通行。</p>
  <ul><li>第六十回：悟空变作牛魔王模样取得真扇。</li><li>第六十一回：牛魔王变作八戒模样骗回扇子。</li></ul>
  <p className="week-six-prompt-source-note">身份变化来自公开原著材料；M2 作品作为只读的真扇与通行结果来源。</p>
 </section>;
}
export default WeekSixPromptScene;
