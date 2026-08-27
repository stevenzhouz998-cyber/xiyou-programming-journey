import * as Blockly from 'blockly';
import { afterEach, describe, expect, it } from 'vitest';
import { registerYunzhanDialogueBlocks } from './weekThreeYunzhanDialogueBlocks';
import { YUNZHAN_DIALOGUE_BLOCK_LABELS } from './weekThreeYunzhanDialogueBlocks';
import {
  compileYunzhanDialogueWorkspace,
  restoreYunzhanDialogueWorkspace,
  restoreDefaultYunzhanDialogueWorkspace,
  serializeYunzhanDialogueWorkspace,
} from './weekThreeYunzhanDialogueCompiler';

const workspaces: Blockly.Workspace[] = [];
afterEach(() => workspaces.splice(0).forEach((workspace) => workspace.dispose()));

describe('W3-M3 真实 Blockly 编译器', () => {
  it('keeps the fixed condition readable once instead of duplicating it in the IF shell', () => {
    expect(YUNZHAN_DIALOGUE_BLOCK_LABELS.w3_yunzhan_if_pilgrimage_explicit).toBe('如果');
    expect(YUNZHAN_DIALOGUE_BLOCK_LABELS.w3_yunzhan_condition_pilgrimage_explicit).toBe('当前话语明确说明唐三藏正在西行取经');
  });
  it('仅序列化同一可见条件和两个真实分支连接，默认接反', () => {
    registerYunzhanDialogueBlocks();
    const workspace = new Blockly.Workspace(); workspaces.push(workspace);
    restoreDefaultYunzhanDialogueWorkspace(workspace);
    const result = compileYunzhanDialogueWorkspace(workspace);
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.draft.blocks.filter((block) => block.branch !== null).map((block) => ({ id: block.id, branch: block.branch }))).toEqual([
      { id: 'yunzhan-then-action', branch: 'then' }, { id: 'yunzhan-else-action', branch: 'else' },
    ]);
  });

  it('删除真实条件是编译错误，而不是失败运行', () => {
    registerYunzhanDialogueBlocks();
    const workspace = new Blockly.Workspace(); workspaces.push(workspace);
    restoreDefaultYunzhanDialogueWorkspace(workspace);
    workspace.getBlockById('yunzhan-condition')!.dispose();
    expect(compileYunzhanDialogueWorkspace(workspace)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-condition' })] });
  });
  it('恢复极大坐标时限制显示位置但不改变编译出的执行轨迹', () => {
    registerYunzhanDialogueBlocks(); const original = new Blockly.Workspace(); const restored = new Blockly.Workspace(); workspaces.push(original, restored); restoreDefaultYunzhanDialogueWorkspace(original); const before = compileYunzhanDialogueWorkspace(original); const draft = before.ok ? structuredClone(before.draft) : null; expect(draft).not.toBeNull(); for (const block of draft!.blocks) { block.x = 1_000_000_000; block.y = -1_000_000_000; } restoreYunzhanDialogueWorkspace(restored, draft!); const after = compileYunzhanDialogueWorkspace(restored); expect(after.ok && before.ok && after.trace).toEqual(before.ok ? before.trace : []); expect(serializeYunzhanDialogueWorkspace(restored).blocks.every((block) => Math.abs(block.x) <= 10000 && Math.abs(block.y) <= 10000)).toBe(true);
  });
});
