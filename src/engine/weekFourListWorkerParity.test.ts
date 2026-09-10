import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { parseWeekFourListPython } from './weekFourListPythonGrammar';
it('independent Python AST and execution match all 1456 bounded list/record programs',()=>{
  const programs:string[]=[];let lists:string[][]=[[]];const values=['女子','老妇','老翁'];
  for(let length=0;length<=5;length++) {
    for(const list of lists)for(const arg of ['item',...values.map(x=>JSON.stringify(x))])programs.push(`appearances = [${list.map(x=>JSON.stringify(x)).join(', ')}]\nfor item in appearances:\n    print(${arg})`);
    lists=lists.flatMap(xs=>values.map(x=>[...xs,x]));
  }
  expect(programs).toHaveLength(1456);
  const source=readFileSync('src/workers/weekFourListPython.worker.ts','utf8');const harness=source.split('const HARNESS = String.raw`')[1]!.split('`;')[0]!;
  const script=`import json,sys\ndata=json.load(sys.stdin)\noutput=[]\nfor code in data['codes']:\n    env={'candidate_code':code}\n    exec(data['harness'],env)\n    output.append(json.loads(env['result_json']))\nprint(json.dumps(output,ensure_ascii=False))`;
  const result=spawnSync('python3',['-c',script],{input:JSON.stringify({harness,codes:programs}),encoding:'utf8',maxBuffer:4*1024*1024});
  expect(result.status,result.stderr).toBe(0);const traces=JSON.parse(result.stdout);
  for(const [i,code] of programs.entries()){const parsed=parseWeekFourListPython(code);if('state' in parsed)throw Error(code);expect(traces[i]).toEqual(parsed.trace);}
});
