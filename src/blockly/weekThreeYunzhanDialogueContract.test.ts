import { describe, expect, it } from 'vitest';
import {
  compileYunzhanDialogueDraft,
  createDefaultYunzhanDialogueDraft,
  runYunzhanDialogueForDraft,
} from './weekThreeYunzhanDialogueContract';

const draft = () => structuredClone(createDefaultYunzhanDialogueDraft());

describe('W3-M3 云栈洞双轮对话合同', () => {
  it('默认把两枚可移动动作块接反，首轮 false/else 因而有效失败且零惩罚', () => {
    const visible = draft();
    const run = runYunzhanDialogueForDraft(visible, compileYunzhanDialogueDraft(visible));
    expect(run.completed).toBe(false);
    expect(run.rounds[0]).toMatchObject({ observedValue: false, actualBranch: 'else', actionOpcode: 'explain-guanyin-origin', passed: false });
    expect(run.failureSnapshot).toMatchObject({ roundId: 'wukong-identity', observedValue: false, branch: 'else', actionOpcode: 'explain-guanyin-origin' });
    expect(run.penalty).toEqual({ livesLost: 0, resourcesLost: 0, starsLost: 0 });
  });

  it('交换同一图中的 THEN/ELSE 后重放公开输入，精确得到守洞再说明来历', () => {
    const visible = draft();
    const thenAction = visible.blocks.find((block) => block.id === 'yunzhan-then-action')!;
    const elseAction = visible.blocks.find((block) => block.id === 'yunzhan-else-action')!;
    [thenAction.branch, elseAction.branch] = [elseAction.branch, thenAction.branch];
    const trace = compileYunzhanDialogueDraft(visible);
    const run = runYunzhanDialogueForDraft(visible, trace);
    expect(trace.map((item) => ({ roundId: item.roundId, observedValue: item.observedValue, actualBranch: item.actualBranch, opcode: item.opcode }))).toEqual([
      { roundId: 'wukong-identity', observedValue: false, actualBranch: 'else', opcode: 'guard-cave' },
      { roundId: 'pilgrimage-explicit', observedValue: true, actualBranch: 'then', opcode: 'explain-guanyin-origin' },
    ]);
    expect(run).toMatchObject({ completed: true, finalState: 'origin-explained' });
  });

  it('拒绝结构错误、伪造 trace 与坐标驱动的成功', () => {
    const missing = draft();
    missing.blocks = missing.blocks.filter((block) => block.id !== 'yunzhan-condition');
    expect(() => compileYunzhanDialogueDraft(missing)).toThrow(expect.objectContaining({ code: 'missing-condition' }));
    const duplicate = draft();
    duplicate.blocks.push({ ...duplicate.blocks[0]!, id: 'forged-action' });
    expect(() => compileYunzhanDialogueDraft(duplicate)).toThrow();
    const visible = draft();
    const trace = compileYunzhanDialogueDraft(visible);
    expect(runYunzhanDialogueForDraft(visible, trace.map((item) => ({ ...item, opcode: 'guard-cave' })))).toMatchObject({ completed: false, diagnostic: { concept: 'invalid-trace' } });
    const moved = draft();
    for (const block of moved.blocks) { block.x += 1_000_000_000; block.y -= 1_000_000_000; }
    expect(compileYunzhanDialogueDraft(moved)).toEqual(trace);
  });
});
