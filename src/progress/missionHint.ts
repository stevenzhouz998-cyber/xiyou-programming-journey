import type { ExecutableMissionId, MissionSession } from './types';
export const loadedMissionSessionFactory:{value?:((id:ExecutableMissionId,now:string)=>MissionSession)}={};
export function recordHint<T extends MissionSession>(session:T,tier:'observe'|'think'|'partial',now:string):T{if(new Date(now).toJSON()!==now)throw Error('会话时间必须是有效ISO UTC日期');const next=structuredClone(session);if(!next.usedHintTiers.includes(tier))next.usedHintTiers.push(tier);next.savedAt=now;return next}
