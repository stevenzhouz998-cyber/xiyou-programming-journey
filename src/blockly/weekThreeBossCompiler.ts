import {
  WEEK_THREE_BOSS_MISSION_ID,
  WEEK_THREE_BOSS_COORDINATE_LIMIT,
  WEEK_THREE_BOSS_STAGES,
  type WeekThreeBossInstruction,
  type WeekThreeBossWorkspaceBlock,
  type WeekThreeBossWorkspaceDraftV1,
  runWeekThreeBossDraft,
} from './weekThreeBossContract';

export interface WeekThreeBossCompileDiagnostic { code: 'invalid-draft'|'invalid-coordinate'|'missing-stage'|'nonreciprocal-link'|'invalid-root'|'duplicate-id'|'missing-input'|'illegal-operator'|'cycle'|'wrong-parent'|'unknown-block'|'orphan'|'disconnected'; sourceBlockId: string|null; }
export type WeekThreeBossCompileResult={ok:true;draft:WeekThreeBossWorkspaceDraftV1;trace:WeekThreeBossInstruction[];diagnostics:[]}|{ok:false;draft:null;trace:[];diagnostics:WeekThreeBossCompileDiagnostic[]};
const fail=(code:WeekThreeBossCompileDiagnostic['code'],sourceBlockId:string|null):WeekThreeBossCompileResult=>({ok:false,draft:null,trace:[],diagnostics:[{code,sourceBlockId}]});
const plain=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x)&&(Object.getPrototypeOf(x)===Object.prototype||Object.getPrototypeOf(x)===null);
const blockKeys=['id','type','fields','inputs','parentBlockId','parentInputName','previousId','nextId','x','y'] as const;
const clamp=(value:number)=>Math.max(-WEEK_THREE_BOSS_COORDINATE_LIMIT,Math.min(WEEK_THREE_BOSS_COORDINATE_LIMIT,value));
type BlockRule={type:WeekThreeBossWorkspaceBlock['type'];fields:Record<string,readonly string[]>;inputs:Record<string,string>;parent:string|null;parentInput:string|null;previous:string|null;next:string|null};
const rule=(type:BlockRule['type'],fields:BlockRule['fields'],inputs:BlockRule['inputs'],parent:string|null,parentInput:string|null,previous:string|null,next:string|null):BlockRule=>({type,fields,inputs,parent,parentInput,previous,next});
const RULES:Record<string,BlockRule>={
  'boss-run-all':rule('w3_boss_root',{}, {STAGES:'boss-manor-request'},null,null,null,null),
  'boss-manor-request':rule('w3_boss_stage',{STAGE:['manor-request']},{BODY:'manor-if'},'boss-run-all','STAGES',null,'boss-cuilan-disguise'),
  'boss-cuilan-disguise':rule('w3_boss_stage',{STAGE:['cuilan-disguise']},{BODY:'cuilan-appearance-if'},'boss-run-all','STAGES','boss-manor-request','boss-yunzhan-dialogue'),
  'boss-yunzhan-dialogue':rule('w3_boss_stage',{STAGE:['yunzhan-dialogue']},{BODY:'yunzhan-if'},'boss-run-all','STAGES','boss-cuilan-disguise','boss-bajie-joining'),
  'boss-bajie-joining':rule('w3_boss_stage',{STAGE:['bajie-joining']},{BODY:'joining-if'},'boss-run-all','STAGES','boss-yunzhan-dialogue',null),
  'manor-if':rule('w3_boss_if',{}, {CONDITION:'manor-condition',THEN:'manor-then-action',ELSE:'manor-else-action'},'boss-manor-request','BODY',null,null),
  'manor-condition':rule('w3_boss_condition_mentions_gaolao',{}, {},'manor-if','CONDITION',null,null),
  'manor-then-action':rule('w3_boss_action',{ACTION:['accept-demon-help']},{},'manor-if','THEN',null,null),
  'manor-else-action':rule('w3_boss_action',{ACTION:['continue-directions']},{},'manor-if','ELSE',null,null),
  'cuilan-appearance-if':rule('w3_boss_if',{}, {CONDITION:'cuilan-appearance-condition',THEN:'cuilan-appearance-then',ELSE:'cuilan-appearance-else'},'boss-cuilan-disguise','BODY',null,'cuilan-identity-if'),
  'cuilan-appearance-condition':rule('w3_boss_condition_appearance_matches_cuilan',{}, {},'cuilan-appearance-if','CONDITION',null,null),
  'cuilan-appearance-then':rule('w3_boss_action',{ACTION:['keep-disguise']},{},'cuilan-appearance-if','THEN',null,null),
  'cuilan-appearance-else':rule('w3_boss_action',{ACTION:['reveal-wukong-and-chase']},{},'cuilan-appearance-if','ELSE',null,null),
  'cuilan-identity-if':rule('w3_boss_if',{}, {CONDITION:'cuilan-identity-condition',THEN:'cuilan-identity-then',ELSE:'cuilan-identity-else'},'boss-cuilan-disguise','BODY','cuilan-appearance-if',null),
  'cuilan-identity-condition':rule('w3_boss_condition_appearance_matches_cuilan',{}, {},'cuilan-identity-if','CONDITION',null,null),
  'cuilan-identity-then':rule('w3_boss_action',{ACTION:['keep-disguise']},{},'cuilan-identity-if','THEN',null,null),
  'cuilan-identity-else':rule('w3_boss_action',{ACTION:['reveal-wukong-and-chase']},{},'cuilan-identity-if','ELSE',null,null),
  'yunzhan-if':rule('w3_boss_if',{}, {CONDITION:'yunzhan-condition',THEN:'yunzhan-then-action',ELSE:'yunzhan-else-action'},'boss-yunzhan-dialogue','BODY',null,null),
  'yunzhan-condition':rule('w3_boss_condition_pilgrimage_explicit',{}, {},'yunzhan-if','CONDITION',null,null),
  'yunzhan-then-action':rule('w3_boss_action',{ACTION:['guard-cave']},{},'yunzhan-if','THEN',null,null),
  'yunzhan-else-action':rule('w3_boss_action',{ACTION:['explain-guanyin-origin']},{},'yunzhan-if','ELSE',null,null),
  'joining-if':rule('w3_boss_if',{}, {CONDITION:'joining-combine',THEN:'joining-then-action',ELSE:'joining-else-action'},'boss-bajie-joining','BODY',null,null),
  'joining-combine':rule('w3_boss_combine',{OPERATOR:['and','or']},{LEFT:'joining-precepts-condition',RIGHT:'joining-willing-condition'},'joining-if','CONDITION',null,null),
  'joining-precepts-condition':rule('w3_boss_condition_guanyin_precepts',{}, {},'joining-combine','LEFT',null,null),
  'joining-willing-condition':rule('w3_boss_condition_willing_westward',{}, {},'joining-combine','RIGHT',null,null),
  'joining-then-action':rule('w3_boss_action',{ACTION:['formally-join-team']},{},'joining-if','THEN',null,null),
  'joining-else-action':rule('w3_boss_action',{ACTION:['continue-verification']},{},'joining-if','ELSE',null,null),
};
const movableInputs = new Set([
  'manor-if.CONDITION',
  'cuilan-identity-if.CONDITION',
  'yunzhan-if.THEN',
  'yunzhan-if.ELSE',
]);
const yunzhanActionIds = new Set(['yunzhan-then-action', 'yunzhan-else-action']);
const movable = new Set(['yunzhan-then-action', 'yunzhan-else-action']);
const conditionTypes = new Set<WeekThreeBossWorkspaceBlock['type']>(['w3_boss_condition_mentions_gaolao','w3_boss_condition_explicit_demon_help','w3_boss_condition_appearance_matches_cuilan','w3_boss_condition_identity_is_cuilan','w3_boss_condition_pilgrimage_explicit','w3_boss_condition_guanyin_precepts','w3_boss_condition_willing_westward']);
const exactKeys=(value:Record<string,unknown>,keys:readonly string[])=>Object.keys(value).length===keys.length&&keys.every((key)=>Object.prototype.hasOwnProperty.call(value,key));
const validReference=(value:unknown):value is string|null=>value===null||(typeof value==='string'&&value.length>0&&value.length<=128);
const references=(item:WeekThreeBossWorkspaceBlock)=>[item.parentBlockId,item.previousId,item.nextId,...Object.values(item.inputs)].filter((value):value is string=>value!==null);
const hasCycle=(map:Map<string,WeekThreeBossWorkspaceBlock>):string|null=>{const active=new Set<string>(),done=new Set<string>();const visit=(id:string):string|null=>{if(active.has(id))return id;if(done.has(id))return null;active.add(id);const item=map.get(id)!;for(const target of [...Object.values(item.inputs),item.nextId])if(target){const cycle=visit(target);if(cycle)return cycle;}active.delete(id);done.add(id);return null;};for(const id of map.keys()){const cycle=visit(id);if(cycle)return cycle;}return null;};
export function compileWeekThreeBossDraft(value:unknown):WeekThreeBossCompileResult {
  if(!plain(value)||!exactKeys(value,['version','missionId','blocks'])||value.version!==1||value.missionId!==WEEK_THREE_BOSS_MISSION_ID||!Array.isArray(value.blocks))return fail('invalid-draft',null);
  const source=value as unknown as WeekThreeBossWorkspaceDraftV1,map=new Map<string,WeekThreeBossWorkspaceBlock>();
  for(const item of source.blocks){
    if(!plain(item)||!exactKeys(item,blockKeys)||typeof item.id!=='string'||!item.id||item.id.length>128||typeof item.type!=='string'||!plain(item.fields)||!plain(item.inputs)||!validReference(item.parentBlockId)||!validReference(item.parentInputName)||!validReference(item.previousId)||!validReference(item.nextId)||typeof item.x!=='number'||typeof item.y!=='number')return fail('invalid-draft',plain(item)&&typeof item.id==='string'?item.id:null);
    if(!Number.isFinite(item.x)||!Number.isFinite(item.y))return fail('invalid-coordinate',item.id);
    if(map.has(item.id))return fail('duplicate-id',item.id);
    if((RULES[item.id] && RULES[item.id].type!==item.type) || (!RULES[item.id] && !conditionTypes.has(item.type)))return fail('unknown-block',item.id);
    map.set(item.id,{...item,x:clamp(item.x),y:clamp(item.y)} as WeekThreeBossWorkspaceBlock);
  }
  for(const id of Object.keys(RULES).filter((id)=>id!=='manor-condition'&&id!=='cuilan-identity-condition'))if(!map.has(id))return fail('missing-stage',id.startsWith('boss-') ? id : null);
  for(const item of map.values())for(const target of references(item))if(!map.has(target))return fail('unknown-block',target);
  const cycle=hasCycle(map);if(cycle)return fail('cycle',cycle);
  for(const item of map.values()){
    if(!RULES[item.id]) {
      if(!exactKeys(item.fields,[])||!exactKeys(item.inputs,[])||item.previousId!==null||item.nextId!==null) return fail('invalid-draft',item.id);
      continue;
    }
    const spec=RULES[item.id]!;
    if(!exactKeys(item.fields,Object.keys(spec.fields)))return fail('invalid-draft',item.id);
    if(!exactKeys(item.inputs,Object.keys(spec.inputs))){const missing=Object.keys(spec.inputs).some((name)=>!Object.prototype.hasOwnProperty.call(item.inputs,name));return fail(missing?'missing-input':'invalid-draft',item.id);}
    for(const [name,allowed] of Object.entries(spec.fields))if(typeof item.fields[name]!=='string'||!allowed.includes(item.fields[name]!))return fail(name==='OPERATOR'?'illegal-operator':'invalid-draft',item.id);
    if(!movable.has(item.id) && (item.parentBlockId!==spec.parent||item.parentInputName!==spec.parentInput))return fail(item.id==='boss-run-all'?'invalid-root':'wrong-parent',item.id);
    if(item.previousId!==spec.previous||item.nextId!==spec.next)return fail('nonreciprocal-link',item.id);
    for(const [name,target] of Object.entries(spec.inputs)){
      const actual=item.inputs[name]; const movableInput=movableInputs.has(`${item.id}.${name}`);
      if(actual===null)return fail('missing-input',item.id);
      if(!movableInput && actual!==target)return fail('wrong-parent',actual??item.id);
    }
  }
  const conditionKind = (type: WeekThreeBossWorkspaceBlock['type']) => type.replace('w3_boss_condition_', '').replaceAll('_', '-');
  const validateCondition = (parentId:string, kinds:readonly string[]) => { const selected=map.get(parentId)!.inputs.CONDITION; const item=selected ? map.get(selected) : undefined; if(!item||!conditionTypes.has(item.type)||!kinds.includes(conditionKind(item.type))||item.parentBlockId!==parentId||item.parentInputName!=='CONDITION'||item.previousId!==null||item.nextId!==null)return fail('wrong-parent',selected??parentId); return null; };
  const manor=validateCondition('manor-if',['mentions-gaolao','explicit-demon-help']); if(manor)return manor;
  const identity=validateCondition('cuilan-identity-if',['appearance-matches-cuilan','identity-is-cuilan']); if(identity)return identity;
  for(const input of ['THEN','ELSE'] as const){const selected=map.get('yunzhan-if')!.inputs[input];const item=selected?map.get(selected):undefined;if(!item||!yunzhanActionIds.has(selected!)||item.parentBlockId!=='yunzhan-if'||item.parentInputName!==input)return fail('wrong-parent',selected??'yunzhan-if');}
  const root=map.get('boss-run-all')!;if(root.parentBlockId!==null||root.parentInputName!==null)return fail('invalid-root',root.id);
  const reachable=new Set<string>(); const walk=(id:string)=>{if(reachable.has(id))return;reachable.add(id);const item=map.get(id)!;for(const target of [...Object.values(item.inputs),item.nextId])if(target)walk(target);}; walk(root.id);
  const orphan=[...map.keys()].find((id)=>!reachable.has(id)); if(orphan)return fail('orphan',orphan);
  const draft={version:1 as const,missionId:WEEK_THREE_BOSS_MISSION_ID,blocks:[...map.values()]};
  const run=runWeekThreeBossDraft(draft);return {ok:true,draft:structuredClone(draft),trace:run.trace,diagnostics:[]};
}
