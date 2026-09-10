export const WEEK_FOUR_BOSS_CARDS = Object.freeze([
  {id:'woman', appearance:'女子', identity:'白骨精', label:'原著第一次变化'},
  {id:'elder', appearance:'老妇', identity:'白骨精', label:'原著第二次变化'},
  {id:'man', appearance:'老翁', identity:'白骨精', label:'原著第三次变化'},
  {id:'practice', appearance:'老妇', identity:'采药人', label:'逻辑练习，非原著情节'},
].map(card => Object.freeze(card)));
export const WEEK_FOUR_BOSS_ROUNDS = Object.freeze([Object.freeze(['woman','elder','man','practice']),Object.freeze(['practice','man','woman','elder'])]);
export type WeekFourBossTraceItem = {kind:'verification'; round:number; index:number; cardId:string; identity:string; condition:boolean; action:'keep_observing'|'polite_help'; order:number};
export type WeekFourBossState = 'identity-conflict'|'branch-conflict'|'python-structure-invalid'|'station-proven';
export type WeekFourBossFailureSnapshot = {snapshotId:'w4-m5:identity-conflict'|'w4-m5:branch-conflict'; result:'identity-conflict'|'branch-conflict'; actualActions:string[]; sourceSpans:Array<{line:number;from:number;to:number}>};
export interface WeekFourBossRunResult {state:WeekFourBossState;completed:boolean;failureSnapshots:WeekFourBossFailureSnapshot[];penalty:{livesLost:0;resourcesLost:0;starsLost:0}}
export function runWeekFourBossTrace(raw:unknown):WeekFourBossRunResult {
 const invalid:WeekFourBossRunResult={state:'python-structure-invalid',completed:false,failureSnapshots:[],penalty:{livesLost:0,resourcesLost:0,starsLost:0}};
 try {
  if (!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length!==8||Reflect.ownKeys(raw).length!==9) return invalid;
  const expected=['kind','round','index','cardId','identity','condition','action','order'];
  for(let i=0;i<8;i++) {
   const descriptor=Object.getOwnPropertyDescriptor(raw,String(i));if(!descriptor||!('value' in descriptor))return invalid;
   const e=descriptor.value;
   if(!e||Object.getPrototypeOf(e)!==Object.prototype||Reflect.ownKeys(e).length!==expected.length||!expected.every(k=>{const d=Object.getOwnPropertyDescriptor(e,k);return d&&'value' in d&&d.enumerable;}))return invalid;
   if(e.kind!=='verification'||e.round!==Math.floor(i/4)+1||e.index!==i%4||e.order!==i+1||e.cardId!==WEEK_FOUR_BOSS_ROUNDS[Math.floor(i/4)]![i%4]||!['女子','老妇','老翁','白骨精','采药人'].includes(e.identity)||typeof e.condition!=='boolean'||!['keep_observing','polite_help'].includes(e.action))return invalid;
  }
  const events=raw as WeekFourBossTraceItem[];
  const failures:WeekFourBossFailureSnapshot[]=[];
  const badIdentity=events.find(e=>e.identity!==WEEK_FOUR_BOSS_CARDS.find(c=>c.id===e.cardId)!.identity);
  const badBranch=events.find(e=>e.action!==(WEEK_FOUR_BOSS_CARDS.find(c=>c.id===e.cardId)!.identity==='白骨精'?'keep_observing':'polite_help'));
  const facts=(e:WeekFourBossTraceItem)=>[`第${e.round}轮第${e.index+1}张`, `变量 identity：${e.identity}`, `条件：${e.condition?'成立':'不成立'}`, `动作：${e.action==='keep_observing'?'继续核验':'礼貌帮助'}`];
  if(badIdentity)failures.push({snapshotId:'w4-m5:identity-conflict',result:'identity-conflict',actualActions:facts(badIdentity),sourceSpans:[{line:2,from:4,to:12}]});
  if(badBranch)failures.push({snapshotId:'w4-m5:branch-conflict',result:'branch-conflict',actualActions:facts(badBranch),sourceSpans:[{line:3,from:4,to:6}]});
  return {...invalid,state:failures[0]?.result??'station-proven',completed:failures.length===0,failureSnapshots:failures};
 }catch{return invalid;}
}
