import * as Blockly from 'blockly';
import { afterEach, describe, expect, it } from 'vitest';
import { registerCuilanBooleanBlocks } from './weekThreeCuilanBooleanBlocks';
import { CUILAN_BOOLEAN_BLOCK_TYPES } from './weekThreeCuilanBooleanContract';
import {
  compileCuilanBooleanWorkspace,
  restoreDefaultCuilanBooleanWorkspace,
  restoreCuilanBooleanWorkspace,
  serializeCuilanBooleanWorkspace,
} from './weekThreeCuilanBooleanCompiler';
import { runCuilanBooleanForDraft } from './weekThreeCuilanBooleanContract';

const workspaces: Blockly.Workspace[] = [];
afterEach(() => workspaces.splice(0).forEach((workspace) => workspace.dispose()));

describe('W3-M2 真实 Blockly 编译器', () => {
  it('两个条件分别来自各自真实 value input，默认第二道仍是外形', () => {
    registerCuilanBooleanBlocks();
    for (const type of CUILAN_BOOLEAN_BLOCK_TYPES) expect(Blockly.Blocks[type]).toBeDefined();
    const workspace = new Blockly.Workspace();
    workspaces.push(workspace);
    restoreDefaultCuilanBooleanWorkspace(workspace);
    const draft = serializeCuilanBooleanWorkspace(workspace);
    expect(draft.blocks.find((block) => block.id === 'cuilan-ready-condition')?.type).toBe('w3_cuilan_condition_appearance_matches');
    expect(draft.blocks.find((block) => block.id === 'cuilan-identity-condition')?.type).toBe('w3_cuilan_condition_appearance_matches');
    expect(compileCuilanBooleanWorkspace(workspace)).toMatchObject({ ok: true });
  });

  it('真实替换第二个 value input 后，只有第二道变为 identity=false/else', () => {
    registerCuilanBooleanBlocks();
    const workspace = new Blockly.Workspace(); workspaces.push(workspace);
    restoreDefaultCuilanBooleanWorkspace(workspace);
    const identityIf = workspace.getBlockById('cuilan-identity-if')!;
    const defaultCondition = workspace.getBlockById('cuilan-identity-condition')!;
    defaultCondition.outputConnection!.disconnect(); defaultCondition.dispose();
    const identity = workspace.newBlock('w3_cuilan_condition_identity_is_cuilan', 'cuilan-identity-condition');
    identityIf.getInput('CONDITION')!.connection!.connect(identity.outputConnection!);
    const result = compileCuilanBooleanWorkspace(workspace);
    expect(result.ok && result.trace.filter((item) => item.opcode === 'condition-checked').map((item) => ({ checkpointId: item.checkpointId, conditionKind: item.conditionKind, observedValue: item.observedValue, actualBranch: item.actualBranch }))).toEqual([
      { checkpointId: 'disguise-readiness', conditionKind: 'appearance-matches-cuilan', observedValue: true, actualBranch: 'then' },
      { checkpointId: 'identity-reveal', conditionKind: 'identity-is-cuilan', observedValue: false, actualBranch: 'else' },
    ]);
    expect(result.ok && runCuilanBooleanForDraft(result.draft, result.trace).completed).toBe(true);
  });

  it('序列化真实分支连接，且分支动作的 parent 与 branch 都正确', () => {
    registerCuilanBooleanBlocks();
    const workspace = new Blockly.Workspace(); workspaces.push(workspace);
    restoreDefaultCuilanBooleanWorkspace(workspace);
    const draft = serializeCuilanBooleanWorkspace(workspace);
    expect(draft.blocks.find((block) => block.id === 'cuilan-hold-disguise')).toMatchObject({ parentBlockId: 'cuilan-disguise-if', branch: 'then' });
    expect(draft.blocks.find((block) => block.id === 'cuilan-adjust-transform')).toMatchObject({ parentBlockId: 'cuilan-disguise-if', branch: 'else' });
    expect(draft.blocks.find((block) => block.id === 'cuilan-continue-disguise')).toMatchObject({ parentBlockId: 'cuilan-identity-if', branch: 'then' });
    expect(draft.blocks.find((block) => block.id === 'cuilan-reveal-wukong')).toMatchObject({ parentBlockId: 'cuilan-identity-if', branch: 'else' });
  });

  it('真实删除、跨容器移动与重复 branch ownership 会改写草稿并被拒绝', () => {
    registerCuilanBooleanBlocks();
    const deleted = new Blockly.Workspace(); workspaces.push(deleted); restoreDefaultCuilanBooleanWorkspace(deleted);
    const identityIf = deleted.getBlockById('cuilan-identity-if')!;
    deleted.getBlockById('cuilan-identity-condition')!.dispose();
    expect(compileCuilanBooleanWorkspace(deleted)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-condition', sourceBlockId: identityIf.id })] });

    const moved = new Blockly.Workspace(); workspaces.push(moved); restoreDefaultCuilanBooleanWorkspace(moved);
    const clue = moved.getBlockById('cuilan-collect-clue')!;
    clue.previousConnection!.disconnect();
    moved.getBlockById('cuilan-disguise-if')!.getInput('THEN')!.connection!.connect(clue.previousConnection!);
    const movedDraft = serializeCuilanBooleanWorkspace(moved);
    expect(movedDraft.blocks.find((block) => block.id === clue.id)).toMatchObject({ parentBlockId: 'cuilan-disguise-if', branch: 'then' });
    expect(compileCuilanBooleanWorkspace(moved)).toMatchObject({ ok: false });

    const duplicate = new Blockly.Workspace(); workspaces.push(duplicate); restoreDefaultCuilanBooleanWorkspace(duplicate);
    const then = duplicate.getBlockById('cuilan-continue-disguise')!;
    const secondThen = duplicate.newBlock('w3_cuilan_continue_disguise', 'duplicate-then');
    then.nextConnection!.connect(secondThen.previousConnection!);
    const duplicateDraft = serializeCuilanBooleanWorkspace(duplicate);
    expect(duplicateDraft.blocks.find((block) => block.id === 'duplicate-then')).toMatchObject({ parentBlockId: 'cuilan-identity-if', branch: 'then' });
    expect(compileCuilanBooleanWorkspace(duplicate)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'duplicate-required-block' })] });
  });

  it('恢复后保持实际连接语义，并能补回被删除的注册类型', () => {
    registerCuilanBooleanBlocks();
    const workspace = new Blockly.Workspace(); workspaces.push(workspace);
    restoreDefaultCuilanBooleanWorkspace(workspace);
    const before = serializeCuilanBooleanWorkspace(workspace);
    const invalid = structuredClone(before);
    invalid.blocks.find((block) => block.id === 'cuilan-transform')!.type = 'not-a-cuilan-block' as never;
    expect(() => restoreCuilanBooleanWorkspace(workspace, invalid)).toThrow();
    expect(serializeCuilanBooleanWorkspace(workspace)).toEqual(before);
    const malformedShape = structuredClone(before);
    malformedShape.blocks.find((block) => block.id === 'cuilan-transform')!.conditionBlockId = 'cuilan-ready-condition';
    expect(() => restoreCuilanBooleanWorkspace(workspace, malformedShape)).toThrow();
    expect(serializeCuilanBooleanWorkspace(workspace)).toEqual(before);
    restoreCuilanBooleanWorkspace(workspace, before);
    expect(serializeCuilanBooleanWorkspace(workspace)).toEqual(before);
    delete Blockly.Blocks.w3_cuilan_transform;
    expect(Blockly.Blocks.w3_cuilan_transform).toBeUndefined();
    registerCuilanBooleanBlocks();
    expect(() => workspace.newBlock('w3_cuilan_transform', 'restored-transform')).not.toThrow();
  });
});
