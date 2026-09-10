export const WEEK_FIVE_MONKS_CARDS = Object.freeze(['甲', '乙', '丙'] as const);
export type WeekFiveMonk = typeof WEEK_FIVE_MONKS_CARDS[number];
export type WeekFiveMonksTraceItem =
  | {kind: 'list-created'; items: WeekFiveMonk[]; order: 1}
  | {kind: 'action'; index: number | null; current: WeekFiveMonk | null; target: WeekFiveMonk; action: 'release' | 'register'; line: 3 | 4; scope: 'inside' | 'outside'; order: number}
  | {kind: 'python-error'; error: 'NameError'; line: 4; order: number};
export type WeekFiveMonksState = 'coverage-conflict' | 'action-conflict' | 'python-structure-invalid' | 'rescue-proven';
export type WeekFiveMonksFailureSnapshot = {snapshotId: 'w5-m1:coverage-conflict' | 'w5-m1:action-conflict'; result: 'coverage-conflict' | 'action-conflict'; actualActions: string[]; sourceSpans: Array<{line:number;from:number;to:number}>};
export interface WeekFiveMonksRunResult {state:WeekFiveMonksState;completed:boolean;failureSnapshots:WeekFiveMonksFailureSnapshot[];penalty:{livesLost:0;resourcesLost:0;starsLost:0}}
const isMonk = (x:unknown):x is WeekFiveMonk => WEEK_FIVE_MONKS_CARDS.some(m=>m===x);
const exact=(x:unknown, keys:string[]):x is Record<string,unknown> => !!x && typeof x==='object' && Object.getPrototypeOf(x)===Object.prototype && Reflect.ownKeys(x).length===keys.length && keys.every(k=>{const d=Object.getOwnPropertyDescriptor(x,k);return d && 'value' in d && d.enumerable;});
const dense=(x:unknown,max:number):x is unknown[]=>Array.isArray(x) && Object.getPrototypeOf(x)===Array.prototype && x.length<=max && Reflect.ownKeys(x).length===x.length+1 && Array.from({length:x.length},(_,i)=>Object.getOwnPropertyDescriptor(x,String(i))).every(d=>d && 'value' in d && d.enumerable);
export function runWeekFiveMonksTrace(raw:unknown):WeekFiveMonksRunResult {
 const invalid:WeekFiveMonksRunResult={state:'python-structure-invalid',completed:false,failureSnapshots:[],penalty:{livesLost:0,resourcesLost:0,starsLost:0}};
 try {
  if(!dense(raw,11)||!raw.length)return invalid;
  const head=raw[0];if(!exact(head,['kind','items','order'])||head.kind!=='list-created'||head.order!==1||!dense(head.items,5)||!head.items.every(isMonk))return invalid;
  const items=head.items as WeekFiveMonk[];
  for(let i=1;i<raw.length;i++){
   const e=raw[i];
   if(exact(e,['kind','error','line','order'])&&e.kind==='python-error'&&e.error==='NameError'&&e.line===4&&e.order===i+1&&items.length===0&&i===raw.length-1)continue;
   if(!exact(e,['kind','index','current','target','action','line','scope','order'])||e.kind!=='action'||!isMonk(e.target)||!['release','register'].includes(e.action as string)||![3,4].includes(e.line as number)||!['inside','outside'].includes(e.scope as string)||e.order!==i+1)return invalid;
   if(e.scope==='inside' && (!Number.isInteger(e.index)||(e.index as number)<0||(e.index as number)>=items.length||e.current!==items[e.index as number]))return invalid;
   if(e.scope==='outside' && (e.line!==4||e.index!==null||e.current!==(items.at(-1)??null)||i!==raw.length-1))return invalid;
  }
  const events=raw.slice(1) as WeekFiveMonksTraceItem[];
  const failures:WeekFiveMonksFailureSnapshot[]=[];
  if(items.length!==3 || new Set(items).size!==3)failures.push({snapshotId:'w5-m1:coverage-conflict',result:'coverage-conflict',actualActions:[`练习名单：${items.join('、')||'空名单'}`],sourceSpans:[{line:1,from:0,to:5}]});
  const states:Record<WeekFiveMonk,string[]>={甲:[],乙:[],丙:[]};
  for(const e of events)if(e.kind==='action')states[e.target].push(e.action);
  const bad=WEEK_FIVE_MONKS_CARDS.filter(m=>states[m].join(',')!=='release,register');
  if(bad.length)failures.push({snapshotId:'w5-m1:action-conflict',result:'action-conflict',actualActions:bad.map(m=>`僧众${m}：${states[m].map(a=>a==='release'?'解除役使':'登记离开').join(' → ')||'未执行动作'}`),sourceSpans:[{line:3,from:4,to:11},{line:4,from:0,to:12}]});
  return {state:failures[0]?.result??'rescue-proven',completed:!failures.length,failureSnapshots:failures,penalty:invalid.penalty};
 }catch{return invalid;}
}
