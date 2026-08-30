import * as Blockly from 'blockly';
import { afterEach, describe, expect, it } from 'vitest';
import { BAJIE_JOINING_BLOCK_TYPES, BajieJoiningGraphError, runBajieJoiningForDraft } from './weekThreeBajieJoiningContract';
import { registerBajieJoiningBlocks } from './weekThreeBajieJoiningBlocks';
import {
  compileBajieJoiningWorkspace,
  restoreBajieJoiningWorkspace,
  restoreDefaultBajieJoiningWorkspace,
  serializeBajieJoiningWorkspace,
} from './weekThreeBajieJoiningCompiler';

const workspaces: Blockly.Workspace[] = [];
afterEach(() => workspaces.splice(0).forEach((workspace) => workspace.dispose()));

describe('W3-M4 真实 Blockly 编译器', () => {
  it('默认可见图真的连接 OR 和两个故事传感器，并在第二张卡失败', () => {
    registerBajieJoiningBlocks();
    for (const type of BAJIE_JOINING_BLOCK_TYPES) expect(Blockly.Blocks[type]).toBeDefined();
    const workspace = new Blockly.Workspace(); workspaces.push(workspace);
    restoreDefaultBajieJoiningWorkspace(workspace);
    const draft = serializeBajieJoiningWorkspace(workspace);
    expect(draft.blocks.find((block) => block.id === 'bajie-boolean-operation')).toMatchObject({ operator: 'or', leftBlockId: 'bajie-guanyin-precepts', rightBlockId: 'bajie-willing-westward' });
    expect(workspace.getBlockById('bajie-guanyin-precepts')!.isDeletable()).toBe(false);
    expect(workspace.getBlockById('bajie-willing-westward')!.isDeletable()).toBe(false);
    expect(['bajie-receive-statement', 'bajie-if-join-ready', 'bajie-boolean-operation', 'bajie-formally-join-team', 'bajie-continue-verification'].every((id) => !workspace.getBlockById(id)!.isDeletable())).toBe(true);
    const compiled = compileBajieJoiningWorkspace(workspace);
    expect(compiled).toMatchObject({ ok: true, trace: expect.any(Array) });
    expect(compiled.ok && runBajieJoiningForDraft(compiled.draft, compiled.trace)).toMatchObject({ completed: false, failureSnapshot: { scenarioId: 'practice-precepts-only', operator: 'or' } });
  });

  it('真实改变 FIELD operator 为 AND 后编译三个情境的正确 trace', () => {
    const workspace = new Blockly.Workspace(); workspaces.push(workspace);
    restoreDefaultBajieJoiningWorkspace(workspace);
    workspace.getBlockById('bajie-boolean-operation')!.setFieldValue('and', 'OPERATOR');
    const result = compileBajieJoiningWorkspace(workspace);
    expect(result.ok && result.trace.filter((item) => item.opcode === 'combine-conditions').map((item) => ({ scenarioId: item.scenarioId, operator: item.operator, combined: item.combined }))).toEqual([
      { scenarioId: 'canon-bajie-joins', operator: 'and', combined: true },
      { scenarioId: 'practice-precepts-only', operator: 'and', combined: false },
      { scenarioId: 'practice-willing-only', operator: 'and', combined: false },
    ]);
    expect(result.ok && runBajieJoiningForDraft(result.draft, result.trace)).toMatchObject({ completed: true, finalState: 'westward-team-departed' });
  });

  it('真实删除输入、移出容器和未知块都被拒绝', () => {
    const missingInput = new Blockly.Workspace(); workspaces.push(missingInput); restoreDefaultBajieJoiningWorkspace(missingInput);
    const operator = missingInput.getBlockById('bajie-boolean-operation')!;
    operator.getInput('LEFT')!.connection!.disconnect();
    expect(compileBajieJoiningWorkspace(missingInput)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-boolean-input', sourceBlockId: operator.id })] });

    const moved = new Blockly.Workspace(); workspaces.push(moved); restoreDefaultBajieJoiningWorkspace(moved);
    const action = moved.getBlockById('bajie-formally-join-team')!;
    action.previousConnection!.disconnect();
    expect(compileBajieJoiningWorkspace(moved)).toMatchObject({ ok: false });

    const unknown = new Blockly.Workspace(); workspaces.push(unknown); restoreDefaultBajieJoiningWorkspace(unknown);
    unknown.newBlock('controls_if', 'foreign-block');
    expect(compileBajieJoiningWorkspace(unknown)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'unknown-block' })] });
  });

  it('restore 只接受合同图，有限坐标会被夹紧且连接语义保持', () => {
    const workspace = new Blockly.Workspace(); workspaces.push(workspace);
    restoreDefaultBajieJoiningWorkspace(workspace);
    const before = serializeBajieJoiningWorkspace(workspace);
    const oversized = structuredClone(before);
    oversized.blocks[0]!.x = 20_000; oversized.blocks[0]!.y = -20_000;
    restoreBajieJoiningWorkspace(workspace, oversized);
    expect(serializeBajieJoiningWorkspace(workspace).blocks.find((block) => block.id === oversized.blocks[0]!.id)).toMatchObject({ x: 10_000, y: -10_000 });
    const malformed = structuredClone(before);
    malformed.blocks.find((block) => block.id === 'bajie-boolean-operation')!.leftBlockId = null;
    expect(() => restoreBajieJoiningWorkspace(workspace, malformed)).toThrow();

    const restored = new Blockly.Workspace(); workspaces.push(restored);
    const correct = structuredClone(before); correct.blocks.find((block) => block.type === 'w3_bajie_boolean_operation')!.operator = 'and';
    restoreBajieJoiningWorkspace(restored, correct);
    const replayed = compileBajieJoiningWorkspace(restored);
    expect(replayed.ok && runBajieJoiningForDraft(replayed.draft, replayed.trace)).toMatchObject({ completed: true, finalState: 'westward-team-departed' });
  });

  it('restore 在逐块归一化前拒绝超限数组，并拒绝重复 ID、非有限坐标和超长引用', () => {
    const workspace = new Blockly.Workspace(); workspaces.push(workspace);
    const sentinel = new Array(33);
    Object.defineProperty(sentinel, 0, { get: () => { throw new Error('block getter must not run'); } });
    expect(() => restoreBajieJoiningWorkspace(workspace, { version: 1, missionId: 'w3-m4', blocks: sentinel } as never)).toThrow(expect.objectContaining({ name: 'BajieJoiningGraphError', code: 'too-many-blocks' }));
    restoreDefaultBajieJoiningWorkspace(workspace);
    const valid = structuredClone(serializeBajieJoiningWorkspace(workspace));
    const duplicate = structuredClone(valid); duplicate.blocks[1]!.id = duplicate.blocks[0]!.id;
    expect(() => restoreBajieJoiningWorkspace(workspace, duplicate)).toThrow(BajieJoiningGraphError);
    const nonFinite = structuredClone(valid); nonFinite.blocks[0]!.x = Number.NaN;
    expect(() => restoreBajieJoiningWorkspace(workspace, nonFinite)).toThrow(BajieJoiningGraphError);
    const longReference = structuredClone(valid); longReference.blocks[1]!.previousId = 'x'.repeat(129);
    expect(() => restoreBajieJoiningWorkspace(workspace, longReference)).toThrow(expect.objectContaining({ name: 'BajieJoiningGraphError', code: 'invalid-reference' }));
    expect(() => restoreBajieJoiningWorkspace(workspace, { version: 1, missionId: 'w3-m4', blocks: new Array(7) } as never)).toThrow(expect.objectContaining({ name: 'BajieJoiningGraphError', code: 'invalid-block' }));
  });
});
