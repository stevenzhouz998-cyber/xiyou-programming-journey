import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {describe,expect,it} from 'vitest';
import {DEFAULT_WEEK_FIVE_MONKS_PYTHON,parseWeekFiveMonksPython} from './weekFiveMonksPythonGrammar';
import {runWeekFiveMonksTrace} from './weekFiveMonksContract';
const solved=DEFAULT_WEEK_FIVE_MONKS_PYTHON.replace('\nregister','\n    register');
const parsed=(code:string)=>{const p=parseWeekFiveMonksPython(code);if('state'in p)throw Error('fixture');return p;};
describe('W5-M1 real loop scope and per-monk state',()=>{
 it('outside registration executes once for the last monk; indentation completes each monk',()=>{
  const p=parsed(DEFAULT_WEEK_FIVE_MONKS_PYTHON);expect(p.run.state).toBe('action-conflict');expect(p.trace.filter(e=>e.kind==='action'&&e.action==='register')).toEqual([{kind:'action',index:null,current:'丙',target:'丙',action:'register',line:4,scope:'outside',order:5}]);
  expect(parsed(solved).run.completed).toBe(true);expect(parsed(solved).trace).toHaveLength(7);
 });
 it.each(['["丙", "甲", "乙"]',"['乙','丙','甲']"])('allows reordered equivalent roster %s',list=>expect(parsed(solved.replace('["甲", "乙", "丙"]',list)).run.completed).toBe(true));
 it.each(['[]','["甲"]','["甲","乙"]','["甲","甲","丙"]','["甲","乙","丙","甲"]'])('missing or duplicate roster cannot pass: %s',list=>expect(parsed(solved.replace('["甲", "乙", "丙"]',list)).run.state).toBe('coverage-conflict'));
 it('empty roster with outside monk is a deterministic real NameError learning outcome',()=>{const p=parsed(DEFAULT_WEEK_FIVE_MONKS_PYTHON.replace('["甲", "乙", "丙"]','[]'));expect(p.trace.at(-1)).toEqual({kind:'python-error',error:'NameError',line:4,order:2});expect(p.run.completed).toBe(false);});
 it.each([solved.replace('release(monk)','register(monk)'),solved.replace('register(monk)','release(monk)'),solved.replace('release(monk)','release("甲")'),solved.replace('release(monk)','register(monk)').replace('    register(monk)\n    register(monk)','    register(monk)\n    release(monk)')])('rejects wrong target, repeated or reversed actions',code=>expect(parsed(code).run.state).toBe('action-conflict'));
 it('rejects sparse, accessor and unknown trace data without invoking getters',()=>{const trace=parsed(solved).trace;const sparse=structuredClone(trace);delete sparse[2];expect(runWeekFiveMonksTrace(sparse).state).toBe('python-structure-invalid');const x=structuredClone(trace);Object.defineProperty(x[1],'target',{get(){throw Error('getter');},enumerable:true});expect(runWeekFiveMonksTrace(x).state).toBe('python-structure-invalid');expect(runWeekFiveMonksTrace([...trace,{kind:'fake'}]).completed).toBe(false);});
 it.each(['import os','while True:\n    pass',solved.replace('release(monk)','open("file")'),solved.replace('release(monk)','__import__("js")'),solved.replace('release(monk)','print("获救")'),solved.replace('for monk in monks:','for monk in monks*1000000:'),solved.replace('release(monk)','monk.__class__')])('rejects unsafe/unsupported program %s',code=>expect(parseWeekFiveMonksPython(code)).toHaveProperty('state','python-structure-invalid'));
 it('independent Python AST/exec matches all 768 bounded combinations, including actual empty-list NameError',()=>{
  const codes:string[]=[];
  for(const list of ['[]','["甲"]','["甲","乙"]','["甲","乙","丙"]','["丙","甲","乙"]','["甲","甲","丙"]'])for(const indent of ['','    '])for(const a of ['release','register'])for(const b of ['release','register'])for(const arg1 of ['monk','"甲"','"乙"','"丙"'])for(const arg2 of ['monk','"甲"','"乙"','"丙"'])codes.push(`monks = ${list}\nfor monk in monks:\n    ${a}(${arg1})\n${indent}${b}(${arg2})`);
  const harness=readFileSync('src/workers/weekFiveMonksPython.worker.ts','utf8').split('const HARNESS = String.raw`')[1]!.split('`;')[0]!;
  const bad=['import os','while True:\n    pass',solved.replace('release(monk)','__import__("os")'),solved.replace('monks:', 'monks*1000:'),solved.replace('release(monk)','open("file")')];
  const script="import json,sys\nd=json.load(sys.stdin)\nout=[]\nfor code in d['codes']:\n env={'candidate_code':code}\n exec(d['harness'],env)\n out.append(json.loads(env['result_json']))\nfor code in d['bad']:\n try: exec(d['harness'],{'candidate_code':code})\n except Exception: continue\n raise Exception('unsafe accepted')\nprint(json.dumps(out,ensure_ascii=False))";
  const result=spawnSync('/opt/homebrew/bin/python3.12',['-c',script],{input:JSON.stringify({harness,codes,bad}),encoding:'utf8',maxBuffer:8*1024*1024});expect(result.status,result.stderr).toBe(0);const traces=JSON.parse(result.stdout);expect(codes).toHaveLength(768);codes.forEach((code,i)=>expect(traces[i]).toEqual(parsed(code).trace));
 });
});
