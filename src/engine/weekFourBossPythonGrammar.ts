import {WEEK_FOUR_BOSS_CARDS,WEEK_FOUR_BOSS_ROUNDS,runWeekFourBossTrace,type WeekFourBossTraceItem} from './weekFourBossContract';
export const DEFAULT_WEEK_FOUR_BOSS_PYTHON='for card in cards:\n    identity = read_appearance(card)\n    if identity == "白骨精":\n        keep_observing(card)\n    else:\n        keep_observing(card)';
export function parseWeekFourBossDraftEnvelope(code:unknown):{code:string;normalizedCode:string}{
 if(typeof code!=='string'||code.length>512||/\r(?!\n)/.test(code)||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cf}\u2028\u2029]/u.test(code))throw Error('核验站草稿需要是512字以内的普通文本。');
 return {code,normalizedCode:code.replaceAll('\r\n','\n')};
}
export type WeekFourBossPythonInvalid={state:'python-structure-invalid';line:number;reason:'contract'};
export interface WeekFourBossPythonRunnable {pythonCode:string;normalizedCode:string;structure:'identity'|'appearance'|'literal';trace:WeekFourBossTraceItem[];run:ReturnType<typeof runWeekFourBossTrace>}
export function parseWeekFourBossPython(code:unknown):WeekFourBossPythonRunnable|WeekFourBossPythonInvalid {
 const draft=parseWeekFourBossDraftEnvelope(code);const lines=draft.normalizedCode.split('\n');
 const invalid=(line:number):WeekFourBossPythonInvalid=>({state:'python-structure-invalid',line,reason:'contract'});
 if(lines.length!==6||lines[0]!=='for card in cards:')return invalid(1);
 const assignment=/^    identity = (read_identity\(card\)|read_appearance\(card\)|"白骨精"|'白骨精')$/.exec(lines[1]!);if(!assignment)return invalid(2);
 const condition=/^    if identity (==|!=) (?:"白骨精"|'白骨精'):$/.exec(lines[2]!);if(!condition)return invalid(3);
 const action=/^        (keep_observing|polite_help)\(card\)$/;const yes=action.exec(lines[3]!);if(!yes)return invalid(4);
 if(lines[4]!=='    else:')return invalid(5);const no=action.exec(lines[5]!);if(!no)return invalid(6);
 const structure=assignment[1]==='read_identity(card)'?'identity':assignment[1]==='read_appearance(card)'?'appearance':'literal';
 const trace:WeekFourBossTraceItem[]=WEEK_FOUR_BOSS_ROUNDS.flatMap((round,r)=>round.map((id,index)=>{
  const card=WEEK_FOUR_BOSS_CARDS.find(c=>c.id===id)!;const identity=structure==='literal'?'白骨精':card[structure];const matched=condition[1]==='=='?identity==='白骨精':identity!=='白骨精';
  return {kind:'verification',round:r+1,index,cardId:id,identity,condition:matched,action:(matched?yes[1]:no[1]) as WeekFourBossTraceItem['action'],order:r*4+index+1};
 }));
 return {pythonCode:draft.code,normalizedCode:draft.normalizedCode,structure,trace,run:runWeekFourBossTrace(trace)};
}
