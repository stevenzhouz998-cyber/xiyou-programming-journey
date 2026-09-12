export const MISSION_ORDER=Array.from({length:30},(_,index)=>`w${Math.floor(index/5)+1}-m${index%5+1}`);
export const MISSION_IDS=new Set(MISSION_ORDER);
