import { describe, expect, it } from 'vitest';
import {
  compileCuilanBooleanDraft,
  createDefaultCuilanBooleanDraft,
  runCuilanBooleanForDraft,
} from './weekThreeCuilanBooleanContract';

const draft = () => structuredClone(createDefaultCuilanBooleanDraft());
const graphFailure = (value: unknown, code: string) => expect(() => compileCuilanBooleanDraft(value)).toThrow(expect.objectContaining({ code }));

describe('W3-M2 双闸门合同', () => {
  it('默认第二闸门错误地读取外形并在 continue-disguise 失败', () => {
    const visibleDraft = createDefaultCuilanBooleanDraft();
    const run = runCuilanBooleanForDraft(visibleDraft, compileCuilanBooleanDraft(visibleDraft));
    expect(run.completed).toBe(false);
    expect(run.failureSnapshot).toMatchObject({
      checkpointId: 'identity-reveal',
      conditionKind: 'appearance-matches-cuilan',
      observedValue: true,
      branch: 'then',
    });
    expect(run.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
    expect(runCuilanBooleanForDraft(visibleDraft)).toEqual(run);
  });

  it('第二闸门读取真实身份时走 false/else 并到达 demon-fled', () => {
    const draft = createDefaultCuilanBooleanDraft();
    const condition = draft.blocks.find((block) => block.id === 'cuilan-identity-condition')!;
    condition.type = 'w3_cuilan_condition_identity_is_cuilan';
    const run = runCuilanBooleanForDraft(draft, compileCuilanBooleanDraft(draft));
    expect(run.completed).toBe(true);
    expect(run.finalState).toBe('demon-fled');
    expect(run.checkpointResults.map(({ observedValue, actualBranch }) => ({ observedValue, actualBranch })))
      .toEqual([{ observedValue: true, actualBranch: 'then' }, { observedValue: false, actualBranch: 'else' }]);
  });

  it('草稿绑定入口拒绝与当前可见图不一致但内部自洽的 provenance 篡改', () => {
    const visibleDraft = draft();
    const trace = compileCuilanBooleanDraft(visibleDraft);
    const forged = trace.map((item) => item.checkpointId === 'identity-reveal' ? {
      ...item,
      sourceBlockId: item.sourceBlockId === item.conditionSourceBlockId ? 'forged-condition' : 'forged-source',
      parentBlockId: item.parentBlockId === null ? null : 'forged-parent',
      conditionSourceBlockId: 'forged-condition',
      instructionId: `${item.checkpointId}:${item.opcode}:${item.sourceBlockId === item.conditionSourceBlockId ? 'forged-condition' : 'forged-source'}`,
    } : item);
    expect(runCuilanBooleanForDraft(visibleDraft, forged)).toMatchObject({ completed: false, diagnostic: { concept: 'invalid-trace' } });
  });

  it('拒绝空图、多根、断线、环和非互惠连接', () => {
    const empty = draft(); empty.blocks = []; graphFailure(empty, 'empty-workspace');
    const roots = draft(); roots.blocks.find((block) => block.id === 'cuilan-collect-clue')!.previousId = null; graphFailure(roots, 'nonreciprocal-link');
    const disconnected = draft(); disconnected.blocks.find((block) => block.id === 'cuilan-identity-if')!.previousId = null; disconnected.blocks.find((block) => block.id === 'cuilan-collect-clue')!.nextId = null; graphFailure(disconnected, 'multiple-top-roots');
    const cycle = draft(); cycle.blocks.find((block) => block.id === 'cuilan-identity-if')!.nextId = 'cuilan-transform'; cycle.blocks.find((block) => block.id === 'cuilan-transform')!.previousId = 'cuilan-identity-if'; graphFailure(cycle, 'cycle');
    const oneSided = draft(); oneSided.blocks.find((block) => block.id === 'cuilan-disguise-if')!.previousId = null; graphFailure(oneSided, 'nonreciprocal-link');
  });

  it('拒绝未知、孤立、重复或遗漏的必需块', () => {
    const unknown = draft(); unknown.blocks[0]!.type = 'not-a-cuilan-block' as never; graphFailure(unknown, 'unknown-type');
    const orphan = draft(); orphan.blocks.push({ ...orphan.blocks.find((block) => block.id === 'cuilan-hold-disguise')!, id: 'orphan', parentBlockId: null, branch: null }); expect(() => compileCuilanBooleanDraft(orphan)).toThrow();
    const duplicate = draft(); duplicate.blocks.push({ ...duplicate.blocks[0]!, id: 'another-transform' }); expect(() => compileCuilanBooleanDraft(duplicate)).toThrow();
    const missing = draft(); missing.blocks = missing.blocks.filter((block) => block.id !== 'cuilan-transform'); expect(() => compileCuilanBooleanDraft(missing)).toThrow();
  });

  it('拒绝缺少条件或分支、空分支、条件共享和跨容器所有权', () => {
    const missingCondition = draft(); missingCondition.blocks.find((block) => block.id === 'cuilan-identity-if')!.conditionBlockId = null; graphFailure(missingCondition, 'missing-condition');
    const missingThen = draft(); missingThen.blocks = missingThen.blocks.filter((block) => block.id !== 'cuilan-hold-disguise'); graphFailure(missingThen, 'missing-required-block');
    const missingElse = draft(); missingElse.blocks = missingElse.blocks.filter((block) => block.id !== 'cuilan-reveal-wukong'); graphFailure(missingElse, 'missing-required-block');
    const sharedCondition = draft(); sharedCondition.blocks.find((block) => block.id === 'cuilan-identity-if')!.conditionBlockId = 'cuilan-ready-condition'; expect(() => compileCuilanBooleanDraft(sharedCondition)).toThrow();
    const crossContainer = draft(); crossContainer.blocks.find((block) => block.id === 'cuilan-hold-disguise')!.parentBlockId = 'cuilan-identity-if'; expect(() => compileCuilanBooleanDraft(crossContainer)).toThrow();
  });

  it('拒绝非 if 条件插槽与非法 branch 元数据', () => {
    const transformCondition = draft(); transformCondition.blocks.find((block) => block.id === 'cuilan-transform')!.conditionBlockId = 'cuilan-ready-condition'; expect(() => compileCuilanBooleanDraft(transformCondition)).toThrow();
    const clueCondition = draft(); clueCondition.blocks.find((block) => block.id === 'cuilan-collect-clue')!.conditionBlockId = 'cuilan-ready-condition'; expect(() => compileCuilanBooleanDraft(clueCondition)).toThrow();
    const actionCondition = draft(); actionCondition.blocks.find((block) => block.id === 'cuilan-hold-disguise')!.conditionBlockId = 'cuilan-ready-condition'; expect(() => compileCuilanBooleanDraft(actionCondition)).toThrow();
    const conditionCondition = draft(); conditionCondition.blocks.find((block) => block.id === 'cuilan-ready-condition')!.conditionBlockId = 'cuilan-identity-condition'; expect(() => compileCuilanBooleanDraft(conditionCondition)).toThrow();
    const topBranch = draft(); topBranch.blocks.find((block) => block.id === 'cuilan-transform')!.branch = 'then'; expect(() => compileCuilanBooleanDraft(topBranch)).toThrow();
    const clueBranch = draft(); clueBranch.blocks.find((block) => block.id === 'cuilan-collect-clue')!.branch = 'then'; expect(() => compileCuilanBooleanDraft(clueBranch)).toThrow();
    const ifBranch = draft(); ifBranch.blocks.find((block) => block.id === 'cuilan-disguise-if')!.branch = 'then'; expect(() => compileCuilanBooleanDraft(ifBranch)).toThrow();
  });

  it('拒绝主链错序与线索前显形', () => {
    const wrongOrder = draft(); wrongOrder.blocks.find((block) => block.id === 'cuilan-transform')!.nextId = 'cuilan-collect-clue'; wrongOrder.blocks.find((block) => block.id === 'cuilan-collect-clue')!.previousId = 'cuilan-transform'; wrongOrder.blocks.find((block) => block.id === 'cuilan-disguise-if')!.previousId = null; wrongOrder.blocks.find((block) => block.id === 'cuilan-disguise-if')!.nextId = null; graphFailure(wrongOrder, 'multiple-top-roots');
    const visibleDraft = draft();
    const trace = compileCuilanBooleanDraft(visibleDraft);
    const premature = [...trace]; [premature[3], premature[5]] = [premature[5]!, premature[3]!];
    expect(runCuilanBooleanForDraft(visibleDraft, premature)).toMatchObject({ completed: false, diagnostic: { concept: 'invalid-trace' } });
  });

  it('严格拒绝伪造来源、值、分支、证据和不完整 trace', () => {
    const visibleDraft = draft();
    const trace = compileCuilanBooleanDraft(visibleDraft);
    for (const forged of [
      trace.map((item) => ({ ...item, conditionSourceBlockId: item.checkpointId === 'identity-reveal' ? 'forged-condition' : item.conditionSourceBlockId })),
      trace.map((item) => ({ ...item, observedValue: !item.observedValue })),
      trace.map((item) => ({ ...item, parentBlockId: item.parentBlockId === null ? 'forged-parent' : null })),
      trace.map((item) => ({ ...item, actualBranch: item.actualBranch === 'then' ? 'else' as const : 'then' as const })),
      trace.map((item) => ({ ...item, evidenceCode: 'forged-evidence' })),
      trace.map((item) => item === trace[5] ? { ...item, opcode: 'demon-fled' as never, instructionId: 'identity-reveal:demon-fled:forged' } : item),
      trace.slice(0, -1),
      [...trace, trace[5]!],
    ]) expect(runCuilanBooleanForDraft(visibleDraft, forged)).toMatchObject({ completed: false, diagnostic: { concept: 'invalid-trace' }, penalty: { livesLost: 0, resourcesLost: 0, starsLost: 0 } });
  });

  it('第一个错误 checkpoint 会被锁定，且可确定性重放', () => {
    const visibleDraft = draft();
    const trace = compileCuilanBooleanDraft(visibleDraft);
    const failed = runCuilanBooleanForDraft(visibleDraft, trace);
    expect(failed.failureSnapshot?.checkpointId).toBe('identity-reveal');
    expect(runCuilanBooleanForDraft(visibleDraft, trace)).toEqual(failed);
    const firstIdentity = draft();
    firstIdentity.blocks.find((block) => block.id === 'cuilan-ready-condition')!.type = 'w3_cuilan_condition_identity_is_cuilan';
    expect(runCuilanBooleanForDraft(firstIdentity, compileCuilanBooleanDraft(firstIdentity))).toMatchObject({ completed: false, failureSnapshot: { checkpointId: 'disguise-readiness', observedValue: false, branch: 'else' } });
  });

  it('没有儿童可执行的 demon-fled 指令，且两个分支动作互换会失败', () => {
    const names = createDefaultCuilanBooleanDraft().blocks.map((block) => block.type);
    expect(names).not.toContain('demon-fled');
    const swapped = draft();
    const thenAction = swapped.blocks.find((block) => block.id === 'cuilan-continue-disguise')!;
    const elseAction = swapped.blocks.find((block) => block.id === 'cuilan-reveal-wukong')!;
    [thenAction.branch, elseAction.branch] = [elseAction.branch, thenAction.branch];
    graphFailure(swapped, 'wrong-branch-action');
  });
});
