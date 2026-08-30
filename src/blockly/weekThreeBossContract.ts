export const WEEK_THREE_BOSS_MISSION_ID = 'w3-m5' as const;
export const WEEK_THREE_BOSS_COORDINATE_LIMIT = 2_000;
export const WEEK_THREE_BOSS_STAGES = ['manor-request', 'cuilan-disguise', 'yunzhan-dialogue', 'bajie-joining'] as const;
export type WeekThreeBossStageId = typeof WEEK_THREE_BOSS_STAGES[number];
export type WeekThreeBossState = WeekThreeBossStageId | 'week-three-recap-complete';
export type WeekThreeBossBranch = 'then' | 'else';
export type WeekThreeBossOperator = 'and' | 'or' | null;
export type WeekThreeBossConcept = 'manor-help-specificity' | 'disguise-identity' | 'yunzhan-branch' | 'joining-operator';
export type WeekThreeBossAction = 'accept-demon-help' | 'continue-directions' | 'keep-disguise' | 'reveal-wukong-and-chase' | 'guard-cave' | 'explain-guanyin-origin' | 'formally-join-team' | 'continue-verification';
export type WeekThreeBossBlockType = 'w3_boss_root' | 'w3_boss_stage' | 'w3_boss_if' | 'w3_boss_condition_mentions_gaolao' | 'w3_boss_condition_explicit_demon_help' | 'w3_boss_condition_appearance_matches_cuilan' | 'w3_boss_condition_identity_is_cuilan' | 'w3_boss_condition_pilgrimage_explicit' | 'w3_boss_condition_guanyin_precepts' | 'w3_boss_condition_willing_westward' | 'w3_boss_combine' | 'w3_boss_action';

export interface WeekThreeBossWorkspaceBlock { id: string; type: WeekThreeBossBlockType; fields: Record<string, string>; inputs: Record<string, string | null>; parentBlockId: string | null; parentInputName: string | null; previousId: string | null; nextId: string | null; x: number; y: number; }
export interface WeekThreeBossWorkspaceDraftV1 { version: 1; missionId: typeof WEEK_THREE_BOSS_MISSION_ID; blocks: WeekThreeBossWorkspaceBlock[]; }
export interface WeekThreeBossInstruction { instructionId: string; sourceBlockId: string; parentBlockId: string; stageId: WeekThreeBossStageId; scenarioId: string; conditionKind: string; conditionTruth: boolean; operator: WeekThreeBossOperator; atomicConditions: Array<{ kind: string; value: boolean }>; combinedCondition: boolean | null; actualBranch: WeekThreeBossBranch; action: string; stateBefore: WeekThreeBossState; stateAfter: WeekThreeBossState; }
export interface WeekThreeBossFailureSnapshot extends Omit<WeekThreeBossInstruction, 'instructionId'> { snapshotId: string; workspaceFingerprint: string; concept: WeekThreeBossConcept; }
export interface WeekThreeBossRunResult { completed: boolean; finalState: WeekThreeBossState; trace: WeekThreeBossInstruction[]; failure: WeekThreeBossFailureSnapshot | null; penalty: { livesLost: 0; resourcesLost: 0; starsLost: 0 }; }

const b = (id: string, type: WeekThreeBossBlockType, fields: Record<string, string>, inputs: Record<string, string | null>, parentBlockId: string | null, parentInputName: string | null, previousId: string | null, nextId: string | null, x: number, y: number): WeekThreeBossWorkspaceBlock => ({ id, type, fields, inputs, parentBlockId, parentInputName, previousId, nextId, x, y });

export function createDefaultWeekThreeBossDraft(): WeekThreeBossWorkspaceDraftV1 {
  const root = 'boss-run-all';
  const stage = (id: string, name: WeekThreeBossStageId, body: string, previousId: string | null, nextId: string | null, y: number) => b(id, 'w3_boss_stage', { STAGE: name }, { BODY: body }, root, 'STAGES', previousId, nextId, 32, y);
  return { version: 1, missionId: WEEK_THREE_BOSS_MISSION_ID, blocks: [
    b(root, 'w3_boss_root', {}, { STAGES: 'boss-manor-request' }, null, null, null, null, 32, 24), stage('boss-manor-request', 'manor-request', 'manor-if', null, 'boss-cuilan-disguise', 98), stage('boss-cuilan-disguise', 'cuilan-disguise', 'cuilan-appearance-if', 'boss-manor-request', 'boss-yunzhan-dialogue', 172), stage('boss-yunzhan-dialogue', 'yunzhan-dialogue', 'yunzhan-if', 'boss-cuilan-disguise', 'boss-bajie-joining', 246), stage('boss-bajie-joining', 'bajie-joining', 'joining-if', 'boss-yunzhan-dialogue', null, 320),
    b('manor-if', 'w3_boss_if', {}, { CONDITION: 'manor-condition', THEN: 'manor-then-action', ELSE: 'manor-else-action' }, 'boss-manor-request', 'BODY', null, null, 260, 98), b('manor-condition', 'w3_boss_condition_mentions_gaolao', {}, {}, 'manor-if', 'CONDITION', null, null, 0, 0), b('manor-then-action', 'w3_boss_action', { ACTION: 'accept-demon-help' }, {}, 'manor-if', 'THEN', null, null, 0, 0), b('manor-else-action', 'w3_boss_action', { ACTION: 'continue-directions' }, {}, 'manor-if', 'ELSE', null, null, 0, 0),
    b('cuilan-appearance-if', 'w3_boss_if', {}, { CONDITION: 'cuilan-appearance-condition', THEN: 'cuilan-appearance-then', ELSE: 'cuilan-appearance-else' }, 'boss-cuilan-disguise', 'BODY', null, 'cuilan-identity-if', 260, 172), b('cuilan-appearance-condition', 'w3_boss_condition_appearance_matches_cuilan', {}, {}, 'cuilan-appearance-if', 'CONDITION', null, null, 0, 0), b('cuilan-appearance-then', 'w3_boss_action', { ACTION: 'keep-disguise' }, {}, 'cuilan-appearance-if', 'THEN', null, null, 0, 0), b('cuilan-appearance-else', 'w3_boss_action', { ACTION: 'reveal-wukong-and-chase' }, {}, 'cuilan-appearance-if', 'ELSE', null, null, 0, 0),
    b('cuilan-identity-if', 'w3_boss_if', {}, { CONDITION: 'cuilan-identity-condition', THEN: 'cuilan-identity-then', ELSE: 'cuilan-identity-else' }, 'boss-cuilan-disguise', 'BODY', 'cuilan-appearance-if', null, 260, 218), b('cuilan-identity-condition', 'w3_boss_condition_appearance_matches_cuilan', {}, {}, 'cuilan-identity-if', 'CONDITION', null, null, 0, 0), b('cuilan-identity-then', 'w3_boss_action', { ACTION: 'keep-disguise' }, {}, 'cuilan-identity-if', 'THEN', null, null, 0, 0), b('cuilan-identity-else', 'w3_boss_action', { ACTION: 'reveal-wukong-and-chase' }, {}, 'cuilan-identity-if', 'ELSE', null, null, 0, 0),
    b('yunzhan-if', 'w3_boss_if', {}, { CONDITION: 'yunzhan-condition', THEN: 'yunzhan-then-action', ELSE: 'yunzhan-else-action' }, 'boss-yunzhan-dialogue', 'BODY', null, null, 260, 246), b('yunzhan-condition', 'w3_boss_condition_pilgrimage_explicit', {}, {}, 'yunzhan-if', 'CONDITION', null, null, 0, 0), b('yunzhan-then-action', 'w3_boss_action', { ACTION: 'guard-cave' }, {}, 'yunzhan-if', 'THEN', null, null, 0, 0), b('yunzhan-else-action', 'w3_boss_action', { ACTION: 'explain-guanyin-origin' }, {}, 'yunzhan-if', 'ELSE', null, null, 0, 0),
    b('joining-if', 'w3_boss_if', {}, { CONDITION: 'joining-combine', THEN: 'joining-then-action', ELSE: 'joining-else-action' }, 'boss-bajie-joining', 'BODY', null, null, 260, 320), b('joining-combine', 'w3_boss_combine', { OPERATOR: 'or' }, { LEFT: 'joining-precepts-condition', RIGHT: 'joining-willing-condition' }, 'joining-if', 'CONDITION', null, null, 0, 0), b('joining-precepts-condition', 'w3_boss_condition_guanyin_precepts', {}, {}, 'joining-combine', 'LEFT', null, null, 0, 0), b('joining-willing-condition', 'w3_boss_condition_willing_westward', {}, {}, 'joining-combine', 'RIGHT', null, null, 0, 0), b('joining-then-action', 'w3_boss_action', { ACTION: 'formally-join-team' }, {}, 'joining-if', 'THEN', null, null, 0, 0), b('joining-else-action', 'w3_boss_action', { ACTION: 'continue-verification' }, {}, 'joining-if', 'ELSE', null, null, 0, 0),
  ] };
}

export function applyWeekThreeBossAction({ state, stage, scenarioFacts, conditionResult, action, checkpointIndex }: { state: WeekThreeBossState; stage: WeekThreeBossStageId; scenarioFacts: Record<string, boolean>; conditionResult: boolean; action: string; checkpointIndex: number }): { accepted: boolean; nextState: WeekThreeBossState } {
  const fact = (name: string) => scenarioFacts[name] === true;
  const unchanged = { accepted: false, nextState: state };
  if (state !== stage) return unchanged;
  if (action === 'accept-demon-help') return stage === 'manor-request' && conditionResult && fact('explicit-demon-help') ? { accepted: true, nextState: 'cuilan-disguise' } : unchanged;
  if (action === 'continue-directions') return stage === 'manor-request' && !conditionResult && !fact('explicit-demon-help') ? { accepted: true, nextState: state } : unchanged;
  if (action === 'keep-disguise') return stage === 'cuilan-disguise' && checkpointIndex === 0 && conditionResult && fact('appearance-matches-cuilan') ? { accepted: true, nextState: state } : unchanged;
  if (action === 'reveal-wukong-and-chase') return stage === 'cuilan-disguise' && checkpointIndex === 1 && !conditionResult && !fact('identity-is-cuilan') ? { accepted: true, nextState: 'yunzhan-dialogue' } : unchanged;
  if (action === 'guard-cave') return stage === 'yunzhan-dialogue' && !conditionResult && !fact('pilgrimage-explicit') ? { accepted: true, nextState: state } : unchanged;
  if (action === 'explain-guanyin-origin') return stage === 'yunzhan-dialogue' && conditionResult && fact('pilgrimage-explicit') ? { accepted: true, nextState: 'bajie-joining' } : unchanged;
  if (action === 'continue-verification') return stage === 'bajie-joining' && !conditionResult && !(fact('guanyin-precepts') && fact('willing-westward')) ? { accepted: true, nextState: state } : unchanged;
  if (action === 'formally-join-team') return stage === 'bajie-joining' && conditionResult && fact('guanyin-precepts') && fact('willing-westward') ? { accepted: true, nextState: 'week-three-recap-complete' } : unchanged;
  return unchanged;
}

type Scenario = { readonly stageId: WeekThreeBossStageId; readonly scenarioId: string; readonly facts: Readonly<Record<string, boolean>>; readonly concept: WeekThreeBossConcept; readonly title: string; readonly kind: 'practice' | 'canon'; readonly publicFacts: readonly string[] };
export interface WeekThreeBossPublicScenario {
  scenarioId: string;
  title: string;
  kind: 'practice' | 'canon';
  publicFacts: string[];
}
export function publicWeekThreeBossScenario(scenarioId: string): WeekThreeBossPublicScenario | null {
  const scenario = weekThreeBossRuntimeScenarios.find((item) => item.scenarioId === scenarioId);
  return scenario ? { scenarioId: scenario.scenarioId, title: scenario.title, kind: scenario.kind, publicFacts: [...scenario.publicFacts] } : null;
}
export const weekThreeBossRuntimeScenarios: readonly Scenario[] = Object.freeze([
  { stageId: 'manor-request', scenarioId: 'practice-manor-directions', facts: Object.freeze({ 'mentions-gaolao': true, 'explicit-demon-help': false }), concept: 'manor-help-specificity', title: '问路卡：只提到高老庄', kind: 'practice', publicFacts: Object.freeze(['口信提到了高老庄', '没有明确请求降妖帮助']) },
  { stageId: 'manor-request', scenarioId: 'canon-gaocai-help', facts: Object.freeze({ 'mentions-gaolao': true, 'explicit-demon-help': true }), concept: 'manor-help-specificity', title: '高才求助：请法师降妖', kind: 'canon', publicFacts: Object.freeze(['口信提到了高老庄', '明确请求降妖帮助']) },
  { stageId: 'cuilan-disguise', scenarioId: 'canon-cuilan-disguise', facts: Object.freeze({ 'appearance-matches-cuilan': true, 'identity-is-cuilan': false }), concept: 'disguise-identity', title: '后宅伪装核验', kind: 'canon', publicFacts: Object.freeze(['外形与高翠兰相同', '真实身份不是高翠兰']) },
  { stageId: 'yunzhan-dialogue', scenarioId: 'canon-wukong-name-only', facts: Object.freeze({ 'pilgrimage-explicit': false }), concept: 'yunzhan-branch', title: '云栈洞对话：只识得悟空', kind: 'canon', publicFacts: Object.freeze(['当前话语没有明确说明唐僧正在西行取经']) },
  { stageId: 'yunzhan-dialogue', scenarioId: 'canon-pilgrimage-explicit', facts: Object.freeze({ 'pilgrimage-explicit': true }), concept: 'yunzhan-branch', title: '云栈洞对话：说明西行取经', kind: 'canon', publicFacts: Object.freeze(['当前话语明确说明唐僧正在西行取经']) },
  { stageId: 'bajie-joining', scenarioId: 'practice-precepts-only', facts: Object.freeze({ 'guanyin-precepts': true, 'willing-westward': false }), concept: 'joining-operator', title: '归队逻辑练习：只满足受戒', kind: 'practice', publicFacts: Object.freeze(['已蒙观音劝善受戒', '还没有明确愿随唐僧西去']) },
  { stageId: 'bajie-joining', scenarioId: 'practice-willing-only', facts: Object.freeze({ 'guanyin-precepts': false, 'willing-westward': true }), concept: 'joining-operator', title: '归队逻辑练习：只满足愿西去', kind: 'practice', publicFacts: Object.freeze(['还没有受戒证据', '明确愿随唐僧西去']) },
  { stageId: 'bajie-joining', scenarioId: 'canon-bajie-ready', facts: Object.freeze({ 'guanyin-precepts': true, 'willing-westward': true }), concept: 'joining-operator', title: '原著归队情境', kind: 'canon', publicFacts: Object.freeze(['已蒙观音劝善受戒', '明确愿随唐僧西去']) },
]);
const conditionKind = (type: WeekThreeBossBlockType) => type.replace('w3_boss_condition_', '').replaceAll('_', '-');
function evalCondition(id: string, blocks: Map<string, WeekThreeBossWorkspaceBlock>, facts: Record<string, boolean>): { value: boolean; kind: string; operator: WeekThreeBossOperator; atomic: Array<{ kind: string; value: boolean }> } { const current = blocks.get(id)!; if (current.type.startsWith('w3_boss_condition_')) { const kind = conditionKind(current.type), value = facts[kind] === true; return { value, kind, operator: null, atomic: [{ kind, value }] }; } const left = evalCondition(current.inputs.LEFT!, blocks, facts), right = evalCondition(current.inputs.RIGHT!, blocks, facts), operator = current.fields.OPERATOR as 'and' | 'or'; return { value: operator === 'and' ? left.value && right.value : left.value || right.value, kind: operator, operator, atomic: [...left.atomic, ...right.atomic] }; }

/** A deterministic, non-secret identity for one saved visible graph. */
export function weekThreeBossWorkspaceFingerprint(draft: WeekThreeBossWorkspaceDraftV1): string {
  const canonical = draft.blocks
    .map((block) => ({ ...block, fields: Object.fromEntries(Object.entries(block.fields).sort()), inputs: Object.fromEntries(Object.entries(block.inputs).sort()) }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const text = JSON.stringify({ version: draft.version, missionId: draft.missionId, blocks: canonical });
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
}

const failed = (event: WeekThreeBossInstruction, concept: WeekThreeBossConcept, fingerprint: string): WeekThreeBossFailureSnapshot => { const { instructionId: _instructionId, ...snapshot } = event; return { snapshotId: `w3-m5-${fingerprint}-${event.stageId}-${event.scenarioId}-${event.instructionId}`, workspaceFingerprint: fingerprint, ...snapshot, concept }; };

export function runWeekThreeBossDraft(draft: WeekThreeBossWorkspaceDraftV1): WeekThreeBossRunResult {
  const blocks = new Map(draft.blocks.map((block) => [block.id, block])); const stages = new Map(draft.blocks.filter((block) => block.type === 'w3_boss_stage').map((block) => [block.fields.STAGE, block])); let state: WeekThreeBossState = 'manor-request'; const trace: WeekThreeBossInstruction[] = [];
  const fingerprint = weekThreeBossWorkspaceFingerprint(draft);
  for (const scenario of weekThreeBossRuntimeScenarios) {
    const stage = stages.get(scenario.stageId)!; let current: WeekThreeBossWorkspaceBlock | null = blocks.get(stage.inputs.BODY!) ?? null; let checkpointIndex = 0;
    while (current) {
      const condition = evalCondition(current.inputs.CONDITION!, blocks, scenario.facts), actualBranch: WeekThreeBossBranch = condition.value ? 'then' : 'else', action = blocks.get(current.inputs[actualBranch === 'then' ? 'THEN' : 'ELSE']!)!.fields.ACTION!, stateBefore = state;
      const transition = applyWeekThreeBossAction({ state, stage: scenario.stageId, scenarioFacts: scenario.facts, conditionResult: condition.value, action, checkpointIndex }); state = transition.nextState;
      const event: WeekThreeBossInstruction = { instructionId: `w3-m5-${scenario.stageId}-${scenario.scenarioId}-${current.id}`, sourceBlockId: current.id, parentBlockId: current.parentBlockId!, stageId: scenario.stageId, scenarioId: scenario.scenarioId, conditionKind: condition.kind, conditionTruth: condition.value, operator: condition.operator, atomicConditions: condition.atomic, combinedCondition: condition.operator ? condition.value : null, actualBranch, action, stateBefore, stateAfter: state };
      trace.push(event); if (!transition.accepted) return { completed: false, finalState: state, trace, failure: failed(event, scenario.concept, fingerprint), penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } };
      checkpointIndex += 1; current = current.nextId ? blocks.get(current.nextId) ?? null : null;
    }
  }
  return { completed: true, finalState: state, trace, failure: null, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } };
}
