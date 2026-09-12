import type { WeekSixAttempt, WeekSixClassificationFailureSnapshot, WeekSixEvidenceId } from '../engine/weekSixClassificationContract';

export const WEEK_SIX_CLASSIFICATION_EVIDENCE: Array<{attempt:WeekSixAttempt;snippets:Array<{id:WeekSixEvidenceId;text:string}>}> = [
  { attempt:'一调', snippets:[{id:'one-not-real',text:'土地指出这把扇子不是真的。'},{id:'one-fire-worse',text:'扇后火势反而更旺。'}] },
  { attempt:'二调', snippets:[{id:'two-true-fan',text:'悟空变化后取得了真扇。'},{id:'two-stolen-back',text:'牛魔王变作八戒，把扇子骗了回去。'}] },
  { attempt:'三调', snippets:[{id:'three-true-fan',text:'悟空最终借得真扇。'},{id:'three-fire-cleared',text:'火焰熄灭，师徒得以通行。'}] },
];

export function weekSixClassificationFailureMessage(failure:WeekSixClassificationFailureSnapshot|undefined):string{
 if(!failure)return'分类还没有核验完成。';const attempt=failure.attempt??'来源记录';
 if(failure.result==='source-invalid')return'来源记录与已保存的三次借扇事实表不一致。';
 if(failure.result==='input-invalid')return'分类草稿包含缺失、重复或未知的记录。';
 if(failure.result==='practice-conflict')return'这张练习卡没有调次或身份线索，暂时不能判断真假。';
 if(failure.result==='selection-incomplete')return failure.dimension==='practice'?'材料练习还没有作出判断。':`${attempt}的${failure.dimension==='fan-authenticity'?'扇子真假标签和依据':'通行结果标签和依据'}还没有选完整。`;
 if(failure.result==='label-conflict')return`${attempt}的${failure.dimension==='fan-authenticity'?'扇子真假':'灭火通行'}标签与公开材料不一致，请重新核对。`;
 return failure.dimension==='fan-authenticity'?'这条依据还不能说明它是真是假，请回到当前记录核对。':'这条依据还不能说明这次是否达成灭火通行，请回到当前记录核对。';
}
