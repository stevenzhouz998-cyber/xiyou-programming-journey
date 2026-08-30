import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import { createDefaultWeekThreeBossDraft, WEEK_THREE_BOSS_COORDINATE_LIMIT } from './weekThreeBossContract';
import { compileWeekThreeBossDraft } from './weekThreeBossCompiler';
import { restoreWeekThreeBossWorkspace, serializeWeekThreeBossWorkspace } from './weekThreeBossWorkspaceCompiler';
import { registerWeekThreeBossBlocks } from './weekThreeBossBlocks';

describe('W3-M5 编译器', () => {
  it('只接受一张互惠、连续、具备四个阶段的可见图，并输出工作区绑定 trace', () => {
    const result = compileWeekThreeBossDraft(createDefaultWeekThreeBossDraft());
    expect(result.ok).toBe(true);
    expect(result.trace).toHaveLength(1);
    expect(result.trace[0]).toMatchObject({ sourceBlockId: 'manor-if', parentBlockId: 'boss-manor-request', stageId: 'manor-request', conditionKind: 'mentions-gaolao' });
  });

  it('拒绝断线和伪造坐标；结构错误不产生可运行 trace', () => {
    const disconnected = createDefaultWeekThreeBossDraft();
    disconnected.blocks.find((block) => block.id === 'boss-cuilan-disguise')!.previousId = null;
    expect(compileWeekThreeBossDraft(disconnected)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'nonreciprocal-link', sourceBlockId: 'boss-cuilan-disguise' }] });

    const forgedCoordinate = createDefaultWeekThreeBossDraft();
    forgedCoordinate.blocks.find((block) => block.id === 'boss-manor-request')!.x = Number.POSITIVE_INFINITY;
    expect(compileWeekThreeBossDraft(forgedCoordinate)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'invalid-coordinate', sourceBlockId: 'boss-manor-request' }] });
  });

  it('拒绝伪 trace 以及孤儿、重复、跨容器、缺少输入、环和非法操作符', () => {
    const mutate = (change: (draft: ReturnType<typeof createDefaultWeekThreeBossDraft>) => void) => { const draft = createDefaultWeekThreeBossDraft(); change(draft); return compileWeekThreeBossDraft(draft); };
    expect(mutate((d) => d.blocks.push(structuredClone(d.blocks[0]!)))).toMatchObject({ ok: false, diagnostics: [{ code: 'duplicate-id' }] });
    expect(mutate((d) => d.blocks.find((b) => b.id === 'manor-if')!.inputs.CONDITION = null)).toMatchObject({ ok: false, diagnostics: [{ code: 'missing-input', sourceBlockId: 'manor-if' }] });
    expect(mutate((d) => d.blocks.find((b) => b.id === 'joining-combine')!.fields.OPERATOR = 'xor')).toMatchObject({ ok: false, diagnostics: [{ code: 'illegal-operator' }] });
    expect(mutate((d) => { const b = d.blocks.find((b) => b.id === 'yunzhan-if')!; b.nextId = b.id; })).toMatchObject({ ok: false, diagnostics: [{ code: 'cycle' }] });
    expect(mutate((d) => d.blocks.find((b) => b.id === 'manor-then-action')!.parentBlockId = 'boss-cuilan-disguise')).toMatchObject({ ok: false, diagnostics: [{ code: 'wrong-parent' }] });
  });

  it('坐标不会改变语义，并拒绝把看似完成的 trace 塞进草稿', () => {
    const draft = createDefaultWeekThreeBossDraft(); const before = compileWeekThreeBossDraft(draft);
    for (const block of draft.blocks) { block.x += 450; block.y -= 275; }
    const after = compileWeekThreeBossDraft(draft);
    expect(after).toMatchObject({ ok: true, trace: before.ok ? before.trace : [] });
    expect(compileWeekThreeBossDraft({ ...draft, trace: [{ action: 'formally-join-team' }] })).toMatchObject({ ok: false, diagnostics: [{ code: 'invalid-draft' }] });
  });

  it('对每种积木实行精确字段、输入和值白名单，并为未知引用返回定位诊断', () => {
    const extraField = createDefaultWeekThreeBossDraft();
    extraField.blocks.find((block) => block.id === 'manor-condition')!.fields.EXTRA = 'forged';
    expect(compileWeekThreeBossDraft(extraField)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'invalid-draft', sourceBlockId: 'manor-condition' }] });

    const unknownReference = createDefaultWeekThreeBossDraft();
    unknownReference.blocks.find((block) => block.id === 'manor-if')!.inputs.CONDITION = 'missing-condition';
    expect(() => compileWeekThreeBossDraft(unknownReference)).not.toThrow();
    expect(compileWeekThreeBossDraft(unknownReference)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'unknown-block', sourceBlockId: 'missing-condition' }] });

    const illegalAction = createDefaultWeekThreeBossDraft();
    illegalAction.blocks.find((block) => block.id === 'manor-then-action')!.fields.ACTION = 'formally-join-team';
    expect(compileWeekThreeBossDraft(illegalAction)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'invalid-draft', sourceBlockId: 'manor-then-action' }] });

    const illegalCondition = createDefaultWeekThreeBossDraft();
    illegalCondition.blocks.find((block) => block.id === 'manor-condition')!.fields.KIND = 'made-up-condition';
    expect(compileWeekThreeBossDraft(illegalCondition)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'invalid-draft', sourceBlockId: 'manor-condition' }] });

    const missingField = createDefaultWeekThreeBossDraft();
    missingField.blocks.find((block) => block.id === 'manor-condition')!.fields.KIND = 'forged';
    expect(compileWeekThreeBossDraft(missingField)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'invalid-draft', sourceBlockId: 'manor-condition' }] });
  });

  it('拒绝深层环和错误的值/语句连接，且不会产生 trace', () => {
    const cycle = createDefaultWeekThreeBossDraft();
    const first = cycle.blocks.find((block) => block.id === 'cuilan-appearance-if')!;
    const second = cycle.blocks.find((block) => block.id === 'cuilan-identity-if')!;
    first.previousId = second.id;
    second.nextId = first.id;
    expect(compileWeekThreeBossDraft(cycle)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'cycle' }] });

    const wrongTopology = createDefaultWeekThreeBossDraft();
    wrongTopology.blocks.find((block) => block.id === 'manor-if')!.inputs.THEN = 'manor-condition';
    wrongTopology.blocks.find((block) => block.id === 'manor-condition')!.parentInputName = 'THEN';
    expect(compileWeekThreeBossDraft(wrongTopology)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'wrong-parent', sourceBlockId: 'manor-condition' }] });

    const actionAsCondition = createDefaultWeekThreeBossDraft();
    actionAsCondition.blocks.find((block) => block.id === 'manor-if')!.inputs.CONDITION = 'manor-then-action';
    actionAsCondition.blocks.find((block) => block.id === 'manor-then-action')!.parentInputName = 'CONDITION';
    expect(compileWeekThreeBossDraft(actionAsCondition)).toMatchObject({ ok: false, trace: [], diagnostics: [{ code: 'wrong-parent', sourceBlockId: 'manor-then-action' }] });
  });

  it('由真实连接选择候选条件并交换云栈洞分支动作，而不是改动作字段', () => {
    registerWeekThreeBossBlocks(); const workspace = new Blockly.Workspace(); restoreWeekThreeBossWorkspace(workspace, createDefaultWeekThreeBossDraft());
    const replaceCondition = (parentId: string, type: string) => { const parent = workspace.getBlockById(parentId)!; parent.getInput('CONDITION')!.connection!.targetBlock()!.dispose(false); const candidate = workspace.newBlock(type); parent.getInput('CONDITION')!.connection!.connect(candidate.outputConnection!); };
    replaceCondition('manor-if', 'w3_boss_condition_explicit_demon_help'); replaceCondition('cuilan-identity-if', 'w3_boss_condition_identity_is_cuilan');
    const yunzhan = workspace.getBlockById('yunzhan-if')!; const thenAction = workspace.getBlockById('yunzhan-then-action')!; const elseAction = workspace.getBlockById('yunzhan-else-action')!;
    yunzhan.getInput('THEN')!.connection!.disconnect(); yunzhan.getInput('ELSE')!.connection!.disconnect(); yunzhan.getInput('THEN')!.connection!.connect(elseAction.previousConnection!); yunzhan.getInput('ELSE')!.connection!.connect(thenAction.previousConnection!);
    workspace.getBlockById('joining-combine')!.setFieldValue('and', 'OPERATOR');
    const serialized = serializeWeekThreeBossWorkspace(workspace); const result = compileWeekThreeBossDraft(serialized);
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.trace.map((event) => event.action)).toEqual([
      'continue-directions', 'accept-demon-help', 'keep-disguise', 'reveal-wukong-and-chase',
      'guard-cave', 'explain-guanyin-origin', 'continue-verification', 'continue-verification', 'formally-join-team',
    ]);
  });

  it('把有限超大坐标规范化为同一可恢复坐标，并让编辑后的失败快照拥有不同身份', () => {
    const first = createDefaultWeekThreeBossDraft();
    const second = createDefaultWeekThreeBossDraft();
    first.blocks[0]!.x = 99_999;
    second.blocks[0]!.x = WEEK_THREE_BOSS_COORDINATE_LIMIT;
    const normalizedFirst = compileWeekThreeBossDraft(first);
    const normalizedSecond = compileWeekThreeBossDraft(second);
    expect(normalizedFirst).toMatchObject({ ok: true });
    expect(normalizedSecond).toMatchObject({ ok: true });
    expect(normalizedFirst.ok && normalizedFirst.draft.blocks[0]!.x).toBe(WEEK_THREE_BOSS_COORDINATE_LIMIT);
    expect(normalizedFirst.ok && normalizedSecond.ok && normalizedFirst.draft).toEqual(normalizedSecond.draft);
    expect(normalizedFirst.ok && normalizedSecond.ok && normalizedFirst.trace[0]!.instructionId).toBe(normalizedSecond.trace[0]!.instructionId);
  });
});
