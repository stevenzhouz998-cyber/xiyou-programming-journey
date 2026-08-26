export const HEAVENLY_SIGNAL_BOSS_MISSION_ID = 'w2-m5' as const;
export const HEAVENLY_SIGNAL_QUEUE = ['stable-duty', 'returned-flower-fruit', 'heavenly-title', 'peach-message', 'furnace-refining'] as const;
export type HeavenlySignalEventType = typeof HEAVENLY_SIGNAL_QUEUE[number];
export type HeavenlySignalBossState = 'awaiting-stable' | 'post-accepted' | 'horses-cared-1' | 'horses-cared-2' | 'horses-cared-3' | 'rank-learned' | 'returned' | 'flag-raised' | 'title-accepted' | 'residence-built' | 'garden-guarded' | 'banquet-learned' | 'banquet-visited' | 'tusita-entered' | 'elixir-eaten' | 'furnace-entered' | 'sheltered-in-xun' | 'furnace-waiting' | 'furnace-open' | 'escaped';

export type HeavenlySignalBossBlockType =
  | 'xiyou_boss_on_stable_duty' | 'xiyou_boss_on_returned_flower_fruit' | 'xiyou_boss_on_heavenly_title' | 'xiyou_boss_on_peach_message' | 'xiyou_boss_on_furnace_refining'
  | 'xiyou_boss_accept_stable_post' | 'xiyou_boss_repeat_horse_care' | 'xiyou_boss_care_next_horse' | 'xiyou_boss_learn_stable_rank' | 'xiyou_boss_leave_heaven'
  | 'xiyou_boss_raise_great_sage_flag' | 'xiyou_boss_accept_great_sage_title' | 'xiyou_boss_build_great_sage_residence'
  | 'xiyou_boss_guard_peach_garden' | 'xiyou_boss_learn_peach_banquet' | 'xiyou_boss_drink_at_banquet' | 'xiyou_boss_stumble_into_tusita' | 'xiyou_boss_eat_golden_elixir'
  | 'xiyou_boss_enter_furnace' | 'xiyou_boss_shelter_xun' | 'xiyou_boss_repeat_until_furnace_ready' | 'xiyou_boss_wait_seven_days' | 'xiyou_boss_observe_furnace' | 'xiyou_boss_escape_furnace' | 'xiyou_boss_topple_furnace'
  | 'xiyou_boss_condition_red_eyes' | 'xiyou_boss_condition_furnace_open' | 'xiyou_boss_condition_smoke_clears';

export interface HeavenlySignalBossWorkspaceBlock {
  id: string;
  type: HeavenlySignalBossBlockType;
  previousId: string | null;
  nextId: string | null;
  parentBlockId: string | null;
  handlerBlockId: string;
  repeatCount: number | null;
  conditionBlockId: string | null;
  x: number;
  y: number;
}
export interface HeavenlySignalBossWorkspaceDraftV1 { version: 1; missionId: typeof HEAVENLY_SIGNAL_BOSS_MISSION_ID; blocks: HeavenlySignalBossWorkspaceBlock[]; }

const handlers: Record<HeavenlySignalEventType, HeavenlySignalBossBlockType> = {
  'stable-duty': 'xiyou_boss_on_stable_duty',
  'returned-flower-fruit': 'xiyou_boss_on_returned_flower_fruit',
  'heavenly-title': 'xiyou_boss_on_heavenly_title',
  'peach-message': 'xiyou_boss_on_peach_message',
  'furnace-refining': 'xiyou_boss_on_furnace_refining',
};
const handlerEvent = (type: HeavenlySignalBossBlockType): HeavenlySignalEventType | null => (Object.entries(handlers).find(([, candidate]) => candidate === type)?.[0] ?? null) as HeavenlySignalEventType | null;
const conditions = new Set<HeavenlySignalBossBlockType>(['xiyou_boss_condition_red_eyes', 'xiyou_boss_condition_furnace_open', 'xiyou_boss_condition_smoke_clears']);
const actionOpcode: Partial<Record<HeavenlySignalBossBlockType, string>> = {
  xiyou_boss_accept_stable_post: 'accept_stable_post', xiyou_boss_care_next_horse: 'care_next_horse', xiyou_boss_learn_stable_rank: 'learn_stable_rank', xiyou_boss_leave_heaven: 'leave_heaven',
  xiyou_boss_raise_great_sage_flag: 'raise_great_sage_flag', xiyou_boss_accept_great_sage_title: 'accept_great_sage_title', xiyou_boss_build_great_sage_residence: 'build_great_sage_residence',
  xiyou_boss_guard_peach_garden: 'guard_peach_garden', xiyou_boss_learn_peach_banquet: 'learn_peach_banquet', xiyou_boss_drink_at_banquet: 'drink_at_banquet', xiyou_boss_stumble_into_tusita: 'stumble_into_tusita', xiyou_boss_eat_golden_elixir: 'eat_golden_elixir',
  xiyou_boss_enter_furnace: 'enter_furnace', xiyou_boss_shelter_xun: 'shelter_xun', xiyou_boss_wait_seven_days: 'wait_seven_days', xiyou_boss_observe_furnace: 'observe_furnace', xiyou_boss_escape_furnace: 'escape_furnace', xiyou_boss_topple_furnace: 'topple_furnace',
};
const loopTypes = new Set<HeavenlySignalBossBlockType>(['xiyou_boss_repeat_horse_care', 'xiyou_boss_repeat_until_furnace_ready']);
const expectedActionTypes = Object.keys(actionOpcode) as HeavenlySignalBossBlockType[];

export type HeavenlySignalBossInstructionKind = 'event-dispatch' | 'handler-entered' | 'action' | 'loop-started' | 'loop-finished' | 'condition-checked' | 'handler-finished';
export type HeavenlySignalConditionKind = 'red-eyes' | 'furnace-open' | 'smoke-clears';
export interface HeavenlySignalBossInstruction {
  instructionId: string; kind: HeavenlySignalBossInstructionKind; eventId: string; eventType: HeavenlySignalEventType; dispatchIndex: number; handlerBlockId: string;
  sourceBlockId: string | null; parentBlockId: string | null; opcode: string | null; iteration: number | null; repeatCount: number | null; conditionSourceBlockId: string | null; conditionKind: HeavenlySignalConditionKind | null; elapsedDays: number;
}
export interface HeavenlySignalBossDiagnostic { concept: 'program-structure' | 'loop-count' | 'event-routing' | 'handler-sequence' | 'sequence-precondition' | 'loop-condition' | 'condition-never-met' | 'completeness'; sourceBlockId: string | null; state: HeavenlySignalBossState; }
export interface HeavenlySignalBossRuntimeEvent { type: 'instruction-accepted' | 'instruction-rejected' | 'canon-epilogue'; sourceBlockId: string | null; state: HeavenlySignalBossState; }
export interface HeavenlySignalBossRunResult { completed: boolean; finalState: HeavenlySignalBossState; caredHorses: number; furnaceRounds: number; elapsedDays: number; diagnostic: HeavenlySignalBossDiagnostic | null; events: HeavenlySignalBossRuntimeEvent[]; penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 }; }

const make = (id: string, type: HeavenlySignalBossBlockType, handlerBlockId: string, parentBlockId: string | null, previousId: string | null, nextId: string | null, repeatCount: number | null = null, conditionBlockId: string | null = null): HeavenlySignalBossWorkspaceBlock => ({ id, type, handlerBlockId, parentBlockId, previousId, nextId, repeatCount, conditionBlockId, x: 20, y: 20 });
export function createDefaultHeavenlySignalBossDraft(): HeavenlySignalBossWorkspaceDraftV1 {
  const stable = 'stable-handler', returned = 'return-handler', title = 'title-handler', peach = 'peach-handler', furnace = 'furnace-handler';
  return { version: 1, missionId: HEAVENLY_SIGNAL_BOSS_MISSION_ID, blocks: [
    make(stable, handlers['stable-duty'], stable, null, null, null), make('accept-post', 'xiyou_boss_accept_stable_post', stable, stable, null, 'stable-repeat'), make('stable-repeat', 'xiyou_boss_repeat_horse_care', stable, stable, 'accept-post', 'learn-rank', 2), make('care-horse', 'xiyou_boss_care_next_horse', stable, 'stable-repeat', null, null), make('learn-rank', 'xiyou_boss_learn_stable_rank', stable, stable, 'stable-repeat', 'leave-heaven'), make('leave-heaven', 'xiyou_boss_leave_heaven', stable, stable, 'learn-rank', null),
    make(returned, handlers['returned-flower-fruit'], returned, null, null, null), make('accept-title', 'xiyou_boss_accept_great_sage_title', returned, returned, null, null),
    make(title, handlers['heavenly-title'], title, null, null, null), make('raise-flag', 'xiyou_boss_raise_great_sage_flag', title, title, null, 'build-residence'), make('build-residence', 'xiyou_boss_build_great_sage_residence', title, title, 'raise-flag', null),
    make(peach, handlers['peach-message'], peach, null, null, null), make('guard-garden', 'xiyou_boss_guard_peach_garden', peach, peach, null, 'learn-banquet'), make('learn-banquet', 'xiyou_boss_learn_peach_banquet', peach, peach, 'guard-garden', 'drink-banquet'), make('drink-banquet', 'xiyou_boss_drink_at_banquet', peach, peach, 'learn-banquet', 'eat-elixir'), make('eat-elixir', 'xiyou_boss_eat_golden_elixir', peach, peach, 'drink-banquet', 'stumble-tusita'), make('stumble-tusita', 'xiyou_boss_stumble_into_tusita', peach, peach, 'eat-elixir', null),
    make(furnace, handlers['furnace-refining'], furnace, null, null, null), make('enter-furnace', 'xiyou_boss_enter_furnace', furnace, furnace, null, 'shelter-xun'), make('shelter-xun', 'xiyou_boss_shelter_xun', furnace, furnace, 'enter-furnace', 'furnace-loop'), make('furnace-loop', 'xiyou_boss_repeat_until_furnace_ready', furnace, furnace, 'shelter-xun', 'escape-furnace', null, 'red-eyes'), make('wait-seven-days', 'xiyou_boss_wait_seven_days', furnace, 'furnace-loop', null, 'observe-furnace'), make('observe-furnace', 'xiyou_boss_observe_furnace', furnace, 'furnace-loop', 'wait-seven-days', null), make('red-eyes', 'xiyou_boss_condition_red_eyes', furnace, 'furnace-loop', null, null), make('escape-furnace', 'xiyou_boss_escape_furnace', furnace, furnace, 'furnace-loop', 'topple-furnace'), make('topple-furnace', 'xiyou_boss_topple_furnace', furnace, furnace, 'escape-furnace', null),
  ] };
}

function byId(draft: HeavenlySignalBossWorkspaceDraftV1) { return new Map(draft.blocks.map((block) => [block.id, block])); }
function chain(draft: HeavenlySignalBossWorkspaceDraftV1, parentId: string, blocks = byId(draft)) {
  const children = draft.blocks.filter((block) => block.parentBlockId === parentId && !conditions.has(block.type));
  const roots = children.filter((block) => block.previousId === null);
  if (children.length === 0) throw new Error('事件帽或循环体不能为空');
  if (roots.length !== 1) throw new Error('容器必须只有一条互惠连接链');
  const output: HeavenlySignalBossWorkspaceBlock[] = []; const seen = new Set<string>();
  for (let item: HeavenlySignalBossWorkspaceBlock | undefined = roots[0]; item; item = item.nextId ? blocks.get(item.nextId) : undefined) {
    if (seen.has(item.id) || item.parentBlockId !== parentId) throw new Error('连接包含环或跨容器连接');
    seen.add(item.id); output.push(item);
  }
  if (seen.size !== children.length) throw new Error('容器包含断开的积木');
  return output;
}

export function isHeavenlySignalBossBlockType(value: string): value is HeavenlySignalBossBlockType { return handlerEvent(value as HeavenlySignalBossBlockType) !== null || conditions.has(value as HeavenlySignalBossBlockType) || loopTypes.has(value as HeavenlySignalBossBlockType) || value in actionOpcode; }
export function validateHeavenlySignalBossDraft(draft: HeavenlySignalBossWorkspaceDraftV1): void {
  if (draft.version !== 1 || draft.missionId !== HEAVENLY_SIGNAL_BOSS_MISSION_ID || draft.blocks.length > 100) throw new Error('天宫总试炼草稿版本无效');
  const blocks = byId(draft);
  if (blocks.size !== draft.blocks.length || [...blocks.values()].some((block) => !block.id || !isHeavenlySignalBossBlockType(block.type) || !Number.isFinite(block.x) || !Number.isFinite(block.y))) throw new Error('天宫总试炼草稿包含无效积木');
  for (const eventType of HEAVENLY_SIGNAL_QUEUE) {
    const hats = draft.blocks.filter((block) => block.type === handlers[eventType]);
    if (hats.length === 0) throw new Error('缺少事件帽');
    if (hats.length !== 1) throw new Error('重复事件帽');
  }
  for (const block of blocks.values()) {
    const previous = block.previousId === null ? null : blocks.get(block.previousId); const next = block.nextId === null ? null : blocks.get(block.nextId);
    if ((block.previousId !== null && !previous) || (block.nextId !== null && !next) || (previous && previous.nextId !== block.id) || (next && next.previousId !== block.id)) throw new Error('积木连接必须互惠');
    if (block.parentBlockId !== null && !blocks.has(block.parentBlockId)) throw new Error('积木容器不存在');
    if (block.previousId && previous!.parentBlockId !== block.parentBlockId) throw new Error('积木包含跨容器连接');
    if (handlerEvent(block.type) !== null && (block.parentBlockId !== null || block.previousId !== null || block.nextId !== null || block.handlerBlockId !== block.id)) throw new Error('事件帽必须位于顶层');
    if (conditions.has(block.type) && (block.parentBlockId === null || blocks.get(block.parentBlockId)?.type !== 'xiyou_boss_repeat_until_furnace_ready' || block.previousId !== null || block.nextId !== null)) throw new Error('条件积木必须连接在炉内循环条件槽');
    if (block.type === 'xiyou_boss_repeat_horse_care' && (!Number.isInteger(block.repeatCount) || block.repeatCount! < 1 || block.repeatCount! > 6)) throw new Error('天马循环次数无效');
    if (block.type !== 'xiyou_boss_repeat_horse_care' && block.repeatCount !== null) throw new Error('非天马循环不能设置次数');
  }
  for (const eventType of HEAVENLY_SIGNAL_QUEUE) {
    const hats = draft.blocks.filter((block) => block.type === handlers[eventType]);
    const handler = hats[0]; const items = chain(draft, handler.id, blocks);
    if (items.some((item) => item.handlerBlockId !== handler.id)) throw new Error('动作积木包含跨容器事件归属');
  }
  const counts = new Map(expectedActionTypes.map((type) => [type, 0]));
  for (const block of blocks.values()) if (counts.has(block.type)) counts.set(block.type, counts.get(block.type)! + 1);
  if ([...counts.values()].some((count) => count !== 1)) throw new Error('动作积木重复或遗漏');
  const stableRepeat = draft.blocks.find((block) => block.type === 'xiyou_boss_repeat_horse_care')!;
  const stableBody = chain(draft, stableRepeat.id, blocks); if (stableBody.length !== 1 || stableBody[0].type !== 'xiyou_boss_care_next_horse') throw new Error('天马循环体只能照料一匹天马');
  const furnaceLoop = draft.blocks.find((block) => block.type === 'xiyou_boss_repeat_until_furnace_ready')!;
  const condition = furnaceLoop.conditionBlockId ? blocks.get(furnaceLoop.conditionBlockId) : undefined;
  if (!condition || !conditions.has(condition.type) || condition.parentBlockId !== furnaceLoop.id) throw new Error('炉内循环缺少正确条件连接');
  const furnaceBody = chain(draft, furnaceLoop.id, blocks); if (furnaceBody.map((item) => item.type).join(',') !== 'xiyou_boss_wait_seven_days,xiyou_boss_observe_furnace') throw new Error('炉内循环体必须先等待再查看炉口');
  const owned = new Map<string, string>();
  const claim = (block: HeavenlySignalBossWorkspaceBlock, handlerId: string) => {
    if (block.handlerBlockId !== handlerId) throw new Error('积木包含跨容器事件归属');
    if (owned.has(block.id)) throw new Error('积木不能属于多个容器');
    owned.set(block.id, handlerId);
  };
  const visitContainer = (parentId: string, handlerId: string) => {
    for (const block of chain(draft, parentId, blocks)) {
      claim(block, handlerId);
      if (loopTypes.has(block.type)) {
        visitContainer(block.id, handlerId);
        if (block.type === 'xiyou_boss_repeat_until_furnace_ready') {
          const sensor = block.conditionBlockId ? blocks.get(block.conditionBlockId) : undefined;
          if (!sensor) throw new Error('炉内循环缺少正确条件连接');
          claim(sensor, handlerId);
        }
      }
    }
  };
  for (const eventType of HEAVENLY_SIGNAL_QUEUE) visitContainer(draft.blocks.find((block) => block.type === handlers[eventType])!.id, draft.blocks.find((block) => block.type === handlers[eventType])!.id);
  for (const block of blocks.values()) if (handlerEvent(block.type) === null && !owned.has(block.id)) throw new Error('存在未被所属容器遍历的孤立积木');
}

function instruction(kind: HeavenlySignalBossInstructionKind, eventType: HeavenlySignalEventType, dispatchIndex: number, handlerBlockId: string, source: HeavenlySignalBossWorkspaceBlock | null, overrides: Partial<HeavenlySignalBossInstruction> = {}): HeavenlySignalBossInstruction {
  return { instructionId: `${eventType}:${kind}:${source?.id ?? dispatchIndex}:${overrides.iteration ?? ''}`, kind, eventId: `event:${dispatchIndex}`, eventType, dispatchIndex, handlerBlockId, sourceBlockId: source?.id ?? null, parentBlockId: source?.parentBlockId ?? null, opcode: source ? (actionOpcode[source.type] ?? null) : null, iteration: null, repeatCount: source?.repeatCount ?? null, conditionSourceBlockId: null, conditionKind: null, elapsedDays: 0, ...overrides };
}
function compileContainer(draft: HeavenlySignalBossWorkspaceDraftV1, eventType: HeavenlySignalEventType, index: number, handler: HeavenlySignalBossWorkspaceBlock, parentId: string, output: HeavenlySignalBossInstruction[]) {
  for (const block of chain(draft, parentId)) {
    if (block.type === 'xiyou_boss_repeat_horse_care') {
      output.push(instruction('loop-started', eventType, index, handler.id, block));
      for (let iteration = 1; iteration <= block.repeatCount!; iteration += 1) for (const child of chain(draft, block.id)) output.push(instruction('action', eventType, index, handler.id, child, { iteration, repeatCount: block.repeatCount }));
      output.push(instruction('loop-finished', eventType, index, handler.id, block, { repeatCount: block.repeatCount }));
    } else if (block.type === 'xiyou_boss_repeat_until_furnace_ready') {
      const condition = byId(draft).get(block.conditionBlockId!)!; const conditionKind: HeavenlySignalConditionKind = condition.type === 'xiyou_boss_condition_furnace_open' ? 'furnace-open' : condition.type === 'xiyou_boss_condition_red_eyes' ? 'red-eyes' : 'smoke-clears'; let rounds = 0;
      for (;;) {
        const met = condition.type === 'xiyou_boss_condition_furnace_open' ? rounds >= 7 : condition.type === 'xiyou_boss_condition_red_eyes' ? rounds >= 1 : false;
        output.push(instruction('condition-checked', eventType, index, handler.id, condition, { iteration: rounds + 1, conditionSourceBlockId: condition.id, conditionKind, elapsedDays: rounds * 7 }));
        if (met || rounds >= 7) break;
        for (const child of chain(draft, block.id)) output.push(instruction('action', eventType, index, handler.id, child, { iteration: rounds + 1, conditionSourceBlockId: condition.id, conditionKind, elapsedDays: (rounds + 1) * 7 }));
        rounds += 1;
      }
    } else output.push(instruction('action', eventType, index, handler.id, block));
  }
}
export function compileHeavenlySignalBossDraft(draft: HeavenlySignalBossWorkspaceDraftV1): HeavenlySignalBossInstruction[] {
  validateHeavenlySignalBossDraft(draft); const output: HeavenlySignalBossInstruction[] = [];
  for (const [dispatchIndex, eventType] of HEAVENLY_SIGNAL_QUEUE.entries()) {
    const handler = draft.blocks.find((block) => block.type === handlers[eventType])!;
    output.push(instruction('event-dispatch', eventType, dispatchIndex, handler.id, null)); output.push(instruction('handler-entered', eventType, dispatchIndex, handler.id, handler));
    compileContainer(draft, eventType, dispatchIndex, handler, handler.id, output); output.push(instruction('handler-finished', eventType, dispatchIndex, handler.id, handler));
  }
  return output;
}

const expectedEvent: Record<string, HeavenlySignalEventType> = { accept_stable_post: 'stable-duty', care_next_horse: 'stable-duty', learn_stable_rank: 'stable-duty', leave_heaven: 'stable-duty', raise_great_sage_flag: 'returned-flower-fruit', accept_great_sage_title: 'heavenly-title', build_great_sage_residence: 'heavenly-title', guard_peach_garden: 'peach-message', learn_peach_banquet: 'peach-message', drink_at_banquet: 'peach-message', stumble_into_tusita: 'peach-message', eat_golden_elixir: 'peach-message', enter_furnace: 'furnace-refining', shelter_xun: 'furnace-refining', wait_seven_days: 'furnace-refining', observe_furnace: 'furnace-refining', escape_furnace: 'furnace-refining', topple_furnace: 'furnace-refining' };
export function runHeavenlySignalBoss(trace: readonly HeavenlySignalBossInstruction[]): HeavenlySignalBossRunResult {
  let state: HeavenlySignalBossState = 'awaiting-stable', caredHorses = 0, furnaceRounds = 0, elapsedDays = 0, repeatCount: number | null = null;
  const events: HeavenlySignalBossRuntimeEvent[] = []; const penalty = { livesLost: 0 as const, resourcesLost: 0 as const, starsLost: 0 as const };
  const isState = (expected: HeavenlySignalBossState) => state === expected;
  const fail = (concept: HeavenlySignalBossDiagnostic['concept'], sourceBlockId: string | null): HeavenlySignalBossRunResult => { events.push({ type: 'instruction-rejected', sourceBlockId, state }); return { completed: false, finalState: state, caredHorses, furnaceRounds, elapsedDays, diagnostic: { concept, sourceBlockId, state }, events, penalty }; };
  for (const item of trace) {
    if (item.kind === 'event-dispatch' || item.kind === 'handler-entered' || item.kind === 'handler-finished') { events.push({ type: 'instruction-accepted', sourceBlockId: item.sourceBlockId, state }); continue; }
    if (item.kind === 'loop-started') { if (!isState('post-accepted') || item.repeatCount !== 3) return fail('loop-count', item.sourceBlockId); repeatCount = item.repeatCount; events.push({ type: 'instruction-accepted', sourceBlockId: item.sourceBlockId, state }); continue; }
    if (item.kind === 'loop-finished') { if (repeatCount !== 3 || caredHorses !== 3) return fail('loop-count', item.sourceBlockId); state = 'horses-cared-3'; events.push({ type: 'instruction-accepted', sourceBlockId: item.sourceBlockId, state }); continue; }
    if (item.kind === 'condition-checked') {
      elapsedDays = item.elapsedDays;
      if (item.conditionSourceBlockId && item.sourceBlockId !== item.conditionSourceBlockId) return fail('program-structure', item.sourceBlockId);
      if (item.conditionKind === null) return fail('program-structure', item.sourceBlockId);
      if (item.conditionKind === 'red-eyes' && item.iteration! >= 2) return fail('loop-condition', item.sourceBlockId);
      if (item.conditionKind === 'smoke-clears' && item.iteration! >= 8) return fail('condition-never-met', item.sourceBlockId);
      if (item.conditionKind === 'furnace-open' && item.iteration === 8) state = 'furnace-open';
      events.push({ type: 'instruction-accepted', sourceBlockId: item.sourceBlockId, state }); continue;
    }
    if (item.kind !== 'action' || !item.opcode) return fail('program-structure', item.sourceBlockId);
    if (expectedEvent[item.opcode] !== item.eventType) return fail('event-routing', item.sourceBlockId);
    const accepted = (next: HeavenlySignalBossState) => { state = next; events.push({ type: 'instruction-accepted', sourceBlockId: item.sourceBlockId, state }); };
    if (item.opcode === 'accept_stable_post' && isState('awaiting-stable')) accepted('post-accepted');
    else if (item.opcode === 'care_next_horse' && repeatCount === 3 && item.iteration === caredHorses + 1) { caredHorses += 1; accepted(`horses-cared-${caredHorses}` as HeavenlySignalBossState); }
    else if (item.opcode === 'learn_stable_rank' && isState('horses-cared-3')) accepted('rank-learned');
    else if (item.opcode === 'leave_heaven' && isState('rank-learned')) accepted('returned');
    else if (item.opcode === 'raise_great_sage_flag' && isState('returned')) accepted('flag-raised');
    else if (item.opcode === 'accept_great_sage_title' && isState('flag-raised')) accepted('title-accepted');
    else if (item.opcode === 'build_great_sage_residence' && isState('title-accepted')) accepted('residence-built');
    else if (item.opcode === 'guard_peach_garden' && isState('residence-built')) accepted('garden-guarded');
    else if (item.opcode === 'learn_peach_banquet' && isState('garden-guarded')) accepted('banquet-learned');
    else if (item.opcode === 'drink_at_banquet' && isState('banquet-learned')) accepted('banquet-visited');
    else if (item.opcode === 'stumble_into_tusita' && isState('banquet-visited')) accepted('tusita-entered');
    else if (item.opcode === 'eat_golden_elixir' && isState('tusita-entered')) accepted('elixir-eaten');
    else if (item.opcode === 'enter_furnace' && isState('elixir-eaten')) accepted('furnace-entered');
    else if (item.opcode === 'shelter_xun' && isState('furnace-entered')) accepted('sheltered-in-xun');
    else if (item.opcode === 'wait_seven_days' && isState('sheltered-in-xun')) { furnaceRounds += 1; elapsedDays = item.elapsedDays; accepted('furnace-waiting'); }
    else if (item.opcode === 'observe_furnace' && isState('furnace-waiting')) accepted(furnaceRounds === 7 ? 'furnace-open' : 'sheltered-in-xun');
    else if (item.opcode === 'escape_furnace' && isState('furnace-open')) accepted('escaped');
    else if (item.opcode === 'topple_furnace' && isState('escaped')) accepted('escaped');
    else return fail(item.opcode === 'eat_golden_elixir' ? 'sequence-precondition' : 'handler-sequence', item.sourceBlockId);
  }
  if (!isState('escaped')) return fail('completeness', trace.at(-1)?.sourceBlockId ?? null);
  events.push({ type: 'canon-epilogue', sourceBlockId: null, state });
  return { completed: true, finalState: state, caredHorses, furnaceRounds, elapsedDays, diagnostic: null, events, penalty };
}
