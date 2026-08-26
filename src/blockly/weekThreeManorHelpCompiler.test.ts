import * as Blockly from 'blockly';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createDefaultManorHelpDraft,
  compileManorHelpDraft,
  runManorHelp,
} from './weekThreeManorHelpContract';
import { MANOR_HELP_BLOCK_LABELS, registerManorHelpBlocks } from './weekThreeManorHelpBlocks';
import { compileManorHelpWorkspace, snapshotManorHelpWorkspace } from './weekThreeManorHelpCompiler';

const workspaces: Blockly.Workspace[] = [];
afterEach(() => {
  workspaces.splice(0).forEach((workspace) => workspace.dispose());
  delete Blockly.Blocks.w3_manor_unknown;
});

function restoreDefaultWorkspace(ids: Record<string, string> = {}) {
  registerManorHelpBlocks();
  const workspace = new Blockly.Workspace();
  workspaces.push(workspace);
  const draft = createDefaultManorHelpDraft();
  const blocks = new Map(draft.blocks.map((item) => [item.id, workspace.newBlock(item.type, ids[item.id] ?? item.id)]));
  for (const item of draft.blocks) blocks.get(item.id)!.moveBy(item.x, item.y);
  const receive = blocks.get('manor-root')!;
  const ifBlock = blocks.get('manor-if')!;
  const condition = blocks.get('manor-condition')!;
  const thenAction = blocks.get('manor-then')!;
  const elseAction = blocks.get('manor-else')!;
  receive.nextConnection!.connect(ifBlock.previousConnection!);
  ifBlock.getInput('CONDITION')!.connection!.connect(condition.outputConnection!);
  ifBlock.getInput('THEN')!.connection!.connect(thenAction.previousConnection!);
  ifBlock.getInput('ELSE')!.connection!.connect(elseAction.previousConnection!);
  return { workspace, receive, ifBlock, condition, thenAction, elseAction };
}

function conditionValues(result: ReturnType<typeof compileManorHelpWorkspace>) {
  return result.ok ? result.trace.filter((item) => item.opcode === 'condition-checked').map((item) => item.observedValue) : [];
}

describe('W3-M1 real Blockly compiler', () => {
  it('registers the exact child-facing labels and real Blockly connection shapes', () => {
    const { receive, ifBlock, condition, thenAction } = restoreDefaultWorkspace();
    expect(MANOR_HELP_BLOCK_LABELS).toEqual({
      w3_manor_receive_message: '收到当前口信',
      w3_manor_if_message: '如果',
      w3_manor_condition_explicit_demon_help: '口信是在明确请求降妖帮助',
      w3_manor_condition_mentions_gao_manor: '口信提到了高老庄',
      w3_manor_accept_and_return_notice: '主动应承，并请来人回庄禀报',
      w3_manor_continue_journey: '继续问路前行',
    });
    expect(receive.previousConnection).not.toBeNull();
    expect(receive.nextConnection).not.toBeNull();
    expect(ifBlock.getInput('CONDITION')?.connection?.getCheck()).toEqual(['Boolean']);
    expect(ifBlock.getInput('THEN')?.connection).not.toBeNull();
    expect(ifBlock.getInput('ELSE')?.connection).not.toBeNull();
    expect(ifBlock.previousConnection).not.toBeNull();
    expect(ifBlock.nextConnection).not.toBeNull();
    expect(condition.outputConnection?.getCheck()).toEqual(['Boolean']);
    expect(thenAction.previousConnection).not.toBeNull();
    expect(thenAction.nextConnection).not.toBeNull();
    registerManorHelpBlocks();
  });

  it('compiles only the visible condition socket for both public messages', () => {
    const { workspace, ifBlock, condition } = restoreDefaultWorkspace();
    expect(conditionValues(compileManorHelpWorkspace(workspace))).toEqual([true, true]);
    condition.outputConnection!.disconnect();
    condition.dispose();
    const correct = workspace.newBlock('w3_manor_condition_explicit_demon_help', 'correct-condition');
    ifBlock.getInput('CONDITION')!.connection!.connect(correct.outputConnection!);
    const result = compileManorHelpWorkspace(workspace);
    expect(conditionValues(result)).toEqual([true, false]);
    expect(result.ok && runManorHelp(result.trace).completed).toBe(true);
  });

  it('returns focused failures when visible required sockets are disconnected or deleted', () => {
    const first = restoreDefaultWorkspace();
    first.condition.outputConnection!.disconnect();
    expect(compileManorHelpWorkspace(first.workspace)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-condition', sourceBlockId: first.ifBlock.id })] });

    const second = restoreDefaultWorkspace();
    second.thenAction.dispose();
    expect(compileManorHelpWorkspace(second.workspace)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-then', sourceBlockId: second.ifBlock.id })] });

    const third = restoreDefaultWorkspace();
    third.elseAction.dispose();
    expect(compileManorHelpWorkspace(third.workspace)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'missing-else', sourceBlockId: third.ifBlock.id })] });
  });

  it('changes the action trace when real branch connections are swapped', () => {
    const { workspace, ifBlock, thenAction, elseAction } = restoreDefaultWorkspace();
    thenAction.previousConnection!.disconnect();
    elseAction.previousConnection!.disconnect();
    ifBlock.getInput('THEN')!.connection!.connect(elseAction.previousConnection!);
    ifBlock.getInput('ELSE')!.connection!.connect(thenAction.previousConnection!);
    const result = compileManorHelpWorkspace(workspace);
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.trace.filter((item) => item.opcode === 'continue-journey').map((item) => item.scenarioId)).toEqual(['canon-gaocai-help', 'practice-manor-directions']);
      expect(runManorHelp(result.trace).completed).toBe(false);
    }
  });

  it('rejects orphan and unknown visible blocks before compiling', () => {
    const orphan = restoreDefaultWorkspace();
    orphan.workspace.newBlock('w3_manor_continue_journey', 'orphan-action');
    expect(compileManorHelpWorkspace(orphan.workspace)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'orphan-block', sourceBlockId: 'orphan-action' })] });

    const unknown = restoreDefaultWorkspace();
    Blockly.Blocks.w3_manor_unknown = { init(this: Blockly.Block) { this.appendDummyInput().appendField('unknown'); this.setPreviousStatement(true); this.setNextStatement(true); } };
    unknown.workspace.newBlock('w3_manor_unknown', 'unknown-block');
    expect(compileManorHelpWorkspace(unknown.workspace)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'unknown-block', sourceBlockId: 'unknown-block' })] });
  });

  it('faithfully snapshots a real nested receive block before returning a focused cross-container failure', () => {
    const { workspace, ifBlock } = restoreDefaultWorkspace();
    const nestedReceive = workspace.newBlock('w3_manor_receive_message', 'nested-receive');
    ifBlock.getInput('THEN')!.connection!.connect(nestedReceive.previousConnection!);
    expect(snapshotManorHelpWorkspace(workspace).blocks.find((block) => block.id === nestedReceive.id)).toMatchObject({ parentBlockId: ifBlock.id, branch: 'then' });
    expect(compileManorHelpWorkspace(workspace)).toMatchObject({ ok: false, diagnostics: [expect.objectContaining({ code: 'duplicate-root', sourceBlockId: nestedReceive.id, concept: 'program-structure' })] });
  });

  it('rejects a one-sided serialized link after a real Blockly snapshot because public Blockly connections are reciprocal', () => {
    const { workspace } = restoreDefaultWorkspace();
    const draft = structuredClone(snapshotManorHelpWorkspace(workspace));
    draft.blocks.find((block) => block.id === 'manor-if')!.previousId = null;
    expect(() => compileManorHelpDraft(draft)).toThrow(expect.objectContaining({ code: 'nonreciprocal-link' }));
  });

  it('snapshots connection ownership while IDs and coordinates do not determine semantics', () => {
    const first = restoreDefaultWorkspace();
    const second = restoreDefaultWorkspace({
      'manor-root': 'random-root-id', 'manor-if': 'random-if-id', 'manor-condition': 'random-condition-id', 'manor-then': 'random-then-id', 'manor-else': 'random-else-id',
    });
    second.workspace.getTopBlocks(false)[0]!.moveBy(137, -83);
    const firstResult = compileManorHelpWorkspace(first.workspace);
    const secondResult = compileManorHelpWorkspace(second.workspace);
    expect(firstResult.ok).toBe(true);
    expect(secondResult.ok).toBe(true);
    expect(conditionValues(firstResult)).toEqual(conditionValues(secondResult));
    const semanticRun = (result: Extract<ReturnType<typeof compileManorHelpWorkspace>, { ok: true }>) => {
      const run = runManorHelp(result.trace);
      return { completed: run.completed, scenarioResults: run.scenarioResults.map(({ scenarioId, observedValue, actualBranch, passed }) => ({ scenarioId, observedValue, actualBranch, passed })) };
    };
    if (!firstResult.ok || !secondResult.ok) throw new Error('expected valid visible workspaces');
    expect(semanticRun(firstResult)).toEqual(semanticRun(secondResult));
    const snapshot = snapshotManorHelpWorkspace(second.workspace);
    expect(() => compileManorHelpDraft(snapshot)).not.toThrow();
    expect(snapshot.blocks.find((block) => block.type === 'w3_manor_if_message')).toMatchObject({ parentBlockId: null, branch: null, conditionBlockId: 'random-condition-id' });
    expect(snapshot.blocks.find((block) => block.id === 'random-then-id')).toMatchObject({ parentBlockId: 'random-if-id', branch: 'then' });
    expect(snapshot.blocks.find((block) => block.id === 'random-else-id')).toMatchObject({ parentBlockId: 'random-if-id', branch: 'else' });
  });

  it('restores a deleted registered Blockly type without changing repeated registration semantics', () => {
    registerManorHelpBlocks();
    delete Blockly.Blocks.w3_manor_receive_message;
    expect(Blockly.Blocks.w3_manor_receive_message).toBeUndefined();
    registerManorHelpBlocks();
    expect(Blockly.Blocks.w3_manor_receive_message).toBeDefined();
    const workspace = new Blockly.Workspace();
    workspaces.push(workspace);
    expect(() => workspace.newBlock('w3_manor_receive_message', 'restored-receive')).not.toThrow();
  });
});
