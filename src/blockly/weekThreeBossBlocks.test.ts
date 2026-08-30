import * as Blockly from 'blockly';
import { describe, expect, it } from 'vitest';
import { compileWeekThreeBossDraft } from './weekThreeBossCompiler';
import { restoreWeekThreeBossWorkspace, serializeWeekThreeBossWorkspace } from './weekThreeBossWorkspaceCompiler';
import { createDefaultWeekThreeBossDraft, WEEK_THREE_BOSS_COORDINATE_LIMIT } from './weekThreeBossContract';

describe('W3-M5 可见 Blockly 图', () => {
  it('从版本化草稿恢复同一根连接图，并从真实连接序列化', () => {
    const workspace = new Blockly.Workspace();
    restoreWeekThreeBossWorkspace(workspace, createDefaultWeekThreeBossDraft());
    expect(workspace.getTopBlocks(false)).toHaveLength(1);
    const serialized = serializeWeekThreeBossWorkspace(workspace)
    expect(serialized.blocks).toHaveLength(createDefaultWeekThreeBossDraft().blocks.length)
    expect(serialized.blocks.find((block) => block.id === 'joining-combine')).toMatchObject({ type: 'w3_boss_combine', inputs: { LEFT: 'joining-precepts-condition', RIGHT: 'joining-willing-condition' } })
    expect(compileWeekThreeBossDraft(serialized)).toMatchObject({ ok: true })
  });

  it('恢复前先验证草稿，安全夹紧超大有限坐标，非法草稿不会清空现有工作区', () => {
    const workspace = new Blockly.Workspace();
    const oversized = createDefaultWeekThreeBossDraft();
    oversized.blocks.find((block) => block.id === 'boss-run-all')!.x = 1_000_000;
    oversized.blocks.find((block) => block.id === 'boss-run-all')!.y = -1_000_000;
    expect(compileWeekThreeBossDraft(oversized)).toMatchObject({ ok: true });
    restoreWeekThreeBossWorkspace(workspace, oversized);
    expect(workspace.getBlockById('boss-run-all')!.getRelativeToSurfaceXY()).toEqual({ x: WEEK_THREE_BOSS_COORDINATE_LIMIT, y: -WEEK_THREE_BOSS_COORDINATE_LIMIT });

    const before = serializeWeekThreeBossWorkspace(workspace);
    const invalid = structuredClone(oversized);
    invalid.blocks.find((block) => block.id === 'manor-if')!.inputs.CONDITION = 'missing';
    expect(restoreWeekThreeBossWorkspace(workspace, invalid)).toMatchObject({ ok: false, diagnostics: [{ code: 'unknown-block', sourceBlockId: 'missing' }] });
    expect(serializeWeekThreeBossWorkspace(workspace)).toEqual(before);
  });
});
