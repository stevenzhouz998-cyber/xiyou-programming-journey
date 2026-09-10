import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {parseWeekFourBossPython} from './weekFourBossPythonGrammar';
it('independent Python AST and execution match all 24 legal station programs in both rounds',()=>{
 const programs:string[]=[];
 for(const source of ['read_identity(card)','read_appearance(card)','"白骨精"'])for(const op of ['==','!='])for(const yes of ['keep_observing','polite_help'])for(const no of ['keep_observing','polite_help'])programs.push(`for card in cards:\n    identity = ${source}\n    if identity ${op} "白骨精":\n        ${yes}(card)\n    else:\n        ${no}(card)`);
 const harness=readFileSync('src/workers/weekFourBossPython.worker.ts','utf8').split('const HARNESS = String.raw`')[1]!.split('`;')[0]!;
 const bad=['import os','while True:\n    pass',programs[0]!.replace('read_identity(card)','__import__("os")'),programs[0]!.replace('for card in cards:', 'for card in cards*1000:')];
 const script=`import json,sys\ndata=json.load(sys.stdin)\noutput=[]\nfor code in data['codes']:\n    env={'candidate_code':code}\n    exec(data['harness'],env)\n    output.append(json.loads(env['result_json']))\nfor code in data['bad']:\n    try:\n        exec(data['harness'],{'candidate_code':code})\n    except Exception:\n        continue\n    raise Exception('unsafe accepted')\nprint(json.dumps(output,ensure_ascii=False))`;
 const result=spawnSync('python3',['-c',script],{input:JSON.stringify({harness,codes:programs,bad}),encoding:'utf8'});expect(result.status,result.stderr).toBe(0);
 const traces=JSON.parse(result.stdout);for(const [i,code] of programs.entries()){const parsed=parseWeekFourBossPython(code);if('state'in parsed)throw Error();expect(traces[i]).toEqual(parsed.trace);}
});
