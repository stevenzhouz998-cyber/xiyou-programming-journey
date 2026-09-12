import type { MissionProgress } from '../progress/types';

const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export const sameData=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);
export const isPlainRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.getPrototypeOf(value)===Object.prototype;
export const hasExactKeys=(value:Record<string,unknown>,expected:readonly string[])=>Reflect.ownKeys(value).length===expected.length&&Reflect.ownKeys(value).every(key=>typeof key==='string'&&expected.includes(key));
export const isUtcIso=(value:unknown):value is string=>typeof value==='string'&&UTC.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
export const isSafeCount=(value:unknown):value is number=>Number.isSafeInteger(value)&&(value as number)>=0;
export function isLegacyReplayEvidence(value:Record<string,unknown>,mission:MissionProgress|undefined,work:unknown,maxRevision:number){
 return !!mission&&hasExactKeys(value,['kind','completedAt','sourceVersion','sourceSchemaRevision'])&&value.kind==='legacy-replay-only'&&isUtcIso(value.completedAt)&&value.completedAt===mission.completedAt&&!work&&((value.sourceVersion===1&&value.sourceSchemaRevision===null)||(value.sourceVersion===2&&value.sourceSchemaRevision===1)||(value.sourceVersion===3&&isSafeCount(value.sourceSchemaRevision)&&(value.sourceSchemaRevision as number)>0&&(value.sourceSchemaRevision as number)<maxRevision));
}
