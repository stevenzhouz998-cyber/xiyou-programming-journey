import { describe, expect, it } from 'vitest';
import {
  applyWeekThreeBossAction,
  createDefaultWeekThreeBossDraft,
  publicWeekThreeBossScenario,
  runWeekThreeBossDraft,
  weekThreeBossRuntimeScenarios,
} from './weekThreeBossContract';

describe('W3-M5 单图故事状态机合同', () => {
  it('默认可见图从头执行，并且只报告第一个真实阻塞错误', () => {
    const result = runWeekThreeBossDraft(createDefaultWeekThreeBossDraft());

    expect(result.completed).toBe(false);
    expect(result.finalState).toBe('manor-request');
    expect(result.failure).toMatchObject({
      concept: 'manor-help-specificity',
      stageId: 'manor-request',
      scenarioId: 'practice-manor-directions',
    });
    expect(result.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
    expect(result.trace).toHaveLength(1);
  });

  it('每次只修正当前图上的一个真实连接，才按四处阻塞顺序前进', () => {
    const repaired = createDefaultWeekThreeBossDraft();
    const block = (id: string) => repaired.blocks.find((item) => item.id === id)!;
    const replace = (parentId: string, childId: string, type: 'w3_boss_condition_explicit_demon_help' | 'w3_boss_condition_identity_is_cuilan') => {
      const parent = block(parentId); const index = repaired.blocks.findIndex((item) => item.id === parent.inputs.CONDITION);
      repaired.blocks.splice(index, 1, { ...repaired.blocks[index]!, id: childId, type, fields: {}, parentBlockId: parentId, parentInputName: 'CONDITION' });
      parent.inputs.CONDITION = childId;
    };
    replace('manor-if', 'candidate-manor-explicit', 'w3_boss_condition_explicit_demon_help');
    expect(runWeekThreeBossDraft(repaired).failure?.concept).toBe('disguise-identity');
    replace('cuilan-identity-if', 'candidate-cuilan-identity', 'w3_boss_condition_identity_is_cuilan');
    expect(runWeekThreeBossDraft(repaired).failure?.concept).toBe('yunzhan-branch');
    block('yunzhan-if').inputs.THEN = 'yunzhan-else-action'; block('yunzhan-if').inputs.ELSE = 'yunzhan-then-action';
    block('yunzhan-else-action').parentInputName = 'THEN'; block('yunzhan-then-action').parentInputName = 'ELSE';
    expect(runWeekThreeBossDraft(repaired).failure?.concept).toBe('joining-operator');
    repaired.blocks.find((block) => block.id === 'joining-combine')!.fields.OPERATOR = 'and';

    const result = runWeekThreeBossDraft(repaired);

    expect(result.completed).toBe(true);
    expect(result.finalState).toBe('week-three-recap-complete');
    expect(result.failure).toBeNull();
    expect(result.trace.map((event) => event.stateAfter)).toEqual([
      'manor-request', 'cuilan-disguise', 'cuilan-disguise', 'yunzhan-dialogue', 'yunzhan-dialogue', 'bajie-joining', 'bajie-joining', 'bajie-joining', 'week-three-recap-complete',
    ]);
    expect(result.trace.every((event) => event.sourceBlockId && event.parentBlockId && event.stageId && event.scenarioId && event.atomicConditions.length > 0)).toBe(true);
  });

  it('从连接图读取动作而不是由阶段名称推导动作', () => {
    const draft = createDefaultWeekThreeBossDraft();
    draft.blocks.find((block) => block.id === 'manor-if')!.inputs.THEN = 'manor-else-action';
    draft.blocks.find((block) => block.id === 'manor-else-action')!.parentInputName = 'THEN';
    draft.blocks.find((block) => block.id === 'manor-then-action')!.parentBlockId = null;
    draft.blocks.find((block) => block.id === 'manor-then-action')!.parentInputName = null;
    const result = runWeekThreeBossDraft(draft);
    expect(result.failure).toMatchObject({ sourceBlockId: 'manor-if', action: 'continue-directions' });
  });

  it('用公开事实与实际动作决定推进，不把每张卡的正确动作或下一状态藏在情境表中', () => {
    expect(applyWeekThreeBossAction({ state: 'manor-request', stage: 'manor-request', scenarioFacts: { 'mentions-gaolao': true, 'explicit-demon-help': false }, conditionResult: true, action: 'accept-demon-help', checkpointIndex: 0 })).toEqual({ accepted: false, nextState: 'manor-request' });
    expect(applyWeekThreeBossAction({ state: 'manor-request', stage: 'manor-request', scenarioFacts: { 'mentions-gaolao': true, 'explicit-demon-help': false }, conditionResult: false, action: 'continue-directions', checkpointIndex: 0 })).toEqual({ accepted: true, nextState: 'manor-request' });
    expect(applyWeekThreeBossAction({ state: 'cuilan-disguise', stage: 'cuilan-disguise', scenarioFacts: { 'appearance-matches-cuilan': true, 'identity-is-cuilan': false }, conditionResult: true, action: 'keep-disguise', checkpointIndex: 0 })).toEqual({ accepted: true, nextState: 'cuilan-disguise' });
    expect(applyWeekThreeBossAction({ state: 'cuilan-disguise', stage: 'cuilan-disguise', scenarioFacts: { 'appearance-matches-cuilan': true, 'identity-is-cuilan': false }, conditionResult: false, action: 'reveal-wukong-and-chase', checkpointIndex: 1 })).toEqual({ accepted: true, nextState: 'yunzhan-dialogue' });
    expect(applyWeekThreeBossAction({ state: 'bajie-joining', stage: 'bajie-joining', scenarioFacts: { 'guanyin-precepts': true, 'willing-westward': false }, conditionResult: true, action: 'formally-join-team', checkpointIndex: 0 })).toEqual({ accepted: false, nextState: 'bajie-joining' });
  });

  it('同图同运行的失败快照可重放，编辑图后的失败快照具有新的身份', () => {
    const first = runWeekThreeBossDraft(createDefaultWeekThreeBossDraft());
    const repeat = runWeekThreeBossDraft(createDefaultWeekThreeBossDraft());
    const edited = createDefaultWeekThreeBossDraft();
    edited.blocks.find((block) => block.id === 'manor-condition')!.x += 1;
    const changed = runWeekThreeBossDraft(edited);
    expect(first.failure?.snapshotId).toBe(repeat.failure?.snapshotId);
    expect(first.failure?.workspaceFingerprint).toBe(repeat.failure?.workspaceFingerprint);
    expect(changed.failure?.snapshotId).not.toBe(first.failure?.snapshotId);
    expect(changed.failure?.workspaceFingerprint).not.toBe(first.failure?.workspaceFingerprint);
  });

  it('公开证据卡从唯一运行情境映射，并剥离内部事实和概念', () => {
    expect(weekThreeBossRuntimeScenarios).toHaveLength(8);
    for (const scenario of weekThreeBossRuntimeScenarios) {
      const publicScenario = publicWeekThreeBossScenario(scenario.scenarioId);
      expect(publicScenario).toMatchObject({ scenarioId: scenario.scenarioId, title: scenario.title, kind: scenario.kind, publicFacts: scenario.publicFacts });
      expect(publicScenario).not.toHaveProperty('facts');
      expect(publicScenario).not.toHaveProperty('concept');
      expect(publicScenario).not.toHaveProperty('actions');
      expect(publicScenario).not.toHaveProperty('nextState');
    }
  });
});
