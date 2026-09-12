import { runWeekSixRecordsTrace, type WeekSixRecordsRunResult, type WeekSixRecordsTraceItem } from './weekSixRecordsContract';
import { parseWeekSixRecordsPython } from './weekSixRecordsPythonGrammar';

export type WeekSixRecordsRuntimeErrorCode='validation'|'disposed'|'busy'|'load-error'|'load-timeout'|'timeout'|'cancelled'|'worker-error'|'worker-contract-mismatch';
export class WeekSixRecordsRuntimeError extends Error{constructor(public readonly code:WeekSixRecordsRuntimeErrorCode,message:string){super(message);this.name='WeekSixRecordsRuntimeError';}}
export interface WeekSixRecordsWorker{onmessage:((event:MessageEvent<unknown>)=>void)|null;onerror:(()=>void)|null;postMessage(message:unknown):void;terminate():void}
export interface WeekSixRecordsPythonRun{trace:WeekSixRecordsTraceItem[];run:WeekSixRecordsRunResult}
export interface WeekSixRecordsPythonRuntime{ready():Promise<void>;run(code:unknown):Promise<WeekSixRecordsPythonRun>;cancel():void;dispose():void}
type Options={coldTimeoutMs?:number;warmTimeoutMs?:number;workerFactory?:()=>WeekSixRecordsWorker};
type State={worker:WeekSixRecordsWorker;generation:number;readyPromise:Promise<void>;resolveReady:()=>void;rejectReady:(reason:Error)=>void;readyTimer:ReturnType<typeof setTimeout>;status:'loading'|'ready'|'failed'};
type Active={id:number;state:State;expectedTrace:WeekSixRecordsTraceItem[];expectedRun:WeekSixRecordsRunResult;timer:ReturnType<typeof setTimeout>;resolve:(value:WeekSixRecordsPythonRun)=>void;reject:(reason:Error)=>void};
const plain=(value:unknown)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);

export function createWeekSixRecordsPythonRuntime(options:Options={}):WeekSixRecordsPythonRuntime{
  const cold=options.coldTimeoutMs??20_000,warm=options.warmTimeoutMs??1_000;
  const workerFactory=options.workerFactory??(()=>new Worker(new URL('../workers/weekSixRecordsPython.worker.ts',import.meta.url),{type:'module'}) as unknown as WeekSixRecordsWorker);
  let current:State|null=null,generation=0,requestId=0,active:Active|null=null,pending:{state:State;reason:WeekSixRecordsRuntimeError|null}|null=null,disposed=false;
  const owned=(state:State)=>current===state&&current.generation===state.generation;
  const stop=(state:State,error:WeekSixRecordsRuntimeError)=>{if(!owned(state))return;current=null;clearTimeout(state.readyTimer);state.worker.terminate();if(state.status==='loading'){state.status='failed';state.rejectReady(error);}};
  const rejectActive=(state:State,error:WeekSixRecordsRuntimeError)=>{if(!active||active.state!==state||!owned(state))return false;const run=active;active=null;clearTimeout(run.timer);stop(state,error);run.reject(error);return true;};
  const start=():State=>{
    if(current)return current;let worker:WeekSixRecordsWorker;try{worker=workerFactory();}catch{throw new WeekSixRecordsRuntimeError('worker-error','无法创建 Python Worker。');}
    let resolveReady!:()=>void,rejectReady!:(reason:Error)=>void;const state:State={worker,generation:++generation,readyPromise:new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;}),resolveReady,rejectReady,readyTimer:undefined as never,status:'loading'};current=state;
    state.readyTimer=setTimeout(()=>stop(state,new WeekSixRecordsRuntimeError('load-timeout','Python 运行环境加载超时。')),cold);
    const contractFailure=()=>{const error=new WeekSixRecordsRuntimeError('worker-contract-mismatch','Python Worker 返回了非法消息。');if(!rejectActive(state,error))stop(state,error);};
    worker.onmessage=(event)=>{if(!owned(state)||!plain(event.data)){if(owned(state))contractFailure();return;}const message=event.data as Record<string,unknown>;
      if(message.type==='ready'&&Object.keys(message).length===1){if(state.status!=='loading'){contractFailure();return;}clearTimeout(state.readyTimer);state.status='ready';state.resolveReady();return;}
      if(message.type==='load-error'){stop(state,new WeekSixRecordsRuntimeError('load-error',typeof message.error==='string'?message.error:'Python 运行环境不可用。'));return;}
      if(message.type==='error'&&message.requestId===active?.id){rejectActive(state,new WeekSixRecordsRuntimeError('worker-error',typeof message.error==='string'?message.error:'Python Worker 拒绝本次运行。'));return;}
      if(message.type!=='result'||message.requestId!==active?.id||!Array.isArray(message.trace)){contractFailure();return;}
      const running=active;if(!running)return;active=null;clearTimeout(running.timer);const canonical=runWeekSixRecordsTrace(message.trace);
      if(!same(message.trace,running.expectedTrace)||!same(canonical,running.expectedRun)){stop(state,new WeekSixRecordsRuntimeError('worker-contract-mismatch','Python Worker 返回的字段轨迹与当前代码合同不一致。'));running.reject(new WeekSixRecordsRuntimeError('worker-contract-mismatch','Python Worker 返回的字段轨迹与当前代码合同不一致。'));return;}
      running.resolve({trace:structuredClone(message.trace) as WeekSixRecordsTraceItem[],run:structuredClone(canonical)});
    };
    worker.onerror=()=>{if(owned(state)){const error=new WeekSixRecordsRuntimeError('worker-error','Python Worker 错误。');if(!rejectActive(state,error))stop(state,error);}};return state;
  };
  return {
    ready(){if(disposed)return Promise.reject(new WeekSixRecordsRuntimeError('disposed','Python runtime 已关闭。'));try{return start().readyPromise;}catch(error){return Promise.reject(error);}},
    async run(code){if(disposed)throw new WeekSixRecordsRuntimeError('disposed','Python runtime 已关闭。');let parsed;try{parsed=parseWeekSixRecordsPython(code);}catch(error){throw new WeekSixRecordsRuntimeError('validation',error instanceof Error?error.message:'Python 文本无法验证。');}if('state'in parsed)throw new WeekSixRecordsRuntimeError('validation','Python 字典与循环结构尚未完成。');if(active||pending)throw new WeekSixRecordsRuntimeError('busy','Python runtime 正在运行。');const state=start();const waiting={state,reason:null as WeekSixRecordsRuntimeError|null};pending=waiting;try{await state.readyPromise;}finally{if(pending===waiting)pending=null;}if(waiting.reason)throw waiting.reason;if(!owned(state))throw new WeekSixRecordsRuntimeError('worker-error','Python Worker 已被替代。');return new Promise((resolve,reject)=>{const id=++requestId;const timer=setTimeout(()=>{if(!active||active.id!==id)return;const running=active;active=null;const error=new WeekSixRecordsRuntimeError('timeout','Python 字段读取运行超时。');stop(state,error);running.reject(error);},warm);active={id,state,expectedTrace:structuredClone(parsed.trace),expectedRun:structuredClone(parsed.run),timer,resolve,reject};try{state.worker.postMessage({type:'run',requestId:id,code:parsed.pythonCode});}catch{rejectActive(state,new WeekSixRecordsRuntimeError('worker-error','Python Worker 无法接收本次运行。'));}});},
    cancel(){const error=new WeekSixRecordsRuntimeError('cancelled','Python 字段读取运行已取消。');if(active){rejectActive(active.state,error);return;}if(pending){const waiting=pending;waiting.reason=error;pending=null;stop(waiting.state,error);}},
    dispose(){disposed=true;const error=new WeekSixRecordsRuntimeError('disposed','Python runtime 已关闭。');if(active){rejectActive(active.state,error);return;}if(pending){pending.reason=error;pending=null;}if(current)stop(current,error);},
  };
}
