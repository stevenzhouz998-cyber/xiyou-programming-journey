import { runWeekSixRecordsTrace, type WeekSixRecordsRow, type WeekSixRecordsTraceItem } from './weekSixRecordsContract';
export { DEFAULT_WEEK_SIX_RECORDS_PYTHON, SOLVED_WEEK_SIX_RECORDS_PYTHON } from './weekSixRecordsDefaults';

export function parseWeekSixRecordsDraftEnvelope(code: unknown): { code: string; normalizedCode: string } {
  if (typeof code !== 'string' || code.length > 1200 || /\r(?!\n)/.test(code) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(code)) throw Error('借扇记录草稿需要是 1200 字以内的普通文本。');
  return { code, normalizedCode: code.replaceAll('\r\n', '\n') };
}
export type WeekSixRecordsPythonInvalid = { state: 'python-structure-invalid'; line: number; reason: 'contract' };
export interface WeekSixRecordsPythonRunnable { pythonCode: string; normalizedCode: string; records: WeekSixRecordsRow[]; firstField: string; secondField: string; trace: WeekSixRecordsTraceItem[]; run: ReturnType<typeof runWeekSixRecordsTrace> }

function stripPythonComments(source:string):string{
  return source.split('\n').map((line)=>{let quote:''|'"'|"'"='';let escaped=false;for(let index=0;index<line.length;index+=1){const char=line[index]!;if(escaped){escaped=false;continue;}if(quote&&char==='\\'){escaped=true;continue;}if(char==='"'||char==="'"){if(!quote)quote=char;else if(quote===char)quote='';continue;}if(char==='#'&&!quote)return line.slice(0,index);}return line;}).join('\n');
}

export function parseWeekSixRecordsPython(code: unknown): WeekSixRecordsPythonRunnable | WeekSixRecordsPythonInvalid {
  const draft = parseWeekSixRecordsDraftEnvelope(code); const withoutComments = stripPythonComments(draft.normalizedCode);
  const invalid = (line:number):WeekSixRecordsPythonInvalid=>({state:'python-structure-invalid',line,reason:'contract'});
  const assignment = /^(?:[ \t]*\n)*records[ \t]*=[ \t]*\[([\s\S]*?)\][ \t]*/.exec(withoutComments); if(!assignment)return invalid(1);
  const recordsOffset=withoutComments.search(/records\s*=/); const assignmentLine = withoutComments.slice(0, recordsOffset).split('\n').length;
  const body=assignment[1]!; const itemPattern=/\{([^{}]*)\}/g; const matches=[...body.matchAll(itemPattern)];
  if(matches.length!==3)return invalid(assignmentLine);
  const prefix=body.slice(0,matches[0]!.index);const between1=body.slice((matches[0]!.index??0)+matches[0]![0].length,matches[1]!.index);const between2=body.slice((matches[1]!.index??0)+matches[1]![0].length,matches[2]!.index);const suffix=body.slice((matches[2]!.index??0)+matches[2]![0].length);
  if(!/^\s*$/.test(prefix)||!/^\s*,\s*$/.test(between1)||!/^\s*,\s*$/.test(between2)||!/^\s*,?\s*$/.test(suffix))return invalid(assignmentLine);
  const records: WeekSixRecordsRow[]=[];
  for(const match of matches){
    const pair=/^\s*(["'])([^"'\\\n]+)\1\s*:\s*(["'])([^"'\\\n]*)\3\s*,\s*(["'])([^"'\\\n]+)\5\s*:\s*(["'])([^"'\\\n]*)\7\s*,?\s*$/.exec(match[1]!);if(!pair)return invalid(assignmentLine);
    const entries:[string,string][]=[[pair[2]!,pair[4]!],[pair[6]!,pair[8]!]];
    const map=new Map(entries); if(map.size!==2||!map.has('第几调')||!map.has('经过'))return invalid(assignmentLine);
    records.push({attempt:map.get('第几调')!,story:map.get('经过')!});
  }
  const tail=withoutComments.slice(assignment[0].length); const tailMatch=/^(?:[ \t]*\n)+for[ \t]+record[ \t]+in[ \t]+records[ \t]*:[ \t]*(?:[ \t]*\n)+([ \t]+)record_attempt\([ \t]*record[ \t]*\[[ \t]*(["'])([^"'\\\n]+)\2[ \t]*\][ \t]*,[ \t]*record[ \t]*\[[ \t]*(["'])([^"'\\\n]+)\4[ \t]*\][ \t]*\)[ \t]*(?:\n[ \t]*)*$/.exec(tail); if(!tailMatch)return invalid(assignmentLine);
  const loopOffset=assignment[0].length+tail.search(/for\s+record/); const actionOffset=assignment[0].length+tail.search(/record_attempt/);const loopLine=withoutComments.slice(0,loopOffset).split('\n').length; const actionLine=withoutComments.slice(0,actionOffset).split('\n').length;
  const call=tailMatch;
  const firstField=call[3]!; const secondField=call[5]!; if(!['第几调','经过'].includes(firstField)||!['第几调','经过'].includes(secondField))return invalid(actionLine);
  const trace:WeekSixRecordsTraceItem[]=[{kind:'records-defined',records:structuredClone(records),line:assignmentLine,order:1},{kind:'loop-started',variable:'record',source:'records',line:loopLine,order:2}];
  records.forEach((record,index)=>{ const iteration=index+1; const first=firstField==='第几调'?record.attempt:record.story; const second=secondField==='第几调'?record.attempt:record.story; trace.push({kind:'field-read',iteration,field:firstField,value:first,argument:1,line:actionLine,order:trace.length+1});trace.push({kind:'field-read',iteration,field:secondField,value:second,argument:2,line:actionLine,order:trace.length+1});trace.push({kind:'action',action:'record_attempt',iteration,attempt:first,story:second,line:actionLine,order:trace.length+1}); });
  return {pythonCode:draft.code,normalizedCode:draft.normalizedCode,records,firstField,secondField,trace,run:runWeekSixRecordsTrace(trace)};
}
