import {runWeekFiveMonksTrace,type WeekFiveMonk,type WeekFiveMonksTraceItem} from './weekFiveMonksContract';
export const DEFAULT_WEEK_FIVE_MONKS_PYTHON='monks = ["甲", "乙", "丙"]\nfor monk in monks:\n    release(monk)\nregister(monk)';
export function parseWeekFiveMonksDraftEnvelope(code:unknown):{code:string;normalizedCode:string}{
 if(typeof code!=='string'||code.length>512||/\r(?!\n)/.test(code)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(code))throw Error('解困草稿需要是 512 字以内的普通文本。');
 return {code,normalizedCode:code.replaceAll('\r\n','\n')};
}
export type WeekFiveMonksPythonInvalid={state:'python-structure-invalid';line:number;reason:'contract'};
export interface WeekFiveMonksPythonRunnable {pythonCode:string;normalizedCode:string;structure:'inside'|'outside';trace:WeekFiveMonksTraceItem[];run:ReturnType<typeof runWeekFiveMonksTrace>}
export function parseWeekFiveMonksPython(code:unknown):WeekFiveMonksPythonRunnable|WeekFiveMonksPythonInvalid {
 const draft=parseWeekFiveMonksDraftEnvelope(code),lines=draft.normalizedCode.split('\n');
 const invalid=(line:number):WeekFiveMonksPythonInvalid=>({state:'python-structure-invalid',line,reason:'contract'});
 if(lines.length!==4)return invalid(1);
 const list=/^monks = \[(.*)\]$/.exec(lines[0]!);if(!list)return invalid(1);
 const literal=/^(?:"([甲乙丙])"|'([甲乙丙])')$/;
 const tokens=list[1]!.trim()===''?[]:list[1]!.split(',').map(s=>s.trim());
 if(tokens.length>5||tokens.some(s=>!literal.test(s)))return invalid(1);
 const items=tokens.map(s=>{const m=literal.exec(s)!;return (m[1]??m[2]) as WeekFiveMonk;});
 if(lines[1]!=='for monk in monks:')return invalid(2);
 const calls=lines.slice(2).map(s=>/^(    |)(release|register)\((monk|"[甲乙丙]"|'[甲乙丙]')\)$/.exec(s));
 if(!calls[0]||calls[0][1]!=='    ')return invalid(3);if(!calls[1])return invalid(4);
 const structure=calls[1][1]==='    '?'inside':'outside';
 const trace:WeekFiveMonksTraceItem[]=[{kind:'list-created',items,order:1}];
 const append=(call:RegExpExecArray,line:3|4,current:WeekFiveMonk|null,index:number|null,scope:'inside'|'outside')=>{
  if(call[3]==='monk'&&current===null){trace.push({kind:'python-error',error:'NameError',line:4,order:trace.length+1});return;}
  trace.push({kind:'action',index,current,target:call[3]==='monk'?current!:call[3]!.slice(1,-1) as WeekFiveMonk,action:call[2] as 'release'|'register',line,scope,order:trace.length+1});
 };
 items.forEach((m,i)=>{append(calls[0]!,3,m,i,'inside');if(structure==='inside')append(calls[1]!,4,m,i,'inside');});
 if(structure==='outside')append(calls[1],4,items.at(-1)??null,null,'outside');
 return {pythonCode:draft.code,normalizedCode:draft.normalizedCode,structure,trace,run:runWeekFiveMonksTrace(trace)};
}
