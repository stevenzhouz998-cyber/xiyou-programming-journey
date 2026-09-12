/* Dedicated W6-M1 Worker: candidate Python is data; only this allowlisted harness executes it. */
const scope = self as unknown as DedicatedWorkerGlobalScope;
export {};
let runtimePromise: Promise<any> | null = null;
const HARNESS = String.raw`
import ast, json, re
def validate_and_run(code):
    if not isinstance(code, str) or len(code) > 1200 or re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', code): raise ValueError('草稿文本无效')
    tree = ast.parse(code.replace('\r\n','\n'))
    allowed=(ast.Module,ast.Assign,ast.Name,ast.Store,ast.Load,ast.List,ast.Dict,ast.Constant,ast.For,ast.Expr,ast.Call,ast.Subscript)
    if any(type(node) not in allowed for node in ast.walk(tree)): raise ValueError('不允许的语法')
    if len(tree.body)!=2 or not isinstance(tree.body[0],ast.Assign) or not isinstance(tree.body[1],ast.For): raise ValueError('程序结构无效')
    assignment,loop=tree.body
    if len(assignment.targets)!=1 or not isinstance(assignment.targets[0],ast.Name) or assignment.targets[0].id!='records' or not isinstance(assignment.value,ast.List) or len(assignment.value.elts)!=3: raise ValueError('records 必须是三条列表记录')
    records=[]
    for item in assignment.value.elts:
        if not isinstance(item,ast.Dict) or len(item.keys)!=2 or any(not isinstance(v,ast.Constant) or not isinstance(v.value,str) for v in item.keys+item.values): raise ValueError('每条记录必须有两个文本字段')
        keys=[v.value for v in item.keys]
        if len(set(keys))!=2 or set(keys)!={'第几调','经过'}: raise ValueError('字段缺失或重复')
        data=dict(zip(keys,[v.value for v in item.values])); records.append({'attempt':data['第几调'],'story':data['经过']})
    if not isinstance(loop.target,ast.Name) or loop.target.id!='record' or not isinstance(loop.iter,ast.Name) or loop.iter.id!='records' or len(loop.body)!=1 or loop.orelse: raise ValueError('循环结构无效')
    statement=loop.body[0]
    if not isinstance(statement,ast.Expr) or not isinstance(statement.value,ast.Call): raise ValueError('循环体必须调用记录 API')
    call=statement.value
    if not isinstance(call.func,ast.Name) or call.func.id!='record_attempt' or len(call.args)!=2 or call.keywords: raise ValueError('记录 API 无效')
    fields=[]
    for arg in call.args:
        if not isinstance(arg,ast.Subscript) or not isinstance(arg.value,ast.Name) or arg.value.id!='record' or not isinstance(arg.slice,ast.Constant) or arg.slice.value not in ('第几调','经过'): raise ValueError('参数必须读取当前记录字段')
        fields.append(arg.slice.value)
    events=[{'kind':'records-defined','records':records,'line':assignment.lineno,'order':1},{'kind':'loop-started','variable':'record','source':'records','line':loop.lineno,'order':2}]
    state={'iteration':0}
    def record_attempt(first,second):
        state['iteration']+=1; i=state['iteration']; current=records[i-1]
        values={'第几调':current['attempt'],'经过':current['story']}
        if first!=values[fields[0]] or second!=values[fields[1]]: raise ValueError('字段运行结果不一致')
        events.extend([{'kind':'field-read','iteration':i,'field':fields[0],'value':first,'argument':1,'line':statement.lineno,'order':len(events)+1},{'kind':'field-read','iteration':i,'field':fields[1],'value':second,'argument':2,'line':statement.lineno,'order':len(events)+2},{'kind':'action','action':'record_attempt','iteration':i,'attempt':first,'story':second,'line':statement.lineno,'order':len(events)+3}])
    env={'__builtins__':{},'record_attempt':record_attempt}
    exec(compile(tree,'<w6-m1>','exec'),env,env)
    if state['iteration']!=3: raise ValueError('循环未处理三条记录')
    return events
result_json=json.dumps(validate_and_run(candidate_code),ensure_ascii=False)
`;
async function runtime(){
  if(!runtimePromise){const workerUrl=new URL(self.location.href);const marker=workerUrl.pathname.includes('/src/workers/')?'/src/workers/':'/assets/';const markerIndex=workerUrl.pathname.lastIndexOf(marker);if(markerIndex<0)throw Error('W6-M1 Worker path does not expose the application base.');const runtimeBase=new URL(`${workerUrl.pathname.slice(0,markerIndex+1)}runtime/pyodide-314.0.2/`,workerUrl.origin);if(runtimeBase.origin!==self.location.origin)throw Error('Pyodide runtime must resolve from this Worker origin.');const moduleUrl=new URL('pyodide.mjs',runtimeBase);runtimePromise=import(/* @vite-ignore */moduleUrl.href).then((module)=>module.loadPyodide({indexURL:runtimeBase.href}));}return runtimePromise;
}
runtime().then(()=>scope.postMessage({type:'ready'})).catch((error)=>scope.postMessage({type:'load-error',error:error instanceof Error?error.message:String(error)}));
scope.onmessage=async(event:MessageEvent<unknown>)=>{const message=event.data;if(!message||typeof message!=='object'||Array.isArray(message))return;const record=message as Record<string,unknown>;if(Object.keys(record).sort().join(',')!=='code,requestId,type'||record.type!=='run'||!Number.isSafeInteger(record.requestId)||(record.requestId as number)<1||typeof record.code!=='string')return;const requestId=record.requestId as number;try{const pyodide=await runtime();pyodide.globals.set('candidate_code',record.code);await pyodide.runPythonAsync(HARNESS);const json=pyodide.globals.get('result_json');scope.postMessage({type:'result',requestId,trace:JSON.parse(String(json))});}catch(error){scope.postMessage({type:'error',requestId,error:error instanceof Error?error.message:String(error)});}finally{try{const pyodide=await runtime();pyodide.globals.delete('candidate_code');pyodide.globals.delete('result_json');await pyodide.runPythonAsync("globals().pop('validate_and_run',None)");}catch{}}};
